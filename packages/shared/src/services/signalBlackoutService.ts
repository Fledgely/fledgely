/**
 * Signal Blackout Service - Story 7.5.2 Task 6
 *
 * Manages family notification blackout periods for safety signals.
 * AC5: No family notification for 48 hours.
 *
 * CRITICAL: Blackout prevents families from seeing signal-related activity
 * during initial crisis response period. This protects the child by ensuring
 * potential abusers in the family cannot learn about the signal.
 */

import { generateBlackoutId, type BlackoutRecord } from '../contracts/crisisPartner'

// ============================================
// Constants
// ============================================

/** Default blackout duration in hours (AC5) */
export const DEFAULT_BLACKOUT_HOURS = 48

/** Maximum extension allowed in hours */
export const MAX_EXTENSION_HOURS = 72

// ============================================
// Types
// ============================================

/**
 * Blackout status information.
 */
export interface BlackoutStatus {
  /** Whether signal is currently in blackout */
  inBlackout: boolean
  /** Blackout record ID if exists */
  blackoutId: string | null
  /** When blackout expires */
  expiresAt: Date | null
  /** Hours remaining in blackout */
  remainingHours: number
  /** Partner that extended the blackout */
  extendedBy: string | null
}

/**
 * Storage interface for blackout records.
 * Allows dependency injection for testing.
 */
export interface BlackoutStore {
  /** Get a blackout record by ID */
  get(id: string): Promise<BlackoutRecord | null>
  /** Set a blackout record */
  set(id: string, record: BlackoutRecord): Promise<void>
  /** Delete a blackout record */
  delete(id: string): Promise<void>
  /** Get all blackout records */
  getAll(): Promise<BlackoutRecord[]>
  /** Get blackout record by signal ID */
  getBySignalId(signalId: string): Promise<BlackoutRecord | null>
}

// ============================================
// Helper Functions
// ============================================

/**
 * Check if a blackout record has expired.
 *
 * @param record - Blackout record
 * @returns True if expired
 */
function isExpired(record: BlackoutRecord): boolean {
  return new Date() >= record.expiresAt
}

/**
 * Calculate remaining hours in a blackout.
 *
 * @param record - Blackout record
 * @returns Remaining hours (0 if expired)
 */
function calculateRemainingHours(record: BlackoutRecord): number {
  const now = new Date()
  const remaining = record.expiresAt.getTime() - now.getTime()

  if (remaining <= 0) {
    return 0
  }

  return remaining / (1000 * 60 * 60)
}

// ============================================
// Main Functions
// ============================================

/**
 * Start a blackout period for a signal.
 *
 * AC5: No family notification for minimum 48 hours.
 *
 * @param signalId - Signal ID
 * @param store - Blackout record store
 * @param durationHours - Blackout duration (default 48 hours)
 * @returns Created blackout record
 * @throws Error if blackout already exists or duration invalid
 */
export async function startBlackoutPeriod(
  signalId: string,
  store: BlackoutStore,
  durationHours: number = DEFAULT_BLACKOUT_HOURS
): Promise<BlackoutRecord> {
  // Validate duration
  if (durationHours <= 0) {
    throw new Error('Duration must be positive')
  }

  // Check for existing active blackout
  const existing = await store.getBySignalId(signalId)

  if (existing && existing.active && !isExpired(existing)) {
    throw new Error('Active blackout already exists for this signal')
  }

  // Create new blackout record
  const startedAt = new Date()
  const expiresAt = new Date(startedAt.getTime() + durationHours * 60 * 60 * 1000)

  const record: BlackoutRecord = {
    id: generateBlackoutId(),
    signalId,
    startedAt,
    expiresAt,
    extendedBy: null,
    active: true,
  }

  await store.set(record.id, record)

  return record
}

/**
 * Check if a signal is currently in blackout period.
 *
 * A signal is in blackout if:
 * - A blackout record exists
 * - The record is marked active
 * - The current time is before the expiry time
 *
 * @param signalId - Signal ID
 * @param store - Blackout record store
 * @returns True if signal is in blackout
 */
export async function isSignalInBlackout(signalId: string, store: BlackoutStore): Promise<boolean> {
  const record = await store.getBySignalId(signalId)

  if (!record) {
    return false
  }

  if (!record.active) {
    return false
  }

  if (isExpired(record)) {
    return false
  }

  return true
}

