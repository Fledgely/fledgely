/**
 * InvitationStatusCard - Displays pending invitation status with management actions.
 *
 * Story 3.5: Invitation Management
 * - AC1: View Pending Invitation Status (sent date, expires in X days, recipient email)
 * - AC2: Resend Invitation (updates emailSentAt, same token remains valid)
 * - AC3: Revoke Invitation (marks as revoked, link becomes invalid)
 * - AC6: Accessibility (keyboard accessible, 44px touch targets, focus indicators)
 */

import { useState, useEffect } from 'react'
import type { Invitation } from '@fledgely/shared/contracts'
import { resendInvitationEmail, revokeInvitation } from '../services/invitationService'

interface InvitationStatusCardProps {
  /** The pending invitation to display */
  invitation: Invitation
  /** Current user's UID (must be inviter to manage) */
  currentUserUid: string
  /** Callback when invitation is revoked */
  onRevoked?: () => void
  /** Callback when invitation is resent */
  onResent?: () => void
}

const styles = {
  card: {
    backgroundColor: '#fef3c7',
    border: '1px solid #fcd34d',
    borderRadius: '12px',
    padding: '16px',
    marginBottom: '16px',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '12px',
  },
  icon: {
    width: '20px',
    height: '20px',
    color: '#b45309',
  },
  title: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#92400e',
    margin: 0,
  },
  details: {
    fontSize: '14px',
    color: '#78350f',
    marginBottom: '16px',
    lineHeight: 1.5,
  },
  detailRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '6px 0',
  },
  detailLabel: {
    color: '#92400e',
  },
  detailValue: {
    fontWeight: 500,
  },
  expiryUrgent: {
    color: '#991b1b', // Darker red - 5.2:1 contrast ratio on yellow background (WCAG AA compliant)
    fontWeight: 600,
  },
  actions: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap' as const,
  },
  button: {
    minHeight: '44px',
    minWidth: '44px',
    padding: '10px 16px',
    fontSize: '14px',
    fontWeight: 500,
    borderRadius: '8px',
    border: 'none',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
  },
  resendButton: {
    backgroundColor: '#4F46E5',
    color: '#ffffff',
  },
  revokeButton: {
    backgroundColor: '#ffffff',
    color: '#dc2626',
    border: '1px solid #dc2626',
  },
  disabledButton: {
    opacity: 0.6,
    cursor: 'not-allowed',
  },
  message: {
    fontSize: '13px',
    padding: '8px 12px',
    borderRadius: '6px',
    marginTop: '12px',
    textAlign: 'center' as const,
  },
  successMessage: {
    backgroundColor: '#d1fae5',
    color: '#065f46',
  },
  errorMessage: {
    backgroundColor: '#fee2e2',
    color: '#dc2626',
  },
  confirmModal: {
    position: 'fixed' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '16px',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    padding: '24px',
    maxWidth: '400px',
    width: '100%',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
  },
  modalTitle: {
    fontSize: '18px',
    fontWeight: 600,
    color: '#1f2937',
    marginBottom: '12px',
  },
  modalText: {
    fontSize: '14px',
    color: '#6b7280',
    marginBottom: '20px',
    lineHeight: 1.5,
  },
  modalActions: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'flex-end',
  },
  cancelButton: {
    backgroundColor: '#f3f4f6',
    color: '#374151',
  },
  confirmRevokeButton: {
    backgroundColor: '#dc2626',
    color: '#ffffff',
  },
}

/**
 * Calculate days until expiry.
 */
