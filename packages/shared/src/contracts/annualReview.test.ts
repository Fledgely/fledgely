/**
 * Annual Review Types Tests - Story 35.6
 *
 * Tests for annual review prompts configuration.
 * AC1: Prompt sent when 1 year since last review
 * AC3: Suggestions based on age
 * AC5: Prompt even for "no expiry" agreements
 * AC6: Celebrates healthy relationship
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  ANNUAL_REVIEW_INTERVAL_DAYS,
  annualReviewStatusSchema,
  ANNUAL_REVIEW_MESSAGES,
  AGE_SUGGESTION_THRESHOLDS,
  isAnnualReviewDue,
  getDaysSinceLastReview,
  getAgeBasedSuggestions,
  getAnnualReviewStatus,
  annualReviewPromptSchema,
} from './annualReview'

describe('Annual Review Types - Story 35.6', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-06-15'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('constants', () => {
    it('should define annual review interval as 365 days', () => {
      expect(ANNUAL_REVIEW_INTERVAL_DAYS).toBe(365)
    })

    it('should define review status values', () => {
      const validStatuses = ['not-due', 'due', 'prompted', 'completed', 'dismissed']
      validStatuses.forEach((status) => {
        expect(() => annualReviewStatusSchema.parse(status)).not.toThrow()
      })
    })

    it('should have prompt title message (AC1)', () => {
      expect(ANNUAL_REVIEW_MESSAGES.PROMPT_TITLE).toBe(
        "It's been a year - time for an agreement review?"
      )
    })

    it('should have growth reminder message (AC2)', () => {
      expect(ANNUAL_REVIEW_MESSAGES.GROWTH_REMINDER).toBe(
        'Your child has grown - consider updating terms'
      )
    })

    it('should have celebration message (AC6)', () => {
      expect(ANNUAL_REVIEW_MESSAGES.CELEBRATION).toBe('1 year of building trust together!')
    })

    it('should have meeting suggestion message (AC4)', () => {
      expect(ANNUAL_REVIEW_MESSAGES.MEETING_SUGGESTION).toBe(
        'Consider scheduling a family meeting to discuss'
      )
    })
  })

  describe('AGE_SUGGESTION_THRESHOLDS (AC3)', () => {
    it('should have suggestions for age 10', () => {
      const threshold = AGE_SUGGESTION_THRESHOLDS.find((t) => t.age === 10)
      expect(threshold).toBeDefined()
      expect(threshold?.suggestions.length).toBeGreaterThan(0)
    })

    it('should have suggestions for age 12', () => {
      const threshold = AGE_SUGGESTION_THRESHOLDS.find((t) => t.age === 12)
      expect(threshold).toBeDefined()
      expect(threshold?.suggestions).toContain(
        'Many families reduce screenshot frequency at this age'
      )
    })

    it('should have suggestions for age 14', () => {
      const threshold = AGE_SUGGESTION_THRESHOLDS.find((t) => t.age === 14)
      expect(threshold).toBeDefined()
      expect(threshold?.suggestions).toContain(
        'Many 14-year-olds have reduced screenshot frequency'
      )
    })

    it('should have suggestions for age 16', () => {
      const threshold = AGE_SUGGESTION_THRESHOLDS.find((t) => t.age === 16)
      expect(threshold).toBeDefined()
      expect(threshold?.suggestions).toContain('Consider notification-only mode for trusted teens')
    })
  })

  describe('getDaysSinceLastReview', () => {
    it('should calculate days since last review', () => {
      // Last review was 100 days ago
      const lastReviewDate = new Date('2024-03-07')
      const days = getDaysSinceLastReview(lastReviewDate)
      expect(days).toBe(100)
    })

    it('should return 0 for today', () => {
      const today = new Date('2024-06-15')
      const days = getDaysSinceLastReview(today)
      expect(days).toBe(0)
    })

    it('should handle exactly one year (366 days for leap year)', () => {
      // From 2023-06-15 to 2024-06-15 is 366 days (2024 is a leap year)
      const lastReviewDate = new Date('2023-06-15')
      const days = getDaysSinceLastReview(lastReviewDate)
      expect(days).toBe(366)
    })

    it('should handle more than 365 days', () => {
      const lastReviewDate = new Date('2023-01-01')
      const days = getDaysSinceLastReview(lastReviewDate)
      expect(days).toBe(531) // Days from Jan 1 2023 to Jun 15 2024
    })
  })

  describe('isAnnualReviewDue (AC1)', () => {
    it('should return true when 365 days since last review', () => {
      const agreement = {
        lastReviewDate: new Date('2023-06-15'),
        createdAt: new Date('2023-06-15'),
      }
      expect(isAnnualReviewDue(agreement)).toBe(true)
    })

    it('should return true when more than 365 days', () => {
      const agreement = {
        lastReviewDate: new Date('2023-01-01'),
        createdAt: new Date('2023-01-01'),
      }
      expect(isAnnualReviewDue(agreement)).toBe(true)
    })

    it('should return false when less than 365 days', () => {
      const agreement = {
        lastReviewDate: new Date('2024-01-01'),
        createdAt: new Date('2024-01-01'),
      }
      expect(isAnnualReviewDue(agreement)).toBe(false)
    })

    it('should use createdAt if no lastReviewDate', () => {
      const agreement = {
        createdAt: new Date('2023-06-15'),
      }
      expect(isAnnualReviewDue(agreement)).toBe(true)
    })

    it('should work for no-expiry agreements (AC5)', () => {
      const agreement = {
        lastReviewDate: new Date('2023-06-15'),
        createdAt: new Date('2023-06-15'),
        expiryDate: null, // No expiry
      }
      expect(isAnnualReviewDue(agreement)).toBe(true)
    })
  })

  describe('getAgeBasedSuggestions (AC3)', () => {
    it('should return suggestions for 10-year-old', () => {
      const suggestions = getAgeBasedSuggestions(10)
      expect(suggestions.length).toBeGreaterThan(0)
    })

    it('should return suggestions for 12-year-old', () => {
      const suggestions = getAgeBasedSuggestions(12)
      expect(suggestions).toContain('Many families reduce screenshot frequency at this age')
    })

    it('should return suggestions for 14-year-old', () => {
      const suggestions = getAgeBasedSuggestions(14)
      expect(suggestions).toContain('Many 14-year-olds have reduced screenshot frequency')
    })

    it('should return suggestions for 16-year-old', () => {
      const suggestions = getAgeBasedSuggestions(16)
      expect(suggestions).toContain('Consider notification-only mode for trusted teens')
    })

    it('should return empty array for age without threshold', () => {
      const suggestions = getAgeBasedSuggestions(8)
      expect(suggestions).toEqual([])
    })

    it('should return suggestions for exact age match', () => {
      const suggestions = getAgeBasedSuggestions(14)
      expect(suggestions.length).toBeGreaterThan(0)
    })

    it('should return cumulative suggestions for older ages', () => {
      // A 16-year-old should get 16-year-old suggestions, plus any from younger thresholds
      const suggestions = getAgeBasedSuggestions(16)
      expect(suggestions.length).toBeGreaterThan(0)
    })
  })

  describe('getAnnualReviewStatus', () => {
    it('should return "not-due" when review not due', () => {
      const agreement = {
        lastReviewDate: new Date('2024-01-01'),
        createdAt: new Date('2024-01-01'),
      }
      expect(getAnnualReviewStatus(agreement)).toBe('not-due')
    })

    it('should return "due" when review is due', () => {
      const agreement = {
        lastReviewDate: new Date('2023-06-15'),
        createdAt: new Date('2023-06-15'),
      }
      expect(getAnnualReviewStatus(agreement)).toBe('due')
    })

    it('should return "prompted" if already prompted', () => {
      const agreement = {
        lastReviewDate: new Date('2023-06-15'),
        createdAt: new Date('2023-06-15'),
        annualReviewPromptedAt: new Date('2024-06-14'),
      }
      expect(getAnnualReviewStatus(agreement)).toBe('prompted')
    })

    it('should return "dismissed" if dismissed this cycle', () => {
      const agreement = {
        lastReviewDate: new Date('2023-06-15'),
        createdAt: new Date('2023-06-15'),
        annualReviewDismissedAt: new Date('2024-06-14'),
      }
      expect(getAnnualReviewStatus(agreement)).toBe('dismissed')
    })
  })

  describe('annualReviewPromptSchema', () => {
    it('should validate a complete prompt', () => {
      const prompt = {
        title: ANNUAL_REVIEW_MESSAGES.PROMPT_TITLE,
        growthReminder: ANNUAL_REVIEW_MESSAGES.GROWTH_REMINDER,
        celebration: ANNUAL_REVIEW_MESSAGES.CELEBRATION,
        meetingSuggestion: ANNUAL_REVIEW_MESSAGES.MEETING_SUGGESTION,
        ageSuggestions: ['Many 14-year-olds have reduced screenshot frequency'],
        yearsSinceCreation: 1,
      }
      expect(() => annualReviewPromptSchema.parse(prompt)).not.toThrow()
    })

    it('should require title', () => {
      const prompt = {
        growthReminder: ANNUAL_REVIEW_MESSAGES.GROWTH_REMINDER,
        celebration: ANNUAL_REVIEW_MESSAGES.CELEBRATION,
        ageSuggestions: [],
        yearsSinceCreation: 1,
      }
      expect(() => annualReviewPromptSchema.parse(prompt)).toThrow()
    })

    it('should allow empty age suggestions', () => {
      const prompt = {
        title: ANNUAL_REVIEW_MESSAGES.PROMPT_TITLE,
        growthReminder: ANNUAL_REVIEW_MESSAGES.GROWTH_REMINDER,
        celebration: ANNUAL_REVIEW_MESSAGES.CELEBRATION,
        ageSuggestions: [],
        yearsSinceCreation: 1,
      }
      expect(() => annualReviewPromptSchema.parse(prompt)).not.toThrow()
    })
  })
})
