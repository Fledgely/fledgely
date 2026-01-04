/**
 * Abuse Report Contracts - Story 51.5
 *
 * Data types and schemas for abuse reporting.
 *
 * Features:
 * - Public abuse report submission (no auth required)
 * - Anonymous reporting option
 * - Report type categorization
 * - Status tracking for investigation
 *
 * Security:
 * - NFR42: Abuse reports logged securely
 * - Reports stored separately from family data
 * - Admin-only access to reports
 */

import { z } from 'zod'

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Types of abuse that can be reported.
 */
export const AbuseReportType = {
  /** Using fledgely to monitor adults without consent */
  SURVEILLANCE_OF_ADULTS: 'surveillance_of_adults',
  /** Organization/school using family-only tool inappropriately */
  NON_FAMILY_USE: 'non_family_use',
  /** Using fledgely features to harass family members */
  HARASSMENT: 'harassment',
  /** Other types of misuse not listed */
  OTHER: 'other',
} as const

export type AbuseReportTypeValue = (typeof AbuseReportType)[keyof typeof AbuseReportType]

/**
 * Report type descriptions for UI display.
 */
export const AbuseReportTypeDescriptions: Record<AbuseReportTypeValue, string> = {
  [AbuseReportType.SURVEILLANCE_OF_ADULTS]:
    'Using Fledgely to monitor adults (18+) without their knowledge or consent',
  [AbuseReportType.NON_FAMILY_USE]:
    'Organization, school, or employer using Fledgely instead of families',
  [AbuseReportType.HARASSMENT]:
    'Using Fledgely features to harass, control, or abuse family members',
  [AbuseReportType.OTHER]: 'Other suspected misuse of Fledgely not listed above',
}

/**
 * Status of abuse report investigation.
 */
export const AbuseReportStatus = {
  /** Report submitted, awaiting initial review */
  SUBMITTED: 'submitted',
  /** Being triaged by support team */
  TRIAGING: 'triaging',
  /** Under active investigation */
  INVESTIGATING: 'investigating',
  /** Investigation complete, action taken if needed */
  RESOLVED: 'resolved',
  /** Report dismissed (duplicate, spam, etc.) */
  DISMISSED: 'dismissed',
} as const

export type AbuseReportStatusValue = (typeof AbuseReportStatus)[keyof typeof AbuseReportStatus]

/**
 * Configuration for abuse reports.
 */
export const ABUSE_REPORT_CONFIG = {
  /** Firestore collection name */
  COLLECTION_NAME: 'abuseReports',
  /** Maximum description length */
  MAX_DESCRIPTION_LENGTH: 5000,
  /** Minimum description length */
  MIN_DESCRIPTION_LENGTH: 10,
  /** Maximum number of evidence URLs */
  MAX_EVIDENCE_URLS: 5,
  /** SLA for initial triage (72 hours in ms) */
  TRIAGE_SLA_MS: 72 * 60 * 60 * 1000,
  /** SLA for initial triage (72 hours) */
  TRIAGE_SLA_HOURS: 72,
} as const

// ============================================================================
// SCHEMAS
// ============================================================================

/**
 * Schema for abuse report submission (public input).
 */
export const AbuseReportSubmissionSchema = z.object({
  /** Type of abuse being reported */
  type: z.enum([
    AbuseReportType.SURVEILLANCE_OF_ADULTS,
    AbuseReportType.NON_FAMILY_USE,
    AbuseReportType.HARASSMENT,
    AbuseReportType.OTHER,
  ]),

  /** Detailed description of the suspected abuse */
  description: z
    .string()
    .min(ABUSE_REPORT_CONFIG.MIN_DESCRIPTION_LENGTH, 'Description must be at least 10 characters')
    .max(ABUSE_REPORT_CONFIG.MAX_DESCRIPTION_LENGTH, 'Description cannot exceed 5000 characters'),

  /** Optional URLs to evidence (screenshots, etc.) */
  evidenceUrls: z.array(z.string().url()).max(ABUSE_REPORT_CONFIG.MAX_EVIDENCE_URLS).optional(),

  /** Whether report is anonymous */
  isAnonymous: z.boolean(),

  /** Reporter email (required if not anonymous) */
  reporterEmail: z.string().email().optional(),

  /** Reporter name (optional) */
  reporterName: z.string().max(100).optional(),

  /** Whether reporter wants to receive follow-up updates */
  wantsFollowUp: z.boolean().default(false),
})

export type AbuseReportSubmission = z.infer<typeof AbuseReportSubmissionSchema>

/**
 * Full abuse report schema (stored in Firestore).
 */
