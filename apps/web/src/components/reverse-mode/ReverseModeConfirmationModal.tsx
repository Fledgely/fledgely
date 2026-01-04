'use client'

/**
 * Reverse Mode Confirmation Modal - Story 52.2 Task 5
 *
 * Multi-step confirmation dialog for reverse mode activation.
 * AC2: Activation requires understanding confirmation.
 */

import { useState, useEffect, useRef } from 'react'
import { getReverseModeConfirmationContent } from '@fledgely/shared'

interface ReverseModeConfirmationModalProps {
  isOpen: boolean
  isLoading: boolean
  onConfirm: () => void
  onCancel: () => void
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
    borderRadius: '16px',
    padding: '28px',
    maxWidth: '520px',
    width: '100%',
    maxHeight: '90vh',
    overflow: 'auto',
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '20px',
  },
  icon: {
    width: '48px',
    height: '48px',
    borderRadius: '50%',
    backgroundColor: '#dbeafe',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '24px',
    flexShrink: 0,
  },
  title: {
    fontSize: '1.35rem',
    fontWeight: 700,
    color: '#1f2937',
    margin: 0,
  },
  introduction: {
    fontSize: '15px',
    color: '#4b5563',
    lineHeight: 1.6,
    marginBottom: '24px',
  },
  stepsContainer: {
    marginBottom: '24px',
  },
  step: {
    display: 'flex',
    gap: '12px',
    marginBottom: '16px',
    padding: '16px',
    backgroundColor: '#f9fafb',
    borderRadius: '12px',
    border: '1px solid #e5e7eb',
  },
  stepNumber: {
    width: '28px',
    height: '28px',
    borderRadius: '50%',
    backgroundColor: '#3b82f6',
    color: '#ffffff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '14px',
    fontWeight: 600,
    flexShrink: 0,
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: '15px',
    fontWeight: 600,
    color: '#1f2937',
    marginBottom: '4px',
  },
  stepDescription: {
    fontSize: '14px',
    color: '#6b7280',
    lineHeight: 1.5,
  },
  confirmationBox: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
    padding: '16px',
    backgroundColor: '#fef3c7',
    border: '1px solid #fcd34d',
    borderRadius: '12px',
    marginBottom: '24px',
  },
  checkbox: {
    width: '20px',
    height: '20px',
    marginTop: '2px',
    cursor: 'pointer',
    accentColor: '#3b82f6',
  },
  confirmationLabel: {
    fontSize: '14px',
    color: '#92400e',
    lineHeight: 1.5,
    cursor: 'pointer',
    fontWeight: 500,
  },
  buttons: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'flex-end',
  },
  cancelButton: {
    padding: '12px 24px',
    fontSize: '15px',
    fontWeight: 500,
    color: '#4b5563',
    backgroundColor: '#f3f4f6',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    cursor: 'pointer',
  },
  confirmButton: {
    padding: '12px 24px',
    fontSize: '15px',
    fontWeight: 600,
    color: '#ffffff',
    backgroundColor: '#3b82f6',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  confirmButtonDisabled: {
    backgroundColor: '#9ca3af',
    cursor: 'not-allowed',
  },
  spinner: {
    width: '16px',
    height: '16px',
    border: '2px solid rgba(255,255,255,0.3)',
    borderTopColor: '#ffffff',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
}

export default function ReverseModeConfirmationModal({
  isOpen,
  isLoading,
  onConfirm,
  onCancel,
}: ReverseModeConfirmationModalProps) {
  const [acknowledged, setAcknowledged] = useState(false)
  const modalRef = useRef<HTMLDivElement>(null)
  const content = getReverseModeConfirmationContent()

  // Reset acknowledged state when modal opens
  useEffect(() => {
    if (isOpen) {
      setAcknowledged(false)
    }
  }, [isOpen])

  // Focus trap and escape key handling
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onCancel])

  if (!isOpen) return null

  const canConfirm = acknowledged && !isLoading

  return (
    <div
      style={styles.overlay}
      onClick={(e) => e.target === e.currentTarget && onCancel()}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div style={styles.modal} ref={modalRef}>
        <div style={styles.header}>
          <div style={styles.icon}>
            <span role="img" aria-label="privacy">
              🔒
            </span>
          </div>
          <h2 id="modal-title" style={styles.title}>
            {content.title}
          </h2>
        </div>

        <p style={styles.introduction}>{content.introduction}</p>

        <div style={styles.stepsContainer}>
          {content.steps.map((step) => (
            <div key={step.step} style={styles.step}>
              <div style={styles.stepNumber}>{step.step}</div>
              <div style={styles.stepContent}>
                <div style={styles.stepTitle}>{step.title}</div>
                <div style={styles.stepDescription}>{step.description}</div>
              </div>
            </div>
          ))}
        </div>

        <div style={styles.confirmationBox}>
          <input
            type="checkbox"
            id="confirmation-checkbox"
            style={styles.checkbox}
            checked={acknowledged}
            onChange={(e) => setAcknowledged(e.target.checked)}
            disabled={isLoading}
          />
          <label htmlFor="confirmation-checkbox" style={styles.confirmationLabel}>
            {content.confirmationLabel}
          </label>
        </div>

        <div style={styles.buttons}>
          <button type="button" style={styles.cancelButton} onClick={onCancel} disabled={isLoading}>
            {content.cancelButtonText}
          </button>
          <button
            type="button"
            style={{
              ...styles.confirmButton,
              ...(!canConfirm ? styles.confirmButtonDisabled : {}),
            }}
            onClick={onConfirm}
            disabled={!canConfirm}
          >
            {isLoading && <div style={styles.spinner} />}
            {content.confirmButtonText}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
