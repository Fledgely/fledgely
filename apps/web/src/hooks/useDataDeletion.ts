'use client'

/**
 * useDataDeletion Hook - Story 51.2
 *
 * Manages GDPR data deletion requests (Article 17: Right to Erasure).
 *
 * Acceptance Criteria:
 * - AC1: Request deletion from settings
 * - AC2: Typed confirmation required
 * - AC4: 14-day cooling off period
 * - AC5: Cancellation during cooling off
 * - AC8: One active deletion per family
 *
 * Features:
 * - Real-time subscription to deletion status
 * - Request new deletion with confirmation phrase
 * - Cancel during cooling off period
 * - Calculate days remaining
 */

import { useState, useEffect, useCallback, useMemo } from 'react'
import { httpsCallable, HttpsCallableResult } from 'firebase/functions'
import { doc, onSnapshot } from 'firebase/firestore'
import { getFirebaseFunctions, getFirestoreDb } from '../lib/firebase'
import type {
  RequestDataDeletionResponse,
  CancelDataDeletionResponse,
  DataDeletionRequest,
} from '@fledgely/shared'

/**
 * Deletion status for UI display
 */
export type DeletionStatus =
  | 'idle'
  | 'cooling_off'
  | 'processing'
  | 'completed'
  | 'cancelled'
  | 'failed'
  | 'already_pending'

/**
 * Hook return type
 */
export interface UseDataDeletionReturn {
  // State
  status: DeletionStatus
  deletionRequest: DataDeletionRequest | null
  loading: boolean
  actionLoading: boolean
  error: string | null

  // Computed
  canRequestDeletion: boolean
  canCancelDeletion: boolean
  coolingOffEndsAt: Date | null
  daysRemaining: number | null

  // Actions
  requestDeletion: (confirmationPhrase: string) => Promise<boolean>
  cancelDeletion: () => Promise<boolean>
  clearError: () => void
  refreshStatus: () => void
}

/**
 * Calculate days remaining until cooling off ends.
 */
