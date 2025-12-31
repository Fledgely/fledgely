'use client'

/**
 * AppApprovalModal Component - Story 24.3
 *
 * Modal for setting per-app, per-category approval preferences.
 *
 * Acceptance Criteria:
 * - AC2: Parent can mark "YouTube Kids = Educational (approved)"
 * - AC3: Approval reduces flag sensitivity
 * - AC4: Disapproval increases flag sensitivity
 * - AC7: Child-specific preferences
 */

import { useState, useCallback, useEffect, useRef } from 'react'
import {
  CONCERN_CATEGORY_VALUES,
  APP_APPROVAL_STATUS_VALUES,
  type ConcernCategory,
  type AppApprovalStatus,
} from '@fledgely/shared'
import {
  setAppCategoryApproval,
  removeAppCategoryApproval,
} from '../../services/appApprovalService'

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
 * Status display names and descriptions
 */
const STATUS_OPTIONS: Record<AppApprovalStatus, { label: string; description: string }> = {
  approved: {
    label: 'Approved',
    description: 'Reduce sensitivity - fewer flags for this category in this app',
  },
  disapproved: {
    label: 'Disapproved',
    description: 'Increase sensitivity - more flags for this category in this app',
  },
  neutral: {
    label: 'Neutral',
    description: 'Use default sensitivity',
  },
}

/**
 * Styles for the approval modal
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
    maxWidth: '450px',
    width: '100%',
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
    maxHeight: '90vh',
    overflow: 'auto',
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
  appInfo: {
    backgroundColor: '#f3f4f6',
    borderRadius: '8px',
    padding: '12px',
    marginBottom: '16px',
  },
  appLabel: {
    fontSize: '0.75rem',
    color: '#6b7280',
    marginBottom: '4px',
  },
  appName: {
    fontSize: '1rem',
    fontWeight: 500,
    color: '#374151',
  },
  childInfo: {
    backgroundColor: '#eff6ff',
    borderRadius: '8px',
    padding: '12px',
    marginBottom: '16px',
  },
  childLabel: {
    fontSize: '0.75rem',
    color: '#3b82f6',
    marginBottom: '4px',
  },
  childName: {
    fontSize: '0.875rem',
    fontWeight: 500,
    color: '#1e40af',
  },
  selectContainer: {
    marginBottom: '16px',
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
  statusOptions: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '8px',
    marginBottom: '20px',
  },
  statusOption: {
    padding: '12px',
    border: '2px solid #e5e7eb',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  statusOptionSelected: {
    padding: '12px',
    border: '2px solid #3b82f6',
    borderRadius: '8px',
    cursor: 'pointer',
    backgroundColor: '#eff6ff',
    transition: 'all 0.15s ease',
  },
  statusLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '0.875rem',
    fontWeight: 500,
    color: '#374151',
  },
  statusDescription: {
    fontSize: '0.75rem',
    color: '#6b7280',
    marginTop: '4px',
    marginLeft: '24px',
  },
  radio: {
    width: '16px',
    height: '16px',
    cursor: 'pointer',
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
  removeButton: {
    padding: '10px 20px',
    fontSize: '0.875rem',
    fontWeight: 500,
    borderRadius: '8px',
    border: '1px solid #fecaca',
    backgroundColor: '#fef2f2',
    color: '#991b1b',
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

export interface AppApprovalModalProps {
  /** Whether the modal is open */
  isOpen: boolean
  /** Callback when modal should close */
  onClose: () => void
  /** App identifier (domain or package name) */
  appIdentifier: string
  /** Human-readable app name */
  appDisplayName: string
  /** Child ID the approval applies to */
  childId: string
  /** Child display name */
  childName: string
  /** Family ID */
  familyId: string
  /** Parent UID setting the approval */
  parentId: string
  /** Pre-selected category (optional) */
  initialCategory?: ConcernCategory
  /** Pre-selected status (optional, for editing) */
  initialStatus?: AppApprovalStatus
  /** Whether this is an edit (shows remove button) */
  isEdit?: boolean
  /** Callback when approval is saved */
  onSaved?: () => void
}

