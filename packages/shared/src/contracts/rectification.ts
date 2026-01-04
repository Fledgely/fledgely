/**
 * Right to Rectification Contracts - Story 51.8
 *
 * Data types and schemas for GDPR Article 16 compliance.
 * Allows users to correct inaccurate data while preserving
 * historical record integrity.
 *
 * Features:
 * - Profile data correction
 * - Audit trail for changes
 * - Record notes (for historical data)
 * - Correction request workflow
 * - AI content dispute process
 */

import { z } from 'zod'

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Fields that can be edited by users.
 */
export const EditableField = {
  DISPLAY_NAME: 'displayName',
  PROFILE_PHOTO: 'profilePhoto',
  DATE_OF_BIRTH: 'dateOfBirth',
  EMAIL: 'email',
  PHONE: 'phone',
  TIMEZONE: 'timezone',
  LOCALE: 'locale',
} as const

export type EditableFieldValue = (typeof EditableField)[keyof typeof EditableField]

/**
 * Editable field metadata.
 */
export const EditableFieldInfo: Record<EditableFieldValue, { label: string; description: string }> =
  {
    [EditableField.DISPLAY_NAME]: {
      label: 'Display Name',
      description: 'How your name appears to family members',
    },
    [EditableField.PROFILE_PHOTO]: {
      label: 'Profile Photo',
      description: 'Your profile picture',
    },
    [EditableField.DATE_OF_BIRTH]: {
      label: 'Date of Birth',
      description: 'Your birth date (used for age-appropriate features)',
    },
    [EditableField.EMAIL]: {
      label: 'Email Address',
      description: 'Your primary contact email',
    },
    [EditableField.PHONE]: {
      label: 'Phone Number',
      description: 'Your phone number for notifications',
    },
    [EditableField.TIMEZONE]: {
      label: 'Timezone',
      description: 'Your local timezone for scheduling',
    },
    [EditableField.LOCALE]: {
      label: 'Language',
      description: 'Your preferred language',
    },
  }

/**
 * Record types that can have notes added.
 */
export const NotableRecordType = {
  SCREENSHOT: 'screenshot',
  FLAG: 'flag',
  LOCATION_EVENT: 'location_event',
  CHECK_IN: 'check_in',
  AI_DESCRIPTION: 'ai_description',
} as const

export type NotableRecordTypeValue = (typeof NotableRecordType)[keyof typeof NotableRecordType]

/**
 * Correction request status.
 */
export const CorrectionRequestStatus = {
  PENDING: 'pending',
  UNDER_REVIEW: 'under_review',
  APPROVED: 'approved',
  PARTIALLY_APPROVED: 'partially_approved',
  REJECTED: 'rejected',
  COMPLETED: 'completed',
} as const

export type CorrectionRequestStatusValue =
  (typeof CorrectionRequestStatus)[keyof typeof CorrectionRequestStatus]

/**
 * AI dispute status.
 */
export const AIDisputeStatus = {
  SUBMITTED: 'submitted',
  UNDER_REVIEW: 'under_review',
  CONTENT_REMOVED: 'content_removed',
  CONTENT_CORRECTED: 'content_corrected',
  DISPUTE_REJECTED: 'dispute_rejected',
} as const

export type AIDisputeStatusValue = (typeof AIDisputeStatus)[keyof typeof AIDisputeStatus]

/**
 * Configuration for rectification.
 */
export const RECTIFICATION_CONFIG = {
  /** Maximum days to process a correction request */
  MAX_PROCESSING_DAYS: 30,
  /** Maximum note length */
  MAX_NOTE_LENGTH: 1000,
  /** Maximum correction reason length */
  MAX_REASON_LENGTH: 2000,
  /** Audit log collection */
  AUDIT_LOG_COLLECTION: 'auditLogs',
  /** Correction requests collection */
  CORRECTION_REQUESTS_COLLECTION: 'correctionRequests',
  /** AI disputes collection */
  AI_DISPUTES_COLLECTION: 'aiDisputes',
  /** Record notes collection suffix */
  NOTES_SUBCOLLECTION: 'notes',
} as const

// ============================================================================
// SCHEMAS
// ============================================================================

/**
 * Profile change audit log entry.
 */
export const ProfileChangeLogSchema = z.object({
  /** Log ID */
  id: z.string(),
  /** User UID */
  uid: z.string(),
  /** Family ID */
  familyId: z.string(),
  /** Field that was changed */
  field: z.string(),
  /** Previous value */
  oldValue: z.string().nullable(),
  /** New value */
  newValue: z.string(),
  /** Who made the change */
  changedBy: z.string(),
  /** When the change was made */
  changedAt: z.number(),
  /** IP address (masked) */
  ipAddress: z.string().nullable(),
  /** Change reason (optional) */
  reason: z.string().nullable(),
})

export type ProfileChangeLog = z.infer<typeof ProfileChangeLogSchema>

/**
 * Record note schema.
 */
export const RecordNoteSchema = z.object({
  /** Note ID */
  noteId: z.string(),
  /** Record type */
  recordType: z.enum([
    NotableRecordType.SCREENSHOT,
    NotableRecordType.FLAG,
    NotableRecordType.LOCATION_EVENT,
    NotableRecordType.CHECK_IN,
    NotableRecordType.AI_DESCRIPTION,
  ]),
  /** Record ID being annotated */
  recordId: z.string(),
  /** Note content */
  content: z.string().max(RECTIFICATION_CONFIG.MAX_NOTE_LENGTH),
  /** Who added the note */
  addedBy: z.string(),
  /** Adder's name */
  addedByName: z.string(),
  /** When added */
  addedAt: z.number(),
  /** Whether this note disputes the record */
  isDispute: z.boolean(),
})

