// components/ChatList.tsx
"use client";

import React from "react";
import clsx from 'clsx';
import ReactMarkdown from 'react-markdown';

// Simple type for messages
export interface Message {
  id?: string;
  role: "user" | "assistant" | "system";
  content: string;
}

interface ChatListProps {
  messages: Message[];
}

export default function ChatList({ messages }: ChatListProps) {
  const renderMessage = (message: string) => {
    // Check if message contains markdown syntax
    const markdownRegex = /\*\*.*?\*\*|__.*?__|\*.*?\*|_.*?_|#/; // Matches bold and italic markdown
    const isMarkdown = markdownRegex.test(message);
    return isMarkdown ? (
      <ReactMarkdown className="prose dark:prose-invert max-w-none">
        {message}
      </ReactMarkdown>
    ) : (
      <span>{message}</span>
    );
  };

  return (
    <div 
      className="flex-1 h-full overflow-y-auto p-4 space-y-4 bg-gradient-to-b from-white to-zinc-50 dark:from-zinc-900 dark:to-zinc-950" 
      data-slot="messages"
    >
      {messages.map((msg, i) => (
        <div
          key={msg.id || i}
          className={clsx(
            'flex group',
            msg.role === "user" ? "justify-end" : "justify-start"
          )}
        >
          <div
            className={clsx(
              'max-w-[80%] px-4 py-2.5 rounded-2xl shadow-sm transition-all duration-200',
              'hover:shadow-md hover:scale-[1.02]',
              msg.role === "assistant"
                ? "bg-white text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100 hover:bg-zinc-50 dark:hover:bg-zinc-700/90"
                : msg.role === "user"
                ? "bg-blue-600 text-white hover:bg-blue-500"
                : "bg-zinc-200 text-zinc-600 text-sm dark:bg-zinc-700 dark:text-zinc-300 hover:bg-zinc-300 dark:hover:bg-zinc-600"
            )}
          >
            {msg.role === "assistant" && (
              <div className="flex items-center gap-2 mb-1 text-xs text-zinc-500 dark:text-zinc-400">
                <svg 
                  className="w-4 h-4" 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" 
                  />
                </svg>
                Assistant
              </div>
            )}
            <div className="whitespace-pre-wrap break-words">
              {renderMessage(msg.content)}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
