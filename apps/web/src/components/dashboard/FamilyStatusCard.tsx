'use client'

/**
 * FamilyStatusCard Component - Story 19A.1
 *
 * Displays overall family status as a summary card at the top of the dashboard.
 * Shows green/yellow/red status with tap-to-expand functionality for details.
 *
 * Acceptance Criteria:
 * - AC1: Prominent status card shows overall family status
 * - AC2: Green "All Good" when all devices healthy
 * - AC3: Yellow "Needs Attention" for minor issues
 * - AC4: Red "Action Required" for critical issues
 * - AC5: Last update timestamp visible
 * - AC6: Tap to expand for details breakdown
 */

import { useState } from 'react'
import { useFamilyStatus, FamilyStatus } from '../../hooks/useFamilyStatus'
import { formatLastSeen } from '../../hooks/useDevices'
import { ChildStatusList } from './ChildStatusList'
import { statusColors, statusLabels } from './statusConstants'

interface FamilyStatusCardProps {
  familyId: string
}

/**
 * Get card styles based on status
 */
function getCardStyles(status: FamilyStatus): React.CSSProperties {
  const colors = statusColors[status]
  return {
    backgroundColor: colors.bg,
    border: `2px solid ${colors.border}`,
    borderRadius: '12px',
    padding: '20px',
    marginBottom: '24px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    outline: 'none',
  }
}

/**
 * Loading skeleton for the card
 */
function LoadingSkeleton() {
  return (
    <div
      style={{
        backgroundColor: '#f3f4f6',
        border: '2px solid #e5e7eb',
        borderRadius: '12px',
        padding: '20px',
        marginBottom: '24px',
      }}
      data-testid="family-status-loading"
      role="status"
      aria-label="Loading family status"
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
        }}
      >
        <div
          style={{
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            backgroundColor: '#e5e7eb',
          }}
        />
        <div style={{ flex: 1 }}>
          <div
            style={{
              width: '120px',
              height: '20px',
              backgroundColor: '#e5e7eb',
              borderRadius: '4px',
              marginBottom: '8px',
            }}
          />
          <div
            style={{
              width: '80px',
              height: '14px',
              backgroundColor: '#e5e7eb',
              borderRadius: '4px',
            }}
          />
        </div>
      </div>
    </div>
  )
}

/**
 * Error state for the card
 */
function ErrorState({ message }: { message: string }) {
  return (
    <div
      style={{
        backgroundColor: '#fef2f2',
        border: '2px solid #fecaca',
        borderRadius: '12px',
        padding: '20px',
        marginBottom: '24px',
      }}
      data-testid="family-status-error"
      role="alert"
    >
      <div style={{ color: '#dc2626', fontWeight: 500 }}>Unable to load family status</div>
      <div style={{ color: '#991b1b', fontSize: '14px', marginTop: '4px' }}>{message}</div>
    </div>
  )
}

/**
 * Status indicator dot
 */
function StatusIndicator({ status }: { status: FamilyStatus }) {
  const colors = statusColors[status]
  return (
    <div
      style={{
        width: '48px',
        height: '48px',
        borderRadius: '50%',
        backgroundColor: colors.icon,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
      aria-hidden="true"
    >
      {status === 'good' && (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path
            d="M20 6L9 17L4 12"
            stroke="white"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
      {status === 'attention' && (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path
            d="M12 9V13M12 17H12.01"
            stroke="white"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
      {status === 'action' && (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path
            d="M12 9V13M12 17H12.01"
            stroke="white"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </div>
  )
}

/**
 * Main FamilyStatusCard component
 */
export function FamilyStatusCard({ familyId }: FamilyStatusCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const {
    status,
    message,
    childCount,
    deviceCount,
    activeDeviceCount,
    lastUpdated,
    loading,
    error,
  } = useFamilyStatus(familyId)

  // Handle keyboard activation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      setIsExpanded(!isExpanded)
    }
  }

  // Show loading skeleton
  if (loading) {
    return <LoadingSkeleton />
  }

  // Show error state
  if (error) {
    return <ErrorState message={error} />
  }

  const colors = statusColors[status]
  const formattedTime = formatLastSeen(lastUpdated)

  return (
    <div
      role="button"
      tabIndex={0}
      aria-expanded={isExpanded}
      aria-label={`Family status: ${statusLabels[status]}. ${message}. ${childCount} children, ${deviceCount} devices. Updated ${formattedTime}. Click to ${isExpanded ? 'collapse' : 'expand'} details.`}
      onClick={() => setIsExpanded(!isExpanded)}
      onKeyDown={handleKeyDown}
      style={getCardStyles(status)}
      data-testid="family-status-card"
    >
      {/* Main content row */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
        }}
      >
        <StatusIndicator status={status} />

        {/* Status text and stats */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: '18px',
              fontWeight: 600,
              color: colors.text,
              marginBottom: '4px',
            }}
            data-testid="status-message"
          >
            {message}
          </div>
          <div
            style={{
              fontSize: '14px',
              color: colors.text,
              opacity: 0.8,
            }}
            data-testid="status-stats"
          >
            {childCount} {childCount === 1 ? 'child' : 'children'} &middot; {deviceCount}{' '}
            {deviceCount === 1 ? 'device' : 'devices'}
            {deviceCount > 0 && ` (${activeDeviceCount} active)`}
          </div>
        </div>

        {/* Timestamp and expand indicator */}
        <div
          style={{
            textAlign: 'right',
            flexShrink: 0,
          }}
        >
          <div
            style={{
              fontSize: '12px',
              color: colors.text,
              opacity: 0.7,
              marginBottom: '4px',
            }}
            data-testid="status-timestamp"
          >
            Updated {formattedTime}
          </div>
          <div
            style={{
              color: colors.text,
              opacity: 0.5,
              fontSize: '12px',
            }}
          >
            {isExpanded ? '▲ Less' : '▼ Details'}
          </div>
        </div>
      </div>

      {/* Expanded details - Story 19A.2: Show per-child status rows */}
      {isExpanded && (
        <div
          style={{
            marginTop: '16px',
            paddingTop: '16px',
            borderTop: '1px solid rgba(0, 0, 0, 0.1)',
          }}
          data-testid="status-details"
        >
          <ChildStatusList familyId={familyId} />
        </div>
      )}
    </div>
  )
}
