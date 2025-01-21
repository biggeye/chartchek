// components/ChatInput.tsx
"use client";

import React, { FormEvent } from "react";

interface ChatInputProps {
  value: string;
  onChange: (val: string) => void;
  onSend: (message: string) => void;
}

export default function ChatInput({ value, onChange, onSend }: ChatInputProps) {
 
    function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (value.trim()) {
      onSend(value.trim());
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 p-4 border-t">
      <input
        className="flex-1 border p-2 rounded"
        placeholder="Type your message..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      <button
        type="submit"
        className="px-4 py-2 bg-blue-600 text-white rounded"
      >
        Send
      </button>
    </form>
  );
}
