/**
 * Get Session History - Callable
 *
 * Story 51.7: Privacy Dashboard - AC7
 *
 * Returns login session history for the authenticated user.
 * Provides security visibility into account access.
 */

import { HttpsError, onCall, type CallableRequest } from 'firebase-functions/v2/https'
import { getFirestore } from 'firebase-admin/firestore'
import * as logger from 'firebase-functions/logger'
import { type SessionInfo, type GetSessionHistoryResponse } from '@fledgely/shared'

export const getSessionHistory = onCall<Record<string, never>, Promise<GetSessionHistoryResponse>>(
  { maxInstances: 20 },
  async (request: CallableRequest<Record<string, never>>): Promise<GetSessionHistoryResponse> => {
    // Require authentication
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Must be authenticated')
    }

    const uid = request.auth.uid
    const db = getFirestore()

    try {
      // Get session history from user's sessions subcollection
      const sessionsQuery = await db
        .collection('users')
        .doc(uid)
        .collection('sessions')
        .orderBy('loginAt', 'desc')
        .limit(20)
        .get()

      const sessions: SessionInfo[] = []

      for (const doc of sessionsQuery.docs) {
        const data = doc.data()

        sessions.push({
          sessionId: doc.id,
          deviceType: data.deviceType || 'web',
          clientName: data.clientName || 'Unknown Browser',
          ipAddress: maskIpAddress(data.ipAddress || '0.0.0.0'),
          location: data.location || null,
          loginAt: data.loginAt || Date.now(),
          lastActiveAt: data.lastActiveAt || data.loginAt || Date.now(),
          isCurrent: doc.id === request.auth?.token?.sessionId,
        })
      }

      // If no sessions exist, create a placeholder for current session
      if (sessions.length === 0) {
        const now = Date.now()
        sessions.push({
          sessionId: 'current',
          deviceType: 'web',
          clientName: 'Current Session',
          ipAddress: '***.***.***',
          location: null,
          loginAt: now,
          lastActiveAt: now,
          isCurrent: true,
        })
      }

      return {
        sessions,
        totalSessions: sessions.length,
      }
    } catch (error) {
      logger.error('Failed to get session history', {
        uid,
        error: error instanceof Error ? error.message : 'Unknown',
      })
      throw new HttpsError('internal', 'Failed to get session history')
    }
  }
)

/**
 * Mask IP address for privacy (show only first octet).
 */
function maskIpAddress(ip: string): string {
  if (!ip || ip === '0.0.0.0') {
    return '***.***.***'
  }

  const parts = ip.split('.')
  if (parts.length === 4) {
    return `${parts[0]}.***.***`
  }

  // IPv6 or other format
  return '***'
}
