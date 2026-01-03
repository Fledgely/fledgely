'use client'

/**
 * TemporaryAccessList - Story 39.3
 *
 * Component for viewing and managing temporary access grants.
 *
 * Acceptance Criteria:
 * - AC5: Early revocation with immediate effect
 * - AC6: All temporary access logged
 *
 * UI/UX Requirements:
 * - List of all grants (active, pending, expired, revoked)
 * - Each item shows: caregiver name, start/end times, status, duration
 * - "Revoke" button for active/pending grants
 * - Revocation confirmation modal with optional reason
 * - Filter by status
 * - Empty state messaging
 * - 44px minimum touch targets (NFR49)
 *
 * Uses React.CSSProperties inline styles per project pattern.
 */

import { useState, useCallback, useMemo } from 'react'
import { httpsCallable, getFunctions } from 'firebase/functions'
import {
  type TemporaryAccessGrant,
  type TemporaryAccessStatus,
  getTemporaryAccessTimeRemaining,
  formatTemporaryAccessDuration,
} from '@fledgely/shared/contracts'

interface TemporaryAccessListProps {
  /** Family ID */
  familyId: string
  /** List of temporary access grants */
  grants: TemporaryAccessGrant[]
  /** Map of caregiver UIDs to display names */
  caregiverNames: Record<string, string>
  /** Callback when grant is revoked */
  onRevoke?: (grantId: string) => void
  /** Callback when data should be refreshed */
  onRefresh?: () => void
}

type StatusFilter = 'all' | 'active' | 'pending' | 'expired' | 'revoked'

const styles: Record<string, React.CSSProperties> = {
  container: {
    width: '100%',
    fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '16px',
    flexWrap: 'wrap' as const,
    gap: '12px',
  },
  title: {
    fontSize: '1.125rem',
    fontWeight: 600,
    color: '#1f2937',
    margin: 0,
  },
  filterButtons: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap' as const,
  },
  filterButton: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '36px',
    padding: '6px 12px',
    fontSize: '13px',
    fontWeight: 500,
    backgroundColor: '#f3f4f6',
    color: '#6b7280',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  filterButtonActive: {
    backgroundColor: '#ede9fe',
    color: '#7c3aed',
  },
  list: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '12px',
  },
  card: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    padding: '16px',
    backgroundColor: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: '12px',
    gap: '16px',
  },
  cardInfo: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '8px',
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flexWrap: 'wrap' as const,
  },
  caregiverName: {
    fontSize: '16px',
    fontWeight: 500,
    color: '#1f2937',
    margin: 0,
  },
  statusBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: 500,
  },
  statusActive: {
    backgroundColor: '#dcfce7',
    color: '#166534',
  },
  statusPending: {
    backgroundColor: '#fef9c3',
    color: '#a16207',
  },
  statusExpired: {
    backgroundColor: '#f3f4f6',
    color: '#6b7280',
  },
  statusRevoked: {
    backgroundColor: '#fee2e2',
    color: '#dc2626',
  },
  times: {
    fontSize: '14px',
    color: '#6b7280',
    margin: 0,
  },
  duration: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '13px',
    color: '#059669',
    fontWeight: 500,
  },
  revokeButton: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '44px',
    padding: '10px 16px',
    backgroundColor: '#fef2f2',
    color: '#dc2626',
    fontSize: '14px',
    fontWeight: 500,
    border: '1px solid #fecaca',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  revokeButtonDisabled: {
    backgroundColor: '#f3f4f6',
    color: '#9ca3af',
    borderColor: '#e5e7eb',
    cursor: 'not-allowed',
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
  },
  // Modal styles
  modal: {
    position: 'fixed' as const,
    inset: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 1000,
    padding: '24px',
  },
  modalContent: {
    width: '100%',
    maxWidth: '400px',
    padding: '24px',
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    boxShadow: '0 10px 25px rgba(0, 0, 0, 0.15)',
  },
  modalTitle: {
    fontSize: '1.125rem',
    fontWeight: 600,
    color: '#1f2937',
    margin: 0,
    marginBottom: '16px',
  },
  modalText: {
    fontSize: '14px',
    color: '#6b7280',
    marginBottom: '16px',
  },
  reasonInput: {
    width: '100%',
    minHeight: '80px',
    padding: '12px',
    fontSize: '14px',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    marginBottom: '16px',
    resize: 'vertical' as const,
    boxSizing: 'border-box' as const,
  },
  modalActions: {
    display: 'flex',
    gap: '12px',
  },
  cancelButton: {
    flex: 1,
    minHeight: '44px',
    padding: '10px 16px',
    backgroundColor: '#f3f4f6',
    color: '#374151',
    fontSize: '14px',
    fontWeight: 500,
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
  },
  confirmRevokeButton: {
    flex: 1,
    minHeight: '44px',
    padding: '10px 16px',
    backgroundColor: '#dc2626',
    color: '#ffffff',
    fontSize: '14px',
    fontWeight: 600,
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
  },
}

