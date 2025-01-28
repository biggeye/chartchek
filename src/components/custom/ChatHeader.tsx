// components/ChatHeader.tsx
"use client";

import React from "react";

export default function ChatHeader() {
  return (
    <header className="border-b border-zinc-950/5 bg-white dark:border-white/5 dark:bg-zinc-900">
      <div className="flex h-14 items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-x-3">
          <h1 className="text-lg font-semibold leading-7 text-zinc-900 dark:text-white">
            Joint Commission Assistant
          </h1>
        </div>
        <div className="flex items-center gap-x-4">
          {/* Add any header actions here */}
        </div>
      </div>
    </header>
  );
}
