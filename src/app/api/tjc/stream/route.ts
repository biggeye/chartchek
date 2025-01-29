import { NextRequest } from "next/server"
import { createClient } from '@/utils/supabase/server'
import { openai } from '@/lib'
import { ThreadStatus, isTextContent, MessageContent, MessageAnnotation } from '@/types'
import { encode } from '@msgpack/msgpack'

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

    // Set up SSE stream
    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        const sendEvent = (event: string, data: any) => {
          controller.enqueue(
            encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
          )
        }

        try {
          // Start polling the run status
          let run = await openai.beta.threads.runs.retrieve(
            thread.metadata.openai_thread_id,
            runId
          )

          while (run.status === 'in_progress') {
            // Get latest messages
            const messages = await openai.beta.threads.messages.list(
              thread.metadata.openai_thread_id,
              { order: 'asc', after: thread.metadata.last_message_id }
            )

            // Process new messages
            for (const msg of messages.data) {
              if (msg.role === 'assistant' && msg.content.some(isTextContent)) {
                const textContent = msg.content.find(isTextContent)
                if (!textContent) continue

                // Process text content and annotations
                const content = textContent.text.value
                const annotations = textContent.text.annotations || []

                const compareAnnotations = (a: { start_index: number }, b: { start_index: number }): number => {
                  return a.start_index - b.start_index;
                };

                annotations.sort(compareAnnotations)

                let processedContent = '';
                if (annotations?.length) {
                  processedContent = processAnnotations(content, annotations);
                } else {
                  processedContent = content;
                }

                const processAnnotation = (ann: { text: string; start_index: number; end_index: number }) => {
                  // Process annotation logic
                  const prefix = ann.type === 'file_citation' ? '[Citation: ' : '[File: '
                  const citation = ann.type === 'file_citation' ? ` - "${ann.quote}"` : ''
                  const replacement = `${prefix}${ann.file_id}${citation}]`

                  return replacement;
                };

                annotations.forEach((ann: MessageAnnotation) => {
                  const replacement = processAnnotation(ann);
                  processedContent = processedContent.slice(0, ann.start_index) + replacement + processedContent.slice(ann.end_index)
                })

                // Save message to Supabase
                const { data: message } = await supabase
                  .from('chat_messages')
                  .insert({
                    thread_id: threadId,
                    role: 'assistant',
                    content: processedContent,
                    metadata: {
                      openai_message_id: msg.id,
                      annotations: textContent.text.annotations
                    }
                  })
                  .select()
                  .single()

                // Send message event
                sendEvent('message', {
                  id: message.id,
                  content: processedContent,
                  annotations: textContent.text.annotations
                })

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

                // Update thread's last message ID
                await supabase
                  .from('chat_threads')
                  .update({
                    metadata: {
                      ...thread.metadata,
                      last_message_id: msg.id
                    }
                  })
                  .eq('id', threadId)
              }
            }

            // Check run status again
            run = await openai.beta.threads.runs.retrieve(
              thread.metadata.openai_thread_id,
              runId
            )

            // Send status event
            sendEvent('status', { status: run.status })

            if (run.status === 'requires_action') {
              sendEvent('requires_action', { required_action: run.required_action })
              break
            }

            // Wait before next poll
            await new Promise(resolve => setTimeout(resolve, 1000))
          }

          // Run completed or requires action
          if (run.status === 'completed') {
            // Update thread status
            await supabase
              .from('chat_threads')
              .update({
                status: 'completed' as ThreadStatus,
                metadata: {
                  ...thread.metadata,
                  current_run_id: null
                }
              })
              .eq('id', threadId)

            sendEvent('complete', { status: 'completed' })
          } else if (run.status === 'failed') {
            // Update thread status
            await supabase
              .from('chat_threads')
              .update({
                status: 'failed' as ThreadStatus,
                metadata: {
                  ...thread.metadata,
                  current_run_id: null,
                  last_error: run.last_error
                }
              })
              .eq('id', threadId)

            sendEvent('error', { error: run.last_error })
          }

          controller.close()
        } catch (error: unknown) {
          console.error('[TJC STREAM API] Error:', error)
          const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
          sendEvent('error', { error: errorMessage })
          controller.close()
        }
      }
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      }
    })

  } catch (error: unknown) {
    console.error('[TJC STREAM API] Error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}

const processAnnotations = (content: string, annotations: MessageAnnotation[]) => {
  let processedContent = content;
  annotations.forEach((ann: MessageAnnotation) => {
    const replacement = processAnnotation(ann);
    processedContent = processedContent.slice(0, ann.start_index) + replacement + processedContent.slice(ann.end_index)
  })
  return processedContent;
};

const processAnnotation = (ann: { text: string; start_index: number; end_index: number }) => {
  // Process annotation logic
  const prefix = ann.type === 'file_citation' ? '[Citation: ' : '[File: '
  const citation = ann.type === 'file_citation' ? ` - "${ann.quote}"` : ''
  const replacement = `${prefix}${ann.file_id}${citation}]`

  return replacement;
};
