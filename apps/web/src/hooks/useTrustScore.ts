/**
 * useTrustScore Hook - Story 36.1
 *
 * Hook for managing trust score state in components.
 * AC1: Schema includes childId, currentScore, history, factors
 * AC4: History tracks score changes
 * AC5: Factors breakdown
 * AC6: Daily update restriction
 */

import { useState, useMemo, useCallback } from 'react'
import { type TrustScore, type TrustScoreHistoryEntry, type TrustFactor } from '@fledgely/shared'
import {
  initializeTrustScore,
  canUpdateScore,
  getTrustScoreHistory,
} from '../services/trustScoreService'

// ============================================================================
// Types
// ============================================================================

export interface UseTrustScoreParams {
  /** Child's unique identifier */
  childId: string
  /** Initial trust score data (optional) */
  initialTrustScore?: TrustScore
}

export interface UseTrustScoreResult {
  /** Current trust score value */
  currentScore: number
  /** Score change history */
  scoreHistory: TrustScoreHistoryEntry[]
  /** All current factors */
  currentFactors: TrustFactor[]
  /** Positive factors only */
  positiveFactors: TrustFactor[]
  /** Concerning factors only */
  concerningFactors: TrustFactor[]
  /** Loading state */
  isLoading: boolean
  /** When score was last updated */
  lastUpdatedAt: Date | null
  /** Whether daily update is possible */
  canUpdate: boolean
  /** Refresh score data */
  refreshScore: () => void
}

// ============================================================================
// Hook Implementation
// ============================================================================

/**
 * Hook for managing trust score state.
 *
 * @param params - Hook parameters including childId and optional initial data
 * @returns Trust score state and actions
 */
export function useTrustScore({
  childId,
  initialTrustScore,
}: UseTrustScoreParams): UseTrustScoreResult {
  // Initialize or use provided trust score
  const [trustScore, _setTrustScore] = useState<TrustScore>(() => {
    return initialTrustScore ?? initializeTrustScore(childId)
  })

  const [isLoading, setIsLoading] = useState(false)

  // Current score value
  const currentScore = trustScore.currentScore

  // Score history (sorted by date descending)
  const scoreHistory = useMemo(() => getTrustScoreHistory(trustScore), [trustScore])

  // All current factors
  const currentFactors = useMemo(() => [...trustScore.factors], [trustScore.factors])

  // Positive factors only (AC5)
  const positiveFactors = useMemo(
    () => trustScore.factors.filter((f) => f.category === 'positive'),
    [trustScore.factors]
  )

  // Concerning factors only (AC5)
  const concerningFactors = useMemo(
    () => trustScore.factors.filter((f) => f.category === 'concerning'),
    [trustScore.factors]
  )

  // Last updated timestamp
  const lastUpdatedAt = trustScore.lastUpdatedAt

  // Can update check (AC6)
  const canUpdate = useMemo(
    () => canUpdateScore(trustScore.lastUpdatedAt),
    [trustScore.lastUpdatedAt]
  )

  // Refresh score function
  const refreshScore = useCallback(() => {
    setIsLoading(true)
    // In a real implementation, this would fetch from API
    // For now, just update the loading state
    setIsLoading(false)
  }, [])

  return {
    currentScore,
    scoreHistory,
    currentFactors,
    positiveFactors,
    concerningFactors,
    isLoading,
    lastUpdatedAt,
    canUpdate,
    refreshScore,
  }
}
