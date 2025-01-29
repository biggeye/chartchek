'use client'

import { useState } from 'react'
import { Dialog } from '@headlessui/react'
import { Button } from '@/components/button'
import { useChatFiles } from '@/hooks/use-chat-files'
import { createClient } from '@/utils/supabase/client'
import { DocumentIcon, XMarkIcon } from '@heroicons/react/24/outline'

interface DocumentUploadDialogProps {
  isOpen: boolean
  onClose: () => void
  onUploadSuccess?: () => void
}

export function DocumentUploadDialog({
  isOpen,
  onClose,
  onUploadSuccess,
}: DocumentUploadDialogProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [facility, setFacility] = useState('')
  const [category, setCategory] = useState('')
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  // We'll create a thread for each document
  const { uploadFile } = useChatFiles({
    threadId: '', // We'll set this after creating the thread
    onUploadSuccess: async (file) => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) throw new Error('Not authenticated')

        // Create document record
        const { error } = await supabase.from('documents').insert({
          filename: file.filename,
          file_type: file.filename.split('.').pop() || 'unknown',
          facility,
          category,
          file_id: file.id,
          user_id: session.user.id,
          size_bytes: file.bytes
        })

        if (error) throw error

        onUploadSuccess?.()
        onClose()
      } catch (err) {
        console.error('Error saving document:', err)
        setError('Failed to save document')
      }
    },
    onUploadError: (err) => {
      console.error('Error uploading file:', err)
      setError('Failed to upload file')
    }
  })

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedFile(file)
      setError(null)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedFile || !facility || !category) {
      setError('Please fill in all fields')
      return
    }

    setIsUploading(true)
    setError(null)

    try {
      await uploadFile(selectedFile, 'assistants')
    } catch (err) {
      console.error('Error uploading:', err)
      setError('Upload failed')
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <Dialog 
      open={isOpen} 
      onClose={onClose}
      className="relative z-50"
    >
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
      
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="mx-auto w-full max-w-md rounded-xl bg-white dark:bg-zinc-900 p-6">
          <div className="flex items-center justify-between mb-4">
            <Dialog.Title className="text-lg font-semibold">
              Upload Document
            </Dialog.Title>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                File
              </label>
              <div className="mt-1 flex justify-center rounded-lg border border-dashed border-gray-900/25 dark:border-zinc-700 px-6 py-10">
                <div className="text-center">
                  {selectedFile ? (
                    <div className="flex items-center gap-2 text-sm">
                      <DocumentIcon className="h-5 w-5 text-gray-400" />
                      <span>{selectedFile.name}</span>
                    </div>
                  ) : (
                    <div className="mt-4 flex text-sm leading-6 text-gray-600 dark:text-zinc-400">
                      <label
                        htmlFor="file-upload"
                        className="relative cursor-pointer rounded-md bg-white dark:bg-zinc-900 font-semibold text-blue-600 focus-within:outline-none focus-within:ring-2 focus-within:ring-blue-600 focus-within:ring-offset-2 hover:text-blue-500"
                      >
                        <span>Upload a file</span>
                        <input
                          id="file-upload"
                          name="file-upload"
                          type="file"
                          className="sr-only"
                          onChange={handleFileChange}
                        />
                      </label>
                      <p className="pl-1">or drag and drop</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Facility
              </label>
              <input
                type="text"
                value={facility}
                onChange={(e) => setFacility(e.target.value)}
                className="block w-full rounded-md border-0 py-1.5 text-gray-900 dark:text-white shadow-sm ring-1 ring-inset ring-gray-300 dark:ring-zinc-700 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 dark:bg-zinc-800 sm:text-sm sm:leading-6"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Category
              </label>
              <input
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="block w-full rounded-md border-0 py-1.5 text-gray-900 dark:text-white shadow-sm ring-1 ring-inset ring-gray-300 dark:ring-zinc-700 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 dark:bg-zinc-800 sm:text-sm sm:leading-6"
              />
            </div>

            {error && (
              <div className="text-sm text-red-600 dark:text-red-400">
                {error}
              </div>
            )}

            <div className="flex justify-end gap-3">
              <Button
                type="button"
                color="zinc"
                onClick={onClose}
                disabled={isUploading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                color="blue"
                disabled={!selectedFile || !facility || !category || isUploading}
              >
                {isUploading ? 'Uploading...' : 'Upload'}
              </Button>
            </div>
          </form>
        </Dialog.Panel>
      </div>
    </Dialog>
  )
}
