/**
 * RequestAgreementReviewButton Component - Story 34.5.3 Task 4
 *
 * Button for children to request an agreement review.
 * AC1: Request Agreement Review Button
 * AC4: Rate Limiting (60-Day Cooldown)
 * AC5: Invitation, Not Demand
 *
 * CRITICAL: All messaging must be invitation-based, not demand-based.
 */

import { useCallback, useState } from 'react'
import { useReviewRequestCooldown } from '../../hooks/useReviewRequestCooldown'

interface RequestAgreementReviewButtonProps {
  /** Family ID */
  familyId: string
  /** Child ID */
  childId: string
  /** Child's display name */
  childName: string
  /** Agreement ID to review */
  agreementId: string
  /** Callback when request is successfully submitted */
  onRequestSubmitted?: () => void
  /** Whether a pending request exists (overrides hook state) */
  hasPendingRequest?: boolean
  /** Whether submission is in progress (overrides hook state) */
  isSubmitting?: boolean
}

export function RequestAgreementReviewButton({
  familyId,
  childId,
  childName,
  agreementId,
  onRequestSubmitted,
  hasPendingRequest = false,
  isSubmitting: isSubmittingProp,
}: RequestAgreementReviewButtonProps) {
  const [showSuccessMessage, setShowSuccessMessage] = useState(false)

  const {
    canRequest,
    daysRemaining,
    submitRequest,
    isSubmitting: isSubmittingHook,
  } = useReviewRequestCooldown(familyId, childId, childName, agreementId)

  const isSubmitting = isSubmittingProp ?? isSubmittingHook

  // Determine button state
  const isInCooldown = !canRequest && daysRemaining > 0
  const isPending = hasPendingRequest
  const isDisabled = isInCooldown || isPending || isSubmitting

  // Format cooldown message
  const getCooldownMessage = () => {
    if (daysRemaining === 1) {
      return 'Next review can be requested in 1 day'
    }
    return `Next review can be requested in ${daysRemaining} days`
  }

  const handleClick = useCallback(async () => {
    if (isDisabled) return

    const result = await submitRequest()

    if (result) {
      setShowSuccessMessage(true)
      onRequestSubmitted?.()

      // Hide success message after 3 seconds
      setTimeout(() => {
        setShowSuccessMessage(false)
      }, 3000)
    }
  }, [isDisabled, submitRequest, onRequestSubmitted])

  // Determine button text and subtext
  const getButtonContent = () => {
    if (isSubmitting) {
      return {
        icon: '⏳',
        text: 'Sending Request...',
        subtext: 'Please wait',
      }
    }

    if (showSuccessMessage) {
      return {
        icon: '✅',
        text: 'Request Sent!',
        subtext: 'Your parents have been notified',
      }
    }

    if (isPending) {
      return {
        icon: '📨',
        text: 'Review Requested',
        subtext: 'Waiting for response',
      }
    }

    if (isInCooldown) {
      return {
        icon: '⏰',
        text: 'Review Request',
        subtext: getCooldownMessage(),
      }
    }

    return {
      icon: '💬',
      text: 'Request Agreement Review',
      subtext: 'Invite your family to discuss the agreement',
    }
  }

  const content = getButtonContent()

  // Tooltip message (AC1: supportive tooltip)
  const tooltipMessage = isInCooldown
    ? getCooldownMessage()
    : 'Invite your family to have a conversation about the agreement'

  return (
    <button
      data-testid="request-review-button"
      onClick={handleClick}
      disabled={isDisabled}
      title={tooltipMessage}
      aria-label={`${content.text}. ${content.subtext}`}
      aria-disabled={isDisabled}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        width: '100%',
        padding: '16px 24px',
        background: showSuccessMessage
          ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
          : isDisabled
            ? 'linear-gradient(135deg, #94a3b8 0%, #64748b 100%)'
            : 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
        border: 'none',
        borderRadius: 16,
        cursor: isDisabled ? 'default' : 'pointer',
        opacity: isDisabled && !isPending ? 0.7 : 1,
        transition: 'transform 0.2s, box-shadow 0.2s',
        boxShadow: isDisabled
          ? '0 4px 14px rgba(148, 163, 184, 0.2)'
          : '0 4px 14px rgba(59, 130, 246, 0.3)',
      }}
      onMouseEnter={(e) => {
        if (!isDisabled) {
          e.currentTarget.style.transform = 'scale(1.02)'
          e.currentTarget.style.boxShadow = '0 6px 20px rgba(59, 130, 246, 0.4)'
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'scale(1)'
        e.currentTarget.style.boxShadow = isDisabled
          ? '0 4px 14px rgba(148, 163, 184, 0.2)'
          : '0 4px 14px rgba(59, 130, 246, 0.3)'
      }}
    >
      <span style={{ fontSize: 28 }}>{content.icon}</span>
      <div style={{ textAlign: 'left' }}>
        <div
          style={{
            fontSize: 18,
            fontWeight: 700,
            color: 'white',
          }}
        >
          {content.text}
        </div>
        <div
          style={{
            fontSize: 14,
            color: 'rgba(255, 255, 255, 0.8)',
            marginTop: 2,
          }}
        >
          {content.subtext}
        </div>
      </div>
    </button>
  )
}
