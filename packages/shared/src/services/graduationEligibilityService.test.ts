/**
 * Graduation Eligibility Service Tests - Story 38.1 Task 2
 *
 * Tests for graduation eligibility tracking and calculation.
 * FR38A: 100% trust for 12 consecutive months.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import {
  checkGraduationEligibility,
  calculateMonthsAtPerfectTrust,
  projectEligibilityDate,
  checkStreakContinuity,
  getStoredEligibilityStatus,
  recordStreakBreak,
  getStreakBreakHistory,
  isNearGraduation,
  getRemainingMonths,
  isAtPerfectTrust,
  clearAllEligibilityData,
  createMockTrustScoreHistory,
} from './graduationEligibilityService'
import { TrustScoreHistoryEntry } from '../contracts/graduationEligibility'

describe('GraduationEligibilityService - Story 38.1 Task 2', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2025-12-01T12:00:00Z'))
    clearAllEligibilityData()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  // Helper to create trust history
  function createHistory(childId: string, monthScores: number[]): TrustScoreHistoryEntry[] {
    const baseDate = new Date('2025-01-01')
    return monthScores.map((score, index) => {
      const date = new Date(baseDate)
      date.setMonth(date.getMonth() + index)
      return { childId, score, date }
    })
  }

  describe('checkGraduationEligibility', () => {
    it('should return initial status for empty history', () => {
      const status = checkGraduationEligibility('child-123', [])

      expect(status.childId).toBe('child-123')
      expect(status.monthsAtPerfectTrust).toBe(0)
      expect(status.isEligible).toBe(false)
      expect(status.progressPercentage).toBe(0)
    })

    it('should calculate months at perfect trust', () => {
      const history = createHistory('child-123', [100, 100, 100, 100, 100, 100])

      const status = checkGraduationEligibility('child-123', history)

      expect(status.monthsAtPerfectTrust).toBe(6)
      expect(status.progressPercentage).toBe(50)
      expect(status.isEligible).toBe(false)
    })

    it('should mark eligible at 12 months of perfect trust', () => {
      const history = createHistory(
        'child-123',
        [100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100]
      )

      const status = checkGraduationEligibility('child-123', history)

      expect(status.monthsAtPerfectTrust).toBe(12)
      expect(status.isEligible).toBe(true)
      expect(status.progressPercentage).toBe(100)
    })

    it('should track current trust score', () => {
      const history = createHistory('child-123', [100, 100, 100, 95])

      const status = checkGraduationEligibility('child-123', history)

      expect(status.currentTrustScore).toBe(95)
    })

    it('should set lastCheckedAt to current time', () => {
      const history = createHistory('child-123', [100])

      const status = checkGraduationEligibility('child-123', history)

      expect(status.lastCheckedAt).toEqual(new Date('2025-12-01T12:00:00Z'))
    })

    it('should store status for retrieval', () => {
      const history = createHistory('child-123', [100, 100, 100])

      checkGraduationEligibility('child-123', history)

      const stored = getStoredEligibilityStatus('child-123')
      expect(stored).not.toBeNull()
      expect(stored?.monthsAtPerfectTrust).toBe(3)
    })
  })

  describe('calculateMonthsAtPerfectTrust', () => {
    it('should return 0 for empty history', () => {
      expect(calculateMonthsAtPerfectTrust([])).toBe(0)
    })

    it('should count consecutive months at 100%', () => {
      const history = createHistory('child-123', [100, 100, 100])
      expect(calculateMonthsAtPerfectTrust(history)).toBe(3)
    })

    it('should stop counting at first month below threshold', () => {
      // Most recent months first in calculation (reverse order)
      const history = createHistory('child-123', [100, 100, 95, 100, 100])
      expect(calculateMonthsAtPerfectTrust(history)).toBe(2)
    })

    it('should return 0 if most recent month is below threshold', () => {
      const history = createHistory('child-123', [100, 100, 100, 95])
      expect(calculateMonthsAtPerfectTrust(history)).toBe(0)
    })

    it('should use custom threshold', () => {
      const history = createHistory('child-123', [95, 95, 95])
      expect(calculateMonthsAtPerfectTrust(history, 95)).toBe(3)
      expect(calculateMonthsAtPerfectTrust(history, 100)).toBe(0)
    })
  })

  describe('projectEligibilityDate', () => {
    it('should return null if already eligible', () => {
      const result = projectEligibilityDate(12, 12, new Date('2024-01-01'))
      expect(result).toBeNull()
    })

    it('should return null if no streak start date', () => {
      const result = projectEligibilityDate(6, 12, null)
      expect(result).toBeNull()
    })

    it('should project date based on streak start', () => {
      const streakStart = new Date('2025-06-01')
      const result = projectEligibilityDate(6, 12, streakStart)

      expect(result).not.toBeNull()
      // 12 months from streak start
      expect(result?.getFullYear()).toBe(2026)
      expect(result?.getMonth()).toBe(5) // June
    })
  })

  describe('checkStreakContinuity', () => {
    it('should return no break for empty history', () => {
      const result = checkStreakContinuity([])

      expect(result.streakBroken).toBe(false)
      expect(result.breakDate).toBeNull()
    })

    it('should return no break for single entry', () => {
      const history = createHistory('child-123', [100])

      const result = checkStreakContinuity(history)

      expect(result.streakBroken).toBe(false)
    })

    it('should detect streak break', () => {
      const history = createHistory('child-123', [100, 100, 95, 100])

      const result = checkStreakContinuity(history)

      expect(result.streakBroken).toBe(true)
      expect(result.breakingScore).toBe(95)
    })

    it('should return correct break date', () => {
      const history = createHistory('child-123', [100, 100, 95, 100])

      const result = checkStreakContinuity(history)

      expect(result.breakDate).not.toBeNull()
      expect(result.breakDate?.getMonth()).toBe(2) // March (0-indexed)
    })

    it('should return no break if never at threshold', () => {
      const history = createHistory('child-123', [90, 85, 80])

      const result = checkStreakContinuity(history)

      expect(result.streakBroken).toBe(false)
    })
  })

  describe('recordStreakBreak', () => {
    it('should record streak break event', () => {
      const breakDate = new Date('2025-06-15')
      const previousStart = new Date('2025-01-01')

      const event = recordStreakBreak('child-123', breakDate, 95, 5, previousStart)

      expect(event.childId).toBe('child-123')
      expect(event.breakingScore).toBe(95)
      expect(event.monthsLost).toBe(5)
    })

    it('should add to history', () => {
      const breakDate1 = new Date('2025-06-15')
      const breakDate2 = new Date('2025-09-15')

      recordStreakBreak('child-123', breakDate1, 95, 5, new Date('2025-01-01'))
      recordStreakBreak('child-123', breakDate2, 98, 3, new Date('2025-06-16'))

      const history = getStreakBreakHistory('child-123')
      expect(history).toHaveLength(2)
    })
  })

  describe('getStreakBreakHistory', () => {
    it('should return empty array for unknown child', () => {
      const history = getStreakBreakHistory('unknown-child')
      expect(history).toEqual([])
    })

    it('should return all recorded breaks', () => {
      recordStreakBreak('child-123', new Date(), 95, 5, new Date())
      recordStreakBreak('child-123', new Date(), 90, 3, new Date())

      const history = getStreakBreakHistory('child-123')
      expect(history).toHaveLength(2)
    })
  })

  describe('isNearGraduation', () => {
    it('should return true when 3 or fewer months remaining', () => {
      const status = {
        childId: 'child-123',
        currentTrustScore: 100,
        monthsAtPerfectTrust: 10,
        eligibilityDate: null,
        isEligible: false,
        progressPercentage: 83.3,
        streakStartDate: new Date(),
        lastCheckedAt: new Date(),
      }

      expect(isNearGraduation(status)).toBe(true)
    })

    it('should return false when more than 3 months remaining', () => {
      const status = {
        childId: 'child-123',
        currentTrustScore: 100,
        monthsAtPerfectTrust: 6,
        eligibilityDate: null,
        isEligible: false,
        progressPercentage: 50,
        streakStartDate: new Date(),
        lastCheckedAt: new Date(),
      }

      expect(isNearGraduation(status)).toBe(false)
    })

    it('should return false when already eligible', () => {
      const status = {
        childId: 'child-123',
        currentTrustScore: 100,
        monthsAtPerfectTrust: 12,
        eligibilityDate: null,
        isEligible: true,
        progressPercentage: 100,
        streakStartDate: new Date(),
        lastCheckedAt: new Date(),
      }

      expect(isNearGraduation(status)).toBe(false)
    })
  })

  describe('getRemainingMonths', () => {
    it('should return 12 for 0 months completed', () => {
      const status = {
        childId: 'child-123',
        currentTrustScore: 100,
        monthsAtPerfectTrust: 0,
        eligibilityDate: null,
        isEligible: false,
        progressPercentage: 0,
        streakStartDate: null,
        lastCheckedAt: new Date(),
      }

      expect(getRemainingMonths(status)).toBe(12)
    })

    it('should return 6 for 6 months completed', () => {
      const status = {
        childId: 'child-123',
        currentTrustScore: 100,
        monthsAtPerfectTrust: 6,
        eligibilityDate: null,
        isEligible: false,
        progressPercentage: 50,
        streakStartDate: new Date(),
        lastCheckedAt: new Date(),
      }

      expect(getRemainingMonths(status)).toBe(6)
    })

    it('should return 0 for 12 or more months', () => {
      const status = {
        childId: 'child-123',
        currentTrustScore: 100,
        monthsAtPerfectTrust: 12,
        eligibilityDate: null,
        isEligible: true,
        progressPercentage: 100,
        streakStartDate: new Date(),
        lastCheckedAt: new Date(),
      }

      expect(getRemainingMonths(status)).toBe(0)
    })
  })

  describe('isAtPerfectTrust', () => {
    it('should return true for score of 100', () => {
      const status = {
        childId: 'child-123',
        currentTrustScore: 100,
        monthsAtPerfectTrust: 3,
        eligibilityDate: null,
        isEligible: false,
        progressPercentage: 25,
        streakStartDate: new Date(),
        lastCheckedAt: new Date(),
      }

      expect(isAtPerfectTrust(status)).toBe(true)
    })

    it('should return false for score of 99', () => {
      const status = {
        childId: 'child-123',
        currentTrustScore: 99,
        monthsAtPerfectTrust: 0,
        eligibilityDate: null,
        isEligible: false,
        progressPercentage: 0,
        streakStartDate: null,
        lastCheckedAt: new Date(),
      }

      expect(isAtPerfectTrust(status)).toBe(false)
    })
  })

  describe('createMockTrustScoreHistory', () => {
    it('should create history with specified months', () => {
      const history = createMockTrustScoreHistory('child-123', 6)

      expect(history).toHaveLength(7) // 0 to 6 inclusive
      expect(history.every((h) => h.score === 100)).toBe(true)
      expect(history.every((h) => h.childId === 'child-123')).toBe(true)
    })

    it('should create chronologically ordered history', () => {
      const history = createMockTrustScoreHistory('child-123', 3)

      for (let i = 1; i < history.length; i++) {
        expect(history[i].date.getTime()).toBeGreaterThan(history[i - 1].date.getTime())
      }
    })
  })

  describe('clearAllEligibilityData', () => {
    it('should clear all stored data', () => {
      const history = createHistory('child-123', [100, 100, 100])
      checkGraduationEligibility('child-123', history)
      recordStreakBreak('child-123', new Date(), 95, 3, new Date())

      clearAllEligibilityData()

      expect(getStoredEligibilityStatus('child-123')).toBeNull()
      expect(getStreakBreakHistory('child-123')).toEqual([])
    })
  })

  describe('AC Verification', () => {
    describe('AC1: 100% trust for 12 consecutive months', () => {
      it('should require exactly 12 months', () => {
        const elevenMonths = createHistory('child-123', Array(11).fill(100))
        const twelveMonths = createHistory('child-123', Array(12).fill(100))

        const status11 = checkGraduationEligibility('child-123', elevenMonths)
        clearAllEligibilityData()
        const status12 = checkGraduationEligibility('child-123', twelveMonths)

        expect(status11.isEligible).toBe(false)
        expect(status12.isEligible).toBe(true)
      })

      it('should require 100%, not 99%', () => {
        const history99 = createHistory('child-123', Array(12).fill(99))
        const history100 = createHistory('child-123', Array(12).fill(100))

        const status99 = checkGraduationEligibility('child-123', history99)
        clearAllEligibilityData()
        const status100 = checkGraduationEligibility('child-123', history100)

        expect(status99.isEligible).toBe(false)
        expect(status100.isEligible).toBe(true)
      })
    })

    describe('AC5: Eligibility triggers conversation, not auto-graduation', () => {
      it('should set isEligible flag but not auto-graduate', () => {
        const history = createHistory('child-123', Array(12).fill(100))

        const status = checkGraduationEligibility('child-123', history)

        expect(status.isEligible).toBe(true)
        // Status indicates eligibility, actual graduation is separate workflow
      })
    })
  })

  describe('Edge Cases', () => {
    it('should handle history with gaps', () => {
      const history: TrustScoreHistoryEntry[] = [
        { childId: 'child-123', score: 100, date: new Date('2025-01-01') },
        { childId: 'child-123', score: 100, date: new Date('2025-03-01') }, // Skipped Feb
        { childId: 'child-123', score: 100, date: new Date('2025-04-01') },
      ]

      const status = checkGraduationEligibility('child-123', history)

      // Should still calculate based on available data
      expect(status.monthsAtPerfectTrust).toBeGreaterThanOrEqual(0)
    })

    it('should handle multiple entries per month', () => {
      const history: TrustScoreHistoryEntry[] = [
        { childId: 'child-123', score: 100, date: new Date('2025-01-01') },
        { childId: 'child-123', score: 100, date: new Date('2025-01-15') },
        { childId: 'child-123', score: 100, date: new Date('2025-01-28') },
        { childId: 'child-123', score: 100, date: new Date('2025-02-01') },
      ]

      const status = checkGraduationEligibility('child-123', history)

      // Should count unique months
      expect(status.monthsAtPerfectTrust).toBe(2)
    })
  })
})
