'use client'

/**
 * useCaregiverRevocation Hook - Story 19D.5, extended by Story 39.7
 *
 * Provides revocation functionality for parent to remove caregiver access.
 *
 * Acceptance Criteria (Story 19D.5):
 * - AC1: Revoke access within 5 minutes (NFR62) - immediate in practice
 * - AC2: Terminate caregiver's current session
 * - AC5: Log revocation in audit trail
 * - AC6: Allow re-invitation after revocation
 *
 * Acceptance Criteria (Story 39.7):
 * - AC3: Child notification when caregiver removed
 * - AC6: Optional removal reason stored in audit log (not shared with caregiver)
 *
 * Implementation Note: Uses removeCaregiverWithNotification cloud function
 * to ensure server-side enforcement and child notification creation.
 */

import { useState, useCallback } from 'react'
import { getFunctions, httpsCallable, HttpsCallableResult } from 'firebase/functions'

/**
 * Result from revocation operation
 */
export interface RevocationResult {
  success: boolean
  error?: string
}

/**
 * Options for revocation
 * Story 39.7: Added optional reason
 */
export interface RevocationOptions {
  /** Optional reason for removal (stored in audit log, not shared with caregiver) */
  reason?: string
}

/**
 * Revocation hook return type
 */
export interface UseCaregiverRevocationReturn {
  /** Revoke a caregiver's access */
  revokeCaregiver: (
    caregiverId: string,
    caregiverEmail: string,
    options?: RevocationOptions
  ) => Promise<RevocationResult>
  /** Whether a revocation is in progress */
  loading: boolean
  /** Error from last revocation attempt */
  error: string | null
  /** Clear the error state */
  clearError: () => void
}

/**
 * Cloud function input type
 */
interface RemoveCaregiverInput {
  familyId: string
  caregiverUid: string
  caregiverEmail: string
  reason?: string
}

/**
 * Cloud function response type
 */
interface RemoveCaregiverResponse {
  success: boolean
  notificationId: string
  message: string
}

/**
 * Hook to revoke caregiver access
 *
 * Story 19D.5: Caregiver Quick Revocation
 * Story 39.7: Child notifications and optional removal reason
 *
 * Uses removeCaregiverWithNotification cloud function to:
 * - Remove caregiver from family (AC1)
 * - Create child notification (Story 39.7 AC3)
 * - Log revocation with optional reason (AC5, Story 39.7 AC6)
 * - Delete invitation if exists
 *
 * @param familyId - Family ID to revoke caregiver from
 * @param parentUid - UID of parent performing revocation (for validation)
 * @returns Revocation functions and state
 */
export function useCaregiverRevocation(
  familyId: string | null,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  parentUid: string | null
): UseCaregiverRevocationReturn {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  const revokeCaregiver = useCallback(
    async (
      caregiverId: string,
      caregiverEmail: string,
      options?: RevocationOptions
    ): Promise<RevocationResult> => {
      if (!familyId) {
        return { success: false, error: 'No family ID provided' }
      }

      setLoading(true)
      setError(null)

      try {
        // Call cloud function for server-side removal with child notifications
        const functions = getFunctions()
        const removeCaregiverFn = httpsCallable<RemoveCaregiverInput, RemoveCaregiverResponse>(
          functions,
          'removeCaregiverWithNotification'
        )

        const result: HttpsCallableResult<RemoveCaregiverResponse> = await removeCaregiverFn({
          familyId,
          caregiverUid: caregiverId,
          caregiverEmail,
          reason: options?.reason,
        })

        if (!result.data.success) {
          throw new Error('Failed to remove caregiver')
        }

        setLoading(false)
        return { success: true }
      } catch (err) {
        // Extract error message from Firebase HttpsError or general Error
        let errorMessage = 'Failed to revoke access'
        if (err instanceof Error) {
          // Firebase HttpsError has message in a specific format
          errorMessage = err.message
          // Extract clean message from Firebase error format
          const match = err.message.match(/: (.+)$/)
          if (match) {
            errorMessage = match[1]
          }
        }
        setError(errorMessage)
        setLoading(false)
        return { success: false, error: errorMessage }
      }
    },
    [familyId]
  )

  return {
    revokeCaregiver,
    loading,
    error,
    clearError,
  }
}

export default useCaregiverRevocation
