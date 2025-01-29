"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { debounce } from "lodash";
import ChatList, { Message } from "./ChatList";
import ChatInput from "./ChatInput";
import { createClient } from '@/utils/supabase/client';
import { sanitizeErrorMessage } from '@/utils/errors';
import { RealtimeChannel, REALTIME_SUBSCRIBE_STATES } from '@supabase/supabase-js';

interface ChatProps {
    initialThreadId?: string;
}

interface ChatInputProps {
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onSend: () => void;
    disabled: boolean; 
}

export default function Chat({ initialThreadId }: ChatProps) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState("");
    const [threadId, setThreadId] = useState<string | null>(initialThreadId || null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const supabase = createClient();

    const handleError = useCallback((error: unknown) => {
        const errorMessage = error instanceof Error 
            ? error.message 
            : 'An unexpected error occurred';
        setError(sanitizeErrorMessage(errorMessage));
        setIsSubmitting(false);
    }, []);

    const loadMessages = useCallback(async () => {
        if (!threadId) return;

        try {
            const { data: messages, error } = await supabase
                .from('chat_messages')
                .select('*')
                .eq('thread_id', threadId)
                .order('created_at', { ascending: true });

            if (error) throw error;
            setMessages(messages || []);
        } catch (error) {
            handleError(error);
        }
    }, [threadId, supabase, handleError]);

    const setupSubscription = useCallback(() => {
        if (!threadId) return;

        const channel = supabase
            .channel(`chat_messages:${threadId}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'chat_messages',
                    filter: `thread_id=eq.${threadId}`
                },
                (payload) => {
                    const newMessage = payload.new as Message;
                    setMessages((prev) => {
                        // Check if message already exists
                        const exists = prev.some(m => m.id === newMessage.id);
                        if (exists) {
                            // Update existing message
                            return prev.map(m => 
                                m.id === newMessage.id ? newMessage : m
                            );
                        }
                        // Add new message
                        return [...prev, newMessage];
                    });
                }
            )
            .subscribe((status, err) => {
                if (status === 'SUBSCRIBED') {
                    console.log('Successfully subscribed to chat messages');
                } else if (err) {
                    console.error('Subscription error:', err);
                }
            });

        return () => {
            channel.unsubscribe();
        };
    }, [threadId, supabase]);

    useEffect(() => {
        loadMessages();
        return setupSubscription();
    }, [loadMessages, setupSubscription]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setInput(e.target.value);
        setError(null);
    };

    const handleStreamResponse = async (response: Response) => {
        if (!response.body) return;

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let currentMessage = '';

        try {
            while (true) {
                const { value, done } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value);
                const lines = chunk.split('\n');

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        try {
                            const data = line.slice(5);
                            if (data === '[DONE]') continue;

                            const parsedEvent = JSON.parse(data);
                            if (parsedEvent.type === 'text') {
                                currentMessage = parsedEvent.value.text;
                                updateAssistantMessage(currentMessage);
                            } else if (parsedEvent.type === 'textDelta') {
                                currentMessage += parsedEvent.value.text;
                                updateAssistantMessage(currentMessage);
                            }
                        } catch (error) {
                            console.error('Error parsing SSE:', error);
                        }
                    }
                }
            }
        } catch (error) {
            handleError(error);
        }
    };

    const handleSendMessage = async () => {
        if (!input.trim() || isSubmitting) return;

        const message = input;
        setInput('');
        setError(null);
        setIsSubmitting(true);

        try {
            const formData = new FormData();
            formData.append('message', message);
            formData.append('assistantKey', 'tjc');
            formData.append('model', 'gpt-4o');
            if (threadId) {
                formData.append('threadId', threadId);
            }

            const response = await fetch("/api/tjc", {
                method: "POST",
                body: formData,
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(errorText);
            }

            if (!response.body) {
                throw new Error('No response body');
            }

            handleStreamResponse(response);
        } catch (error) {
            handleError(error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const updateAssistantMessage = useCallback((content: string) => {
        setMessages(prevMessages => {
            const lastMessage = prevMessages[prevMessages.length - 1];
            if (lastMessage?.role === "assistant") {
                return [...prevMessages.slice(0, -1), {
                    id: lastMessage.id,
                    content,
                    role: "assistant"
                }];
            }
            return [...prevMessages, {
                id: Date.now().toString(),
                content,
                role: "assistant"
            }];
        });
    }, []);

    if (error) {
        return (
            <div className="flex flex-col h-full">
                <div className="flex-1 p-4">
                    <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-4 rounded-lg">
                        {error}
                        <button 
                            onClick={() => setError(null)}
                            className="ml-2 text-sm underline hover:no-underline"
                        >
                            Dismiss
                        </button>
                    </div>
                </div>
                <ChatInput 
                    value={input} 
                    onChange={handleInputChange} 
                    onSend={handleSendMessage}
                    disabled={isSubmitting} 
                />
            </div>
        );
    }

    if (loading) {
        return (
            <div className="flex flex-col h-full items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gray-900"></div>
                <p className="mt-2 text-sm text-gray-600">Loading messages...</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full">
            <ChatList messages={messages} />
            <ChatInput 
                value={input} 
                onChange={handleInputChange} 
                onSend={handleSendMessage}
                disabled={isSubmitting} 
            />
        </div>
    );
}
