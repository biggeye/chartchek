'use client'

import { Button } from '@/components/button'
import { Heading } from '@/components/heading'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/table'
import { DocumentIcon } from '@heroicons/react/20/solid'
import { useState } from 'react'
import { Dialog } from '@headlessui/react'

interface Document {
  id: string
  filename: string
  fileType: string
  facility: string
  category: string
  timestamp: string
  url: string
}

// This would typically come from your API
const documents: Document[] = [
  {
    id: '1',
    filename: 'patient-safety-report-2024.pdf',
    fileType: 'PDF',
    facility: 'Memorial Hospital',
    category: 'Safety Reports',
    timestamp: '2024-01-27T10:30:00Z',
    url: '#',
  },
  {
    id: '2',
    filename: 'compliance-checklist-q1.xlsx',
    fileType: 'Excel',
    facility: 'City Medical Center',
    category: 'Compliance',
    timestamp: '2024-01-26T15:45:00Z',
    url: '#',
  },
  // Add more sample documents as needed
]

export default function Documents() {
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null)

  const handleRowClick = (docId: string) => {
    setSelectedDocId(docId)
  }

  const handleCloseModal = () => {
    setSelectedDocId(null)
  }

  return (
    <>
      <div className="flex items-end justify-between gap-4">
        <Heading>Documents</Heading>
        <Button className="-my-0.5">Upload Document</Button>
      </div>
      <Table className="mt-8 [--gutter:--spacing(6)] lg:[--gutter:--spacing(10)]">
        <TableHead>
          <TableRow>
            <TableHeader>Filename</TableHeader>
            <TableHeader>Type</TableHeader>
            <TableHeader>Facility</TableHeader>
            <TableHeader>Category</TableHeader>
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
              <TableCell className="text-zinc-500">{document.fileType}</TableCell>
              <TableCell>{document.facility}</TableCell>
              <TableCell>{document.category}</TableCell>
              <TableCell>{new Date(document.timestamp).toLocaleString()}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Dialog 
        open={selectedDocId !== null} 
        onClose={handleCloseModal}
        className="relative z-50"
      >
        <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
        
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className="mx-auto max-w-3xl rounded-xl bg-white dark:bg-zinc-900">
            {selectedDocId && (
              <iframe
                src={`/documents/${selectedDocId}`}
                className="w-full h-[80vh] rounded-xl"
                title="Document Details"
              />
            )}
          </Dialog.Panel>
        </div>
      </Dialog>
    </>
  )
}
