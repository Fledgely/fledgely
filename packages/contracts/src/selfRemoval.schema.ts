import { z } from 'zod'

/**
 * Self-Removal Schema - Defines schemas for unilateral guardian self-removal
 *
 * This schema is the source of truth for all self-removal types in the application.
 * Per project guidelines: Types are always derived from Zod schemas.
 *
 * Story 2.8: Unilateral Self-Removal (Survivor Escape)
 *
 * CRITICAL SAFETY FEATURE: This enables abuse survivors to immediately
 * remove themselves from a shared family account without notification
 * to other family members.
 */

// ============================================================================
// Sealed Audit Schemas
// ============================================================================

/**
 * Sealed audit action types
 * These actions are logged ONLY in the sealed_audits collection,
 * NOT visible to family members
 */
export const sealedAuditActionSchema = z.enum([
  'guardian_self_removed', // Guardian removed themselves from family
  'safety_escape_initiated', // Safety escape was initiated (Epic 0.5)
])

export type SealedAuditAction = z.infer<typeof sealedAuditActionSchema>

/**
 * Sealed audit entry - NEVER visible to family members
 * Only accessible by support agents (Epic 0.5)
 *
 * CRITICAL: This collection has separate Firestore rules
 * that prevent family member access
 */
export const sealedAuditEntrySchema = z.object({
  /** Unique entry ID (Firestore document ID) */
  id: z.string().min(1, 'Audit entry ID is required'),

  /** Type of sealed action */
  action: sealedAuditActionSchema,

  /** User who performed the action */
  userId: z.string().min(1, 'User ID is required'),

  /** Family the action affected */
  familyId: z.string().min(1, 'Family ID is required'),

  /** When the action occurred */
  performedAt: z.date(),

  /** Additional context (optional) */
  metadata: z.record(z.unknown()).optional(),
})

export type SealedAuditEntry = z.infer<typeof sealedAuditEntrySchema>

/**
 * Firestore-compatible sealed audit entry schema
 */
export const sealedAuditEntryFirestoreSchema = z.object({
  id: z.string().min(1),
  action: sealedAuditActionSchema,
  userId: z.string().min(1),
  familyId: z.string().min(1),
  performedAt: z.custom<{ toDate: () => Date }>(
    (val) => val && typeof (val as { toDate?: () => Date }).toDate === 'function'
  ),
  metadata: z.record(z.unknown()).optional(),
})

export type SealedAuditEntryFirestore = z.infer<typeof sealedAuditEntryFirestoreSchema>

/**
 * Input for creating a sealed audit entry
 */
export const createSealedAuditInputSchema = z.object({
  /** Type of sealed action */
  action: sealedAuditActionSchema,

  /** User who performed the action */
  userId: z.string().min(1, 'User ID is required'),

  /** Family the action affected */
  familyId: z.string().min(1, 'Family ID is required'),

  /** Additional context (optional) */
  metadata: z.record(z.unknown()).optional(),
})

export type CreateSealedAuditInput = z.infer<typeof createSealedAuditInputSchema>

// ============================================================================
// Self-Removal Schemas
// ============================================================================

/**
 * Self-removal confirmation input
 * Requires explicit acknowledgment that this action cannot be undone
 */
export const selfRemovalConfirmationSchema = z.object({
  /** Family ID to remove self from */
  familyId: z.string().min(1, 'Family ID is required'),

  /** Fresh re-authentication token */
  reauthToken: z.string().min(1, 'Re-authentication is required'),

  /** User must explicitly acknowledge this action */
  acknowledgeNoReturn: z.literal(true, {
    errorMap: () => ({ message: 'You must acknowledge this action cannot be undone' }),
  }),
})

export type SelfRemovalConfirmation = z.infer<typeof selfRemovalConfirmationSchema>

/**
 * Result of self-removal operation
 */
export const selfRemovalResultSchema = z.object({
  /** Whether removal was successful */
  success: z.boolean(),

  /** Was this the only guardian (family now orphaned) */
  isSingleGuardian: z.boolean(),

  /** Family ID removed from */
  familyId: z.string().min(1),

  /** When the removal occurred */
  removedAt: z.date(),
})

export type SelfRemovalResult = z.infer<typeof selfRemovalResultSchema>

