/**
 * Crisis Allowlist Admin Contracts
 *
 * Story 7.4: Emergency Allowlist Push
 *
 * These schemas extend the base crisis allowlist types for admin operations
 * and Firestore document storage.
 *
 * FR61: System maintains a public crisis allowlist
 * NFR28: Crisis allowlist cached locally; functions without cloud connectivity
 */

import { z } from 'zod'
import { crisisResourceSchema } from './index'

/**
 * Crisis Allowlist Firestore Document Schema
 *
 * Extends the base allowlist with admin metadata for tracking updates.
 * Stored at: /config/crisisAllowlist
 */
export const crisisAllowlistDocSchema = z.object({
  /** Semantic version (e.g., "1.0.0") */
  version: z.string().regex(/^\d+\.\d+\.\d+$/),
  /** Timestamp of last update (Firestore timestamp as number) */
  lastUpdated: z.number(),
  /** All crisis resources */
  resources: z.array(crisisResourceSchema),
  /** Admin UID who last updated (for audit) */
  updatedBy: z.string().optional(),
  /** Whether this is an emergency push (faster propagation) */
  isEmergencyPush: z.boolean().optional(),
})
export type CrisisAllowlistDoc = z.infer<typeof crisisAllowlistDocSchema>

/**
 * Emergency Push Input Schema
 *
 * Input for the pushEmergencyAllowlistUpdate callable function.
 * AC2: Emergency Push Trigger, AC6: Audit Trail
 */
export const emergencyPushInputSchema = z.object({
  /** The new crisis resource to add */
  resource: crisisResourceSchema,
  /** Reason for the emergency addition (required for audit trail) */
  reason: z.string().min(10, 'Reason must be at least 10 characters'),
})
export type EmergencyPushInput = z.infer<typeof emergencyPushInputSchema>

/**
 * Emergency Push Response Schema
 */
export const emergencyPushResponseSchema = z.object({
  /** Whether the push was successful */
  success: z.boolean(),
  /** New version number after push */
  newVersion: z.string(),
  /** Timestamp of the update */
  timestamp: z.number(),
  /** Message describing the result */
  message: z.string(),
})
export type EmergencyPushResponse = z.infer<typeof emergencyPushResponseSchema>

/**
 * Allowlist Audit Entry Schema
 *
 * Records changes to the crisis allowlist for audit trail.
 * Stored at: /audit/crisisAllowlistChanges/{changeId}
 *
 * AC6: Audit Trail
 */
export const allowlistAuditEntrySchema = z.object({
  /** Timestamp of the change */
  timestamp: z.number(),
  /** Version after the change */
  version: z.string(),
  /** Admin UID who made the change */
  operatorId: z.string(),
  /** Reason for the change */
  reason: z.string(),
  /** Resource IDs that were added */
  resourcesAdded: z.array(z.string()),
  /** Resource IDs that were removed */
  resourcesRemoved: z.array(z.string()),
  /** Whether this was an emergency push */
  isEmergencyPush: z.boolean(),
})
export type AllowlistAuditEntry = z.infer<typeof allowlistAuditEntrySchema>

/**
 * Get Allowlist Response Schema
 *
 * Response from the GET /api/crisis-allowlist endpoint.
 * AC1: API Endpoint for Allowlist Distribution
 */
export const getAllowlistResponseSchema = z.object({
  /** Semantic version */
  version: z.string(),
  /** ISO timestamp of last update */
  lastUpdated: z.string(),
  /** All crisis resources */
  resources: z.array(crisisResourceSchema),
})
export type GetAllowlistResponse = z.infer<typeof getAllowlistResponseSchema>

/**
 * Increment semantic version
 *
 * @param version - Current version (e.g., "1.0.0")
 * @returns Next patch version (e.g., "1.0.1")
 */
export function incrementVersion(version: string): string {
  const parts = version.split('.')
  const major = parseInt(parts[0] || '1', 10)
  const minor = parseInt(parts[1] || '0', 10)
  const patch = parseInt(parts[2] || '0', 10)
  return `${major}.${minor}.${patch + 1}`
}
