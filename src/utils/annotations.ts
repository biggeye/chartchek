import { createClient } from '@/utils/supabase/client'
import { ChatMessageAnnotation } from '@/types/database'

export interface MessageAnnotation {
  type: 'file_citation' | 'file_path'
  text: string
  file_id?: string
  quote?: string
  start_index: number
  end_index: number
}

export async function createMessageAnnotations(
  messageId: string,
  annotations: MessageAnnotation[]
): Promise<ChatMessageAnnotation[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('chat_message_annotations')
    .insert(
      annotations.map(annotation => ({
        message_id: messageId,
        type: annotation.type,
        text: annotation.text,
        file_id: annotation.file_id,
        quote: annotation.quote,
        start_index: annotation.start_index,
        end_index: annotation.end_index
      }))
    )
    .select()

  if (error) throw error
  return data
}

export async function getMessageAnnotations(
  messageId: string
): Promise<ChatMessageAnnotation[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('chat_message_annotations')
    .select('*')
    .eq('message_id', messageId)
    .order('start_index', { ascending: true })

  if (error) throw error
  return data
}

export function processMessageWithAnnotations(
  content: string,
  annotations: ChatMessageAnnotation[]
): string {
  let processedContent = content

  // Sort annotations by start_index in descending order to process from end to start
  const sortedAnnotations = [...annotations].sort((a, b) => 
    (b.start_index ?? 0) - (a.start_index ?? 0)
  )

  for (const annotation of sortedAnnotations) {
    if (annotation.start_index === null || annotation.end_index === null) continue

    const prefix = processedContent.substring(0, annotation.start_index)
    const suffix = processedContent.substring(annotation.end_index)

    let replacement = ''
    if (annotation.type === 'file_citation') {
      replacement = `[${annotation.quote ?? annotation.text}]`
    } else if (annotation.type === 'file_path') {
      replacement = `[Generated File: ${annotation.text}]`
    }

    processedContent = prefix + replacement + suffix
  }

  return processedContent
}