export const AbuseReportSchema = z.object({
  /** Unique report ID */
  reportId: z.string(),

  /** Type of abuse being reported */
  type: z.enum([
    AbuseReportType.SURVEILLANCE_OF_ADULTS,
    AbuseReportType.NON_FAMILY_USE,
    AbuseReportType.HARASSMENT,
    AbuseReportType.OTHER,
  ]),

  /** Detailed description of the suspected abuse */
  description: z.string(),

  /** Optional URLs to evidence */
  evidenceUrls: z.array(z.string().url()).optional(),

  /** Whether report is anonymous */
  isAnonymous: z.boolean(),

  /** Reporter email (if provided) */
  reporterEmail: z.string().email().nullable(),

  /** Reporter name (if provided) */
  reporterName: z.string().nullable(),

  /** Whether reporter wants follow-up updates */
  wantsFollowUp: z.boolean(),

  /** Current status of the report */
  status: z.enum([
    AbuseReportStatus.SUBMITTED,
    AbuseReportStatus.TRIAGING,
    AbuseReportStatus.INVESTIGATING,
    AbuseReportStatus.RESOLVED,
    AbuseReportStatus.DISMISSED,
  ]),

  /** Timestamp when report was submitted */
  submittedAt: z.number(),

  /** IP address hash (for spam prevention, not stored directly) */
  ipHash: z.string().optional(),

  /** User agent (for spam prevention) */
  userAgent: z.string().optional(),

  /** Reference number for reporter to track (only if not anonymous) */
  referenceNumber: z.string().nullable(),

  /** Timestamp when report was triaged */
  triagedAt: z.number().nullable(),

  /** Admin who performed triage */
  triagedBy: z.string().nullable(),

  /** Triage notes */
  triageNotes: z.string().nullable(),

  /** Timestamp when investigation completed */
  resolvedAt: z.number().nullable(),

  /** Admin who resolved */
  resolvedBy: z.string().nullable(),

  /** Resolution summary */
  resolution: z.string().nullable(),

  /** Actions taken (if any) */
  actionsTaken: z.array(z.string()).optional(),

  /** Whether reporter was notified of resolution */
  reporterNotified: z.boolean().default(false),
})

export type AbuseReport = z.infer<typeof AbuseReportSchema>

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

/**
 * Response from abuse report submission.
 */
export interface SubmitAbuseReportResponse {
  success: boolean
  message: string
  referenceNumber?: string
}

/**
 * Response from getting abuse reports (admin).
 */
export interface GetAbuseReportsResponse {
  reports: AbuseReport[]
  total: number
}

/**
 * Input for updating abuse report status (admin).
 */
export const UpdateAbuseReportInputSchema = z.object({
  reportId: z.string(),
  status: z.enum([
    AbuseReportStatus.SUBMITTED,
    AbuseReportStatus.TRIAGING,
    AbuseReportStatus.INVESTIGATING,
    AbuseReportStatus.RESOLVED,
    AbuseReportStatus.DISMISSED,
  ]),
  notes: z.string().max(2000).optional(),
  resolution: z.string().max(2000).optional(),
  actionsTaken: z.array(z.string().max(200)).max(10).optional(),
  notifyReporter: z.boolean().optional(),
})

export type UpdateAbuseReportInput = z.infer<typeof UpdateAbuseReportInputSchema>

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Generate a reference number for non-anonymous reports.
 * Format: AR-YYYYMMDD-XXXXX (e.g., AR-20260103-A7K3P)
 */
export function generateReferenceNumber(): string {
  const date = new Date()
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '')
  const randomPart = Math.random().toString(36).substring(2, 7).toUpperCase()
  return `AR-${dateStr}-${randomPart}`
}

/**
 * Check if a report is approaching the 72-hour SLA deadline.
 *
 * @param submittedAt - Timestamp when report was submitted
 * @returns true if within 12 hours of deadline or past deadline
 */
export function isApproachingSLA(submittedAt: number): boolean {
  const now = Date.now()
  const deadline = submittedAt + ABUSE_REPORT_CONFIG.TRIAGE_SLA_MS
  const warningThreshold = deadline - 12 * 60 * 60 * 1000 // 12 hours before

  return now >= warningThreshold
}

/**
 * Check if a report has passed the 72-hour SLA deadline.
 *
 * @param submittedAt - Timestamp when report was submitted
 * @param triagedAt - Timestamp when report was triaged (if triaged)
 * @returns true if past deadline and not yet triaged
 */
export function isPastSLA(submittedAt: number, triagedAt: number | null): boolean {
  if (triagedAt !== null) {
    return false // Already triaged
  }

  const now = Date.now()
  const deadline = submittedAt + ABUSE_REPORT_CONFIG.TRIAGE_SLA_MS

  return now > deadline
}

/**
 * Calculate hours remaining until SLA deadline.
 *
 * @param submittedAt - Timestamp when report was submitted
 * @returns Hours remaining (negative if past deadline)
 */
export function hoursUntilSLADeadline(submittedAt: number): number {
  const now = Date.now()
  const deadline = submittedAt + ABUSE_REPORT_CONFIG.TRIAGE_SLA_MS
  const diff = deadline - now

  return Math.round(diff / (60 * 60 * 1000))
}
