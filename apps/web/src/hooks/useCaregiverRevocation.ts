'use client'

/**
 * useCaregiverRevocation Hook - Story 19D.5
 *
 * Provides revocation functionality for parent to remove caregiver access.
 *
 * Acceptance Criteria:
 * - AC1: Revoke access within 5 minutes (NFR62) - immediate in practice
 * - AC2: Terminate caregiver's current session
 * - AC5: Log revocation in audit trail
 * - AC6: Allow re-invitation after revocation
 *
 * Security Note: This modifies Firestore documents directly.
 * Server-side validation should be implemented in Epic 19E.
 */

import { useState, useCallback } from 'react'
import { doc, arrayRemove, deleteDoc, getDoc, runTransaction } from 'firebase/firestore'
import { getFirestoreDb } from '../lib/firebase'
import { logDataViewNonBlocking } from '../services/dataViewAuditService'

/**
 * Result from revocation operation
 */
export interface RevocationResult {
  success: boolean
  error?: string
}

/**
 * Revocation hook return type
 */
export interface UseCaregiverRevocationReturn {
  /** Revoke a caregiver's access */
  revokeCaregiver: (caregiverId: string, caregiverEmail: string) => Promise<RevocationResult>
  /** Whether a revocation is in progress */
  loading: boolean
  /** Error from last revocation attempt */
  error: string | null
  /** Clear the error state */
  clearError: () => void
}

/**
 * Hook to revoke caregiver access
 *
 * Story 19D.5: Caregiver Quick Revocation
 *
 * @param familyId - Family ID to revoke caregiver from
 * @param parentUid - UID of parent performing revocation (for audit)
 * @returns Revocation functions and state
 */
export function useCaregiverRevocation(
  familyId: string | null,
  parentUid: string | null
): UseCaregiverRevocationReturn {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  const revokeCaregiver = useCallback(
    async (caregiverId: string, caregiverEmail: string): Promise<RevocationResult> => {
      if (!familyId) {
        return { success: false, error: 'No family ID provided' }
      }

      if (!parentUid) {
        return { success: false, error: 'Not authenticated' }
      }

      setLoading(true)
      setError(null)

      try {
        const db = getFirestoreDb()
        const familyRef = doc(db, 'families', familyId)

        // Use transaction to prevent race conditions (Issue #4)
        await runTransaction(db, async (transaction) => {
          // 1. Get the family document to find the caregiver object
          const familyDoc = await transaction.get(familyRef)

          if (!familyDoc.exists()) {
            throw new Error('Family not found')
          }

          const familyData = familyDoc.data()

          // Verify caller is a guardian (Issue #5)
          const guardianUids = familyData?.guardianUids ?? []
          if (!guardianUids.includes(parentUid)) {
            throw new Error('Only family guardians can revoke caregiver access')
          }

          const caregivers = familyData?.caregivers ?? []

          // Find the caregiver object to remove
          const caregiver = caregivers.find((c: { uid: string }) => c.uid === caregiverId)

          if (!caregiver) {
            throw new Error('Caregiver not found in family')
          }

          // 2. Remove caregiver from family.caregivers array (atomic within transaction)
          transaction.update(familyRef, {
            caregivers: arrayRemove(caregiver),
          })
        })

        // 3. Try to delete the invitation document if it exists
        // This is best-effort - invitation might not exist
        try {
          // Look for invitation by caregiver email
          const invitationRef = doc(db, 'caregiverInvitations', `${familyId}_${caregiverEmail}`)
          const invitationDoc = await getDoc(invitationRef)

          if (invitationDoc.exists()) {
            await deleteDoc(invitationRef)
          }
        } catch (inviteError) {
          // Invitation deletion is best-effort, log but don't fail
          // eslint-disable-next-line no-console
          console.warn('[Revocation] Could not delete invitation:', inviteError)
        }

        // 4. Log revocation in audit trail (AC5)
        logDataViewNonBlocking({
          viewerUid: parentUid,
          childId: null,
          familyId,
          dataType: 'caregiver_revoked',
          metadata: {
            action: 'revoke',
            revokedCaregiverId: caregiverId,
            revokedCaregiverEmail: caregiverEmail,
          },
        })

        setLoading(false)
        return { success: true }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to revoke access'
        setError(errorMessage)
        setLoading(false)
        return { success: false, error: errorMessage }
      }
    },
    [familyId, parentUid]
  )

  return {
    revokeCaregiver,
    loading,
    error,
    clearError,
  }
}

export default useCaregiverRevocation
