/**
 * Device Sync Notification Service
 *
 * Story 41.4: Device Sync Status Notifications
 *
 * Sends notifications to parents when device sync issues occur:
 * - Sync timeout notifications when device hasn't synced (respects quiet hours)
 * - Permission revoked notifications (BYPASSES quiet hours - critical)
 * - Sync restored notifications (optional recovery)
 */

import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { getMessaging } from 'firebase-admin/messaging'
import * as logger from 'firebase-functions/logger'
import {
  type SyncTimeoutParams,
  type PermissionRevokedParams,
  type SyncRestoredParams,
  type SyncThresholdHours,
  type ParentNotificationPreferences,
  buildSyncTimeoutContent,
  buildPermissionRevokedContent,
  buildSyncRestoredContent,
  buildDetailedSyncTimeoutContent,
  isInQuietHours,
  createDefaultNotificationPreferences,
} from '@fledgely/shared'

// Lazy Firestore initialization for testing
let db: FirebaseFirestore.Firestore | null = null
function getDb(): FirebaseFirestore.Firestore {
  if (!db) {
    db = getFirestore()
  }
  return db
}

/** Reset Firestore instance for testing */
export function _resetDbForTesting(): void {
  db = null
}

/**
 * Result of sending device sync notification
 */
export interface DeviceSyncNotificationResult {
  /** Whether any notification was generated */
  notificationGenerated: boolean
  /** Parents who received notifications */
  parentsNotified: string[]
  /** Parents who were skipped (preferences/quiet hours) */
  parentsSkipped: string[]
  /** Whether notifications were delayed due to quiet hours */
  delayedForQuietHours: boolean
  /** Device ID for tracking */
  deviceId: string
}

/**
 * Token stored in user's subcollection
 */
interface NotificationToken {
  token: string
  createdAt?: number
}

/**
 * Device notification status for deduplication
 */
interface DeviceNotificationStatusDoc {
  deviceId: string
  lastSyncTimeoutNotifiedAt?: number
  lastSyncTimeoutThreshold?: SyncThresholdHours
  lastPermissionRevokedNotifiedAt?: number
  lastSyncRestoredNotifiedAt?: number
  isOffline: boolean
  updatedAt: number
}

/**
 * Get all FCM tokens for a user
 */
async function getUserTokens(userId: string): Promise<{ tokenId: string; token: string }[]> {
  const tokensRef = getDb().collection('users').doc(userId).collection('notificationTokens')
  const tokenDocs = await tokensRef.get()

  const tokens: { tokenId: string; token: string }[] = []
  for (const doc of tokenDocs.docs) {
    const data = doc.data() as NotificationToken
    if (data.token) {
      tokens.push({
        tokenId: doc.id,
        token: data.token,
      })
    }
  }

  return tokens
}

/**
 * Remove a stale token from Firestore
 */
async function removeStaleToken(userId: string, tokenId: string): Promise<void> {
  try {
    await getDb()
      .collection('users')
      .doc(userId)
      .collection('notificationTokens')
      .doc(tokenId)
      .delete()
    logger.info('Removed stale token', { userId, tokenId })
  } catch (error) {
    logger.error('Failed to remove stale token', { error })
  }
}

/**
 * Get parent IDs for a family
 */
async function getParentIdsForFamily(familyId: string): Promise<string[]> {
  const familyRef = getDb().collection('families').doc(familyId)
  const familyDoc = await familyRef.get()

  if (!familyDoc.exists) {
    logger.warn('Family not found', { familyId })
    return []
  }

  const familyData = familyDoc.data()

  // Check both parentIds and guardians arrays
  const parentIds = familyData?.parentIds as string[] | undefined
  if (parentIds && parentIds.length > 0) {
    return parentIds
  }

  // Fallback to guardians array
  const guardians = familyData?.guardians as Array<{ uid: string }> | undefined
  if (guardians && guardians.length > 0) {
    return guardians.map((g) => g.uid)
  }

  return []
}

/**
 * Get notification preferences for a user
 */
