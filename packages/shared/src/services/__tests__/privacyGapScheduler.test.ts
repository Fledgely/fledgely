/**
 * Privacy Gap Scheduler Service Tests
 *
 * Story 7.8: Privacy Gaps Injection - Task 2.7
 *
 * Tests the daily gap schedule generation with cryptographic randomness
 * and per-child randomization.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  generateDailyGapSchedule,
  createSeededRandom,
  generateSeed,
  randomIntFromSeed,
  getWakingHoursRange,
  distributeGapsWithSpacing,
  type GapScheduleResult,
} from '../privacyGapScheduler'
import { DEFAULT_PRIVACY_GAP_CONFIG } from '@fledgely/contracts'

describe('privacyGapScheduler', () => {
  describe('createSeededRandom', () => {
    it('produces deterministic output for the same seed', () => {
      const rng1 = createSeededRandom('test-seed-123')
      const rng2 = createSeededRandom('test-seed-123')

      const values1 = Array.from({ length: 10 }, () => rng1())
      const values2 = Array.from({ length: 10 }, () => rng2())

      expect(values1).toEqual(values2)
    })

    it('produces different output for different seeds', () => {
      const rng1 = createSeededRandom('seed-a')
      const rng2 = createSeededRandom('seed-b')

      const values1 = Array.from({ length: 10 }, () => rng1())
      const values2 = Array.from({ length: 10 }, () => rng2())

      expect(values1).not.toEqual(values2)
    })

    it('produces values between 0 and 1', () => {
      const rng = createSeededRandom('test-seed')

      for (let i = 0; i < 100; i++) {
        const value = rng()
        expect(value).toBeGreaterThanOrEqual(0)
        expect(value).toBeLessThan(1)
      }
    })
  })

  describe('generateSeed', () => {
    it('combines childId and date into a seed', () => {
      const seed = generateSeed('child123', new Date('2025-12-16'))
      expect(seed).toBe('child123:2025-12-16')
    })

    it('produces different seeds for different children on the same day', () => {
      const date = new Date('2025-12-16')
      const seed1 = generateSeed('child-a', date)
      const seed2 = generateSeed('child-b', date)

      expect(seed1).not.toBe(seed2)
    })

    it('produces different seeds for the same child on different days', () => {
      const seed1 = generateSeed('child123', new Date('2025-12-16'))
      const seed2 = generateSeed('child123', new Date('2025-12-17'))

      expect(seed1).not.toBe(seed2)
    })
  })

  describe('randomIntFromSeed', () => {
    it('produces integer within bounds', () => {
      const rng = createSeededRandom('test')

      for (let i = 0; i < 100; i++) {
        const value = randomIntFromSeed(rng, 2, 4)
        expect(value).toBeGreaterThanOrEqual(2)
        expect(value).toBeLessThanOrEqual(4)
        expect(Number.isInteger(value)).toBe(true)
      }
    })

    it('can produce all values in range', () => {
      const rng = createSeededRandom('distribution-test')
      const values = new Set<number>()

      // Run enough iterations to likely hit all values
      for (let i = 0; i < 100; i++) {
        values.add(randomIntFromSeed(rng, 2, 4))
      }

      expect(values.has(2)).toBe(true)
      expect(values.has(3)).toBe(true)
      expect(values.has(4)).toBe(true)
    })
  })

  describe('getWakingHoursRange', () => {
    it('returns correct range for default config', () => {
      const { startHour, endHour, totalMinutes } = getWakingHoursRange(
        DEFAULT_PRIVACY_GAP_CONFIG
      )

      expect(startHour).toBe(7)
      expect(endHour).toBe(22)
      expect(totalMinutes).toBe(15 * 60) // 15 hours
    })

    it('handles custom waking hours', () => {
      const customConfig = {
        ...DEFAULT_PRIVACY_GAP_CONFIG,
        wakingHoursStart: 8,
        wakingHoursEnd: 20,
      }

      const { startHour, endHour, totalMinutes } = getWakingHoursRange(customConfig)

      expect(startHour).toBe(8)
      expect(endHour).toBe(20)
      expect(totalMinutes).toBe(12 * 60) // 12 hours
    })
  })

  describe('distributeGapsWithSpacing', () => {
    it('distributes gaps with minimum spacing', () => {
      const rng = createSeededRandom('spacing-test')
      const gapCount = 3
      const totalMinutes = 15 * 60 // 15 hours
      const minSpacingMs = 2 * 60 * 60 * 1000 // 2 hours

      const offsets = distributeGapsWithSpacing(rng, gapCount, totalMinutes, minSpacingMs)

      expect(offsets).toHaveLength(3)

      // Verify spacing between gaps
      for (let i = 1; i < offsets.length; i++) {
        const spacingMinutes = offsets[i] - offsets[i - 1]
        const spacingMs = spacingMinutes * 60 * 1000
        expect(spacingMs).toBeGreaterThanOrEqual(minSpacingMs)
      }
    })

    it('handles single gap', () => {
      const rng = createSeededRandom('single-gap')
      const offsets = distributeGapsWithSpacing(rng, 1, 15 * 60, 2 * 60 * 60 * 1000)

      expect(offsets).toHaveLength(1)
      expect(offsets[0]).toBeGreaterThanOrEqual(0)
      expect(offsets[0]).toBeLessThan(15 * 60)
    })

    it('returns sorted offsets', () => {
      const rng = createSeededRandom('sorted-test')
      const offsets = distributeGapsWithSpacing(rng, 4, 15 * 60, 1 * 60 * 60 * 1000)

      for (let i = 1; i < offsets.length; i++) {
        expect(offsets[i]).toBeGreaterThan(offsets[i - 1])
      }
    })
  })

  describe('generateDailyGapSchedule', () => {
    const testDate = new Date('2025-12-16T00:00:00.000Z')

    it('generates a valid schedule for a child', () => {
      const result = generateDailyGapSchedule('child123', testDate)

      expect(result.childId).toBe('child123')
      expect(result.date).toBe('2025-12-16')
      expect(result.gaps.length).toBeGreaterThanOrEqual(2)
      expect(result.gaps.length).toBeLessThanOrEqual(4)
    })

    it('generates gaps within configured duration range', () => {
      const result = generateDailyGapSchedule('child456', testDate)

      for (const gap of result.gaps) {
        expect(gap.durationMs).toBeGreaterThanOrEqual(5 * 60 * 1000)
        expect(gap.durationMs).toBeLessThanOrEqual(15 * 60 * 1000)
      }
    })

    it('generates gaps within waking hours', () => {
      const result = generateDailyGapSchedule('child789', testDate)

      for (const gap of result.gaps) {
        const startTime = new Date(gap.startTime)
        const endTime = new Date(gap.endTime)

        // Gaps should start at or after 7am
        expect(startTime.getUTCHours()).toBeGreaterThanOrEqual(7)
        // Gaps should end before 10pm
        expect(endTime.getUTCHours()).toBeLessThan(22)
      }
    })

    it('generates different schedules for different children on the same day', () => {
      const schedule1 = generateDailyGapSchedule('child-alpha', testDate)
      const schedule2 = generateDailyGapSchedule('child-beta', testDate)

      // Either gap count or timing should differ (highly probable)
      const sameGapCount = schedule1.gaps.length === schedule2.gaps.length
      const sameStartTimes =
        sameGapCount &&
        schedule1.gaps.every(
          (gap, i) => gap.startTime === schedule2.gaps[i].startTime
        )

      expect(sameStartTimes).toBe(false)
    })

    it('generates different schedules for the same child on different days', () => {
      const day1 = new Date('2025-12-16')
      const day2 = new Date('2025-12-17')

      const schedule1 = generateDailyGapSchedule('same-child', day1)
      const schedule2 = generateDailyGapSchedule('same-child', day2)

      expect(schedule1.date).not.toBe(schedule2.date)
      // High probability of different gap configurations
      const identical =
        schedule1.gaps.length === schedule2.gaps.length &&
        schedule1.gaps.every(
          (gap, i) => gap.startTime === schedule2.gaps[i]?.startTime
        )

      expect(identical).toBe(false)
    })

    it('generates deterministic schedule for same child and date', () => {
      const schedule1 = generateDailyGapSchedule('deterministic-child', testDate)
      const schedule2 = generateDailyGapSchedule('deterministic-child', testDate)

      expect(schedule1).toEqual(schedule2)
    })

    it('respects custom configuration', () => {
      const customConfig = {
        ...DEFAULT_PRIVACY_GAP_CONFIG,
        minDailyGaps: 3,
        maxDailyGaps: 3, // Force exactly 3 gaps
        minGapDurationMs: 8 * 60 * 1000, // 8 minutes min
        maxGapDurationMs: 10 * 60 * 1000, // 10 minutes max
      }

      const result = generateDailyGapSchedule('custom-child', testDate, customConfig)

      expect(result.gaps).toHaveLength(3)
      for (const gap of result.gaps) {
        expect(gap.durationMs).toBeGreaterThanOrEqual(8 * 60 * 1000)
        expect(gap.durationMs).toBeLessThanOrEqual(10 * 60 * 1000)
      }
    })

    it('sets proper generatedAt and expiresAt timestamps', () => {
      // Mock Date.now for consistent testing
      const mockNow = new Date('2025-12-15T23:00:00.000Z')
      vi.useFakeTimers()
      vi.setSystemTime(mockNow)

      try {
        const result = generateDailyGapSchedule('timestamp-child', testDate)

        expect(result.generatedAt.getTime()).toBe(mockNow.getTime())
        // expiresAt should be 24 hours after generatedAt
        const expectedExpiry = new Date(mockNow.getTime() + 24 * 60 * 60 * 1000)
        expect(result.expiresAt.getTime()).toBe(expectedExpiry.getTime())
      } finally {
        vi.useRealTimers()
      }
    })

    it('gap startTime and endTime are consistent with durationMs', () => {
      const result = generateDailyGapSchedule('consistency-child', testDate)

      for (const gap of result.gaps) {
        const startTime = new Date(gap.startTime)
        const endTime = new Date(gap.endTime)
        const calculatedDuration = endTime.getTime() - startTime.getTime()

        expect(calculatedDuration).toBe(gap.durationMs)
      }
    })

    it('maintains minimum spacing between gaps', () => {
      // Generate many schedules to verify spacing is maintained
      for (let i = 0; i < 20; i++) {
        const result = generateDailyGapSchedule(`spacing-child-${i}`, testDate)
        const minSpacingMs = DEFAULT_PRIVACY_GAP_CONFIG.minGapSpacingMs

        for (let j = 1; j < result.gaps.length; j++) {
          const prevEnd = new Date(result.gaps[j - 1].endTime)
          const currStart = new Date(result.gaps[j].startTime)
          const spacing = currStart.getTime() - prevEnd.getTime()

          // Allow some tolerance for rounding
          expect(spacing).toBeGreaterThanOrEqual(minSpacingMs - 60000)
        }
      }
    })
  })
})
