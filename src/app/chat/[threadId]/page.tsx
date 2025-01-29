'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import Chat from '@/components/custom/Chat'
import { getChatThread } from '@/utils/supabase/chat'

export default function ChatThreadPage({
  params: { threadId },
}: {
  params: { threadId: string }
}) {
  return (
    <div className="flex h-full">
      <Chat initialThreadId={threadId} />
    </div>
  )
}