async function getPreferencesForUser(
  userId: string,
  familyId: string,
  childId: string
): Promise<ParentNotificationPreferences> {
  // Try child-specific preferences first
  const childPrefsRef = getDb()
    .collection('users')
    .doc(userId)
    .collection('notificationPreferences')
    .doc(childId)

  const childPrefsDoc = await childPrefsRef.get()
  if (childPrefsDoc.exists) {
    const data = childPrefsDoc.data()
    return {
      ...data,
      updatedAt: data?.updatedAt?.toDate?.() || new Date(),
      createdAt: data?.createdAt?.toDate?.() || new Date(),
    } as ParentNotificationPreferences
  }

  // Try family-wide preferences
  const defaultPrefsRef = getDb()
    .collection('users')
    .doc(userId)
    .collection('notificationPreferences')
    .doc('default')

  const defaultPrefsDoc = await defaultPrefsRef.get()
  if (defaultPrefsDoc.exists) {
    const data = defaultPrefsDoc.data()
    return {
      ...data,
      updatedAt: data?.updatedAt?.toDate?.() || new Date(),
      createdAt: data?.createdAt?.toDate?.() || new Date(),
    } as ParentNotificationPreferences
  }

  // Return defaults if no preferences stored
  return createDefaultNotificationPreferences(userId, familyId, childId)
}

/**
 * Record notification in history for audit
 */
async function recordNotificationHistory(
  userId: string,
  type: 'sync_timeout' | 'permission_revoked' | 'sync_restored',
  deviceId: string,
  childId: string,
  status: 'sent' | 'failed' | 'delayed'
): Promise<void> {
  const historyRef = getDb().collection('users').doc(userId).collection('notificationHistory').doc()

  await historyRef.set({
    id: historyRef.id,
    userId,
    type: `device_${type}`,
    deviceId,
    childId,
    sentAt: Date.now(),
    deliveryStatus: status,
    createdAt: FieldValue.serverTimestamp(),
  })
}

/**
 * Queue notification for post-quiet-hours delivery
 */
async function queueDelayedNotification(
  userId: string,
  type: 'sync_timeout' | 'sync_restored',
  deviceId: string,
  childId: string,
  deviceName: string,
  content: { title: string; body: string; data: Record<string, unknown> },
  delayedUntil: number
): Promise<void> {
  const queueRef = getDb().collection('users').doc(userId).collection('delayedNotifications').doc()

  await queueRef.set({
    id: queueRef.id,
    userId,
    type: `device_${type}`,
    deviceId,
    childId,
    deviceName,
    content,
    queuedAt: Date.now(),
    deliverAt: delayedUntil,
    status: 'pending',
  })

  logger.info('Device sync notification queued for post-quiet-hours delivery', {
    userId,
    type,
    deviceId,
    delayedUntil: new Date(delayedUntil).toISOString(),
  })
}

/**
 * Calculate when quiet hours end
 */
function calculateQuietHoursEnd(prefs: ParentNotificationPreferences): number {
  const now = new Date()
  const endTime = prefs.quietHoursEnd || '07:00'
  const [hours, minutes] = endTime.split(':').map(Number)

  const endDate = new Date(now)
  endDate.setHours(hours, minutes, 0, 0)

  if (endDate <= now) {
    endDate.setDate(endDate.getDate() + 1)
  }

  return endDate.getTime()
}

/**
 * Get or create device notification status for deduplication
 */
async function getDeviceNotificationStatus(
  familyId: string,
  deviceId: string
): Promise<DeviceNotificationStatusDoc | null> {
  const statusRef = getDb()
    .collection('families')
    .doc(familyId)
    .collection('deviceNotificationStatus')
    .doc(deviceId)

  const statusDoc = await statusRef.get()
  if (statusDoc.exists) {
    return statusDoc.data() as DeviceNotificationStatusDoc
  }
  return null
}

/**
 * Update device notification status
 */
async function updateDeviceNotificationStatus(
  familyId: string,
  deviceId: string,
  updates: Partial<DeviceNotificationStatusDoc>
): Promise<void> {
  const statusRef = getDb()
    .collection('families')
    .doc(familyId)
    .collection('deviceNotificationStatus')
    .doc(deviceId)

  await statusRef.set(
    {
      deviceId,
      ...updates,
      updatedAt: Date.now(),
    },
    { merge: true }
  )
}

/**
 * Check if we've already notified for this sync threshold
 * Used for deduplication to prevent notification spam
 *
 * Story 41.4 - Prevents multiple notifications for same threshold
 */
