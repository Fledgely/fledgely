'use client'

/**
 * RemoveTrustedAdultModal - Story 52.6 Task 1.2
 *
 * Confirmation modal for teen to remove trusted adult access.
 *
 * AC3: No Explanation Required
 *   - No explanation field required from teen
 *   - Removal is teen's autonomous decision
 */

import { useState } from 'react'

interface TrustedAdultToRemove {
  id: string
  name: string
  email: string
}

interface RemoveTrustedAdultModalProps {
  trustedAdult: TrustedAdultToRemove
  isOpen: boolean
  onClose: () => void
  onConfirm: () => Promise<void>
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
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
  },
  modal: {
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
    maxWidth: '400px',
    width: '100%',
    padding: '24px',
    position: 'relative',
  },
  header: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '16px',
    marginBottom: '16px',
  },
  iconContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '48px',
    height: '48px',
    backgroundColor: '#fef2f2',
    borderRadius: '50%',
    flexShrink: 0,
  },
  icon: {
    fontSize: '24px',
    color: '#dc2626',
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    fontSize: '1.125rem',
    fontWeight: 600,
    color: '#1f2937',
    margin: '0 0 4px 0',
  },
  subtitle: {
    fontSize: '14px',
    color: '#6b7280',
    margin: 0,
  },
  content: {
    marginBottom: '24px',
  },
  trustedAdultInfo: {
    padding: '16px',
    backgroundColor: '#f9fafb',
    borderRadius: '12px',
    marginBottom: '16px',
  },
  trustedAdultName: {
    fontSize: '16px',
    fontWeight: 500,
    color: '#1f2937',
    margin: '0 0 4px 0',
  },
  trustedAdultEmail: {
    fontSize: '14px',
    color: '#6b7280',
    margin: 0,
  },
  infoBox: {
    padding: '12px 16px',
    backgroundColor: '#fef3c7',
    borderRadius: '8px',
    fontSize: '13px',
    color: '#92400e',
    lineHeight: 1.5,
  },
  buttons: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'flex-end',
  },
  cancelButton: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '44px',
    padding: '12px 20px',
    backgroundColor: '#ffffff',
    color: '#374151',
    fontSize: '14px',
    fontWeight: 500,
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  removeButton: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '44px',
    padding: '12px 20px',
    backgroundColor: '#dc2626',
    color: '#ffffff',
    fontSize: '14px',
    fontWeight: 500,
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  disabledButton: {
    opacity: 0.5,
    cursor: 'not-allowed',
  },
}

export function RemoveTrustedAdultModal({
  trustedAdult,
  isOpen,
  onClose,
  onConfirm,
}: RemoveTrustedAdultModalProps) {
  const [loading, setLoading] = useState(false)

  if (!isOpen) {
    return null
  }

  const handleConfirm = async () => {
    setLoading(true)
    try {
      await onConfirm()
      onClose()
    } catch (err) {
      console.error('Failed to remove trusted adult:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget && !loading) {
      onClose()
    }
  }

  return (
    <div
      style={styles.overlay}
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="remove-modal-title"
      data-testid="remove-trusted-adult-modal"
    >
      <div style={styles.modal}>
        <div style={styles.header}>
          <div style={styles.iconContainer}>
            <span style={styles.icon} aria-hidden="true">
              &#x26A0;
            </span>
          </div>
          <div style={styles.titleContainer}>
            <h2 id="remove-modal-title" style={styles.title}>
              Remove Trusted Adult?
            </h2>
            <p style={styles.subtitle}>This action takes effect immediately</p>
          </div>
        </div>

        <div style={styles.content}>
          <div style={styles.trustedAdultInfo}>
            <p style={styles.trustedAdultName}>{trustedAdult.name}</p>
            <p style={styles.trustedAdultEmail}>{trustedAdult.email}</p>
          </div>

          <div style={styles.infoBox}>
            <strong>What happens:</strong>
            <br />
            {trustedAdult.name} will no longer be able to view any of your shared data. They will be
            notified that access has been revoked. You can re-invite them later if you change your
            mind.
          </div>
        </div>

        <div style={styles.buttons}>
          <button
            type="button"
            style={styles.cancelButton}
            onClick={onClose}
            disabled={loading}
            data-testid="cancel-remove"
          >
            Cancel
          </button>
          <button
            type="button"
            style={{
              ...styles.removeButton,
              ...(loading ? styles.disabledButton : {}),
            }}
            onClick={handleConfirm}
            disabled={loading}
            data-testid="confirm-remove"
          >
            {loading ? 'Removing...' : 'Remove Access'}
          </button>
        </div>
      </div>
    </div>
  )
}
