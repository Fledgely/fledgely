/**
 * useChildFrictionIndicators Hook
 *
 * Story 27.5.4: Friction Indicators Dashboard - AC5: Bilateral transparency
 *
 * Fetches friction indicators for the child's family from Firestore cache.
 * Children see the same data as parents (bilateral transparency).
 */

import { useState, useEffect } from 'react'
import { doc, onSnapshot } from 'firebase/firestore'
import { getFirestoreDb } from '../lib/firebase'

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
  cachedAt?: number
}

interface UseChildFrictionIndicatorsResult {
  indicators: FrictionIndicators | null
  isLoading: boolean
  error: string | null
}

/**
 * Hook to fetch friction indicators for a child's family from Firestore.
 *
 * @param familyId The family ID to fetch indicators for
 */
export function useChildFrictionIndicators(
  familyId: string | null
): UseChildFrictionIndicatorsResult {
  const [indicators, setIndicators] = useState<FrictionIndicators | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!familyId) {
      setIndicators(null)
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    const db = getFirestoreDb()
    const indicatorsRef = doc(db, 'families', familyId, 'healthIndicators', 'friction')

    const unsubscribe = onSnapshot(
      indicatorsRef,
      (docSnapshot) => {
        if (docSnapshot.exists()) {
          const data = docSnapshot.data()
          setIndicators({
            familyId: data.familyId,
            relationshipHealth: data.relationshipHealth,
            relationshipHealthText: data.relationshipHealthText,
            trend: data.trend,
            trendText: data.trendText,
            conversationStarter: data.conversationStarter,
            periodStart: data.periodStart,
            periodEnd: data.periodEnd,
            hasEnoughData: data.hasEnoughData,
            dataPointCount: data.dataPointCount,
            cachedAt: data.cachedAt,
          })
        } else {
          setIndicators(null)
        }
        setIsLoading(false)
      },
      (err) => {
        // eslint-disable-next-line no-console
        console.error('Error fetching friction indicators:', err)
        setError('Failed to load indicators')
        setIsLoading(false)
      }
    )

    return () => unsubscribe()
  }, [familyId])

  return {
    indicators,
    isLoading,
    error,
  }
}
