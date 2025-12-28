'use client'

/**
 * Modal for inviting a co-parent to the family.
 *
 * For MVP, shows "coming soon" message because Epic 3A safeguards
 * are not yet implemented. Once Epic 3A is complete, this will
 * allow creating and managing invitations.
 *
 * Story 3.2 additions:
 * - Email input with validation (AC1)
 * - Send invitation email button (AC2)
 * - Copy link to clipboard (AC5)
 * - Error handling for email sending (AC6)
 * - Accessibility (AC7)
 *
 * Implements focus trap for accessibility.
 */

import { useEffect, useRef, useState } from 'react'
import type { Family, Invitation } from '@fledgely/shared/contracts'
import {
  checkEpic3ASafeguards,
  getPendingInvitation,
  revokeInvitation,
  sendInvitationEmail,
  isValidEmail,
  getInvitationLink,
} from '../services/invitationService'

interface InviteCoParentModalProps {
  family: Family
  isOpen: boolean
  onClose: () => void
  currentUserUid: string
}

const styles = {
  overlay: {
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
  modal: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    padding: '24px',
    maxWidth: '480px',
    width: '100%',
    maxHeight: '90vh',
    overflow: 'auto',
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '16px',
  },
  icon: {
    width: '48px',
    height: '48px',
    borderRadius: '50%',
    backgroundColor: '#ede9fe',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '24px',
    color: '#7c3aed',
    flexShrink: 0,
  },
  title: {
    fontSize: '1.25rem',
    fontWeight: 600,
    color: '#1f2937',
    margin: 0,
  },
  description: {
    fontSize: '14px',
    color: '#6b7280',
    lineHeight: 1.6,
    marginBottom: '16px',
  },
  infoBox: {
    backgroundColor: '#fef3c7',
    border: '1px solid #fcd34d',
    borderRadius: '8px',
    padding: '16px',
    marginBottom: '24px',
  },
  infoText: {
    color: '#92400e',
    fontSize: '14px',
    margin: 0,
    lineHeight: 1.5,
  },
  successBox: {
    backgroundColor: '#dcfce7',
    border: '1px solid #86efac',
    borderRadius: '8px',
    padding: '16px',
    marginBottom: '16px',
  },
  successText: {
    color: '#166534',
    fontSize: '14px',
    margin: 0,
    lineHeight: 1.5,
  },
  pendingBox: {
    backgroundColor: '#f3f4f6',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    padding: '16px',
    marginBottom: '16px',
  },
  pendingTitle: {
    color: '#1f2937',
    fontSize: '14px',
    fontWeight: 600,
    margin: 0,
    marginBottom: '8px',
  },
  pendingDetail: {
    color: '#6b7280',
    fontSize: '13px',
    margin: 0,
    marginBottom: '4px',
  },
  formGroup: {
    marginBottom: '16px',
  },
  label: {
    display: 'block',
    fontSize: '14px',
    fontWeight: 500,
    color: '#374151',
    marginBottom: '6px',
  },
  input: {
    width: '100%',
    minHeight: '44px',
    padding: '10px 14px',
    fontSize: '14px',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    outline: 'none',
    boxSizing: 'border-box' as const,
  },
  inputError: {
    borderColor: '#dc2626',
  },
  inputHint: {
    fontSize: '12px',
    color: '#6b7280',
    marginTop: '4px',
  },
  inputErrorText: {
    fontSize: '12px',
    color: '#dc2626',
    marginTop: '4px',
  },
  divider: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '16px',
  },
  dividerLine: {
    flex: 1,
    height: '1px',
    backgroundColor: '#e5e7eb',
  },
  dividerText: {
    fontSize: '12px',
    color: '#9ca3af',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
  },
  linkBox: {
    backgroundColor: '#f9fafb',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    padding: '12px',
    marginBottom: '16px',
    wordBreak: 'break-all' as const,
    fontSize: '13px',
    color: '#4b5563',
    fontFamily: 'monospace',
  },
  buttonGroup: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'flex-end',
    flexWrap: 'wrap' as const,
  },
  primaryButton: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '44px',
    padding: '12px 24px',
    backgroundColor: '#7c3aed',
    color: '#ffffff',
    fontSize: '14px',
    fontWeight: 500,
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'background-color 0.2s ease',
  },
  primaryButtonDisabled: {
    backgroundColor: '#a78bfa',
    cursor: 'not-allowed',
  },
  secondaryButton: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '44px',
    padding: '12px 24px',
    backgroundColor: '#ffffff',
    color: '#374151',
    fontSize: '14px',
    fontWeight: 500,
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  revokeButton: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '44px',
    padding: '12px 24px',
    backgroundColor: '#dc2626',
    color: '#ffffff',
    fontSize: '14px',
    fontWeight: 500,
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'background-color 0.2s ease',
  },
  revokeButtonDisabled: {
    backgroundColor: '#f87171',
    cursor: 'not-allowed',
  },
  errorMessage: {
    backgroundColor: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: '8px',
    padding: '12px 16px',
    marginBottom: '16px',
    color: '#dc2626',
    fontSize: '14px',
  },
}

