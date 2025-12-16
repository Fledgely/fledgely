/**
 * Allowlist Sync Service
 *
 * Story 7.7: Allowlist Distribution & Sync - Task 2, 3, 4
 *
 * Platform-agnostic sync service for crisis allowlist.
 * Provides consistent sync logic across all platforms with:
 * - TTL-based caching (24h normal, 1h emergency)
 * - Version comparison with emergency version detection
 * - Fail-safe fallback chain: Network → Cache → Bundled
 *
 * CRITICAL: This service ensures crisis allowlist is ALWAYS available.
 * Network failures NEVER result in an empty allowlist.
 */

import type { CrisisAllowlist } from '../constants/crisis-urls'
import {
  type AllowlistPlatform,
  type AllowlistSyncStatus,
  type ReportSyncStatusInput,
  ALLOWLIST_SYNC_CONSTANTS,
  getTTLForVersion,
  shouldRefreshCache,
} from '@fledgely/contracts'

/**
 * Configuration for the sync service
 */
export interface AllowlistSyncConfig {
  /** Platform identifier */
  platform: AllowlistPlatform

  /** API endpoint for fetching allowlist */
  endpoint: string

  /** Normal cache TTL in milliseconds (default: 24h) */
  ttlMs?: number

  /** Emergency cache TTL in milliseconds (default: 1h) */
  emergencyTtlMs?: number

  /** Network timeout in milliseconds (default: 5s) */
  networkTimeoutMs?: number

  /** Maximum retry attempts (default: 2) */
  maxRetryAttempts?: number

  /** Delay between retries in milliseconds (default: 1s) */
  retryDelayMs?: number

  /** Endpoint for reporting sync status (optional) */
  syncStatusEndpoint?: string
}

/**
 * Cached allowlist structure
 */
export interface CachedAllowlist {
  data: CrisisAllowlist
  cachedAt: number
  version: string
  isEmergency: boolean
}

/**
 * Platform-specific storage adapter interface
 *
 * Each platform implements this to provide its own storage mechanism:
 * - Web: localStorage
 * - Chrome Extension: chrome.storage.local
 * - Android: Room database
 * - iOS: CoreData
 */
export interface AllowlistSyncAdapter {
  /** Get allowlist from platform-specific cache */
  getFromCache(): Promise<CachedAllowlist | null>

  /** Save allowlist to platform-specific cache */
  saveToCache(allowlist: CrisisAllowlist, isEmergency: boolean): Promise<void>

  /** Get bundled allowlist (compiled into the platform binary) */
  getBundled(): CrisisAllowlist

  /** Report sync status to server (optional - may be no-op) */
  reportSyncStatus?(status: ReportSyncStatusInput): Promise<void>

  /** Get stored ETag for conditional requests (optional) */
  getStoredETag?(): Promise<string | null>

  /** Save ETag for future conditional requests (optional) */
  saveETag?(etag: string): Promise<void>
}

/**
 * Sync result with details
 */
export interface SyncResult {
  /** The allowlist data */
  allowlist: CrisisAllowlist

  /** Source of the data */
  source: 'network' | 'cache' | 'bundled'

  /** Whether this is an emergency version */
  isEmergency: boolean

  /** Whether a re-sync was triggered due to version mismatch */
  wasResync: boolean

  /** Error message if sync failed but fallback was used */
  fallbackReason?: string
}

/**
 * Check if a version is an emergency version
 *
 * Emergency versions have format: X.Y.Z-emergency-{pushId}
 */
export function isEmergencyVersion(version: string): boolean {
  return version.includes('-emergency-')
}

/**
 * Compare two semantic versions
 *
 * @returns positive if a > b, negative if a < b, 0 if equal
 */
export function compareSemanticVersions(a: string, b: string): number {
  // Extract base semantic version (before any suffix)
  const extractSemver = (v: string): number[] => {
    const match = v.match(/^(\d+)\.(\d+)\.(\d+)/)
    if (!match) return [0, 0, 0]
    return [parseInt(match[1], 10), parseInt(match[2], 10), parseInt(match[3], 10)]
  }

  const aParts = extractSemver(a)
  const bParts = extractSemver(b)

  for (let i = 0; i < 3; i++) {
    if (aParts[i] > bParts[i]) return 1
    if (aParts[i] < bParts[i]) return -1
  }

  return 0
}

/**
 * Determine if a re-sync should be triggered based on version comparison
 *
 * Rules:
 * 1. Emergency versions ALWAYS trigger re-sync if different
 * 2. Newer semantic versions trigger re-sync
 * 3. Same version = no re-sync needed
 *
 * @param cachedVersion - Version currently in cache
 * @param serverVersion - Version reported by server
 * @returns true if re-sync should be triggered
 */
