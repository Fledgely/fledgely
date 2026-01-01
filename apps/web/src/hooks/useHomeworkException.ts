/**
 * useHomeworkException Hook - Story 32.5 AC4
 *
 * Manages homework exception requests from children.
 *
 * Features:
 * - Request homework exception with time limit
 * - Parent approval/denial workflow
 * - Auto-expiry after time limit
 *
 * @example
 * const { pendingRequest, requestHomeworkTime, cancelRequest } = useHomeworkException({
 *   familyId: 'family-123',
 *   childId: 'child-456',
 * })
 */

import { useState, useEffect, useCallback } from 'react'
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  addDoc,
  updateDoc,
  doc,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore'
import { getFirestoreDb } from '../lib/firebase'
import type { OfflineException } from '@fledgely/shared'

// Default homework exception duration: 1 hour
export const DEFAULT_HOMEWORK_DURATION_MS = 60 * 60 * 1000

// Maximum homework exception duration: 2 hours
export const MAX_HOMEWORK_DURATION_MS = 2 * 60 * 60 * 1000

// Minimum homework exception duration: 15 minutes
export const MIN_HOMEWORK_DURATION_MS = 15 * 60 * 1000

export interface UseHomeworkExceptionOptions {
  /** Family ID */
  familyId: string | null
  /** Child ID making the request */
  childId: string | null
  /** Whether to enable the hook */
  enabled?: boolean
}

export interface HomeworkExceptionRequest {
  /** Exception ID */
  id: string
  /** Family ID */
  familyId: string
  /** Requested duration in milliseconds */
  requestedDuration: number
  /** Status: pending, approved, denied, active, completed, cancelled */
  status: 'pending' | 'approved' | 'denied' | 'active' | 'completed' | 'cancelled'
  /** Child who requested */
  requestedBy: string
  /** Child's name */
  requestedByName?: string
  /** Parent who approved/denied */
  approvedBy?: string
  /** Denial reason (if denied) */
  denialReason?: string
  /** When the request was created */
  createdAt: number
  /** When the exception started (after approval) */
  startTime?: number
  /** When the exception ends */
  endTime?: number | null
}

export interface UseHomeworkExceptionResult {
  /** Current pending or active homework request */
  pendingRequest: HomeworkExceptionRequest | null
  /** Active homework exception */
  activeException: OfflineException | null
  /** Loading state */
  loading: boolean
  /** Error message */
  error: string | null
  /** Request homework time */
  requestHomeworkTime: (childName: string, durationMinutes?: number) => Promise<string>
  /** Cancel pending request */
  cancelRequest: () => Promise<void>
  /** Time remaining in active exception (in minutes) */
  timeRemainingMinutes: number | null
  /** Check if child can request (no active exception) */
  canRequest: boolean
}

/**
 * Hook for managing homework exception requests from children
 */
export function useHomeworkException({
  familyId,
  childId,
  enabled = true,
}: UseHomeworkExceptionOptions): UseHomeworkExceptionResult {
  const [pendingRequest, setPendingRequest] = useState<HomeworkExceptionRequest | null>(null)
  const [activeException, setActiveException] = useState<OfflineException | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [timeRemainingMinutes, setTimeRemainingMinutes] = useState<number | null>(null)

  // Subscribe to homework exceptions for this child
  useEffect(() => {
    if (!familyId || !childId || !enabled) {
      setPendingRequest(null)
      setActiveException(null)
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    const db = getFirestoreDb()
    const exceptionsRef = collection(db, 'families', familyId, 'offlineExceptions')
    const q = query(
      exceptionsRef,
      where('type', '==', 'homework'),
      where('requestedBy', '==', childId),
      orderBy('createdAt', 'desc'),
      limit(1)
    )

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        if (snapshot.empty) {
          setPendingRequest(null)
          setActiveException(null)
          setLoading(false)
          return
        }

        const docSnapshot = snapshot.docs[0]
        const data = docSnapshot.data()
        const createdAt =
          data.createdAt instanceof Timestamp ? data.createdAt.toMillis() : data.createdAt

        if (data.status === 'pending') {
          setPendingRequest({
            id: docSnapshot.id,
            familyId: data.familyId,
            requestedDuration: data.requestedDuration || DEFAULT_HOMEWORK_DURATION_MS,
            status: 'pending',
            requestedBy: data.requestedBy,
            requestedByName: data.requestedByName,
            createdAt,
          })
          setActiveException(null)
        } else if (data.status === 'active') {
          setActiveException({
            id: docSnapshot.id,
            familyId: data.familyId,
            type: 'homework',
            requestedBy: data.requestedBy,
            requestedByName: data.requestedByName,
            approvedBy: data.approvedBy,
            startTime: data.startTime,
            endTime: data.endTime,
            status: 'active',
            createdAt,
            whitelistedCategories: data.whitelistedCategories || ['education', 'reference'],
          })
          setPendingRequest(null)
        } else {
          setPendingRequest(null)
          setActiveException(null)
        }

        setLoading(false)
      },
      (err) => {
        console.error('[useHomeworkException] Error fetching exceptions:', err)
        setError('Failed to load homework exception status')
        setLoading(false)
      }
    )

    return () => unsubscribe()
  }, [familyId, childId, enabled])

  // Update time remaining for active exception
  useEffect(() => {
    if (!activeException?.endTime) {
      setTimeRemainingMinutes(null)
      return
    }

    const updateTimeRemaining = () => {
      const now = Date.now()
      const remaining = Math.max(0, activeException.endTime! - now)
      setTimeRemainingMinutes(Math.ceil(remaining / 60000))
    }

    updateTimeRemaining()
    const interval = setInterval(updateTimeRemaining, 60000) // Update every minute

    return () => clearInterval(interval)
  }, [activeException?.endTime])

  /**
   * Request homework time exception
   * AC4: Child can request homework exception
   */
  const requestHomeworkTime = useCallback(
    async (childName: string, durationMinutes = 60): Promise<string> => {
      if (!familyId || !childId) throw new Error('No family or child ID')

      // Validate duration
      const durationMs = durationMinutes * 60 * 1000
      if (durationMs < MIN_HOMEWORK_DURATION_MS || durationMs > MAX_HOMEWORK_DURATION_MS) {
        throw new Error(`Duration must be between 15 and 120 minutes`)
      }

      const db = getFirestoreDb()
      const exceptionsRef = collection(db, 'families', familyId, 'offlineExceptions')

      const request = {
        familyId,
        type: 'homework',
        requestedBy: childId,
        requestedByName: childName,
        requestedDuration: durationMs,
        status: 'pending',
        whitelistedCategories: ['education', 'reference'],
        createdAt: serverTimestamp(),
      }

      const docRef = await addDoc(exceptionsRef, request)
      return docRef.id
    },
    [familyId, childId]
  )

  /**
   * Cancel pending homework request
   */
  const cancelRequest = useCallback(async (): Promise<void> => {
    if (!familyId || !pendingRequest) throw new Error('No pending request')

    const db = getFirestoreDb()
    const exceptionRef = doc(db, 'families', familyId, 'offlineExceptions', pendingRequest.id)

    await updateDoc(exceptionRef, {
      status: 'cancelled',
      updatedAt: serverTimestamp(),
    })
  }, [familyId, pendingRequest])

  // Can request if no pending request and no active exception
  const canRequest = !pendingRequest && !activeException

  return {
    pendingRequest,
    activeException,
    loading,
    error,
    requestHomeworkTime,
    cancelRequest,
    timeRemainingMinutes,
    canRequest,
  }
}

