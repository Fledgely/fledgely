/**
 * MilestoneService Tests - Story 37.1 Task 2
 *
 * Tests for milestone calculations and transitions.
 * AC1: Milestones at 80, 90, 95
 * AC2: Duration requirement of 30+ days
 */

import { describe, it, expect } from 'vitest'
import {
  getMilestoneForScore,
  checkMilestoneEligibility,
  calculateConsecutiveDays,
  transitionMilestone,
  type ScoreHistoryEntry,
} from './milestoneService'

// Helper to create score history entries
function createScoreHistory(scores: Array<{ date: Date; score: number }>): ScoreHistoryEntry[] {
  return scores.map(({ date, score }) => ({
    date,
    score,
  }))
}

// Helper to create date N days ago
function daysAgo(days: number): Date {
  const date = new Date()
  date.setDate(date.getDate() - days)
  date.setHours(0, 0, 0, 0)
  return date
}

describe('MilestoneService - Story 37.1 Task 2', () => {
  describe('getMilestoneForScore', () => {
    it('should return null for scores below 80', () => {
      expect(getMilestoneForScore(0)).toBeNull()
      expect(getMilestoneForScore(50)).toBeNull()
      expect(getMilestoneForScore(79)).toBeNull()
    })

    it('should return growing milestone for scores 80-89', () => {
      const milestone80 = getMilestoneForScore(80)
      expect(milestone80).toBeDefined()
      expect(milestone80?.level).toBe('growing')

      const milestone85 = getMilestoneForScore(85)
      expect(milestone85?.level).toBe('growing')

      const milestone89 = getMilestoneForScore(89)
      expect(milestone89?.level).toBe('growing')
    })

    it('should return maturing milestone for scores 90-94', () => {
      const milestone90 = getMilestoneForScore(90)
      expect(milestone90).toBeDefined()
      expect(milestone90?.level).toBe('maturing')

      const milestone92 = getMilestoneForScore(92)
      expect(milestone92?.level).toBe('maturing')

      const milestone94 = getMilestoneForScore(94)
      expect(milestone94?.level).toBe('maturing')
    })

    it('should return ready-for-independence milestone for scores 95+', () => {
      const milestone95 = getMilestoneForScore(95)
      expect(milestone95).toBeDefined()
      expect(milestone95?.level).toBe('ready-for-independence')

      const milestone98 = getMilestoneForScore(98)
      expect(milestone98?.level).toBe('ready-for-independence')

      const milestone100 = getMilestoneForScore(100)
      expect(milestone100?.level).toBe('ready-for-independence')
    })
  })

  describe('calculateConsecutiveDays', () => {
    it('should return 0 for empty history', () => {
      expect(calculateConsecutiveDays([], 80)).toBe(0)
    })

    it('should count consecutive days above threshold', () => {
      const history = createScoreHistory([
        { date: daysAgo(4), score: 85 },
        { date: daysAgo(3), score: 82 },
        { date: daysAgo(2), score: 88 },
        { date: daysAgo(1), score: 84 },
        { date: daysAgo(0), score: 86 },
      ])

      expect(calculateConsecutiveDays(history, 80)).toBe(5)
    })

    it('should stop counting when score drops below threshold', () => {
      const history = createScoreHistory([
        { date: daysAgo(5), score: 85 },
        { date: daysAgo(4), score: 75 }, // Below threshold - streak breaks
        { date: daysAgo(3), score: 82 },
        { date: daysAgo(2), score: 88 },
        { date: daysAgo(1), score: 84 },
        { date: daysAgo(0), score: 86 },
      ])

      expect(calculateConsecutiveDays(history, 80)).toBe(4)
    })

    it('should handle exactly at threshold', () => {
      const history = createScoreHistory([
        { date: daysAgo(2), score: 80 },
        { date: daysAgo(1), score: 80 },
        { date: daysAgo(0), score: 80 },
      ])

      expect(calculateConsecutiveDays(history, 80)).toBe(3)
    })

    it('should handle gaps in history as streak breaks', () => {
      const history = createScoreHistory([
        { date: daysAgo(5), score: 85 },
        // Gap at day 4, 3
        { date: daysAgo(2), score: 85 },
        { date: daysAgo(1), score: 85 },
        { date: daysAgo(0), score: 85 },
      ])

      expect(calculateConsecutiveDays(history, 80)).toBe(3)
    })

    it('should work with different thresholds', () => {
      const history = createScoreHistory([
        { date: daysAgo(4), score: 92 },
        { date: daysAgo(3), score: 91 },
        { date: daysAgo(2), score: 93 },
        { date: daysAgo(1), score: 89 }, // Below 90 threshold
        { date: daysAgo(0), score: 95 },
      ])

      expect(calculateConsecutiveDays(history, 90)).toBe(1)
    })
  })

  describe('checkMilestoneEligibility', () => {
    it('should return not eligible with no history', () => {
      const result = checkMilestoneEligibility('child-1', [])

      expect(result.eligible).toBe(false)
      expect(result.milestoneLevel).toBeNull()
    })

    it('should return eligible when 30+ days at growing threshold', () => {
      const history = Array.from({ length: 35 }, (_, i) => ({
        date: daysAgo(34 - i),
        score: 85,
      }))

      const result = checkMilestoneEligibility('child-1', createScoreHistory(history))

      expect(result.eligible).toBe(true)
      expect(result.milestoneLevel).toBe('growing')
      expect(result.consecutiveDays).toBe(35)
    })

    it('should return not eligible when less than 30 days', () => {
      const history = Array.from({ length: 20 }, (_, i) => ({
        date: daysAgo(19 - i),
        score: 85,
      }))

      const result = checkMilestoneEligibility('child-1', createScoreHistory(history))

      expect(result.eligible).toBe(false)
      expect(result.daysRemaining).toBe(10)
      expect(result.consecutiveDays).toBe(20)
    })

    it('should return higher milestone when eligible for multiple', () => {
      const history = Array.from({ length: 35 }, (_, i) => ({
        date: daysAgo(34 - i),
        score: 96, // Above ready-for-independence threshold
      }))

      const result = checkMilestoneEligibility('child-1', createScoreHistory(history))

      expect(result.eligible).toBe(true)
      expect(result.milestoneLevel).toBe('ready-for-independence')
    })

    it('should track progress toward next milestone', () => {
      const history = Array.from({ length: 15 }, (_, i) => ({
        date: daysAgo(14 - i),
        score: 92,
      }))

      const result = checkMilestoneEligibility('child-1', createScoreHistory(history))

      expect(result.eligible).toBe(false)
      expect(result.milestoneLevel).toBeNull()
      expect(result.progressTowardMilestone).toBe('maturing')
      expect(result.daysRemaining).toBe(15)
    })
  })

  describe('transitionMilestone', () => {
    it('should create transition for first milestone achievement', () => {
      const transition = transitionMilestone('child-1', null, 'growing')

      expect(transition.childId).toBe('child-1')
      expect(transition.fromMilestone).toBeNull()
      expect(transition.toMilestone).toBe('growing')
      expect(transition.transitionType).toBe('achievement')
      expect(transition.message).toContain('recogniz')
    })

    it('should create transition for milestone progression', () => {
      const transition = transitionMilestone('child-1', 'growing', 'maturing')

      expect(transition.fromMilestone).toBe('growing')
      expect(transition.toMilestone).toBe('maturing')
      expect(transition.transitionType).toBe('progression')
      expect(transition.message).toContain('continued growth')
    })

    it('should create transition for milestone regression', () => {
      const transition = transitionMilestone('child-1', 'maturing', 'growing')

      expect(transition.fromMilestone).toBe('maturing')
      expect(transition.toMilestone).toBe('growing')
      expect(transition.transitionType).toBe('regression')
      // Should use compassionate language
      expect(transition.message).not.toContain('lost')
      expect(transition.message).not.toContain('failed')
    })

    it('should create transition for complete regression', () => {
      const transition = transitionMilestone('child-1', 'growing', null)

      expect(transition.fromMilestone).toBe('growing')
      expect(transition.toMilestone).toBeNull()
      expect(transition.transitionType).toBe('regression')
    })

    it('should use developmental language in messages', () => {
      const achievement = transitionMilestone('child-1', null, 'growing')
      const progression = transitionMilestone('child-1', 'growing', 'maturing')

      // Should not use reward language
      expect(achievement.message.toLowerCase()).not.toContain('earned')
      expect(achievement.message.toLowerCase()).not.toContain('reward')
      expect(progression.message.toLowerCase()).not.toContain('earned')
      expect(progression.message.toLowerCase()).not.toContain('reward')
    })

    it('should include milestone benefits in achievement transition', () => {
      const transition = transitionMilestone('child-1', null, 'growing')

      expect(transition.benefits).toBeDefined()
      expect(transition.benefits.length).toBeGreaterThan(0)
    })
  })

  describe('Integration: Full milestone journey', () => {
    it('should track progression through all milestones', () => {
      // Start with no milestone
      let result = checkMilestoneEligibility('child-1', [])
      expect(result.milestoneLevel).toBeNull()

      // 30 days at 85 -> Growing
      let history = Array.from({ length: 30 }, (_, i) => ({
        date: daysAgo(29 - i),
        score: 85,
      }))
      result = checkMilestoneEligibility('child-1', createScoreHistory(history))
      expect(result.eligible).toBe(true)
      expect(result.milestoneLevel).toBe('growing')

      // 30 days at 92 -> Maturing
      history = Array.from({ length: 30 }, (_, i) => ({
        date: daysAgo(29 - i),
        score: 92,
      }))
      result = checkMilestoneEligibility('child-1', createScoreHistory(history))
      expect(result.eligible).toBe(true)
      expect(result.milestoneLevel).toBe('maturing')

      // 30 days at 96 -> Ready for Independence
      history = Array.from({ length: 30 }, (_, i) => ({
        date: daysAgo(29 - i),
        score: 96,
      }))
      result = checkMilestoneEligibility('child-1', createScoreHistory(history))
      expect(result.eligible).toBe(true)
      expect(result.milestoneLevel).toBe('ready-for-independence')
    })
  })
})
