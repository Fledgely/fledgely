/**
 * Pre-18 Data Export Contracts - Story 38.6 Task 1
 *
 * Zod schemas and types for pre-18 data export.
 * AC2: Export option available (download all data)
 * AC3: Export includes: sanitized activity summaries (no screenshots)
 * AC6: Export watermarked with date and purpose
 */

import { z } from 'zod'

// ============================================
// Configuration Constants
// ============================================

/**
 * Number of days an export request remains valid.
 * Matches the pre-deletion notice period from Story 38-5.
 */
export const EXPORT_REQUEST_VALID_DAYS = 30

/**
 * Number of hours an export download URL remains valid.
 */
export const EXPORT_URL_VALID_HOURS = 24

/**
 * Standard purpose string for export watermarks.
 */
export const PRE18_EXPORT_PURPOSE = 'Pre-18 Data Export'

// ============================================
// Export Request Status Schema
// ============================================

/**
 * Valid statuses for an export request.
 */
export const exportRequestStatusSchema = z.enum([
  'pending_consent', // Waiting for child to consent
  'consent_granted', // Child has consented
  'consent_denied', // Child has denied consent
  'processing', // Export is being generated
  'completed', // Export is ready for download
  'expired', // Request has expired
])

export type ExportRequestStatus = z.infer<typeof exportRequestStatusSchema>

// ============================================
// Export Watermark Schema (AC6)
// ============================================

/**
 * Watermark applied to all exports for transparency.
 * AC6: Export watermarked with date and purpose
 */
export const exportWatermarkSchema = z.object({
  exportDate: z.coerce.date(),
  purpose: z.string().min(1),
  requestedBy: z.string().min(1),
  childConsent: z.boolean(),
  watermarkId: z.string().min(1),
})

export type ExportWatermark = z.infer<typeof exportWatermarkSchema>

// ============================================
// Sanitized Activity Summary Schema (AC3)
// ============================================

/**
 * Sanitized activity summary - no screenshots or specific URLs.
 * AC3: Export includes: sanitized activity summaries (no screenshots)
 */
export const sanitizedActivitySummarySchema = z.object({
  date: z.coerce.date(),
  totalScreenTime: z.number().min(0), // minutes
  topCategories: z.array(z.string()),
  // Explicitly NOT including: URLs, screenshots, specific content
})

export type SanitizedActivitySummary = z.infer<typeof sanitizedActivitySummarySchema>

// ============================================
// Screen Time Summary Schema
// ============================================

/**
 * Summary of screen time by category.
 */
export const screenTimeSummarySchema = z.object({
  date: z.coerce.date(),
  totalMinutes: z.number().min(0),
  byCategory: z.record(z.string(), z.number()),
})

export type ScreenTimeSummary = z.infer<typeof screenTimeSummarySchema>

// ============================================
// Agreement Summary Schema
// ============================================

/**
 * Summary of agreement history.
 */
export const agreementSummarySchema = z.object({
  agreementId: z.string().min(1),
  createdAt: z.coerce.date(),
  status: z.enum(['active', 'expired', 'withdrawn']),
  signedBy: z.array(z.string()),
})

export type AgreementSummary = z.infer<typeof agreementSummarySchema>

// ============================================
// Pre18 Export Request Schema (AC2)
// ============================================

/**
 * Export request record.
 * AC2: Export option available
 */
export const pre18ExportRequestSchema = z.object({
  id: z.string().min(1),
  childId: z.string().min(1),
  familyId: z.string().min(1),
  requestedBy: z.string().min(1), // parentId
  requestedAt: z.coerce.date(),
  status: exportRequestStatusSchema,
  childConsentedAt: z.coerce.date().nullable(),
  exportCompletedAt: z.coerce.date().nullable(),
  exportUrl: z.string().nullable(),
  expiresAt: z.coerce.date(),
})

export type Pre18ExportRequest = z.infer<typeof pre18ExportRequestSchema>

// ============================================
// Pre18 Export Content Schema (AC3, AC6)
// ============================================

/**
 * Export content - sanitized data without screenshots or flags.
 * AC3: Export includes: sanitized activity summaries (no screenshots)
 * AC6: Export watermarked with date and purpose
 */
export const pre18ExportContentSchema = z.object({
  id: z.string().min(1),
  exportRequestId: z.string().min(1),
  childId: z.string().min(1),
  familyId: z.string().min(1),
  // Sanitized data - no screenshots (AC3)
  activitySummaries: z.array(sanitizedActivitySummarySchema),
  screenTimeSummaries: z.array(screenTimeSummarySchema),
  agreementHistory: z.array(agreementSummarySchema),
  // Note: No screenshots, flags, or sensitive content included (AC3, AC5)
  createdAt: z.coerce.date(),
  watermark: exportWatermarkSchema, // AC6
})

export type Pre18ExportContent = z.infer<typeof pre18ExportContentSchema>

// ============================================
// Factory Functions
// ============================================

/**
 * Generate a unique ID for export-related records.
 */
function generateExportId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
}

/**
 * Create a new export request with default values.
 * AC2: Export option available
 */
export function createExportRequest(
  childId: string,
  familyId: string,
  requestedBy: string
): Pre18ExportRequest {
  const now = new Date()
  const expiresAt = new Date(now)
  expiresAt.setDate(expiresAt.getDate() + EXPORT_REQUEST_VALID_DAYS)

  return {
    id: generateExportId('export-request'),
    childId,
    familyId,
    requestedBy,
    requestedAt: now,
    status: 'pending_consent',
    childConsentedAt: null,
    exportCompletedAt: null,
    exportUrl: null,
    expiresAt,
  }
}

/**
 * Create an export watermark.
 * AC6: Export watermarked with date and purpose
 */
export function createExportWatermark(requestedBy: string, childConsent: boolean): ExportWatermark {
  return {
    exportDate: new Date(),
    purpose: PRE18_EXPORT_PURPOSE,
    requestedBy,
    childConsent,
    watermarkId: generateExportId('watermark'),
  }
}

// ============================================
// Validation Functions
// ============================================

/**
 * Check if an export request is still valid (not expired, not completed/denied).
 */
export function isValidExportRequest(request: Pre18ExportRequest): boolean {
  // Check if expired
  if (request.expiresAt < new Date()) {
    return false
  }

  // Check if in terminal status
  if (request.status === 'completed' || request.status === 'consent_denied') {
    return false
  }

  return true
}

/**
 * Check if request status allows processing.
 */
export function canProcessExport(request: Pre18ExportRequest): boolean {
  return request.status === 'consent_granted' && isValidExportRequest(request)
}

/**
 * Check if export content is valid.
 */
export function isValidExportContent(content: unknown): content is Pre18ExportContent {
  return pre18ExportContentSchema.safeParse(content).success
}
