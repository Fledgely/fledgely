'use client'

/**
 * useEnrollmentRequests Hook - Story 12.3
 *
 * Real-time listener for pending enrollment requests.
 * Used by dashboard to show approval notifications.
 *
 * Requirements:
 * - AC2: Parent notification via real-time listener
 * - AC3: Approval interface data
 */

import { useState, useEffect } from 'react'
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore'
import { getFirestoreDb } from '../lib/firebase'
import type { EnrollmentRequest } from '../components/devices/EnrollmentApprovalModal'

interface UseEnrollmentRequestsOptions {
  familyId: string | null
  enabled?: boolean
}

interface UseEnrollmentRequestsResult {
  pendingRequests: EnrollmentRequest[]
  loading: boolean
  error: string | null
}

/**
 * Hook to listen for pending enrollment requests in a family.
 * Returns real-time list of pending requests for approval.
 */
export function useEnrollmentRequests({
  familyId,
  enabled = true,
}: UseEnrollmentRequestsOptions): UseEnrollmentRequestsResult {
  const [pendingRequests, setPendingRequests] = useState<EnrollmentRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!familyId || !enabled) {
      setPendingRequests([])
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    const db = getFirestoreDb()
    const requestsRef = collection(db, 'families', familyId, 'enrollmentRequests')

    // Query for pending requests only, ordered by creation time
    const pendingQuery = query(
      requestsRef,
      where('status', '==', 'pending'),
      orderBy('createdAt', 'desc')
    )

    // Set up real-time listener
    const unsubscribe = onSnapshot(
      pendingQuery,
      (snapshot) => {
        const requests: EnrollmentRequest[] = []
        const now = Date.now()

        snapshot.forEach((doc) => {
          const data = doc.data()
          const expiresAtMs = data.expiresAt?.seconds
            ? data.expiresAt.seconds * 1000
            : data.expiresAt

          // Filter out expired requests (shouldn't happen often due to scheduled function)
          if (expiresAtMs > now) {
            requests.push({
              id: doc.id,
              familyId: data.familyId,
              deviceInfo: data.deviceInfo,
              status: data.status,
              createdAt: data.createdAt,
              expiresAt: data.expiresAt,
            })
          }
        })

        setPendingRequests(requests)
        setLoading(false)
      },
      (err) => {
        console.error('Error listening to enrollment requests:', err)
        setError('Failed to load enrollment requests')
        setLoading(false)
      }
    )

    return () => unsubscribe()
  }, [familyId, enabled])

  return {
    pendingRequests,
    loading,
    error,
  }
}

/**
 * Helper hook to check if there are any pending enrollment requests.
 * Useful for showing notification badges.
 */
export function useHasPendingEnrollments(familyId: string | null): boolean {
  const { pendingRequests } = useEnrollmentRequests({ familyId })
  return pendingRequests.length > 0
}
