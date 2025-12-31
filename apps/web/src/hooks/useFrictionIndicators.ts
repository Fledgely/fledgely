/**
 * useFrictionIndicators Hook
 *
 * Story 27.5.4: Friction Indicators Dashboard
 *
 * Fetches friction indicators for the current user's family.
 * Both parents and children use the same data (bilateral transparency - AC5).
 */

import { useState, useEffect } from 'react'
import { getAuth, onAuthStateChanged } from 'firebase/auth'
import { useAuth } from '../contexts/AuthContext'

export interface FrictionIndicators {
  familyId: string
  relationshipHealth: 'mostly_positive' | 'stable' | 'some_concerns'
  relationshipHealthText: string
  trend: 'improving' | 'stable' | 'needs_attention'
  trendText: string
  conversationStarter: string | null
  periodStart: number
  periodEnd: number
  hasEnoughData: boolean
  dataPointCount: number
}

interface UseFrictionIndicatorsResult {
  indicators: FrictionIndicators | null
  isLoading: boolean
  error: string | null
  refetch: () => void
}

/**
 * Hook to fetch friction indicators for the current user's family.
 */
export function useFrictionIndicators(): UseFrictionIndicatorsResult {
  const { firebaseUser } = useAuth()
  const [indicators, setIndicators] = useState<FrictionIndicators | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchIndicators = async () => {
    if (!firebaseUser) {
      setIndicators(null)
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const auth = getAuth()
      const currentUser = auth.currentUser
      if (!currentUser) {
        throw new Error('Not authenticated')
      }

      const token = await currentUser.getIdToken()
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_FUNCTIONS_URL}/getFrictionIndicatorsEndpoint`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      )

      if (!response.ok) {
        throw new Error('Failed to fetch friction indicators')
      }

      const data = await response.json()
      setIndicators(data.indicators)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    const auth = getAuth()
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        fetchIndicators()
      } else {
        setIndicators(null)
        setIsLoading(false)
      }
    })

    return () => unsubscribe()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [firebaseUser?.uid])

  return {
    indicators,
    isLoading,
    error,
    refetch: fetchIndicators,
  }
}
