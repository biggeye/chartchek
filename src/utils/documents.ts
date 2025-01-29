import { createClient } from '@/utils/supabase/client'
import { openaiClient } from '@/lib/openai-client'
import { Document, VectorStore } from '@/types/database'

export async function uploadDocument(
  file: File,
  userId: string,
  facility: string,
  category: string
): Promise<Document> {
  const supabase = createClient()
  
  // 1. Upload to Supabase Storage
  const storagePath = `documents/${userId}/${facility}/${category}/${file.name}`
  const { data: storageData, error: storageError } = await supabase
    .storage
    .from('documents')
    .upload(storagePath, file)
  
  if (storageError) throw storageError

  // 2. Upload to OpenAI
  const openaiFile = await openaiClient.files.create({
    file,
    purpose: "assistants"
  })

  // 3. Create document record
  const { data: document, error: dbError } = await supabase
    .from('documents')
    .insert({
      user_id: userId,
      filename: file.name,
      file_type: file.type.split('/')[1],
      mime_type: file.type,
      facility,
      category,
      file_id: openaiFile.id,
      size_bytes: file.size,
      storage_path: storagePath,
      processing_status: 'pending'
    })
    .select()
    .single()

  if (dbError) throw dbError

  return document
}

export async function createVectorStore(
  name: string,
  userId: string,
  documentIds: string[]
): Promise<VectorStore> {
  const supabase = createClient()

  // 1. Get OpenAI file IDs for the documents
  const { data: documents, error: docError } = await supabase
    .from('documents')
    .select('file_id')
    .in('id', documentIds)
    .eq('user_id', userId)

  if (docError) throw docError

  // 2. Create OpenAI vector store
  const vectorStore = await openaiClient.beta.vectorStores.create({
    name,
    file_ids: documents.map(d => d.file_id)
  })

  // 3. Create vector store record
  const { data: dbVectorStore, error: dbError } = await supabase
    .from('vector_stores')
    .insert({
      user_id: userId,
      name,
      openai_vector_store_id: vectorStore.id,
      status: 'processing',
      expires_at: null // Set based on your requirements
    })
    .select()
    .single()

  if (dbError) throw dbError

  // 4. Create document-vector store mappings
  const { error: mappingError } = await supabase
    .from('document_vector_stores')
    .insert(
      documentIds.map(docId => ({
        document_id: docId,
        vector_store_id: dbVectorStore.id
      }))
    )

  if (mappingError) throw mappingError

  return dbVectorStore
}

export async function updateVectorStoreStatus(
  vectorStoreId: string,
  status: 'processing' | 'ready' | 'failed'
): Promise<void> {
  const supabase = createClient()

  const { error } = await supabase
    .from('vector_stores')
    .update({ status })
    .eq('id', vectorStoreId)

  if (error) throw error
}

export async function getDocumentVectorStores(
  documentId: string
): Promise<VectorStore[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('document_vector_stores')
    .select(`
      vector_store:vector_stores (
        id,
        user_id,
        openai_vector_store_id,
        name,
        status,
        expires_at,
        metadata,
        created_at,
        updated_at
      )
    `)
    .eq('document_id', documentId)

  if (error) throw error

  return data.map(d => d.vector_store)
}

export async function deleteDocument(documentId: string): Promise<void> {
  const supabase = createClient()

  // 1. Get document details
  const { data: document, error: docError } = await supabase
    .from('documents')
    .select('file_id, storage_path')
    .eq('id', documentId)
    .single()

  if (docError) throw docError

  // 2. Delete from OpenAI
  if (document.file_id) {
    await openaiClient.files.del(document.file_id)
  }

  // 3. Delete from Supabase Storage
  if (document.storage_path) {
    const { error: storageError } = await supabase
      .storage
      .from('documents')
      .remove([document.storage_path])

    if (storageError) throw storageError
  }

  // 4. Delete from database (cascade will handle related records)
  const { error: dbError } = await supabase
    .from('documents')
    .delete()
    .eq('id', documentId)

  if (dbError) throw dbError
}