export function shouldResync(cachedVersion: string, serverVersion: string): boolean {
  // Same version = no re-sync needed
  if (cachedVersion === serverVersion) {
    return false
  }

  // Emergency versions ALWAYS trigger re-sync if different
  if (isEmergencyVersion(serverVersion)) {
    return true
  }

  // Compare semantic versions - re-sync if server is newer
  return compareSemanticVersions(serverVersion, cachedVersion) > 0
}

/**
 * Sleep utility for retry delays
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Create an allowlist sync service
 *
 * Factory function that creates a sync service instance configured
 * for a specific platform with its storage adapter.
 *
 * @param config - Sync configuration
 * @param adapter - Platform-specific storage adapter
 */
export function createAllowlistSyncService(
  config: AllowlistSyncConfig,
  adapter: AllowlistSyncAdapter
) {
  // Apply defaults
  const {
    platform,
    endpoint,
    ttlMs = ALLOWLIST_SYNC_CONSTANTS.NORMAL_TTL_MS,
    emergencyTtlMs = ALLOWLIST_SYNC_CONSTANTS.EMERGENCY_TTL_MS,
    networkTimeoutMs = ALLOWLIST_SYNC_CONSTANTS.NETWORK_TIMEOUT_MS,
    maxRetryAttempts = ALLOWLIST_SYNC_CONSTANTS.MAX_RETRY_ATTEMPTS,
    retryDelayMs = ALLOWLIST_SYNC_CONSTANTS.RETRY_DELAY_MS,
    syncStatusEndpoint,
  } = config

  /**
   * Fetch allowlist from network with timeout and retries
   */
  async function fetchFromNetwork(
    useETag: boolean = true
  ): Promise<CrisisAllowlist | 'not-modified' | null> {
    for (let attempt = 0; attempt <= maxRetryAttempts; attempt++) {
      try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), networkTimeoutMs)

        // Build headers
        const headers: HeadersInit = {}
        if (useETag && adapter.getStoredETag) {
          const etag = await adapter.getStoredETag()
          if (etag) {
            headers['If-None-Match'] = etag
          }
        }

        const response = await fetch(endpoint, {
          signal: controller.signal,
          headers,
        })

        clearTimeout(timeoutId)

        // 304 Not Modified - cache is still valid
        if (response.status === 304) {
          return 'not-modified'
        }

        if (!response.ok) {
          // Non-retryable status codes
          if (response.status === 404 || response.status === 401) {
            return null
          }
          // Retryable status (5xx errors)
          if (attempt < maxRetryAttempts) {
            await sleep(retryDelayMs * (attempt + 1))
            continue
          }
          return null
        }

        // Save ETag for future conditional requests
        const etag = response.headers.get('ETag')
        if (etag && adapter.saveETag) {
          await adapter.saveETag(etag)
        }

        const data = await response.json()
        return data as CrisisAllowlist
      } catch {
        // Network error, timeout, or abort - retry if attempts remain
        if (attempt < maxRetryAttempts) {
          await sleep(retryDelayMs * (attempt + 1))
          continue
        }
        return null
      }
    }
    return null
  }

  /**
   * Get allowlist from cache if valid, otherwise null
   */
  async function getFromCacheIfValid(): Promise<CachedAllowlist | null> {
    const cached = await adapter.getFromCache()
    if (!cached) {
      return null
    }

    // Check if cache is still valid based on version's TTL
    const cacheAge = Date.now() - cached.cachedAt
    const cacheTtl = cached.isEmergency ? emergencyTtlMs : ttlMs

    if (cacheAge > cacheTtl) {
      return null // Cache expired
    }

    return cached
  }

  /**
   * Get allowlist from cache or bundled fallback
   *
   * FAIL-SAFE: Always returns a valid allowlist
   */
  async function getFromCacheOrBundled(): Promise<{ allowlist: CrisisAllowlist; source: 'cache' | 'bundled'; isEmergency: boolean }> {
    const cached = await adapter.getFromCache()
    if (cached) {
      return {
        allowlist: cached.data,
        source: 'cache',
        isEmergency: cached.isEmergency,
      }
    }

    // Ultimate fallback - bundled allowlist
    return {
      allowlist: adapter.getBundled(),
      source: 'bundled',
      isEmergency: false,
    }
  }

  /**
   * Sync allowlist - main sync operation
   *
   * Uses TTL-based caching. If cache is valid, returns cached version.
   * If cache is expired or missing, fetches from network.
   *
   * FAIL-SAFE: On network failure, returns cached or bundled version.
   */
  async function sync(): Promise<SyncResult> {
    // Check if we have a valid cache
    const validCache = await getFromCacheIfValid()
    if (validCache) {
      return {
        allowlist: validCache.data,
        source: 'cache',
        isEmergency: validCache.isEmergency,
        wasResync: false,
      }
    }

    // Cache expired or missing - fetch from network
    const networkResult = await fetchFromNetwork()

    if (networkResult === 'not-modified') {
      // 304 Not Modified - cache is valid even though TTL expired
      // This happens when server confirms our cached version is current
      const cached = await adapter.getFromCache()
      if (cached) {
        // Update cache timestamp to extend TTL
        await adapter.saveToCache(cached.data, cached.isEmergency)
        return {
          allowlist: cached.data,
          source: 'cache',
          isEmergency: cached.isEmergency,
          wasResync: false,
        }
      }
      // Shouldn't happen but fall through to bundled
    }

    if (networkResult && networkResult !== 'not-modified') {
      // Network success - save to cache
      const emergency = isEmergencyVersion(networkResult.version)
      await adapter.saveToCache(networkResult, emergency)

      // Report sync status if endpoint configured
      if (syncStatusEndpoint && adapter.reportSyncStatus) {
        try {
          await adapter.reportSyncStatus({
            platform,
            version: networkResult.version,
            cacheAge: 0,
            isEmergency: emergency,
          })
        } catch {
          // Non-critical - don't fail sync
        }
      }

      return {
        allowlist: networkResult,
        source: 'network',
        isEmergency: emergency,
        wasResync: false,
      }
    }

    // Network failed - use fallback
    const fallback = await getFromCacheOrBundled()
    return {
      allowlist: fallback.allowlist,
      source: fallback.source,
      isEmergency: fallback.isEmergency,
      wasResync: false,
      fallbackReason: 'Network fetch failed, using fallback',
    }
  }

  /**
   * Force sync - bypasses TTL and fetches fresh from network
   *
   * Used on app launch or when emergency push is detected.
   *
   * FAIL-SAFE: On network failure, returns cached or bundled version.
   */
  async function forceSync(): Promise<SyncResult> {
    // Bypass ETag to force fresh fetch
    const networkResult = await fetchFromNetwork(false)

    if (networkResult && networkResult !== 'not-modified') {
      // Network success
      const emergency = isEmergencyVersion(networkResult.version)
      await adapter.saveToCache(networkResult, emergency)

      // Check if this was a version change
      const cached = await adapter.getFromCache()
      const wasResync =
        cached !== null && shouldResync(cached.version, networkResult.version)

      // Report sync status
      if (syncStatusEndpoint && adapter.reportSyncStatus) {
        try {
          await adapter.reportSyncStatus({
            platform,
            version: networkResult.version,
            cacheAge: 0,
            isEmergency: emergency,
          })
        } catch {
          // Non-critical
        }
      }

      return {
        allowlist: networkResult,
        source: 'network',
        isEmergency: emergency,
        wasResync,
      }
    }

    // Network failed - use fallback
    const fallback = await getFromCacheOrBundled()
    return {
      allowlist: fallback.allowlist,
      source: fallback.source,
      isEmergency: fallback.isEmergency,
      wasResync: false,
      fallbackReason: 'Network fetch failed on force sync, using fallback',
    }
  }

  /**
   * Get current allowlist with fail-safe behavior
   *
   * Returns the best available allowlist immediately:
   * 1. Valid cache if available
   * 2. Expired cache if available
   * 3. Bundled allowlist as ultimate fallback
   *
   * This is for synchronous access when you can't wait for network.
   */
  async function getAllowlist(): Promise<CrisisAllowlist> {
    const result = await getFromCacheOrBundled()
    return result.allowlist
  }

  /**
   * Check if cache needs refresh
   */
  async function needsRefresh(): Promise<boolean> {
    const cached = await adapter.getFromCache()
    if (!cached) {
      return true
    }

    const cacheAge = Date.now() - cached.cachedAt
    return shouldRefreshCache(cacheAge, cached.version)
  }

  /**
   * Get current sync status for reporting
   */
  async function getSyncStatus(): Promise<AllowlistSyncStatus | null> {
    const cached = await adapter.getFromCache()
    if (!cached) {
      return null
    }

    const cacheAge = Date.now() - cached.cachedAt
    const ttl = getTTLForVersion(cached.version)

    return {
      platform,
      version: cached.version,
      lastSyncAt: new Date(cached.cachedAt).toISOString(),
      isStale: cacheAge > ALLOWLIST_SYNC_CONSTANTS.STALENESS_THRESHOLD_MS,
      cacheAge,
      isEmergency: cached.isEmergency,
    }
  }

  return {
    sync,
    forceSync,
    getAllowlist,
    needsRefresh,
    getSyncStatus,
    // Expose for testing
    __internal: {
      fetchFromNetwork,
      getFromCacheIfValid,
      getFromCacheOrBundled,
    },
  }
}

export type AllowlistSyncService = ReturnType<typeof createAllowlistSyncService>
