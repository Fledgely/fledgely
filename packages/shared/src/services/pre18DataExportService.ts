/**
 * Pre18 Data Export Service - Story 38.6 Task 3
 *
 * Service for generating sanitized data exports.
 * AC2: Export option available (download all data)
 * AC3: Export includes: sanitized activity summaries (no screenshots)
 * AC5: No export of concerning flags or sensitive content
 * AC6: Export watermarked with date and purpose
 */

import {
  createExportRequest as createExportRequestBase,
  createExportWatermark,
  PRE18_EXPORT_PURPOSE,
  type Pre18ExportRequest,
  type Pre18ExportContent,
  type SanitizedActivitySummary,
  type ScreenTimeSummary,
  type AgreementSummary,
  type ExportWatermark,
  exportWatermarkSchema,
} from '../contracts/pre18DataExport'

// ============================================
// In-Memory Storage (would be Firestore in production)
// ============================================

const exportRequestStore = new Map<string, Pre18ExportRequest>()
const exportContentStore = new Map<string, Pre18ExportContent>()

// ============================================
// Export Request Functions (AC2)
// ============================================

/**
 * Create a new export request.
 * AC2: Export option available
 *
 * @param childId - The child's ID
 * @param parentId - The requesting parent's ID
 * @returns The created export request
 */
export function createExportRequest(childId: string, parentId: string): Pre18ExportRequest {
  // Get family ID from childId (simulated - in real impl would look up family)
  const familyId = `family-${childId.split('-')[1] || 'unknown'}`

  const request = createExportRequestBase(childId, familyId, parentId)

  // Store the request
  exportRequestStore.set(request.id, request)

  return request
}

/**
 * Get export request status.
 *
 * @param exportRequestId - The export request ID
 * @returns The export request or null
 */
export function getExportStatus(exportRequestId: string): Pre18ExportRequest | null {
  return exportRequestStore.get(exportRequestId) || null
}

// ============================================
// Export Generation Functions (AC3)
// ============================================

/**
 * Generate an export for a consented request.
 * AC3: Export includes: sanitized activity summaries (no screenshots)
 *
 * @param exportRequestId - The export request ID
 * @returns The generated export content or null if not allowed
 */
