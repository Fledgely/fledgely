/**
 * Account Deletion Contracts - Story 51.4
 *
 * Types and schemas for complete account deletion (Firebase Auth + family data).
 * Extends data deletion patterns with account-level operations.
 */

import { z } from 'zod'

/**
 * Account deletion status values
 */
export const AccountDeletionStatus = {
  PENDING: 'pending',
  COOLING_OFF: 'cooling_off',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  FAILED: 'failed',
} as const

export type AccountDeletionStatus =
  (typeof AccountDeletionStatus)[keyof typeof AccountDeletionStatus]

/**
 * Affected user schema - tracks all users impacted by account deletion
 */
export const AffectedUserSchema = z.object({
  uid: z.string().min(1),
  email: z.string().email().optional(),
  role: z.enum(['guardian', 'child']),
  notifiedAt: z.number().nullable(),
})

export type AffectedUser = z.infer<typeof AffectedUserSchema>

/**
 * Account Deletion Request Schema
 *
 * Stored in Firestore at `accountDeletions/{deletionId}`
 */
export const AccountDeletionRequestSchema = z.object({
  deletionId: z.string().min(1),
  familyId: z.string().min(1),
  requestedBy: z.string().min(1), // Guardian UID who requested
  requestedByEmail: z.string().email(),
  requestedAt: z.number(), // Timestamp in ms
  status: z.enum(['pending', 'cooling_off', 'processing', 'completed', 'cancelled', 'failed']),
  coolingOffEndsAt: z.number(), // 14 days from request
  scheduledDeletionAt: z.number(), // Same as coolingOffEndsAt
  affectedUsers: z.array(AffectedUserSchema),
  processingStartedAt: z.number().nullable().optional(),
  processedAt: z.number().nullable().optional(),
  cancelledAt: z.number().nullable().optional(),
  cancelledBy: z.string().nullable().optional(), // UID of canceller
  completedAt: z.number().nullable().optional(),
  errorMessage: z.string().nullable().optional(),
  // Track which accounts were actually deleted
  deletedAccounts: z.array(z.string()).optional(),
  failedAccounts: z.array(z.string()).optional(),
})

export type AccountDeletionRequest = z.infer<typeof AccountDeletionRequestSchema>

/**
 * Request Account Deletion Input Schema
 *
 * Used for the callable function input validation
 */
export const RequestAccountDeletionInputSchema = z.object({
  familyId: z.string().min(1),
  confirmationPhrase: z.string().min(1),
})

export type RequestAccountDeletionInput = z.infer<typeof RequestAccountDeletionInputSchema>

/**
 * Request Account Deletion Response Schema
 *
 * Response from the requestAccountDeletion callable
 */
export const RequestAccountDeletionResponseSchema = z.object({
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
  coolingOffEndsAt: z.number().optional(),
  existingDeletionId: z.string().optional(),
  affectedUserCount: z.number().optional(),
})

export type RequestAccountDeletionResponse = z.infer<typeof RequestAccountDeletionResponseSchema>

/**
 * Cancel Account Deletion Input Schema
 */
export const CancelAccountDeletionInputSchema = z.object({
  familyId: z.string().min(1),
  deletionId: z.string().min(1),
})

export type CancelAccountDeletionInput = z.infer<typeof CancelAccountDeletionInputSchema>

/**
 * Cancel Account Deletion Response Schema
 */
export const CancelAccountDeletionResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
})

export type CancelAccountDeletionResponse = z.infer<typeof CancelAccountDeletionResponseSchema>

/**
 * Get Account Deletion Status Input Schema
 */
export const GetAccountDeletionStatusInputSchema = z.object({
  familyId: z.string().min(1),
  deletionId: z.string().optional(),
})

export type GetAccountDeletionStatusInput = z.infer<typeof GetAccountDeletionStatusInputSchema>

/**
 * Constants for account deletion configuration
 */
export const ACCOUNT_DELETION_CONFIG = {
  /** Cooling off period (14 days in ms) */
  COOLING_OFF_MS: 14 * 24 * 60 * 60 * 1000,

  /** Cooling off period in days */
  COOLING_OFF_DAYS: 14,

  /** Exact confirmation phrase required (case-sensitive) */
  CONFIRMATION_PHRASE: 'DELETE MY ACCOUNT',

  /** Firestore collection name */
  COLLECTION_NAME: 'accountDeletions',
} as const

/**
 * Account deletion result tracking
 */
export const AccountDeletionResultSchema = z.object({
  deletionId: z.string(),
  familyId: z.string(),
  startedAt: z.number(),
  completedAt: z.number().nullable(),
  dataDeleted: z.boolean(),
  accountsDeleted: z.array(z.string()),
  accountsFailed: z.array(z.string()),
  errors: z.array(z.string()),
})

export type AccountDeletionResult = z.infer<typeof AccountDeletionResultSchema>

/**
 * Helper function to calculate cooling off end date
 */
export function calculateAccountCoolingOffEndDate(requestedAt: number): number {
  return requestedAt + ACCOUNT_DELETION_CONFIG.COOLING_OFF_MS
}

/**
 * Helper function to check if confirmation phrase is valid
 */
export function isValidAccountConfirmationPhrase(phrase: string): boolean {
  return phrase === ACCOUNT_DELETION_CONFIG.CONFIRMATION_PHRASE
}
