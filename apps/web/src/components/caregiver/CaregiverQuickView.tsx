'use client'

/**
 * CaregiverQuickView Component - Story 19A.3
 *
 * Simplified single-screen status view for caregivers (grandparents).
 * Displays overall family status with large, accessible UI.
 *
 * Key Features:
 * - Single-screen, no expansion or drilling down
 * - Large fonts and touch targets (48px+ buttons, 18px+ text)
 * - Plain language ("Doing well" vs "All Good")
 * - No device details, metrics, or technical information
 * - Prominent help contact (Call Parent button)
 *
 * Acceptance Criteria:
 * - AC1: Simplified status display
 * - AC2: No complex device details
 * - AC3: Large touch targets (NFR49: 44x44 minimum)
 * - AC4: Call parent button
 * - AC5: View access logging (FR19D-X)
 * - AC6: Accessibility
 */

import { useCaregiverStatus } from '../../hooks/useCaregiverStatus'
import { useCaregiverAccessLog } from '../../hooks/useCaregiverAccessLog'
import { CaregiverChildCard } from './CaregiverChildCard'
import { CallParentButton } from './CallParentButton'
import { statusColors } from '../dashboard/statusConstants'

/**
 * Props for CaregiverQuickView component
 */
export interface CaregiverQuickViewProps {
  familyId: string | null
  /** Story 19D.3: Caregiver UID for audit logging */
  viewerUid?: string | null
}

/**
 * Loading state component
 */
function LoadingState() {
  const containerStyles: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '300px',
    padding: '32px',
  }

  const spinnerStyles: React.CSSProperties = {
    width: '48px',
    height: '48px',
    border: '4px solid #e5e7eb',
    borderTopColor: '#3b82f6',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  }

  const textStyles: React.CSSProperties = {
    marginTop: '16px',
    fontSize: '18px',
    color: '#6b7280',
  }

  return (
    <div style={containerStyles} role="status" aria-label="Loading family status">
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <div style={spinnerStyles} />
      <p style={textStyles}>Loading...</p>
    </div>
  )
}

/**
 * Error state component with retry
 */
function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  const containerStyles: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '300px',
    padding: '32px',
    backgroundColor: '#fef2f2',
    borderRadius: '16px',
  }

  const textStyles: React.CSSProperties = {
    fontSize: '18px',
    color: '#991b1b',
    textAlign: 'center',
    marginBottom: '16px',
  }

  const buttonStyles: React.CSSProperties = {
    minWidth: '48px',
    minHeight: '48px',
    padding: '12px 24px',
    fontSize: '18px',
    fontWeight: 600,
    color: 'white',
    backgroundColor: '#3b82f6',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
  }

  return (
    <div style={containerStyles} role="alert" aria-live="polite">
      <p style={textStyles}>{message}</p>
      {onRetry && (
        <button
          style={buttonStyles}
          onClick={onRetry}
          aria-label="Try again"
          data-testid="retry-button"
        >
          Try Again
        </button>
      )}
    </div>
  )
}

/**
 * Empty state when no children
 */
function EmptyState() {
  const containerStyles: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '300px',
    padding: '32px',
    backgroundColor: '#f3f4f6',
    borderRadius: '16px',
  }

  const textStyles: React.CSSProperties = {
    fontSize: '20px',
    color: '#6b7280',
    textAlign: 'center',
  }

  return (
    <div style={containerStyles} data-testid="empty-state">
      <p style={textStyles}>No children to monitor</p>
    </div>
  )
}

/**
 * CaregiverQuickView - Simplified status view for caregivers
 */
export function CaregiverQuickView({ familyId, viewerUid }: CaregiverQuickViewProps) {
  const {
    overallStatus,
    statusMessage,
    children,
    childrenNeedingAttention,
    parentContact,
    loading,
    error,
    refetch,
  } = useCaregiverStatus(familyId)

  // Story 19D.3: Log access on mount with Firestore audit (AC5)
  const childIds = children.map((c) => c.childId)
  useCaregiverAccessLog('view', childIds, viewerUid, familyId)

  // Container styles
  const containerStyles: React.CSSProperties = {
    maxWidth: '600px',
    margin: '0 auto',
    padding: '24px',
    fontFamily: 'system-ui, -apple-system, sans-serif',
  }

  // Header styles
  const headerStyles: React.CSSProperties = {
    marginBottom: '24px',
    textAlign: 'center',
  }

  const titleStyles: React.CSSProperties = {
    fontSize: '28px',
    fontWeight: 700,
    color: '#1f2937',
    margin: 0,
    marginBottom: '8px',
  }

  // Status message styles - colored based on status
  const colors = statusColors[overallStatus]
  const statusMessageStyles: React.CSSProperties = {
    fontSize: '24px',
    fontWeight: 600,
    color: colors.text,
    backgroundColor: colors.bg,
    padding: '20px 24px',
    borderRadius: '16px',
    border: `2px solid ${colors.border}`,
    textAlign: 'center',
    marginBottom: '24px',
  }

  // Children list styles
  const childrenListStyles: React.CSSProperties = {
    marginBottom: '24px',
  }

  // Loading state
  if (loading) {
    return (
      <div style={containerStyles} data-testid="caregiver-quick-view">
        <LoadingState />
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div style={containerStyles} data-testid="caregiver-quick-view">
        <ErrorState message={error} onRetry={refetch} />
      </div>
    )
  }

  // Empty state
  if (children.length === 0) {
    return (
      <div style={containerStyles} data-testid="caregiver-quick-view">
        <div style={headerStyles}>
          <h1 style={titleStyles}>Family Status</h1>
        </div>
        <EmptyState />
        <CallParentButton contact={parentContact} hasIssues={false} />
      </div>
    )
  }

  return (
    <div style={containerStyles} data-testid="caregiver-quick-view">
      {/* Header */}
      <header style={headerStyles}>
        <h1 style={titleStyles}>Family Status</h1>
      </header>

      {/* Status message */}
      <div
        style={statusMessageStyles}
        role="status"
        aria-live="polite"
        data-testid="status-message"
      >
        {statusMessage}
      </div>

      {/* Children list */}
      <div
        role="list"
        aria-label="Children status"
        style={childrenListStyles}
        data-testid="children-list"
      >
        {children.map((child) => (
          <CaregiverChildCard key={child.childId} child={child} />
        ))}
      </div>

      {/* Call parent button */}
      <CallParentButton contact={parentContact} hasIssues={childrenNeedingAttention.length > 0} />
    </div>
  )
}