export async function hasAlreadyNotifiedForThreshold(
  familyId: string,
  deviceId: string,
  thresholdHours: SyncThresholdHours
): Promise<boolean> {
  const status = await getDeviceNotificationStatus(familyId, deviceId)
  if (!status) {
    return false
  }

  // Check if we've notified for this threshold or a higher one
  if (status.lastSyncTimeoutThreshold && status.lastSyncTimeoutThreshold >= thresholdHours) {
    // Only dedupe if last notification was within the threshold period
    if (status.lastSyncTimeoutNotifiedAt) {
      const thresholdMs = thresholdHours * 60 * 60 * 1000
      const timeSinceNotification = Date.now() - status.lastSyncTimeoutNotifiedAt
      if (timeSinceNotification < thresholdMs) {
        return true
      }
    }
  }

  return false
}

/**
 * Check if we've recently notified about permission revocation
 * Cooldown of 1 hour to prevent spam
 */
export async function hasRecentlyNotifiedPermissionRevoked(
  familyId: string,
  deviceId: string
): Promise<boolean> {
  const status = await getDeviceNotificationStatus(familyId, deviceId)
  if (!status || !status.lastPermissionRevokedNotifiedAt) {
    return false
  }

  const oneHourMs = 60 * 60 * 1000
  const timeSinceNotification = Date.now() - status.lastPermissionRevokedNotifiedAt
  return timeSinceNotification < oneHourMs
}

/**
 * Send sync timeout notification to parents
 *
 * Story 41.4 - AC1: Sync timeout notifications
 * - Respects quiet hours (can be delayed)
 * - Sends to all guardians (FR103 co-parent symmetry)
 */
export async function sendDeviceSyncTimeoutNotification(
  params: SyncTimeoutParams,
  useDetailedContent: boolean = false
): Promise<DeviceSyncNotificationResult> {
  const { deviceId, deviceName, familyId, childId, thresholdHours } = params

  logger.info('Sending device sync timeout notification', {
    deviceId,
    deviceName,
    familyId,
    childId,
    thresholdHours,
  })

  // Check for deduplication
  const alreadyNotified = await hasAlreadyNotifiedForThreshold(familyId, deviceId, thresholdHours)
  if (alreadyNotified) {
    logger.info('Already notified for this threshold, skipping', { deviceId, thresholdHours })
    return {
      notificationGenerated: false,
      parentsNotified: [],
      parentsSkipped: [],
      delayedForQuietHours: false,
      deviceId,
    }
  }

  const parentIds = await getParentIdsForFamily(familyId)
  if (parentIds.length === 0) {
    logger.warn('No parents found for family', { familyId })
    return {
      notificationGenerated: false,
      parentsNotified: [],
      parentsSkipped: [],
      delayedForQuietHours: false,
      deviceId,
    }
  }

  const content = useDetailedContent
    ? buildDetailedSyncTimeoutContent(params)
    : buildSyncTimeoutContent(params)
  const appUrl = process.env.APP_URL || 'https://app.fledgely.com'

  const parentsNotified: string[] = []
  const parentsSkipped: string[] = []
  let delayedForQuietHours = false
  const now = new Date()

  for (const userId of parentIds) {
    const prefs = await getPreferencesForUser(userId, familyId, childId)

    // Check if device sync notifications are enabled
    // Use deviceStatusEnabled preference (added in Story 41.4)
    if (prefs.deviceStatusEnabled === false) {
      logger.info('Device status notifications disabled for user', { userId })
      parentsSkipped.push(userId)
      continue
    }

    // Check quiet hours (sync timeout can be delayed)
    if (prefs.quietHoursEnabled && isInQuietHours(prefs, now)) {
      const delayedUntil = calculateQuietHoursEnd(prefs)
      await queueDelayedNotification(
        userId,
        'sync_timeout',
        deviceId,
        childId,
        deviceName,
        content,
        delayedUntil
      )
      await recordNotificationHistory(userId, 'sync_timeout', deviceId, childId, 'delayed')
      delayedForQuietHours = true
      parentsSkipped.push(userId)
      continue
    }

    // Get user tokens
    const tokens = await getUserTokens(userId)
    if (tokens.length === 0) {
      logger.info('No tokens found for user', { userId })
      await recordNotificationHistory(userId, 'sync_timeout', deviceId, childId, 'failed')
      parentsSkipped.push(userId)
      continue
    }

    // Send via FCM
    const messaging = getMessaging()

    try {
      const response = await messaging.sendEachForMulticast({
        tokens: tokens.map((t) => t.token),
        notification: {
          title: content.title,
          body: content.body,
        },
        data: {
          type: 'device_sync_timeout',
          deviceId,
          familyId,
          childId,
          action: 'view_device',
        },
        webpush: {
          fcmOptions: {
            link: `${appUrl}/dashboard/devices/${childId}/${deviceId}`,
          },
        },
      })

      // Handle failures and clean up stale tokens
      if (response.failureCount > 0) {
        const cleanupPromises: Promise<void>[] = []

        response.responses.forEach((resp, idx) => {
          if (!resp.success && resp.error) {
            const errorCode = resp.error.code
            if (
              errorCode === 'messaging/registration-token-not-registered' ||
              errorCode === 'messaging/invalid-registration-token'
            ) {
              const tokenInfo = tokens[idx]
              cleanupPromises.push(removeStaleToken(userId, tokenInfo.tokenId))
            }
          }
        })

        await Promise.all(cleanupPromises)
      }

      if (response.successCount > 0) {
        await recordNotificationHistory(userId, 'sync_timeout', deviceId, childId, 'sent')
        parentsNotified.push(userId)
        logger.info('Device sync timeout notification sent', {
          userId,
          deviceId,
          successCount: response.successCount,
        })
      } else {
        await recordNotificationHistory(userId, 'sync_timeout', deviceId, childId, 'failed')
        parentsSkipped.push(userId)
      }
    } catch (error) {
      logger.error('Failed to send device sync timeout notification', { userId, deviceId, error })
      await recordNotificationHistory(userId, 'sync_timeout', deviceId, childId, 'failed')
      parentsSkipped.push(userId)
    }
  }

  // Update deduplication status if any notification was generated
  if (parentsNotified.length > 0 || delayedForQuietHours) {
    await updateDeviceNotificationStatus(familyId, deviceId, {
      lastSyncTimeoutNotifiedAt: Date.now(),
      lastSyncTimeoutThreshold: thresholdHours,
      isOffline: true,
    })
  }

  return {
    notificationGenerated: parentsNotified.length > 0 || delayedForQuietHours,
    parentsNotified,
    parentsSkipped,
    delayedForQuietHours,
    deviceId,
  }
}

