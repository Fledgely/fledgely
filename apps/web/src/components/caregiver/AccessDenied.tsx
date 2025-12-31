'use client'

/**
 * AccessDenied Component - Story 19D.4
 *
 * Displays when caregiver tries to access status outside their access window.
 *
 * Acceptance Criteria:
 * - AC3: Show "Access not currently active" when outside window
 * - AC5: Show access windows so caregiver knows when to check
 *
 * UI/UX Requirements (NFR49):
 * - Clear, non-alarming message
 * - Show next access window time
 * - "Contact Parent" button for emergencies
 * - Large, accessible text (18px+)
 * - 44x44 minimum touch targets
 */

import type { AccessWindow } from '@fledgely/shared'
import { formatAccessWindows } from '../../hooks/useAccessWindowCheck'
import type { ParentContact } from '../../hooks/useCaregiverStatus'

/**
 * Props for AccessDenied component
 */
export interface AccessDeniedProps {
  /** Status message from useAccessWindowCheck */
  statusMessage: string
  /** Access windows to display to caregiver */
  accessWindows?: AccessWindow[]
  /** Parent contact info (reuses type from useCaregiverStatus) */
  parentContact?: ParentContact | null
  /** Callback for contact parent button */
  onContactParent?: () => void
}

/**
 * AccessDenied - Shown when caregiver is outside their access window
 *
 * Story 19D.4: AC3 - "Access not currently active" display
 */
export function AccessDenied({
  statusMessage,
  accessWindows = [],
  parentContact,
  onContactParent,
}: AccessDeniedProps) {
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
    fontSize: '20px',
    color: '#6b7280',
    margin: '0 0 32px 0',
    lineHeight: 1.5,
  }

  const windowsContainerStyles: React.CSSProperties = {
    backgroundColor: '#f9fafb',
    borderRadius: '12px',
    padding: '20px',
    marginBottom: '24px',
    textAlign: 'left',
  }

  const windowsHeadingStyles: React.CSSProperties = {
    fontSize: '18px',
    fontWeight: 600,
    color: '#374151',
    margin: '0 0 12px 0',
  }

  const windowsListStyles: React.CSSProperties = {
    margin: 0,
    padding: '0 0 0 20px',
    fontSize: '18px',
    color: '#4b5563',
    lineHeight: 1.8,
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

  const formattedWindows = formatAccessWindows(accessWindows)

  return (
    <div
      style={containerStyles}
      role="main"
      aria-labelledby="access-denied-heading"
      data-testid="access-denied"
    >
      {/* Clock icon */}
      <div style={iconStyles} aria-hidden="true">
        🕐
      </div>

      {/* Main heading */}
      <h1 id="access-denied-heading" style={headingStyles}>
        Access Not Currently Active
      </h1>

      {/* Status message (e.g., "Next access: tomorrow at 2:00 PM") */}
      <p style={messageStyles} data-testid="status-message">
        {statusMessage}
      </p>

      {/* Access windows section (AC5) */}
      {accessWindows.length > 0 && (
        <div style={windowsContainerStyles} data-testid="access-windows">
          <h2 style={windowsHeadingStyles}>Your Access Times</h2>
          <ul style={windowsListStyles} aria-label="Scheduled access times">
            {formattedWindows.map((window, index) => (
              <li key={index}>{window}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Contact parent button for emergencies */}
      {onContactParent && (
        <button
          style={buttonStyles}
          onClick={onContactParent}
          aria-label={
            parentContact?.name ? `Contact ${parentContact.name}` : 'Contact parent for emergency'
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
    </div>
  )
}

export default AccessDenied
