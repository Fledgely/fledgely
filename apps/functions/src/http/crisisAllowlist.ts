/**
 * Crisis Allowlist HTTP Endpoint
 *
 * Story 7.2: Crisis Visit Zero-Data-Path - Task 5
 * Story 7.4: Emergency Allowlist Push - Task 3
 *
 * Public HTTP endpoint to fetch the crisis resource allowlist.
 * Used by clients to sync the allowlist with local cache.
 *
 * AC #7: Fallback to cached allowlist on network timeout
 * NFR28: Allowlist must be cached locally (fail-safe to protection)
 * FR62: Allowlist synchronized across platforms
 * FR63: Version control for sync verification
 *
 * Story 7.4 additions:
 * - Fetches dynamic entries from Firestore (crisis-allowlist-override)
 * - Merges with bundled allowlist
 * - Returns emergency version when dynamic entries exist
 */

import { onRequest } from 'firebase-functions/v2/https'
import type { Request, Response } from 'express'
import {
  getCrisisAllowlist,
  getAllowlistVersion,
  type CrisisUrlEntry,
  type CrisisAllowlist,
} from '@fledgely/shared'
import { getFirestore } from 'firebase-admin/firestore'
import { createEmergencyVersion, type EmergencyOverrideEntry } from '@fledgely/contracts'

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
 * Fetch dynamic emergency override entries from Firestore
 *
 * Story 7.4: These are entries added via emergency push mechanism.
 *
 * @returns Array of CrisisUrlEntry from emergency pushes
 */
async function fetchDynamicEntries(): Promise<{
  entries: CrisisUrlEntry[]
  latestPushId: string | null
}> {
  try {
    const db = getFirestore()
    const snapshot = await db.collection('crisis-allowlist-override').get()

    if (snapshot.empty) {
      return { entries: [], latestPushId: null }
    }

    const entries: CrisisUrlEntry[] = []
    let latestAddedAt = ''
    let latestPushId: string | null = null

    snapshot.forEach((doc) => {
      const data = doc.data() as EmergencyOverrideEntry
      entries.push(data.entry)

      // Track the latest push for version
      if (data.addedAt > latestAddedAt) {
        latestAddedAt = data.addedAt
        latestPushId = data.pushId
      }
    })

    return { entries, latestPushId }
  } catch (error) {
    // On error, return empty - bundled allowlist will be used
    console.error('Error fetching dynamic entries:', error)
    return { entries: [], latestPushId: null }
  }
}

/**
 * Merge bundled and dynamic allowlist entries
 *
 * Dynamic entries take precedence (override) if there's a domain conflict.
 *
 * @param bundled - Bundled allowlist from @fledgely/shared
 * @param dynamic - Dynamic entries from Firestore
 * @param latestPushId - Latest push ID for emergency version
 * @returns Merged allowlist with updated version
 */
function mergeAllowlists(
  bundled: CrisisAllowlist,
  dynamic: CrisisUrlEntry[],
  latestPushId: string | null
): CrisisAllowlist {
  if (dynamic.length === 0) {
    return bundled
  }

  // Create a map by domain for deduplication
  const entriesByDomain = new Map<string, CrisisUrlEntry>()

  // Add bundled entries first
  for (const entry of bundled.entries) {
    entriesByDomain.set(entry.domain, entry)
  }

  // Add dynamic entries (overrides bundled if same domain)
  for (const entry of dynamic) {
    entriesByDomain.set(entry.domain, entry)
  }

  // Create merged allowlist
  const mergedEntries = Array.from(entriesByDomain.values())

  // Use emergency version format when dynamic entries exist
  const emergencyVersion = createEmergencyVersion(bundled.version, latestPushId!)

  return {
    version: emergencyVersion,
    lastUpdated: new Date().toISOString(),
    entries: mergedEntries,
  }
}

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
      // Get bundled allowlist
      const bundledAllowlist = getCrisisAllowlist()
      const bundledVersion = getAllowlistVersion()

      // Fetch dynamic entries from Firestore (Story 7.4)
      const { entries: dynamicEntries, latestPushId } = await fetchDynamicEntries()

      // Merge bundled and dynamic entries
      const allowlist = mergeAllowlists(bundledAllowlist, dynamicEntries, latestPushId)
      const version = allowlist.version

      // Support conditional requests with ETag
      const requestETag = req.headers['if-none-match']
      if (requestETag === version) {
        res.status(304).send()
        return
      }

      // Set cache headers
      // If emergency entries exist, reduce cache time to ensure faster propagation
      const cacheMaxAge = dynamicEntries.length > 0
        ? 3600 // 1 hour for emergency updates (AC: 2 - devices receive within 1 hour)
        : CACHE_MAX_AGE_SECONDS // 24 hours normally

      res.set({
        'Cache-Control': `public, max-age=${cacheMaxAge}`,
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
  fetchDynamicEntries,
  mergeAllowlists,
}