/**
 * Send permission revoked notification to parents
 *
 * Story 41.4 - AC2: Permission revoked notifications
 * - BYPASSES quiet hours (critical notification)
 * - Sends to all guardians (FR103 co-parent symmetry)
 */
export async function sendPermissionRevokedNotification(
  params: PermissionRevokedParams
): Promise<DeviceSyncNotificationResult> {
  const { deviceId, deviceName, familyId, childId } = params

  logger.info('Sending permission revoked notification', {
    deviceId,
    deviceName,
    familyId,
    childId,
  })

  // Check for recent notification to prevent spam
  const recentlyNotified = await hasRecentlyNotifiedPermissionRevoked(familyId, deviceId)
  if (recentlyNotified) {
    logger.info('Recently notified about permission revoked, skipping', { deviceId })
    return {
      notificationGenerated: false,
      parentsNotified: [],
      parentsSkipped: [],
      delayedForQuietHours: false,
      deviceId,
    }
  }

  const parentIds = await getParentIdsForFamily(familyId)
  if (parentIds.length === 0) {
    logger.warn('No parents found for family', { familyId })
    return {
      notificationGenerated: false,
      parentsNotified: [],
      parentsSkipped: [],
      delayedForQuietHours: false,
      deviceId,
    }
  }

  const content = buildPermissionRevokedContent(params)
  const appUrl = process.env.APP_URL || 'https://app.fledgely.com'

  const parentsNotified: string[] = []
  const parentsSkipped: string[] = []

  // Send to ALL guardians - BYPASSES quiet hours (critical notification)
  for (const userId of parentIds) {
    const prefs = await getPreferencesForUser(userId, familyId, childId)

    // Check if device sync notifications are enabled
    if (prefs.deviceStatusEnabled === false) {
      logger.info('Device status notifications disabled for user', { userId })
      parentsSkipped.push(userId)
      continue
    }

    // NOTE: Permission revoked BYPASSES quiet hours - this is critical!
    // User needs to know immediately that extension permissions changed

    // Get user tokens
    const tokens = await getUserTokens(userId)
    if (tokens.length === 0) {
      logger.info('No tokens found for user', { userId })
      await recordNotificationHistory(userId, 'permission_revoked', deviceId, childId, 'failed')
      parentsSkipped.push(userId)
      continue
    }

    // Send via FCM with high priority
    const messaging = getMessaging()

    try {
      const response = await messaging.sendEachForMulticast({
        tokens: tokens.map((t) => t.token),
        notification: {
          title: content.title,
          body: content.body,
        },
        data: {
          type: 'device_permission_revoked',
          deviceId,
          familyId,
          childId,
          action: 'check_permissions',
        },
        webpush: {
          fcmOptions: {
            link: `${appUrl}/dashboard/devices/${childId}/${deviceId}/permissions`,
          },
        },
        android: {
          // High priority for critical notifications
          priority: 'high',
          notification: {
            priority: 'high',
            channelId: 'device_alerts',
          },
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
              badge: 1,
              // Critical alert for permission changes
              'interruption-level': 'time-sensitive',
            },
          },
        },
      })

      // Handle failures and clean up stale tokens
      if (response.failureCount > 0) {
        const cleanupPromises: Promise<void>[] = []

        response.responses.forEach((resp, idx) => {
          if (!resp.success && resp.error) {
            const errorCode = resp.error.code
            if (
              errorCode === 'messaging/registration-token-not-registered' ||
              errorCode === 'messaging/invalid-registration-token'
            ) {
              const tokenInfo = tokens[idx]
              cleanupPromises.push(removeStaleToken(userId, tokenInfo.tokenId))
            }
          }
        })

        await Promise.all(cleanupPromises)
      }

      if (response.successCount > 0) {
        await recordNotificationHistory(userId, 'permission_revoked', deviceId, childId, 'sent')
        parentsNotified.push(userId)
        logger.info('Permission revoked notification sent', {
          userId,
          deviceId,
          successCount: response.successCount,
        })
      } else {
        await recordNotificationHistory(userId, 'permission_revoked', deviceId, childId, 'failed')
        parentsSkipped.push(userId)
      }
    } catch (error) {
      logger.error('Failed to send permission revoked notification', { userId, deviceId, error })
      await recordNotificationHistory(userId, 'permission_revoked', deviceId, childId, 'failed')
      parentsSkipped.push(userId)
    }
  }

  // Update deduplication status
  if (parentsNotified.length > 0) {
    await updateDeviceNotificationStatus(familyId, deviceId, {
      lastPermissionRevokedNotifiedAt: Date.now(),
      isOffline: true,
    })
  }

  return {
    notificationGenerated: parentsNotified.length > 0,
    parentsNotified,
    parentsSkipped,
    delayedForQuietHours: false, // Never delayed - critical notification
    deviceId,
  }
}

