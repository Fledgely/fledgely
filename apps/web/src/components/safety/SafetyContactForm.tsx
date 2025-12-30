'use client'

/**
 * SafetyContactForm Component
 *
 * Story 0.5.1: Secure Safety Contact Channel - AC4, AC6, AC7
 *
 * A secure contact form for users (potentially abuse victims) to reach
 * Fledgely support without creating any audit trail visible to family members.
 *
 * CRITICAL SAFETY DESIGN:
 * - Uses neutral, calming visual design (no alarming colors)
 * - All labels use neutral language ("Get Help", "Contact Support")
 * - NO words like "abuse", "escape", "emergency", "danger"
 * - No accessibility announcements with sensitive terms
 * - No local storage of form data (prevent discovery)
 *
 * Requirements:
 * - AC4: Form accepts message and safe contact info
 * - AC6: Form submission encrypted at rest and in transit
 * - AC7: Visual subtlety for safety
 */

import { useState, useRef, useEffect } from 'react'
import { useSafetyContact } from '../../hooks/useSafetyContact'
import type { SafetyContactInput, SafetyContactUrgency } from '@fledgely/shared/contracts'

export interface SafetyContactFormProps {
  /** Callback when form is successfully submitted */
  onSuccess?: () => void
  /** Callback when user cancels the form */
  onCancel?: () => void
  /** Whether to show cancel button */
  showCancel?: boolean
}

// Neutral, calming styles (no alarming colors)
const styles: Record<string, React.CSSProperties> = {
  form: {
    backgroundColor: '#f8fafc', // Calm blue-gray
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
    padding: '24px',
    maxWidth: '500px',
    width: '100%',
  },
  title: {
    fontSize: '1.25rem',
    fontWeight: 600,
    color: '#1e293b',
    marginBottom: '8px',
    marginTop: 0,
  },
  subtitle: {
    fontSize: '0.875rem',
    color: '#64748b',
    marginBottom: '24px',
    lineHeight: 1.5,
  },
  fieldGroup: {
    marginBottom: '20px',
  },
  label: {
    display: 'block',
    fontSize: '0.875rem',
    fontWeight: 500,
    color: '#334155',
    marginBottom: '6px',
  },
  labelOptional: {
    fontWeight: 400,
    color: '#94a3b8',
    marginLeft: '4px',
  },
  input: {
    width: '100%',
    padding: '12px 14px',
    fontSize: '1rem',
    color: '#1e293b',
    backgroundColor: '#ffffff',
    border: '1px solid #cbd5e1',
    borderRadius: '8px',
    outline: 'none',
    boxSizing: 'border-box' as const,
  },
  inputFocus: {
    borderColor: '#3b82f6',
    boxShadow: '0 0 0 3px rgba(59, 130, 246, 0.1)',
  },
  textarea: {
    width: '100%',
    padding: '12px 14px',
    fontSize: '1rem',
    color: '#1e293b',
    backgroundColor: '#ffffff',
    border: '1px solid #cbd5e1',
    borderRadius: '8px',
    outline: 'none',
    minHeight: '120px',
    resize: 'vertical' as const,
    fontFamily: 'inherit',
    boxSizing: 'border-box' as const,
  },
  charCount: {
    fontSize: '0.75rem',
    color: '#94a3b8',
    marginTop: '4px',
    textAlign: 'right' as const,
  },
  select: {
    width: '100%',
    padding: '12px 14px',
    fontSize: '1rem',
    color: '#1e293b',
    backgroundColor: '#ffffff',
    border: '1px solid #cbd5e1',
    borderRadius: '8px',
    outline: 'none',
    cursor: 'pointer',
    boxSizing: 'border-box' as const,
  },
  buttonRow: {
    display: 'flex',
    gap: '12px',
    marginTop: '24px',
  },
  submitButton: {
    flex: 1,
    padding: '14px 24px',
    fontSize: '1rem',
    fontWeight: 500,
    color: '#ffffff',
    backgroundColor: '#3b82f6', // Neutral blue, not emergency red
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    minHeight: '48px',
    transition: 'background-color 0.15s ease',
  },
  submitButtonDisabled: {
    backgroundColor: '#94a3b8',
    cursor: 'not-allowed',
  },
  cancelButton: {
    flex: 0,
    padding: '14px 24px',
    fontSize: '1rem',
    fontWeight: 500,
    color: '#64748b',
    backgroundColor: 'transparent',
    border: '1px solid #cbd5e1',
    borderRadius: '8px',
    cursor: 'pointer',
    minHeight: '48px',
  },
  error: {
    backgroundColor: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: '8px',
    padding: '12px 16px',
    marginBottom: '20px',
    color: '#dc2626',
    fontSize: '0.875rem',
  },
  success: {
    backgroundColor: '#f0fdf4',
    border: '1px solid #bbf7d0',
    borderRadius: '8px',
    padding: '16px',
    textAlign: 'center' as const,
    color: '#166534',
    fontSize: '1rem',
    lineHeight: 1.5,
  },
  successTitle: {
    fontSize: '1.125rem',
    fontWeight: 600,
    marginBottom: '8px',
  },
  contactSection: {
    backgroundColor: '#ffffff',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
    padding: '16px',
    marginBottom: '20px',
  },
  contactSectionTitle: {
    fontSize: '0.875rem',
    fontWeight: 500,
    color: '#334155',
    marginBottom: '12px',
  },
  radioGroup: {
    display: 'flex',
    gap: '16px',
    marginTop: '8px',
  },
  radioLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '0.875rem',
    color: '#334155',
    cursor: 'pointer',
  },
  radioInput: {
    width: '16px',
    height: '16px',
    accentColor: '#3b82f6',
  },
}

