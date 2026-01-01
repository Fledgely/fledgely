/**
 * useBypassAttempts Hook - Story 36.5 Task 6
 *
 * React hook for managing bypass attempt data.
 * AC1: Log bypass attempts with timestamp and context
 * AC3: Bypass attempts expire after configurable period
 * AC4: Child can see their own bypass attempt history
 */

import { useState, useMemo, useCallback, useEffect } from 'react'
import { type BypassAttempt, markAsUnintentional } from '@fledgely/shared'

// ============================================================================
// Types
// ============================================================================

export interface UseBypassAttemptsOptions {
  /** Child ID to fetch attempts for */
  childId: string
  /** Initial data for SSR or testing */
  initialData?: BypassAttempt[]
}

export interface UseBypassAttemptsResult {
  /** All bypass attempts (including expired) */
  attempts: BypassAttempt[]
  /** Only active (non-expired) attempts */
  activeAttempts: BypassAttempt[]
  /** Number of active attempts */
  activeCount: number
  /** Number of expired attempts */
  expiredCount: number
  /** Total impact from active attempts */
  totalImpact: number
  /** Loading state */
  isLoading: boolean
  /** Error state */
  error: Error | null
  /** Mark an attempt as accidental */
  markAsAccidental: (attemptId: string) => void
  /** Refresh data from server */
  refresh: () => void
}

// ============================================================================
// Helpers
// ============================================================================

function isExpired(attempt: BypassAttempt): boolean {
  return new Date() > attempt.expiresAt
}

// ============================================================================
// Hook
// ============================================================================

export function useBypassAttempts({
  childId,
  initialData = [],
}: UseBypassAttemptsOptions): UseBypassAttemptsResult {
  const [attempts, setAttempts] = useState<BypassAttempt[]>(initialData)
  const [isLoading, setIsLoading] = useState(false)
  const [error] = useState<Error | null>(null)

  // Reset when childId changes
  useEffect(() => {
    setAttempts(initialData)
  }, [childId, initialData])

  // Filter active attempts
  const activeAttempts = useMemo(() => attempts.filter((a) => !isExpired(a)), [attempts])

  // Calculate counts
  const activeCount = activeAttempts.length
  const expiredCount = attempts.length - activeCount

  // Calculate total impact from active attempts
  const totalImpact = useMemo(
    () => activeAttempts.reduce((sum, a) => sum + a.impactOnScore, 0),
    [activeAttempts]
  )

  // Mark attempt as accidental (optimistic update)
  const markAsAccidental = useCallback((attemptId: string) => {
    setAttempts((prev) =>
      prev.map((attempt) => {
        if (attempt.id === attemptId) {
          return markAsUnintentional(attempt)
        }
        return attempt
      })
    )

    // TODO: Sync with server
    // In a real implementation, this would call an API endpoint
  }, [])

  // Refresh data from server
  const refresh = useCallback(() => {
    // TODO: Implement server fetch
    // In a real implementation, this would fetch fresh data
    setIsLoading(true)
    // Simulate async operation
    setTimeout(() => {
      setIsLoading(false)
    }, 0)
  }, [])

  return {
    attempts,
    activeAttempts,
    activeCount,
    expiredCount,
    totalImpact,
    isLoading,
    error,
    markAsAccidental,
    refresh,
  }
}
