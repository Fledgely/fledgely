/**
 * Data Export Contracts - Story 51.1
 *
 * GDPR Article 20 - Right to data portability
 * Types and schemas for family data export requests and processing.
 */

import { z } from 'zod'

/**
 * Export status values
 */
export const DataExportStatus = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed',
  EXPIRED: 'expired',
} as const

export type DataExportStatus = (typeof DataExportStatus)[keyof typeof DataExportStatus]

/**
 * Data Export Request Schema
 *
 * Stored in Firestore at `dataExports/{exportId}`
 */
export const DataExportRequestSchema = z.object({
  exportId: z.string().min(1),
  familyId: z.string().min(1),
  requestedBy: z.string().min(1), // Guardian UID
  requestedByEmail: z.string().email(),
  requestedAt: z.number(), // Timestamp in ms
  status: z.enum(['pending', 'processing', 'completed', 'failed', 'expired']),
  processingStartedAt: z.number().nullable().optional(),
  completedAt: z.number().nullable().optional(),
  downloadUrl: z.string().nullable().optional(),
  expiresAt: z.number().nullable().optional(), // 7 days after completion
  fileSize: z.number().nullable().optional(), // Bytes
  errorMessage: z.string().nullable().optional(),
})

export type DataExportRequest = z.infer<typeof DataExportRequestSchema>

/**
 * Export Manifest Schema
 *
 * Included in the ZIP archive as manifest.json
 * Provides metadata about the export contents for traceability
 */
export const ExportManifestSchema = z.object({
  exportId: z.string().min(1),
  exportVersion: z.string().default('1.0'),
  exportedAt: z.number(),
  familyId: z.string().min(1),
  requestedBy: z.string().min(1),
  requestedByEmail: z.string().email(),
  contents: z.object({
    familyProfile: z.boolean(),
    children: z.number(),
    devices: z.number(),
    screenshots: z.number(),
    screenshotImages: z.number(),
    flags: z.number(),
    agreements: z.number(),
    auditEvents: z.number(),
    settings: z.boolean(),
  }),
  watermark: z.object({
    generatedBy: z.literal('fledgely'),
    gdprCompliant: z.literal(true),
    dataController: z.string(),
  }),
})

export type ExportManifest = z.infer<typeof ExportManifestSchema>

/**
 * Request Data Export Input Schema
 *
 * Used for the callable function input validation
 */
export const RequestDataExportInputSchema = z.object({
  familyId: z.string().min(1),
})

export type RequestDataExportInput = z.infer<typeof RequestDataExportInputSchema>

/**
 * Request Data Export Response Schema
 *
 * Response from the requestDataExport callable
 */
export const RequestDataExportResponseSchema = z.object({
  success: z.boolean(),
  exportId: z.string().optional(),
  status: z.enum([
    'pending',
    'processing',
    'completed',
    'failed',
    'expired',
    'already_in_progress',
  ]),
  message: z.string(),
  estimatedCompletionAt: z.number().optional(), // Timestamp
  existingExportId: z.string().optional(), // If already in progress
})

export type RequestDataExportResponse = z.infer<typeof RequestDataExportResponseSchema>

/**
 * Get Export Status Input Schema
 */
export const GetExportStatusInputSchema = z.object({
  familyId: z.string().min(1),
  exportId: z.string().optional(), // If not provided, returns latest
})

export type GetExportStatusInput = z.infer<typeof GetExportStatusInputSchema>

/**
 * Constants for export configuration
 */
export const DATA_EXPORT_CONFIG = {
  /** Time allowed for export processing (48 hours in ms) */
  PROCESSING_TIMEOUT_MS: 48 * 60 * 60 * 1000,

  /** Link expiry time after completion (7 days in ms) */
  LINK_EXPIRY_MS: 7 * 24 * 60 * 60 * 1000,

  /** Storage path prefix for exports */
  STORAGE_PATH_PREFIX: 'exports',

  /** Maximum file size hint (for UI) */
  MAX_EXPORT_SIZE_HINT_MB: 500,
} as const

/**
 * Exported data structure schema
 *
 * The structure of data.json in the export archive
 */
export const ExportedDataSchema = z.object({
  family: z.record(z.unknown()),
  children: z.array(z.record(z.unknown())),
  devices: z.array(z.record(z.unknown())),
  screenshots: z.array(z.record(z.unknown())),
  flags: z.array(z.record(z.unknown())),
  agreements: z.array(z.record(z.unknown())),
  auditEvents: z.array(z.record(z.unknown())),
  settings: z.record(z.unknown()).optional(),
})

export type ExportedData = z.infer<typeof ExportedDataSchema>
