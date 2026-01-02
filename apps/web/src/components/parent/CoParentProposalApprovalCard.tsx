/**
 * CoParentProposalApprovalCard Component - Story 3A.3 Task 4
 *
 * UI for co-parent to review and respond to agreement change proposals.
 * AC3: Pending changes visibility
 * AC4: Approve, decline, or propose modifications
 *
 * CRITICAL:
 * - 44px minimum touch targets (NFR49)
 * - Keyboard accessible (NFR43)
 * - Clear status indicators
 */

import { memo, useState, useCallback } from 'react'
import type { AgreementProposal } from '@fledgely/shared'
import {
  approveAsCoParent,
  declineAsCoParent,
  CO_PARENT_APPROVAL_MESSAGES,
} from '../../services/coParentProposalApprovalService'

// =============================================================================
// Types
// =============================================================================

export interface CoParentProposalApprovalCardProps {
  /** The proposal awaiting co-parent approval */
  proposal: AgreementProposal
  /** Current user's UID */
  currentUserUid: string
  /** Current user's display name */
  currentUserName: string
  /** Callback when proposal is approved */
  onApproved?: () => void
  /** Callback when proposal is declined */
  onDeclined?: () => void
  /** Callback to navigate to modification flow */
  onModify?: (proposal: AgreementProposal) => void
}

// =============================================================================
// Styles
// =============================================================================

const styles: Record<string, React.CSSProperties> = {
  container: {
    backgroundColor: '#fef3c7', // amber-100
    borderRadius: '12px',
    border: '2px solid #f59e0b', // amber-500
    padding: '20px',
    marginBottom: '16px',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '16px',
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  icon: {
    fontSize: '24px',
  },
  title: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#92400e', // amber-800
    margin: 0,
  },
  badge: {
    backgroundColor: '#f59e0b',
    color: '#ffffff',
    fontSize: '12px',
    fontWeight: 600,
    padding: '4px 8px',
    borderRadius: '12px',
  },
  proposerInfo: {
    fontSize: '14px',
    color: '#78350f', // amber-900
    marginBottom: '12px',
  },
  changesSection: {
    backgroundColor: '#ffffff',
    borderRadius: '8px',
    padding: '16px',
    marginBottom: '16px',
  },
  changesTitle: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#374151',
    marginBottom: '12px',
  },
  changeItem: {
    display: 'flex',
    flexDirection: 'column' as const,
    padding: '8px 0',
    borderBottom: '1px solid #e5e7eb',
  },
  changeLabel: {
    fontSize: '13px',
    fontWeight: 500,
    color: '#6b7280',
  },
  changeValues: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginTop: '4px',
  },
  oldValue: {
    fontSize: '14px',
    color: '#ef4444', // red
    textDecoration: 'line-through',
  },
  arrow: {
    color: '#9ca3af',
  },
  newValue: {
    fontSize: '14px',
    color: '#22c55e', // green
    fontWeight: 500,
  },
  reason: {
    fontSize: '14px',
    color: '#374151',
    fontStyle: 'italic',
    marginBottom: '16px',
    padding: '12px',
    backgroundColor: '#f9fafb',
    borderRadius: '8px',
  },
  expirationWarning: {
    fontSize: '13px',
    color: '#b45309', // amber-700
    marginBottom: '16px',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  actions: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '12px',
  },
  buttonRow: {
    display: 'flex',
    gap: '12px',
  },
  approveButton: {
    flex: 1,
    minHeight: '44px', // NFR49
    padding: '12px 24px',
    backgroundColor: '#22c55e', // green-500
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
  },
  declineButton: {
    flex: 1,
    minHeight: '44px', // NFR49
    padding: '12px 24px',
    backgroundColor: '#ef4444', // red-500
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
  },
  modifyButton: {
    minHeight: '44px', // NFR49
    padding: '12px 24px',
    backgroundColor: 'transparent',
    color: '#f59e0b', // amber-500
    border: '2px solid #f59e0b',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
    width: '100%',
  },
  declineReasonInput: {
    width: '100%',
    minHeight: '44px', // NFR49
    padding: '12px',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    fontSize: '14px',
    marginBottom: '12px',
  },
  disabledButton: {
    opacity: 0.5,
    cursor: 'not-allowed',
  },
  loadingText: {
    fontSize: '14px',
    color: '#6b7280',
    textAlign: 'center' as const,
    padding: '20px',
  },
  errorText: {
    fontSize: '14px',
    color: '#ef4444',
    marginTop: '8px',
  },
}

// =============================================================================
// Helper Functions
// =============================================================================

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return '(none)'
  if (typeof value === 'number') return String(value)
  if (typeof value === 'string') return value
  if (Array.isArray(value)) return value.join(', ')
  return JSON.stringify(value)
}

function calculateDaysRemaining(expiresAt: number | null): number | null {
  if (!expiresAt) return null
  const remaining = expiresAt - Date.now()
  if (remaining <= 0) return 0
  return Math.ceil(remaining / (24 * 60 * 60 * 1000))
}

// =============================================================================
// Component
// =============================================================================

