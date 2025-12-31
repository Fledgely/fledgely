/**
 * ChangeRequestModal Component - Story 19C.5
 *
 * Modal wrapper for the change request form.
 * Shows confirmation message after successful submission.
 *
 * Task 2: Create ChangeRequestModal component (AC: #1, #4)
 */

import React, { useState } from 'react'
import { ChangeRequestForm, ChangeRequestData } from './ChangeRequestForm'

/**
 * Inline styles using React.CSSProperties (NOT Tailwind per Epic 19B pattern)
 */
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
    padding: '16px',
    zIndex: 1000,
  },
  modal: {
    backgroundColor: '#f0f9ff',
    borderRadius: '16px',
    padding: '24px',
    width: '100%',
    maxWidth: '400px',
    maxHeight: '90vh',
    overflow: 'auto',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
  },
  header: {
    textAlign: 'center',
    marginBottom: '20px',
  },
  title: {
    color: '#0ea5e9',
    fontSize: '20px',
    fontWeight: 600,
    marginBottom: '8px',
  },
  subtitle: {
    color: '#64748b',
    fontSize: '14px',
    lineHeight: 1.5,
  },
  successContainer: {
    textAlign: 'center',
    padding: '20px',
  },
  successIcon: {
    fontSize: '48px',
    marginBottom: '16px',
  },
  successTitle: {
    color: '#22c55e',
    fontSize: '18px',
    fontWeight: 600,
    marginBottom: '8px',
  },
  successMessage: {
    color: '#334155',
    fontSize: '14px',
    lineHeight: 1.5,
    marginBottom: '20px',
  },
  closeButton: {
    padding: '14px 32px',
    backgroundColor: '#0ea5e9',
    color: '#ffffff',
    fontSize: '14px',
    fontWeight: 600,
    border: 'none',
    borderRadius: '12px',
    cursor: 'pointer',
    transition: 'background-color 0.2s ease',
  },
}

type ModalState = 'form' | 'success'

interface ChangeRequestModalProps {
  /** Whether the modal is open */
  isOpen: boolean
  /** Handler to close the modal */
  onClose: () => void
  /** Parent's name for confirmation message */
  parentName: string
  /** Handler for submitting the change request */
  onSubmitRequest: (data: ChangeRequestData) => Promise<void>
  /** Whether a submission is in progress */
  isSubmitting?: boolean
  /** Error message from submission */
  error?: string | null
}

export function ChangeRequestModal({
  isOpen,
  onClose,
  parentName,
  onSubmitRequest,
  isSubmitting = false,
  error = null,
}: ChangeRequestModalProps) {
  const [modalState, setModalState] = useState<ModalState>('form')

  if (!isOpen) return null

  const handleSubmit = async (data: ChangeRequestData) => {
    try {
      await onSubmitRequest(data)
      // If no error was thrown, show success
      setModalState('success')
    } catch {
      // Error is handled by the parent via error prop
      // The hook sets error state, which is passed back as error prop
    }
  }

  const handleClose = () => {
    setModalState('form') // Reset state for next open
    onClose()
  }

  // Prevent clicks on modal from closing it
  const handleModalClick = (e: React.MouseEvent) => {
    e.stopPropagation()
  }

  return (
    <div
      style={styles.overlay}
      onClick={handleClose}
      data-testid="change-request-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div style={styles.modal} onClick={handleModalClick} data-testid="change-request-modal">
        {modalState === 'form' ? (
          <>
            <div style={styles.header}>
              <h2 id="modal-title" style={styles.title} data-testid="modal-title">
                Request a Change
              </h2>
              <p style={styles.subtitle}>
                Tell us what you&apos;d like to change about your agreement
              </p>
            </div>

            <ChangeRequestForm
              onSubmit={handleSubmit}
              onCancel={handleClose}
              isSubmitting={isSubmitting}
              error={error}
            />
          </>
        ) : (
          <div style={styles.successContainer} data-testid="success-state">
            <div style={styles.successIcon}>🎉</div>
            <h2 style={styles.successTitle} data-testid="success-title">
              Request Sent!
            </h2>
            <p style={styles.successMessage} data-testid="success-message">
              Request sent - talk to {parentName} about it
            </p>
            <button
              type="button"
              onClick={handleClose}
              style={styles.closeButton}
              data-testid="close-button"
            >
              Got it!
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
