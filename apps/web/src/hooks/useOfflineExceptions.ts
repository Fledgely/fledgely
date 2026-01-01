/**
 * useOfflineExceptions Hook - Story 32.5
 *
 * Manages offline time exceptions for families.
 *
 * Features:
 * - AC1: Pause offline time with logging
 * - AC5: One-time skip functionality
 * - AC6: All exceptions logged in audit trail
 *
 * @example
 * const { exceptions, pauseOfflineTime, skipTonight } = useOfflineExceptions({
 *   familyId: 'family-123',
 * })
 */

import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  updateDoc,
  doc,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore'
import { getFirestoreDb } from '../lib/firebase'
import type { OfflineException } from '@fledgely/shared'
import { OFFLINE_EXCEPTION_MESSAGES } from '@fledgely/shared'

export interface UseOfflineExceptionsOptions {
  /** Family ID to fetch exceptions for */
  familyId: string | null
  /** Whether to enable the hook */
  enabled?: boolean
  /** Limit number of exceptions to fetch */
  limit?: number
}

export interface UseOfflineExceptionsResult {
  /** List of exceptions */
  exceptions: OfflineException[]
  /** Currently active exception (if any) */
  activeException: OfflineException | null
  /** Loading state */
  loading: boolean
  /** Error message */
  error: string | null
  /** Pause offline time */
  pauseOfflineTime: (parentUid: string, parentName: string, reason?: string) => Promise<string>
  /** Resume offline time (end pause) */
  resumeOfflineTime: (exceptionId: string) => Promise<void>
  /** Skip tonight's offline time */
  skipTonight: (parentUid: string, parentName: string, reason?: string) => Promise<string>
  /** Cancel an exception */
  cancelException: (exceptionId: string) => Promise<void>
  /** Get display message for an exception */
  getDisplayMessage: (exception: OfflineException) => string
  /** Messages constant */
  messages: typeof OFFLINE_EXCEPTION_MESSAGES
}

/**
 * Hook for managing offline time exceptions
 */