/**
 * Firestore-compatible self-removal result
 */
export const selfRemovalResultFirestoreSchema = z.object({
  success: z.boolean(),
  isSingleGuardian: z.boolean(),
  familyId: z.string().min(1),
  removedAt: z.custom<{ toDate: () => Date }>(
    (val) => val && typeof (val as { toDate?: () => Date }).toDate === 'function'
  ),
})

export type SelfRemovalResultFirestore = z.infer<typeof selfRemovalResultFirestoreSchema>

// ============================================================================
// Error Messages (6th-grade reading level - NFR65)
// ============================================================================

/**
 * Error messages at 6th-grade reading level (NFR65)
 * These messages are designed to be clear and simple
 */
export const SELF_REMOVAL_ERROR_MESSAGES: Record<string, string> = {
  'family-not-found': 'We could not find this family.',
  'not-a-guardian': 'You are not a member of this family.',
  'reauth-required': 'Please sign in again to confirm this action.',
  'reauth-expired': 'Your sign-in has expired. Please try again.',
  'removal-failed': 'Could not remove you from the family. Please try again.',
  'single-guardian-warning':
    'You are the only guardian. Leaving will leave children without a guardian.',
  'single-guardian-proceed': 'Family flagged for support review.',
  'network-error': 'Connection problem. Please check your internet and try again.',
  default: 'Something went wrong. Please try again.',
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get human-readable error message for self-removal errors
 * @param code Error code
 * @returns User-friendly error message at 6th-grade reading level
 */
export function getSelfRemovalErrorMessage(code: string): string {
  return SELF_REMOVAL_ERROR_MESSAGES[code] || SELF_REMOVAL_ERROR_MESSAGES.default
}

/**
 * Convert Firestore sealed audit entry to domain type
 */
export function convertFirestoreToSealedAuditEntry(
  data: SealedAuditEntryFirestore
): SealedAuditEntry {
  return sealedAuditEntrySchema.parse({
    id: data.id,
    action: data.action,
    userId: data.userId,
    familyId: data.familyId,
    performedAt: data.performedAt.toDate(),
    metadata: data.metadata,
  })
}

/**
 * Safely parse sealed audit entry, returning null if invalid
 */
export function safeParseSealedAuditEntry(data: unknown): SealedAuditEntry | null {
  const result = sealedAuditEntrySchema.safeParse(data)
  return result.success ? result.data : null
}

/**
 * Validate self-removal confirmation input
 * @throws ZodError if validation fails
 */
export function validateSelfRemovalConfirmation(data: unknown): SelfRemovalConfirmation {
  return selfRemovalConfirmationSchema.parse(data)
}

/**
 * Safely parse self-removal confirmation
 */
export function safeParseSelfRemovalConfirmation(data: unknown): SelfRemovalConfirmation | null {
  const result = selfRemovalConfirmationSchema.safeParse(data)
  return result.success ? result.data : null
}

/**
 * Safely parse self-removal result
 */
export function safeParseSelfRemovalResult(data: unknown): SelfRemovalResult | null {
  const result = selfRemovalResultSchema.safeParse(data)
  return result.success ? result.data : null
}

/**
 * Convert Firestore self-removal result to domain type
 */
export function convertFirestoreToSelfRemovalResult(
  data: SelfRemovalResultFirestore
): SelfRemovalResult {
  return selfRemovalResultSchema.parse({
    success: data.success,
    isSingleGuardian: data.isSingleGuardian,
    familyId: data.familyId,
    removedAt: data.removedAt.toDate(),
  })
}

/**
 * Check if error indicates re-authentication is needed
 */
export function isReauthError(error: Error | unknown): boolean {
  if (!(error instanceof Error)) return false

  const message = error.message.toLowerCase()
  return (
    message.includes('sign in again') ||
    message.includes('reauth') ||
    message.includes('expired') ||
    message.includes('authentication')
  )
}

// ============================================================================
// Custom Error Class
// ============================================================================

/**
 * Custom error class for self-removal operations
 * Includes error code for i18n-friendly error handling
 */
export class SelfRemovalError extends Error {
  constructor(
    public readonly code: string,
    message?: string
  ) {
    super(message || getSelfRemovalErrorMessage(code))
    this.name = 'SelfRemovalError'
  }
}
