/**
 * Annual Review Service - Story 35.6
 *
 * Service for managing annual review prompts.
 * AC1: Prompt sent when 1 year since last review
 * AC2: Prompt includes "Your child has grown"
 * AC3: Suggestions based on age
 * AC5: Prompt even for "no expiry" agreements
 */

import {
  ANNUAL_REVIEW_MESSAGES,
  isAnnualReviewDue,
  getAgeBasedSuggestions as getSharedAgeSuggestions,
  getAnnualReviewStatus,
  type AnnualReviewStatus,
  type AnnualReviewPrompt,
  type AgreementForAnnualReview,
} from '@fledgely/shared'

/**
 * Agreement input for service functions.
 */
export interface AgreementInput extends AgreementForAnnualReview {
  id: string
}

/**
 * Check annual review status for an agreement.
 * AC1: Prompt sent when 1 year since last review
 * AC5: Works for no-expiry agreements
 *
 * @param agreement - The agreement to check
 * @returns The annual review status
 */
export function checkAnnualReviewStatus(agreement: AgreementInput): AnnualReviewStatus {
  return getAnnualReviewStatus(agreement)
}

/**
 * Get years since agreement creation.
 *
 * @param createdAt - The creation date
 * @returns Number of full years
 */
export function getYearsSinceCreation(createdAt: Date): number {
  const now = new Date()
  const diffTime = now.getTime() - createdAt.getTime()
  const days = Math.floor(diffTime / (1000 * 60 * 60 * 24))
  return Math.floor(days / 365)
}

/**
 * Get annual review prompt for an agreement.
 * AC1: Prompt includes title
 * AC2: Prompt includes growth reminder
 * AC4: Meeting suggestion included
 * AC6: Celebration message included
 *
 * @param agreement - The agreement to check
 * @param childAge - The child's current age
 * @returns The prompt or null if not due
 */
export function getAnnualReviewPrompt(
  agreement: AgreementInput,
  childAge: number
): AnnualReviewPrompt | null {
  if (!isAnnualReviewDue(agreement)) {
    return null
  }

  const ageSuggestions = getSharedAgeSuggestions(childAge)
  const yearsSinceCreation = getYearsSinceCreation(agreement.createdAt)

  return {
    title: ANNUAL_REVIEW_MESSAGES.PROMPT_TITLE,
    growthReminder: ANNUAL_REVIEW_MESSAGES.GROWTH_REMINDER,
    celebration: ANNUAL_REVIEW_MESSAGES.CELEBRATION,
    meetingSuggestion: ANNUAL_REVIEW_MESSAGES.MEETING_SUGGESTION,
    ageSuggestions,
    yearsSinceCreation,
  }
}

/**
 * Get age-based suggestions for a child.
 * AC3: Suggestions based on age
 *
 * @param childAge - The child's current age
 * @returns Array of suggestions
 */
export function getAgeSuggestions(childAge: number): string[] {
  return getSharedAgeSuggestions(childAge)
}

/**
 * Check if annual review can be dismissed.
 *
 * @param agreement - The agreement to check
 * @returns True if can dismiss
 */
export function canDismissAnnualReview(agreement: AgreementInput): boolean {
  return isAnnualReviewDue(agreement)
}
