'use client'

/**
 * Confirmation modal for self-removal from a family.
 *
 * Story 2.8: Unilateral Self-Removal (Survivor Escape)
 *
 * CRITICAL SAFETY DESIGN:
 * - Uses neutral language (no "escape", "abuse", "danger" terms)
 * - Displays safety resources subtly
 * - Requires explicit confirmation phrase
 * - Immediate action, no waiting period
 * - Links to safety contact channel
 *
 * Implements acceptance criteria:
 * - AC1: "Remove myself from this family" option
 * - AC2: Confirmation with domestic abuse resources
 * - AC3: Immediate access revocation
 */

import { useEffect, useRef, useState } from 'react'
import type { Family } from '@fledgely/shared/contracts'

interface SelfRemovalModalProps {
  family: Family
  isOpen: boolean
  onClose: () => void
  onConfirm: () => Promise<void>
}

const CONFIRMATION_PHRASE = 'I understand this is immediate'

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
  infoIcon: {
    width: '48px',
    height: '48px',
    borderRadius: '50%',
    backgroundColor: '#eff6ff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '24px',
    color: '#2563eb',
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
    backgroundColor: '#f0fdf4',
    border: '1px solid #bbf7d0',
    borderRadius: '8px',
    padding: '12px 16px',
    marginBottom: '16px',
  },
  infoText: {
    color: '#166534',
    fontSize: '14px',
    margin: 0,
    lineHeight: 1.5,
  },
  helpBox: {
    backgroundColor: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    padding: '12px 16px',
    marginBottom: '24px',
  },
  helpText: {
    color: '#475569',
    fontSize: '13px',
    margin: 0,
    lineHeight: 1.5,
  },
  helpLink: {
    color: '#2563eb',
    textDecoration: 'none',
    fontWeight: 500,
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
  checkbox: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
    marginBottom: '16px',
  },
  checkboxInput: {
    width: '20px',
    height: '20px',
    marginTop: '2px',
    flexShrink: 0,
    cursor: 'pointer',
  },
  checkboxLabel: {
    fontSize: '14px',
    color: '#374151',
    lineHeight: 1.5,
    cursor: 'pointer',
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
  confirmButton: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '44px',
    padding: '12px 24px',
    backgroundColor: '#2563eb',
    color: '#ffffff',
    fontSize: '14px',
    fontWeight: 500,
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'background-color 0.2s ease',
  },
  confirmButtonDisabled: {
    backgroundColor: '#93c5fd',
    cursor: 'not-allowed',
  },
}

