'use client'

/**
 * SafetySettingProposalCard Component
 *
 * Story 3A.2: Safety Settings Two-Parent Approval - AC2, AC3
 * Story 3A.4: Safety Rule 48-Hour Cooling Period - AC2, AC3
 * Displays a safety setting change for review and action.
 *
 * Features:
 * - Shows current vs proposed values with visual diff
 * - Approve/decline buttons with loading states
 * - Optional message field for decline reason
 * - Expiration countdown for pending proposals
 * - Cooling period countdown for protection reductions (Story 3A.4)
 * - Cancel button during cooling period (Story 3A.4)
 * - 44px minimum touch targets (NFR49)
 * - Keyboard accessible (NFR43)
 */

import { useState } from 'react'
import type { SafetySettingChange, SafetySettingType } from '@fledgely/shared/contracts'

const styles = {
  card: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    padding: '20px',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
    border: '1px solid #e5e7eb',
    marginBottom: '16px',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '16px',
  },
  title: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#1f2937',
    margin: 0,
  },
  badge: {
    display: 'inline-block',
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: 500,
  },
  pendingBadge: {
    backgroundColor: '#fef3c7',
    color: '#92400e',
  },
  emergencyBadge: {
    backgroundColor: '#fee2e2',
    color: '#991b1b',
  },
  coolingBadge: {
    backgroundColor: '#dbeafe',
    color: '#1e40af',
  },
  activatedBadge: {
    backgroundColor: '#d1fae5',
    color: '#047857',
  },
  cancelledBadge: {
    backgroundColor: '#f3f4f6',
    color: '#6b7280',
  },
  diffContainer: {
    backgroundColor: '#f9fafb',
    borderRadius: '8px',
    padding: '16px',
    marginBottom: '16px',
  },
  diffRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px',
  },
  diffLabel: {
    fontSize: '14px',
    color: '#6b7280',
    fontWeight: 500,
  },
  diffValue: {
    fontSize: '14px',
    padding: '4px 8px',
    borderRadius: '4px',
  },
  currentValue: {
    backgroundColor: '#fef2f2',
    color: '#991b1b',
    textDecoration: 'line-through',
  },
  proposedValue: {
    backgroundColor: '#d1fae5',
    color: '#047857',
    fontWeight: 600,
  },
  expirationText: {
    fontSize: '13px',
    color: '#6b7280',
    marginBottom: '16px',
  },
  proposedBy: {
    fontSize: '13px',
    color: '#6b7280',
    marginBottom: '16px',
  },
  buttonGroup: {
    display: 'flex',
    gap: '12px',
    marginBottom: '12px',
  },
  approveButton: {
    minHeight: '44px',
    padding: '12px 24px',
    backgroundColor: '#059669',
    color: '#ffffff',
    fontSize: '14px',
    fontWeight: 500,
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    flex: 1,
  },
  declineButton: {
    minHeight: '44px',
    padding: '12px 24px',
    backgroundColor: '#ffffff',
    color: '#dc2626',
    fontSize: '14px',
    fontWeight: 500,
    border: '1px solid #dc2626',
    borderRadius: '8px',
    cursor: 'pointer',
    flex: 1,
  },
  disabledButton: {
    opacity: 0.7,
    cursor: 'not-allowed',
  },
  declineReasonContainer: {
    marginTop: '12px',
  },
  declineReasonLabel: {
    fontSize: '13px',
    color: '#374151',
    marginBottom: '4px',
    display: 'block',
  },
  declineReasonInput: {
    width: '100%',
    minHeight: '44px',
    padding: '12px',
    fontSize: '14px',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    resize: 'vertical' as const,
  },
  errorMessage: {
    backgroundColor: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: '8px',
    padding: '12px',
    color: '#dc2626',
    fontSize: '14px',
    marginTop: '12px',
  },
  viewOnlyMessage: {
    backgroundColor: '#f0fdf4',
    border: '1px solid #bbf7d0',
    borderRadius: '8px',
    padding: '12px',
    color: '#047857',
    fontSize: '14px',
  },
  cancelButton: {
    minHeight: '44px',
    padding: '12px 24px',
    backgroundColor: '#ffffff',
    color: '#f59e0b',
    fontSize: '14px',
    fontWeight: 500,
    border: '1px solid #f59e0b',
    borderRadius: '8px',
    cursor: 'pointer',
    width: '100%',
  },
  coolingPeriodInfo: {
    backgroundColor: '#eff6ff',
    border: '1px solid #bfdbfe',
    borderRadius: '8px',
    padding: '12px',
    marginBottom: '16px',
  },
  coolingPeriodText: {
    fontSize: '14px',
    color: '#1e40af',
    margin: 0,
  },
  countdownText: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#1e40af',
    marginTop: '8px',
  },
  resolvedMessage: {
    backgroundColor: '#f3f4f6',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    padding: '12px',
    color: '#374151',
    fontSize: '14px',
  },
}

/**
 * Format a safety setting type for display.
 */
