/**
 * Web Allowlist Adapter Tests
 *
 * Story 7.7: Allowlist Distribution & Sync - Task 5.5
 *
 * Tests for the web platform adapter including:
 * - localStorage caching
 * - Bundled fallback
 * - ETag handling
 * - Emergency version detection
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  createWebAllowlistAdapter,
  getCacheAge,
  getCachedVersion,
  hasEmergencyEntries,
  clearCache,
} from '../webAllowlistAdapter'
import type { CrisisAllowlist } from '@fledgely/shared'

// Mock localStorage
const mockLocalStorage = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key]
    }),
    clear: vi.fn(() => {
      store = {}
    }),
    get store() {
      return store
    },
  }
})()

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
})

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
      priority: 100,
    },
  ],
}

const mockEmergencyAllowlist: CrisisAllowlist = {
  version: '1.0.1-emergency-push123',
  lastUpdated: '2024-01-02T00:00:00Z',
  entries: mockAllowlist.entries,
}

describe('createWebAllowlistAdapter', () => {
  beforeEach(() => {
    mockLocalStorage.clear()
    vi.clearAllMocks()
  })

  describe('getFromCache', () => {
    it('returns null when cache is empty', async () => {
      const adapter = createWebAllowlistAdapter()
      const result = await adapter.getFromCache()
      expect(result).toBeNull()
    })

    it('returns cached data when present', async () => {
      const cached = {
        data: mockAllowlist,
        cachedAt: Date.now(),
        version: mockAllowlist.version,
        isEmergency: false,
      }
      mockLocalStorage.setItem('fledgely_crisis_allowlist', JSON.stringify(cached))

      const adapter = createWebAllowlistAdapter()
      const result = await adapter.getFromCache()

      expect(result).not.toBeNull()
      expect(result?.data).toEqual(mockAllowlist)
      expect(result?.version).toBe('1.0.0')
    })

    it('returns null on JSON parse error', async () => {
      mockLocalStorage.setItem('fledgely_crisis_allowlist', 'invalid json')

      const adapter = createWebAllowlistAdapter()
      const result = await adapter.getFromCache()

      expect(result).toBeNull()
    })
  })

  describe('saveToCache', () => {
    it('saves allowlist to localStorage', async () => {
      const adapter = createWebAllowlistAdapter()
      await adapter.saveToCache(mockAllowlist, false)

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'fledgely_crisis_allowlist',
        expect.any(String)
      )

      const saved = JSON.parse(mockLocalStorage.store['fledgely_crisis_allowlist'])
      expect(saved.data).toEqual(mockAllowlist)
      expect(saved.version).toBe('1.0.0')
      expect(saved.isEmergency).toBe(false)
    })

    it('saves emergency flag correctly', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

      const adapter = createWebAllowlistAdapter()
      await adapter.saveToCache(mockEmergencyAllowlist, true)

      const saved = JSON.parse(mockLocalStorage.store['fledgely_crisis_allowlist'])
      expect(saved.isEmergency).toBe(true)
      expect(consoleSpy).toHaveBeenCalledWith(
        'Emergency crisis allowlist cached',
        expect.objectContaining({ version: '1.0.1-emergency-push123' })
      )

      consoleSpy.mockRestore()
    })
  })

  describe('getBundled', () => {
    it('returns bundled allowlist from @fledgely/shared', () => {
      const adapter = createWebAllowlistAdapter()
      const result = adapter.getBundled()

      expect(result).toBeDefined()
      expect(result.version).toBeDefined()
      expect(result.entries).toBeDefined()
      expect(result.entries.length).toBeGreaterThan(0)
    })
  })

  describe('reportSyncStatus', () => {
    let fetchSpy: ReturnType<typeof vi.spyOn>

    beforeEach(() => {
      fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue(new Response())
    })

    afterEach(() => {
      fetchSpy.mockRestore()
    })

    it('posts sync status to server', async () => {
      const adapter = createWebAllowlistAdapter()
      await adapter.reportSyncStatus?.({
        platform: 'web',
        version: '1.0.0',
        cacheAge: 1000,
        isEmergency: false,
      })

      expect(fetchSpy).toHaveBeenCalledWith(
        '/api/allowlist-sync-status',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        })
      )
    })

    it('fails silently on network error', async () => {
      fetchSpy.mockRejectedValue(new Error('Network error'))
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      const adapter = createWebAllowlistAdapter()
      await expect(
        adapter.reportSyncStatus?.({
          platform: 'web',
          version: '1.0.0',
          cacheAge: 1000,
          isEmergency: false,
        })
      ).resolves.not.toThrow()

      expect(consoleSpy).toHaveBeenCalledWith('Failed to report sync status')
      consoleSpy.mockRestore()
    })
  })

  describe('getStoredETag', () => {
    it('returns null when no ETag stored', async () => {
      const adapter = createWebAllowlistAdapter()
      const result = await adapter.getStoredETag?.()
      expect(result).toBeNull()
    })

    it('returns stored ETag', async () => {
      mockLocalStorage.setItem('fledgely_crisis_allowlist_etag', '"abc123"')

      const adapter = createWebAllowlistAdapter()
      const result = await adapter.getStoredETag?.()

      expect(result).toBe('"abc123"')
    })
  })

  describe('saveETag', () => {
    it('saves ETag to localStorage', async () => {
      const adapter = createWebAllowlistAdapter()
      await adapter.saveETag?.('"abc123"')

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'fledgely_crisis_allowlist_etag',
        '"abc123"'
      )
    })
  })
})

describe('utility functions', () => {
  beforeEach(() => {
    mockLocalStorage.clear()
    vi.clearAllMocks()
  })

  describe('getCacheAge', () => {
    it('returns null when no cache', () => {
      expect(getCacheAge()).toBeNull()
    })

    it('returns age in milliseconds', () => {
      const cachedAt = Date.now() - 1000
      const cached = {
        data: mockAllowlist,
        cachedAt,
        version: mockAllowlist.version,
        isEmergency: false,
      }
      mockLocalStorage.setItem('fledgely_crisis_allowlist', JSON.stringify(cached))

      const age = getCacheAge()
      expect(age).toBeGreaterThanOrEqual(1000)
      expect(age).toBeLessThan(2000)
    })
  })

  describe('getCachedVersion', () => {
    it('returns null when no cache', () => {
      expect(getCachedVersion()).toBeNull()
    })

    it('returns cached version', () => {
      const cached = {
        data: mockAllowlist,
        cachedAt: Date.now(),
        version: '1.2.3',
        isEmergency: false,
      }
      mockLocalStorage.setItem('fledgely_crisis_allowlist', JSON.stringify(cached))

      expect(getCachedVersion()).toBe('1.2.3')
    })
  })

  describe('hasEmergencyEntries', () => {
    it('returns false when no cache', () => {
      expect(hasEmergencyEntries()).toBe(false)
    })

    it('returns false for normal version', () => {
      const cached = {
        data: mockAllowlist,
        cachedAt: Date.now(),
        version: '1.0.0',
        isEmergency: false,
      }
      mockLocalStorage.setItem('fledgely_crisis_allowlist', JSON.stringify(cached))

      expect(hasEmergencyEntries()).toBe(false)
    })

    it('returns true when isEmergency flag is set', () => {
      const cached = {
        data: mockAllowlist,
        cachedAt: Date.now(),
        version: '1.0.0',
        isEmergency: true,
      }
      mockLocalStorage.setItem('fledgely_crisis_allowlist', JSON.stringify(cached))

      expect(hasEmergencyEntries()).toBe(true)
    })

    it('returns true for emergency version string', () => {
      const cached = {
        data: mockEmergencyAllowlist,
        cachedAt: Date.now(),
        version: '1.0.1-emergency-push123',
        isEmergency: false, // Even if flag is false, version detection works
      }
      mockLocalStorage.setItem('fledgely_crisis_allowlist', JSON.stringify(cached))

      expect(hasEmergencyEntries()).toBe(true)
    })
  })

  describe('clearCache', () => {
    it('removes cache and ETag from localStorage', () => {
      mockLocalStorage.setItem('fledgely_crisis_allowlist', 'data')
      mockLocalStorage.setItem('fledgely_crisis_allowlist_etag', 'etag')

      clearCache()

      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('fledgely_crisis_allowlist')
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('fledgely_crisis_allowlist_etag')
    })
  })
})
