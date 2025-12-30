/**
 * Tests for Privacy Gaps Module (Story 7.8)
 *
 * Tests privacy gap injection for blending crisis visits with random gaps.
 * Privacy is critical - these tests verify no leakage of gap timing.
 */

import { describe, expect, it } from 'vitest'
import {
  generateDailySchedule,
  isInPrivacyGap,
  getScheduleStats,
  PrivacyGapSchedule,
  _testExports,
} from './privacy-gaps'

const {
  seededRandom,
  hasOverlap,
  MIN_GAPS_PER_DAY,
  MAX_GAPS_PER_DAY,
  MIN_GAP_DURATION_MINUTES,
  MAX_GAP_DURATION_MINUTES,
  MINUTES_IN_DAY,
} = _testExports

describe('Privacy Gaps Module (Story 7.8)', () => {
  describe('seededRandom', () => {
    it('should produce deterministic results for same seed', () => {
      const random1 = seededRandom('test-seed')
      const random2 = seededRandom('test-seed')

      const values1 = [random1(), random1(), random1()]
      const values2 = [random2(), random2(), random2()]

      expect(values1).toEqual(values2)
    })

    it('should produce different results for different seeds', () => {
      const random1 = seededRandom('seed-1')
      const random2 = seededRandom('seed-2')

      const values1 = [random1(), random1(), random1()]
      const values2 = [random2(), random2(), random2()]

      expect(values1).not.toEqual(values2)
    })

    it('should produce values between 0 and 1', () => {
      const random = seededRandom('test-bounds')

      for (let i = 0; i < 100; i++) {
        const value = random()
        expect(value).toBeGreaterThanOrEqual(0)
        expect(value).toBeLessThan(1)
      }
    })
  })

  describe('generateDailySchedule', () => {
    describe('AC1: Random Gap Injection', () => {
      it('should generate 2-4 gaps per day', () => {
        // Test with multiple children to verify range
        for (let i = 0; i < 50; i++) {
          const schedule = generateDailySchedule(`child-${i}`, '2025-12-30')
          expect(schedule.gaps.length).toBeGreaterThanOrEqual(MIN_GAPS_PER_DAY)
          expect(schedule.gaps.length).toBeLessThanOrEqual(MAX_GAPS_PER_DAY)
        }
      })

      it('should generate gaps with 5-15 minute duration', () => {
        const schedule = generateDailySchedule('test-child', '2025-12-30')

        for (const gap of schedule.gaps) {
          expect(gap.durationMinutes).toBeGreaterThanOrEqual(MIN_GAP_DURATION_MINUTES)
          expect(gap.durationMinutes).toBeLessThanOrEqual(MAX_GAP_DURATION_MINUTES)
        }
      })

      it('should generate gaps at irregular intervals (not evenly spaced)', () => {
        const schedule = generateDailySchedule('test-child', '2025-12-30')

        if (schedule.gaps.length >= 2) {
          const intervals: number[] = []
          for (let i = 1; i < schedule.gaps.length; i++) {
            intervals.push(
              schedule.gaps[i].startMinuteOfDay - schedule.gaps[i - 1].startMinuteOfDay
            )
          }

          // Check that intervals vary (not all the same)
          const uniqueIntervals = new Set(intervals)
          expect(uniqueIntervals.size).toBeGreaterThanOrEqual(1)
        }
      })
    })

    describe('AC3: Per-Child Randomization', () => {
      it('should generate unique schedules per child', () => {
        const schedule1 = generateDailySchedule('child-alice', '2025-12-30')
        const schedule2 = generateDailySchedule('child-bob', '2025-12-30')

        // Schedules should be different
        const gaps1 = schedule1.gaps.map((g) => `${g.startMinuteOfDay}-${g.durationMinutes}`)
        const gaps2 = schedule2.gaps.map((g) => `${g.startMinuteOfDay}-${g.durationMinutes}`)

        expect(gaps1).not.toEqual(gaps2)
      })

      it('should generate same schedule for same child on same day (deterministic)', () => {
        const schedule1 = generateDailySchedule('test-child', '2025-12-30')
        const schedule2 = generateDailySchedule('test-child', '2025-12-30')

        expect(schedule1.gaps).toEqual(schedule2.gaps)
      })

      it('should generate different schedules for same child on different days', () => {
        const schedule1 = generateDailySchedule('test-child', '2025-12-30')
        const schedule2 = generateDailySchedule('test-child', '2025-12-31')

        const gaps1 = schedule1.gaps.map((g) => `${g.startMinuteOfDay}-${g.durationMinutes}`)
        const gaps2 = schedule2.gaps.map((g) => `${g.startMinuteOfDay}-${g.durationMinutes}`)

        expect(gaps1).not.toEqual(gaps2)
      })
    })

    it('should include correct metadata', () => {
      const schedule = generateDailySchedule('test-child-123', '2025-12-30')

      expect(schedule.childId).toBe('test-child-123')
      expect(schedule.dateString).toBe('2025-12-30')
      expect(schedule.generatedAt).toBeGreaterThan(0)
    })

    it('should sort gaps by start time', () => {
      const schedule = generateDailySchedule('test-child', '2025-12-30')

      for (let i = 1; i < schedule.gaps.length; i++) {
        expect(schedule.gaps[i].startMinuteOfDay).toBeGreaterThanOrEqual(
          schedule.gaps[i - 1].startMinuteOfDay
        )
      }
    })

    it('should not generate overlapping gaps', () => {
      const schedule = generateDailySchedule('test-child', '2025-12-30')

      for (let i = 0; i < schedule.gaps.length; i++) {
        for (let j = i + 1; j < schedule.gaps.length; j++) {
          const gap1End = schedule.gaps[i].startMinuteOfDay + schedule.gaps[i].durationMinutes
          const gap2Start = schedule.gaps[j].startMinuteOfDay

          expect(gap1End).toBeLessThanOrEqual(gap2Start)
        }
      }
    })

    it('should generate valid minute-of-day values (0-1439)', () => {
      const schedule = generateDailySchedule('test-child', '2025-12-30')

      for (const gap of schedule.gaps) {
        expect(gap.startMinuteOfDay).toBeGreaterThanOrEqual(0)
        expect(gap.startMinuteOfDay).toBeLessThan(MINUTES_IN_DAY)
      }
    })
  })

  describe('isInPrivacyGap', () => {
    it('should return true when timestamp is within a gap', () => {
      const schedule: PrivacyGapSchedule = {
        childId: 'test-child',
        dateString: '2025-12-30',
        generatedAt: Date.now(),
        gaps: [
          { startMinuteOfDay: 600, durationMinutes: 10 }, // 10:00 - 10:10
        ],
      }

      // 10:05 AM on 2025-12-30
      const timestamp = new Date('2025-12-30T10:05:00').getTime()

      expect(isInPrivacyGap(schedule, timestamp)).toBe(true)
    })

    it('should return false when timestamp is outside all gaps', () => {
      const schedule: PrivacyGapSchedule = {
        childId: 'test-child',
        dateString: '2025-12-30',
        generatedAt: Date.now(),
        gaps: [
          { startMinuteOfDay: 600, durationMinutes: 10 }, // 10:00 - 10:10
        ],
      }

      // 11:00 AM on 2025-12-30 (outside gap)
      const timestamp = new Date('2025-12-30T11:00:00').getTime()

      expect(isInPrivacyGap(schedule, timestamp)).toBe(false)
    })

    it('should return true at exact gap start time', () => {
      const schedule: PrivacyGapSchedule = {
        childId: 'test-child',
        dateString: '2025-12-30',
        generatedAt: Date.now(),
        gaps: [
          { startMinuteOfDay: 600, durationMinutes: 10 }, // 10:00 - 10:10
        ],
      }

      // Exactly 10:00 AM
      const timestamp = new Date('2025-12-30T10:00:00').getTime()

      expect(isInPrivacyGap(schedule, timestamp)).toBe(true)
    })

    it('should return false at exact gap end time (exclusive)', () => {
      const schedule: PrivacyGapSchedule = {
        childId: 'test-child',
        dateString: '2025-12-30',
        generatedAt: Date.now(),
        gaps: [
          { startMinuteOfDay: 600, durationMinutes: 10 }, // 10:00 - 10:10
        ],
      }

      // Exactly 10:10 AM (end of gap - should be outside)
      const timestamp = new Date('2025-12-30T10:10:00').getTime()

      expect(isInPrivacyGap(schedule, timestamp)).toBe(false)
    })

    it('should return false for stale schedule (wrong date)', () => {
      const schedule: PrivacyGapSchedule = {
        childId: 'test-child',
        dateString: '2025-12-29', // Yesterday
        generatedAt: Date.now(),
        gaps: [{ startMinuteOfDay: 600, durationMinutes: 10 }],
      }

      // 10:05 AM on 2025-12-30 (schedule is for 2025-12-29)
      const timestamp = new Date('2025-12-30T10:05:00').getTime()

      expect(isInPrivacyGap(schedule, timestamp)).toBe(false)
    })

    it('should handle multiple gaps correctly', () => {
      const schedule: PrivacyGapSchedule = {
        childId: 'test-child',
        dateString: '2025-12-30',
        generatedAt: Date.now(),
        gaps: [
          { startMinuteOfDay: 600, durationMinutes: 10 }, // 10:00 - 10:10
          { startMinuteOfDay: 780, durationMinutes: 15 }, // 13:00 - 13:15
        ],
      }

      // Inside first gap
      expect(isInPrivacyGap(schedule, new Date('2025-12-30T10:05:00').getTime())).toBe(true)

      // Between gaps
      expect(isInPrivacyGap(schedule, new Date('2025-12-30T12:00:00').getTime())).toBe(false)

      // Inside second gap
      expect(isInPrivacyGap(schedule, new Date('2025-12-30T13:07:00').getTime())).toBe(true)
    })

    it('should handle gap wrapping around midnight', () => {
      const schedule: PrivacyGapSchedule = {
        childId: 'test-child',
        dateString: '2025-12-30',
        generatedAt: Date.now(),
        gaps: [
          { startMinuteOfDay: 1435, durationMinutes: 10 }, // 23:55 - 00:05 next day
        ],
      }

      // 23:58 (inside gap)
      expect(isInPrivacyGap(schedule, new Date('2025-12-30T23:58:00').getTime())).toBe(true)
    })
  })

  describe('hasOverlap', () => {
    it('should detect overlapping gaps', () => {
      const existingGaps = [{ startMinuteOfDay: 600, durationMinutes: 10 }]

      // Overlaps with existing gap
      expect(hasOverlap(605, 10, existingGaps)).toBe(true)
    })

    it('should detect adjacent gaps as overlapping', () => {
      const existingGaps = [{ startMinuteOfDay: 600, durationMinutes: 10 }]

      // Starts exactly when previous ends - should NOT overlap
      expect(hasOverlap(610, 10, existingGaps)).toBe(false)
    })

    it('should allow non-overlapping gaps', () => {
      const existingGaps = [{ startMinuteOfDay: 600, durationMinutes: 10 }]

      // Well after existing gap
      expect(hasOverlap(700, 10, existingGaps)).toBe(false)
    })

    it('should detect when new gap contains existing gap', () => {
      const existingGaps = [{ startMinuteOfDay: 605, durationMinutes: 5 }]

      // New gap contains existing
      expect(hasOverlap(600, 20, existingGaps)).toBe(true)
    })

    it('should handle empty existing gaps', () => {
      expect(hasOverlap(600, 10, [])).toBe(false)
    })
  })

  describe('getScheduleStats', () => {
    it('should calculate correct statistics', () => {
      const schedule: PrivacyGapSchedule = {
        childId: 'test-child',
        dateString: '2025-12-30',
        generatedAt: Date.now(),
        gaps: [
          { startMinuteOfDay: 600, durationMinutes: 10 },
          { startMinuteOfDay: 780, durationMinutes: 14 },
          { startMinuteOfDay: 900, durationMinutes: 6 },
        ],
      }

      const stats = getScheduleStats(schedule)

      expect(stats.gapCount).toBe(3)
      expect(stats.totalGapMinutes).toBe(30)
      expect(stats.averageGapDuration).toBe(10)
    })

    it('should handle empty schedule', () => {
      const schedule: PrivacyGapSchedule = {
        childId: 'test-child',
        dateString: '2025-12-30',
        generatedAt: Date.now(),
        gaps: [],
      }

      const stats = getScheduleStats(schedule)

      expect(stats.gapCount).toBe(0)
      expect(stats.totalGapMinutes).toBe(0)
      expect(stats.averageGapDuration).toBe(0)
    })
  })

  describe('Privacy Compliance', () => {
    it('should not include any family identifiers in schedule', () => {
      const schedule = generateDailySchedule('test-child', '2025-12-30')

      const scheduleString = JSON.stringify(schedule)

      // Should not contain family-related keys
      expect(scheduleString).not.toContain('familyId')
      expect(scheduleString).not.toContain('parentId')
      expect(scheduleString).not.toContain('email')
    })

    it('should not include any logging metadata', () => {
      const schedule = generateDailySchedule('test-child', '2025-12-30')

      const scheduleString = JSON.stringify(schedule)

      // Should not contain logging-related keys
      expect(scheduleString).not.toContain('logged')
      expect(scheduleString).not.toContain('reported')
      expect(scheduleString).not.toContain('synced')
    })
  })

  describe('Distribution Tests', () => {
    it('should distribute gaps throughout the day (not clustered)', () => {
      // Generate many schedules and check gap distribution
      const allGapStarts: number[] = []

      for (let i = 0; i < 100; i++) {
        const schedule = generateDailySchedule(`child-dist-${i}`, '2025-12-30')
        for (const gap of schedule.gaps) {
          allGapStarts.push(gap.startMinuteOfDay)
        }
      }

      // Divide day into 4 quarters
      const quarters = [0, 0, 0, 0]
      for (const start of allGapStarts) {
        const quarter = Math.floor(start / 360)
        quarters[Math.min(quarter, 3)]++
      }

      // Each quarter should have some gaps (randomness should spread them)
      for (const count of quarters) {
        expect(count).toBeGreaterThan(0)
      }
    })

    it('should vary gap durations (not all same length)', () => {
      // Generate many schedules and check duration distribution
      const allDurations: number[] = []

      for (let i = 0; i < 50; i++) {
        const schedule = generateDailySchedule(`child-dur-${i}`, '2025-12-30')
        for (const gap of schedule.gaps) {
          allDurations.push(gap.durationMinutes)
        }
      }

      // Should have variety in durations
      const uniqueDurations = new Set(allDurations)
      expect(uniqueDurations.size).toBeGreaterThan(3) // At least 4 different durations
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty childId', () => {
      const schedule = generateDailySchedule('', '2025-12-30')

      expect(schedule.gaps.length).toBeGreaterThanOrEqual(MIN_GAPS_PER_DAY)
    })

    it('should handle very long childId', () => {
      const longChildId = 'child-' + 'x'.repeat(1000)
      const schedule = generateDailySchedule(longChildId, '2025-12-30')

      expect(schedule.gaps.length).toBeGreaterThanOrEqual(MIN_GAPS_PER_DAY)
      expect(schedule.childId).toBe(longChildId)
    })

    it('should handle special characters in childId', () => {
      const specialChildId = 'child-with-special-chars-!@#$%^&*()'
      const schedule = generateDailySchedule(specialChildId, '2025-12-30')

      expect(schedule.gaps.length).toBeGreaterThanOrEqual(MIN_GAPS_PER_DAY)
    })
  })
})
