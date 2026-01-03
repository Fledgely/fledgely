/**
 * SafeEscapeStatus Component
 *
 * Story 40.3: Fleeing Mode - Safe Escape
 *
 * Displays the current status of Safe Escape and provides
 * controls for re-enabling location features.
 *
 * Requirements:
 * - AC5: Only activator can re-enable
 * - NFR65: 6th-grade reading level
 * - NFR42: WCAG 2.1 AA compliance
 * - NFR49: 44px+ touch targets
 */

import React, { useMemo } from 'react'
import {
  SAFE_ESCAPE_CHILD_MESSAGES,
  SAFE_ESCAPE_ADULT_MESSAGES,
  calculateHoursUntilNotification,
} from '@fledgely/shared'

interface SafeEscapeStatusProps {
  /** Whether Safe Escape is currently activated */
  isActivated: boolean
  /** The timestamp when Safe Escape was activated */
  activatedAt?: Date | null
  /** Whether the current user is the one who activated */
  isActivator?: boolean
  /** Whether the current user is a child */
  isChild?: boolean
  /** Callback when user wants to re-enable location features */
  onReenable?: () => Promise<void>
  /** Whether re-enable is in progress */
  isReenabling?: boolean
  /** Optional additional CSS class name */
  className?: string
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: '16px',
    borderRadius: '12px',
    width: '100%',
  },
  containerActive: {
    backgroundColor: '#fef2f2',
    border: '1px solid #fecaca',
  },
  containerInactive: {
    backgroundColor: '#f0fdf4',
    border: '1px solid #bbf7d0',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '8px',
  },
  icon: {
    width: '24px',
    height: '24px',
  },
  iconActive: {
    color: '#dc2626',
  },
  iconInactive: {
    color: '#16a34a',
  },
  title: {
    fontSize: '16px',
    fontWeight: 600,
    margin: 0,
  },
  titleActive: {
    color: '#991b1b',
  },
  titleInactive: {
    color: '#166534',
  },
  message: {
    fontSize: '14px',
    color: '#4b5563',
    margin: '0 0 12px 0',
    lineHeight: 1.5,
  },
  countdown: {
    fontSize: '13px',
    color: '#6b7280',
    fontStyle: 'italic',
    margin: '0 0 12px 0',
  },
  reenableButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    minHeight: '48px',
    padding: '12px 24px',
    backgroundColor: '#16a34a',
    color: '#ffffff',
    fontSize: '15px',
    fontWeight: 500,
    borderRadius: '8px',
    border: 'none',
    cursor: 'pointer',
    transition: 'background-color 0.15s',
    width: '100%',
  },
  reenableButtonDisabled: {
    backgroundColor: '#9ca3af',
    cursor: 'not-allowed',
  },
  notActivatorMessage: {
    fontSize: '13px',
    color: '#6b7280',
    fontStyle: 'italic',
    margin: 0,
    textAlign: 'center',
  },
  spinner: {
    width: '18px',
    height: '18px',
    border: '2px solid #ffffff',
    borderTopColor: 'transparent',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
}

/** Shield icon for active state */
function ShieldActiveIcon() {
  return (
    <svg
      style={{ ...styles.icon, ...styles.iconActive }}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M12.516 2.17a.75.75 0 00-1.032 0 11.209 11.209 0 01-7.877 3.08.75.75 0 00-.722.515A12.74 12.74 0 002.25 9.75c0 5.942 4.064 10.933 9.563 12.348a.749.749 0 00.374 0c5.499-1.415 9.563-6.406 9.563-12.348 0-1.39-.223-2.73-.635-3.985a.75.75 0 00-.722-.516l-.143.001c-2.996 0-5.717-1.17-7.734-3.08zm3.094 8.016a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z"
        clipRule="evenodd"
      />
    </svg>
  )
}

/** Check icon for inactive state */
function CheckIcon() {
  return (
    <svg
      style={{ ...styles.icon, ...styles.iconInactive }}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm13.36-1.814a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z"
        clipRule="evenodd"
      />
    </svg>
  )
}

/** Loading spinner */
function Spinner() {
  return (
    <span style={styles.spinner} role="status" aria-label="Re-enabling...">
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </span>
  )
}

/**
 * SafeEscapeStatus - Shows Safe Escape status and re-enable option.
 *
 * Features:
 * - Shows active/inactive status
 * - Countdown to when family will be notified
 * - Re-enable button (only for activator)
 * - Child-friendly language when isChild=true
 */
export function SafeEscapeStatus({
  isActivated,
  activatedAt,
  isActivator = false,
  isChild = false,
  onReenable,
  isReenabling = false,
  className,
}: SafeEscapeStatusProps) {
  const messages = isChild ? SAFE_ESCAPE_CHILD_MESSAGES : SAFE_ESCAPE_ADULT_MESSAGES

  const hoursUntilNotification = useMemo(() => {
    if (!activatedAt) return null
    return calculateHoursUntilNotification(activatedAt)
  }, [activatedAt])

  const containerStyle: React.CSSProperties = {
    ...styles.container,
    ...(isActivated ? styles.containerActive : styles.containerInactive),
  }

  const statusClassName = className ? `safe-escape-status ${className}` : 'safe-escape-status'

  if (!isActivated) {
    return (
      <div className={statusClassName} style={containerStyle}>
        <div style={styles.header}>
          <CheckIcon />
          <h3 style={{ ...styles.title, ...styles.titleInactive }}>Location Features Active</h3>
        </div>
        <p style={styles.message}>
          {isChild
            ? 'Your location is being shared with your family.'
            : 'Location features are currently enabled for your family.'}
        </p>
      </div>
    )
  }

  return (
    <div className={statusClassName} style={containerStyle} role="status">
      <div style={styles.header}>
        <ShieldActiveIcon />
        <h3 style={{ ...styles.title, ...styles.titleActive }}>
          {isChild ? "You're Hidden" : 'Safe Escape Active'}
        </h3>
      </div>

      <p style={styles.message}>{messages.activatedMessage}</p>

      {hoursUntilNotification !== null && hoursUntilNotification > 0 && (
        <p style={styles.countdown}>{messages.countdownMessage(hoursUntilNotification)}</p>
      )}

      {isActivator && onReenable && (
        <button
          type="button"
          onClick={onReenable}
          disabled={isReenabling}
          style={{
            ...styles.reenableButton,
            ...(isReenabling ? styles.reenableButtonDisabled : {}),
          }}
          aria-label={messages.reenableLabel}
        >
          {isReenabling ? <Spinner /> : null}
          <span>{messages.reenableLabel}</span>
        </button>
      )}

      {!isActivator && (
        <p style={styles.notActivatorMessage}>
          {isChild
            ? 'Only the person who turned this on can turn it off.'
            : 'Only the person who activated Safe Escape can re-enable location features.'}
        </p>
      )}
    </div>
  )
}

export default SafeEscapeStatus
