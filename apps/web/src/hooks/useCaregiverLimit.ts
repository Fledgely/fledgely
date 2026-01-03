'use client'

/**
 * useCaregiverLimit Hook - Story 39.1
 *
 * Real-time listener for caregiver count and limit tracking.
 * Used by caregiver management UI to show remaining slots and enforce limits.
 *
 * Requirements:
 * - AC2: Maximum 5 caregivers per family
 * - AC5: Show "3 of 5 caregivers" count
 */

import { useState, useEffect } from 'react'
import { collection, doc, onSnapshot, query, where } from 'firebase/firestore'
import { getFirestoreDb } from '../lib/firebase'
import { MAX_CAREGIVERS_PER_FAMILY } from '@fledgely/shared/contracts'

/**
 * Caregiver limit information
 */
export interface CaregiverLimitInfo {
  /** Total count (active + pending) */
  currentCount: number
  /** Maximum allowed (always 5) */
  maxAllowed: number
  /** Slots remaining */
  remaining: number
  /** Whether at or over limit */
  isAtLimit: boolean
  /** Number of active caregivers */
  activeCount: number
  /** Number of pending invitations */
  pendingCount: number
}

interface UseCaregiverLimitOptions {
  familyId: string | null
  enabled?: boolean
}

interface UseCaregiverLimitResult {
  limit: CaregiverLimitInfo | null
  loading: boolean
  error: string | null
}

/**
 * Hook to track caregiver counts and limit status.
 *
 * Task 6: useCaregiverLimit Hook (AC: #2, #5)
 * - Returns current count, max allowed, and remaining
 * - Includes both active caregivers and pending invitations
 * - Provides isAtLimit boolean for UI state
 */
export function useCaregiverLimit({
  familyId,
  enabled = true,
}: UseCaregiverLimitOptions): UseCaregiverLimitResult {
  const [limit, setLimit] = useState<CaregiverLimitInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Track pending count separately since it's from different collection
  const [pendingCount, setPendingCount] = useState(0)
  const [activeCount, setActiveCount] = useState(0)
  const [familyLoaded, setFamilyLoaded] = useState(false)
  const [pendingLoaded, setPendingLoaded] = useState(false)

  // Listen to family document for active caregivers count
  useEffect(() => {
    if (!familyId || !enabled) {
      setActiveCount(0)
      setFamilyLoaded(true)
      return
    }

    setFamilyLoaded(false)
    const db = getFirestoreDb()
    const familyRef = doc(db, 'families', familyId)

    const unsubscribe = onSnapshot(
      familyRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data()
          const caregivers = data.caregivers || []
          setActiveCount(caregivers.length)
        } else {
          setActiveCount(0)
        }
        setFamilyLoaded(true)
      },
      (err) => {
        if (process.env.NODE_ENV === 'development') {
          console.error('Error listening to family for caregiver count:', err)
        }
        setError('Failed to load caregiver count')
        setFamilyLoaded(true)
      }
    )

    return () => unsubscribe()
  }, [familyId, enabled])

  // Listen to pending invitations count
  useEffect(() => {
    if (!familyId || !enabled) {
      setPendingCount(0)
      setPendingLoaded(true)
      return
    }

    setPendingLoaded(false)
    const db = getFirestoreDb()
    const invitationsRef = collection(db, 'caregiverInvitations')

    // Query pending invitations for this family
    const pendingQuery = query(
      invitationsRef,
      where('familyId', '==', familyId),
      where('status', '==', 'pending')
    )

    const unsubscribe = onSnapshot(
      pendingQuery,
      (snapshot) => {
        setPendingCount(snapshot.size)
        setPendingLoaded(true)
      },
      (err) => {
        if (process.env.NODE_ENV === 'development') {
          console.error('Error listening to pending invitations:', err)
        }
        // Don't set error, just assume 0 pending
        setPendingCount(0)
        setPendingLoaded(true)
      }
    )

    return () => unsubscribe()
  }, [familyId, enabled])

  // Combine counts and compute limit info
  useEffect(() => {
    if (!familyId || !enabled) {
      setLimit(null)
      setLoading(false)
      return
    }

    if (familyLoaded && pendingLoaded) {
      const currentCount = activeCount + pendingCount
      const remaining = Math.max(0, MAX_CAREGIVERS_PER_FAMILY - currentCount)

      setLimit({
        currentCount,
        maxAllowed: MAX_CAREGIVERS_PER_FAMILY,
        remaining,
        isAtLimit: currentCount >= MAX_CAREGIVERS_PER_FAMILY,
        activeCount,
        pendingCount,
      })
      setLoading(false)
    } else {
      setLoading(true)
    }
  }, [familyId, enabled, familyLoaded, pendingLoaded, activeCount, pendingCount])

  return {
    limit,
    loading,
    error,
  }
}
