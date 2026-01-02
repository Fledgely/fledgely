'use client'

/**
 * ViewingRateAlertBanner Component - Story 3A.5
 *
 * Dismissible banner shown to co-parent when another parent has viewed
 * screenshots at an excessive rate.
 *
 * KEY SECURITY FEATURES:
 * - Does NOT reveal who was viewing (neutral language)
 * - Does NOT reveal which screenshots were viewed
 * - Does NOT reveal which child's screenshots (prevents triangulation)
 * - Informational only, no action required
 */

import { useCallback, useEffect, useRef, useState } from 'react'

export interface ViewingRateAlertBannerProps {
  /** Number of screenshots viewed */
  viewCount: number
  /** When the alert was received (for display) */
  alertTime: Date
  /** Callback when banner is dismissed */
  onDismiss: () => void
  /** Whether to auto-dismiss after timeout */
  autoDismissMs?: number
  /** Whether the banner is visible */
  isVisible: boolean
}

const styles = {
  banner: {
    position: 'fixed' as const,
    top: '16px',
    left: '50%',
    transform: 'translateX(-50%)',
    maxWidth: '480px',
    width: 'calc(100% - 32px)',
    backgroundColor: '#fef3c7',
    border: '1px solid #f59e0b',
    borderRadius: '12px',
    padding: '16px',
    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
    zIndex: 1000,
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
  },
  icon: {
    width: '24px',
    height: '24px',
    color: '#d97706',
    flexShrink: 0,
    marginTop: '2px',
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#92400e',
    margin: 0,
    marginBottom: '4px',
  },
  message: {
    fontSize: '14px',
    color: '#78350f',
    margin: 0,
    lineHeight: 1.5,
  },
  infoText: {
    fontSize: '13px',
    color: '#92400e',
    margin: '8px 0 0 0',
    fontStyle: 'italic' as const,
  },
  dismissButton: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '44px',
    height: '44px',
    minWidth: '44px',
    minHeight: '44px',
    backgroundColor: 'transparent',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    color: '#92400e',
    flexShrink: 0,
    transition: 'background-color 0.2s ease',
  },
  srOnly: {
    position: 'absolute' as const,
    width: '1px',
    height: '1px',
    padding: 0,
    margin: '-1px',
    overflow: 'hidden',
    clip: 'rect(0, 0, 0, 0)',
    whiteSpace: 'nowrap' as const,
    border: 0,
  },
}

export default function ViewingRateAlertBanner({
  viewCount,
  alertTime: _alertTime,
  onDismiss,
  autoDismissMs = 30000,
  isVisible,
}: ViewingRateAlertBannerProps) {
  const [isExiting, setIsExiting] = useState(false)
  const dismissButtonRef = useRef<HTMLButtonElement>(null)

  const handleDismiss = useCallback(() => {
    setIsExiting(true)
    // Allow animation to complete
    setTimeout(() => {
      setIsExiting(false)
      onDismiss()
    }, 200)
  }, [onDismiss])

  // Auto-dismiss after timeout
  useEffect(() => {
    if (!isVisible || autoDismissMs <= 0) return

    const timer = setTimeout(() => {
      handleDismiss()
    }, autoDismissMs)

    return () => clearTimeout(timer)
  }, [isVisible, autoDismissMs, handleDismiss])

  // Focus dismiss button when banner appears for accessibility
  useEffect(() => {
    if (isVisible) {
      dismissButtonRef.current?.focus()
    }
  }, [isVisible])

  // Handle keyboard dismiss
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      handleDismiss()
    }
  }

  if (!isVisible) {
    return null
  }

  return (
    <div
      role="alert"
      aria-live="polite"
      aria-atomic="true"
      style={{
        ...styles.banner,
        opacity: isExiting ? 0 : 1,
        transition: 'opacity 0.2s ease',
      }}
      onKeyDown={handleKeyDown}
      data-testid="viewing-rate-alert-banner"
    >
      <style>
        {`
          .dismiss-button:focus {
            outline: 2px solid #d97706;
            outline-offset: 2px;
          }
          .dismiss-button:hover {
            background-color: rgba(217, 119, 6, 0.1);
          }
        `}
      </style>

      {/* Info icon */}
      <svg
        style={styles.icon}
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>

      <div style={styles.content}>
        <h3 style={styles.title}>Monitoring Activity Alert</h3>
        {/* Story 3A.5 AC2: Shows count and timeframe, NOT which screenshots */}
        <p style={styles.message}>
          A family member has viewed {viewCount} screenshots in the last hour.
        </p>
        {/* Story 3A.5 AC3: Informational only, no action required */}
        <p style={styles.infoText}>This is an informational alert. No action is required.</p>
      </div>

      <button
        ref={dismissButtonRef}
        type="button"
        onClick={handleDismiss}
        style={styles.dismissButton}
        className="dismiss-button"
        aria-label="Dismiss alert"
        data-testid="dismiss-button"
      >
        <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path
            fillRule="evenodd"
            d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
            clipRule="evenodd"
          />
        </svg>
        <span style={styles.srOnly}>Dismiss alert</span>
      </button>
    </div>
  )
}
