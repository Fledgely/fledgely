/**
 * useAnnualReview Hook Tests - Story 35.6
 *
 * Tests for annual review state management hook.
 * AC1: Prompt when 1 year since last review
 * AC4: Optional family meeting reminder
 * AC6: Celebrates healthy relationship
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useAnnualReview } from './useAnnualReview'

describe('useAnnualReview - Story 35.6', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-06-15'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('review status (AC1)', () => {
    it('should return review due when 1 year passed', () => {
      const { result } = renderHook(() =>
        useAnnualReview({
          agreementId: 'agreement-123',
          createdAt: new Date('2023-06-15'),
          childAge: 14,
        })
      )

      expect(result.current.isReviewDue).toBe(true)
    })

    it('should return not due when less than 1 year', () => {
      const { result } = renderHook(() =>
        useAnnualReview({
          agreementId: 'agreement-123',
          createdAt: new Date('2024-01-01'),
          childAge: 14,
        })
      )

      expect(result.current.isReviewDue).toBe(false)
    })

    it('should use lastReviewDate when provided', () => {
      const { result } = renderHook(() =>
        useAnnualReview({
          agreementId: 'agreement-123',
          createdAt: new Date('2022-01-01'),
          lastReviewDate: new Date('2024-01-01'),
          childAge: 14,
        })
      )

      expect(result.current.isReviewDue).toBe(false)
    })
  })

  describe('prompt content (AC1, AC6)', () => {
    it('should return prompt when review is due', () => {
      const { result } = renderHook(() =>
        useAnnualReview({
          agreementId: 'agreement-123',
          createdAt: new Date('2023-06-15'),
          childAge: 14,
        })
      )

      expect(result.current.reviewPrompt).not.toBeNull()
    })

    it('should return null prompt when not due', () => {
      const { result } = renderHook(() =>
        useAnnualReview({
          agreementId: 'agreement-123',
          createdAt: new Date('2024-01-01'),
          childAge: 14,
        })
      )

      expect(result.current.reviewPrompt).toBeNull()
    })

    it('should include celebration message (AC6)', () => {
      const { result } = renderHook(() =>
        useAnnualReview({
          agreementId: 'agreement-123',
          createdAt: new Date('2023-06-15'),
          childAge: 14,
        })
      )

      expect(result.current.celebrationMessage).toContain('trust')
    })
  })

  describe('age suggestions (AC3)', () => {
    it('should return suggestions for 14-year-old', () => {
      const { result } = renderHook(() =>
        useAnnualReview({
          agreementId: 'agreement-123',
          createdAt: new Date('2023-06-15'),
          childAge: 14,
        })
      )

      expect(result.current.ageSuggestions.length).toBeGreaterThan(0)
    })

    it('should return empty array for age without suggestions', () => {
      const { result } = renderHook(() =>
        useAnnualReview({
          agreementId: 'agreement-123',
          createdAt: new Date('2023-06-15'),
          childAge: 8,
        })
      )

      expect(result.current.ageSuggestions).toEqual([])
    })
  })

  describe('actions', () => {
    it('should call onComplete when completeReview is called', () => {
      const onComplete = vi.fn()

      const { result } = renderHook(() =>
        useAnnualReview({
          agreementId: 'agreement-123',
          createdAt: new Date('2023-06-15'),
          childAge: 14,
          onComplete,
        })
      )

      act(() => {
        result.current.completeReview()
      })

      expect(onComplete).toHaveBeenCalledWith('agreement-123')
    })

    it('should call onDismiss when dismissPrompt is called', () => {
      const onDismiss = vi.fn()

      const { result } = renderHook(() =>
        useAnnualReview({
          agreementId: 'agreement-123',
          createdAt: new Date('2023-06-15'),
          childAge: 14,
          onDismiss,
        })
      )

      act(() => {
        result.current.dismissPrompt()
      })

      expect(onDismiss).toHaveBeenCalledWith('agreement-123')
    })

    it('should call onScheduleMeeting when scheduleFamilyMeeting is called (AC4)', () => {
      const onScheduleMeeting = vi.fn()

      const { result } = renderHook(() =>
        useAnnualReview({
          agreementId: 'agreement-123',
          createdAt: new Date('2023-06-15'),
          childAge: 14,
          onScheduleMeeting,
        })
      )

      act(() => {
        result.current.scheduleFamilyMeeting()
      })

      expect(onScheduleMeeting).toHaveBeenCalledWith('agreement-123')
    })
  })

  describe('years since creation', () => {
    it('should return correct years', () => {
      const { result } = renderHook(() =>
        useAnnualReview({
          agreementId: 'agreement-123',
          createdAt: new Date('2023-06-15'),
          childAge: 14,
        })
      )

      expect(result.current.yearsSinceCreation).toBe(1)
    })
  })
})
