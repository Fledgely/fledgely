'use client'

/**
 * AccessRevoked Component - Story 19D.5
 *
 * Displays when caregiver's access has been revoked by a parent.
 *
 * Acceptance Criteria:
 * - AC3: Show "Your access has been removed"
 * - AC4: No notification to caregiver of reason (parent's choice)
 *
 * UI/UX Requirements (NFR49):
 * - Clear, non-blaming message
 * - No reason provided (parent's privacy)
 * - Option to contact parent for questions
 * - Large, accessible text (18px+)
 * - 44x44 minimum touch targets
 */

import { useEffect, useRef } from 'react'
import type { ParentContact } from '../../hooks/useCaregiverStatus'

/**
 * Props for AccessRevoked component
 */
export interface AccessRevokedProps {
  /** Parent contact info for questions */
  parentContact?: ParentContact | null
  /** Callback for contact parent button */
  onContactParent?: () => void
}

/**
 * AccessRevoked - Shown when caregiver's access has been removed
 *
 * Story 19D.5: AC3 - "Your access has been removed" display
 */
export function AccessRevoked({ parentContact, onContactParent }: AccessRevokedProps) {
  const headingRef = useRef<HTMLHeadingElement>(null)

  // Focus heading on mount for screen readers (Issue #11)
  useEffect(() => {
    headingRef.current?.focus()
  }, [])

  const containerStyles: React.CSSProperties = {
    maxWidth: '500px',
    margin: '0 auto',
    padding: '32px 24px',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    textAlign: 'center',
  }

  const iconStyles: React.CSSProperties = {
    width: '64px',
    height: '64px',
    margin: '0 auto 24px',
    backgroundColor: '#f3f4f6',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '32px',
  }

  const headingStyles: React.CSSProperties = {
    fontSize: '24px',
    fontWeight: 700,
    color: '#374151',
    margin: '0 0 12px 0',
  }

  const messageStyles: React.CSSProperties = {
    fontSize: '18px',
    color: '#6b7280',
    margin: '0 0 32px 0',
    lineHeight: 1.6,
  }

  const buttonStyles: React.CSSProperties = {
    minWidth: '200px',
    minHeight: '56px',
    padding: '16px 32px',
    fontSize: '18px',
    fontWeight: 600,
    color: 'white',
    backgroundColor: '#3b82f6',
    border: 'none',
    borderRadius: '12px',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
  }

  const contactInfoStyles: React.CSSProperties = {
    marginTop: '16px',
    fontSize: '16px',
    color: '#6b7280',
  }

  const noteStyles: React.CSSProperties = {
    marginTop: '32px',
    fontSize: '14px',
    color: '#9ca3af',
    maxWidth: '350px',
    margin: '32px auto 0',
    lineHeight: 1.5,
  }

  return (
    <div
      style={containerStyles}
      role="main"
      aria-labelledby="access-revoked-heading"
      data-testid="access-revoked"
    >
      {/* Icon */}
      <div style={iconStyles} aria-hidden="true">
        🚫
      </div>

      {/* Main heading - AC3 */}
      <h1 id="access-revoked-heading" style={headingStyles} ref={headingRef} tabIndex={-1}>
        Your Access Has Been Removed
      </h1>

      {/* Message - AC4: No reason provided */}
      <p style={messageStyles} data-testid="revoked-message">
        You no longer have access to view this family&apos;s status.
      </p>

      {/* Contact parent button for questions */}
      {onContactParent && (
        <button
          style={buttonStyles}
          onClick={onContactParent}
          aria-label={
            parentContact?.name ? `Contact ${parentContact.name}` : 'Contact parent with questions'
          }
          data-testid="contact-parent-button"
        >
          <span aria-hidden="true">📞</span>
          {parentContact?.name ? `Contact ${parentContact.name}` : 'Contact Parent'}
        </button>
      )}

      {/* Phone number display */}
      {parentContact?.phone && (
        <p style={contactInfoStyles} data-testid="parent-phone">
          Or call: <a href={`tel:${parentContact.phone}`}>{parentContact.phone}</a>
        </p>
      )}

      {/* Note about re-invitation - for user clarity */}
      <p style={noteStyles}>
        If this was unexpected, please contact the parent directly. They can re-invite you if
        needed.
      </p>
    </div>
  )
}

export default AccessRevoked
