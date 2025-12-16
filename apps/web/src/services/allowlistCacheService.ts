/**
 * Allowlist Cache Service
 *
 * Story 7.2: Crisis Visit Zero-Data-Path - Task 3
 * Story 7.4: Emergency Allowlist Push - Task 6
 *
 * Implements local storage caching for the crisis allowlist with
 * fail-safe fallback behavior.
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
 */

import { getCrisisAllowlist, type CrisisAllowlist } from '@fledgely/shared'

/** Cache key for localStorage */
const CACHE_KEY = 'fledgely_crisis_allowlist'

/** ETag cache key for conditional fetch */
const ETAG_CACHE_KEY = 'fledgely_crisis_allowlist_etag'

/** Cache TTL: 24 hours for normal allowlist */
const CACHE_TTL_MS = 24 * 60 * 60 * 1000

/** Emergency cache TTL: 1 hour when emergency entries exist */
const EMERGENCY_CACHE_TTL_MS = 60 * 60 * 1000

/** Network timeout: 5 seconds */
const NETWORK_TIMEOUT_MS = 5000

/** Number of retry attempts for network failures */
const MAX_RETRY_ATTEMPTS = 2

/** Delay between retry attempts in milliseconds */
const RETRY_DELAY_MS = 1000

/** API endpoint for allowlist */
const ALLOWLIST_ENDPOINT = '/api/crisis-allowlist'

/** Emergency version identifier */
const EMERGENCY_VERSION_MARKER = '-emergency-'

/**
 * Cached allowlist structure
 */
interface CachedAllowlist {
  data: CrisisAllowlist
  cachedAt: number
  version: string
  isEmergency?: boolean
}

/**
 * Check if a version string indicates an emergency push
 *
 * @param version - Allowlist version string
 * @returns true if this is an emergency version
 */
export function isEmergencyVersion(version: string): boolean {
  return version.includes(EMERGENCY_VERSION_MARKER)
}

/**
 * Get the appropriate cache TTL based on version
 *
 * Emergency versions use a shorter TTL to ensure faster propagation.
 *
 * @param version - Allowlist version string
 * @returns TTL in milliseconds
 */
function getCacheTTL(version: string): number {
  if (isEmergencyVersion(version)) {
    return EMERGENCY_CACHE_TTL_MS
  }
  return CACHE_TTL_MS
}

/**
 * Save allowlist to local storage cache
 *
 * Story 7.4: Now logs when emergency entries are detected.
 *
 * @param allowlist - The allowlist data to cache
 */
export function saveToCache(allowlist: CrisisAllowlist): void {
  try {
    const emergency = isEmergencyVersion(allowlist.version)

    if (emergency) {
      console.log('Emergency crisis allowlist detected', {
        version: allowlist.version,
        entriesCount: allowlist.entries.length,
        message: 'Emergency entries included in allowlist',
      })
    }

    const cached: CachedAllowlist = {
      data: allowlist,
      cachedAt: Date.now(),
      version: allowlist.version,
      isEmergency: emergency,
    }
    localStorage.setItem(CACHE_KEY, JSON.stringify(cached))

    // Also save ETag for conditional fetch
    try {
      localStorage.setItem(ETAG_CACHE_KEY, allowlist.version)
    } catch {
      // ETag cache is optional
    }
  } catch {
    // localStorage may be unavailable or full
    // Fail silently - we still have bundled fallback
    console.warn('Failed to cache crisis allowlist to localStorage')
  }
}

/**
 * Get allowlist from local storage cache
 *
 * Story 7.4: Uses dynamic TTL based on emergency status.
 * Emergency versions expire after 1 hour to ensure faster updates.
 *
 * @returns Cached allowlist or null if not found/expired
 */
