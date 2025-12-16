/**
 * Chrome Extension Allowlist Adapter
 *
 * Story 7.7: Allowlist Distribution & Sync - Task 6
 *
 * Platform-specific adapter interface for Chrome/Chromebook extension
 * that implements the AllowlistSyncAdapter interface using chrome.storage.local.
 *
 * This adapter is designed for Epic 11 (Chromebook Extension) and provides:
 * - chrome.storage.local for persistent caching
 * - Bundled allowlist from extension assets
 * - Service worker compatible storage
 *
 * NOTE: This is an interface definition for future implementation.
 * Actual implementation will be in the Chrome extension package (Epic 11).
 */

import type { CrisisAllowlist } from '../constants/crisis-urls'
import type { AllowlistSyncAdapter, CachedAllowlist } from '../services/allowlistSyncService'
import type { ReportSyncStatusInput } from '@fledgely/contracts'

/**
 * Chrome storage cache key for allowlist
 */
export const CHROME_CACHE_KEY = 'crisis_allowlist'

/**
 * Chrome storage cache key for ETag
 */
export const CHROME_ETAG_KEY = 'crisis_allowlist_etag'

/**
 * Chrome extension adapter configuration
 */
export interface ChromeExtensionAdapterConfig {
  /**
   * URL to bundled allowlist JSON in extension assets
   * Example: chrome.runtime.getURL('assets/crisis-allowlist.json')
   */
  bundledAllowlistUrl: string

  /**
   * Sync status reporting endpoint (optional)
   */
  syncStatusEndpoint?: string
}

/**
 * Create a Chrome extension adapter for allowlist sync
 *
 * This adapter uses chrome.storage.local for caching, which provides:
 * - Persistent storage across browser sessions
 * - Sync across devices (if using chrome.storage.sync)
 * - Service worker compatible storage
 *
 * @example
 * ```typescript
 * // In Chrome extension service worker
 * import { createChromeExtensionAdapter } from '@fledgely/shared'
 *
 * const adapter = createChromeExtensionAdapter({
 *   bundledAllowlistUrl: chrome.runtime.getURL('assets/crisis-allowlist.json'),
 * })
 *
 * const syncService = createAllowlistSyncService(
 *   { platform: 'chrome-extension', endpoint: 'https://api.fledgely.com/crisis-allowlist' },
 *   adapter
 * )
 * ```
 *
 * NOTE: This is an interface definition. The actual implementation
 * requires the chrome.storage API which is only available in extensions.
 *
 * @param config - Adapter configuration
 */
