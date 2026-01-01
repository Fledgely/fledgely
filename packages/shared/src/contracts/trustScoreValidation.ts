/**
 * Trust Score Validation - Story 36.1
 *
 * Validation utilities for trust score operations.
 * AC2: Score range 0-100
 * AC6: Score updates daily
 */

import {
  TRUST_SCORE_MIN,
  TRUST_SCORE_MAX,
  trustScoreSchema,
  trustFactorSchema,
  type TrustScore,
  type TrustFactor,
} from './trustScore'

// ============================================================================
// Constants
// ============================================================================

/** Hours between score updates (AC6) */
const UPDATE_INTERVAL_HOURS = 24

// ============================================================================
// Score Validation (AC2)
// ============================================================================

/**
 * Check if a score is within the valid range (0-100).
 *
 * @param score - The score to validate
 * @returns True if score is between 0 and 100 (inclusive)
 */
export function isValidScore(score: number): boolean {
  return score >= TRUST_SCORE_MIN && score <= TRUST_SCORE_MAX
}

/**
 * Clamp a score to the valid range (0-100).
 *
 * @param score - The score to clamp
 * @returns Score clamped between 0 and 100
 */
export function clampScore(score: number): number {
  if (score < TRUST_SCORE_MIN) {
    return TRUST_SCORE_MIN
  }
  if (score > TRUST_SCORE_MAX) {
    return TRUST_SCORE_MAX
  }
  return score
}

// ============================================================================
// Trust Score Validation
// ============================================================================

/**
 * Result of a validation operation.
 */
export type ValidationResult<T> = { success: true; data: T } | { success: false; error: string }

/**
 * Validate a complete trust score object using Zod schema.
 *
 * @param data - The data to validate
 * @returns Validation result with data or error
 */
export function validateTrustScore(data: unknown): ValidationResult<TrustScore> {
  const result = trustScoreSchema.safeParse(data)

  if (result.success) {
    return { success: true, data: result.data }
  }

  return {
    success: false,
    error: result.error.issues.map((i) => i.message).join(', '),
  }
}

/**
 * Validate a single trust factor using Zod schema.
 *
 * @param data - The factor data to validate
 * @returns Validation result with data or error
 */
export function validateFactor(data: unknown): ValidationResult<TrustFactor> {
  const result = trustFactorSchema.safeParse(data)

  if (result.success) {
    return { success: true, data: result.data }
  }

  return {
    success: false,
    error: result.error.issues.map((i) => i.message).join(', '),
  }
}

// ============================================================================
// Update Timing (AC6)
// ============================================================================

/**
 * Check if a score update is due based on last update time.
 * Enforces daily update restriction.
 *
 * @param lastUpdatedAt - When the score was last updated
 * @returns True if 24 hours have passed since last update
 */
export function isScoreUpdateDue(lastUpdatedAt: Date | null): boolean {
  if (!lastUpdatedAt) {
    return true
  }

  const now = new Date()
  const hoursSinceUpdate = (now.getTime() - lastUpdatedAt.getTime()) / (1000 * 60 * 60)

  return hoursSinceUpdate >= UPDATE_INTERVAL_HOURS
}