export function getFromCache(): CrisisAllowlist | null {
  try {
    const cached = localStorage.getItem(CACHE_KEY)
    if (!cached) {
      return null
    }

    const parsed: CachedAllowlist = JSON.parse(cached)

    // Check if cache is expired using dynamic TTL
    const age = Date.now() - parsed.cachedAt
    const ttl = getCacheTTL(parsed.version)
    if (age > ttl) {
      return null // Expired
    }

    return parsed.data
  } catch {
    // JSON parse error or localStorage issue
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

    const parsed: CachedAllowlist = JSON.parse(cached)
    const age = Date.now() - parsed.cachedAt
    const ttl = getCacheTTL(parsed.version)
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
  try {
    const cached = localStorage.getItem(CACHE_KEY)
    if (!cached) {
      return null
    }

    const parsed: CachedAllowlist = JSON.parse(cached)
    return Date.now() - parsed.cachedAt
  } catch {
    return null
  }
}

/**
 * Clear the allowlist cache
 */
export function clearCache(): void {
  try {
    localStorage.removeItem(CACHE_KEY)
  } catch {
    // localStorage may be unavailable
  }
}

/**
 * Sleep utility for retry delays
 *
 * @param ms - Milliseconds to sleep
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Get stored ETag for conditional requests
 *
 * @returns Stored ETag or null if not available
 */
function getStoredETag(): string | null {
  try {
    return localStorage.getItem(ETAG_CACHE_KEY)
  } catch {
    return null
  }
}

/**
 * Fetch allowlist from network with timeout, retry logic, and ETag support
 *
 * Story 7.4: Now supports ETag-based conditional fetch.
 * If the server returns 304 Not Modified, we return null (use cached).
 *
 * Implements retry with exponential backoff for transient failures.
 *
 * @param useETag - Whether to include If-None-Match header
 * @returns Allowlist from network, null on failure, or 'not-modified' if 304
 */
async function fetchFromNetwork(
  useETag = true
): Promise<CrisisAllowlist | null | 'not-modified'> {
  for (let attempt = 0; attempt <= MAX_RETRY_ATTEMPTS; attempt++) {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), NETWORK_TIMEOUT_MS)

      // Build headers with optional ETag
      const headers: HeadersInit = {}
      if (useETag) {
        const etag = getStoredETag()
        if (etag) {
          headers['If-None-Match'] = etag
        }
      }

      const response = await fetch(ALLOWLIST_ENDPOINT, {
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
        if (attempt < MAX_RETRY_ATTEMPTS) {
          await sleep(RETRY_DELAY_MS * (attempt + 1))
          continue
        }
        return null
      }

      const data = await response.json()
      return data as CrisisAllowlist
    } catch {
      // Network error, timeout, or abort - retry if attempts remain
      if (attempt < MAX_RETRY_ATTEMPTS) {
        await sleep(RETRY_DELAY_MS * (attempt + 1))
        continue
      }
      return null
    }
  }
  return null
}

/**
 * Get allowlist with fallback to cache
 *
 * FAIL-SAFE: If network fails, ALWAYS use cached version.
 * A missing/stale allowlist must NEVER result in capturing crisis visits.
 *
 * Story 7.4: Now uses ETag-based conditional fetch.
 * If server returns 304 Not Modified, we use the cached version.
 *
 * Order of precedence:
 * 1. Network fetch (if successful, update cache)
 * 2. 304 Not Modified - use cached (already validated)
 * 3. Local storage cache (if valid)
 * 4. Bundled allowlist from @fledgely/shared
 *
 * @returns Valid allowlist (never throws)
 */
export async function getAllowlistWithFallback(): Promise<CrisisAllowlist> {
  // Try network first
  const networkResult = await fetchFromNetwork()

  if (networkResult === 'not-modified') {
    // 304 Not Modified - cached version is still valid
    const cached = getFromCache()
    if (cached) {
      return cached
    }
    // Shouldn't happen, but fall through to bundled
  } else if (networkResult) {
    // Success - update cache and return
    saveToCache(networkResult)
    return networkResult
  }

  // Network failed - use cached or bundled
  return getFromCacheOrBundled()
}

/**
 * Refresh cache on app launch
 *
 * Attempts to fetch fresh allowlist from network.
 * If successful, updates cache. If not, cache remains unchanged.
 * This is a fire-and-forget operation.
 *
 * Story 7.4: Uses ETag for conditional fetch efficiency.
 *
 * @returns Promise that resolves when refresh attempt completes
 */
export async function refreshCacheOnLaunch(): Promise<void> {
  try {
    const networkResult = await fetchFromNetwork()
    if (networkResult && networkResult !== 'not-modified') {
      saveToCache(networkResult)
    }
    // 'not-modified' means cache is valid, nothing to do
  } catch {
    // Fail silently - existing cache or bundled fallback will be used
  }
}

/**
 * Force refresh the allowlist from network
 *
 * Story 7.4: Bypasses ETag check to force a fresh fetch.
 * Use when you know an emergency push has been made and want
 * immediate update.
 *
 * FAIL-SAFE: Always returns a valid allowlist.
 *
 * @returns Fresh allowlist from network, or cached/bundled fallback
 */
export async function forceRefresh(): Promise<CrisisAllowlist> {
  try {
    // Bypass ETag to force fresh data
    const networkResult = await fetchFromNetwork(false)
    if (networkResult && networkResult !== 'not-modified') {
      saveToCache(networkResult)
      return networkResult
    }
  } catch {
    // Fall through to cached/bundled
  }

  // Network failed - use cached or bundled
  return getFromCacheOrBundled()
}

/**
 * Check if the cached allowlist has emergency entries
 *
 * @returns true if cache exists and contains emergency entries
 */
export function hasEmergencyEntries(): boolean {
  try {
    const cached = localStorage.getItem(CACHE_KEY)
    if (!cached) {
      return false
    }

    const parsed: CachedAllowlist = JSON.parse(cached)
    return parsed.isEmergency === true || isEmergencyVersion(parsed.version)
  } catch {
    return false
  }
}

/**
 * Get the cached allowlist version
 *
 * @returns Version string or null if no cache
 */
export function getCachedVersion(): string | null {
  try {
    const cached = localStorage.getItem(CACHE_KEY)
    if (!cached) {
      return null
    }

    const parsed: CachedAllowlist = JSON.parse(cached)
    return parsed.version
  } catch {
    return null
  }
}
