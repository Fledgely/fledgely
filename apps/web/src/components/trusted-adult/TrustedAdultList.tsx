'use client'

/**
 * TrustedAdultList - Story 52.4 Task 4.2
 *
 * Component showing pending and active trusted adults.
 *
 * AC5: Maximum 2 Trusted Adults
 *   - Shows list of all trusted adults with name, email, status
 *   - Shows pending invitations separately
 *   - Shows count: "2 of 2 trusted adults"
 *
 * AC4: View-Only Access
 *   - Shows status badges (Pending, Awaiting Teen Approval, Active)
 */

import { TrustedAdultStatus } from '@fledgely/shared'

interface TrustedAdultData {
  id: string
  name: string
  email: string
  status: string
  invitedAt: Date
  expiresAt?: Date
  acceptedAt?: Date
  approvedByTeenAt?: Date
}

interface TrustedAdultCounts {
  active: number
  pendingInvitation: number
  pendingTeenApproval: number
  total: number
  maxAllowed: number
  canAddMore: boolean
}

interface TrustedAdultListProps {
  trustedAdults: TrustedAdultData[]
  counts: TrustedAdultCounts
  onRevoke?: (trustedAdultId: string) => void
  onResend?: (trustedAdultId: string) => void
  loading?: boolean
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    width: '100%',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    marginBottom: '16px',
  },
  title: {
    fontSize: '1rem',
    fontWeight: 600,
    color: '#374151',
    margin: 0,
  },
  countBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '4px 10px',
    backgroundColor: '#ede9fe',
    color: '#7c3aed',
    borderRadius: '12px',
    fontSize: '13px',
    fontWeight: 500,
  },
  list: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '12px',
  },
  card: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px',
    backgroundColor: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: '12px',
    gap: '16px',
  },
  cardInfo: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '4px',
    flex: 1,
  },
  cardName: {
    fontSize: '16px',
    fontWeight: 500,
    color: '#1f2937',
    margin: 0,
  },
  cardEmail: {
    fontSize: '14px',
    color: '#6b7280',
    margin: 0,
  },
  cardMeta: {
    fontSize: '12px',
    color: '#9ca3af',
    margin: '4px 0 0 0',
  },
  statusBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '6px 12px',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: 500,
  },
  statusActive: {
    backgroundColor: '#dcfce7',
    color: '#166534',
  },
  statusPending: {
    backgroundColor: '#fef08a',
    color: '#a16207',
  },
  statusTeenApproval: {
    backgroundColor: '#dbeafe',
    color: '#1e40af',
  },
  statusExpired: {
    backgroundColor: '#f3f4f6',
    color: '#6b7280',
  },
  statusRevoked: {
    backgroundColor: '#fee2e2',
    color: '#991b1b',
  },
  cardActions: {
    display: 'flex',
    gap: '8px',
    alignItems: 'center',
    flexShrink: 0,
  },
  actionButton: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '36px',
    padding: '8px 12px',
    backgroundColor: '#ffffff',
    color: '#374151',
    fontSize: '13px',
    fontWeight: 500,
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  revokeButton: {
    borderColor: '#fca5a5',
    color: '#dc2626',
    backgroundColor: '#fef2f2',
  },
  emptyState: {
    padding: '32px',
    backgroundColor: '#f9fafb',
    borderRadius: '12px',
    textAlign: 'center' as const,
  },
  emptyText: {
    color: '#6b7280',
    fontSize: '14px',
    margin: 0,
    lineHeight: 1.5,
  },
  loading: {
    padding: '32px',
    textAlign: 'center' as const,
    color: '#6b7280',
  },
  viewOnlyBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    padding: '4px 8px',
    backgroundColor: '#f3f4f6',
    color: '#6b7280',
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: 500,
    marginTop: '8px',
    width: 'fit-content',
  },
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date)
}

function getStatusLabel(status: string): string {
  switch (status) {
    case TrustedAdultStatus.ACTIVE:
      return 'Active'
    case TrustedAdultStatus.PENDING_INVITATION:
      return 'Pending'
    case TrustedAdultStatus.PENDING_TEEN_APPROVAL:
      return 'Awaiting Approval'
    case TrustedAdultStatus.EXPIRED:
      return 'Expired'
    case TrustedAdultStatus.REVOKED:
      return 'Revoked'
    default:
      return 'Unknown'
  }
}

