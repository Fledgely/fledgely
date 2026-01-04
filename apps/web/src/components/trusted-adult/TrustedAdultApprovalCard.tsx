'use client'

/**
 * TrustedAdultApprovalCard - Story 52.4 Task 4.3
 *
 * Component for teen to approve/reject a trusted adult.
 *
 * AC3: Teen Approval Required
 *   - Shows trusted adult info (name, email)
 *   - Shows who invited them
 *   - Approve/Reject buttons
 *   - Optional rejection reason
 */

import { useState, useCallback } from 'react'
import { httpsCallable } from 'firebase/functions'
import { functions } from '../../lib/firebase'

interface TrustedAdultPendingApproval {
  id: string
  name: string
  email: string
  invitedAt: Date
  invitedByName?: string
}

interface TrustedAdultApprovalCardProps {
  trustedAdult: TrustedAdultPendingApproval
  onApproved: () => void
  onRejected: () => void
}

const styles: Record<string, React.CSSProperties> = {
  card: {
    padding: '20px',
    backgroundColor: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: '12px',
    marginBottom: '16px',
  },
  header: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: '16px',
  },
  info: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '4px',
  },
  name: {
    fontSize: '18px',
    fontWeight: 600,
    color: '#1f2937',
    margin: 0,
  },
  email: {
    fontSize: '14px',
    color: '#6b7280',
    margin: 0,
  },
  meta: {
    fontSize: '13px',
    color: '#9ca3af',
    margin: '8px 0 0 0',
  },
  badge: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '6px 12px',
    backgroundColor: '#dbeafe',
    color: '#1e40af',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: 500,
  },
  description: {
    fontSize: '14px',
    color: '#4b5563',
    lineHeight: 1.6,
    margin: '0 0 20px 0',
    padding: '12px 16px',
    backgroundColor: '#f9fafb',
    borderRadius: '8px',
  },
  descriptionTitle: {
    fontWeight: 600,
    color: '#374151',
    marginBottom: '8px',
    display: 'block',
  },
  descriptionList: {
    margin: '8px 0 0 0',
    padding: '0 0 0 20px',
  },
  rejectionInput: {
    width: '100%',
    padding: '12px',
    fontSize: '14px',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    marginBottom: '16px',
    boxSizing: 'border-box' as const,
    outline: 'none',
  },
  buttonGroup: {
    display: 'flex',
    gap: '12px',
    flexWrap: 'wrap' as const,
  },
  approveButton: {
    flex: 1,
    minWidth: '120px',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '44px',
    padding: '12px 24px',
    backgroundColor: '#059669',
    color: '#ffffff',
    fontSize: '14px',
    fontWeight: 500,
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'background-color 0.2s ease',
  },
  approveButtonDisabled: {
    backgroundColor: '#34d399',
    cursor: 'not-allowed',
  },
  rejectButton: {
    flex: 1,
    minWidth: '120px',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '44px',
    padding: '12px 24px',
    backgroundColor: '#ffffff',
    color: '#dc2626',
    fontSize: '14px',
    fontWeight: 500,
    border: '1px solid #fca5a5',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  rejectButtonDisabled: {
    borderColor: '#d1d5db',
    color: '#9ca3af',
    cursor: 'not-allowed',
  },
  showRejectReasonButton: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '44px',
    padding: '12px 24px',
    backgroundColor: '#f9fafb',
    color: '#6b7280',
    fontSize: '14px',
    fontWeight: 500,
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    cursor: 'pointer',
    marginBottom: '12px',
  },
  message: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '12px 16px',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 500,
    marginTop: '16px',
  },
  successMessage: {
    backgroundColor: '#ecfdf5',
    color: '#059669',
  },
  errorMessage: {
    backgroundColor: '#fef2f2',
    color: '#dc2626',
  },
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date)
}

