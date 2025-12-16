/**
 * Get Fuzzy Match Stats Callable Function
 *
 * Story 7.5: Fuzzy Domain Matching - Task 8
 *
 * Returns aggregated fuzzy match statistics for admin review.
 * Requires admin authentication.
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { getFuzzyMatchStats } from '../services/fuzzyMatchLogService'

interface GetFuzzyMatchStatsRequest {
  limit?: number
}

interface GetFuzzyMatchStatsResponse {
  stats: Array<{
    inputDomain: string
    matchedDomain: string
    avgDistance: number
    count: number
    firstSeen: string
    lastSeen: string
  }>
}

export const getFuzzyMatchStatsFn = onCall<
  GetFuzzyMatchStatsRequest,
  Promise<GetFuzzyMatchStatsResponse>
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
      const stats = await getFuzzyMatchStats(limit)

      return { stats }
    } catch (error) {
      console.error('[getFuzzyMatchStats] Error:', error)
      throw new HttpsError('internal', 'Failed to fetch fuzzy match stats')
    }
  }
)
