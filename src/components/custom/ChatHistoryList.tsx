'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { SidebarItem, SidebarLabel } from '@/components/sidebar'
import { ChatBubbleLeftRightIcon } from '@heroicons/react/24/outline'
import { usePathname } from 'next/navigation'
import { Database } from '@/types/database'

type ChatThread = Database['public']['Tables']['chat_threads']['Row']

export function ChatHistoryList() {
  const [chatThreads, setChatThreads] = useState<ChatThread[]>([])
  const [loading, setLoading] = useState(true)
  const pathname = usePathname()
  const supabase = createClient()

  useEffect(() => {
    async function loadChatHistory() {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session?.user) return

        const { data: threads, error } = await supabase
          .from('chat_threads')
          .select('*')
          .eq('user_id', session.user.id)
          .order('created_at', { ascending: false })

        if (error) throw error
        setChatThreads(threads || [])
      } catch (error) {
        console.error('Error loading chat history:', error)
      } finally {
        setLoading(false)
      }
    }

    loadChatHistory()

    // Subscribe to changes
    const channel = supabase
      .channel('chat_threads')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chat_threads'
        },
        () => {
          loadChatHistory()
        }
      )
      .subscribe()

    return () => {
      channel.unsubscribe()
    }
  }, [])

  if (loading) {
    return (
      <div className="py-2 px-2">
        <div className="animate-pulse space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-8 bg-gray-200 dark:bg-gray-700 rounded"></div>
          ))}
        </div>
      </div>
    )
  }

  if (chatThreads.length === 0) {
    return (
      <div className="py-2 px-2 text-sm text-gray-500 dark:text-gray-400">
        No chat history yet
      </div>
    )
  }

  return (
    <div className="space-y-1">
      {chatThreads.map((thread) => (
        <SidebarItem
          key={thread.id}
          href={`/chat/${thread.id}`}
          current={pathname === `/chat/${thread.id}`}
        >
          <ChatBubbleLeftRightIcon className="h-5 w-5" />
          <SidebarLabel>{thread.title || 'Untitled Chat'}</SidebarLabel>
        </SidebarItem>
      ))}
    </div>
  )
}
