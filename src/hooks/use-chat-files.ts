import { useState } from 'react';

interface UploadedFile {
  id: string;
  filename: string;
  bytes: number;
  purpose: 'assistants' | 'assistants_output';
}

interface UseChatFilesOptions {
  threadId: string;
  onUploadSuccess?: (file: UploadedFile) => void;
  onUploadError?: (error: Error) => void;
  onDeleteSuccess?: (fileId: string) => void;
  onDeleteError?: (error: Error) => void;
}

export function useChatFiles({
  threadId,
  onUploadSuccess,
  onUploadError,
  onDeleteSuccess,
  onDeleteError,
}: UseChatFilesOptions) {
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const uploadFile = async (
    file: File,
    purpose: 'assistants' | 'assistants_output' = 'assistants'
  ) => {
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('threadId', threadId);
      formData.append('purpose', purpose);

      const response = await fetch('/api/chat/files', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error);
      }

      const uploadedFile = await response.json();
      onUploadSuccess?.(uploadedFile);
      return uploadedFile;
    } catch (error) {
      console.error('Error uploading file:', error);
      onUploadError?.(error instanceof Error ? error : new Error('Upload failed'));
      throw error;
    } finally {
      setIsUploading(false);
    }
  };

  const deleteFile = async (fileId: string) => {
    setIsDeleting(true);
    try {
      const response = await fetch(
        `/api/chat/files?fileId=${fileId}&threadId=${threadId}`,
        {
          method: 'DELETE',
        }
      );

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error);
      }

      onDeleteSuccess?.(fileId);
    } catch (error) {
      console.error('Error deleting file:', error);
      onDeleteError?.(error instanceof Error ? error : new Error('Delete failed'));
      throw error;
    } finally {
      setIsDeleting(false);
    }
  };

  return {
    uploadFile,
    deleteFile,
    isUploading,
    isDeleting,
  };
}
