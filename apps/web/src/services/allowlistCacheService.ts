/**
 * Allowlist Cache Service
 *
 * Story 7.2: Crisis Visit Zero-Data-Path - Task 3
 * Story 7.4: Emergency Allowlist Push - Task 6
 * Story 7.7: Allowlist Distribution & Sync - Task 5
 *
 * Implements local storage caching for the crisis allowlist with
 * fail-safe fallback behavior using the platform-agnostic sync service.
 *
 * CRITICAL: If network fails, ALWAYS use cached version.
 * A missing/stale allowlist must NEVER result in capturing crisis visits.
 *
 * NFR28: Allowlist must be cached locally (fail-safe to protection)
 *
 * Story 7.4 additions:
 * - forceRefresh() method to bypass cache
 * - Emergency version detection and logging
 * - ETag-based conditional fetch
 * - Reduced TTL for emergency detection (1 hour)
 *
 * Story 7.7 refactor:
 * - Now uses platform-agnostic sync service from @fledgely/shared
 * - Maintains backward compatibility with existing API
 */

import {
  getCrisisAllowlist,
  type CrisisAllowlist,
  createAllowlistSyncService,
  type AllowlistSyncService,
  isEmergencyVersion as checkEmergencyVersion,
} from '@fledgely/shared'
import { ALLOWLIST_SYNC_CONSTANTS } from '@fledgely/contracts'
import {
  createWebAllowlistAdapter,
  getCacheAge as getAdapterCacheAge,
  getCachedVersion as getAdapterCachedVersion,
  hasEmergencyEntries as getAdapterEmergencyEntries,
  clearCache as clearAdapterCache,
} from './webAllowlistAdapter'

/** Cache key for localStorage (for backward compatibility checks) */
const CACHE_KEY = 'fledgely_crisis_allowlist'

/** API endpoint for allowlist */
const ALLOWLIST_ENDPOINT = '/api/crisis-allowlist'

/**
 * Singleton sync service instance
 *
 * Lazily initialized to allow for SSR compatibility
 */
let syncService: AllowlistSyncService | null = null

/**
 * Test mode flag - disables retries for faster tests
 * @internal
 */
let testMode = false

/**
 * Get or create the sync service singleton
 */
function getSyncService(): AllowlistSyncService {
  if (!syncService) {
    const adapter = createWebAllowlistAdapter()
    syncService = createAllowlistSyncService(
      {
        platform: 'web',
        endpoint: ALLOWLIST_ENDPOINT,
        ttlMs: ALLOWLIST_SYNC_CONSTANTS.NORMAL_TTL_MS,
        emergencyTtlMs: ALLOWLIST_SYNC_CONSTANTS.EMERGENCY_TTL_MS,
        networkTimeoutMs: testMode ? 100 : ALLOWLIST_SYNC_CONSTANTS.NETWORK_TIMEOUT_MS,
        maxRetryAttempts: testMode ? 0 : ALLOWLIST_SYNC_CONSTANTS.MAX_RETRY_ATTEMPTS,
        retryDelayMs: testMode ? 1 : ALLOWLIST_SYNC_CONSTANTS.RETRY_DELAY_MS,
        syncStatusEndpoint: ALLOWLIST_SYNC_CONSTANTS.SYNC_STATUS_ENDPOINT,
      },
      adapter
    )
  }
  return syncService
}

/**
 * Check if a version string indicates an emergency push
 *
 * @param version - Allowlist version string
 * @returns true if this is an emergency version
 */
export function isEmergencyVersion(version: string): boolean {
  return checkEmergencyVersion(version)
}

/**
 * Save allowlist to local storage cache
 *
 * Story 7.4: Now logs when emergency entries are detected.
 * Story 7.7: Delegates to web adapter
 *
 * @param allowlist - The allowlist data to cache
 */
export function saveToCache(allowlist: CrisisAllowlist): void {
  // This is now handled internally by the sync service
  // Direct saves still work for backward compatibility
  try {
    const emergency = checkEmergencyVersion(allowlist.version)

    if (emergency) {
      console.log('Emergency crisis allowlist detected', {
        version: allowlist.version,
        entriesCount: allowlist.entries.length,
        message: 'Emergency entries included in allowlist',
      })
    }

    const cached = {
      data: allowlist,
      cachedAt: Date.now(),
      version: allowlist.version,
      isEmergency: emergency,
    }
    localStorage.setItem(CACHE_KEY, JSON.stringify(cached))
  } catch {
    console.warn('Failed to cache crisis allowlist to localStorage')
  }
}

/**
 * Get allowlist from local storage cache
 *
 * Story 7.4: Uses dynamic TTL based on emergency status.
 * Story 7.7: Delegates to sync service for TTL logic
 *
 * @returns Cached allowlist or null if not found/expired
 */
export function getFromCache(): CrisisAllowlist | null {
  try {
    const cached = localStorage.getItem(CACHE_KEY)
    if (!cached) {
      return null
    }

    const parsed = JSON.parse(cached)

    // Check if cache is expired using dynamic TTL
    const age = Date.now() - parsed.cachedAt
    const ttl = checkEmergencyVersion(parsed.version)
      ? ALLOWLIST_SYNC_CONSTANTS.EMERGENCY_TTL_MS
      : ALLOWLIST_SYNC_CONSTANTS.NORMAL_TTL_MS

    if (age > ttl) {
      return null // Expired
    }

    return parsed.data
  } catch {
    return null
  }
}

