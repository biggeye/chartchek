import { createClient } from '@/utils/supabase/server'
import { Database } from '@/types/database.types'
import { getUserAssistantInstance } from '@/lib/assistantConfig'
import { openaiClient } from '@/lib/openai-client'
import { v4 as uuidv4 } from 'uuid'

type ChatThread = Database['public']['Tables']['chat_threads']['Row']
type ChatMessage = Database['public']['Tables']['chat_messages']['Row']
type ChatFile = Database['public']['Tables']['chat_files']['Row']
type UserAssistant = Database['public']['Tables']['user_assistants']['Row']

export type ThreadStatus = 'queued' | 'in_progress' | 'requires_action' | 'cancelling' | 'cancelled' | 'failed' | 'completed' | 'expired'

export async function getOrCreateUserAssistant(userId: string, assistantKey: string) {
  const supabase = await createClient()
  
  // Check if user already has this assistant
  const { data: existingAssistant } = await supabase
    .from('user_assistants')
    .select()
    .eq('user_id', userId)
    .eq('assistant_key', assistantKey)
    .single()

  if (existingAssistant) {
    return existingAssistant.assistant_id
  }

  // If not, create a new assistant and store the mapping
  const newAssistantId = await getUserAssistantInstance(userId, assistantKey)
  
  await supabase.from('user_assistants').insert({
    user_id: userId,
    assistant_key: assistantKey,
    assistant_id: newAssistantId
  })

  return newAssistantId
}

export async function createChatThread(
  userId: string, 
  assistantId: string, 
  openaiThreadId: string, 
  title?: string,
  metadata: Record<string, any> = {},
  initialMessage?: {
    content: string,
    fileIds?: string[],
    imageUrls?: { url: string, detail?: 'low' | 'high' | 'auto' }[]
  }
) {
  const supabase = await createClient()

  // Generate a UUID for our database
  const threadId = uuidv4()

  // Create thread in Supabase
  const { data: thread, error } = await supabase
    .from('chat_threads')
    .insert({
      id: threadId,
      user_id: userId,
      assistant_id: assistantId,
      title: title || 'New Chat',
      metadata: {
        ...metadata,
        openai_thread_id: openaiThreadId
      },
      status: 'queued'
    })
    .select()
    .single()

  if (error) throw error

  // If there's an initial message, create it with any attachments
  if (initialMessage) {
    const content: any[] = []
    
    // Add text content
    content.push({
      type: 'text',
      text: initialMessage.content
    })

    // Add image URLs if any
    if (initialMessage.imageUrls) {
      for (const img of initialMessage.imageUrls) {
        content.push({
          type: 'image_url',
          image_url: img
        })
      }
    }

    // Create message with file attachments if any
    await openaiClient.beta.threads.messages.create(openaiThreadId, {
      role: 'user',
      content,
      file_ids: initialMessage.fileIds
    })

    // Save in our database
    await saveChatMessage(threadId, 'user', initialMessage.content)
  }

  return thread
}

export async function getOpenAIThreadId(threadId: string) {
  const supabase = await createClient()
  
  const { data: thread, error } = await supabase
    .from('chat_threads')
    .select('metadata')
    .eq('id', threadId)
    .single()
    
  if (error) throw error
  if (!thread?.metadata?.openai_thread_id) {
    throw new Error('No OpenAI thread ID found')
  }
  
  return thread.metadata.openai_thread_id as string
}

export async function updateThreadStatus(
  threadId: string, 
  status: ThreadStatus, 
  runId?: string,
  maxTokens?: { prompt?: number, completion?: number }
) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('chat_threads')
    .update({ 
      status, 
      current_run_id: runId,
      metadata: maxTokens ? { max_tokens: maxTokens } : undefined,
      updated_at: new Date().toISOString()
    })
    .eq('id', threadId)

  if (error) throw error
}

export async function saveChatMessage(
  threadId: string, 
  role: 'user' | 'assistant' | 'system', 
  content: string,
  annotations?: Array<{
    type: 'file_citation' | 'file_path',
    text: string,
    file_id: string,
    quote?: string,
    start_idx?: number,
    end_idx?: number
  }>
) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('chat_messages')
    .insert({
      thread_id: threadId,
      role,
      content,
      metadata: annotations ? { annotations } : undefined
    })

  if (error) throw error
}

export async function saveChatFile(
  threadId: string,
  fileId: string,
  filename: string,
  purpose: 'assistants' | 'assistants_output' | 'vision',
  bytes?: number,
  metadata: Record<string, any> = {}
) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('chat_files')
    .insert({
      thread_id: threadId,
      file_id: fileId,
      filename,
      purpose,
      bytes,
      metadata
    })

  if (error) throw error
}

export async function getChatHistory(userId: string) {
  const supabase = await createClient()

  const { data: threads, error } = await supabase
    .from('chat_threads')
    .select(`
      *,
      chat_messages (
        id,
        role,
        content,
        created_at,
        metadata
      ),
      chat_files (
        id,
        file_id,
        filename,
        purpose,
        created_at
      )
    `)
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })

  if (error) throw error
  return threads
}

export async function getChatThread(threadId: string) {
  const supabase = await createClient()

  const { data: thread, error } = await supabase
    .from('chat_threads')
    .select(`
      *,
      chat_messages (
        id,
        role,
        content,
        created_at,
        metadata
      ),
      chat_files (
        id,
        file_id,
        filename,
        purpose,
        created_at
      )
    `)
    .eq('id', threadId)
    .single()

  if (error) throw error
  return thread
}

export async function syncOpenAIThread(threadId: string) {
  const supabase = await createClient()

  // Get the OpenAI thread ID from our database
  const openaiThreadId = await getOpenAIThreadId(threadId)

  // Fetch messages from OpenAI
  const messages = await openaiClient.beta.threads.messages.list(openaiThreadId)

  // Insert/update messages in our database
  for (const message of messages.data) {
    let content = ''
    const annotations: any[] = []
    let currentPosition = 0

    // Handle different content types and build annotations
    for (const contentItem of message.content) {
      if (contentItem.type === 'text') {
        const text = contentItem.text.value
        content += text

        // Handle text annotations
        for (const annotation of contentItem.text.annotations || []) {
          const annotationText = text.substring(annotation.start_index, annotation.end_index)
          
          if ('file_citation' in annotation) {
            annotations.push({
              type: 'file_citation',
              text: annotationText,
              file_id: annotation.file_citation.file_id,
              quote: annotation.file_citation.quote,
              start_idx: currentPosition + annotation.start_index,
              end_idx: currentPosition + annotation.end_index
            })
          } else if ('file_path' in annotation) {
            annotations.push({
              type: 'file_path',
              text: annotationText,
              file_id: annotation.file_path.file_id,
              start_idx: currentPosition + annotation.start_index,
              end_idx: currentPosition + annotation.end_index
            })
          }
        }
        
        currentPosition += text.length
      } else if (contentItem.type === 'image_file') {
        await saveChatFile(
          threadId,
          contentItem.image_file.file_id,
          'image.png', // Filename will be updated when we fetch file details
          'vision'
        )
      }
    }

    // Save the message with annotations
    await saveChatMessage(threadId, message.role, content, annotations)

    // Handle file attachments
    const fileIds = message.file_ids || []
    for (const fileId of fileIds) {
      const file = await openaiClient.files.retrieve(fileId)
      await saveChatFile(threadId, fileId, file.filename, 'assistants_output', file.bytes)
    }
  }
}
