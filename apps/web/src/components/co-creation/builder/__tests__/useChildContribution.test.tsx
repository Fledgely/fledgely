/**
 * Tests for useChildContribution Hook
 *
 * Story 5.3: Child Contribution Capture - Task 7
 *
 * Custom hook for managing child contribution mode state and behavior
 */

import { describe, it, expect, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useChildContribution } from '../useChildContribution'
import type { SessionContributor } from '@fledgely/contracts'

// ============================================
// BASIC FUNCTIONALITY TESTS
// ============================================

describe('useChildContribution', () => {
  describe('initial state', () => {
    it('returns initial contributor as parent by default', () => {
      const { result } = renderHook(() => useChildContribution())
      expect(result.current.contributor).toBe('parent')
    })

    it('accepts initial contributor parameter', () => {
      const { result } = renderHook(() =>
        useChildContribution({ initialContributor: 'child' })
      )
      expect(result.current.contributor).toBe('child')
    })

    it('returns isChildMode as false when parent', () => {
      const { result } = renderHook(() => useChildContribution())
      expect(result.current.isChildMode).toBe(false)
    })

    it('returns isChildMode as true when child', () => {
      const { result } = renderHook(() =>
        useChildContribution({ initialContributor: 'child' })
      )
      expect(result.current.isChildMode).toBe(true)
    })
  })

  // ============================================
  // CONTRIBUTOR SWITCHING TESTS
  // ============================================

  describe('contributor switching', () => {
    it('switches to child contributor', () => {
      const { result } = renderHook(() => useChildContribution())

      act(() => {
        result.current.setContributor('child')
      })

      expect(result.current.contributor).toBe('child')
      expect(result.current.isChildMode).toBe(true)
    })

    it('switches back to parent contributor', () => {
      const { result } = renderHook(() =>
        useChildContribution({ initialContributor: 'child' })
      )

      act(() => {
        result.current.setContributor('parent')
      })

      expect(result.current.contributor).toBe('parent')
      expect(result.current.isChildMode).toBe(false)
    })

    it('calls onContributorChange callback when switching', () => {
      const onContributorChange = vi.fn()
      const { result } = renderHook(() =>
        useChildContribution({ onContributorChange })
      )

      act(() => {
        result.current.setContributor('child')
      })

      expect(onContributorChange).toHaveBeenCalledWith('child')
    })

    it('provides toggle function for quick switching', () => {
      const { result } = renderHook(() => useChildContribution())

      act(() => {
        result.current.toggleContributor()
      })

      expect(result.current.contributor).toBe('child')

      act(() => {
        result.current.toggleContributor()
      })

      expect(result.current.contributor).toBe('parent')
    })
  })

  // ============================================
  // CHILD CONTRIBUTION TRACKING TESTS
  // ============================================

  describe('child contribution tracking', () => {
    it('tracks child contributions', () => {
      const { result } = renderHook(() =>
        useChildContribution({ initialContributor: 'child' })
      )

      act(() => {
        result.current.recordContribution('term-1')
      })

      expect(result.current.childContributions).toContain('term-1')
    })

    it('maintains list of child contributions', () => {
      const { result } = renderHook(() =>
        useChildContribution({ initialContributor: 'child' })
      )

      act(() => {
        result.current.recordContribution('term-1')
        result.current.recordContribution('term-2')
        result.current.recordContribution('term-3')
      })

      expect(result.current.childContributions).toHaveLength(3)
      expect(result.current.childContributions).toEqual(['term-1', 'term-2', 'term-3'])
    })

    it('prevents duplicate contribution tracking', () => {
      const { result } = renderHook(() =>
        useChildContribution({ initialContributor: 'child' })
      )

      act(() => {
        result.current.recordContribution('term-1')
        result.current.recordContribution('term-1')
      })

      expect(result.current.childContributions).toHaveLength(1)
    })

    it('checks if term is child contribution', () => {
      const { result } = renderHook(() =>
        useChildContribution({ initialContributor: 'child' })
      )

      act(() => {
        result.current.recordContribution('term-1')
      })

      expect(result.current.isChildContribution('term-1')).toBe(true)
      expect(result.current.isChildContribution('term-2')).toBe(false)
    })
  })

  // ============================================
  // CHILD FEEDBACK TRACKING TESTS
  // ============================================

  describe('child feedback tracking', () => {
    it('tracks feedback on parent terms', () => {
      const { result } = renderHook(() =>
        useChildContribution({ initialContributor: 'child' })
      )

      act(() => {
        result.current.recordFeedback('term-1', 'positive')
      })

      expect(result.current.getFeedback('term-1')).toBe('positive')
    })

    it('updates existing feedback', () => {
      const { result } = renderHook(() =>
        useChildContribution({ initialContributor: 'child' })
      )

      act(() => {
        result.current.recordFeedback('term-1', 'positive')
      })

      act(() => {
        result.current.recordFeedback('term-1', 'negative')
      })

      expect(result.current.getFeedback('term-1')).toBe('negative')
    })

    it('returns undefined for terms without feedback', () => {
      const { result } = renderHook(() => useChildContribution())
      expect(result.current.getFeedback('unknown-term')).toBeUndefined()
    })

    it('calls onFeedback callback when feedback recorded', () => {
      const onFeedback = vi.fn()
      const { result } = renderHook(() =>
        useChildContribution({ onFeedback })
      )

      act(() => {
        result.current.recordFeedback('term-1', 'positive')
      })

      expect(onFeedback).toHaveBeenCalledWith('term-1', 'positive')
    })
  })

  // ============================================
  // CHILD PROTECTION TESTS
  // ============================================

  describe('child contribution protection', () => {
    it('returns canEditTerm false for child contributions in parent mode', () => {
      const { result } = renderHook(() =>
        useChildContribution({ initialContributor: 'child' })
      )

      act(() => {
        result.current.recordContribution('term-1')
      })

      act(() => {
        result.current.setContributor('parent')
      })

      expect(result.current.canEditTerm('term-1')).toBe(false)
    })

    it('returns canEditTerm true for parent contributions', () => {
      const { result } = renderHook(() => useChildContribution())

      expect(result.current.canEditTerm('term-1')).toBe(true)
    })

    it('returns canDeleteTerm false for child contributions', () => {
      const { result } = renderHook(() =>
        useChildContribution({ initialContributor: 'child' })
      )

      act(() => {
        result.current.recordContribution('term-1')
      })

      act(() => {
        result.current.setContributor('parent')
      })

      expect(result.current.canDeleteTerm('term-1')).toBe(false)
    })

    it('returns canDeleteTerm true for parent contributions', () => {
      const { result } = renderHook(() => useChildContribution())

      expect(result.current.canDeleteTerm('some-term')).toBe(true)
    })
  })

  // ============================================
  // FORM DATA PREPARATION TESTS
  // ============================================

  describe('form data preparation', () => {
    it('prepares term data with child contributor', () => {
      const { result } = renderHook(() =>
        useChildContribution({ initialContributor: 'child' })
      )

      const termData = result.current.prepareTermData({
        type: 'rule',
        content: { text: 'Test rule' },
      })

      expect(termData.addedBy).toBe('child')
    })

    it('prepares term data with parent contributor', () => {
      const { result } = renderHook(() => useChildContribution())

      const termData = result.current.prepareTermData({
        type: 'rule',
        content: { text: 'Test rule' },
      })

      expect(termData.addedBy).toBe('parent')
    })

    it('preserves original term data', () => {
      const { result } = renderHook(() =>
        useChildContribution({ initialContributor: 'child' })
      )

      const termData = result.current.prepareTermData({
        type: 'reward',
        content: { text: 'Get ice cream', emoji: '🍦' },
      })

      expect(termData.type).toBe('reward')
      expect(termData.content.text).toBe('Get ice cream')
      expect(termData.content.emoji).toBe('🍦')
    })
  })

  // ============================================
  // CLEAR AND RESET TESTS
  // ============================================

  describe('clear and reset', () => {
    it('clears all child contributions', () => {
      const { result } = renderHook(() =>
        useChildContribution({ initialContributor: 'child' })
      )

      act(() => {
        result.current.recordContribution('term-1')
        result.current.recordContribution('term-2')
      })

      act(() => {
        result.current.clearContributions()
      })

      expect(result.current.childContributions).toHaveLength(0)
    })

    it('clears all feedback', () => {
      const { result } = renderHook(() => useChildContribution())

      act(() => {
        result.current.recordFeedback('term-1', 'positive')
        result.current.recordFeedback('term-2', 'negative')
      })

      act(() => {
        result.current.clearFeedback()
      })

      expect(result.current.getFeedback('term-1')).toBeUndefined()
      expect(result.current.getFeedback('term-2')).toBeUndefined()
    })

    it('resets all state to initial', () => {
      const { result } = renderHook(() =>
        useChildContribution({ initialContributor: 'child' })
      )

      act(() => {
        result.current.recordContribution('term-1')
        result.current.recordFeedback('term-2', 'positive')
        result.current.setContributor('parent')
      })

      act(() => {
        result.current.reset()
      })

      expect(result.current.contributor).toBe('child')
      expect(result.current.childContributions).toHaveLength(0)
      expect(result.current.getFeedback('term-2')).toBeUndefined()
    })
  })

  // ============================================
  // CONTRIBUTION COUNT TESTS
  // ============================================

  describe('contribution counts', () => {
    it('returns child contribution count', () => {
      const { result } = renderHook(() =>
        useChildContribution({ initialContributor: 'child' })
      )

      act(() => {
        result.current.recordContribution('term-1')
        result.current.recordContribution('term-2')
      })

      expect(result.current.childContributionCount).toBe(2)
    })

    it('returns feedback count', () => {
      const { result } = renderHook(() => useChildContribution())

      act(() => {
        result.current.recordFeedback('term-1', 'positive')
        result.current.recordFeedback('term-2', 'negative')
        result.current.recordFeedback('term-3', 'neutral')
      })

      expect(result.current.feedbackCount).toBe(3)
    })
  })
})
