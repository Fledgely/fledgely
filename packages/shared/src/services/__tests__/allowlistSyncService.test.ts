/**
 * Allowlist Sync Service Tests
 *
 * Story 7.7: Allowlist Distribution & Sync - Task 2.7
 *
 * Tests for the platform-agnostic sync service including:
 * - Version comparison logic
 * - Fail-safe fallback chain
 * - TTL-based caching
 * - Emergency version handling
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  createAllowlistSyncService,
  isEmergencyVersion,
  compareSemanticVersions,
  shouldResync,
  type AllowlistSyncAdapter,
  type AllowlistSyncConfig,
  type CachedAllowlist,
} from '../allowlistSyncService'
import type { CrisisAllowlist } from '../../constants/crisis-urls'
import { ALLOWLIST_SYNC_CONSTANTS } from '@fledgely/contracts'

// Mock crisis allowlist data
const mockAllowlist: CrisisAllowlist = {
  version: '1.0.0',
  lastUpdated: '2024-01-01T00:00:00Z',
  entries: [
    {
      id: 'test-1',
      domain: '988lifeline.org',
      name: 'Test Crisis Line',
      description: 'Test description',
      category: 'suicide',
      region: 'us',
      aliases: [],
      wildcardPatterns: [],
      contactMethods: [],
    },
  ],
}

const mockEmergencyAllowlist: CrisisAllowlist = {
  version: '1.0.1-emergency-push123',
  lastUpdated: '2024-01-02T00:00:00Z',
  entries: mockAllowlist.entries,
}

const mockBundledAllowlist: CrisisAllowlist = {
  version: '0.9.0',
  lastUpdated: '2023-12-01T00:00:00Z',
  entries: mockAllowlist.entries,
}

// Helper to create mock adapter
function createMockAdapter(overrides?: Partial<AllowlistSyncAdapter>): AllowlistSyncAdapter {
  return {
    getFromCache: vi.fn().mockResolvedValue(null),
    saveToCache: vi.fn().mockResolvedValue(undefined),
    getBundled: vi.fn().mockReturnValue(mockBundledAllowlist),
    reportSyncStatus: vi.fn().mockResolvedValue(undefined),
    getStoredETag: vi.fn().mockResolvedValue(null),
    saveETag: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  }
}

// Helper to create config
function createConfig(overrides?: Partial<AllowlistSyncConfig>): AllowlistSyncConfig {
  return {
    platform: 'web',
    endpoint: 'https://api.test.com/crisis-allowlist',
    ...overrides,
  }
}

describe('isEmergencyVersion', () => {
  it('returns true for emergency versions', () => {
    expect(isEmergencyVersion('1.0.0-emergency-push123')).toBe(true)
    expect(isEmergencyVersion('2.1.3-emergency-abc456')).toBe(true)
    expect(isEmergencyVersion('0.0.1-emergency-x')).toBe(true)
  })

  it('returns false for normal versions', () => {
    expect(isEmergencyVersion('1.0.0')).toBe(false)
    expect(isEmergencyVersion('2.1.3')).toBe(false)
    expect(isEmergencyVersion('1.0.0-beta')).toBe(false)
    expect(isEmergencyVersion('1.0.0-rc.1')).toBe(false)
  })

  it('returns false for empty string', () => {
    expect(isEmergencyVersion('')).toBe(false)
  })
})

describe('compareSemanticVersions', () => {
  it('returns positive when a > b', () => {
    expect(compareSemanticVersions('2.0.0', '1.0.0')).toBeGreaterThan(0)
    expect(compareSemanticVersions('1.1.0', '1.0.0')).toBeGreaterThan(0)
    expect(compareSemanticVersions('1.0.1', '1.0.0')).toBeGreaterThan(0)
  })

  it('returns negative when a < b', () => {
    expect(compareSemanticVersions('1.0.0', '2.0.0')).toBeLessThan(0)
    expect(compareSemanticVersions('1.0.0', '1.1.0')).toBeLessThan(0)
    expect(compareSemanticVersions('1.0.0', '1.0.1')).toBeLessThan(0)
  })

  it('returns 0 when versions are equal', () => {
    expect(compareSemanticVersions('1.0.0', '1.0.0')).toBe(0)
    expect(compareSemanticVersions('2.5.10', '2.5.10')).toBe(0)
  })

  it('ignores suffixes for comparison', () => {
    expect(compareSemanticVersions('1.0.0-emergency-push123', '1.0.0')).toBe(0)
    expect(compareSemanticVersions('1.0.1-emergency-push123', '1.0.0')).toBeGreaterThan(0)
    expect(compareSemanticVersions('1.0.0-beta', '1.0.0')).toBe(0)
  })

  it('handles invalid versions by returning 0', () => {
    expect(compareSemanticVersions('invalid', '1.0.0')).toBeLessThan(0)
    expect(compareSemanticVersions('1.0.0', 'invalid')).toBeGreaterThan(0)
    expect(compareSemanticVersions('', '')).toBe(0)
  })
})

describe('shouldResync', () => {
  describe('same version', () => {
    it('returns false when versions are identical', () => {
      expect(shouldResync('1.0.0', '1.0.0')).toBe(false)
      expect(shouldResync('2.5.10', '2.5.10')).toBe(false)
    })
  })

  describe('emergency versions', () => {
    it('returns true when server has emergency version (different)', () => {
      expect(shouldResync('1.0.0', '1.0.0-emergency-push123')).toBe(true)
      expect(shouldResync('1.0.0-emergency-push1', '1.0.0-emergency-push2')).toBe(true)
    })

    it('returns false when same emergency version', () => {
      expect(shouldResync('1.0.0-emergency-push123', '1.0.0-emergency-push123')).toBe(false)
    })
  })

  describe('semantic version comparison', () => {
    it('returns true when server version is newer', () => {
      expect(shouldResync('1.0.0', '2.0.0')).toBe(true)
      expect(shouldResync('1.0.0', '1.1.0')).toBe(true)
      expect(shouldResync('1.0.0', '1.0.1')).toBe(true)
    })

    it('returns false when server version is older', () => {
      expect(shouldResync('2.0.0', '1.0.0')).toBe(false)
      expect(shouldResync('1.1.0', '1.0.0')).toBe(false)
      expect(shouldResync('1.0.1', '1.0.0')).toBe(false)
    })
  })
})

describe('createAllowlistSyncService', () => {
  let originalFetch: typeof globalThis.fetch

  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-01-15T12:00:00Z'))
    originalFetch = globalThis.fetch
  })

  afterEach(() => {
    vi.useRealTimers()
    globalThis.fetch = originalFetch
    vi.restoreAllMocks()
  })

  // Helper to create config with no retries for fast testing
  function createFastConfig(overrides?: Partial<AllowlistSyncConfig>): AllowlistSyncConfig {
    return {
      platform: 'web',
      endpoint: 'https://api.test.com/crisis-allowlist',
      maxRetryAttempts: 0, // No retries for faster tests
      retryDelayMs: 1,
      networkTimeoutMs: 100,
      ...overrides,
    }
  }

  describe('sync()', () => {
    it('returns cached allowlist if cache is valid', async () => {
      const cachedData: CachedAllowlist = {
        data: mockAllowlist,
        cachedAt: Date.now() - 1000 * 60 * 60, // 1 hour ago
        version: '1.0.0',
        isEmergency: false,
      }
      const adapter = createMockAdapter({
        getFromCache: vi.fn().mockResolvedValue(cachedData),
      })
      const service = createAllowlistSyncService(createConfig(), adapter)

      const result = await service.sync()

      expect(result.source).toBe('cache')
      expect(result.allowlist).toEqual(mockAllowlist)
      expect(result.isEmergency).toBe(false)
      expect(result.wasResync).toBe(false)
    })

    it('fetches from network when cache is expired', async () => {
      const cachedData: CachedAllowlist = {
        data: mockAllowlist,
        cachedAt: Date.now() - ALLOWLIST_SYNC_CONSTANTS.NORMAL_TTL_MS - 1000, // Expired
        version: '1.0.0',
        isEmergency: false,
      }
      const adapter = createMockAdapter({
        getFromCache: vi.fn().mockResolvedValue(cachedData),
      })

      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({ ETag: '"abc123"' }),
        json: () => Promise.resolve(mockAllowlist),
      })

      const service = createAllowlistSyncService(createConfig(), adapter)
      const result = await service.sync()

      expect(result.source).toBe('network')
      expect(result.allowlist).toEqual(mockAllowlist)
      expect(adapter.saveToCache).toHaveBeenCalledWith(mockAllowlist, false)
    })

    it('handles 304 Not Modified response', async () => {
      const cachedData: CachedAllowlist = {
        data: mockAllowlist,
        cachedAt: Date.now() - ALLOWLIST_SYNC_CONSTANTS.NORMAL_TTL_MS - 1000, // Expired
        version: '1.0.0',
        isEmergency: false,
      }
      const adapter = createMockAdapter({
        getFromCache: vi.fn().mockResolvedValue(cachedData),
        getStoredETag: vi.fn().mockResolvedValue('"abc123"'),
      })

      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 304,
      })

      const service = createAllowlistSyncService(createConfig(), adapter)
      const result = await service.sync()

      expect(result.source).toBe('cache')
      expect(adapter.saveToCache).toHaveBeenCalledWith(mockAllowlist, false)
    })

    it('falls back to cache when network fails', async () => {
      const cachedData: CachedAllowlist = {
        data: mockAllowlist,
        cachedAt: Date.now() - ALLOWLIST_SYNC_CONSTANTS.NORMAL_TTL_MS - 1000,
        version: '1.0.0',
        isEmergency: false,
      }
      const adapter = createMockAdapter({
        getFromCache: vi.fn().mockResolvedValue(cachedData),
      })

      globalThis.fetch = vi.fn().mockRejectedValue(new Error('Network error'))

      const service = createAllowlistSyncService(createFastConfig(), adapter)
      const result = await service.sync()

      expect(result.source).toBe('cache')
      expect(result.fallbackReason).toContain('Network fetch failed')
    })

    it('falls back to bundled when cache is empty and network fails', async () => {
      const adapter = createMockAdapter({
        getFromCache: vi.fn().mockResolvedValue(null),
      })

      globalThis.fetch = vi.fn().mockRejectedValue(new Error('Network error'))

      const service = createAllowlistSyncService(createFastConfig(), adapter)
      const result = await service.sync()

      expect(result.source).toBe('bundled')
      expect(result.allowlist).toEqual(mockBundledAllowlist)
      expect(result.fallbackReason).toContain('Network fetch failed')
    })

    it('uses shorter TTL for emergency versions', async () => {
      const cachedData: CachedAllowlist = {
        data: mockEmergencyAllowlist,
        cachedAt: Date.now() - ALLOWLIST_SYNC_CONSTANTS.EMERGENCY_TTL_MS - 1000, // Expired for emergency
        version: '1.0.1-emergency-push123',
        isEmergency: true,
      }
      const adapter = createMockAdapter({
        getFromCache: vi.fn().mockResolvedValue(cachedData),
      })

      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers(),
        json: () => Promise.resolve(mockAllowlist),
      })

      const service = createAllowlistSyncService(createConfig(), adapter)
      const result = await service.sync()

      // Should have fetched from network since emergency TTL expired
      expect(result.source).toBe('network')
    })

    it('reports sync status when configured', async () => {
      const adapter = createMockAdapter({
        getFromCache: vi.fn().mockResolvedValue(null),
      })

      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers(),
        json: () => Promise.resolve(mockAllowlist),
      })

      const service = createAllowlistSyncService(
        createConfig({ syncStatusEndpoint: '/api/sync-status' }),
        adapter
      )
      await service.sync()

      expect(adapter.reportSyncStatus).toHaveBeenCalledWith({
        platform: 'web',
        version: '1.0.0',
        cacheAge: 0,
        isEmergency: false,
      })
    })
  })

  describe('forceSync()', () => {
    it('bypasses cache TTL and fetches fresh', async () => {
      const cachedData: CachedAllowlist = {
        data: mockAllowlist,
        cachedAt: Date.now() - 1000, // Very recent cache
        version: '1.0.0',
        isEmergency: false,
      }
      const adapter = createMockAdapter({
        getFromCache: vi.fn().mockResolvedValue(cachedData),
      })

      const newAllowlist = { ...mockAllowlist, version: '1.0.1' }
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers(),
        json: () => Promise.resolve(newAllowlist),
      })

      const service = createAllowlistSyncService(createConfig(), adapter)
      const result = await service.forceSync()

      expect(result.source).toBe('network')
      expect(result.allowlist.version).toBe('1.0.1')
    })

    it('falls back to cache/bundled on network failure', async () => {
      const adapter = createMockAdapter({
        getFromCache: vi.fn().mockResolvedValue(null),
      })

      globalThis.fetch = vi.fn().mockRejectedValue(new Error('Network error'))

      const service = createAllowlistSyncService(createFastConfig(), adapter)
      const result = await service.forceSync()

      expect(result.source).toBe('bundled')
      expect(result.fallbackReason).toContain('Network fetch failed')
    })
  })

  describe('getAllowlist()', () => {
    it('returns cached allowlist if available', async () => {
      const cachedData: CachedAllowlist = {
        data: mockAllowlist,
        cachedAt: Date.now(),
        version: '1.0.0',
        isEmergency: false,
      }
      const adapter = createMockAdapter({
        getFromCache: vi.fn().mockResolvedValue(cachedData),
      })

      const service = createAllowlistSyncService(createConfig(), adapter)
      const result = await service.getAllowlist()

      expect(result).toEqual(mockAllowlist)
    })

    it('returns bundled allowlist if cache is empty', async () => {
      const adapter = createMockAdapter({
        getFromCache: vi.fn().mockResolvedValue(null),
      })

      const service = createAllowlistSyncService(createConfig(), adapter)
      const result = await service.getAllowlist()

      expect(result).toEqual(mockBundledAllowlist)
    })
  })

  describe('needsRefresh()', () => {
    it('returns true when cache is empty', async () => {
      const adapter = createMockAdapter({
        getFromCache: vi.fn().mockResolvedValue(null),
      })

      const service = createAllowlistSyncService(createConfig(), adapter)
      const result = await service.needsRefresh()

      expect(result).toBe(true)
    })

    it('returns true when cache is expired', async () => {
      const cachedData: CachedAllowlist = {
        data: mockAllowlist,
        cachedAt: Date.now() - ALLOWLIST_SYNC_CONSTANTS.NORMAL_TTL_MS - 1000,
        version: '1.0.0',
        isEmergency: false,
      }
      const adapter = createMockAdapter({
        getFromCache: vi.fn().mockResolvedValue(cachedData),
      })

      const service = createAllowlistSyncService(createConfig(), adapter)
      const result = await service.needsRefresh()

      expect(result).toBe(true)
    })

    it('returns false when cache is valid', async () => {
      const cachedData: CachedAllowlist = {
        data: mockAllowlist,
        cachedAt: Date.now() - 1000 * 60 * 60, // 1 hour ago
        version: '1.0.0',
        isEmergency: false,
      }
      const adapter = createMockAdapter({
        getFromCache: vi.fn().mockResolvedValue(cachedData),
      })

      const service = createAllowlistSyncService(createConfig(), adapter)
      const result = await service.needsRefresh()

      expect(result).toBe(false)
    })
  })

  describe('getSyncStatus()', () => {
    it('returns null when cache is empty', async () => {
      const adapter = createMockAdapter({
        getFromCache: vi.fn().mockResolvedValue(null),
      })

      const service = createAllowlistSyncService(createConfig(), adapter)
      const result = await service.getSyncStatus()

      expect(result).toBeNull()
    })

    it('returns sync status when cache exists', async () => {
      const cachedAt = Date.now() - 1000 * 60 * 60 // 1 hour ago
      const cachedData: CachedAllowlist = {
        data: mockAllowlist,
        cachedAt,
        version: '1.0.0',
        isEmergency: false,
      }
      const adapter = createMockAdapter({
        getFromCache: vi.fn().mockResolvedValue(cachedData),
      })

      const service = createAllowlistSyncService(createConfig(), adapter)
      const result = await service.getSyncStatus()

      expect(result).not.toBeNull()
      expect(result!.platform).toBe('web')
      expect(result!.version).toBe('1.0.0')
      expect(result!.isEmergency).toBe(false)
      expect(result!.isStale).toBe(false) // Not stale (< 48h)
    })

    it('reports stale status when cache age exceeds threshold', async () => {
      const cachedAt = Date.now() - ALLOWLIST_SYNC_CONSTANTS.STALENESS_THRESHOLD_MS - 1000
      const cachedData: CachedAllowlist = {
        data: mockAllowlist,
        cachedAt,
        version: '1.0.0',
        isEmergency: false,
      }
      const adapter = createMockAdapter({
        getFromCache: vi.fn().mockResolvedValue(cachedData),
      })

      const service = createAllowlistSyncService(createConfig(), adapter)
      const result = await service.getSyncStatus()

      expect(result!.isStale).toBe(true)
    })
  })

  describe('network timeout and retries', () => {
    it('retries on network failure', async () => {
      const adapter = createMockAdapter({
        getFromCache: vi.fn().mockResolvedValue(null),
      })

      let callCount = 0
      globalThis.fetch = vi.fn().mockImplementation(() => {
        callCount++
        if (callCount < 3) {
          return Promise.reject(new Error('Network error'))
        }
        return Promise.resolve({
          ok: true,
          status: 200,
          headers: new Headers(),
          json: () => Promise.resolve(mockAllowlist),
        })
      })

      const service = createAllowlistSyncService(
        createConfig({
          maxRetryAttempts: 2,
          retryDelayMs: 10,
        }),
        adapter
      )

      // Advance timers to allow retries
      const syncPromise = service.sync()
      await vi.advanceTimersByTimeAsync(100)
      const result = await syncPromise

      expect(result.source).toBe('network')
      expect(callCount).toBe(3) // Initial + 2 retries
    })

    it('respects max retry attempts', async () => {
      const adapter = createMockAdapter({
        getFromCache: vi.fn().mockResolvedValue(null),
      })

      let callCount = 0
      globalThis.fetch = vi.fn().mockImplementation(() => {
        callCount++
        return Promise.reject(new Error('Network error'))
      })

      const service = createAllowlistSyncService(
        createConfig({
          maxRetryAttempts: 2,
          retryDelayMs: 10,
        }),
        adapter
      )

      const syncPromise = service.sync()
      await vi.advanceTimersByTimeAsync(100)
      const result = await syncPromise

      expect(result.source).toBe('bundled')
      expect(callCount).toBe(3) // Initial + 2 retries
    })

    it('aborts on timeout', async () => {
      const adapter = createMockAdapter({
        getFromCache: vi.fn().mockResolvedValue(null),
      })

      // Mock AbortController to immediately trigger abort
      const abortError = new Error('Aborted')
      abortError.name = 'AbortError'
      globalThis.fetch = vi.fn().mockRejectedValue(abortError)

      const service = createAllowlistSyncService(createFastConfig(), adapter)

      const result = await service.sync()

      expect(result.source).toBe('bundled')
    })
  })

  describe('ETag handling', () => {
    it('sends If-None-Match header when ETag is stored', async () => {
      const cachedData: CachedAllowlist = {
        data: mockAllowlist,
        cachedAt: Date.now() - ALLOWLIST_SYNC_CONSTANTS.NORMAL_TTL_MS - 1000,
        version: '1.0.0',
        isEmergency: false,
      }
      const adapter = createMockAdapter({
        getFromCache: vi.fn().mockResolvedValue(cachedData),
        getStoredETag: vi.fn().mockResolvedValue('"stored-etag"'),
      })

      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({ ETag: '"new-etag"' }),
        json: () => Promise.resolve(mockAllowlist),
      })

      const service = createAllowlistSyncService(createConfig(), adapter)
      await service.sync()

      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: { 'If-None-Match': '"stored-etag"' },
        })
      )
    })

    it('saves new ETag from response', async () => {
      const adapter = createMockAdapter({
        getFromCache: vi.fn().mockResolvedValue(null),
      })

      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({ ETag: '"new-etag"' }),
        json: () => Promise.resolve(mockAllowlist),
      })

      const service = createAllowlistSyncService(createConfig(), adapter)
      await service.sync()

      expect(adapter.saveETag).toHaveBeenCalledWith('"new-etag"')
    })
  })

  describe('emergency version detection', () => {
    it('saves emergency flag when version is emergency', async () => {
      const adapter = createMockAdapter({
        getFromCache: vi.fn().mockResolvedValue(null),
      })

      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers(),
        json: () => Promise.resolve(mockEmergencyAllowlist),
      })

      const service = createAllowlistSyncService(createConfig(), adapter)
      const result = await service.sync()

      expect(result.isEmergency).toBe(true)
      expect(adapter.saveToCache).toHaveBeenCalledWith(mockEmergencyAllowlist, true)
    })
  })

  describe('HTTP error handling', () => {
    it('returns null on 404 without retry', async () => {
      const adapter = createMockAdapter({
        getFromCache: vi.fn().mockResolvedValue(null),
      })

      let callCount = 0
      globalThis.fetch = vi.fn().mockImplementation(() => {
        callCount++
        return Promise.resolve({
          ok: false,
          status: 404,
        })
      })

      const service = createAllowlistSyncService(createConfig(), adapter)
      const result = await service.sync()

      expect(result.source).toBe('bundled')
      expect(callCount).toBe(1) // No retries on 404
    })

    it('returns null on 401 without retry', async () => {
      const adapter = createMockAdapter({
        getFromCache: vi.fn().mockResolvedValue(null),
      })

      let callCount = 0
      globalThis.fetch = vi.fn().mockImplementation(() => {
        callCount++
        return Promise.resolve({
          ok: false,
          status: 401,
        })
      })

      const service = createAllowlistSyncService(createConfig(), adapter)
      const result = await service.sync()

      expect(result.source).toBe('bundled')
      expect(callCount).toBe(1) // No retries on 401
    })

    it('retries on 5xx errors', async () => {
      const adapter = createMockAdapter({
        getFromCache: vi.fn().mockResolvedValue(null),
      })

      let callCount = 0
      globalThis.fetch = vi.fn().mockImplementation(() => {
        callCount++
        if (callCount < 3) {
          return Promise.resolve({
            ok: false,
            status: 500,
          })
        }
        return Promise.resolve({
          ok: true,
          status: 200,
          headers: new Headers(),
          json: () => Promise.resolve(mockAllowlist),
        })
      })

      const service = createAllowlistSyncService(
        createConfig({
          maxRetryAttempts: 2,
          retryDelayMs: 10,
        }),
        adapter
      )

      const syncPromise = service.sync()
      await vi.advanceTimersByTimeAsync(100)
      const result = await syncPromise

      expect(result.source).toBe('network')
      expect(callCount).toBe(3)
    })
  })
})

describe('fail-safe guarantees', () => {
  let originalFetch: typeof globalThis.fetch

  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-01-15T12:00:00Z'))
    originalFetch = globalThis.fetch
  })

  afterEach(() => {
    vi.useRealTimers()
    globalThis.fetch = originalFetch
    vi.restoreAllMocks()
  })

  // Fast config for fail-safe tests (no retries)
  function createFailSafeConfig(): AllowlistSyncConfig {
    return {
      platform: 'web',
      endpoint: 'https://api.test.com/crisis-allowlist',
      maxRetryAttempts: 0,
      retryDelayMs: 1,
      networkTimeoutMs: 100,
    }
  }

  it('NEVER returns empty allowlist - network failure with empty cache', async () => {
    const adapter = createMockAdapter({
      getFromCache: vi.fn().mockResolvedValue(null),
    })

    globalThis.fetch = vi.fn().mockRejectedValue(new Error('Total network failure'))

    const service = createAllowlistSyncService(createFailSafeConfig(), adapter)
    const result = await service.sync()

    expect(result.allowlist).toBeDefined()
    expect(result.allowlist.entries).toBeDefined()
    expect(result.allowlist.version).toBeDefined()
    expect(result.source).toBe('bundled')
  })

  it('NEVER returns empty allowlist - getAllowlist with all failures', async () => {
    const adapter = createMockAdapter({
      getFromCache: vi.fn().mockResolvedValue(null),
    })

    const service = createAllowlistSyncService(createFailSafeConfig(), adapter)
    const result = await service.getAllowlist()

    expect(result).toBeDefined()
    expect(result.entries).toBeDefined()
    expect(result.version).toBeDefined()
  })

  it('NEVER returns empty allowlist - forceSync with all failures', async () => {
    const adapter = createMockAdapter({
      getFromCache: vi.fn().mockResolvedValue(null),
    })

    globalThis.fetch = vi.fn().mockRejectedValue(new Error('Total network failure'))

    const service = createAllowlistSyncService(createFailSafeConfig(), adapter)
    const result = await service.forceSync()

    expect(result.allowlist).toBeDefined()
    expect(result.allowlist.entries).toBeDefined()
    expect(result.source).toBe('bundled')
  })
})
