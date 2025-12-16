'use client'

import { useState, useCallback, useRef } from 'react'
import { useAuthContext } from '@/components/providers/AuthProvider'
import {
  initiateDissolution as initiateDissolutionService,
  acknowledgeDissolution as acknowledgeDissolutionService,
  cancelDissolution as cancelDissolutionService,
  getDissolutionStatus as getDissolutionStatusService,
} from '@/services/dissolutionService'
import {
  getDissolutionErrorMessage,
  calculateDaysRemaining,
  canCancelDissolution,
  needsAcknowledgment,
  type DataHandlingOption,
  type FamilyDissolution,
} from '@fledgely/contracts'

/**
 * useDissolution Hook - Manages family dissolution state and operations
 *
 * Provides:
 * - initiateDissolution function to start dissolution process
 * - acknowledgeDissolution function for co-guardians
 * - cancelDissolution function to stop the process
 * - getDissolutionStatus function to check current status
 * - Helper functions for UI state
 * - Loading and error states
 * - Re-authentication requirement tracking
 *
 * Story 2.7: Family Dissolution Initiation
 *
 * DESTRUCTIVE OPERATION: Dissolution leads to permanent family data deletion
 * after the 30-day cooling period.
 */

interface UseDissolutionReturn {
  /** Initiate family dissolution */
  initiateDissolution: (
    familyId: string,
    dataHandlingOption: DataHandlingOption,
    reauthToken: string
  ) => Promise<FamilyDissolution>
  /** Acknowledge dissolution (for co-guardians) */
  acknowledgeDissolution: (familyId: string) => Promise<FamilyDissolution>
  /** Cancel an active dissolution */
  cancelDissolution: (familyId: string) => Promise<FamilyDissolution>
  /** Get current dissolution status */
  getDissolutionStatus: (familyId: string) => Promise<FamilyDissolution | null>
  /** Current dissolution status (cached) */
  dissolution: FamilyDissolution | null
  /** Whether an operation is in progress */
  loading: boolean
  /** Error from the last operation */
  error: Error | null
  /** Clear the current error */
  clearError: () => void
  /** Whether re-authentication is required */
  requiresReauth: boolean
  /** Set re-authentication requirement */
  setRequiresReauth: (required: boolean) => void
  /** Calculate days remaining in cooling period */
  getDaysRemaining: () => number | null
  /** Check if current user needs to acknowledge */
  userNeedsToAcknowledge: (guardianIds: string[]) => boolean
  /** Check if dissolution can be cancelled */
  canCancel: () => boolean
}

/**
 * Hook for managing family dissolution
 *
 * Usage:
 * ```tsx
 * const {
 *   initiateDissolution,
 *   acknowledgeDissolution,
 *   cancelDissolution,
 *   dissolution,
 *   loading,
 *   error,
 *   requiresReauth
 * } = useDissolution()
 *
 * const handleInitiate = async () => {
 *   try {
 *     const token = await reauthenticate()
 *     await initiateDissolution(familyId, 'delete_all', token)
 *   } catch (err) {
 *     // Error is also stored in `error` state
 *   }
 * }
 * ```
 */
