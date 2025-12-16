/**
 * Allowlist Sync Status HTTP Endpoint
 *
 * Story 7.7: Allowlist Distribution & Sync - Task 9
 *
 * HTTP endpoints for platforms to report their allowlist sync status
 * and for admins to view sync status across all platforms.
 *
 * POST /api/allowlist-sync-status - Report platform sync status
 * GET /api/allowlist-sync-status - Get all platform sync statuses (admin)
 *
 * NOTE: This endpoint does NOT log any user data or URLs - only platform
 * sync information (platform name, version, cache age).
 */

import { onRequest } from 'firebase-functions/v2/https'
import type { Request, Response } from 'express'
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore'
import {
  ALLOWLIST_SYNC_CONSTANTS,
  type AllowlistPlatform,
  type AllowlistSyncStatus,
  type ReportSyncStatusResponse,
  type GetAllSyncStatusesResponse,
  safeParseReportSyncStatusInput,
  isSyncStatusStale,
  calculateStaleDuration,
  allowlistSyncStatusSchema,
} from '@fledgely/contracts'
import { getAllowlistVersion } from '@fledgely/shared'

/** Rate limiting store - simple in-memory for MVP */
const rateLimitStore = new Map<string, { count: number; resetAt: number }>()

/**
 * Get client identifier for rate limiting
 */
function getClientId(req: Request, platform?: string): string {
  // Use platform + IP for rate limiting
  const forwarded = req.headers['x-forwarded-for']
  let ip = 'unknown'
  if (typeof forwarded === 'string') {
    ip = forwarded.split(',')[0].trim()
  } else if (req.ip) {
    ip = req.ip
  }
  return platform ? `${platform}:${ip}` : ip
}

/**
 * Check if client is rate limited
 * Rate limit: 1 report per platform per hour
 *
 * @returns true if request should be blocked
 */
function isRateLimited(clientId: string): boolean {
  const now = Date.now()
  const entry = rateLimitStore.get(clientId)

  // No entry - first request
  if (!entry) {
    rateLimitStore.set(clientId, {
      count: 1,
      resetAt: now + ALLOWLIST_SYNC_CONSTANTS.RATE_LIMIT_WINDOW_MS,
    })
    return false
  }

  // Window expired - reset
  if (now > entry.resetAt) {
    rateLimitStore.set(clientId, {
      count: 1,
      resetAt: now + ALLOWLIST_SYNC_CONSTANTS.RATE_LIMIT_WINDOW_MS,
    })
    return false
  }

  // Within window - already reported
  if (entry.count >= 1) {
    return true
  }

  // Increment count
  entry.count++
  return false
}

/**
 * Clean up expired rate limit entries
 */
function cleanupRateLimitStore(): void {
  const now = Date.now()
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now > entry.resetAt) {
      rateLimitStore.delete(key)
    }
  }
}

/**
 * Handle POST request - Report sync status from a platform
 */
async function handlePostSyncStatus(
  req: Request,
  res: Response
): Promise<void> {
  // Parse and validate input
  const input = safeParseReportSyncStatusInput(req.body)
  if (!input) {
    res.status(400).json({
      error: 'Invalid request body',
      message:
        'Request body must include platform, version, and cacheAge fields',
    })
    return
  }

  // Check rate limit (1 report per platform per hour)
  const clientId = getClientId(req, input.platform)
  if (isRateLimited(clientId)) {
    res.status(429).json({
      error: 'Too many requests',
      message: 'Each platform can only report sync status once per hour',
      retryAfter: Math.floor(ALLOWLIST_SYNC_CONSTANTS.RATE_LIMIT_WINDOW_MS / 1000),
    })
    return
  }

  try {
    const db = getFirestore()
    const now = new Date().toISOString()
    const serverVersion = getAllowlistVersion()

    // Determine if this version should trigger re-sync
    const shouldResync =
      input.version !== serverVersion ||
      input.cacheAge > ALLOWLIST_SYNC_CONSTANTS.STALENESS_THRESHOLD_MS

    // Create sync status document
    const syncStatus: AllowlistSyncStatus = {
      platform: input.platform,
      version: input.version,
      lastSyncAt: now,
      isStale: isSyncStatusStale(now), // Should be false since we just updated
      cacheAge: input.cacheAge,
      isEmergency: input.isEmergency,
      deviceId: input.deviceId,
      userAgent: input.userAgent,
    }

    // Store in Firestore (upsert by platform)
    await db
      .collection(ALLOWLIST_SYNC_CONSTANTS.SYNC_STATUS_COLLECTION)
      .doc(input.platform)
      .set({
        ...syncStatus,
        updatedAt: FieldValue.serverTimestamp(),
      })

    // Log the sync (no PII - just platform and version info)
    console.log('Platform sync status reported', {
      platform: input.platform,
      version: input.version,
      cacheAge: input.cacheAge,
      isEmergency: input.isEmergency,
      shouldResync,
    })

    // Build response
    const response: ReportSyncStatusResponse = {
      success: true,
      serverVersion,
      shouldResync,
      message: shouldResync
        ? 'Server has newer version - re-sync recommended'
        : 'Sync status recorded successfully',
    }

    res.json(response)
  } catch (error) {
    console.error('Error reporting sync status:', error)
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to record sync status',
    })
  }
}

