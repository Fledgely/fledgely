/**
 * useAnnualReview Hook - Story 35.6
 *
 * Hook for managing annual review state.
 * AC1: Prompt when 1 year since last review
 * AC4: Optional family meeting reminder
 * AC6: Celebrates healthy relationship
 */

import { useMemo, useCallback } from 'react'
import {
  checkAnnualReviewStatus,
  getAnnualReviewPrompt,
  getAgeSuggestions,
  getYearsSinceCreation,
} from '../services/annualReviewService'
import { ANNUAL_REVIEW_MESSAGES, type AnnualReviewPrompt } from '@fledgely/shared'

/**
 * Hook parameters.
 */
export interface UseAnnualReviewParams {
  agreementId: string
  createdAt: Date
  lastReviewDate?: Date | null
  childAge: number
  onComplete?: (agreementId: string) => void
  onDismiss?: (agreementId: string) => void
  onScheduleMeeting?: (agreementId: string) => void
}

/**
 * Hook result.
 */
export interface UseAnnualReviewResult {
  isReviewDue: boolean
  yearsSinceCreation: number
  reviewPrompt: AnnualReviewPrompt | null
  ageSuggestions: string[]
  celebrationMessage: string
  completeReview: () => void
  dismissPrompt: () => void
  scheduleFamilyMeeting: () => void
}

/**
 * Hook for managing annual review state.
 */
export function useAnnualReview({
  agreementId,
  createdAt,
  lastReviewDate,
  childAge,
  onComplete,
  onDismiss,
  onScheduleMeeting,
}: UseAnnualReviewParams): UseAnnualReviewResult {
  // Build agreement object for service functions
  const agreement = useMemo(
    () => ({
      id: agreementId,
      createdAt,
      lastReviewDate,
    }),
    [agreementId, createdAt, lastReviewDate]
  )

  // Check if review is due
  const reviewStatus = useMemo(() => checkAnnualReviewStatus(agreement), [agreement])

  const isReviewDue = reviewStatus === 'due'

  // Get years since creation
  const yearsSinceCreation = useMemo(() => getYearsSinceCreation(createdAt), [createdAt])

  // Get review prompt
  const reviewPrompt = useMemo(
    () => getAnnualReviewPrompt(agreement, childAge),
    [agreement, childAge]
  )

  // Get age suggestions
  const ageSuggestions = useMemo(() => getAgeSuggestions(childAge), [childAge])

  // Celebration message
  const celebrationMessage = ANNUAL_REVIEW_MESSAGES.CELEBRATION

  // Complete review handler
  const completeReview = useCallback(() => {
    onComplete?.(agreementId)
  }, [onComplete, agreementId])

  // Dismiss prompt handler
  const dismissPrompt = useCallback(() => {
    onDismiss?.(agreementId)
  }, [onDismiss, agreementId])

  // Schedule family meeting handler
  const scheduleFamilyMeeting = useCallback(() => {
    onScheduleMeeting?.(agreementId)
  }, [onScheduleMeeting, agreementId])

  return {
    isReviewDue,
    yearsSinceCreation,
    reviewPrompt,
    ageSuggestions,
    celebrationMessage,
    completeReview,
    dismissPrompt,
    scheduleFamilyMeeting,
  }
}
