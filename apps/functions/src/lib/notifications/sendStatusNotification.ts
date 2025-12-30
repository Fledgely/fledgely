/**
 * Send status change notifications to family guardians
 *
 * Story 19A.4: Status Push Notifications (AC: #2, #3, #6)
 *
 * Features:
 * - Fetches all guardian FCM tokens for a family
 * - Sends notification via Firebase Cloud Messaging
 * - Handles stale token cleanup on send failure
 */

import { getFirestore } from 'firebase-admin/firestore'
import { getMessaging } from 'firebase-admin/messaging'
import { StatusTransition, NotificationToken } from './statusTypes'
import { buildStatusNotification } from './buildStatusNotification'
import { shouldSendNotification, updateThrottleTimestamp } from './notificationThrottle'

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
 * Parameters for sending a status notification
 */
export interface SendStatusNotificationParams {
  familyId: string
  childId: string
  childName: string
  transition: StatusTransition
  deviceName?: string
  issueDescription?: string
}

/**
 * Result of sending notifications
 */
export interface SendNotificationResult {
  sent: boolean
  successCount: number
  failureCount: number
  throttled: boolean
  tokensCleanedUp: number
}

/**
 * Get all FCM tokens for guardians of a family
 */
async function getGuardianTokens(
  familyId: string
): Promise<{ userId: string; tokenId: string; token: string }[]> {
  const familyRef = getDb().collection('families').doc(familyId)
  const family = await familyRef.get()

  if (!family.exists) {
    return []
  }

  const guardianUids: string[] = family.data()?.guardianUids || []

  // Fetch tokens for all guardians in parallel (fixes N+1 query)
  const tokenPromises = guardianUids.map(async (uid) => {
    const tokensRef = getDb().collection('users').doc(uid).collection('notificationTokens')
    const tokenDocs = await tokensRef.get()

    return tokenDocs.docs
      .map((doc) => {
        const data = doc.data() as NotificationToken
        if (data.token) {
          return {
            userId: uid,
            tokenId: doc.id,
            token: data.token,
          }
        }
        return null
      })
      .filter((t): t is { userId: string; tokenId: string; token: string } => t !== null)
  })

  const tokenArrays = await Promise.all(tokenPromises)
  return tokenArrays.flat()
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
    console.log(`[FCM] Removed stale token ${tokenId} for user ${userId}`)
  } catch (error) {
    console.error(`[FCM] Failed to remove stale token:`, error)
  }
}

/**
 * Send a status change notification to all guardians in a family
 *
 * @param params - Notification parameters
 * @returns Result with success/failure counts
 */
export async function sendStatusNotification(
  params: SendStatusNotificationParams
): Promise<SendNotificationResult> {
  const { familyId, childId, childName, transition, deviceName, issueDescription } = params

  // Check throttle first
  const canSend = await shouldSendNotification(familyId, childId, transition)

  if (!canSend) {
    console.log(`[FCM] Notification throttled for child ${childId}`)
    return {
      sent: false,
      successCount: 0,
      failureCount: 0,
      throttled: true,
      tokensCleanedUp: 0,
    }
  }

  // Get all guardian tokens
  const tokens = await getGuardianTokens(familyId)

  if (tokens.length === 0) {
    console.log(`[FCM] No tokens found for family ${familyId}`)
    return {
      sent: false,
      successCount: 0,
      failureCount: 0,
      throttled: false,
      tokensCleanedUp: 0,
    }
  }

  // Build notification content
  const content = buildStatusNotification(
    transition,
    childName,
    deviceName,
    issueDescription,
    familyId,
    childId
  )

  // Send to all tokens using sendEachForMulticast
  const messaging = getMessaging()
  const appUrl = process.env.APP_URL || 'https://app.fledgely.com'
  const response = await messaging.sendEachForMulticast({
    tokens: tokens.map((t) => t.token),
    notification: {
      title: content.title,
      body: content.body,
    },
    data: content.data,
    webpush: {
      fcmOptions: {
        link: `${appUrl}/dashboard?childId=${childId}`,
      },
    },
  })

  // Handle failures and clean up stale tokens
  let tokensCleanedUp = 0

  if (response.failureCount > 0) {
    const cleanupPromises: Promise<void>[] = []

    response.responses.forEach((resp, idx) => {
      if (!resp.success && resp.error) {
        const errorCode = resp.error.code

        // Clean up invalid/expired tokens
        if (
          errorCode === 'messaging/registration-token-not-registered' ||
          errorCode === 'messaging/invalid-registration-token'
        ) {
          const tokenInfo = tokens[idx]
          cleanupPromises.push(removeStaleToken(tokenInfo.userId, tokenInfo.tokenId))
          tokensCleanedUp++
        } else {
          console.error(`[FCM] Send error:`, resp.error)
        }
      }
    })

    await Promise.all(cleanupPromises)
  }

  // Update throttle timestamp on successful send
  if (response.successCount > 0) {
    await updateThrottleTimestamp(familyId, childId, transition)
  }

  console.log(
    `[FCM] Sent notification: ${response.successCount} success, ${response.failureCount} failures, ${tokensCleanedUp} cleaned`
  )

  return {
    sent: response.successCount > 0,
    successCount: response.successCount,
    failureCount: response.failureCount,
    throttled: false,
    tokensCleanedUp,
  }
}
