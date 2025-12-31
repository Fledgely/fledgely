'use client'

/**
 * CaregiverChildCard Component - Story 19A.3, 19D.2
 *
 * Displays a single child's simplified status for caregiver view.
 * Shows avatar, name, monitoring status, and screen time status.
 *
 * Key Differences from ChildStatusRow:
 * - No expand/collapse functionality
 * - No device details or counts
 * - Larger touch targets (64px+ height)
 * - Simpler language ("Doing well" vs "All Good")
 * - Screen time status for "can they use the device?" (Story 19D.2)
 *
 * Acceptance Criteria (Story 19A.3):
 * - AC1: Simplified status display
 * - AC2: No complex device details
 * - AC3: Large touch targets (NFR49: 44x44 minimum)
 * - AC6: Accessibility
 *
 * Acceptance Criteria (Story 19D.2):
 * - AC2: Status shows "Screen time available" or "Screen time finished"
 * - AC3: Shows "X minutes left today" if time remaining
 * - AC6: Large, clear UI for older adults (NFR49)
 */

import { useState } from 'react'
import type { FamilyStatus } from '../../hooks/useFamilyStatus'
import type { CaregiverChildSummary } from '../../hooks/useCaregiverStatus'
import { statusColors } from '../dashboard/statusConstants'

/**
 * Props for CaregiverChildCard component
 */
export interface CaregiverChildCardProps {
  child: CaregiverChildSummary
}

/**
 * Avatar component with fallback initials (larger version for caregiver view)
 */
function Avatar({ src, name, size = 48 }: { src: string | null; name: string; size?: number }) {
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
    fontSize: `${size * 0.35}px`,
    fontWeight: 600,
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
 * Status indicator for caregiver view (larger dot)
 */
function StatusIndicator({ status }: { status: FamilyStatus }) {
  const colors = statusColors[status]

  return (
    <span
      style={{
        width: '12px',
        height: '12px',
        borderRadius: '50%',
        backgroundColor: colors.icon,
        flexShrink: 0,
      }}
      aria-hidden="true"
    />
  )
}

/**
 * Format time remaining for display (Story 19D.2)
 * Uses plain language suitable for older adults
 */
function formatTimeRemaining(minutes: number | null): string | null {
  if (minutes === null) return null
  if (minutes <= 0) return null

  if (minutes < 60) {
    return `${minutes} minute${minutes === 1 ? '' : 's'} left today`
  }

  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60

  if (mins === 0) {
    return `${hours} hour${hours === 1 ? '' : 's'} left today`
  }

  return `${hours}h ${mins}m left today`
}

/**
 * Screen time status display for caregiver view (Story 19D.2)
 */
function ScreenTimeDisplay({
  screenTimeStatus,
  timeRemainingMinutes,
}: {
  screenTimeStatus: 'available' | 'finished'
  timeRemainingMinutes: number | null
}) {
  const isAvailable = screenTimeStatus === 'available'
  const timeRemaining = formatTimeRemaining(timeRemainingMinutes)

  // Colors: green for available, muted grey for finished (not red - finished isn't an error)
  const containerStyles: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: '4px',
  }

  const statusBadgeStyles: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 12px',
    borderRadius: '16px',
    fontSize: '14px',
    fontWeight: 500,
    backgroundColor: isAvailable ? '#dcfce7' : '#f3f4f6',
    color: isAvailable ? '#166534' : '#6b7280',
    border: isAvailable ? '1px solid #bbf7d0' : '1px solid #e5e7eb',
  }

  const timeRemainingStyles: React.CSSProperties = {
    fontSize: '13px',
    color: '#6b7280',
    fontWeight: 400,
  }

  return (
    <div style={containerStyles} data-testid="screen-time-display">
      <span style={statusBadgeStyles} data-testid="screen-time-status">
        {isAvailable ? '✓' : '—'} {isAvailable ? 'Screen time available' : 'Screen time finished'}
      </span>
      {timeRemaining && (
        <span style={timeRemainingStyles} data-testid="time-remaining">
          {timeRemaining}
        </span>
      )}
    </div>
  )
}

/**
 * CaregiverChildCard - Simplified child status for caregiver view
 *
 * Updated for Story 19D.2 to prioritize screen time status
 * while still showing monitoring health as secondary info.
 */
export function CaregiverChildCard({ child }: CaregiverChildCardProps) {
  const colors = statusColors[child.status]

  const cardStyles: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    padding: '16px 20px',
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    border: '1px solid #e5e7eb',
    marginBottom: '12px',
  }

  const headerStyles: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  }

  const nameStyles: React.CSSProperties = {
    fontSize: '20px',
    fontWeight: 600,
    color: '#1f2937',
    flex: 1,
  }

  const monitoringStatusStyles: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '14px',
    fontWeight: 500,
    color: colors.text,
    padding: '4px 10px',
    backgroundColor: colors.bg,
    borderRadius: '12px',
    border: `1px solid ${colors.border}`,
  }

  // Build accessible label for screen reader
  const screenTimeLabel =
    child.screenTimeStatus === 'available' ? 'Screen time available' : 'Screen time finished'
  const timeRemainingLabel = child.timeRemainingMinutes
    ? formatTimeRemaining(child.timeRemainingMinutes)
    : ''
  const ariaLabel = `${child.childName}. ${screenTimeLabel}. ${timeRemainingLabel} ${child.statusMessage}`

  return (
    <div
      role="listitem"
      aria-label={ariaLabel}
      style={cardStyles}
      data-testid={`caregiver-child-card-${child.childId}`}
    >
      {/* Header: Avatar, Name, and Monitoring Status */}
      <div style={headerStyles}>
        <Avatar src={child.photoURL} name={child.childName} size={48} />
        <span style={nameStyles}>{child.childName}</span>
        <div style={monitoringStatusStyles}>
          <StatusIndicator status={child.status} />
          <span>{child.statusMessage}</span>
        </div>
      </div>

      {/* Screen Time Status (Story 19D.2 - Primary display for caregivers) */}
      <ScreenTimeDisplay
        screenTimeStatus={child.screenTimeStatus}
        timeRemainingMinutes={child.timeRemainingMinutes}
      />
    </div>
  )
}
