/**
 * Age 18 Deletion Contracts - Story 38.5 Task 1
 *
 * Zod schemas and types for age-18 automatic deletion.
 * AC1: Child's birthdate is stored on file (FR72)
 * AC2: When child turns 18, all monitoring data is automatically deleted (INV-005)
 * AC4: Deletion includes: screenshots, flags, activity logs, trust history
 */

import { z } from 'zod'

// ============================================
// Configuration Constants
// ============================================

/** Age threshold for automatic deletion (18 years) */
export const AGE_18_IN_YEARS = 18

/** Frequency of birthdate checks */
export const DELETION_CHECK_INTERVAL = 'daily'

/** Days before 18th birthday to send pre-deletion notice */
export const PRE_DELETION_NOTICE_DAYS = 30

/** Minimum valid age for child account (years) */
export const MIN_CHILD_AGE_YEARS = 1

/** Maximum valid age for stored birthdate (years) */
export const MAX_BIRTHDATE_AGE_YEARS = 100

// ============================================
// Deletion Data Type Schema
// ============================================

/**
 * Data types that are deleted when child turns 18.
 * Extended from Story 38-3 to include all child data.
 * AC4: Includes screenshots, flags, activity logs, trust history
 */
export const deletionDataTypeSchema = z.enum([
  'screenshots',
  'flags',
  'activity_logs',
  'trust_history',
  'child_profile',
  'agreements',
  'devices',
])
export type DeletionDataType = z.infer<typeof deletionDataTypeSchema>

/** All data types that are deleted at age 18 */
export const ALL_DELETION_DATA_TYPES: DeletionDataType[] = [
  'screenshots',
  'flags',
  'activity_logs',
  'trust_history',
  'child_profile',
  'agreements',
  'devices',
]

// ============================================
// Deletion Status Schema
// ============================================

/**
 * Status of an age-18 deletion record.
 */
export const deletionStatusSchema = z.enum(['pending', 'processing', 'completed', 'failed'])
export type DeletionStatus = z.infer<typeof deletionStatusSchema>

// ============================================
// Notification Type Schema
// ============================================

/**
 * Type of age-18 deletion notification.
 */
export const notificationTypeSchema = z.enum(['pre_deletion', 'deletion_complete'])
export type NotificationType = z.infer<typeof notificationTypeSchema>

// ============================================
// Child Birthdate Schema (AC1)
// ============================================

/**
 * Child birthdate record.
 * AC1: Child's birthdate is stored on file (FR72)
 */
export const childBirthdateSchema = z.object({
  childId: z.string().min(1),
  familyId: z.string().min(1),
  birthdate: z.coerce.date(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})
export type ChildBirthdate = z.infer<typeof childBirthdateSchema>

// ============================================
// Age 18 Deletion Record Schema (AC2, AC4)
// ============================================

/**
 * Record of an age-18 automatic deletion.
 * AC2: When child turns 18, all monitoring data is automatically deleted (INV-005)
 * AC4: Deletion includes: screenshots, flags, activity logs, trust history
 */
export const age18DeletionRecordSchema = z.object({
  id: z.string().min(1),
  childId: z.string().min(1),
  familyId: z.string().min(1),
  birthdate: z.coerce.date(),
  deletionTriggeredAt: z.coerce.date(),
  deletionCompletedAt: z.coerce.date().nullable(),
  dataTypesDeleted: z.array(deletionDataTypeSchema),
  status: deletionStatusSchema,
  notificationSentAt: z.coerce.date().nullable(),
})
export type Age18DeletionRecord = z.infer<typeof age18DeletionRecordSchema>

// ============================================
// Age 18 Deletion Notification Schema
// ============================================

/**
 * Notification sent to child about deletion.
 * AC6: Child notified: "You're 18 - all data has been deleted"
 */
export const age18DeletionNotificationSchema = z.object({
  id: z.string().min(1),
  childId: z.string().min(1),
  type: notificationTypeSchema,
  sentAt: z.coerce.date(),
  acknowledged: z.boolean(),
})
export type Age18DeletionNotification = z.infer<typeof age18DeletionNotificationSchema>

// ============================================
// Helper Functions
// ============================================

/**
 * Create a child birthdate record.
 */
export function createChildBirthdate(
  childId: string,
  familyId: string,
  birthdate: Date
): ChildBirthdate {
  const now = new Date()
  return {
    childId,
    familyId,
    birthdate,
    createdAt: now,
    updatedAt: now,
  }
}

/**
 * Generate unique deletion record ID.
 */
function generateDeletionId(): string {
  return `age18-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
}

/**
 * Create an age-18 deletion record.
 * Initializes with pending status and all data types to be deleted.
 */
export function createAge18DeletionRecord(
  childId: string,
  familyId: string,
  birthdate: Date
): Age18DeletionRecord {
  return {
    id: generateDeletionId(),
    childId,
    familyId,
    birthdate,
    deletionTriggeredAt: new Date(),
    deletionCompletedAt: null,
    dataTypesDeleted: [...ALL_DELETION_DATA_TYPES],
    status: 'pending',
    notificationSentAt: null,
  }
}

/**
 * Check if a birthdate is valid for storage.
 * Valid: Not in future, not more than 100 years ago, child at least 1 year old.
 */
export function isValidBirthdateForStorage(birthdate: Date): boolean {
  const now = new Date()
  const birthdateTime = birthdate.getTime()

  // Cannot be in the future
  if (birthdateTime > now.getTime()) {
    return false
  }

  // Cannot be more than 100 years ago
  const hundredYearsAgo = new Date(now)
  hundredYearsAgo.setFullYear(hundredYearsAgo.getFullYear() - MAX_BIRTHDATE_AGE_YEARS)
  if (birthdateTime < hundredYearsAgo.getTime()) {
    return false
  }

  // Child must be at least 1 year old
  const oneYearAgo = new Date(now)
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - MIN_CHILD_AGE_YEARS)
  if (birthdateTime > oneYearAgo.getTime()) {
    return false
  }

  return true
}
