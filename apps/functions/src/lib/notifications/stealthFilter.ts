/**
 * Stealth Notification Filter.
 *
 * Story 0.5.7: 72-Hour Notification Stealth
 *
 * Determines whether a notification should be suppressed based on
 * the family's stealth window status and the notification type.
 *
 * CRITICAL SAFETY REQUIREMENTS:
 * - Critical safety notifications MUST bypass stealth
 * - Only affected users have notifications suppressed
 * - Non-escaped family members receive notifications normally
 */

import { getFirestore, Timestamp } from 'firebase-admin/firestore'
import { CRITICAL_NOTIFICATION_TYPES } from '@fledgely/shared'

const db = getFirestore()

/**
 * Determine if a notification should be suppressed.
 *
 * Story 0.5.7: AC1, AC4, AC5
 * - Returns false for critical safety notifications (AC4)
 * - Returns true for abuser-targeted notifications during stealth (AC1)
 * - Returns false for non-escaped family member notifications (AC5)
 *
 * @param familyId - The family ID
 * @param notificationType - The type of notification
 * @param targetUserId - The user who would receive the notification
 * @returns True if notification should be suppressed
 */
export async function shouldSuppressNotification(
  familyId: string,
  notificationType: string,
  targetUserId: string
): Promise<boolean> {
  // Critical safety notifications NEVER suppressed (AC4)
  if (isCriticalNotification(notificationType)) {
    return false
  }

  const familyRef = db.collection('families').doc(familyId)
  const familySnap = await familyRef.get()

  if (!familySnap.exists) return false

  const data = familySnap.data()
  if (!data?.stealthActive) return false

  // Check if still in stealth window
  const now = Timestamp.now()
  const end = data.stealthWindowEnd as Timestamp
  if (!end || now.toMillis() > end.toMillis()) return false

  // Check if target user is in affected list (AC5)
  const affectedUserIds: string[] = data.stealthAffectedUserIds || []
  return affectedUserIds.includes(targetUserId)
}

/**
 * Check if a notification type is critical and bypasses stealth.
 *
 * Story 0.5.7: AC4 - Critical notifications not suppressed
 *
 * @param notificationType - The notification type to check
 * @returns True if this is a critical notification that bypasses stealth
 */
export function isCriticalNotification(notificationType: string): boolean {
  return (CRITICAL_NOTIFICATION_TYPES as readonly string[]).includes(notificationType)
}

/**
 * Get the stealth window status for a family.
 *
 * @param familyId - The family ID
 * @returns Stealth window details or null if not in stealth
 */
export async function getStealthStatus(familyId: string): Promise<{
  active: boolean
  windowStart: Date | null
  windowEnd: Date | null
  affectedUserIds: string[]
} | null> {
  const familyRef = db.collection('families').doc(familyId)
  const familySnap = await familyRef.get()

  if (!familySnap.exists) return null

  const data = familySnap.data()
  if (!data?.stealthActive) {
    return {
      active: false,
      windowStart: null,
      windowEnd: null,
      affectedUserIds: [],
    }
  }

  const now = Timestamp.now()
  const end = data.stealthWindowEnd as Timestamp

  // Check if window has expired
  const isExpired = end && now.toMillis() > end.toMillis()

  return {
    active: !isExpired,
    windowStart: data.stealthWindowStart?.toDate() || null,
    windowEnd: end?.toDate() || null,
    affectedUserIds: data.stealthAffectedUserIds || [],
  }
}