/**
 * Extend a blackout period.
 *
 * Crisis partners can request extension if intervention is ongoing.
 * Requires partner authorization.
 *
 * @param signalId - Signal ID
 * @param additionalHours - Hours to extend by
 * @param partnerAuthorization - Partner ID authorizing extension
 * @param store - Blackout record store
 * @returns Updated blackout record
 * @throws Error if no blackout, expired, or exceeds max
 */
export async function extendBlackoutPeriod(
  signalId: string,
  additionalHours: number,
  partnerAuthorization: string,
  store: BlackoutStore
): Promise<BlackoutRecord> {
  // Validate partner authorization
  if (!partnerAuthorization) {
    throw new Error('Partner authorization required for extension')
  }

  // Validate extension amount
  if (additionalHours > MAX_EXTENSION_HOURS) {
    throw new Error(`Extension exceeds maximum of ${MAX_EXTENSION_HOURS} hours`)
  }

  // Get existing blackout
  const record = await store.getBySignalId(signalId)

  if (!record || !record.active) {
    throw new Error('No active blackout found for this signal')
  }

  if (isExpired(record)) {
    throw new Error('Blackout has expired and cannot be extended')
  }

  // Extend the blackout
  const newExpiresAt = new Date(record.expiresAt.getTime() + additionalHours * 60 * 60 * 1000)

  const updated: BlackoutRecord = {
    ...record,
    expiresAt: newExpiresAt,
    extendedBy: partnerAuthorization,
  }

  await store.set(updated.id, updated)

  return updated
}

/**
 * Get the blackout status for a signal.
 *
 * @param signalId - Signal ID
 * @param store - Blackout record store
 * @returns Blackout status information
 */
export async function getBlackoutStatus(
  signalId: string,
  store: BlackoutStore
): Promise<BlackoutStatus> {
  const record = await store.getBySignalId(signalId)

  if (!record) {
    return {
      inBlackout: false,
      blackoutId: null,
      expiresAt: null,
      remainingHours: 0,
      extendedBy: null,
    }
  }

  const inBlackout = record.active && !isExpired(record)
  const remainingHours = inBlackout ? calculateRemainingHours(record) : 0

  return {
    inBlackout,
    blackoutId: record.id,
    expiresAt: record.expiresAt,
    remainingHours,
    extendedBy: record.extendedBy,
  }
}

/**
 * Cancel a blackout period.
 *
 * Only crisis partners can cancel blackouts.
 * Used when intervention is complete and family can be notified.
 *
 * @param signalId - Signal ID
 * @param partnerAuthorization - Partner ID authorizing cancellation
 * @param store - Blackout record store
 * @returns Cancelled blackout record
 * @throws Error if no blackout or not authorized
 */
export async function cancelBlackout(
  signalId: string,
  partnerAuthorization: string,
  store: BlackoutStore
): Promise<BlackoutRecord> {
  // Validate partner authorization
  if (!partnerAuthorization) {
    throw new Error('Partner authorization required for cancellation')
  }

  // Get existing blackout
  const record = await store.getBySignalId(signalId)

  if (!record) {
    throw new Error('No blackout found for this signal')
  }

  // Mark as inactive
  const updated: BlackoutRecord = {
    ...record,
    active: false,
  }

  await store.set(updated.id, updated)

  return updated
}

/**
 * Get all currently active blackouts.
 *
 * Filters to only return blackouts that are:
 * - Marked as active
 * - Not yet expired
 *
 * @param store - Blackout record store
 * @returns Array of active blackout records
 */
export async function getActiveBlackouts(store: BlackoutStore): Promise<BlackoutRecord[]> {
  const all = await store.getAll()

  return all.filter((record) => record.active && !isExpired(record))
}

/**
 * Clean up expired blackouts by marking them inactive.
 *
 * Should be run periodically to maintain data hygiene.
 *
 * @param store - Blackout record store
 * @returns Number of blackouts cleaned up
 */
export async function cleanupExpiredBlackouts(store: BlackoutStore): Promise<number> {
  const all = await store.getAll()
  let cleaned = 0

  for (const record of all) {
    if (record.active && isExpired(record)) {
      await store.set(record.id, { ...record, active: false })
      cleaned++
    }
  }

  return cleaned
}
