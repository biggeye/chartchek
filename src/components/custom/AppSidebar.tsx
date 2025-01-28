"use client";

import React from 'react';
import { Sidebar, SidebarHeader, SidebarBody, SidebarSection, SidebarItem } from '@/components//sidebar';
import { Button } from '@/components//button';

export interface AppSidebarProps {
  // We'll add props as needed later
}

export function AppSidebar({}: AppSidebarProps) {
  return (
    <Sidebar className="w-64 border-r border-zinc-950/5">
      <SidebarHeader>
        <SidebarSection>
          <Button
            className="w-full"
            color="blue"
          >
            <PlusIcon className="w-4 h-4 mr-2" />
            New Chat
          </Button>
        </SidebarSection>
      </SidebarHeader>
      
      <SidebarBody>
        <SidebarSection>
          {/* Example chat history items */}
          <div className="space-y-1">
            <button className="w-full px-2 py-1.5 text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white">
              Previous Chat 1
            </button>
            <button className="w-full px-2 py-1.5 text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white">
              Previous Chat 2
            </button>
          </div>
        </SidebarSection>
      </SidebarBody>
    </Sidebar>
  );
}

function PlusIcon(props: React.ComponentPropsWithoutRef<'svg'>) {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" {...props}>
      <path d="M8 2v12M2 8h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}