function getStatusStyle(status: string): React.CSSProperties {
  switch (status) {
    case TrustedAdultStatus.ACTIVE:
      return styles.statusActive
    case TrustedAdultStatus.PENDING_INVITATION:
      return styles.statusPending
    case TrustedAdultStatus.PENDING_TEEN_APPROVAL:
      return styles.statusTeenApproval
    case TrustedAdultStatus.EXPIRED:
      return styles.statusExpired
    case TrustedAdultStatus.REVOKED:
      return styles.statusRevoked
    default:
      return {}
  }
}

export default function TrustedAdultList({
  trustedAdults,
  counts,
  onRevoke,
  onResend,
  loading = false,
}: TrustedAdultListProps) {
  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loading}>Loading trusted adults...</div>
      </div>
    )
  }

  // Filter to show only relevant trusted adults
  const activeTrustedAdults = trustedAdults.filter(
    (ta) =>
      ta.status === TrustedAdultStatus.ACTIVE ||
      ta.status === TrustedAdultStatus.PENDING_INVITATION ||
      ta.status === TrustedAdultStatus.PENDING_TEEN_APPROVAL
  )

  return (
    <div style={styles.container} data-testid="trusted-adult-list">
      <div style={styles.header}>
        <h3 style={styles.title}>Trusted Adults</h3>
        <span style={styles.countBadge} data-testid="trusted-adult-count">
          {counts.total} of {counts.maxAllowed}
        </span>
      </div>

      {activeTrustedAdults.length === 0 ? (
        <div style={styles.emptyState} data-testid="no-trusted-adults">
          <p style={styles.emptyText}>
            No trusted adults yet. You can add up to {counts.maxAllowed} trusted adults who will
            have view-only access to your child&apos;s activity.
          </p>
        </div>
      ) : (
        <div style={styles.list}>
          {activeTrustedAdults.map((ta) => (
            <div key={ta.id} style={styles.card} data-testid={`trusted-adult-${ta.id}`}>
              <div style={styles.cardInfo}>
                <p style={styles.cardName}>{ta.name}</p>
                <p style={styles.cardEmail}>{ta.email}</p>
                <span style={styles.viewOnlyBadge}>
                  <span aria-hidden="true">&#x1F441;</span>
                  View-only access
                </span>
                <p style={styles.cardMeta}>
                  {ta.status === TrustedAdultStatus.ACTIVE && ta.approvedByTeenAt
                    ? `Approved ${formatDate(ta.approvedByTeenAt)}`
                    : ta.status === TrustedAdultStatus.ACTIVE && ta.acceptedAt
                      ? `Active since ${formatDate(ta.acceptedAt)}`
                      : ta.status === TrustedAdultStatus.PENDING_INVITATION
                        ? `Invited ${formatDate(ta.invitedAt)} • Expires ${ta.expiresAt ? formatDate(ta.expiresAt) : 'N/A'}`
                        : ta.status === TrustedAdultStatus.PENDING_TEEN_APPROVAL
                          ? 'Waiting for teen approval'
                          : `Invited ${formatDate(ta.invitedAt)}`}
                </p>
              </div>

              <div style={styles.cardActions}>
                <span
                  style={{
                    ...styles.statusBadge,
                    ...getStatusStyle(ta.status),
                  }}
                  data-testid={`status-${ta.id}`}
                >
                  {getStatusLabel(ta.status)}
                </span>

                {ta.status === TrustedAdultStatus.PENDING_INVITATION && onResend && (
                  <button
                    type="button"
                    style={styles.actionButton}
                    onClick={() => onResend(ta.id)}
                    data-testid={`resend-${ta.id}`}
                  >
                    Resend
                  </button>
                )}

                {(ta.status === TrustedAdultStatus.ACTIVE ||
                  ta.status === TrustedAdultStatus.PENDING_INVITATION ||
                  ta.status === TrustedAdultStatus.PENDING_TEEN_APPROVAL) &&
                  onRevoke && (
                    <button
                      type="button"
                      style={{ ...styles.actionButton, ...styles.revokeButton }}
                      onClick={() => onRevoke(ta.id)}
                      data-testid={`revoke-${ta.id}`}
                    >
                      Remove
                    </button>
                  )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
