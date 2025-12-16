/**
 * Allowlist Cache Service Tests
 *
 * Story 7.2: Crisis Visit Zero-Data-Path - Task 3.6
 *
 * Tests caching, fallback, and fail-safe behavior.
 *
 * NFR28: Allowlist must be cached locally (fail-safe to protection)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock @fledgely/shared
const mockBundledAllowlist = {
  version: '1.0.0-bundled',
  lastUpdated: '2025-12-16T00:00:00Z',
  entries: [
    {
      id: 'bundled-1',
      domain: '988lifeline.org',
      category: 'suicide' as const,
      aliases: [],
      wildcardPatterns: [],
      name: 'Bundled Crisis Line',
      description: 'Bundled fallback',
      region: 'us' as const,
      contactMethods: ['phone' as const],
    },
  ],
}

vi.mock('@fledgely/shared', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@fledgely/shared')>()
  return {
    ...actual,
    getCrisisAllowlist: vi.fn(() => mockBundledAllowlist),
  }
})

// Mock fetch
const mockFetch = vi.fn()
global.fetch = mockFetch

// Mock localStorage
const localStorageMock = (() => {
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
    get length() {
      return Object.keys(store).length
    },
    key: vi.fn((index: number) => Object.keys(store)[index] || null),
  }
})()

Object.defineProperty(global, 'localStorage', {
  value: localStorageMock,
  writable: true,
})

import {
  saveToCache,
  getFromCache,
  getFromCacheOrBundled,
  isCacheValid,
  getCacheAge,
  clearCache,
  getAllowlistWithFallback,
  refreshCacheOnLaunch,
  getCachedVersion,
  isEmergencyVersion,
  forceRefresh,
  hasEmergencyEntries,
  __resetSyncService,
  __setTestMode,
} from './allowlistCacheService'
import { getCrisisAllowlist } from '@fledgely/shared'

const mockGetCrisisAllowlist = vi.mocked(getCrisisAllowlist)

describe('allowlistCacheService', () => {
  const testAllowlist = {
    version: '1.0.0-test',
    lastUpdated: '2025-12-16T12:00:00Z',
    entries: [
      {
        id: 'test-1',
        domain: '988lifeline.org',
        category: 'suicide' as const,
        aliases: [],
        wildcardPatterns: [],
        name: 'Test Crisis Line',
        description: 'Test',
        region: 'us' as const,
        contactMethods: ['phone' as const],
      },
    ],
  }

  beforeEach(() => {
    vi.clearAllMocks()
    localStorageMock.clear()
    __setTestMode(true) // Enable test mode (no retries)
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2025-12-16T12:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
    __setTestMode(false) // Disable test mode
  })

  describe('saveToCache', () => {
    it('saves allowlist to localStorage', () => {
      saveToCache(testAllowlist)

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'fledgely_crisis_allowlist',
        expect.any(String)
      )

      const savedData = JSON.parse(
        localStorageMock.setItem.mock.calls[0][1] as string
      )
      expect(savedData.data).toEqual(testAllowlist)
      expect(savedData.version).toBe(testAllowlist.version)
      expect(savedData.cachedAt).toBe(Date.now())
    })

    it('handles localStorage errors gracefully', () => {
      localStorageMock.setItem.mockImplementationOnce(() => {
        throw new Error('QuotaExceeded')
      })

      // Should not throw
      expect(() => saveToCache(testAllowlist)).not.toThrow()
    })
  })

  describe('getFromCache', () => {
    it('returns cached allowlist when valid', () => {
      const cached = {
        data: testAllowlist,
        cachedAt: Date.now(),
        version: testAllowlist.version,
      }
      localStorageMock.getItem.mockReturnValue(JSON.stringify(cached))

      const result = getFromCache()

      expect(result).toEqual(testAllowlist)
    })

    it('returns null when cache is empty', () => {
      localStorageMock.getItem.mockReturnValue(null)

      const result = getFromCache()

      expect(result).toBeNull()
    })

    it('returns null when cache is expired (>24h)', () => {
      const cached = {
        data: testAllowlist,
        cachedAt: Date.now() - 25 * 60 * 60 * 1000, // 25 hours ago
        version: testAllowlist.version,
      }
      localStorageMock.getItem.mockReturnValue(JSON.stringify(cached))

      const result = getFromCache()

      expect(result).toBeNull()
    })

    it('returns null on JSON parse error', () => {
      localStorageMock.getItem.mockReturnValue('invalid json')

      const result = getFromCache()

      expect(result).toBeNull()
    })
  })

  describe('getFromCacheOrBundled', () => {
    it('returns cached data when available', () => {
      const cached = {
        data: testAllowlist,
        cachedAt: Date.now(),
        version: testAllowlist.version,
      }
      localStorageMock.getItem.mockReturnValue(JSON.stringify(cached))

      const result = getFromCacheOrBundled()

      expect(result).toEqual(testAllowlist)
    })

    it('returns bundled allowlist when cache is empty', () => {
      localStorageMock.getItem.mockReturnValue(null)

      const result = getFromCacheOrBundled()

      expect(result).toEqual(mockBundledAllowlist)
      expect(mockGetCrisisAllowlist).toHaveBeenCalled()
    })

    it('returns bundled allowlist when cache is expired', () => {
      const cached = {
        data: testAllowlist,
        cachedAt: Date.now() - 25 * 60 * 60 * 1000,
        version: testAllowlist.version,
      }
      localStorageMock.getItem.mockReturnValue(JSON.stringify(cached))

      const result = getFromCacheOrBundled()

      expect(result).toEqual(mockBundledAllowlist)
    })
  })

  describe('isCacheValid', () => {
    it('returns true when cache exists and not expired', () => {
      const cached = {
        data: testAllowlist,
        cachedAt: Date.now() - 1000, // 1 second ago
        version: testAllowlist.version,
      }
      localStorageMock.getItem.mockReturnValue(JSON.stringify(cached))

      expect(isCacheValid()).toBe(true)
    })

    it('returns false when cache is empty', () => {
      localStorageMock.getItem.mockReturnValue(null)

      expect(isCacheValid()).toBe(false)
    })

    it('returns false when cache is expired', () => {
      const cached = {
        data: testAllowlist,
        cachedAt: Date.now() - 25 * 60 * 60 * 1000,
        version: testAllowlist.version,
      }
      localStorageMock.getItem.mockReturnValue(JSON.stringify(cached))

      expect(isCacheValid()).toBe(false)
    })
  })

  describe('getCacheAge', () => {
    it('returns age in milliseconds', () => {
      const cached = {
        data: testAllowlist,
        cachedAt: Date.now() - 5000,
        version: testAllowlist.version,
      }
      localStorageMock.getItem.mockReturnValue(JSON.stringify(cached))

      const age = getCacheAge()

      expect(age).toBe(5000)
    })

    it('returns null when no cache', () => {
      localStorageMock.getItem.mockReturnValue(null)

      expect(getCacheAge()).toBeNull()
    })
  })

  describe('clearCache', () => {
    it('removes cache from localStorage', () => {
      clearCache()

      expect(localStorageMock.removeItem).toHaveBeenCalledWith(
        'fledgely_crisis_allowlist'
      )
    })
  })

  describe('getAllowlistWithFallback (AC: 7)', () => {
    it('returns cached data when valid (TTL not expired)', async () => {
      // Story 7.7: Sync service returns valid cache first
      const cached = {
        data: testAllowlist,
        cachedAt: Date.now(),
        version: testAllowlist.version,
        isEmergency: false,
      }
      localStorageMock.getItem.mockReturnValue(JSON.stringify(cached))

      const result = await getAllowlistWithFallback()

      // Valid cache is returned without network fetch
      expect(result).toEqual(testAllowlist)
      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('returns network data when cache is expired and updates cache', async () => {
      // Cache is expired (>24h)
      const cached = {
        data: testAllowlist,
        cachedAt: Date.now() - 25 * 60 * 60 * 1000, // 25 hours ago
        version: testAllowlist.version,
        isEmergency: false,
      }
      localStorageMock.getItem.mockReturnValue(JSON.stringify(cached))

      const networkAllowlist = {
        version: '2.0.0-network',
        lastUpdated: '2025-12-16T12:00:00Z',
        entries: [],
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers(),
        json: async () => networkAllowlist,
      })

      const result = await getAllowlistWithFallback()

      expect(result).toEqual(networkAllowlist)
      expect(localStorageMock.setItem).toHaveBeenCalled()
    })

    it('returns network data when no cache exists', async () => {
      localStorageMock.getItem.mockReturnValue(null)

      const networkAllowlist = {
        version: '2.0.0-network',
        lastUpdated: '2025-12-16T12:00:00Z',
        entries: [],
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers(),
        json: async () => networkAllowlist,
      })

      const result = await getAllowlistWithFallback()

      expect(result).toEqual(networkAllowlist)
      expect(localStorageMock.setItem).toHaveBeenCalled()
    })

    it('falls back to bundled when network fails and no cache', async () => {
      localStorageMock.getItem.mockReturnValue(null)

      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      const result = await getAllowlistWithFallback()

      expect(result).toEqual(mockBundledAllowlist)
    })

    it('falls back when network returns non-ok response', async () => {
      localStorageMock.getItem.mockReturnValue(null)

      mockFetch.mockResolvedValueOnce({ ok: false, status: 500 })

      const result = await getAllowlistWithFallback()

      expect(result).toEqual(mockBundledAllowlist)
    })

    it('handles network timeout (fail-safe to protection)', async () => {
      localStorageMock.getItem.mockReturnValue(null)

      mockFetch.mockRejectedValueOnce(new DOMException('Aborted', 'AbortError'))

      const result = await getAllowlistWithFallback()

      expect(result).toEqual(mockBundledAllowlist)
    })
  })

  describe('refreshCacheOnLaunch', () => {
    it('updates cache when network succeeds', async () => {
      const networkAllowlist = {
        version: '2.0.0-network',
        lastUpdated: '2025-12-16T12:00:00Z',
        entries: [],
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers(),
        json: async () => networkAllowlist,
      })

      await refreshCacheOnLaunch()

      expect(localStorageMock.setItem).toHaveBeenCalled()
    })

    it('does not throw when network fails', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      // Should not throw
      await expect(refreshCacheOnLaunch()).resolves.not.toThrow()
    })
  })

  describe('getCachedVersion', () => {
    it('returns version string when cache exists', () => {
      const cached = {
        data: testAllowlist,
        cachedAt: Date.now(),
        version: '1.0.0-test',
      }
      localStorageMock.getItem.mockReturnValue(JSON.stringify(cached))

      expect(getCachedVersion()).toBe('1.0.0-test')
    })

    it('returns null when no cache', () => {
      localStorageMock.getItem.mockReturnValue(null)

      expect(getCachedVersion()).toBeNull()
    })
  })

  describe('Network Retry Logic', () => {
    // Story 7.7: Retry logic is now handled by the sync service
    // Tests verify the behavior indirectly through fallback results

    it('does not retry on 404 errors', async () => {
      localStorageMock.getItem.mockReturnValue(null)

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
      })

      const result = await getAllowlistWithFallback()

      expect(result).toEqual(mockBundledAllowlist)
      expect(mockFetch).toHaveBeenCalledTimes(1)
    })

    it('does not retry on 401 errors', async () => {
      localStorageMock.getItem.mockReturnValue(null)

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
      })

      const result = await getAllowlistWithFallback()

      expect(result).toEqual(mockBundledAllowlist)
      expect(mockFetch).toHaveBeenCalledTimes(1)
    })

    it('falls back to bundled on network failure', async () => {
      localStorageMock.getItem.mockReturnValue(null)

      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      const result = await getAllowlistWithFallback()

      expect(result).toEqual(mockBundledAllowlist)
    })
  })

  describe('Fail-Safe Behavior (NFR28)', () => {
    it('NEVER returns null - always provides valid allowlist', async () => {
      // Test all failure scenarios
      localStorageMock.getItem.mockReturnValue(null)
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      const result = await getAllowlistWithFallback()

      // Must always return a valid allowlist
      expect(result).toBeDefined()
      expect(result.version).toBeDefined()
      expect(result.entries).toBeDefined()
    })

    it('prioritizes protection over freshness', async () => {
      // Expired cache - network fails, falls back to bundled
      const expiredCache = {
        data: testAllowlist,
        cachedAt: Date.now() - 25 * 60 * 60 * 1000, // Expired
        version: testAllowlist.version,
        isEmergency: false,
      }
      localStorageMock.getItem.mockReturnValue(JSON.stringify(expiredCache))

      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      const result = await getAllowlistWithFallback()

      // Should get either expired cache or bundled - never empty
      expect(result).toBeDefined()
      expect(result.version).toBeDefined()
    })
  })

  // ==========================================================================
  // Story 7.4: Emergency Allowlist Push - New Tests
  // ==========================================================================

  describe('isEmergencyVersion (Story 7.4)', () => {
    it('returns true for emergency version strings', () => {
      expect(isEmergencyVersion('1.0.0-emergency-abc123')).toBe(true)
      expect(isEmergencyVersion('2.1.0-emergency-uuid-here')).toBe(true)
    })

    it('returns false for normal version strings', () => {
      expect(isEmergencyVersion('1.0.0-2025-12-16T00:00:00Z')).toBe(false)
      expect(isEmergencyVersion('1.0.0-bundled')).toBe(false)
      expect(isEmergencyVersion('1.0.0-test')).toBe(false)
    })
  })

  describe('Emergency Version TTL (Story 7.4)', () => {
    it('expires emergency versions after 1 hour', () => {
      const emergencyAllowlist = {
        version: '1.0.0-emergency-abc123',
        lastUpdated: '2025-12-16T12:00:00Z',
        entries: [],
      }

      const cached = {
        data: emergencyAllowlist,
        cachedAt: Date.now() - 61 * 60 * 1000, // 61 minutes ago
        version: emergencyAllowlist.version,
        isEmergency: true,
      }
      localStorageMock.getItem.mockReturnValue(JSON.stringify(cached))

      const result = getFromCache()

      expect(result).toBeNull() // Expired
    })

    it('keeps emergency versions valid within 1 hour', () => {
      const emergencyAllowlist = {
        version: '1.0.0-emergency-abc123',
        lastUpdated: '2025-12-16T12:00:00Z',
        entries: [],
      }

      const cached = {
        data: emergencyAllowlist,
        cachedAt: Date.now() - 30 * 60 * 1000, // 30 minutes ago
        version: emergencyAllowlist.version,
        isEmergency: true,
      }
      localStorageMock.getItem.mockReturnValue(JSON.stringify(cached))

      const result = getFromCache()

      expect(result).toEqual(emergencyAllowlist)
    })

    it('keeps normal versions valid for 24 hours', () => {
      const cached = {
        data: testAllowlist,
        cachedAt: Date.now() - 23 * 60 * 60 * 1000, // 23 hours ago
        version: testAllowlist.version,
      }
      localStorageMock.getItem.mockReturnValue(JSON.stringify(cached))

      const result = getFromCache()

      expect(result).toEqual(testAllowlist)
    })
  })

  describe('forceRefresh (Story 7.4)', () => {
    it('fetches fresh data bypassing cache', async () => {
      const freshAllowlist = {
        version: '3.0.0-fresh',
        lastUpdated: '2025-12-16T15:00:00Z',
        entries: [],
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers(),
        json: async () => freshAllowlist,
      })

      const result = await forceRefresh()

      expect(result).toEqual(freshAllowlist)
      expect(localStorageMock.setItem).toHaveBeenCalled()
    })

    it('falls back to bundled on network failure', async () => {
      localStorageMock.getItem.mockReturnValue(null)
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      const result = await forceRefresh()

      expect(result).toEqual(mockBundledAllowlist)
    })
  })

  describe('hasEmergencyEntries (Story 7.4)', () => {
    it('returns true when cache has emergency entries', () => {
      const cached = {
        data: testAllowlist,
        cachedAt: Date.now(),
        version: '1.0.0-emergency-abc123',
        isEmergency: true,
      }
      localStorageMock.getItem.mockReturnValue(JSON.stringify(cached))

      expect(hasEmergencyEntries()).toBe(true)
    })

    it('returns false when cache has no emergency entries', () => {
      const cached = {
        data: testAllowlist,
        cachedAt: Date.now(),
        version: '1.0.0-test',
      }
      localStorageMock.getItem.mockReturnValue(JSON.stringify(cached))

      expect(hasEmergencyEntries()).toBe(false)
    })

    it('returns false when no cache exists', () => {
      localStorageMock.getItem.mockReturnValue(null)

      expect(hasEmergencyEntries()).toBe(false)
    })
  })

  describe('ETag Support (Story 7.4)', () => {
    it('sends If-None-Match header when ETag is cached (cache expired)', async () => {
      // Story 7.7: ETag is only used when cache is expired
      // Prime the ETag cache with expired data
      localStorageMock.getItem.mockImplementation((key: string) => {
        if (key === 'fledgely_crisis_allowlist_etag') {
          return '1.0.0-cached-version'
        }
        if (key === 'fledgely_crisis_allowlist') {
          return JSON.stringify({
            data: testAllowlist,
            cachedAt: Date.now() - 25 * 60 * 60 * 1000, // Expired
            version: testAllowlist.version,
            isEmergency: false,
          })
        }
        return null
      })

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers(),
        json: async () => testAllowlist,
      })

      await getAllowlistWithFallback()

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'If-None-Match': '1.0.0-cached-version',
          }),
        })
      )
    })

    it('uses cached data on 304 Not Modified (cache expired)', async () => {
      // Story 7.7: 304 handling when cache is expired
      const cached = {
        data: testAllowlist,
        cachedAt: Date.now() - 25 * 60 * 60 * 1000, // Expired
        version: testAllowlist.version,
        isEmergency: false,
      }
      localStorageMock.getItem.mockImplementation((key: string) => {
        if (key === 'fledgely_crisis_allowlist_etag') {
          return testAllowlist.version
        }
        if (key === 'fledgely_crisis_allowlist') {
          return JSON.stringify(cached)
        }
        return null
      })

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 304,
      })

      const result = await getAllowlistWithFallback()

      expect(result).toEqual(testAllowlist)
    })

    it('returns cached data without network call when cache is valid', async () => {
      // Story 7.7: Valid cache is returned without network fetch
      const cached = {
        data: testAllowlist,
        cachedAt: Date.now(), // Valid
        version: testAllowlist.version,
        isEmergency: false,
      }
      localStorageMock.getItem.mockImplementation((key: string) => {
        if (key === 'fledgely_crisis_allowlist') {
          return JSON.stringify(cached)
        }
        return null
      })

      const result = await getAllowlistWithFallback()

      expect(result).toEqual(testAllowlist)
      expect(mockFetch).not.toHaveBeenCalled()
    })
  })

  describe('Offline→Online Sync (Story 7.4 AC: 3)', () => {
    it('supersedes bundled with network data when coming online', async () => {
      // Start with bundled data (offline scenario)
      localStorageMock.getItem.mockReturnValue(null)

      // Bundled has 1 entry
      expect(mockBundledAllowlist.entries).toHaveLength(1)

      // Coming online, network returns newer data
      const networkAllowlist = {
        version: '2.0.0-network-emergency-push123',
        lastUpdated: '2025-12-16T15:00:00Z',
        entries: [
          mockBundledAllowlist.entries[0],
          {
            id: 'emergency-1',
            domain: 'new-crisis.org',
            category: 'crisis' as const,
            aliases: [],
            wildcardPatterns: [],
            name: 'Emergency Crisis Resource',
            description: 'Added via emergency push',
            region: 'us' as const,
            contactMethods: ['phone' as const],
          },
        ],
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers(),
        json: async () => networkAllowlist,
      })

      const result = await getAllowlistWithFallback()

      // Network data supersedes bundled
      expect(result).toEqual(networkAllowlist)
      expect(result.entries).toHaveLength(2)
      expect(isEmergencyVersion(result.version)).toBe(true)
    })
  })
})
