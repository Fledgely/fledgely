/**
 * useCommunicationMetrics Hook - Story 34.5.1 Task 5
 *
 * Hook for accessing communication health metrics.
 * AC5: Family Communication Metrics
 *
 * CRITICAL SAFETY:
 * - Family-visible metrics for transparency
 * - Empowers children by surfacing communication patterns
 * - Supports both parent and child viewers
 */

import { useState, useEffect, useCallback } from 'react'
import { getRejectionPattern } from '@fledgely/shared'

/**
 * Communication health metrics.
 */
export interface CommunicationMetrics {
  /** Total proposals submitted by child */
  totalProposals: number
  /** Total rejections received */
  totalRejections: number
  /** Rejections within the 90-day rolling window */
  rejectionsInWindow: number
  /** Rejection rate as a percentage */
  rejectionRate: number
  /** Whether escalation has been triggered */
  escalationTriggered: boolean
  /** Communication trend assessment */
  trend: 'improving' | 'stable' | 'needs-attention'
}

/**
 * Return type for useCommunicationMetrics hook.
 */
export interface UseCommunicationMetricsReturn {
  /** Calculated metrics or null if no data */
  metrics: CommunicationMetrics | null
  /** Loading state */
  loading: boolean
  /** Error if fetch failed */
  error: Error | null
  /** Refetch function */
  refetch: () => void
}

/**
 * Calculate trend based on pattern data.
 *
 * @param pattern - Rejection pattern data
 * @param rejectionRate - Calculated rejection rate
 * @returns Trend assessment
 */
function calculateTrend(
  pattern: {
    escalationTriggered: boolean
    rejectionsInWindow: number
    totalRejections: number
  },
  rejectionRate: number
): 'improving' | 'stable' | 'needs-attention' {
  // Escalation triggered = needs attention
  if (pattern.escalationTriggered) {
    return 'needs-attention'
  }

  // High rejection rate (> 50%) = needs attention
  if (rejectionRate > 50) {
    return 'needs-attention'
  }

  // No recent rejections = improving
  if (pattern.rejectionsInWindow === 0 && pattern.totalRejections > 0) {
    return 'improving'
  }

  // Otherwise stable
  return 'stable'
}

/**
 * Hook for accessing communication health metrics.
 *
 * @param _familyId - Family ID (reserved for future use with family-level queries)
 * @param childId - Child ID
 * @returns Communication metrics, loading state, and error
 */
export function useCommunicationMetrics(
  _familyId: string,
  childId: string
): UseCommunicationMetricsReturn {
  const [metrics, setMetrics] = useState<CommunicationMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchMetrics = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const pattern = await getRejectionPattern(childId)

      if (!pattern) {
        setMetrics(null)
        return
      }

      // Calculate rejection rate (avoid division by zero)
      const rejectionRate =
        pattern.totalProposals > 0
          ? Math.round((pattern.totalRejections / pattern.totalProposals) * 100)
          : 0

      // Calculate trend
      const trend = calculateTrend(
        {
          escalationTriggered: pattern.escalationTriggered,
          rejectionsInWindow: pattern.rejectionsInWindow,
          totalRejections: pattern.totalRejections,
        },
        rejectionRate
      )

      setMetrics({
        totalProposals: pattern.totalProposals,
        totalRejections: pattern.totalRejections,
        rejectionsInWindow: pattern.rejectionsInWindow,
        rejectionRate,
        escalationTriggered: pattern.escalationTriggered,
        trend,
      })
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch metrics'))
      setMetrics(null)
    } finally {
      setLoading(false)
    }
  }, [childId])

  useEffect(() => {
    fetchMetrics()
  }, [fetchMetrics])

  return {
    metrics,
    loading,
    error,
    refetch: fetchMetrics,
  }
}
