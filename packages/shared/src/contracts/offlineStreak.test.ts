/**
 * Offline Time Streak Contract Tests - Story 32.6
 *
 * Tests for streak data model validation.
 */

import { describe, it, expect } from 'vitest'
import {
  STREAK_MILESTONE_DAYS,
  streakMilestonesSchema,
  offlineStreakSchema,
  STREAK_MESSAGES,
  leaderboardEntrySchema,
} from './index'

describe('Offline Streak Contracts - Story 32.6', () => {
  describe('STREAK_MILESTONE_DAYS', () => {
    it('defines correct milestone thresholds', () => {
      expect(STREAK_MILESTONE_DAYS.seven).toBe(7)
      expect(STREAK_MILESTONE_DAYS.thirty).toBe(30)
      expect(STREAK_MILESTONE_DAYS.hundred).toBe(100)
    })
  })

  describe('streakMilestonesSchema', () => {
    it('validates complete milestones object', () => {
      const result = streakMilestonesSchema.parse({
        sevenDays: true,
        thirtyDays: true,
        hundredDays: false,
      })

      expect(result.sevenDays).toBe(true)
      expect(result.thirtyDays).toBe(true)
      expect(result.hundredDays).toBe(false)
    })

    it('defaults to false for missing milestones', () => {
      const result = streakMilestonesSchema.parse({})

      expect(result.sevenDays).toBe(false)
      expect(result.thirtyDays).toBe(false)
      expect(result.hundredDays).toBe(false)
    })
  })

  describe('offlineStreakSchema', () => {
    const validStreak = {
      familyId: 'family-123',
      currentStreak: 7,
      longestStreak: 15,
      lastCompletedDate: Date.now(),
      weeklyHours: 14,
      weeklyStartDate: Date.now() - 7 * 24 * 60 * 60 * 1000,
      milestones: {
        sevenDays: true,
        thirtyDays: false,
        hundredDays: false,
      },
      leaderboardOptIn: false,
      updatedAt: Date.now(),
    }

    it('validates a complete streak object', () => {
      const result = offlineStreakSchema.parse(validStreak)

      expect(result.familyId).toBe('family-123')
      expect(result.currentStreak).toBe(7)
      expect(result.longestStreak).toBe(15)
      expect(result.weeklyHours).toBe(14)
      expect(result.milestones.sevenDays).toBe(true)
    })

    it('allows null lastCompletedDate', () => {
      const result = offlineStreakSchema.parse({
        ...validStreak,
        lastCompletedDate: null,
      })

      expect(result.lastCompletedDate).toBeNull()
    })

    it('rejects negative streak values', () => {
      expect(() =>
        offlineStreakSchema.parse({
          ...validStreak,
          currentStreak: -1,
        })
      ).toThrow()
    })

    it('rejects negative weekly hours', () => {
      expect(() =>
        offlineStreakSchema.parse({
          ...validStreak,
          weeklyHours: -5,
        })
      ).toThrow()
    })

    it('defaults leaderboardOptIn to false', () => {
      const { leaderboardOptIn: _leaderboardOptIn, ...streakWithoutOptIn } = validStreak
      const result = offlineStreakSchema.parse(streakWithoutOptIn)

      expect(result.leaderboardOptIn).toBe(false)
    })

    it('validates milestones with defaults', () => {
      const result = offlineStreakSchema.parse({
        ...validStreak,
        milestones: {},
      })

      expect(result.milestones.sevenDays).toBe(false)
      expect(result.milestones.thirtyDays).toBe(false)
      expect(result.milestones.hundredDays).toBe(false)
    })
  })

  describe('STREAK_MESSAGES', () => {
    describe('streakCounter', () => {
      it('returns singular for 1 day', () => {
        expect(STREAK_MESSAGES.streakCounter(1)).toBe('1 day of family offline time!')
      })

      it('returns plural for multiple days', () => {
        expect(STREAK_MESSAGES.streakCounter(7)).toBe('7 days of family offline time!')
        expect(STREAK_MESSAGES.streakCounter(30)).toBe('30 days of family offline time!')
      })
    })

    describe('weeklySummary', () => {
      it('returns singular for 1 hour', () => {
        expect(STREAK_MESSAGES.weeklySummary(1)).toBe('Your family unplugged 1 hour together')
      })

      it('returns plural for multiple hours', () => {
        expect(STREAK_MESSAGES.weeklySummary(14)).toBe('Your family unplugged 14 hours together')
      })
    })

    describe('milestoneReached', () => {
      it('returns correct milestone message', () => {
        expect(STREAK_MESSAGES.milestoneReached(7)).toBe("Amazing! You've reached 7 days together!")
        expect(STREAK_MESSAGES.milestoneReached(30)).toBe(
          "Amazing! You've reached 30 days together!"
        )
        expect(STREAK_MESSAGES.milestoneReached(100)).toBe(
          "Amazing! You've reached 100 days together!"
        )
      })
    })

    describe('child messages', () => {
      it('has positive child-friendly messages', () => {
        expect(STREAK_MESSAGES.childStreakMessage).toBe('Great job unplugging with your family!')
        expect(STREAK_MESSAGES.childMilestone7).toBe("You're a superstar! 7 days of family time!")
        expect(STREAK_MESSAGES.childMilestone30).toBe('Incredible! 30 days of unplugging together!')
        expect(STREAK_MESSAGES.childMilestone100).toBe('LEGENDARY! 100 days of family time!')
      })
    })

    describe('encouragement messages', () => {
      it('has non-punitive messages', () => {
        expect(STREAK_MESSAGES.noStreak).toBe('Start your family offline time streak today!')
        expect(STREAK_MESSAGES.keepGoing).toBe('Keep up the great work!')
      })

      it('generates correct almost-milestone message', () => {
        expect(STREAK_MESSAGES.almostMilestone(1, 7)).toBe(
          'Only 1 more day until your 7-day milestone!'
        )
        expect(STREAK_MESSAGES.almostMilestone(3, 30)).toBe(
          'Only 3 more days until your 30-day milestone!'
        )
      })
    })
  })

  describe('leaderboardEntrySchema', () => {
    it('validates a complete leaderboard entry', () => {
      const result = leaderboardEntrySchema.parse({
        rank: 1,
        streakDays: 45,
        isCurrentFamily: true,
      })

      expect(result.rank).toBe(1)
      expect(result.streakDays).toBe(45)
      expect(result.isCurrentFamily).toBe(true)
    })

    it('defaults isCurrentFamily to false', () => {
      const result = leaderboardEntrySchema.parse({
        rank: 5,
        streakDays: 20,
      })

      expect(result.isCurrentFamily).toBe(false)
    })

    it('rejects rank less than 1', () => {
      expect(() =>
        leaderboardEntrySchema.parse({
          rank: 0,
          streakDays: 10,
        })
      ).toThrow()
    })

    it('rejects negative streak days', () => {
      expect(() =>
        leaderboardEntrySchema.parse({
          rank: 1,
          streakDays: -5,
        })
      ).toThrow()
    })
  })
})
