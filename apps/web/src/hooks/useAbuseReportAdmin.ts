'use client'

/**
 * useAbuseReportAdmin Hook
 *
 * Story 51.5: Abuse Reporting - AC5, AC7, AC8
 *
 * Admin hook for managing abuse reports.
 *
 * Requirements:
 * - AC5: 72-hour review timeline
 * - AC7: Secure logging (admin only access)
 * - AC8: Investigation process with status tracking
 */

import { useState, useCallback } from 'react'
import { httpsCallable, HttpsCallableResult } from 'firebase/functions'
import { getFirebaseFunctions } from '../lib/firebase'
import type {
  AbuseReportStatusValue,
  AbuseReportTypeValue,
  UpdateAbuseReportInput,
} from '@fledgely/shared'

export interface AbuseReportSummary {
  reportId: string
  type: AbuseReportTypeValue
  descriptionPreview: string
  status: AbuseReportStatusValue
  isAnonymous: boolean
  reporterEmail: string | null
  submittedAt: number
  hoursUntilSLA: number
  isPastSLA: boolean
  referenceNumber: string | null
}

interface GetAbuseReportsInput {
  status?: 'all' | AbuseReportStatusValue
  type?: AbuseReportTypeValue
  limit?: number
  startAfter?: string
}

interface GetAbuseReportsResponse {
  reports: AbuseReportSummary[]
  hasMore: boolean
  nextCursor: string | null
}

interface UpdateAbuseReportResponse {
  success: boolean
  message: string
}

interface UseAbuseReportAdminResult {
  /** Fetch abuse reports */
  getReports: (params?: GetAbuseReportsInput) => Promise<GetAbuseReportsResponse | null>
  /** Update an abuse report */
  updateReport: (input: UpdateAbuseReportInput) => Promise<boolean>
  /** Whether a request is in progress */
  loading: boolean
  /** Error message if request failed */
  error: string | null
}

/**
 * Admin hook for managing abuse reports.
 */
export function useAbuseReportAdmin(): UseAbuseReportAdminResult {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const getReports = useCallback(
    async (params?: GetAbuseReportsInput): Promise<GetAbuseReportsResponse | null> => {
      setLoading(true)
      setError(null)

      try {
        const functions = getFirebaseFunctions()
        const getAbuseReportsFn = httpsCallable<GetAbuseReportsInput, GetAbuseReportsResponse>(
          functions,
          'getAbuseReports'
        )

        const result: HttpsCallableResult<GetAbuseReportsResponse> = await getAbuseReportsFn(
          params || {}
        )

        return result.data
      } catch (err: unknown) {
        const errorCode = (err as { code?: string })?.code || ''
        const errorMessage = (err as { message?: string })?.message || ''

        if (errorCode === 'functions/permission-denied' || errorMessage.includes('Access denied')) {
          setError('Access denied. Admin privileges required.')
        } else if (errorCode === 'functions/unauthenticated') {
          setError('Please sign in to access this page.')
        } else {
          setError('Failed to load abuse reports.')
        }

        console.error('[Abuse Report Admin]', { code: errorCode, message: errorMessage })
        return null
      } finally {
        setLoading(false)
      }
    },
    []
  )

  const updateReport = useCallback(async (input: UpdateAbuseReportInput): Promise<boolean> => {
    setLoading(true)
    setError(null)

    try {
      const functions = getFirebaseFunctions()
      const updateAbuseReportFn = httpsCallable<UpdateAbuseReportInput, UpdateAbuseReportResponse>(
        functions,
        'updateAbuseReport'
      )

      const result: HttpsCallableResult<UpdateAbuseReportResponse> =
        await updateAbuseReportFn(input)

      return result.data.success
    } catch (err: unknown) {
      const errorCode = (err as { code?: string })?.code || ''
      const errorMessage = (err as { message?: string })?.message || ''

      if (errorCode === 'functions/permission-denied') {
        setError('Access denied. Admin privileges required.')
      } else if (errorCode === 'functions/not-found') {
        setError('Report not found.')
      } else {
        setError('Failed to update abuse report.')
      }

      console.error('[Abuse Report Admin]', { code: errorCode, message: errorMessage })
      return false
    } finally {
      setLoading(false)
    }
  }, [])

  return {
    getReports,
    updateReport,
    loading,
    error,
  }
}
