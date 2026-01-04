/**
 * Login Notification Service
 *
 * Story 41.5: New Login Notifications
 *
 * Sends notifications to parents when new devices log in:
 * - AC1: New device detection with device info
 * - AC3: Fleeing mode suppresses location (FR160)
 * - AC4: All guardians notified (FR103 symmetry)
 * - AC5: Login alerts BYPASS quiet hours (security - cannot be disabled)
 */

import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { getMessaging } from 'firebase-admin/messaging'
import * as logger from 'firebase-functions/logger'
import {
  buildLoginNotificationContent,
  buildSuspiciousLoginContent,
  type DeviceFingerprint,
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

// ============================================
// Types
// ============================================

/** Parameters for sending login notification */
export interface SendLoginNotificationParams {
  /** User ID who logged in */
  userId: string
  /** User's display name */
  userDisplayName: string
  /** Family ID */
  familyId: string
  /** Session ID for the login */
  sessionId: string
  /** Device fingerprint details */
  fingerprint: DeviceFingerprint
  /** Whether this is a new device */
  isNewDevice: boolean
}

/** Result of sending login notification */
export interface LoginNotificationResult {
  /** Whether any notification was generated */
  notificationGenerated: boolean
  /** Guardians who received notifications */
  guardiansNotified: string[]
  /** Guardians who were skipped */
  guardiansSkipped: string[]
  /** Session ID for tracking */
  sessionId: string
}

/** Token stored in user's subcollection */
interface NotificationToken {
  token: string
  createdAt?: number
}

// Fleeing mode duration (72 hours)
const FLEEING_MODE_DURATION_MS = 72 * 60 * 60 * 1000

// ============================================
// Helper Functions
// ============================================

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
 * Get guardian UIDs for a family
 */
async function getGuardianUids(familyId: string): Promise<string[]> {
  const familyRef = getDb().collection('families').doc(familyId)
  const familyDoc = await familyRef.get()

  if (!familyDoc.exists) {
    logger.warn('Family not found', { familyId })
    return []
  }

  const familyData = familyDoc.data()

  // Check guardianUids first (standard format)
  const guardianUids = familyData?.guardianUids as string[] | undefined
  if (guardianUids && guardianUids.length > 0) {
    return guardianUids
  }

  // Fallback to parentIds
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
 * Check if family is in fleeing mode (AC3/FR160)
 *
 * Fleeing mode is active for 72 hours after activation.
 * During fleeing mode, location details are omitted from notifications.
 */
export async function isInFleeingMode(familyId: string): Promise<boolean> {
  const familyRef = getDb().collection('families').doc(familyId)
  const familyDoc = await familyRef.get()

  if (!familyDoc.exists) {
    return false
  }

  const familyData = familyDoc.data()
  const fleeingModeActivatedAt = familyData?.fleeingModeActivatedAt

  if (!fleeingModeActivatedAt) {
    return false
  }

  // Convert Firestore timestamp if needed
  const activatedTime =
    fleeingModeActivatedAt.toMillis?.() ||
    fleeingModeActivatedAt._seconds * 1000 ||
    fleeingModeActivatedAt

  const now = Date.now()
  const elapsed = now - activatedTime

  // Fleeing mode lasts 72 hours
  return elapsed < FLEEING_MODE_DURATION_MS
}

/**
 * Record notification in history for audit
 */
async function recordNotificationHistory(
  userId: string,
  type: 'new_login' | 'suspicious_login',
  sessionId: string,
  status: 'sent' | 'failed'
): Promise<void> {
  const historyRef = getDb().collection('users').doc(userId).collection('notificationHistory').doc()

  await historyRef.set({
    id: historyRef.id,
    userId,
    type: `login_${type}`,
    sessionId,
    sentAt: Date.now(),
    deliveryStatus: status,
    createdAt: FieldValue.serverTimestamp(),
  })
}

/**
 * Update login notification status for deduplication
 */
async function updateLoginNotificationStatus(
  userId: string,
  sessionId: string,
  fingerprintId: string
): Promise<void> {
  const statusRef = getDb()
    .collection('users')
    .doc(userId)
    .collection('loginNotificationStatus')
    .doc('current')

  await statusRef.set(
    {
      userId,
      lastNotificationSentAt: Date.now(),
      lastNotifiedSessionId: sessionId,
      lastNotifiedFingerprintId: fingerprintId,
      updatedAt: Date.now(),
    },
    { merge: true }
  )
}

/**
 * Check if we've recently notified for this fingerprint
 * Prevents duplicate notifications for rapid re-logins
 */
export async function hasRecentlyNotifiedForFingerprint(
  userId: string,
  fingerprintId: string
): Promise<boolean> {
  const statusRef = getDb()
    .collection('users')
    .doc(userId)
    .collection('loginNotificationStatus')
    .doc('current')

  const statusDoc = await statusRef.get()
  if (!statusDoc.exists) {
    return false
  }

  const status = statusDoc.data()
  if (status?.lastNotifiedFingerprintId !== fingerprintId) {
    return false
  }

  // Check if last notification was within 5 minutes (prevent rapid duplicate notifications)
  const fiveMinutesMs = 5 * 60 * 1000
  const timeSinceNotification = Date.now() - (status?.lastNotificationSentAt || 0)
  return timeSinceNotification < fiveMinutesMs
}

// ============================================
// Main Notification Functions
// ============================================

/**
 * Send new login notification to all guardians (AC1, AC4)
 *
 * NOTE: Login alerts BYPASS quiet hours (AC5 - security requirement)
 * These notifications cannot be disabled for security.
 *
 * @param params - Login notification parameters
 * @returns Result with success/failure counts
 */
export async function sendNewLoginNotification(
  params: SendLoginNotificationParams
): Promise<LoginNotificationResult> {
  const { userId, userDisplayName, familyId, sessionId, fingerprint, isNewDevice } = params

  logger.info('Sending new login notification', {
    userId,
    familyId,
    sessionId,
    isNewDevice,
    deviceType: fingerprint.deviceType,
    browser: fingerprint.browser,
  })

  // Only send notification for new devices
  if (!isNewDevice) {
    logger.info('Not a new device, skipping notification', { userId, sessionId })
    return {
      notificationGenerated: false,
      guardiansNotified: [],
      guardiansSkipped: [],
      sessionId,
    }
  }

  // Check for recent notification to prevent spam
  const recentlyNotified = await hasRecentlyNotifiedForFingerprint(userId, fingerprint.id)
  if (recentlyNotified) {
    logger.info('Recently notified for this fingerprint, skipping', {
      userId,
      fingerprintId: fingerprint.id,
    })
    return {
      notificationGenerated: false,
      guardiansNotified: [],
      guardiansSkipped: [],
      sessionId,
    }
  }

  // Get all guardians (AC4: notify all guardians)
  const guardianUids = await getGuardianUids(familyId)
  if (guardianUids.length === 0) {
    logger.warn('No guardians found for family', { familyId })
    return {
      notificationGenerated: false,
      guardiansNotified: [],
      guardiansSkipped: [],
      sessionId,
    }
  }

  // Check fleeing mode (AC3/FR160: omit location if fleeing)
  const fleeingMode = await isInFleeingMode(familyId)

  // Build notification content
  const content = buildLoginNotificationContent({
    sessionId,
    familyId,
    userId,
    userDisplayName,
    deviceType: fingerprint.deviceType,
    browser: fingerprint.browser,
    approximateLocation: fingerprint.approximateLocation,
    isFleeingMode: fleeingMode,
  })

  const appUrl = process.env.APP_URL || 'https://app.fledgely.com'

  const guardiansNotified: string[] = []
  const guardiansSkipped: string[] = []

  // Send to ALL guardians - LOGIN ALERTS BYPASS QUIET HOURS (AC5)
  for (const guardianUid of guardianUids) {
    // NOTE: We do NOT check quiet hours or preferences for login alerts
    // This is a security requirement - login alerts cannot be disabled

    // Get guardian tokens
    const tokens = await getUserTokens(guardianUid)
    if (tokens.length === 0) {
      logger.info('No tokens found for guardian', { guardianUid })
      await recordNotificationHistory(guardianUid, 'new_login', sessionId, 'failed')
      guardiansSkipped.push(guardianUid)
      continue
    }

    // Send via FCM with high priority (security notification)
    const messaging = getMessaging()

    try {
      const response = await messaging.sendEachForMulticast({
        tokens: tokens.map((t) => t.token),
        notification: {
          title: content.title,
          body: content.body,
        },
        data: {
          type: content.data.type,
          sessionId: content.data.sessionId,
          familyId: content.data.familyId,
          userId: content.data.userId,
          action: content.data.action,
        },
        webpush: {
          fcmOptions: {
            link: `${appUrl}/settings/security/sessions`,
          },
        },
        android: {
          // High priority for security notifications
          priority: 'high',
          notification: {
            priority: 'high',
            channelId: 'security_alerts',
          },
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
              badge: 1,
              // Time-sensitive for security alerts
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
              cleanupPromises.push(removeStaleToken(guardianUid, tokenInfo.tokenId))
            }
          }
        })

        await Promise.all(cleanupPromises)
      }

      if (response.successCount > 0) {
        await recordNotificationHistory(guardianUid, 'new_login', sessionId, 'sent')
        guardiansNotified.push(guardianUid)
        logger.info('New login notification sent', {
          guardianUid,
          sessionId,
          successCount: response.successCount,
        })
      } else {
        await recordNotificationHistory(guardianUid, 'new_login', sessionId, 'failed')
        guardiansSkipped.push(guardianUid)
      }
    } catch (error) {
      logger.error('Failed to send new login notification', { guardianUid, sessionId, error })
      await recordNotificationHistory(guardianUid, 'new_login', sessionId, 'failed')
      guardiansSkipped.push(guardianUid)
    }
  }

  // Update notification status for deduplication
  if (guardiansNotified.length > 0) {
    await updateLoginNotificationStatus(userId, sessionId, fingerprint.id)
  }

  return {
    notificationGenerated: guardiansNotified.length > 0,
    guardiansNotified,
    guardiansSkipped,
    sessionId,
  }
}

