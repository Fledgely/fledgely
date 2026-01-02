/**
 * PreConfiguredSafeAdult Component - Story 7.5.4 Task 6
 *
 * Component for pre-configuring safe adult in protected resources.
 * AC3: Pre-configured safe adult
 *
 * CRITICAL SAFETY:
 * - Uses child-appropriate language (6th-grade reading level)
 * - Does NOT mention fledgely or monitoring
 * - Configuration stored encrypted, inaccessible to parents
 */

import { useState, useCallback, useEffect } from 'react'
import type { SafeAdultDesignation } from '@fledgely/shared/contracts/safeAdult'

// ============================================
// Types
// ============================================

export interface PreConfiguredSafeAdultProps {
  childId: string
  existingDesignation: SafeAdultDesignation | null
  onSave: (data: SaveData) => void
  onRemove: () => void
}

export interface SaveData {
  displayName: string
  phone: string
  email: string
  preferredMethod: 'sms' | 'email'
}

interface FormErrors {
  displayName?: string
  contact?: string
}

// ============================================
// Component
// ============================================

export function PreConfiguredSafeAdult({
  childId: _childId,
  existingDesignation,
  onSave,
  onRemove,
}: PreConfiguredSafeAdultProps): JSX.Element {
  // Form state
  const [displayName, setDisplayName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [preferredMethod, setPreferredMethod] = useState<'sms' | 'email'>('sms')
  const [errors, setErrors] = useState<FormErrors>({})
  const [showConfirmRemove, setShowConfirmRemove] = useState(false)

  // Initialize form with existing designation
  useEffect(() => {
    if (existingDesignation) {
      setDisplayName(existingDesignation.displayName || '')
      setPhone(existingDesignation.phoneNumber || '')
      setEmail(existingDesignation.email || '')
      setPreferredMethod(existingDesignation.preferredMethod || 'sms')
    }
  }, [existingDesignation])

  /**
   * Validate form inputs.
   */
  const validateForm = useCallback((): boolean => {
    const newErrors: FormErrors = {}

    // Require display name
    if (!displayName.trim()) {
      newErrors.displayName = 'Please enter a name'
    }

    // Require at least one contact method
    if (!phone.trim() && !email.trim()) {
      newErrors.contact = 'Please enter a phone number or email'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }, [displayName, phone, email])

  /**
   * Handle form submission.
   */
  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault()

      if (!validateForm()) {
        return
      }

      onSave({
        displayName: displayName.trim(),
        phone: phone.trim(),
        email: email.trim(),
        preferredMethod,
      })
    },
    [displayName, phone, email, preferredMethod, validateForm, onSave]
  )

  /**
   * Handle remove button click.
   */
  const handleRemoveClick = useCallback(() => {
    setShowConfirmRemove(true)
  }, [])

  /**
   * Handle confirm remove.
   */
  const handleConfirmRemove = useCallback(() => {
    setShowConfirmRemove(false)
    onRemove()
  }, [onRemove])

  /**
   * Handle cancel remove.
   */
  const handleCancelRemove = useCallback(() => {
    setShowConfirmRemove(false)
  }, [])

  return (
    <section
      role="region"
      aria-label="Set up a trusted adult"
      className="pre-configured-safe-adult"
    >
      <h2>Set up a trusted adult who can help</h2>

      <p className="description">
        You can add someone you trust. If you ever need help, you can easily reach out to them.
      </p>

      <form onSubmit={handleSubmit} role="form" aria-label="Trusted adult form">
        {/* Display name */}
        <div className="form-group">
          <label htmlFor="displayName">Who is this person?</label>
          <input
            id="displayName"
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Aunt Jane, Coach Mike, etc."
            aria-invalid={!!errors.displayName}
          />
          {errors.displayName && (
            <span role="alert" className="error-message">
              {errors.displayName}
            </span>
          )}
        </div>

        {/* Phone */}
        <div className="form-group">
          <label htmlFor="phone">Phone number</label>
          <input
            id="phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="(555) 123-4567"
          />
        </div>

        {/* Email */}
        <div className="form-group">
          <label htmlFor="email">Email address</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="aunt@example.com"
          />
        </div>

        {errors.contact && (
          <p role="alert" className="error-message">
            {errors.contact}
          </p>
        )}

        {/* Preferred contact method - only show when existing designation */}
        {existingDesignation && (
          <fieldset role="group" aria-label="Preferred contact method">
            <legend>How should we contact them?</legend>
            <label>
              <input
                type="radio"
                name="preferredMethod"
                value="sms"
                checked={preferredMethod === 'sms'}
                onChange={() => setPreferredMethod('sms')}
              />
              Text message
            </label>
            <label>
              <input
                type="radio"
                name="preferredMethod"
                value="email"
                checked={preferredMethod === 'email'}
                onChange={() => setPreferredMethod('email')}
              />
              Email
            </label>
          </fieldset>
        )}

        {/* Buttons */}
        <div className="button-group">
          <button type="submit" className="save-button">
            Save
          </button>

          {existingDesignation && (
            <button type="button" onClick={handleRemoveClick} className="remove-button">
              Remove
            </button>
          )}
        </div>
      </form>

      {/* Confirmation dialog */}
      {showConfirmRemove && (
        <div className="confirm-dialog" role="alertdialog" aria-modal="true">
          <p>Are you sure you want to remove this person?</p>
          <div className="confirm-buttons">
            <button type="button" onClick={handleConfirmRemove}>
              Yes, remove
            </button>
            <button type="button" onClick={handleCancelRemove}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </section>
  )
}
