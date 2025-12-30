'use client'

/**
 * useDevices Hook - Story 12.4
 *
 * Real-time listener for family devices.
 * Used by dashboard to display enrolled devices.
 *
 * Requirements:
 * - AC5: Dashboard refresh on device registration
 */

import { useState, useEffect } from 'react'
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore'
import { getFirestoreDb } from '../lib/firebase'

/**
 * Health metrics from extension
 * Story 19.4: Monitoring Health Details
 * Story 8.8: Added encryptedTrafficPercent
 */
export interface DeviceHealthMetrics {
  captureSuccessRate24h: number | null
  uploadQueueSize: number
  networkStatus: 'online' | 'offline'
  batteryLevel: number | null
  batteryCharging: boolean | null
  appVersion: string
  updateAvailable: boolean | null
  collectedAt: number
  lastHealthSync: Date | null
  /** Story 8.8: Percentage of HTTPS traffic (encrypted) */
  encryptedTrafficPercent: number | null
}

/**
 * Story 6.5: Consent status for device
 */
export type DeviceConsentStatus = 'pending' | 'granted' | 'withdrawn'

/**
 * Device document from Firestore
 * Story 19.3 Task 2.1: Added lastScreenshotAt field
 * Story 19.4: Added healthMetrics field
 * Story 6.5: Added consent status fields
 */
export interface Device {
  deviceId: string
  type: 'chromebook' | 'android'
  enrolledAt: Date
  enrolledBy: string
  childId: string | null
  name: string
  lastSeen: Date
  lastScreenshotAt: Date | null // Story 19.3 AC5: Track last screenshot capture
  status: 'active' | 'offline' | 'unenrolled'
  metadata: {
    platform: string
    userAgent: string
    enrollmentRequestId: string
  }
  healthMetrics?: DeviceHealthMetrics // Story 19.4: Health metrics from extension
  // Story 6.5: Consent status from extension
  consentStatus?: DeviceConsentStatus
  activeAgreementId?: string | null
  activeAgreementVersion?: string | null
}

interface UseDevicesOptions {
  familyId: string | null
  enabled?: boolean
}

interface UseDevicesResult {
  devices: Device[]
  loading: boolean
  error: string | null
}

/**
 * Hook to listen for devices in a family.
 * Returns real-time list of enrolled devices.
 */
export function useDevices({ familyId, enabled = true }: UseDevicesOptions): UseDevicesResult {
  const [devices, setDevices] = useState<Device[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!familyId || !enabled) {
      setDevices([])
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    const db = getFirestoreDb()
    const devicesRef = collection(db, 'families', familyId, 'devices')

    // Query devices ordered by enrollment date (newest first)
    const devicesQuery = query(devicesRef, orderBy('enrolledAt', 'desc'))

    // Set up real-time listener
    const unsubscribe = onSnapshot(
      devicesQuery,
      (snapshot) => {
        const deviceList: Device[] = []

        snapshot.forEach((doc) => {
          const data = doc.data()

          // Convert Firestore Timestamps to Date objects
          const enrolledAt = data.enrolledAt?.toDate?.() || new Date(data.enrolledAt)
          const lastSeen = data.lastSeen?.toDate?.() || new Date(data.lastSeen)
          // Story 19.3 Task 2.2: Include lastScreenshotAt from Firestore
          const lastScreenshotAt = data.lastScreenshotAt?.toDate?.() || null

          // Story 19.4: Parse healthMetrics from Firestore
          // Story 8.8: Added encryptedTrafficPercent
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
            lastScreenshotAt, // Story 19.3 AC5
            status: data.status || 'active',
            metadata: data.metadata || {
              platform: '',
              userAgent: '',
              enrollmentRequestId: '',
            },
            healthMetrics, // Story 19.4
            // Story 6.5: Consent status from device
            consentStatus: data.consentStatus as DeviceConsentStatus | undefined,
            activeAgreementId: data.activeAgreementId ?? null,
            activeAgreementVersion: data.activeAgreementVersion ?? null,
          })
        })

        setDevices(deviceList)
        setLoading(false)
      },
      (err) => {
        console.error('Error listening to devices:', err)
        setError('Failed to load devices')
        setLoading(false)
      }
    )

    return () => unsubscribe()
  }, [familyId, enabled])

  return {
    devices,
    loading,
    error,
  }
}

/**
 * Helper hook to get count of active devices.
 * Useful for displaying device count in dashboard.
 */
export function useActiveDeviceCount(familyId: string | null): number {
  const { devices } = useDevices({ familyId })
  return devices.filter((d) => d.status === 'active').length
}

/**
 * Helper to format relative time for last seen display.
 * Story 19.3 Task 1.1: Handle null/undefined dates
 */
export function formatLastSeen(lastSeen: Date | null | undefined): string {
  // Story 19.3 AC4: Handle never-synced devices
  if (!lastSeen || !isValidDate(lastSeen)) {
    return 'Never synced'
  }

  const now = Date.now()
  const diff = now - lastSeen.getTime()

  if (diff < 60000) return 'Just now'
  if (diff < 3600000) {
    const mins = Math.floor(diff / 60000)
    return `${mins} min ago`
  }
  if (diff < 86400000) {
    const hours = Math.floor(diff / 3600000)
    return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`
  }
  const days = Math.floor(diff / 86400000)
  return `${days} ${days === 1 ? 'day' : 'days'} ago`
}

/**
 * Story 19.3: Check if a date is valid (not null, not epoch 0, not NaN)
 */
export function isValidDate(date: Date | null | undefined): boolean {
  if (!date) return false
  const time = date.getTime()
  return !isNaN(time) && time > 0
}