export default function InviteCoParentModal({
  family,
  isOpen,
  onClose,
  currentUserUid,
}: InviteCoParentModalProps) {
  const [loading, setLoading] = useState(true)
  const [pendingInvitation, setPendingInvitation] = useState<Invitation | null>(null)
  const [revoking, setRevoking] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Email sending state (Story 3.2)
  const [email, setEmail] = useState('')
  const [emailError, setEmailError] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  const [sendSuccess, setSendSuccess] = useState(false)
  const [copySuccess, setCopySuccess] = useState(false)

  const modalRef = useRef<HTMLDivElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const emailInputRef = useRef<HTMLInputElement>(null)

  const safeguardsReady = checkEpic3ASafeguards()

  // Load pending invitation when modal opens
  useEffect(() => {
    if (isOpen) {
      setLoading(true)
      setError(null)
      setEmail('')
      setEmailError(null)
      setSendSuccess(false)
      setCopySuccess(false)
      getPendingInvitation(family.id)
        .then((invitation) => {
          setPendingInvitation(invitation)
          setLoading(false)
        })
        .catch((err) => {
          console.error('Error loading pending invitation:', err)
          setError('Unable to load invitation status')
          setLoading(false)
        })
    }
  }, [isOpen, family.id])

  // Focus email input or close button when modal opens
  useEffect(() => {
    if (isOpen && !loading) {
      setTimeout(() => {
        if (pendingInvitation && emailInputRef.current) {
          emailInputRef.current.focus()
        } else {
          closeButtonRef.current?.focus()
        }
      }, 100)
    }
  }, [isOpen, loading, pendingInvitation])

  // Handle escape key to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !revoking && !sending) {
        onClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose, revoking, sending])

  // Focus trap - keep focus within modal
  useEffect(() => {
    if (!isOpen) return

    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab' || !modalRef.current) return

      const focusableElements = modalRef.current.querySelectorAll(
        'button:not([disabled]), input:not([disabled])'
      )
      const firstElement = focusableElements[0] as HTMLElement
      const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault()
          lastElement?.focus()
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault()
          firstElement?.focus()
        }
      }
    }

    document.addEventListener('keydown', handleTabKey)
    return () => document.removeEventListener('keydown', handleTabKey)
  }, [isOpen])

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  // Validate email on change (AC1)
  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setEmail(value)
    setSendSuccess(false)

    if (value && !isValidEmail(value)) {
      setEmailError('Please enter a valid email address')
    } else {
      setEmailError(null)
    }
  }

  // Send invitation email (AC2)
  const handleSendEmail = async () => {
    if (!pendingInvitation || !email) return

    if (!isValidEmail(email)) {
      setEmailError('Please enter a valid email address')
      return
    }

    setSending(true)
    setError(null)
    setEmailError(null)

    try {
      const result = await sendInvitationEmail(pendingInvitation.id, email)
      if (result.success) {
        setSendSuccess(true)
        // Refresh invitation to get updated emailSentAt
        const updated = await getPendingInvitation(family.id)
        setPendingInvitation(updated)
      } else {
        setError(result.message)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send invitation')
    } finally {
      setSending(false)
    }
  }

  // Copy invitation link to clipboard (AC5)
  const handleCopyLink = async () => {
    if (!pendingInvitation) return

    const link = getInvitationLink(pendingInvitation)

    try {
      await navigator.clipboard.writeText(link)
      setCopySuccess(true)
      // Reset after 3 seconds
      setTimeout(() => setCopySuccess(false), 3000)
    } catch (err) {
      console.error('Failed to copy link:', err)
      setError('Failed to copy link. Please try again.')
    }
  }

  const handleRevokeInvitation = async () => {
    if (!pendingInvitation) return

    setRevoking(true)
    setError(null)

    try {
      await revokeInvitation(pendingInvitation.id, currentUserUid)
      setPendingInvitation(null)
      setEmail('')
      setSendSuccess(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to revoke invitation')
    } finally {
      setRevoking(false)
    }
  }

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && !revoking && !sending) {
      onClose()
    }
  }

  if (!isOpen) {
    return null
  }

  const invitationLink = pendingInvitation ? getInvitationLink(pendingInvitation) : ''

  return (
    <div
      style={styles.overlay}
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="invite-coparent-title"
      aria-describedby="invite-coparent-description"
    >
      <style>
        {`
          .modal-button:focus {
            outline: 2px solid #7c3aed;
            outline-offset: 2px;
          }
          .modal-button:hover:not(:disabled) {
            opacity: 0.9;
          }
          .modal-secondary-button:focus {
            outline: 2px solid #4F46E5;
            outline-offset: 2px;
          }
          .modal-secondary-button:hover:not(:disabled) {
            background-color: #f9fafb;
            border-color: #9ca3af;
          }
          .modal-revoke-button:focus {
            outline: 2px solid #dc2626;
            outline-offset: 2px;
          }
          .modal-revoke-button:hover:not(:disabled) {
            background-color: #b91c1c;
          }
          .modal-input:focus {
            outline: none;
            border-color: #7c3aed;
            box-shadow: 0 0 0 3px rgba(124, 58, 237, 0.1);
          }
        `}
      </style>
      <div ref={modalRef} style={styles.modal}>
        <div style={styles.header}>
          <div style={styles.icon} aria-hidden="true">
            +
          </div>
          <h2 id="invite-coparent-title" style={styles.title}>
            Invite Co-Parent
          </h2>
        </div>

        {loading ? (
          <p style={styles.description}>Loading...</p>
        ) : (
          <>
            {error && (
              <div style={styles.errorMessage} role="alert" aria-live="polite">
                {error}
              </div>
            )}

            {sendSuccess && (
              <div style={styles.successBox} role="status" aria-live="polite">
                <p style={styles.successText}>Invitation sent successfully to {email}!</p>
              </div>
            )}

            {!safeguardsReady ? (
              // Epic 3A safeguards not ready - show coming soon message
              <>
                <p id="invite-coparent-description" style={styles.description}>
                  Invite another parent to join {family.name} and share family management
                  responsibilities.
                </p>
                <div style={styles.infoBox}>
                  <p style={styles.infoText}>
                    Co-parent invitations coming soon. Safety safeguards under development.
                  </p>
                </div>
                <div style={styles.buttonGroup}>
                  <button
                    ref={closeButtonRef}
                    type="button"
                    onClick={onClose}
                    style={styles.secondaryButton}
                    className="modal-secondary-button"
                  >
                    Close
                  </button>
                </div>
              </>
            ) : pendingInvitation ? (
              // Show existing pending invitation with email/copy options
              <>
                <p id="invite-coparent-description" style={styles.description}>
                  You have an active invitation for this family. Share it with your co-parent via
                  email or copy the link.
                </p>

                <div style={styles.pendingBox}>
                  <p style={styles.pendingTitle}>Pending Invitation</p>
                  <p style={styles.pendingDetail}>Invited by: {pendingInvitation.inviterName}</p>
                  <p style={styles.pendingDetail}>
                    Created: {pendingInvitation.createdAt.toLocaleDateString()}
                  </p>
                  <p style={styles.pendingDetail}>
                    Expires: {pendingInvitation.expiresAt.toLocaleDateString()}
                  </p>
                  {pendingInvitation.recipientEmail && (
                    <p style={styles.pendingDetail}>Sent to: {pendingInvitation.recipientEmail}</p>
                  )}
                </div>

                {/* Email input (AC1) */}
                <div style={styles.formGroup}>
                  <label htmlFor="coparent-email" style={styles.label}>
                    Send invitation via email
                  </label>
                  <input
                    ref={emailInputRef}
                    id="coparent-email"
                    type="email"
                    value={email}
                    onChange={handleEmailChange}
                    placeholder="coparent@example.com"
                    disabled={sending}
                    aria-invalid={!!emailError}
                    aria-describedby={emailError ? 'email-error' : 'email-hint'}
                    style={{
                      ...styles.input,
                      ...(emailError ? styles.inputError : {}),
                    }}
                    className="modal-input"
                  />
                  {emailError ? (
                    <p id="email-error" style={styles.inputErrorText} role="alert">
                      {emailError}
                    </p>
                  ) : (
                    <p id="email-hint" style={styles.inputHint}>
                      We&apos;ll send an invitation with a secure link
                    </p>
                  )}
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <button
                    type="button"
                    onClick={handleSendEmail}
                    disabled={sending || !email || !!emailError}
                    style={{
                      ...styles.primaryButton,
                      width: '100%',
                      ...(sending || !email || !!emailError ? styles.primaryButtonDisabled : {}),
                    }}
                    className="modal-button"
                    aria-busy={sending}
                  >
                    {sending ? 'Sending...' : 'Send Invitation Email'}
                  </button>
                </div>

                {/* Divider */}
                <div style={styles.divider}>
                  <div style={styles.dividerLine} />
                  <span style={styles.dividerText}>or</span>
                  <div style={styles.dividerLine} />
                </div>

                {/* Copy link (AC5) */}
                <p style={{ ...styles.label, marginBottom: '8px' }}>Copy invitation link</p>
                <div style={styles.linkBox} aria-label="Invitation link">
                  {invitationLink}
                </div>

                <div style={{ marginBottom: '24px' }}>
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    style={{ ...styles.secondaryButton, width: '100%' }}
                    className="modal-secondary-button"
                    aria-live="polite"
                  >
                    {copySuccess ? '✓ Link Copied!' : 'Copy Link'}
                  </button>
                </div>

                {/* Action buttons */}
                <div style={styles.buttonGroup}>
                  <button
                    ref={closeButtonRef}
                    type="button"
                    onClick={onClose}
                    disabled={revoking || sending}
                    style={styles.secondaryButton}
                    className="modal-secondary-button"
                  >
                    Close
                  </button>
                  <button
                    type="button"
                    onClick={handleRevokeInvitation}
                    disabled={revoking || sending}
                    style={{
                      ...styles.revokeButton,
                      ...(revoking ? styles.revokeButtonDisabled : {}),
                    }}
                    className="modal-revoke-button"
                    aria-busy={revoking}
                  >
                    {revoking ? 'Revoking...' : 'Revoke Invitation'}
                  </button>
                </div>
              </>
            ) : (
              // No pending invitation - show info about creating one
              <>
                <p id="invite-coparent-description" style={styles.description}>
                  Invite another parent to join {family.name} and share family management
                  responsibilities.
                </p>
                <div style={styles.infoBox}>
                  <p style={styles.infoText}>
                    When you create an invitation, a secure link will be generated that you can
                    share with your co-parent. The invitation will expire after 7 days.
                  </p>
                </div>
                <div style={styles.buttonGroup}>
                  <button
                    ref={closeButtonRef}
                    type="button"
                    onClick={onClose}
                    style={styles.secondaryButton}
                    className="modal-secondary-button"
                  >
                    Cancel
                  </button>
                  {/* TODO: Add Create Invitation button when Epic 3A safeguards are ready */}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}
