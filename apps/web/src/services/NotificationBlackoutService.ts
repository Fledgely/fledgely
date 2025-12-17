'use client'

/**
 * NotificationBlackoutService
 *
 * Story 7.5.2: External Signal Routing - Task 6
 *
 * Manages 48-hour notification blackouts for families after safety signal routing.
 * During blackout, all family notifications are suppressed to protect the child.
 *
 * CRITICAL SAFETY REQUIREMENTS:
 * - Blackout records stored in isolated collection (not family-accessible)
 * - No UI behavioral changes during blackout (stealth mode)
 * - Audit trail entries suppressed during blackout
 * - Normal operation appears unchanged to family
 *
 * CRITICAL INVARIANT (INV-002): Safety signals NEVER visible to family.
 */

import {
  doc,
  collection,
  setDoc,
  getDocs,
  query,
  where,
  updateDoc,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import {
  type SignalBlackout,
  type BlackoutStatus,
  EXTERNAL_ROUTING_CONSTANTS,
  createBlackout,
} from '@fledgely/contracts'

// ============================================================================
// Types
// ============================================================================

/**
 * Result of blackout check
 */
export interface BlackoutCheckResult {
  /** Whether blackout is active */
  isBlocked: boolean
  /** Remaining time in milliseconds (if blocked) */
  remainingMs: number | null
  /** When blackout expires (if blocked) */
  expiresAt: string | null
}

/**
 * Options for creating a blackout
 */
export interface CreateBlackoutOptions {
  /** Child ID to blackout */
  childId: string
  /** Signal ID that triggered blackout */
  signalId: string
  /** Custom duration in milliseconds (default: 48 hours) */
  durationMs?: number
}

/**
 * Notification types that can be intercepted
 */
export type InterceptableNotificationType =
  | 'agreement_activated'
  | 'agreement_archived'
  | 'family_member_joined'
  | 'family_member_left'
  | 'custody_declared'
  | 'child_profile_updated'
  | 'general'

/**
 * Parameters for notification interception check
 */
export interface NotificationInterceptParams {
  /** Type of notification being sent */
  type: InterceptableNotificationType
  /** Child ID related to notification (if any) */
  childId?: string
  /** Family ID related to notification */
  familyId: string
  /** User IDs who would receive notification */
  recipientUserIds: string[]
}

/**
 * Result of notification interception
 */
export interface NotificationInterceptResult {
  /** Whether notification should proceed */
  shouldProceed: boolean
  /** Which recipients should NOT receive notification (blackout active) */
  blockedRecipients: string[]
  /** Which recipients should receive notification */
  allowedRecipients: string[]
  /** Reason for blocking (if any) - INTERNAL ONLY */
  internalReason: string | null
}

/**
 * Service dependencies (for testing)
 */
export interface BlackoutServiceDependencies {
  /** Current time provider */
  now: () => Date
  /** Generate unique IDs */
  generateId: () => string
}

// ============================================================================
// Default Dependencies
// ============================================================================

const createDefaultDependencies = (): BlackoutServiceDependencies => ({
  now: () => new Date(),
  generateId: () => `blackout_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
})

// ============================================================================
// NotificationBlackoutService
// ============================================================================

/**
 * Service for managing notification blackouts
 *
 * Blackouts prevent family notifications for 48 hours after a safety signal
 * is routed to an external crisis partner. This protects the child by ensuring
 * the family has no indication that a signal was sent.
 *
 * @example
 * ```ts
 * const blackoutService = new NotificationBlackoutService()
 *
 * // Check if notifications are blocked for a child
 * const result = await blackoutService.isBlackoutActive('child_123')
 * if (result.isBlocked) {
 *   // Don't send notification
 * }
 *
 * // Intercept notification before sending
 * const intercept = await blackoutService.interceptNotification({
 *   type: 'agreement_activated',
 *   familyId: 'family_123',
 *   recipientUserIds: ['parent_1', 'parent_2'],
 * })
 * if (!intercept.shouldProceed) {
 *   // Notification suppressed
 * }
 * ```
 */
export class NotificationBlackoutService {
  private readonly deps: BlackoutServiceDependencies
  private readonly collectionName = EXTERNAL_ROUTING_CONSTANTS.BLACKOUT_COLLECTION

  constructor(dependencies?: Partial<BlackoutServiceDependencies>) {
    this.deps = {
      ...createDefaultDependencies(),
      ...dependencies,
    }
  }

  /**
   * Check if blackout is currently active for a child
   *
   * @param childId - Child to check
   * @returns Blackout check result
   */
  async isBlackoutActive(childId: string): Promise<BlackoutCheckResult> {
    try {
      const now = this.deps.now()
      const nowMs = now.getTime()

      // Query for active blackouts for this child
      const blackoutsRef = collection(db, this.collectionName)
      const q = query(
        blackoutsRef,
        where('childId', '==', childId),
        where('status', '==', 'active')
      )

      const snapshot = await getDocs(q)

      if (snapshot.empty) {
        return {
          isBlocked: false,
          remainingMs: null,
          expiresAt: null,
        }
      }

      // Find the blackout with the latest expiration
      let latestExpiresAt: Date | null = null
      let activeBlackoutId: string | null = null

      snapshot.docs.forEach((docSnap) => {
        const data = docSnap.data()
        // Handle both Firestore Timestamp and Date/string
        const expiresAt = data.expiresAt && typeof data.expiresAt.toDate === 'function'
          ? data.expiresAt.toDate()
          : new Date(data.expiresAt)

        if (expiresAt.getTime() > nowMs) {
          if (!latestExpiresAt || expiresAt > latestExpiresAt) {
            latestExpiresAt = expiresAt
            activeBlackoutId = docSnap.id
          }
        }
      })

      if (!latestExpiresAt) {
        // All blackouts have expired, mark them
        await this.markExpiredBlackouts(childId)
        return {
          isBlocked: false,
          remainingMs: null,
          expiresAt: null,
        }
      }

      return {
        isBlocked: true,
        remainingMs: latestExpiresAt.getTime() - nowMs,
        expiresAt: latestExpiresAt.toISOString(),
      }
    } catch (error) {
      // Log error but don't expose to caller
      console.error('[NotificationBlackoutService] isBlackoutActive error:', error)
      // On error, err on side of caution - assume no blackout to avoid blocking legitimate notifications
      return {
        isBlocked: false,
        remainingMs: null,
        expiresAt: null,
      }
    }
  }

  /**
   * Create a new blackout for a child
   *
   * @param options - Blackout creation options
   * @returns Created blackout record
   */
  async createBlackout(options: CreateBlackoutOptions): Promise<SignalBlackout> {
    const { childId, signalId, durationMs = EXTERNAL_ROUTING_CONSTANTS.DEFAULT_BLACKOUT_MS } = options
    const now = this.deps.now()

    // Create blackout using contract helper
    const blackout = createBlackout(childId, signalId, durationMs)
    const id = this.deps.generateId()

    // Build Firestore document
    const blackoutDoc = {
      id,
      childId: blackout.childId,
      signalId: blackout.signalId,
      status: blackout.status,
      startedAt: now,
      expiresAt: new Date(now.getTime() + durationMs),
      extendedCount: blackout.extendedCount,
    }

    // Save to isolated collection
    const docRef = doc(db, this.collectionName, id)
    await setDoc(docRef, blackoutDoc)

    return {
      ...blackout,
      id,
    }
  }

  /**
   * Extend an existing blackout
   *
   * @param childId - Child whose blackout to extend
   * @param additionalMs - Additional time in milliseconds
   * @returns Whether extension was successful
   */
  async extendBlackout(childId: string, additionalMs: number): Promise<boolean> {
    try {
      const now = this.deps.now()
      const nowMs = now.getTime()

      // Find active blackout
      const blackoutsRef = collection(db, this.collectionName)
      const q = query(
        blackoutsRef,
        where('childId', '==', childId),
        where('status', '==', 'active')
      )

      const snapshot = await getDocs(q)

      if (snapshot.empty) {
        return false
      }

      // Extend the first active blackout found
      const docSnap = snapshot.docs[0]
      const data = docSnap.data()
      // Handle both Firestore Timestamp and Date/string
      const currentExpiresAt = data.expiresAt && typeof data.expiresAt.toDate === 'function'
        ? data.expiresAt.toDate()
        : new Date(data.expiresAt)

      // Only extend if not already expired
      if (currentExpiresAt.getTime() <= nowMs) {
        return false
      }

      const newExpiresAt = new Date(currentExpiresAt.getTime() + additionalMs)
      const currentExtendedCount = data.extendedCount || 0

      await updateDoc(docSnap.ref, {
        expiresAt: newExpiresAt,
        status: 'extended' as BlackoutStatus,
        extendedCount: currentExtendedCount + 1,
      })

      return true
    } catch (error) {
      console.error('[NotificationBlackoutService] extendBlackout error:', error)
      return false
    }
  }

  /**
   * Intercept a notification and determine if it should proceed
   *
   * CRITICAL: This method checks all relevant blackouts and determines
   * which recipients (if any) should receive the notification.
   *
   * @param params - Notification interception parameters
   * @returns Interception result
   */
  async interceptNotification(params: NotificationInterceptParams): Promise<NotificationInterceptResult> {
    const { childId, recipientUserIds } = params

    // If no child ID, notification is not child-related - allow
    if (!childId) {
      return {
        shouldProceed: true,
        blockedRecipients: [],
        allowedRecipients: recipientUserIds,
        internalReason: null,
      }
    }

    // Check if blackout is active for this child
    const blackoutResult = await this.isBlackoutActive(childId)

    if (!blackoutResult.isBlocked) {
      return {
        shouldProceed: true,
        blockedRecipients: [],
        allowedRecipients: recipientUserIds,
        internalReason: null,
      }
    }

    // Blackout is active - block all family notifications
    // CRITICAL: Do not reveal the reason to any family-facing service
    return {
      shouldProceed: false,
      blockedRecipients: recipientUserIds,
      allowedRecipients: [],
      internalReason: `Blackout active until ${blackoutResult.expiresAt}`,
    }
  }

  /**
   * Check if an audit entry should be suppressed
   *
   * During blackout, certain audit entries that could reveal safety signal
   * activity should be suppressed from the family-visible audit trail.
   *
   * @param childId - Child related to audit entry
   * @param auditType - Type of audit action
   * @returns Whether audit should be suppressed
   */
  async shouldSuppressAudit(childId: string, auditType: string): Promise<boolean> {
    // Always suppress safety-related audits during blackout
    const safetyRelatedAudits = [
      'safety_signal_sent',
      'signal_routed',
      'partner_notified',
      'blackout_started',
      'blackout_extended',
    ]

    if (!safetyRelatedAudits.includes(auditType)) {
      return false
    }

    const blackoutResult = await this.isBlackoutActive(childId)
    return blackoutResult.isBlocked
  }

  /**
   * Get remaining blackout time for a child (internal use only)
   *
   * @param childId - Child to check
   * @returns Remaining milliseconds, or null if no active blackout
   */
  async getRemainingBlackoutTime(childId: string): Promise<number | null> {
    const result = await this.isBlackoutActive(childId)
    return result.remainingMs
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  /**
   * Mark expired blackouts as expired
   *
   * @param childId - Child whose blackouts to update
   */
  private async markExpiredBlackouts(childId: string): Promise<void> {
    try {
      const now = this.deps.now()
      const blackoutsRef = collection(db, this.collectionName)
      const q = query(
        blackoutsRef,
        where('childId', '==', childId),
        where('status', 'in', ['active', 'extended'])
      )

      const snapshot = await getDocs(q)

      const updates = snapshot.docs
        .filter((docSnap) => {
          const data = docSnap.data()
          // Handle both Firestore Timestamp and Date/string
          const expiresAt = data.expiresAt && typeof data.expiresAt.toDate === 'function'
            ? data.expiresAt.toDate()
            : new Date(data.expiresAt)
          return expiresAt.getTime() <= now.getTime()
        })
        .map((docSnap) =>
          updateDoc(docSnap.ref, { status: 'expired' as BlackoutStatus })
        )

      await Promise.all(updates)
    } catch (error) {
      // Log but don't throw - this is a cleanup operation
      console.error('[NotificationBlackoutService] markExpiredBlackouts error:', error)
    }
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let instance: NotificationBlackoutService | null = null

/**
 * Get the singleton blackout service instance
 */
export function getNotificationBlackoutService(
  dependencies?: Partial<BlackoutServiceDependencies>
): NotificationBlackoutService {
  if (!instance) {
    instance = new NotificationBlackoutService(dependencies)
  }
  return instance
}

/**
 * Reset the singleton instance (for testing)
 */
export function resetNotificationBlackoutService(): void {
  instance = null
}

// ============================================================================
// Notification Wrapper Functions
// ============================================================================

/**
 * Wrap a notification function with blackout checking
 *
 * Use this to wrap existing notification functions to add blackout support.
 *
 * @example
 * ```ts
 * const safeNotifyActivation = withBlackoutCheck(
 *   notifyAgreementActivation,
 *   (params) => params.childId,
 *   (params) => params.recipientUserIds
 * )
 *
 * // Now notifications will be suppressed during blackout
 * await safeNotifyActivation(params)
 * ```
 */
export function withBlackoutCheck<TParams extends object>(
  notificationFn: (params: TParams) => Promise<void>,
  getChildId: (params: TParams) => string | undefined,
  getRecipientIds: (params: TParams) => string[]
): (params: TParams) => Promise<{ sent: boolean; blockedCount: number }> {
  return async (params: TParams) => {
    const service = getNotificationBlackoutService()
    const childId = getChildId(params)
    const recipientIds = getRecipientIds(params)

    // Check blackout if child ID is available
    if (childId) {
      const blackoutResult = await service.isBlackoutActive(childId)
      if (blackoutResult.isBlocked) {
        // Silently suppress notification
        return { sent: false, blockedCount: recipientIds.length }
      }
    }

    // No blackout - proceed with notification
    await notificationFn(params)
    return { sent: true, blockedCount: 0 }
  }
}

/**
 * Check blackout before sending notification (standalone function)
 *
 * Use when you need more control over the notification flow.
 *
 * @param childId - Child to check
 * @returns Whether notification can proceed
 */
export async function canSendNotification(childId: string): Promise<boolean> {
  const service = getNotificationBlackoutService()
  const result = await service.isBlackoutActive(childId)
  return !result.isBlocked
}
