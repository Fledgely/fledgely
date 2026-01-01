/**
 * Annual Review Types and Constants - Story 35.6
 *
 * Types, schemas, and utilities for annual review prompts.
 * AC1: Prompt sent when 1 year since last review
 * AC3: Suggestions based on age
 * AC5: Prompt even for "no expiry" agreements
 * AC6: Celebrates healthy relationship
 */

import { z } from 'zod'

/**
 * Annual review interval in days.
 * AC1: Prompt sent when 1 year since last review
 */
export const ANNUAL_REVIEW_INTERVAL_DAYS = 365

/**
 * Schema for annual review status.
 */
export const annualReviewStatusSchema = z.enum([
  'not-due', // Not yet 365 days
  'due', // 365+ days, needs review
  'prompted', // Prompt has been shown
  'completed', // Review was completed
  'dismissed', // User dismissed for this cycle
])

export type AnnualReviewStatus = z.infer<typeof annualReviewStatusSchema>

/**
 * Annual review messages.
 * AC1: Prompt title
 * AC2: Growth reminder
 * AC4: Meeting suggestion
 * AC6: Celebration message
 */
export const ANNUAL_REVIEW_MESSAGES = {
  PROMPT_TITLE: "It's been a year - time for an agreement review?",
  GROWTH_REMINDER: 'Your child has grown - consider updating terms',
  CELEBRATION: '1 year of building trust together!',
  MEETING_SUGGESTION: 'Consider scheduling a family meeting to discuss',
} as const

/**
 * Age threshold for suggestions.
 */
export interface AgeSuggestionThreshold {
  age: number
  suggestions: string[]
}

/**
 * Age-based suggestion thresholds.
 * AC3: Suggestions based on age
 */
export const AGE_SUGGESTION_THRESHOLDS: AgeSuggestionThreshold[] = [
  {
    age: 10,
    suggestions: ['Consider scheduled screenshot review times'],
  },
  {
    age: 12,
    suggestions: ['Many families reduce screenshot frequency at this age'],
  },
  {
    age: 14,
    suggestions: ['Many 14-year-olds have reduced screenshot frequency'],
  },
  {
    age: 16,
    suggestions: ['Consider notification-only mode for trusted teens'],
  },
]

/**
 * Agreement input for annual review checks.
 */
export interface AgreementForAnnualReview {
  lastReviewDate?: Date | null
  createdAt: Date
  expiryDate?: Date | null
  annualReviewPromptedAt?: Date | null
  annualReviewDismissedAt?: Date | null
}

/**
 * Schema for annual review prompt.
 */
export const annualReviewPromptSchema = z.object({
  title: z.string(),
  growthReminder: z.string(),
  celebration: z.string(),
  meetingSuggestion: z.string().optional(),
  ageSuggestions: z.array(z.string()),
  yearsSinceCreation: z.number(),
})

export type AnnualReviewPrompt = z.infer<typeof annualReviewPromptSchema>

/**
 * Calculate days since last review.
 *
 * @param lastReviewDate - The date of the last review
 * @returns Number of days since last review
 */
export function getDaysSinceLastReview(lastReviewDate: Date): number {
  const now = new Date()
  const diffTime = now.getTime() - lastReviewDate.getTime()
  return Math.floor(diffTime / (1000 * 60 * 60 * 24))
}

/**
 * Check if annual review is due.
 * AC1: Prompt sent when 1 year since last review
 * AC5: Prompt even for "no expiry" agreements
 *
 * @param agreement - The agreement to check
 * @returns True if annual review is due
 */
export function isAnnualReviewDue(agreement: AgreementForAnnualReview): boolean {
  const reviewDate = agreement.lastReviewDate || agreement.createdAt
  const daysSince = getDaysSinceLastReview(reviewDate)
  return daysSince >= ANNUAL_REVIEW_INTERVAL_DAYS
}

/**
 * Get age-based suggestions for a child.
 * AC3: Suggestions based on age
 *
 * @param childAge - The child's current age
 * @returns Array of suggestions for this age
 */
export function getAgeBasedSuggestions(childAge: number): string[] {
  const threshold = AGE_SUGGESTION_THRESHOLDS.find((t) => t.age === childAge)
  return threshold?.suggestions || []
}

/**
 * Get the annual review status for an agreement.
 *
 * @param agreement - The agreement to check
 * @returns The current annual review status
 */
export function getAnnualReviewStatus(agreement: AgreementForAnnualReview): AnnualReviewStatus {
  // Check if dismissed this cycle
  if (agreement.annualReviewDismissedAt) {
    const daysSinceDismissal = getDaysSinceLastReview(agreement.annualReviewDismissedAt)
    // Dismissed within the last year means still dismissed
    if (daysSinceDismissal < ANNUAL_REVIEW_INTERVAL_DAYS) {
      return 'dismissed'
    }
  }

  // Check if already prompted this cycle
  if (agreement.annualReviewPromptedAt) {
    const daysSincePrompt = getDaysSinceLastReview(agreement.annualReviewPromptedAt)
    // Prompted within the last year means still prompted
    if (daysSincePrompt < ANNUAL_REVIEW_INTERVAL_DAYS) {
      return 'prompted'
    }
  }

  // Check if review is due
  if (isAnnualReviewDue(agreement)) {
    return 'due'
  }

  return 'not-due'
}
