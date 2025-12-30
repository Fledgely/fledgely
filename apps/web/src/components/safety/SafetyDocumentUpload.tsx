/**
 * Safety Document Upload Component.
 *
 * Story 0.5.2: Safety Request Documentation Upload
 *
 * CRITICAL SAFETY DESIGN:
 * This component handles document uploads for potential domestic abuse victims.
 * Uses neutral language and calming design to avoid triggering suspicion.
 *
 * Key features:
 * - Drag and drop file upload
 * - File type validation (PDF, JPG, PNG, DOC, DOCX)
 * - File size validation (25MB per file, 100MB total)
 * - Upload progress indicator
 * - File removal capability
 * - Neutral, calming styling
 */

'use client'

import React, { useCallback, useRef, useState } from 'react'
import { useSafetyDocuments, type UploadedDocument } from '../../hooks/useSafetyDocuments'

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
 * Props for SafetyDocumentUpload component.
 */
export interface SafetyDocumentUploadProps {
  /** Ticket ID to associate documents with (null before ticket created) */
  ticketId: string | null
  /** Callback when files are uploaded */
  onFilesUploaded?: (documents: UploadedDocument[]) => void
  /** Callback when a file is removed */
  onFileRemoved?: (documentId: string) => void
  /** Maximum total size in bytes (default: 100MB) */
  maxTotalSizeBytes?: number
  /** Disabled state */
  disabled?: boolean
}

/**
 * Pending file (before upload).
 */
interface PendingFile {
  file: File
  id: string
}

/**
 * Format file size for display.
 */
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/**
 * Get file icon based on MIME type.
 */
function getFileIcon(file: File | { mimeType: string }): string {
  const mimeType = 'type' in file ? file.type : file.mimeType
  if (mimeType.includes('pdf')) return '📄'
  if (mimeType.includes('image')) return '🖼️'
  if (mimeType.includes('word') || mimeType.includes('document')) return '📝'
  return '📎'
}

/**
 * Accepted file extensions.
 */
const ACCEPTED_EXTENSIONS = '.pdf,.jpg,.jpeg,.png,.doc,.docx'

/**
 * Safety Document Upload Component.
 *
 * Provides a drag-and-drop interface for uploading supporting documents.
 */
