/**
 * Crisis Allowlist HTTP Endpoint Tests
 *
 * Story 7.2: Crisis Visit Zero-Data-Path - Task 5.6
 * Story 7.4: Emergency Allowlist Push - Task 3.6
 *
 * Tests for the crisis allowlist HTTP endpoint.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock @fledgely/shared
const mockAllowlist = {
  version: '1.0.0-test',
  lastUpdated: '2025-12-16T00:00:00Z',
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

vi.mock('@fledgely/shared', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@fledgely/shared')>()
  return {
    ...actual,
    getCrisisAllowlist: vi.fn(() => mockAllowlist),
    getAllowlistVersion: vi.fn(() => '1.0.0-test'),
  }
})

// Mock firebase-admin/firestore
vi.mock('firebase-admin/firestore', () => ({
  getFirestore: vi.fn().mockReturnValue({
    collection: vi.fn().mockReturnValue({
      get: vi.fn().mockResolvedValue({ empty: true, forEach: vi.fn() }),
    }),
  }),
}))

// Mock firebase-functions
vi.mock('firebase-functions/v2/https', () => ({
  onRequest: vi.fn((_options, handler) => handler),
  HttpsError: class HttpsError extends Error {
    constructor(
      public code: string,
      message: string
    ) {
      super(message)
    }
  },
}))

import { __testing } from './crisisAllowlist'
import { getCrisisAllowlist, getAllowlistVersion } from '@fledgely/shared'

const { getClientId, isRateLimited, rateLimitStore, RATE_LIMIT_WINDOW_MS } =
  __testing
const mockGetCrisisAllowlist = vi.mocked(getCrisisAllowlist)
const mockGetAllowlistVersion = vi.mocked(getAllowlistVersion)

describe('crisisAllowlist HTTP endpoint', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    rateLimitStore.clear()
  })

  describe('getClientId', () => {
    it('returns x-forwarded-for header when present', () => {
      const req = {
        headers: { 'x-forwarded-for': '192.168.1.1, 10.0.0.1' },
        ip: '127.0.0.1',
      } as any

      expect(getClientId(req)).toBe('192.168.1.1')
    })

    it('returns req.ip when no x-forwarded-for', () => {
      const req = {
        headers: {},
        ip: '127.0.0.1',
      } as any

      expect(getClientId(req)).toBe('127.0.0.1')
    })

    it('returns unknown when no IP available', () => {
      const req = {
        headers: {},
        ip: undefined,
      } as any

      expect(getClientId(req)).toBe('unknown')
    })
  })

  describe('isRateLimited', () => {
    it('allows first request from a client', () => {
      expect(isRateLimited('client-1')).toBe(false)
    })

    it('blocks second request within window', () => {
      isRateLimited('client-2')
      expect(isRateLimited('client-2')).toBe(true)
    })

    it('allows request after window expires', () => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2025-12-16T12:00:00Z'))

      isRateLimited('client-3')

      // Move past the rate limit window
      vi.setSystemTime(new Date('2025-12-16T12:01:01Z'))

      expect(isRateLimited('client-3')).toBe(false)

      vi.useRealTimers()
    })

    it('tracks different clients independently', () => {
      isRateLimited('client-a')
      isRateLimited('client-a')

      // client-b should still be allowed
      expect(isRateLimited('client-b')).toBe(false)
    })
  })

  describe('endpoint handler', () => {
    // We need to test the actual handler
    // Since the handler is exported via onRequest mock, let's test it directly
    let handler: any

    beforeEach(async () => {
      // Re-import to get fresh handler
      vi.resetModules()

      // Set up mocks again - use importOriginal to get all exports
      vi.doMock('@fledgely/shared', async (importOriginal) => {
        const actual = await importOriginal<typeof import('@fledgely/shared')>()
        return {
          ...actual,
          getCrisisAllowlist: vi.fn(() => mockAllowlist),
          getAllowlistVersion: vi.fn(() => '1.0.0-test'),
        }
      })

      vi.doMock('firebase-admin/firestore', () => ({
        getFirestore: vi.fn().mockReturnValue({
          collection: vi.fn().mockReturnValue({
            get: vi.fn().mockResolvedValue({ empty: true, forEach: vi.fn() }),
          }),
        }),
      }))

      vi.doMock('firebase-functions/v2/https', () => ({
        onRequest: vi.fn((_options, h) => {
          handler = h
          return h
        }),
        HttpsError: class HttpsError extends Error {
          constructor(
            public code: string,
            message: string
          ) {
            super(message)
          }
        },
      }))

      await import('./crisisAllowlist')
    })

    afterEach(() => {
      vi.doUnmock('@fledgely/shared')
      vi.doUnmock('firebase-admin/firestore')
      vi.doUnmock('firebase-functions/v2/https')
    })

    it('rejects non-GET requests with 405', async () => {
      const req = {
        method: 'POST',
        headers: {},
        ip: '127.0.0.1',
      } as any

      const res = {
        status: vi.fn().mockReturnThis(),
        set: vi.fn().mockReturnThis(),
        send: vi.fn(),
        json: vi.fn(),
      } as any

      await handler(req, res)

      expect(res.status).toHaveBeenCalledWith(405)
      expect(res.set).toHaveBeenCalledWith('Allow', 'GET')
    })

    it('returns allowlist for GET requests', async () => {
      const req = {
        method: 'GET',
        headers: {},
        ip: '127.0.0.1',
      } as any

      const res = {
        status: vi.fn().mockReturnThis(),
        set: vi.fn().mockReturnThis(),
        send: vi.fn(),
        json: vi.fn(),
      } as any

      await handler(req, res)

      expect(res.json).toHaveBeenCalledWith(mockAllowlist)
    })

    it('sets proper cache headers', async () => {
      const req = {
        method: 'GET',
        headers: {},
        ip: '192.168.1.100',
      } as any

      const res = {
        status: vi.fn().mockReturnThis(),
        set: vi.fn().mockReturnThis(),
        send: vi.fn(),
        json: vi.fn(),
      } as any

      await handler(req, res)

      expect(res.set).toHaveBeenCalledWith(
        expect.objectContaining({
          'Cache-Control': 'public, max-age=86400',
          'ETag': '1.0.0-test',
          'Content-Type': 'application/json',
        })
      )
    })

    it('returns 304 when ETag matches', async () => {
      const req = {
        method: 'GET',
        headers: { 'if-none-match': '1.0.0-test' },
        ip: '192.168.1.101',
      } as any

      const res = {
        status: vi.fn().mockReturnThis(),
        set: vi.fn().mockReturnThis(),
        send: vi.fn(),
        json: vi.fn(),
      } as any

      await handler(req, res)

      expect(res.status).toHaveBeenCalledWith(304)
      expect(res.send).toHaveBeenCalled()
      expect(res.json).not.toHaveBeenCalled()
    })

    it('returns 429 when rate limited', async () => {
      // First request from this IP
      const req1 = {
        method: 'GET',
        headers: {},
        ip: '10.0.0.1',
      } as any

      const res1 = {
        status: vi.fn().mockReturnThis(),
        set: vi.fn().mockReturnThis(),
        send: vi.fn(),
        json: vi.fn(),
      } as any

      await handler(req1, res1)
      expect(res1.json).toHaveBeenCalledWith(mockAllowlist)

      // Second request from same IP within window
      const req2 = {
        method: 'GET',
        headers: {},
        ip: '10.0.0.1',
      } as any

      const res2 = {
        status: vi.fn().mockReturnThis(),
        set: vi.fn().mockReturnThis(),
        send: vi.fn(),
        json: vi.fn(),
      } as any

      await handler(req2, res2)
      expect(res2.status).toHaveBeenCalledWith(429)
      expect(res2.set).toHaveBeenCalledWith('Retry-After', '60')
    })
  })

  describe('fetchDynamicEntries', () => {
    const { fetchDynamicEntries } = __testing

    it('returns empty array when collection is empty', async () => {
      const result = await fetchDynamicEntries()
      expect(result.entries).toEqual([])
      expect(result.latestPushId).toBeNull()
    })
  })

  describe('mergeAllowlists', () => {
    const { mergeAllowlists } = __testing

    it('returns bundled allowlist when no dynamic entries', () => {
      const bundled = {
        version: '1.0.0',
        lastUpdated: '2025-12-16T00:00:00Z',
        entries: [mockAllowlist.entries[0]],
      }

      const result = mergeAllowlists(bundled, [], null)
      expect(result).toBe(bundled)
    })

    it('merges dynamic entries with bundled entries', () => {
      const bundled = {
        version: '1.0.0',
        lastUpdated: '2025-12-16T00:00:00Z',
        entries: [mockAllowlist.entries[0]],
      }

      const dynamicEntry = {
        id: 'dynamic-1',
        domain: 'newcrisis.org',
        category: 'crisis' as const,
        aliases: [],
        wildcardPatterns: [],
        name: 'New Crisis Resource',
        description: 'New emergency resource',
        region: 'us' as const,
        contactMethods: ['phone' as const],
      }

      const result = mergeAllowlists(bundled, [dynamicEntry], 'push-123')

      expect(result.entries).toHaveLength(2)
      expect(result.entries).toContainEqual(mockAllowlist.entries[0])
      expect(result.entries).toContainEqual(dynamicEntry)
      expect(result.version).toContain('emergency')
      expect(result.version).toContain('push-123')
    })

    it('dynamic entries override bundled entries with same domain', () => {
      const bundled = {
        version: '1.0.0',
        lastUpdated: '2025-12-16T00:00:00Z',
        entries: [mockAllowlist.entries[0]],
      }

      const dynamicOverride = {
        ...mockAllowlist.entries[0],
        id: 'override-1',
        name: 'Updated Crisis Line',
        description: 'Updated description',
      }

      const result = mergeAllowlists(bundled, [dynamicOverride], 'push-456')

      expect(result.entries).toHaveLength(1)
      expect(result.entries[0].name).toBe('Updated Crisis Line')
      expect(result.entries[0].id).toBe('override-1')
    })
  })
})
