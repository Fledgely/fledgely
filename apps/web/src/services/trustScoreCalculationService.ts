/**
 * Trust Score Calculation Service - Story 36.2
 *
 * Service for performing trust score calculations.
 * AC1-3: Factor category contributions
 * AC4: Recency-weighted calculation
 * AC5: Starting score 70
 * AC6: Transparent calculation
 */

import {
  type TrustScore,
  type TrustFactor,
  type TrustScoreHistoryEntry,
  TRUST_SCORE_MIN,
  TRUST_SCORE_MAX,
  type ScoreBreakdown,
  type ScoreCalculationResult,
  calculateNewScore,
  generateScoreBreakdown,
  getPositiveContribution,
  getNeutralContribution,
  getConcerningContribution,
  generateBreakdownText,
  generateBreakdownSummary,
  generateImprovementTips,
  generateEncouragement,
} from '@fledgely/shared'
import { canUpdateScore, createHistoryEntry } from './trustScoreService'

// ============================================================================
// Daily Update Check (AC4)
// ============================================================================

/**
 * Check if a daily update timing is valid.
 * Must be at least 24 hours since last update.
 *
 * @param lastUpdatedAt - When the score was last updated
 * @returns True if 24 hours have passed
 */
export function validateDailyUpdateTiming(lastUpdatedAt: Date | null): boolean {
  return canUpdateScore(lastUpdatedAt)
}

// ============================================================================
// Score Calculation (AC1, AC2, AC3, AC4, AC5)
// ============================================================================

/**
 * Perform a daily score update with the provided factors.
 *
 * @param trustScore - Current trust score object
 * @param dailyFactors - Factors accumulated since last update
 * @returns Updated trust score with new calculation
 */
export function performDailyUpdate(
  trustScore: TrustScore,
  dailyFactors: TrustFactor[]
): TrustScore | null {
  // Check if update is allowed
  if (!validateDailyUpdateTiming(trustScore.lastUpdatedAt)) {
    return null
  }

  const now = new Date()
  const result = calculateNewScore(trustScore.currentScore, dailyFactors, now)

  // Create history entry for this update
  const historyEntry = createHistoryEntry(
    result.newScore,
    result.previousScore,
    'Daily score update',
    dailyFactors
  )

  // Return updated trust score
  return {
    ...trustScore,
    currentScore: result.newScore,
    history: [...trustScore.history, historyEntry],
    factors: [...trustScore.factors, ...dailyFactors],
    lastUpdatedAt: now,
  }
}

/**
 * Calculate projected score from pending factors (preview).
 * Does not modify the trust score.
 *
 * @param currentScore - Current score value
 * @param pendingFactors - Factors to apply
 * @returns Calculation result preview
 */
export function calculateProjectedScore(
  currentScore: number,
  pendingFactors: TrustFactor[]
): ScoreCalculationResult {
  return calculateNewScore(currentScore, pendingFactors)
}

// ============================================================================
// Factor Contribution Calculations (AC1, AC2, AC3)
// ============================================================================

/**
 * Get the total contribution from positive factors.
 *
 * @param factors - Array of trust factors
 * @returns Positive contribution value
 */
export function getPositiveFactorContribution(factors: TrustFactor[]): number {
  return getPositiveContribution(factors)
}

/**
 * Get the total contribution from neutral factors.
 *
 * @param factors - Array of trust factors
 * @returns Neutral contribution value (usually 0)
 */
export function getNeutralFactorContribution(factors: TrustFactor[]): number {
  return getNeutralContribution(factors)
}

/**
 * Get the total contribution from concerning factors.
 *
 * @param factors - Array of trust factors
 * @returns Concerning contribution value (negative)
 */
export function getConcerningFactorContribution(factors: TrustFactor[]): number {
  return getConcerningContribution(factors)
}

// ============================================================================
// Breakdown Generation (AC6)
// ============================================================================

/**
 * Generate a score breakdown for display.
 *
 * @param factors - Array of trust factors
 * @returns Score breakdown object
 */
export function getScoreBreakdown(factors: TrustFactor[]): ScoreBreakdown {
  return generateScoreBreakdown(factors)
}

/**
 * Generate human-readable breakdown text.
 *
 * @param breakdown - Score breakdown object
 * @returns Array of text lines for display
 */
export function getBreakdownDisplayText(breakdown: ScoreBreakdown): string[] {
  return generateBreakdownText(breakdown)
}

/**
 * Generate a brief breakdown summary.
 *
 * @param breakdown - Score breakdown object
 * @returns Single-line summary text
 */
