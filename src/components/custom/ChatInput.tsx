"use client";

import React from 'react';
import { Button } from '@/components/button';
import { Input, InputGroup } from '@/components/input';

interface ChatInputProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSend: () => void;
  disabled: boolean;
}

export default function ChatInput({ value, onChange, onSend, disabled }: ChatInputProps) {
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  return (
    <div className="border-t border-zinc-950/5 bg-white p-4 dark:border-white/5">
      <div className="mx-auto flex max-w-4xl items-center gap-x-4">
        <InputGroup>
          <Input
            type="text"
            value={value}
            onChange={onChange}
            onKeyPress={handleKeyPress}
            placeholder="Type your message..."
            className="flex-1"
            disabled={disabled}
          />
        </InputGroup>
        <Button
          onClick={onSend}
          disabled={disabled || !value.trim()}
          color="blue"
        >
          Send
        </Button>
      </div>
    </div>
  );
}