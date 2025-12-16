/**
 * Fuzzy Match Log Schema Tests
 *
 * Story 7.5: Fuzzy Domain Matching - Task 4.4
 */

import { describe, it, expect } from 'vitest'
import {
  deviceTypeSchema,
  fuzzyMatchLogInputSchema,
  fuzzyMatchLogSchema,
  fuzzyMatchStatsSchema,
  fuzzyMatchRateLimitSchema,
  FUZZY_MATCH_RATE_LIMIT,
  FUZZY_MATCH_LOGS_COLLECTION,
  type FuzzyMatchLogInput,
  type FuzzyMatchLog,
  type FuzzyMatchStats,
  type DeviceType,
} from './fuzzyMatchLog.schema'

describe('deviceTypeSchema', () => {
  it('accepts valid device types', () => {
    expect(deviceTypeSchema.parse('web')).toBe('web')
    expect(deviceTypeSchema.parse('extension')).toBe('extension')
    expect(deviceTypeSchema.parse('android')).toBe('android')
    expect(deviceTypeSchema.parse('ios')).toBe('ios')
  })

  it('rejects invalid device types', () => {
    expect(() => deviceTypeSchema.parse('desktop')).toThrow()
    expect(() => deviceTypeSchema.parse('mobile')).toThrow()
    expect(() => deviceTypeSchema.parse('')).toThrow()
  })
})

describe('fuzzyMatchLogInputSchema', () => {
  const validInput: FuzzyMatchLogInput = {
    inputDomain: '988lifline.org',
    matchedDomain: '988lifeline.org',
    distance: 1,
    deviceType: 'web',
  }

  it('accepts valid input', () => {
    const result = fuzzyMatchLogInputSchema.parse(validInput)

    expect(result.inputDomain).toBe('988lifline.org')
    expect(result.matchedDomain).toBe('988lifeline.org')
    expect(result.distance).toBe(1)
    expect(result.deviceType).toBe('web')
  })

  it('normalizes domain to lowercase', () => {
    const result = fuzzyMatchLogInputSchema.parse({
      ...validInput,
      inputDomain: 'CRISISTXTLINE.ORG',
      matchedDomain: 'CRISISTEXTLINE.ORG',
    })

    expect(result.inputDomain).toBe('crisistxtline.org')
    expect(result.matchedDomain).toBe('crisistextline.org')
  })

  it('trims whitespace from domains', () => {
    const result = fuzzyMatchLogInputSchema.parse({
      ...validInput,
      inputDomain: '  988lifline.org  ',
      matchedDomain: '  988lifeline.org  ',
    })

    expect(result.inputDomain).toBe('988lifline.org')
    expect(result.matchedDomain).toBe('988lifeline.org')
  })

  describe('inputDomain validation', () => {
    it('rejects empty inputDomain', () => {
      expect(() =>
        fuzzyMatchLogInputSchema.parse({
          ...validInput,
          inputDomain: '',
        })
      ).toThrow('Input domain is required')
    })

    it('rejects domain longer than 255 chars', () => {
      expect(() =>
        fuzzyMatchLogInputSchema.parse({
          ...validInput,
          inputDomain: 'a'.repeat(256) + '.org',
        })
      ).toThrow('Domain too long')
    })
  })

  describe('distance validation', () => {
    it('accepts distance of 1', () => {
      const result = fuzzyMatchLogInputSchema.parse({
        ...validInput,
        distance: 1,
      })
      expect(result.distance).toBe(1)
    })

    it('accepts distance of 2', () => {
      const result = fuzzyMatchLogInputSchema.parse({
        ...validInput,
        distance: 2,
      })
      expect(result.distance).toBe(2)
    })

    it('rejects distance of 0', () => {
      expect(() =>
        fuzzyMatchLogInputSchema.parse({
          ...validInput,
          distance: 0,
        })
      ).toThrow('Distance must be at least 1')
    })

    it('rejects distance greater than 2', () => {
      expect(() =>
        fuzzyMatchLogInputSchema.parse({
          ...validInput,
          distance: 3,
        })
      ).toThrow('Distance cannot exceed 2')
    })

    it('rejects non-integer distance', () => {
      expect(() =>
        fuzzyMatchLogInputSchema.parse({
          ...validInput,
          distance: 1.5,
        })
      ).toThrow()
    })
  })

  describe('deviceType validation', () => {
    const validDeviceTypes: DeviceType[] = ['web', 'extension', 'android', 'ios']

    it.each(validDeviceTypes)('accepts deviceType: %s', (deviceType) => {
      const result = fuzzyMatchLogInputSchema.parse({
        ...validInput,
        deviceType,
      })
      expect(result.deviceType).toBe(deviceType)
    })

    it('rejects invalid deviceType', () => {
      expect(() =>
        fuzzyMatchLogInputSchema.parse({
          ...validInput,
          deviceType: 'invalid',
        })
      ).toThrow()
    })
  })
})

