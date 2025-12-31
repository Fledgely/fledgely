/**
 * useChildAppApprovals Hook.
 *
 * Story 24.3: Explicit Approval of Categories - AC1, AC5, AC7
 *
 * Provides real-time subscription to a child's app category approvals.
 */

import { useState, useEffect } from 'react'
import type { AppCategoryApproval } from '@fledgely/shared'
import { subscribeToChildAppApprovals } from '../services/appApprovalService'

/**
 * Hook return type.
 */
export interface UseChildAppApprovalsResult {
  /** Array of app category approvals */
  approvals: AppCategoryApproval[]
  /** Loading state */
  loading: boolean
  /** Error message if any */
  error: string | null
}

/**
 * Subscribe to a child's app category approvals.
 *
 * Story 24.3: Explicit Approval of Categories - AC1, AC5, AC7
 *
 * @param childId - Child to subscribe to (null to skip)
 * @returns Approvals, loading state, and error
 */
export function useChildAppApprovals(childId: string | null): UseChildAppApprovalsResult {
  const [approvals, setApprovals] = useState<AppCategoryApproval[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!childId) {
      setApprovals([])
      setLoading(false)
      setError(null)
      return
    }

    setLoading(true)
    setError(null)

    const unsubscribe = subscribeToChildAppApprovals(
      childId,
      (newApprovals) => {
        setApprovals(newApprovals)
        setLoading(false)
        setError(null)
      },
      (subscriptionError) => {
        setError(subscriptionError.message)
        setLoading(false)
      }
    )

    return () => {
      unsubscribe()
    }
  }, [childId])

  return { approvals, loading, error }
}