export function createChromeExtensionAdapter(
  config: ChromeExtensionAdapterConfig
): AllowlistSyncAdapter {
  const { bundledAllowlistUrl, syncStatusEndpoint } = config

  // Cache for bundled allowlist (loaded once)
  let bundledCache: CrisisAllowlist | null = null

  /**
   * Get allowlist from chrome.storage.local cache
   *
   * Implementation note: Uses chrome.storage.local.get() which is
   * promise-based in MV3 or callback-based in MV2.
   */
  async function getFromCache(): Promise<CachedAllowlist | null> {
    // Chrome extension implementation would use:
    // const result = await chrome.storage.local.get(CHROME_CACHE_KEY)
    // return result[CHROME_CACHE_KEY] || null
    throw new Error(
      'Chrome extension adapter getFromCache() requires chrome.storage API. ' +
        'This is a placeholder - implement in actual extension code.'
    )
  }

  /**
   * Save allowlist to chrome.storage.local cache
   *
   * Implementation note: Uses chrome.storage.local.set() which is
   * promise-based in MV3 or callback-based in MV2.
   */
  async function saveToCache(
    allowlist: CrisisAllowlist,
    isEmergency: boolean
  ): Promise<void> {
    // Chrome extension implementation would use:
    // const cached: CachedAllowlist = {
    //   data: allowlist,
    //   cachedAt: Date.now(),
    //   version: allowlist.version,
    //   isEmergency,
    // }
    // await chrome.storage.local.set({ [CHROME_CACHE_KEY]: cached })
    throw new Error(
      'Chrome extension adapter saveToCache() requires chrome.storage API. ' +
        'This is a placeholder - implement in actual extension code.'
    )
  }

  /**
   * Get bundled allowlist from extension assets
   *
   * Implementation note: Loads JSON from extension assets using fetch.
   * The bundled allowlist is included in the extension package and
   * serves as the ultimate fallback when network and cache fail.
   */
  function getBundled(): CrisisAllowlist {
    // Chrome extension implementation would use:
    // if (bundledCache) return bundledCache
    // const response = await fetch(bundledAllowlistUrl)
    // bundledCache = await response.json()
    // return bundledCache
    //
    // For synchronous requirement, pre-load in extension initialization:
    // chrome.runtime.onInstalled.addListener(async () => {
    //   const response = await fetch(bundledAllowlistUrl)
    //   bundledCache = await response.json()
    // })
    throw new Error(
      'Chrome extension adapter getBundled() requires bundled JSON. ' +
        'This is a placeholder - implement in actual extension code.'
    )
  }

  /**
   * Report sync status to server
   *
   * Implementation note: Fire-and-forget POST to sync status endpoint.
   */
  async function reportSyncStatus(status: ReportSyncStatusInput): Promise<void> {
    if (!syncStatusEndpoint) return

    try {
      await fetch(syncStatusEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(status),
      })
    } catch {
      // Non-critical - log and continue
      console.warn('[Chrome Extension] Failed to report sync status')
    }
  }

  /**
   * Get stored ETag for conditional requests
   */
  async function getStoredETag(): Promise<string | null> {
    // Chrome extension implementation would use:
    // const result = await chrome.storage.local.get(CHROME_ETAG_KEY)
    // return result[CHROME_ETAG_KEY] || null
    throw new Error(
      'Chrome extension adapter getStoredETag() requires chrome.storage API. ' +
        'This is a placeholder - implement in actual extension code.'
    )
  }

  /**
   * Save ETag for future conditional requests
   */
  async function saveETag(etag: string): Promise<void> {
    // Chrome extension implementation would use:
    // await chrome.storage.local.set({ [CHROME_ETAG_KEY]: etag })
    throw new Error(
      'Chrome extension adapter saveETag() requires chrome.storage API. ' +
        'This is a placeholder - implement in actual extension code.'
    )
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
 * Type definition for chrome.storage result
 *
 * Used for type checking in Chrome extension implementation.
 */
export interface ChromeStorageResult {
  [CHROME_CACHE_KEY]?: CachedAllowlist
  [CHROME_ETAG_KEY]?: string
}

/**
 * Documentation for Chrome Extension Integration (Epic 11)
 *
 * ## Setup Instructions
 *
 * 1. Include bundled allowlist in extension assets:
 *    - Add `assets/crisis-allowlist.json` to manifest.json web_accessible_resources
 *    - Run `npm run generate:allowlist` before building extension
 *
 * 2. Initialize adapter in service worker:
 *    ```typescript
 *    // background.ts
 *    import { createAllowlistSyncService } from '@fledgely/shared'
 *
 *    const adapter = createChromeExtensionAdapterImpl({
 *      bundledAllowlistUrl: chrome.runtime.getURL('assets/crisis-allowlist.json'),
 *      syncStatusEndpoint: 'https://api.fledgely.com/allowlist-sync-status',
 *    })
 *
 *    const syncService = createAllowlistSyncService(
 *      {
 *        platform: 'chrome-extension',
 *        endpoint: 'https://api.fledgely.com/crisis-allowlist',
 *      },
 *      adapter
 *    )
 *
 *    // Sync on extension install/update
 *    chrome.runtime.onInstalled.addListener(() => {
 *      syncService.forceSync()
 *    })
 *
 *    // Periodic sync (service worker alarm)
 *    chrome.alarms.create('allowlist-sync', { periodInMinutes: 60 * 24 })
 *    chrome.alarms.onAlarm.addListener((alarm) => {
 *      if (alarm.name === 'allowlist-sync') {
 *        syncService.sync()
 *      }
 *    })
 *    ```
 *
 * 3. Access allowlist in content scripts:
 *    ```typescript
 *    // content.ts
 *    const allowlist = await syncService.getAllowlist()
 *    if (isCrisisUrl(currentUrl, allowlist)) {
 *      // Block monitoring for this URL
 *    }
 *    ```
 *
 * ## Manifest.json Requirements
 *
 * ```json
 * {
 *   "permissions": ["storage"],
 *   "web_accessible_resources": [
 *     {
 *       "resources": ["assets/crisis-allowlist.json"],
 *       "matches": ["<all_urls>"]
 *     }
 *   ]
 * }
 * ```
 *
 * ## Storage Quota Notes
 *
 * - chrome.storage.local has 5MB quota (unlimited with unlimitedStorage permission)
 * - Crisis allowlist is typically < 100KB
 * - ETag is < 1KB
 *
 * ## Offline Support
 *
 * - Bundled allowlist ensures protection even when offline
 * - Cache persists across browser sessions
 * - Service worker continues to work offline
 */
export const CHROME_EXTENSION_INTEGRATION_DOCS = `
See JSDoc above for Chrome Extension integration documentation.
`
