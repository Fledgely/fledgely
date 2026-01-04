'use client'

/**
 * useBreachIncidentAdmin Hook
 *
 * Story 51.6: Breach Notification - AC4, AC5, AC7
 *
 * Admin hook for managing breach incidents.
 *
 * Requirements:
 * - AC4: Regulatory notification tracking
 * - AC5: Incident documentation
 * - AC7: Post-incident review
 */

import { useState, useCallback } from 'react'
import { httpsCallable, HttpsCallableResult } from 'firebase/functions'
import { getFirebaseFunctions } from '../lib/firebase'
import type {
  BreachIncidentStatusValue,
  BreachSeverityValue,
  AffectedDataTypeValue,
  CreateBreachIncidentInput,
  UpdateBreachIncidentInput,
  CreateBreachIncidentResponse,
  UpdateBreachIncidentResponse,
  BreachIncident,
} from '@fledgely/shared'

export interface BreachIncidentSummary {
  incidentId: string
  title: string
  severity: BreachSeverityValue
  status: BreachIncidentStatusValue
  affectedDataTypes: AffectedDataTypeValue[]
  affectedUserCount: number
  detectedAt: number
  hoursUntilDeadline: number
  isDeadlineApproaching: boolean
  isDeadlinePassed: boolean
  regulatorNotifiedAt: number | null
  userNotificationsSentAt: number | null
}

interface GetBreachIncidentsInput {
  status?: 'all' | BreachIncidentStatusValue
  limit?: number
  startAfter?: string
}

interface GetBreachIncidentsResponse {
  incidents: BreachIncidentSummary[]
  hasMore: boolean
  nextCursor: string | null
}

interface GetBreachIncidentDetailResponse {
  incident: BreachIncident
}

interface UseBreachIncidentAdminResult {
  /** Fetch breach incidents */
  getIncidents: (params?: GetBreachIncidentsInput) => Promise<GetBreachIncidentsResponse | null>
  /** Get a single incident's full details */
  getIncidentDetail: (incidentId: string) => Promise<BreachIncident | null>
  /** Create a new breach incident */
  createIncident: (input: CreateBreachIncidentInput) => Promise<string | null>
  /** Update a breach incident */
  updateIncident: (input: UpdateBreachIncidentInput) => Promise<boolean>
  /** Whether a request is in progress */
  loading: boolean
  /** Error message if request failed */
  error: string | null
}

/**
 * Admin hook for managing breach incidents.
 */
export function useBreachIncidentAdmin(): UseBreachIncidentAdminResult {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const getIncidents = useCallback(
    async (params?: GetBreachIncidentsInput): Promise<GetBreachIncidentsResponse | null> => {
      setLoading(true)
      setError(null)

      try {
        const functions = getFirebaseFunctions()
        const getBreachIncidentsFn = httpsCallable<
          GetBreachIncidentsInput,
          GetBreachIncidentsResponse
        >(functions, 'getBreachIncidents')

        const result: HttpsCallableResult<GetBreachIncidentsResponse> = await getBreachIncidentsFn(
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
          setError('Failed to load breach incidents.')
        }

        console.error('[Breach Incident Admin]', { code: errorCode, message: errorMessage })
        return null
      } finally {
        setLoading(false)
      }
    },
    []
  )

  const getIncidentDetail = useCallback(
    async (incidentId: string): Promise<BreachIncident | null> => {
      setLoading(true)
      setError(null)

      try {
        const functions = getFirebaseFunctions()
        const getBreachIncidentFn = httpsCallable<
          { incidentId: string },
          GetBreachIncidentDetailResponse
        >(functions, 'getBreachIncidentDetail')

        const result = await getBreachIncidentFn({ incidentId })

        return result.data.incident
      } catch (err: unknown) {
        const errorCode = (err as { code?: string })?.code || ''
        const errorMessage = (err as { message?: string })?.message || ''

        if (errorCode === 'functions/not-found') {
          setError('Incident not found.')
        } else if (errorCode === 'functions/permission-denied') {
          setError('Access denied. Admin privileges required.')
        } else {
          setError('Failed to load incident details.')
        }

        console.error('[Breach Incident Admin]', { code: errorCode, message: errorMessage })
        return null
      } finally {
        setLoading(false)
      }
    },
    []
  )

  const createIncident = useCallback(
    async (input: CreateBreachIncidentInput): Promise<string | null> => {
      setLoading(true)
      setError(null)

      try {
        const functions = getFirebaseFunctions()
        const createBreachIncidentFn = httpsCallable<
          CreateBreachIncidentInput,
          CreateBreachIncidentResponse
        >(functions, 'createBreachIncident')

        const result: HttpsCallableResult<CreateBreachIncidentResponse> =
          await createBreachIncidentFn(input)

        if (result.data.success && result.data.incidentId) {
          return result.data.incidentId
        }

        setError(result.data.message || 'Failed to create incident')
        return null
      } catch (err: unknown) {
        const errorCode = (err as { code?: string })?.code || ''
        const errorMessage = (err as { message?: string })?.message || ''

        if (errorCode === 'functions/permission-denied') {
          setError('Access denied. Admin privileges required.')
        } else {
          setError('Failed to create breach incident.')
        }

        console.error('[Breach Incident Admin]', { code: errorCode, message: errorMessage })
        return null
      } finally {
        setLoading(false)
      }
    },
    []
  )

  const updateIncident = useCallback(async (input: UpdateBreachIncidentInput): Promise<boolean> => {
    setLoading(true)
    setError(null)

    try {
      const functions = getFirebaseFunctions()
      const updateBreachIncidentFn = httpsCallable<
        UpdateBreachIncidentInput,
        UpdateBreachIncidentResponse
      >(functions, 'updateBreachIncident')

      const result: HttpsCallableResult<UpdateBreachIncidentResponse> =
        await updateBreachIncidentFn(input)

      return result.data.success
    } catch (err: unknown) {
      const errorCode = (err as { code?: string })?.code || ''
      const errorMessage = (err as { message?: string })?.message || ''

      if (errorCode === 'functions/permission-denied') {
        setError('Access denied. Admin privileges required.')
      } else if (errorCode === 'functions/not-found') {
        setError('Incident not found.')
      } else {
        setError('Failed to update breach incident.')
      }

      console.error('[Breach Incident Admin]', { code: errorCode, message: errorMessage })
      return false
    } finally {
      setLoading(false)
    }
  }, [])

  return {
    getIncidents,
    getIncidentDetail,
    createIncident,
    updateIncident,
    loading,
    error,
  }
}
