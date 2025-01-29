import { create } from 'zustand'
import { createClient } from '@/utils/supabase/client'
import { openai } from '@/lib'
import type { StateCreator } from 'zustand'
import type { 
  ChatThread, 
  ChatMessage, 
  Document, 
  VectorStore,
  ThreadStatus,
  DocumentProcessingStatus,
  VectorStoreStatus 
} from '@/types'

interface StoreState {
  // Chat State
  currentThreadId: string | null
  threads: Record<string, ChatThread>
  messages: Record<string, ChatMessage[]>
  isLoading: boolean
  error: Error | null

  // Document State
  documents: Record<string, Document>
  vectorStores: Record<string, VectorStore>
  uploadProgress: Record<string, number>
}

interface StoreActions {
  setCurrentThread: (threadId: string) => void
  createThread: (assistantId: string, title?: string) => Promise<ChatThread>
  sendMessage: (content: string, files?: File[]) => Promise<void>
  uploadDocument: (
    file: File,
    facility: string,
    category: string
  ) => Promise<Document>
  createVectorStore: (
    name: string,
    documentIds: string[]
  ) => Promise<VectorStore>
  syncMessages: (threadId: string) => Promise<void>
  deleteDocument: (documentId: string) => Promise<void>
}

type Store = StoreState & StoreActions