/** Format date/time for display */
function formatDateTime(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(date)
}

/** Get status badge styles */
function getStatusStyles(status: TemporaryAccessStatus): React.CSSProperties {
  switch (status) {
    case 'active':
      return { ...styles.statusBadge, ...styles.statusActive }
    case 'pending':
      return { ...styles.statusBadge, ...styles.statusPending }
    case 'expired':
      return { ...styles.statusBadge, ...styles.statusExpired }
    case 'revoked':
      return { ...styles.statusBadge, ...styles.statusRevoked }
    default:
      return styles.statusBadge
  }
}

/** Get status label */
function getStatusLabel(status: TemporaryAccessStatus): string {
  switch (status) {
    case 'active':
      return 'Active'
    case 'pending':
      return 'Pending'
    case 'expired':
      return 'Expired'
    case 'revoked':
      return 'Revoked'
    default:
      return status
  }
}

/**
 * TemporaryAccessList - List of temporary access grants
 *
 * Story 39.3: AC5, AC6 - Revocation and logging
 */
export function TemporaryAccessList({
  familyId,
  grants,
  caregiverNames,
  onRevoke,
  onRefresh,
}: TemporaryAccessListProps) {
  const [filter, setFilter] = useState<StatusFilter>('all')
  const [revokingGrantId, setRevokingGrantId] = useState<string | null>(null)
  const [revokeReason, setRevokeReason] = useState('')
  const [isRevoking, setIsRevoking] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Filter grants based on selected status
  const filteredGrants = useMemo(() => {
    if (filter === 'all') return grants
    return grants.filter((grant) => grant.status === filter)
  }, [grants, filter])

  // Sort grants: active first, then pending, then by date
  const sortedGrants = useMemo(() => {
    return [...filteredGrants].sort((a, b) => {
      const statusOrder = { active: 0, pending: 1, expired: 2, revoked: 3 }
      const aOrder = statusOrder[a.status] ?? 4
      const bOrder = statusOrder[b.status] ?? 4
      if (aOrder !== bOrder) return aOrder - bOrder
      return b.createdAt.getTime() - a.createdAt.getTime()
    })
  }, [filteredGrants])

  const handleFilterChange = useCallback((newFilter: StatusFilter) => {
    setFilter(newFilter)
  }, [])

  const handleRevokeClick = useCallback((grantId: string) => {
    setRevokingGrantId(grantId)
    setRevokeReason('')
    setError(null)
  }, [])

  const handleCancelRevoke = useCallback(() => {
    setRevokingGrantId(null)
    setRevokeReason('')
    setError(null)
  }, [])

  const handleConfirmRevoke = useCallback(async () => {
    if (!revokingGrantId) return

    setIsRevoking(true)
    setError(null)

    try {
      const functions = getFunctions()
      const revokeTemporaryAccess = httpsCallable<
        { familyId: string; grantId: string; reason?: string },
        { success: boolean }
      >(functions, 'revokeTemporaryAccess')

      await revokeTemporaryAccess({
        familyId,
        grantId: revokingGrantId,
        reason: revokeReason.trim() || undefined,
      })

      onRevoke?.(revokingGrantId)
      onRefresh?.()
      setRevokingGrantId(null)
      setRevokeReason('')
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to revoke access'
      setError(errorMessage)
    } finally {
      setIsRevoking(false)
    }
  }, [revokingGrantId, familyId, revokeReason, onRevoke, onRefresh])

  const canRevoke = (grant: TemporaryAccessGrant): boolean => {
    return grant.status === 'active' || grant.status === 'pending'
  }

  const filters: Array<{ value: StatusFilter; label: string }> = [
    { value: 'all', label: 'All' },
    { value: 'active', label: 'Active' },
    { value: 'pending', label: 'Pending' },
    { value: 'expired', label: 'Expired' },
    { value: 'revoked', label: 'Revoked' },
  ]

  return (
    <div style={styles.container} data-testid="temporary-access-list">
      {/* Header with filters */}
      <div style={styles.header}>
        <h3 style={styles.title}>Temporary Access</h3>
        <div style={styles.filterButtons}>
          {filters.map((f) => (
            <button
              key={f.value}
              type="button"
              style={{
                ...styles.filterButton,
                ...(filter === f.value ? styles.filterButtonActive : {}),
              }}
              onClick={() => handleFilterChange(f.value)}
              data-testid={`filter-${f.value}`}
              aria-pressed={filter === f.value}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Grant List */}
      {sortedGrants.length === 0 ? (
        <div style={styles.emptyState} data-testid="empty-state">
          <p style={styles.emptyText}>
            {filter === 'all' ? 'No temporary access grants yet.' : `No ${filter} grants.`}
          </p>
        </div>
      ) : (
        <div style={styles.list} data-testid="grant-list">
          {sortedGrants.map((grant) => {
            const timeRemaining = getTemporaryAccessTimeRemaining(grant)
            const caregiverName = caregiverNames[grant.caregiverUid] || 'Unknown'

            return (
              <div key={grant.id} style={styles.card} data-testid={`grant-${grant.id}`}>
                <div style={styles.cardInfo}>
                  <div style={styles.cardHeader}>
                    <p style={styles.caregiverName}>{caregiverName}</p>
                    <span style={getStatusStyles(grant.status)} data-testid={`status-${grant.id}`}>
                      {getStatusLabel(grant.status)}
                    </span>
                  </div>
                  <p style={styles.times}>
                    {formatDateTime(grant.startAt)} — {formatDateTime(grant.endAt)}
                  </p>
                  {grant.status === 'active' && timeRemaining !== null && (
                    <span style={styles.duration} data-testid={`remaining-${grant.id}`}>
                      ⏱️ {formatTemporaryAccessDuration(new Date(), grant.endAt)} remaining
                    </span>
                  )}
                  {grant.status === 'revoked' && grant.revokedReason && (
                    <p style={styles.times}>Reason: {grant.revokedReason}</p>
                  )}
                </div>
                {canRevoke(grant) && (
                  <button
                    type="button"
                    style={styles.revokeButton}
                    onClick={() => handleRevokeClick(grant.id)}
                    data-testid={`revoke-${grant.id}`}
                  >
                    Revoke
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Revoke Confirmation Modal */}
      {revokingGrantId && (
        <div
          style={styles.modal}
          onClick={(e) => {
            if (e.target === e.currentTarget) handleCancelRevoke()
          }}
          data-testid="revoke-modal"
        >
          <div style={styles.modalContent}>
            <h3 style={styles.modalTitle}>Revoke Access</h3>
            <p style={styles.modalText}>
              Are you sure you want to revoke this temporary access? The caregiver will lose access
              immediately.
            </p>
            <textarea
              style={styles.reasonInput}
              placeholder="Reason for revocation (optional)"
              value={revokeReason}
              onChange={(e) => setRevokeReason(e.target.value)}
              maxLength={200}
              data-testid="revoke-reason-input"
            />
            {error && (
              <p
                style={{ ...styles.modalText, color: '#dc2626' }}
                role="alert"
                data-testid="revoke-error"
              >
                {error}
              </p>
            )}
            <div style={styles.modalActions}>
              <button
                type="button"
                style={styles.cancelButton}
                onClick={handleCancelRevoke}
                disabled={isRevoking}
                data-testid="cancel-revoke-button"
              >
                Cancel
              </button>
              <button
                type="button"
                style={styles.confirmRevokeButton}
                onClick={handleConfirmRevoke}
                disabled={isRevoking}
                data-testid="confirm-revoke-button"
              >
                {isRevoking ? 'Revoking...' : 'Revoke Access'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default TemporaryAccessList
