'use client'

import { useState, useCallback, useRef } from 'react'
import { useAuthContext } from '@/components/providers/AuthProvider'
import { updateChild as updateChildService } from '@/services/childService'
import type { UpdateChildInput, ChildProfile } from '@fledgely/contracts'

/**
 * useEditChild Hook - Manages child profile editing state
 *
 * Provides:
 * - updateChild function with idempotency guard
 * - Loading and error states
 * - Error clearing
 *
 * Story 2.5: Edit Child Profile
 */

interface UseEditChildReturn {
  /** Update a child's profile */
  updateChild: (childId: string, input: UpdateChildInput) => Promise<ChildProfile>
  /** Whether an update is in progress */
  loading: boolean
  /** Error from the last operation */
  error: Error | null
  /** Clear the current error */
  clearError: () => void
}

/**
 * Hook for editing child profiles
 *
 * Usage:
 * ```tsx
 * const { updateChild, loading, error } = useEditChild()
 *
 * const handleSubmit = async (data) => {
 *   try {
 *     await updateChild(childId, data)
 *     // Success - redirect or show message
 *   } catch (err) {
 *     // Error is also stored in `error` state
 *   }
 * }
 * ```
 */
export function useEditChild(): UseEditChildReturn {
  const { user } = useAuthContext()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  // Idempotency guard - prevent duplicate submissions
  const inProgressRef = useRef(false)

  const updateChild = useCallback(
    async (childId: string, input: UpdateChildInput): Promise<ChildProfile> => {
      if (!user?.uid) {
        const err = new Error('You need to be signed in to edit a profile')
        setError(err)
        throw err
      }

      // Idempotency guard - prevent double-click submissions
      if (inProgressRef.current) {
        const err = new Error('Update already in progress')
        throw err
      }

      inProgressRef.current = true
      setLoading(true)
      setError(null)

      try {
        const result = await updateChildService(childId, input, user.uid)
        return result
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Could not update profile')
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
    updateChild,
    loading,
    error,
    clearError,
  }
}
