'use client'

/**
 * FlagActionModal Component - Story 22.3
 *
 * Confirmation modal for flag actions with optional note.
 *
 * Acceptance Criteria:
 * - AC1: Available actions: Dismiss, Note for Discussion, Requires Action
 * - AC5: Confirmation dialog shown before action is applied
 * - AC5: Option to add optional note
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import type { FlagActionType } from '../../services/flagService'

export interface FlagActionModalProps {
  /** The action being taken */
  action: FlagActionType
  /** Callback when action is confirmed */
  onConfirm: (note?: string) => void
  /** Callback when modal is cancelled */
  onCancel: () => void
  /** Whether the action is being processed */
  isLoading?: boolean
}

/**
 * Get display text for each action type
 */
const ACTION_CONFIG: Record<
  FlagActionType,
  { title: string; description: string; buttonText: string; buttonColor: string }
> = {
  dismiss: {
    title: 'Dismiss Flag',
    description:
      'This flag will be marked as dismissed and moved to history. Use this for false positives or situations that have been resolved.',
    buttonText: 'Dismiss Flag',
    buttonColor: '#6b7280',
  },
  discuss: {
    title: 'Note for Discussion',
    description:
      "This flag will be saved for a family conversation. You can add a note to remember what you'd like to discuss.",
    buttonText: 'Save for Discussion',
    buttonColor: '#ca8a04',
  },
  escalate: {
    title: 'Requires Action',
    description:
      'This flag requires immediate attention. Use this for serious concerns that need to be addressed promptly. You can add details about your concern.',
    buttonText: 'Mark as Requiring Action',
    buttonColor: '#dc2626',
  },
  view: {
    title: 'Mark as Viewed',
    description: 'This flag will be marked as reviewed.',
    buttonText: 'Mark as Viewed',
    buttonColor: '#6b7280',
  },
  discussed_together: {
    title: 'Discussed Together',
    description:
      'Mark this flag as reviewed by both parents together. Use this when you have discussed the situation as a family.',
    buttonText: 'Mark as Discussed Together',
    buttonColor: '#9d174d',
  },
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
    zIndex: 1100,
    padding: '16px',
  },
  modal: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    maxWidth: '480px',
    width: '100%',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    animation: 'fadeIn 0.15s ease-out',
  },
  header: {
    padding: '20px 24px 0',
  },
  title: {
    fontSize: '18px',
    fontWeight: 600,
    color: '#1f2937',
    margin: 0,
  },
  content: {
    padding: '16px 24px',
  },
  description: {
    fontSize: '14px',
    color: '#4b5563',
    lineHeight: 1.6,
    margin: '0 0 16px 0',
  },
  noteLabel: {
    display: 'block',
    fontSize: '14px',
    fontWeight: 500,
    color: '#374151',
    marginBottom: '8px',
  },
  noteInput: {
    width: '100%',
    minHeight: '80px',
    padding: '12px',
    fontSize: '14px',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    resize: 'vertical' as const,
    fontFamily: 'inherit',
  },
  noteHint: {
    fontSize: '12px',
    color: '#6b7280',
    marginTop: '4px',
  },
  footer: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
    padding: '16px 24px',
    borderTop: '1px solid #e5e7eb',
    backgroundColor: '#f9fafb',
    borderRadius: '0 0 12px 12px',
  },
  button: {
    padding: '10px 20px',
    fontSize: '14px',
    fontWeight: 500,
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    border: 'none',
  },
  cancelButton: {
    backgroundColor: '#f3f4f6',
    color: '#374151',
  },
  confirmButton: {
    color: '#ffffff',
  },
  disabledButton: {
    opacity: 0.6,
    cursor: 'not-allowed',
  },
}

/**
 * FlagActionModal - Confirmation modal for flag actions
 */
export function FlagActionModal({
  action,
  onConfirm,
  onCancel,
  isLoading = false,
}: FlagActionModalProps) {
  const [note, setNote] = useState('')
  const cancelButtonRef = useRef<HTMLButtonElement>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)
  const config = ACTION_CONFIG[action]

  // Focus management
  useEffect(() => {
    previousFocusRef.current = document.activeElement as HTMLElement
    cancelButtonRef.current?.focus()

    return () => {
      previousFocusRef.current?.focus()
    }
  }, [])

  // Body scroll lock
  useEffect(() => {
    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = originalOverflow
    }
  }, [])

  // Handle keyboard events
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isLoading) {
        onCancel()
      }
    },
    [onCancel, isLoading]
  )

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  // Handle backdrop click
  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && !isLoading) {
      onCancel()
    }
  }

  // Handle confirmation
  const handleConfirm = () => {
    if (isLoading) return
    onConfirm(note.trim() || undefined)
  }

  return (
    <div
      style={styles.overlay}
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="action-modal-title"
      data-testid="flag-action-modal"
    >
      <style>
        {`
          @keyframes fadeIn {
            from { opacity: 0; transform: scale(0.95); }
            to { opacity: 1; transform: scale(1); }
          }
          .cancel-btn:hover:not(:disabled) {
            background-color: #e5e7eb;
          }
          .confirm-btn:hover:not(:disabled) {
            filter: brightness(1.1);
          }
          .note-input:focus {
            outline: none;
            border-color: #8b5cf6;
            box-shadow: 0 0 0 2px rgba(139, 92, 246, 0.2);
          }
        `}
      </style>

      <div style={styles.modal} role="document">
        <div style={styles.header}>
          <h2 id="action-modal-title" style={styles.title}>
            {config.title}
          </h2>
        </div>

        <div style={styles.content}>
          <p style={styles.description}>{config.description}</p>

          <label style={styles.noteLabel}>
            Add a note (optional)
            <textarea
              style={styles.noteInput}
              className="note-input"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Add context or notes about this flag..."
              data-testid="action-note-input"
              disabled={isLoading}
            />
          </label>
          <p style={styles.noteHint}>Notes are visible to all guardians in the family.</p>
        </div>

        <div style={styles.footer}>
          <button
            ref={cancelButtonRef}
            type="button"
            style={{
              ...styles.button,
              ...styles.cancelButton,
              ...(isLoading ? styles.disabledButton : {}),
            }}
            className="cancel-btn"
            onClick={onCancel}
            disabled={isLoading}
            data-testid="action-cancel"
          >
            Cancel
          </button>
          <button
            type="button"
            style={{
              ...styles.button,
              ...styles.confirmButton,
              backgroundColor: config.buttonColor,
              ...(isLoading ? styles.disabledButton : {}),
            }}
            className="confirm-btn"
            onClick={handleConfirm}
            disabled={isLoading}
            data-testid="action-confirm"
          >
            {isLoading ? 'Processing...' : config.buttonText}
          </button>
        </div>
      </div>
    </div>
  )
}

export default FlagActionModal
