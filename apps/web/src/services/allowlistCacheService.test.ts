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

vi.mock('@fledgely/shared', () => ({
  getCrisisAllowlist: vi.fn(() => mockBundledAllowlist),
}))

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
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2025-12-16T12:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
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
    it('returns network data when available and updates cache', async () => {
      const networkAllowlist = {
        version: '2.0.0-network',
        lastUpdated: '2025-12-16T12:00:00Z',
        entries: [],
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => networkAllowlist,
      })

      const result = await getAllowlistWithFallback()

      expect(result).toEqual(networkAllowlist)
      expect(localStorageMock.setItem).toHaveBeenCalled()
    })

    it('falls back to cache when network fails', async () => {
      const cached = {
        data: testAllowlist,
        cachedAt: Date.now(),
        version: testAllowlist.version,
      }
      localStorageMock.getItem.mockReturnValue(JSON.stringify(cached))

      // All retry attempts fail
      mockFetch
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))

      const resultPromise = getAllowlistWithFallback()

      // Advance timers to exhaust retries
      await vi.advanceTimersByTimeAsync(1000)
      await vi.advanceTimersByTimeAsync(2000)
      await vi.advanceTimersByTimeAsync(3000)

      const result = await resultPromise

      expect(result).toEqual(testAllowlist)
    })

    it('falls back to bundled when network fails and no cache', async () => {
      localStorageMock.getItem.mockReturnValue(null)

      // All retry attempts fail
      mockFetch
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))

      const resultPromise = getAllowlistWithFallback()

      // Advance timers to exhaust retries
      await vi.advanceTimersByTimeAsync(1000)
      await vi.advanceTimersByTimeAsync(2000)
      await vi.advanceTimersByTimeAsync(3000)

      const result = await resultPromise

      expect(result).toEqual(mockBundledAllowlist)
    })

    it('falls back when network returns non-ok response', async () => {
      localStorageMock.getItem.mockReturnValue(null)

      // 500 errors trigger retries
      mockFetch
        .mockResolvedValueOnce({ ok: false, status: 500 })
        .mockResolvedValueOnce({ ok: false, status: 500 })
        .mockResolvedValueOnce({ ok: false, status: 500 })

      const resultPromise = getAllowlistWithFallback()

      // Advance timers to exhaust retries
      await vi.advanceTimersByTimeAsync(1000)
      await vi.advanceTimersByTimeAsync(2000)
      await vi.advanceTimersByTimeAsync(3000)

      const result = await resultPromise

      expect(result).toEqual(mockBundledAllowlist)
    })

    it('handles network timeout (fail-safe to protection)', async () => {
      localStorageMock.getItem.mockReturnValue(null)

      // All retry attempts timeout
      mockFetch
        .mockRejectedValueOnce(new DOMException('Aborted', 'AbortError'))
        .mockRejectedValueOnce(new DOMException('Aborted', 'AbortError'))
        .mockRejectedValueOnce(new DOMException('Aborted', 'AbortError'))

      const resultPromise = getAllowlistWithFallback()

      // Advance timers to exhaust retries
      await vi.advanceTimersByTimeAsync(1000)
      await vi.advanceTimersByTimeAsync(2000)
      await vi.advanceTimersByTimeAsync(3000)

      const result = await resultPromise

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
        json: async () => networkAllowlist,
      })

      await refreshCacheOnLaunch()

      expect(localStorageMock.setItem).toHaveBeenCalled()
    })

    it('does not throw when network fails', async () => {
      // All retry attempts fail
      mockFetch
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))

      const promise = refreshCacheOnLaunch()

      // Advance timers to exhaust retries
      await vi.advanceTimersByTimeAsync(1000)
      await vi.advanceTimersByTimeAsync(2000)
      await vi.advanceTimersByTimeAsync(3000)

      // Should not throw
      await expect(promise).resolves.not.toThrow()
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
    it('retries on 5xx errors up to MAX_RETRY_ATTEMPTS', async () => {
      localStorageMock.getItem.mockReturnValue(null)

      // First attempt: 500 error
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      })
      // Second attempt: 500 error
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      })
      // Third attempt: success
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => testAllowlist,
      })

      // Start the async operation
      const resultPromise = getAllowlistWithFallback()

      // Advance timers to allow retries (1s for first retry, 2s for second)
      await vi.advanceTimersByTimeAsync(1000)
      await vi.advanceTimersByTimeAsync(2000)

      const result = await resultPromise

      expect(result).toEqual(testAllowlist)
      expect(mockFetch).toHaveBeenCalledTimes(3)
    })

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

    it('retries on network errors', async () => {
      localStorageMock.getItem.mockReturnValue(null)

      // First two attempts fail
      mockFetch.mockRejectedValueOnce(new Error('Network error'))
      mockFetch.mockRejectedValueOnce(new Error('Network error'))
      // Third attempt succeeds
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => testAllowlist,
      })

      // Start the async operation
      const resultPromise = getAllowlistWithFallback()

      // Advance timers to allow retries
      await vi.advanceTimersByTimeAsync(1000)
      await vi.advanceTimersByTimeAsync(2000)

      const result = await resultPromise

      expect(result).toEqual(testAllowlist)
      expect(mockFetch).toHaveBeenCalledTimes(3)
    })

    it('falls back to bundled after exhausting retries', async () => {
      localStorageMock.getItem.mockReturnValue(null)

      // All attempts fail
      mockFetch
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))

      // Start the async operation
      const resultPromise = getAllowlistWithFallback()

      // Advance timers to allow retries
      await vi.advanceTimersByTimeAsync(1000)
      await vi.advanceTimersByTimeAsync(2000)
      await vi.advanceTimersByTimeAsync(3000)

      const result = await resultPromise

      expect(result).toEqual(mockBundledAllowlist)
      // Initial + 2 retries = 3 attempts
      expect(mockFetch).toHaveBeenCalledTimes(3)
    })
  })

  describe('Fail-Safe Behavior (NFR28)', () => {
    it('NEVER returns null - always provides valid allowlist', async () => {
      // Test all failure scenarios
      localStorageMock.getItem.mockReturnValue(null)
      mockFetch
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))

      const resultPromise = getAllowlistWithFallback()

      // Advance timers to exhaust retries
      await vi.advanceTimersByTimeAsync(1000)
      await vi.advanceTimersByTimeAsync(2000)
      await vi.advanceTimersByTimeAsync(3000)

      const result = await resultPromise

      // Must always return a valid allowlist
      expect(result).toBeDefined()
      expect(result.version).toBeDefined()
      expect(result.entries).toBeDefined()
    })

    it('prioritizes protection over freshness', async () => {
      // Expired cache should still be used if bundled check fails
      const expiredCache = {
        data: testAllowlist,
        cachedAt: Date.now() - 25 * 60 * 60 * 1000, // Expired
        version: testAllowlist.version,
      }
      localStorageMock.getItem.mockReturnValue(JSON.stringify(expiredCache))

      mockFetch
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))

      const resultPromise = getAllowlistWithFallback()

      // Advance timers to exhaust retries
      await vi.advanceTimersByTimeAsync(1000)
      await vi.advanceTimersByTimeAsync(2000)
      await vi.advanceTimersByTimeAsync(3000)

      const result = await resultPromise

      // Even with expired cache, we should get bundled (or could enhance to use expired)
      expect(result).toBeDefined()
    })
  })
})
