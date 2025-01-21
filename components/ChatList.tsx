// components/ChatList.tsx
"use client";

import React from "react";

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
  return (
    <div className="flex-1 overflow-y-auto p-4">
      {messages.map((msg, i) => (
        <div
          key={msg.id || i}
          className={`mb-2 ${
            msg.role === "assistant"
              ? "text-left"
              : msg.role === "user"
              ? "text-right"
              : "text-center text-xs text-gray-500"
          }`}
        >
          <div className="inline-block max-w-xs px-3 py-2 rounded bg-gray-100">
            <span>{msg.content}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
