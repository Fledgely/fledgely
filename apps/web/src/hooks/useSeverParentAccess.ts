/**
 * Hook for severing parent access operations.
 *
 * Story 0.5.4: Parent Access Severing
 *
 * Provides access to admin-only parent access severing operations.
 * Requires safety-team custom claim.
 */

'use client'

import { useState, useCallback } from 'react'
import { httpsCallable, HttpsCallableResult } from 'firebase/functions'
import { getFirebaseFunctions } from '../lib/firebase'

/**
 * Guardian info for severing modal display.
 */
export interface GuardianInfoForSevering {
  uid: string
  email: string
  displayName: string | null
  role: string
}

/**
 * Family info for severing modal display.
 */
export interface FamilyForSevering {
  id: string
  name: string
  guardians: GuardianInfoForSevering[]
}

/**
 * Response from getFamilyForSevering callable.
 */
export interface GetFamilyForSeveringResponse {
  family: FamilyForSevering | null
  requestingUserUid: string | null
  requestingUserEmail: string | null
}

/**
 * Response from severParentAccess callable.
 */
export interface SeverParentAccessResponse {
  success: boolean
  message: string
}

/**
 * Hook return type.
 */
export interface UseSeverParentAccessReturn {
  // State
  loading: boolean
  error: string | null

  // Get family info for severing modal
  getFamilyForSevering: (ticketId: string) => Promise<GetFamilyForSeveringResponse | null>

  // Execute severing
  severParentAccess: (params: {
    ticketId: string
    familyId: string
    parentUid: string
    confirmationPhrase: string
  }) => Promise<SeverParentAccessResponse | null>

  // Clear error
  clearError: () => void
}

/**
 * Hook for parent access severing operations.
 */
export function useSeverParentAccess(): UseSeverParentAccessReturn {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const clearError = useCallback(() => setError(null), [])

  /**
   * Get family info for the severing modal.
   */
  const getFamilyForSevering = useCallback(async (ticketId: string) => {
    setLoading(true)
    setError(null)

    try {
      const functions = getFirebaseFunctions()
      const fn = httpsCallable<{ ticketId: string }, GetFamilyForSeveringResponse>(
        functions,
        'getFamilyForSevering'
      )

      const result: HttpsCallableResult<GetFamilyForSeveringResponse> = await fn({ ticketId })
      return result.data
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to get family info'
      setError(message)
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  /**
   * Execute parent access severing.
   */
  const severParentAccess = useCallback(
    async (params: {
      ticketId: string
      familyId: string
      parentUid: string
      confirmationPhrase: string
    }) => {
      setLoading(true)
      setError(null)

      try {
        const functions = getFirebaseFunctions()
        const fn = httpsCallable<typeof params, SeverParentAccessResponse>(
          functions,
          'severParentAccess'
        )

        const result: HttpsCallableResult<SeverParentAccessResponse> = await fn(params)
        return result.data
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to sever parent access'
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
    getFamilyForSevering,
    severParentAccess,
    clearError,
  }
}