export const CoParentProposalApprovalCard = memo(function CoParentProposalApprovalCard({
  proposal,
  currentUserUid,
  currentUserName,
  onApproved,
  onDeclined,
  onModify,
}: CoParentProposalApprovalCardProps) {
  const [isApproving, setIsApproving] = useState(false)
  const [isDeclining, setIsDeclining] = useState(false)
  const [showDeclineReason, setShowDeclineReason] = useState(false)
  const [declineReason, setDeclineReason] = useState('')
  const [error, setError] = useState<string | null>(null)

  const daysRemaining = calculateDaysRemaining(proposal.expiresAt)
  const isExpired = daysRemaining === 0

  const handleApprove = useCallback(async () => {
    setError(null)
    setIsApproving(true)
    try {
      await approveAsCoParent({
        proposalId: proposal.id,
        approverUid: currentUserUid,
        approverName: currentUserName,
      })
      onApproved?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to approve proposal')
    } finally {
      setIsApproving(false)
    }
  }, [proposal.id, currentUserUid, currentUserName, onApproved])

  const handleDecline = useCallback(async () => {
    if (!showDeclineReason) {
      setShowDeclineReason(true)
      return
    }

    setError(null)
    setIsDeclining(true)
    try {
      await declineAsCoParent({
        proposalId: proposal.id,
        declinerUid: currentUserUid,
        declinerName: currentUserName,
        reason: declineReason || null,
      })
      onDeclined?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to decline proposal')
    } finally {
      setIsDeclining(false)
    }
  }, [proposal.id, currentUserUid, currentUserName, declineReason, showDeclineReason, onDeclined])

  const handleModify = useCallback(() => {
    onModify?.(proposal)
  }, [proposal, onModify])

  const handleKeyDown = (e: React.KeyboardEvent, action: () => void) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      action()
    }
  }

  // Don't show if expired
  if (isExpired) {
    return (
      <div data-testid="coparent-approval-card-expired" style={styles.container}>
        <div style={styles.header}>
          <div style={styles.headerLeft}>
            <span style={styles.icon}>⏰</span>
            <h3 style={styles.title}>Proposal Expired</h3>
          </div>
        </div>
        <p style={styles.proposerInfo}>{CO_PARENT_APPROVAL_MESSAGES.expired}</p>
      </div>
    )
  }

  return (
    <div
      data-testid="coparent-approval-card"
      style={styles.container}
      role="region"
      aria-label="Agreement proposal requiring your approval"
    >
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <span style={styles.icon}>📋</span>
          <h3 style={styles.title}>Agreement Change Proposal</h3>
        </div>
        <span style={styles.badge} data-testid="approval-badge">
          Needs Your Approval
        </span>
      </div>

      {/* Proposer info */}
      <p data-testid="proposer-info" style={styles.proposerInfo}>
        {proposal.proposerName} proposed the following changes:
      </p>

      {/* Changes list */}
      <div style={styles.changesSection}>
        <h4 style={styles.changesTitle}>Proposed Changes</h4>
        {proposal.changes.length === 0 ? (
          <p style={{ color: '#9ca3af', fontSize: '14px' }}>No specific changes listed</p>
        ) : (
          proposal.changes.map((change, index) => (
            <div
              key={`${change.sectionId}-${change.fieldPath}-${index}`}
              style={styles.changeItem}
              data-testid={`change-item-${index}`}
            >
              <span style={styles.changeLabel}>
                {change.sectionName}: {change.fieldPath}
              </span>
              <div style={styles.changeValues}>
                <span style={styles.oldValue}>{formatValue(change.oldValue)}</span>
                <span style={styles.arrow}>→</span>
                <span style={styles.newValue}>{formatValue(change.newValue)}</span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Reason if provided */}
      {proposal.reason && (
        <div data-testid="proposal-reason" style={styles.reason}>
          <strong>Reason:</strong> {proposal.reason}
        </div>
      )}

      {/* Expiration warning */}
      {daysRemaining !== null && daysRemaining <= 3 && (
        <div data-testid="expiration-warning" style={styles.expirationWarning}>
          ⚠️ {daysRemaining === 1 ? '1 day' : `${daysRemaining} days`} remaining to respond
        </div>
      )}

      {/* Decline reason input */}
      {showDeclineReason && (
        <input
          type="text"
          placeholder="Optional: Reason for declining (e.g., 'Let's discuss this first')"
          value={declineReason}
          onChange={(e) => setDeclineReason(e.target.value)}
          style={styles.declineReasonInput}
          data-testid="decline-reason-input"
          aria-label="Reason for declining"
        />
      )}

      {/* Action buttons */}
      <div style={styles.actions}>
        <div style={styles.buttonRow}>
          <button
            type="button"
            style={{
              ...styles.approveButton,
              ...(isApproving ? styles.disabledButton : {}),
            }}
            onClick={handleApprove}
            onKeyDown={(e) => handleKeyDown(e, handleApprove)}
            disabled={isApproving || isDeclining}
            data-testid="approve-button"
            aria-label="Approve this proposal"
          >
            {isApproving ? 'Approving...' : '✓ Approve'}
          </button>
          <button
            type="button"
            style={{
              ...styles.declineButton,
              ...(isDeclining ? styles.disabledButton : {}),
            }}
            onClick={handleDecline}
            onKeyDown={(e) => handleKeyDown(e, handleDecline)}
            disabled={isApproving || isDeclining}
            data-testid="decline-button"
            aria-label="Decline this proposal"
          >
            {isDeclining ? 'Declining...' : '✗ Decline'}
          </button>
        </div>
        {onModify && (
          <button
            type="button"
            style={styles.modifyButton}
            onClick={handleModify}
            onKeyDown={(e) => handleKeyDown(e, handleModify)}
            disabled={isApproving || isDeclining}
            data-testid="modify-button"
            aria-label="Propose modifications to this proposal"
          >
            Suggest Modifications
          </button>
        )}
      </div>

      {/* Error message */}
      {error && (
        <p data-testid="error-message" style={styles.errorText} role="alert">
          {error}
        </p>
      )}
    </div>
  )
})
