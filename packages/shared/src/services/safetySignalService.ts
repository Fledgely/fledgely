/**
 * Safety Signal Service - Story 7.5.1 Task 2
 *
 * Service for managing safety signals with offline queuing.
 * AC3: Works offline (queues signal for delivery)
 * AC6: Signal queuing infrastructure
 *
 * Story 7.5.6 Task 6: Integration with isolated storage and encryption.
 * AC1: Signal stored in isolated collection (not under family document)
 * AC2: Signal uses separate encryption key (not family key)
 * AC4: Signal excluded from family audit trail
 *
 * CRITICAL SAFETY: Signals are NEVER visible to family members.
 */

import {
  createSafetySignal as createSignal,
  createOfflineQueueEntry,
  SIGNAL_STATUS,
  isValidStatusTransition,
  type SafetySignal,
  type SignalStatus,
  type TriggerMethod,
  type SignalPlatform,
  type OfflineSignalQueueEntry,
} from '../contracts/safetySignal'

// Story 7.5.6: Isolated storage and encryption imports
import { generateSignalEncryptionKey, encryptSignalData } from './signalEncryptionService'
import { storeIsolatedSignal, type IsolatedSignal } from './isolatedSignalStorageService'
import { createRetentionStatus } from './signalRetentionService'

// Story 7.5.7: 48-Hour Blackout imports
import { createBlackout } from './signalBlackoutService'
import { createSuppression } from './notificationSuppressionService'
import { fillActivityGap } from './activityGapFillerService'
import { createSignalPrivacyGap } from './privacyGapService'

// ============================================
// In-Memory Storage (would be Firestore in production)
// ============================================

const signalStore: SafetySignal[] = []
const offlineQueue: OfflineSignalQueueEntry[] = []

// ============================================
// Signal Creation Functions (AC3, AC6)
// ============================================

/**
 * Create a new safety signal.
 *
 * AC3: Works offline (queues signal for delivery)
 * AC6: Signal includes childId, timestamp, deviceId, offlineQueued flag
 *
 * @param childId - Child triggering the signal
 * @param familyId - Family ID for routing
 * @param triggerMethod - How the signal was triggered
 * @param platform - Platform where triggered
 * @param isOffline - Whether currently offline
 * @param deviceId - Optional device ID
 * @returns Created SafetySignal
 */
export function createSafetySignal(
  childId: string,
  familyId: string,
  triggerMethod: TriggerMethod,
  platform: SignalPlatform,
  isOffline: boolean,
  deviceId: string | null = null
): SafetySignal {
  const signal = createSignal(childId, familyId, triggerMethod, platform, isOffline, deviceId)

  // Store signal
  signalStore.push(signal)

  // If offline, queue for later delivery
  if (isOffline) {
    queueOfflineSignal(signal)
  }

  return signal
}

// ============================================
// Offline Queue Functions (AC3)
// ============================================

/**
 * Queue a signal for offline delivery.
 *
 * AC3: Signal is queued locally for delivery when connectivity is restored.
 *
 * @param signal - Signal to queue
 */
export function queueOfflineSignal(signal: SafetySignal): void {
  // Only queue if not already queued
  const existing = offlineQueue.find((entry) => entry.signal.id === signal.id)
  if (!existing) {
    const entry = createOfflineQueueEntry(signal)
    offlineQueue.push(entry)
  }
}

/**
 * Process offline queue when connectivity is restored.
 *
 * AC3: Delivery occurs automatically when connectivity is restored.
 *
 * @param childId - Child whose queue to process
 * @returns Array of processed signals
 */
export function processOfflineQueue(childId: string): SafetySignal[] {
  const processed: SafetySignal[] = []

  // Find all queued signals for this child
  const childEntries = offlineQueue.filter((entry) => entry.signal.childId === childId)

  for (const entry of childEntries) {
    // Update signal status from queued to pending
    const signal = entry.signal
    const updatedSignal = updateSignalStatus(signal.id, SIGNAL_STATUS.PENDING)

    if (updatedSignal) {
      processed.push(updatedSignal)
    }

    // Remove from offline queue
    const index = offlineQueue.indexOf(entry)
    if (index !== -1) {
      offlineQueue.splice(index, 1)
    }
  }

  return processed
}

/**
 * Get count of signals in offline queue for a child.
 *
 * @param childId - Child ID
 * @returns Number of queued signals
 */
export function getOfflineQueueCount(childId: string): number {
  return offlineQueue.filter((entry) => entry.signal.childId === childId).length
}

/**
 * Get all offline queue entries for a child.
 *
 * @param childId - Child ID
 * @returns Array of queue entries
 */
export function getOfflineQueueEntries(childId: string): OfflineSignalQueueEntry[] {
  return offlineQueue.filter((entry) => entry.signal.childId === childId)
}

