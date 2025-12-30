'use client'

/**
 * CallParentButton Component - Story 19A.3
 *
 * Prominent button for caregivers to call the parent if help is needed.
 * Uses tel: link for mobile phone action.
 *
 * Acceptance Criteria:
 * - AC4: Clear "Call [parent name]" button if help needed
 * - AC3: Large touch targets (NFR49: 44x44 minimum)
 * - AC6: Accessibility
 */

import type { ParentContact } from '../../hooks/useCaregiverStatus'
import { logCaregiverAction } from '../../hooks/useCaregiverAccessLog'

/**
 * Props for CallParentButton component
 */
export interface CallParentButtonProps {
  contact: ParentContact | null
  /**
   * Whether to always show the button, or only when there are issues
   * Default: true (always visible)
   */
  alwaysVisible?: boolean
  /**
   * Whether any child needs attention (used for styling emphasis)
   */
  hasIssues?: boolean
}

/**
 * Phone icon SVG
 */
function PhoneIcon() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  )
}

/**
 * CallParentButton - Prominent button to call parent for help
 */
export function CallParentButton({
  contact,
  alwaysVisible = true,
  hasIssues = false,
}: CallParentButtonProps) {
  // If no contact provided, don't render
  if (!contact) {
    return null
  }

  // If not always visible and no issues, don't show the button
  if (!alwaysVisible && !hasIssues) {
    return null
  }

  // If no phone number, show message to contact parent another way
  if (!contact.phone) {
    const messageStyles: React.CSSProperties = {
      textAlign: 'center',
      padding: '16px',
      fontSize: '16px',
      color: '#6b7280',
      backgroundColor: '#f3f4f6',
      borderRadius: '12px',
      marginTop: '16px',
    }

    return (
      <div style={messageStyles} data-testid="call-parent-no-phone">
        <p style={{ margin: 0 }}>Need help? Contact {contact.name} directly.</p>
      </div>
    )
  }

  // Handle click to log the action
  const handleClick = () => {
    logCaregiverAction('call_parent')
  }

  // Determine button style based on whether there are issues
  const buttonStyles: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '12px',
    width: '100%',
    minHeight: '56px',
    padding: '16px 24px',
    fontSize: '20px',
    fontWeight: 600,
    color: 'white',
    backgroundColor: hasIssues ? '#22c55e' : '#3b82f6',
    border: 'none',
    borderRadius: '12px',
    cursor: 'pointer',
    textDecoration: 'none',
    marginTop: '24px',
    transition: 'transform 0.1s ease, box-shadow 0.1s ease',
  }

  const hoverStyles = `
    .call-parent-button:hover {
      transform: scale(1.02);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    }
    .call-parent-button:active {
      transform: scale(0.98);
    }
    .call-parent-button:focus-visible {
      outline: 3px solid #1d4ed8;
      outline-offset: 2px;
    }
  `

  return (
    <>
      <style>{hoverStyles}</style>
      <a
        href={`tel:${contact.phone}`}
        className="call-parent-button"
        style={buttonStyles}
        onClick={handleClick}
        aria-label={`Call ${contact.name}`}
        data-testid="call-parent-button"
      >
        <PhoneIcon />
        <span>Call {contact.name}</span>
      </a>
    </>
  )
}
