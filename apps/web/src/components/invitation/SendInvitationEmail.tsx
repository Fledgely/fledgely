'use client'

import { useState, useCallback, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Mail, Send, Check, AlertCircle, Loader2 } from 'lucide-react'

/**
 * Props for the SendInvitationEmail component
 */
export interface SendInvitationEmailProps {
  /** Called when user submits an email */
  onSendEmail: (email: string) => Promise<void>
  /** Whether email is being sent */
  sending: boolean
  /** Whether email was successfully sent */
  sent: boolean
  /** Error message to display */
  error: string | null
  /** Whether email can be sent (not rate limited) */
  canSend: boolean
  /** Masked email address if previously sent */
  lastSentTo?: string | null
  /** Additional CSS classes */
  className?: string
  /** Disable the input and button */
  disabled?: boolean
}

/**
 * SendInvitationEmail Component
 *
 * Provides email input with validation and send functionality.
 * Shows loading, success, and error states.
 *
 * Story 3.2: Invitation Delivery
 *
 * Features:
 * - Email validation (HTML5 + pattern)
 * - Send button with loading state
 * - Success feedback after sending
 * - Error display with clear messaging
 * - Rate limiting feedback
 *
 * Accessibility features:
 * - 44x44px touch targets (NFR49)
 * - 6th-grade reading level text (NFR65)
 * - aria-live announcements for feedback
 * - Proper form labels
 */
export function SendInvitationEmail({
  onSendEmail,
  sending,
  sent,
  error,
  canSend,
  lastSentTo,
  className = '',
  disabled = false,
}: SendInvitationEmailProps) {
  const [email, setEmail] = useState('')
  const [validationError, setValidationError] = useState<string | null>(null)

  // Clear validation error when user types
  useEffect(() => {
    if (validationError && email) {
      setValidationError(null)
    }
  }, [email, validationError])

  /**
   * Validate email format
   */
  const validateEmail = useCallback((value: string): boolean => {
    if (!value.trim()) {
      setValidationError('Please enter an email address.')
      return false
    }

    // Basic email validation regex
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(value)) {
      setValidationError('Please enter a valid email address.')
      return false
    }

    setValidationError(null)
    return true
  }, [])

  /**
   * Handle form submission
   */
  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()

      if (!validateEmail(email)) {
        return
      }

      if (!canSend) {
        setValidationError('Please wait a moment before sending again.')
        return
      }

      await onSendEmail(email)
    },
    [email, validateEmail, canSend, onSendEmail]
  )

  // Determine which error to show (validation takes priority)
  const displayError = validationError || error

  // Show success state if email was sent
  const showSuccess = sent && !sending && !displayError

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Email form */}
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="space-y-2">
          <Label htmlFor="invitation-email" className="text-sm font-medium">
            Send invitation by email
          </Label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Mail
                className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
                aria-hidden="true"
              />
              <Input
                id="invitation-email"
                type="email"
                placeholder="Enter email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={disabled || sending}
                className={`pl-10 min-h-[44px] ${
                  displayError ? 'border-red-500 focus:ring-red-500' : ''
                }`}
                aria-invalid={!!displayError}
                aria-describedby={displayError ? 'email-error' : undefined}
                autoComplete="email"
              />
            </div>
            <Button
              type="submit"
              disabled={disabled || sending || !canSend || !email.trim()}
              className="min-h-[44px] min-w-[80px]"
              aria-label={sending ? 'Sending email...' : 'Send invitation email'}
            >
              {sending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" aria-hidden="true" />
                  <span className="sr-only">Sending...</span>
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" aria-hidden="true" />
                  Send
                </>
              )}
            </Button>
          </div>
        </div>
      </form>

      {/* Feedback area */}
      <div
        className="min-h-[24px]"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        {/* Error message */}
        {displayError && (
          <p
            id="email-error"
            className="text-sm text-red-600 dark:text-red-400 flex items-center gap-1"
          >
            <AlertCircle className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
            {displayError}
          </p>
        )}

        {/* Success message */}
        {showSuccess && (
          <p className="text-sm text-green-600 dark:text-green-400 flex items-center gap-1">
            <Check className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
            Email sent successfully!
          </p>
        )}

        {/* Rate limit warning */}
        {!canSend && !displayError && !showSuccess && (
          <p className="text-sm text-amber-600 dark:text-amber-400 flex items-center gap-1">
            <AlertCircle className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
            Please wait a moment before sending again.
          </p>
        )}
      </div>

      {/* Previously sent info */}
      {lastSentTo && (
        <p className="text-sm text-muted-foreground">
          Last sent to: <span className="font-mono">{lastSentTo}</span>
        </p>
      )}

      {/* Helper text */}
      <p className="text-sm text-muted-foreground">
        We will send an email with a link to join your family.
      </p>
    </div>
  )
}