const createStore: StateCreator<Store> = (set, get) => ({
  // Initial State
  currentThreadId: null,
  threads: {},
  messages: {},
  documents: {},
  vectorStores: {},
  uploadProgress: {},
  isLoading: false,
  error: null,

  // Actions
  setCurrentThread: (threadId: string) => {
    set({ currentThreadId: threadId })
    get().syncMessages(threadId)
  },

  createThread: async (assistantId: string, title?: string) => {
    set({ isLoading: true, error: null })
    const supabase = createClient()

    try {
      // Create OpenAI thread
      const openaiThread = await openai.beta.threads.create()

      // Create thread in Supabase
      const { data: thread, error } = await supabase
        .from('chat_threads')
        .insert({
          assistant_id: assistantId,
          title: title || 'New Chat',
          metadata: {
            openai_thread_id: openaiThread.id
          },
          status: 'queued' as ThreadStatus
        })
        .select()
        .single()

      if (error) throw error

      // Update store
      set((state: StoreState) => ({
        threads: { ...state.threads, [thread.id]: thread },
        currentThreadId: thread.id,
        isLoading: false
      }))

      return thread
    } catch (error) {
      set({ error: error as Error, isLoading: false })
      throw error
    }
  },

  sendMessage: async (content: string, files: File[] = []) => {
    const { currentThreadId } = get()
    if (!currentThreadId) throw new Error('No active thread')

    set({ isLoading: true, error: null })
    const supabase = createClient()

    try {
      // 1. Upload files if any
      const fileIds = await Promise.all(
        files.map(async (file) => {
          const openaiFile = await openai.files.create({
            file,
            purpose: 'assistants'
          })

          // Save file reference
          await supabase
            .from('chat_files')
            .insert({
              thread_id: currentThreadId,
              file_id: openaiFile.id,
              filename: file.name,
              purpose: 'assistants',
              bytes: file.size
            })

          return openaiFile.id
        })
      )

      // 2. Get OpenAI thread ID
      const { data: thread } = await supabase
        .from('chat_threads')
        .select()
        .eq('id', currentThreadId)
        .single()

      const openaiThreadId = thread.metadata.openai_thread_id

      // 3. Send message to OpenAI
      await openai.beta.threads.messages.create(openaiThreadId, {
        role: 'user',
        content,
        file_ids: fileIds
      } as any) // Type assertion needed until OpenAI types are updated

      // 4. Save message to Supabase
      const { data: message } = await supabase
        .from('chat_messages')
        .insert({
          thread_id: currentThreadId,
          role: 'user',
          content
        })
        .select()
        .single()

      // 5. Create run
      const run = await openai.beta.threads.runs.create(
        openaiThreadId,
        { assistant_id: thread.assistant_id }
      )

      // 6. Update thread status
      await supabase
        .from('chat_threads')
        .update({
          status: 'in_progress',
          metadata: {
            ...thread.metadata,
            current_run_id: run.id
          }
        })
        .eq('id', currentThreadId)

      // 7. Update store
      set((state: StoreState) => ({
        messages: {
          ...state.messages,
          [currentThreadId]: [...(state.messages[currentThreadId] || []), message]
        },
        isLoading: false
      }))

      // 8. Start polling for completion
      get().syncMessages(currentThreadId)
    } catch (error) {
      set({ error: error as Error, isLoading: false })
      throw error
    }
  },

  uploadDocument: async (file: File, facility: string, category: string) => {
    set((state: StoreState) => ({
      uploadProgress: { ...state.uploadProgress, [file.name]: 0 }
    }))

    const supabase = createClient()

    try {
      // 1. Upload to Supabase Storage
      const storagePath = `documents/${facility}/${category}/${file.name}`
      const { error: storageError } = await supabase
        .storage
        .from('documents')
        .upload(storagePath, file)

      if (storageError) throw storageError

      // 2. Upload to OpenAI
      const openaiFile = await openai.files.create({
        file,
        purpose: 'assistants'
      })

      // 3. Create document record
      const { data: document, error: dbError } = await supabase
        .from('documents')
        .insert({
          filename: file.name,
          file_type: file.type.split('/')[1],
          facility,
          category,
          file_id: openaiFile.id,
          size_bytes: file.size,
          storage_path: storagePath,
          mime_type: file.type,
          processing_status: 'pending' as DocumentProcessingStatus
        })
        .select()
        .single()

      if (dbError) throw dbError

      // 4. Update store
      set((state: StoreState) => ({
        documents: { ...state.documents, [document.id]: document },
        uploadProgress: {
          ...state.uploadProgress,
          [file.name]: 100
        }
      }))

      return document
    } catch (error) {
      set((state: StoreState) => ({
        error: error as Error,
        uploadProgress: {
          ...state.uploadProgress,
          [file.name]: -1 // indicates error
        }
      }))
      throw error
    }
  },

  createVectorStore: async (name: string, documentIds: string[]) => {
    set({ isLoading: true, error: null })
    const supabase = createClient()

    try {
      // 1. Get OpenAI file IDs
      const { data: documents } = await supabase
        .from('documents')
        .select('file_id')
        .in('id', documentIds)

      if (!documents) throw new Error('No documents found')

      // 2. Create OpenAI vector store
      const vectorStore = await openai.beta.vectorStores.create({
        name,
        file_ids: documents.map(d => d.file_id)
      })

      // 3. Create vector store record
      const { data: dbVectorStore, error } = await supabase
        .from('vector_stores')
        .insert({
          name,
          openai_vector_store_id: vectorStore.id,
          status: 'processing' as VectorStoreStatus
        })
        .select()
        .single()

      if (error) throw error

      // 4. Create mappings
      await supabase
        .from('document_vector_stores')
        .insert(
          documentIds.map(docId => ({
            document_id: docId,
            vector_store_id: dbVectorStore.id
          }))
        )

      // 5. Update store
      set((state: StoreState) => ({
        vectorStores: { ...state.vectorStores, [dbVectorStore.id]: dbVectorStore },
        isLoading: false
      }))

      return dbVectorStore
    } catch (error) {
      set({ error: error as Error, isLoading: false })
      throw error
    }
  },

  syncMessages: async (threadId: string) => {
    const supabase = createClient()

    try {
      // 1. Get thread status
      const { data: thread } = await supabase
        .from('chat_threads')
        .select()
        .eq('id', threadId)
        .single()

      if (thread.status === 'in_progress' && thread.metadata.current_run_id) {
        const openaiThreadId = thread.metadata.openai_thread_id
        const runId = thread.metadata.current_run_id

        // 2. Check run status
        const run = await openai.beta.threads.runs.retrieve(
          openaiThreadId,
          runId
        )

        if (run.status === 'completed') {
          // 3. Get new messages
          const messages = await openai.beta.threads.messages.list(
            openaiThreadId
          )

          // 4. Save new messages to Supabase
          for (const msg of messages.data) {
            if (msg.role === 'assistant' && 'text' in msg.content[0]) {
              const { data: existingMsg } = await supabase
                .from('chat_messages')
                .select()
                .eq('thread_id', threadId)
                .eq('role', 'assistant')
                .eq('content', msg.content[0].text.value)
                .maybeSingle()

              if (!existingMsg) {
                await supabase
                  .from('chat_messages')
                  .insert({
                    thread_id: threadId,
                    role: 'assistant',
                    content: msg.content[0].text.value
                  })
              }
            }
          }

          // 5. Update thread status
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
        }
      }

      // 6. Get all messages
      const { data: messages } = await supabase
        .from('chat_messages')
        .select()
        .eq('thread_id', threadId)
        .order('created_at')

      // 7. Update store
      set((state: StoreState) => ({
        messages: { ...state.messages, [threadId]: messages || [] }
      }))
    } catch (error) {
      set({ error: error as Error })
    }
  },

  deleteDocument: async (documentId: string) => {
    const supabase = createClient()

    try {
      // 1. Get document details
      const { data: document } = await supabase
        .from('documents')
        .select()
        .eq('id', documentId)
        .single()

      // 2. Delete from OpenAI
      if (document.file_id) {
        await openai.files.del(document.file_id)
      }

      // 3. Delete from Supabase Storage
      if (document.storage_path) {
        await supabase
          .storage
          .from('documents')
          .remove([document.storage_path])
      }

      // 4. Delete from database
      await supabase
        .from('documents')
        .delete()
        .eq('id', documentId)

      // 5. Update store
      set((state: StoreState) => {
        const { [documentId]: _, ...remainingDocs } = state.documents
        return { documents: remainingDocs }
      })
    } catch (error) {
      set({ error: error as Error })
      throw error
    }
  }
})

export const useStore = create(createStore)
