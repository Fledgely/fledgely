'use client'

/**
 * ScreenTimeDeviceBreakdown Component - Story 29.4
 *
 * Displays screen time breakdown by device.
 *
 * Acceptance Criteria:
 * - AC2: Breakdown by device: "Chromebook: 2h, Android: 1h"
 */

import { formatDuration } from '../../hooks/useChildScreenTime'

interface DeviceTimeEntry {
  deviceId: string
  deviceName: string
  deviceType: string
  minutes: number
}

interface ScreenTimeDeviceBreakdownProps {
  /** Device time entries */
  devices: DeviceTimeEntry[]
}

/**
 * Get device type icon
 */
function getDeviceIcon(deviceType: string): string {
  switch (deviceType.toLowerCase()) {
    case 'chromebook':
      return '💻'
    case 'android':
    case 'phone':
      return '📱'
    case 'tablet':
      return '📲'
    case 'desktop':
    case 'pc':
      return '🖥️'
    default:
      return '📟'
  }
}

/**
 * Get device type color
 */
function getDeviceColor(deviceType: string): string {
  switch (deviceType.toLowerCase()) {
    case 'chromebook':
      return '#4285f4' // Google blue
    case 'android':
    case 'phone':
      return '#34a853' // Google green
    case 'tablet':
      return '#ea4335' // Google red
    default:
      return '#9ca3af' // Gray
  }
}

/**
 * Single device row
 */
function DeviceRow({ device, totalMinutes }: { device: DeviceTimeEntry; totalMinutes: number }) {
  const percentage = totalMinutes > 0 ? (device.minutes / totalMinutes) * 100 : 0
  const icon = getDeviceIcon(device.deviceType)
  const color = getDeviceColor(device.deviceType)

  return (
    <div
      data-testid={`device-row-${device.deviceId}`}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        marginBottom: '8px',
      }}
    >
      {/* Device icon */}
      <div
        style={{
          width: '24px',
          fontSize: '16px',
          textAlign: 'center',
          flexShrink: 0,
        }}
        aria-hidden="true"
      >
        {icon}
      </div>

      {/* Device name and type */}
      <div
        style={{
          flex: 1,
          minWidth: 0,
        }}
      >
        <div
          style={{
            fontSize: '13px',
            color: '#374151',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {device.deviceName}
        </div>
        <div
          style={{
            fontSize: '11px',
            color: '#9ca3af',
            textTransform: 'capitalize',
          }}
        >
          {device.deviceType}
        </div>
      </div>

      {/* Progress bar */}
      <div
        style={{
          width: '80px',
          height: '6px',
          backgroundColor: '#e5e7eb',
          borderRadius: '3px',
          overflow: 'hidden',
          flexShrink: 0,
        }}
        role="progressbar"
        aria-valuenow={percentage}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${device.deviceName}: ${formatDuration(device.minutes)}, ${Math.round(percentage)}% of total`}
      >
        <div
          style={{
            width: `${percentage}%`,
            height: '100%',
            backgroundColor: color,
            transition: 'width 0.3s ease',
          }}
        />
      </div>

      {/* Duration */}
      <div
        style={{
          width: '50px',
          fontSize: '12px',
          fontWeight: 500,
          color: '#6b7280',
          textAlign: 'right',
          flexShrink: 0,
        }}
      >
        {formatDuration(device.minutes)}
      </div>
    </div>
  )
}

/**
 * ScreenTimeDeviceBreakdown - Device breakdown display
 */
export function ScreenTimeDeviceBreakdown({ devices }: ScreenTimeDeviceBreakdownProps) {
  // Sort devices by minutes descending
  const sortedDevices = [...devices].sort((a, b) => b.minutes - a.minutes)

  if (sortedDevices.length === 0) {
    return null
  }

  // Calculate total for percentage
  const totalMinutes = sortedDevices.reduce((sum, d) => sum + d.minutes, 0)

  return (
    <div data-testid="device-breakdown">
      <div
        style={{
          fontSize: '12px',
          fontWeight: 600,
          color: '#6b7280',
          marginBottom: '8px',
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
        }}
      >
        By Device
      </div>
      {sortedDevices.map((device) => (
        <DeviceRow key={device.deviceId} device={device} totalMinutes={totalMinutes} />
      ))}
    </div>
  )
}
