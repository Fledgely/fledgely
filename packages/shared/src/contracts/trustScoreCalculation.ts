/**
 * Trust Score Calculation - Story 36.2
 *
 * Constants, types, and utilities for calculating trust scores.
 * AC4: Calculation weighted toward recent behavior (last 30 days)
 * AC5: Starting score: 70 (benefit of the doubt)
 * AC6: Calculation transparent (child can see why)
 */

import { z } from 'zod'
import { type TrustFactor, TRUST_SCORE_MIN, TRUST_SCORE_MAX } from './trustScore'

// ============================================================================
// Recency Weight Constants (AC4)
// ============================================================================

/** Full weight for factors in the last 7 days */
export const RECENCY_WEIGHT_LAST_7_DAYS = 1.0

/** 75% weight for factors 8-14 days old */
export const RECENCY_WEIGHT_LAST_14_DAYS = 0.75

/** 50% weight for factors 15-30 days old */
export const RECENCY_WEIGHT_LAST_30_DAYS = 0.5

/** 25% weight for factors older than 30 days */
export const RECENCY_WEIGHT_OLDER = 0.25

/** Number of days for recency periods */
export const RECENCY_DAYS_7 = 7
export const RECENCY_DAYS_14 = 14
export const RECENCY_DAYS_30 = 30

// ============================================================================
// Score Change Limits
// ============================================================================

/** Maximum daily score increase (prevents gaming) */
export const MAX_DAILY_INCREASE = 5

/** Maximum daily score decrease (concerning logged, not punished harshly) */
export const MAX_DAILY_DECREASE = 10

// ============================================================================
// Score Breakdown Schema (AC6)
// ============================================================================

/**
 * Breakdown of how score was calculated.
 * Provides transparency for child to see why score changed.
 */
export const scoreBreakdownSchema = z.object({
  /** Total points from positive factors */
  positivePoints: z.number(),
  /** Total points from neutral factors */
  neutralPoints: z.number(),
  /** Total points from concerning factors */
  concerningPoints: z.number(),
  /** Recency multiplier applied */
  recencyMultiplier: z.number(),
  /** Final delta after all calculations */
  finalDelta: z.number(),
})

export type ScoreBreakdown = z.infer<typeof scoreBreakdownSchema>

// ============================================================================
// Score Calculation Result Schema
// ============================================================================

/**
 * Result of a score calculation.
 * Contains new score, breakdown, and all metadata for transparency.
 */
export const scoreCalculationResultSchema = z.object({
  /** New score after calculation */
  newScore: z.number().min(TRUST_SCORE_MIN).max(TRUST_SCORE_MAX),
  /** Previous score before calculation */
  previousScore: z.number().min(TRUST_SCORE_MIN).max(TRUST_SCORE_MAX),
  /** Factors that were applied */
  factorsApplied: z.array(z.any()), // TrustFactor array
  /** Detailed breakdown of calculation */
  breakdown: scoreBreakdownSchema,
  /** When calculation was performed */
  calculatedAt: z.date(),
})

export type ScoreCalculationResult = z.infer<typeof scoreCalculationResultSchema>

// ============================================================================
// Recency Weight Calculation (AC4)
// ============================================================================

/**
 * Get the recency weight for a factor based on when it occurred.
 * Recent behavior has more impact than older behavior.
 *
 * @param occurredAt - When the factor occurred
 * @param referenceDate - Reference date for calculation (defaults to now)
 * @returns Weight multiplier (0.25 to 1.0)
 */
export function getRecencyWeight(occurredAt: Date, referenceDate: Date = new Date()): number {
  const msPerDay = 1000 * 60 * 60 * 24
  const daysDiff = (referenceDate.getTime() - occurredAt.getTime()) / msPerDay

  if (daysDiff <= RECENCY_DAYS_7) {
    return RECENCY_WEIGHT_LAST_7_DAYS
  }
  if (daysDiff <= RECENCY_DAYS_14) {
    return RECENCY_WEIGHT_LAST_14_DAYS
  }
  if (daysDiff <= RECENCY_DAYS_30) {
    return RECENCY_WEIGHT_LAST_30_DAYS
  }
  return RECENCY_WEIGHT_OLDER
}

/**
 * Apply recency weight to a factor's points.
 *
 * @param factor - The trust factor to weight
 * @param referenceDate - Reference date for calculation (defaults to now)
 * @returns Weighted point value
 */
export function applyRecencyWeight(factor: TrustFactor, referenceDate: Date = new Date()): number {
  const weight = getRecencyWeight(factor.occurredAt, referenceDate)
  return Math.round(factor.value * weight * 100) / 100 // Round to 2 decimal places
}

// ============================================================================
// Score Calculation Utilities
// ============================================================================

