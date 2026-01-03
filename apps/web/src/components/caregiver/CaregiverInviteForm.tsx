'use client'

/**
 * CaregiverInviteForm - Story 19D.1, Story 39.1
 *
 * Form for parents to invite a caregiver with limited status-only access.
 * Allows selecting which children the caregiver can view.
 *
 * Implements:
 * - AC1: Parent invites a caregiver from family settings
 * - AC2: Caregiver role is "Status Viewer"
 * - AC5: Parent can set which children caregiver can see
 *
 * Story 39.1 additions:
 * - AC1: Relationship field (grandparent, aunt/uncle, babysitter, other)
 * - AC2: Maximum 5 caregivers limit display
 *
 * Uses React.CSSProperties inline styles per project pattern.
 */

import { useState, useCallback } from 'react'
import { useChildren, type ChildSummary } from '../../hooks/useChildren'
import { useCaregiverLimit } from '../../hooks/useCaregiverLimit'
import { sendCaregiverInvitation, isValidEmail } from '../../services/caregiverInvitationService'
import type { CaregiverRelationship } from '@fledgely/shared/contracts'

/** Relationship options for dropdown */
const RELATIONSHIP_OPTIONS: { value: CaregiverRelationship; label: string }[] = [
  { value: 'grandparent', label: 'Grandparent' },
  { value: 'aunt_uncle', label: 'Aunt/Uncle' },
  { value: 'babysitter', label: 'Babysitter' },
  { value: 'other', label: 'Other' },
]

interface CaregiverInviteFormProps {
  familyId: string
  onSuccess?: (invitationId: string) => void
  onCancel?: () => void
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    padding: '24px',
    maxWidth: '480px',
    width: '100%',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '16px',
  },
  icon: {
    width: '48px',
    height: '48px',
    borderRadius: '50%',
    backgroundColor: '#ede9fe',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '24px',
    color: '#7c3aed',
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
    marginBottom: '20px',
  },
  infoBox: {
    backgroundColor: '#f0fdf4',
    border: '1px solid #86efac',
    borderRadius: '8px',
    padding: '14px 16px',
    marginBottom: '20px',
  },
  infoText: {
    color: '#166534',
    fontSize: '14px',
    margin: 0,
    lineHeight: 1.5,
  },
  formGroup: {
    marginBottom: '20px',
  },
  label: {
    display: 'block',
    fontSize: '14px',
    fontWeight: 500,
    color: '#374151',
    marginBottom: '6px',
  },
  input: {
    width: '100%',
    minHeight: '44px',
    padding: '10px 14px',
    fontSize: '14px',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    outline: 'none',
    boxSizing: 'border-box' as const,
  },
  inputError: {
    border: '1px solid #dc2626',
  },
  inputHint: {
    fontSize: '12px',
    color: '#6b7280',
    marginTop: '4px',
  },
  inputErrorText: {
    fontSize: '12px',
    color: '#dc2626',
    marginTop: '4px',
  },
  childrenSection: {
    marginBottom: '20px',
  },
  childrenLabel: {
    display: 'block',
    fontSize: '14px',
    fontWeight: 500,
    color: '#374151',
    marginBottom: '8px',
  },
  childrenHint: {
    fontSize: '12px',
    color: '#6b7280',
    marginBottom: '12px',
  },
  childList: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '8px',
  },
  childItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px',
    backgroundColor: '#f9fafb',
    borderRadius: '8px',
    cursor: 'pointer',
    border: '2px solid transparent',
    transition: 'all 0.2s ease',
  },
  childItemSelected: {
    backgroundColor: '#ede9fe',
    border: '2px solid #7c3aed',
  },
  checkbox: {
    width: '20px',
    height: '20px',
    accentColor: '#7c3aed',
    cursor: 'pointer',
  },
  childName: {
    fontSize: '14px',
    color: '#1f2937',
    fontWeight: 500,
  },
  buttonGroup: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'flex-end',
    marginTop: '24px',
  },
  primaryButton: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '44px',
    padding: '12px 24px',
    backgroundColor: '#7c3aed',
    color: '#ffffff',
    fontSize: '14px',
    fontWeight: 500,
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'background-color 0.2s ease',
  },
  primaryButtonDisabled: {
    backgroundColor: '#a78bfa',
    cursor: 'not-allowed',
  },
  secondaryButton: {
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
  errorMessage: {
    backgroundColor: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: '8px',
    padding: '12px 16px',
    marginBottom: '16px',
    color: '#dc2626',
    fontSize: '14px',
  },
  successMessage: {
    backgroundColor: '#dcfce7',
    border: '1px solid #86efac',
    borderRadius: '8px',
    padding: '12px 16px',
    marginBottom: '16px',
    color: '#166534',
    fontSize: '14px',
  },
  loadingSpinner: {
    display: 'inline-block',
    width: '16px',
    height: '16px',
    border: '2px solid #ffffff',
    borderTopColor: 'transparent',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    marginRight: '8px',
  },
  // Story 39.1: Relationship dropdown styles
  select: {
    width: '100%',
    minHeight: '44px',
    padding: '10px 14px',
    fontSize: '14px',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    outline: 'none',
    boxSizing: 'border-box' as const,
    backgroundColor: '#ffffff',
    cursor: 'pointer',
  },
  // Story 39.1: Limit display styles
  limitBanner: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f3f4f6',
    borderRadius: '8px',
    padding: '12px 16px',
    marginBottom: '20px',
  },
  limitText: {
    fontSize: '14px',
    color: '#374151',
    margin: 0,
  },
  limitCount: {
    fontWeight: 600,
    color: '#7c3aed',
  },
  limitWarning: {
    backgroundColor: '#fef3c7',
    border: '1px solid #fcd34d',
    borderRadius: '8px',
    padding: '12px 16px',
    marginBottom: '20px',
  },
  limitWarningText: {
    color: '#92400e',
    fontSize: '14px',
    margin: 0,
  },
}

