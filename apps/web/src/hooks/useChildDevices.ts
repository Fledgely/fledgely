'use client'

/**
 * useChildDevices Hook - Story 19.7
 *
 * Fetches devices assigned to a specific child.
 * Used by child dashboard to display "My Devices" section.
 *
 * Requirements:
 * - AC1: Child sees list of their monitored devices
 * - AC2: Each device shows name, status, last capture time
 */

import { useState, useEffect } from 'react'
import { collection, onSnapshot, orderBy, query, where } from 'firebase/firestore'
import { getFirestoreDb } from '../lib/firebase'
import type { Device, DeviceHealthMetrics, DeviceConsentStatus } from './useDevices'

export type { Device } from './useDevices'

interface UseChildDevicesOptions {
  childId: string | null
  familyId: string | null
  enabled?: boolean
}

interface UseChildDevicesResult {
  devices: Device[]
  loading: boolean
  error: string | null
}

/**
 * Hook to listen for devices assigned to a specific child.
 * Returns real-time list of enrolled devices for that child.
 * Filters out unenrolled devices (status === 'unenrolled').
 *
 * @param options - Configuration options
 * @returns Devices, loading state, and error
 */
export function useChildDevices({
  childId,
  familyId,
  enabled = true,
}: UseChildDevicesOptions): UseChildDevicesResult {
  const [devices, setDevices] = useState<Device[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!childId || !familyId || !enabled) {
      setDevices([])
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    const db = getFirestoreDb()
    const devicesRef = collection(db, 'families', familyId, 'devices')

    // Query devices for this child, ordered by enrollment date (newest first)
    // Filter in memory for status to avoid composite index requirement
    const devicesQuery = query(
      devicesRef,
      where('childId', '==', childId),
      orderBy('enrolledAt', 'desc')
    )

    // Set up real-time listener
    const unsubscribe = onSnapshot(
      devicesQuery,
      (snapshot) => {
        const deviceList: Device[] = []

        snapshot.forEach((doc) => {
          const data = doc.data()

          // Skip unenrolled devices
          if (data.status === 'unenrolled') {
            return
          }

          // Convert Firestore Timestamps to Date objects
          const enrolledAt = data.enrolledAt?.toDate?.() || new Date(data.enrolledAt)
          const lastSeen = data.lastSeen?.toDate?.() || new Date(data.lastSeen)
          const lastScreenshotAt = data.lastScreenshotAt?.toDate?.() || null

          // Parse healthMetrics from Firestore
          let healthMetrics: DeviceHealthMetrics | undefined
          if (data.healthMetrics) {
            const hm = data.healthMetrics
            healthMetrics = {
              captureSuccessRate24h: hm.captureSuccessRate24h ?? null,
              uploadQueueSize: hm.uploadQueueSize ?? 0,
              networkStatus: hm.networkStatus ?? 'offline',
              batteryLevel: hm.batteryLevel ?? null,
              batteryCharging: hm.batteryCharging ?? null,
              appVersion: hm.appVersion ?? '',
              updateAvailable: hm.updateAvailable ?? null,
              collectedAt: hm.collectedAt ?? 0,
              lastHealthSync: hm.lastHealthSync?.toDate?.() || null,
              encryptedTrafficPercent: hm.encryptedTrafficPercent ?? null,
            }
          }

          deviceList.push({
            deviceId: data.deviceId || doc.id,
            type: data.type || 'chromebook',
            enrolledAt,
            enrolledBy: data.enrolledBy || '',
            childId: data.childId || null,
            name: data.name || `Device ${doc.id.substring(0, 6)}`,
            lastSeen,
            lastScreenshotAt,
            status: data.status || 'active',
            metadata: data.metadata || {
              platform: '',
              userAgent: '',
              enrollmentRequestId: '',
            },
            healthMetrics,
            consentStatus: data.consentStatus as DeviceConsentStatus | undefined,
            activeAgreementId: data.activeAgreementId ?? null,
            activeAgreementVersion: data.activeAgreementVersion ?? null,
          })
        })

        setDevices(deviceList)
        setLoading(false)
      },
      (err: Error & { code?: string }) => {
        console.error('Error listening to child devices:', err)

        // Provide specific error messages based on error type
        if (err.code === 'permission-denied') {
          setError('You do not have permission to view devices. Please sign in again.')
        } else if (err.code === 'unavailable') {
          setError('Unable to connect. Check your internet connection.')
        } else if (err.code === 'invalid-argument') {
          setError('Something went wrong. Please refresh the page.')
        } else {
          setError('Failed to load your devices. Please try again.')
        }

        setLoading(false)
      }
    )

    return () => unsubscribe()
  }, [childId, familyId, enabled])

  return {
    devices,
    loading,
    error,
  }
}
