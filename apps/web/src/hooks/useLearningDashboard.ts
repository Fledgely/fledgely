'use client'

/**
 * useLearningDashboard Hook.
 *
 * Story 24.4: Learning Progress Dashboard - AC1, AC2, AC3, AC4, AC5
 *
 * Provides access to AI learning dashboard data and reset functionality.
 */

import { useState, useCallback, useEffect } from 'react'
import { httpsCallable } from 'firebase/functions'
import { getFirebaseFunctions } from '../lib/firebase'
import type { LearningDashboardData } from '@fledgely/shared'

/**
 * Response from resetFamilyLearning callable.
 */
export interface ResetFamilyLearningResponse {
  success: boolean
  message: string
  clearedCorrections: number
}

/**
 * Hook return type.
 */
export interface UseLearningDashboardResult {
  /** Dashboard data */
  dashboardData: LearningDashboardData | null
  /** Loading state */
  loading: boolean
  /** Error message */
  error: string | null
  /** Refresh dashboard data */
  refresh: () => Promise<void>
  /** Reset family learning data */
  resetLearning: () => Promise<ResetFamilyLearningResponse | null>
  /** Whether reset is in progress */
  resetting: boolean
}

/**
 * Hook for accessing AI learning dashboard data.
 *
 * Story 24.4: Learning Progress Dashboard - AC1, AC2, AC3, AC4, AC5
 *
 * @param familyId - Family to get dashboard for (null to skip)
 * @returns Dashboard data, loading state, error, and actions
 */
export function useLearningDashboard(familyId: string | null): UseLearningDashboardResult {
  const [dashboardData, setDashboardData] = useState<LearningDashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [resetting, setResetting] = useState(false)

  const fetchDashboard = useCallback(async () => {
    if (!familyId) {
      setDashboardData(null)
      setLoading(false)
      setError(null)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const functions = getFirebaseFunctions()
      const getLearningDashboard = httpsCallable<{ familyId: string }, LearningDashboardData>(
        functions,
        'getLearningDashboard'
      )

      const result = await getLearningDashboard({ familyId })
      setDashboardData(result.data)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load dashboard'
      setError(errorMessage)
      setDashboardData(null)
    } finally {
      setLoading(false)
    }
  }, [familyId])

  // Fetch on mount and when familyId changes
  useEffect(() => {
    fetchDashboard()
  }, [fetchDashboard])

  const refresh = useCallback(async () => {
    await fetchDashboard()
  }, [fetchDashboard])

  const resetLearning = useCallback(async (): Promise<ResetFamilyLearningResponse | null> => {
    if (!familyId) {
      return null
    }

    setResetting(true)
    setError(null)

    try {
      const functions = getFirebaseFunctions()
      const resetFamilyLearning = httpsCallable<
        { familyId: string; confirmReset: boolean },
        ResetFamilyLearningResponse
      >(functions, 'resetFamilyLearning')

      const result = await resetFamilyLearning({ familyId, confirmReset: true })

      // Refresh dashboard data after reset
      await fetchDashboard()

      return result.data
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to reset learning data'
      setError(errorMessage)
      return null
    } finally {
      setResetting(false)
    }
  }, [familyId, fetchDashboard])

  return {
    dashboardData,
    loading,
    error,
    refresh,
    resetLearning,
    resetting,
  }
}
