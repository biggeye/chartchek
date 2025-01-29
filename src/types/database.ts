// Database types for Supabase schema

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

// Status types
export type ThreadStatus = 'queued' | 'in_progress' | 'requires_action' | 'cancelling' | 'cancelled' | 'failed' | 'completed' | 'expired'
export type VectorStoreStatus = 'processing' | 'ready' | 'failed'
export type DocumentProcessingStatus = 'pending' | 'processing' | 'completed' | 'failed'

// High-level types for application use
export interface ChatThread {
  id: string
  user_id: string
  assistant_id: string
  metadata: {
    openai_thread_id: string
    [key: string]: any
  }
  status: ThreadStatus
  created_at: string
  updated_at: string
}

export interface ChatMessage {
  id: string
  thread_id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  created_at: string
}

export interface ChatFile {
  id: string
  thread_id: string
  file_id: string
  filename: string
  purpose: 'assistants' | 'assistants_output'
  bytes: number | null
  metadata: Record<string, any>
  created_at: string
}

export interface Document {
  id: string
  user_id: string
  filename: string
  file_type: string
  facility: string
  category: string
  file_id: string
  size_bytes: number
  vector_store_id: string | null
  processing_status: DocumentProcessingStatus
  storage_path: string | null
  mime_type: string | null
  metadata: Record<string, any>
  created_at: string
  updated_at: string
}

export interface VectorStore {
  id: string
  user_id: string
  openai_vector_store_id: string
  name: string
  status: VectorStoreStatus
  expires_at: string | null
  metadata: Record<string, any>
  created_at: string
  updated_at: string
}

export interface DocumentVectorStore {
  id: string
  document_id: string
  vector_store_id: string
  created_at: string
}

export interface ChatMessageAnnotation {
  id: string
  message_id: string
  type: 'file_citation' | 'file_path'
  text: string
  file_id: string | null
  quote: string | null
  start_index: number | null
  end_index: number | null
  created_at: string
}

// Supabase database schema types
export interface Database {
  public: {
    Tables: {
      chat_threads: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          user_id: string
          assistant_id: string
          thread_id: string
          title: string | null
          status: ThreadStatus
          current_run_id: string | null
          metadata: Json
        }
        Insert: {
          id?: string
          created_at?: string
          updated_at?: string
          user_id: string
          assistant_id: string
          thread_id: string
          title?: string | null
          status?: ThreadStatus
          current_run_id?: string | null
          metadata?: Json
        }
        Update: {
          id?: string
          created_at?: string
          updated_at?: string
          user_id?: string
          assistant_id?: string
          thread_id?: string
          title?: string | null
          status?: ThreadStatus
          current_run_id?: string | null
          metadata?: Json
        }
      }
      chat_messages: {
        Row: {
          id: string
          created_at: string
          thread_id: string
          role: 'user' | 'assistant' | 'system'
          content: string
        }
        Insert: {
          id?: string
          created_at?: string
          thread_id: string
          role: 'user' | 'assistant' | 'system'
          content: string
        }
        Update: {
          id?: string
          created_at?: string
          thread_id?: string
          role?: 'user' | 'assistant' | 'system'
          content?: string
        }
      }
      chat_files: {
        Row: {
          id: string
          created_at: string
          thread_id: string
          file_id: string
          filename: string
          purpose: 'assistants' | 'assistants_output'
          bytes: number | null
          metadata: Json
        }
        Insert: {
          id?: string
          created_at?: string
          thread_id: string
          file_id: string
          filename: string
          purpose: 'assistants' | 'assistants_output'
          bytes?: number | null
          metadata?: Json
        }
        Update: {
          id?: string
          created_at?: string
          thread_id?: string
          file_id?: string
          filename?: string
          purpose?: 'assistants' | 'assistants_output'
          bytes?: number | null
          metadata?: Json
        }
      }
      documents: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          user_id: string
          filename: string
          file_type: string
          facility: string
          category: string
          file_id: string
          size_bytes: number
          metadata: Json
        }
        Insert: {
          id?: string
          created_at?: string
          updated_at?: string
          user_id: string
          filename: string
          file_type: string
          facility: string
          category: string
          file_id: string
          size_bytes: number
          metadata?: Json
        }
        Update: {
          id?: string
          created_at?: string
          updated_at?: string
          user_id?: string
          filename?: string
          file_type?: string
          facility?: string
          category?: string
          file_id?: string
          size_bytes?: number
          metadata?: Json
        }
      }
      user_assistants: {
        Row: {
          id: string
          created_at: string
          user_id: string
          assistant_key: string
          assistant_id: string
        }
        Insert: {
          id?: string
          created_at?: string
          user_id: string
          assistant_key: string
          assistant_id: string
        }
        Update: {
          id?: string
          created_at?: string
          user_id?: string
          assistant_key?: string
          assistant_id?: string
        }
      }
    }
  }
}
