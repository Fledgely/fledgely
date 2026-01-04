/**
 * Cloud Function for handling email unsubscribe requests.
 *
 * Story 41.6: Notification Delivery Channels - AC6
 *
 * Follows the Cloud Functions Template pattern:
 * 1. No auth required (public endpoint with JWT token)
 * 2. Validation - verify token format
 * 3. Token verification - validate JWT signature and expiry
 * 4. Business logic - update channel preferences
 *
 * Security notes:
 * - Security notification types cannot be unsubscribed
 * - Token is time-limited (24 hours)
 * - Token is signed with server secret
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { getFirestore } from 'firebase-admin/firestore'
import { z } from 'zod'
import * as logger from 'firebase-functions/logger'
import {
  handleUnsubscribeInputSchema,
  type HandleUnsubscribeOutput,
  type NotificationType,
  isSecurityNotificationType,
} from '@fledgely/shared'
import { validateUnsubscribeToken } from '../lib/email'

// Lazy Firestore initialization
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
 * Handle email unsubscribe request.
 *
 * This is a public endpoint (no auth required) that accepts a JWT token
 * from the email unsubscribe link.
 *
 * The token contains:
 * - userId: User to unsubscribe
 * - notificationType: Type of notification to unsubscribe from
 * - exp: Token expiration timestamp
 */
export const handleUnsubscribe = onCall<
  z.infer<typeof handleUnsubscribeInputSchema>,
  Promise<HandleUnsubscribeOutput>
>(async (request) => {
  // 1. Validation
  const parseResult = handleUnsubscribeInputSchema.safeParse(request.data)
  if (!parseResult.success) {
    logger.warn('Invalid unsubscribe request', { error: parseResult.error })
    throw new HttpsError('invalid-argument', 'Invalid request: token is required')
  }

  const { token } = parseResult.data

  // 2. Token verification
  const payload = validateUnsubscribeToken(token)
  if (!payload) {
    logger.warn('Invalid or expired unsubscribe token')
    return {
      success: false,
      message:
        'This unsubscribe link has expired or is invalid. Please use a newer link from your email.',
    }
  }

  const { userId, notificationType } = payload

  // 3. Security check - prevent unsubscribing from security notifications
  if (isSecurityNotificationType(notificationType)) {
    logger.warn('Attempted to unsubscribe from security notification', {
      userId,
      notificationType,
    })
    return {
      success: false,
      message:
        'Security notifications cannot be disabled. These notifications keep your account safe.',
      notificationType,
    }
  }

  // 4. Update channel preferences
  try {
    const prefsRef = getDb()
      .collection('users')
      .doc(userId)
      .collection('settings')
      .doc('channelPreferences')

    const prefsDoc = await prefsRef.get()
    const currentPrefs = prefsDoc.exists ? prefsDoc.data() : {}

    // Get current settings for this notification type or defaults
    const currentSettings = currentPrefs?.[notificationType] || {
      push: true,
      email: true,
      sms: false,
    }

    // Disable email for this notification type
    const updatedSettings = {
      ...currentSettings,
      email: false,
    }

    await prefsRef.set(
      {
        [notificationType]: updatedSettings,
      },
      { merge: true }
    )

    logger.info('User unsubscribed from email notifications', {
      userId,
      notificationType,
    })

    return {
      success: true,
      message: `You have been unsubscribed from ${formatNotificationType(notificationType)} email notifications.`,
      notificationType,
    }
  } catch (error) {
    logger.error('Failed to update unsubscribe preferences', {
      userId,
      notificationType,
      error,
    })
    throw new HttpsError('internal', 'Failed to update notification preferences. Please try again.')
  }
})

/**
 * Format notification type for user-friendly display.
 */
function formatNotificationType(type: NotificationType): string {
  const labels: Record<NotificationType, string> = {
    criticalFlags: 'critical flag',
    timeLimitWarnings: 'time limit warning',
    deviceSyncAlerts: 'device sync',
    loginAlerts: 'login alert',
    flagDigest: 'flag digest',
    extensionRequest: 'extension request',
    agreementChange: 'agreement change',
  }
  return labels[type] || type
}
