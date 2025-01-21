
"use client";

import { useChat } from "ai/react";
import ChatList from "./ChatList";
import ChatInput from "./ChatInput";
export default function Chat() {
  const { messages, input, handleInputChange, handleSubmit } = useChat({
    api: "/api/tjc",
  });

  return (
    <div className="flex flex-col h-full">
      <ChatList messages={messages} />
      <ChatInput
        value={input}
        onChange={handleInputChange}
        onSend={handleSubmit}
      />
    </div>
  );
}
