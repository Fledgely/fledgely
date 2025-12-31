/**
 * useFlagsQuery Hook - Story 22.1
 *
 * Custom hook for fetching and subscribing to flags with real-time updates.
 *
 * Acceptance Criteria:
 * - AC3: Calculate pending count for badge
 * - AC6: Real-time updates when new flags arrive
 */

import { useState, useEffect, useMemo } from 'react'
import {
  subscribeToPendingFlags,
  getFlagsForChildren,
  applyClientFilters,
} from '../services/flagService'
import type { FlagDocument, ConcernCategory, ConcernSeverity } from '@fledgely/shared'

export interface UseFlagsQueryOptions {
  /** Child IDs to fetch flags for */
  childIds: string[]
  /** Optional filters */
  filters?: {
    status?: 'pending' | 'reviewed' | 'dismissed'
    category?: ConcernCategory
    severity?: ConcernSeverity
    childId?: string
  }
  /** Whether to enable real-time updates (default: true for pending) */
  realtime?: boolean
}

export interface UseFlagsQueryResult {
  /** The flags matching the query */
  flags: FlagDocument[]
  /** Loading state */
  loading: boolean
  /** Error state */
  error: Error | null
  /** Count of pending flags (for badge) */
  pendingCount: number
  /** Refresh the flags manually */
  refresh: () => void
}

/**
 * useFlagsQuery - Hook for fetching flags with optional real-time updates
 */
export function useFlagsQuery({
  childIds,
  filters,
  realtime = true,
}: UseFlagsQueryOptions): UseFlagsQueryResult {
  const [flags, setFlags] = useState<FlagDocument[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  // Stable reference for child IDs
  const childIdsKey = useMemo(() => childIds.sort().join(','), [childIds])

  // Subscribe to real-time updates for pending flags
  useEffect(() => {
    if (childIds.length === 0) {
      setFlags([])
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    // Use real-time subscription for pending flags
    if (realtime && (!filters?.status || filters.status === 'pending')) {
      const unsubscribe = subscribeToPendingFlags(childIds, (pendingFlags) => {
        // Apply additional filters if any
        const filtered = filters
          ? applyClientFilters(pendingFlags, {
              childIds: filters.childId ? [filters.childId] : undefined,
              category: filters.category,
              severity: filters.severity,
            })
          : pendingFlags

        setFlags(filtered)
        setLoading(false)
      })

      return () => unsubscribe()
    }

    // For non-pending or non-realtime, fetch once
    getFlagsForChildren(childIds, {
      status: filters?.status,
      category: filters?.category,
      severity: filters?.severity,
    })
      .then((fetchedFlags) => {
        const filtered = filters?.childId
          ? fetchedFlags.filter((f) => f.childId === filters.childId)
          : fetchedFlags

        setFlags(filtered)
        setLoading(false)
      })
      .catch((err) => {
        setError(err)
        setLoading(false)
      })

    return undefined
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    childIdsKey,
    filters?.status,
    filters?.category,
    filters?.severity,
    filters?.childId,
    realtime,
    refreshTrigger,
  ])

  // Calculate pending count (unfiltered)
  const pendingCount = useMemo(() => {
    return flags.filter((f) => f.status === 'pending').length
  }, [flags])

  // Refresh function
  const refresh = () => setRefreshTrigger((t) => t + 1)

  return {
    flags,
    loading,
    error,
    pendingCount,
    refresh,
  }
}

/**
 * usePendingFlagCount - Simple hook just for the pending count badge
 */
export function usePendingFlagCount(childIds: string[]): {
  count: number
  loading: boolean
} {
  const [count, setCount] = useState(0)
  const [loading, setLoading] = useState(true)

  const childIdsKey = useMemo(() => childIds.sort().join(','), [childIds])

  useEffect(() => {
    if (childIds.length === 0) {
      setCount(0)
      setLoading(false)
      return
    }

    setLoading(true)
    const unsubscribe = subscribeToPendingFlags(childIds, (flags) => {
      setCount(flags.length)
      setLoading(false)
    })

    return () => unsubscribe()
  }, [childIdsKey, childIds])

  return { count, loading }
}

export default useFlagsQuery
