/**
 * useChangeRequest Hook - Story 19C.5
 *
 * Manages change request form submission state.
 * Handles loading, success, and error states.
 *
 * Task 4: Create useChangeRequest hook (AC: #3)
 */

import { useState, useCallback } from 'react'
import {
  submitChangeRequest,
  createParentNotification,
  ChangeRequestInput,
} from '../services/agreementChangeService'
import type { ChangeRequestData } from '../components/child/ChangeRequestForm'

/**
 * Result from useChangeRequest hook
 */
export interface UseChangeRequestResult {
  /** Submit a change request */
  submit: (data: ChangeRequestData) => Promise<void>
  /** Whether a submission is in progress */
  isSubmitting: boolean
  /** Whether submission was successful */
  isSuccess: boolean
  /** Error message if submission failed */
  error: string | null
  /** Reset the hook state */
  reset: () => void
}

/**
 * Props for useChangeRequest hook
 */
export interface UseChangeRequestProps {
  /** Child's user ID */
  childId: string
  /** Child's display name */
  childName: string
  /** Family ID */
  familyId: string
  /** Agreement ID */
  agreementId: string
}

/**
 * Hook to handle change request form submission.
 *
 * Manages the full submission lifecycle including:
 * - Creating the request in Firestore
 * - Creating parent notification
 * - Tracking loading, success, and error states
 */
export function useChangeRequest({
  childId,
  childName,
  familyId,
  agreementId,
}: UseChangeRequestProps): UseChangeRequestResult {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = useCallback(
    async (data: ChangeRequestData) => {
      setIsSubmitting(true)
      setError(null)

      try {
        // Submit the change request
        const input: ChangeRequestInput = {
          childId,
          childName,
          familyId,
          agreementId,
          whatToChange: data.whatToChange,
          why: data.why,
        }

        const result = await submitChangeRequest(input)

        // Create parent notification (AC3)
        await createParentNotification(familyId, result.requestId, childName)

        setIsSuccess(true)
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to send request'
        setError(message)
        throw err // Re-throw so caller can handle if needed
      } finally {
        setIsSubmitting(false)
      }
    },
    [childId, childName, familyId, agreementId]
  )

  const reset = useCallback(() => {
    setIsSubmitting(false)
    setIsSuccess(false)
    setError(null)
  }, [])

  return {
    submit,
    isSubmitting,
    isSuccess,
    error,
    reset,
  }
}
