import { Database } from './database.types'

// Common types from database schema
export type ChatThread = Database['public']['Tables']['chat_threads']['Row']
export type ChatMessage = Database['public']['Tables']['chat_messages']['Row']
export type ChatFile = Database['public']['Tables']['chat_files']['Row']
export type UserAssistant = Database['public']['Tables']['user_assistants']['Row']
export type Document = Database['public']['Tables']['documents']['Row']
export type VectorStore = Database['public']['Tables']['vector_stores']['Row']
export type DocumentVectorStore = Database['public']['Tables']['document_vector_stores']['Row']
export type ChatMessageAnnotation = Database['public']['Tables']['chat_message_annotations']['Row']

// Status enums
export type ThreadStatus = 'queued' | 'in_progress' | 'requires_action' | 'cancelling' | 'cancelled' | 'failed' | 'completed' | 'expired'
export type VectorStoreStatus = 'processing' | 'ready' | 'failed'
export type DocumentProcessingStatus = 'pending' | 'processing' | 'completed' | 'failed'

// Supabase client response types
export interface SupabaseResponse<T> {
  data: T | null
  error: Error | null
}

export interface SupabaseAuthResponse {
  data: {
    user: {
      id: string
      email?: string
    } | null
    session: unknown
  }
  error: Error | null
}
