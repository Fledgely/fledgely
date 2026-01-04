'use client'

/**
 * TrustedAdultInviteForm - Story 52.4 Task 4.1
 *
 * Form component for parents to invite a trusted adult.
 *
 * AC1: Designate Trusted Adult
 *   - Email and name inputs for trusted adult
 *   - Validates email format and name length
 *   - Sends invitation on submit
 */

import { useState, useCallback } from 'react'
import { httpsCallable } from 'firebase/functions'
import { functions } from '../../lib/firebase'
import { validateTrustedAdultEmail, validateTrustedAdultName } from '@fledgely/shared'

interface TrustedAdultInviteFormProps {
  familyId: string
  childId: string
  onSuccess: () => void
  onCancel: () => void
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    width: '100%',
    maxWidth: '400px',
    padding: '24px',
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
  },
  title: {
    fontSize: '1.25rem',
    fontWeight: 600,
    color: '#1f2937',
    margin: '0 0 8px 0',
  },
  description: {
    fontSize: '14px',
    color: '#6b7280',
    margin: '0 0 24px 0',
    lineHeight: 1.5,
  },
  form: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '16px',
  },
  fieldGroup: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '4px',
  },
  label: {
    fontSize: '14px',
    fontWeight: 500,
    color: '#374151',
  },
  input: {
    width: '100%',
    padding: '12px',
    fontSize: '16px',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    outline: 'none',
    boxSizing: 'border-box' as const,
  },
  inputError: {
    borderColor: '#ef4444',
  },
  errorText: {
    fontSize: '12px',
    color: '#ef4444',
    margin: 0,
  },
  buttonGroup: {
    display: 'flex',
    gap: '12px',
    marginTop: '8px',
  },
  submitButton: {
    flex: 1,
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
  submitButtonDisabled: {
    backgroundColor: '#a78bfa',
    cursor: 'not-allowed',
  },
  cancelButton: {
    flex: 1,
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
  successMessage: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '12px 16px',
    backgroundColor: '#ecfdf5',
    color: '#059669',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 500,
  },
  errorMessage: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '12px 16px',
    backgroundColor: '#fef2f2',
    color: '#dc2626',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 500,
  },
  infoBox: {
    padding: '12px 16px',
    backgroundColor: '#f3f4f6',
    borderRadius: '8px',
    fontSize: '13px',
    color: '#4b5563',
    lineHeight: 1.5,
  },
}

export default function TrustedAdultInviteForm({
  familyId: _familyId,
  childId,
  onSuccess,
  onCancel,
}: TrustedAdultInviteFormProps) {
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [emailError, setEmailError] = useState<string | null>(null)
  const [nameError, setNameError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const validateForm = useCallback((): boolean => {
    let valid = true

    // Validate email
    const emailValidation = validateTrustedAdultEmail(email)
    if (!emailValidation.valid) {
      setEmailError(emailValidation.error || 'Invalid email')
      valid = false
    } else {
      setEmailError(null)
    }

    // Validate name
    const nameValidation = validateTrustedAdultName(name)
    if (!nameValidation.valid) {
      setNameError(nameValidation.error || 'Invalid name')
      valid = false
    } else {
      setNameError(null)
    }

    return valid
  }, [email, name])

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()

      if (!validateForm()) {
        return
      }

      setSubmitting(true)
      setSubmitError(null)

      try {
        const inviteTrustedAdult = httpsCallable(functions, 'inviteTrustedAdultCallable')
        await inviteTrustedAdult({
          email: email.trim(),
          name: name.trim(),
          childId,
        })

        setSuccess(true)
        setTimeout(() => {
          onSuccess()
        }, 1500)
      } catch (err) {
        console.error('Failed to invite trusted adult:', err)
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to send invitation. Please try again.'
        setSubmitError(errorMessage)
      } finally {
        setSubmitting(false)
      }
    },
    [email, name, childId, validateForm, onSuccess]
  )

  if (success) {
    return (
      <div style={styles.container} data-testid="invite-success">
        <div style={styles.successMessage}>
          <span aria-hidden="true">&#x2714;</span>
          Invitation sent successfully!
        </div>
      </div>
    )
  }

  return (
    <div style={styles.container} data-testid="trusted-adult-invite-form">
      <h2 style={styles.title}>Invite Trusted Adult</h2>
      <p style={styles.description}>
        Invite a trusted adult to have view-only access to your child&apos;s activity data.
      </p>

      <form style={styles.form} onSubmit={handleSubmit}>
        <div style={styles.fieldGroup}>
          <label htmlFor="ta-name" style={styles.label}>
            Name
          </label>
          <input
            id="ta-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter their name"
            style={{
              ...styles.input,
              ...(nameError ? styles.inputError : {}),
            }}
            disabled={submitting}
            data-testid="name-input"
          />
          {nameError && <p style={styles.errorText}>{nameError}</p>}
        </div>

        <div style={styles.fieldGroup}>
          <label htmlFor="ta-email" style={styles.label}>
            Email Address
          </label>
          <input
            id="ta-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="email@example.com"
            style={{
              ...styles.input,
              ...(emailError ? styles.inputError : {}),
            }}
            disabled={submitting}
            data-testid="email-input"
          />
          {emailError && <p style={styles.errorText}>{emailError}</p>}
        </div>

        <div style={styles.infoBox}>
          <strong>Note:</strong> The trusted adult will receive an email invitation. If your child
          is 16 or older, they will need to approve the trusted adult before they can view any data.
        </div>

        {submitError && (
          <div style={styles.errorMessage} data-testid="submit-error">
            <span aria-hidden="true">&#x26A0;</span>
            {submitError}
          </div>
        )}

        <div style={styles.buttonGroup}>
          <button
            type="button"
            onClick={onCancel}
            style={styles.cancelButton}
            disabled={submitting}
            data-testid="cancel-button"
          >
            Cancel
          </button>
          <button
            type="submit"
            style={{
              ...styles.submitButton,
              ...(submitting ? styles.submitButtonDisabled : {}),
            }}
            disabled={submitting}
            data-testid="submit-button"
          >
            {submitting ? 'Sending...' : 'Send Invitation'}
          </button>
        </div>
      </form>
    </div>
  )
}
