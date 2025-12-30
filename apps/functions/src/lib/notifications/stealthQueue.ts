/**
 * Stealth Queue Management.
 *
 * Story 0.5.7: 72-Hour Notification Stealth
 *
 * Manages the sealed stealth queue for holding suppressed notifications.
 * Notifications captured here are NOT delivered during the 72-hour window.
 *
 * CRITICAL SECURITY:
 * - Stealth queue entries are NEVER visible to family members
 * - All operations logged to admin audit only
 * - Firestore security rules must block family access
 */

import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore'
import { STEALTH_DURATION_MS } from '@fledgely/shared'

const db = getFirestore()

/**
 * Notification payload structure for stealth queue.
 */
export interface NotificationPayload {
  type: string
  title?: string
  body?: string
  data?: Record<string, unknown>
}

/**
 * Options for capturing a notification to the stealth queue.
 */
export interface CaptureNotificationOptions {
  familyId: string
  notificationType: string
  targetUserId: string
  notificationPayload: NotificationPayload
  ticketId: string
}

/**
 * Capture a notification to the stealth queue.
 *
 * Story 0.5.7: AC1 - Notification capture and hold
 * Notifications are held in the sealed stealth queue and NOT delivered.
 *
 * @param options - The notification capture options
 * @returns The created stealth queue entry ID
 */
export async function captureNotification(options: CaptureNotificationOptions): Promise<string> {
  const { familyId, notificationType, targetUserId, notificationPayload, ticketId } = options

  const now = Timestamp.now()
  const expiresAt = Timestamp.fromMillis(now.toMillis() + STEALTH_DURATION_MS)

  const entryRef = db.collection('stealthQueueEntries').doc()

  const entry = {
    id: entryRef.id,
    familyId,
    notificationType,
    targetUserId,
    notificationPayload,
    capturedAt: now,
    expiresAt,
    ticketId,
    createdAt: FieldValue.serverTimestamp(),
  }

  await entryRef.set(entry)

  return entryRef.id
}

/**
 * Check if a family is currently in a stealth window.
 *
 * Story 0.5.7: AC1, AC6 - Check stealth status
 *
 * @param familyId - The family ID to check
 * @returns True if stealth is active and window has not expired
 */
export async function isInStealthWindow(familyId: string): Promise<boolean> {
  const familyRef = db.collection('families').doc(familyId)
  const familySnap = await familyRef.get()

  if (!familySnap.exists) return false

  const data = familySnap.data()
  if (!data?.stealthActive) return false

  // Check if still in stealth window
  const now = Timestamp.now()
  const end = data.stealthWindowEnd as Timestamp
  if (!end) return false

  return now.toMillis() <= end.toMillis()
}

/**
 * Get affected user IDs for a family's stealth window.
 *
 * Story 0.5.7: AC5 - Check which users are affected
 *
 * @param familyId - The family ID to check
 * @returns Array of affected user IDs, or empty array if not in stealth
 */
export async function getStealthAffectedUsers(familyId: string): Promise<string[]> {
  const familyRef = db.collection('families').doc(familyId)
  const familySnap = await familyRef.get()

  if (!familySnap.exists) return []

  const data = familySnap.data()
  if (!data?.stealthActive) return []

  return data.stealthAffectedUserIds || []
}

/**
 * Delete expired stealth queue entries for a family.
 *
 * Story 0.5.7: AC2 - Automatic deletion after 72 hours
 *
 * @param familyId - The family ID to clean up
 * @returns Number of entries deleted
 */
export async function deleteExpiredEntries(familyId: string): Promise<number> {
  const now = Timestamp.now()

  const expiredQuery = db
    .collection('stealthQueueEntries')
    .where('familyId', '==', familyId)
    .where('expiresAt', '<=', now)

  const snapshot = await expiredQuery.get()

  if (snapshot.empty) return 0

  const batch = db.batch()
  snapshot.docs.forEach((doc) => {
    batch.delete(doc.ref)
  })
  await batch.commit()

  return snapshot.size
}

/**
 * Delete all stealth queue entries for a family.
 *
 * Used during cleanup when stealth window expires.
 *
 * @param familyId - The family ID to clean up
 * @returns Number of entries deleted
 */
export async function deleteAllEntriesForFamily(familyId: string): Promise<number> {
  const query = db.collection('stealthQueueEntries').where('familyId', '==', familyId)

  const snapshot = await query.get()

  if (snapshot.empty) return 0

  const batch = db.batch()
  snapshot.docs.forEach((doc) => {
    batch.delete(doc.ref)
  })
  await batch.commit()

  return snapshot.size
}