/**
 * Get allowlist from cache or bundled fallback
 *
 * FAIL-SAFE: Always returns a valid allowlist.
 * If cache is empty/expired, returns bundled allowlist.
 *
 * @returns Valid allowlist (cached or bundled)
 */
export function getFromCacheOrBundled(): CrisisAllowlist {
  const cached = getFromCache()
  if (cached) {
    return cached
  }

  // Fallback to bundled allowlist from @fledgely/shared
  return getCrisisAllowlist()
}

/**
 * Check if cache exists and is valid (not expired)
 *
 * Story 7.4: Uses dynamic TTL based on emergency status.
 *
 * @returns true if cache exists and is within TTL
 */
export function isCacheValid(): boolean {
  try {
    const cached = localStorage.getItem(CACHE_KEY)
    if (!cached) {
      return false
    }

    const parsed = JSON.parse(cached)
    const age = Date.now() - parsed.cachedAt
    const ttl = checkEmergencyVersion(parsed.version)
      ? ALLOWLIST_SYNC_CONSTANTS.EMERGENCY_TTL_MS
      : ALLOWLIST_SYNC_CONSTANTS.NORMAL_TTL_MS

    return age <= ttl
  } catch {
    return false
  }
}

/**
 * Get cache age in milliseconds
 *
 * @returns Age in ms, or null if no cache
 */
export function getCacheAge(): number | null {
  return getAdapterCacheAge()
}

/**
 * Clear the allowlist cache
 */
export function clearCache(): void {
  clearAdapterCache()
}

/**
 * Get allowlist with fallback to cache
 *
 * FAIL-SAFE: If network fails, ALWAYS use cached version.
 * A missing/stale allowlist must NEVER result in capturing crisis visits.
 *
 * Story 7.4: Now uses ETag-based conditional fetch.
 * Story 7.7: Delegates to platform-agnostic sync service.
 *
 * Order of precedence:
 * 1. Valid cache (within TTL)
 * 2. Network fetch (if cache expired)
 * 3. 304 Not Modified - use cached
 * 4. Expired cache (if network fails)
 * 5. Bundled allowlist from @fledgely/shared
 *
 * @returns Valid allowlist (never throws)
 */
export async function getAllowlistWithFallback(): Promise<CrisisAllowlist> {
  try {
    const service = getSyncService()
    const result = await service.sync()
    return result.allowlist
  } catch {
    // Ultimate fallback
    return getFromCacheOrBundled()
  }
}

/**
 * Refresh cache on app launch
 *
 * Attempts to fetch fresh allowlist from network.
 * If successful, updates cache. If not, cache remains unchanged.
 * This is a fire-and-forget operation.
 *
 * Story 7.4: Uses ETag for conditional fetch efficiency.
 * Story 7.7: Delegates to sync service forceSync.
 *
 * @returns Promise that resolves when refresh attempt completes
 */
export async function refreshCacheOnLaunch(): Promise<void> {
  try {
    const service = getSyncService()
    await service.forceSync()
  } catch {
    // Fail silently - existing cache or bundled fallback will be used
  }
}

/**
 * Force refresh the allowlist from network
 *
 * Story 7.4: Bypasses ETag check to force a fresh fetch.
 * Story 7.7: Delegates to sync service forceSync.
 *
 * FAIL-SAFE: Always returns a valid allowlist.
 *
 * @returns Fresh allowlist from network, or cached/bundled fallback
 */
export async function forceRefresh(): Promise<CrisisAllowlist> {
  try {
    const service = getSyncService()
    const result = await service.forceSync()
    return result.allowlist
  } catch {
    // Ultimate fallback
    return getFromCacheOrBundled()
  }
}

/**
 * Check if the cached allowlist has emergency entries
 *
 * @returns true if cache exists and contains emergency entries
 */
export function hasEmergencyEntries(): boolean {
  return getAdapterEmergencyEntries()
}

/**
 * Get the cached allowlist version
 *
 * @returns Version string or null if no cache
 */
export function getCachedVersion(): string | null {
  return getAdapterCachedVersion()
}

/**
 * Get current sync status
 *
 * Story 7.7: New method to get sync status for monitoring.
 *
 * @returns Sync status or null if no cache
 */
export async function getSyncStatus() {
  const service = getSyncService()
  return service.getSyncStatus()
}

/**
 * Check if cache needs refresh
 *
 * Story 7.7: New method to check if refresh is needed.
 *
 * @returns true if cache needs refresh
 */
export async function needsRefresh(): Promise<boolean> {
  const service = getSyncService()
  return service.needsRefresh()
}

/**
 * Reset the sync service singleton (for testing)
 *
 * @internal
 */
export function __resetSyncService(): void {
  syncService = null
}

/**
 * Enable test mode (disables retries for faster tests)
 *
 * @internal
 */
export function __setTestMode(enabled: boolean): void {
  testMode = enabled
  syncService = null // Reset service to pick up new config
}