/**
 * Handle GET request - Get all platform sync statuses (admin endpoint)
 */
async function handleGetSyncStatuses(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const db = getFirestore()
    const serverVersion = getAllowlistVersion()
    const now = new Date().toISOString()

    // Fetch all platform sync statuses
    const snapshot = await db
      .collection(ALLOWLIST_SYNC_CONSTANTS.SYNC_STATUS_COLLECTION)
      .get()

    const statuses: AllowlistSyncStatus[] = []
    const stalePlatforms: AllowlistPlatform[] = []

    snapshot.forEach((doc) => {
      const data = doc.data()
      const parsed = allowlistSyncStatusSchema.safeParse(data)

      if (parsed.success) {
        const status = parsed.data

        // Update staleness based on current time
        const isStale = isSyncStatusStale(status.lastSyncAt)
        status.isStale = isStale
        status.cacheAge = calculateStaleDuration(status.lastSyncAt)

        statuses.push(status)

        if (isStale) {
          stalePlatforms.push(status.platform)
        }
      }
    })

    // Check for missing platforms (never reported)
    const allPlatforms: AllowlistPlatform[] = [
      'web',
      'chrome-extension',
      'android',
      'ios',
    ]
    const reportedPlatforms = new Set(statuses.map((s) => s.platform))
    for (const platform of allPlatforms) {
      if (!reportedPlatforms.has(platform)) {
        stalePlatforms.push(platform)
      }
    }

    const response: GetAllSyncStatusesResponse = {
      statuses,
      stalePlatforms,
      serverVersion,
      generatedAt: now,
    }

    // Set cache headers (short cache for admin endpoint)
    res.set({
      'Cache-Control': 'private, max-age=60',
      'Content-Type': 'application/json',
      'X-Content-Type-Options': 'nosniff',
    })

    res.json(response)
  } catch (error) {
    console.error('Error fetching sync statuses:', error)
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to fetch sync statuses',
    })
  }
}

/**
 * HTTP Endpoint: /api/allowlist-sync-status
 *
 * POST - Report platform sync status
 * GET - Get all platform sync statuses (admin)
 *
 * POST Request Body:
 * ```json
 * {
 *   "platform": "web",
 *   "version": "1.0.0-2025-12-16T00:00:00Z",
 *   "cacheAge": 3600000,
 *   "isEmergency": false,
 *   "deviceId": "optional-device-id",
 *   "userAgent": "optional-user-agent"
 * }
 * ```
 *
 * POST Response:
 * ```json
 * {
 *   "success": true,
 *   "serverVersion": "1.0.0-2025-12-16T00:00:00Z",
 *   "shouldResync": false,
 *   "message": "Sync status recorded successfully"
 * }
 * ```
 *
 * GET Response:
 * ```json
 * {
 *   "statuses": [...],
 *   "stalePlatforms": ["android"],
 *   "serverVersion": "1.0.0-2025-12-16T00:00:00Z",
 *   "generatedAt": "2025-12-16T10:00:00Z"
 * }
 * ```
 */
export const allowlistSyncStatusEndpoint = onRequest(
  {
    cors: true,
    memory: '128MiB',
    region: 'us-central1',
  },
  async (req: Request, res: Response) => {
    // Cleanup expired rate limit entries
    cleanupRateLimitStore()

    switch (req.method) {
      case 'POST':
        await handlePostSyncStatus(req, res)
        break
      case 'GET':
        await handleGetSyncStatuses(req, res)
        break
      default:
        res.status(405).set('Allow', 'GET, POST').send('Method not allowed')
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
  cleanupRateLimitStore,
  handlePostSyncStatus,
  handleGetSyncStatuses,
}
