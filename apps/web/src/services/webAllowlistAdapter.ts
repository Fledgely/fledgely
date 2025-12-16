/**
 * Web Allowlist Adapter
 *
 * Story 7.7: Allowlist Distribution & Sync - Task 5.2
 *
 * Platform-specific adapter for web application that implements
 * the AllowlistSyncAdapter interface using localStorage.
 *
 * This adapter is used by the platform-agnostic sync service
 * from @fledgely/shared to provide web-specific storage.
 */

import {
  getCrisisAllowlist,
  type CrisisAllowlist,
  type AllowlistSyncAdapter,
  type CachedAllowlist,
  isEmergencyVersion,
} from '@fledgely/shared'
import type { ReportSyncStatusInput } from '@fledgely/contracts'

/** Cache key for localStorage */
const CACHE_KEY = 'fledgely_crisis_allowlist'

/** ETag cache key for conditional fetch */
const ETAG_CACHE_KEY = 'fledgely_crisis_allowlist_etag'

/** Sync status reporting endpoint */
const SYNC_STATUS_ENDPOINT = '/api/allowlist-sync-status'

/**
 * Create a web platform adapter for allowlist sync
 *
 * This adapter uses localStorage for caching and the bundled
 * allowlist from @fledgely/shared as the ultimate fallback.
 */
export function createWebAllowlistAdapter(): AllowlistSyncAdapter {
  /**
   * Get allowlist from localStorage cache
   */
  async function getFromCache(): Promise<CachedAllowlist | null> {
    try {
      const cached = localStorage.getItem(CACHE_KEY)
      if (!cached) {
        return null
      }

      const parsed = JSON.parse(cached) as CachedAllowlist
      return parsed
    } catch {
      // JSON parse error or localStorage issue
      return null
    }
  }

  /**
   * Save allowlist to localStorage cache
   */
  async function saveToCache(
    allowlist: CrisisAllowlist,
    isEmergency: boolean
  ): Promise<void> {
    try {
      const cached: CachedAllowlist = {
        data: allowlist,
        cachedAt: Date.now(),
        version: allowlist.version,
        isEmergency,
      }
      localStorage.setItem(CACHE_KEY, JSON.stringify(cached))

      // Log emergency version for monitoring (not PII - just version info)
      if (isEmergency) {
        console.log('Emergency crisis allowlist cached', {
          version: allowlist.version,
          entriesCount: allowlist.entries.length,
        })
      }
    } catch {
      // localStorage may be unavailable or full
      // Fail silently - we still have bundled fallback
      console.warn('Failed to cache crisis allowlist to localStorage')
    }
  }

  /**
   * Get bundled allowlist from @fledgely/shared
   *
   * This is the ultimate fallback - always available.
   */
  function getBundled(): CrisisAllowlist {
    return getCrisisAllowlist()
  }

  /**
   * Report sync status to server
   *
   * Fire-and-forget - errors are logged but don't affect sync.
   */
  async function reportSyncStatus(status: ReportSyncStatusInput): Promise<void> {
    try {
      await fetch(SYNC_STATUS_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(status),
      })
    } catch {
      // Non-critical - log and continue
      console.warn('Failed to report sync status')
    }
  }

  /**
   * Get stored ETag for conditional requests
   */
  async function getStoredETag(): Promise<string | null> {
    try {
      return localStorage.getItem(ETAG_CACHE_KEY)
    } catch {
      return null
    }
  }

  /**
   * Save ETag for future conditional requests
   */
  async function saveETag(etag: string): Promise<void> {
    try {
      localStorage.setItem(ETAG_CACHE_KEY, etag)
    } catch {
      // ETag cache is optional
    }
  }

  return {
    getFromCache,
    saveToCache,
    getBundled,
    reportSyncStatus,
    getStoredETag,
    saveETag,
  }
}

/**
 * Get cache age in milliseconds
 *
 * @returns Age in ms, or null if no cache exists
 */
export function getCacheAge(): number | null {
  try {
    const cached = localStorage.getItem(CACHE_KEY)
    if (!cached) {
      return null
    }

    const parsed = JSON.parse(cached) as CachedAllowlist
    return Date.now() - parsed.cachedAt
  } catch {
    return null
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

    const parsed = JSON.parse(cached) as CachedAllowlist
    return parsed.version
  } catch {
    return null
  }
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

    const parsed = JSON.parse(cached) as CachedAllowlist
    return parsed.isEmergency === true || isEmergencyVersion(parsed.version)
  } catch {
    return false
  }
}

/**
 * Clear the allowlist cache
 */
export function clearCache(): void {
  try {
    localStorage.removeItem(CACHE_KEY)
    localStorage.removeItem(ETAG_CACHE_KEY)
  } catch {
    // localStorage may be unavailable
  }
}
