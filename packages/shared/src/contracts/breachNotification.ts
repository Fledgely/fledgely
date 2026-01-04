/**
 * Breach Notification Contracts - Story 51.6
 *
 * Data types and schemas for data breach notification.
 * Compliant with GDPR Articles 33-34.
 *
 * Features:
 * - Incident tracking and documentation
 * - User notification management
 * - Regulatory compliance tracking
 * - Response timeline documentation
 *
 * Security:
 * - NFR18: Breach response plan maintained
 * - Admin-only access to incident data
 */

import { z } from 'zod'

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Breach severity levels.
 */
export const BreachSeverity = {
  /** Minor incident, no sensitive data exposed */
  LOW: 'low',
  /** Limited data exposure, contained quickly */
  MEDIUM: 'medium',
  /** Sensitive data potentially accessed */
  HIGH: 'high',
  /** Widespread exposure, requires immediate action */
  CRITICAL: 'critical',
} as const

export type BreachSeverityValue = (typeof BreachSeverity)[keyof typeof BreachSeverity]

/**
 * Breach severity descriptions.
 */
export const BreachSeverityDescriptions: Record<BreachSeverityValue, string> = {
  [BreachSeverity.LOW]: 'Minor incident with no sensitive data exposed',
  [BreachSeverity.MEDIUM]: 'Limited data exposure that was contained quickly',
  [BreachSeverity.HIGH]: 'Sensitive data may have been accessed',
  [BreachSeverity.CRITICAL]: 'Widespread exposure requiring immediate action',
}

/**
 * Breach incident status.
 */
export const BreachIncidentStatus = {
  /** Incident detected, assessment ongoing */
  DETECTED: 'detected',
  /** Being actively investigated */
  INVESTIGATING: 'investigating',
  /** Breach contained, notifications being sent */
  CONTAINED: 'contained',
  /** Users have been notified */
  NOTIFIED: 'notified',
  /** Remediation complete */
  RESOLVED: 'resolved',
} as const

export type BreachIncidentStatusValue =
  (typeof BreachIncidentStatus)[keyof typeof BreachIncidentStatus]

/**
 * Types of data that could be affected.
 */
export const AffectedDataType = {
  EMAIL: 'email',
  NAME: 'name',
  SCREENSHOTS: 'screenshots',
  LOCATION: 'location',
  DEVICE_INFO: 'device_info',
  USAGE_DATA: 'usage_data',
  AGREEMENT_DATA: 'agreement_data',
  PAYMENT_INFO: 'payment_info',
  OTHER: 'other',
} as const

export type AffectedDataTypeValue = (typeof AffectedDataType)[keyof typeof AffectedDataType]

/**
 * Data type labels for display.
 */
export const AffectedDataTypeLabels: Record<AffectedDataTypeValue, string> = {
  [AffectedDataType.EMAIL]: 'Email addresses',
  [AffectedDataType.NAME]: 'Names',
  [AffectedDataType.SCREENSHOTS]: 'Screenshots',
  [AffectedDataType.LOCATION]: 'Location data',
  [AffectedDataType.DEVICE_INFO]: 'Device information',
  [AffectedDataType.USAGE_DATA]: 'Usage patterns',
  [AffectedDataType.AGREEMENT_DATA]: 'Agreement/contract data',
  [AffectedDataType.PAYMENT_INFO]: 'Payment information',
  [AffectedDataType.OTHER]: 'Other data',
}

/**
 * User notification status.
 */
export const UserNotificationStatus = {
  /** Not yet notified */
  PENDING: 'pending',
  /** Email sent successfully */
  EMAIL_SENT: 'email_sent',
  /** Email failed, retry scheduled */
  EMAIL_FAILED: 'email_failed',
  /** User acknowledged the notification */
  ACKNOWLEDGED: 'acknowledged',
} as const

export type UserNotificationStatusValue =
  (typeof UserNotificationStatus)[keyof typeof UserNotificationStatus]

/**
 * Configuration for breach notifications.
 */
export const BREACH_NOTIFICATION_CONFIG = {
  /** Firestore collection for breach incidents */
  INCIDENTS_COLLECTION: 'breachIncidents',
  /** Firestore collection for user notifications */
  NOTIFICATIONS_COLLECTION: 'breachUserNotifications',
  /** GDPR mandated notification deadline (72 hours in ms) */
  NOTIFICATION_DEADLINE_MS: 72 * 60 * 60 * 1000,
  /** GDPR mandated notification deadline (72 hours) */
  NOTIFICATION_DEADLINE_HOURS: 72,
  /** Maximum description length */
  MAX_DESCRIPTION_LENGTH: 10000,
} as const

