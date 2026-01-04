/**
 * Track Login Session Callable Function
 *
 * Story 41.5: New Login Notifications
 * - AC1: New login detection with device info
 * - AC4: All guardians notified
 * - AC6: Privacy-preserving device fingerprinting
 *
 * Called from the web app after successful authentication
 * to track the login session and trigger notifications for new devices.
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { getFirestore } from 'firebase-admin/firestore'
import * as logger from 'firebase-functions/logger'
import { trackLoginSessionInputSchema, type TrackLoginSessionOutput } from '@fledgely/shared'
import { trackLoginSession as trackSession } from '../lib/sessions/loginSessionTracker'
import { sendNewLoginNotification } from '../lib/notifications/loginNotification'

/**
 * Track a login session and send notifications if needed.
 *
 * This callable is invoked by the web app immediately after successful login.
 * It receives device info from the client (user agent, approximate IP location)
 * and creates a session record.
 *
 * If the device is new (not previously seen), notifications are sent to all
 * guardians in the family.
 */
export const trackLoginSessionCallable = onCall(
  { cors: true },
  async (request): Promise<TrackLoginSessionOutput> => {
    // Verify authentication
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Must be logged in')
    }

    const callerUid = request.auth.uid

    // Validate input
    const parseResult = trackLoginSessionInputSchema.safeParse(request.data)
    if (!parseResult.success) {
      throw new HttpsError('invalid-argument', 'Invalid input: ' + parseResult.error.message)
    }

    const { familyId, userAgent, ipAddress, approximateLocation } = parseResult.data

    const db = getFirestore()

    // Verify caller belongs to family
    const familyDoc = await db.collection('families').doc(familyId).get()
    if (!familyDoc.exists) {
      throw new HttpsError('not-found', 'Family not found')
    }

    const familyData = familyDoc.data()
    const guardianUids = familyData?.guardianUids || []
    const parentIds = familyData?.parentIds || []

    const isGuardian = guardianUids.includes(callerUid) || parentIds.includes(callerUid)
    if (!isGuardian) {
      throw new HttpsError('permission-denied', 'Not a member of this family')
    }

    // Get user display name
    const userDoc = await db.collection('users').doc(callerUid).get()
    const userData = userDoc.exists ? userDoc.data() : null
    const userDisplayName =
      userData?.displayName || userData?.name || userData?.email || 'Family Member'

    // Track the login session
    const sessionResult = await trackSession({
      userId: callerUid,
      familyId,
      userAgent,
      ipAddress,
      approximateLocation,
    })

    logger.info('Login session tracked', {
      userId: callerUid,
      sessionId: sessionResult.sessionId,
      isNewDevice: sessionResult.isNewDevice,
      isTrusted: sessionResult.isTrusted,
    })

    // Send notification if new device (not trusted)
    let notificationSent = false
    if (sessionResult.isNewDevice && !sessionResult.isTrusted) {
      try {
        const notifResult = await sendNewLoginNotification({
          userId: callerUid,
          userDisplayName,
          familyId,
          sessionId: sessionResult.sessionId,
          fingerprint: sessionResult.fingerprint,
          isNewDevice: sessionResult.isNewDevice,
        })
        notificationSent = notifResult.notificationGenerated

        logger.info('Login notification result', {
          sessionId: sessionResult.sessionId,
          notificationSent,
          guardiansNotified: notifResult.guardiansNotified.length,
        })
      } catch (error) {
        logger.error('Failed to send login notification', { error })
        // Don't fail the whole request if notification fails
      }
    }

    return {
      success: true,
      sessionId: sessionResult.sessionId,
      isNewDevice: sessionResult.isNewDevice,
      isTrusted: sessionResult.isTrusted,
      notificationSent,
      fingerprint: {
        id: sessionResult.fingerprint.id,
        deviceType: sessionResult.fingerprint.deviceType,
        browser: sessionResult.fingerprint.browser,
        os: sessionResult.fingerprint.os,
      },
    }
  }
)
