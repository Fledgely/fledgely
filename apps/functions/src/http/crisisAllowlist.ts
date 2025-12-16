/**
 * Crisis Allowlist HTTP Endpoint
 *
 * Story 7.2: Crisis Visit Zero-Data-Path - Task 5
 *
 * Public HTTP endpoint to fetch the crisis resource allowlist.
 * Used by clients to sync the allowlist with local cache.
 *
 * AC #7: Fallback to cached allowlist on network timeout
 * NFR28: Allowlist must be cached locally (fail-safe to protection)
 * FR62: Allowlist synchronized across platforms
 * FR63: Version control for sync verification
 */

import { onRequest } from 'firebase-functions/v2/https'
import type { Request, Response } from 'express'
import { getCrisisAllowlist, getAllowlistVersion } from '@fledgely/shared'

/** Rate limiting store - simple in-memory for MVP */
const rateLimitStore = new Map<string, { count: number; resetAt: number }>()

/** Cache duration in seconds - 24 hours */
const CACHE_MAX_AGE_SECONDS = 86400

/** Rate limit retry delay in seconds */
const RATE_LIMIT_RETRY_SECONDS = 60

/** Rate limit: 1 request per minute per client */
const RATE_LIMIT_WINDOW_MS = 60 * 1000
const RATE_LIMIT_MAX_REQUESTS = 1

/**
 * Get client identifier for rate limiting
 */
function getClientId(req: Request): string {
  // Use forwarded IP if behind proxy, otherwise use connection IP
  const forwarded = req.headers['x-forwarded-for']
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim()
  }
  return req.ip || 'unknown'
}

/**
 * Check if client is rate limited
 * @returns true if request should be blocked
 */
function isRateLimited(clientId: string): boolean {
  const now = Date.now()
  const entry = rateLimitStore.get(clientId)

  // No entry - first request
  if (!entry) {
    rateLimitStore.set(clientId, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS })
    return false
  }

  // Window expired - reset
  if (now > entry.resetAt) {
    rateLimitStore.set(clientId, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS })
    return false
  }

  // Within window - check count
  if (entry.count >= RATE_LIMIT_MAX_REQUESTS) {
    return true
  }

  // Increment count
  entry.count++
  return false
}

/**
 * Clean up expired rate limit entries
 *
 * NOTE: In serverless environments like Firebase Functions, each invocation
 * is isolated, so the rateLimitStore is ephemeral. This provides basic
 * rate limiting during sustained traffic but resets on cold starts.
 * For production, consider using Firebase Realtime Database or Redis.
 */
function cleanupRateLimitStore(): void {
  const now = Date.now()
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now > entry.resetAt) {
      rateLimitStore.delete(key)
    }
  }
}

// Cleanup on each request instead of setInterval (serverless-compatible)
// setInterval doesn't work in serverless - each invocation is isolated

/**
 * HTTP Endpoint: GET /api/crisis-allowlist
 *
 * Returns the crisis resource allowlist for client synchronization.
 *
 * Response:
 * - 200 OK with allowlist JSON
 * - 405 Method Not Allowed for non-GET requests
 * - 429 Too Many Requests if rate limited
 *
 * Headers:
 * - Cache-Control: public, max-age=86400 (24h)
 * - ETag: allowlist version for conditional requests
 *
 * @example
 * ```
 * GET /api/crisis-allowlist
 *
 * Response:
 * {
 *   "version": "1.0.0-2025-12-16T00:00:00Z",
 *   "lastUpdated": "2025-12-16T00:00:00Z",
 *   "entries": [...]
 * }
 * ```
 */
export const crisisAllowlistEndpoint = onRequest(
  {
    cors: true,
    memory: '128MiB',
    // Region setting for better latency
    region: 'us-central1',
  },
  async (req: Request, res: Response) => {
    // Only allow GET requests
    if (req.method !== 'GET') {
      res.status(405).set('Allow', 'GET').send('Method not allowed')
      return
    }

    // Cleanup expired entries before checking (serverless-compatible)
    cleanupRateLimitStore()

    // Check rate limit
    const clientId = getClientId(req)
    if (isRateLimited(clientId)) {
      res.status(429).set('Retry-After', String(RATE_LIMIT_RETRY_SECONDS)).json({
        error: 'Too many requests',
        message: 'Please wait before requesting the allowlist again',
        retryAfter: RATE_LIMIT_RETRY_SECONDS,
      })
      return
    }

    try {
      const allowlist = getCrisisAllowlist()
      const version = getAllowlistVersion()

      // Support conditional requests with ETag
      const requestETag = req.headers['if-none-match']
      if (requestETag === version) {
        res.status(304).send()
        return
      }

      // Set cache headers
      res.set({
        'Cache-Control': `public, max-age=${CACHE_MAX_AGE_SECONDS}`, // 24 hours
        'ETag': version,
        'Content-Type': 'application/json',
        // Security headers
        'X-Content-Type-Options': 'nosniff',
      })

      res.json(allowlist)
    } catch (error) {
      console.error('Error fetching crisis allowlist:', error)
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to fetch crisis allowlist',
      })
    }
  }
)

/**
 * Export for testing
 * @internal
 */
export const __testing = {
  getClientId,
  isRateLimited,
  rateLimitStore,
  RATE_LIMIT_WINDOW_MS,
  RATE_LIMIT_MAX_REQUESTS,
}