export function AppApprovalModal({
  isOpen,
  onClose,
  appIdentifier,
  appDisplayName,
  childId,
  childName,
  familyId,
  parentId,
  initialCategory,
  initialStatus,
  isEdit = false,
  onSaved,
}: AppApprovalModalProps) {
  const [selectedCategory, setSelectedCategory] = useState<ConcernCategory>(
    initialCategory || 'Violence'
  )
  const [selectedStatus, setSelectedStatus] = useState<AppApprovalStatus>(
    initialStatus || 'neutral'
  )
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const modalRef = useRef<HTMLDivElement>(null)

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedCategory(initialCategory || 'Violence')
      setSelectedStatus(initialStatus || 'neutral')
      setError(null)
      setSuccess(false)
    }
  }, [isOpen, initialCategory, initialStatus])

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
    setSubmitting(true)
    setError(null)

    try {
      await setAppCategoryApproval({
        childId,
        familyId,
        appIdentifier,
        appDisplayName,
        category: selectedCategory,
        status: selectedStatus,
        setByUid: parentId,
      })

      setSuccess(true)
      onSaved?.()

      // Auto-close after showing success
      setTimeout(() => {
        onClose()
      }, 1500)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save preference'
      setError(errorMessage)
    } finally {
      setSubmitting(false)
    }
  }, [
    childId,
    familyId,
    appIdentifier,
    appDisplayName,
    selectedCategory,
    selectedStatus,
    parentId,
    onSaved,
    onClose,
  ])

  const handleRemove = useCallback(async () => {
    if (!isEdit) return

    setSubmitting(true)
    setError(null)

    try {
      await removeAppCategoryApproval(childId, appIdentifier, selectedCategory)

      setSuccess(true)
      onSaved?.()

      // Auto-close after showing success
      setTimeout(() => {
        onClose()
      }, 1500)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to remove preference'
      setError(errorMessage)
    } finally {
      setSubmitting(false)
    }
  }, [isEdit, childId, appIdentifier, selectedCategory, onSaved, onClose])

  const handleOverlayClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget && !submitting) {
        onClose()
      }
    },
    [onClose, submitting]
  )

  if (!isOpen) return null

  return (
    <div
      style={styles.overlay}
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="approval-modal-title"
      data-testid="app-approval-modal"
    >
      <div style={styles.modal} ref={modalRef} tabIndex={-1}>
        {success ? (
          <div style={styles.success} data-testid="approval-success">
            <div style={styles.successIcon}>✅</div>
            <div style={styles.successTitle}>Preference Saved</div>
            <div style={styles.successMessage}>
              AI will adjust sensitivity for this app accordingly.
            </div>
          </div>
        ) : (
          <>
            <div style={styles.header}>
              <h2 id="approval-modal-title" style={styles.title}>
                Set App Preference
              </h2>
              <p style={styles.subtitle}>Customize AI sensitivity for this app and category</p>
            </div>

            {error && (
              <div style={styles.error} role="alert" data-testid="approval-error">
                {error}
              </div>
            )}

            <div style={styles.appInfo}>
              <div style={styles.appLabel}>App:</div>
              <div style={styles.appName}>{appDisplayName}</div>
            </div>

            <div style={styles.childInfo}>
              <div style={styles.childLabel}>Applies to:</div>
              <div style={styles.childName}>{childName}</div>
            </div>

            <div style={styles.selectContainer}>
              <label htmlFor="category-select" style={styles.selectLabel}>
                Category:
              </label>
              <select
                id="category-select"
                style={styles.select}
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value as ConcernCategory)}
                disabled={submitting || isEdit}
                data-testid="category-select"
              >
                {CONCERN_CATEGORY_VALUES.map((category) => (
                  <option key={category} value={category}>
                    {CATEGORY_DISPLAY_NAMES[category]}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <div style={styles.selectLabel}>Preference:</div>
              <div style={styles.statusOptions}>
                {APP_APPROVAL_STATUS_VALUES.map((status) => (
                  <div
                    key={status}
                    style={
                      selectedStatus === status ? styles.statusOptionSelected : styles.statusOption
                    }
                    onClick={() => setSelectedStatus(status)}
                    data-testid={`status-option-${status}`}
                  >
                    <label style={styles.statusLabel}>
                      <input
                        type="radio"
                        name="approval-status"
                        value={status}
                        checked={selectedStatus === status}
                        onChange={() => setSelectedStatus(status)}
                        style={styles.radio}
                        disabled={submitting}
                      />
                      {STATUS_OPTIONS[status].label}
                    </label>
                    <div style={styles.statusDescription}>{STATUS_OPTIONS[status].description}</div>
                  </div>
                ))}
              </div>
            </div>

            <div style={styles.actions}>
              {isEdit && (
                <button
                  type="button"
                  style={styles.removeButton}
                  onClick={handleRemove}
                  disabled={submitting}
                  data-testid="remove-approval"
                >
                  Remove
                </button>
              )}
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
                style={submitting ? styles.submitButtonDisabled : styles.submitButton}
                onClick={handleSubmit}
                disabled={submitting}
                data-testid="save-approval"
              >
                {submitting ? 'Saving...' : 'Save Preference'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
