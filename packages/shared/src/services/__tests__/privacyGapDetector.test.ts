/**
 * Privacy Gap Detector Service Tests
 *
 * Story 7.8: Privacy Gaps Injection - Task 3.6
 *
 * Tests the gap detection logic that determines whether screenshot
 * capture should be suppressed.
 *
 * CRITICAL: Tests verify that gap type (privacy vs crisis) is NEVER
 * exposed in the return value - only suppress: true/false.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  createPrivacyGapDetector,
  type PrivacyGapDetectorConfig,
  type CaptureSuppressResult,
} from '../privacyGapDetector'
import { generateDailyGapSchedule } from '../privacyGapScheduler'
import { DEFAULT_PRIVACY_GAP_CONFIG, type PrivacyGapSchedule } from '@fledgely/contracts'

describe('privacyGapDetector', () => {
  const testChildId = 'test-child-123'
  const testDate = new Date('2025-12-16T12:00:00.000Z')

  let mockScheduleStore: Map<string, PrivacyGapSchedule>
  let detector: ReturnType<typeof createPrivacyGapDetector>

  beforeEach(() => {
    mockScheduleStore = new Map()
    vi.useFakeTimers()
    vi.setSystemTime(testDate)

    // Create detector with mock schedule fetcher
    const config: PrivacyGapDetectorConfig = {
      getSchedule: async (childId: string, date: Date) => {
        const key = `${childId}:${date.toISOString().slice(0, 10)}`
        return mockScheduleStore.get(key) ?? null
      },
      isCrisisUrl: (url: string) => {
        // Mock crisis URL check
        return url.includes('988lifeline.org') || url.includes('rainn.org')
      },
      privacyGapsConfig: DEFAULT_PRIVACY_GAP_CONFIG,
    }

    detector = createPrivacyGapDetector(config)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('shouldSuppressCapture', () => {
    describe('zero-data-path compliance', () => {
      it('returns suppress: true for crisis URLs with NO reason exposed', async () => {
        const result = await detector.shouldSuppressCapture(
          testChildId,
          testDate,
          'https://988lifeline.org/chat'
        )

        // CRITICAL: Only suppress flag, NO gap type or reason
        expect(result.suppress).toBe(true)
        expect(result).not.toHaveProperty('reason')
        expect(result).not.toHaveProperty('gapType')
        expect(result).not.toHaveProperty('isCrisis')
      })

      it('returns suppress: true for privacy gaps with NO reason exposed', async () => {
        // Generate schedule with gaps
        const schedule = generateDailyGapSchedule(testChildId, testDate)
        const key = `${testChildId}:2025-12-16`
        mockScheduleStore.set(key, schedule)

        // Find a time within a gap
        if (schedule.gaps.length > 0) {
          const gap = schedule.gaps[0]
          const inGapTime = new Date(gap.startTime)
          inGapTime.setMinutes(inGapTime.getMinutes() + 2) // 2 minutes into gap

          const result = await detector.shouldSuppressCapture(
            testChildId,
            inGapTime,
            'https://example.com'
          )

          // CRITICAL: Only suppress flag, NO gap type or reason
          expect(result.suppress).toBe(true)
          expect(result).not.toHaveProperty('reason')
          expect(result).not.toHaveProperty('gapType')
          expect(result).not.toHaveProperty('isCrisis')
        }
      })

      it('suppressed results for crisis and privacy gaps are IDENTICAL', async () => {
        const schedule = generateDailyGapSchedule(testChildId, testDate)
        const key = `${testChildId}:2025-12-16`
        mockScheduleStore.set(key, schedule)

        // Crisis URL result
        const crisisResult = await detector.shouldSuppressCapture(
          testChildId,
          testDate,
          'https://988lifeline.org'
        )

        // Privacy gap result (if in gap)
        if (schedule.gaps.length > 0) {
          const gap = schedule.gaps[0]
          const inGapTime = new Date(gap.startTime)
          inGapTime.setMinutes(inGapTime.getMinutes() + 2)

          const privacyResult = await detector.shouldSuppressCapture(
            testChildId,
            inGapTime,
            'https://innocent-site.com'
          )

          // Results should have IDENTICAL structure - no way to distinguish
          expect(Object.keys(crisisResult).sort()).toEqual(
            Object.keys(privacyResult).sort()
          )
        }
      })
    })

    describe('suppression logic', () => {
      it('returns suppress: false for non-crisis URL outside privacy gaps', async () => {
        // Set time outside any gap (early morning before waking hours)
        const earlyMorning = new Date('2025-12-16T05:00:00.000Z')

        const result = await detector.shouldSuppressCapture(
          testChildId,
          earlyMorning,
          'https://example.com'
        )

        expect(result.suppress).toBe(false)
      })

      it('suppresses crisis URLs regardless of gap schedule', async () => {
        // Time outside gaps (early morning)
        const earlyMorning = new Date('2025-12-16T05:00:00.000Z')

        const result = await detector.shouldSuppressCapture(
          testChildId,
          earlyMorning,
          'https://rainn.org/help'
        )

        expect(result.suppress).toBe(true)
      })

      it('crisis URLs are checked FIRST (highest priority)', async () => {
        const schedule = generateDailyGapSchedule(testChildId, testDate)
        const key = `${testChildId}:2025-12-16`
        mockScheduleStore.set(key, schedule)

        // Even in a privacy gap, crisis URLs still trigger suppression
        if (schedule.gaps.length > 0) {
          const gap = schedule.gaps[0]
          const inGapTime = new Date(gap.startTime)
          inGapTime.setMinutes(inGapTime.getMinutes() + 2)

          const result = await detector.shouldSuppressCapture(
            testChildId,
            inGapTime,
            'https://988lifeline.org'
          )

          expect(result.suppress).toBe(true)
        }
      })
    })

    describe('schedule fetching', () => {
      it('fetches schedule for the correct date', async () => {
        let fetchedDate: Date | null = null

        const config: PrivacyGapDetectorConfig = {
          getSchedule: async (_childId, date) => {
            fetchedDate = date
            return null
          },
          isCrisisUrl: () => false,
          privacyGapsConfig: DEFAULT_PRIVACY_GAP_CONFIG,
        }

        const customDetector = createPrivacyGapDetector(config)

        await customDetector.shouldSuppressCapture(
          testChildId,
          new Date('2025-12-20T15:30:00.000Z'),
          'https://example.com'
        )

        expect(fetchedDate?.toISOString().slice(0, 10)).toBe('2025-12-20')
      })

      it('handles null schedule gracefully', async () => {
        const config: PrivacyGapDetectorConfig = {
          getSchedule: async () => null,
          isCrisisUrl: () => false,
          privacyGapsConfig: DEFAULT_PRIVACY_GAP_CONFIG,
        }

        const customDetector = createPrivacyGapDetector(config)

        const result = await customDetector.shouldSuppressCapture(
          testChildId,
          testDate,
          'https://example.com'
        )

        // No schedule means no privacy gaps - don't suppress
        expect(result.suppress).toBe(false)
      })
    })
  })

  describe('isWithinScheduledGap', () => {
    it('returns true when timestamp is within a gap', async () => {
      const schedule = generateDailyGapSchedule(testChildId, testDate)
      const key = `${testChildId}:2025-12-16`
      mockScheduleStore.set(key, schedule)

      if (schedule.gaps.length > 0) {
        const gap = schedule.gaps[0]
        const inGapTime = new Date(gap.startTime)
        inGapTime.setMinutes(inGapTime.getMinutes() + 2)

        const result = await detector.isWithinScheduledGap(testChildId, inGapTime)
        expect(result).toBe(true)
      }
    })

    it('returns false when timestamp is outside all gaps', async () => {
      const schedule = generateDailyGapSchedule(testChildId, testDate)
      const key = `${testChildId}:2025-12-16`
      mockScheduleStore.set(key, schedule)

      // Time well before first gap (early morning)
      const earlyTime = new Date('2025-12-16T05:00:00.000Z')

      const result = await detector.isWithinScheduledGap(testChildId, earlyTime)
      expect(result).toBe(false)
    })

    it('returns false when no schedule exists', async () => {
      // Don't set any schedule

      const result = await detector.isWithinScheduledGap(testChildId, testDate)
      expect(result).toBe(false)
    })

    it('handles gap boundaries correctly', async () => {
      const schedule = generateDailyGapSchedule(testChildId, testDate)
      const key = `${testChildId}:2025-12-16`
      mockScheduleStore.set(key, schedule)

      if (schedule.gaps.length > 0) {
        const gap = schedule.gaps[0]

        // Exactly at start time - should be in gap
        const atStart = new Date(gap.startTime)
        expect(await detector.isWithinScheduledGap(testChildId, atStart)).toBe(true)

        // Just before end - should be in gap
        const justBeforeEnd = new Date(gap.endTime)
        justBeforeEnd.setMilliseconds(justBeforeEnd.getMilliseconds() - 1)
        expect(await detector.isWithinScheduledGap(testChildId, justBeforeEnd)).toBe(true)

        // Exactly at end - should be out of gap
        const atEnd = new Date(gap.endTime)
        expect(await detector.isWithinScheduledGap(testChildId, atEnd)).toBe(false)
      }
    })
  })

  describe('feature flag handling', () => {
    it('respects disabled privacy gaps config', async () => {
      const disabledConfig: PrivacyGapDetectorConfig = {
        getSchedule: async () => null,
        isCrisisUrl: () => false,
        privacyGapsConfig: {
          ...DEFAULT_PRIVACY_GAP_CONFIG,
          enabled: false,
        },
      }

      const disabledDetector = createPrivacyGapDetector(disabledConfig)

      // Even if there were gaps, disabled config should not suppress
      const result = await disabledDetector.shouldSuppressCapture(
        testChildId,
        testDate,
        'https://example.com'
      )

      expect(result.suppress).toBe(false)
    })

    it('still suppresses crisis URLs even when privacy gaps disabled', async () => {
      const disabledConfig: PrivacyGapDetectorConfig = {
        getSchedule: async () => null,
        isCrisisUrl: (url) => url.includes('988lifeline.org'),
        privacyGapsConfig: {
          ...DEFAULT_PRIVACY_GAP_CONFIG,
          enabled: false,
        },
      }

      const disabledDetector = createPrivacyGapDetector(disabledConfig)

      const result = await disabledDetector.shouldSuppressCapture(
        testChildId,
        testDate,
        'https://988lifeline.org'
      )

      // Crisis URLs always suppressed regardless of privacy gap config
      expect(result.suppress).toBe(true)
    })
  })
})
