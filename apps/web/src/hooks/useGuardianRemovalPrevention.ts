/**
 * useGuardianRemovalPrevention Hook - Story 3A.6
 *
 * Hook for checking guardian removal permissions and managing
 * the blocked modal state.
 *
 * Usage:
 * ```tsx
 * const { checkCanRemove, attemptRemoval, isModalOpen, closeModal } = useGuardianRemovalPrevention({
 *   familyId: 'family-123',
 *   currentUserUid: 'parent-1'
 * })
 *
 * // Check before showing remove button
 * const canRemove = await checkCanRemove('parent-2')
 * if (!canRemove.allowed) {
 *   // Show disabled state
 * }
 *
 * // When user tries to remove
 * await attemptRemoval('parent-2')
 * // This will show the modal and log the attempt
 * ```
 */

import { useState, useCallback, useMemo } from 'react'
import {
  canRemoveGuardian,
  canDowngradeToCaregiver,
  logGuardianRemovalAttempt,
  type RemovalCheckResult,
} from '../services/guardianRemovalPreventionService'

export interface UseGuardianRemovalPreventionProps {
  /** The family ID */
  familyId: string
  /** The current user's UID */
  currentUserUid: string
}

export interface UseGuardianRemovalPreventionReturn {
  /** Check if a guardian can be removed */
  checkCanRemove: (targetUid: string) => Promise<RemovalCheckResult>
  /** Check if a guardian can be downgraded to caregiver */
  checkCanDowngrade: (targetUid: string) => Promise<RemovalCheckResult>
  /** Attempt to remove a guardian (triggers modal + audit log) */
  attemptRemoval: (targetUid: string, targetEmail?: string) => Promise<void>
  /** Attempt to downgrade a guardian (triggers modal + audit log) */
  attemptDowngrade: (targetUid: string, targetEmail?: string) => Promise<void>
  /** Whether the blocked modal is open */
  isModalOpen: boolean
  /** Close the blocked modal */
  closeModal: () => void
  /** The target guardian name for the modal */
  targetGuardianName: string | null
  /** Whether an action is in progress */
  isLoading: boolean
}

export function useGuardianRemovalPrevention({
  familyId,
  currentUserUid,
}: UseGuardianRemovalPreventionProps): UseGuardianRemovalPreventionReturn {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [targetGuardianName, setTargetGuardianName] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  /**
   * Check if a guardian can be removed.
   * Always returns false for multi-guardian families.
   */
  const checkCanRemove = useCallback(
    async (targetUid: string): Promise<RemovalCheckResult> => {
      return canRemoveGuardian(familyId, targetUid)
    },
    [familyId]
  )

  /**
   * Check if a guardian can be downgraded to caregiver.
   * Always returns false for multi-guardian families.
   */
  const checkCanDowngrade = useCallback(
    async (targetUid: string): Promise<RemovalCheckResult> => {
      return canDowngradeToCaregiver(familyId, targetUid)
    },
    [familyId]
  )

  /**
   * Attempt to remove a guardian.
   * This will:
   * 1. Log the attempt to admin audit
   * 2. Show the blocked modal
   */
  const attemptRemoval = useCallback(
    async (targetUid: string, targetEmail?: string): Promise<void> => {
      setIsLoading(true)
      try {
        // Log the attempt to admin audit (potential abuse signal)
        await logGuardianRemovalAttempt({
          familyId,
          attemptedByUid: currentUserUid,
          targetUid,
          targetEmail,
        })

        // Set target name for modal (use email or generic)
        setTargetGuardianName(targetEmail || 'the other guardian')

        // Show the blocked modal
        setIsModalOpen(true)
      } finally {
        setIsLoading(false)
      }
    },
    [familyId, currentUserUid]
  )

  /**
   * Attempt to downgrade a guardian.
   * This will:
   * 1. Log the attempt to admin audit
   * 2. Show the blocked modal
   */
  const attemptDowngrade = useCallback(
    async (targetUid: string, targetEmail?: string): Promise<void> => {
      setIsLoading(true)
      try {
        // Log the attempt to admin audit (potential abuse signal)
        await logGuardianRemovalAttempt({
          familyId,
          attemptedByUid: currentUserUid,
          targetUid,
          targetEmail,
        })

        // Set target name for modal (use email or generic)
        setTargetGuardianName(targetEmail || 'the other guardian')

        // Show the blocked modal
        setIsModalOpen(true)
      } finally {
        setIsLoading(false)
      }
    },
    [familyId, currentUserUid]
  )

  /**
   * Close the blocked modal.
   */
  const closeModal = useCallback(() => {
    setIsModalOpen(false)
    setTargetGuardianName(null)
  }, [])

  return useMemo(
    () => ({
      checkCanRemove,
      checkCanDowngrade,
      attemptRemoval,
      attemptDowngrade,
      isModalOpen,
      closeModal,
      targetGuardianName,
      isLoading,
    }),
    [
      checkCanRemove,
      checkCanDowngrade,
      attemptRemoval,
      attemptDowngrade,
      isModalOpen,
      closeModal,
      targetGuardianName,
      isLoading,
    ]
  )
}
