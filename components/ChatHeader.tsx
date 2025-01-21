// components/ChatHeader.tsx
"use client";

import React from "react";

interface ChatHeaderProps {
  title?: string;
}

export default function ChatHeader({ title = "Chat Header" }: ChatHeaderProps) {
  return (
    <header className="w-full border-b p-4">
      <h1 className="text-lg font-semibold">{title}</h1>
    </header>
  );
}
