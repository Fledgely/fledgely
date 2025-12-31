/**
 * Hook for fetching pending health check-ins for children
 *
 * Story 27.5.2: Check-In Response Interface - Task 3
 *
 * Fetches pending check-ins for the current child to display
 * check-in prompts on child dashboard.
 *
 * Uses Firestore directly like other child hooks (no HTTP API).
 */

import { useState, useEffect, useCallback } from 'react'
import { collection, query, where, orderBy, onSnapshot, type Unsubscribe } from 'firebase/firestore'
import { getFirestoreDb } from '../lib/firebase'
import type { HealthCheckIn } from '@fledgely/shared'

interface UseChildPendingCheckInsOptions {
  childId: string | null
  enabled?: boolean
}

interface UseChildPendingCheckInsReturn {
  pendingCheckIns: HealthCheckIn[]
  loading: boolean
  error: string | null
  refresh: () => void
}

export function useChildPendingCheckIns({
  childId,
  enabled = true,
}: UseChildPendingCheckInsOptions): UseChildPendingCheckInsReturn {
  const [pendingCheckIns, setPendingCheckIns] = useState<HealthCheckIn[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  const refresh = useCallback(() => {
    setRefreshTrigger((t) => t + 1)
  }, [])

  useEffect(() => {
    if (!enabled || !childId) {
      setPendingCheckIns([])
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    let unsubscribe: Unsubscribe

    try {
      const db = getFirestoreDb()
      const checkInsRef = collection(db, 'healthCheckIns')

      // Query for pending check-ins for this child
      const checkInsQuery = query(
        checkInsRef,
        where('recipientUid', '==', childId),
        where('status', '==', 'pending'),
        orderBy('promptSentAt', 'desc')
      )

      unsubscribe = onSnapshot(
        checkInsQuery,
        (snapshot) => {
          const checkIns = snapshot.docs.map((doc) => doc.data() as HealthCheckIn)
          setPendingCheckIns(checkIns)
          setLoading(false)
        },
        (err) => {
          // eslint-disable-next-line no-console
          console.error('Error fetching child pending check-ins:', err)
          setError(err.message)
          setLoading(false)
        }
      )
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Error setting up child check-ins subscription:', err)
      setError(err instanceof Error ? err.message : 'Failed to load check-ins')
      setLoading(false)
    }

    return () => {
      if (unsubscribe) {
        unsubscribe()
      }
    }
  }, [childId, enabled, refreshTrigger])

  return { pendingCheckIns, loading, error, refresh }
}
