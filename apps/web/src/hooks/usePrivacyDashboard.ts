'use client'

/**
 * usePrivacyDashboard Hook
 *
 * Story 51.7: Privacy Dashboard - All ACs
 *
 * Hook for managing privacy dashboard data.
 * Provides transparency about data collection and privacy controls.
 */

import { useState, useCallback } from 'react'
import { httpsCallable, HttpsCallableResult } from 'firebase/functions'
import { getFirebaseFunctions } from '../lib/firebase'
import type {
  GetPrivacyInfoResponse,
  GetSessionHistoryResponse,
  UpdatePrivacyPreferencesInput,
  UpdatePrivacyPreferencesResponse,
} from '@fledgely/shared'

interface UsePrivacyDashboardResult {
  /** Get privacy info (data categories, storage, access) */
  getPrivacyInfo: () => Promise<GetPrivacyInfoResponse | null>
  /** Get session history */
  getSessionHistory: () => Promise<GetSessionHistoryResponse | null>
  /** Update privacy preferences */
  updatePreferences: (input: UpdatePrivacyPreferencesInput) => Promise<boolean>
  /** Whether a request is in progress */
  loading: boolean
  /** Error message if request failed */
  error: string | null
  /** Clear error */
  clearError: () => void
}

/**
 * Hook for privacy dashboard functionality.
 */
export function usePrivacyDashboard(): UsePrivacyDashboardResult {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const getPrivacyInfo = useCallback(async (): Promise<GetPrivacyInfoResponse | null> => {
    setLoading(true)
    setError(null)

    try {
      const functions = getFirebaseFunctions()
      const getPrivacyInfoFn = httpsCallable<Record<string, never>, GetPrivacyInfoResponse>(
        functions,
        'getPrivacyInfo'
      )

      const result: HttpsCallableResult<GetPrivacyInfoResponse> = await getPrivacyInfoFn({})

      return result.data
    } catch (err: unknown) {
      const errorCode = (err as { code?: string })?.code || ''
      const errorMessage = (err as { message?: string })?.message || ''

      if (errorCode === 'functions/unauthenticated') {
        setError('Please sign in to view privacy settings.')
      } else if (errorCode === 'functions/not-found') {
        setError('Account not found.')
      } else {
        setError('Failed to load privacy information.')
      }

      console.error('[Privacy Dashboard]', { code: errorCode, message: errorMessage })
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  const getSessionHistory = useCallback(async (): Promise<GetSessionHistoryResponse | null> => {
    setLoading(true)
    setError(null)

    try {
      const functions = getFirebaseFunctions()
      const getSessionHistoryFn = httpsCallable<Record<string, never>, GetSessionHistoryResponse>(
        functions,
        'getSessionHistory'
      )

      const result: HttpsCallableResult<GetSessionHistoryResponse> = await getSessionHistoryFn({})

      return result.data
    } catch (err: unknown) {
      const errorCode = (err as { code?: string })?.code || ''
      const errorMessage = (err as { message?: string })?.message || ''

      if (errorCode === 'functions/unauthenticated') {
        setError('Please sign in to view session history.')
      } else {
        setError('Failed to load session history.')
      }

      console.error('[Privacy Dashboard]', { code: errorCode, message: errorMessage })
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  const updatePreferences = useCallback(
    async (input: UpdatePrivacyPreferencesInput): Promise<boolean> => {
      setLoading(true)
      setError(null)

      try {
        const functions = getFirebaseFunctions()
        const updatePreferencesFn = httpsCallable<
          UpdatePrivacyPreferencesInput,
          UpdatePrivacyPreferencesResponse
        >(functions, 'updatePrivacyPreferences')

        const result: HttpsCallableResult<UpdatePrivacyPreferencesResponse> =
          await updatePreferencesFn(input)

        return result.data.success
      } catch (err: unknown) {
        const errorCode = (err as { code?: string })?.code || ''
        const errorMessage = (err as { message?: string })?.message || ''

        if (errorCode === 'functions/unauthenticated') {
          setError('Please sign in to update privacy settings.')
        } else {
          setError('Failed to update privacy preferences.')
        }

        console.error('[Privacy Dashboard]', { code: errorCode, message: errorMessage })
        return false
      } finally {
        setLoading(false)
      }
    },
    []
  )

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  return {
    getPrivacyInfo,
    getSessionHistory,
    updatePreferences,
    loading,
    error,
    clearError,
  }
}
