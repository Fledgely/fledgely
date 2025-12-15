'use client'

import { useState, useCallback, useRef } from 'react'
import { httpsCallable } from 'firebase/functions'
import { functions } from '@/lib/firebase'
import {
  ALLOWED_DOCUMENT_TYPES,
  MAX_FILE_SIZE_BYTES,
  MAX_DOCUMENTS_PER_REQUEST,
  formatFileSize,
  isAllowedDocumentType,
} from '@fledgely/contracts'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface UploadedDocument {
  id: string
  fileName: string
  sizeBytes: number
}

interface SafetyDocumentUploadProps {
  requestId: string
  onUploadComplete?: (documents: UploadedDocument[]) => void
  onError?: (error: string) => void
  className?: string
}

/**
 * Safety Document Upload Component
 *
 * CRITICAL: This is a life-safety feature for victims escaping abuse.
 *
 * Design considerations:
 * - Subtle visual design (no alarming colors or icons)
 * - No external loading indicators visible to shoulder-surfers
 * - Clear but calm feedback for success/error states
 * - Accessible drag-and-drop with keyboard fallback
 */
export function SafetyDocumentUpload({
  requestId,
  onUploadComplete,
  onError,
  className,
}: SafetyDocumentUploadProps) {
  const [uploadedDocs, setUploadedDocs] = useState<UploadedDocument[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const remainingSlots = MAX_DOCUMENTS_PER_REQUEST - uploadedDocs.length

  const validateFile = useCallback((file: File): string | null => {
    if (!isAllowedDocumentType(file.type)) {
      return `File type "${file.type}" is not supported`
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return `File is too large (max ${formatFileSize(MAX_FILE_SIZE_BYTES)})`
    }
    return null
  }, [])

  const uploadFile = useCallback(
    async (file: File) => {
      if (uploadedDocs.length >= MAX_DOCUMENTS_PER_REQUEST) {
        onError?.(`Maximum ${MAX_DOCUMENTS_PER_REQUEST} files allowed`)
        return
      }

      const validationError = validateFile(file)
      if (validationError) {
        onError?.(validationError)
        return
      }

      setIsUploading(true)
      setUploadProgress('Preparing...')

      try {
        // Convert file to base64
        const base64Content = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = () => {
            const result = reader.result as string
            // Remove data URL prefix (e.g., "data:application/pdf;base64,")
            const base64 = result.split(',')[1]
            resolve(base64)
          }
          reader.onerror = () => reject(new Error('Failed to read file'))
          reader.readAsDataURL(file)
        })

        setUploadProgress('Uploading...')

        // Call the cloud function
        const uploadSafetyDocument = httpsCallable(functions, 'uploadSafetyDocument')
        const result = await uploadSafetyDocument({
          requestId,
          fileName: file.name,
          fileType: file.type,
          sizeBytes: file.size,
          fileContent: base64Content,
        })

        const data = result.data as { success: boolean; documentId: string }

        if (data.success) {
          const newDoc: UploadedDocument = {
            id: data.documentId,
            fileName: file.name,
            sizeBytes: file.size,
          }
          const updatedDocs = [...uploadedDocs, newDoc]
          setUploadedDocs(updatedDocs)
          onUploadComplete?.(updatedDocs)
        }
      } catch (error) {
        console.error('Upload error:', error)
        onError?.('Unable to upload file. Please try again.')
      } finally {
        setIsUploading(false)
        setUploadProgress(null)
      }
    },
    [requestId, uploadedDocs, validateFile, onUploadComplete, onError]
  )

  const handleFiles = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) return

      // Process files one at a time to maintain order
      for (let i = 0; i < files.length; i++) {
        if (uploadedDocs.length + i >= MAX_DOCUMENTS_PER_REQUEST) {
          onError?.(`Maximum ${MAX_DOCUMENTS_PER_REQUEST} files allowed`)
          break
        }
        await uploadFile(files[i])
      }
    },
    [uploadFile, uploadedDocs.length, onError]
  )

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragging(false)
      handleFiles(e.dataTransfer.files)
    },
    [handleFiles]
  )

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const handleDragEnter = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }, [])

  const handleClick = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      handleFiles(e.target.files)
      // Reset input to allow re-selecting same file
      e.target.value = ''
    },
    [handleFiles]
  )

  const handleDeleteDocument = useCallback(
    async (documentId: string) => {
      try {
        const deleteSafetyDocument = httpsCallable(functions, 'deleteSafetyDocument')
        await deleteSafetyDocument({ requestId, documentId })

        const updatedDocs = uploadedDocs.filter((doc) => doc.id !== documentId)
        setUploadedDocs(updatedDocs)
        onUploadComplete?.(updatedDocs)
      } catch (error) {
        console.error('Delete error:', error)
        onError?.('Unable to remove file. Please try again.')
      }
    },
    [requestId, uploadedDocs, onUploadComplete, onError]
  )

  // Format accept string for file input
  const acceptTypes = ALLOWED_DOCUMENT_TYPES.join(',')

  return (
    <div className={cn('space-y-3', className)}>
      {/* Drop zone - only show if there are remaining slots */}
      {remainingSlots > 0 && (
        <div
          role="button"
          tabIndex={0}
          onClick={handleClick}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              handleClick()
            }
          }}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          className={cn(
            'relative rounded-lg border-2 border-dashed p-6 text-center transition-colors cursor-pointer',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
            isDragging
              ? 'border-primary bg-primary/5'
              : 'border-muted-foreground/25 hover:border-muted-foreground/50',
            isUploading && 'pointer-events-none opacity-60'
          )}
          aria-label="Upload documents"
          aria-describedby="upload-description"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={acceptTypes}
            multiple
            onChange={handleFileInputChange}
            className="hidden"
            aria-hidden="true"
          />

          <div className="space-y-2">
            {isUploading ? (
              <p className="text-sm text-muted-foreground">{uploadProgress}</p>
            ) : (
              <>
                <p className="text-sm font-medium">
                  {isDragging ? 'Drop files here' : 'Drag files or click to browse'}
                </p>
                <p
                  id="upload-description"
                  className="text-xs text-muted-foreground"
                >
                  PDF, images, or documents up to {formatFileSize(MAX_FILE_SIZE_BYTES)}
                </p>
              </>
            )}
          </div>
        </div>
      )}

      {/* Uploaded files list */}
      {uploadedDocs.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">
            {uploadedDocs.length} of {MAX_DOCUMENTS_PER_REQUEST} files
          </p>
          <ul className="space-y-1.5" role="list" aria-label="Uploaded documents">
            {uploadedDocs.map((doc) => (
              <li
                key={doc.id}
                className="flex items-center justify-between rounded-md bg-muted/50 px-3 py-2 text-sm"
              >
                <div className="flex-1 truncate pr-2">
                  <span className="font-medium">{doc.fileName}</span>
                  <span className="ml-2 text-muted-foreground">
                    ({formatFileSize(doc.sizeBytes)})
                  </span>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDeleteDocument(doc.id)}
                  className="h-7 px-2 text-muted-foreground hover:text-foreground"
                  aria-label={`Remove ${doc.fileName}`}
                >
                  Remove
                </Button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Maximum files reached message */}
      {remainingSlots === 0 && (
        <p className="text-xs text-muted-foreground">
          Maximum files reached. Remove a file to add another.
        </p>
      )}
    </div>
  )
}
