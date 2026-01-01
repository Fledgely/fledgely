/**
 * useScoreCalculation Hook - Story 36.2
 *
 * Hook for managing score calculation state in components.
 * AC1-3: Factor category contributions
 * AC4: Recency-weighted calculation
 * AC5: Starting score 70
 * AC6: Transparent calculation
 */

import { useMemo, useCallback } from 'react'
import {
  type TrustScore,
  type TrustFactor,
  type ScoreBreakdown,
  type ScoreCalculationResult,
} from '@fledgely/shared'
import {
  calculateProjectedScore,
  getScoreBreakdown,
  getBreakdownDisplayText,
  getBreakdownSummaryText,
  getPositiveFactorContribution,
  getConcerningFactorContribution,
  validateDailyUpdateTiming,
  getImprovementTips,
  getEncouragementMessage,
  calculateScoreTrend,
  checkScoreMilestone,
  formatMilestoneMessage,
} from '../services/trustScoreCalculationService'

// ============================================================================
// Types
// ============================================================================

export interface UseScoreCalculationParams {
  /** Current trust score object */
  trustScore: TrustScore
  /** Pending factors to preview calculation */
  pendingFactors?: TrustFactor[]
}

export interface UseScoreCalculationResult {
  /** Current score value */
  currentScore: number
  /** Projected score after pending factors */
  projectedScore: number
  /** Score breakdown for transparency */
  breakdown: ScoreBreakdown
  /** Human-readable breakdown text */
  breakdownText: string[]
  /** Brief summary text */
  breakdownSummary: string
  /** Points from positive factors */
  positiveContribution: number
  /** Points from concerning factors (negative) */
  concerningContribution: number
  /** Whether daily update is allowed */
  canRecalculate: boolean
  /** Calculate new score from pending factors */
  recalculate: () => ScoreCalculationResult
  /** Score change since last update */
  lastChange: number
  /** Improvement tips based on concerning factors */
  improvementTips: string[]
  /** Encouragement message based on trend */
  encouragement: string
  /** Weekly score trend */
  weeklyTrend: number
  /** Monthly score trend */
  monthlyTrend: number
  /** Milestone message if one was crossed */
  milestoneMessage: string | null
}

// ============================================================================
// Hook Implementation
// ============================================================================

/**
 * Hook for managing score calculation state.
 *
 * @param params - Hook parameters including trust score and pending factors
 * @returns Score calculation state and actions
 */
export function useScoreCalculation({
  trustScore,
  pendingFactors = [],
}: UseScoreCalculationParams): UseScoreCalculationResult {
  // Current score value
  const currentScore = trustScore.currentScore

  // Calculate projected score from pending factors
  const projectionResult = useMemo(
    () => calculateProjectedScore(currentScore, pendingFactors),
    [currentScore, pendingFactors]
  )

  const projectedScore = projectionResult.newScore

  // Score breakdown for transparency (AC6)
  const breakdown = useMemo(() => getScoreBreakdown(pendingFactors), [pendingFactors])

  // Human-readable breakdown text
  const breakdownText = useMemo(() => getBreakdownDisplayText(breakdown), [breakdown])

  // Brief summary
  const breakdownSummary = useMemo(() => getBreakdownSummaryText(breakdown), [breakdown])

  // Factor contributions by category
  const positiveContribution = useMemo(
    () => getPositiveFactorContribution(pendingFactors),
    [pendingFactors]
  )

  const concerningContribution = useMemo(
    () => getConcerningFactorContribution(pendingFactors),
    [pendingFactors]
  )

  // Can we perform a daily update?
  const canRecalculate = useMemo(
    () => validateDailyUpdateTiming(trustScore.lastUpdatedAt),
    [trustScore.lastUpdatedAt]
  )

  // Calculate score from pending factors
  const recalculate = useCallback((): ScoreCalculationResult => {
    return calculateProjectedScore(currentScore, pendingFactors)
  }, [currentScore, pendingFactors])

  // Last score change
  const lastChange = useMemo(() => {
    if (trustScore.history.length === 0) {
      return 0
    }
    const lastEntry = trustScore.history[trustScore.history.length - 1]
    return lastEntry.score - lastEntry.previousScore
  }, [trustScore.history])

  // Concerning factors from pending
  const concerningFactors = useMemo(
    () => pendingFactors.filter((f) => f.category === 'concerning'),
    [pendingFactors]
  )

  // Improvement tips
  const improvementTips = useMemo(() => getImprovementTips(concerningFactors), [concerningFactors])

  // Get previous score for encouragement
  const previousScore = useMemo(() => {
    if (trustScore.history.length === 0) {
      return currentScore
    }
    return trustScore.history[trustScore.history.length - 1].previousScore
  }, [trustScore.history, currentScore])

  // Encouragement message
  const encouragement = useMemo(
    () => getEncouragementMessage(currentScore, previousScore),
    [currentScore, previousScore]
  )

  // Weekly trend
  const weeklyTrend = useMemo(
    () => calculateScoreTrend(trustScore.history, 7),
    [trustScore.history]
  )

  // Monthly trend
  const monthlyTrend = useMemo(
    () => calculateScoreTrend(trustScore.history, 30),
    [trustScore.history]
  )

  // Milestone message
  const milestoneMessage = useMemo(() => {
    const milestone = checkScoreMilestone(previousScore, currentScore)
    if (milestone) {
      return formatMilestoneMessage(milestone.milestone, milestone.direction)
    }
    return null
  }, [previousScore, currentScore])

  return {
    currentScore,
    projectedScore,
    breakdown,
    breakdownText,
    breakdownSummary,
    positiveContribution,
    concerningContribution,
    canRecalculate,
    recalculate,
    lastChange,
    improvementTips,
    encouragement,
    weeklyTrend,
    monthlyTrend,
    milestoneMessage,
  }
}