export function generateExport(exportRequestId: string): Pre18ExportContent | null {
  const request = exportRequestStore.get(exportRequestId)

  if (!request) {
    return null
  }

  // Must have consent granted
  if (request.status !== 'consent_granted') {
    return null
  }

  const now = new Date()

  // Generate sanitized content
  const content: Pre18ExportContent = {
    id: `export-content-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
    exportRequestId,
    childId: request.childId,
    familyId: request.familyId,
    activitySummaries: sanitizeActivityLogs(request.childId),
    screenTimeSummaries: sanitizeScreenTime(request.childId),
    agreementHistory: sanitizeAgreements(request.childId),
    createdAt: now,
    watermark: createExportWatermark(request.requestedBy, true),
  }

  // Store the content
  exportContentStore.set(exportRequestId, content)

  // Update request status
  request.status = 'processing'

  return content
}

// ============================================
// Sanitization Functions (AC3, AC5)
// ============================================

/**
 * Sanitize activity logs for export.
 * AC3: Export includes: sanitized activity summaries (no screenshots)
 *
 * @param childId - The child's ID
 * @returns Array of sanitized activity summaries
 */
export function sanitizeActivityLogs(_childId: string): SanitizedActivitySummary[] {
  // In real implementation, would fetch from activity log storage
  // and sanitize by removing URLs, screenshots, etc.

  // Simulated sanitized data
  const today = new Date()
  const summaries: SanitizedActivitySummary[] = []

  // Generate sample sanitized summaries for past 7 days
  for (let i = 0; i < 7; i++) {
    const date = new Date(today)
    date.setDate(date.getDate() - i)

    summaries.push({
      date,
      totalScreenTime: Math.floor(Math.random() * 180) + 60, // 60-240 minutes
      topCategories: ['Education', 'Entertainment', 'Social'].slice(
        0,
        Math.floor(Math.random() * 3) + 1
      ),
    })
  }

  return summaries
}

/**
 * Sanitize screen time data for export.
 *
 * @param childId - The child's ID
 * @returns Array of screen time summaries
 */
export function sanitizeScreenTime(_childId: string): ScreenTimeSummary[] {
  // In real implementation, would fetch from screen time storage

  const today = new Date()
  const summaries: ScreenTimeSummary[] = []

  // Generate sample screen time summaries for past 7 days
  for (let i = 0; i < 7; i++) {
    const date = new Date(today)
    date.setDate(date.getDate() - i)

    summaries.push({
      date,
      totalMinutes: Math.floor(Math.random() * 180) + 60,
      byCategory: {
        Education: Math.floor(Math.random() * 60),
        Entertainment: Math.floor(Math.random() * 60),
        Social: Math.floor(Math.random() * 40),
      },
    })
  }

  return summaries
}

/**
 * Sanitize agreement history for export.
 *
 * @param childId - The child's ID
 * @returns Array of agreement summaries
 */
export function sanitizeAgreements(_childId: string): AgreementSummary[] {
  // In real implementation, would fetch from agreement storage

  // Simulated agreement history
  return [
    {
      agreementId: 'agreement-initial',
      createdAt: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000), // 1 year ago
      status: 'expired' as const,
      signedBy: ['parent-1', 'child-1'],
    },
    {
      agreementId: 'agreement-current',
      createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
      status: 'active' as const,
      signedBy: ['parent-1', 'child-1'],
    },
  ]
}

/**
 * Filter out concerning content from export.
 * AC5: No export of concerning flags or sensitive content
 *
 * @param content - Array of content items
 * @returns Filtered array without concerning content
 */
export function filterConcerningContent<T extends { flagged?: boolean; sensitive?: boolean }>(
  content: T[]
): T[] {
  return content.filter((item) => !item.flagged && !item.sensitive)
}

// ============================================
// Watermark Functions (AC6)
// ============================================

/**
 * Add or update watermark on export content.
 * AC6: Export watermarked with date and purpose
 *
 * @param content - The export content
 * @param parentId - The parent who requested export
 * @returns Content with updated watermark
 */
export function addExportWatermark(
  content: Pre18ExportContent,
  parentId: string
): Pre18ExportContent {
  return {
    ...content,
    watermark: {
      ...content.watermark,
      exportDate: new Date(),
      requestedBy: parentId,
      purpose: PRE18_EXPORT_PURPOSE,
    },
  }
}

/**
 * Validate an export watermark.
 * AC6: Export watermarked with date and purpose
 *
 * @param watermark - The watermark to validate
 * @returns True if watermark is valid
 */
export function validateWatermark(watermark: ExportWatermark): boolean {
  const result = exportWatermarkSchema.safeParse(watermark)
  return result.success
}

// ============================================
// Export URL Functions
// ============================================

/**
 * Get the download URL for an export.
 *
 * @param exportRequestId - The export request ID
 * @returns The download URL or null if not available
 */
export function getExportUrl(exportRequestId: string): string | null {
  const request = exportRequestStore.get(exportRequestId)
  return request?.exportUrl || null
}

/**
 * Check if export is available for download.
 *
 * @param exportRequestId - The export request ID
 * @returns True if export is available
 */
export function isExportAvailable(exportRequestId: string): boolean {
  const request = exportRequestStore.get(exportRequestId)
  return request?.status === 'completed' && request.exportUrl !== null
}

/**
 * Mark an export as complete with download URL.
 *
 * @param exportRequestId - The export request ID
 * @param exportUrl - The download URL
 */
export function markExportComplete(exportRequestId: string, exportUrl: string): void {
  const request = exportRequestStore.get(exportRequestId)
  if (request) {
    request.status = 'completed'
    request.exportUrl = exportUrl
    request.exportCompletedAt = new Date()
  }
}

// ============================================
// Testing Utilities
// ============================================

/**
 * Clear all export data (for testing).
 */
export function clearAllExportData(): void {
  exportRequestStore.clear()
  exportContentStore.clear()
}

/**
 * Get export content (for testing).
 */
export function getExportContent(exportRequestId: string): Pre18ExportContent | null {
  return exportContentStore.get(exportRequestId) || null
}
