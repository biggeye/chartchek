'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/button'
import { Heading } from '@/components/heading'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/table'
import { DocumentIcon } from '@heroicons/react/20/solid'
import { Dialog } from '@headlessui/react'
import { DocumentUploadDialog } from '@/components/custom/DocumentUploadDialog'
import { createClient } from '@/utils/supabase/client'

interface Document {
  id: string
  filename: string
  file_type: string
  facility: string
  category: string
  created_at: string
  file_id: string
  size_bytes: number
}

export default function Documents() {
  const [documents, setDocuments] = useState<Document[]>([])
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null)
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const supabase = createClient()

  const loadDocuments = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setDocuments(data || [])
    } catch (error) {
      console.error('Error loading documents:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadDocuments()

    // Subscribe to changes
    const channel = supabase
      .channel('documents_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'documents'
        },
        () => {
          loadDocuments()
        }
      )
      .subscribe()

    return () => {
      channel.unsubscribe()
    }
  }, [])

  const handleRowClick = async (docId: string) => {
    try {
      // Get the file URL from OpenAI
      const doc = documents.find(d => d.id === docId)
      if (!doc) return

      // For now, we'll just show the document ID
      // In a real app, you'd want to create a secure URL to view/download the file
      setSelectedDocId(docId)
    } catch (error) {
      console.error('Error getting document URL:', error)
    }
  }

  const handleCloseModal = () => {
    setSelectedDocId(null)
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gray-900 dark:border-white"></div>
      </div>
    )
  }

  return (
    <>
      <div className="flex items-end justify-between gap-4">
        <Heading>Documents</Heading>
        <Button 
          className="-my-0.5"
          color="zinc"
          onClick={() => setIsUploadDialogOpen(true)}
        >
          Upload Document
        </Button>
      </div>

      {documents.length === 0 ? (
        <div className="mt-8 text-center">
          <DocumentIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-semibold text-gray-900 dark:text-white">No documents</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-zinc-400">
            Get started by uploading a document.
          </p>
        </div>
      ) : (
        <Table className="mt-8 [--gutter:--spacing(6)] lg:[--gutter:--spacing(10)]">
          <TableHead>
            <TableRow>
              <TableHeader>Filename</TableHeader>
              <TableHeader>Type</TableHeader>
              <TableHeader>Facility</TableHeader>
              <TableHeader>Category</TableHeader>
              <TableHeader>Size</TableHeader>
              <TableHeader>Uploaded</TableHeader>
            </TableRow>
          </TableHead>
          <TableBody>
            {documents.map((document) => (
              <TableRow 
                key={document.id} 
                onClick={() => handleRowClick(document.id)}
                className="cursor-pointer hover:bg-gray-50 dark:hover:bg-zinc-800/50"
              >
                <TableCell>
                  <div className="flex items-center gap-2">
                    <DocumentIcon className="h-5 w-5 text-gray-400" />
                    <span>{document.filename}</span>
                  </div>
                </TableCell>
                <TableCell className="text-zinc-500">{document.file_type.toUpperCase()}</TableCell>
                <TableCell>{document.facility}</TableCell>
                <TableCell>{document.category}</TableCell>
                <TableCell>{formatFileSize(document.size_bytes)}</TableCell>
                <TableCell>{new Date(document.created_at).toLocaleString()}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {/* Document Preview Dialog */}
      <Dialog 
        open={selectedDocId !== null} 
        onClose={handleCloseModal}
        className="relative z-50"
      >
        <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
        
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className="mx-auto max-w-3xl rounded-xl bg-white dark:bg-zinc-900 p-4">
            <div className="flex justify-between items-center mb-4">
              <Dialog.Title className="text-lg font-semibold">
                Document Preview
              </Dialog.Title>
              <Button
                color="zinc"
                onClick={handleCloseModal}
              >
                Close
              </Button>
            </div>
            {selectedDocId && documents.find(d => d.id === selectedDocId) && (
              <div className="text-sm">
                <p>Document ID: {selectedDocId}</p>
                <p>File ID: {documents.find(d => d.id === selectedDocId)?.file_id}</p>
                <p className="mt-4 text-zinc-500">
                  Note: Document preview is not yet implemented. This would typically show a PDF viewer or appropriate preview based on the file type.
                </p>
              </div>
            )}
          </Dialog.Panel>
        </div>
      </Dialog>

      {/* Upload Dialog */}
      <DocumentUploadDialog
        isOpen={isUploadDialogOpen}
        onClose={() => setIsUploadDialogOpen(false)}
        onUploadSuccess={() => {
          loadDocuments()
          setIsUploadDialogOpen(false)
        }}
      />
    </>
  )
}
