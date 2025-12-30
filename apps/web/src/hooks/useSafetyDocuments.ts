/**
 * Hook for handling safety document uploads and deletions.
 *
 * Story 0.5.2: Safety Request Documentation Upload
 *
 * CRITICAL SAFETY DESIGN:
 * This hook handles document uploads for potential domestic abuse victims.
 * Uses neutral language and error messages to avoid triggering suspicion.
 *
 * Key features:
 * - Upload documents linked to safety tickets
 * - Track upload progress
 * - Delete documents when requested
 * - Neutral error messages (no "abuse" or "escape" terminology)
 */

import { useState, useCallback } from 'react'
import { getFunctions, httpsCallable } from 'firebase/functions'

/**
 * Maximum file size for safety documents (25MB).
 * Duplicated from contracts to avoid build issues.
 */
const SAFETY_DOCUMENT_MAX_SIZE_BYTES = 25 * 1024 * 1024

/**
 * Maximum total upload size per ticket (100MB).
 * Duplicated from contracts to avoid build issues.
 */
const SAFETY_DOCUMENT_MAX_TOTAL_SIZE_BYTES = 100 * 1024 * 1024

/**
 * Allowed MIME types for safety documents.
 */
type SafetyDocumentMimeType =
  | 'application/pdf'
  | 'image/jpeg'
  | 'image/png'
  | 'application/msword'
  | 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'

/**
 * Uploaded document metadata (returned from successful uploads).
 */
export interface UploadedDocument {
  documentId: string
  filename: string
  sizeBytes: number
  mimeType: SafetyDocumentMimeType
}

/**
 * Upload state for tracking individual file uploads.
 */
export interface UploadState {
  filename: string
  progress: number // 0-100
  status: 'pending' | 'uploading' | 'complete' | 'error'
  error?: string
  documentId?: string
}

/**
 * Return type for useSafetyDocuments hook.
 */
export interface UseSafetyDocumentsReturn {
  /** Upload a single document */
  uploadDocument: (ticketId: string, file: File) => Promise<UploadedDocument | null>
  /** Upload multiple documents */
  uploadDocuments: (ticketId: string, files: File[]) => Promise<UploadedDocument[]>
  /** Delete a document */
  deleteDocument: (documentId: string) => Promise<boolean>
  /** Current upload states */
  uploads: UploadState[]
  /** Whether any upload is in progress */
  isUploading: boolean
  /** Last error message */
  error: string | null
  /** Clear all upload states */
  clearUploads: () => void
}

/**
 * Allowed MIME types for safety documents.
 */
const ALLOWED_MIME_TYPES: SafetyDocumentMimeType[] = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]

/**
 * Maps file extensions to MIME types.
 */
const EXTENSION_TO_MIME: Record<string, SafetyDocumentMimeType> = {
  pdf: 'application/pdf',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
}

/**
 * Validate a file for upload.
 */
function validateFile(file: File): { valid: boolean; error?: string } {
  // Check file size
  if (file.size > SAFETY_DOCUMENT_MAX_SIZE_BYTES) {
    const maxSizeMB = SAFETY_DOCUMENT_MAX_SIZE_BYTES / 1024 / 1024
    return {
      valid: false,
      error: `File exceeds maximum size of ${maxSizeMB}MB`,
    }
  }

  // Check MIME type
  const mimeType = getMimeType(file)
  if (!mimeType) {
    return {
      valid: false,
      error: 'File type not supported. Please use PDF, JPG, PNG, DOC, or DOCX files.',
    }
  }

  return { valid: true }
}

/**
 * Get the MIME type for a file.
 */
function getMimeType(file: File): SafetyDocumentMimeType | null {
  // First check the file's declared type
  if (ALLOWED_MIME_TYPES.includes(file.type as SafetyDocumentMimeType)) {
    return file.type as SafetyDocumentMimeType
  }

  // Fall back to extension-based detection
  const extension = file.name.split('.').pop()?.toLowerCase()
  if (extension && extension in EXTENSION_TO_MIME) {
    return EXTENSION_TO_MIME[extension]
  }

  return null
}

/**
 * Convert a file to base64 string.
 */
async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      // Remove the data URL prefix (e.g., "data:application/pdf;base64,")
      const base64 = result.split(',')[1]
      resolve(base64)
    }
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsDataURL(file)
  })
}

/**
 * Hook for handling safety document uploads and deletions.
 */