export function useOfflineExceptions({
  familyId,
  enabled = true,
  limit = 50,
}: UseOfflineExceptionsOptions): UseOfflineExceptionsResult {
  const [exceptions, setExceptions] = useState<OfflineException[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Subscribe to exceptions
  useEffect(() => {
    if (!familyId || !enabled) {
      setExceptions([])
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    const db = getFirestoreDb()
    const exceptionsRef = collection(db, 'families', familyId, 'offlineExceptions')
    const q = query(exceptionsRef, orderBy('createdAt', 'desc'))

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const exceptionList: OfflineException[] = []
        snapshot.forEach((docSnapshot) => {
          const data = docSnapshot.data()
          exceptionList.push({
            id: docSnapshot.id,
            familyId: data.familyId,
            type: data.type,
            requestedBy: data.requestedBy,
            requestedByName: data.requestedByName,
            approvedBy: data.approvedBy,
            reason: data.reason,
            startTime: data.startTime,
            endTime: data.endTime,
            whitelistedUrls: data.whitelistedUrls,
            whitelistedCategories: data.whitelistedCategories,
            status: data.status,
            createdAt:
              data.createdAt instanceof Timestamp ? data.createdAt.toMillis() : data.createdAt,
            updatedAt:
              data.updatedAt instanceof Timestamp ? data.updatedAt.toMillis() : data.updatedAt,
          })
        })
        setExceptions(exceptionList.slice(0, limit))
        setLoading(false)
      },
      (err) => {
        console.error('[useOfflineExceptions] Error fetching exceptions:', err)
        setError('Failed to load exceptions')
        setLoading(false)
      }
    )

    return () => unsubscribe()
  }, [familyId, enabled, limit])

  // Find currently active exception
  const activeException = useMemo(() => {
    return exceptions.find((e) => e.status === 'active') || null
  }, [exceptions])

  /**
   * Pause offline time
   * Story 32.5 AC1: Pause offline time with logging
   */
  const pauseOfflineTime = useCallback(
    async (parentUid: string, parentName: string, reason?: string): Promise<string> => {
      if (!familyId) throw new Error('No family ID')

      const db = getFirestoreDb()
      const exceptionsRef = collection(db, 'families', familyId, 'offlineExceptions')

      const exception: Omit<OfflineException, 'id'> = {
        familyId,
        type: 'pause',
        requestedBy: parentUid,
        requestedByName: parentName,
        reason,
        startTime: Date.now(),
        endTime: null, // Open-ended until resumed
        status: 'active',
        createdAt: Date.now(),
      }

      const docRef = await addDoc(exceptionsRef, {
        ...exception,
        createdAt: serverTimestamp(),
      })

      return docRef.id
    },
    [familyId]
  )

  /**
   * Resume offline time (end pause)
   * Story 32.5 AC1: Resume after pause
   */
  const resumeOfflineTime = useCallback(
    async (exceptionId: string): Promise<void> => {
      if (!familyId) throw new Error('No family ID')

      const db = getFirestoreDb()
      const exceptionRef = doc(db, 'families', familyId, 'offlineExceptions', exceptionId)

      await updateDoc(exceptionRef, {
        status: 'completed',
        endTime: Date.now(),
        updatedAt: serverTimestamp(),
      })
    },
    [familyId]
  )

  /**
   * Skip tonight's offline time
   * Story 32.5 AC5: One-time skip
   */
  const skipTonight = useCallback(
    async (parentUid: string, parentName: string, reason?: string): Promise<string> => {
      if (!familyId) throw new Error('No family ID')

      const db = getFirestoreDb()
      const exceptionsRef = collection(db, 'families', familyId, 'offlineExceptions')

      // Calculate end of today (midnight)
      const now = new Date()
      const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0)

      const exception: Omit<OfflineException, 'id'> = {
        familyId,
        type: 'skip',
        requestedBy: parentUid,
        requestedByName: parentName,
        reason,
        startTime: Date.now(),
        endTime: endOfToday.getTime(), // Expires at midnight
        status: 'active',
        createdAt: Date.now(),
      }

      const docRef = await addDoc(exceptionsRef, {
        ...exception,
        createdAt: serverTimestamp(),
      })

      return docRef.id
    },
    [familyId]
  )

  /**
   * Cancel an exception
   */
  const cancelException = useCallback(
    async (exceptionId: string): Promise<void> => {
      if (!familyId) throw new Error('No family ID')

      const db = getFirestoreDb()
      const exceptionRef = doc(db, 'families', familyId, 'offlineExceptions', exceptionId)

      await updateDoc(exceptionRef, {
        status: 'cancelled',
        updatedAt: serverTimestamp(),
      })
    },
    [familyId]
  )

  /**
   * Get display message for an exception
   * Story 32.5 AC6: Transparent logging
   */
  const getDisplayMessage = useCallback((exception: OfflineException): string => {
    const name = exception.requestedByName || 'Parent'

    switch (exception.type) {
      case 'pause':
        return exception.status === 'active'
          ? OFFLINE_EXCEPTION_MESSAGES.pauseStarted(name)
          : OFFLINE_EXCEPTION_MESSAGES.pauseEnded(name)
      case 'skip':
        return OFFLINE_EXCEPTION_MESSAGES.skipActivated(name)
      case 'work':
        return OFFLINE_EXCEPTION_MESSAGES.workExceptionStarted(name)
      case 'homework':
        return OFFLINE_EXCEPTION_MESSAGES.homeworkRequested(name)
      default:
        return `${name} created an exception`
    }
  }, [])

  return {
    exceptions,
    activeException,
    loading,
    error,
    pauseOfflineTime,
    resumeOfflineTime,
    skipTonight,
    cancelException,
    getDisplayMessage,
    messages: OFFLINE_EXCEPTION_MESSAGES,
  }
}

/**
 * Hook to check if offline time is currently paused or skipped
 */
export function useIsOfflineTimePaused(familyId: string | null): {
  isPaused: boolean
  isSkipped: boolean
  activeException: OfflineException | null
  loading: boolean
} {
  const { activeException, loading } = useOfflineExceptions({
    familyId,
    enabled: !!familyId,
  })

  return {
    isPaused: activeException?.type === 'pause',
    isSkipped: activeException?.type === 'skip',
    activeException,
    loading,
  }
}
