/**
 * Access Notification Service
 *
 * Story 27.6: Real-Time Access Notifications
 *
 * Handles real-time notifications when family data is accessed.
 * Supports:
 * - Immediate notifications for real-time access alerts
 * - Digest notifications for daily summaries
 * - Quiet hours respect
 * - Child-specific notification preferences
 */

import { getFirestore, Firestore } from 'firebase-admin/firestore'
import * as logger from 'firebase-functions/logger'
import type {
  NotificationPreferences,
  AuditEvent,
  AccessNotification,
  AuditResourceType,
} from '@fledgely/shared'
import { DEFAULT_NOTIFICATION_PREFERENCES } from '@fledgely/shared'

// Lazy initialization for Firestore
let db: Firestore | null = null
function getDb(): Firestore {
  if (!db) {
    db = getFirestore()
  }
  return db
}

/**
 * Get notification preferences for a user.
 * Returns default preferences if none are set.
 */
export async function getNotificationPreferences(
  userUid: string
): Promise<NotificationPreferences> {
  const db = getDb()

  try {
    const prefsDoc = await db
      .collection('users')
      .doc(userUid)
      .collection('settings')
      .doc('notifications')
      .get()

    if (!prefsDoc.exists) {
      return DEFAULT_NOTIFICATION_PREFERENCES
    }

    const data = prefsDoc.data()
    return {
      accessNotificationsEnabled: data?.accessNotificationsEnabled ?? false,
      accessDigestEnabled: data?.accessDigestEnabled ?? false,
      quietHoursStart: data?.quietHoursStart ?? null,
      quietHoursEnd: data?.quietHoursEnd ?? null,
      notifyOnChildDataAccess: data?.notifyOnChildDataAccess ?? false,
      notifyOnOwnDataAccess: data?.notifyOnOwnDataAccess ?? false,
      updatedAt: data?.updatedAt,
    }
  } catch (error) {
    logger.warn('Failed to get notification preferences', { userUid, error })
    return DEFAULT_NOTIFICATION_PREFERENCES
  }
}

/**
 * Update notification preferences for a user.
 */
export async function updateNotificationPreferences(
  userUid: string,
  preferences: Partial<NotificationPreferences>
): Promise<void> {
  const db = getDb()

  await db
    .collection('users')
    .doc(userUid)
    .collection('settings')
    .doc('notifications')
    .set(
      {
        ...preferences,
        updatedAt: Date.now(),
      },
      { merge: true }
    )

  logger.info('Updated notification preferences', { userUid })
}

/**
 * Check if current time is within quiet hours.
 */
export function isQuietHours(prefs: NotificationPreferences): boolean {
  if (!prefs.quietHoursStart || !prefs.quietHoursEnd) {
    return false
  }

  const now = new Date()
  const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`

  // Handle overnight quiet hours (e.g., 22:00-07:00)
  if (prefs.quietHoursStart > prefs.quietHoursEnd) {
    return currentTime >= prefs.quietHoursStart || currentTime < prefs.quietHoursEnd
  }

  return currentTime >= prefs.quietHoursStart && currentTime < prefs.quietHoursEnd
}

/**
 * Get actor display name from user document.
 */
async function getActorDisplayName(actorUid: string): Promise<string> {
  const db = getDb()

  try {
    const userDoc = await db.collection('users').doc(actorUid).get()
    if (userDoc.exists) {
      return userDoc.data()?.displayName || userDoc.data()?.email || 'Someone'
    }
  } catch {
    // Fallback
  }

  return 'Someone'
}

/**
 * Get child name from child document.
 */
async function getChildName(childId: string | null): Promise<string | null> {
  if (!childId) return null

  const db = getDb()

  try {
    const childDoc = await db.collection('children').doc(childId).get()
    if (childDoc.exists) {
      return childDoc.data()?.name || null
    }
  } catch {
    // Fallback
  }

  return null
}

/**
 * Format resource type for notification message.
 */
function formatResourceType(resourceType: AuditResourceType): string {
  const mapping: Record<string, string> = {
    screenshots: 'screenshots',
    screenshot_detail: 'a screenshot',
    child_profile: 'profile',
    children_list: 'children list',
    flags: 'flagged content',
    flag_detail: 'a flag',
    devices: 'devices',
    device_detail: 'a device',
    agreements: 'agreements',
    activity: 'activity',
    dashboard_access: 'dashboard',
  }

  return mapping[resourceType] || resourceType.replace(/_/g, ' ')
}

/**
 * Generate notification message.
 *
 * Example: "John just viewed Emma's screenshots"
 */
export function generateNotificationMessage(
  actorName: string,
  resourceType: AuditResourceType,
  childName: string | null
): string {
  const resource = formatResourceType(resourceType)

  if (childName) {
    return `${actorName} just viewed ${childName}'s ${resource}`
  }

  return `${actorName} just viewed ${resource}`
}

/**
 * Determine who should be notified for an audit event.
 *
 * Returns list of user UIDs that should receive notifications.
 */
export async function getNotificationRecipients(event: AuditEvent): Promise<string[]> {
  const db = getDb()
  const recipients: string[] = []

  // Get family data
  const familyDoc = await db.collection('families').doc(event.familyId).get()
  if (!familyDoc.exists) return []

  const familyData = familyDoc.data()
  const guardianUids: string[] = familyData?.guardianUids || []
  const childUids: string[] = familyData?.childUids || []

  // Check each guardian (except the actor)
  for (const guardianUid of guardianUids) {
    if (guardianUid === event.actorUid) continue

    const prefs = await getNotificationPreferences(guardianUid)

    // Check if parent wants notifications for child data access
    if (prefs.notifyOnChildDataAccess && event.childId) {
      recipients.push(guardianUid)
    }
  }

  // Check if child wants notifications when their data is accessed
  if (event.childId && childUids.includes(event.childId)) {
    // Actor is not the child themselves
    if (event.actorUid !== event.childId) {
      const prefs = await getNotificationPreferences(event.childId)

      if (prefs.notifyOnOwnDataAccess) {
        recipients.push(event.childId)
      }
    }
  }

  return recipients
}

