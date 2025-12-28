/**
 * InvitationHistoryList - Displays past invitation history for a family.
 *
 * Story 3.5: Invitation Management - AC5
 * Shows past invitations (accepted, expired, revoked) ordered by most recent first.
 * Each shows status, date, and recipient email (if provided).
 */

import { useEffect, useState } from 'react'
import type { Invitation } from '@fledgely/shared/contracts'
import { getInvitationsByFamily } from '../services/invitationService'

interface InvitationHistoryListProps {
  /** The family ID to show invitation history for */
  familyId: string
  /** Optional: refresh trigger (increment to refresh) */
  refreshTrigger?: number
}

const styles = {
  container: {
    marginTop: '24px',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '12px',
  },
  title: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#374151',
    margin: 0,
  },
  toggleButton: {
    minHeight: '44px',
    minWidth: '44px',
    padding: '8px 12px',
    fontSize: '13px',
    color: '#6b7280',
    backgroundColor: 'transparent',
    border: 'none',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    borderRadius: '6px',
  },
  list: {
    listStyle: 'none',
    padding: 0,
    margin: 0,
  },
  listItem: {
    padding: '12px',
    backgroundColor: '#f9fafb',
    borderRadius: '8px',
    marginBottom: '8px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap' as const,
    gap: '8px',
  },
  itemDetails: {
    flex: 1,
    minWidth: '200px',
  },
  email: {
    fontSize: '14px',
    fontWeight: 500,
    color: '#1f2937',
    marginBottom: '4px',
  },
  noEmail: {
    fontStyle: 'italic',
    color: '#9ca3af',
  },
  date: {
    fontSize: '13px',
    color: '#6b7280',
  },
  statusBadge: {
    fontSize: '12px',
    fontWeight: 500,
    padding: '4px 10px',
    borderRadius: '9999px',
    textTransform: 'capitalize' as const,
  },
  statusAccepted: {
    backgroundColor: '#d1fae5',
    color: '#065f46',
  },
  statusExpired: {
    backgroundColor: '#f3f4f6',
    color: '#6b7280',
  },
  statusRevoked: {
    backgroundColor: '#fee2e2',
    color: '#991b1b',
  },
  statusPending: {
    backgroundColor: '#fef3c7',
    color: '#92400e',
  },
  empty: {
    fontSize: '14px',
    color: '#6b7280',
    textAlign: 'center' as const,
    padding: '16px',
  },
  loading: {
    fontSize: '14px',
    color: '#6b7280',
    textAlign: 'center' as const,
    padding: '16px',
  },
  error: {
    fontSize: '14px',
    color: '#dc2626',
    backgroundColor: '#fee2e2',
    padding: '12px',
    borderRadius: '8px',
    textAlign: 'center' as const,
  },
}

/**
 * Get status badge style based on invitation status.
 */
function getStatusStyle(status: Invitation['status']): React.CSSProperties {
  switch (status) {
    case 'accepted':
      return { ...styles.statusBadge, ...styles.statusAccepted }
    case 'expired':
      return { ...styles.statusBadge, ...styles.statusExpired }
    case 'revoked':
      return { ...styles.statusBadge, ...styles.statusRevoked }
    case 'pending':
      return { ...styles.statusBadge, ...styles.statusPending }
    default:
      return styles.statusBadge
  }
}

/**
 * Format date for display.
 */
function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

/**
 * InvitationHistoryList - Shows past invitations with status badges.
 */
export default function InvitationHistoryList({
  familyId,
  refreshTrigger,
}: InvitationHistoryListProps) {
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expanded, setExpanded] = useState(false)

  // Load invitations
  useEffect(() => {
    if (!familyId) {
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    getInvitationsByFamily(familyId)
      .then((data) => {
        setInvitations(data)
      })
      .catch((err) => {
        console.error('Error loading invitation history:', err)
        setError('Failed to load invitation history.')
      })
      .finally(() => {
        setLoading(false)
      })
  }, [familyId, refreshTrigger])

  // Don't render if no family ID
  if (!familyId) {
    return null
  }

  // Filter out pending invitations for history (they show in InvitationStatusCard)
  const historyInvitations = invitations.filter((inv) => inv.status !== 'pending')

  // No history to show
  if (!loading && !error && historyInvitations.length === 0) {
    return null
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h3 style={styles.title}>Invitation History</h3>
        {historyInvitations.length > 0 && (
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            style={styles.toggleButton}
            aria-expanded={expanded}
            aria-controls="invitation-history-list"
          >
            {expanded ? 'Hide' : 'Show'} ({historyInvitations.length})
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
              style={{
                transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 0.2s',
              }}
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>
        )}
      </div>

      {loading && <p style={styles.loading}>Loading history...</p>}

      {error && (
        <div style={styles.error} role="alert">
          {error}
        </div>
      )}

      {!loading && !error && expanded && (
        <ul id="invitation-history-list" style={styles.list} aria-label="Invitation history">
          {historyInvitations.map((invitation) => (
            <li key={invitation.id} style={styles.listItem}>
              <div style={styles.itemDetails}>
                <p
                  style={{ ...styles.email, ...(invitation.recipientEmail ? {} : styles.noEmail) }}
                >
                  {invitation.recipientEmail || 'Link shared (no email)'}
                </p>
                <p style={styles.date}>
                  {formatDate(invitation.createdAt)}
                  {invitation.status === 'accepted' && invitation.acceptedAt && (
                    <> · Accepted {formatDate(invitation.acceptedAt)}</>
                  )}
                </p>
              </div>
              <span
                style={getStatusStyle(invitation.status)}
                role="status"
                aria-label={`Invitation status: ${invitation.status}`}
              >
                {invitation.status}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
