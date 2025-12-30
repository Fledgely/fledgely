'use client'

/**
 * useFamilyStatus Hook - Story 19A.1
 *
 * Aggregates device health data to calculate overall family status.
 * Returns a simple green/yellow/red status for the Family Status Summary Card.
 *
 * Status Rules:
 * - GREEN (good): All devices online, synced within 1 hour, no alerts
 * - YELLOW (attention): Any device sync > 1 hour, battery < 20%, minor alerts
 * - RED (action): Any device offline > 24h, monitoring stopped, tampering detected
 */

import { useMemo } from 'react'
import { useDevices, Device, formatLastSeen } from './useDevices'
import { useChildren } from './useChildren'

/**
 * Status severity levels
 */
export type FamilyStatus = 'good' | 'attention' | 'action'

/**
 * Individual status issue for expanded details
 */
export interface StatusIssue {
  deviceId: string
  deviceName: string
  childId: string | null
  type: 'critical' | 'warning'
  message: string
}

/**
 * Result from useFamilyStatus hook
 */
export interface FamilyStatusResult {
  status: FamilyStatus
  message: string
  childCount: number
  deviceCount: number
  activeDeviceCount: number
  issues: StatusIssue[]
  lastUpdated: Date
  loading: boolean
  error: string | null
}

/**
 * Thresholds for status calculation
 * Exported for reuse in useChildStatus
 */
export const THRESHOLDS = {
  /** Hours before a device is considered critically offline */
  OFFLINE_CRITICAL_HOURS: 24,
  /** Minutes before sync delay triggers a warning */
  SYNC_WARNING_MINUTES: 60,
  /** Battery percentage below which to show warning */
  BATTERY_WARNING_PERCENT: 20,
}

/**
 * Status messages for display (future localization ready)
 */
const STATUS_MESSAGES = {
  READY_TO_ENROLL: 'Ready to enroll devices',
  ALL_GOOD: 'All Good',
  ITEMS_NEED_ATTENTION: (count: number) => `${count} items need attention`,
  CRITICAL_ISSUES: (count: number) => `${count} critical issues`,
  ACTION_REQUIRED: 'Action required',
}

/**
 * Get the status message based on status level and issues
 */
function getStatusMessage(
  status: FamilyStatus,
  issues: StatusIssue[],
  deviceCount: number
): string {
  if (deviceCount === 0) {
    return STATUS_MESSAGES.READY_TO_ENROLL
  }

  switch (status) {
    case 'good':
      return STATUS_MESSAGES.ALL_GOOD
    case 'attention': {
      const warningCount = issues.filter((i) => i.type === 'warning').length
      if (warningCount === 1) {
        return issues[0].message
      }
      return STATUS_MESSAGES.ITEMS_NEED_ATTENTION(warningCount)
    }
    case 'action': {
      const criticalCount = issues.filter((i) => i.type === 'critical').length
      if (criticalCount === 1) {
        return issues.find((i) => i.type === 'critical')?.message || STATUS_MESSAGES.ACTION_REQUIRED
      }
      return STATUS_MESSAGES.CRITICAL_ISSUES(criticalCount)
    }
  }
}

/**
 * Calculate issues for a single device
 * Exported for reuse in useChildStatus
 */
