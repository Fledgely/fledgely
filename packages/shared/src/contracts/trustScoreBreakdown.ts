/**
 * Trust Score Breakdown Utilities - Story 36.2
 *
 * Formatting utilities for displaying transparent score breakdowns.
 * AC6: Calculation transparent (child can see why)
 */

import { type TrustFactor, type TrustFactorCategory } from './trustScore'
import { type ScoreBreakdown, getRecencyWeight } from './trustScoreCalculation'
import { getFactorDefinition } from './trustFactorDefinitions'

// ============================================================================
// Factor Contribution Formatting
// ============================================================================

/**
 * Format a factor's contribution for display.
 * Example: "Following time limits: +5"
 *
 * @param factor - The trust factor to format
 * @returns Formatted string showing description and points
 */
export function formatFactorContribution(factor: TrustFactor): string {
  const sign = factor.value >= 0 ? '+' : ''
  return `${factor.description}: ${sign}${factor.value}`
}

/**
 * Format a factor's contribution with recency info.
 * Example: "Following time limits: +5 (this week)"
 *
 * @param factor - The trust factor to format
 * @param referenceDate - Reference date for recency calculation
 * @returns Formatted string with recency context
 */
export function formatFactorWithRecency(
  factor: TrustFactor,
  referenceDate: Date = new Date()
): string {
  const sign = factor.value >= 0 ? '+' : ''
  const weight = getRecencyWeight(factor.occurredAt, referenceDate)

  let recencyLabel: string
  if (weight === 1.0) {
    recencyLabel = 'this week'
  } else if (weight === 0.75) {
    recencyLabel = 'last 2 weeks'
  } else if (weight === 0.5) {
    recencyLabel = 'last 30 days'
  } else {
    recencyLabel = 'over 30 days ago'
  }

  return `${factor.description}: ${sign}${factor.value} (${recencyLabel})`
}

/**
 * Format a list of factors for display.
 *
 * @param factors - Array of trust factors
 * @returns Array of formatted strings
 */
export function formatFactorList(factors: TrustFactor[]): string[] {
  return factors.map(formatFactorContribution)
}

// ============================================================================
// Score Change Formatting
// ============================================================================

/**
 * Format a score change for display.
 * Examples: "Up 5 points", "Down 3 points", "No change"
 *
 * @param delta - The score change amount
 * @returns Human-readable score change text
 */
export function formatScoreChange(delta: number): string {
  if (delta === 0) {
    return 'No change'
  }

  const absValue = Math.abs(delta)
  const direction = delta > 0 ? 'Up' : 'Down'
  const plural = absValue === 1 ? 'point' : 'points'

  return `${direction} ${absValue} ${plural}`
}

/**
 * Format a score change with trend context.
 * Examples: "Up 5 points this week", "Down 3 points today"
 *
 * @param delta - The score change amount
 * @param period - Time period description (e.g., "today", "this week", "this month")
 * @returns Human-readable score change with period
 */
export function formatScoreChangeWithPeriod(delta: number, period: string): string {
  const change = formatScoreChange(delta)
  if (delta === 0) {
    return `${change} ${period}`
  }
  return `${change} ${period}`
}

// ============================================================================
// Category Contribution Formatting
// ============================================================================

/**
 * Get formatted text for a category's contribution.
 *
 * @param category - The factor category
 * @param points - Points from this category
 * @returns Formatted category contribution text
 */
export function getCategoryContributionText(category: TrustFactorCategory, points: number): string {
  const sign = points >= 0 ? '+' : ''
  const absPoints = Math.abs(points)
  const plural = absPoints === 1 ? 'point' : 'points'

  switch (category) {
    case 'positive':
      return points === 0
        ? 'Good behaviors: no change'
        : `Good behaviors: ${sign}${points} ${plural}`
    case 'neutral':
      return 'Normal usage: no impact'
    case 'concerning':
      return points === 0 ? 'Concerns: none' : `Concerns: ${points} ${plural}`
  }
}

/**
 * Get an encouraging label for a category.
 *
 * @param category - The factor category
 * @returns Child-friendly label for the category
 */
export function getCategoryLabel(category: TrustFactorCategory): string {
  switch (category) {
    case 'positive':
      return 'Things you did well'
    case 'neutral':
      return 'Normal activities'
    case 'concerning':
      return 'Things to work on'
  }
}

