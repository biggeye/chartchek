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
    return isMarkdown ? <ReactMarkdown>{message}</ReactMarkdown> : <span>{message}</span>;
  };

  return (
    <div className="flex-1 h-full overflow-y-auto p-4 space-y-4" data-slot="messages">
      {messages.map((msg, i) => (
        <div
          key={msg.id || i}
          className={clsx(
            'flex',
            msg.role === "user" ? "justify-end" : "justify-start"
          )}
        >
          <div
            className={clsx(
              'max-w-[80%] px-4 py-2 rounded-2xl',
              msg.role === "assistant"
                ? "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100"
                : msg.role === "user"
                ? "bg-blue-600 text-white"
                : "bg-zinc-200 text-zinc-600 text-sm dark:bg-zinc-700 dark:text-zinc-300"
            )}
          >
            <p className="whitespace-pre-wrap break-words">{renderMessage(msg.content)}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
