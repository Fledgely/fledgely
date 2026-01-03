'use client'

/**
 * useLocationSettings Hook - Story 40.1
 *
 * Manages location feature opt-in state and operations.
 *
 * Acceptance Criteria:
 * - AC1: Explicit Dual-Guardian Opt-In (two guardians must consent)
 * - AC4: Default Disabled (location features off by default)
 *
 * Features:
 * - Real-time subscription to location settings and pending requests
 * - Request, approve, and disable location features
 * - Fleeing mode support for safety disabling
 */

import { useState, useEffect, useCallback, useMemo } from 'react'
import { httpsCallable, HttpsCallableResult } from 'firebase/functions'
import { doc, onSnapshot, collection, query, where, orderBy, limit } from 'firebase/firestore'
import { getFirebaseFunctions, getFirestoreDb } from '../lib/firebase'
import { type LocationOptInStatus, type LocationSettings } from '@fledgely/shared'

/**
 * Pending request information
 */
export interface PendingLocationRequest {
  id: string
  requestedByUid: string
  requestedByName?: string
  expiresAt: Date
  status: 'pending' | 'approved' | 'expired' | 'cancelled'
}

/**
 * Location settings state
 */
export interface LocationSettingsState {
  /** Current opt-in status */
  status: LocationOptInStatus
  /** Full location settings from family document */
  settings: LocationSettings | null
  /** Pending opt-in request if any */
  pendingRequest: PendingLocationRequest | null
}

/**
 * Response from requestLocationOptIn callable
 */
interface RequestLocationOptInResponse {
  success: boolean
  requestId: string
  status: 'pending' | 'enabled'
  message: string
}

/**
 * Response from approveLocationOptIn callable
 */
interface ApproveLocationOptInResponse {
  success: boolean
  status: 'enabled'
  message: string
}

/**
 * Response from disableLocationFeatures callable
 */
interface DisableLocationFeaturesResponse {
  success: boolean
  message: string
}

/**
 * Hook return type
 */
export interface UseLocationSettingsReturn {
  // State
  status: LocationOptInStatus
  settings: LocationSettings | null
  pendingRequest: PendingLocationRequest | null
  loading: boolean
  actionLoading: boolean
  error: string | null

  // Actions
  requestEnable: () => Promise<boolean>
  approveRequest: (requestId: string) => Promise<boolean>
  disableFeatures: (options?: { fleeingMode?: boolean }) => Promise<boolean>

  // Utilities
  clearError: () => void
  refreshSettings: () => void
}

/**
 * Hook for managing location feature settings.
 *
 * @param familyId - The family ID to manage location settings for
 * @param currentUserUid - Current user's UID (for detecting if they're the requester)
 * @returns Location settings state and operations
 */
