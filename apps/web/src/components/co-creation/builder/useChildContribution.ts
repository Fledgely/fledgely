'use client'

import { useState, useCallback, useMemo } from 'react'
import type { SessionContributor } from '@fledgely/contracts'
import type { FeedbackType } from './ChildFeedbackButton'

/**
 * Basic term data for contribution
 */
interface TermInput {
  type: 'rule' | 'reward'
  content: { text: string; emoji?: string }
}

/**
 * Prepared term data with contributor info
 */
interface PreparedTermData extends TermInput {
  addedBy: SessionContributor
}

/**
 * Options for the useChildContribution hook
 */
export interface UseChildContributionOptions {
  /** Initial contributor mode */
  initialContributor?: SessionContributor
  /** Callback when contributor changes */
  onContributorChange?: (contributor: SessionContributor) => void
  /** Callback when feedback is recorded */
  onFeedback?: (termId: string, feedback: FeedbackType) => void
}

/**
 * Return type for the useChildContribution hook
 */
export interface UseChildContributionReturn {
  /** Current contributor mode */
  contributor: SessionContributor
  /** Whether currently in child mode */
  isChildMode: boolean
  /** Set the current contributor */
  setContributor: (contributor: SessionContributor) => void
  /** Toggle between parent and child */
  toggleContributor: () => void
  /** List of term IDs contributed by child */
  childContributions: string[]
  /** Number of child contributions */
  childContributionCount: number
  /** Record a child contribution */
  recordContribution: (termId: string) => void
  /** Check if a term is a child contribution */
  isChildContribution: (termId: string) => boolean
  /** Record feedback on a term */
  recordFeedback: (termId: string, feedback: FeedbackType) => void
  /** Get feedback for a term */
  getFeedback: (termId: string) => FeedbackType | undefined
  /** Number of feedback entries */
  feedbackCount: number
  /** Check if term can be edited */
  canEditTerm: (termId: string) => boolean
  /** Check if term can be deleted */
  canDeleteTerm: (termId: string) => boolean
  /** Prepare term data with contributor */
  prepareTermData: (input: TermInput) => PreparedTermData
  /** Clear all child contributions */
  clearContributions: () => void
  /** Clear all feedback */
  clearFeedback: () => void
  /** Reset all state */
  reset: () => void
}

/**
 * useChildContribution Hook
 *
 * Story 5.3: Child Contribution Capture - Task 7
 *
 * Custom hook for managing child contribution mode state and behavior.
 * Features:
 * - Toggle between parent and child contributor modes
 * - Track which terms were added by the child
 * - Track child feedback on parent terms
 * - Protect child contributions from parent editing
 * - Prepare term data with correct contributor attribution
 *
 * @example
 * ```tsx
 * const {
 *   contributor,
 *   isChildMode,
 *   setContributor,
 *   recordContribution,
 *   canEditTerm,
 * } = useChildContribution({
 *   initialContributor: 'parent',
 *   onContributorChange: (c) => console.log('Switched to', c),
 * })
 * ```
 */
export function useChildContribution(
  options: UseChildContributionOptions = {}
): UseChildContributionReturn {
  const {
    initialContributor = 'parent',
    onContributorChange,
    onFeedback,
  } = options

  // State
  const [contributor, setContributorState] = useState<SessionContributor>(initialContributor)
  const [childContributions, setChildContributions] = useState<string[]>([])
  const [feedback, setFeedback] = useState<Record<string, FeedbackType>>({})

  // Derived state
  const isChildMode = contributor === 'child'
  const childContributionCount = childContributions.length
  const feedbackCount = Object.keys(feedback).length

  /**
   * Set the contributor with callback
   */
  const setContributor = useCallback(
    (newContributor: SessionContributor) => {
      setContributorState(newContributor)
      onContributorChange?.(newContributor)
    },
    [onContributorChange]
  )

  /**
   * Toggle between parent and child
   */
  const toggleContributor = useCallback(() => {
    const newContributor = contributor === 'parent' ? 'child' : 'parent'
    setContributor(newContributor)
  }, [contributor, setContributor])

  /**
   * Record a child contribution
   */
  const recordContribution = useCallback((termId: string) => {
    setChildContributions((prev) => {
      if (prev.includes(termId)) return prev
      return [...prev, termId]
    })
  }, [])

  /**
   * Check if a term is a child contribution
   */
  const isChildContribution = useCallback(
    (termId: string) => childContributions.includes(termId),
    [childContributions]
  )

  /**
   * Record feedback on a term
   */
  const recordFeedback = useCallback(
    (termId: string, feedbackType: FeedbackType) => {
      setFeedback((prev) => ({
        ...prev,
        [termId]: feedbackType,
      }))
      onFeedback?.(termId, feedbackType)
    },
    [onFeedback]
  )

  /**
   * Get feedback for a term
   */
  const getFeedback = useCallback(
    (termId: string) => feedback[termId],
    [feedback]
  )

  /**
   * Check if a term can be edited
   * Child contributions cannot be edited by parent
   */
  const canEditTerm = useCallback(
    (termId: string) => {
      if (isChildContribution(termId) && contributor === 'parent') {
        return false
      }
      return true
    },
    [isChildContribution, contributor]
  )

  /**
   * Check if a term can be deleted
   * Child contributions cannot be deleted
   */
  const canDeleteTerm = useCallback(
    (termId: string) => {
      if (isChildContribution(termId)) {
        return false
      }
      return true
    },
    [isChildContribution]
  )

  /**
   * Prepare term data with contributor attribution
   */
  const prepareTermData = useCallback(
    (input: TermInput): PreparedTermData => ({
      ...input,
      addedBy: contributor,
    }),
    [contributor]
  )

  /**
   * Clear all child contributions
   */
  const clearContributions = useCallback(() => {
    setChildContributions([])
  }, [])

  /**
   * Clear all feedback
   */
  const clearFeedback = useCallback(() => {
    setFeedback({})
  }, [])

  /**
   * Reset all state to initial
   */
  const reset = useCallback(() => {
    setContributorState(initialContributor)
    setChildContributions([])
    setFeedback({})
  }, [initialContributor])

  return {
    contributor,
    isChildMode,
    setContributor,
    toggleContributor,
    childContributions,
    childContributionCount,
    recordContribution,
    isChildContribution,
    recordFeedback,
    getFeedback,
    feedbackCount,
    canEditTerm,
    canDeleteTerm,
    prepareTermData,
    clearContributions,
    clearFeedback,
    reset,
  }
}

export default useChildContribution