export function useDissolution(): UseDissolutionReturn {
  const { user } = useAuthContext()
  const [dissolution, setDissolution] = useState<FamilyDissolution | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [requiresReauth, setRequiresReauth] = useState(true)

  // Idempotency guard - prevent duplicate submissions
  const inProgressRef = useRef(false)

  const initiateDissolution = useCallback(
    async (
      familyId: string,
      dataHandlingOption: DataHandlingOption,
      reauthToken: string
    ): Promise<FamilyDissolution> => {
      if (!user?.uid) {
        const err = new Error(getDissolutionErrorMessage('reauth-required'))
        setError(err)
        throw err
      }

      // Idempotency guard - prevent double-click submissions
      if (inProgressRef.current) {
        const err = new Error(getDissolutionErrorMessage('already-dissolving'))
        throw err
      }

      inProgressRef.current = true
      setLoading(true)
      setError(null)

      try {
        const result = await initiateDissolutionService(
          familyId,
          user.uid,
          dataHandlingOption,
          reauthToken
        )

        setDissolution(result)
        setRequiresReauth(false)

        return result
      } catch (err) {
        const error =
          err instanceof Error ? err : new Error(getDissolutionErrorMessage('dissolution-failed'))

        // Check if error indicates re-auth is needed
        if (
          error.message.includes('sign in again') ||
          error.message.includes('reauth') ||
          error.message.includes('expired')
        ) {
          setRequiresReauth(true)
        }

        setError(error)
        throw error
      } finally {
        setLoading(false)
        inProgressRef.current = false
      }
    },
    [user?.uid]
  )

  const acknowledgeDissolution = useCallback(
    async (familyId: string): Promise<FamilyDissolution> => {
      if (!user?.uid) {
        const err = new Error(getDissolutionErrorMessage('reauth-required'))
        setError(err)
        throw err
      }

      // Idempotency guard
      if (inProgressRef.current) {
        const err = new Error(getDissolutionErrorMessage('acknowledgment-failed'))
        throw err
      }

      inProgressRef.current = true
      setLoading(true)
      setError(null)

      try {
        const result = await acknowledgeDissolutionService(familyId, user.uid)

        setDissolution(result)

        return result
      } catch (err) {
        const error =
          err instanceof Error
            ? err
            : new Error(getDissolutionErrorMessage('acknowledgment-failed'))

        setError(error)
        throw error
      } finally {
        setLoading(false)
        inProgressRef.current = false
      }
    },
    [user?.uid]
  )

  const cancelDissolution = useCallback(
    async (familyId: string): Promise<FamilyDissolution> => {
      if (!user?.uid) {
        const err = new Error(getDissolutionErrorMessage('reauth-required'))
        setError(err)
        throw err
      }

      // Idempotency guard
      if (inProgressRef.current) {
        const err = new Error(getDissolutionErrorMessage('cancellation-failed'))
        throw err
      }

      inProgressRef.current = true
      setLoading(true)
      setError(null)

      try {
        const result = await cancelDissolutionService(familyId, user.uid)

        setDissolution(result)

        return result
      } catch (err) {
        const error =
          err instanceof Error ? err : new Error(getDissolutionErrorMessage('cancellation-failed'))

        setError(error)
        throw error
      } finally {
        setLoading(false)
        inProgressRef.current = false
      }
    },
    [user?.uid]
  )

  const getDissolutionStatus = useCallback(
    async (familyId: string): Promise<FamilyDissolution | null> => {
      setLoading(true)
      setError(null)

      try {
        const result = await getDissolutionStatusService(familyId)

        setDissolution(result)

        return result
      } catch (err) {
        const error =
          err instanceof Error ? err : new Error(getDissolutionErrorMessage('dissolution-failed'))

        setError(error)
        throw error
      } finally {
        setLoading(false)
      }
    },
    []
  )

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  const getDaysRemaining = useCallback((): number | null => {
    if (!dissolution?.scheduledDeletionAt) {
      return null
    }

    return calculateDaysRemaining(dissolution.scheduledDeletionAt)
  }, [dissolution?.scheduledDeletionAt])

  const userNeedsToAcknowledge = useCallback(
    (_guardianIds?: string[]): boolean => {
      if (!user?.uid || !dissolution) {
        return false
      }

      // Note: guardianIds parameter kept for API compatibility but not used
      // The needsAcknowledgment function only needs dissolution and guardianId
      return needsAcknowledgment(dissolution, user.uid)
    },
    [user?.uid, dissolution]
  )

  const canCancel = useCallback((): boolean => {
    if (!dissolution) {
      return false
    }

    return canCancelDissolution(dissolution.status)
  }, [dissolution])

  return {
    initiateDissolution,
    acknowledgeDissolution,
    cancelDissolution,
    getDissolutionStatus,
    dissolution,
    loading,
    error,
    clearError,
    requiresReauth,
    setRequiresReauth,
    getDaysRemaining,
    userNeedsToAcknowledge,
    canCancel,
  }
}