function formatSettingType(type: SafetySettingType): string {
  const labels: Record<SafetySettingType, string> = {
    monitoring_interval: 'Monitoring Interval',
    retention_period: 'Data Retention Period',
    time_limits: 'Screen Time Limits',
    age_restrictions: 'Age Restrictions',
  }
  return labels[type] || type
}

/**
 * Format a setting value for display.
 */
function formatSettingValue(type: SafetySettingType, value: unknown): string {
  if (value === null || value === undefined) {
    return 'Not set'
  }

  if (typeof value === 'number') {
    switch (type) {
      case 'monitoring_interval':
        return `${value} minutes`
      case 'retention_period':
        return `${value} days`
      case 'time_limits':
        return `${value} minutes per day`
      case 'age_restrictions':
        return `${value}+ years`
      default:
        return String(value)
    }
  }

  if (typeof value === 'object') {
    return JSON.stringify(value)
  }

  return String(value)
}

/**
 * Calculate time remaining until expiration.
 */
function getTimeRemaining(expiresAt: Date): string {
  const now = new Date()
  const diff = expiresAt.getTime() - now.getTime()

  if (diff <= 0) {
    return 'Expired'
  }

  const hours = Math.floor(diff / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))

  if (hours > 24) {
    const days = Math.floor(hours / 24)
    return `${days} day${days !== 1 ? 's' : ''} remaining`
  }

  if (hours > 0) {
    return `${hours}h ${minutes}m remaining`
  }

  return `${minutes} minutes remaining`
}

export interface SafetySettingProposalCardProps {
  /** The safety setting change proposal */
  proposal: SafetySettingChange
  /** UID of the current user */
  currentUserUid: string
  /** Display name of the proposer (optional) */
  proposerName?: string
  /** Callback when proposal is approved */
  onApprove: () => Promise<void>
  /** Callback when proposal is declined */
  onDecline: (reason?: string) => Promise<void>
  /** Callback when change is cancelled during cooling period (Story 3A.4) */
  onCancel?: () => Promise<void>
}