// ============================================
// Signal Query Functions
// ============================================

/**
 * Get pending signals for a child.
 *
 * Used for retry/status checking.
 *
 * @param childId - Child ID
 * @returns Array of pending signals
 */
export function getPendingSignals(childId: string): SafetySignal[] {
  return signalStore.filter(
    (signal) =>
      signal.childId === childId &&
      (signal.status === SIGNAL_STATUS.QUEUED ||
        signal.status === SIGNAL_STATUS.PENDING ||
        signal.status === SIGNAL_STATUS.SENT)
  )
}

/**
 * Get signal by ID.
 *
 * @param signalId - Signal ID
 * @returns Signal or null if not found
 */
export function getSignalById(signalId: string): SafetySignal | null {
  return signalStore.find((signal) => signal.id === signalId) || null
}

/**
 * Get all signals for a child.
 *
 * @param childId - Child ID
 * @returns Array of signals
 */
export function getSignalsByChildId(childId: string): SafetySignal[] {
  return signalStore.filter((signal) => signal.childId === childId)
}

/**
 * Get signals by status.
 *
 * @param status - Signal status
 * @returns Array of signals with given status
 */
export function getSignalsByStatus(status: SignalStatus): SafetySignal[] {
  return signalStore.filter((signal) => signal.status === status)
}

// ============================================
// Signal Status Update Functions
// ============================================

/**
 * Update signal status.
 *
 * Validates status transition before updating.
 *
 * @param signalId - Signal ID
 * @param newStatus - New status
 * @returns Updated signal or null if not found/invalid transition
 */
export function updateSignalStatus(signalId: string, newStatus: SignalStatus): SafetySignal | null {
  const index = signalStore.findIndex((signal) => signal.id === signalId)

  if (index === -1) {
    return null
  }

  const signal = signalStore[index]

  // Validate status transition
  if (!isValidStatusTransition(signal.status, newStatus)) {
    return null
  }

  // Update signal
  const updatedSignal: SafetySignal = {
    ...signal,
    status: newStatus,
    // Set deliveredAt if transitioning to delivered
    deliveredAt: newStatus === SIGNAL_STATUS.DELIVERED ? new Date() : signal.deliveredAt,
  }

  signalStore[index] = updatedSignal
  return updatedSignal
}

/**
 * Mark signal as delivered.
 *
 * @param signalId - Signal ID
 * @returns Updated signal or null
 */
export function markSignalDelivered(signalId: string): SafetySignal | null {
  // First move to sent if pending
  const signal = getSignalById(signalId)
  if (!signal) return null

  if (signal.status === SIGNAL_STATUS.PENDING) {
    updateSignalStatus(signalId, SIGNAL_STATUS.SENT)
  }

  // Then move to delivered if sent
  const sentSignal = getSignalById(signalId)
  if (sentSignal && sentSignal.status === SIGNAL_STATUS.SENT) {
    return updateSignalStatus(signalId, SIGNAL_STATUS.DELIVERED)
  }

  return null
}

/**
 * Mark signal as acknowledged.
 *
 * @param signalId - Signal ID
 * @returns Updated signal or null
 */
export function markSignalAcknowledged(signalId: string): SafetySignal | null {
  const signal = getSignalById(signalId)
  if (!signal) return null

  if (signal.status === SIGNAL_STATUS.DELIVERED) {
    return updateSignalStatus(signalId, SIGNAL_STATUS.ACKNOWLEDGED)
  }

  return null
}

// ============================================
// Offline Queue Retry Functions
// ============================================

/**
 * Increment retry count for offline queue entry.
 *
 * @param signalId - Signal ID
 * @returns Updated entry or null
 */
export function incrementRetryCount(signalId: string): OfflineSignalQueueEntry | null {
  const entry = offlineQueue.find((e) => e.signal.id === signalId)

  if (!entry) {
    return null
  }

  entry.retryCount += 1
  entry.lastRetryAt = new Date()

  return entry
}

/**
 * Get failed offline entries (retry count > 0).
 *
 * @param childId - Child ID
 * @returns Array of entries that have been retried
 */
export function getFailedOfflineEntries(childId: string): OfflineSignalQueueEntry[] {
  return offlineQueue.filter((entry) => entry.signal.childId === childId && entry.retryCount > 0)
}

// ============================================
// Story 7.5.6: Isolated Signal Creation (AC1, AC2, AC4)
// ============================================

/**
 * Result of creating an isolated safety signal.
 */
export interface IsolatedSafetySignalResult {
  /** The basic signal (in-memory) */
  signal: SafetySignal
  /** The isolated signal stored in Firestore */
  isolatedSignal: IsolatedSignal
  /** The encryption key ID used */
  encryptionKeyId: string
  /** Story 7.5.7: Blackout ID for 48-hour family notification blackout */
  blackoutId: string
  /** Story 7.5.7: Suppression ID for notification suppression */
  suppressionId: string
  /** Story 7.5.7: Privacy gap ID for post-blackout data masking */
  privacyGapId: string
}

