'use client'

/**
 * useAbuseReport Hook
 *
 * Story 51.5: Abuse Reporting - AC1, AC3, AC4
 *
 * Hook for submitting abuse reports via the public HTTP endpoint.
 * No authentication required.
 *
 * Requirements:
 * - AC1: Public access (no auth required)
 * - AC3: Anonymous option available
 * - AC4: Report acknowledgment with reference number
 */

import { useState, useCallback } from 'react'
import type { AbuseReportSubmission, SubmitAbuseReportResponse } from '@fledgely/shared'

interface UseAbuseReportResult {
  /** Submit an abuse report */
  submit: (data: AbuseReportSubmission) => Promise<void>
  /** Whether a submission is currently in progress */
  isLoading: boolean
  /** Error message if submission failed */
  error: string | null
  /** Whether submission was successful */
  isSuccess: boolean
  /** Reference number (if not anonymous) */
  referenceNumber: string | null
  /** Success message from server */
  successMessage: string | null
  /** Reset the hook state for a new submission */
  reset: () => void
}

/**
 * Get the Firebase Functions base URL based on environment.
 */
function getFunctionsBaseUrl(): string {
  // In development with emulators
  if (
    typeof window !== 'undefined' &&
    process.env.NODE_ENV === 'development' &&
    process.env.NEXT_PUBLIC_USE_EMULATORS === 'true'
  ) {
    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'demo-fledgely'
    return `http://localhost:5001/${projectId}/us-central1`
  }

  // Production
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
  if (!projectId) {
    throw new Error('NEXT_PUBLIC_FIREBASE_PROJECT_ID is not configured')
  }

  return `https://us-central1-${projectId}.cloudfunctions.net`
}

/**
 * Hook to submit abuse reports.
 *
 * Example usage:
 * ```tsx
 * const { submit, isLoading, error, isSuccess, referenceNumber } = useAbuseReport()
 *
 * const handleSubmit = async (data: AbuseReportSubmission) => {
 *   await submit(data)
 * }
 * ```
 */
export function useAbuseReport(): UseAbuseReportResult {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isSuccess, setIsSuccess] = useState(false)
  const [referenceNumber, setReferenceNumber] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const submit = useCallback(async (data: AbuseReportSubmission): Promise<void> => {
    setIsLoading(true)
    setError(null)
    setIsSuccess(false)
    setReferenceNumber(null)
    setSuccessMessage(null)

    try {
      const baseUrl = getFunctionsBaseUrl()
      const response = await fetch(`${baseUrl}/submitAbuseReport`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      const result: SubmitAbuseReportResponse = await response.json()

      if (response.ok && result.success) {
        setIsSuccess(true)
        setReferenceNumber(result.referenceNumber || null)
        setSuccessMessage(result.message)
      } else {
        // Handle error response
        setError(result.message || 'Unable to submit your report. Please try again.')
      }
    } catch (err: unknown) {
      // Network or parsing error
      console.error('[Abuse Report]', err)
      setError('Unable to submit your report. Please check your connection and try again.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  const reset = useCallback(() => {
    setIsLoading(false)
    setError(null)
    setIsSuccess(false)
    setReferenceNumber(null)
    setSuccessMessage(null)
  }, [])

  return {
    submit,
    isLoading,
    error,
    isSuccess,
    referenceNumber,
    successMessage,
    reset,
  }
}
