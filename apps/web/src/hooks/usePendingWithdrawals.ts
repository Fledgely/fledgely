'use client'

/**
 * usePendingWithdrawals Hook - Story 6.6
 *
 * Fetches pending consent withdrawal requests for a family.
 * Used by parents to see when a child has requested to withdraw consent.
 *
 * Story 6.6 AC4: Parent is immediately notified when child initiates withdrawal
 */

import { useState, useEffect } from 'react'
import { collection, query, where, onSnapshot, Timestamp } from 'firebase/firestore'
import { getFirestoreDb } from '../lib/firebase'

/**
 * Withdrawal status type
 */
export type WithdrawalStatus = 'pending' | 'cancelled' | 'executed'

/**
 * Pending withdrawal request for dashboard display
 */
export interface PendingWithdrawal {
  requestId: string
  childId: string
  familyId: string
  deviceId: string
  status: WithdrawalStatus
  requestedAt: Date
  expiresAt: Date
}

/**
 * Result from usePendingWithdrawals hook
 */
export interface PendingWithdrawalsResult {
  withdrawals: PendingWithdrawal[]
  loading: boolean
  error: string | null
}

/**
 * Format countdown time remaining
 */
export function formatTimeRemaining(expiresAt: Date): string {
  const now = Date.now()
  const remaining = expiresAt.getTime() - now

  if (remaining <= 0) {
    return 'Processing...'
  }

  const hours = Math.floor(remaining / (1000 * 60 * 60))
  const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60))

  if (hours > 0) {
    return `${hours}h ${minutes}m remaining`
  }
  return `${minutes}m remaining`
}

/**
 * Hook to get pending consent withdrawal requests for a family
 *
 * @param familyId - The family ID to get withdrawals for
 * @returns Pending withdrawals result with array of requests
 */
export function usePendingWithdrawals(familyId: string | null): PendingWithdrawalsResult {
  const [withdrawals, setWithdrawals] = useState<PendingWithdrawal[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!familyId) {
      setWithdrawals([])
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    // Query for pending withdrawal requests for this family
    const db = getFirestoreDb()
    const withdrawalsRef = collection(db, 'withdrawalRequests')
    const q = query(
      withdrawalsRef,
      where('familyId', '==', familyId),
      where('status', '==', 'pending')
    )

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const results: PendingWithdrawal[] = []

        snapshot.forEach((doc) => {
          const data = doc.data()
          results.push({
            requestId: doc.id,
            childId: data.childId,
            familyId: data.familyId,
            deviceId: data.deviceId,
            status: data.status,
            requestedAt:
              data.requestedAt instanceof Timestamp
                ? data.requestedAt.toDate()
                : new Date(data.requestedAt),
            expiresAt:
              data.expiresAt instanceof Timestamp
                ? data.expiresAt.toDate()
                : new Date(data.expiresAt),
          })
        })

        // Sort by expiresAt (soonest first)
        results.sort((a, b) => a.expiresAt.getTime() - b.expiresAt.getTime())

        setWithdrawals(results)
        setLoading(false)
      },
      (err) => {
        console.error('[usePendingWithdrawals] Error:', err)
        setError('Failed to load pending withdrawals')
        setLoading(false)
      }
    )

    return () => unsubscribe()
  }, [familyId])

  return { withdrawals, loading, error }
}