/**
 * Hook for parents to manage homework exception approvals
 */
export interface UseHomeworkApprovalsOptions {
  /** Family ID */
  familyId: string | null
  /** Whether to enable the hook */
  enabled?: boolean
}

export interface UseHomeworkApprovalsResult {
  /** Pending homework requests awaiting approval */
  pendingRequests: HomeworkExceptionRequest[]
  /** Loading state */
  loading: boolean
  /** Error message */
  error: string | null
  /** Approve a homework request */
  approveRequest: (requestId: string, parentUid: string, durationMinutes?: number) => Promise<void>
  /** Deny a homework request */
  denyRequest: (requestId: string, parentUid: string, reason?: string) => Promise<void>
}

export function useHomeworkApprovals({
  familyId,
  enabled = true,
}: UseHomeworkApprovalsOptions): UseHomeworkApprovalsResult {
  const [pendingRequests, setPendingRequests] = useState<HomeworkExceptionRequest[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Subscribe to pending homework requests
  useEffect(() => {
    if (!familyId || !enabled) {
      setPendingRequests([])
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    const db = getFirestoreDb()
    const exceptionsRef = collection(db, 'families', familyId, 'offlineExceptions')
    const q = query(
      exceptionsRef,
      where('type', '==', 'homework'),
      where('status', '==', 'pending'),
      orderBy('createdAt', 'desc')
    )

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const requests: HomeworkExceptionRequest[] = []
        snapshot.forEach((docSnapshot) => {
          const data = docSnapshot.data()
          requests.push({
            id: docSnapshot.id,
            familyId: data.familyId,
            requestedDuration: data.requestedDuration || DEFAULT_HOMEWORK_DURATION_MS,
            status: 'pending',
            requestedBy: data.requestedBy,
            requestedByName: data.requestedByName,
            createdAt:
              data.createdAt instanceof Timestamp ? data.createdAt.toMillis() : data.createdAt,
          })
        })
        setPendingRequests(requests)
        setLoading(false)
      },
      (err) => {
        console.error('[useHomeworkApprovals] Error fetching requests:', err)
        setError('Failed to load homework requests')
        setLoading(false)
      }
    )

    return () => unsubscribe()
  }, [familyId, enabled])

  /**
   * Approve a homework request
   * AC4: Parent approves remotely
   */
  const approveRequest = useCallback(
    async (requestId: string, parentUid: string, durationMinutes?: number): Promise<void> => {
      if (!familyId) throw new Error('No family ID')

      const request = pendingRequests.find((r) => r.id === requestId)
      if (!request) throw new Error('Request not found')

      const durationMs = durationMinutes ? durationMinutes * 60 * 1000 : request.requestedDuration

      const db = getFirestoreDb()
      const exceptionRef = doc(db, 'families', familyId, 'offlineExceptions', requestId)

      await updateDoc(exceptionRef, {
        status: 'active',
        approvedBy: parentUid,
        startTime: Date.now(),
        endTime: Date.now() + durationMs,
        updatedAt: serverTimestamp(),
      })
    },
    [familyId, pendingRequests]
  )

  /**
   * Deny a homework request
   * AC4: Parent denies remotely
   */
  const denyRequest = useCallback(
    async (requestId: string, parentUid: string, reason?: string): Promise<void> => {
      if (!familyId) throw new Error('No family ID')

      const db = getFirestoreDb()
      const exceptionRef = doc(db, 'families', familyId, 'offlineExceptions', requestId)

      await updateDoc(exceptionRef, {
        status: 'denied',
        approvedBy: parentUid,
        denialReason: reason,
        updatedAt: serverTimestamp(),
      })
    },
    [familyId]
  )

  return {
    pendingRequests,
    loading,
    error,
    approveRequest,
    denyRequest,
  }
}