// ============================================================================
// SCHEMAS
// ============================================================================

/**
 * Response action schema.
 */
export const ResponseActionSchema = z.object({
  /** Action description */
  action: z.string().max(500),
  /** When action was taken */
  timestamp: z.number(),
  /** Who performed the action */
  performedBy: z.string(),
})

export type ResponseAction = z.infer<typeof ResponseActionSchema>

/**
 * Breach incident schema (stored in Firestore).
 */
export const BreachIncidentSchema = z.object({
  /** Unique incident ID */
  incidentId: z.string(),

  /** Incident title */
  title: z.string().max(200),

  /** Detailed description */
  description: z.string().max(BREACH_NOTIFICATION_CONFIG.MAX_DESCRIPTION_LENGTH),

  /** Severity level */
  severity: z.enum([
    BreachSeverity.LOW,
    BreachSeverity.MEDIUM,
    BreachSeverity.HIGH,
    BreachSeverity.CRITICAL,
  ]),

  /** Current status */
  status: z.enum([
    BreachIncidentStatus.DETECTED,
    BreachIncidentStatus.INVESTIGATING,
    BreachIncidentStatus.CONTAINED,
    BreachIncidentStatus.NOTIFIED,
    BreachIncidentStatus.RESOLVED,
  ]),

  /** Types of data affected */
  affectedDataTypes: z.array(
    z.enum([
      AffectedDataType.EMAIL,
      AffectedDataType.NAME,
      AffectedDataType.SCREENSHOTS,
      AffectedDataType.LOCATION,
      AffectedDataType.DEVICE_INFO,
      AffectedDataType.USAGE_DATA,
      AffectedDataType.AGREEMENT_DATA,
      AffectedDataType.PAYMENT_INFO,
      AffectedDataType.OTHER,
    ])
  ),

  /** When the breach occurred (estimated) */
  occurredAt: z.number(),

  /** When the breach was detected */
  detectedAt: z.number(),

  /** Number of users affected */
  affectedUserCount: z.number().int().min(0),

  /** List of affected family IDs (if known) */
  affectedFamilyIds: z.array(z.string()).optional(),

  /** Whether regulatory notification is required */
  regulatoryNotificationRequired: z.boolean(),

  /** When regulator was notified (if applicable) */
  regulatorNotifiedAt: z.number().nullable(),

  /** Who notified the regulator */
  regulatorNotifiedBy: z.string().nullable(),

  /** User notification deadline (72 hours from detection) */
  userNotificationDeadline: z.number(),

  /** When user notifications were sent */
  userNotificationsSentAt: z.number().nullable(),

  /** Actions taken in response */
  responseActions: z.array(ResponseActionSchema),

  /** Admin who created the incident */
  createdBy: z.string(),

  /** When incident was created */
  createdAt: z.number(),

  /** When incident was resolved */
  resolvedAt: z.number().nullable(),

  /** Post-incident review notes */
  postIncidentReview: z.string().nullable(),

  /** Improvements identified */
  improvementsIdentified: z.array(z.string()).optional(),
})

export type BreachIncident = z.infer<typeof BreachIncidentSchema>

/**
 * Schema for creating a new breach incident.
 */
export const CreateBreachIncidentInputSchema = z.object({
  title: z.string().min(5).max(200),
  description: z.string().min(20).max(BREACH_NOTIFICATION_CONFIG.MAX_DESCRIPTION_LENGTH),
  severity: z.enum([
    BreachSeverity.LOW,
    BreachSeverity.MEDIUM,
    BreachSeverity.HIGH,
    BreachSeverity.CRITICAL,
  ]),
  affectedDataTypes: z
    .array(
      z.enum([
        AffectedDataType.EMAIL,
        AffectedDataType.NAME,
        AffectedDataType.SCREENSHOTS,
        AffectedDataType.LOCATION,
        AffectedDataType.DEVICE_INFO,
        AffectedDataType.USAGE_DATA,
        AffectedDataType.AGREEMENT_DATA,
        AffectedDataType.PAYMENT_INFO,
        AffectedDataType.OTHER,
      ])
    )
    .min(1),
  occurredAt: z.number(),
  affectedUserCount: z.number().int().min(0),
  affectedFamilyIds: z.array(z.string()).optional(),
  regulatoryNotificationRequired: z.boolean(),
})