/**
 * Process an audit event and create notifications if needed.
 *
 * This is called after an audit event is created.
 */
export async function processAuditEventForNotifications(event: AuditEvent): Promise<void> {
  const db = getDb()

  // Skip notification for certain resource types that are not user-facing access
  const skipResourceTypes: AuditResourceType[] = [
    'audit_log_view',
    'audit_export',
    'dashboard_access',
    'settings_modify',
    'profile_modify',
  ]

  if (skipResourceTypes.includes(event.resourceType)) {
    return
  }

  // Get recipients
  const recipients = await getNotificationRecipients(event)

  if (recipients.length === 0) {
    return
  }

  // Get actor and child names
  const actorName = await getActorDisplayName(event.actorUid)
  const childName = await getChildName(event.childId)

  // Generate message
  const message = generateNotificationMessage(actorName, event.resourceType, childName)

  // Create notification for each recipient
  for (const recipientUid of recipients) {
    const prefs = await getNotificationPreferences(recipientUid)

    // Determine notification type based on quiet hours and preferences
    let notificationType: 'immediate' | 'digest' = 'immediate'

    if (prefs.accessDigestEnabled && !prefs.accessNotificationsEnabled) {
      notificationType = 'digest'
    } else if (prefs.accessNotificationsEnabled && isQuietHours(prefs)) {
      // During quiet hours, queue for digest instead
      notificationType = 'digest'
    } else if (!prefs.accessNotificationsEnabled && !prefs.accessDigestEnabled) {
      // User has no notifications enabled, skip
      continue
    }

    // Create notification document
    const notificationRef = db.collection('accessNotifications').doc()
    const notification: AccessNotification = {
      id: notificationRef.id,
      recipientUid,
      auditEventId: event.id,
      actorUid: event.actorUid,
      actorDisplayName: actorName,
      resourceType: event.resourceType,
      childId: event.childId,
      childName,
      message,
      accessTimestamp: event.timestamp,
      createdAt: Date.now(),
      sent: false,
      notificationType,
    }

    await notificationRef.set(notification)

    logger.info('Created access notification', {
      notificationId: notification.id,
      recipientUid,
      notificationType,
    })

    // If immediate notification, send now
    if (notificationType === 'immediate') {
      await sendImmediateNotification(notification)
    }
  }
}

/**
 * Send an immediate notification.
 *
 * Uses Firebase Cloud Messaging if FCM token is available,
 * otherwise marks as sent (user will see in-app).
 */
async function sendImmediateNotification(notification: AccessNotification): Promise<void> {
  const db = getDb()

  try {
    // Get user's FCM token
    const userDoc = await db.collection('users').doc(notification.recipientUid).get()
    const fcmToken = userDoc.data()?.fcmToken

    if (fcmToken) {
      // TODO: Implement FCM push notification
      // For now, just log that we would send
      logger.info('Would send FCM notification', {
        notificationId: notification.id,
        recipientUid: notification.recipientUid,
      })
    }

    // Mark notification as sent
    await db.collection('accessNotifications').doc(notification.id).update({
      sent: true,
      sentAt: Date.now(),
    })
  } catch (error) {
    logger.error('Failed to send immediate notification', {
      notificationId: notification.id,
      error,
    })
  }
}

/**
 * Get pending digest notifications for a user.
 */
export async function getPendingDigestNotifications(
  recipientUid: string
): Promise<AccessNotification[]> {
  const db = getDb()

  const snapshot = await db
    .collection('accessNotifications')
    .where('recipientUid', '==', recipientUid)
    .where('notificationType', '==', 'digest')
    .where('sent', '==', false)
    .orderBy('accessTimestamp', 'desc')
    .get()

  return snapshot.docs.map((doc) => doc.data() as AccessNotification)
}

/**
 * Generate daily digest message from notifications.
 */
export function generateDigestMessage(notifications: AccessNotification[]): string {
  if (notifications.length === 0) {
    return ''
  }

  // Group by child
  const byChild = new Map<string | null, AccessNotification[]>()
  for (const notification of notifications) {
    const key = notification.childId
    if (!byChild.has(key)) {
      byChild.set(key, [])
    }
    byChild.get(key)!.push(notification)
  }

  // Get unique actors
  const actorSet = new Set(notifications.map((n) => n.actorDisplayName))
  const actorCount = actorSet.size

  const lines: string[] = []
  lines.push(
    `Access summary: ${notifications.length} view${notifications.length === 1 ? '' : 's'} by ${actorCount} family member${actorCount === 1 ? '' : 's'}`
  )

  for (const [_childId, childNotifications] of byChild) {
    const childName = childNotifications[0]?.childName || 'Family'
    lines.push(
      `- ${childName}: ${childNotifications.length} view${childNotifications.length === 1 ? '' : 's'}`
    )
  }

  return lines.join('\n')
}

/**
 * Mark digest notifications as sent.
 */
export async function markDigestNotificationsSent(notificationIds: string[]): Promise<void> {
  const db = getDb()
  const batch = db.batch()
  const now = Date.now()

  for (const id of notificationIds) {
    const ref = db.collection('accessNotifications').doc(id)
    batch.update(ref, { sent: true, sentAt: now })
  }

  await batch.commit()
}

/**
 * For testing - reset Firestore instance.
 */
export function _resetDbForTesting(): void {
  db = null
}
