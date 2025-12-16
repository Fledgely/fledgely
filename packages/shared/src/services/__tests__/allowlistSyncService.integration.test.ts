/**
 * Integration Tests for Allowlist Sync Service
 *
 * Story 7.7: Allowlist Distribution & Sync - Task 10
 *
 * These tests verify the complete sync service behavior including:
 * - Full sync workflow with mock server
 * - TTL-based caching behavior
 * - Version mismatch re-sync
 * - Complete fallback chain (Network → Cache → Bundled)
 * - Zero-data-path verification (no URL logging)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  createAllowlistSyncService,
  type AllowlistSyncConfig,
  type AllowlistSyncAdapter,
  type CachedAllowlist,
  isEmergencyVersion,
  compareSemanticVersions,
  shouldResync,
} from '../allowlistSyncService'
import type { CrisisAllowlist } from '../../constants/crisis-urls'

// Test data
const MOCK_BUNDLED_ALLOWLIST: CrisisAllowlist = {
  version: '1.0.0-2025-12-15T00:00:00Z',
  lastUpdated: '2025-12-15T00:00:00Z',
  entries: [
    {
      id: 'bundled-1',
      domain: '988lifeline.org',
      category: 'suicide',
      aliases: [],
      wildcardPatterns: [],
      name: 'Bundled Crisis Line',
      description: 'Test bundled entry',
      region: 'us',
      contactMethods: ['phone'],
    },
  ],
}

const MOCK_SERVER_ALLOWLIST: CrisisAllowlist = {
  version: '1.0.1-2025-12-16T00:00:00Z',
  lastUpdated: '2025-12-16T00:00:00Z',
  entries: [
    ...MOCK_BUNDLED_ALLOWLIST.entries,
    {
      id: 'server-1',
      domain: 'crisistextline.org',
      category: 'crisis',
      aliases: [],
      wildcardPatterns: [],
      name: 'Server Crisis Line',
      description: 'Test server entry',
      region: 'us',
      contactMethods: ['text'],
    },
  ],
}

const MOCK_EMERGENCY_ALLOWLIST: CrisisAllowlist = {
  version: '1.0.1-emergency-push123',
  lastUpdated: '2025-12-16T12:00:00Z',
  entries: [
    ...MOCK_SERVER_ALLOWLIST.entries,
    {
      id: 'emergency-1',
      domain: 'emergency-resource.org',
      category: 'crisis',
      aliases: [],
      wildcardPatterns: [],
      name: 'Emergency Resource',
      description: 'Emergency push entry',
      region: 'us',
      contactMethods: ['phone'],
    },
  ],
}

/**
 * Create a test config with fast timeouts
 */
function createTestConfig(overrides?: Partial<AllowlistSyncConfig>): AllowlistSyncConfig {
  return {
    platform: 'web',
    endpoint: 'https://api.test.com/crisis-allowlist',
    ttlMs: 1000, // 1 second for faster tests
    emergencyTtlMs: 500, // 0.5 second
    networkTimeoutMs: 100,
    maxRetryAttempts: 0, // No retries for faster tests
    retryDelayMs: 1,
    ...overrides,
  }
}

/**
 * Create a mock adapter with configurable behavior
 */
function createMockAdapter(options: {
  cachedAllowlist?: CachedAllowlist | null
  bundledAllowlist?: CrisisAllowlist
  saveToCache?: ReturnType<typeof vi.fn>
  reportSyncStatus?: ReturnType<typeof vi.fn>
  storedETag?: string | null
  saveETag?: ReturnType<typeof vi.fn>
}): AllowlistSyncAdapter {
  return {
    getFromCache: vi.fn().mockResolvedValue(options.cachedAllowlist ?? null),
    saveToCache:
      options.saveToCache ?? vi.fn().mockResolvedValue(undefined),
    getBundled: vi.fn().mockReturnValue(
      options.bundledAllowlist ?? MOCK_BUNDLED_ALLOWLIST
    ),
    reportSyncStatus:
      options.reportSyncStatus ?? vi.fn().mockResolvedValue(undefined),
    getStoredETag: vi.fn().mockResolvedValue(options.storedETag ?? null),
    saveETag: options.saveETag ?? vi.fn().mockResolvedValue(undefined),
  }
}

/**
 * Create a mock fetch response
 */
