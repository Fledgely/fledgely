/**
 * Create Breach Incident - Admin Callable
 *
 * Story 51.6: Breach Notification - AC1, AC4, AC5
 *
 * Admin-only callable to create a new breach incident.
 *
 * Requirements:
 * - AC1: 72-hour notification timeline
 * - AC4: Regulatory notification tracking
 * - AC5: Incident documentation
 */

import { HttpsError, onCall, type CallableRequest } from 'firebase-functions/v2/https'
import { getFirestore } from 'firebase-admin/firestore'
import * as logger from 'firebase-functions/logger'
import {
  CreateBreachIncidentInputSchema,
  BreachIncidentStatus,
  BREACH_NOTIFICATION_CONFIG,
  generateBreachIncidentId,
  type CreateBreachIncidentInput,
  type BreachIncident,
  type CreateBreachIncidentResponse,
} from '@fledgely/shared'

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

export const createBreachIncident = onCall<
  CreateBreachIncidentInput,
  Promise<CreateBreachIncidentResponse>
>(
  { maxInstances: 10 },
  async (
    request: CallableRequest<CreateBreachIncidentInput>
  ): Promise<CreateBreachIncidentResponse> => {
    // Require authentication
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Must be authenticated')
    }

    const uid = request.auth.uid

    // Check admin access
    const hasAccess = await isAdmin(uid)
    if (!hasAccess) {
      logger.warn('Unauthorized breach incident creation attempt', { uid })
      throw new HttpsError('permission-denied', 'Admin access required')
    }

    // Validate input
    const validation = CreateBreachIncidentInputSchema.safeParse(request.data)
    if (!validation.success) {
      throw new HttpsError('invalid-argument', 'Invalid input', validation.error.errors)
    }

    const input = validation.data
    const db = getFirestore()
    const now = Date.now()

    // Generate incident ID
    const incidentId = generateBreachIncidentId()

    // Calculate notification deadline (72 hours from detection)
    const userNotificationDeadline = now + BREACH_NOTIFICATION_CONFIG.NOTIFICATION_DEADLINE_MS

    // Create the incident document
    const incident: BreachIncident = {
      incidentId,
      title: input.title,
      description: input.description,
      severity: input.severity,
      status: BreachIncidentStatus.DETECTED,
      affectedDataTypes: input.affectedDataTypes,
      occurredAt: input.occurredAt,
      detectedAt: now,
      affectedUserCount: input.affectedUserCount,
      affectedFamilyIds: input.affectedFamilyIds,
      regulatoryNotificationRequired: input.regulatoryNotificationRequired,
      regulatorNotifiedAt: null,
      regulatorNotifiedBy: null,
      userNotificationDeadline,
      userNotificationsSentAt: null,
      responseActions: [
        {
          action: 'Incident created and initial assessment started',
          timestamp: now,
          performedBy: uid,
        },
      ],
      createdBy: uid,
      createdAt: now,
      resolvedAt: null,
      postIncidentReview: null,
      improvementsIdentified: [],
    }

    // Save to Firestore
    await db
      .collection(BREACH_NOTIFICATION_CONFIG.INCIDENTS_COLLECTION)
      .doc(incidentId)
      .set(incident)

    logger.info('Breach incident created', {
      adminUid: uid,
      incidentId,
      severity: input.severity,
      affectedUserCount: input.affectedUserCount,
    })

    return {
      success: true,
      incidentId,
      message: 'Breach incident created successfully',
    }
  }
)
