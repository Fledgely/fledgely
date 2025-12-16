'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { useAuthContext } from '@/components/providers/AuthProvider'
import {
  createCoParentInvitation,
  getExistingPendingInvitation,
  revokeInvitation as revokeInvitationService,
  type CreateInvitationResult,
  type ExistingInvitationResult,
} from '@/services/invitationService'
import {
  getInvitationErrorMessage,
  type Invitation,
  type InvitationExpiryDays,
} from '@fledgely/contracts'

/**
 * Hook return type for useInvitation
 */
export interface UseInvitationReturn {
  /** Created invitation with token (only available once after creation) */
  invitation: CreateInvitationResult | null
  /** Existing pending invitation if one exists */
  existingInvitation: Invitation | null
  /** Whether an operation is in progress */
  loading: boolean
  /** Whether checking for existing invitation */
  checkingExisting: boolean
  /** Error state if invitation operations fail */
  error: string | null
  /** Create a new co-parent invitation */
  createInvitation: (familyId: string, expiryDays?: InvitationExpiryDays) => Promise<CreateInvitationResult>
  /** Check for existing pending invitation */
  checkExistingInvitation: (familyId: string) => Promise<ExistingInvitationResult>
  /** Revoke an existing invitation */
  revokeInvitation: (invitationId: string) => Promise<void>
  /** Clear error state */
  clearError: () => void
  /** Reset invitation state (clear created invitation) */
  resetInvitation: () => void
}

/**
 * useInvitation Hook - Manages co-parent invitation state
 *
 * Story 3.1: Co-Parent Invitation Generation
 *
 * Provides:
 * - createInvitation: Create a new invitation (returns token once)
 * - checkExistingInvitation: Check if pending invitation exists
 * - revokeInvitation: Cancel a pending invitation
 * - Idempotency guard to prevent double-click issues
 *
 * SECURITY NOTE: The invitation token is ONLY available in the
 * CreateInvitationResult immediately after creation. It is NOT
 * stored in Firestore (only the hash is stored).
 *
 * @example
 * ```tsx
 * const {
 *   invitation,
 *   existingInvitation,
 *   loading,
 *   error,
 *   createInvitation,
 *   checkExistingInvitation,
 * } = useInvitation()
 *
 * // Check for existing invitation on mount
 * useEffect(() => {
 *   if (familyId) {
 *     checkExistingInvitation(familyId)
 *   }
 * }, [familyId, checkExistingInvitation])
 *
 * // Create new invitation
 * const handleCreate = async () => {
 *   const result = await createInvitation(familyId, '7')
 *   // result.invitationLink contains the sharable link
 * }
 * ```
 */
export function useInvitation(): UseInvitationReturn {
  const { user: authUser } = useAuthContext()

  const [invitation, setInvitation] = useState<CreateInvitationResult | null>(null)
  const [existingInvitation, setExistingInvitation] = useState<Invitation | null>(null)
  const [loading, setLoading] = useState(false)
  const [checkingExisting, setCheckingExisting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Track mounted state to prevent memory leaks
  const mountedRef = useRef(true)

  // Cleanup: Set mountedRef to false on unmount
  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  // Idempotency guard - prevent double-click
  const creatingRef = useRef(false)

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    if (mountedRef.current) {
      setError(null)
    }
  }, [])

  /**
   * Reset invitation state (clear created invitation)
   */
  const resetInvitation = useCallback(() => {
    if (mountedRef.current) {
      setInvitation(null)
      setError(null)
    }
  }, [])

  /**
   * Check for existing pending invitation
   */
  const checkExistingInvitation = useCallback(
    async (familyId: string): Promise<ExistingInvitationResult> => {
      if (!authUser) {
        return { exists: false, invitation: null }
      }

      if (mountedRef.current) {
        setCheckingExisting(true)
        setError(null)
      }

      try {
        const result = await getExistingPendingInvitation(familyId)

        if (mountedRef.current) {
          setExistingInvitation(result.invitation)
        }

        return result
      } catch (err) {
        const errorMessage =
          err instanceof Error
            ? getInvitationErrorMessage((err as { code?: string }).code || 'default')
            : getInvitationErrorMessage('default')

        if (mountedRef.current) {
          setError(errorMessage)
        }

        return { exists: false, invitation: null }
      } finally {
        if (mountedRef.current) {
          setCheckingExisting(false)
        }
      }
    },
    [authUser]
  )

  /**
   * Create a new co-parent invitation
   *
   * Returns the invitation with the unhashed token.
   * The token is ONLY available once - it is not stored.
   */
  const createInvitation = useCallback(
    async (
      familyId: string,
      expiryDays: InvitationExpiryDays = '7'
    ): Promise<CreateInvitationResult> => {
      if (!authUser) {
        throw new Error('Must be logged in to create an invitation')
      }

      // Idempotency guard - prevent double-click
      if (creatingRef.current) {
        throw new Error('Invitation creation already in progress')
      }

      creatingRef.current = true

      if (mountedRef.current) {
        setLoading(true)
        setError(null)
      }

      try {
        const result = await createCoParentInvitation(
          { familyId, expiryDays },
          authUser.uid
        )

        if (mountedRef.current) {
          setInvitation(result)
          // Clear existing invitation since we just created a new one
          setExistingInvitation(result.invitation)
        }

        return result
      } catch (err) {
        const errorCode =
          err instanceof Error
            ? (err as { code?: string }).code || 'default'
            : 'default'
        const errorMessage = getInvitationErrorMessage(errorCode)

        if (mountedRef.current) {
          setError(errorMessage)
        }

        throw new Error(errorMessage)
      } finally {
        creatingRef.current = false

        if (mountedRef.current) {
          setLoading(false)
        }
      }
    },
    [authUser]
  )

  /**
   * Revoke an existing invitation
   */
  const revokeInvitation = useCallback(
    async (invitationId: string): Promise<void> => {
      if (!authUser) {
        throw new Error('Must be logged in to revoke an invitation')
      }

      if (mountedRef.current) {
        setLoading(true)
        setError(null)
      }

      try {
        await revokeInvitationService(invitationId, authUser.uid)

        if (mountedRef.current) {
          // Clear both invitation states
          setInvitation(null)
          setExistingInvitation(null)
        }
      } catch (err) {
        const errorCode =
          err instanceof Error
            ? (err as { code?: string }).code || 'default'
            : 'default'
        const errorMessage = getInvitationErrorMessage(errorCode)

        if (mountedRef.current) {
          setError(errorMessage)
        }

        throw new Error(errorMessage)
      } finally {
        if (mountedRef.current) {
          setLoading(false)
        }
      }
    },
    [authUser]
  )

  return {
    invitation,
    existingInvitation,
    loading,
    checkingExisting,
    error,
    createInvitation,
    checkExistingInvitation,
    revokeInvitation,
    clearError,
    resetInvitation,
  }
}
