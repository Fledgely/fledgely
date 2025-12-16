/**
 * Allowlist Cache Service
 *
 * Story 7.2: Crisis Visit Zero-Data-Path - Task 3
 *
 * Implements local storage caching for the crisis allowlist with
 * fail-safe fallback behavior.
 *
 * CRITICAL: If network fails, ALWAYS use cached version.
 * A missing/stale allowlist must NEVER result in capturing crisis visits.
 *
 * NFR28: Allowlist must be cached locally (fail-safe to protection)
 */

import { getCrisisAllowlist, type CrisisAllowlist } from '@fledgely/shared'

/** Cache key for localStorage */
const CACHE_KEY = 'fledgely_crisis_allowlist'

/** Cache TTL: 24 hours */
const CACHE_TTL_MS = 24 * 60 * 60 * 1000

/** Network timeout: 5 seconds */
const NETWORK_TIMEOUT_MS = 5000

/** Number of retry attempts for network failures */
const MAX_RETRY_ATTEMPTS = 2

/** Delay between retry attempts in milliseconds */
const RETRY_DELAY_MS = 1000

/** API endpoint for allowlist */
const ALLOWLIST_ENDPOINT = '/api/crisis-allowlist'

/**
 * Cached allowlist structure
 */
interface CachedAllowlist {
  data: CrisisAllowlist
  cachedAt: number
  version: string
}

/**
 * Save allowlist to local storage cache
 *
 * @param allowlist - The allowlist data to cache
 */
export function saveToCache(allowlist: CrisisAllowlist): void {
  try {
    const cached: CachedAllowlist = {
      data: allowlist,
      cachedAt: Date.now(),
      version: allowlist.version,
    }
    localStorage.setItem(CACHE_KEY, JSON.stringify(cached))
  } catch {
    // localStorage may be unavailable or full
    // Fail silently - we still have bundled fallback
    console.warn('Failed to cache crisis allowlist to localStorage')
  }
}

/**
 * Get allowlist from local storage cache
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

    // Check if cache is expired
    const age = Date.now() - parsed.cachedAt
    if (age > CACHE_TTL_MS) {
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
    return age <= CACHE_TTL_MS
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
 * Fetch allowlist from network with timeout and retry logic
 *
 * Implements retry with exponential backoff for transient failures.
 *
 * @returns Allowlist from network or null on failure
 */
async function fetchFromNetwork(): Promise<CrisisAllowlist | null> {
  for (let attempt = 0; attempt <= MAX_RETRY_ATTEMPTS; attempt++) {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), NETWORK_TIMEOUT_MS)

      const response = await fetch(ALLOWLIST_ENDPOINT, {
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

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
 * Order of precedence:
 * 1. Network fetch (if successful, update cache)
 * 2. Local storage cache (if valid)
 * 3. Bundled allowlist from @fledgely/shared
 *
 * @returns Valid allowlist (never throws)
 */
export async function getAllowlistWithFallback(): Promise<CrisisAllowlist> {
  // Try network first
  const networkData = await fetchFromNetwork()
  if (networkData) {
    // Success - update cache and return
    saveToCache(networkData)
    return networkData
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
 * @returns Promise that resolves when refresh attempt completes
 */
export async function refreshCacheOnLaunch(): Promise<void> {
  try {
    const networkData = await fetchFromNetwork()
    if (networkData) {
      saveToCache(networkData)
    }
  } catch {
    // Fail silently - existing cache or bundled fallback will be used
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
