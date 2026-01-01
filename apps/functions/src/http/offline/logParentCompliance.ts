/**
 * Log Parent Compliance HTTP Endpoint
 * Story 32.4: Parent Compliance Tracking
 *
 * Records parent device compliance during offline time windows.
 * Called by Chrome extension when offline window ends.
 *
 * Follows Cloud Functions Template pattern:
 * 1. Validation (FIRST) - validate request body
 * 2. Permission (SECOND) - verify family/parent exists
 * 3. Business logic (LAST) - save compliance record to Firestore
 *
 * AC1: Parent Compliance Logging
 * - Stores compliance status in Firestore subcollection
 * - Records activity events during offline window
 */

import { onRequest } from 'firebase-functions/v2/https'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import * as logger from 'firebase-functions/logger'
import { parentComplianceRecordSchema } from '@fledgely/shared'

/**
 * Request body schema - uses shared schema
 */
const logParentComplianceRequestSchema = parentComplianceRecordSchema

/**
 * HTTP endpoint to log parent compliance record
 */
export const logParentCompliance = onRequest(
  {
    cors: true,
    memory: '256MiB',
    timeoutSeconds: 30,
    region: 'us-central1',
  },
  async (req, res) => {
    // Only allow POST
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method not allowed' })
      return
    }

    try {
      // 1. Validate request body
      const parseResult = logParentComplianceRequestSchema.safeParse(req.body)
      if (!parseResult.success) {
        logger.warn('Invalid logParentCompliance request', {
          errors: parseResult.error.flatten(),
        })
        res.status(400).json({
          error: 'Invalid request',
          details: parseResult.error.flatten().fieldErrors,
        })
        return
      }

      const record = parseResult.data

      // 2. Verify family exists (basic permission check)
      const db = getFirestore()
      const familyDoc = await db.collection('families').doc(record.familyId).get()

      if (!familyDoc.exists) {
        logger.warn('Family not found for compliance logging', {
          familyId: record.familyId,
        })
        res.status(404).json({ error: 'Family not found' })
        return
      }

      // 3. Save compliance record to Firestore
      // Collection: families/{familyId}/parentCompliance/{autoId}
      const complianceRef = db
        .collection('families')
        .doc(record.familyId)
        .collection('parentCompliance')
        .doc()

      await complianceRef.set({
        ...record,
        id: complianceRef.id,
        serverCreatedAt: FieldValue.serverTimestamp(),
      })

      logger.info('Parent compliance record saved', {
        familyId: record.familyId,
        parentUid: record.parentUid,
        wasCompliant: record.wasCompliant,
        activityCount: record.activityEvents.length,
        recordId: complianceRef.id,
      })

      res.status(200).json({
        success: true,
        recordId: complianceRef.id,
      })
    } catch (error) {
      logger.error('Failed to log parent compliance', { error })
      res.status(500).json({ error: 'Internal server error' })
    }
  }
)
