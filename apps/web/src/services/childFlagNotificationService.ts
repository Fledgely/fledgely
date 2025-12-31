/**
 * Child Flag Notification Service - Story 23.1
 *
 * Service for notifying children when their content is flagged.
 * Handles distress suppression check, timer management, and notification delivery.
 */

import { doc, updateDoc, getDoc } from 'firebase/firestore'
import { getFirestoreDb } from '../lib/firebase'
import type { FlagDocument, ChildNotificationStatus } from '@fledgely/shared'
import { ANNOTATION_WINDOW_MS } from '@fledgely/shared'

/**
 * Result of attempting to notify a child about a flag
 */
export interface NotifyChildResult {
  /** Whether the notification was sent successfully */
  notified: boolean
  /** Reason if notification was not sent */
  reason?: 'distress_suppression' | 'already_notified' | 'flag_not_found' | 'error'
  /** The annotation deadline timestamp (if notified) */
  annotationDeadline?: number
}

/**
 * Parameters for notifying a child about a flag
 */
export interface NotifyChildParams {
  flagId: string
  childId: string
}

/**
 * Check if a flag is under distress suppression
 * Story 23.1 - AC #6: Distress-suppressed flags should NOT notify child
 */
export function isDistressSuppressed(flag: FlagDocument): boolean {
  return flag.status === 'sensitive_hold' && !!flag.suppressionReason
}

/**
 * Calculate the annotation deadline based on current time
 * Story 23.1 - AC #5: Child has 30 minutes to respond
 */
export function calculateAnnotationDeadline(fromTimestamp?: number): number {
  const now = fromTimestamp ?? Date.now()
  return now + ANNOTATION_WINDOW_MS
}

/**
 * Get remaining time until annotation deadline
 * Returns 0 if deadline has passed
 */
export function getRemainingTime(annotationDeadline: number): number {
  const remaining = annotationDeadline - Date.now()
  return Math.max(0, remaining)
}

/**
 * Format remaining time as human-readable string
 * Story 23.1 - AC #5: Timer visible: "25 minutes to add your explanation"
 */
export function formatRemainingTime(remainingMs: number): string {
  if (remainingMs <= 0) return 'Time expired'

  const remainingMinutes = Math.ceil(remainingMs / 60000)

  if (remainingMinutes === 1) {
    return '1 minute to add your explanation'
  }

  return `${remainingMinutes} minutes to add your explanation`
}

/**
 * Get a flag document by ID
 */
async function getFlag(flagId: string, childId: string): Promise<FlagDocument | null> {
  try {
    const db = getFirestoreDb()
    const flagRef = doc(db, 'children', childId, 'flags', flagId)
    const flagSnap = await getDoc(flagRef)

    if (!flagSnap.exists()) {
      return null
    }

    return flagSnap.data() as FlagDocument
  } catch {
    return null
  }
}

/**
 * Update flag with child notification status
 */
async function updateFlagNotificationStatus(
  flagId: string,
  childId: string,
  status: ChildNotificationStatus,
  annotationDeadline?: number
): Promise<void> {
  const db = getFirestoreDb()
  const flagRef = doc(db, 'children', childId, 'flags', flagId)

  const updateData: Record<string, unknown> = {
    childNotificationStatus: status,
  }

  if (status === 'notified') {
    updateData.childNotifiedAt = Date.now()
    updateData.annotationDeadline = annotationDeadline
  }

  await updateDoc(flagRef, updateData)
}

/**
 * Notify child about a flagged content
 * Story 23.1 - AC #1, #4, #6
 *
 * This function:
 * 1. Checks if flag exists
 * 2. Checks if flag is under distress suppression (AC #6)
 * 3. Checks if child was already notified
 * 4. Sets childNotifiedAt and annotationDeadline
 * 5. Updates childNotificationStatus to 'notified'
 *
 * Note: Push notification delivery is handled by Cloud Functions (Task 6)
 * This service handles the client-side state updates.
 */
export async function notifyChildOfFlag({
  flagId,
  childId,
}: NotifyChildParams): Promise<NotifyChildResult> {
  try {
    // Get the flag document
    const flag = await getFlag(flagId, childId)

    if (!flag) {
      return { notified: false, reason: 'flag_not_found' }
    }

    // AC #6: Check for distress suppression
    if (isDistressSuppressed(flag)) {
      // Mark as skipped due to distress suppression
      await updateFlagNotificationStatus(flagId, childId, 'skipped')
      return { notified: false, reason: 'distress_suppression' }
    }

    // Check if already notified
    if (flag.childNotificationStatus === 'notified') {
      return {
        notified: false,
        reason: 'already_notified',
        annotationDeadline: flag.annotationDeadline,
      }
    }

    // Calculate annotation deadline (30 minutes from now)
    const annotationDeadline = calculateAnnotationDeadline()

    // Update flag with notification status
    await updateFlagNotificationStatus(flagId, childId, 'notified', annotationDeadline)

    return {
      notified: true,
      annotationDeadline,
    }
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(`Error notifying child about flag ${flagId}:`, error)
    return { notified: false, reason: 'error' }
  }
}

/**
 * Mark a flag's child notification as skipped
 * Used when child notification should be bypassed for any reason
 */
export async function skipChildNotification(flagId: string, childId: string): Promise<void> {
  await updateFlagNotificationStatus(flagId, childId, 'skipped')
}

/**
 * Check if a flag is waiting for child annotation
 * Returns true if child was notified and deadline hasn't passed
 */
export function isWaitingForAnnotation(flag: FlagDocument): boolean {
  if (flag.childNotificationStatus !== 'notified') {
    return false
  }

  if (!flag.annotationDeadline) {
    return false
  }

  return flag.annotationDeadline > Date.now()
}

/**
 * Check if annotation window has expired for a flag
 */
export function hasAnnotationWindowExpired(flag: FlagDocument): boolean {
  if (flag.childNotificationStatus !== 'notified') {
    return false
  }

  if (!flag.annotationDeadline) {
    return false
  }

  return flag.annotationDeadline <= Date.now()
}
