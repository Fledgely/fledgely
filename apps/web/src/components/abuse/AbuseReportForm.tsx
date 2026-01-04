'use client'

/**
 * AbuseReportForm Component
 *
 * Story 51.5: Abuse Reporting - AC1, AC2, AC3, AC4
 *
 * A public form for reporting suspected abuse of Fledgely.
 * No authentication required.
 *
 * Requirements:
 * - AC1: Public access (no auth required)
 * - AC2: Report categories with descriptions
 * - AC3: Anonymous option available
 * - AC4: Report acknowledgment with reference number
 */

import { useState, useRef, useEffect } from 'react'
import { useAbuseReport } from '../../hooks/useAbuseReport'
import {
  AbuseReportType,
  AbuseReportTypeDescriptions,
  ABUSE_REPORT_CONFIG,
  type AbuseReportTypeValue,
  type AbuseReportSubmission,
} from '@fledgely/shared'

export interface AbuseReportFormProps {
  /** Callback when form is successfully submitted */
  onSuccess?: () => void
  /** Callback when user cancels the form */
  onCancel?: () => void
  /** Whether to show cancel button */
  showCancel?: boolean
}

const styles: Record<string, React.CSSProperties> = {
  form: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
    padding: '24px',
    maxWidth: '600px',
    width: '100%',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05)',
  },
  title: {
    fontSize: '1.5rem',
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
  textarea: {
    width: '100%',
    padding: '12px 14px',
    fontSize: '1rem',
    color: '#1e293b',
    backgroundColor: '#ffffff',
    border: '1px solid #cbd5e1',
    borderRadius: '8px',
    outline: 'none',
    minHeight: '150px',
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
  radioGroup: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '12px',
  },
  radioOption: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
    padding: '12px 16px',
    backgroundColor: '#f8fafc',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
    cursor: 'pointer',
    transition: 'border-color 0.15s ease',
  },
  radioOptionSelected: {
    borderColor: '#7c3aed',
    backgroundColor: '#faf5ff',
  },
  radioInput: {
    width: '18px',
    height: '18px',
    marginTop: '2px',
    accentColor: '#7c3aed',
    flexShrink: 0,
  },
  radioLabel: {
    flex: 1,
  },
  radioTitle: {
    fontSize: '0.875rem',
    fontWeight: 500,
    color: '#1e293b',
    marginBottom: '4px',
  },
  radioDescription: {
    fontSize: '0.8125rem',
    color: '#64748b',
    lineHeight: 1.4,
  },
  checkboxRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '12px 16px',
    backgroundColor: '#f8fafc',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
    marginBottom: '16px',
  },
  checkboxInput: {
    width: '18px',
    height: '18px',
    accentColor: '#7c3aed',
  },
  checkboxLabel: {
    fontSize: '0.875rem',
    color: '#334155',
    cursor: 'pointer',
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
    backgroundColor: '#7c3aed',
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
    borderRadius: '12px',
    padding: '24px',
    textAlign: 'center' as const,
  },
  successIcon: {
    fontSize: '48px',
    marginBottom: '16px',
  },
  successTitle: {
    fontSize: '1.25rem',
    fontWeight: 600,
    color: '#166534',
    marginBottom: '12px',
  },
  successMessage: {
    fontSize: '0.9375rem',
    color: '#166534',
    marginBottom: '16px',
    lineHeight: 1.5,
  },
  referenceBox: {
    backgroundColor: '#ffffff',
    borderRadius: '8px',
    padding: '16px',
    marginBottom: '16px',
    border: '1px solid #86efac',
  },
  referenceLabel: {
    fontSize: '0.75rem',
    color: '#166534',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
    marginBottom: '4px',
  },
  referenceNumber: {
    fontSize: '1.25rem',
    fontWeight: 700,
    color: '#15803d',
    fontFamily: 'monospace',
  },
  privacyNote: {
    backgroundColor: '#eff6ff',
    borderRadius: '8px',
    padding: '12px 16px',
    marginBottom: '20px',
    fontSize: '0.8125rem',
    color: '#1e40af',
    lineHeight: 1.5,
  },
}