export function SafetySettingProposalCard({
  proposal,
  currentUserUid,
  proposerName,
  onApprove,
  onDecline,
  onCancel,
}: SafetySettingProposalCardProps) {
  const [isApproving, setIsApproving] = useState(false)
  const [isDeclining, setIsDeclining] = useState(false)
  const [isCancelling, setIsCancelling] = useState(false)
  const [showDeclineReason, setShowDeclineReason] = useState(false)
  const [declineReason, setDeclineReason] = useState('')
  const [error, setError] = useState<string | null>(null)

  const isProposer = proposal.proposedByUid === currentUserUid
  const isExpired = new Date() > proposal.expiresAt
  const isInCoolingPeriod = proposal.status === 'cooling_period'

  const handleApprove = async () => {
    setError(null)
    setIsApproving(true)
    try {
      await onApprove()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to approve change')
    } finally {
      setIsApproving(false)
    }
  }

  const handleDecline = async () => {
    setError(null)
    setIsDeclining(true)
    try {
      await onDecline(declineReason || undefined)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to decline change')
    } finally {
      setIsDeclining(false)
    }
  }

  const handleDeclineClick = () => {
    if (showDeclineReason) {
      handleDecline()
    } else {
      setShowDeclineReason(true)
    }
  }

  const handleCancel = async () => {
    if (!onCancel) return
    setError(null)
    setIsCancelling(true)
    try {
      await onCancel()
      // Story 3A.4 AC2: Notification placeholder
      console.log('[Notification] Safety setting change cancelled by guardian:', currentUserUid)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to cancel change')
    } finally {
      setIsCancelling(false)
    }
  }

  /**
   * Get badge style based on proposal status.
   */
  const getBadgeStyle = () => {
    switch (proposal.status) {
      case 'cooling_period':
        return styles.coolingBadge
      case 'activated':
        return styles.activatedBadge
      case 'cancelled':
        return styles.cancelledBadge
      case 'pending_approval':
        return proposal.isEmergencyIncrease ? styles.emergencyBadge : styles.pendingBadge
      default:
        return styles.pendingBadge
    }
  }

  /**
   * Get badge text based on proposal status.
   */
  const getBadgeText = () => {
    switch (proposal.status) {
      case 'cooling_period':
        return '48-Hour Cooling Period'
      case 'activated':
        return 'Activated'
      case 'cancelled':
        return 'Cancelled'
      case 'declined':
        return 'Declined'
      case 'expired':
        return 'Expired'
      case 'pending_approval':
        return proposal.isEmergencyIncrease ? 'Emergency Increase' : 'Pending Approval'
      default:
        return proposal.status
    }
  }

  return (
    <div style={styles.card} role="article" aria-label="Safety setting change proposal">
      <style>
        {`
          .proposal-btn:focus {
            outline: 2px solid #4F46E5;
            outline-offset: 2px;
          }
          .proposal-btn:hover:not(:disabled) {
            filter: brightness(0.95);
          }
          .decline-input:focus {
            outline: none;
            border-color: #4F46E5;
            box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
          }
        `}
      </style>

      <div style={styles.header}>
        <h3 style={styles.title}>{formatSettingType(proposal.settingType)}</h3>
        <span
          style={{
            ...styles.badge,
            ...getBadgeStyle(),
          }}
        >
          {getBadgeText()}
        </span>
      </div>

      <div style={styles.diffContainer}>
        <div style={styles.diffRow}>
          <span style={styles.diffLabel}>Current:</span>
          <span style={{ ...styles.diffValue, ...styles.currentValue }}>
            {formatSettingValue(proposal.settingType, proposal.currentValue)}
          </span>
        </div>
        <div style={styles.diffRow}>
          <span style={styles.diffLabel}>Proposed:</span>
          <span style={{ ...styles.diffValue, ...styles.proposedValue }}>
            {formatSettingValue(proposal.settingType, proposal.proposedValue)}
          </span>
        </div>
      </div>

      <p style={styles.proposedBy}>
        Proposed by: {proposerName || 'Co-parent'} {isProposer && <span>(You)</span>}
      </p>

      {/* Story 3A.4: Cooling Period Info */}
      {isInCoolingPeriod && proposal.effectiveAt && (
        <div style={styles.coolingPeriodInfo}>
          <p style={styles.coolingPeriodText}>
            This safety change has been approved but is in a 48-hour cooling period to protect
            against impulsive decisions.
          </p>
          <p style={styles.countdownText}>{getTimeRemaining(proposal.effectiveAt)} until active</p>
        </div>
      )}

      {/* Expiration text for pending proposals */}
      {proposal.status === 'pending_approval' && (
        <p style={styles.expirationText}>
          {isExpired ? (
            <strong>This proposal has expired</strong>
          ) : (
            <>{getTimeRemaining(proposal.expiresAt)} to respond</>
          )}
        </p>
      )}

      {/* Resolved status messages */}
      {proposal.status === 'activated' && (
        <div style={styles.resolvedMessage}>
          This change has been activated and is now in effect.
        </div>
      )}

      {proposal.status === 'cancelled' && (
        <div style={styles.resolvedMessage}>
          This change was cancelled during the cooling period.
        </div>
      )}

      {proposal.status === 'declined' && (
        <div style={styles.resolvedMessage}>
          This change was declined.
          {proposal.declineReason && <> Reason: {proposal.declineReason}</>}
        </div>
      )}

      {proposal.status === 'approved' && !isInCoolingPeriod && (
        <div style={styles.viewOnlyMessage}>
          This change has been approved and is now in effect.
        </div>
      )}

      {/* Story 3A.4: Cancel button during cooling period */}
      {isInCoolingPeriod && onCancel && (
        <button
          type="button"
          onClick={handleCancel}
          disabled={isCancelling}
          style={{
            ...styles.cancelButton,
            ...(isCancelling ? styles.disabledButton : {}),
          }}
          className="proposal-btn"
          aria-busy={isCancelling}
        >
          {isCancelling ? 'Cancelling...' : 'Cancel Change'}
        </button>
      )}

      {/* Pending approval actions */}
      {proposal.status === 'pending_approval' && isProposer && !isExpired && (
        <div style={styles.viewOnlyMessage}>
          You proposed this change. Waiting for your co-parent to review.
        </div>
      )}

      {proposal.status === 'pending_approval' && isProposer && isExpired && (
        <div style={styles.errorMessage}>
          This proposal has expired and can no longer be acted upon.
        </div>
      )}

      {proposal.status === 'pending_approval' && !isProposer && isExpired && (
        <div style={styles.errorMessage}>
          This proposal has expired and can no longer be acted upon.
        </div>
      )}

      {proposal.status === 'pending_approval' && !isProposer && !isExpired && (
        <>
          <div style={styles.buttonGroup}>
            <button
              type="button"
              onClick={handleApprove}
              disabled={isApproving || isDeclining}
              style={{
                ...styles.approveButton,
                ...(isApproving || isDeclining ? styles.disabledButton : {}),
              }}
              className="proposal-btn"
              aria-busy={isApproving}
            >
              {isApproving ? 'Approving...' : 'Approve Change'}
            </button>
            <button
              type="button"
              onClick={handleDeclineClick}
              disabled={isApproving || isDeclining}
              style={{
                ...styles.declineButton,
                ...(isApproving || isDeclining ? styles.disabledButton : {}),
              }}
              className="proposal-btn"
              aria-busy={isDeclining}
            >
              {isDeclining ? 'Declining...' : showDeclineReason ? 'Confirm Decline' : 'Decline'}
            </button>
          </div>

          {showDeclineReason && (
            <div style={styles.declineReasonContainer}>
              <label htmlFor="decline-reason" style={styles.declineReasonLabel}>
                Reason for declining (optional):
              </label>
              <textarea
                id="decline-reason"
                value={declineReason}
                onChange={(e) => setDeclineReason(e.target.value)}
                placeholder="Explain why you're declining this change..."
                style={styles.declineReasonInput}
                className="decline-input"
                rows={3}
              />
            </div>
          )}
        </>
      )}

      {error && (
        <div style={styles.errorMessage} role="alert">
          {error}
        </div>
      )}
    </div>
  )
}

export default SafetySettingProposalCard
