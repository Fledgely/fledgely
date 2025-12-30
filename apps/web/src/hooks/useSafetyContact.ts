'use client'

/**
 * useSafetyContact Hook
 *
 * Story 0.5.1: Secure Safety Contact Channel - AC4, AC6
 *
 * Hook for submitting safety contact requests via the submitSafetyContact
 * callable function.
 *
 * CRITICAL SAFETY DESIGN:
 * - Returns neutral, calming error messages
 * - No indication of internal system state to potential abuser
 * - Works for both authenticated and unauthenticated users
 * - No local storage of form data (safety concern)
 *
 * Requirements:
 * - AC4: Form accepts message and safe contact info
 * - AC6: Form submission encrypted at rest and in transit
 */

import { useState, useCallback } from 'react'
import { httpsCallable, HttpsCallableResult } from 'firebase/functions'
import { getFirebaseFunctions } from '../lib/firebase'
import type { SafetyContactInput, SafetyContactResponse } from '@fledgely/shared/contracts'

interface UseSafetyContactResult {
  /** Submit the safety contact form */
  submit: (data: SafetyContactInput) => Promise<void>
  /** Whether a submission is currently in progress */
  isLoading: boolean
  /** Error message if submission failed (neutral language) */
  error: string | null
  /** Whether submission was successful */
  isSuccess: boolean
  /** Reset the hook state for a new submission */
  reset: () => void
}

/**
 * Hook to submit safety contact requests.
 *
 * CRITICAL: This hook intentionally uses neutral error messages
 * to avoid revealing system internals to potential abusers.
 *
 * Example usage:
 * ```tsx
 * const { submit, isLoading, error, isSuccess } = useSafetyContact()
 *
 * const handleSubmit = async (data: SafetyContactInput) => {
 *   await submit(data)
 * }
 * ```
 */
export function useSafetyContact(): UseSafetyContactResult {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isSuccess, setIsSuccess] = useState(false)

  const submit = useCallback(async (data: SafetyContactInput): Promise<void> => {
    setIsLoading(true)
    setError(null)
    setIsSuccess(false)

    try {
      const functions = getFirebaseFunctions()
      const submitSafetyContactFn = httpsCallable<SafetyContactInput, SafetyContactResponse>(
        functions,
        'submitSafetyContact'
      )

      const result: HttpsCallableResult<SafetyContactResponse> = await submitSafetyContactFn(data)

      if (result.data.success) {
        setIsSuccess(true)
      } else {
        // This shouldn't happen normally, but handle gracefully
        setError('Unable to send your message. Please try again.')
      }
    } catch (err: unknown) {
      // CRITICAL: Use neutral error messages
      // Don't reveal system internals or specific error details
      const errorCode = (err as { code?: string })?.code || ''

      if (errorCode === 'functions/resource-exhausted') {
        // Rate limiting message (neutral language)
        setError('Please wait a moment before submitting again.')
      } else if (errorCode === 'functions/invalid-argument') {
        setError('Please check your message and try again.')
      } else if (errorCode === 'functions/unavailable') {
        setError('Service temporarily unavailable. Please try again shortly.')
      } else {
        // Generic error for all other cases
        setError('Unable to send your message. Please try again.')
      }

      // Log error in development only (no PII)
      if (process.env.NODE_ENV === 'development') {
        console.error('[Safety Contact]', { code: errorCode })
      }
    } finally {
      setIsLoading(false)
    }
  }, [])

  const reset = useCallback(() => {
    setIsLoading(false)
    setError(null)
    setIsSuccess(false)
  }, [])

  return {
    submit,
    isLoading,
    error,
    isSuccess,
    reset,
  }
}
