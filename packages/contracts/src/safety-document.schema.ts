import { z } from 'zod'

/**
 * Safety Document Schema
 *
 * CRITICAL: This is a life-safety feature for victims escaping abuse.
 * Documents uploaded via this schema MUST NEVER be:
 * - Accessible via family account queries
 * - Logged to family audit trail
 * - Exposed through any family-facing API
 */

// ============================================
// CONSTANTS
// ============================================

/** Maximum number of documents per safety request */
export const MAX_DOCUMENTS_PER_REQUEST = 5

/** Maximum file size in bytes (25MB) */
export const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024

/** Default retention period in years for legal hold */
export const DEFAULT_RETENTION_YEARS = 7

/**
 * Allowed MIME types for safety documents
 * Supports common legal document and identification formats
 */
export const ALLOWED_DOCUMENT_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/heic',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
] as const

/** Allowed file extensions (for user-facing validation messages) */
export const ALLOWED_FILE_EXTENSIONS = [
  '.pdf',
  '.jpg',
  '.jpeg',
  '.png',
  '.gif',
  '.webp',
  '.heic',
  '.doc',
  '.docx',
] as const

// ============================================
// SCHEMAS
// ============================================

/**
 * Schema for a single safety document metadata
 */
export const safetyDocumentSchema = z.object({
  /** Unique document identifier (UUID) */
  id: z.string().uuid(),

  /** Original file name */
  fileName: z.string().min(1).max(255),

  /** MIME type of the file */
  fileType: z.enum(ALLOWED_DOCUMENT_TYPES),

  /** Full Firebase Storage path */
  storagePath: z.string().min(1),

  /** Upload timestamp */
  uploadedAt: z.date(),

  /** File size in bytes */
  sizeBytes: z.number().int().positive().max(MAX_FILE_SIZE_BYTES),
})

export type SafetyDocument = z.infer<typeof safetyDocumentSchema>

/**
 * Retention policy schema for legal compliance
 */
export const retentionPolicySchema = z.object({
  /** Number of years to retain documents */
  years: z.number().int().positive().default(DEFAULT_RETENTION_YEARS),

  /** Calculated expiration date */
  expiresAt: z.date(),
})

export type RetentionPolicy = z.infer<typeof retentionPolicySchema>

/**
 * Input schema for uploading a new safety document
 */
export const uploadSafetyDocumentInputSchema = z.object({
  /** ID of the safety request to attach document to */
  requestId: z.string().min(1),

  /** Original file name */
  fileName: z.string().min(1).max(255),

  /** MIME type of the file */
  fileType: z.enum(ALLOWED_DOCUMENT_TYPES),

  /** File size in bytes (for validation) */
  sizeBytes: z.number().int().positive().max(MAX_FILE_SIZE_BYTES),

  /** Base64 encoded file content */
  fileContent: z.string().min(1),
})

export type UploadSafetyDocumentInput = z.infer<typeof uploadSafetyDocumentInputSchema>

/**
 * Response schema for document upload
 * Intentionally minimal to avoid revealing information
 */
export const uploadSafetyDocumentResponseSchema = z.object({
  /** Whether upload was successful */
  success: z.boolean(),

  /** Document ID for reference (only on success) */
  documentId: z.string().optional(),
})

export type UploadSafetyDocumentResponse = z.infer<typeof uploadSafetyDocumentResponseSchema>

/**
 * Input schema for deleting a safety document
 */
export const deleteSafetyDocumentInputSchema = z.object({
  /** ID of the safety request */
  requestId: z.string().min(1),

  /** ID of the document to delete */
  documentId: z.string().uuid(),
})

export type DeleteSafetyDocumentInput = z.infer<typeof deleteSafetyDocumentInputSchema>

/**
 * Response schema for document deletion
 */
export const deleteSafetyDocumentResponseSchema = z.object({
  /** Whether deletion was successful */
  success: z.boolean(),
})

export type DeleteSafetyDocumentResponse = z.infer<typeof deleteSafetyDocumentResponseSchema>

/**
 * Helper function to validate file type
 */
export function isAllowedFileType(mimeType: string): mimeType is typeof ALLOWED_DOCUMENT_TYPES[number] {
  return (ALLOWED_DOCUMENT_TYPES as readonly string[]).includes(mimeType)
}

/**
 * Alias for isAllowedFileType for semantic clarity in UI contexts
 */
export function isAllowedDocumentType(mimeType: string): mimeType is typeof ALLOWED_DOCUMENT_TYPES[number] {
  return isAllowedFileType(mimeType)
}

/**
 * Helper function to validate file size
 */
export function isValidFileSize(sizeBytes: number): boolean {
  return sizeBytes > 0 && sizeBytes <= MAX_FILE_SIZE_BYTES
}

/**
 * Helper function to calculate retention expiration date
 */
export function calculateRetentionExpiration(yearsToRetain: number = DEFAULT_RETENTION_YEARS): Date {
  const expiresAt = new Date()
  expiresAt.setFullYear(expiresAt.getFullYear() + yearsToRetain)
  return expiresAt
}

/**
 * Helper function to format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  const k = 1024
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  const size = bytes / Math.pow(k, i)
  return `${size.toFixed(i > 0 ? 1 : 0)} ${units[i]}`
}