export function useSafetyDocuments(): UseSafetyDocumentsReturn {
  const [uploads, setUploads] = useState<UploadState[]>([])
  const [error, setError] = useState<string | null>(null)

  const functions = getFunctions()

  /**
   * Upload a single document.
   */
  const uploadDocument = useCallback(
    async (ticketId: string, file: File): Promise<UploadedDocument | null> => {
      setError(null)

      // Validate file
      const validation = validateFile(file)
      if (!validation.valid) {
        setError(validation.error || 'Invalid file')
        return null
      }

      const mimeType = getMimeType(file)
      if (!mimeType) {
        setError('File type not supported')
        return null
      }

      // Add to upload states
      const uploadState: UploadState = {
        filename: file.name,
        progress: 0,
        status: 'pending',
      }
      setUploads((prev) => [...prev, uploadState])

      try {
        // Update status to uploading
        setUploads((prev) =>
          prev.map((u) =>
            u.filename === file.name ? { ...u, status: 'uploading', progress: 10 } : u
          )
        )

        // Convert file to base64
        const fileData = await fileToBase64(file)

        // Update progress
        setUploads((prev) =>
          prev.map((u) => (u.filename === file.name ? { ...u, progress: 50 } : u))
        )

        // Call the upload function
        const uploadSafetyDocument = httpsCallable<
          { ticketId: string; filename: string; fileData: string; mimeType: string },
          { success: boolean; documentId?: string; message: string }
        >(functions, 'uploadSafetyDocument')

        const result = await uploadSafetyDocument({
          ticketId,
          filename: file.name,
          fileData,
          mimeType,
        })

        if (result.data.success && result.data.documentId) {
          // Update to complete
          setUploads((prev) =>
            prev.map((u) =>
              u.filename === file.name
                ? { ...u, status: 'complete', progress: 100, documentId: result.data.documentId }
                : u
            )
          )

          return {
            documentId: result.data.documentId,
            filename: file.name,
            sizeBytes: file.size,
            mimeType,
          }
        } else {
          throw new Error(result.data.message || 'Upload failed')
        }
      } catch (err) {
        // Handle error - use neutral message
        const errorMessage =
          err instanceof Error
            ? err.message.includes('resource-exhausted')
              ? 'Please wait before uploading more files.'
              : err.message.includes('invalid-argument')
                ? 'Unable to process file. Please try a different file.'
                : 'Unable to upload file. Please try again.'
            : 'Unable to upload file. Please try again.'

        setError(errorMessage)
        setUploads((prev) =>
          prev.map((u) =>
            u.filename === file.name ? { ...u, status: 'error', error: errorMessage } : u
          )
        )

        // Log error in development only (no PII)
        if (process.env.NODE_ENV === 'development') {
          console.error('[Safety Documents]', { error: err })
        }

        return null
      }
    },
    [functions]
  )

  /**
   * Upload multiple documents.
   */
  const uploadDocuments = useCallback(
    async (ticketId: string, files: File[]): Promise<UploadedDocument[]> => {
      setError(null)

      // Check total size
      const totalSize = files.reduce((sum, file) => sum + file.size, 0)
      if (totalSize > SAFETY_DOCUMENT_MAX_TOTAL_SIZE_BYTES) {
        const maxSizeMB = SAFETY_DOCUMENT_MAX_TOTAL_SIZE_BYTES / 1024 / 1024
        setError(`Total file size exceeds ${maxSizeMB}MB limit`)
        return []
      }

      // Upload files sequentially to avoid overwhelming the server
      const results: UploadedDocument[] = []
      for (const file of files) {
        const result = await uploadDocument(ticketId, file)
        if (result) {
          results.push(result)
        }
      }

      return results
    },
    [uploadDocument]
  )

  /**
   * Delete a document.
   */
  const deleteDocument = useCallback(
    async (documentId: string): Promise<boolean> => {
      setError(null)

      try {
        const deleteSafetyDocument = httpsCallable<
          { documentId: string },
          { success: boolean; message: string }
        >(functions, 'deleteSafetyDocument')

        const result = await deleteSafetyDocument({ documentId })

        if (result.data.success) {
          // Remove from uploads list
          setUploads((prev) => prev.filter((u) => u.documentId !== documentId))
          return true
        } else {
          setError(result.data.message || 'Unable to delete file')
          return false
        }
      } catch (err) {
        // Handle error - use neutral message
        const errorMessage =
          err instanceof Error
            ? err.message.includes('permission-denied')
              ? 'Unable to delete this file.'
              : err.message.includes('failed-precondition')
                ? 'This file cannot be deleted at this time.'
                : 'Unable to delete file. Please try again.'
            : 'Unable to delete file. Please try again.'

        setError(errorMessage)

        // Log error in development only
        if (process.env.NODE_ENV === 'development') {
          console.error('[Safety Documents]', { error: err })
        }

        return false
      }
    },
    [functions]
  )

  /**
   * Clear all upload states.
   */
  const clearUploads = useCallback(() => {
    setUploads([])
    setError(null)
  }, [])

  const isUploading = uploads.some((u) => u.status === 'uploading' || u.status === 'pending')

  return {
    uploadDocument,
    uploadDocuments,
    deleteDocument,
    uploads,
    isUploading,
    error,
    clearUploads,
  }
}
