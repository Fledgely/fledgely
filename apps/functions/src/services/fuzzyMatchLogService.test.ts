/**
 * Fuzzy Match Log Service Tests
 *
 * Story 7.5: Fuzzy Domain Matching - Task 5.5
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  hashIp,
  getTodayDateString,
  isRateLimited,
  incrementRateLimit,
  logFuzzyMatch,
  getRecentFuzzyMatchLogs,
  getFuzzyMatchStats,
  cleanupOldRateLimits,
} from './fuzzyMatchLogService'
import { FUZZY_MATCH_RATE_LIMIT, type FuzzyMatchLogInput } from '@fledgely/contracts'

// Mock firebase-admin/firestore
const mockGet = vi.fn()
const mockSet = vi.fn()
const mockUpdate = vi.fn()
const mockDelete = vi.fn()
const mockCommit = vi.fn()
const mockOrderBy = vi.fn()
const mockLimit = vi.fn()
const mockDoc = vi.fn()
const mockCollection = vi.fn()
const mockBatch = vi.fn()

vi.mock('firebase-admin/firestore', () => ({
  getFirestore: () => ({
    collection: mockCollection,
    batch: mockBatch,
  }),
  Timestamp: {
    fromDate: (date: Date) => ({ toDate: () => date, seconds: date.getTime() / 1000 }),
  },
}))

// Mock uuid - using a valid v4 UUID format
vi.mock('uuid', () => ({
  v4: () => '550e8400-e29b-41d4-a716-446655440000',
}))

describe('hashIp', () => {
  it('returns a 32-character hash', () => {
    const hash = hashIp('192.168.1.1')
    expect(hash).toHaveLength(32)
  })

  it('returns consistent hashes for same IP', () => {
    const hash1 = hashIp('192.168.1.1')
    const hash2 = hashIp('192.168.1.1')
    expect(hash1).toBe(hash2)
  })

  it('returns different hashes for different IPs', () => {
    const hash1 = hashIp('192.168.1.1')
    const hash2 = hashIp('192.168.1.2')
    expect(hash1).not.toBe(hash2)
  })
})

describe('getTodayDateString', () => {
  it('returns date in YYYY-MM-DD format', () => {
    const dateStr = getTodayDateString()
    expect(dateStr).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})

describe('isRateLimited', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockCollection.mockReturnValue({
      doc: mockDoc,
    })
    mockDoc.mockReturnValue({
      get: mockGet,
      set: mockSet,
      update: mockUpdate,
    })
  })

  it('returns false when no rate limit entry exists', async () => {
    mockGet.mockResolvedValue({ exists: false })

    const result = await isRateLimited('testhash')

    expect(result).toBe(false)
    expect(mockCollection).toHaveBeenCalledWith(FUZZY_MATCH_RATE_LIMIT.COLLECTION)
  })

  it('returns false when count is below limit', async () => {
    mockGet.mockResolvedValue({
      exists: true,
      data: () => ({ count: 50 }),
    })

    const result = await isRateLimited('testhash')

    expect(result).toBe(false)
  })

  it('returns true when count equals limit', async () => {
    mockGet.mockResolvedValue({
      exists: true,
      data: () => ({ count: FUZZY_MATCH_RATE_LIMIT.MAX_LOGS_PER_DAY }),
    })

    const result = await isRateLimited('testhash')

    expect(result).toBe(true)
  })

  it('returns true when count exceeds limit', async () => {
    mockGet.mockResolvedValue({
      exists: true,
      data: () => ({ count: FUZZY_MATCH_RATE_LIMIT.MAX_LOGS_PER_DAY + 10 }),
    })

    const result = await isRateLimited('testhash')

    expect(result).toBe(true)
  })
})

describe('incrementRateLimit', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockCollection.mockReturnValue({
      doc: mockDoc,
    })
    mockDoc.mockReturnValue({
      get: mockGet,
      set: mockSet,
      update: mockUpdate,
    })
  })

  it('creates new entry when none exists', async () => {
    mockGet.mockResolvedValue({ exists: false })
    mockSet.mockResolvedValue(undefined)

    await incrementRateLimit('testhash')

    expect(mockSet).toHaveBeenCalledWith(
      expect.objectContaining({
        ipHash: 'testhash',
        count: 1,
      })
    )
  })

  it('increments existing entry', async () => {
    mockGet.mockResolvedValue({
      exists: true,
      data: () => ({ ipHash: 'testhash', date: '2025-12-16', count: 5 }),
    })
    mockUpdate.mockResolvedValue(undefined)

    await incrementRateLimit('testhash')

    expect(mockUpdate).toHaveBeenCalledWith({ count: 6 })
  })
})

describe('logFuzzyMatch', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Setup chained mocks properly
    mockDoc.mockReturnValue({
      get: mockGet,
      set: mockSet,
      update: mockUpdate,
    })

    mockCollection.mockReturnValue({
      doc: mockDoc,
    })

    mockGet.mockResolvedValue({ exists: false })
    mockSet.mockResolvedValue(undefined)
  })

  it('successfully logs a fuzzy match', async () => {
    const input: FuzzyMatchLogInput = {
      inputDomain: '988lifline.org',
      matchedDomain: '988lifeline.org',
      distance: 1,
      deviceType: 'web',
    }

    const result = await logFuzzyMatch(input, '192.168.1.1')

    expect(result.success).toBe(true)
    expect(result.logId).toBe('550e8400-e29b-41d4-a716-446655440000')
  })

  it('returns error for invalid input', async () => {
    const input = {
      inputDomain: '',
      matchedDomain: '988lifeline.org',
      distance: 1,
      deviceType: 'web',
    } as FuzzyMatchLogInput

    const result = await logFuzzyMatch(input, '192.168.1.1')

    expect(result.success).toBe(false)
    expect(result.error).toContain('Invalid input')
  })

  it('returns error when rate limited', async () => {
    mockGet.mockResolvedValue({
      exists: true,
      data: () => ({ count: FUZZY_MATCH_RATE_LIMIT.MAX_LOGS_PER_DAY }),
    })

    const input: FuzzyMatchLogInput = {
      inputDomain: '988lifline.org',
      matchedDomain: '988lifeline.org',
      distance: 1,
      deviceType: 'web',
    }

    const result = await logFuzzyMatch(input, '192.168.1.1')

    expect(result.success).toBe(false)
    expect(result.error).toContain('Rate limit exceeded')
  })

  it('normalizes domain to lowercase', async () => {
    const input: FuzzyMatchLogInput = {
      inputDomain: 'CRISISTXTLINE.ORG',
      matchedDomain: 'CRISISTEXTLINE.ORG',
      distance: 1,
      deviceType: 'web',
    }

    const result = await logFuzzyMatch(input, '192.168.1.1')

    expect(result.success).toBe(true)
    // The set call should have lowercase domains
    expect(mockSet).toHaveBeenCalledWith(
      expect.objectContaining({
        inputDomain: 'crisistxtline.org',
        matchedDomain: 'crisistextline.org',
      })
    )
  })
})

describe('getRecentFuzzyMatchLogs', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockCollection.mockReturnValue({
      orderBy: mockOrderBy,
    })
    mockOrderBy.mockReturnValue({
      limit: mockLimit,
    })
  })

  it('returns empty array when no logs exist', async () => {
    mockLimit.mockReturnValue({
      get: vi.fn().mockResolvedValue({ docs: [] }),
    })

    const result = await getRecentFuzzyMatchLogs()

    expect(result).toEqual([])
  })

  it('returns logs ordered by createdAt desc', async () => {
    const mockDocs = [
      {
        data: () => ({
          id: 'log1',
          inputDomain: '988lifline.org',
          matchedDomain: '988lifeline.org',
          distance: 1,
          deviceType: 'web',
          timestamp: '2025-12-16T00:00:00.000Z',
        }),
      },
      {
        data: () => ({
          id: 'log2',
          inputDomain: 'crisistxtline.org',
          matchedDomain: 'crisistextline.org',
          distance: 1,
          deviceType: 'extension',
          timestamp: '2025-12-15T00:00:00.000Z',
        }),
      },
    ]

    mockLimit.mockReturnValue({
      get: vi.fn().mockResolvedValue({ docs: mockDocs }),
    })

    const result = await getRecentFuzzyMatchLogs(10)

    expect(result).toHaveLength(2)
    expect(result[0].id).toBe('log1')
    expect(mockOrderBy).toHaveBeenCalledWith('createdAt', 'desc')
    expect(mockLimit).toHaveBeenCalledWith(10)
  })
})

describe('getFuzzyMatchStats', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockCollection.mockReturnValue({
      orderBy: mockOrderBy,
    })
    mockOrderBy.mockReturnValue({
      limit: mockLimit,
    })
  })

  it('aggregates logs by domain pair', async () => {
    const mockDocs = [
      {
        data: () => ({
          inputDomain: '988lifline.org',
          matchedDomain: '988lifeline.org',
          distance: 1,
          timestamp: '2025-12-16T00:00:00.000Z',
        }),
      },
      {
        data: () => ({
          inputDomain: '988lifline.org',
          matchedDomain: '988lifeline.org',
          distance: 1,
          timestamp: '2025-12-15T00:00:00.000Z',
        }),
      },
      {
        data: () => ({
          inputDomain: 'crisistxtline.org',
          matchedDomain: 'crisistextline.org',
          distance: 1,
          timestamp: '2025-12-14T00:00:00.000Z',
        }),
      },
    ]

    mockLimit.mockReturnValue({
      get: vi.fn().mockResolvedValue({ docs: mockDocs }),
    })

    const result = await getFuzzyMatchStats()

    expect(result).toHaveLength(2)
    // First should be 988lifline (count 2)
    expect(result[0].inputDomain).toBe('988lifline.org')
    expect(result[0].count).toBe(2)
    // Second should be crisistxtline (count 1)
    expect(result[1].inputDomain).toBe('crisistxtline.org')
    expect(result[1].count).toBe(1)
  })

  it('calculates average distance correctly', async () => {
    const mockDocs = [
      {
        data: () => ({
          inputDomain: 'test.org',
          matchedDomain: 'testing.org',
          distance: 1,
          timestamp: '2025-12-16T00:00:00.000Z',
        }),
      },
      {
        data: () => ({
          inputDomain: 'test.org',
          matchedDomain: 'testing.org',
          distance: 2,
          timestamp: '2025-12-15T00:00:00.000Z',
        }),
      },
    ]

    mockLimit.mockReturnValue({
      get: vi.fn().mockResolvedValue({ docs: mockDocs }),
    })

    const result = await getFuzzyMatchStats()

    expect(result[0].avgDistance).toBe(1.5)
  })
})

describe('cleanupOldRateLimits', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockCollection.mockReturnValue({
      get: vi.fn().mockResolvedValue({
        docs: [
          {
            ref: { id: 'doc1' },
            data: () => ({ date: '2025-01-01' }), // Very old
          },
          {
            ref: { id: 'doc2' },
            data: () => ({ date: getTodayDateString() }), // Today
          },
        ],
      }),
    })
    mockBatch.mockReturnValue({
      delete: mockDelete,
      commit: mockCommit,
    })
    mockCommit.mockResolvedValue(undefined)
  })

  it('deletes old rate limit entries', async () => {
    const result = await cleanupOldRateLimits(7)

    expect(result).toBe(1) // Only the old entry
    expect(mockDelete).toHaveBeenCalledTimes(1)
    expect(mockCommit).toHaveBeenCalled()
  })

  it('does not commit when no entries to delete', async () => {
    mockCollection.mockReturnValue({
      get: vi.fn().mockResolvedValue({
        docs: [
          {
            ref: { id: 'doc1' },
            data: () => ({ date: getTodayDateString() }),
          },
        ],
      }),
    })

    const result = await cleanupOldRateLimits(7)

    expect(result).toBe(0)
    expect(mockCommit).not.toHaveBeenCalled()
  })
})
