'use client'

import { useState, useCallback, useRef } from 'react'
import { useAuthContext } from '@/components/providers/AuthProvider'
import {
  removeChildFromFamily as removeChildService,
  type RemoveChildResult,
} from '@/services/childService'
import { unenrollDevicesForChild } from '@/services/deviceService'
import { deleteChildData } from '@/services/dataDeletionService'
import { getChildRemovalErrorMessage } from '@fledgely/contracts'

/**
 * useRemoveChild Hook - Manages child removal state
 *
 * Provides:
 * - removeChild function with idempotency guard
 * - Loading and error states
 * - Error clearing
 * - Re-authentication requirement tracking
 *
 * Story 2.6: Remove Child from Family
 *
 * DESTRUCTIVE OPERATION: This hook orchestrates the complete removal of a child
 * including device unenrollment and data deletion.
 */

export interface RemoveChildFullResult extends RemoveChildResult {
  /** Number of devices unenrolled */
  devicesUnenrolled: number
  /** Number of screenshots deleted */
  screenshotsDeleted: number
}

interface UseRemoveChildReturn {
  /** Remove a child from the family */
  removeChild: (
    childId: string,
    familyId: string,
    confirmationText: string,
    reauthToken: string
  ) => Promise<RemoveChildFullResult>
  /** Whether a removal is in progress */
  loading: boolean
  /** Error from the last operation */
  error: Error | null
  /** Clear the current error */
  clearError: () => void
  /** Whether re-authentication is required */
  requiresReauth: boolean
  /** Set re-authentication requirement */
  setRequiresReauth: (required: boolean) => void
}

/**
 * Hook for removing children from a family
 *
 * DESTRUCTIVE: This operation permanently removes a child and deletes all their data.
 * It cannot be undone.
 *
 * Usage:
 * ```tsx
 * const { removeChild, loading, error, requiresReauth } = useRemoveChild()
 *
 * const handleRemove = async () => {
 *   try {
 *     const token = await reauthenticate() // Get fresh token
 *     await removeChild(childId, familyId, childName, token)
 *     // Success - redirect to dashboard
 *   } catch (err) {
 *     // Error is also stored in `error` state
 *   }
 * }
 * ```
 */
export function useRemoveChild(): UseRemoveChildReturn {
  const { user } = useAuthContext()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [requiresReauth, setRequiresReauth] = useState(true)

  // Idempotency guard - prevent duplicate submissions
  const inProgressRef = useRef(false)

  const removeChild = useCallback(
    async (
      childId: string,
      familyId: string,
      confirmationText: string,
      reauthToken: string
    ): Promise<RemoveChildFullResult> => {
      if (!user?.uid) {
        const err = new Error(getChildRemovalErrorMessage('reauth-required'))
        setError(err)
        throw err
      }

      // Idempotency guard - prevent double-click submissions
      if (inProgressRef.current) {
        const err = new Error(getChildRemovalErrorMessage('removal-in-progress'))
        throw err
      }

      inProgressRef.current = true
      setLoading(true)
      setError(null)

      try {
        // Step 1: Unenroll devices first (before child document is deleted)
        let devicesUnenrolled = 0
        try {
          const deviceResult = await unenrollDevicesForChild(childId, familyId, user.uid)
          devicesUnenrolled = deviceResult.devicesUnenrolled
        } catch (deviceError) {
          // Log but continue - device unenrollment is not critical for removal
          console.warn('[useRemoveChild] Device unenrollment warning:', deviceError)
        }

        // Step 2: Delete child data (screenshots, activity logs, etc.)
        let screenshotsDeleted = 0
        try {
          const dataResult = await deleteChildData(childId, familyId, user.uid)
          screenshotsDeleted = dataResult.screenshotsDeleted
        } catch (dataError) {
          // Log but continue - data deletion is not critical for removal
          console.warn('[useRemoveChild] Data deletion warning:', dataError)
        }

        // Step 3: Remove child from family (core operation)
        const result = await removeChildService(childId, user.uid, confirmationText, reauthToken)

        // Reset re-auth requirement after successful removal
        setRequiresReauth(false)

        return {
          ...result,
          devicesUnenrolled,
          screenshotsDeleted,
        }
      } catch (err) {
        const error = err instanceof Error ? err : new Error(getChildRemovalErrorMessage('default'))

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

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  return {
    removeChild,
    loading,
    error,
    clearError,
    requiresReauth,
    setRequiresReauth,
  }
}