export function getBreakdownSummaryText(breakdown: ScoreBreakdown): string {
  return generateBreakdownSummary(breakdown)
}

// ============================================================================
// Improvement Tips (AC6)
// ============================================================================

/**
 * Generate improvement tips based on concerning factors.
 *
 * @param concerningFactors - Array of concerning factors
 * @returns Array of tip strings
 */
export function getImprovementTips(concerningFactors: TrustFactor[]): string[] {
  return generateImprovementTips(concerningFactors)
}

/**
 * Generate encouragement message based on score trend.
 *
 * @param currentScore - Current trust score
 * @param previousScore - Previous trust score
 * @returns Encouraging message
 */
export function getEncouragementMessage(currentScore: number, previousScore: number): string {
  return generateEncouragement(currentScore, previousScore)
}

// ============================================================================
// Score Trend Analysis
// ============================================================================

/**
 * Calculate the score trend from history.
 *
 * @param history - Array of history entries
 * @param days - Number of days to analyze
 * @returns Score delta over the period
 */
export function calculateScoreTrend(history: TrustScoreHistoryEntry[], days: number): number {
  if (history.length === 0) {
    return 0
  }

  const now = new Date()
  const periodStart = new Date(now.getTime() - days * 24 * 60 * 60 * 1000)

  // Filter entries within the period
  const recentEntries = history.filter((entry) => entry.date >= periodStart)

  if (recentEntries.length === 0) {
    return 0
  }

  // Calculate total change in period
  return recentEntries.reduce((total, entry) => total + (entry.score - entry.previousScore), 0)
}

/**
 * Get the score from N days ago.
 *
 * @param currentScore - Current score
 * @param history - Array of history entries
 * @param daysAgo - Number of days to look back
 * @returns Score from that date, or current score if no history
 */
export function getScoreFromDaysAgo(
  currentScore: number,
  history: TrustScoreHistoryEntry[],
  daysAgo: number
): number {
  if (history.length === 0) {
    return currentScore
  }

  const targetDate = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000)

  // Sort history by date descending
  const sorted = [...history].sort((a, b) => b.date.getTime() - a.date.getTime())

  // Find the closest entry at or before target date
  for (const entry of sorted) {
    if (entry.date <= targetDate) {
      return entry.score
    }
  }

  // If no entry at or before target, use the oldest entry's previous score
  const oldest = sorted[sorted.length - 1]
  return oldest?.previousScore ?? currentScore
}

// ============================================================================
// Score Milestones
// ============================================================================

/**
 * Check if a score has crossed a milestone.
 *
 * @param previousScore - Score before change
 * @param newScore - Score after change
 * @returns Milestone crossed, or null if none
 */
export function checkScoreMilestone(
  previousScore: number,
  newScore: number
): { milestone: number; direction: 'reached' | 'dropped_below' } | null {
  const milestones = [90, 80, 70, 60, 50]

  for (const milestone of milestones) {
    // Check if crossed upward
    if (previousScore < milestone && newScore >= milestone) {
      return { milestone, direction: 'reached' }
    }
    // Check if dropped below
    if (previousScore >= milestone && newScore < milestone) {
      return { milestone, direction: 'dropped_below' }
    }
  }

  return null
}

/**
 * Format a milestone message.
 *
 * @param milestone - The milestone value
 * @param direction - Whether reached or dropped below
 * @returns Human-readable milestone message
 */
export function formatMilestoneMessage(
  milestone: number,
  direction: 'reached' | 'dropped_below'
): string {
  if (direction === 'reached') {
    if (milestone >= 90) {
      return `Congratulations! You've reached ${milestone} - outstanding trust!`
    }
    if (milestone >= 80) {
      return `Great job! You've reached ${milestone} - high trust!`
    }
    return `You've reached ${milestone}. Keep going!`
  }

  // Dropped below - be encouraging, not punitive
  return `Your score is now ${milestone - 1}. Every day is a new opportunity to improve!`
}

// ============================================================================
// Validation
// ============================================================================

/**
 * Validate that a score is within valid range.
 *
 * @param score - Score to validate
 * @returns True if valid
 */
export function isValidScoreValue(score: number): boolean {
  return score >= TRUST_SCORE_MIN && score <= TRUST_SCORE_MAX
}

/**
 * Clamp a score to valid range.
 *
 * @param score - Score to clamp
 * @returns Score within 0-100 range
 */
export function clampToValidRange(score: number): number {
  if (score < TRUST_SCORE_MIN) return TRUST_SCORE_MIN
  if (score > TRUST_SCORE_MAX) return TRUST_SCORE_MAX
  return score
}
