'use client'

/**
 * CaregiverChildCard Component - Story 19A.3
 *
 * Displays a single child's simplified status for caregiver view.
 * Shows avatar, name, and simple status message.
 *
 * Key Differences from ChildStatusRow:
 * - No expand/collapse functionality
 * - No device details or counts
 * - Larger touch targets (64px+ height)
 * - Simpler language ("Doing well" vs "All Good")
 *
 * Acceptance Criteria:
 * - AC1: Simplified status display
 * - AC2: No complex device details
 * - AC3: Large touch targets (NFR49: 44x44 minimum)
 * - AC6: Accessibility
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
 * CaregiverChildCard - Simplified child status for caregiver view
 */
export function CaregiverChildCard({ child }: CaregiverChildCardProps) {
  const colors = statusColors[child.status]

  const cardStyles: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    padding: '16px 20px',
    backgroundColor: colors.bg,
    borderRadius: '12px',
    border: `2px solid ${colors.border}`,
    minHeight: '64px', // Large touch-friendly height
    marginBottom: '12px',
  }

  const nameStyles: React.CSSProperties = {
    fontSize: '20px',
    fontWeight: 600,
    color: '#1f2937',
    flex: 1,
  }

  const statusStyles: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '18px',
    fontWeight: 500,
    color: colors.text,
  }

  return (
    <div
      role="listitem"
      aria-label={`${child.childName}. Status: ${child.statusMessage}`}
      style={cardStyles}
      data-testid={`caregiver-child-card-${child.childId}`}
    >
      {/* Avatar */}
      <Avatar src={child.photoURL} name={child.childName} size={48} />

      {/* Child name */}
      <span style={nameStyles}>{child.childName}</span>

      {/* Status */}
      <div style={statusStyles}>
        <StatusIndicator status={child.status} />
        <span>{child.statusMessage}</span>
      </div>
    </div>
  )
}
