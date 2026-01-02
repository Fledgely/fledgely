/**
 * SafeAdultDesignation Component - Story 7.5.4 Task 5
 *
 * Component for designating safe adult during signal.
 * AC1: Safe adult notification option
 * AC6: Phone and email support
 *
 * CRITICAL SAFETY:
 * - Uses child-appropriate language (6th-grade reading level)
 * - Does NOT mention fledgely or monitoring
 * - Skip option is clearly available
 */

import { useState, useCallback } from 'react'
import type { SafeAdultDesignation as SafeAdultDesignationType } from '@fledgely/shared/contracts/safeAdult'

// ============================================
// Types
// ============================================

export interface SafeAdultDesignationProps {
  signalId: string
  childId: string
  preConfiguredAdult: SafeAdultDesignationType | null
  onDesignate: (designation: SafeAdultDesignationType) => void
  onSkip: () => void
  isProcessing: boolean
}

interface FormErrors {
  phone?: string
  email?: string
  general?: string
}

// ============================================
// Validation Helpers
// ============================================

/**
 * Validate phone number format.
 * Accepts various formats: (555) 123-4567, 555-123-4567, 5551234567, +1-555-123-4567
 */
function isValidPhone(phone: string): boolean {
  if (!phone || phone.trim().length === 0) return false
  // Remove formatting characters and check for valid digits
  const digits = phone.replace(/[\s\-()+ .]/g, '')
  return digits.length >= 10 && /^\d+$/.test(digits)
}

/**
 * Validate email format.
 */
function isValidEmail(email: string): boolean {
  if (!email || email.trim().length === 0) return false
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

/**
 * Normalize phone to E.164 format.
 */
function normalizePhone(phone: string): string {
  const digits = phone.replace(/[\s\-()+ .]/g, '')
  // Assume US if 10 digits
  if (digits.length === 10) {
    return `+1${digits}`
  }
  // If starts with 1 and 11 digits, add +
  if (digits.length === 11 && digits.startsWith('1')) {
    return `+${digits}`
  }
  return `+${digits}`
}

// ============================================
// Component
// ============================================

export function SafeAdultDesignation({
  signalId: _signalId,
  childId,
  preConfiguredAdult,
  onDesignate,
  onSkip,
  isProcessing,
}: SafeAdultDesignationProps): JSX.Element {
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [errors, setErrors] = useState<FormErrors>({})

  /**
   * Handle using pre-configured adult.
   */
  const handleUsePreConfigured = useCallback(() => {
    if (preConfiguredAdult) {
      onDesignate(preConfiguredAdult)
    }
  }, [preConfiguredAdult, onDesignate])

  /**
   * Validate form inputs.
   */
  const validateForm = useCallback((): boolean => {
    const newErrors: FormErrors = {}
    const hasPhone = phone.trim().length > 0
    const hasEmail = email.trim().length > 0

    // Require at least one contact method
    if (!hasPhone && !hasEmail) {
      newErrors.general = 'Please enter a phone number or email address'
      setErrors(newErrors)
      return false
    }

    // Validate phone if provided
    if (hasPhone && !isValidPhone(phone)) {
      newErrors.phone = 'Please enter a valid phone number'
    }

    // Validate email if provided
    if (hasEmail && !isValidEmail(email)) {
      newErrors.email = 'Please enter a valid email address'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }, [phone, email])

  /**
   * Handle form submission.
   */
  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault()

      if (!validateForm()) {
        return
      }

      // Create new designation
      const hasPhone = phone.trim().length > 0 && isValidPhone(phone)
      const hasEmail = email.trim().length > 0 && isValidEmail(email)

      const newDesignation: SafeAdultDesignationType = {
        id: `sa_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        childId,
        phoneNumber: hasPhone ? normalizePhone(phone) : null,
        email: hasEmail ? email.trim().toLowerCase() : null,
        preferredMethod: hasPhone ? 'sms' : 'email',
        displayName: 'Trusted Adult',
        createdAt: new Date(),
        updatedAt: new Date(),
        isPreConfigured: false,
        encryptionKeyId: `sakey_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      }

      onDesignate(newDesignation)
    },
    [phone, email, childId, validateForm, onDesignate]
  )

  return (
    <section role="region" aria-label="Contact a trusted adult" className="safe-adult-designation">
      <h2>Would you like someone you trust to know?</h2>

      <p className="description">
        You can let a trusted adult know you need help. They will get a short message asking them to
        reach out to you.
      </p>

      {/* Pre-configured adult option */}
      {preConfiguredAdult && (
        <div className="pre-configured-option">
          <p>You already set up a trusted adult:</p>
          <button
            type="button"
            onClick={handleUsePreConfigured}
            disabled={isProcessing}
            className="use-preconfigured-button"
          >
            Use {preConfiguredAdult.displayName}
          </button>
          <p className="or-divider">or enter someone else:</p>
        </div>
      )}

      {/* Contact form */}
      <form onSubmit={handleSubmit} role="form" aria-label="Contact information form">
        <div className="form-group">
          <label htmlFor="phone">Phone number</label>
          <input
            id="phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="(555) 123-4567"
            disabled={isProcessing}
            aria-invalid={!!errors.phone}
            aria-describedby={errors.phone ? 'phone-error' : undefined}
          />
          {errors.phone && (
            <span id="phone-error" role="alert" className="error-message">
              {errors.phone}
            </span>
          )}
        </div>

        <div className="form-group">
          <label htmlFor="email">Email address</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="aunt@example.com"
            disabled={isProcessing}
            aria-invalid={!!errors.email}
            aria-describedby={errors.email ? 'email-error' : undefined}
          />
          {errors.email && (
            <span id="email-error" role="alert" className="error-message">
              {errors.email}
            </span>
          )}
        </div>

        {errors.general && (
          <p role="alert" className="error-message general-error">
            {errors.general}
          </p>
        )}

        <div className="button-group">
          <button type="submit" disabled={isProcessing} className="submit-button">
            {isProcessing ? 'Sending...' : 'Send message'}
          </button>
          <button type="button" onClick={onSkip} disabled={isProcessing} className="skip-button">
            Skip
          </button>
        </div>

        {isProcessing && (
          <div role="status" aria-live="polite" className="loading-indicator">
            Sending your message...
          </div>
        )}
      </form>
    </section>
  )
}
