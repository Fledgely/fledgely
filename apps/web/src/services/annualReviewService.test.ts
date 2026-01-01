/**
 * Annual Review Service Tests - Story 35.6
 *
 * Tests for annual review service.
 * AC1: Prompt sent when 1 year since last review
 * AC2: Prompt includes "Your child has grown"
 * AC3: Suggestions based on age
 * AC5: Prompt even for "no expiry" agreements
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  checkAnnualReviewStatus,
  getAnnualReviewPrompt,
  getAgeSuggestions,
  canDismissAnnualReview,
  getYearsSinceCreation,
} from './annualReviewService'
import { ANNUAL_REVIEW_MESSAGES } from '@fledgely/shared'

describe('Annual Review Service - Story 35.6', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-06-15'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('checkAnnualReviewStatus (AC1)', () => {
    it('should return "due" when 1 year since last review', () => {
      const agreement = {
        id: 'agreement-123',
        lastReviewDate: new Date('2023-06-15'),
        createdAt: new Date('2023-06-15'),
      }
      expect(checkAnnualReviewStatus(agreement)).toBe('due')
    })

    it('should return "not-due" when less than 1 year', () => {
      const agreement = {
        id: 'agreement-123',
        lastReviewDate: new Date('2024-01-01'),
        createdAt: new Date('2024-01-01'),
      }
      expect(checkAnnualReviewStatus(agreement)).toBe('not-due')
    })

    it('should use createdAt if no lastReviewDate', () => {
      const agreement = {
        id: 'agreement-123',
        createdAt: new Date('2023-06-15'),
      }
      expect(checkAnnualReviewStatus(agreement)).toBe('due')
    })

    it('should work for no-expiry agreements (AC5)', () => {
      const agreement = {
        id: 'agreement-123',
        lastReviewDate: new Date('2023-06-15'),
        createdAt: new Date('2023-06-15'),
        expiryDate: null,
      }
      expect(checkAnnualReviewStatus(agreement)).toBe('due')
    })
  })

  describe('getAnnualReviewPrompt (AC1, AC2)', () => {
    it('should return null when review not due', () => {
      const agreement = {
        id: 'agreement-123',
        lastReviewDate: new Date('2024-01-01'),
        createdAt: new Date('2024-01-01'),
      }
      expect(getAnnualReviewPrompt(agreement, 12)).toBeNull()
    })

    it('should return prompt when review is due', () => {
      const agreement = {
        id: 'agreement-123',
        lastReviewDate: new Date('2023-06-15'),
        createdAt: new Date('2023-06-15'),
      }
      const prompt = getAnnualReviewPrompt(agreement, 14)
      expect(prompt).not.toBeNull()
    })

    it('should include title message (AC1)', () => {
      const agreement = {
        id: 'agreement-123',
        lastReviewDate: new Date('2023-06-15'),
        createdAt: new Date('2023-06-15'),
      }
      const prompt = getAnnualReviewPrompt(agreement, 14)
      expect(prompt?.title).toBe(ANNUAL_REVIEW_MESSAGES.PROMPT_TITLE)
    })

    it('should include growth reminder (AC2)', () => {
      const agreement = {
        id: 'agreement-123',
        lastReviewDate: new Date('2023-06-15'),
        createdAt: new Date('2023-06-15'),
      }
      const prompt = getAnnualReviewPrompt(agreement, 14)
      expect(prompt?.growthReminder).toBe(ANNUAL_REVIEW_MESSAGES.GROWTH_REMINDER)
    })

    it('should include celebration message (AC6)', () => {
      const agreement = {
        id: 'agreement-123',
        lastReviewDate: new Date('2023-06-15'),
        createdAt: new Date('2023-06-15'),
      }
      const prompt = getAnnualReviewPrompt(agreement, 14)
      expect(prompt?.celebration).toBe(ANNUAL_REVIEW_MESSAGES.CELEBRATION)
    })

    it('should include meeting suggestion (AC4)', () => {
      const agreement = {
        id: 'agreement-123',
        lastReviewDate: new Date('2023-06-15'),
        createdAt: new Date('2023-06-15'),
      }
      const prompt = getAnnualReviewPrompt(agreement, 14)
      expect(prompt?.meetingSuggestion).toBe(ANNUAL_REVIEW_MESSAGES.MEETING_SUGGESTION)
    })

    it('should include years since creation', () => {
      const agreement = {
        id: 'agreement-123',
        lastReviewDate: new Date('2023-06-15'),
        createdAt: new Date('2023-06-15'),
      }
      const prompt = getAnnualReviewPrompt(agreement, 14)
      expect(prompt?.yearsSinceCreation).toBe(1)
    })
  })

  describe('getAgeSuggestions (AC3)', () => {
    it('should return suggestions for 14-year-old', () => {
      const suggestions = getAgeSuggestions(14)
      expect(suggestions).toContain('Many 14-year-olds have reduced screenshot frequency')
    })

    it('should return suggestions for 12-year-old', () => {
      const suggestions = getAgeSuggestions(12)
      expect(suggestions).toContain('Many families reduce screenshot frequency at this age')
    })

    it('should return suggestions for 16-year-old', () => {
      const suggestions = getAgeSuggestions(16)
      expect(suggestions).toContain('Consider notification-only mode for trusted teens')
    })

    it('should return empty array for age without threshold', () => {
      const suggestions = getAgeSuggestions(8)
      expect(suggestions).toEqual([])
    })
  })

  describe('canDismissAnnualReview', () => {
    it('should return true when review is due', () => {
      const agreement = {
        id: 'agreement-123',
        lastReviewDate: new Date('2023-06-15'),
        createdAt: new Date('2023-06-15'),
      }
      expect(canDismissAnnualReview(agreement)).toBe(true)
    })

    it('should return false when review not due', () => {
      const agreement = {
        id: 'agreement-123',
        lastReviewDate: new Date('2024-01-01'),
        createdAt: new Date('2024-01-01'),
      }
      expect(canDismissAnnualReview(agreement)).toBe(false)
    })
  })

  describe('getYearsSinceCreation', () => {
    it('should return 1 for one year ago', () => {
      const createdAt = new Date('2023-06-15')
      expect(getYearsSinceCreation(createdAt)).toBe(1)
    })

    it('should return 0 for less than one year', () => {
      const createdAt = new Date('2024-01-01')
      expect(getYearsSinceCreation(createdAt)).toBe(0)
    })

    it('should return 2 for two years ago', () => {
      const createdAt = new Date('2022-06-15')
      expect(getYearsSinceCreation(createdAt)).toBe(2)
    })
  })
})