function createMockFetchResponse(
  allowlist: CrisisAllowlist,
  options: { status?: number; etag?: string; notModified?: boolean } = {}
): Response {
  if (options.notModified) {
    return new Response(null, { status: 304 })
  }

  return new Response(JSON.stringify(allowlist), {
    status: options.status ?? 200,
    headers: {
      'Content-Type': 'application/json',
      'ETag': options.etag ?? allowlist.version,
    },
  })
}

describe('Allowlist Sync Service Integration', () => {
  let originalFetch: typeof globalThis.fetch

  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2025-12-16T10:00:00Z'))
    originalFetch = globalThis.fetch
  })

  afterEach(() => {
    vi.useRealTimers()
    globalThis.fetch = originalFetch
    vi.restoreAllMocks()
  })

  describe('Full Sync Workflow', () => {
    it('syncs fresh allowlist from server when no cache exists', async () => {
      const saveToCacheFn = vi.fn()
      const adapter = createMockAdapter({
        cachedAllowlist: null,
        saveToCache: saveToCacheFn,
      })
      const config = createTestConfig()

      globalThis.fetch = vi
        .fn()
        .mockResolvedValue(createMockFetchResponse(MOCK_SERVER_ALLOWLIST))

      const service = createAllowlistSyncService(config, adapter)
      const result = await service.sync()

      expect(result.source).toBe('network')
      expect(result.allowlist.version).toBe(MOCK_SERVER_ALLOWLIST.version)
      expect(result.allowlist.entries.length).toBe(
        MOCK_SERVER_ALLOWLIST.entries.length
      )
      expect(saveToCacheFn).toHaveBeenCalled()
    })

    it('returns cached allowlist when within TTL', async () => {
      const cachedAt = Date.now() - 500 // 0.5 seconds ago, within 1 second TTL
      const adapter = createMockAdapter({
        cachedAllowlist: {
          data: MOCK_SERVER_ALLOWLIST,
          cachedAt,
          version: MOCK_SERVER_ALLOWLIST.version,
          isEmergency: false,
        },
      })
      const config = createTestConfig()

      const fetchFn = vi.fn()
      globalThis.fetch = fetchFn

      const service = createAllowlistSyncService(config, adapter)
      const result = await service.sync()

      expect(result.source).toBe('cache')
      expect(result.allowlist.version).toBe(MOCK_SERVER_ALLOWLIST.version)
      expect(fetchFn).not.toHaveBeenCalled()
    })

    it('fetches from network when cache is expired', async () => {
      const cachedAt = Date.now() - 2000 // 2 seconds ago, beyond 1 second TTL
      const adapter = createMockAdapter({
        cachedAllowlist: {
          data: MOCK_BUNDLED_ALLOWLIST,
          cachedAt,
          version: MOCK_BUNDLED_ALLOWLIST.version,
          isEmergency: false,
        },
      })
      const config = createTestConfig()

      globalThis.fetch = vi
        .fn()
        .mockResolvedValue(createMockFetchResponse(MOCK_SERVER_ALLOWLIST))

      const service = createAllowlistSyncService(config, adapter)
      const result = await service.sync()

      expect(result.source).toBe('network')
      expect(result.allowlist.version).toBe(MOCK_SERVER_ALLOWLIST.version)
    })
  })

  describe('TTL-Based Caching Behavior', () => {
    it('uses shorter TTL for emergency versions', async () => {
      const emergencyCachedAt = Date.now() - 600 // 0.6 seconds ago
      // Should be expired for emergency TTL (0.5s) but not normal TTL (1s)

      const adapter = createMockAdapter({
        cachedAllowlist: {
          data: MOCK_EMERGENCY_ALLOWLIST,
          cachedAt: emergencyCachedAt,
          version: MOCK_EMERGENCY_ALLOWLIST.version,
          isEmergency: true,
        },
      })
      const config = createTestConfig()

      globalThis.fetch = vi
        .fn()
        .mockResolvedValue(createMockFetchResponse(MOCK_SERVER_ALLOWLIST))

      const service = createAllowlistSyncService(config, adapter)
      const result = await service.sync()

      // Should fetch because emergency TTL expired
      expect(result.source).toBe('network')
    })

    it('uses normal TTL for regular versions', async () => {
      const normalCachedAt = Date.now() - 600 // 0.6 seconds ago
      // Should NOT be expired for normal TTL (1s)

      const adapter = createMockAdapter({
        cachedAllowlist: {
          data: MOCK_SERVER_ALLOWLIST,
          cachedAt: normalCachedAt,
          version: MOCK_SERVER_ALLOWLIST.version,
          isEmergency: false,
        },
      })
      const config = createTestConfig()

      const fetchFn = vi.fn()
      globalThis.fetch = fetchFn

      const service = createAllowlistSyncService(config, adapter)
      const result = await service.sync()

      // Should use cache because normal TTL not expired
      expect(result.source).toBe('cache')
      expect(fetchFn).not.toHaveBeenCalled()
    })
  })

  describe('Version Mismatch Re-sync', () => {
    it('detects version mismatch during sync', async () => {
      const adapter = createMockAdapter({
        cachedAllowlist: {
          data: MOCK_BUNDLED_ALLOWLIST, // Older version
          cachedAt: Date.now() - 2000, // Expired
          version: MOCK_BUNDLED_ALLOWLIST.version,
          isEmergency: false,
        },
      })
      const config = createTestConfig()

      globalThis.fetch = vi
        .fn()
        .mockResolvedValue(createMockFetchResponse(MOCK_SERVER_ALLOWLIST))

      const service = createAllowlistSyncService(config, adapter)
      const result = await service.sync()

      expect(result.allowlist.version).toBe(MOCK_SERVER_ALLOWLIST.version)
      expect(result.allowlist.entries.length).toBeGreaterThan(
        MOCK_BUNDLED_ALLOWLIST.entries.length
      )
    })

    it('emergency versions always trigger re-sync', async () => {
      expect(isEmergencyVersion('1.0.0-emergency-push123')).toBe(true)
      expect(shouldResync('1.0.0', '1.0.0-emergency-push123')).toBe(true)
    })
  })

  describe('Complete Fallback Chain', () => {
    it('falls back to cache when network fails', async () => {
      const cachedAt = Date.now() - 2000 // Expired cache
      const adapter = createMockAdapter({
        cachedAllowlist: {
          data: MOCK_SERVER_ALLOWLIST,
          cachedAt,
          version: MOCK_SERVER_ALLOWLIST.version,
          isEmergency: false,
        },
      })
      const config = createTestConfig()

      globalThis.fetch = vi.fn().mockRejectedValue(new Error('Network error'))

      const service = createAllowlistSyncService(config, adapter)
      const result = await service.sync()

      // Should use stale cache instead of failing
      // Source will be 'stale-cache' when using expired cache after network failure
      expect(['cache', 'stale-cache']).toContain(result.source)
      expect(result.allowlist.version).toBe(MOCK_SERVER_ALLOWLIST.version)
    })

    it('falls back to bundled when network and cache fail', async () => {
      const adapter = createMockAdapter({
        cachedAllowlist: null, // No cache
      })
      const config = createTestConfig()

      globalThis.fetch = vi.fn().mockRejectedValue(new Error('Network error'))

      const service = createAllowlistSyncService(config, adapter)
      const result = await service.sync()

      expect(result.source).toBe('bundled')
      expect(result.allowlist.version).toBe(MOCK_BUNDLED_ALLOWLIST.version)
    })

    it('never returns empty allowlist - always has bundled fallback', async () => {
      const adapter = createMockAdapter({
        cachedAllowlist: null,
        bundledAllowlist: MOCK_BUNDLED_ALLOWLIST,
      })
      const config = createTestConfig()

      // Network fails
      globalThis.fetch = vi.fn().mockRejectedValue(new Error('Network error'))

      const service = createAllowlistSyncService(config, adapter)
      const result = await service.sync()

      // Must always have entries
      expect(result.allowlist.entries.length).toBeGreaterThan(0)
    })
  })

  describe('Force Sync', () => {
    it('bypasses cache and fetches from network', async () => {
      const cachedAt = Date.now() - 100 // Very fresh cache
      const saveToCacheFn = vi.fn()
      const adapter = createMockAdapter({
        cachedAllowlist: {
          data: MOCK_BUNDLED_ALLOWLIST,
          cachedAt,
          version: MOCK_BUNDLED_ALLOWLIST.version,
          isEmergency: false,
        },
        saveToCache: saveToCacheFn,
      })
      const config = createTestConfig()

      globalThis.fetch = vi
        .fn()
        .mockResolvedValue(createMockFetchResponse(MOCK_SERVER_ALLOWLIST))

      const service = createAllowlistSyncService(config, adapter)
      const result = await service.forceSync()

      expect(result.source).toBe('network')
      expect(result.allowlist.version).toBe(MOCK_SERVER_ALLOWLIST.version)
      expect(saveToCacheFn).toHaveBeenCalled()
    })
  })

  describe('ETag Handling', () => {
    it('uses stored ETag for conditional requests', async () => {
      const cachedAt = Date.now() - 2000 // Expired
      const adapter = createMockAdapter({
        cachedAllowlist: {
          data: MOCK_SERVER_ALLOWLIST,
          cachedAt,
          version: MOCK_SERVER_ALLOWLIST.version,
          isEmergency: false,
        },
        storedETag: MOCK_SERVER_ALLOWLIST.version,
      })
      const config = createTestConfig()

      const fetchFn = vi.fn().mockResolvedValue(
        createMockFetchResponse(MOCK_SERVER_ALLOWLIST, { notModified: true })
      )
      globalThis.fetch = fetchFn

      const service = createAllowlistSyncService(config, adapter)
      const result = await service.sync()

      // Should send If-None-Match header
      expect(fetchFn).toHaveBeenCalledWith(
        config.endpoint,
        expect.objectContaining({
          headers: expect.objectContaining({
            'If-None-Match': MOCK_SERVER_ALLOWLIST.version,
          }),
        })
      )

      // Should use cached data on 304 - source may be 'cache' or 'stale-cache'
      expect(['cache', 'stale-cache']).toContain(result.source)
    })
  })

  describe('Zero-Data-Path Verification', () => {
    it('does not log URLs or query data during sync', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      const adapter = createMockAdapter({
        cachedAllowlist: null,
      })
      const config = createTestConfig()

      globalThis.fetch = vi
        .fn()
        .mockResolvedValue(createMockFetchResponse(MOCK_SERVER_ALLOWLIST))

      const service = createAllowlistSyncService(config, adapter)
      await service.sync()

      // Verify no URL-related logging
      const allLogs = [
        ...consoleSpy.mock.calls,
        ...consoleWarnSpy.mock.calls,
      ]
        .flat()
        .join(' ')

      // Should not contain any user URLs or domains (only allowed internal domains)
      expect(allLogs).not.toMatch(/988lifeline\.org/)
      expect(allLogs).not.toMatch(/crisistextline\.org/)

      consoleSpy.mockRestore()
      consoleWarnSpy.mockRestore()
    })
  })

  describe('Sync Status', () => {
    it('provides accurate sync status', async () => {
      const cachedAt = Date.now() - 500
      const adapter = createMockAdapter({
        cachedAllowlist: {
          data: MOCK_SERVER_ALLOWLIST,
          cachedAt,
          version: MOCK_SERVER_ALLOWLIST.version,
          isEmergency: false,
        },
      })
      const config = createTestConfig()

      const service = createAllowlistSyncService(config, adapter)
      const status = await service.getSyncStatus()

      expect(status).not.toBeNull()
      expect(status!.platform).toBe('web')
      expect(status!.version).toBe(MOCK_SERVER_ALLOWLIST.version)
      expect(status!.cacheAge).toBeGreaterThan(0)
    })

    it('reports when refresh is needed based on cache state', async () => {
      // Test with no cache - should need refresh
      const adapterNoCache = createMockAdapter({
        cachedAllowlist: null,
      })
      const config = createTestConfig()

      const serviceNoCache = createAllowlistSyncService(config, adapterNoCache)
      const needsRefreshNoCache = await serviceNoCache.needsRefresh()

      // No cache means we need to refresh
      expect(needsRefreshNoCache).toBe(true)
    })
  })

  describe('Version Comparison Utilities', () => {
    it('compareSemanticVersions handles standard versions', () => {
      expect(compareSemanticVersions('1.0.0', '1.0.1')).toBeLessThan(0)
      expect(compareSemanticVersions('1.0.1', '1.0.0')).toBeGreaterThan(0)
      expect(compareSemanticVersions('1.0.0', '1.0.0')).toBe(0)
      expect(compareSemanticVersions('2.0.0', '1.9.9')).toBeGreaterThan(0)
    })

    it('shouldResync detects upgrade needed', () => {
      expect(shouldResync('1.0.0', '1.0.1')).toBe(true)
      expect(shouldResync('1.0.1', '1.0.0')).toBe(false)
      expect(shouldResync('1.0.0', '1.0.0')).toBe(false)
    })

    it('shouldResync prioritizes emergency versions', () => {
      expect(shouldResync('1.0.0', '1.0.0-emergency-abc')).toBe(true)
      expect(shouldResync('1.0.1', '1.0.0-emergency-abc')).toBe(true)
    })
  })
})
