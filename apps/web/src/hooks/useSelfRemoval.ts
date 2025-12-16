'use client'

import { useState, useCallback, useRef } from 'react'
import { useAuthContext } from '@/components/providers/AuthProvider'
import {
  removeSelfFromFamily as removeSelfFromFamilyService,
  canRemoveSelf as canRemoveSelfService,
} from '@/services/selfRemovalService'
import {
  getSelfRemovalErrorMessage,
  isReauthError,
  type SelfRemovalResult,
} from '@fledgely/contracts'

/**
 * useSelfRemoval Hook - Manages guardian self-removal state and operations
 *
 * CRITICAL SAFETY FEATURE: This hook enables abuse survivors to immediately
 * remove themselves from a shared family account.
 *
 * Provides:
 * - removeSelf function for immediate self-removal
 * - canRemove check for eligibility
 * - Loading and error states
 * - Re-authentication requirement tracking
 * - Single guardian warning state
 *
 * Story 2.8: Unilateral Self-Removal (Survivor Escape)
 *
 * IMPORTANT: This feature:
 * - Does NOT send notifications
 * - Does NOT have a cooling period
 * - Takes effect immediately
 * - Logs only to sealed audit (not family audit)
 */

interface UseSelfRemovalReturn {
  /** Remove self from family */
  removeSelf: (familyId: string, reauthToken: string) => Promise<SelfRemovalResult>
  /** Check if user can remove self from family */
  checkCanRemove: (familyId: string) => Promise<{
    canRemove: boolean
    isSingleGuardian: boolean
    reason?: string
  }>
  /** Result of last removal (if successful) */
  removalResult: SelfRemovalResult | null
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
  /** Whether user is single guardian (warning state) */
  isSingleGuardian: boolean | null
}

/**
 * Hook for managing guardian self-removal
 *
 * Usage:
 * ```tsx
 * const {
 *   removeSelf,
 *   checkCanRemove,
 *   loading,
 *   error,
 *   requiresReauth,
 *   isSingleGuardian
 * } = useSelfRemoval()
 *
 * const handleRemoveSelf = async () => {
 *   try {
 *     // First check if they can remove
 *     const { canRemove, isSingleGuardian } = await checkCanRemove(familyId)
 *
 *     if (isSingleGuardian) {
 *       // Show warning about orphaning children
 *     }
 *
 *     // Get re-auth token
 *     const token = await reauthenticate()
 *
 *     // Perform removal
 *     await removeSelf(familyId, token)
 *
 *     // Redirect to dashboard
 *   } catch (err) {
 *     // Error is also stored in `error` state
 *   }
 * }
 * ```
 */
export function useSelfRemoval(): UseSelfRemovalReturn {
  const { user } = useAuthContext()
  const [removalResult, setRemovalResult] = useState<SelfRemovalResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [requiresReauth, setRequiresReauth] = useState(true)
  const [isSingleGuardian, setIsSingleGuardian] = useState<boolean | null>(null)

  // Idempotency guard - prevent duplicate submissions
  const inProgressRef = useRef(false)

  const removeSelf = useCallback(
    async (familyId: string, reauthToken: string): Promise<SelfRemovalResult> => {
      if (!user?.uid) {
        const err = new Error(getSelfRemovalErrorMessage('reauth-required'))
        setError(err)
        throw err
      }

      // Idempotency guard - prevent double-click submissions
      if (inProgressRef.current) {
        const err = new Error(getSelfRemovalErrorMessage('removal-failed'))
        throw err
      }

      inProgressRef.current = true
      setLoading(true)
      setError(null)

      try {
        const result = await removeSelfFromFamilyService(familyId, user.uid, reauthToken)

        setRemovalResult(result)
        setRequiresReauth(false)
        setIsSingleGuardian(result.isSingleGuardian)

        return result
      } catch (err) {
        const error =
          err instanceof Error ? err : new Error(getSelfRemovalErrorMessage('removal-failed'))

        // Check if error indicates re-auth is needed
        if (isReauthError(error)) {
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

  const checkCanRemove = useCallback(
    async (
      familyId: string
    ): Promise<{ canRemove: boolean; isSingleGuardian: boolean; reason?: string }> => {
      if (!user?.uid) {
        return { canRemove: false, isSingleGuardian: false, reason: 'reauth-required' }
      }

      setLoading(true)
      setError(null)

      try {
        const result = await canRemoveSelfService(familyId, user.uid)

        setIsSingleGuardian(result.isSingleGuardian)

        return result
      } catch (err) {
        const error =
          err instanceof Error ? err : new Error(getSelfRemovalErrorMessage('removal-failed'))

        setError(error)
        return { canRemove: false, isSingleGuardian: false, reason: 'removal-failed' }
      } finally {
        setLoading(false)
      }
    },
    [user?.uid]
  )

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  return {
    removeSelf,
    checkCanRemove,
    removalResult,
    loading,
    error,
    clearError,
    requiresReauth,
    setRequiresReauth,
    isSingleGuardian,
  }
}
