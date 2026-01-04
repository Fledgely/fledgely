/**
 * Dismiss Breach Banner - Callable
 *
 * Story 51.6: Breach Notification - AC3
 *
 * Marks a breach notification banner as dismissed for the user.
 */

import { HttpsError, onCall, type CallableRequest } from 'firebase-functions/v2/https'
import { getFirestore } from 'firebase-admin/firestore'
import * as logger from 'firebase-functions/logger'
import { BREACH_NOTIFICATION_CONFIG } from '@fledgely/shared'

interface DismissBreachBannerInput {
  notificationId: string
}

interface DismissBreachBannerResponse {
  success: boolean
}

export const dismissBreachBanner = onCall<
  DismissBreachBannerInput,
  Promise<DismissBreachBannerResponse>
>(
  { maxInstances: 20 },
  async (
    request: CallableRequest<DismissBreachBannerInput>
  ): Promise<DismissBreachBannerResponse> => {
    // Require authentication
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Must be authenticated')
    }

    const uid = request.auth.uid
    const { notificationId } = request.data

    if (!notificationId) {
      throw new HttpsError('invalid-argument', 'notificationId is required')
    }

    const db = getFirestore()

    try {
      // Get the notification
      const notificationRef = db
        .collection(BREACH_NOTIFICATION_CONFIG.NOTIFICATIONS_COLLECTION)
        .doc(notificationId)

      const notificationDoc = await notificationRef.get()

      if (!notificationDoc.exists) {
        throw new HttpsError('not-found', 'Notification not found')
      }

      const notificationData = notificationDoc.data()

      // Verify this notification belongs to the user
      if (notificationData?.uid !== uid) {
        throw new HttpsError('permission-denied', 'Access denied')
      }

      // Update the notification
      await notificationRef.update({
        bannerDismissed: true,
        bannerDismissedAt: Date.now(),
      })

      logger.info('Breach banner dismissed', {
        uid,
        notificationId,
      })

      return { success: true }
    } catch (error) {
      if (error instanceof HttpsError) {
        throw error
      }

      logger.error('Failed to dismiss breach banner', {
        uid,
        notificationId,
        error: error instanceof Error ? error.message : 'Unknown',
      })
      throw new HttpsError('internal', 'Failed to dismiss notification')
    }
  }
)
