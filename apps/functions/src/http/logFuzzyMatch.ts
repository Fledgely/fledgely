/**
 * Log Fuzzy Match HTTP Endpoint
 *
 * Story 7.5: Fuzzy Domain Matching - Task 6
 *
 * POST /api/log-fuzzy-match
 *
 * Accepts anonymous fuzzy match logs for allowlist improvement.
 * NO authentication required - logs are completely anonymous.
 */

import { onRequest } from 'firebase-functions/v2/https'
import { fuzzyMatchLogInputSchema, type FuzzyMatchLogInput } from '@fledgely/contracts'
import { logFuzzyMatch } from '../services/fuzzyMatchLogService'

/**
 * Extract client IP from request
 */
function getClientIp(request: { ip?: string; headers: Record<string, string | string[] | undefined> }): string {
  // Try x-forwarded-for first (for proxies/load balancers)
  const forwarded = request.headers['x-forwarded-for']
  if (forwarded) {
    const ips = (Array.isArray(forwarded) ? forwarded[0] : forwarded).split(',')
    return ips[0].trim()
  }

  // Fall back to direct IP
  return request.ip || '0.0.0.0'
}

/**
 * HTTP endpoint to log fuzzy matches
 *
 * @route POST /api/log-fuzzy-match
 * @body {FuzzyMatchLogInput}
 * @returns {object} { success: boolean, logId?: string, error?: string }
 */
export const logFuzzyMatchEndpoint = onRequest(
  {
    cors: true,
    maxInstances: 10,
    region: 'us-central1',
  },
  async (request, response) => {
    // Only allow POST
    if (request.method !== 'POST') {
      response.status(405).json({ success: false, error: 'Method not allowed' })
      return
    }

    try {
      // Parse and validate input
      const validationResult = fuzzyMatchLogInputSchema.safeParse(request.body)
      if (!validationResult.success) {
        response.status(400).json({
          success: false,
          error: `Invalid input: ${validationResult.error.message}`,
        })
        return
      }

      const input: FuzzyMatchLogInput = validationResult.data
      const clientIp = getClientIp(request)

      // Log the fuzzy match
      const result = await logFuzzyMatch(input, clientIp)

      if (result.success) {
        response.status(200).json({
          success: true,
          logId: result.logId,
        })
      } else {
        // Rate limit exceeded returns 429
        if (result.error?.includes('Rate limit')) {
          response.status(429).json({
            success: false,
            error: result.error,
          })
        } else {
          response.status(400).json({
            success: false,
            error: result.error,
          })
        }
      }
    } catch (error) {
      console.error('[logFuzzyMatch] Error:', error)
      response.status(500).json({
        success: false,
        error: 'Internal server error',
      })
    }
  }
)
