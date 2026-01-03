/**
 * LocationTransitionHistory Component - Story 40.4
 *
 * Shows location transition history to parents.
 *
 * Acceptance Criteria:
 * - AC7: Audit trail for parents
 */

import React from 'react'

export interface TransitionRecord {
  /** Unique identifier */
  id: string
  /** Child ID */
  childId: string
  /** Child name (for display) */
  childName: string
  /** Zone transitioned from (null if unknown) */
  fromZoneName: string | null
  /** Zone transitioned to (null if unknown/left) */
  toZoneName: string | null
  /** When transition was detected */
  detectedAt: Date
  /** When rules were applied (null if not yet) */
  appliedAt: Date | null
  /** Snapshot of rules that were applied */
  rulesApplied: {
    dailyTimeLimitMinutes: number | null
    educationOnlyMode: boolean
  } | null
}

export interface LocationTransitionHistoryProps {
  /** List of transitions to display */
  transitions: TransitionRecord[]
  /** Whether data is loading */
  isLoading: boolean
  /** Error message if any */
  error?: string
  /** Current page number */
  page: number
  /** Total number of pages */
  totalPages: number
  /** Callback when page changes */
  onPageChange: (page: number) => void
}

/**
 * Table showing location transition history.
 *
 * Displays transitions with:
 * - Child name
 * - From/to zone names
 * - Timestamp
 * - Applied rules
 */
export function LocationTransitionHistory({
  transitions,
  isLoading,
  error,
  page,
  totalPages,
  onPageChange,
}: LocationTransitionHistoryProps): React.ReactElement {
  // Style definitions
  const containerStyle: React.CSSProperties = {
    backgroundColor: '#FFFFFF',
    borderRadius: '8px',
    border: '1px solid #E5E7EB',
    overflow: 'hidden',
  }

  const headerStyle: React.CSSProperties = {
    padding: '16px',
    borderBottom: '1px solid #E5E7EB',
    backgroundColor: '#F9FAFB',
  }

  const titleStyle: React.CSSProperties = {
    fontSize: '16px',
    fontWeight: 600,
    color: '#111827',
    margin: 0,
  }

  const tableStyle: React.CSSProperties = {
    width: '100%',
    borderCollapse: 'collapse',
  }

  const thStyle: React.CSSProperties = {
    padding: '12px 16px',
    textAlign: 'left',
    fontSize: '12px',
    fontWeight: 600,
    color: '#6B7280',
    textTransform: 'uppercase',
    borderBottom: '1px solid #E5E7EB',
  }

  const tdStyle: React.CSSProperties = {
    padding: '12px 16px',
    fontSize: '14px',
    color: '#374151',
    borderBottom: '1px solid #E5E7EB',
  }

  const emptyStyle: React.CSSProperties = {
    padding: '32px',
    textAlign: 'center',
    color: '#6B7280',
    fontSize: '14px',
  }

  const errorStyle: React.CSSProperties = {
    padding: '16px',
    backgroundColor: '#FEE2E2',
    color: '#B91C1C',
    borderRadius: '8px',
    marginBottom: '16px',
  }

  const loadingStyle: React.CSSProperties = {
    padding: '32px',
    textAlign: 'center',
    color: '#6B7280',
  }

  const paginationStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 16px',
    borderTop: '1px solid #E5E7EB',
    backgroundColor: '#F9FAFB',
  }

  const buttonStyle: React.CSSProperties = {
    padding: '8px 16px',
    fontSize: '14px',
    borderRadius: '6px',
    border: '1px solid #D1D5DB',
    backgroundColor: '#FFFFFF',
    cursor: 'pointer',
  }

  const disabledButtonStyle: React.CSSProperties = {
    ...buttonStyle,
    opacity: 0.5,
    cursor: 'not-allowed',
  }

  const badgeStyle: React.CSSProperties = {
    display: 'inline-block',
    padding: '2px 8px',
    fontSize: '12px',
    borderRadius: '9999px',
    fontWeight: 500,
  }

  const enterBadgeStyle: React.CSSProperties = {
    ...badgeStyle,
    backgroundColor: '#D1FAE5',
    color: '#065F46',
  }

  const exitBadgeStyle: React.CSSProperties = {
    ...badgeStyle,
    backgroundColor: '#FEE2E2',
    color: '#B91C1C',
  }

  const unknownBadgeStyle: React.CSSProperties = {
    ...badgeStyle,
    backgroundColor: '#F3F4F6',
    color: '#6B7280',
  }

  // Format date for display
  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  }

  // Get transition type badge
  const getTransitionBadge = (transition: TransitionRecord): React.ReactElement => {
    if (transition.toZoneName) {
      return <span style={enterBadgeStyle}>Entered {transition.toZoneName}</span>
    }
    if (transition.fromZoneName) {
      return <span style={exitBadgeStyle}>Left {transition.fromZoneName}</span>
    }
    return <span style={unknownBadgeStyle}>Unknown</span>
  }

  // Format rules for display
  const formatRules = (rules: TransitionRecord['rulesApplied']): string => {
    if (!rules) return 'No rules'
    const parts: string[] = []
    if (rules.dailyTimeLimitMinutes !== null) {
      parts.push(`${rules.dailyTimeLimitMinutes}min limit`)
    }
    if (rules.educationOnlyMode) {
      parts.push('Education only')
    }
    return parts.length > 0 ? parts.join(', ') : 'Default rules'
  }

  if (error) {
    return <div style={errorStyle}>{error}</div>
  }

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <h3 style={titleStyle}>Location Transitions</h3>
      </div>

      {isLoading ? (
        <div style={loadingStyle}>Loading transitions...</div>
      ) : transitions.length === 0 ? (
        <div style={emptyStyle}>No location transitions recorded yet.</div>
      ) : (
        <>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>Child</th>
                <th style={thStyle}>Transition</th>
                <th style={thStyle}>Time</th>
                <th style={thStyle}>Rules Applied</th>
                <th style={thStyle}>Status</th>
              </tr>
            </thead>
            <tbody>
              {transitions.map((transition) => (
                <tr key={transition.id}>
                  <td style={tdStyle}>{transition.childName}</td>
                  <td style={tdStyle}>{getTransitionBadge(transition)}</td>
                  <td style={tdStyle}>{formatDate(transition.detectedAt)}</td>
                  <td style={tdStyle}>{formatRules(transition.rulesApplied)}</td>
                  <td style={tdStyle}>
                    {transition.appliedAt ? (
                      <span style={enterBadgeStyle}>Applied</span>
                    ) : (
                      <span style={unknownBadgeStyle}>Pending</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {totalPages > 1 && (
            <div style={paginationStyle}>
              <button
                style={page <= 1 ? disabledButtonStyle : buttonStyle}
                onClick={() => onPageChange(page - 1)}
                disabled={page <= 1}
              >
                Previous
              </button>
              <span>
                Page {page} of {totalPages}
              </span>
              <button
                style={page >= totalPages ? disabledButtonStyle : buttonStyle}
                onClick={() => onPageChange(page + 1)}
                disabled={page >= totalPages}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
