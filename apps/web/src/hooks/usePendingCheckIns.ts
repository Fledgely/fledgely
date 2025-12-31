/**
 * Hook for fetching pending health check-ins
 *
 * Story 27.5.2: Check-In Response Interface - Task 3
 *
 * Fetches pending check-ins for the current user to display
 * check-in prompts on dashboard.
 */

import { useState, useEffect, useCallback } from 'react'
import { getIdToken } from 'firebase/auth'
import type { User as FirebaseUser } from 'firebase/auth'
import type { HealthCheckIn } from '@fledgely/shared'

interface UsePendingCheckInsOptions {
  firebaseUser: FirebaseUser | null
  enabled?: boolean
}

interface UsePendingCheckInsReturn {
  pendingCheckIns: HealthCheckIn[]
  loading: boolean
  error: string | null
  refresh: () => void
}

export function usePendingCheckIns({
  firebaseUser,
  enabled = true,
}: UsePendingCheckInsOptions): UsePendingCheckInsReturn {
  const [pendingCheckIns, setPendingCheckIns] = useState<HealthCheckIn[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  const refresh = useCallback(() => {
    setRefreshTrigger((t) => t + 1)
  }, [])

  useEffect(() => {
    if (!enabled || !firebaseUser) {
      setPendingCheckIns([])
      setLoading(false)
      return
    }

    const fetchPendingCheckIns = async () => {
      try {
        setLoading(true)
        setError(null)

        const token = await getIdToken(firebaseUser)
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_FUNCTIONS_BASE_URL}/api/health/check-ins/pending`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        )

        if (!response.ok) {
          throw new Error('Failed to fetch pending check-ins')
        }

        const checkIns: HealthCheckIn[] = await response.json()
        setPendingCheckIns(checkIns)
      } catch (err) {
        console.error('Error fetching pending check-ins:', err)
        setError(err instanceof Error ? err.message : 'Failed to load check-ins')
        setPendingCheckIns([])
      } finally {
        setLoading(false)
      }
    }

    fetchPendingCheckIns()
  }, [firebaseUser, enabled, refreshTrigger])

  return { pendingCheckIns, loading, error, refresh }
}