// ============================================================================
// Breakdown Text Generation
// ============================================================================

/**
 * Generate a full breakdown text for display.
 * Provides transparent explanation of score calculation.
 *
 * @param breakdown - The score breakdown object
 * @returns Array of human-readable breakdown lines
 */
export function generateBreakdownText(breakdown: ScoreBreakdown): string[] {
  const lines: string[] = []

  // Positive contribution
  if (breakdown.positivePoints > 0) {
    lines.push(getCategoryContributionText('positive', breakdown.positivePoints))
  } else {
    lines.push('Good behaviors: none recorded')
  }

  // Neutral contribution (usually 0, so just mention if present)
  if (breakdown.neutralPoints !== 0) {
    lines.push(getCategoryContributionText('neutral', breakdown.neutralPoints))
  }

  // Concerning contribution
  if (breakdown.concerningPoints < 0) {
    lines.push(getCategoryContributionText('concerning', breakdown.concerningPoints))
  } else {
    lines.push('Concerns: none')
  }

  // Final change
  lines.push('')
  lines.push(`Net change: ${formatScoreChange(breakdown.finalDelta)}`)

  return lines
}

/**
 * Generate a summary breakdown for quick view.
 *
 * @param breakdown - The score breakdown object
 * @returns Single-line summary
 */
export function generateBreakdownSummary(breakdown: ScoreBreakdown): string {
  const parts: string[] = []

  if (breakdown.positivePoints > 0) {
    parts.push(`+${breakdown.positivePoints} good`)
  }
  if (breakdown.concerningPoints < 0) {
    parts.push(`${breakdown.concerningPoints} concerns`)
  }

  if (parts.length === 0) {
    return 'No changes'
  }

  return parts.join(', ')
}

// ============================================================================
// Factor Type Labels
// ============================================================================

/**
 * Get a child-friendly label for a factor type.
 *
 * @param type - The factor type
 * @returns Human-readable label
 */
export function getFactorTypeLabel(type: TrustFactor['type']): string {
  const definition = getFactorDefinition(type)
  if (definition) {
    return definition.description
  }

  // Fallback labels
  switch (type) {
    case 'time-limit-compliance':
      return 'Following time limits'
    case 'focus-mode-usage':
      return 'Using focus mode'
    case 'no-bypass-attempts':
      return 'No bypass attempts'
    case 'normal-app-usage':
      return 'Normal app usage'
    case 'bypass-attempt':
      return 'Bypass attempt detected'
    case 'monitoring-disabled':
      return 'Monitoring was disabled'
    default:
      return String(type)
  }
}

// ============================================================================
// Tips and Guidance
// ============================================================================

/**
 * Generate improvement tips based on factors.
 *
 * @param concerningFactors - Array of concerning factors
 * @returns Array of improvement tip strings
 */
export function generateImprovementTips(concerningFactors: TrustFactor[]): string[] {
  const tips: string[] = []

  const hasBypassAttempt = concerningFactors.some((f) => f.type === 'bypass-attempt')
  const hasMonitoringDisabled = concerningFactors.some((f) => f.type === 'monitoring-disabled')

  if (hasBypassAttempt) {
    tips.push('To improve: avoid trying to get around the rules')
  }
  if (hasMonitoringDisabled) {
    tips.push('To improve: keep monitoring enabled')
  }

  if (tips.length === 0 && concerningFactors.length > 0) {
    tips.push('To improve: stick to the agreement for 2 weeks')
  }

  if (tips.length === 0) {
    tips.push('Keep up the good work!')
  }

  return tips
}

/**
 * Generate encouragement based on score trend.
 *
 * @param currentScore - Current trust score
 * @param previousScore - Previous trust score
 * @returns Encouraging message
 */
export function generateEncouragement(currentScore: number, previousScore: number): string {
  const delta = currentScore - previousScore

  if (delta > 0) {
    if (currentScore >= 90) {
      return "Amazing progress! You're doing great!"
    }
    if (currentScore >= 80) {
      return "Great job! You're building trust."
    }
    return 'Nice work! Your score is improving.'
  }

  if (delta < 0) {
    return 'Remember, you can always improve. Every day is a new chance!'
  }

  if (currentScore >= 80) {
    return 'Keep it up! Your trust score is strong.'
  }

  return "You're doing well. Keep going!"
}
