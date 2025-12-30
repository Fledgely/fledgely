/**
 * Hook for unenrolling devices as part of safety escape.
 *
 * Story 0.5.5: Remote Device Unenrollment
 *
 * Provides access to admin-only device unenrollment operations.
 * Requires safety-team custom claim.
 */

'use client'

import { useState, useCallback } from 'react'
import { httpsCallable, HttpsCallableResult } from 'firebase/functions'
import { getFirebaseFunctions } from '../lib/firebase'

/**
 * Response from unenrollDevicesForSafety callable.
 */
export interface UnenrollDevicesResponse {
  success: boolean
  message: string
  unenrolledCount: number
  skippedCount: number
}

/**
 * Hook return type.
 */
export interface UseUnenrollDevicesReturn {
  // State
  loading: boolean
  error: string | null

  // Execute unenrollment
  unenrollDevices: (params: {
    ticketId: string
    familyId: string
    deviceIds: string[]
  }) => Promise<UnenrollDevicesResponse | null>

  // Clear error
  clearError: () => void
}

/**
 * Hook for unenrolling devices for safety escape.
 */
export function useUnenrollDevices(): UseUnenrollDevicesReturn {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const clearError = useCallback(() => setError(null), [])

  /**
   * Execute device unenrollment.
   */
  const unenrollDevices = useCallback(
    async (params: { ticketId: string; familyId: string; deviceIds: string[] }) => {
      setLoading(true)
      setError(null)

      try {
        const functions = getFirebaseFunctions()
        const fn = httpsCallable<typeof params, UnenrollDevicesResponse>(
          functions,
          'unenrollDevicesForSafety'
        )

        const result: HttpsCallableResult<UnenrollDevicesResponse> = await fn(params)
        return result.data
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to unenroll devices'
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
    unenrollDevices,
    clearError,
  }
}
