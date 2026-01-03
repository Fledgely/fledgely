'use client'

/**
 * useLocationZones Hook - Story 40.2
 *
 * Manages location zone CRUD operations.
 *
 * Acceptance Criteria:
 * - AC1: Location Definitions (create, update, delete zones)
 * - AC4: Geofence Configuration
 *
 * Features:
 * - Real-time subscription to location zones
 * - Create, update, and delete operations
 * - Loading and error state tracking
 */

import { useState, useEffect, useCallback } from 'react'
import { httpsCallable, HttpsCallableResult } from 'firebase/functions'
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore'
import { getFirebaseFunctions, getFirestoreDb } from '../lib/firebase'
import type { LocationZone, LocationZoneType } from '@fledgely/shared'

/**
 * Zone creation input
 */
export interface CreateZoneInput {
  name: string
  type: LocationZoneType
  latitude: number
  longitude: number
  radiusMeters?: number
  address?: string
}

/**
 * Zone update input
 */
export interface UpdateZoneInput {
  name?: string
  type?: LocationZoneType
  latitude?: number
  longitude?: number
  radiusMeters?: number
  address?: string | null
}

/**
 * Response from createLocationZone callable
 */
interface CreateZoneResponse {
  success: boolean
  zoneId: string
  message: string
}

/**
 * Response from updateLocationZone callable
 */
interface UpdateZoneResponse {
  success: boolean
  message: string
}

/**
 * Response from deleteLocationZone callable
 */
interface DeleteZoneResponse {
  success: boolean
  message: string
}

/**
 * Hook return type
 */
export interface UseLocationZonesReturn {
  // State
  zones: LocationZone[]
  loading: boolean
  actionLoading: boolean
  error: string | null

  // Actions
  createZone: (input: CreateZoneInput) => Promise<string | null>
  updateZone: (zoneId: string, updates: UpdateZoneInput) => Promise<boolean>
  deleteZone: (zoneId: string) => Promise<boolean>

  // Utilities
  clearError: () => void
  refreshZones: () => void
}

/**
 * Hook for managing location zones.
 *
 * @param familyId - The family ID to manage location zones for
 * @returns Location zones state and operations
 */
export function useLocationZones(familyId: string | null): UseLocationZonesReturn {
  const [zones, setZones] = useState<LocationZone[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  // Clear error
  const clearError = useCallback(() => setError(null), [])

  // Force refresh
  const refreshZones = useCallback(() => setRefreshKey((k) => k + 1), [])

  // Subscribe to location zones
  useEffect(() => {
    if (!familyId) {
      setZones([])
      setLoading(false)
      return
    }

    setLoading(true)
    const db = getFirestoreDb()
    const zonesRef = collection(db, 'families', familyId, 'locationZones')
    const zonesQuery = query(zonesRef, orderBy('createdAt', 'desc'))

    const unsubscribe = onSnapshot(
      zonesQuery,
      (snapshot) => {
        const zonesList: LocationZone[] = snapshot.docs.map((doc) => {
          const data = doc.data()
          return {
            id: doc.id,
            familyId: data.familyId,
            name: data.name,
            type: data.type,
            latitude: data.latitude,
            longitude: data.longitude,
            radiusMeters: data.radiusMeters,
            address: data.address ?? null,
            createdAt: data.createdAt?.toDate() ?? new Date(),
            updatedAt: data.updatedAt?.toDate() ?? new Date(),
          }
        })
        setZones(zonesList)
        setLoading(false)
      },
      (err) => {
        console.error('Error subscribing to location zones:', err)
        setError('Failed to load location zones')
        setLoading(false)
      }
    )

    return () => unsubscribe()
  }, [familyId, refreshKey])

  /**
   * Create a new location zone
   */
  const createZone = useCallback(
    async (input: CreateZoneInput): Promise<string | null> => {
      if (!familyId) {
        setError('No family selected')
        return null
      }

      setActionLoading(true)
      setError(null)

      try {
        const functions = getFirebaseFunctions()
        const fn = httpsCallable<
          {
            familyId: string
            name: string
            type: LocationZoneType
            latitude: number
            longitude: number
            radiusMeters?: number
            address?: string
          },
          CreateZoneResponse
        >(functions, 'createLocationZone')

        const result: HttpsCallableResult<CreateZoneResponse> = await fn({
          familyId,
          ...input,
        })

        if (!result.data.success) {
          setError(result.data.message || 'Failed to create location zone')
          return null
        }

        return result.data.zoneId
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to create location zone'
        setError(message)
        return null
      } finally {
        setActionLoading(false)
      }
    },
    [familyId]
  )

  /**
   * Update an existing location zone
   */
  const updateZone = useCallback(
    async (zoneId: string, updates: UpdateZoneInput): Promise<boolean> => {
      if (!familyId) {
        setError('No family selected')
        return false
      }

      setActionLoading(true)
      setError(null)

      try {
        const functions = getFirebaseFunctions()
        const fn = httpsCallable<
          {
            familyId: string
            zoneId: string
            name?: string
            type?: LocationZoneType
            latitude?: number
            longitude?: number
            radiusMeters?: number
            address?: string | null
          },
          UpdateZoneResponse
        >(functions, 'updateLocationZone')

        const result: HttpsCallableResult<UpdateZoneResponse> = await fn({
          familyId,
          zoneId,
          ...updates,
        })

        if (!result.data.success) {
          setError(result.data.message || 'Failed to update location zone')
          return false
        }

        return true
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to update location zone'
        setError(message)
        return false
      } finally {
        setActionLoading(false)
      }
    },
    [familyId]
  )

  /**
   * Delete a location zone
   */
  const deleteZone = useCallback(
    async (zoneId: string): Promise<boolean> => {
      if (!familyId) {
        setError('No family selected')
        return false
      }

      setActionLoading(true)
      setError(null)

      try {
        const functions = getFirebaseFunctions()
        const fn = httpsCallable<{ familyId: string; zoneId: string }, DeleteZoneResponse>(
          functions,
          'deleteLocationZone'
        )

        const result: HttpsCallableResult<DeleteZoneResponse> = await fn({
          familyId,
          zoneId,
        })

        if (!result.data.success) {
          setError(result.data.message || 'Failed to delete location zone')
          return false
        }

        return true
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to delete location zone'
        setError(message)
        return false
      } finally {
        setActionLoading(false)
      }
    },
    [familyId]
  )

  return {
    zones,
    loading,
    actionLoading,
    error,
    createZone,
    updateZone,
    deleteZone,
    clearError,
    refreshZones,
  }
}

export default useLocationZones