export type RecordNote = z.infer<typeof RecordNoteSchema>

/**
 * Child correction request schema.
 */
export const CorrectionRequestSchema = z.object({
  /** Request ID */
  requestId: z.string(),
  /** Child UID */
  childUid: z.string(),
  /** Child name */
  childName: z.string(),
  /** Parent UID (to review) */
  parentUid: z.string(),
  /** Family ID */
  familyId: z.string(),
  /** What data to correct */
  dataToCorrect: z.string(),
  /** Proposed correction */
  proposedCorrection: z.string(),
  /** Reason for correction */
  reason: z.string().max(RECTIFICATION_CONFIG.MAX_REASON_LENGTH),
  /** Current status */
  status: z.enum([
    CorrectionRequestStatus.PENDING,
    CorrectionRequestStatus.UNDER_REVIEW,
    CorrectionRequestStatus.APPROVED,
    CorrectionRequestStatus.PARTIALLY_APPROVED,
    CorrectionRequestStatus.REJECTED,
    CorrectionRequestStatus.COMPLETED,
  ]),
  /** When submitted */
  submittedAt: z.number(),
  /** When reviewed */
  reviewedAt: z.number().nullable(),
  /** Reviewed by */
  reviewedBy: z.string().nullable(),
  /** Review notes */
  reviewNotes: z.string().nullable(),
  /** When completed */
  completedAt: z.number().nullable(),
  /** Processing deadline (30 days) */
  deadline: z.number(),
})

export type CorrectionRequest = z.infer<typeof CorrectionRequestSchema>

/**
 * AI content dispute schema.
 */
export const AIDisputeSchema = z.object({
  /** Dispute ID */
  disputeId: z.string(),
  /** User UID */
  uid: z.string(),
  /** Family ID */
  familyId: z.string(),
  /** Type of AI content */
  contentType: z.string(),
  /** Content ID */
  contentId: z.string(),
  /** The disputed content */
  disputedContent: z.string(),
  /** Reason for dispute */
  reason: z.string().max(RECTIFICATION_CONFIG.MAX_REASON_LENGTH),
  /** Current status */
  status: z.enum([
    AIDisputeStatus.SUBMITTED,
    AIDisputeStatus.UNDER_REVIEW,
    AIDisputeStatus.CONTENT_REMOVED,
    AIDisputeStatus.CONTENT_CORRECTED,
    AIDisputeStatus.DISPUTE_REJECTED,
  ]),
  /** When submitted */
  submittedAt: z.number(),
  /** When resolved */
  resolvedAt: z.number().nullable(),
  /** Resolution notes */
  resolutionNotes: z.string().nullable(),
  /** Processing deadline (30 days) */
  deadline: z.number(),
})

export type AIDispute = z.infer<typeof AIDisputeSchema>

// ============================================================================
// API TYPES
// ============================================================================

export interface UpdateProfileInput {
  field: EditableFieldValue
  value: string
  reason?: string
}

export interface UpdateProfileResponse {
  success: boolean
  message: string
  auditLogId?: string
}

export interface AddRecordNoteInput {
  recordType: NotableRecordTypeValue
  recordId: string
  content: string
  isDispute?: boolean
}

export interface AddRecordNoteResponse {
  success: boolean
  noteId: string
  message: string
}

export interface SubmitCorrectionRequestInput {
  dataToCorrect: string
  proposedCorrection: string
  reason: string
}

export interface SubmitCorrectionRequestResponse {
  success: boolean
  requestId: string
  message: string
  deadline: number
}

export interface ReviewCorrectionRequestInput {
  requestId: string
  approved: boolean
  partiallyApproved?: boolean
  reviewNotes?: string
}

export interface ReviewCorrectionRequestResponse {
  success: boolean
  message: string
}

export interface SubmitAIDisputeInput {
  contentType: string
  contentId: string
  disputedContent: string
  reason: string
}

export interface SubmitAIDisputeResponse {
  success: boolean
  disputeId: string
  message: string
  deadline: number
}

export interface GetProfileChangesResponse {
  changes: ProfileChangeLog[]
  total: number
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Generate a unique ID for audit logs.
 */
export function generateAuditLogId(): string {
  const date = new Date()
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '')
  const randomPart = Math.random().toString(36).substring(2, 8).toUpperCase()
  return `AUDIT-${dateStr}-${randomPart}`
}

/**
 * Generate a correction request ID.
 */
export function generateCorrectionRequestId(): string {
  const date = new Date()
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '')
  const randomPart = Math.random().toString(36).substring(2, 8).toUpperCase()
  return `CORR-${dateStr}-${randomPart}`
}

/**
 * Generate an AI dispute ID.
 */
export function generateAIDisputeId(): string {
  const date = new Date()
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '')
  const randomPart = Math.random().toString(36).substring(2, 8).toUpperCase()
  return `DISP-${dateStr}-${randomPart}`
}

/**
 * Calculate processing deadline (30 days from now).
 */
export function calculateDeadline(): number {
  return Date.now() + RECTIFICATION_CONFIG.MAX_PROCESSING_DAYS * 24 * 60 * 60 * 1000
}

/**
 * Check if a request is past deadline.
 */
export function isPastDeadline(deadline: number): boolean {
  return Date.now() > deadline
}

/**
 * Days until deadline.
 */
export function daysUntilDeadline(deadline: number): number {
  const diff = deadline - Date.now()
  return Math.max(0, Math.ceil(diff / (24 * 60 * 60 * 1000)))
}