/**
 * Create a safety signal with full isolation and encryption.
 *
 * Story 7.5.6 Task 6: Integration with isolated storage and encryption.
 * AC1: Signal stored in isolated collection (not under family document)
 * AC2: Signal uses separate encryption key (not family key)
 * AC4: Signal excluded from family audit trail
 *
 * CRITICAL SAFETY:
 * - Generates isolated encryption key (NOT family key)
 * - Encrypts signal payload with isolated key
 * - Stores in ISOLATED collection (NOT family hierarchy)
 * - Creates retention status per jurisdiction
 * - Does NOT create any family-visible audit entries
 *
 * @param childId - Child triggering the signal
 * @param platform - Platform where triggered
 * @param triggerMethod - How the signal was triggered
 * @param jurisdiction - Jurisdiction code for legal compliance
 * @param isOffline - Whether currently offline
 * @param deviceId - Optional device ID
 * @returns Created signal with isolation data
 */
export async function createIsolatedSafetySignal(
  childId: string,
  platform: SignalPlatform,
  triggerMethod: TriggerMethod,
  jurisdiction: string,
  isOffline: boolean = false,
  deviceId: string | null = null
): Promise<IsolatedSafetySignalResult> {
  if (!childId || childId.trim().length === 0) {
    throw new Error('childId is required')
  }
  if (!jurisdiction || jurisdiction.trim().length === 0) {
    throw new Error('jurisdiction is required')
  }

  // 1. Create the basic signal (uses familyId='ISOLATED' to indicate isolation)
  // CRITICAL: We use 'ISOLATED' as placeholder - signal is NOT stored under family
  const signal = createSignal(childId, 'ISOLATED', triggerMethod, platform, isOffline, deviceId)

  // Store in local memory for queue processing
  signalStore.push(signal)

  // If offline, queue for later delivery
  if (isOffline) {
    queueOfflineSignal(signal)
  }

  // 2. Generate isolated encryption key
  // AC2: Key is separate from family key
  const _encryptionKey = await generateSignalEncryptionKey(signal.id)

  // 3. Encrypt signal payload with isolated key
  // AC2: Family encryption key CANNOT decrypt this data
  const signalPayload = {
    childId,
    platform,
    triggerMethod,
    deviceId,
    triggeredAt: signal.triggeredAt.toISOString(),
    status: signal.status,
  }
  const { encryptedData, keyId } = await encryptSignalData(signal.id, signalPayload)

  // 4. Store in ISOLATED collection (NOT family hierarchy)
  // AC1: Collection is at ROOT level, NOT under families/
  const isolatedSignal = await storeIsolatedSignal(
    signal.id,
    childId,
    encryptedData,
    keyId,
    jurisdiction
  )

  // 5. Create retention status for legal compliance
  // AC6: Signals retained per jurisdiction-specific rules
  await createRetentionStatus(signal.id, jurisdiction)

  // 6. Do NOT create any family-visible audit entries
  // AC4: Signal excluded from family audit trail
  // (No audit logging to family collections)

  // ============================================
  // Story 7.5.7: 48-Hour Blackout Integration
  // ============================================

  // 7. Create 48-hour blackout
  // AC1: No family notifications during blackout
  const blackout = await createBlackout(signal.id, childId)

  // 8. Create notification suppression for blackout period
  // AC1: All notification channels are blocked
  const suppression = await createSuppression(signal.id, childId, blackout.expiresAt)

  // 9. Start gap filling for activity
  // AC2, AC3: Fill monitoring gaps with synthetic normal activity
  const now = new Date()
  await fillActivityGap(childId, now, blackout.expiresAt)

  // 10. Create privacy gap for post-blackout masking
  // AC5: Privacy gaps applied after blackout ends
  const privacyGap = await createSignalPrivacyGap(signal.id, childId, now, blackout.expiresAt)

  return {
    signal,
    isolatedSignal,
    encryptionKeyId: keyId,
    blackoutId: blackout.id,
    suppressionId: suppression.id,
    privacyGapId: privacyGap.id,
  }
}

// ============================================
// Testing Utilities
// ============================================

/**
 * Clear all signal data (for testing).
 */
export function clearAllSignalData(): void {
  signalStore.length = 0
  offlineQueue.length = 0
}

/**
 * Get total signal count (for testing).
 */
export function getSignalCount(): number {
  return signalStore.length
}

/**
 * Get offline queue size (for testing).
 */
export function getOfflineQueueSize(): number {
  return offlineQueue.length
}