const reportTypes: { value: AbuseReportTypeValue; label: string }[] = [
  { value: AbuseReportType.SURVEILLANCE_OF_ADULTS, label: 'Surveillance of Adults' },
  { value: AbuseReportType.NON_FAMILY_USE, label: 'Non-Family Use' },
  { value: AbuseReportType.HARASSMENT, label: 'Harassment' },
  { value: AbuseReportType.OTHER, label: 'Other' },
]

export function AbuseReportForm({ onSuccess, onCancel, showCancel = true }: AbuseReportFormProps) {
  const { submit, isLoading, error, isSuccess, referenceNumber, successMessage, reset } =
    useAbuseReport()

  // Form state
  const [reportType, setReportType] = useState<AbuseReportTypeValue | null>(null)
  const [description, setDescription] = useState('')
  const [isAnonymous, setIsAnonymous] = useState(false)
  const [reporterEmail, setReporterEmail] = useState('')
  const [reporterName, setReporterName] = useState('')
  const [wantsFollowUp, setWantsFollowUp] = useState(false)

  // Validation state
  const [validationError, setValidationError] = useState<string | null>(null)

  // Refs for focus management
  const descriptionRef = useRef<HTMLTextAreaElement>(null)
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

    // Validate report type
    if (!reportType) {
      setValidationError('Please select a report type.')
      return
    }

    // Validate description
    const trimmedDescription = description.trim()
    if (trimmedDescription.length < ABUSE_REPORT_CONFIG.MIN_DESCRIPTION_LENGTH) {
      setValidationError(
        `Please provide at least ${ABUSE_REPORT_CONFIG.MIN_DESCRIPTION_LENGTH} characters describing the issue.`
      )
      descriptionRef.current?.focus()
      return
    }

    if (trimmedDescription.length > ABUSE_REPORT_CONFIG.MAX_DESCRIPTION_LENGTH) {
      setValidationError(
        `Description cannot exceed ${ABUSE_REPORT_CONFIG.MAX_DESCRIPTION_LENGTH} characters.`
      )
      descriptionRef.current?.focus()
      return
    }

    // Validate email if not anonymous
    if (!isAnonymous && !reporterEmail.trim()) {
      setValidationError('Please provide your email address or check the anonymous option.')
      return
    }

    if (!isAnonymous && reporterEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(reporterEmail)) {
      setValidationError('Please enter a valid email address.')
      return
    }

    const formData: AbuseReportSubmission = {
      type: reportType,
      description: trimmedDescription,
      isAnonymous,
      reporterEmail: isAnonymous ? undefined : reporterEmail.trim() || undefined,
      reporterName: isAnonymous ? undefined : reporterName.trim() || undefined,
      wantsFollowUp: isAnonymous ? false : wantsFollowUp,
    }

    await submit(formData)
  }

  const handleReset = () => {
    reset()
    setReportType(null)
    setDescription('')
    setIsAnonymous(false)
    setReporterEmail('')
    setReporterName('')
    setWantsFollowUp(false)
    setValidationError(null)
  }

  // Show success state
  if (isSuccess) {
    return (
      <div style={styles.form}>
        <div ref={successRef} style={styles.success} role="status" aria-live="polite" tabIndex={-1}>
          <div style={styles.successIcon} aria-hidden="true">
            &#10003;
          </div>
          <div style={styles.successTitle}>Report Submitted</div>
          <p style={styles.successMessage}>{successMessage}</p>

          {referenceNumber && (
            <div style={styles.referenceBox}>
              <div style={styles.referenceLabel}>Your Reference Number</div>
              <div style={styles.referenceNumber}>{referenceNumber}</div>
            </div>
          )}

          <p style={{ fontSize: '0.875rem', color: '#166534', marginBottom: '16px' }}>
            Our trust &amp; safety team will review your report within 72 hours.
          </p>

          <button
            type="button"
            onClick={handleReset}
            style={{
              ...styles.submitButton,
              flex: 'none',
              display: 'inline-block',
            }}
          >
            Submit Another Report
          </button>
        </div>
      </div>
    )
  }

  return (
    <form style={styles.form} onSubmit={handleSubmit} noValidate>
      <h2 style={styles.title}>Report Misuse</h2>
      <p style={styles.subtitle}>
        Help us keep Fledgely safe for families. All reports are reviewed by our trust &amp; safety
        team within 72 hours.
      </p>

      {/* Privacy note */}
      <div style={styles.privacyNote}>
        <strong>Your privacy matters:</strong> Your report is confidential. We will never share your
        information with the person you&apos;re reporting.
      </div>

      {/* Display errors */}
      {(validationError || error) && (
        <div style={styles.error} role="alert">
          {validationError || error}
        </div>
      )}

      {/* Report type selection (AC2) */}
      <div style={styles.fieldGroup}>
        <div style={styles.label}>What type of misuse are you reporting?</div>
        <div style={styles.radioGroup}>
          {reportTypes.map(({ value, label }) => (
            <label
              key={value}
              style={{
                ...styles.radioOption,
                ...(reportType === value ? styles.radioOptionSelected : {}),
              }}
            >
              <input
                type="radio"
                name="reportType"
                value={value}
                checked={reportType === value}
                onChange={() => setReportType(value)}
                style={styles.radioInput}
              />
              <div style={styles.radioLabel}>
                <div style={styles.radioTitle}>{label}</div>
                <div style={styles.radioDescription}>{AbuseReportTypeDescriptions[value]}</div>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Description */}
      <div style={styles.fieldGroup}>
        <label htmlFor="abuse-description" style={styles.label}>
          Describe the issue
        </label>
        <textarea
          id="abuse-description"
          ref={descriptionRef}
          style={styles.textarea}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Please provide details about the suspected misuse. Include any relevant information that will help us investigate."
          maxLength={ABUSE_REPORT_CONFIG.MAX_DESCRIPTION_LENGTH}
          required
          aria-required="true"
          aria-describedby="description-char-count"
        />
        <div id="description-char-count" style={styles.charCount}>
          {description.length} / {ABUSE_REPORT_CONFIG.MAX_DESCRIPTION_LENGTH}
        </div>
      </div>

      {/* Anonymous toggle (AC3) */}
      <div style={styles.checkboxRow}>
        <input
          id="anonymous-checkbox"
          type="checkbox"
          checked={isAnonymous}
          onChange={(e) => {
            setIsAnonymous(e.target.checked)
            if (e.target.checked) {
              setWantsFollowUp(false)
            }
          }}
          style={styles.checkboxInput}
        />
        <label htmlFor="anonymous-checkbox" style={styles.checkboxLabel}>
          Submit anonymously (you will not receive updates on this report)
        </label>
      </div>

      {/* Contact info (shown if not anonymous) */}
      {!isAnonymous && (
        <>
          <div style={styles.fieldGroup}>
            <label htmlFor="reporter-email" style={styles.label}>
              Your email address
            </label>
            <input
              id="reporter-email"
              type="email"
              style={styles.input}
              value={reporterEmail}
              onChange={(e) => setReporterEmail(e.target.value)}
              placeholder="your@email.com"
              required
              aria-required="true"
            />
          </div>

          <div style={styles.fieldGroup}>
            <label htmlFor="reporter-name" style={styles.label}>
              Your name <span style={styles.labelOptional}>(optional)</span>
            </label>
            <input
              id="reporter-name"
              type="text"
              style={styles.input}
              value={reporterName}
              onChange={(e) => setReporterName(e.target.value)}
              placeholder="Your name"
              maxLength={100}
            />
          </div>

          <div style={styles.checkboxRow}>
            <input
              id="followup-checkbox"
              type="checkbox"
              checked={wantsFollowUp}
              onChange={(e) => setWantsFollowUp(e.target.checked)}
              style={styles.checkboxInput}
            />
            <label htmlFor="followup-checkbox" style={styles.checkboxLabel}>
              I would like to receive updates about this report
            </label>
          </div>
        </>
      )}

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
          {isLoading ? 'Submitting...' : 'Submit Report'}
        </button>
      </div>
    </form>
  )
}

export default AbuseReportForm
