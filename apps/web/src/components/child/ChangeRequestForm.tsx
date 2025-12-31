/**
 * ChangeRequestForm Component - Story 19C.5
 *
 * Form for child to request changes to their family agreement.
 * Uses child-friendly language and empowering messaging.
 *
 * Task 1: Create ChangeRequestForm component (AC: #1, #2)
 */

import React, { useState } from 'react'

/**
 * Inline styles using React.CSSProperties (NOT Tailwind per Epic 19B pattern)
 */
const styles: Record<string, React.CSSProperties> = {
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  fieldGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  label: {
    color: '#0369a1',
    fontSize: '14px',
    fontWeight: 600,
  },
  input: {
    width: '100%',
    padding: '12px',
    fontSize: '14px',
    borderRadius: '8px',
    border: '2px solid #e0f2fe',
    backgroundColor: '#ffffff',
    color: '#334155',
    outline: 'none',
    transition: 'border-color 0.2s ease',
    boxSizing: 'border-box' as const,
  },
  inputFocused: {
    borderColor: '#0ea5e9',
  },
  textarea: {
    width: '100%',
    padding: '12px',
    fontSize: '14px',
    borderRadius: '8px',
    border: '2px solid #e0f2fe',
    backgroundColor: '#ffffff',
    color: '#334155',
    outline: 'none',
    transition: 'border-color 0.2s ease',
    minHeight: '80px',
    resize: 'vertical' as const,
    fontFamily: 'inherit',
    boxSizing: 'border-box' as const,
  },
  optionalTag: {
    color: '#94a3b8',
    fontSize: '12px',
    fontWeight: 400,
    marginLeft: '4px',
  },
  buttonGroup: {
    display: 'flex',
    gap: '12px',
    marginTop: '8px',
  },
  submitButton: {
    flex: 1,
    padding: '14px 20px',
    backgroundColor: '#0ea5e9',
    color: '#ffffff',
    fontSize: '14px',
    fontWeight: 600,
    border: 'none',
    borderRadius: '12px',
    cursor: 'pointer',
    transition: 'background-color 0.2s ease',
  },
  submitButtonDisabled: {
    backgroundColor: '#94a3b8',
    cursor: 'not-allowed',
  },
  cancelButton: {
    padding: '14px 20px',
    backgroundColor: '#ffffff',
    color: '#64748b',
    fontSize: '14px',
    fontWeight: 500,
    border: '2px solid #e2e8f0',
    borderRadius: '12px',
    cursor: 'pointer',
    transition: 'border-color 0.2s ease',
  },
  hint: {
    color: '#64748b',
    fontSize: '12px',
    marginTop: '4px',
  },
  error: {
    color: '#dc2626',
    fontSize: '12px',
    marginTop: '4px',
  },
}

/**
 * Data submitted by the change request form
 */
export interface ChangeRequestData {
  whatToChange: string
  why: string | null
}

interface ChangeRequestFormProps {
  /** Handler called when form is submitted */
  onSubmit: (data: ChangeRequestData) => Promise<void>
  /** Handler called when form is cancelled */
  onCancel: () => void
  /** Whether the form is currently submitting */
  isSubmitting?: boolean
  /** Error message to display */
  error?: string | null
}

export function ChangeRequestForm({
  onSubmit,
  onCancel,
  isSubmitting = false,
  error = null,
}: ChangeRequestFormProps) {
  const [whatToChange, setWhatToChange] = useState('')
  const [why, setWhy] = useState('')
  const [whatFocused, setWhatFocused] = useState(false)
  const [whyFocused, setWhyFocused] = useState(false)

  const isValid = whatToChange.trim().length > 0
  const canSubmit = isValid && !isSubmitting

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit) return

    await onSubmit({
      whatToChange: whatToChange.trim(),
      why: why.trim() || null,
    })
  }

  return (
    <form style={styles.form} onSubmit={handleSubmit} data-testid="change-request-form">
      {/* What to change field - required */}
      <div style={styles.fieldGroup}>
        <label htmlFor="what-to-change" style={styles.label}>
          What would you like to change?
        </label>
        <textarea
          id="what-to-change"
          value={whatToChange}
          onChange={(e) => setWhatToChange(e.target.value)}
          onFocus={() => setWhatFocused(true)}
          onBlur={() => setWhatFocused(false)}
          placeholder="Tell us what you'd like to be different..."
          style={{
            ...styles.textarea,
            ...(whatFocused ? styles.inputFocused : {}),
          }}
          disabled={isSubmitting}
          data-testid="what-to-change-input"
        />
        <span style={styles.hint}>Be specific so your parent understands</span>
      </div>

      {/* Why field - optional */}
      <div style={styles.fieldGroup}>
        <label htmlFor="why" style={styles.label}>
          Why?
          <span style={styles.optionalTag}>(optional)</span>
        </label>
        <textarea
          id="why"
          value={why}
          onChange={(e) => setWhy(e.target.value)}
          onFocus={() => setWhyFocused(true)}
          onBlur={() => setWhyFocused(false)}
          placeholder="Why is this important to you?"
          style={{
            ...styles.textarea,
            ...(whyFocused ? styles.inputFocused : {}),
          }}
          disabled={isSubmitting}
          data-testid="why-input"
        />
      </div>

      {/* Error message */}
      {error && (
        <div style={styles.error} data-testid="form-error">
          {error}
        </div>
      )}

      {/* Buttons */}
      <div style={styles.buttonGroup}>
        <button
          type="button"
          onClick={onCancel}
          style={styles.cancelButton}
          disabled={isSubmitting}
          data-testid="cancel-button"
        >
          Never mind
        </button>
        <button
          type="submit"
          style={{
            ...styles.submitButton,
            ...(canSubmit ? {} : styles.submitButtonDisabled),
          }}
          disabled={!canSubmit}
          data-testid="submit-button"
        >
          {isSubmitting ? 'Sending...' : 'Send to Parent'}
        </button>
      </div>
    </form>
  )
}