function calculateDaysRemaining(coolingOffEndsAt: number | undefined): number | null {
  if (!coolingOffEndsAt) return null
  const now = Date.now()
  const diff = coolingOffEndsAt - now
  if (diff <= 0) return 0
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

/**
 * Hook for managing GDPR data deletion requests.
 *
 * @param familyId - The family ID to manage deletions for
 * @returns Deletion state and operations
 */
export function useDataDeletion(familyId: string | null): UseDataDeletionReturn {
  // State
  const [deletionRequest, setDeletionRequest] = useState<DataDeletionRequest | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const [latestDeletionId, setLatestDeletionId] = useState<string | null>(null)

  // Clear error
  const clearError = useCallback(() => setError(null), [])

  // Force refresh
  const refreshStatus = useCallback(() => setRefreshKey((k) => k + 1), [])

  // Calculate status
  const status: DeletionStatus = useMemo(() => {
    if (!deletionRequest) return 'idle'
    switch (deletionRequest.status) {
      case 'cooling_off':
        return 'cooling_off'
      case 'processing':
        return 'processing'
      case 'completed':
        return 'completed'
      case 'cancelled':
        return 'cancelled'
      case 'failed':
        return 'failed'
      default:
        return 'idle'
    }
  }, [deletionRequest])

  // Can request if no active deletion or previous is done
  const canRequestDeletion = useMemo(
    () =>
      !actionLoading &&
      (status === 'idle' ||
        status === 'completed' ||
        status === 'failed' ||
        status === 'cancelled'),
    [actionLoading, status]
  )

  // Can cancel only during cooling off
  const canCancelDeletion = useMemo(
    () => !actionLoading && status === 'cooling_off',
    [actionLoading, status]
  )

  // Cooling off info
  const coolingOffEndsAt = useMemo(
    () => (deletionRequest?.coolingOffEndsAt ? new Date(deletionRequest.coolingOffEndsAt) : null),
    [deletionRequest]
  )

  const daysRemaining = useMemo(
    () => calculateDaysRemaining(deletionRequest?.coolingOffEndsAt),
    [deletionRequest]
  )

  // Subscribe to latest deletion for this family
  useEffect(() => {
    if (!familyId || !latestDeletionId) {
      return
    }

    const db = getFirestoreDb()
    const deletionRef = doc(db, 'dataDeletions', latestDeletionId)

    const unsubscribe = onSnapshot(
      deletionRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data() as DataDeletionRequest
          setDeletionRequest(data)
        }
        setLoading(false)
      },
      (err) => {
        console.error('Error subscribing to deletion status:', err)
        setError('Failed to load deletion status')
        setLoading(false)
      }
    )

    return () => unsubscribe()
  }, [familyId, latestDeletionId, refreshKey])

  // Check for existing deletion on mount
  useEffect(() => {
    if (!familyId) {
      setLoading(false)
      return
    }

    const checkExistingDeletion = async () => {
      setLoading(true)
      try {
        const functions = getFirebaseFunctions()
        const getStatus = httpsCallable<
          { familyId: string; deletionId?: string },
          RequestDataDeletionResponse
        >(functions, 'getDataDeletionStatus')

        const result = await getStatus({ familyId })

        if (result.data.deletionId) {
          setLatestDeletionId(result.data.deletionId)
        } else {
          setLoading(false)
        }
      } catch (err) {
        console.error('Error checking deletion status:', err)
        setLoading(false)
      }
    }

    checkExistingDeletion()
  }, [familyId, refreshKey])

  /**
   * Request data deletion with typed confirmation.
   *
   * @param confirmationPhrase - Must be "DELETE MY DATA" exactly
   * @returns Success status
   */
  const requestDeletion = useCallback(
    async (confirmationPhrase: string): Promise<boolean> => {
      if (!familyId) {
        setError('No family selected')
        return false
      }

      setActionLoading(true)
      setError(null)

      try {
        const functions = getFirebaseFunctions()
        const requestFn = httpsCallable<
          { familyId: string; confirmationPhrase: string },
          RequestDataDeletionResponse
        >(functions, 'requestDataDeletion')

        const result: HttpsCallableResult<RequestDataDeletionResponse> = await requestFn({
          familyId,
          confirmationPhrase,
        })

        if (!result.data.success) {
          if (result.data.status === 'already_pending') {
            // Still subscribe to the existing deletion
            if (result.data.existingDeletionId) {
              setLatestDeletionId(result.data.existingDeletionId)
            }
            setError('A deletion request is already in progress')
            return false
          }
          if (result.data.status === 'invalid_confirmation') {
            setError(result.data.message || 'Invalid confirmation phrase')
            return false
          }
          setError(result.data.message || 'Failed to request deletion')
          return false
        }

        // Subscribe to the new deletion
        if (result.data.deletionId) {
          setLatestDeletionId(result.data.deletionId)
        }

        return true
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to request deletion'
        setError(message)
        return false
      } finally {
        setActionLoading(false)
      }
    },
    [familyId]
  )

  /**
   * Cancel deletion during cooling off period.
   */
  const cancelDeletion = useCallback(async (): Promise<boolean> => {
    if (!familyId || !latestDeletionId) {
      setError('No active deletion to cancel')
      return false
    }

    setActionLoading(true)
    setError(null)

    try {
      const functions = getFirebaseFunctions()
      const cancelFn = httpsCallable<
        { familyId: string; deletionId: string },
        CancelDataDeletionResponse
      >(functions, 'cancelDataDeletion')

      const result = await cancelFn({
        familyId,
        deletionId: latestDeletionId,
      })

      if (!result.data.success) {
        setError(result.data.message || 'Failed to cancel deletion')
        return false
      }

      // Refresh status
      refreshStatus()
      return true
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to cancel deletion'
      setError(message)
      return false
    } finally {
      setActionLoading(false)
    }
  }, [familyId, latestDeletionId, refreshStatus])

  return {
    status,
    deletionRequest,
    loading,
    actionLoading,
    error,
    canRequestDeletion,
    canCancelDeletion,
    coolingOffEndsAt,
    daysRemaining,
    requestDeletion,
    cancelDeletion,
    clearError,
    refreshStatus,
  }
}

export default useDataDeletion