function getDaysUntilExpiry(expiresAt: Date): number {
  const now = new Date()
  const diff = expiresAt.getTime() - now.getTime()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
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
 * InvitationStatusCard - Shows pending invitation with resend/revoke actions.
 */
export default function InvitationStatusCard({
  invitation,
  currentUserUid,
  onRevoked,
  onResent,
}: InvitationStatusCardProps) {
  const [resending, setResending] = useState(false)
  const [revoking, setRevoking] = useState(false)
  const [showConfirmRevoke, setShowConfirmRevoke] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Handle Escape key for modal (AC6 - keyboard accessibility)
  useEffect(() => {
    if (!showConfirmRevoke) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !revoking) {
        setShowConfirmRevoke(false)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [showConfirmRevoke, revoking])

  // Validate that current user is the inviter
  const isInviter = currentUserUid === invitation.inviterUid
  const daysUntilExpiry = getDaysUntilExpiry(invitation.expiresAt)
  const isUrgent = daysUntilExpiry <= 2

  /**
   * Handle resend invitation (AC2).
   */
  const handleResend = async () => {
    if (!invitation.recipientEmail) {
      setMessage({ type: 'error', text: 'No recipient email to resend to.' })
      return
    }

    setResending(true)
    setMessage(null)

    try {
      const result = await resendInvitationEmail(invitation.id, invitation.recipientEmail)
      if (result.success) {
        setMessage({ type: 'success', text: 'Invitation email resent successfully!' })
        onResent?.()
      } else {
        setMessage({ type: 'error', text: result.message })
      }
    } catch (err) {
      console.error('Error resending invitation:', err)
      setMessage({ type: 'error', text: 'Failed to resend invitation. Please try again.' })
    } finally {
      setResending(false)
    }
  }

  /**
   * Handle revoke invitation (AC3).
   */
  const handleRevoke = async () => {
    setRevoking(true)
    setMessage(null)
    setShowConfirmRevoke(false)

    try {
      await revokeInvitation(invitation.id, currentUserUid)
      setMessage({ type: 'success', text: 'Invitation revoked successfully.' })
      onRevoked?.()
    } catch (err) {
      console.error('Error revoking invitation:', err)
      const error = err as Error
      setMessage({ type: 'error', text: error.message || 'Failed to revoke invitation.' })
    } finally {
      setRevoking(false)
    }
  }

  // Don't render if user is not the inviter
  if (!isInviter) {
    return null
  }

  return (
    <>
      <div style={styles.card} role="region" aria-label="Pending invitation status">
        {/* Header with icon */}
        <div style={styles.header}>
          <svg
            style={styles.icon}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <h3 style={styles.title}>Pending Co-Parent Invitation</h3>
        </div>

        {/* Invitation details (AC1) */}
        <div style={styles.details}>
          {invitation.recipientEmail && (
            <div style={styles.detailRow}>
              <span style={styles.detailLabel}>Sent to:</span>
              <span style={styles.detailValue}>{invitation.recipientEmail}</span>
            </div>
          )}
          <div style={styles.detailRow}>
            <span style={styles.detailLabel}>Sent on:</span>
            <span style={styles.detailValue}>
              {invitation.emailSentAt
                ? formatDate(invitation.emailSentAt)
                : formatDate(invitation.createdAt)}
            </span>
          </div>
          <div style={styles.detailRow}>
            <span style={styles.detailLabel}>Expires in:</span>
            <span style={{ ...styles.detailValue, ...(isUrgent ? styles.expiryUrgent : {}) }}>
              {daysUntilExpiry} day{daysUntilExpiry !== 1 ? 's' : ''}
              {isUrgent && ' (expiring soon!)'}
            </span>
          </div>
        </div>

        {/* Action buttons (AC2, AC3, AC6) */}
        <div style={styles.actions}>
          {invitation.recipientEmail && (
            <button
              type="button"
              onClick={handleResend}
              disabled={resending || revoking}
              style={{
                ...styles.button,
                ...styles.resendButton,
                ...(resending || revoking ? styles.disabledButton : {}),
              }}
              aria-label="Resend invitation email"
              aria-busy={resending}
            >
              {resending ? 'Sending...' : 'Resend Email'}
            </button>
          )}
          <button
            type="button"
            onClick={() => setShowConfirmRevoke(true)}
            disabled={resending || revoking}
            style={{
              ...styles.button,
              ...styles.revokeButton,
              ...(resending || revoking ? styles.disabledButton : {}),
            }}
            aria-label="Revoke this invitation"
          >
            Revoke
          </button>
        </div>

        {/* Status message */}
        {message && (
          <div
            style={{
              ...styles.message,
              ...(message.type === 'success' ? styles.successMessage : styles.errorMessage),
            }}
            role="status"
            aria-live="polite"
          >
            {message.text}
          </div>
        )}
      </div>

      {/* Revoke confirmation modal (AC3) */}
      {showConfirmRevoke && (
        <div
          style={styles.confirmModal}
          role="dialog"
          aria-modal="true"
          aria-labelledby="revoke-modal-title"
          onClick={(e) => {
            // Close on backdrop click, not modal content click
            if (e.target === e.currentTarget && !revoking) {
              setShowConfirmRevoke(false)
            }
          }}
        >
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h2 id="revoke-modal-title" style={styles.modalTitle}>
              Revoke Invitation?
            </h2>
            <p style={styles.modalText}>
              Are you sure you want to revoke this invitation? The invitation link will become
              invalid and cannot be used. You can create a new invitation after revoking.
            </p>
            <div style={styles.modalActions}>
              <button
                type="button"
                onClick={() => setShowConfirmRevoke(false)}
                style={{ ...styles.button, ...styles.cancelButton }}
                autoFocus
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRevoke}
                disabled={revoking}
                style={{
                  ...styles.button,
                  ...styles.confirmRevokeButton,
                  ...(revoking ? styles.disabledButton : {}),
                }}
                aria-busy={revoking}
              >
                {revoking ? 'Revoking...' : 'Revoke Invitation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
