import { NextRequest } from "next/server"
import { createClient } from '@/utils/supabase/server'
import { openai } from '@/lib'
import { ThreadStatus, isTextContent } from '@/types'

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return new Response('Unauthorized', { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const threadId = searchParams.get('threadId')
    const runId = searchParams.get('runId')

    if (!threadId || !runId) {
      return new Response('Missing required parameters', { status: 400 })
    }

    // Get thread and verify access
    const { data: thread } = await supabase
      .from('chat_threads')
      .select()
      .eq('id', threadId)
      .eq('user_id', session.user.id)
      .single()

    if (!thread) {
      return new Response('Thread not found or access denied', { status: 404 })
    }

    // Get run status from OpenAI
    const run = await openai.beta.threads.runs.retrieve(
      thread.metadata.openai_thread_id,
      runId
    )

    // If run is complete, get new messages
    let messages = []
    if (run.status === 'completed') {
      const openaiMessages = await openai.beta.threads.messages.list(
        thread.metadata.openai_thread_id,
        { order: 'asc', after: thread.metadata.last_message_id }
      )

      // Save new messages to Supabase
      for (const msg of openaiMessages.data) {
        if (msg.role === 'assistant' && msg.content.some(isTextContent)) {
          const textContent = msg.content.find(isTextContent)
          if (!textContent) continue

          const { data: message } = await supabase
            .from('chat_messages')
            .insert({
              thread_id: threadId,
              role: 'assistant',
              content: textContent.text.value,
              metadata: {
                openai_message_id: msg.id,
                annotations: textContent.text.annotations
              }
            })
            .select()
            .single()

          messages.push(message)

          // Save annotations if present
          if (textContent.text.annotations?.length) {
            await supabase
              .from('chat_message_annotations')
              .insert(
                textContent.text.annotations.map(ann => ({
                  message_id: message.id,
                  type: ann.type,
                  text: ann.text,
                  file_id: ann.file_citation?.file_id || ann.file_path?.file_id,
                  quote: ann.file_citation?.quote,
                  start_index: ann.start_index,
                  end_index: ann.end_index
                }))
              )
          }
        }
      }

      // Update thread status and last message ID
      await supabase
        .from('chat_threads')
        .update({
          status: 'completed' as ThreadStatus,
          metadata: {
            ...thread.metadata,
            last_message_id: openaiMessages.data[openaiMessages.data.length - 1]?.id,
            current_run_id: null
          }
        })
        .eq('id', threadId)
    }

    return new Response(JSON.stringify({
      status: run.status,
      messages,
      required_action: run.required_action,
      last_error: run.last_error,
      expires_at: run.expires_at
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })

  } catch (error: unknown) {
    console.error('[CHAT RUN API] Error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}