export default function CaregiverInviteForm({
  familyId,
  onSuccess,
  onCancel,
}: CaregiverInviteFormProps) {
  const [email, setEmail] = useState('')
  const [emailError, setEmailError] = useState<string | null>(null)
  const [selectedChildIds, setSelectedChildIds] = useState<string[]>([])
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  // Story 39.1: Relationship state
  const [relationship, setRelationship] = useState<CaregiverRelationship>('grandparent')
  const [customRelationship, setCustomRelationship] = useState('')

  const {
    children,
    loading: loadingChildren,
    error: childrenError,
  } = useChildren({
    familyId,
    enabled: true,
  })

  // Story 39.1: Get caregiver limit info
  const { limit, loading: loadingLimit } = useCaregiverLimit({
    familyId,
    enabled: true,
  })

  // Validate email on change
  const handleEmailChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setEmail(value)
    setError(null)
    setSuccess(null)

    if (value && !isValidEmail(value)) {
      setEmailError('Please enter a valid email address')
    } else {
      setEmailError(null)
    }
  }, [])

  // Toggle child selection (AC5)
  const handleChildToggle = useCallback((childId: string) => {
    setSelectedChildIds((prev) => {
      if (prev.includes(childId)) {
        return prev.filter((id) => id !== childId)
      }
      return [...prev, childId]
    })
    setError(null)
  }, [])

  // Select all children
  const handleSelectAll = useCallback(() => {
    if (selectedChildIds.length === children.length) {
      setSelectedChildIds([])
    } else {
      setSelectedChildIds(children.map((c) => c.id))
    }
  }, [children, selectedChildIds.length])

  // Handle relationship change (Story 39.1)
  const handleRelationshipChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value as CaregiverRelationship
    setRelationship(value)
    if (value !== 'other') {
      setCustomRelationship('')
    }
    setError(null)
  }, [])

  // Handle custom relationship change (Story 39.1)
  const handleCustomRelationshipChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setCustomRelationship(e.target.value)
    setError(null)
  }, [])

  // Handle form submission
  const handleSubmit = useCallback(async () => {
    if (!email || emailError || selectedChildIds.length === 0) {
      if (!email) {
        setEmailError('Email is required')
      }
      if (selectedChildIds.length === 0) {
        setError('Please select at least one child')
      }
      return
    }

    // Story 39.1: Validate custom relationship if "other" selected
    if (relationship === 'other' && !customRelationship.trim()) {
      setError('Please enter a custom relationship')
      return
    }

    setSending(true)
    setError(null)
    setSuccess(null)

    try {
      // Story 39.1: Include relationship in invitation
      const result = await sendCaregiverInvitation(
        familyId,
        email,
        selectedChildIds,
        relationship,
        relationship === 'other' ? customRelationship.trim() : undefined
      )

      if (result.success) {
        setSuccess(result.message)
        setEmail('')
        setSelectedChildIds([])
        setRelationship('grandparent')
        setCustomRelationship('')
        if (onSuccess && result.invitationId) {
          onSuccess(result.invitationId)
        }
      } else {
        setError(result.message)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send invitation')
    } finally {
      setSending(false)
    }
  }, [email, emailError, selectedChildIds, familyId, relationship, customRelationship, onSuccess])

  // Story 39.1: Disable submit if at limit or missing required fields
  const isAtLimit = limit?.isAtLimit ?? false
  const isSubmitDisabled =
    sending ||
    !email ||
    !!emailError ||
    selectedChildIds.length === 0 ||
    isAtLimit ||
    (relationship === 'other' && !customRelationship.trim())

  return (
    <div style={styles.container} data-testid="caregiver-invite-form">
      <style>
        {`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
          .invite-form-input:focus {
            outline: none;
            border-color: #7c3aed;
            box-shadow: 0 0 0 3px rgba(124, 58, 237, 0.1);
          }
          .invite-form-button:focus {
            outline: 2px solid #7c3aed;
            outline-offset: 2px;
          }
          .invite-form-secondary:hover:not(:disabled) {
            background-color: #f9fafb;
            border-color: #9ca3af;
          }
        `}
      </style>

      <div style={styles.header}>
        <div style={styles.icon} aria-hidden="true">
          👀
        </div>
        <h2 style={styles.title}>Invite a Status Viewer</h2>
      </div>

      <p style={styles.description}>
        Invite a grandparent or other trusted adult to see how your children are doing. They will
        only be able to view status updates, not make any changes.
      </p>

      <div style={styles.infoBox}>
        <p style={styles.infoText}>
          <strong>Status Viewer access means:</strong> They can see if children are on track with
          their screen time. They cannot view detailed activity, make changes, or access settings.
        </p>
      </div>

      {/* Story 39.1: Caregiver limit display */}
      {!loadingLimit && limit && (
        <>
          {limit.isAtLimit ? (
            <div style={styles.limitWarning} data-testid="limit-warning">
              <p style={styles.limitWarningText}>
                You have reached the maximum of {limit.maxAllowed} caregivers. Remove an existing
                caregiver or cancel a pending invitation to add a new one.
              </p>
            </div>
          ) : (
            <div style={styles.limitBanner} data-testid="limit-banner">
              <p style={styles.limitText}>
                <span style={styles.limitCount}>{limit.activeCount}</span> of {limit.maxAllowed}{' '}
                caregivers
                {limit.pendingCount > 0 && <span> ({limit.pendingCount} pending)</span>}
              </p>
              <p style={styles.limitText}>You can add {limit.remaining} more</p>
            </div>
          )}
        </>
      )}

      {error && (
        <div style={styles.errorMessage} role="alert" data-testid="error-message">
          {error}
        </div>
      )}

      {success && (
        <div style={styles.successMessage} role="status" data-testid="success-message">
          {success}
        </div>
      )}

      {/* Email input */}
      <div style={styles.formGroup}>
        <label htmlFor="caregiver-email" style={styles.label}>
          Email address
        </label>
        <input
          id="caregiver-email"
          type="email"
          value={email}
          onChange={handleEmailChange}
          placeholder="grandparent@example.com"
          disabled={sending}
          aria-invalid={!!emailError}
          aria-describedby={emailError ? 'email-error' : 'email-hint'}
          style={{
            ...styles.input,
            ...(emailError ? styles.inputError : {}),
          }}
          className="invite-form-input"
          data-testid="email-input"
        />
        {emailError ? (
          <p id="email-error" style={styles.inputErrorText} role="alert">
            {emailError}
          </p>
        ) : (
          <p id="email-hint" style={styles.inputHint}>
            They will receive an invitation email with a link to join
          </p>
        )}
      </div>

      {/* Story 39.1: Relationship selection */}
      <div style={styles.formGroup}>
        <label htmlFor="caregiver-relationship" style={styles.label}>
          Relationship
        </label>
        <select
          id="caregiver-relationship"
          value={relationship}
          onChange={handleRelationshipChange}
          disabled={sending || isAtLimit}
          style={styles.select}
          className="invite-form-input"
          data-testid="relationship-select"
        >
          {RELATIONSHIP_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {/* Story 39.1: Custom relationship text for "other" */}
      {relationship === 'other' && (
        <div style={styles.formGroup}>
          <label htmlFor="custom-relationship" style={styles.label}>
            Describe relationship
          </label>
          <input
            id="custom-relationship"
            type="text"
            value={customRelationship}
            onChange={handleCustomRelationshipChange}
            placeholder="e.g., Family friend, Neighbor"
            disabled={sending || isAtLimit}
            maxLength={50}
            style={styles.input}
            className="invite-form-input"
            data-testid="custom-relationship-input"
          />
          <p style={styles.inputHint}>Maximum 50 characters</p>
        </div>
      )}

      {/* Child selection (AC5) */}
      <div style={styles.childrenSection}>
        <label style={styles.childrenLabel}>Which children can they view?</label>
        <p style={styles.childrenHint}>
          Select which children this person can see status updates for
        </p>

        {loadingChildren ? (
          <p data-testid="loading-children">Loading children...</p>
        ) : childrenError ? (
          <p style={{ color: '#dc2626' }}>{childrenError}</p>
        ) : children.length === 0 ? (
          <p>No children in this family yet.</p>
        ) : (
          <>
            <div style={{ marginBottom: '8px' }}>
              <button
                type="button"
                onClick={handleSelectAll}
                style={{
                  ...styles.secondaryButton,
                  padding: '8px 16px',
                  minHeight: 'auto',
                  fontSize: '13px',
                }}
                className="invite-form-secondary"
                data-testid="select-all-button"
              >
                {selectedChildIds.length === children.length ? 'Deselect all' : 'Select all'}
              </button>
            </div>
            <div style={styles.childList} role="group" aria-label="Select children">
              {children.map((child: ChildSummary) => {
                const isSelected = selectedChildIds.includes(child.id)
                return (
                  <label
                    key={child.id}
                    style={{
                      ...styles.childItem,
                      ...(isSelected ? styles.childItemSelected : {}),
                    }}
                    data-testid={`child-item-${child.id}`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleChildToggle(child.id)}
                      style={styles.checkbox}
                      disabled={sending}
                      data-testid={`child-checkbox-${child.id}`}
                    />
                    <span style={styles.childName}>{child.name}</span>
                  </label>
                )
              })}
            </div>
          </>
        )}
      </div>

      {/* Action buttons */}
      <div style={styles.buttonGroup}>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={sending}
            style={styles.secondaryButton}
            className="invite-form-button invite-form-secondary"
            data-testid="cancel-button"
          >
            Cancel
          </button>
        )}
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isSubmitDisabled}
          style={{
            ...styles.primaryButton,
            ...(isSubmitDisabled ? styles.primaryButtonDisabled : {}),
          }}
          className="invite-form-button"
          aria-busy={sending}
          data-testid="submit-button"
        >
          {sending ? (
            <>
              <span style={styles.loadingSpinner} aria-hidden="true" />
              Sending...
            </>
          ) : (
            'Send Invitation'
          )}
        </button>
      </div>
    </div>
  )
}
