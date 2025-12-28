'use client'

/**
 * Confirmation modal for dissolving a family.
 *
 * Requires typing the family name to confirm deletion.
 * Shows multi-guardian warning for families with more than one guardian.
 * Implements focus trap for accessibility.
 */

import { useEffect, useRef, useState } from 'react'
import type { Family } from '@fledgely/shared/contracts'

interface DissolveFamilyModalProps {
  family: Family
  childrenCount: number
  isOpen: boolean
  onClose: () => void
  onConfirm: () => Promise<void>
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
  warningIcon: {
    width: '48px',
    height: '48px',
    borderRadius: '50%',
    backgroundColor: '#fef2f2',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '24px',
    color: '#dc2626',
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
  warningBox: {
    backgroundColor: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: '8px',
    padding: '12px 16px',
    marginBottom: '16px',
  },
  warningText: {
    color: '#dc2626',
    fontSize: '14px',
    fontWeight: 500,
    margin: 0,
  },
  warningList: {
    color: '#dc2626',
    fontSize: '13px',
    margin: '8px 0 0 0',
    paddingLeft: '20px',
  },
  infoBox: {
    backgroundColor: '#fef3c7',
    border: '1px solid #fcd34d',
    borderRadius: '8px',
    padding: '12px 16px',
    marginBottom: '24px',
  },
  infoText: {
    color: '#92400e',
    fontSize: '14px',
    margin: 0,
    lineHeight: 1.5,
  },
  formGroup: {
    marginBottom: '24px',
  },
  label: {
    display: 'block',
    fontSize: '14px',
    fontWeight: 500,
    color: '#374151',
    marginBottom: '8px',
  },
  input: {
    width: '100%',
    minHeight: '44px',
    padding: '12px 16px',
    fontSize: '16px',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    color: '#1f2937',
    backgroundColor: '#ffffff',
    boxSizing: 'border-box' as const,
  },
  inputError: {
    borderColor: '#dc2626',
  },
  errorMessage: {
    fontSize: '13px',
    color: '#dc2626',
    marginTop: '8px',
  },
  buttonGroup: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'flex-end',
  },
  cancelButton: {
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
  deleteButton: {
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
  deleteButtonDisabled: {
    backgroundColor: '#f87171',
    cursor: 'not-allowed',
  },
}

export default function DissolveFamilyModal({
  family,
  childrenCount,
  isOpen,
  onClose,
  onConfirm,
}: DissolveFamilyModalProps) {
  const [confirmName, setConfirmName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const modalRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)

  const isMultiGuardian = family.guardians.length > 1

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen) {
      setConfirmName('')
      setError(null)
      setDeleting(false)
      // Small delay to ensure modal is rendered
      setTimeout(() => {
        if (!isMultiGuardian) {
          inputRef.current?.focus()
        } else {
          closeButtonRef.current?.focus()
        }
      }, 100)
    }
  }, [isOpen, isMultiGuardian])

  // Handle escape key to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !deleting) {
        onClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose, deleting])

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (isMultiGuardian) {
      // Multi-guardian families cannot be dissolved through this flow
      return
    }

    // Validate name matches
    if (confirmName.trim().toLowerCase() !== family.name.trim().toLowerCase()) {
      setError(`Please type "${family.name}" exactly to confirm`)
      return
    }

    setDeleting(true)
    try {
      await onConfirm()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to dissolve family')
      setDeleting(false)
    }
  }

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && !deleting) {
      onClose()
    }
  }

  if (!isOpen) {
    return null
  }

  const isNameMatch = confirmName.trim().toLowerCase() === family.name.trim().toLowerCase()

  return (
    <div
      style={styles.overlay}
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="dissolve-family-title"
      aria-describedby="dissolve-family-description"
    >
      <style>
        {`
          .modal-cancel-button:focus {
            outline: 2px solid #4F46E5;
            outline-offset: 2px;
          }
          .modal-cancel-button:hover:not(:disabled) {
            background-color: #f9fafb;
            border-color: #9ca3af;
          }
          .modal-delete-button:focus {
            outline: 2px solid #dc2626;
            outline-offset: 2px;
          }
          .modal-delete-button:hover:not(:disabled) {
            background-color: #b91c1c;
          }
          .modal-input:focus {
            outline: none;
            border-color: #4F46E5;
            box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
          }
        `}
      </style>
      <div ref={modalRef} style={styles.modal}>
        <div style={styles.header}>
          <div style={styles.warningIcon} aria-hidden="true">
            !
          </div>
          <h2 id="dissolve-family-title" style={styles.title}>
            Dissolve {family.name}?
          </h2>
        </div>

        {isMultiGuardian ? (
          // Multi-guardian family - show info about contacting support
          <>
            <p style={styles.description}>
              Your family has multiple guardians. To protect all family members, dissolving a shared
              family requires a special process.
            </p>
            <div style={styles.infoBox}>
              <p style={styles.infoText}>
                <strong>What happens next:</strong>
                <br />
                All guardians need to acknowledge the dissolution. You may also need a 30-day
                cooling-off period before final deletion.
                <br />
                <br />
                Please contact support for assistance with this process.
              </p>
            </div>
            <div style={styles.buttonGroup}>
              <button
                ref={closeButtonRef}
                type="button"
                onClick={onClose}
                style={styles.cancelButton}
                className="modal-cancel-button"
              >
                Close
              </button>
            </div>
          </>
        ) : (
          // Single guardian - allow dissolution
          <>
            <p id="dissolve-family-description" style={styles.description}>
              This will permanently dissolve your family and delete all associated data. This action
              cannot be undone.
            </p>

            <div style={styles.warningBox}>
              <p style={styles.warningText}>This will permanently delete:</p>
              <ul style={styles.warningList}>
                <li>The family &quot;{family.name}&quot;</li>
                {childrenCount > 0 && (
                  <li>
                    {childrenCount} child{childrenCount !== 1 ? 'ren' : ''} and all their data
                  </li>
                )}
                <li>All custody arrangements</li>
              </ul>
            </div>

            <form onSubmit={handleSubmit}>
              <div style={styles.formGroup}>
                <label htmlFor="confirm-family-name" style={styles.label}>
                  Type <strong>{family.name}</strong> to confirm
                </label>
                <input
                  ref={inputRef}
                  type="text"
                  id="confirm-family-name"
                  value={confirmName}
                  onChange={(e) => {
                    setConfirmName(e.target.value)
                    if (error) setError(null)
                  }}
                  style={{
                    ...styles.input,
                    ...(error ? styles.inputError : {}),
                  }}
                  className="modal-input"
                  placeholder={`Type "${family.name}" here`}
                  autoComplete="off"
                  disabled={deleting}
                  aria-describedby={error ? 'confirm-error' : undefined}
                />
                {error && (
                  <p id="confirm-error" style={styles.errorMessage} role="alert">
                    {error}
                  </p>
                )}
              </div>

              <div style={styles.buttonGroup}>
                <button
                  ref={closeButtonRef}
                  type="button"
                  onClick={onClose}
                  disabled={deleting}
                  style={styles.cancelButton}
                  className="modal-cancel-button"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={deleting || !isNameMatch}
                  style={{
                    ...styles.deleteButton,
                    ...(deleting || !isNameMatch ? styles.deleteButtonDisabled : {}),
                  }}
                  className="modal-delete-button"
                  aria-busy={deleting}
                >
                  {deleting ? 'Dissolving...' : 'Dissolve Family'}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
