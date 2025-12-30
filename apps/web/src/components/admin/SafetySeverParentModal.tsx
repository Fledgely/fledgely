/**
 * Safety Sever Parent Modal Component.
 *
 * Story 0.5.4: Parent Access Severing
 *
 * Confirmation modal for severing parent access from a family.
 * Requires typing confirmation phrase to prevent accidental severing.
 *
 * CRITICAL SAFETY DESIGN:
 * - Confirmation phrase prevents accidental clicks
 * - Shows verification status before allowing action
 * - Uses calming but serious styling (not alarming red)
 * - Clear warning about irreversibility
 */

'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useSeverParentAccess, GuardianInfoForSevering } from '../../hooks/useSeverParentAccess'

export interface VerificationStatus {
  phoneVerified: boolean
  idDocumentVerified: boolean
  accountMatchVerified: boolean
  securityQuestionsVerified: boolean
}

export interface SafetySeverParentModalProps {
  /** Whether the modal is open */
  isOpen: boolean
  /** Callback when modal is closed */
  onClose: () => void
  /** The safety ticket ID */
  ticketId: string
  /** Family information */
  family: {
    id: string
    name: string
    guardians: GuardianInfoForSevering[]
  }
  /** Parent to sever */
  parentToSever: GuardianInfoForSevering
  /** Verification status from ticket */
  verificationStatus: VerificationStatus
  /** Callback on successful severing */
  onSuccess: () => void
}

/**
 * Count completed verifications.
 */
function countVerifications(status: VerificationStatus): number {
  return [
    status.phoneVerified,
    status.idDocumentVerified,
    status.accountMatchVerified,
    status.securityQuestionsVerified,
  ].filter(Boolean).length
}

/**
 * Generate expected confirmation phrase.
 */
function getConfirmationPhrase(email: string): string {
  return `SEVER ${email}`
}

/**
 * Safety Sever Parent Modal.
 */
