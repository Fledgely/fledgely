'use client'

/**
 * useAccountDeletion Hook - Story 51.4
 *
 * Manages account deletion requests.
 *
 * Acceptance Criteria:
 * - AC1: Request deletion from settings
 * - AC6: Typed confirmation required
 * - AC7: 14-day cooling off period
 * - AC8: Cancellation during cooling off
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
  RequestAccountDeletionResponse,
  CancelAccountDeletionResponse,
  AccountDeletionRequest,
} from '@fledgely/shared'

export type AccountDeletionStatus =
  | 'idle'
  | 'cooling_off'
  | 'processing'
  | 'completed'
  | 'cancelled'
  | 'failed'
  | 'already_pending'

export interface UseAccountDeletionReturn {
  status: AccountDeletionStatus
  deletionRequest: AccountDeletionRequest | null
  loading: boolean
  actionLoading: boolean
  error: string | null
  canRequestDeletion: boolean
  canCancelDeletion: boolean
  coolingOffEndsAt: Date | null
  daysRemaining: number | null
  affectedUserCount: number
  requestDeletion: (confirmationPhrase: string) => Promise<boolean>
  cancelDeletion: () => Promise<boolean>
  clearError: () => void
  refreshStatus: () => void
}

function calculateDaysRemaining(coolingOffEndsAt: number | undefined): number | null {
  if (!coolingOffEndsAt) return null
  const now = Date.now()
  const diff = coolingOffEndsAt - now
  if (diff <= 0) return 0
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

export function useAccountDeletion(familyId: string | null): UseAccountDeletionReturn {
  const [deletionRequest, setDeletionRequest] = useState<AccountDeletionRequest | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const [latestDeletionId, setLatestDeletionId] = useState<string | null>(null)

  const clearError = useCallback(() => setError(null), [])
  const refreshStatus = useCallback(() => setRefreshKey((k) => k + 1), [])

  const status: AccountDeletionStatus = useMemo(() => {
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

  const canRequestDeletion = useMemo(
    () =>
      !actionLoading &&
      (status === 'idle' ||
        status === 'completed' ||
        status === 'failed' ||
        status === 'cancelled'),
    [actionLoading, status]
  )

  const canCancelDeletion = useMemo(
    () => !actionLoading && status === 'cooling_off',
    [actionLoading, status]
  )

  const coolingOffEndsAt = useMemo(
    () => (deletionRequest?.coolingOffEndsAt ? new Date(deletionRequest.coolingOffEndsAt) : null),
    [deletionRequest]
  )

  const daysRemaining = useMemo(
    () => calculateDaysRemaining(deletionRequest?.coolingOffEndsAt),
    [deletionRequest]
  )

  const affectedUserCount = useMemo(
    () => deletionRequest?.affectedUsers?.length || 0,
    [deletionRequest]
  )

  // Subscribe to latest deletion for this family
  useEffect(() => {
    if (!familyId || !latestDeletionId) {
      return
    }

    const db = getFirestoreDb()
    const deletionRef = doc(db, 'accountDeletions', latestDeletionId)

    const unsubscribe = onSnapshot(
      deletionRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data() as AccountDeletionRequest
          setDeletionRequest(data)
        }
        setLoading(false)
      },
      (err) => {
        console.error('Error subscribing to account deletion status:', err)
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
          RequestAccountDeletionResponse
        >(functions, 'getAccountDeletionStatus')

        const result = await getStatus({ familyId })

        if (result.data.deletionId) {
          setLatestDeletionId(result.data.deletionId)
        } else {
          setLoading(false)
        }
      } catch (err) {
        console.error('Error checking account deletion status:', err)
        setLoading(false)
      }
    }

    checkExistingDeletion()
  }, [familyId, refreshKey])

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
          RequestAccountDeletionResponse
        >(functions, 'requestAccountDeletion')

        const result: HttpsCallableResult<RequestAccountDeletionResponse> = await requestFn({
          familyId,
          confirmationPhrase,
        })

        if (!result.data.success) {
          if (result.data.status === 'already_pending') {
            if (result.data.existingDeletionId) {
              setLatestDeletionId(result.data.existingDeletionId)
            }
            setError('An account deletion request is already in progress')
            return false
          }
          if (result.data.status === 'invalid_confirmation') {
            setError(result.data.message || 'Invalid confirmation phrase')
            return false
          }
          setError(result.data.message || 'Failed to request account deletion')
          return false
        }

        if (result.data.deletionId) {
          setLatestDeletionId(result.data.deletionId)
        }

        return true
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to request account deletion'
        setError(message)
        return false
      } finally {
        setActionLoading(false)
      }
    },
    [familyId]
  )

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
        CancelAccountDeletionResponse
      >(functions, 'cancelAccountDeletion')

      const result = await cancelFn({
        familyId,
        deletionId: latestDeletionId,
      })

      if (!result.data.success) {
        setError(result.data.message || 'Failed to cancel account deletion')
        return false
      }

      refreshStatus()
      return true
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to cancel account deletion'
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
    affectedUserCount,
    requestDeletion,
    cancelDeletion,
    clearError,
    refreshStatus,
  }
}

export default useAccountDeletion
