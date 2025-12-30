/**
 * Hook for disabling location features as part of safety escape.
 *
 * Story 0.5.6: Location Feature Emergency Disable
 *
 * Provides access to admin-only location feature disable operations.
 * Requires safety-team custom claim.
 */

'use client'

import { useState, useCallback } from 'react'
import { httpsCallable, HttpsCallableResult } from 'firebase/functions'
import { getFirebaseFunctions } from '../lib/firebase'

/**
 * Response from disableLocationFeaturesForSafety callable.
 */
export interface DisableLocationFeaturesResponse {
  success: boolean
  message: string
  featuresDisabledCount: number
  notificationsDeleted: number
}

/**
 * Hook return type.
 */
export interface UseDisableLocationFeaturesReturn {
  // State
  loading: boolean
  error: string | null

  // Execute location feature disable
  disableLocationFeatures: (params: {
    ticketId: string
    familyId: string
    userId?: string
  }) => Promise<DisableLocationFeaturesResponse | null>

  // Clear error
  clearError: () => void
}

/**
 * Hook for disabling location features for safety escape.
 */
export function useDisableLocationFeatures(): UseDisableLocationFeaturesReturn {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const clearError = useCallback(() => setError(null), [])

  /**
   * Execute location feature disable.
   */
  const disableLocationFeatures = useCallback(
    async (params: { ticketId: string; familyId: string; userId?: string }) => {
      setLoading(true)
      setError(null)

      try {
        const functions = getFirebaseFunctions()
        const fn = httpsCallable<typeof params, DisableLocationFeaturesResponse>(
          functions,
          'disableLocationFeaturesForSafety'
        )

        const result: HttpsCallableResult<DisableLocationFeaturesResponse> = await fn(params)
        return result.data
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to disable location features'
        setError(message)
        return null
      } finally {
        setLoading(false)
      }
    },
    []
  )

  return {
    loading,
    error,
    disableLocationFeatures,
    clearError,
  }
}
