'use client'

/**
 * useFamilyAILearning Hook - Story 24.2
 *
 * Provides AI learning status for the family.
 * Shows how many corrections have been made and whether AI learning is active.
 *
 * AC #6: AI learning indicator shown in settings
 */

import { useState, useEffect } from 'react'
import { doc, onSnapshot } from 'firebase/firestore'
import { getFirestoreDb } from '../lib/firebase'
import type { AILearningStatus, ConcernCategory, FamilyBiasWeights } from '@fledgely/shared'
import { MINIMUM_CORRECTIONS_THRESHOLD, CONCERN_CATEGORY_VALUES } from '@fledgely/shared'

/**
 * Result from useFamilyAILearning hook
 */
export interface FamilyAILearningResult {
  /** AI learning status details */
  status: AILearningStatus
  /** Whether data is loading */
  loading: boolean
  /** Error message if any */
  error: string | null
}

/**
 * Build AI learning status from bias weights
 */
function buildLearningStatus(biasWeights: FamilyBiasWeights | null): AILearningStatus {
  if (!biasWeights) {
    return {
      isActive: false,
      correctionCount: 0,
      correctionsNeeded: MINIMUM_CORRECTIONS_THRESHOLD,
      lastAdaptedAt: undefined,
      adjustedCategories: undefined,
    }
  }

  const correctionCount = biasWeights.correctionCount || 0
  const isActive = correctionCount >= MINIMUM_CORRECTIONS_THRESHOLD
  const correctionsNeeded = isActive ? 0 : MINIMUM_CORRECTIONS_THRESHOLD - correctionCount

  // Find categories with active adjustments
  let adjustedCategories: ConcernCategory[] | undefined
  if (biasWeights.categoryAdjustments) {
    const adjusted = Object.entries(biasWeights.categoryAdjustments)
      .filter(([, adjustment]) => adjustment !== 0)
      .map(([category]) => category as ConcernCategory)
      .filter((category) => CONCERN_CATEGORY_VALUES.includes(category))

    if (adjusted.length > 0) {
      adjustedCategories = adjusted
    }
  }

  return {
    isActive,
    correctionCount,
    correctionsNeeded,
    lastAdaptedAt: biasWeights.lastUpdatedAt,
    adjustedCategories,
  }
}

/**
 * Hook to get AI learning status for a family
 *
 * @param familyId - The family ID to get AI learning status for
 * @returns AI learning status result
 */
export function useFamilyAILearning(familyId: string | null): FamilyAILearningResult {
  const [biasWeights, setBiasWeights] = useState<FamilyBiasWeights | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!familyId) {
      setLoading(false)
      setBiasWeights(null)
      return
    }

    const db = getFirestoreDb()
    const biasWeightsRef = doc(db, 'families', familyId, 'aiSettings', 'biasWeights')

    const unsubscribe = onSnapshot(
      biasWeightsRef,
      (snapshot) => {
        if (snapshot.exists()) {
          setBiasWeights(snapshot.data() as FamilyBiasWeights)
        } else {
          setBiasWeights(null)
        }
        setLoading(false)
        setError(null)
      },
      (err) => {
        // eslint-disable-next-line no-console
        console.error('Error fetching AI learning status:', err)
        setError('Unable to load AI learning status')
        setLoading(false)
      }
    )

    return () => unsubscribe()
  }, [familyId])

  return {
    status: buildLearningStatus(biasWeights),
    loading,
    error,
  }
}
