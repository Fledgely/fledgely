/**
 * Trust Score Types and Constants - Story 36.1
 *
 * Data model for trust scores to track and recognize responsible behavior.
 * AC1: Schema includes childId, currentScore, history, factors
 * AC2: Score range 0-100 (100 = highest trust)
 * AC3: Zod schema: trustScoreSchema in @fledgely/shared
 * AC4: History tracks score changes over time with reasons
 * AC5: Factors breakdown: which behaviors contributed
 * AC6: Score updates daily (not real-time)
 */

import { z } from 'zod'

// ============================================================================
// Score Range Constants (AC2)
// ============================================================================

/** Minimum trust score */
export const TRUST_SCORE_MIN = 0

/** Maximum trust score (highest trust) */
export const TRUST_SCORE_MAX = 100

/** Default starting score - benefit of the doubt */
export const TRUST_SCORE_DEFAULT = 70

// ============================================================================
// Trust Factor Type Schema (AC5)
// ============================================================================

/**
 * Types of factors that contribute to trust score.
 *
 * Positive: Time limit compliance, focus mode usage, no bypass attempts
 * Neutral: Normal app usage within limits
 * Concerning: Bypass attempts, disabled monitoring (logged not punished)
 */
export const trustFactorTypeSchema = z.enum([
  // Positive factors
  'time-limit-compliance',
  'focus-mode-usage',
  'no-bypass-attempts',
  // Neutral factors
  'normal-app-usage',
  // Concerning factors (logged for conversation, not punishment)
  'bypass-attempt',
  'monitoring-disabled',
])

export type TrustFactorType = z.infer<typeof trustFactorTypeSchema>

// ============================================================================
// Trust Factor Category Schema
// ============================================================================

/**
 * Categories for trust factors.
 *
 * - positive: Increases trust score
 * - neutral: No impact on score
 * - concerning: May decrease score (logged for conversation, not punishment)
 */
export const trustFactorCategorySchema = z.enum(['positive', 'neutral', 'concerning'])

export type TrustFactorCategory = z.infer<typeof trustFactorCategorySchema>

// ============================================================================
// Trust Factor Schema (AC5)
// ============================================================================

/**
 * Individual factor contributing to trust score.
 * Tracks what behaviors influenced the score and when.
 */
export const trustFactorSchema = z.object({
  /** Type of factor */
  type: trustFactorTypeSchema,
  /** Category (positive/neutral/concerning) */
  category: trustFactorCategorySchema,
  /** Points contributed (positive or negative) */
  value: z.number(),
  /** Human-readable description */
  description: z.string(),
  /** When the behavior occurred */
  occurredAt: z.date(),
})

export type TrustFactor = z.infer<typeof trustFactorSchema>

// ============================================================================
// Trust Score History Entry Schema (AC4)
// ============================================================================

/**
 * Historical entry for trust score changes.
 * Tracks score changes over time with reasons for transparency.
 */
export const trustScoreHistoryEntrySchema = z.object({
  /** Date of the score change */
  date: z.date(),
  /** New score after change */
  score: z.number().min(TRUST_SCORE_MIN).max(TRUST_SCORE_MAX),
  /** Score before change */
  previousScore: z.number().min(TRUST_SCORE_MIN).max(TRUST_SCORE_MAX),
  /** Reason for the change (transparent to child) */
  reason: z.string(),
  /** Factors that contributed to this change */
  factors: z.array(trustFactorSchema),
})

export type TrustScoreHistoryEntry = z.infer<typeof trustScoreHistoryEntrySchema>

// ============================================================================
// Main Trust Score Schema (AC1, AC3)
// ============================================================================

/**
 * Complete trust score for a child.
 * Includes current score, history, and contributing factors.
 */
export const trustScoreSchema = z.object({
  /** Unique identifier for this trust score record */
  id: z.string(),
  /** Child this score belongs to */
  childId: z.string(),
  /** Current trust score (0-100) */
  currentScore: z.number().min(TRUST_SCORE_MIN).max(TRUST_SCORE_MAX),
  /** History of score changes over time */
  history: z.array(trustScoreHistoryEntrySchema),
  /** Current factors contributing to score */
  factors: z.array(trustFactorSchema),
  /** When score was last updated (daily updates - AC6) */
  lastUpdatedAt: z.date(),
  /** When this record was created */
  createdAt: z.date(),
})

export type TrustScore = z.infer<typeof trustScoreSchema>
