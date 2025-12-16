/**
 * Emergency Allowlist Schema
 *
 * Story 7.4: Emergency Allowlist Push - Task 2.3
 *
 * Zod schemas for emergency allowlist push functionality.
 * Enables operations to push crisis resource updates within 1 hour
 * without requiring code deployment.
 */

import { z } from 'zod'
import { crisisUrlEntrySchema } from '@fledgely/shared'

/**
 * Emergency push status values
 *
 * - pending: Push initiated, not yet propagated to API
 * - propagated: Entries added to Firestore, API will serve them
 * - verified: Scheduled verification confirmed push is live
 * - failed: Verification failed after timeout
 */
export const emergencyPushStatusSchema = z.enum([
  'pending',
  'propagated',
  'verified',
  'failed',
])

export type EmergencyPushStatus = z.infer<typeof emergencyPushStatusSchema>

/**
 * Emergency push input schema
 *
 * Used when admin triggers an emergency allowlist push.
 * Requires detailed reason for audit trail.
 */
export const emergencyPushSchema = z.object({
  /** Crisis entries to add (minimum 1) */
  entries: z.array(crisisUrlEntrySchema).min(1, 'At least one entry required'),

  /** Detailed reason for emergency push (audit trail) */
  reason: z.string().min(10, 'Reason must be at least 10 characters'),

  /**
   * Email of operator triggering the push
   * Optional - if not provided, extracted from authenticated user
   */
  operator: z.string().email('Operator must be a valid email').optional(),
})

export type EmergencyPush = z.infer<typeof emergencyPushSchema>

/**
 * Emergency push record schema
 *
 * Stored in Firestore: `emergency-pushes/{pushId}`
 * Contains full audit trail of the push operation.
 */
export const emergencyPushRecordSchema = z.object({
  /** Unique identifier (UUID v4) */
  id: z.string().uuid(),

  /** Crisis entries that were pushed */
  entries: z.array(crisisUrlEntrySchema).min(1),

  /** Detailed reason for emergency push (audit trail) */
  reason: z.string().min(10, 'Reason must be at least 10 characters'),

  /** Email of operator who triggered the push */
  operator: z.string().email(),

  /** When the push was initiated (ISO 8601) */
  timestamp: z.string().datetime(),

  /** Current status of the push */
  status: emergencyPushStatusSchema,

  /** When verification passed (ISO 8601) - only set when status is 'verified' */
  verifiedAt: z.string().datetime().optional(),

  /** Failure reason - only set when status is 'failed' */
  failureReason: z.string().optional(),
})

export type EmergencyPushRecord = z.infer<typeof emergencyPushRecordSchema>

/**
 * Emergency override entry schema
 *
 * Stored in Firestore: `crisis-allowlist-override/{entryId}`
 * Individual entries added via emergency push.
 */
export const emergencyOverrideEntrySchema = z.object({
  /** Unique identifier (UUID v4) */
  id: z.string().uuid(),

  /** The crisis URL entry */
  entry: crisisUrlEntrySchema,

  /** When this entry was added (ISO 8601) */
  addedAt: z.string().datetime(),

  /** Reason for addition (from push) */
  reason: z.string(),

  /** Reference to the push that added this entry */
  pushId: z.string().uuid(),
})

export type EmergencyOverrideEntry = z.infer<typeof emergencyOverrideEntrySchema>

/**
 * Emergency push response schema
 *
 * Returned by the emergency push API endpoint.
 */
export const emergencyPushResponseSchema = z.object({
  /** Whether the push was successful */
  success: z.boolean(),

  /** ID of the created push record */
  pushId: z.string().uuid(),

  /** Number of entries added */
  entriesAdded: z.number().int().min(0),

  /** Message for the operator */
  message: z.string(),

  /** Estimated time until propagation (in minutes) */
  estimatedPropagationMinutes: z.number().int().min(0),
})

export type EmergencyPushResponse = z.infer<typeof emergencyPushResponseSchema>

/**
 * Constants for emergency push operations
 */
export const EMERGENCY_PUSH_CONSTANTS = {
  /** Maximum entries per push */
  MAX_ENTRIES_PER_PUSH: 10,

  /** Verification check interval in minutes */
  VERIFICATION_INTERVAL_MINUTES: 15,

  /** Maximum time to wait for verification (in minutes) */
  VERIFICATION_TIMEOUT_MINUTES: 60,

  /** Target propagation time (in minutes) - per FR7A */
  TARGET_PROPAGATION_MINUTES: 30,

  /** Version prefix for emergency pushes */
  EMERGENCY_VERSION_PREFIX: 'emergency',
} as const

/**
 * Status labels for UI display
 */
export const EMERGENCY_PUSH_STATUS_LABELS: Record<EmergencyPushStatus, string> =
  {
    pending: 'Pending',
    propagated: 'Propagated',
    verified: 'Verified',
    failed: 'Failed',
  }

/**
 * Status descriptions for UI display
 */
export const EMERGENCY_PUSH_STATUS_DESCRIPTIONS: Record<
  EmergencyPushStatus,
  string
> = {
  pending: 'Push initiated, waiting for propagation to API',
  propagated: 'Entries added to database, API is serving updated list',
  verified: 'Push verified live by automated check',
  failed: 'Verification failed - entries may not be live',
}

/**
 * Get display label for status
 */
export function getEmergencyPushStatusLabel(status: EmergencyPushStatus): string {
  return EMERGENCY_PUSH_STATUS_LABELS[status]
}

/**
 * Get description for status
 */
export function getEmergencyPushStatusDescription(
  status: EmergencyPushStatus
): string {
  return EMERGENCY_PUSH_STATUS_DESCRIPTIONS[status]
}

/**
 * Create an emergency version string
 *
 * @param baseVersion - Base allowlist version (e.g., "1.0.0")
 * @param pushId - UUID of the emergency push
 * @returns Version string like "1.0.0-emergency-{pushId}"
 */
export function createEmergencyVersion(
  baseVersion: string,
  pushId: string
): string {
  // Extract just the semver part (before the timestamp)
  const semverMatch = baseVersion.match(/^(\d+\.\d+\.\d+)/)
  const semver = semverMatch ? semverMatch[1] : '1.0.0'

  return `${semver}-${EMERGENCY_PUSH_CONSTANTS.EMERGENCY_VERSION_PREFIX}-${pushId}`
}

/**
 * Check if a version is an emergency version
 */
export function isEmergencyVersion(version: string): boolean {
  return version.includes(
    `-${EMERGENCY_PUSH_CONSTANTS.EMERGENCY_VERSION_PREFIX}-`
  )
}

/**
 * Extract push ID from emergency version
 *
 * @returns Push ID or null if not an emergency version
 */
export function extractPushIdFromVersion(version: string): string | null {
  const prefix = `-${EMERGENCY_PUSH_CONSTANTS.EMERGENCY_VERSION_PREFIX}-`
  const index = version.indexOf(prefix)
  if (index === -1) return null

  return version.substring(index + prefix.length)
}
