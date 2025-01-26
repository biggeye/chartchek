"use client";

import { useState } from "react";
import ChatList, { Message } from "./ChatList";
import ChatInput from "./ChatInput";

interface ChatInputProps {
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onSend: () => void;
}

export default function Chat() {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState("");
    const [threadId, setThreadId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setInput(e.target.value);
    };

    const handleSubmit = async () => {
        if (!input.trim()) return;

        const userMessage = input;
        setInput("");

        // Add user message to chat
        setMessages(prevMessages => [
            ...prevMessages,
            { id: Date.now().toString(), content: userMessage, role: "user" }
        ]);

        try {
            const res = await fetch("/api/tjc", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    userMessage,
                    threadId: threadId, // Reuse existing threadId if we have one
                    assistantKey: "tjc", // Using tjc as default key
                    userId: "guestUser",
                    model: "gpt-4o" // Using standard GPT-4 model
                }),
            });

            if (!res.ok) {
                const errorText = await res.text();
                throw new Error(errorText);
            }

            const reader = res.body?.getReader();
            const decoder = new TextDecoder();
            let done = false;
            let currentMessage = "";
            let buffer = ""; // Add buffer for incomplete chunks

            while (!done && reader) {
                const { value, done: doneReading } = await reader.read();
                done = doneReading;

                if (value) {
                    const chunk = decoder.decode(value, { stream: true });
                    buffer += chunk;
                    
                    // Process complete SSE messages
                    const lines = buffer.split('\n');
                    buffer = lines.pop() || ""; // Keep the last incomplete line in buffer
                    
                    for (const line of lines) {
                        if (line.startsWith('data: ')) {
                            try {
                                const jsonStr = line.slice(6); // Remove 'data: ' prefix
                                const parsedEvent = JSON.parse(jsonStr);
                                
                                // Store threadId from the first message
                                if (parsedEvent.threadId && !threadId) {
                                    setThreadId(parsedEvent.threadId);
                                }

                                if (parsedEvent.type === "textCreated") {
                                    currentMessage = parsedEvent.value?.text || parsedEvent.value;
                                    setMessages(prevMessages => [
                                        ...prevMessages,
                                        { id: Date.now().toString(), content: currentMessage, role: "assistant" }
                                    ]);
                                } else if (parsedEvent.type === "textDelta") {
                                    currentMessage += parsedEvent.value?.text || parsedEvent.value;
                                    setMessages(prevMessages => {
                                        const newMessages = [...prevMessages];
                                        if (newMessages.length > 0) {
                                            newMessages[newMessages.length - 1].content = currentMessage;
                                        }
                                        return newMessages;
                                    });
                                }
                            } catch (e) {
                                console.error("Error parsing SSE event:", e, "Raw line:", line);
                            }
                        }
                    }
                }
            }
        } catch (error) {
            console.error("Error sending message:", error);
            setError(error instanceof Error ? error.message : "An error occurred");
            setMessages(prevMessages => [
                ...prevMessages,
                { id: Date.now().toString(), content: error instanceof Error ? error.message : "An error occurred", role: "system" }
            ]);
        }
    };

    return (
        <div className="flex flex-col h-full">
            {error && <div className="text-red-500">{error}</div>}
            <ChatList messages={messages} />
            <ChatInput
                value={input}
                onChange={handleInputChange}
                onSend={handleSubmit}
            />
        </div>
    );
}