export default function TrustedAdultApprovalCard({
  trustedAdult,
  onApproved,
  onRejected,
}: TrustedAdultApprovalCardProps) {
  const [processing, setProcessing] = useState(false)
  const [showRejectReason, setShowRejectReason] = useState(false)
  const [rejectionReason, setRejectionReason] = useState('')
  const [result, setResult] = useState<'approved' | 'rejected' | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleApprove = useCallback(async () => {
    setProcessing(true)
    setError(null)

    try {
      const approveTrustedAdult = httpsCallable(functions, 'approveTrustedAdultByTeenCallable')
      await approveTrustedAdult({
        trustedAdultId: trustedAdult.id,
        approved: true,
      })

      setResult('approved')
      setTimeout(() => {
        onApproved()
      }, 1500)
    } catch (err) {
      console.error('Failed to approve trusted adult:', err)
      setError(err instanceof Error ? err.message : 'Failed to approve. Please try again.')
    } finally {
      setProcessing(false)
    }
  }, [trustedAdult.id, onApproved])

  const handleReject = useCallback(async () => {
    setProcessing(true)
    setError(null)

    try {
      const rejectTrustedAdult = httpsCallable(functions, 'approveTrustedAdultByTeenCallable')
      await rejectTrustedAdult({
        trustedAdultId: trustedAdult.id,
        approved: false,
        rejectionReason: rejectionReason.trim() || undefined,
      })

      setResult('rejected')
      setTimeout(() => {
        onRejected()
      }, 1500)
    } catch (err) {
      console.error('Failed to reject trusted adult:', err)
      setError(err instanceof Error ? err.message : 'Failed to reject. Please try again.')
    } finally {
      setProcessing(false)
    }
  }, [trustedAdult.id, rejectionReason, onRejected])

  if (result === 'approved') {
    return (
      <div style={styles.card} data-testid="approval-success">
        <div style={{ ...styles.message, ...styles.successMessage }}>
          <span aria-hidden="true">&#x2714;</span>
          You approved {trustedAdult.name} as a trusted adult.
        </div>
      </div>
    )
  }

  if (result === 'rejected') {
    return (
      <div style={styles.card} data-testid="rejection-success">
        <div style={{ ...styles.message, ...styles.successMessage }}>
          <span aria-hidden="true">&#x2714;</span>
          You declined {trustedAdult.name} as a trusted adult.
        </div>
      </div>
    )
  }

  return (
    <div style={styles.card} data-testid={`approval-card-${trustedAdult.id}`}>
      <div style={styles.header}>
        <div style={styles.info}>
          <p style={styles.name}>{trustedAdult.name}</p>
          <p style={styles.email}>{trustedAdult.email}</p>
          <p style={styles.meta}>
            {trustedAdult.invitedByName
              ? `Invited by ${trustedAdult.invitedByName} on ${formatDate(trustedAdult.invitedAt)}`
              : `Invited on ${formatDate(trustedAdult.invitedAt)}`}
          </p>
        </div>
        <span style={styles.badge}>Needs Your Approval</span>
      </div>

      <div style={styles.description}>
        <span style={styles.descriptionTitle}>What can trusted adults see?</span>
        If you approve, this person will be able to:
        <ul style={styles.descriptionList}>
          <li>View your daily screen time summary</li>
          <li>See your activity when parents share it</li>
          <li>Cannot change any settings or limits</li>
          <li>Cannot see data you&apos;ve hidden with Reverse Mode</li>
        </ul>
      </div>

      {showRejectReason && (
        <input
          type="text"
          value={rejectionReason}
          onChange={(e) => setRejectionReason(e.target.value)}
          placeholder="Reason for declining (optional)"
          style={styles.rejectionInput}
          disabled={processing}
          data-testid="rejection-reason-input"
        />
      )}

      {error && (
        <div style={{ ...styles.message, ...styles.errorMessage }} data-testid="error-message">
          <span aria-hidden="true">&#x26A0;</span>
          {error}
        </div>
      )}

      <div style={styles.buttonGroup}>
        <button
          type="button"
          onClick={handleApprove}
          disabled={processing}
          style={{
            ...styles.approveButton,
            ...(processing ? styles.approveButtonDisabled : {}),
          }}
          data-testid="approve-button"
        >
          {processing ? 'Processing...' : 'Approve'}
        </button>

        {!showRejectReason ? (
          <button
            type="button"
            onClick={() => setShowRejectReason(true)}
            disabled={processing}
            style={styles.rejectButton}
            data-testid="show-reject-button"
          >
            Decline
          </button>
        ) : (
          <button
            type="button"
            onClick={handleReject}
            disabled={processing}
            style={{
              ...styles.rejectButton,
              ...(processing ? styles.rejectButtonDisabled : {}),
            }}
            data-testid="reject-button"
          >
            {processing ? 'Processing...' : 'Confirm Decline'}
          </button>
        )}
      </div>
    </div>
  )
}
