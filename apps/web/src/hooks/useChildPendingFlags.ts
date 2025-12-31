/**
 * useChildPendingFlags Hook - Story 23.1
 *
 * Custom hook for children to fetch flags waiting for their annotation.
 * Subscribes to flags with childNotificationStatus = 'notified' AND annotationDeadline > now.
 *
 * Acceptance Criteria:
 * - AC1: Show flags pending child annotation
 * - AC5: Track time remaining for annotation window
 */

import { useState, useEffect, useCallback, useMemo } from 'react'
import { collection, query, where, orderBy, onSnapshot, type Unsubscribe } from 'firebase/firestore'
import { getFirestoreDb } from '../lib/firebase'
import type { FlagDocument } from '@fledgely/shared'
import {
  getRemainingTime,
  formatRemainingTime,
  isWaitingForAnnotation,
} from '../services/childFlagNotificationService'

/**
 * A flag with computed time remaining information
 */
export interface PendingFlagWithTimer extends FlagDocument {
  /** Milliseconds remaining until annotation deadline */
  remainingMs: number
  /** Formatted time remaining string */
  remainingTimeText: string
  /** Whether time has expired */
  isExpired: boolean
}

export interface UseChildPendingFlagsOptions {
  /** The child's ID */
  childId: string
  /** Interval to update timers (default: 1000ms) */
  timerInterval?: number
}

export interface UseChildPendingFlagsResult {
  /** Flags pending child annotation with timer info */
  pendingFlags: PendingFlagWithTimer[]
  /** Loading state */
  loading: boolean
  /** Error state */
  error: Error | null
  /** Count of pending flags */
  pendingCount: number
  /** Refresh the flags manually */
  refresh: () => void
}

/**
 * Compute timer info for a flag
 */
function computeFlagTimerInfo(flag: FlagDocument): PendingFlagWithTimer {
  const remainingMs = flag.annotationDeadline ? getRemainingTime(flag.annotationDeadline) : 0
  const remainingTimeText = formatRemainingTime(remainingMs)
  const isExpired = remainingMs <= 0

  return {
    ...flag,
    remainingMs,
    remainingTimeText,
    isExpired,
  }
}

/**
 * Sort flags by time remaining (ascending - most urgent first)
 */
function sortByTimeRemaining(flags: PendingFlagWithTimer[]): PendingFlagWithTimer[] {
  return [...flags].sort((a, b) => a.remainingMs - b.remainingMs)
}

/**
 * useChildPendingFlags - Hook for children to view flags waiting for their annotation
 *
 * Returns flags where:
 * - childNotificationStatus = 'notified'
 * - annotationDeadline > now (still within window)
 *
 * Auto-refreshes timer display every second
 */
export function useChildPendingFlags({
  childId,
  timerInterval = 1000,
}: UseChildPendingFlagsOptions): UseChildPendingFlagsResult {
  const [rawFlags, setRawFlags] = useState<FlagDocument[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [timerTick, setTimerTick] = useState(0)
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  // Subscribe to flags with notified status
  useEffect(() => {
    if (!childId) {
      setRawFlags([])
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    let unsubscribe: Unsubscribe

    try {
      const db = getFirestoreDb()
      const flagsRef = collection(db, 'children', childId, 'flags')

      // Query for flags where child was notified
      // Note: We filter by deadline client-side since Firestore can't do > now dynamically
      const flagsQuery = query(
        flagsRef,
        where('childNotificationStatus', '==', 'notified'),
        orderBy('annotationDeadline', 'asc')
      )

      unsubscribe = onSnapshot(
        flagsQuery,
        (snapshot) => {
          try {
            const flags = snapshot.docs.map((doc) => doc.data() as FlagDocument)
            // Filter to only include flags still within annotation window
            const activePendingFlags = flags.filter(isWaitingForAnnotation)
            setRawFlags(activePendingFlags)
            setLoading(false)
          } catch (err) {
            // eslint-disable-next-line no-console
            console.error('Error processing child flags snapshot:', err)
            setRawFlags([])
            setLoading(false)
          }
        },
        (err) => {
          // eslint-disable-next-line no-console
          console.error('Error in child flags subscription:', err)
          setError(err as Error)
          setLoading(false)
        }
      )
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Error setting up child flags subscription:', err)
      setError(err as Error)
      setLoading(false)
    }

    return () => {
      if (unsubscribe) {
        unsubscribe()
      }
    }
  }, [childId, refreshTrigger])

  // Auto-refresh timer every interval
  useEffect(() => {
    if (rawFlags.length === 0) return

    const intervalId = setInterval(() => {
      setTimerTick((t) => t + 1)
    }, timerInterval)

    return () => clearInterval(intervalId)
  }, [rawFlags.length, timerInterval])

  // Compute flags with timer info (recomputed on timer tick)
  const pendingFlags = useMemo(() => {
    // Filter out any that have expired since last snapshot
    const activeFlags = rawFlags.filter((flag) => {
      if (!flag.annotationDeadline) return false
      return getRemainingTime(flag.annotationDeadline) > 0
    })

    const flagsWithTimer = activeFlags.map(computeFlagTimerInfo)
    return sortByTimeRemaining(flagsWithTimer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rawFlags, timerTick])

  // Refresh function
  const refresh = useCallback(() => {
    setRefreshTrigger((t) => t + 1)
  }, [])

  return {
    pendingFlags,
    loading,
    error,
    pendingCount: pendingFlags.length,
    refresh,
  }
}

export default useChildPendingFlags
