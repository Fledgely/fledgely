/**
 * Privacy Gaps Integration Tests
 *
 * Story 7.8: Privacy Gaps Injection - Task 4.5, Task 9
 *
 * Integration tests verifying the complete privacy gaps system:
 * - Crisis URL protection combined with privacy gaps
 * - Zero-data-path compliance
 * - Schedule generation and detection working together
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  createPrivacyGapDetector,
  createInMemoryScheduleStore,
  type PrivacyGapDetectorConfig,
} from '../privacyGapDetector'
import {
  generateDailyGapSchedule,
  isTimestampInScheduledGap,
} from '../privacyGapScheduler'
import {
  DEFAULT_PRIVACY_GAP_CONFIG,
  type PrivacyGapSchedule,
} from '@fledgely/contracts'
import { isCrisisUrl } from '../../constants/crisis-urls'

describe('Privacy Gaps Integration', () => {
  const testDate = new Date('2025-12-16T12:00:00.000Z')
  let scheduleStore: ReturnType<typeof createInMemoryScheduleStore>

  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(testDate)
    scheduleStore = createInMemoryScheduleStore()
  })

  afterEach(() => {
    vi.useRealTimers()
    scheduleStore.clear()
  })

  describe('Task 4: Crisis Protection + Privacy Gaps Integration', () => {
    describe('AC 5: Crisis gaps blend seamlessly with privacy gaps', () => {
      it('crisis URL suppression and privacy gap suppression have identical response structure', async () => {
        const childId = 'blend-test-child'

        // Generate schedule with gaps
        const schedule = generateDailyGapSchedule(childId, testDate)
        scheduleStore.set(schedule)

        const detector = createPrivacyGapDetector({
          getSchedule: (cid, date) => scheduleStore.get(cid, date),
          isCrisisUrl,
          privacyGapsConfig: DEFAULT_PRIVACY_GAP_CONFIG,
        })

        // Crisis URL result
        const crisisResult = await detector.shouldSuppressCapture(
          childId,
          testDate,
          'https://988lifeline.org/chat'
        )

        // Privacy gap result (find a time within a gap)
        let privacyResult: typeof crisisResult | null = null
        if (schedule.gaps.length > 0) {
          const gap = schedule.gaps[0]
          const inGapTime = new Date(gap.startTime)
          inGapTime.setMinutes(inGapTime.getMinutes() + 2)

          privacyResult = await detector.shouldSuppressCapture(
            childId,
            inGapTime,
            'https://innocent-website.com'
          )
        }

        // Both should have IDENTICAL structure
        expect(crisisResult.suppress).toBe(true)
        if (privacyResult) {
          expect(privacyResult.suppress).toBe(true)
          expect(Object.keys(crisisResult)).toEqual(Object.keys(privacyResult))
        }

        // Neither should expose reason
        expect(crisisResult).not.toHaveProperty('reason')
        expect(crisisResult).not.toHaveProperty('gapType')
      })

      it('suppression responses contain ONLY suppress flag - nothing else', async () => {
        const childId = 'minimal-response-child'

        const detector = createPrivacyGapDetector({
          getSchedule: () => Promise.resolve(null),
          isCrisisUrl,
          privacyGapsConfig: DEFAULT_PRIVACY_GAP_CONFIG,
        })

        // Check various scenarios
        const crisisResponse = await detector.shouldSuppressCapture(
          childId,
          testDate,
          'https://988lifeline.org'
        )

        const normalResponse = await detector.shouldSuppressCapture(
          childId,
          testDate,
          'https://google.com'
        )

        // Verify minimal response structure
        expect(Object.keys(crisisResponse)).toEqual(['suppress'])
        expect(Object.keys(normalResponse)).toEqual(['suppress'])
      })
    })

    describe('Zero-data-path compliance', () => {
      it('does NOT log gap type or reason anywhere', async () => {
        const childId = 'zero-data-child'
        const schedule = generateDailyGapSchedule(childId, testDate)
        scheduleStore.set(schedule)

        // Spy on console to ensure no logging
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
        const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

        const detector = createPrivacyGapDetector({
          getSchedule: (cid, date) => scheduleStore.get(cid, date),
          isCrisisUrl,
          privacyGapsConfig: DEFAULT_PRIVACY_GAP_CONFIG,
        })

        // Make several calls
        await detector.shouldSuppressCapture(childId, testDate, 'https://988lifeline.org')
        await detector.shouldSuppressCapture(childId, testDate, 'https://example.com')

        if (schedule.gaps.length > 0) {
          const gap = schedule.gaps[0]
          const inGapTime = new Date(gap.startTime)
          await detector.shouldSuppressCapture(childId, inGapTime, 'https://test.com')
        }

        // Verify no sensitive logging occurred
        expect(consoleSpy).not.toHaveBeenCalled()
        expect(consoleWarnSpy).not.toHaveBeenCalled()

        consoleSpy.mockRestore()
        consoleWarnSpy.mockRestore()
      })
    })
  })

  describe('Task 9: Complete Integration Testing', () => {
    describe('Daily schedule generation produces valid gaps (9.2)', () => {
      it('generates schedule within configured bounds', () => {
        const schedule = generateDailyGapSchedule('schedule-bounds-child', testDate)

        expect(schedule.gaps.length).toBeGreaterThanOrEqual(
          DEFAULT_PRIVACY_GAP_CONFIG.minDailyGaps
        )
        expect(schedule.gaps.length).toBeLessThanOrEqual(
          DEFAULT_PRIVACY_GAP_CONFIG.maxDailyGaps
        )

        for (const gap of schedule.gaps) {
          expect(gap.durationMs).toBeGreaterThanOrEqual(
            DEFAULT_PRIVACY_GAP_CONFIG.minGapDurationMs
          )
          expect(gap.durationMs).toBeLessThanOrEqual(
            DEFAULT_PRIVACY_GAP_CONFIG.maxGapDurationMs
          )
        }
      })

      it('gaps are within waking hours', () => {
        const schedule = generateDailyGapSchedule('waking-hours-child', testDate)

        for (const gap of schedule.gaps) {
          const startHour = new Date(gap.startTime).getUTCHours()
          const endHour = new Date(gap.endTime).getUTCHours()

          expect(startHour).toBeGreaterThanOrEqual(DEFAULT_PRIVACY_GAP_CONFIG.wakingHoursStart)
          expect(endHour).toBeLessThanOrEqual(DEFAULT_PRIVACY_GAP_CONFIG.wakingHoursEnd)
        }
      })
    })

    describe('Per-child randomization (9.3)', () => {
      it('different children get different schedules on same day', () => {
        const schedule1 = generateDailyGapSchedule('child-alpha', testDate)
        const schedule2 = generateDailyGapSchedule('child-beta', testDate)
        const schedule3 = generateDailyGapSchedule('child-gamma', testDate)

        // With high probability, at least 2 of 3 will differ
        const allSame =
          schedule1.gaps.length === schedule2.gaps.length &&
          schedule2.gaps.length === schedule3.gaps.length &&
          schedule1.gaps.every((g, i) => g.startTime === schedule2.gaps[i]?.startTime) &&
          schedule2.gaps.every((g, i) => g.startTime === schedule3.gaps[i]?.startTime)

        expect(allSame).toBe(false)
      })

      it('same child gets deterministic schedule', () => {
        const schedule1 = generateDailyGapSchedule('deterministic-child', testDate)
        const schedule2 = generateDailyGapSchedule('deterministic-child', testDate)

        expect(schedule1).toEqual(schedule2)
      })
    })

    describe('Crisis gap blending (9.4)', () => {
      it('crisis visits during privacy gaps are indistinguishable', async () => {
        const childId = 'blending-test-child'
        const schedule = generateDailyGapSchedule(childId, testDate)
        scheduleStore.set(schedule)

        const detector = createPrivacyGapDetector({
          getSchedule: (cid, date) => scheduleStore.get(cid, date),
          isCrisisUrl,
          privacyGapsConfig: DEFAULT_PRIVACY_GAP_CONFIG,
        })

        if (schedule.gaps.length > 0) {
          const gap = schedule.gaps[0]
          const inGapTime = new Date(gap.startTime)
          inGapTime.setMinutes(inGapTime.getMinutes() + 2)

          // Crisis URL during privacy gap
          const crisisDuringGap = await detector.shouldSuppressCapture(
            childId,
            inGapTime,
            'https://988lifeline.org'
          )

          // Normal URL during privacy gap
          const normalDuringGap = await detector.shouldSuppressCapture(
            childId,
            inGapTime,
            'https://youtube.com'
          )

          // Both suppressed
          expect(crisisDuringGap.suppress).toBe(true)
          expect(normalDuringGap.suppress).toBe(true)

          // Indistinguishable to external observer
          expect(crisisDuringGap).toEqual(normalDuringGap)
        }
      })

      it('crisis URLs outside privacy gaps still suppressed', async () => {
        const childId = 'crisis-outside-gap-child'

        const detector = createPrivacyGapDetector({
          getSchedule: () => Promise.resolve(null), // No schedule
          isCrisisUrl,
          privacyGapsConfig: DEFAULT_PRIVACY_GAP_CONFIG,
        })

        const result = await detector.shouldSuppressCapture(
          childId,
          new Date('2025-12-16T05:00:00.000Z'), // 5am - before waking hours
          'https://rainn.org/help'
        )

        expect(result.suppress).toBe(true)
      })
    })

    describe('Default enabled on new profiles (9.5)', () => {
      it('privacy gaps enabled by default per config', () => {
        expect(DEFAULT_PRIVACY_GAP_CONFIG.enabled).toBe(true)
      })

      it('schedules generated for children without explicit config', () => {
        // generateDailyGapSchedule uses DEFAULT_PRIVACY_GAP_CONFIG when none provided
        const schedule = generateDailyGapSchedule('new-child', testDate)

        expect(schedule.gaps.length).toBeGreaterThanOrEqual(2)
      })
    })

    describe('Zero-data-path (gap reasons never logged or exposed) (9.6)', () => {
      it('CaptureSuppressResult contains ONLY suppress boolean', async () => {
        const detector = createPrivacyGapDetector({
          getSchedule: () => Promise.resolve(null),
          isCrisisUrl,
          privacyGapsConfig: DEFAULT_PRIVACY_GAP_CONFIG,
        })

        const result = await detector.shouldSuppressCapture(
          'zdp-child',
          testDate,
          'https://988lifeline.org'
        )

        // Type-level check: result should only have suppress
        const keys = Object.keys(result)
        expect(keys).toEqual(['suppress'])
        expect(keys).not.toContain('reason')
        expect(keys).not.toContain('gapType')
        expect(keys).not.toContain('isCrisis')
        expect(keys).not.toContain('isPrivacyGap')
      })

      it('schedule store does not track gap origins', () => {
        const schedule = generateDailyGapSchedule('origin-check-child', testDate)

        // Schedule gaps have NO indication of type
        for (const gap of schedule.gaps) {
          expect(gap).not.toHaveProperty('type')
          expect(gap).not.toHaveProperty('reason')
          expect(gap).not.toHaveProperty('origin')
          expect(gap).not.toHaveProperty('isCrisis')
        }
      })
    })
  })

  describe('Scheduler + Detector End-to-End', () => {
    it('full workflow: generate schedule, store, detect', async () => {
      const childId = 'e2e-workflow-child'

      // 1. Generate schedule
      const schedule = generateDailyGapSchedule(childId, testDate)
      expect(schedule.gaps.length).toBeGreaterThanOrEqual(2)

      // 2. Store schedule
      scheduleStore.set(schedule)

      // 3. Create detector
      const detector = createPrivacyGapDetector({
        getSchedule: (cid, date) => scheduleStore.get(cid, date),
        isCrisisUrl,
        privacyGapsConfig: DEFAULT_PRIVACY_GAP_CONFIG,
      })

      // 4. Check timestamps in and out of gaps
      if (schedule.gaps.length > 0) {
        const gap = schedule.gaps[0]

        // In gap
        const inGapTime = new Date(gap.startTime)
        inGapTime.setMinutes(inGapTime.getMinutes() + 2)
        const inGapResult = await detector.shouldSuppressCapture(
          childId,
          inGapTime,
          'https://example.com'
        )
        expect(inGapResult.suppress).toBe(true)

        // After gap
        const afterGapTime = new Date(gap.endTime)
        afterGapTime.setMinutes(afterGapTime.getMinutes() + 5)

        // Check if this time falls in another gap
        const isInAnotherGap = schedule.gaps.some((g) => {
          const start = new Date(g.startTime).getTime()
          const end = new Date(g.endTime).getTime()
          return afterGapTime.getTime() >= start && afterGapTime.getTime() < end
        })

        const afterGapResult = await detector.shouldSuppressCapture(
          childId,
          afterGapTime,
          'https://example.com'
        )
        expect(afterGapResult.suppress).toBe(isInAnotherGap)
      }
    })

    it('detector queries correct date when checking gaps', async () => {
      const childId = 'date-query-child'
      const queriedDates: string[] = []

      const detector = createPrivacyGapDetector({
        getSchedule: async (_cid, date) => {
          queriedDates.push(date.toISOString().slice(0, 10))
          return null
        },
        isCrisisUrl: () => false,
        privacyGapsConfig: DEFAULT_PRIVACY_GAP_CONFIG,
      })

      // Check timestamps on different dates
      await detector.shouldSuppressCapture(
        childId,
        new Date('2025-12-16T10:00:00.000Z'),
        'https://example.com'
      )
      await detector.shouldSuppressCapture(
        childId,
        new Date('2025-12-17T15:00:00.000Z'),
        'https://example.com'
      )
      await detector.shouldSuppressCapture(
        childId,
        new Date('2025-12-18T20:00:00.000Z'),
        'https://example.com'
      )

      expect(queriedDates).toEqual(['2025-12-16', '2025-12-17', '2025-12-18'])
    })
  })
})
