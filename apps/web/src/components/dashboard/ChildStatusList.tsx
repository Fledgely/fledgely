'use client'

/**
 * ChildStatusList Component - Story 19A.2
 * Updated: Story 8.5.1 - Demo Child Profile Integration
 *
 * Container component that renders all child status rows.
 * Shows demo profile when no real children exist.
 * Designed for compact layout to fit 6 children without scrolling.
 *
 * Acceptance Criteria:
 * - AC1: Each child shown as a row with status indicator
 * - AC4: Children ordered by status severity
 * - AC5: All children fit on one screen without scrolling (up to 6)
 * - [8.5.1] Show demo child when no real children and demo not dismissed
 */

import { ChildStatusRow } from './ChildStatusRow'
import { DemoChildCard } from './DemoChildCard'
import { useChildStatus, ChildStatus } from '../../hooks/useChildStatus'
import { useDemo } from '../../hooks/useDemo'

/**
 * Props for ChildStatusList
 */
interface ChildStatusListProps {
  familyId: string
}

/**
 * Loading skeleton for child rows
 */
function LoadingRow() {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        padding: '8px 12px',
        borderBottom: '1px solid rgba(0, 0, 0, 0.05)',
        minHeight: '48px',
      }}
      data-testid="child-status-loading-row"
    >
      {/* Avatar skeleton */}
      <div
        style={{
          width: '32px',
          height: '32px',
          borderRadius: '50%',
          backgroundColor: '#e5e7eb',
        }}
      />
      {/* Name skeleton */}
      <div
        style={{
          marginLeft: '12px',
          width: '100px',
          height: '14px',
          backgroundColor: '#e5e7eb',
          borderRadius: '4px',
        }}
      />
      {/* Status skeleton */}
      <div
        style={{
          marginLeft: 'auto',
          width: '60px',
          height: '12px',
          backgroundColor: '#e5e7eb',
          borderRadius: '4px',
        }}
      />
    </div>
  )
}

/**
 * Loading skeleton for the list
 */
function LoadingSkeleton() {
  return (
    <div data-testid="child-status-loading" role="status" aria-label="Loading children">
      <LoadingRow />
      <LoadingRow />
    </div>
  )
}

/**
 * Empty state when no children and no demo
 */
function EmptyState() {
  return (
    <div
      style={{
        padding: '16px',
        textAlign: 'center',
        color: '#6b7280',
        fontSize: '14px',
      }}
      data-testid="child-status-empty"
    >
      No children in this family yet. Add a child to get started with monitoring.
    </div>
  )
}

/**
 * Error state
 */
function ErrorState({ message }: { message: string }) {
  return (
    <div
      style={{
        padding: '16px',
        textAlign: 'center',
        color: '#dc2626',
        fontSize: '14px',
      }}
      data-testid="child-status-error"
      role="alert"
    >
      {message}
    </div>
  )
}

/**
 * ChildStatusList - Container for all child status rows
 * Story 8.5.1: Shows demo profile when no real children exist
 */
export function ChildStatusList({ familyId }: ChildStatusListProps) {
  const { childStatuses, loading, error } = useChildStatus(familyId)
  const hasRealChildren = childStatuses.length > 0
  const {
    showDemo,
    demoChild,
    activitySummary,
    dismissDemo,
    dismissing,
    loading: demoLoading,
  } = useDemo(familyId, hasRealChildren)

  if (loading || demoLoading) {
    return <LoadingSkeleton />
  }

  if (error) {
    return <ErrorState message={error} />
  }

  // Story 8.5.1: Show demo when no real children and demo not dismissed
  if (childStatuses.length === 0) {
    if (showDemo && demoChild) {
      return (
        <div data-testid="child-status-list-demo">
          <DemoChildCard
            demoChild={demoChild}
            activitySummary={activitySummary}
            onDismiss={dismissDemo}
            dismissing={dismissing}
          />
        </div>
      )
    }
    return <EmptyState />
  }

  return (
    <div
      data-testid="child-status-list"
      role="list"
      aria-label="Children status list"
      style={{
        marginTop: '8px',
      }}
    >
      {childStatuses.map((child: ChildStatus) => (
        <div key={child.childId} role="listitem">
          <ChildStatusRow
            childId={child.childId}
            childName={child.childName}
            photoURL={child.photoURL}
            status={child.status}
            deviceCount={child.deviceCount}
            activeDeviceCount={child.activeDeviceCount}
            lastActivity={child.lastActivity}
            devices={child.devices}
          />
        </div>
      ))}
    </div>
  )
}