describe('fuzzyMatchLogSchema', () => {
  const validLog: FuzzyMatchLog = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    inputDomain: '988lifline.org',
    matchedDomain: '988lifeline.org',
    distance: 1,
    deviceType: 'web',
    timestamp: '2025-12-16T00:00:00.000Z',
  }

  it('accepts valid log entry', () => {
    const result = fuzzyMatchLogSchema.parse(validLog)

    expect(result.id).toBe(validLog.id)
    expect(result.timestamp).toBe(validLog.timestamp)
  })

  it('rejects invalid UUID', () => {
    expect(() =>
      fuzzyMatchLogSchema.parse({
        ...validLog,
        id: 'not-a-uuid',
      })
    ).toThrow()
  })

  it('rejects invalid timestamp', () => {
    expect(() =>
      fuzzyMatchLogSchema.parse({
        ...validLog,
        timestamp: 'not-a-date',
      })
    ).toThrow()
  })
})

describe('fuzzyMatchStatsSchema', () => {
  const validStats: FuzzyMatchStats = {
    inputDomain: '988lifline.org',
    matchedDomain: '988lifeline.org',
    avgDistance: 1.0,
    count: 42,
    firstSeen: '2025-12-15T00:00:00.000Z',
    lastSeen: '2025-12-16T00:00:00.000Z',
  }

  it('accepts valid stats', () => {
    const result = fuzzyMatchStatsSchema.parse(validStats)

    expect(result.count).toBe(42)
    expect(result.avgDistance).toBe(1.0)
  })

  it('accepts decimal avgDistance', () => {
    const result = fuzzyMatchStatsSchema.parse({
      ...validStats,
      avgDistance: 1.5,
    })
    expect(result.avgDistance).toBe(1.5)
  })

  it('rejects negative count', () => {
    expect(() =>
      fuzzyMatchStatsSchema.parse({
        ...validStats,
        count: -1,
      })
    ).toThrow()
  })
})

describe('fuzzyMatchRateLimitSchema', () => {
  it('accepts valid rate limit entry', () => {
    const result = fuzzyMatchRateLimitSchema.parse({
      ipHash: 'abc123hash',
      date: '2025-12-16',
      count: 5,
    })

    expect(result.ipHash).toBe('abc123hash')
    expect(result.date).toBe('2025-12-16')
    expect(result.count).toBe(5)
  })

  it('rejects invalid date format', () => {
    expect(() =>
      fuzzyMatchRateLimitSchema.parse({
        ipHash: 'abc123',
        date: '2025/12/16',
        count: 5,
      })
    ).toThrow()
  })

  it('rejects negative count', () => {
    expect(() =>
      fuzzyMatchRateLimitSchema.parse({
        ipHash: 'abc123',
        date: '2025-12-16',
        count: -1,
      })
    ).toThrow()
  })
})

describe('constants', () => {
  it('FUZZY_MATCH_RATE_LIMIT has correct values', () => {
    expect(FUZZY_MATCH_RATE_LIMIT.MAX_LOGS_PER_DAY).toBe(100)
    expect(FUZZY_MATCH_RATE_LIMIT.COLLECTION).toBe('fuzzy-match-rate-limits')
  })

  it('FUZZY_MATCH_LOGS_COLLECTION is correct', () => {
    expect(FUZZY_MATCH_LOGS_COLLECTION).toBe('fuzzy-match-logs')
  })
})
