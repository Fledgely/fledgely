/**
 * Hook for getting devices associated with a family.
 *
 * Story 0.5.5: Remote Device Unenrollment
 *
 * Provides access to admin-only device lookup operations.
 * Requires safety-team custom claim.
 */

'use client'

import { useState, useCallback } from 'react'
import { httpsCallable, HttpsCallableResult } from 'firebase/functions'
import { getFirebaseFunctions } from '../lib/firebase'

/**
 * Device info for safety dashboard display.
 */
export interface DeviceInfoForSafety {
  deviceId: string
  name: string
  type: 'chromebook' | 'android'
  childId: string | null
  lastSeen: number | null
  status: 'active' | 'offline' | 'unenrolled'
}

/**
 * Response from getDevicesForFamily callable.
 */
export interface GetDevicesForFamilyResponse {
  familyId: string | null
  familyName: string | null
  devices: DeviceInfoForSafety[]
}

/**
 * Hook return type.
 */
export interface UseDevicesForFamilyReturn {
  // State
  loading: boolean
  error: string | null
  devices: DeviceInfoForSafety[]
  familyId: string | null
  familyName: string | null

  // Fetch devices for a ticket
  fetchDevices: (ticketId: string) => Promise<GetDevicesForFamilyResponse | null>

  // Clear error
  clearError: () => void
}

/**
 * Hook for getting devices associated with a family.
 */
export function useDevicesForFamily(): UseDevicesForFamilyReturn {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [devices, setDevices] = useState<DeviceInfoForSafety[]>([])
  const [familyId, setFamilyId] = useState<string | null>(null)
  const [familyName, setFamilyName] = useState<string | null>(null)

  const clearError = useCallback(() => setError(null), [])

  /**
   * Fetch devices for a family based on ticket.
   */
  const fetchDevices = useCallback(async (ticketId: string) => {
    setLoading(true)
    setError(null)

    try {
      const functions = getFirebaseFunctions()
      const fn = httpsCallable<{ ticketId: string }, GetDevicesForFamilyResponse>(
        functions,
        'getDevicesForFamily'
      )

      const result: HttpsCallableResult<GetDevicesForFamilyResponse> = await fn({ ticketId })

      setDevices(result.data.devices)
      setFamilyId(result.data.familyId)
      setFamilyName(result.data.familyName)

      return result.data
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to get devices'
      setError(message)
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  return {
    loading,
    error,
    devices,
    familyId,
    familyName,
    fetchDevices,
    clearError,
  }
}
