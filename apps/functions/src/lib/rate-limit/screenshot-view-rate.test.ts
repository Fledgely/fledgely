/**
 * Screenshot View Rate Limiting Tests
 * Story 18.6: View Rate Limiting
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  getViewCountInWindow,
  getFamilyRateLimitConfig,
  checkViewRateLimit,
  DEFAULT_RATE_LIMIT,
} from './screenshot-view-rate'

// Mock Firestore
const mockGet = vi.fn()
const mockWhere = vi.fn()
const mockCollection = vi.fn()
const mockDoc = vi.fn()

vi.mock('firebase-admin/firestore', () => ({
  getFirestore: () => ({
    collection: mockCollection,
  }),
}))

describe('Screenshot View Rate Limiting', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Default mock chain setup
    mockCollection.mockReturnValue({ doc: mockDoc })
    mockDoc.mockReturnValue({
      collection: mockCollection,
      get: mockGet,
    })
    mockWhere.mockReturnValue({ where: mockWhere, get: mockGet })
  })

  describe('getViewCountInWindow', () => {
    it('returns 0 count when no views exist', async () => {
      mockDoc.mockReturnValue({
        collection: () => ({
          where: () => ({
            where: () => ({
              get: () => Promise.resolve({ empty: true, docs: [], size: 0 }),
            }),
          }),
        }),
      })

      const result = await getViewCountInWindow('child123', 'viewer456', 3600000)

      expect(result.count).toBe(0)
      expect(result.oldestTimestamp).toBeNull()
    })

    it('returns correct count when views exist', async () => {
      const now = Date.now()
      mockDoc.mockReturnValue({
        collection: () => ({
          where: () => ({
            where: () => ({
              get: () =>
                Promise.resolve({
                  empty: false,
                  size: 5,
                  docs: [
                    { data: () => ({ timestamp: now - 1000 }) },
                    { data: () => ({ timestamp: now - 2000 }) },
                    { data: () => ({ timestamp: now - 3000 }) },
                    { data: () => ({ timestamp: now - 4000 }) },
                    { data: () => ({ timestamp: now - 5000 }) },
                  ],
                }),
            }),
          }),
        }),
      })

      const result = await getViewCountInWindow('child123', 'viewer456', 3600000)

      expect(result.count).toBe(5)
      expect(result.oldestTimestamp).toBe(now - 5000)
    })

    it('finds oldest timestamp correctly', async () => {
      const now = Date.now()
      const oldest = now - 30000
      mockDoc.mockReturnValue({
        collection: () => ({
          where: () => ({
            where: () => ({
              get: () =>
                Promise.resolve({
                  empty: false,
                  size: 3,
                  docs: [
                    { data: () => ({ timestamp: now - 10000 }) },
                    { data: () => ({ timestamp: oldest }) },
                    { data: () => ({ timestamp: now - 20000 }) },
                  ],
                }),
            }),
          }),
        }),
      })

      const result = await getViewCountInWindow('child123', 'viewer456', 3600000)

      expect(result.oldestTimestamp).toBe(oldest)
    })

    it('uses custom window size', async () => {
      const customWindowMs = 1800000 // 30 minutes
      let capturedCutoff = 0

      mockDoc.mockReturnValue({
        collection: () => ({
          where: () => ({
            // Second where captures the timestamp cutoff
            where: (_field: string, _op: string, value: unknown) => {
              capturedCutoff = value as number
              return {
                get: () => Promise.resolve({ empty: true, docs: [], size: 0 }),
              }
            },
          }),
        }),
      })

      const beforeCall = Date.now()
      await getViewCountInWindow('child123', 'viewer456', customWindowMs)
      const afterCall = Date.now()

      // Cutoff should be approximately now - customWindowMs
      expect(capturedCutoff).toBeGreaterThanOrEqual(beforeCall - customWindowMs)
      expect(capturedCutoff).toBeLessThanOrEqual(afterCall - customWindowMs)
    })
  })

  describe('getFamilyRateLimitConfig', () => {
    it('returns default config when family has no custom config', async () => {
      mockDoc.mockReturnValue({
        get: () =>
          Promise.resolve({
            exists: true,
            data: () => ({ name: 'Test Family' }),
          }),
      })

      const result = await getFamilyRateLimitConfig('family123')

      expect(result).toEqual(DEFAULT_RATE_LIMIT)
    })

    it('returns custom config when family has override', async () => {
      const customConfig = { threshold: 100, windowMs: 7200000 }
      mockDoc.mockReturnValue({
        get: () =>
          Promise.resolve({
            exists: true,
            data: () => ({ screenshotViewRateLimit: customConfig }),
          }),
      })

      const result = await getFamilyRateLimitConfig('family123')

      expect(result).toEqual(customConfig)
    })

    it('returns default config when family document does not exist', async () => {
      mockDoc.mockReturnValue({
        get: () => Promise.resolve({ exists: false }),
      })

      const result = await getFamilyRateLimitConfig('family123')

      expect(result).toEqual(DEFAULT_RATE_LIMIT)
    })

    it('returns default config when custom config is invalid', async () => {
      mockDoc.mockReturnValue({
        get: () =>
          Promise.resolve({
            exists: true,
            data: () => ({ screenshotViewRateLimit: { threshold: 'invalid' } }),
          }),
      })

      const result = await getFamilyRateLimitConfig('family123')

      expect(result).toEqual(DEFAULT_RATE_LIMIT)
    })

    it('returns default config on error', async () => {
      mockDoc.mockReturnValue({
        get: () => Promise.reject(new Error('Firestore error')),
      })

      const result = await getFamilyRateLimitConfig('family123')

      expect(result).toEqual(DEFAULT_RATE_LIMIT)
    })
  })

  describe('checkViewRateLimit', () => {
    it('returns exceeded=false when under threshold', async () => {
      // Mock family config
      mockDoc.mockReturnValue({
        get: () =>
          Promise.resolve({
            exists: true,
            data: () => ({}),
          }),
        collection: () => ({
          where: () => ({
            where: () => ({
              get: () =>
                Promise.resolve({
                  empty: false,
                  size: 30,
                  docs: [{ data: () => ({ timestamp: Date.now() - 1000 }) }],
                }),
            }),
          }),
        }),
      })

      const result = await checkViewRateLimit('viewer123', 'child456', 'family789')

      expect(result.exceeded).toBe(false)
      expect(result.count).toBe(30)
      expect(result.threshold).toBe(DEFAULT_RATE_LIMIT.threshold)
    })

    it('returns exceeded=true when over threshold', async () => {
      // Mock family config
      mockDoc.mockReturnValue({
        get: () =>
          Promise.resolve({
            exists: true,
            data: () => ({}),
          }),
        collection: () => ({
          where: () => ({
            where: () => ({
              get: () =>
                Promise.resolve({
                  empty: false,
                  size: 55,
                  docs: [{ data: () => ({ timestamp: Date.now() - 1000 }) }],
                }),
            }),
          }),
        }),
      })

      const result = await checkViewRateLimit('viewer123', 'child456', 'family789')

      expect(result.exceeded).toBe(true)
      expect(result.count).toBe(55)
    })

    it('returns exceeded=false when exactly at threshold', async () => {
      mockDoc.mockReturnValue({
        get: () =>
          Promise.resolve({
            exists: true,
            data: () => ({}),
          }),
        collection: () => ({
          where: () => ({
            where: () => ({
              get: () =>
                Promise.resolve({
                  empty: false,
                  size: 50, // Exactly at threshold
                  docs: [{ data: () => ({ timestamp: Date.now() - 1000 }) }],
                }),
            }),
          }),
        }),
      })

      const result = await checkViewRateLimit('viewer123', 'child456', 'family789')

      expect(result.exceeded).toBe(false)
      expect(result.count).toBe(50)
    })

    it('uses custom family threshold', async () => {
      const customThreshold = 20
      mockDoc.mockReturnValue({
        get: () =>
          Promise.resolve({
            exists: true,
            data: () => ({
              screenshotViewRateLimit: { threshold: customThreshold, windowMs: 3600000 },
            }),
          }),
        collection: () => ({
          where: () => ({
            where: () => ({
              get: () =>
                Promise.resolve({
                  empty: false,
                  size: 25,
                  docs: [{ data: () => ({ timestamp: Date.now() - 1000 }) }],
                }),
            }),
          }),
        }),
      })

      const result = await checkViewRateLimit('viewer123', 'child456', 'family789')

      expect(result.exceeded).toBe(true)
      expect(result.threshold).toBe(customThreshold)
    })

    it('calculates reset time based on oldest timestamp', async () => {
      const oldestTimestamp = Date.now() - 1800000 // 30 minutes ago
      mockDoc.mockReturnValue({
        get: () =>
          Promise.resolve({
            exists: true,
            data: () => ({}),
          }),
        collection: () => ({
          where: () => ({
            where: () => ({
              get: () =>
                Promise.resolve({
                  empty: false,
                  size: 10,
                  docs: [{ data: () => ({ timestamp: oldestTimestamp }) }],
                }),
            }),
          }),
        }),
      })

      const result = await checkViewRateLimit('viewer123', 'child456', 'family789')

      expect(result.resetTime).toBe(oldestTimestamp + DEFAULT_RATE_LIMIT.windowMs)
    })

    it('returns windowMs in result', async () => {
      mockDoc.mockReturnValue({
        get: () =>
          Promise.resolve({
            exists: true,
            data: () => ({}),
          }),
        collection: () => ({
          where: () => ({
            where: () => ({
              get: () => Promise.resolve({ empty: true, docs: [], size: 0 }),
            }),
          }),
        }),
      })

      const result = await checkViewRateLimit('viewer123', 'child456', 'family789')

      expect(result.windowMs).toBe(DEFAULT_RATE_LIMIT.windowMs)
    })
  })

  describe('DEFAULT_RATE_LIMIT', () => {
    it('has expected default values', () => {
      expect(DEFAULT_RATE_LIMIT.threshold).toBe(50)
      expect(DEFAULT_RATE_LIMIT.windowMs).toBe(3600000)
    })
  })
})
