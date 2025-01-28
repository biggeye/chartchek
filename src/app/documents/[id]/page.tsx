'use client'

import { Badge } from '@/components/badge'
import { Button } from '@/components/button'
import { DescriptionDetails, DescriptionList, DescriptionTerm } from '@/components/description-list'
import { Divider } from '@/components/divider'
import { Heading } from '@/components/heading'
import { Link } from '@/components/link'
import { ChevronLeftIcon, DocumentIcon, CalendarIcon, BuildingOfficeIcon } from '@heroicons/react/20/solid'
import { notFound } from 'next/navigation'

// This would come from your API in a real application
interface Document {
  id: string
  filename: string
  fileType: string
  facility: string
  category: string
  timestamp: string
  url: string
  status: 'active' | 'archived'
  size: string
  uploadedBy: {
    name: string
    email: string
  }
  lastModified: string
  description?: string
  tags: string[]
}

// Mock data - replace with actual API call
const getDocument = async (id: string): Promise<Document | null> => {
  return {
    id: '1',
    filename: 'patient-safety-report-2024.pdf',
    fileType: 'PDF',
    facility: 'Memorial Hospital',
    category: 'Safety Reports',
    timestamp: '2024-01-27T10:30:00Z',
    url: '#',
    status: 'active',
    size: '2.4 MB',
    uploadedBy: {
      name: 'John Smith',
      email: 'john.smith@hospital.com'
    },
    lastModified: '2024-01-27T10:30:00Z',
    description: 'Annual patient safety report for 2024 covering all departments',
    tags: ['safety', 'annual-report', '2024']
  }
}

export default async function DocumentDetail({ params }: { params: { id: string } }) {
  const document = await getDocument(params.id)

  if (!document) {
    notFound()
  }

  return (
    <div className="p-6">
      <div className="max-lg:hidden">
        <Link href="/documents" className="inline-flex items-center gap-2 text-sm/6 text-zinc-500 dark:text-zinc-400">
          <ChevronLeftIcon className="size-4 fill-zinc-400 dark:fill-zinc-500" />
          Documents
        </Link>
      </div>
      <div className="mt-4 lg:mt-8">
        <div className="flex items-center gap-4">
          <DocumentIcon className="h-8 w-8 text-gray-400" />
          <div>
            <Heading>{document.filename}</Heading>
            <Badge color={document.status === 'active' ? 'lime' : 'yellow'}>{document.status}</Badge>
          </div>
        </div>
        
        <div className="mt-8">
          <DescriptionList>
            <DescriptionTerm>File Information</DescriptionTerm>
            <DescriptionDetails>
              <div className="flex flex-col gap-2">
                <span>Type: {document.fileType}</span>
                <span>Size: {document.size}</span>
                <span>Uploaded: {new Date(document.timestamp).toLocaleString()}</span>
                <span>Last Modified: {new Date(document.lastModified).toLocaleString()}</span>
              </div>
            </DescriptionDetails>

            <DescriptionTerm>Facility</DescriptionTerm>
            <DescriptionDetails>
              <div className="flex items-center gap-2">
                <BuildingOfficeIcon className="h-5 w-5 text-gray-400" />
                <span>{document.facility}</span>
              </div>
            </DescriptionDetails>

            <DescriptionTerm>Category</DescriptionTerm>
            <DescriptionDetails>{document.category}</DescriptionDetails>

            <DescriptionTerm>Description</DescriptionTerm>
            <DescriptionDetails>{document.description || 'No description provided'}</DescriptionDetails>

            <DescriptionTerm>Tags</DescriptionTerm>
            <DescriptionDetails>
              <div className="flex gap-2">
                {document.tags.map(tag => (
                  <Badge key={tag} color="blue">{tag}</Badge>
                ))}
              </div>
            </DescriptionDetails>

            <DescriptionTerm>Uploaded By</DescriptionTerm>
            <DescriptionDetails>
              <div className="flex flex-col">
                <span>{document.uploadedBy.name}</span>
                <span className="text-sm text-gray-500">{document.uploadedBy.email}</span>
              </div>
            </DescriptionDetails>
          </DescriptionList>
        </div>

        <div className="mt-8 flex gap-4">
          <Button>Download</Button>
          <Button plain>Share</Button>
          {document.status === 'active' && (
            <Button color="red">Archive</Button>
          )}
        </div>
      </div>
    </div>
  )
}
