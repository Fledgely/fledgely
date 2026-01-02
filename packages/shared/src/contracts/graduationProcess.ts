/**
 * Graduation Process Contracts - Story 38.3 Task 1
 *
 * Zod schemas and types for the formal graduation process.
 * AC1: Both parties must confirm graduation decision (dual-consent)
 * AC2: Graduation date can be immediate or scheduled for future
 * AC5: Existing data enters deletion queue with configurable retention
 * AC6: Child account transitions to alumni status
 */

import { z } from 'zod'

// ============================================
// Configuration Constants
// ============================================

/** Default data retention period after graduation (days) */
export const GRADUATION_RETENTION_DAYS = 30

/** Minimum days ahead to schedule graduation */
export const MIN_SCHEDULE_DAYS = 1

/** Maximum days ahead to schedule graduation */
export const MAX_SCHEDULE_DAYS = 90

/** Decision expiry period (days) */
export const DECISION_EXPIRY_DAYS = 30

// ============================================
// Base Type Schemas
// ============================================

/**
 * Graduation type - immediate or scheduled.
 */
export const graduationTypeSchema = z.enum(['immediate', 'scheduled'])
export type GraduationType = z.infer<typeof graduationTypeSchema>

/**
 * Account status after graduation.
 */
export const accountStatusSchema = z.enum(['active', 'alumni', 'deleted'])
export type AccountStatus = z.infer<typeof accountStatusSchema>

/**
 * Data types that can be queued for deletion.
 */
export const dataTypeSchema = z.enum([
  'screenshots',
  'flags',
  'activity_logs',
  'trust_history',
  'all',
])
export type DataType = z.infer<typeof dataTypeSchema>

/**
 * Deletion queue entry status.
 */
export const deletionStatusSchema = z.enum(['queued', 'processing', 'completed', 'failed'])
export type DeletionStatus = z.infer<typeof deletionStatusSchema>

// ============================================
// Confirmation Record Schema
// ============================================

/**
 * Record of a confirmation from a child or parent.
 * AC1: Both parties must confirm graduation decision
 */
export const confirmationRecordSchema = z.object({
  userId: z.string().min(1),
  role: z.enum(['child', 'parent']),
  confirmedAt: z.coerce.date(),
  selectedGraduationType: graduationTypeSchema,
  scheduledDatePreference: z.coerce.date().nullable(),
})
export type ConfirmationRecord = z.infer<typeof confirmationRecordSchema>

// ============================================
// Graduation Decision Schema
// ============================================

/**
 * Graduation decision tracking dual-consent confirmation.
 * AC1: Both parties must confirm graduation decision
 * AC2: Graduation date can be immediate or scheduled
 */
export const graduationDecisionSchema = z.object({
  id: z.string().min(1),
  conversationId: z.string().min(1),
  familyId: z.string().min(1),
  childId: z.string().min(1),
  requiredParentIds: z.array(z.string().min(1)),
  graduationType: graduationTypeSchema,
  scheduledDate: z.coerce.date().nullable(),
  childConfirmation: confirmationRecordSchema.nullable(),
  parentConfirmations: z.array(confirmationRecordSchema),
  status: z.enum(['pending', 'confirmed', 'processing', 'completed']),
  createdAt: z.coerce.date(),
  confirmedAt: z.coerce.date().nullable(),
  completedAt: z.coerce.date().nullable(),
  expiresAt: z.coerce.date(),
})
export type GraduationDecision = z.infer<typeof graduationDecisionSchema>

// ============================================
// Graduation Certificate Schema
// ============================================

/**
 * Graduation certificate issued to the child.
 * AC7: Graduation certificate/record generated for family
 */
export const graduationCertificateSchema = z.object({
  id: z.string().min(1),
  childId: z.string().min(1),
  familyId: z.string().min(1),
  childName: z.string().min(1),
  graduationDate: z.coerce.date(),
  monthsAtPerfectTrust: z.number().int().nonnegative(),
  totalMonitoringDuration: z.number().int().nonnegative(),
  generatedAt: z.coerce.date(),
})
export type GraduationCertificate = z.infer<typeof graduationCertificateSchema>

// ============================================
// Previous Account Data Schema
// ============================================

/**
 * Data preserved from child's active account period.
 */
export const previousAccountDataSchema = z.object({
  monitoringStartDate: z.coerce.date(),
  totalMonitoringMonths: z.number().int().nonnegative(),
  finalTrustScore: z.number().int().min(0).max(100),
})
export type PreviousAccountData = z.infer<typeof previousAccountDataSchema>

// ============================================
// Alumni Record Schema
// ============================================

/**
 * Record for a graduated (alumni) child.
 * AC6: Child account transitions to alumni status
 */
export const alumniRecordSchema = z.object({
  childId: z.string().min(1),
  familyId: z.string().min(1),
  graduatedAt: z.coerce.date(),
  certificateId: z.string().min(1),
  previousAccountData: previousAccountDataSchema,
})
export type AlumniRecord = z.infer<typeof alumniRecordSchema>

// ============================================
// Deletion Queue Entry Schema
// ============================================

/**
 * Entry in the data deletion queue.
 * AC5: Existing data enters deletion queue with configurable retention
 */