/**
 * Send suspicious login notification (more emphasis)
 *
 * Used when the login context is particularly unusual (e.g., very different location).
 * Uses buildSuspiciousLoginContent for stronger wording.
 *
 * @param params - Login notification parameters
 * @returns Result with success/failure counts
 */
export async function sendSuspiciousLoginNotification(
  params: SendLoginNotificationParams
): Promise<LoginNotificationResult> {
  const { userId, userDisplayName, familyId, sessionId, fingerprint, isNewDevice } = params

  logger.info('Sending suspicious login notification', {
    userId,
    familyId,
    sessionId,
    isNewDevice,
    deviceType: fingerprint.deviceType,
    browser: fingerprint.browser,
  })

  // Check for recent notification to prevent spam
  const recentlyNotified = await hasRecentlyNotifiedForFingerprint(userId, fingerprint.id)
  if (recentlyNotified) {
    logger.info('Recently notified for this fingerprint, skipping', {
      userId,
      fingerprintId: fingerprint.id,
    })
    return {
      notificationGenerated: false,
      guardiansNotified: [],
      guardiansSkipped: [],
      sessionId,
    }
  }

  // Get all guardians
  const guardianUids = await getGuardianUids(familyId)
  if (guardianUids.length === 0) {
    logger.warn('No guardians found for family', { familyId })
    return {
      notificationGenerated: false,
      guardiansNotified: [],
      guardiansSkipped: [],
      sessionId,
    }
  }

  // Check fleeing mode (AC3/FR160)
  const fleeingMode = await isInFleeingMode(familyId)

  // Build suspicious notification content (stronger wording)
  const content = buildSuspiciousLoginContent({
    sessionId,
    familyId,
    userId,
    userDisplayName,
    deviceType: fingerprint.deviceType,
    browser: fingerprint.browser,
    approximateLocation: fingerprint.approximateLocation,
    isFleeingMode: fleeingMode,
  })

  const appUrl = process.env.APP_URL || 'https://app.fledgely.com'

  const guardiansNotified: string[] = []
  const guardiansSkipped: string[] = []

  // Send to ALL guardians - BYPASSES quiet hours
  for (const guardianUid of guardianUids) {
    const tokens = await getUserTokens(guardianUid)
    if (tokens.length === 0) {
      logger.info('No tokens found for guardian', { guardianUid })
      await recordNotificationHistory(guardianUid, 'suspicious_login', sessionId, 'failed')
      guardiansSkipped.push(guardianUid)
      continue
    }

    const messaging = getMessaging()

    try {
      const response = await messaging.sendEachForMulticast({
        tokens: tokens.map((t) => t.token),
        notification: {
          title: content.title,
          body: content.body,
        },
        data: {
          type: content.data.type,
          sessionId: content.data.sessionId,
          familyId: content.data.familyId,
          userId: content.data.userId,
          action: content.data.action,
        },
        webpush: {
          fcmOptions: {
            link: `${appUrl}/settings/security/sessions`,
          },
        },
        android: {
          priority: 'high',
          notification: {
            priority: 'high',
            channelId: 'security_alerts',
          },
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
              badge: 1,
              'interruption-level': 'critical',
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
              cleanupPromises.push(removeStaleToken(guardianUid, tokenInfo.tokenId))
            }
          }
        })

        await Promise.all(cleanupPromises)
      }

      if (response.successCount > 0) {
        await recordNotificationHistory(guardianUid, 'suspicious_login', sessionId, 'sent')
        guardiansNotified.push(guardianUid)
        logger.info('Suspicious login notification sent', {
          guardianUid,
          sessionId,
          successCount: response.successCount,
        })
      } else {
        await recordNotificationHistory(guardianUid, 'suspicious_login', sessionId, 'failed')
        guardiansSkipped.push(guardianUid)
      }
    } catch (error) {
      logger.error('Failed to send suspicious login notification', {
        guardianUid,
        sessionId,
        error,
      })
      await recordNotificationHistory(guardianUid, 'suspicious_login', sessionId, 'failed')
      guardiansSkipped.push(guardianUid)
    }
  }

  // Update notification status for deduplication
  if (guardiansNotified.length > 0) {
    await updateLoginNotificationStatus(userId, sessionId, fingerprint.id)
  }

  return {
    notificationGenerated: guardiansNotified.length > 0,
    guardiansNotified,
    guardiansSkipped,
    sessionId,
  }
}