/**
 * Send sync restored notification to parents
 *
 * Story 41.4 - AC3: Sync restored notifications
 * - Respects quiet hours (can be delayed)
 * - Optional recovery notification
 */
export async function sendSyncRestoredNotification(
  params: SyncRestoredParams
): Promise<DeviceSyncNotificationResult> {
  const { deviceId, deviceName, familyId, childId } = params

  logger.info('Sending sync restored notification', {
    deviceId,
    deviceName,
    familyId,
    childId,
  })

  const parentIds = await getParentIdsForFamily(familyId)
  if (parentIds.length === 0) {
    logger.warn('No parents found for family', { familyId })
    return {
      notificationGenerated: false,
      parentsNotified: [],
      parentsSkipped: [],
      delayedForQuietHours: false,
      deviceId,
    }
  }

  const content = buildSyncRestoredContent(params)
  const appUrl = process.env.APP_URL || 'https://app.fledgely.com'

  const parentsNotified: string[] = []
  const parentsSkipped: string[] = []
  let delayedForQuietHours = false
  const now = new Date()

  // Check if device was previously marked offline before sending recovery notifications
  const deviceStatus = await getDeviceNotificationStatus(familyId, deviceId)
  if (!deviceStatus?.isOffline) {
    logger.info('Device was not marked offline, skipping sync restored notification', {
      deviceId,
      familyId,
    })
    return {
      notificationGenerated: false,
      parentsNotified: [],
      parentsSkipped: [],
      delayedForQuietHours: false,
      deviceId,
    }
  }

  for (const userId of parentIds) {
    const prefs = await getPreferencesForUser(userId, familyId, childId)

    // Check if device sync notifications are enabled
    if (prefs.deviceStatusEnabled === false) {
      logger.info('Device status notifications disabled for user', { userId })
      parentsSkipped.push(userId)
      continue
    }

    // Check if recovery notifications are enabled (AC4: configurable)
    if (prefs.deviceSyncRecoveryEnabled === false) {
      logger.info('Device sync recovery notifications disabled for user', { userId })
      parentsSkipped.push(userId)
      continue
    }

    // Check quiet hours (sync restored can be delayed)
    if (prefs.quietHoursEnabled && isInQuietHours(prefs, now)) {
      const delayedUntil = calculateQuietHoursEnd(prefs)
      await queueDelayedNotification(
        userId,
        'sync_restored',
        deviceId,
        childId,
        deviceName,
        content,
        delayedUntil
      )
      await recordNotificationHistory(userId, 'sync_restored', deviceId, childId, 'delayed')
      delayedForQuietHours = true
      parentsSkipped.push(userId)
      continue
    }

    // Get user tokens
    const tokens = await getUserTokens(userId)
    if (tokens.length === 0) {
      logger.info('No tokens found for user', { userId })
      await recordNotificationHistory(userId, 'sync_restored', deviceId, childId, 'failed')
      parentsSkipped.push(userId)
      continue
    }

    // Send via FCM
    const messaging = getMessaging()

    try {
      const response = await messaging.sendEachForMulticast({
        tokens: tokens.map((t) => t.token),
        notification: {
          title: content.title,
          body: content.body,
        },
        data: {
          type: 'device_sync_restored',
          deviceId,
          familyId,
          childId,
          action: 'dismiss',
        },
        webpush: {
          fcmOptions: {
            link: `${appUrl}/dashboard/devices/${childId}`,
          },
        },
      })

      // Handle failures and clean up stale tokens
      if (response.failureCount > 0) {
        const cleanupPromises: Promise<void>[] = []

        response.responses.forEach((resp, idx) => {
          if (!resp.success && resp.error) {
            const errorCode = resp.error.code
            if (
              errorCode === 'messaging/registration-token-not-registered' ||
              errorCode === 'messaging/invalid-registration-token'
            ) {
              const tokenInfo = tokens[idx]
              cleanupPromises.push(removeStaleToken(userId, tokenInfo.tokenId))
            }
          }
        })

        await Promise.all(cleanupPromises)
      }

      if (response.successCount > 0) {
        await recordNotificationHistory(userId, 'sync_restored', deviceId, childId, 'sent')
        parentsNotified.push(userId)
        logger.info('Sync restored notification sent', {
          userId,
          deviceId,
          successCount: response.successCount,
        })
      } else {
        await recordNotificationHistory(userId, 'sync_restored', deviceId, childId, 'failed')
        parentsSkipped.push(userId)
      }
    } catch (error) {
      logger.error('Failed to send sync restored notification', { userId, deviceId, error })
      await recordNotificationHistory(userId, 'sync_restored', deviceId, childId, 'failed')
      parentsSkipped.push(userId)
    }
  }

  // Update status - device is back online
  if (parentsNotified.length > 0 || delayedForQuietHours) {
    await updateDeviceNotificationStatus(familyId, deviceId, {
      lastSyncRestoredNotifiedAt: Date.now(),
      isOffline: false,
      // Clear timeout tracking since device is back
      lastSyncTimeoutNotifiedAt: undefined,
      lastSyncTimeoutThreshold: undefined,
    })
  }

  return {
    notificationGenerated: parentsNotified.length > 0 || delayedForQuietHours,
    parentsNotified,
    parentsSkipped,
    delayedForQuietHours,
    deviceId,
  }
}

/**
 * Mark device as offline without sending notification
 * Used when device goes offline but we don't want to notify yet
 */
export async function markDeviceOffline(familyId: string, deviceId: string): Promise<void> {
  await updateDeviceNotificationStatus(familyId, deviceId, {
    isOffline: true,
  })
}

/**
 * Clear device notification status when device is back online
 * Used to reset deduplication state
 */
export async function clearDeviceNotificationStatus(
  familyId: string,
  deviceId: string
): Promise<void> {
  const statusRef = getDb()
    .collection('families')
    .doc(familyId)
    .collection('deviceNotificationStatus')
    .doc(deviceId)

  await statusRef.delete()
  logger.info('Cleared device notification status', { familyId, deviceId })
}
