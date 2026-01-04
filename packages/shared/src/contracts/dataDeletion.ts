/**
 * Data Deletion Contracts - Story 51.2
 *
 * GDPR Article 17 - Right to erasure (right to be forgotten)
 * Types and schemas for family data deletion requests and processing.
 */

import { z } from 'zod'

/**
 * Deletion status values
 */
export const DataDeletionStatus = {
  PENDING: 'pending',
  COOLING_OFF: 'cooling_off',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  FAILED: 'failed',
} as const

export type DataDeletionStatus = (typeof DataDeletionStatus)[keyof typeof DataDeletionStatus]

/**
 * Data Deletion Request Schema
 *
 * Stored in Firestore at `dataDeletions/{deletionId}`
 */
export const DataDeletionRequestSchema = z.object({
  deletionId: z.string().min(1),
  familyId: z.string().min(1),
  requestedBy: z.string().min(1), // Guardian UID
  requestedByEmail: z.string().email(),
  requestedAt: z.number(), // Timestamp in ms
  status: z.enum(['pending', 'cooling_off', 'processing', 'completed', 'cancelled', 'failed']),
  coolingOffEndsAt: z.number(), // 14 days from request
  scheduledDeletionAt: z.number(), // Same as coolingOffEndsAt
  processingStartedAt: z.number().nullable().optional(),
  processedAt: z.number().nullable().optional(),
  cancelledAt: z.number().nullable().optional(),
  cancelledBy: z.string().nullable().optional(), // UID of canceller
  completedAt: z.number().nullable().optional(),
  errorMessage: z.string().nullable().optional(),
})

export type DataDeletionRequest = z.infer<typeof DataDeletionRequestSchema>

/**
 * Request Data Deletion Input Schema
 *
 * Used for the callable function input validation
 */
export const RequestDataDeletionInputSchema = z.object({
  familyId: z.string().min(1),
  confirmationPhrase: z.string().min(1),
})

export type RequestDataDeletionInput = z.infer<typeof RequestDataDeletionInputSchema>

/**
 * Request Data Deletion Response Schema
 *
 * Response from the requestDataDeletion callable
 */
export const RequestDataDeletionResponseSchema = z.object({
  success: z.boolean(),
  deletionId: z.string().optional(),
  status: z.enum([
    'pending',
    'cooling_off',
    'processing',
    'completed',
    'cancelled',
    'failed',
    'already_pending',
    'invalid_confirmation',
  ]),
  message: z.string(),
  coolingOffEndsAt: z.number().optional(), // Timestamp when cooling off ends
  existingDeletionId: z.string().optional(), // If already pending
})

export type RequestDataDeletionResponse = z.infer<typeof RequestDataDeletionResponseSchema>

/**
 * Cancel Data Deletion Input Schema
 */
export const CancelDataDeletionInputSchema = z.object({
  familyId: z.string().min(1),
  deletionId: z.string().min(1),
})

export type CancelDataDeletionInput = z.infer<typeof CancelDataDeletionInputSchema>

/**
 * Cancel Data Deletion Response Schema
 */
export const CancelDataDeletionResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
})

export type CancelDataDeletionResponse = z.infer<typeof CancelDataDeletionResponseSchema>

/**
 * Get Deletion Status Input Schema
 */
export const GetDeletionStatusInputSchema = z.object({
  familyId: z.string().min(1),
  deletionId: z.string().optional(), // If not provided, returns latest active
})

export type GetDeletionStatusInput = z.infer<typeof GetDeletionStatusInputSchema>

/**
 * Constants for deletion configuration
 */
export const DATA_DELETION_CONFIG = {
  /** Cooling off period (14 days in ms) */
  COOLING_OFF_MS: 14 * 24 * 60 * 60 * 1000,

  /** Cooling off period in days */
  COOLING_OFF_DAYS: 14,

  /** Maximum time for deletion processing (NFR18: 30 days) */
  MAX_PROCESSING_DAYS: 30,

  /** Maximum processing time in ms */
  MAX_PROCESSING_MS: 30 * 24 * 60 * 60 * 1000,

  /** Exact confirmation phrase required (case-sensitive) */
  CONFIRMATION_PHRASE: 'DELETE MY DATA',

  /** Firestore collection name */
  COLLECTION_NAME: 'dataDeletions',
} as const

/**
 * Data types that will be deleted
 * Matches the age18 deletion data types for consistency
 */
export const DELETION_DATA_TYPES = [
  'family_profile',
  'children',
  'devices',
  'agreements',
  'screenshots',
  'screenshot_images',
  'flags',
  'audit_events',
  'settings',
  'exports',
] as const

export type DeletionDataType = (typeof DELETION_DATA_TYPES)[number]

/**
 * Deletion result tracking
 */
export const DeletionResultSchema = z.object({
  deletionId: z.string(),
  familyId: z.string(),
  startedAt: z.number(),
  completedAt: z.number().nullable(),
  dataTypesDeleted: z.array(z.string()),
  recordsDeleted: z.number(),
  storageDeleted: z.number(), // Bytes
  errors: z.array(z.string()),
})

export type DeletionResult = z.infer<typeof DeletionResultSchema>

/**
 * Helper function to calculate cooling off end date
 */
export function calculateCoolingOffEndDate(requestedAt: number): number {
  return requestedAt + DATA_DELETION_CONFIG.COOLING_OFF_MS
}

/**
 * Helper function to check if confirmation phrase is valid
 */
export function isValidConfirmationPhrase(phrase: string): boolean {
  return phrase === DATA_DELETION_CONFIG.CONFIRMATION_PHRASE
}

/**
 * Helper function to format time remaining in cooling off
 */
export function formatCoolingOffRemaining(coolingOffEndsAt: number): string {
  const now = Date.now()
  const remaining = coolingOffEndsAt - now

  if (remaining <= 0) {
    return 'Cooling off period ended'
  }

  const days = Math.floor(remaining / (24 * 60 * 60 * 1000))
  const hours = Math.floor((remaining % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000))

  if (days > 0) {
    return `${days} day${days !== 1 ? 's' : ''} and ${hours} hour${hours !== 1 ? 's' : ''} remaining`
  }

  return `${hours} hour${hours !== 1 ? 's' : ''} remaining`
}
