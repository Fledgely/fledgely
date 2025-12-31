'use client'

/**
 * FlagCorrectionModal Component - Story 24.1
 *
 * Modal for correcting AI misclassifications.
 *
 * Acceptance Criteria:
 * - AC1: "Correct this" option available
 * - AC2: Dropdown shows available categories
 * - AC3: Correction saved with original/corrected category
 * - AC4: Acknowledgment message shown
 */

import { useState, useCallback, useEffect, useRef } from 'react'
import { CONCERN_CATEGORY_VALUES, type ConcernCategory } from '@fledgely/shared'
import { correctFlagCategory } from '../../services/flagService'

/**
 * Category display names for user-friendly labels
 */
const CATEGORY_DISPLAY_NAMES: Record<ConcernCategory, string> = {
  Violence: 'Violence',
  'Adult Content': 'Adult Content',
  Bullying: 'Bullying',
  'Self-Harm Indicators': 'Self-Harm Indicators',
  'Explicit Language': 'Explicit Language',
  'Unknown Contacts': 'Unknown Contacts',
}

/**
 * Styles for the correction modal
 */
const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    inset: 0,
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
    maxWidth: '400px',
    width: '100%',
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
  },
  header: {
    marginBottom: '20px',
  },
  title: {
    fontSize: '1.25rem',
    fontWeight: 600,
    color: '#1f2937',
    margin: 0,
    marginBottom: '8px',
  },
  subtitle: {
    fontSize: '0.875rem',
    color: '#6b7280',
    margin: 0,
  },
  currentCategory: {
    backgroundColor: '#f3f4f6',
    borderRadius: '8px',
    padding: '12px',
    marginBottom: '16px',
  },
  currentLabel: {
    fontSize: '0.75rem',
    color: '#6b7280',
    marginBottom: '4px',
  },
  currentValue: {
    fontSize: '0.875rem',
    fontWeight: 500,
    color: '#374151',
  },
  selectContainer: {
    marginBottom: '20px',
  },
  selectLabel: {
    display: 'block',
    fontSize: '0.875rem',
    fontWeight: 500,
    color: '#374151',
    marginBottom: '8px',
  },
  select: {
    width: '100%',
    padding: '10px 12px',
    fontSize: '0.875rem',
    borderRadius: '8px',
    border: '1px solid #d1d5db',
    backgroundColor: '#ffffff',
    color: '#1f2937',
    cursor: 'pointer',
    appearance: 'none' as const,
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3E%3Cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3E%3C/svg%3E")`,
    backgroundPosition: 'right 8px center',
    backgroundRepeat: 'no-repeat',
    backgroundSize: '16px',
  },
  actions: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'flex-end',
  },
  cancelButton: {
    padding: '10px 20px',
    fontSize: '0.875rem',
    fontWeight: 500,
    borderRadius: '8px',
    border: '1px solid #d1d5db',
    backgroundColor: '#ffffff',
    color: '#374151',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  submitButton: {
    padding: '10px 20px',
    fontSize: '0.875rem',
    fontWeight: 500,
    borderRadius: '8px',
    border: 'none',
    backgroundColor: '#3b82f6',
    color: '#ffffff',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  submitButtonDisabled: {
    padding: '10px 20px',
    fontSize: '0.875rem',
    fontWeight: 500,
    borderRadius: '8px',
    border: 'none',
    backgroundColor: '#9ca3af',
    color: '#ffffff',
    cursor: 'not-allowed',
  },
  error: {
    backgroundColor: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: '8px',
    padding: '12px',
    marginBottom: '16px',
    color: '#991b1b',
    fontSize: '0.875rem',
  },
  success: {
    textAlign: 'center' as const,
    padding: '24px',
  },
  successIcon: {
    fontSize: '3rem',
    marginBottom: '16px',
  },
  successTitle: {
    fontSize: '1.125rem',
    fontWeight: 600,
    color: '#065f46',
    marginBottom: '8px',
  },
  successMessage: {
    fontSize: '0.875rem',
    color: '#047857',
  },
}

export interface FlagCorrectionModalProps {
  /** Whether the modal is open */
  isOpen: boolean
  /** Callback when modal should close */
  onClose: () => void
  /** Flag ID being corrected */
  flagId: string
  /** Child ID the flag belongs to */
  childId: string
  /** Current/original category */
  currentCategory: ConcernCategory
  /** Parent ID making the correction */
  parentId: string
  /** Parent display name */
  parentName: string
  /** Callback when correction is successful */
  onCorrected?: (newCategory: ConcernCategory) => void
}

export function FlagCorrectionModal({
  isOpen,
  onClose,
  flagId,
  childId,
  currentCategory,
  parentId,
  parentName,
  onCorrected,
}: FlagCorrectionModalProps) {
  const [selectedCategory, setSelectedCategory] = useState<ConcernCategory>(currentCategory)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const modalRef = useRef<HTMLDivElement>(null)

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedCategory(currentCategory)
      setError(null)
      setSuccess(false)
    }
  }, [isOpen, currentCategory])

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !submitting) {
        onClose()
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose, submitting])

  // Focus trap
  useEffect(() => {
    if (isOpen && modalRef.current) {
      modalRef.current.focus()
    }
  }, [isOpen])

  const handleSubmit = useCallback(async () => {
    if (selectedCategory === currentCategory) {
      setError('Please select a different category')
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      const result = await correctFlagCategory({
        flagId,
        childId,
        correctedCategory: selectedCategory,
        parentId,
        parentName,
      })

      if (result.success) {
        setSuccess(true)
        onCorrected?.(selectedCategory)

        // Auto-close after showing success
        setTimeout(() => {
          onClose()
        }, 2000)
      } else {
        setError(result.error || 'Failed to submit correction')
      }
    } catch (error) {
      // Handle unexpected errors (network failures, etc.)
      // eslint-disable-next-line no-console
      console.error('Unexpected error during correction:', error)
      setError('Connection error. Please check your internet and try again.')
    } finally {
      setSubmitting(false)
    }
  }, [
    selectedCategory,
    currentCategory,
    flagId,
    childId,
    parentId,
    parentName,
    onCorrected,
    onClose,
  ])

  const handleOverlayClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget && !submitting) {
        onClose()
      }
    },
    [onClose, submitting]
  )

  if (!isOpen) return null

  const canSubmit = selectedCategory !== currentCategory && !submitting

  return (
    <div
      style={styles.overlay}
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="correction-modal-title"
      data-testid="flag-correction-modal"
    >
      <div style={styles.modal} ref={modalRef} tabIndex={-1}>
        {success ? (
          <div style={styles.success} data-testid="correction-success">
            <div style={styles.successIcon}>✅</div>
            <div style={styles.successTitle}>Thanks! We&apos;ll learn from this</div>
            <div style={styles.successMessage}>
              Your correction helps improve AI accuracy for your family.
            </div>
          </div>
        ) : (
          <>
            <div style={styles.header}>
              <h2 id="correction-modal-title" style={styles.title}>
                Correct Classification
              </h2>
              <p style={styles.subtitle}>Help us improve by selecting the correct category</p>
            </div>

            {error && (
              <div style={styles.error} role="alert" data-testid="correction-error">
                {error}
              </div>
            )}

            <div style={styles.currentCategory}>
              <div style={styles.currentLabel}>AI classified as:</div>
              <div style={styles.currentValue}>{CATEGORY_DISPLAY_NAMES[currentCategory]}</div>
            </div>

            <div style={styles.selectContainer}>
              <label htmlFor="category-select" style={styles.selectLabel}>
                Select the correct category:
              </label>
              <select
                id="category-select"
                style={styles.select}
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value as ConcernCategory)}
                disabled={submitting}
                data-testid="category-select"
              >
                {CONCERN_CATEGORY_VALUES.map((category) => (
                  <option key={category} value={category}>
                    {CATEGORY_DISPLAY_NAMES[category]}
                    {category === currentCategory ? ' (current)' : ''}
                  </option>
                ))}
              </select>
            </div>

            <div style={styles.actions}>
              <button
                type="button"
                style={styles.cancelButton}
                onClick={onClose}
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                type="button"
                style={canSubmit ? styles.submitButton : styles.submitButtonDisabled}
                onClick={handleSubmit}
                disabled={!canSubmit}
                data-testid="submit-correction"
              >
                {submitting ? 'Submitting...' : 'Submit Correction'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
