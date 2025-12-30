'use client'

/**
 * ChildStatusRow Component - Story 19A.2
 *
 * Displays a single child's status as a row with expandable device details.
 * Shows avatar, name, status indicator, last activity, and device count.
 *
 * Acceptance Criteria:
 * - AC1: Each child shown as a row with status indicator
 * - AC2: Row shows child name, avatar, status color, last activity, device count
 * - AC3: Tap to expand shows device details
 * - AC6: Keyboard accessible with aria-expanded
 */

import { useState } from 'react'
import { FamilyStatus } from '../../hooks/useFamilyStatus'
import { Device, formatLastSeen } from '../../hooks/useDevices'
import { statusColors, statusLabels } from './statusConstants'

/**
 * Props for ChildStatusRow component
 */
export interface ChildStatusRowProps {
  childId: string
  childName: string
  photoURL: string | null
  status: FamilyStatus
  deviceCount: number
  activeDeviceCount: number
  lastActivity: Date | null
  devices: Device[]
}

/**
 * Avatar component with fallback initials
 */
function Avatar({ src, name, size = 32 }: { src: string | null; name: string; size?: number }) {
  const [imgError, setImgError] = useState(false)

  const initials = name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  const avatarStyles: React.CSSProperties = {
    width: `${size}px`,
    height: `${size}px`,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: src && !imgError ? 'transparent' : '#e5e7eb',
    color: '#6b7280',
    fontSize: `${size * 0.4}px`,
    fontWeight: 500,
    flexShrink: 0,
    overflow: 'hidden',
  }

  if (src && !imgError) {
    return (
      <div style={avatarStyles} aria-hidden="true">
        <img
          src={src}
          alt=""
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          onError={() => setImgError(true)}
        />
      </div>
    )
  }

  return (
    <div style={avatarStyles} aria-hidden="true">
      {initials}
    </div>
  )
}

/**
 * Small status indicator dot
 */
function StatusDot({ status }: { status: FamilyStatus }) {
  const colors = statusColors[status]

  return (
    <span
      style={{
        width: '8px',
        height: '8px',
        borderRadius: '50%',
        backgroundColor: colors.icon,
        flexShrink: 0,
      }}
      aria-hidden="true"
    />
  )
}

/**
 * Device list shown when row is expanded
 */
function DeviceList({ devices }: { devices: Device[] }) {
  if (devices.length === 0) {
    return (
      <div
        style={{
          padding: '8px 12px 8px 48px',
          fontSize: '13px',
          color: '#6b7280',
        }}
      >
        No devices enrolled
      </div>
    )
  }

  return (
    <div style={{ paddingLeft: '48px', paddingBottom: '8px' }} data-testid="device-list">
      {devices.map((device) => (
        <div
          key={device.deviceId}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '4px 12px',
            fontSize: '13px',
          }}
        >
          <StatusDot
            status={
              device.status === 'unenrolled'
                ? 'action'
                : device.status === 'offline'
                  ? 'attention'
                  : 'good'
            }
          />
          <span style={{ color: '#374151', flex: 1 }}>{device.name}</span>
          <span style={{ color: '#9ca3af', fontSize: '12px' }}>
            {formatLastSeen(device.lastSeen)}
          </span>
        </div>
      ))}
    </div>
  )
}

/**
 * ChildStatusRow - Individual child status row
 */
export function ChildStatusRow({
  childId,
  childName,
  photoURL,
  status,
  deviceCount,
  activeDeviceCount,
  lastActivity,
  devices,
}: ChildStatusRowProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      setIsExpanded(!isExpanded)
    }
  }

  const colors = statusColors[status]
  const formattedTime = lastActivity ? formatLastSeen(lastActivity) : 'No activity'

  // Build device label with active count when relevant
  let deviceLabel: string
  if (deviceCount === 0) {
    deviceLabel = 'No devices'
  } else if (deviceCount === activeDeviceCount) {
    deviceLabel = `${deviceCount} device${deviceCount !== 1 ? 's' : ''}`
  } else {
    deviceLabel = `${activeDeviceCount}/${deviceCount} active`
  }

  const rowStyles: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    padding: '8px 12px',
    borderBottom: '1px solid rgba(0, 0, 0, 0.05)',
    cursor: 'pointer',
    minHeight: '48px',
    transition: 'background-color 0.15s ease, box-shadow 0.15s ease',
    backgroundColor: isExpanded ? 'rgba(0, 0, 0, 0.02)' : 'transparent',
  }

  return (
    <div data-testid={`child-status-row-${childId}`}>
      <div
        role="button"
        tabIndex={0}
        aria-expanded={isExpanded}
        aria-label={`${childName}. Status: ${statusLabels[status]}. ${deviceLabel}. Last active ${formattedTime}. Click to ${isExpanded ? 'collapse' : 'expand'} device details.`}
        onClick={() => setIsExpanded(!isExpanded)}
        onKeyDown={handleKeyDown}
        style={rowStyles}
        data-testid={`child-row-button-${childId}`}
      >
        {/* Avatar */}
        <Avatar src={photoURL} name={childName} />

        {/* Child name */}
        <span
          style={{
            marginLeft: '12px',
            flex: 1,
            fontWeight: 500,
            color: '#1f2937',
            fontSize: '14px',
          }}
        >
          {childName}
        </span>

        {/* Status indicator */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            marginRight: '12px',
          }}
        >
          <StatusDot status={status} />
          <span style={{ fontSize: '12px', color: colors.text }}>{statusLabels[status]}</span>
        </div>

        {/* Device count */}
        <span
          style={{
            fontSize: '12px',
            color: '#6b7280',
            marginRight: '12px',
            minWidth: '60px',
          }}
        >
          {deviceLabel}
        </span>

        {/* Last activity */}
        <span
          style={{
            fontSize: '12px',
            color: '#9ca3af',
            minWidth: '80px',
            textAlign: 'right',
          }}
        >
          {formattedTime}
        </span>

        {/* Expand indicator */}
        <span
          style={{
            marginLeft: '8px',
            fontSize: '10px',
            color: '#9ca3af',
          }}
          aria-hidden="true"
        >
          {isExpanded ? '▲' : '▼'}
        </span>
      </div>

      {/* Expanded device list */}
      {isExpanded && <DeviceList devices={devices} />}
    </div>
  )
}
