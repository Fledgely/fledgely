/**
 * Get Profile Changes - Callable
 *
 * Story 51.8: Right to Rectification - AC4
 *
 * Retrieves the audit trail of profile changes for a user.
 */

import { HttpsError, onCall, type CallableRequest } from 'firebase-functions/v2/https'
import { getFirestore } from 'firebase-admin/firestore'
import * as logger from 'firebase-functions/logger'
import {
  RECTIFICATION_CONFIG,
  type ProfileChangeLog,
  type GetProfileChangesResponse,
} from '@fledgely/shared'

export const getProfileChanges = onCall<
  { limit?: number; offset?: number },
  Promise<GetProfileChangesResponse>
>(
  { maxInstances: 20 },
  async (
    request: CallableRequest<{ limit?: number; offset?: number }>
  ): Promise<GetProfileChangesResponse> => {
    // Require authentication
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Must be authenticated')
    }

    const uid = request.auth.uid
    const db = getFirestore()
    const limit = Math.min(request.data?.limit || 50, 100)
    const offset = request.data?.offset || 0

    try {
      // Get user info to verify they exist
      const userDoc = await db.collection('users').doc(uid).get()
      if (!userDoc.exists) {
        throw new HttpsError('not-found', 'User not found')
      }

      // Query audit logs for this user
      const logsQuery = db
        .collection(RECTIFICATION_CONFIG.AUDIT_LOG_COLLECTION)
        .where('uid', '==', uid)
        .orderBy('changedAt', 'desc')
        .limit(limit + 1) // Get one extra to check if there are more

      // Execute query
      const logsSnapshot = await logsQuery.get()

      // Process results
      const changes: ProfileChangeLog[] = []
      let count = 0

      logsSnapshot.docs.forEach((doc, index) => {
        // Skip if before offset
        if (index < offset) {
          return
        }
        // Stop if we've reached limit
        if (count >= limit) {
          return
        }
        count++
        changes.push(doc.data() as ProfileChangeLog)
      })

      // Get total count (separate query for efficiency with small datasets)
      const countQuery = db
        .collection(RECTIFICATION_CONFIG.AUDIT_LOG_COLLECTION)
        .where('uid', '==', uid)
      const countSnapshot = await countQuery.count().get()
      const total = countSnapshot.data().count

      logger.info('Profile changes retrieved', {
        uid,
        count: changes.length,
        total,
      })

      return {
        changes,
        total,
      }
    } catch (error) {
      if (error instanceof HttpsError) {
        throw error
      }

      logger.error('Failed to get profile changes', {
        uid,
        error: error instanceof Error ? error.message : 'Unknown',
      })
      throw new HttpsError('internal', 'Failed to retrieve profile changes')
    }
  }
)
