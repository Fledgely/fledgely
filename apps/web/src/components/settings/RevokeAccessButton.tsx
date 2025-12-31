'use client'

/**
 * RevokeAccessButton Component - Story 19D.5
 *
 * Button for parents to revoke caregiver access with confirmation.
 *
 * Acceptance Criteria:
 * - AC1: Parent clicks "Remove Access" in settings
 * - AC1: Revoke access within 5 minutes (NFR62) - immediate in practice
 *
 * UI/UX Requirements:
 * - Prominent "Remove Access" button
 * - Confirmation dialog to prevent accidents
 * - Clear feedback that revocation completed
 */

import { useState, useEffect, useCallback } from 'react'

/**
 * Props for RevokeAccessButton component
 */
export interface RevokeAccessButtonProps {
  /** Caregiver's display name for confirmation */
  caregiverName: string
  /** Callback when revocation is confirmed */
  onRevoke: () => Promise<void>
  /** Whether revocation is in progress */
  loading?: boolean
  /** Whether the button should be disabled */
  disabled?: boolean
}

/**
 * RevokeAccessButton - Button with confirmation for revoking caregiver access
 *
 * Story 19D.5: AC1 - "Remove Access" button
 */
export function RevokeAccessButton({
  caregiverName,
  onRevoke,
  loading = false,
  disabled = false,
}: RevokeAccessButtonProps) {
  const [showConfirm, setShowConfirm] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleRevoke = async () => {
    setError(null)
    try {
      await onRevoke()
      setShowConfirm(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to revoke access')
    }
  }

  const closeDialog = useCallback(() => {
    if (!loading) {
      setShowConfirm(false)
      setError(null)
    }
  }, [loading])

  // Handle Escape key to close dialog (Issue #6: Keyboard navigation)
  useEffect(() => {
    if (!showConfirm) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeDialog()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [showConfirm, closeDialog])

  // Main button styles (Issue #7: 48px min for NFR49 accessibility)
  const buttonStyles: React.CSSProperties = {
    minHeight: '48px',
    minWidth: '48px',
    padding: '12px 20px',
    fontSize: '16px',
    fontWeight: 600,
    color: '#dc2626',
    backgroundColor: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: '8px',
    cursor: disabled || loading ? 'not-allowed' : 'pointer',
    opacity: disabled || loading ? 0.6 : 1,
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
  }

  // Confirmation modal styles
  const overlayStyles: React.CSSProperties = {
    position: 'fixed',
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
  }

  const dialogStyles: React.CSSProperties = {
    backgroundColor: 'white',
    borderRadius: '16px',
    padding: '24px',
    maxWidth: '400px',
    width: '100%',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
  }

  const headingStyles: React.CSSProperties = {
    fontSize: '20px',
    fontWeight: 700,
    color: '#1f2937',
    margin: '0 0 12px 0',
  }

  const messageStyles: React.CSSProperties = {
    fontSize: '16px',
    color: '#6b7280',
    margin: '0 0 24px 0',
    lineHeight: 1.5,
  }

  const buttonGroupStyles: React.CSSProperties = {
    display: 'flex',
    gap: '12px',
    justifyContent: 'flex-end',
  }

  const cancelButtonStyles: React.CSSProperties = {
    minHeight: '48px',
    minWidth: '48px',
    padding: '12px 20px',
    fontSize: '16px',
    fontWeight: 500,
    color: '#374151',
    backgroundColor: '#f3f4f6',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
  }

  const confirmButtonStyles: React.CSSProperties = {
    minHeight: '48px',
    minWidth: '48px',
    padding: '12px 20px',
    fontSize: '16px',
    fontWeight: 600,
    color: 'white',
    backgroundColor: '#dc2626',
    border: 'none',
    borderRadius: '8px',
    cursor: loading ? 'not-allowed' : 'pointer',
    opacity: loading ? 0.6 : 1,
  }

  const errorStyles: React.CSSProperties = {
    marginTop: '12px',
    padding: '12px',
    backgroundColor: '#fef2f2',
    color: '#dc2626',
    borderRadius: '8px',
    fontSize: '14px',
  }

  return (
    <>
      {/* Main revoke button */}
      <button
        style={buttonStyles}
        onClick={() => setShowConfirm(true)}
        disabled={disabled || loading}
        aria-label={`Remove ${caregiverName}'s access`}
        data-testid="revoke-access-button"
      >
        <span aria-hidden="true">🚫</span>
        Remove Access
      </button>

      {/* Confirmation dialog */}
      {showConfirm && (
        <div
          style={overlayStyles}
          role="dialog"
          aria-modal="true"
          aria-labelledby="revoke-dialog-heading"
          data-testid="revoke-confirm-dialog"
        >
          <div style={dialogStyles}>
            <h2 id="revoke-dialog-heading" style={headingStyles}>
              Remove Caregiver Access?
            </h2>
            <p style={messageStyles}>
              Are you sure you want to remove <strong>{caregiverName}</strong>&apos;s access? They
              will no longer be able to view your family&apos;s status.
            </p>

            {error && (
              <div
                style={errorStyles}
                role="alert"
                aria-live="assertive"
                aria-atomic="true"
                data-testid="revoke-error"
              >
                {error}
              </div>
            )}

            <div style={buttonGroupStyles}>
              <button
                style={cancelButtonStyles}
                onClick={closeDialog}
                disabled={loading}
                data-testid="revoke-cancel-button"
              >
                Cancel
              </button>
              <button
                style={confirmButtonStyles}
                onClick={handleRevoke}
                disabled={loading}
                aria-label={`Confirm removal of ${caregiverName}'s access`}
                data-testid="revoke-confirm-button"
              >
                {loading ? 'Removing...' : 'Remove Access'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default RevokeAccessButton
