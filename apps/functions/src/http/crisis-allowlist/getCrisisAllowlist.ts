/**
 * Get Crisis Allowlist HTTP Endpoint
 *
 * Story 7.4: Emergency Allowlist Push
 *
 * Public endpoint for fetching the current crisis allowlist.
 * CRITICAL: This endpoint has NO authentication requirement for fail-safe
 * crisis protection. Even if auth fails, devices MUST be able to get the allowlist.
 *
 * AC1: API Endpoint for Allowlist Distribution
 * AC7: Dynamic Fetch (No App Update)
 *
 * FR61: System maintains a public crisis allowlist
 * NFR28: Crisis allowlist cached locally; functions without cloud connectivity
 */

import { onRequest } from 'firebase-functions/v2/https'
import * as logger from 'firebase-functions/logger'
import { getCurrentAllowlist } from '../../services/crisisAllowlistService'

/**
 * HTTP endpoint to get the current crisis allowlist
 *
 * GET /api/crisis-allowlist
 *
 * Response: {
 *   version: string,
 *   lastUpdated: string (ISO),
 *   resources: CrisisResource[]
 * }
 *
 * Security: PUBLIC (no auth) - fail-safe for crisis protection
 * Cache: 1 hour max-age, stale-while-revalidate 24 hours
 *
 * PRIVACY: This endpoint NEVER logs which user/family requested the allowlist.
 * Only logs generic access metrics for monitoring.
 */
export const getCrisisAllowlist = onRequest(
  {
    cors: true, // Allow cross-origin for extension access
    memory: '256MiB',
    timeoutSeconds: 30,
    region: 'us-central1',
  },
  async (req, res) => {
    // Allow both GET and POST for flexibility
    if (req.method !== 'GET' && req.method !== 'POST') {
      res.status(405).json({ error: 'Method not allowed' })
      return
    }

    try {
      // Get current allowlist (from Firestore or bundled defaults)
      const allowlist = await getCurrentAllowlist()

      // Set cache headers for CDN and client caching
      // AC3: Online devices receive update within 1 hour
      res.set('Cache-Control', 'public, max-age=3600, stale-while-revalidate=86400')
      res.set('ETag', `"${allowlist.version}"`)

      // Check If-None-Match for conditional requests
      const ifNoneMatch = req.headers['if-none-match']
      if (ifNoneMatch === `"${allowlist.version}"`) {
        res.status(304).end()
        return
      }

      // Log access (NO PII - just metrics)
      logger.info('Crisis allowlist served', {
        version: allowlist.version,
        resourceCount: allowlist.resources.length,
        method: req.method,
      })

      res.status(200).json(allowlist)
    } catch (error) {
      // Even on error, try to return bundled defaults
      // This is a fail-safe - crisis protection must always work
      logger.error('Error serving crisis allowlist', { error })

      // Import bundled defaults directly as fallback
      try {
        const { CRISIS_RESOURCES, CRISIS_ALLOWLIST_VERSION } = await import('@fledgely/shared')

        res.status(200).json({
          version: CRISIS_ALLOWLIST_VERSION,
          lastUpdated: new Date().toISOString(),
          resources: CRISIS_RESOURCES,
        })
      } catch {
        // Ultimate fallback - this should never happen
        res.status(500).json({ error: 'Crisis allowlist unavailable' })
      }
    }
  }
)