export type CreateBreachIncidentInput = z.infer<typeof CreateBreachIncidentInputSchema>

/**
 * Schema for updating a breach incident.
 */
export const UpdateBreachIncidentInputSchema = z.object({
  incidentId: z.string(),
  status: z
    .enum([
      BreachIncidentStatus.DETECTED,
      BreachIncidentStatus.INVESTIGATING,
      BreachIncidentStatus.CONTAINED,
      BreachIncidentStatus.NOTIFIED,
      BreachIncidentStatus.RESOLVED,
    ])
    .optional(),
  regulatorNotified: z.boolean().optional(),
  sendUserNotifications: z.boolean().optional(),
  responseAction: z.string().max(500).optional(),
  postIncidentReview: z.string().max(5000).optional(),
  improvement: z.string().max(500).optional(),
})

export type UpdateBreachIncidentInput = z.infer<typeof UpdateBreachIncidentInputSchema>

/**
 * User breach notification schema.
 */
export const BreachUserNotificationSchema = z.object({
  /** Notification ID */
  notificationId: z.string(),
  /** Incident ID */
  incidentId: z.string(),
  /** User's family ID */
  familyId: z.string(),
  /** User UID */
  uid: z.string(),
  /** User email */
  email: z.string().email().nullable(),
  /** Notification status */
  status: z.enum([
    UserNotificationStatus.PENDING,
    UserNotificationStatus.EMAIL_SENT,
    UserNotificationStatus.EMAIL_FAILED,
    UserNotificationStatus.ACKNOWLEDGED,
  ]),
  /** When email was sent */
  emailSentAt: z.number().nullable(),
  /** When user acknowledged */
  acknowledgedAt: z.number().nullable(),
  /** Whether in-app banner was dismissed */
  bannerDismissed: z.boolean(),
  /** When banner was dismissed */
  bannerDismissedAt: z.number().nullable(),
})

export type BreachUserNotification = z.infer<typeof BreachUserNotificationSchema>

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

export interface CreateBreachIncidentResponse {
  success: boolean
  incidentId?: string
  message: string
}

export interface UpdateBreachIncidentResponse {
  success: boolean
  message: string
}

export interface GetBreachIncidentsResponse {
  incidents: BreachIncident[]
  total: number
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Generate a breach incident ID.
 */
export function generateBreachIncidentId(): string {
  const date = new Date()
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '')
  const randomPart = Math.random().toString(36).substring(2, 8).toUpperCase()
  return `BREACH-${dateStr}-${randomPart}`
}

/**
 * Calculate hours until notification deadline.
 */
export function hoursUntilNotificationDeadline(detectedAt: number): number {
  const now = Date.now()
  const deadline = detectedAt + BREACH_NOTIFICATION_CONFIG.NOTIFICATION_DEADLINE_MS
  const diff = deadline - now

  return Math.round(diff / (60 * 60 * 1000))
}

/**
 * Check if notification deadline is approaching (within 12 hours).
 */
export function isDeadlineApproaching(detectedAt: number): boolean {
  const hoursRemaining = hoursUntilNotificationDeadline(detectedAt)
  return hoursRemaining <= 12 && hoursRemaining > 0
}

/**
 * Check if notification deadline has passed.
 */
export function isDeadlinePassed(detectedAt: number): boolean {
  return hoursUntilNotificationDeadline(detectedAt) < 0
}

/**
 * Get severity color for UI.
 */
export function getSeverityColor(severity: BreachSeverityValue): {
  bg: string
  text: string
  border: string
} {
  switch (severity) {
    case BreachSeverity.LOW:
      return { bg: '#f0fdf4', text: '#166534', border: '#86efac' }
    case BreachSeverity.MEDIUM:
      return { bg: '#fef3c7', text: '#92400e', border: '#fcd34d' }
    case BreachSeverity.HIGH:
      return { bg: '#fee2e2', text: '#991b1b', border: '#fca5a5' }
    case BreachSeverity.CRITICAL:
      return { bg: '#7f1d1d', text: '#ffffff', border: '#dc2626' }
    default:
      return { bg: '#f3f4f6', text: '#374151', border: '#d1d5db' }
  }
}