export function SafetySeverParentModal({
  isOpen,
  onClose,
  ticketId,
  family,
  parentToSever,
  verificationStatus,
  onSuccess,
}: SafetySeverParentModalProps) {
  const [confirmationInput, setConfirmationInput] = useState('')
  const [severing, setSevering] = useState(false)
  const [severError, setSeverError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const { severParentAccess, loading, error } = useSeverParentAccess()

  const expectedPhrase = getConfirmationPhrase(parentToSever.email)
  const phraseMatches = confirmationInput === expectedPhrase
  const verificationCount = countVerifications(verificationStatus)
  const canSever = phraseMatches && verificationCount >= 2

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [isOpen])

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setConfirmationInput('')
      setSeverError(null)
    }
  }, [isOpen])

  /**
   * Handle keyboard events.
   */
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose()
    }
  }

  /**
   * Handle severing action.
   */
  const handleSever = async () => {
    if (!canSever || severing) return

    setSevering(true)
    setSeverError(null)

    const result = await severParentAccess({
      ticketId,
      familyId: family.id,
      parentUid: parentToSever.uid,
      confirmationPhrase: confirmationInput,
    })

    setSevering(false)

    if (result?.success) {
      onSuccess()
      onClose()
    } else {
      setSeverError(error || 'Failed to sever parent access')
    }
  }

  if (!isOpen) return null

  return (
    <div
      style={styles.overlay}
      onClick={onClose}
      onKeyDown={handleKeyDown}
      role="dialog"
      aria-modal="true"
      aria-labelledby="sever-modal-title"
      tabIndex={-1}
    >
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={styles.header}>
          <h2 id="sever-modal-title" style={styles.title}>
            Sever Parent Access
          </h2>
          <button onClick={onClose} style={styles.closeButton} aria-label="Close modal">
            ✕
          </button>
        </div>

        {/* Content */}
        <div style={styles.content}>
          {/* Warning banner */}
          <div style={styles.warningBanner}>
            <span style={styles.warningIcon}>⚠️</span>
            <div>
              <strong>This action cannot be undone.</strong>
              <p style={styles.warningText}>
                Severing will immediately remove the parent&apos;s access to this family. They will
                see &quot;No families found&quot; when they log in.
              </p>
            </div>
          </div>

          {/* Family info */}
          <div style={styles.infoSection}>
            <h3 style={styles.sectionTitle}>Family</h3>
            <p style={styles.infoValue}>{family.name}</p>
          </div>

          {/* Parent to sever */}
          <div style={styles.infoSection}>
            <h3 style={styles.sectionTitle}>Parent to Sever</h3>
            <div style={styles.parentInfo}>
              <p style={styles.parentEmail}>{parentToSever.email}</p>
              {parentToSever.displayName && (
                <p style={styles.parentName}>{parentToSever.displayName}</p>
              )}
              <span style={styles.parentRole}>{parentToSever.role}</span>
            </div>
          </div>

          {/* Verification status */}
          <div style={styles.infoSection}>
            <h3 style={styles.sectionTitle}>Identity Verification ({verificationCount}/4)</h3>
            <div style={styles.verificationList}>
              <div style={styles.verificationItem}>
                <span style={verificationStatus.phoneVerified ? styles.checkOn : styles.checkOff}>
                  {verificationStatus.phoneVerified ? '✓' : '○'}
                </span>
                <span>Phone Verification</span>
              </div>
              <div style={styles.verificationItem}>
                <span
                  style={verificationStatus.idDocumentVerified ? styles.checkOn : styles.checkOff}
                >
                  {verificationStatus.idDocumentVerified ? '✓' : '○'}
                </span>
                <span>ID Document Match</span>
              </div>
              <div style={styles.verificationItem}>
                <span
                  style={verificationStatus.accountMatchVerified ? styles.checkOn : styles.checkOff}
                >
                  {verificationStatus.accountMatchVerified ? '✓' : '○'}
                </span>
                <span>Account Match</span>
              </div>
              <div style={styles.verificationItem}>
                <span
                  style={
                    verificationStatus.securityQuestionsVerified ? styles.checkOn : styles.checkOff
                  }
                >
                  {verificationStatus.securityQuestionsVerified ? '✓' : '○'}
                </span>
                <span>Security Questions</span>
              </div>
            </div>
            {verificationCount < 2 && (
              <p style={styles.verificationWarning}>
                ⚠️ Minimum 2 verification checks required before severing.
              </p>
            )}
          </div>

          {/* Confirmation input */}
          <div style={styles.confirmationSection}>
            <label htmlFor="confirmation-phrase" style={styles.confirmationLabel}>
              Type <code style={styles.confirmationCode}>{expectedPhrase}</code> to confirm:
            </label>
            <input
              ref={inputRef}
              id="confirmation-phrase"
              type="text"
              value={confirmationInput}
              onChange={(e) => setConfirmationInput(e.target.value)}
              placeholder="Type confirmation phrase..."
              style={styles.confirmationInput}
              disabled={severing || loading}
              autoComplete="off"
            />
          </div>

          {/* Error display */}
          {(severError || error) && (
            <div style={styles.errorBanner}>
              <span>⚠️</span>
              <span>{severError || error}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={styles.footer}>
          <button onClick={onClose} style={styles.cancelButton} disabled={severing || loading}>
            Cancel
          </button>
          <button
            onClick={handleSever}
            style={{
              ...styles.severButton,
              ...(canSever && !severing && !loading ? {} : styles.severButtonDisabled),
            }}
            disabled={!canSever || severing || loading}
          >
            {severing || loading ? 'Severing...' : 'Sever Access'}
          </button>
        </div>
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modal: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    width: '90%',
    maxWidth: '520px',
    maxHeight: '90vh',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    boxShadow: '0 20px 40px rgba(0, 0, 0, 0.2)',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px 24px',
    borderBottom: '1px solid #e5e7eb',
  },
  title: {
    fontSize: '18px',
    fontWeight: 600,
    color: '#111827',
    margin: 0,
  },
  closeButton: {
    width: '32px',
    height: '32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '16px',
    color: '#6b7280',
  },
  content: {
    padding: '24px',
    overflowY: 'auto',
    flex: 1,
  },
  warningBanner: {
    display: 'flex',
    gap: '12px',
    padding: '16px',
    backgroundColor: '#fef3c7',
    borderRadius: '8px',
    marginBottom: '20px',
  },
  warningIcon: {
    fontSize: '20px',
    flexShrink: 0,
  },
  warningText: {
    fontSize: '13px',
    color: '#92400e',
    margin: '4px 0 0 0',
  },
  infoSection: {
    marginBottom: '20px',
  },
  sectionTitle: {
    fontSize: '12px',
    fontWeight: 600,
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    margin: '0 0 8px 0',
  },
  infoValue: {
    fontSize: '15px',
    color: '#111827',
    margin: 0,
  },
  parentInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  parentEmail: {
    fontSize: '15px',
    fontWeight: 500,
    color: '#111827',
    margin: 0,
  },
  parentName: {
    fontSize: '14px',
    color: '#6b7280',
    margin: 0,
  },
  parentRole: {
    fontSize: '12px',
    color: '#6b7280',
    backgroundColor: '#f3f4f6',
    padding: '2px 8px',
    borderRadius: '4px',
    width: 'fit-content',
  },
  verificationList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  verificationItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '14px',
    color: '#374151',
  },
  checkOn: {
    color: '#059669',
    fontWeight: 600,
  },
  checkOff: {
    color: '#9ca3af',
  },
  verificationWarning: {
    fontSize: '13px',
    color: '#dc2626',
    marginTop: '12px',
    padding: '8px 12px',
    backgroundColor: '#fef2f2',
    borderRadius: '6px',
  },
  confirmationSection: {
    marginTop: '24px',
    paddingTop: '20px',
    borderTop: '1px solid #e5e7eb',
  },
  confirmationLabel: {
    display: 'block',
    fontSize: '14px',
    color: '#374151',
    marginBottom: '8px',
  },
  confirmationCode: {
    backgroundColor: '#f3f4f6',
    padding: '2px 6px',
    borderRadius: '4px',
    fontFamily: 'monospace',
    fontSize: '13px',
  },
  confirmationInput: {
    width: '100%',
    padding: '12px 14px',
    fontSize: '15px',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    outline: 'none',
    fontFamily: 'monospace',
    boxSizing: 'border-box',
  },
  errorBanner: {
    display: 'flex',
    gap: '8px',
    padding: '12px 16px',
    backgroundColor: '#fef2f2',
    color: '#dc2626',
    borderRadius: '8px',
    fontSize: '14px',
    marginTop: '16px',
  },
  footer: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
    padding: '16px 24px',
    borderTop: '1px solid #e5e7eb',
    backgroundColor: '#f9fafb',
  },
  cancelButton: {
    padding: '10px 20px',
    fontSize: '14px',
    fontWeight: 500,
    backgroundColor: '#ffffff',
    color: '#374151',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    cursor: 'pointer',
  },
  severButton: {
    padding: '10px 24px',
    fontSize: '14px',
    fontWeight: 500,
    backgroundColor: '#7c3aed',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
  },
  severButtonDisabled: {
    backgroundColor: '#c4b5fd',
    cursor: 'not-allowed',
  },
}

export default SafetySeverParentModal
