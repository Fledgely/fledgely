/**
 * Update Breach Incident - Admin Callable
 *
 * Story 51.6: Breach Notification - AC1, AC2, AC3, AC4, AC5, AC7
 *
 * Admin-only callable to update breach incident status,
 * trigger notifications, and document response actions.
 *
 * Requirements:
 * - AC1: 72-hour notification timeline
 * - AC2: Notification content (what affected, when, what to do)
 * - AC3: Multi-channel notification (email, in-app)
 * - AC4: Regulatory notification tracking
 * - AC5: Incident documentation
 * - AC7: Post-incident review
 */

import { HttpsError, onCall, type CallableRequest } from 'firebase-functions/v2/https'
import { getFirestore } from 'firebase-admin/firestore'
import * as logger from 'firebase-functions/logger'
import {
  BreachIncidentSchema,
  BreachIncidentStatus,
  UpdateBreachIncidentInputSchema,
  BREACH_NOTIFICATION_CONFIG,
  type BreachIncident,
  type UpdateBreachIncidentInput,
  type UpdateBreachIncidentResponse,
  type BreachUserNotification,
  UserNotificationStatus,
} from '@fledgely/shared'
import { sendBreachNotificationEmail } from '../../lib/email/templates/breachNotificationEmail'

/**
 * Check if user has admin role.
 */
async function isAdmin(uid: string): Promise<boolean> {
  const db = getFirestore()
  const userDoc = await db.collection('users').doc(uid).get()
  if (!userDoc.exists) return false

  const userData = userDoc.data()
  const role = userData?.role

  return role === 'admin'
}

/**
 * Get users from affected families.
 */
async function getAffectedUsers(
  familyIds: string[]
): Promise<Array<{ uid: string; email: string; familyId: string }>> {
  const db = getFirestore()
  const users: Array<{ uid: string; email: string; familyId: string }> = []

  for (const familyId of familyIds) {
    const familyDoc = await db.collection('families').doc(familyId).get()
    if (!familyDoc.exists) continue

    const familyData = familyDoc.data()
    const memberIds = familyData?.memberIds || []

    for (const memberId of memberIds) {
      const userDoc = await db.collection('users').doc(memberId).get()
      if (!userDoc.exists) continue

      const userData = userDoc.data()
      if (userData?.email) {
        users.push({
          uid: memberId,
          email: userData.email,
          familyId,
        })
      }
    }
  }

  return users
}

export const updateBreachIncident = onCall<
  UpdateBreachIncidentInput,
  Promise<UpdateBreachIncidentResponse>
