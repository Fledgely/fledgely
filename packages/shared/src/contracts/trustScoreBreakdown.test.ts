/**
 * Trust Score Breakdown Tests - Story 36.2
 *
 * Tests for score breakdown formatting utilities.
 * AC6: Calculation transparent (child can see why)
 */

import { describe, it, expect } from 'vitest'
import {
  formatFactorContribution,
  formatFactorWithRecency,
  formatFactorList,
  formatScoreChange,
  formatScoreChangeWithPeriod,
  getCategoryContributionText,
  getCategoryLabel,
  generateBreakdownText,
  generateBreakdownSummary,
  getFactorTypeLabel,
  generateImprovementTips,
  generateEncouragement,
} from './trustScoreBreakdown'
import { type TrustFactor } from './trustScore'
import { type ScoreBreakdown } from './trustScoreCalculation'

describe('Trust Score Breakdown - Story 36.2', () => {
  describe('formatFactorContribution', () => {
    it('should format positive factor with + sign', () => {
      const factor: TrustFactor = {
        type: 'time-limit-compliance',
        category: 'positive',
        value: 5,
        description: 'Following time limits',
        occurredAt: new Date(),
      }

      expect(formatFactorContribution(factor)).toBe('Following time limits: +5')
    })

    it('should format negative factor without extra sign', () => {
      const factor: TrustFactor = {
        type: 'bypass-attempt',
        category: 'concerning',
        value: -5,
        description: 'Bypass attempt detected',
        occurredAt: new Date(),
      }

      expect(formatFactorContribution(factor)).toBe('Bypass attempt detected: -5')
    })

    it('should format zero value factor', () => {
      const factor: TrustFactor = {
        type: 'normal-app-usage',
        category: 'neutral',
        value: 0,
        description: 'Normal app usage',
        occurredAt: new Date(),
      }

      expect(formatFactorContribution(factor)).toBe('Normal app usage: +0')
    })
  })

  describe('formatFactorWithRecency', () => {
    const referenceDate = new Date('2024-06-15T10:00:00Z')

    it('should show "this week" for recent factors', () => {
      const factor: TrustFactor = {
        type: 'time-limit-compliance',
        category: 'positive',
        value: 5,
        description: 'Following time limits',
        occurredAt: new Date('2024-06-14T10:00:00Z'), // 1 day ago
      }

      expect(formatFactorWithRecency(factor, referenceDate)).toBe(
        'Following time limits: +5 (this week)'
      )
    })

    it('should show "last 2 weeks" for 10-day-old factors', () => {
      const factor: TrustFactor = {
        type: 'focus-mode-usage',
        category: 'positive',
        value: 3,
        description: 'Using focus mode',
        occurredAt: new Date('2024-06-05T10:00:00Z'), // 10 days ago
      }

      expect(formatFactorWithRecency(factor, referenceDate)).toBe(
        'Using focus mode: +3 (last 2 weeks)'
      )
    })

    it('should show "last 30 days" for 20-day-old factors', () => {
      const factor: TrustFactor = {
        type: 'no-bypass-attempts',
        category: 'positive',
        value: 2,
        description: 'No bypass attempts',
        occurredAt: new Date('2024-05-26T10:00:00Z'), // 20 days ago
      }

      expect(formatFactorWithRecency(factor, referenceDate)).toBe(
        'No bypass attempts: +2 (last 30 days)'
      )
    })

    it('should show "over 30 days ago" for old factors', () => {
      const factor: TrustFactor = {
        type: 'bypass-attempt',
        category: 'concerning',
        value: -5,
        description: 'Bypass attempt',
        occurredAt: new Date('2024-05-01T10:00:00Z'), // 45 days ago
      }

      expect(formatFactorWithRecency(factor, referenceDate)).toBe(
        'Bypass attempt: -5 (over 30 days ago)'
      )
    })
  })

  describe('formatFactorList', () => {
    it('should format multiple factors', () => {
      const factors: TrustFactor[] = [
        {
          type: 'time-limit-compliance',
          category: 'positive',
          value: 5,
          description: 'Following time limits',
          occurredAt: new Date(),
        },
        {
          type: 'focus-mode-usage',
          category: 'positive',
          value: 3,
          description: 'Using focus mode',
          occurredAt: new Date(),
        },
      ]

      const result = formatFactorList(factors)

      expect(result).toEqual(['Following time limits: +5', 'Using focus mode: +3'])
    })

    it('should handle empty array', () => {
      expect(formatFactorList([])).toEqual([])
    })
  })

  describe('formatScoreChange', () => {
    it('should format positive change', () => {
      expect(formatScoreChange(5)).toBe('Up 5 points')
    })

    it('should format negative change', () => {
      expect(formatScoreChange(-3)).toBe('Down 3 points')
    })

    it('should format no change', () => {
      expect(formatScoreChange(0)).toBe('No change')
    })

    it('should use singular for 1 point', () => {
      expect(formatScoreChange(1)).toBe('Up 1 point')
      expect(formatScoreChange(-1)).toBe('Down 1 point')
    })
  })

  describe('formatScoreChangeWithPeriod', () => {
    it('should include period for positive change', () => {
      expect(formatScoreChangeWithPeriod(5, 'this week')).toBe('Up 5 points this week')
    })

    it('should include period for negative change', () => {
      expect(formatScoreChangeWithPeriod(-3, 'today')).toBe('Down 3 points today')
    })

    it('should include period for no change', () => {
      expect(formatScoreChangeWithPeriod(0, 'this month')).toBe('No change this month')
    })
  })

  describe('getCategoryContributionText', () => {
    it('should format positive category with points', () => {
      expect(getCategoryContributionText('positive', 8)).toBe('Good behaviors: +8 points')
    })

    it('should format positive category with no points', () => {
      expect(getCategoryContributionText('positive', 0)).toBe('Good behaviors: no change')
    })

    it('should format neutral category', () => {
      expect(getCategoryContributionText('neutral', 0)).toBe('Normal usage: no impact')
    })

    it('should format concerning category with points', () => {
      expect(getCategoryContributionText('concerning', -5)).toBe('Concerns: -5 points')
    })

    it('should format concerning category with no points', () => {
      expect(getCategoryContributionText('concerning', 0)).toBe('Concerns: none')
    })

    it('should use singular for 1 point', () => {
      expect(getCategoryContributionText('positive', 1)).toBe('Good behaviors: +1 point')
      expect(getCategoryContributionText('concerning', -1)).toBe('Concerns: -1 point')
    })
  })

  describe('getCategoryLabel', () => {
    it('should return child-friendly labels', () => {
      expect(getCategoryLabel('positive')).toBe('Things you did well')
      expect(getCategoryLabel('neutral')).toBe('Normal activities')
      expect(getCategoryLabel('concerning')).toBe('Things to work on')
    })
  })

  describe('generateBreakdownText (AC6)', () => {
    it('should generate full breakdown with all categories', () => {
      const breakdown: ScoreBreakdown = {
        positivePoints: 8,
        neutralPoints: 0,
        concerningPoints: -3,
        recencyMultiplier: 0.9,
        finalDelta: 5,
      }

      const lines = generateBreakdownText(breakdown)

      expect(lines).toContain('Good behaviors: +8 points')
      expect(lines).toContain('Concerns: -3 points')
      expect(lines).toContain('Net change: Up 5 points')
    })

    it('should show "none recorded" when no positive points', () => {
      const breakdown: ScoreBreakdown = {
        positivePoints: 0,
        neutralPoints: 0,
        concerningPoints: -3,
        recencyMultiplier: 1.0,
        finalDelta: -3,
      }

      const lines = generateBreakdownText(breakdown)

      expect(lines).toContain('Good behaviors: none recorded')
    })

    it('should show "none" when no concerns', () => {
      const breakdown: ScoreBreakdown = {
        positivePoints: 5,
        neutralPoints: 0,
        concerningPoints: 0,
        recencyMultiplier: 1.0,
        finalDelta: 5,
      }

      const lines = generateBreakdownText(breakdown)

      expect(lines).toContain('Concerns: none')
    })

    it('should include neutral when non-zero', () => {
      const breakdown: ScoreBreakdown = {
        positivePoints: 5,
        neutralPoints: 2,
        concerningPoints: 0,
        recencyMultiplier: 1.0,
        finalDelta: 7,
      }

      const lines = generateBreakdownText(breakdown)

      expect(lines.some((l) => l.includes('Normal usage'))).toBe(true)
    })
  })

  describe('generateBreakdownSummary', () => {
    it('should summarize positive and concerning', () => {
      const breakdown: ScoreBreakdown = {
        positivePoints: 8,
        neutralPoints: 0,
        concerningPoints: -3,
        recencyMultiplier: 1.0,
        finalDelta: 5,
      }

      expect(generateBreakdownSummary(breakdown)).toBe('+8 good, -3 concerns')
    })

    it('should show only positive when no concerns', () => {
      const breakdown: ScoreBreakdown = {
        positivePoints: 5,
        neutralPoints: 0,
        concerningPoints: 0,
        recencyMultiplier: 1.0,
        finalDelta: 5,
      }

      expect(generateBreakdownSummary(breakdown)).toBe('+5 good')
    })

    it('should show only concerns when no positive', () => {
      const breakdown: ScoreBreakdown = {
        positivePoints: 0,
        neutralPoints: 0,
        concerningPoints: -5,
        recencyMultiplier: 1.0,
        finalDelta: -5,
      }

      expect(generateBreakdownSummary(breakdown)).toBe('-5 concerns')
    })

    it('should show "No changes" when empty', () => {
      const breakdown: ScoreBreakdown = {
        positivePoints: 0,
        neutralPoints: 0,
        concerningPoints: 0,
        recencyMultiplier: 1.0,
        finalDelta: 0,
      }

      expect(generateBreakdownSummary(breakdown)).toBe('No changes')
    })
  })

  describe('getFactorTypeLabel', () => {
    it('should return labels for all factor types', () => {
      expect(getFactorTypeLabel('time-limit-compliance')).toBe('Following time limits')
      expect(getFactorTypeLabel('focus-mode-usage')).toBe('Using focus mode')
      expect(getFactorTypeLabel('no-bypass-attempts')).toBe('No bypass attempts detected')
      expect(getFactorTypeLabel('normal-app-usage')).toBe('Normal app usage within limits')
      expect(getFactorTypeLabel('bypass-attempt')).toBe('Bypass attempt detected')
      expect(getFactorTypeLabel('monitoring-disabled')).toBe('Monitoring disabled')
    })
  })

  describe('generateImprovementTips', () => {
    it('should provide tip for bypass attempts', () => {
      const factors: TrustFactor[] = [
        {
          type: 'bypass-attempt',
          category: 'concerning',
          value: -5,
          description: 'Bypass attempt',
          occurredAt: new Date(),
        },
      ]

      const tips = generateImprovementTips(factors)

      expect(tips).toContain('To improve: avoid trying to get around the rules')
    })

    it('should provide tip for monitoring disabled', () => {
      const factors: TrustFactor[] = [
        {
          type: 'monitoring-disabled',
          category: 'concerning',
          value: -3,
          description: 'Monitoring disabled',
          occurredAt: new Date(),
        },
      ]

      const tips = generateImprovementTips(factors)

      expect(tips).toContain('To improve: keep monitoring enabled')
    })

    it('should provide generic tip for other concerns', () => {
      const factors: TrustFactor[] = [
        {
          type: 'normal-app-usage',
          category: 'concerning', // hypothetical
          value: -1,
          description: 'Something else',
          occurredAt: new Date(),
        },
      ]

      const tips = generateImprovementTips(factors)

      expect(tips).toContain('To improve: stick to the agreement for 2 weeks')
    })

    it('should provide encouragement when no concerns', () => {
      const tips = generateImprovementTips([])

      expect(tips).toContain('Keep up the good work!')
    })
  })

  describe('generateEncouragement', () => {
    it('should encourage for score increase above 90', () => {
      expect(generateEncouragement(92, 88)).toBe("Amazing progress! You're doing great!")
    })

    it('should encourage for score increase above 80', () => {
      expect(generateEncouragement(85, 80)).toBe("Great job! You're building trust.")
    })

    it('should encourage for any score increase', () => {
      expect(generateEncouragement(75, 70)).toBe('Nice work! Your score is improving.')
    })

    it('should encourage after decrease', () => {
      expect(generateEncouragement(65, 70)).toBe(
        'Remember, you can always improve. Every day is a new chance!'
      )
    })

    it('should encourage for stable high score', () => {
      expect(generateEncouragement(85, 85)).toBe('Keep it up! Your trust score is strong.')
    })

    it('should encourage for stable normal score', () => {
      expect(generateEncouragement(70, 70)).toBe("You're doing well. Keep going!")
    })
  })
})
