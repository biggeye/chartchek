import type { Run } from 'openai/resources/beta/threads/runs'
import type OpenAI from 'openai'

export interface OpenAIFile {
  id: string
  bytes: number
  created_at: number
  filename: string
  purpose: string
}

export interface OpenAIAssistantFile {
  id: string
  assistant_id: string
  created_at: number
  file_id: string
}

export type TextContent = OpenAI.Beta.Threads.Messages.TextContent
export type ImageFileContent = OpenAI.Beta.Threads.Messages.ImageFileContent
export type ImageURLContent = OpenAI.Beta.Threads.Messages.ImageURLContent
export type MessageContent = OpenAI.Beta.Threads.Messages.MessageContent

export type Message = OpenAI.Beta.Threads.Messages.ThreadMessage

export type ThreadStatus = 'queued' | 'in_progress' | 'requires_action' | 'completed' | 'failed' | 'cancelled' | 'expired'
export type VectorStoreStatus = 'processing' | 'ready' | 'failed'
export type DocumentProcessingStatus = 'pending' | 'processing' | 'processed' | 'failed'

// Helper type guards
export function isTextContent(content: MessageContent): content is TextContent {
  return content.type === 'text'
}

export function isImageFileContent(content: MessageContent): content is ImageFileContent {
  return content.type === 'image_file'
}

export function isImageURLContent(content: MessageContent): content is ImageURLContent {
  return content.type === 'image_url'
}

export interface AssistantMessage extends Message {
  annotations?: never
}

export interface AssistantRun extends Omit<Run, 'metadata'> {
  metadata?: Record<string, unknown>
}

export type RunStep = {
  id: string
  object: 'thread.run.step'
  created_at: number
  run_id: string
  assistant_id: string
  thread_id: string
  type: 'message_creation' | 'tool_calls'
  status: ThreadStatus
  step_details: {
    message_creation?: {
      message_id: string
    }
    tool_calls?: Array<{
      id: string
      type: string
      function: {
        name: string
        arguments: string
      }
      code_interpreter?: {
        input: string
        outputs: Array<{
          type: 'image' | 'logs'
          image?: {
            file_id: string
          }
          logs?: string
        }>
      }
      retrieval?: {
        citations: Array<{
          file_citation: {
            file_id: string
            quote: string
          }
        }>
      }
    }>
  }
  last_error: null | {
    code: string
    message: string
  }
  expired_at?: number
  cancelled_at?: number
  failed_at?: number
  completed_at?: number
  metadata?: Record<string, unknown>
}

export type MessageAnnotation = {
  type: 'file_citation' | 'file_path'
  text: string
  file_id?: string
  quote?: string
  start_index: number
  end_index: number
}
