'use client'

/**
 * useChildStatus Hook - Story 19A.2
 *
 * Aggregates device health data to calculate per-child status.
 * Returns sorted list of children with their individual status.
 *
 * Status Rules (per child):
 * - GREEN (good): All child's devices online, synced within 1 hour, no alerts
 * - YELLOW (attention): Any device sync > 1 hour, battery < 20%, minor alerts
 * - RED (action): Any device offline > 24h, monitoring stopped, tampering detected
 */

import { useMemo } from 'react'
import { useDevices, Device } from './useDevices'
import { useChildren } from './useChildren'
import {
  FamilyStatus,
  StatusIssue,
  calculateDeviceIssues,
  calculateOverallStatus,
} from './useFamilyStatus'

/**
 * Status for an individual child with their devices
 */
export interface ChildStatus {
  childId: string
  childName: string
  photoURL: string | null
  status: FamilyStatus
  deviceCount: number
  activeDeviceCount: number
  lastActivity: Date | null
  devices: Device[]
  issues: StatusIssue[]
}

/**
 * Result from useChildStatus hook
 */
export interface ChildStatusResult {
  childStatuses: ChildStatus[]
  loading: boolean
  error: string | null
}

/**
 * Get the most recent activity time for a child's devices
 */
function getLastActivityForDevices(devices: Device[]): Date | null {
  if (devices.length === 0) {
    return null
  }

  let latestTime = 0

  for (const device of devices) {
    if (device.lastSeen) {
      latestTime = Math.max(latestTime, device.lastSeen.getTime())
    }
    if (device.healthMetrics?.lastHealthSync) {
      latestTime = Math.max(latestTime, device.healthMetrics.lastHealthSync.getTime())
    }
  }

  return latestTime > 0 ? new Date(latestTime) : null
}

/**
 * Sort children by status severity (action first, then attention, then good)
 * Secondary sort: alphabetically within same severity
 */
function sortByStatusSeverity(a: ChildStatus, b: ChildStatus): number {
  const severityOrder: Record<FamilyStatus, number> = { action: 0, attention: 1, good: 2 }
  const severityDiff = severityOrder[a.status] - severityOrder[b.status]
  if (severityDiff !== 0) return severityDiff
  return a.childName.localeCompare(b.childName)
}

/**
 * Hook to get per-child status for the ChildStatusList component
 *
 * @param familyId - The family ID to get status for
 * @returns List of child statuses sorted by severity
 */
export function useChildStatus(familyId: string | null): ChildStatusResult {
  const { devices, loading: devicesLoading, error: devicesError } = useDevices({ familyId })
  const { children, loading: childrenLoading, error: childrenError } = useChildren({ familyId })

  const childStatuses = useMemo(() => {
    if (children.length === 0) {
      return []
    }

    const statuses: ChildStatus[] = []

    for (const child of children) {
      // Get devices for this child (exclude unenrolled for count purposes)
      const childDevices = devices.filter((d) => d.childId === child.id)
      const activeDevices = childDevices.filter((d) => d.status !== 'unenrolled')
      const activeDeviceCount = childDevices.filter((d) => d.status === 'active').length

      // Calculate issues for this child's devices
      const childIssues: StatusIssue[] = []
      for (const device of childDevices) {
        const deviceIssues = calculateDeviceIssues(device)
        childIssues.push(...deviceIssues)
      }

      // Sort issues: critical first, then by device name
      childIssues.sort((a, b) => {
        if (a.type === 'critical' && b.type !== 'critical') return -1
        if (a.type !== 'critical' && b.type === 'critical') return 1
        return a.deviceName.localeCompare(b.deviceName)
      })

      // Calculate status for this child
      const status = calculateOverallStatus(childIssues)
      const lastActivity = getLastActivityForDevices(childDevices)

      statuses.push({
        childId: child.id,
        childName: child.name,
        photoURL: child.photoURL,
        status,
        deviceCount: activeDevices.length,
        activeDeviceCount,
        lastActivity,
        devices: childDevices,
        issues: childIssues,
      })
    }

    // Sort by severity (action first, then attention, then good)
    statuses.sort(sortByStatusSeverity)

    return statuses
  }, [devices, children])

  return {
    childStatuses,
    loading: devicesLoading || childrenLoading,
    error: devicesError || childrenError,
  }
}