export const deletionQueueEntrySchema = z.object({
  id: z.string().min(1),
  childId: z.string().min(1),
  familyId: z.string().min(1),
  dataType: dataTypeSchema,
  scheduledDeletionDate: z.coerce.date(),
  retentionDays: z.number().int().nonnegative(),
  status: deletionStatusSchema,
  createdAt: z.coerce.date(),
  completedAt: z.coerce.date().nullable(),
})
export type DeletionQueueEntry = z.infer<typeof deletionQueueEntrySchema>

// ============================================
// Alumni Preferences Schema
// ============================================

/**
 * Optional preferences for alumni accounts.
 */
export const alumniPreferencesSchema = z.object({
  receiveWellnessResources: z.boolean(),
  receiveAnniversaryReminders: z.boolean(),
})
export type AlumniPreferences = z.infer<typeof alumniPreferencesSchema>

// ============================================
// Helper Functions
// ============================================

/**
 * Create an initial graduation decision in pending status.
 */
export function createInitialGraduationDecision(
  id: string,
  conversationId: string,
  childId: string,
  familyId: string,
  requiredParentIds: string[]
): GraduationDecision {
  const now = new Date()
  const expiresAt = new Date(now.getTime() + DECISION_EXPIRY_DAYS * 24 * 60 * 60 * 1000)

  return {
    id,
    conversationId,
    familyId,
    childId,
    requiredParentIds,
    graduationType: 'immediate',
    scheduledDate: null,
    childConfirmation: null,
    parentConfirmations: [],
    status: 'pending',
    createdAt: now,
    confirmedAt: null,
    completedAt: null,
    expiresAt,
  }
}

/**
 * Check if all required parties have confirmed the graduation decision.
 * AC1: Both parties must confirm graduation decision (dual-consent)
 */
export function hasAllConfirmations(decision: GraduationDecision): boolean {
  // Child must have confirmed
  if (decision.childConfirmation === null) {
    return false
  }

  // All required parents must have confirmed
  const confirmedParentIds = decision.parentConfirmations.map((c) => c.userId)
  const allParentsConfirmed = decision.requiredParentIds.every((parentId) =>
    confirmedParentIds.includes(parentId)
  )

  return allParentsConfirmed
}

/**
 * Resolve the final graduation type and date based on all confirmations.
 * Rule: If any party selects 'scheduled', use scheduled (most conservative)
 * Rule: Use the latest scheduled date preference
 */
export function resolveGraduationType(decision: GraduationDecision): {
  type: GraduationType
  date: Date
} {
  const allConfirmations = [decision.childConfirmation, ...decision.parentConfirmations].filter(
    (c): c is ConfirmationRecord => c !== null
  )

  // Check if any selected scheduled
  const hasScheduled = allConfirmations.some((c) => c.selectedGraduationType === 'scheduled')

  if (!hasScheduled) {
    // All immediate - use today
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return { type: 'immediate', date: today }
  }

  // Find the latest scheduled date preference
  const scheduledDates = allConfirmations
    .filter((c) => c.scheduledDatePreference !== null)
    .map((c) => c.scheduledDatePreference!.getTime())

  if (scheduledDates.length === 0) {
    // Scheduled was selected but no date - use tomorrow
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    tomorrow.setHours(0, 0, 0, 0)
    return { type: 'scheduled', date: tomorrow }
  }

  const latestDate = new Date(Math.max(...scheduledDates))
  return { type: 'scheduled', date: latestDate }
}

/**
 * Check if a scheduled date is valid (within allowed range).
 * AC2: Graduation date can be immediate or scheduled for future
 */
export function isValidScheduledDate(date: Date): boolean {
  const now = new Date()
  now.setHours(0, 0, 0, 0)

  const dateNormalized = new Date(date)
  dateNormalized.setHours(0, 0, 0, 0)

  const minDate = new Date(now)
  minDate.setDate(minDate.getDate() + MIN_SCHEDULE_DAYS)

  const maxDate = new Date(now)
  maxDate.setDate(maxDate.getDate() + MAX_SCHEDULE_DAYS)

  return dateNormalized >= minDate && dateNormalized <= maxDate
}

/**
 * Calculate the deletion date based on graduation date and retention period.
 * AC5: Existing data enters deletion queue with configurable retention
 */
export function calculateDeletionDate(graduationDate: Date, retentionDays: number): Date {
  const deletionDate = new Date(graduationDate)
  deletionDate.setDate(deletionDate.getDate() + retentionDays)
  return deletionDate
}

/**
 * Get days until decision expires.
 */
export function getDecisionDaysUntilExpiry(decision: GraduationDecision): number {
  const now = Date.now()
  const expiresAt = decision.expiresAt.getTime()
  const msRemaining = expiresAt - now

  if (msRemaining <= 0) {
    return 0
  }

  return Math.floor(msRemaining / (24 * 60 * 60 * 1000))
}

/**
 * Check if a decision has expired.
 */
export function isDecisionExpired(decision: GraduationDecision): boolean {
  // Completed decisions never expire
  if (decision.status === 'completed') {
    return false
  }

  return Date.now() > decision.expiresAt.getTime()
}