/**
 * Calculate the contribution from positive factors.
 *
 * @param factors - Array of trust factors
 * @param referenceDate - Reference date for recency calculation
 * @returns Sum of weighted positive factor points
 */
export function getPositiveContribution(
  factors: TrustFactor[],
  referenceDate: Date = new Date()
): number {
  return factors
    .filter((f) => f.category === 'positive')
    .reduce((sum, f) => sum + applyRecencyWeight(f, referenceDate), 0)
}

/**
 * Calculate the contribution from neutral factors.
 *
 * @param factors - Array of trust factors
 * @param referenceDate - Reference date for recency calculation
 * @returns Sum of weighted neutral factor points (usually 0)
 */
export function getNeutralContribution(
  factors: TrustFactor[],
  referenceDate: Date = new Date()
): number {
  return factors
    .filter((f) => f.category === 'neutral')
    .reduce((sum, f) => sum + applyRecencyWeight(f, referenceDate), 0)
}

/**
 * Calculate the contribution from concerning factors.
 *
 * @param factors - Array of trust factors
 * @param referenceDate - Reference date for recency calculation
 * @returns Sum of weighted concerning factor points (negative)
 */
export function getConcerningContribution(
  factors: TrustFactor[],
  referenceDate: Date = new Date()
): number {
  return factors
    .filter((f) => f.category === 'concerning')
    .reduce((sum, f) => sum + applyRecencyWeight(f, referenceDate), 0)
}

/**
 * Calculate the total factor contribution with recency weighting.
 *
 * @param factors - Array of trust factors
 * @param referenceDate - Reference date for recency calculation
 * @returns Total weighted contribution
 */
export function calculateWeightedFactorContribution(
  factors: TrustFactor[],
  referenceDate: Date = new Date()
): number {
  return factors.reduce((sum, f) => sum + applyRecencyWeight(f, referenceDate), 0)
}

/**
 * Generate a breakdown of how score was calculated.
 * Provides transparency for AC6.
 *
 * @param factors - Array of trust factors
 * @param referenceDate - Reference date for recency calculation
 * @returns Score breakdown object
 */
export function generateScoreBreakdown(
  factors: TrustFactor[],
  referenceDate: Date = new Date()
): ScoreBreakdown {
  const positivePoints = getPositiveContribution(factors, referenceDate)
  const neutralPoints = getNeutralContribution(factors, referenceDate)
  const concerningPoints = getConcerningContribution(factors, referenceDate)

  // Calculate average recency multiplier across all factors
  let recencyMultiplier = 1.0
  if (factors.length > 0) {
    const totalWeight = factors.reduce(
      (sum, f) => sum + getRecencyWeight(f.occurredAt, referenceDate),
      0
    )
    recencyMultiplier = Math.round((totalWeight / factors.length) * 100) / 100
  }

  const finalDelta = Math.round((positivePoints + neutralPoints + concerningPoints) * 100) / 100

  return {
    positivePoints: Math.round(positivePoints * 100) / 100,
    neutralPoints: Math.round(neutralPoints * 100) / 100,
    concerningPoints: Math.round(concerningPoints * 100) / 100,
    recencyMultiplier,
    finalDelta,
  }
}

/**
 * Clamp a delta to the daily change limits.
 *
 * @param delta - Raw score change
 * @returns Clamped delta within daily limits
 */
export function clampDailyDelta(delta: number): number {
  if (delta > MAX_DAILY_INCREASE) {
    return MAX_DAILY_INCREASE
  }
  if (delta < -MAX_DAILY_DECREASE) {
    return -MAX_DAILY_DECREASE
  }
  return delta
}

/**
 * Calculate a new trust score from current score and factors.
 *
 * @param currentScore - Current trust score
 * @param factors - Array of trust factors to apply
 * @param referenceDate - Reference date for recency calculation
 * @returns Calculation result with new score and breakdown
 */
export function calculateNewScore(
  currentScore: number,
  factors: TrustFactor[],
  referenceDate: Date = new Date()
): ScoreCalculationResult {
  const breakdown = generateScoreBreakdown(factors, referenceDate)

  // Clamp the delta to daily limits
  const clampedDelta = clampDailyDelta(breakdown.finalDelta)

  // Calculate new score and clamp to valid range
  let newScore = currentScore + clampedDelta
  if (newScore < TRUST_SCORE_MIN) {
    newScore = TRUST_SCORE_MIN
  }
  if (newScore > TRUST_SCORE_MAX) {
    newScore = TRUST_SCORE_MAX
  }

  return {
    newScore: Math.round(newScore * 100) / 100,
    previousScore: currentScore,
    factorsApplied: factors,
    breakdown: {
      ...breakdown,
      finalDelta: clampedDelta, // Use clamped delta in result
    },
    calculatedAt: referenceDate,
  }
}
