/**
 * Check Consent Status HTTP Endpoint
 *
 * Story 6.5: Device Consent Gate - AC1, AC2
 *
 * Allows the extension to check if there's an active consent agreement
 * for a specific child in a family. This is the server-side validation
 * that ensures monitoring cannot start without proper consent.
 *
 * Endpoint: GET /checkConsentStatus?familyId=X&childId=Y&deviceId=Z
 * - familyId: The family the device belongs to
 * - childId: The child assigned to the device
 * - deviceId: The device making the request (for validation)
 *
 * Returns:
 * - hasConsent: boolean - Whether an active agreement exists
 * - agreementId: string | null - The active agreement ID if found
 * - agreementVersion: string | null - The agreement version
 * - message: string - Human-readable status message
 */

import { onRequest } from 'firebase-functions/v2/https'
import { getFirestore } from 'firebase-admin/firestore'
import * as logger from 'firebase-functions/logger'

/**
 * Response structure for consent status check
 */
interface ConsentStatusResponse {
  hasConsent: boolean
  agreementId: string | null
  agreementVersion: string | null
  message: string
  consentStatus: 'pending' | 'granted' | 'withdrawn'
}

/**
 * Check if an active consent agreement exists for a child.
 *
 * Story 6.5: Device Consent Gate
 * - AC1: Agreement check before monitoring
 * - AC2: No agreement = no monitoring
 * - AC7: Non-negotiable consent requirement
 *
 * This endpoint is called by the extension to determine if monitoring
 * should be active. Without a valid active agreement, monitoring MUST NOT start.
 */
export const checkConsentStatus = onRequest({ cors: true }, async (req, res) => {
  // Only allow GET requests
  if (req.method !== 'GET') {
    res.status(405).json({
      error: { code: 'method-not-allowed', message: 'Method not allowed' },
    })
    return
  }

  const { familyId, childId, deviceId } = req.query

  // Validate required parameters
  if (!familyId || typeof familyId !== 'string') {
    res.status(400).json({
      error: { code: 'invalid-argument', message: 'familyId is required' },
    })
    return
  }

  if (!childId || typeof childId !== 'string') {
    res.status(400).json({
      error: { code: 'invalid-argument', message: 'childId is required' },
    })
    return
  }

  if (!deviceId || typeof deviceId !== 'string') {
    res.status(400).json({
      error: { code: 'invalid-argument', message: 'deviceId is required' },
    })
    return
  }

  const db = getFirestore()

  try {
    // Verify the device exists and belongs to the family
    const deviceRef = db.collection('families').doc(familyId).collection('devices').doc(deviceId)
    const deviceDoc = await deviceRef.get()

    if (!deviceDoc.exists) {
      res.status(404).json({
        error: { code: 'not-found', message: 'Device not found' },
      })
      return
    }

    const deviceData = deviceDoc.data()

    // Verify the device is assigned to this child
    if (deviceData?.childId !== childId) {
      // Device exists but isn't assigned to this child
      const response: ConsentStatusResponse = {
        hasConsent: false,
        agreementId: null,
        agreementVersion: null,
        message: 'Device is not assigned to this child',
        consentStatus: 'pending',
      }
      res.status(200).json({ result: response })
      return
    }

    // Query for active agreement for this child and family
    // Story 6.3: ActiveAgreements are stored at /activeAgreements/{agreementId}
    const agreementQuery = db
      .collection('activeAgreements')
      .where('childId', '==', childId)
      .where('familyId', '==', familyId)
      .where('status', '==', 'active')
      .limit(1)

    const agreementSnapshot = await agreementQuery.get()

    if (agreementSnapshot.empty) {
      // No active agreement found - consent pending
      // Story 6.5 AC2: No agreement = no monitoring
      const response: ConsentStatusResponse = {
        hasConsent: false,
        agreementId: null,
        agreementVersion: null,
        message:
          'No active family agreement found. Device monitoring will begin once your family completes and signs an agreement.',
        consentStatus: 'pending',
      }

      logger.info('Consent check: no active agreement', { familyId, childId, deviceId })
      res.status(200).json({ result: response })
      return
    }

    // Active agreement found - consent granted
    const agreementDoc = agreementSnapshot.docs[0]
    const agreementData = agreementDoc.data()

    const response: ConsentStatusResponse = {
      hasConsent: true,
      agreementId: agreementDoc.id,
      agreementVersion: agreementData.version || null,
      message: `Agreement ${agreementData.version || 'v1.0'} active`,
      consentStatus: 'granted',
    }

    logger.info('Consent check: agreement found', {
      familyId,
      childId,
      deviceId,
      agreementId: agreementDoc.id,
    })

    res.status(200).json({ result: response })
  } catch (error) {
    logger.error('Consent check failed', { error, familyId, childId, deviceId })
    res.status(500).json({
      error: { code: 'internal', message: 'Failed to check consent status' },
    })
  }
})
