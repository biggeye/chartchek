"use client";

import React from 'react';
import { Sidebar, SidebarHeader, SidebarBody, SidebarSection, SidebarFooter } from '@/components/sidebar';
import { Button } from '@/components/button';
import { PlusIcon } from '@heroicons/react/24/outline';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { ChatHistoryList } from './ChatHistoryList';
import { UserMenu } from '@/components/user-menu';

export interface AppSidebarProps {
  // We'll add props as needed later
}

export function AppSidebar({}: AppSidebarProps) {
  const router = useRouter();
  const supabase = createClient();

  const handleNewChat = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        router.push('/login');
        return;
      }

      // Create a new thread via our API endpoint
      const formData = new FormData();
      formData.append('message', ' '); // Empty space instead of empty string
      formData.append('assistantKey', 'tjc');
      formData.append('model', 'gpt-4o');

      const response = await fetch("/api/tjc", {
        method: "POST",
        body: formData,
        // Prevent Next.js from trying to JSON stringify FormData
        headers: {
          Accept: 'application/json',
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error:', errorText);
        throw new Error(errorText);
      }

      const data = await response.json();
      console.log('API Response:', data);
      
      // Navigate to the new chat using the thread ID from the saved message
      if (data.message?.thread_id) {
        router.push(`/chat/${data.message.thread_id}`);
      } else {
        throw new Error("Failed to create chat thread");
      }
    } catch (error) {
      console.error('Error creating new chat:', error);
      // You might want to show an error toast or message here
    }
  };

  return (
    <Sidebar className="w-64 border-r border-zinc-950/5">
      <SidebarHeader>
        <SidebarSection>
          <Button
            className="w-full"
            color="blue"
            onClick={handleNewChat}
          >
            <PlusIcon className="w-4 h-4 mr-2" />
            New Chat
          </Button>
        </SidebarSection>
      </SidebarHeader>
      
      <SidebarBody>
        <SidebarSection>
          <ChatHistoryList />
        </SidebarSection>
      </SidebarBody>

      <SidebarFooter>
        <UserMenu variant="sidebar" />
      </SidebarFooter>
    </Sidebar>
  );
}