export function useLocationSettings(
  familyId: string | null,
  _currentUserUid: string | null
): UseLocationSettingsReturn {
  // State for location settings
  const [settings, setSettings] = useState<LocationSettings | null>(null)
  const [pendingRequest, setPendingRequest] = useState<PendingLocationRequest | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  // Clear error
  const clearError = useCallback(() => setError(null), [])

  // Force refresh
  const refreshSettings = useCallback(() => setRefreshKey((k) => k + 1), [])

  // Calculate status from settings and pending request
  const status = useMemo((): LocationOptInStatus => {
    if (!settings) return 'disabled'
    if (settings.locationFeaturesEnabled) return 'enabled'
    if (pendingRequest && pendingRequest.status === 'pending') return 'pending'
    return 'disabled'
  }, [settings, pendingRequest])

  // Subscribe to family location settings
  useEffect(() => {
    if (!familyId) {
      setLoading(false)
      return
    }

    setLoading(true)
    const db = getFirestoreDb()
    const familyRef = doc(db, 'families', familyId)

    const unsubscribe = onSnapshot(
      familyRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data()
          // Extract location-related fields with defaults
          const locationSettings: LocationSettings = {
            locationFeaturesEnabled: data.locationFeaturesEnabled ?? false,
            locationEnabledAt: data.locationEnabledAt?.toDate() ?? null,
            locationEnabledByUids: data.locationEnabledByUids ?? [],
            locationDisabledAt: data.locationDisabledAt?.toDate() ?? null,
            locationDisabledByUid: data.locationDisabledByUid ?? null,
            childNotifiedAt: data.childNotifiedAt?.toDate() ?? null,
          }
          setSettings(locationSettings)
        } else {
          setSettings(null)
        }
        setLoading(false)
      },
      (err) => {
        console.error('Error subscribing to family settings:', err)
        setError('Failed to load location settings')
        setLoading(false)
      }
    )

    return () => unsubscribe()
  }, [familyId, refreshKey])

  // Subscribe to pending location requests
  useEffect(() => {
    if (!familyId) return

    const db = getFirestoreDb()
    const requestsRef = collection(db, 'families', familyId, 'locationOptInRequests')

    // Query for the most recent pending request
    const q = query(
      requestsRef,
      where('status', '==', 'pending'),
      orderBy('createdAt', 'desc'),
      limit(1)
    )

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        if (snapshot.empty) {
          setPendingRequest(null)
        } else {
          const doc = snapshot.docs[0]
          const data = doc.data()
          setPendingRequest({
            id: doc.id,
            requestedByUid: data.requestedByUid,
            requestedByName: data.requestedByName,
            expiresAt: data.expiresAt?.toDate() ?? new Date(),
            status: data.status,
          })
        }
      },
      (err) => {
        console.error('Error subscribing to location requests:', err)
        // Don't set error for this - family settings is primary
      }
    )

    return () => unsubscribe()
  }, [familyId, refreshKey])

  /**
   * Request to enable location features (first guardian)
   */
  const requestEnable = useCallback(async (): Promise<boolean> => {
    if (!familyId) {
      setError('No family selected')
      return false
    }

    setActionLoading(true)
    setError(null)

    try {
      const functions = getFirebaseFunctions()
      const fn = httpsCallable<{ familyId: string }, RequestLocationOptInResponse>(
        functions,
        'requestLocationOptIn'
      )

      const result: HttpsCallableResult<RequestLocationOptInResponse> = await fn({ familyId })

      if (!result.data.success) {
        setError(result.data.message || 'Failed to request location features')
        return false
      }

      return true
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to request location features'
      setError(message)
      return false
    } finally {
      setActionLoading(false)
    }
  }, [familyId])

  /**
   * Approve a pending location opt-in request (second guardian)
   */
  const approveRequest = useCallback(
    async (requestId: string): Promise<boolean> => {
      if (!familyId) {
        setError('No family selected')
        return false
      }

      setActionLoading(true)
      setError(null)

      try {
        const functions = getFirebaseFunctions()
        const fn = httpsCallable<
          { familyId: string; requestId: string },
          ApproveLocationOptInResponse
        >(functions, 'approveLocationOptIn')

        const result: HttpsCallableResult<ApproveLocationOptInResponse> = await fn({
          familyId,
          requestId,
        })

        if (!result.data.success) {
          setError(result.data.message || 'Failed to approve location features')
          return false
        }

        return true
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to approve location features'
        setError(message)
        return false
      } finally {
        setActionLoading(false)
      }
    },
    [familyId]
  )

  /**
   * Disable location features (any guardian can do this)
   */
  const disableFeatures = useCallback(
    async (options?: { fleeingMode?: boolean }): Promise<boolean> => {
      if (!familyId) {
        setError('No family selected')
        return false
      }

      setActionLoading(true)
      setError(null)

      try {
        const functions = getFirebaseFunctions()
        const fn = httpsCallable<
          { familyId: string; isFleeingMode?: boolean },
          DisableLocationFeaturesResponse
        >(functions, 'disableLocationFeatures')

        const result: HttpsCallableResult<DisableLocationFeaturesResponse> = await fn({
          familyId,
          isFleeingMode: options?.fleeingMode,
        })

        if (!result.data.success) {
          setError(result.data.message || 'Failed to disable location features')
          return false
        }

        return true
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to disable location features'
        setError(message)
        return false
      } finally {
        setActionLoading(false)
      }
    },
    [familyId]
  )

  return {
    status,
    settings,
    pendingRequest,
    loading,
    actionLoading,
    error,
    requestEnable,
    approveRequest,
    disableFeatures,
    clearError,
    refreshSettings,
  }
}

export default useLocationSettings
