import { getFirestore, Timestamp, FieldValue } from 'firebase-admin/firestore'
import { createHash } from 'crypto'

/**
 * Notification types that are NEVER suppressed even during stealth mode.
 * These are critical for safety and legal compliance.
 */
export const STEALTH_EXEMPT_NOTIFICATION_TYPES = [
  'crisis-resource-access',        // Access to crisis hotlines/resources
  'mandatory-report',              // Required legal reporting
  'legal-compliance',              // Court orders, subpoenas
  'account-security',              // Password changes, suspicious login
  'child-safety-flag',             // Child "I feel unsafe" flag
  'law-enforcement-request',       // Police requests
] as const

export type StealthExemptNotificationType = typeof STEALTH_EXEMPT_NOTIFICATION_TYPES[number]

/**
 * Notification types that are suppressed during escape stealth mode.
 * These could reveal escape actions to an abuser.
 */
export const STEALTH_SUPPRESSED_NOTIFICATION_TYPES = [
  // Device-related
  'device-unenrolled',
  'device-offline-extended',
  'device-location-disabled',
  // Parent/Family-related
  'member-removed',
  'member-access-changed',
  'family-membership-updated',
  // Location-related
  'location-rules-disabled',
  'location-work-mode-disabled',
  'location-alerts-disabled',
  'location-history-redacted',
] as const

export type StealthSuppressedNotificationType = typeof STEALTH_SUPPRESSED_NOTIFICATION_TYPES[number]

/**
 * Stealth queue document structure
 */
export interface StealthQueue {
  queueId: string
  familyId: string
  targetUserIds: string[]
  notificationTypesToSuppress: string[]
  activatedAt: Timestamp
  expiresAt: Timestamp
  safetyRequestId: string
  activatedBy: string
  sealed: true
}

/**
 * Stealth notification entry structure
 */
export interface StealthNotification {
  notificationId: string
  originalNotificationType: string
  originalTargetUserId: string
  originalFamilyId: string
  originalPayload: {
    title: string
    body: string
    data?: Record<string, string>
  }
  originalTimestamp: Timestamp
  capturedAt: Timestamp
  status: 'held' | 'deleted'
  sealed: true
}

/**
 * Pending notification structure (what would be delivered normally)
 */
export interface PendingNotification {
  type: string
  targetUserId: string
  familyId: string
  title: string
  body: string
  data?: Record<string, string>
  timestamp?: Timestamp
}

/**
 * Generate an integrity hash for audit entry
 * Used for tamper detection on sealed entries
 */
export function generateIntegrityHash(data: Record<string, unknown>): string {
  const sortedJson = JSON.stringify(data, Object.keys(data).sort())
  return createHash('sha256').update(sortedJson).digest('hex')
}

/**
 * Check if a notification type is exempt from stealth suppression
 */
export function isNotificationExempt(notificationType: string): boolean {
  return STEALTH_EXEMPT_NOTIFICATION_TYPES.includes(
    notificationType as StealthExemptNotificationType
  )
}

/**
 * Get active stealth queue for a user/family combination
 * Returns null if no active stealth queue exists
 *
 * Uses array-contains query for efficient Firestore lookup (avoids race condition).
 * Requires composite index on: familyId + targetUserIds (array-contains) + expiresAt
 */
export async function getActiveStealthQueue(
  userId: string,
  familyId: string
): Promise<StealthQueue | null> {
  const db = getFirestore()
  const now = Timestamp.now()

  // Query using array-contains for efficient lookup
  // This query is atomic and avoids race conditions
  const stealthQueuesQuery = db
    .collection('stealthQueues')
    .where('familyId', '==', familyId)
    .where('targetUserIds', 'array-contains', userId)
    .where('expiresAt', '>', now)
    .limit(1) // Only need one active queue

  const stealthQueues = await stealthQueuesQuery.get()

  if (stealthQueues.empty) {
    return null
  }

  const doc = stealthQueues.docs[0]
  const queue = doc.data() as StealthQueue
  return { ...queue, queueId: doc.id }
}

/**
 * Check if stealth mode is active for a user
 * Returns the stealth queue if active, null otherwise
 */
export async function isStealthModeActive(
  userId: string,
  familyId: string
): Promise<StealthQueue | null> {
  return getActiveStealthQueue(userId, familyId)
}