export function SafetyDocumentUpload({
  ticketId,
  onFilesUploaded,
  onFileRemoved,
  maxTotalSizeBytes = SAFETY_DOCUMENT_MAX_TOTAL_SIZE_BYTES,
  disabled = false,
}: SafetyDocumentUploadProps) {
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([])
  const [uploadedDocs, setUploadedDocs] = useState<UploadedDocument[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [validationError, setValidationError] = useState<string | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)

  const { uploadDocument, deleteDocument, uploads, isUploading, error } = useSafetyDocuments()

  // Calculate current total size
  const currentTotalSize =
    pendingFiles.reduce((sum, pf) => sum + pf.file.size, 0) +
    uploadedDocs.reduce((sum, doc) => sum + doc.sizeBytes, 0)

  /**
   * Validate a file for upload.
   */
  const validateFile = useCallback(
    (file: File): string | null => {
      // Check file size
      if (file.size > SAFETY_DOCUMENT_MAX_SIZE_BYTES) {
        const maxSizeMB = SAFETY_DOCUMENT_MAX_SIZE_BYTES / 1024 / 1024
        return `File "${file.name}" exceeds maximum size of ${maxSizeMB}MB`
      }

      // Check total size
      if (currentTotalSize + file.size > maxTotalSizeBytes) {
        const maxTotalMB = maxTotalSizeBytes / 1024 / 1024
        return `Total file size would exceed ${maxTotalMB}MB limit`
      }

      // Check file type by extension
      const extension = file.name.split('.').pop()?.toLowerCase()
      const validExtensions = ['pdf', 'jpg', 'jpeg', 'png', 'doc', 'docx']
      if (!extension || !validExtensions.includes(extension)) {
        return 'File type not supported. Please use PDF, JPG, PNG, DOC, or DOCX files.'
      }

      return null
    },
    [currentTotalSize, maxTotalSizeBytes]
  )

  /**
   * Handle file selection.
   */
  const handleFileSelect = useCallback(
    (files: FileList | File[]) => {
      setValidationError(null)

      const fileArray = Array.from(files)
      const newPendingFiles: PendingFile[] = []

      for (const file of fileArray) {
        const error = validateFile(file)
        if (error) {
          setValidationError(error)
          continue
        }

        // Check for duplicates
        const isDuplicate =
          pendingFiles.some((pf) => pf.file.name === file.name) ||
          uploadedDocs.some((doc) => doc.filename === file.name)

        if (!isDuplicate) {
          newPendingFiles.push({
            file,
            id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
          })
        }
      }

      if (newPendingFiles.length > 0) {
        setPendingFiles((prev) => [...prev, ...newPendingFiles])
      }
    },
    [pendingFiles, uploadedDocs, validateFile]
  )

  /**
   * Handle drag events.
   */
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragging(false)

      if (disabled) return

      const files = e.dataTransfer.files
      if (files.length > 0) {
        handleFileSelect(files)
      }
    },
    [disabled, handleFileSelect]
  )

  /**
   * Handle click on upload area.
   */
  const handleClick = useCallback(() => {
    if (!disabled && fileInputRef.current) {
      fileInputRef.current.click()
    }
  }, [disabled])

  /**
   * Handle file input change.
   */
  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files
      if (files && files.length > 0) {
        handleFileSelect(files)
      }
      // Reset input to allow selecting the same file again
      e.target.value = ''
    },
    [handleFileSelect]
  )

  /**
   * Remove a pending file.
   */
  const removePendingFile = useCallback((id: string) => {
    setPendingFiles((prev) => prev.filter((pf) => pf.id !== id))
  }, [])

  /**
   * Remove an uploaded document.
   */
  const removeUploadedDoc = useCallback(
    async (documentId: string) => {
      const success = await deleteDocument(documentId)
      if (success) {
        setUploadedDocs((prev) => prev.filter((doc) => doc.documentId !== documentId))
        onFileRemoved?.(documentId)
      }
    },
    [deleteDocument, onFileRemoved]
  )

  /**
   * Upload all pending files.
   */
  const uploadAllPending = useCallback(async () => {
    if (!ticketId || pendingFiles.length === 0) return

    const newUploaded: UploadedDocument[] = []

    for (const pending of pendingFiles) {
      const result = await uploadDocument(ticketId, pending.file)
      if (result) {
        newUploaded.push(result)
      }
    }

    if (newUploaded.length > 0) {
      setUploadedDocs((prev) => [...prev, ...newUploaded])
      setPendingFiles((prev) =>
        prev.filter((pf) => !newUploaded.some((doc) => doc.filename === pf.file.name))
      )
      onFilesUploaded?.(newUploaded)
    }
  }, [ticketId, pendingFiles, uploadDocument, onFilesUploaded])

  // Styles - neutral, calming colors consistent with SafetyContactForm
  const containerStyle: React.CSSProperties = {
    marginTop: '24px',
  }

  const labelStyle: React.CSSProperties = {
    display: 'block',
    color: '#374151',
    fontSize: '14px',
    fontWeight: 500,
    marginBottom: '8px',
  }

  const dropZoneStyle: React.CSSProperties = {
    border: isDragging ? '2px dashed #3b82f6' : '2px dashed #d1d5db',
    borderRadius: '8px',
    padding: '32px',
    textAlign: 'center',
    cursor: disabled ? 'not-allowed' : 'pointer',
    backgroundColor: isDragging ? '#eff6ff' : disabled ? '#f3f4f6' : '#f9fafb',
    transition: 'all 0.2s ease',
  }

  const dropZoneTextStyle: React.CSSProperties = {
    color: '#6b7280',
    fontSize: '14px',
    marginBottom: '8px',
  }

  const dropZoneHintStyle: React.CSSProperties = {
    color: '#9ca3af',
    fontSize: '12px',
  }

  const fileListStyle: React.CSSProperties = {
    marginTop: '16px',
  }

  const fileItemStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px',
    backgroundColor: '#f9fafb',
    borderRadius: '6px',
    marginBottom: '8px',
  }

  const fileInfoStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    flex: 1,
    minWidth: 0,
  }

  const fileNameStyle: React.CSSProperties = {
    color: '#374151',
    fontSize: '14px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  }

  const fileSizeStyle: React.CSSProperties = {
    color: '#9ca3af',
    fontSize: '12px',
    flexShrink: 0,
  }

  const removeButtonStyle: React.CSSProperties = {
    background: 'none',
    border: 'none',
    color: '#9ca3af',
    cursor: 'pointer',
    padding: '4px',
    fontSize: '16px',
    lineHeight: 1,
    flexShrink: 0,
  }

  const progressBarContainerStyle: React.CSSProperties = {
    width: '100%',
    height: '4px',
    backgroundColor: '#e5e7eb',
    borderRadius: '2px',
    marginTop: '8px',
    overflow: 'hidden',
  }

  const errorStyle: React.CSSProperties = {
    color: '#dc2626',
    fontSize: '12px',
    marginTop: '8px',
  }

  const totalSizeStyle: React.CSSProperties = {
    color: '#6b7280',
    fontSize: '12px',
    marginTop: '8px',
    textAlign: 'right',
  }

  const maxTotalMB = maxTotalSizeBytes / 1024 / 1024

  return (
    <div style={containerStyle}>
      <label style={labelStyle}>
        Supporting Documents{' '}
        <span style={{ color: '#9ca3af', fontWeight: 'normal' }}>(optional)</span>
      </label>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPTED_EXTENSIONS}
        multiple
        onChange={handleInputChange}
        style={{ display: 'none' }}
        aria-label="Upload supporting documents"
      />

      {/* Drop zone */}
      <div
        style={dropZoneStyle}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
        role="button"
        tabIndex={disabled ? -1 : 0}
        onKeyDown={(e) => e.key === 'Enter' && handleClick()}
        aria-label="Click or drag files to upload"
      >
        <p style={dropZoneTextStyle}>
          {isDragging ? 'Drop files here' : 'Click or drag files to upload'}
        </p>
        <p style={dropZoneHintStyle}>
          PDF, JPG, PNG, DOC, DOCX • Max {SAFETY_DOCUMENT_MAX_SIZE_BYTES / 1024 / 1024}MB per file
        </p>
      </div>

      {/* Validation error */}
      {validationError && (
        <p style={errorStyle} role="alert">
          {validationError}
        </p>
      )}

      {/* Upload error */}
      {error && (
        <p style={errorStyle} role="alert">
          {error}
        </p>
      )}

      {/* File list */}
      {(pendingFiles.length > 0 || uploadedDocs.length > 0) && (
        <div style={fileListStyle}>
          {/* Pending files */}
          {pendingFiles.map((pending) => {
            const uploadState = uploads.find((u) => u.filename === pending.file.name)
            const isCurrentlyUploading = uploadState?.status === 'uploading'

            return (
              <div key={pending.id} style={fileItemStyle}>
                <div style={fileInfoStyle}>
                  <span>{getFileIcon(pending.file)}</span>
                  <span style={fileNameStyle}>{pending.file.name}</span>
                  <span style={fileSizeStyle}>{formatFileSize(pending.file.size)}</span>
                </div>
                {isCurrentlyUploading ? (
                  <span style={{ color: '#6b7280', fontSize: '12px' }}>
                    {uploadState?.progress || 0}%
                  </span>
                ) : (
                  <button
                    type="button"
                    style={removeButtonStyle}
                    onClick={() => removePendingFile(pending.id)}
                    aria-label={`Remove ${pending.file.name}`}
                    disabled={isUploading}
                  >
                    ✕
                  </button>
                )}
                {isCurrentlyUploading && (
                  <div style={progressBarContainerStyle}>
                    <div
                      style={{
                        width: `${uploadState?.progress || 0}%`,
                        height: '100%',
                        backgroundColor: '#3b82f6',
                        transition: 'width 0.3s ease',
                      }}
                    />
                  </div>
                )}
              </div>
            )
          })}

          {/* Uploaded files */}
          {uploadedDocs.map((doc) => (
            <div key={doc.documentId} style={{ ...fileItemStyle, backgroundColor: '#ecfdf5' }}>
              <div style={fileInfoStyle}>
                <span>{getFileIcon({ mimeType: doc.mimeType })}</span>
                <span style={fileNameStyle}>{doc.filename}</span>
                <span style={fileSizeStyle}>{formatFileSize(doc.sizeBytes)}</span>
                <span style={{ color: '#059669', fontSize: '12px' }}>✓ Uploaded</span>
              </div>
              <button
                type="button"
                style={removeButtonStyle}
                onClick={() => removeUploadedDoc(doc.documentId)}
                aria-label={`Remove ${doc.filename}`}
                disabled={isUploading}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Total size indicator */}
      {(pendingFiles.length > 0 || uploadedDocs.length > 0) && (
        <p style={totalSizeStyle}>
          Total: {formatFileSize(currentTotalSize)} / {maxTotalMB}MB
        </p>
      )}

      {/* Upload button (for when ticketId is available) */}
      {ticketId && pendingFiles.length > 0 && !isUploading && (
        <button
          type="button"
          onClick={uploadAllPending}
          style={{
            marginTop: '16px',
            padding: '10px 20px',
            backgroundColor: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 500,
          }}
        >
          Upload {pendingFiles.length} file{pendingFiles.length !== 1 ? 's' : ''}
        </button>
      )}
    </div>
  )
}

export default SafetyDocumentUpload
