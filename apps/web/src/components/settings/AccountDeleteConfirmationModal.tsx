'use client'

/**
 * AccountDeleteConfirmationModal Component - Story 51.4
 *
 * Modal for confirming account deletion with typed confirmation.
 *
 * Acceptance Criteria:
 * - AC3: Warning about family impact
 * - AC6: Typed confirmation required
 *
 * Features:
 * - Warning about all family members being affected
 * - Typed confirmation "DELETE MY ACCOUNT"
 * - Case-sensitive validation
 * - Clear list of what will be deleted
 */

import { useState, useCallback, useEffect } from 'react'
import { ACCOUNT_DELETION_CONFIG } from '@fledgely/shared'

export interface AccountDeleteConfirmationModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (confirmationPhrase: string) => Promise<boolean>
  loading: boolean
  affectedUserCount?: number
}

export function AccountDeleteConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  loading,
  affectedUserCount = 0,
}: AccountDeleteConfirmationModalProps) {
  const [confirmationPhrase, setConfirmationPhrase] = useState('')
  const [error, setError] = useState<string | null>(null)

  // Reset on close
  useEffect(() => {
    if (!isOpen) {
      setConfirmationPhrase('')
      setError(null)
    }
  }, [isOpen])

  const isValid = confirmationPhrase === ACCOUNT_DELETION_CONFIG.CONFIRMATION_PHRASE

  const handleConfirm = useCallback(async () => {
    if (!isValid) {
      setError(`Please type "${ACCOUNT_DELETION_CONFIG.CONFIRMATION_PHRASE}" exactly`)
      return
    }

    setError(null)
    const success = await onConfirm(confirmationPhrase)

    if (success) {
      onClose()
    }
  }, [isValid, confirmationPhrase, onConfirm, onClose])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && isValid && !loading) {
        handleConfirm()
      }
      if (e.key === 'Escape' && !loading) {
        onClose()
      }
    },
    [isValid, loading, handleConfirm, onClose]
  )

  if (!isOpen) return null

  // Styles
  const overlayStyles: React.CSSProperties = {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
    zIndex: 1000,
  }

  const modalStyles: React.CSSProperties = {
    backgroundColor: 'white',
    borderRadius: '16px',
    maxWidth: '500px',
    width: '100%',
    maxHeight: '90vh',
    overflow: 'auto',
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
  }

  const headerStyles: React.CSSProperties = {
    padding: '24px',
    borderBottom: '1px solid #fecaca',
    backgroundColor: '#fef2f2',
  }

  const titleStyles: React.CSSProperties = {
    margin: 0,
    fontSize: '20px',
    fontWeight: 700,
    color: '#dc2626',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  }

  const bodyStyles: React.CSSProperties = {
    padding: '24px',
  }

  const warningBoxStyles: React.CSSProperties = {
    padding: '16px',
    backgroundColor: '#fef3c7',
    borderRadius: '8px',
    border: '1px solid #fcd34d',
    marginBottom: '20px',
  }

  const listStyles: React.CSSProperties = {
    margin: '12px 0 0 0',
    paddingLeft: '20px',
    fontSize: '14px',
    color: '#4b5563',
    lineHeight: 1.6,
  }

  const inputContainerStyles: React.CSSProperties = {
    marginTop: '20px',
  }

  const labelStyles: React.CSSProperties = {
    display: 'block',
    fontSize: '14px',
    fontWeight: 600,
    color: '#374151',
    marginBottom: '8px',
  }

  const inputStyles: React.CSSProperties = {
    width: '100%',
    padding: '12px',
    fontSize: '16px',
    border: `2px solid ${error ? '#dc2626' : isValid ? '#16a34a' : '#d1d5db'}`,
    borderRadius: '8px',
    outline: 'none',
    boxSizing: 'border-box',
  }

  const hintStyles: React.CSSProperties = {
    marginTop: '8px',
    fontSize: '13px',
    color: '#6b7280',
  }

  const errorStyles: React.CSSProperties = {
    marginTop: '8px',
    fontSize: '14px',
    color: '#dc2626',
  }

  const footerStyles: React.CSSProperties = {
    padding: '16px 24px',
    borderTop: '1px solid #e5e7eb',
    display: 'flex',
    gap: '12px',
    justifyContent: 'flex-end',
  }

  const buttonBaseStyles: React.CSSProperties = {
    padding: '10px 20px',
    fontSize: '14px',
    fontWeight: 600,
    borderRadius: '8px',
    cursor: 'pointer',
    border: 'none',
  }

  const cancelButtonStyles: React.CSSProperties = {
    ...buttonBaseStyles,
    backgroundColor: '#f3f4f6',
    color: '#374151',
  }

  const confirmButtonStyles: React.CSSProperties = {
    ...buttonBaseStyles,
    backgroundColor: isValid && !loading ? '#dc2626' : '#9ca3af',
    color: 'white',
    cursor: isValid && !loading ? 'pointer' : 'not-allowed',
    opacity: loading ? 0.7 : 1,
  }

  return (
    <div
      style={overlayStyles}
      onClick={(e) => e.target === e.currentTarget && !loading && onClose()}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      data-testid="account-delete-confirmation-modal"
    >
      <div style={modalStyles} onKeyDown={handleKeyDown}>
        <div style={headerStyles}>
          <h2 id="modal-title" style={titleStyles}>
            <span aria-hidden="true">!</span>
            Delete Your Account
          </h2>
        </div>

        <div style={bodyStyles}>
          <div style={warningBoxStyles}>
            <p
              style={{
                margin: 0,
                fontSize: '16px',
                fontWeight: 600,
                color: '#92400e',
              }}
            >
              This affects all family members
            </p>
            <p
              style={{
                margin: '8px 0 0 0',
                fontSize: '14px',
                color: '#92400e',
              }}
            >
              {affectedUserCount > 0
                ? `${affectedUserCount} account${affectedUserCount !== 1 ? 's' : ''} will be permanently deleted.`
                : 'All accounts in your family will be permanently deleted.'}
            </p>
          </div>

          <p
            style={{
              margin: 0,
              fontSize: '14px',
              fontWeight: 600,
              color: '#374151',
            }}
          >
            What will be deleted:
          </p>
          <ul style={listStyles}>
            <li>All family member accounts (guardians and linked children)</li>
            <li>All child profiles and monitoring data</li>
            <li>All agreements and settings</li>
            <li>All screenshots and activity logs</li>
            <li>All flags, audit events, and history</li>
          </ul>

          <div style={inputContainerStyles}>
            <label htmlFor="confirmation-phrase" style={labelStyles}>
              Type &quot;{ACCOUNT_DELETION_CONFIG.CONFIRMATION_PHRASE}&quot; to confirm:
            </label>
            <input
              id="confirmation-phrase"
              type="text"
              value={confirmationPhrase}
              onChange={(e) => setConfirmationPhrase(e.target.value)}
              placeholder={ACCOUNT_DELETION_CONFIG.CONFIRMATION_PHRASE}
              style={inputStyles}
              disabled={loading}
              autoComplete="off"
              data-testid="confirmation-phrase-input"
            />
            <p style={hintStyles}>This is case-sensitive and must match exactly.</p>
            {error && (
              <p style={errorStyles} role="alert">
                {error}
              </p>
            )}
          </div>
        </div>

        <div style={footerStyles}>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            style={cancelButtonStyles}
            data-testid="cancel-button"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!isValid || loading}
            style={confirmButtonStyles}
            data-testid="confirm-button"
          >
            {loading ? 'Processing...' : 'Delete My Account'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default AccountDeleteConfirmationModal