// Neutral urgency labels (no alarming language)
const urgencyLabels: Record<SafetyContactUrgency, string> = {
  when_you_can: 'Whenever convenient',
  soon: 'Within a day or two',
  urgent: 'As soon as possible',
}

const MAX_MESSAGE_LENGTH = 5000

export function SafetyContactForm({
  onSuccess,
  onCancel,
  showCancel = true,
}: SafetyContactFormProps) {
  const { submit, isLoading, error, isSuccess, reset } = useSafetyContact()

  // Form state
  const [message, setMessage] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [preferredMethod, setPreferredMethod] = useState<'phone' | 'email' | 'either' | null>(null)
  const [safeTimeToContact, setSafeTimeToContact] = useState('')
  const [urgency, setUrgency] = useState<SafetyContactUrgency>('when_you_can')

  // Validation state
  const [validationError, setValidationError] = useState<string | null>(null)

  // Focus management for accessibility
  const messageRef = useRef<HTMLTextAreaElement>(null)
  const successRef = useRef<HTMLDivElement>(null)

  // Focus success message for screen readers
  useEffect(() => {
    if (isSuccess && successRef.current) {
      successRef.current.focus()
      onSuccess?.()
    }
  }, [isSuccess, onSuccess])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setValidationError(null)

    // Client-side validation
    const trimmedMessage = message.trim()
    if (!trimmedMessage) {
      setValidationError('Please enter a message.')
      messageRef.current?.focus()
      return
    }

    if (trimmedMessage.length > MAX_MESSAGE_LENGTH) {
      setValidationError(`Message is too long. Maximum ${MAX_MESSAGE_LENGTH} characters.`)
      messageRef.current?.focus()
      return
    }

    // Email validation (if provided)
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setValidationError('Please enter a valid email address.')
      return
    }

    // Build safe contact info (only if any field is filled)
    const hasSafeContactInfo = phone || email || preferredMethod || safeTimeToContact
    const safeContactInfo = hasSafeContactInfo
      ? {
          phone: phone || null,
          email: email || null,
          preferredMethod,
          safeTimeToContact: safeTimeToContact || null,
        }
      : null

    const formData: SafetyContactInput = {
      type: 'safety_request', // Default type for safety contact form
      message: trimmedMessage,
      safeContactInfo,
      urgency,
      petitionInfo: null, // Not a legal parent petition
    }

    await submit(formData)
  }

  const handleReset = () => {
    reset()
    setMessage('')
    setPhone('')
    setEmail('')
    setPreferredMethod(null)
    setSafeTimeToContact('')
    setUrgency('when_you_can')
    setValidationError(null)
  }

  // Show success state
  if (isSuccess) {
    return (
      <div style={styles.form}>
        <div ref={successRef} style={styles.success} role="status" aria-live="polite" tabIndex={-1}>
          <div style={styles.successTitle}>Message Received</div>
          <p style={{ margin: 0 }}>
            Thank you for reaching out. We will contact you using the information you provided.
          </p>
          <button
            type="button"
            onClick={handleReset}
            style={{
              ...styles.submitButton,
              marginTop: '16px',
              flex: 'none',
            }}
          >
            Send Another Message
          </button>
        </div>
      </div>
    )
  }

  return (
    <form style={styles.form} onSubmit={handleSubmit} noValidate>
      <h2 style={styles.title}>Contact Support</h2>
      <p style={styles.subtitle}>
        We&apos;re here to help. Your message will be reviewed by our support team.
      </p>

      {/* Display errors */}
      {(validationError || error) && (
        <div style={styles.error} role="alert">
          {validationError || error}
        </div>
      )}

      {/* Message field (required) */}
      <div style={styles.fieldGroup}>
        <label htmlFor="safety-message" style={styles.label}>
          Your Message
        </label>
        <textarea
          id="safety-message"
          ref={messageRef}
          style={styles.textarea}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="How can we help you?"
          maxLength={MAX_MESSAGE_LENGTH}
          required
          aria-required="true"
          aria-describedby="message-char-count"
        />
        <div id="message-char-count" style={styles.charCount}>
          {message.length} / {MAX_MESSAGE_LENGTH}
        </div>
      </div>

      {/* Response timing preference */}
      <div style={styles.fieldGroup}>
        <label htmlFor="safety-urgency" style={styles.label}>
          When would you like us to respond?
        </label>
        <select
          id="safety-urgency"
          style={styles.select}
          value={urgency}
          onChange={(e) => setUrgency(e.target.value as SafetyContactUrgency)}
        >
          {Object.entries(urgencyLabels).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      {/* Safe contact information (optional) */}
      <div style={styles.contactSection}>
        <div style={styles.contactSectionTitle}>
          How can we reach you?
          <span style={styles.labelOptional}>(optional)</span>
        </div>

        <div style={styles.fieldGroup}>
          <label htmlFor="safety-phone" style={styles.label}>
            Phone
          </label>
          <input
            id="safety-phone"
            type="tel"
            style={styles.input}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Your phone number"
            autoComplete="off"
          />
        </div>

        <div style={styles.fieldGroup}>
          <label htmlFor="safety-email" style={styles.label}>
            Email
          </label>
          <input
            id="safety-email"
            type="email"
            style={styles.input}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Your email address"
            autoComplete="off"
          />
        </div>

        {/* Preferred contact method */}
        {(phone || email) && (
          <div style={styles.fieldGroup}>
            <div style={styles.label}>Preferred way to contact you</div>
            <div style={styles.radioGroup}>
              <label style={styles.radioLabel}>
                <input
                  type="radio"
                  name="preferredMethod"
                  value="phone"
                  checked={preferredMethod === 'phone'}
                  onChange={() => setPreferredMethod('phone')}
                  style={styles.radioInput}
                />
                Phone
              </label>
              <label style={styles.radioLabel}>
                <input
                  type="radio"
                  name="preferredMethod"
                  value="email"
                  checked={preferredMethod === 'email'}
                  onChange={() => setPreferredMethod('email')}
                  style={styles.radioInput}
                />
                Email
              </label>
              <label style={styles.radioLabel}>
                <input
                  type="radio"
                  name="preferredMethod"
                  value="either"
                  checked={preferredMethod === 'either'}
                  onChange={() => setPreferredMethod('either')}
                  style={styles.radioInput}
                />
                Either
              </label>
            </div>
          </div>
        )}

        <div style={{ ...styles.fieldGroup, marginBottom: 0 }}>
          <label htmlFor="safety-safe-time" style={styles.label}>
            Best time to contact you
          </label>
          <input
            id="safety-safe-time"
            type="text"
            style={styles.input}
            value={safeTimeToContact}
            onChange={(e) => setSafeTimeToContact(e.target.value)}
            placeholder="e.g., Weekdays 9am-5pm"
            maxLength={200}
            autoComplete="off"
          />
        </div>
      </div>

      {/* Action buttons */}
      <div style={styles.buttonRow}>
        {showCancel && onCancel && (
          <button type="button" style={styles.cancelButton} onClick={onCancel} disabled={isLoading}>
            Cancel
          </button>
        )}
        <button
          type="submit"
          style={{
            ...styles.submitButton,
            ...(isLoading ? styles.submitButtonDisabled : {}),
          }}
          disabled={isLoading}
          aria-busy={isLoading}
        >
          {isLoading ? 'Sending...' : 'Send Message'}
        </button>
      </div>
    </form>
  )
}

export default SafetyContactForm
