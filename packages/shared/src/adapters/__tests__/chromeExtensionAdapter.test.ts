/**
 * Chrome Extension Adapter Interface Tests
 *
 * Story 7.7: Allowlist Distribution & Sync - Task 6.4
 *
 * Tests for the Chrome extension adapter interface.
 * These tests verify the interface contract, not the actual Chrome API calls.
 */

import { describe, it, expect } from 'vitest'
import {
  createChromeExtensionAdapter,
  CHROME_CACHE_KEY,
  CHROME_ETAG_KEY,
  type ChromeExtensionAdapterConfig,
} from '../chromeExtensionAdapter'

describe('Chrome Extension Adapter Constants', () => {
  it('has correct cache key', () => {
    expect(CHROME_CACHE_KEY).toBe('crisis_allowlist')
  })

  it('has correct ETag key', () => {
    expect(CHROME_ETAG_KEY).toBe('crisis_allowlist_etag')
  })
})

describe('createChromeExtensionAdapter', () => {
  const config: ChromeExtensionAdapterConfig = {
    bundledAllowlistUrl: 'chrome-extension://abc123/assets/crisis-allowlist.json',
    syncStatusEndpoint: 'https://api.test.com/allowlist-sync-status',
  }

  it('returns adapter with all required methods', () => {
    const adapter = createChromeExtensionAdapter(config)

    expect(adapter).toBeDefined()
    expect(typeof adapter.getFromCache).toBe('function')
    expect(typeof adapter.saveToCache).toBe('function')
    expect(typeof adapter.getBundled).toBe('function')
    expect(typeof adapter.reportSyncStatus).toBe('function')
    expect(typeof adapter.getStoredETag).toBe('function')
    expect(typeof adapter.saveETag).toBe('function')
  })

  it('getFromCache throws placeholder error', async () => {
    const adapter = createChromeExtensionAdapter(config)

    await expect(adapter.getFromCache()).rejects.toThrow(
      'requires chrome.storage API'
    )
  })

  it('saveToCache throws placeholder error', async () => {
    const adapter = createChromeExtensionAdapter(config)
    const mockAllowlist = {
      version: '1.0.0',
      lastUpdated: '2024-01-01',
      entries: [],
    }

    await expect(adapter.saveToCache(mockAllowlist, false)).rejects.toThrow(
      'requires chrome.storage API'
    )
  })

  it('getBundled throws placeholder error', () => {
    const adapter = createChromeExtensionAdapter(config)

    expect(() => adapter.getBundled()).toThrow('requires bundled JSON')
  })

  it('getStoredETag throws placeholder error', async () => {
    const adapter = createChromeExtensionAdapter(config)

    await expect(adapter.getStoredETag?.()).rejects.toThrow(
      'requires chrome.storage API'
    )
  })

  it('saveETag throws placeholder error', async () => {
    const adapter = createChromeExtensionAdapter(config)

    await expect(adapter.saveETag?.('"abc123"')).rejects.toThrow(
      'requires chrome.storage API'
    )
  })
})

describe('Chrome Extension Adapter Interface Contract', () => {
  it('interface matches AllowlistSyncAdapter shape', () => {
    // This test verifies TypeScript compilation succeeds
    // If this compiles, the interface is correct
    const config: ChromeExtensionAdapterConfig = {
      bundledAllowlistUrl: 'test-url',
    }

    const adapter = createChromeExtensionAdapter(config)

    // Required methods
    expect(adapter.getFromCache).toBeDefined()
    expect(adapter.saveToCache).toBeDefined()
    expect(adapter.getBundled).toBeDefined()

    // Optional methods
    expect(adapter.reportSyncStatus).toBeDefined()
    expect(adapter.getStoredETag).toBeDefined()
    expect(adapter.saveETag).toBeDefined()
  })
})
