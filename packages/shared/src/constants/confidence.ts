/**
 * Confidence Score Constants and Utilities
 *
 * Story 20.3: Confidence Score Assignment - AC2, AC3, AC4
 *
 * Defines confidence level thresholds and utilities for classifying
 * AI classification confidence into actionable levels.
 *
 * Threshold Design:
 * - HIGH (>= 85%): Reliable classification, no special handling needed
 * - MEDIUM (60-84%): Acceptable but parent may want to verify
 * - LOW (< 60%): Flagged for review, no automated actions triggered
 * - UNCERTAIN: When isLowConfidence=true (below LOW_CONFIDENCE_THRESHOLD of 30%)
 */

import { LOW_CONFIDENCE_THRESHOLD } from './category-definitions'

/**
 * Confidence level thresholds for classification decisions.
 *
 * Story 20.3: Confidence Score Assignment - AC2, AC3, AC4
 *
 * These thresholds determine how classifications are handled:
 * - HIGH: >= 85% - Classification is reliable
 * - MEDIUM: >= 60% but < 85% - Classification is acceptable
 * - LOW: < 60% - Classification needs review (needsReview=true)
 */
export const CONFIDENCE_THRESHOLDS = {
  /**
   * Minimum confidence for HIGH level.
   * AC2: Scores above 85% considered high confidence
   */
  HIGH: 85,
  /**
   * Minimum confidence for MEDIUM level.
   * AC3: Scores 60-85% considered medium confidence
   * AC4: Scores below 60% flagged for potential review
   */
  MEDIUM: 60,
  /**
   * Story 20.4: Multi-Label Classification - AC2
   * Minimum confidence for secondary category inclusion.
   */
  SECONDARY: 50,
} as const

/**
 * Story 20.4: Multi-Label Classification - AC3
 * Maximum number of categories per classification (1 primary + 2 secondary).
 */
export const MAX_CATEGORIES = 3

/**
 * Confidence level type.
 *
 * Story 20.3: Confidence Score Assignment - AC2, AC3, AC4
 *
 * - high: Confidence >= 85%, reliable classification
 * - medium: Confidence 60-84%, acceptable but verify
 * - low: Confidence < 60%, needs review (automated actions skipped)
 * - uncertain: When isLowConfidence=true (below 30% threshold)
 */
export type ConfidenceLevel = 'high' | 'medium' | 'low' | 'uncertain'

/**
 * Determine confidence level from a numeric score.
 *
 * Story 20.3: Confidence Score Assignment - AC2, AC3, AC4
 *
 * @param confidence - Confidence score (0-100)
 * @param isLowConfidence - True if classification fell below LOW_CONFIDENCE_THRESHOLD
 * @returns Confidence level string
 *
 * @example
 * getConfidenceLevelFromScore(90) // 'high'
 * getConfidenceLevelFromScore(75) // 'medium'
 * getConfidenceLevelFromScore(50) // 'low'
 * getConfidenceLevelFromScore(25, true) // 'uncertain'
 */
export function getConfidenceLevelFromScore(
  confidence: number,
  isLowConfidence?: boolean
): ConfidenceLevel {
  // When isLowConfidence is true, the classification was below the 30% threshold
  // and was assigned to "Other" as a fallback - this is the most uncertain state
  if (isLowConfidence) {
    return 'uncertain'
  }

  // Story 20.3 AC2: Scores above 85% considered high confidence
  if (confidence >= CONFIDENCE_THRESHOLDS.HIGH) {
    return 'high'
  }

  // Story 20.3 AC3: Scores 60-85% considered medium confidence
  if (confidence >= CONFIDENCE_THRESHOLDS.MEDIUM) {
    return 'medium'
  }

  // Story 20.3 AC4: Scores below 60% flagged for potential review
  return 'low'
}

/**
 * Determine if a classification needs manual review.
 *
 * Story 20.3: Confidence Score Assignment - AC4
 *
 * Classifications need review when:
 * - Confidence is below 60% (MEDIUM threshold)
 * - OR isLowConfidence is true (below 30% fallback threshold)
 *
 * @param confidence - Confidence score (0-100)
 * @param isLowConfidence - True if classification fell below LOW_CONFIDENCE_THRESHOLD
 * @returns True if classification should be flagged for review
 *
 * @example
 * classificationNeedsReview(90) // false
 * classificationNeedsReview(75) // false
 * classificationNeedsReview(50) // true
 * classificationNeedsReview(25, true) // true
 */
export function classificationNeedsReview(confidence: number, isLowConfidence?: boolean): boolean {
  // If isLowConfidence is true, it definitely needs review
  if (isLowConfidence) {
    return true
  }

  // AC4: Scores below 60% flagged for potential review
  return confidence < CONFIDENCE_THRESHOLDS.MEDIUM
}

/**
 * Determine if a classification should trigger automated actions.
 *
 * Story 20.3: Confidence Score Assignment - AC6
 *
 * Automated actions (future: alerts, flags, notifications) should only
 * trigger for reliable classifications. Low-confidence classifications
 * require manual parent review instead.
 *
 * @param confidence - Confidence score (0-100)
 * @param isLowConfidence - True if classification fell below LOW_CONFIDENCE_THRESHOLD
 * @returns True if automated actions should be triggered
 *
 * @example
 * shouldTriggerAutomation(90) // true
 * shouldTriggerAutomation(75) // true
 * shouldTriggerAutomation(50) // false
 * shouldTriggerAutomation(25, true) // false
 */
export function shouldTriggerAutomation(confidence: number, isLowConfidence?: boolean): boolean {
  // AC6: Low-confidence classifications don't trigger automated actions
  // This is the inverse of needsReview - if it needs review, don't automate
  return !classificationNeedsReview(confidence, isLowConfidence)
}

/**
 * Get display color class for confidence level.
 *
 * Story 20.3: Confidence Score Assignment - AC5
 *
 * @param level - Confidence level
 * @returns Tailwind color class for the level
 */
export function getConfidenceLevelColor(level: ConfidenceLevel): string {
  switch (level) {
    case 'high':
      return 'green'
    case 'medium':
      return 'yellow'
    case 'low':
      return 'red'
    case 'uncertain':
      return 'gray'
  }
}

// Re-export for convenience
export { LOW_CONFIDENCE_THRESHOLD }
