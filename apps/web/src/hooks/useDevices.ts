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
 * Device document from Firestore
 */
export interface Device {
  deviceId: string
  type: 'chromebook' | 'android'
  enrolledAt: Date
  enrolledBy: string
  childId: string | null
  name: string
  lastSeen: Date
  status: 'active' | 'offline' | 'unenrolled'
  metadata: {
    platform: string
    userAgent: string
    enrollmentRequestId: string
  }
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

          deviceList.push({
            deviceId: data.deviceId || doc.id,
            type: data.type || 'chromebook',
            enrolledAt,
            enrolledBy: data.enrolledBy || '',
            childId: data.childId || null,
            name: data.name || `Device ${doc.id.substring(0, 6)}`,
            lastSeen,
            status: data.status || 'active',
            metadata: data.metadata || {
              platform: '',
              userAgent: '',
              enrollmentRequestId: '',
            },
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
 */
export function formatLastSeen(lastSeen: Date): string {
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