>(
  { maxInstances: 10 },
  async (
    request: CallableRequest<UpdateBreachIncidentInput>
  ): Promise<UpdateBreachIncidentResponse> => {
    // Require authentication
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Must be authenticated')
    }

    const uid = request.auth.uid

    // Check admin access
    const hasAccess = await isAdmin(uid)
    if (!hasAccess) {
      logger.warn('Unauthorized breach incident update attempt', { uid })
      throw new HttpsError('permission-denied', 'Admin access required')
    }

    // Validate input
    const validation = UpdateBreachIncidentInputSchema.safeParse(request.data)
    if (!validation.success) {
      throw new HttpsError('invalid-argument', 'Invalid input', validation.error.errors)
    }

    const input = validation.data
    const db = getFirestore()
    const now = Date.now()

    // Get existing incident
    const incidentRef = db
      .collection(BREACH_NOTIFICATION_CONFIG.INCIDENTS_COLLECTION)
      .doc(input.incidentId)
    const incidentDoc = await incidentRef.get()

    if (!incidentDoc.exists) {
      throw new HttpsError('not-found', 'Incident not found')
    }

    const incidentValidation = BreachIncidentSchema.safeParse(incidentDoc.data())
    if (!incidentValidation.success) {
      throw new HttpsError('internal', 'Invalid incident data')
    }

    const existingIncident: BreachIncident = incidentValidation.data

    // Build update object
    const updates: Partial<BreachIncident> = {}
    const newResponseActions = [...existingIncident.responseActions]

    // Update status if provided
    if (input.status) {
      updates.status = input.status

      // Handle resolved status
      if (input.status === BreachIncidentStatus.RESOLVED) {
        updates.resolvedAt = now
      }

      newResponseActions.push({
        action: `Status changed to ${input.status}`,
        timestamp: now,
        performedBy: uid,
      })
    }

    // Handle regulatory notification
    if (input.regulatorNotified && !existingIncident.regulatorNotifiedAt) {
      updates.regulatorNotifiedAt = now
      updates.regulatorNotifiedBy = uid

      newResponseActions.push({
        action: 'Regulatory authority notified per GDPR Article 33',
        timestamp: now,
        performedBy: uid,
      })
    }

    // Handle response action
    if (input.responseAction) {
      newResponseActions.push({
        action: input.responseAction,
        timestamp: now,
        performedBy: uid,
      })
    }

    // Handle post-incident review (AC7)
    if (input.postIncidentReview) {
      updates.postIncidentReview = input.postIncidentReview

      newResponseActions.push({
        action: 'Post-incident review documented',
        timestamp: now,
        performedBy: uid,
      })
    }

    // Handle improvement
    if (input.improvement) {
      const existingImprovements = existingIncident.improvementsIdentified || []
      updates.improvementsIdentified = [...existingImprovements, input.improvement]
    }

    updates.responseActions = newResponseActions

    // Handle user notifications (AC2, AC3)
    if (input.sendUserNotifications && existingIncident.affectedFamilyIds?.length) {
      try {
        const affectedUsers = await getAffectedUsers(existingIncident.affectedFamilyIds)

        let emailsSent = 0
        let emailsFailed = 0

        for (const user of affectedUsers) {
          // Create notification record
          const notificationId = `${existingIncident.incidentId}-${user.uid}`
          const notification: BreachUserNotification = {
            notificationId,
            incidentId: existingIncident.incidentId,
            familyId: user.familyId,
            uid: user.uid,
            email: user.email,
            status: UserNotificationStatus.PENDING,
            emailSentAt: null,
            acknowledgedAt: null,
            bannerDismissed: false,
            bannerDismissedAt: null,
          }

          // Send email notification
          try {
            await sendBreachNotificationEmail({
              to: user.email,
              incidentTitle: existingIncident.title,
              affectedDataTypes: existingIncident.affectedDataTypes,
              occurredAt: existingIncident.occurredAt,
              description: existingIncident.description,
            })

            notification.status = UserNotificationStatus.EMAIL_SENT
            notification.emailSentAt = Date.now()
            emailsSent++
          } catch (emailError) {
            notification.status = UserNotificationStatus.EMAIL_FAILED
            emailsFailed++

            logger.error('Failed to send breach notification email', {
              incidentId: existingIncident.incidentId,
              uid: user.uid,
              error: emailError instanceof Error ? emailError.message : 'Unknown',
            })
          }

          // Save notification record
          await db
            .collection(BREACH_NOTIFICATION_CONFIG.NOTIFICATIONS_COLLECTION)
            .doc(notificationId)
            .set(notification)
        }

        updates.userNotificationsSentAt = now
        updates.status = BreachIncidentStatus.NOTIFIED

        newResponseActions.push({
          action: `User notifications sent: ${emailsSent} successful, ${emailsFailed} failed`,
          timestamp: now,
          performedBy: uid,
        })

        logger.info('Breach notifications sent', {
          incidentId: existingIncident.incidentId,
          emailsSent,
          emailsFailed,
          totalAffected: affectedUsers.length,
        })
      } catch (notifyError) {
        logger.error('Failed to process user notifications', {
          incidentId: existingIncident.incidentId,
          error: notifyError instanceof Error ? notifyError.message : 'Unknown',
        })
        throw new HttpsError('internal', 'Failed to send user notifications')
      }
    }

    // Update the incident
    await incidentRef.update(updates)

    logger.info('Breach incident updated', {
      adminUid: uid,
      incidentId: input.incidentId,
      updates: Object.keys(updates),
    })

    return {
      success: true,
      message: 'Incident updated successfully',
    }
  }
)
