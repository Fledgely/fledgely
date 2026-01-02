/**
 * useReviewRequestCooldown Hook - Story 34.5.3 Task 5
 *
 * Hook for managing review request cooldown state.
 * AC4: Rate Limiting (60-Day Cooldown)
 */

import { useState, useEffect, useCallback } from 'react'
import {
  checkReviewRequestCooldown,
  submitReviewRequest,
} from '@fledgely/shared/services/agreementReviewRequestService'
import type {
  CooldownStatus,
  AgreementReviewRequest,
} from '@fledgely/shared/contracts/agreementReviewRequest'

interface UseReviewRequestCooldownReturn {
  /** Full cooldown status object */
  cooldownStatus: CooldownStatus | null
  /** Loading state */
  loading: boolean
  /** Error if any occurred */
  error: Error | null
  /** Whether the child can currently make a request */
  canRequest: boolean
  /** Number of days remaining in cooldown */
  daysRemaining: number
  /** Submit a new review request */
  submitRequest: () => Promise<AgreementReviewRequest | null>
  /** Whether a request is currently being submitted */
  isSubmitting: boolean
}

/**
 * Hook for managing review request cooldown state.
 *
 * @param familyId - Family's unique identifier
 * @param childId - Child's unique identifier
 * @param childName - Child's display name
 * @param agreementId - Agreement being reviewed
 * @returns Cooldown status and request submission function
 */
export function useReviewRequestCooldown(
  familyId: string,
  childId: string,
  childName: string,
  agreementId: string
): UseReviewRequestCooldownReturn {
  const [cooldownStatus, setCooldownStatus] = useState<CooldownStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Fetch cooldown status on mount and when IDs change
  useEffect(() => {
    let isMounted = true

    async function fetchCooldownStatus() {
      if (!familyId || !childId) {
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        setError(null)

        const status = await checkReviewRequestCooldown(familyId, childId)

        if (isMounted) {
          setCooldownStatus(status)
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err : new Error('Failed to check cooldown status'))
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    fetchCooldownStatus()

    return () => {
      isMounted = false
    }
  }, [familyId, childId])

  // Submit a new review request
  const submitRequest = useCallback(async (): Promise<AgreementReviewRequest | null> => {
    if (!familyId || !childId || !childName || !agreementId) {
      return null
    }

    try {
      setIsSubmitting(true)
      setError(null)

      const request = await submitReviewRequest(familyId, childId, childName, agreementId)

      // Update cooldown status after successful submission
      setCooldownStatus({
        canRequest: false,
        lastRequestAt: request.requestedAt,
        nextAvailableAt: new Date(request.requestedAt.getTime() + 60 * 24 * 60 * 60 * 1000),
        daysRemaining: 60,
      })

      return request
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to submit review request'))
      return null
    } finally {
      setIsSubmitting(false)
    }
  }, [familyId, childId, childName, agreementId])

  return {
    cooldownStatus,
    loading,
    error,
    canRequest: cooldownStatus?.canRequest ?? false,
    daysRemaining: cooldownStatus?.daysRemaining ?? 0,
    submitRequest,
    isSubmitting,
  }
}
