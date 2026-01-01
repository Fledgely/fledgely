/**
 * Trust Score Service - Story 36.1
 *
 * Service for managing trust score data operations.
 * AC1: Schema includes childId, currentScore, history, factors
 * AC4: History tracks score changes over time
 * AC6: Score updates daily (not real-time)
 */

import {
  TRUST_SCORE_DEFAULT,
  type TrustScore,
  type TrustScoreHistoryEntry,
  type TrustFactor,
} from '@fledgely/shared'

// ============================================================================
// Constants
// ============================================================================

/** Minimum hours between score updates (AC6: daily updates) */
const UPDATE_INTERVAL_HOURS = 24

// ============================================================================
// Initialize Trust Score
// ============================================================================

/**
 * Create a new trust score for a child with default starting value.
 *
 * @param childId - The child's unique identifier
 * @returns Initialized trust score with default value (70)
 */
export function initializeTrustScore(childId: string): TrustScore {
  const now = new Date()

  return {
    id: `ts-${childId}-${now.getTime()}`,
    childId,
    currentScore: TRUST_SCORE_DEFAULT,
    history: [],
    factors: [],
    lastUpdatedAt: now,
    createdAt: now,
  }
}

// ============================================================================
// Get Trust Score
// ============================================================================

/**
 * Retrieve trust score for a child.
 *
 * @param childId - The child's unique identifier
 * @param trustScore - The trust score object to check
 * @returns Trust score if childId matches, null otherwise
 */
export function getTrustScore(childId: string, trustScore: TrustScore | null): TrustScore | null {
  if (!trustScore) {
    return null
  }

  if (trustScore.childId !== childId) {
    return null
  }

  return trustScore
}

// ============================================================================
// Get Trust Score History (AC4)
// ============================================================================

/**
 * Get score history with optional limit.
 * Returns most recent entries first.
 *
 * @param trustScore - The trust score object
 * @param limit - Optional limit on number of entries
 * @returns Array of history entries, most recent first
 */
export function getTrustScoreHistory(
  trustScore: TrustScore,
  limit?: number
): TrustScoreHistoryEntry[] {
  // Sort by date descending (most recent first)
  const sorted = [...trustScore.history].sort((a, b) => b.date.getTime() - a.date.getTime())

  if (limit && limit > 0) {
    return sorted.slice(0, limit)
  }

  return sorted
}

// ============================================================================
// Get Factors Breakdown (AC5)
// ============================================================================

/**
 * Get current factors contributing to score.
 *
 * @param trustScore - The trust score object
 * @returns Array of all factors
 */
export function getFactorsBreakdown(trustScore: TrustScore): TrustFactor[] {
  return [...trustScore.factors]
}

// ============================================================================
// Add Factor to Score
// ============================================================================

/**
 * Add a new factor to the trust score.
 * Does not mutate the original object.
 *
 * @param trustScore - The trust score object
 * @param factor - The factor to add
 * @returns New trust score with factor added
 */
export function addFactorToScore(trustScore: TrustScore, factor: TrustFactor): TrustScore {
  return {
    ...trustScore,
    factors: [...trustScore.factors, factor],
  }
}

// ============================================================================
// Can Update Score (AC6)
// ============================================================================

/**
 * Check if daily update is due.
 * Enforces AC6: score updates daily (not real-time).
 *
 * @param lastUpdatedAt - When score was last updated
 * @returns True if 24+ hours have passed since last update
 */
export function canUpdateScore(lastUpdatedAt: Date | null): boolean {
  if (!lastUpdatedAt) {
    return true
  }

  const now = new Date()
  const hoursSinceUpdate = (now.getTime() - lastUpdatedAt.getTime()) / (1000 * 60 * 60)

  return hoursSinceUpdate >= UPDATE_INTERVAL_HOURS
}

// ============================================================================
// Create History Entry (AC4)
// ============================================================================

/**
 * Create a history entry for tracking score changes.
 *
 * @param score - New score after change
 * @param previousScore - Score before change
 * @param reason - Reason for the change
 * @param factors - Factors that contributed to change
 * @returns New history entry
 */
export function createHistoryEntry(
  score: number,
  previousScore: number,
  reason: string,
  factors: TrustFactor[]
): TrustScoreHistoryEntry {
  return {
    date: new Date(),
    score,
    previousScore,
    reason,
    factors: [...factors],
  }
}