export default function SelfRemovalModal({
  family,
  isOpen,
  onClose,
  onConfirm,
}: SelfRemovalModalProps) {
  const [confirmed, setConfirmed] = useState(false)
  const [confirmPhrase, setConfirmPhrase] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [removing, setRemoving] = useState(false)
  const modalRef = useRef<HTMLDivElement>(null)
  const checkboxRef = useRef<HTMLInputElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setConfirmed(false)
      setConfirmPhrase('')
      setError(null)
      setRemoving(false)
      // Focus checkbox first
      setTimeout(() => {
        checkboxRef.current?.focus()
      }, 100)
    }
  }, [isOpen])

  // Handle escape key to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !removing) {
        onClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose, removing])

  // Focus trap - keep focus within modal
  useEffect(() => {
    if (!isOpen) return

    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab' || !modalRef.current) return

      const focusableElements = modalRef.current.querySelectorAll(
        'button:not([disabled]), input:not([disabled]), a[href]'
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

    if (!confirmed) {
      setError('Please check the confirmation box')
      return
    }

    if (confirmPhrase.trim() !== CONFIRMATION_PHRASE) {
      setError(`Please type "${CONFIRMATION_PHRASE}" exactly`)
      return
    }

    setRemoving(true)
    try {
      await onConfirm()
      // onConfirm should handle sign-out and redirect
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove from family')
      setRemoving(false)
    }
  }

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && !removing) {
      onClose()
    }
  }

  if (!isOpen) {
    return null
  }

  const isPhraseMatch = confirmPhrase.trim() === CONFIRMATION_PHRASE
  const canSubmit = confirmed && isPhraseMatch && !removing

  return (
    <div
      style={styles.overlay}
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="self-removal-title"
      aria-describedby="self-removal-description"
    >
      <style>
        {`
          .self-removal-cancel-button:focus {
            outline: 2px solid #4F46E5;
            outline-offset: 2px;
          }
          .self-removal-cancel-button:hover:not(:disabled) {
            background-color: #f9fafb;
            border-color: #9ca3af;
          }
          .self-removal-confirm-button:focus {
            outline: 2px solid #2563eb;
            outline-offset: 2px;
          }
          .self-removal-confirm-button:hover:not(:disabled) {
            background-color: #1d4ed8;
          }
          .self-removal-input:focus {
            outline: none;
            border-color: #2563eb;
            box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
          }
          .self-removal-link:focus {
            outline: 2px solid #2563eb;
            outline-offset: 2px;
          }
          .self-removal-link:hover {
            text-decoration: underline;
          }
        `}
      </style>
      <div ref={modalRef} style={styles.modal}>
        <div style={styles.header}>
          {/* Neutral icon, not warning */}
          <div style={styles.infoIcon} aria-hidden="true">
            i
          </div>
          <h2 id="self-removal-title" style={styles.title}>
            Remove yourself from {family.name}?
          </h2>
        </div>

        <p id="self-removal-description" style={styles.description}>
          You will be removed from this family immediately. The family will continue to exist for
          the other members.
        </p>

        <div style={styles.infoBox}>
          <p style={styles.infoText}>
            <strong>What happens:</strong>
            <br />
            • Your access will be removed immediately
            <br />
            • The other guardian(s) will not be notified
            <br />• You will see &quot;No families found&quot; when you return
          </p>
        </div>

        {/* Subtle safety resources - neutral language */}
        <div style={styles.helpBox}>
          <p style={styles.helpText}>
            If you need additional support or would like to talk to someone, our{' '}
            <a
              href="/safety"
              target="_blank"
              rel="noopener noreferrer"
              style={styles.helpLink}
              className="self-removal-link"
            >
              support team is available
            </a>
            .
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={styles.checkbox}>
            <input
              ref={checkboxRef}
              type="checkbox"
              id="self-removal-confirm-checkbox"
              checked={confirmed}
              onChange={(e) => {
                setConfirmed(e.target.checked)
                if (error) setError(null)
              }}
              style={styles.checkboxInput}
              disabled={removing}
            />
            <label htmlFor="self-removal-confirm-checkbox" style={styles.checkboxLabel}>
              I want to remove myself from this family
            </label>
          </div>

          <div style={styles.formGroup}>
            <label htmlFor="confirm-removal-phrase" style={styles.label}>
              Type &quot;<strong>{CONFIRMATION_PHRASE}</strong>&quot; to confirm
            </label>
            <input
              type="text"
              id="confirm-removal-phrase"
              value={confirmPhrase}
              onChange={(e) => {
                setConfirmPhrase(e.target.value)
                if (error) setError(null)
              }}
              style={{
                ...styles.input,
                ...(error ? styles.inputError : {}),
              }}
              className="self-removal-input"
              placeholder={CONFIRMATION_PHRASE}
              autoComplete="off"
              disabled={removing}
              aria-describedby={error ? 'removal-error' : undefined}
            />
            {error && (
              <p id="removal-error" style={styles.errorMessage} role="alert">
                {error}
              </p>
            )}
          </div>

          <div style={styles.buttonGroup}>
            <button
              ref={closeButtonRef}
              type="button"
              onClick={onClose}
              disabled={removing}
              style={styles.cancelButton}
              className="self-removal-cancel-button"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!canSubmit}
              style={{
                ...styles.confirmButton,
                ...(!canSubmit ? styles.confirmButtonDisabled : {}),
              }}
              className="self-removal-confirm-button"
              aria-busy={removing}
            >
              {removing ? 'Removing...' : 'Remove Myself'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
