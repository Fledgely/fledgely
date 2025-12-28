'use client'

/**
 * Modal for inviting a co-parent to the family.
 *
 * For MVP, shows "coming soon" message because Epic 3A safeguards
 * are not yet implemented. Once Epic 3A is complete, this will
 * allow creating and managing invitations.
 *
 * Implements focus trap for accessibility.
 */

import { useEffect, useRef, useState } from 'react'
import type { Family, Invitation } from '@fledgely/shared/contracts'
import {
  checkEpic3ASafeguards,
  getPendingInvitation,
  revokeInvitation,
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
  pendingBox: {
    backgroundColor: '#f3f4f6',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    padding: '16px',
    marginBottom: '24px',
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
  buttonGroup: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'flex-end',
  },
  closeButton: {
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
  const modalRef = useRef<HTMLDivElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)

  const safeguardsReady = checkEpic3ASafeguards()

  // Load pending invitation when modal opens
  useEffect(() => {
    if (isOpen) {
      setLoading(true)
      setError(null)
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

  // Focus close button when modal opens
  useEffect(() => {
    if (isOpen && !loading) {
      setTimeout(() => {
        closeButtonRef.current?.focus()
      }, 100)
    }
  }, [isOpen, loading])

  // Handle escape key to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !revoking) {
        onClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose, revoking])

  // Focus trap - keep focus within modal
  useEffect(() => {
    if (!isOpen) return

    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab' || !modalRef.current) return

      const focusableElements = modalRef.current.querySelectorAll('button:not([disabled])')
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

  const handleRevokeInvitation = async () => {
    if (!pendingInvitation) return

    setRevoking(true)
    setError(null)

    try {
      await revokeInvitation(pendingInvitation.id, currentUserUid)
      setPendingInvitation(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to revoke invitation')
    } finally {
      setRevoking(false)
    }
  }

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && !revoking) {
      onClose()
    }
  }

  if (!isOpen) {
    return null
  }

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
          .modal-close-button:focus {
            outline: 2px solid #4F46E5;
            outline-offset: 2px;
          }
          .modal-close-button:hover:not(:disabled) {
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
              <div style={styles.errorMessage} role="alert">
                {error}
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
                    style={styles.closeButton}
                    className="modal-close-button"
                  >
                    Close
                  </button>
                </div>
              </>
            ) : pendingInvitation ? (
              // Show existing pending invitation
              <>
                <p id="invite-coparent-description" style={styles.description}>
                  You have an active invitation for this family.
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
                </div>
                <p style={{ ...styles.description, marginBottom: '24px' }}>
                  Only one pending invitation is allowed per family. You can revoke this invitation
                  to create a new one.
                </p>
                <div style={styles.buttonGroup}>
                  <button
                    ref={closeButtonRef}
                    type="button"
                    onClick={onClose}
                    disabled={revoking}
                    style={styles.closeButton}
                    className="modal-close-button"
                  >
                    Close
                  </button>
                  <button
                    type="button"
                    onClick={handleRevokeInvitation}
                    disabled={revoking}
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
              // No pending invitation - would show create form when Epic 3A is ready
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
                    style={styles.closeButton}
                    className="modal-close-button"
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
