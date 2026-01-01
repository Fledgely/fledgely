/**
 * Annual Review Integration Tests - Story 35.6
 *
 * Integration tests for complete annual review flow.
 * Tests all ACs working together.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useAnnualReview } from '../../hooks/useAnnualReview'
import { checkAnnualReviewStatus, getAnnualReviewPrompt } from '../../services/annualReviewService'
import {
  isAnnualReviewDue,
  getDaysSinceLastReview,
  getAgeBasedSuggestions,
  getAnnualReviewStatus,
  ANNUAL_REVIEW_MESSAGES,
  ANNUAL_REVIEW_INTERVAL_DAYS,
  AGE_SUGGESTION_THRESHOLDS,
} from '@fledgely/shared'

describe('Annual Review Integration - Story 35.6', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-06-15'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('prompt after 1 year (AC1)', () => {
    it('should show prompt when 1 year since last review', () => {
      const agreement = {
        id: 'agreement-123',
        createdAt: new Date('2023-06-15'),
        lastReviewDate: new Date('2023-06-15'),
      }

      expect(isAnnualReviewDue(agreement)).toBe(true)
      expect(checkAnnualReviewStatus(agreement)).toBe('due')
    })

    it('should not show prompt before 1 year', () => {
      const agreement = {
        id: 'agreement-123',
        createdAt: new Date('2024-01-01'),
        lastReviewDate: new Date('2024-01-01'),
      }

      expect(isAnnualReviewDue(agreement)).toBe(false)
      expect(checkAnnualReviewStatus(agreement)).toBe('not-due')
    })

    it('should have correct interval constant', () => {
      expect(ANNUAL_REVIEW_INTERVAL_DAYS).toBe(365)
    })
  })

  describe('growth reminder (AC2)', () => {
    it('should include growth message in prompt', () => {
      const agreement = {
        id: 'agreement-123',
        createdAt: new Date('2023-06-15'),
        lastReviewDate: new Date('2023-06-15'),
      }

      const prompt = getAnnualReviewPrompt(agreement, 14)

      expect(prompt?.growthReminder).toBe(ANNUAL_REVIEW_MESSAGES.GROWTH_REMINDER)
      expect(prompt?.growthReminder).toContain('grown')
    })
  })

  describe('age-based suggestions (AC3)', () => {
    it('should provide suggestions for age 10', () => {
      const suggestions = getAgeBasedSuggestions(10)
      expect(suggestions.length).toBeGreaterThan(0)
    })

    it('should provide suggestions for age 12', () => {
      const suggestions = getAgeBasedSuggestions(12)
      expect(suggestions).toContain('Many families reduce screenshot frequency at this age')
    })

    it('should provide suggestions for age 14', () => {
      const suggestions = getAgeBasedSuggestions(14)
      expect(suggestions).toContain('Many 14-year-olds have reduced screenshot frequency')
    })

    it('should provide suggestions for age 16', () => {
      const suggestions = getAgeBasedSuggestions(16)
      expect(suggestions).toContain('Consider notification-only mode for trusted teens')
    })

    it('should have thresholds for key ages', () => {
      const ages = AGE_SUGGESTION_THRESHOLDS.map((t) => t.age)
      expect(ages).toContain(10)
      expect(ages).toContain(12)
      expect(ages).toContain(14)
      expect(ages).toContain(16)
    })
  })

  describe('family meeting reminder (AC4)', () => {
    it('should include meeting suggestion in prompt', () => {
      const agreement = {
        id: 'agreement-123',
        createdAt: new Date('2023-06-15'),
        lastReviewDate: new Date('2023-06-15'),
      }

      const prompt = getAnnualReviewPrompt(agreement, 14)

      expect(prompt?.meetingSuggestion).toBe(ANNUAL_REVIEW_MESSAGES.MEETING_SUGGESTION)
    })

    it('should have meeting suggestion in messages', () => {
      expect(ANNUAL_REVIEW_MESSAGES.MEETING_SUGGESTION).toContain('meeting')
    })
  })

  describe('no-expiry agreements (AC5)', () => {
    it('should prompt for no-expiry agreements', () => {
      const agreement = {
        id: 'agreement-123',
        createdAt: new Date('2023-06-15'),
        expiryDate: null,
      }

      expect(isAnnualReviewDue(agreement)).toBe(true)
    })

    it('should calculate days since review for no-expiry', () => {
      const lastReviewDate = new Date('2023-06-15')
      const days = getDaysSinceLastReview(lastReviewDate)
      expect(days).toBeGreaterThanOrEqual(365)
    })
  })

  describe('celebration message (AC6)', () => {
    it('should include celebration in prompt', () => {
      const agreement = {
        id: 'agreement-123',
        createdAt: new Date('2023-06-15'),
        lastReviewDate: new Date('2023-06-15'),
      }

      const prompt = getAnnualReviewPrompt(agreement, 14)

      expect(prompt?.celebration).toBe(ANNUAL_REVIEW_MESSAGES.CELEBRATION)
    })

    it('should have positive celebration message', () => {
      expect(ANNUAL_REVIEW_MESSAGES.CELEBRATION).toContain('trust')
      expect(ANNUAL_REVIEW_MESSAGES.CELEBRATION).toContain('together')
    })
  })

  describe('hook integration', () => {
    it('should provide complete annual review state', () => {
      const { result } = renderHook(() =>
        useAnnualReview({
          agreementId: 'agreement-123',
          createdAt: new Date('2023-06-15'),
          childAge: 14,
        })
      )

      expect(result.current.isReviewDue).toBe(true)
      expect(result.current.yearsSinceCreation).toBe(1)
      expect(result.current.reviewPrompt).not.toBeNull()
      expect(result.current.ageSuggestions.length).toBeGreaterThan(0)
      expect(result.current.celebrationMessage).toContain('trust')
    })

    it('should allow review actions', () => {
      const onComplete = vi.fn()
      const onDismiss = vi.fn()
      const onScheduleMeeting = vi.fn()

      const { result } = renderHook(() =>
        useAnnualReview({
          agreementId: 'agreement-123',
          createdAt: new Date('2023-06-15'),
          childAge: 14,
          onComplete,
          onDismiss,
          onScheduleMeeting,
        })
      )

      act(() => {
        result.current.completeReview()
      })
      expect(onComplete).toHaveBeenCalledWith('agreement-123')

      act(() => {
        result.current.dismissPrompt()
      })
      expect(onDismiss).toHaveBeenCalledWith('agreement-123')

      act(() => {
        result.current.scheduleFamilyMeeting()
      })
      expect(onScheduleMeeting).toHaveBeenCalledWith('agreement-123')
    })
  })

  describe('complete lifecycle flow', () => {
    it('should transition from not-due → due correctly', () => {
      // Agreement created 6 months ago - not due
      const recentAgreement = {
        id: 'agreement-123',
        createdAt: new Date('2024-01-01'),
      }

      expect(getAnnualReviewStatus(recentAgreement)).toBe('not-due')
      expect(isAnnualReviewDue(recentAgreement)).toBe(false)
      expect(getAnnualReviewPrompt({ id: 'agreement-123', ...recentAgreement }, 14)).toBeNull()

      // Agreement created 1 year ago - due
      const oldAgreement = {
        id: 'agreement-123',
        createdAt: new Date('2023-06-15'),
      }

      expect(getAnnualReviewStatus(oldAgreement)).toBe('due')
      expect(isAnnualReviewDue(oldAgreement)).toBe(true)
      expect(getAnnualReviewPrompt({ id: 'agreement-123', ...oldAgreement }, 14)).not.toBeNull()
    })

    it('should use lastReviewDate for recurring reviews', () => {
      // Agreement old, but reviewed recently
      const agreement = {
        id: 'agreement-123',
        createdAt: new Date('2022-01-01'), // 2+ years ago
        lastReviewDate: new Date('2024-01-01'), // 6 months ago
      }

      expect(getAnnualReviewStatus(agreement)).toBe('not-due')
      expect(isAnnualReviewDue(agreement)).toBe(false)
    })
  })
})
