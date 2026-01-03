'use client'

/**
 * CaregiverFlagAuditView Component
 *
 * Story 39.5: Caregiver Flag Viewing
 * - AC4: Flag Viewing Audit - Display flag viewing history
 *
 * Shows parent the history of caregiver flag viewing activity.
 * Displays: caregiver name, child name, flag category, action, timestamp.
 * Supports filtering by caregiver and child.
 */

import { useMemo } from 'react'

/**
 * Type for a caregiver flag view log entry
 */
export interface CaregiverFlagViewLogEntry {
  id: string
  familyId: string
  caregiverUid: string
  caregiverName: string
  flagId: string
  childUid: string
  childName: string
  action: 'viewed' | 'marked_reviewed'
  flagCategory: string
  flagSeverity: string
  timestamp: Date
}

/**
 * Props for CaregiverFlagAuditView component
 */
export interface CaregiverFlagAuditViewProps {
  /** List of flag view log entries */
  entries: CaregiverFlagViewLogEntry[]
  /** Filter by specific caregiver UID */
  filterByCaregiverUid?: string
  /** Filter by specific child UID */
  filterByChildUid?: string
  /** Filter by start date (inclusive) */
  filterByStartDate?: Date
  /** Filter by end date (inclusive) */
  filterByEndDate?: Date
  /** Loading state */
  loading?: boolean
  /** Error message */
  error?: string
}

/**
 * Format action type for display
 */
function formatAction(action: 'viewed' | 'marked_reviewed'): string {
  switch (action) {
    case 'viewed':
      return 'Viewed'
    case 'marked_reviewed':
      return 'Marked as reviewed'
    default:
      return action
  }
}

/**
 * Format timestamp for display
 */
function formatTimestamp(date: Date): string {
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

/**
 * Styles for the component
 */
const styles = {
  container: {
    fontFamily: 'system-ui, -apple-system, sans-serif',
  } as React.CSSProperties,

  heading: {
    fontSize: '20px',
    fontWeight: 600,
    color: '#1f2937',
    marginBottom: '16px',
  } as React.CSSProperties,

  entryCount: {
    fontSize: '14px',
    color: '#6b7280',
    marginBottom: '12px',
  } as React.CSSProperties,

  entryList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  } as React.CSSProperties,

  entryRow: {
    display: 'flex',
    flexDirection: 'column',
    padding: '12px 16px',
    backgroundColor: '#f9fafb',
    borderRadius: '8px',
    border: '1px solid #e5e7eb',
  } as React.CSSProperties,

  entryHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '4px',
  } as React.CSSProperties,

  caregiverName: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#1f2937',
  } as React.CSSProperties,

  timestamp: {
    fontSize: '12px',
    color: '#9ca3af',
  } as React.CSSProperties,

  entryDetails: {
    fontSize: '14px',
    color: '#4b5563',
  } as React.CSSProperties,

  childName: {
    fontWeight: 500,
    color: '#374151',
  } as React.CSSProperties,

  flagCategory: {
    backgroundColor: '#e5e7eb',
    padding: '2px 8px',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: 500,
    marginLeft: '4px',
    marginRight: '4px',
  } as React.CSSProperties,

  action: {
    color: '#6b7280',
    fontStyle: 'italic',
  } as React.CSSProperties,

  emptyState: {
    textAlign: 'center',
    padding: '32px',
    backgroundColor: '#f9fafb',
    borderRadius: '8px',
    color: '#6b7280',
    fontSize: '16px',
  } as React.CSSProperties,

  loadingState: {
    textAlign: 'center',
    padding: '32px',
    color: '#6b7280',
    fontSize: '16px',
  } as React.CSSProperties,

  errorState: {
    textAlign: 'center',
    padding: '16px',
    backgroundColor: '#fef2f2',
    borderRadius: '8px',
    color: '#991b1b',
    fontSize: '14px',
  } as React.CSSProperties,
}

/**
 * CaregiverFlagAuditView - Displays flag viewing history for parents
 */
export function CaregiverFlagAuditView({
  entries,
  filterByCaregiverUid,
  filterByChildUid,
  filterByStartDate,
  filterByEndDate,
  loading = false,
  error,
}: CaregiverFlagAuditViewProps) {
  // Filter and sort entries
  const filteredEntries = useMemo(() => {
    let result = [...entries]

    // Apply caregiver filter
    if (filterByCaregiverUid) {
      result = result.filter((entry) => entry.caregiverUid === filterByCaregiverUid)
    }

    // Apply child filter
    if (filterByChildUid) {
      result = result.filter((entry) => entry.childUid === filterByChildUid)
    }

    // Apply date range filter (start date, inclusive)
    if (filterByStartDate) {
      result = result.filter((entry) => entry.timestamp >= filterByStartDate)
    }

    // Apply date range filter (end date, inclusive)
    if (filterByEndDate) {
      result = result.filter((entry) => entry.timestamp <= filterByEndDate)
    }

    // Sort by newest first
    result.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())

    return result
  }, [entries, filterByCaregiverUid, filterByChildUid, filterByStartDate, filterByEndDate])

  // Loading state
  if (loading) {
    return (
      <div style={styles.container}>
        <h2 style={styles.heading}>Flag Viewing History</h2>
        <div style={styles.loadingState} data-testid="loading-state">
          Loading...
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div style={styles.container}>
        <h2 style={styles.heading}>Flag Viewing History</h2>
        <div style={styles.errorState} data-testid="error-message" role="alert">
          {error}
        </div>
      </div>
    )
  }

  // Empty state
  if (filteredEntries.length === 0) {
    return (
      <div style={styles.container}>
        <h2 style={styles.heading}>Flag Viewing History</h2>
        <div style={styles.emptyState} data-testid="empty-state">
          No flag views yet
        </div>
      </div>
    )
  }

  return (
    <div style={styles.container}>
      <h2 style={styles.heading}>Flag Viewing History</h2>

      <div style={styles.entryCount}>
        <span data-testid="entry-count">{filteredEntries.length}</span> entries
      </div>

      <div style={styles.entryList} data-testid="entry-list" role="list">
        {filteredEntries.map((entry) => (
          <div
            key={entry.id}
            style={styles.entryRow}
            data-testid={`flag-audit-row-${entry.id}`}
            role="listitem"
          >
            <div style={styles.entryHeader}>
              <span style={styles.caregiverName}>{entry.caregiverName}</span>
              <span style={styles.timestamp}>{formatTimestamp(entry.timestamp)}</span>
            </div>
            <div style={styles.entryDetails}>
              <span style={styles.action}>{formatAction(entry.action)}</span>{' '}
              <span style={styles.flagCategory}>{entry.flagCategory}</span>
              {' flag for '}
              <span style={styles.childName}>{entry.childName}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
