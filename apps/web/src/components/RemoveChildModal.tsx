'use client'

/**
 * Confirmation modal for removing a child from a family.
 *
 * Requires typing the child's name to confirm deletion.
 * Implements focus trap for accessibility.
 */

import { useEffect, useRef, useState } from 'react'
import type { ChildProfile } from '@fledgely/shared/contracts'

interface RemoveChildModalProps {
  child: ChildProfile
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
    marginBottom: '24px',
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

export default function RemoveChildModal({
  child,
  isOpen,
  onClose,
  onConfirm,
}: RemoveChildModalProps) {
  const [confirmName, setConfirmName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const modalRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen) {
      setConfirmName('')
      setError(null)
      setDeleting(false)
      // Small delay to ensure modal is rendered
      setTimeout(() => {
        inputRef.current?.focus()
      }, 100)
    }
  }, [isOpen])

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

    // Validate name matches
    if (confirmName.trim().toLowerCase() !== child.name.trim().toLowerCase()) {
      setError(`Please type "${child.name}" exactly to confirm`)
      return
    }

    setDeleting(true)
    try {
      await onConfirm()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove child')
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

  const isNameMatch = confirmName.trim().toLowerCase() === child.name.trim().toLowerCase()

  return (
    <div
      style={styles.overlay}
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="remove-child-title"
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
          <h2 id="remove-child-title" style={styles.title}>
            Remove {child.name}?
          </h2>
        </div>

        <p style={styles.description}>
          This will permanently remove {child.name} from your family. This action cannot be undone.
        </p>

        <div style={styles.warningBox}>
          <p style={styles.warningText}>This will permanently delete:</p>
          <ul style={styles.warningList}>
            <li>{child.name}&apos;s profile and all settings</li>
            <li>Any custody arrangements for this child</li>
          </ul>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={styles.formGroup}>
            <label htmlFor="confirm-name" style={styles.label}>
              Type <strong>{child.name}</strong> to confirm
            </label>
            <input
              ref={inputRef}
              type="text"
              id="confirm-name"
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
              placeholder={`Type "${child.name}" here`}
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
              {deleting ? 'Removing...' : 'Remove Child'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