export function calculateDeviceIssues(device: Device): StatusIssue[] {
  const issues: StatusIssue[] = []
  const now = Date.now()

  // Critical: Device offline for more than 24 hours
  if (device.status === 'offline') {
    const offlineHours = (now - device.lastSeen.getTime()) / (1000 * 60 * 60)
    if (offlineHours >= THRESHOLDS.OFFLINE_CRITICAL_HOURS) {
      issues.push({
        deviceId: device.deviceId,
        deviceName: device.name,
        childId: device.childId,
        type: 'critical',
        message: `${device.name} offline for ${Math.floor(offlineHours)} hours`,
      })
    } else {
      // Warning: Device offline but less than 24 hours
      issues.push({
        deviceId: device.deviceId,
        deviceName: device.name,
        childId: device.childId,
        type: 'warning',
        message: `${device.name} is offline`,
      })
    }
  }

  // Critical: Monitoring stopped (unenrolled status)
  if (device.status === 'unenrolled') {
    issues.push({
      deviceId: device.deviceId,
      deviceName: device.name,
      childId: device.childId,
      type: 'critical',
      message: `Monitoring stopped on ${device.name}`,
    })
  }

  // Check health metrics if available
  if (device.healthMetrics) {
    const metrics = device.healthMetrics

    // Warning: Sync delay > 1 hour
    if (metrics.lastHealthSync) {
      const syncDelayMinutes = (now - metrics.lastHealthSync.getTime()) / (1000 * 60)
      if (syncDelayMinutes >= THRESHOLDS.SYNC_WARNING_MINUTES) {
        const syncDelayText = formatLastSeen(metrics.lastHealthSync)
        issues.push({
          deviceId: device.deviceId,
          deviceName: device.name,
          childId: device.childId,
          type: 'warning',
          message: `${device.name} last synced ${syncDelayText}`,
        })
      }
    }

    // Warning: Low battery < 20%
    if (
      metrics.batteryLevel !== null &&
      metrics.batteryLevel < THRESHOLDS.BATTERY_WARNING_PERCENT
    ) {
      issues.push({
        deviceId: device.deviceId,
        deviceName: device.name,
        childId: device.childId,
        type: 'warning',
        message: `${device.name} battery low (${metrics.batteryLevel}%)`,
      })
    }

    // Warning: Network offline
    if (metrics.networkStatus === 'offline' && device.status === 'active') {
      issues.push({
        deviceId: device.deviceId,
        deviceName: device.name,
        childId: device.childId,
        type: 'warning',
        message: `${device.name} network offline`,
      })
    }
  }

  return issues
}

/**
 * Calculate overall status from all issues
 * Exported for reuse in useChildStatus
 */
export function calculateOverallStatus(issues: StatusIssue[]): FamilyStatus {
  if (issues.some((issue) => issue.type === 'critical')) {
    return 'action'
  }
  if (issues.length > 0) {
    return 'attention'
  }
  return 'good'
}

/**
 * Get the most recent update time across all devices
 */
function getLastUpdated(devices: Device[]): Date {
  if (devices.length === 0) {
    return new Date()
  }

  let latestTime = 0

  for (const device of devices) {
    // Check lastSeen
    if (device.lastSeen) {
      latestTime = Math.max(latestTime, device.lastSeen.getTime())
    }
    // Check health sync time
    if (device.healthMetrics?.lastHealthSync) {
      latestTime = Math.max(latestTime, device.healthMetrics.lastHealthSync.getTime())
    }
  }

  return latestTime > 0 ? new Date(latestTime) : new Date()
}

/**
 * Hook to get aggregated family status for the summary card
 *
 * @param familyId - The family ID to get status for
 * @returns Family status result with overall status, message, counts, and issues
 */
export function useFamilyStatus(familyId: string | null): FamilyStatusResult {
  const { devices, loading: devicesLoading, error: devicesError } = useDevices({ familyId })
  const { children, loading: childrenLoading, error: childrenError } = useChildren({ familyId })

  const result = useMemo(() => {
    // Only count active/offline devices (not unenrolled for count purposes)
    const activeDevices = devices.filter((d) => d.status !== 'unenrolled')
    const activeDeviceCount = devices.filter((d) => d.status === 'active').length

    // Collect all issues from all devices
    const allIssues: StatusIssue[] = []
    for (const device of devices) {
      const deviceIssues = calculateDeviceIssues(device)
      allIssues.push(...deviceIssues)
    }

    // Sort issues: critical first, then by device name
    allIssues.sort((a, b) => {
      if (a.type === 'critical' && b.type !== 'critical') return -1
      if (a.type !== 'critical' && b.type === 'critical') return 1
      return a.deviceName.localeCompare(b.deviceName)
    })

    const status = calculateOverallStatus(allIssues)
    const message = getStatusMessage(status, allIssues, devices.length)
    const lastUpdated = getLastUpdated(devices)

    return {
      status,
      message,
      childCount: children.length,
      deviceCount: activeDevices.length,
      activeDeviceCount,
      issues: allIssues,
      lastUpdated,
    }
  }, [devices, children])

  return {
    ...result,
    loading: devicesLoading || childrenLoading,
    error: devicesError || childrenError,
  }
}
