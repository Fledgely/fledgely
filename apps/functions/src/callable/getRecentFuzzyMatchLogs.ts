/**
 * Get Recent Fuzzy Match Logs Callable Function
 *
 * Story 7.5: Fuzzy Domain Matching - Task 8
 *
 * Returns recent fuzzy match logs for admin review.
 * Requires admin authentication.
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { getRecentFuzzyMatchLogs } from '../services/fuzzyMatchLogService'
import type { FuzzyMatchLog } from '@fledgely/contracts'

interface GetRecentFuzzyMatchLogsRequest {
  limit?: number
}

interface GetRecentFuzzyMatchLogsResponse {
  logs: FuzzyMatchLog[]
}

export const getRecentFuzzyMatchLogsFn = onCall<
  GetRecentFuzzyMatchLogsRequest,
  Promise<GetRecentFuzzyMatchLogsResponse>
>(
  {
    maxInstances: 10,
    region: 'us-central1',
  },
  async (request) => {
    // Check authentication
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Authentication required')
    }

    // Check admin role
    const isAdmin = request.auth.token.admin === true
    if (!isAdmin) {
      throw new HttpsError('permission-denied', 'Admin access required')
    }

    try {
      const limit = request.data?.limit ?? 50
      const logs = await getRecentFuzzyMatchLogs(limit)

      return { logs }
    } catch (error) {
      console.error('[getRecentFuzzyMatchLogs] Error:', error)
      throw new HttpsError('internal', 'Failed to fetch fuzzy match logs')
    }
  }
)
