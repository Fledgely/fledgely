/**
 * SafeEscapeButton Component
 *
 * Story 40.3: Fleeing Mode - Safe Escape
 *
 * A prominent button that instantly disables all location features
 * when any family member feels unsafe.
 *
 * Requirements:
 * - AC1: Instant activation, no confirmation
 * - AC6: Available to children with same protections
 * - NFR65: 6th-grade reading level (child-friendly language)
 * - NFR42: WCAG 2.1 AA compliance
 * - NFR49: 44px+ touch targets
 */

import React, { useState, useCallback } from 'react'
import { SAFE_ESCAPE_CHILD_MESSAGES, SAFE_ESCAPE_ADULT_MESSAGES } from '@fledgely/shared'

interface SafeEscapeButtonProps {
  /** Whether the current user is a child */
  isChild?: boolean
  /** Callback when Safe Escape is activated */
  onActivate: () => Promise<{ activationId: string }>
  /** Whether an activation is currently in progress */
  isLoading?: boolean
  /** Optional additional CSS class name */
  className?: string
  /** Size variant */
  size?: 'default' | 'compact'
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8px',
    width: '100%',
  },
  button: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
    minHeight: '56px', // Well above 44px for easy touch
    minWidth: '200px',
    padding: '14px 28px',
    backgroundColor: '#dc2626', // Red for urgency
    color: '#ffffff',
    fontSize: '17px',
    fontWeight: 600,
    borderRadius: '12px',
    border: 'none',
    cursor: 'pointer',
    transition: 'background-color 0.15s, transform 0.1s',
    boxShadow: '0 2px 8px rgba(220, 38, 38, 0.3)',
    width: '100%',
  },
  buttonCompact: {
    minHeight: '48px',
    minWidth: '160px',
    padding: '10px 20px',
    fontSize: '15px',
  },
  buttonDisabled: {
    backgroundColor: '#9ca3af',
    cursor: 'not-allowed',
    boxShadow: 'none',
  },
  buttonActivating: {
    backgroundColor: '#b91c1c',
  },
  icon: {
    width: '22px',
    height: '22px',
  },
  iconCompact: {
    width: '18px',
    height: '18px',
  },
  spinner: {
    width: '20px',
    height: '20px',
    border: '2px solid #ffffff',
    borderTopColor: 'transparent',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  hint: {
    fontSize: '13px',
    color: '#6b7280',
    textAlign: 'center',
    maxWidth: '280px',
    lineHeight: 1.4,
  },
}

/** Shield/hide icon for the button */
function ShieldIcon({ style }: { style?: React.CSSProperties }) {
  return (
    <svg style={style} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path
        fillRule="evenodd"
        d="M12.516 2.17a.75.75 0 00-1.032 0 11.209 11.209 0 01-7.877 3.08.75.75 0 00-.722.515A12.74 12.74 0 002.25 9.75c0 5.942 4.064 10.933 9.563 12.348a.749.749 0 00.374 0c5.499-1.415 9.563-6.406 9.563-12.348 0-1.39-.223-2.73-.635-3.985a.75.75 0 00-.722-.516l-.143.001c-2.996 0-5.717-1.17-7.734-3.08zm3.094 8.016a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z"
        clipRule="evenodd"
      />
    </svg>
  )
}

/** Loading spinner */
function Spinner() {
  return (
    <span style={styles.spinner} role="status" aria-label="Activating...">
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </span>
  )
}

/**
 * SafeEscapeButton - Instantly disables location features.
 *
 * Features:
 * - Single tap/click activation (AC1)
 * - No confirmation dialog for speed
 * - Child-friendly language when isChild=true
 * - Loading state during activation
 * - 56px height for easy touch targeting
 * - Accessible with ARIA labels
 */
export function SafeEscapeButton({
  isChild = false,
  onActivate,
  isLoading = false,
  className,
  size = 'default',
}: SafeEscapeButtonProps) {
  const [isActivating, setIsActivating] = useState(false)

  const messages = isChild ? SAFE_ESCAPE_CHILD_MESSAGES : SAFE_ESCAPE_ADULT_MESSAGES

  const handleActivate = useCallback(async () => {
    if (isLoading || isActivating) return

    setIsActivating(true)
    try {
      await onActivate()
    } catch (error) {
      // Error handling is done by the parent component
      // We just need to re-enable the button
      console.error('Safe Escape activation error:', error)
    } finally {
      setIsActivating(false)
    }
  }, [onActivate, isLoading, isActivating])

  const isDisabled = isLoading || isActivating

  const buttonStyle: React.CSSProperties = {
    ...styles.button,
    ...(size === 'compact' ? styles.buttonCompact : {}),
    ...(isDisabled ? styles.buttonDisabled : {}),
    ...(isActivating ? styles.buttonActivating : {}),
  }

  const iconStyle = size === 'compact' ? styles.iconCompact : styles.icon

  return (
    <div
      className={className ? `safe-escape-button ${className}` : 'safe-escape-button'}
      style={styles.container}
    >
      <button
        type="button"
        onClick={handleActivate}
        disabled={isDisabled}
        style={buttonStyle}
        aria-label={messages.buttonLabel}
        aria-describedby="safe-escape-hint"
      >
        {isActivating ? <Spinner /> : <ShieldIcon style={iconStyle} />}
        <span>{messages.buttonLabel}</span>
      </button>
      <p id="safe-escape-hint" style={styles.hint}>
        {isChild
          ? 'Tap to turn off location tracking right now'
          : 'Immediately disables all location features'}
      </p>
    </div>
  )
}

export default SafeEscapeButton
