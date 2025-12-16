'use client'

import { useState, useEffect } from 'react'
import { doc, onSnapshot } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import {
  type SigningStatus,
  canChildSign as checkCanChildSign,
  canParentSign as checkCanParentSign,
} from '@fledgely/contracts'

/**
 * Options for the useSigningOrder hook
 */
export interface UseSigningOrderOptions {
  /** Family ID */
  familyId: string
  /** Agreement ID to check signing status */
  agreementId: string
}

/**
 * Return type for the useSigningOrder hook
 */
export interface UseSigningOrderResult {
  /** Whether the child can currently sign (parent has signed) */
  canChildSign: boolean
  /** Whether the parent can currently sign (no one has signed yet) */
  canParentSign: boolean
  /** Child-friendly message when waiting for parent */
  waitingMessage: string | null
  /** Current signing status */
  signingStatus: SigningStatus | null
  /** Whether signing is complete (both parties signed) */
  isComplete: boolean
  /** Whether data is still loading */
  loading: boolean
  /** Error if document doesn't exist or fetch fails */
  error: Error | null
}

/**
 * useSigningOrder Hook
 *
 * Story 6.1: Child Digital Signature Ceremony - Task 6
 *
 * Checks and enforces the parent-first signing order to prevent
 * coercion pressure on children. Parent must sign first so that
 * the child sees the parent has already committed before signing.
 *
 * Features:
 * - Task 6.1: Check signing eligibility (canChildSign)
 * - Task 6.2: Query agreement status for existing parent signature
 * - Task 6.3-6.5: Show waiting message with child-friendly language
 * - Task 6.6: Auto-refresh when parent signature is detected (real-time)
 *
 * @example
 * ```tsx
 * const { canChildSign, waitingMessage, loading } = useSigningOrder({
 *   familyId: 'family-123',
 *   agreementId: 'agreement-456',
 * })
 *
 * if (loading) return <Spinner />
 * if (!canChildSign) return <WaitingMessage message={waitingMessage} />
 * return <SigningCeremony />
 * ```
 */
export function useSigningOrder({
  familyId,
  agreementId,
}: UseSigningOrderOptions): UseSigningOrderResult {
  const [signingStatus, setSigningStatus] = useState<SigningStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    // Set up real-time listener for agreement document
    const docRef = doc(db, 'families', familyId, 'agreements', agreementId)

    const unsubscribe = onSnapshot(
      docRef,
      (snapshot) => {
        if (!snapshot.exists()) {
          setError(new Error('Agreement not found'))
          setLoading(false)
          return
        }

        const data = snapshot.data()
        setSigningStatus(data?.signingStatus as SigningStatus ?? 'pending')
        setLoading(false)
        setError(null)
      },
      (err) => {
        setError(err)
        setLoading(false)
      }
    )

    return unsubscribe
  }, [familyId, agreementId])

  // Compute derived values
  const canChildSign = signingStatus ? checkCanChildSign(signingStatus) : false
  const canParentSign = signingStatus ? checkCanParentSign(signingStatus) : false
  const isComplete = signingStatus === 'complete'

  // Generate waiting message for child (Task 6.5)
  // Using child-friendly language at 6th-grade reading level (NFR65)
  const waitingMessage =
    signingStatus === 'pending'
      ? "Your parent needs to sign first. This shows you that they're making the same promise you are!"
      : null

  return {
    canChildSign,
    canParentSign,
    waitingMessage,
    signingStatus,
    isComplete,
    loading,
    error,
  }
}