/**
 * Determine if a notification should be intercepted
 * Returns:
 * - { intercept: false } - Deliver normally
 * - { intercept: true, queueId, reason } - Capture in stealth queue
 */
export async function shouldInterceptNotification(
  notification: PendingNotification
): Promise<{ intercept: false } | { intercept: true; queueId: string; reason: string }> {
  // Step 1: Check if notification type is exempt (critical safety)
  if (isNotificationExempt(notification.type)) {
    return { intercept: false }
  }

  // Step 2: Check if stealth mode is active for this user
  const stealthQueue = await getActiveStealthQueue(
    notification.targetUserId,
    notification.familyId
  )

  if (!stealthQueue) {
    // No active stealth - deliver normally
    return { intercept: false }
  }

  // Step 3: Check if this notification type should be suppressed
  // If no specific types defined, suppress all escape-related notifications
  if (stealthQueue.notificationTypesToSuppress.length === 0 ||
      stealthQueue.notificationTypesToSuppress.includes(notification.type)) {
    return {
      intercept: true,
      queueId: stealthQueue.queueId,
      reason: 'stealth-mode-active'
    }
  }

  // Notification type not in suppression list - deliver normally
  return { intercept: false }
}

/**
 * Capture a notification in the stealth queue
 * Does NOT deliver the notification
 */
export async function captureStealthNotification(
  queueId: string,
  notification: PendingNotification
): Promise<string> {
  const db = getFirestore()
  const now = Timestamp.now()

  const stealthNotificationData: Omit<StealthNotification, 'notificationId'> = {
    originalNotificationType: notification.type,
    originalTargetUserId: notification.targetUserId,
    originalFamilyId: notification.familyId,
    originalPayload: {
      title: notification.title,
      body: notification.body,
      data: notification.data,
    },
    originalTimestamp: notification.timestamp || now,
    capturedAt: now,
    status: 'held',
    sealed: true,
  }

  const notificationRef = await db
    .collection('stealthQueues')
    .doc(queueId)
    .collection('notifications')
    .add(stealthNotificationData)

  return notificationRef.id
}

/**
 * Log a stealth exemption to the sealed admin audit
 * Called when a critical notification bypasses stealth mode
 */
export async function logStealthExemption(
  notification: PendingNotification,
  queueId: string,
  performedBy: string = 'system'
): Promise<void> {
  const db = getFirestore()
  const timestamp = Timestamp.now()

  const auditData = {
    action: 'notification-stealth-exempt',
    resourceType: 'stealth-queue',
    resourceId: queueId,
    performedBy,
    familyId: notification.familyId,
    exemptedNotificationType: notification.type,
    targetUserId: notification.targetUserId,
    timestamp: FieldValue.serverTimestamp(),
    sealed: true,
  }

  const hashData = {
    ...auditData,
    timestamp: timestamp.toDate().toISOString(),
  }
  const integrityHash = generateIntegrityHash(hashData)

  await db.collection('adminAuditLog').add({
    ...auditData,
    integrityHash,
  })
}

/**
 * Process a notification with stealth interception
 * Returns true if notification was captured (not delivered)
 * Returns false if notification should be delivered normally
 */
export async function processNotificationWithStealth(
  notification: PendingNotification
): Promise<{ captured: boolean; queueId?: string; exempted?: boolean }> {
  const result = await shouldInterceptNotification(notification)

  if (!result.intercept) {
    // Check if this was an exemption we should log
    const stealthQueue = await getActiveStealthQueue(
      notification.targetUserId,
      notification.familyId
    )

    if (stealthQueue && isNotificationExempt(notification.type)) {
      // Log the exemption for compliance
      await logStealthExemption(notification, stealthQueue.queueId)
      return { captured: false, exempted: true }
    }

    return { captured: false }
  }

  // Capture the notification in stealth queue
  await captureStealthNotification(result.queueId, notification)
  return { captured: true, queueId: result.queueId }
}

/**
 * Firestore batch operation limits
 */
export const FIRESTORE_BATCH_LIMIT = 500

/**
 * Helper to chunk array into smaller arrays
 */
export function chunkArray<T>(array: T[], chunkSize: number): T[][] {
  const chunks: T[][] = []
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize))
  }
  return chunks
}
