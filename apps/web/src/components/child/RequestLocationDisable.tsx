'use client'

/**
 * RequestLocationDisable Component - Story 40.5
 *
 * Allows child to request location features be disabled.
 *
 * Acceptance Criteria:
 * - AC6: Request Disable Feature
 *
 * NFR Requirements:
 * - NFR65: Text at 6th-grade reading level for child views
 * - NFR49: 44x44px minimum touch targets
 * - NFR45: 4.5:1 contrast ratio
 */

import React, { useState } from 'react'
import { LOCATION_PRIVACY_MESSAGES } from '@fledgely/shared'

export interface RequestLocationDisableProps {
  /** Whether there's an existing pending request */
  hasPendingRequest?: boolean
  /** Status of the pending request */
  requestStatus?: 'pending' | 'approved' | 'declined'
  /** Response message from guardian */
  guardianResponse?: string | null
  /** Whether submitting */
  isSubmitting?: boolean
  /** Callback to submit request */
  onSubmit?: (reason?: string) => void
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    backgroundColor: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: '16px',
    padding: '24px',
    maxWidth: '400px',
  },
  title: {
    fontSize: '18px',
    fontWeight: 600,
    color: '#1f2937',
    margin: '0 0 12px 0',
  },
  description: {
    fontSize: '14px',
    color: '#4b5563',
    margin: '0 0 20px 0',
    lineHeight: 1.5,
  },
  form: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '16px',
  },
  label: {
    fontSize: '14px',
    fontWeight: 500,
    color: '#374151',
    marginBottom: '6px',
    display: 'block',
  },
  textarea: {
    width: '100%',
    minHeight: '80px',
    padding: '12px',
    fontSize: '14px',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    resize: 'vertical' as const,
    fontFamily: 'inherit',
  },
  hint: {
    fontSize: '12px',
    color: '#6b7280',
    margin: '4px 0 0 0',
  },
  submitButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '12px 20px',
    minHeight: '44px',
    backgroundColor: '#3b82f6',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 500,
    color: '#ffffff',
    cursor: 'pointer',
  },
  submitButtonDisabled: {
    backgroundColor: '#9ca3af',
    cursor: 'not-allowed',
  },
  statusCard: {
    padding: '16px',
    borderRadius: '12px',
  },
  statusPending: {
    backgroundColor: '#fef3c7',
    border: '1px solid #fcd34d',
  },
  statusApproved: {
    backgroundColor: '#dcfce7',
    border: '1px solid #86efac',
  },
  statusDeclined: {
    backgroundColor: '#fee2e2',
    border: '1px solid #fecaca',
  },
  statusIcon: {
    fontSize: '24px',
    marginBottom: '8px',
  },
  statusTitle: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#1f2937',
    margin: '0 0 8px 0',
  },
  statusMessage: {
    fontSize: '14px',
    color: '#4b5563',
    margin: 0,
    lineHeight: 1.5,
  },
  guardianResponse: {
    marginTop: '12px',
    padding: '12px',
    backgroundColor: '#f9fafb',
    borderRadius: '8px',
  },
  guardianResponseLabel: {
    fontSize: '12px',
    fontWeight: 500,
    color: '#6b7280',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
    marginBottom: '4px',
  },
  guardianResponseText: {
    fontSize: '14px',
    color: '#1f2937',
    margin: 0,
    fontStyle: 'italic',
  },
  successMessage: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '12px 16px',
    backgroundColor: '#dcfce7',
    border: '1px solid #86efac',
    borderRadius: '8px',
    fontSize: '14px',
    color: '#166534',
    marginTop: '16px',
  },
}

export function RequestLocationDisable({
  hasPendingRequest = false,
  requestStatus,
  guardianResponse,
  isSubmitting = false,
  onSubmit,
}: RequestLocationDisableProps): React.ReactElement {
  const [reason, setReason] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (onSubmit) {
      onSubmit(reason.trim() || undefined)
      setSubmitted(true)
    }
  }

  // Show status if there's an existing request
  if (hasPendingRequest && requestStatus) {
    const statusStyles = {
      pending: styles.statusPending,
      approved: styles.statusApproved,
      declined: styles.statusDeclined,
    }

    const statusIcons = {
      pending: '⏳',
      approved: '✅',
      declined: '❌',
    }

    const statusTitles = {
      pending: 'Request pending',
      approved: 'Location turned off',
      declined: 'Request not approved',
    }

    const statusMessages = {
      pending: LOCATION_PRIVACY_MESSAGES.pendingRequest,
      approved: LOCATION_PRIVACY_MESSAGES.requestApproved,
      declined: LOCATION_PRIVACY_MESSAGES.requestDeclined,
    }

    return (
      <div style={styles.container} data-testid="request-location-disable">
        <div
          style={{ ...styles.statusCard, ...statusStyles[requestStatus] }}
          data-testid={`status-${requestStatus}`}
          role="status"
          aria-label={`Request status: ${statusTitles[requestStatus]}`}
        >
          <div style={styles.statusIcon} aria-hidden="true">
            {statusIcons[requestStatus]}
          </div>
          <h3 style={styles.statusTitle}>{statusTitles[requestStatus]}</h3>
          <p style={styles.statusMessage}>{statusMessages[requestStatus]}</p>

          {guardianResponse && (
            <div style={styles.guardianResponse} data-testid="guardian-response">
              <div style={styles.guardianResponseLabel}>What your parent said:</div>
              <p style={styles.guardianResponseText}>&ldquo;{guardianResponse}&rdquo;</p>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div style={styles.container} data-testid="request-location-disable">
      <h2 style={styles.title}>Turn off location</h2>
      <p style={styles.description}>
        If you don&apos;t want your family to see your location, you can ask them to turn it off.
        They will talk with you about it.
      </p>

      <form onSubmit={handleSubmit} style={styles.form}>
        <div>
          <label htmlFor="reason" style={styles.label}>
            Tell them why (optional)
          </label>
          <textarea
            id="reason"
            style={styles.textarea}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="I would like location to be turned off because..."
            maxLength={500}
            disabled={isSubmitting}
            data-testid="reason-input"
          />
          <p style={styles.hint}>{reason.length}/500 characters</p>
        </div>

        <button
          type="submit"
          style={{
            ...styles.submitButton,
            ...(isSubmitting ? styles.submitButtonDisabled : {}),
          }}
          disabled={isSubmitting}
          data-testid="submit-button"
        >
          {isSubmitting ? 'Sending...' : 'Send request to parents'}
        </button>
      </form>

      {submitted && !isSubmitting && (
        <div style={styles.successMessage} data-testid="success-message" role="status">
          <span aria-hidden="true">✓</span>
          <span>{LOCATION_PRIVACY_MESSAGES.requestSent}</span>
        </div>
      )}
    </div>
  )
}

export default RequestLocationDisable
