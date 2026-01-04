/**
 * Get User Breach Notifications - Callable
 *
 * Story 51.6: Breach Notification - AC3
 *
 * Returns breach notifications for the authenticated user.
 * Used by the in-app banner component.
 */

import { HttpsError, onCall, type CallableRequest } from 'firebase-functions/v2/https'
import { getFirestore } from 'firebase-admin/firestore'
import * as logger from 'firebase-functions/logger'
import {
  BREACH_NOTIFICATION_CONFIG,
  BreachIncidentSchema,
  BreachUserNotificationSchema,
  type BreachSeverityValue,
  type AffectedDataTypeValue,
} from '@fledgely/shared'

interface BreachNotificationData {
  notificationId: string
  incidentId: string
  incidentTitle: string
  severity: BreachSeverityValue
  affectedDataTypes: AffectedDataTypeValue[]
  occurredAt: number
  bannerDismissed: boolean
}

interface GetUserBreachNotificationsResponse {
  notifications: BreachNotificationData[]
}

export const getUserBreachNotifications = onCall<
  Record<string, never>,
  Promise<GetUserBreachNotificationsResponse>
>(
  { maxInstances: 20 },
  async (
    request: CallableRequest<Record<string, never>>
  ): Promise<GetUserBreachNotificationsResponse> => {
    // Require authentication
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Must be authenticated')
    }

    const uid = request.auth.uid
    const db = getFirestore()

    try {
      // Get notifications for this user
      const notificationsQuery = await db
        .collection(BREACH_NOTIFICATION_CONFIG.NOTIFICATIONS_COLLECTION)
        .where('uid', '==', uid)
        .orderBy('emailSentAt', 'desc')
        .limit(10)
        .get()

      if (notificationsQuery.empty) {
        return { notifications: [] }
      }

      const notifications: BreachNotificationData[] = []

      for (const doc of notificationsQuery.docs) {
        const notificationValidation = BreachUserNotificationSchema.safeParse(doc.data())
        if (!notificationValidation.success) {
          logger.warn('Invalid notification data', { docId: doc.id })
          continue
        }

        const notification = notificationValidation.data

        // Get the incident details
        const incidentDoc = await db
          .collection(BREACH_NOTIFICATION_CONFIG.INCIDENTS_COLLECTION)
          .doc(notification.incidentId)
          .get()

        if (!incidentDoc.exists) {
          continue
        }

        const incidentValidation = BreachIncidentSchema.safeParse(incidentDoc.data())
        if (!incidentValidation.success) {
          continue
        }

        const incident = incidentValidation.data

        notifications.push({
          notificationId: notification.notificationId,
          incidentId: incident.incidentId,
          incidentTitle: incident.title,
          severity: incident.severity,
          affectedDataTypes: incident.affectedDataTypes,
          occurredAt: incident.occurredAt,
          bannerDismissed: notification.bannerDismissed,
        })
      }

      return { notifications }
    } catch (error) {
      logger.error('Failed to get user breach notifications', {
        uid,
        error: error instanceof Error ? error.message : 'Unknown',
      })
      throw new HttpsError('internal', 'Failed to get notifications')
    }
  }
)
