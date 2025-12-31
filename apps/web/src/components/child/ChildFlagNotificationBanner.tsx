'use client'

/**
 * ChildFlagNotificationBanner Component - Story 23.1
 *
 * Displays a gentle notification to children when content is flagged.
 * Shows countdown timer and link to add context/annotation.
 *
 * Acceptance Criteria:
 * - AC2: Gentle, non-alarming messaging
 * - AC3: Direct link to annotation screen
 * - AC5: Timer visible with remaining time
 */

import { useState, useEffect, useCallback } from 'react'
import type { FlagDocument } from '@fledgely/shared'
import {
  getRemainingTime,
  formatRemainingTime,
  isWaitingForAnnotation,
} from '../../services/childFlagNotificationService'

/**
 * Props for ChildFlagNotificationBanner
 */
export interface ChildFlagNotificationBannerProps {
  /** The flag to display notification for */
  flag: FlagDocument
  /** Callback when "Add your side" button is clicked */
  onAddContext: (flagId: string) => void
  /** Callback when banner is dismissed (if allowed) */
  onDismiss?: () => void
}

/**
 * Styles using a warm, non-alarming color scheme (yellow/amber)
 * Designed to be gentle and supportive, not scary
 */
const styles: Record<string, React.CSSProperties> = {
  banner: {
    backgroundColor: '#fef3c7', // amber-100
    border: '2px solid #fcd34d', // amber-300
    borderRadius: '12px',
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  header: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
  },
  icon: {
    fontSize: '24px',
    flexShrink: 0,
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#92400e', // amber-800
    margin: 0,
    marginBottom: '4px',
  },
  message: {
    fontSize: '14px',
    color: '#78350f', // amber-900
    margin: 0,
    lineHeight: 1.5,
  },
  timer: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '13px',
    color: '#b45309', // amber-700
    fontWeight: 500,
  },
  timerIcon: {
    fontSize: '16px',
  },
  footer: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: '4px',
  },
  button: {
    backgroundColor: '#f59e0b', // amber-500
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    padding: '10px 20px',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  buttonHover: {
    backgroundColor: '#d97706', // amber-600
  },
  skipButton: {
    backgroundColor: 'transparent',
    color: '#92400e', // amber-800
    border: '1px solid #fcd34d', // amber-300
    borderRadius: '8px',
    padding: '10px 16px',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  expired: {
    backgroundColor: '#fef2f2', // red-50
    border: '2px solid #fecaca', // red-200
  },
  expiredTitle: {
    color: '#991b1b', // red-800
  },
  expiredMessage: {
    color: '#7f1d1d', // red-900
  },
}

/**
 * ChildFlagNotificationBanner - Gentle notification for flagged content
 *
 * Uses supportive, non-judgmental language per AC2:
 * - "Something was flagged - add context?"
 * - "We want your side of the story"
 * - No alarming or accusatory language
 */
export function ChildFlagNotificationBanner({
  flag,
  onAddContext,
  onDismiss,
}: ChildFlagNotificationBannerProps) {
  const [remainingMs, setRemainingMs] = useState(() =>
    flag.annotationDeadline ? getRemainingTime(flag.annotationDeadline) : 0
  )
  const [isButtonHovered, setIsButtonHovered] = useState(false)

  // Update timer every second
  useEffect(() => {
    if (!flag.annotationDeadline) return

    const interval = setInterval(() => {
      const remaining = getRemainingTime(flag.annotationDeadline!)
      setRemainingMs(remaining)

      // Clear interval if expired
      if (remaining <= 0) {
        clearInterval(interval)
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [flag.annotationDeadline])

  const handleAddContext = useCallback(() => {
    onAddContext(flag.id)
  }, [flag.id, onAddContext])

  // Check if notification is still active
  const isActive = isWaitingForAnnotation(flag)
  const isExpired = remainingMs <= 0 && flag.childNotificationStatus === 'notified'

  // Don't render if not waiting for annotation and not expired
  if (!isActive && !isExpired) {
    return null
  }

  const timerText = formatRemainingTime(remainingMs)

  return (
    <div
      style={{
        ...styles.banner,
        ...(isExpired ? styles.expired : {}),
      }}
      role="alert"
      aria-live="polite"
      data-testid="child-flag-notification-banner"
    >
      <div style={styles.header}>
        <span style={styles.icon} aria-hidden="true">
          💬
        </span>
        <div style={styles.content}>
          <h3
            style={{
              ...styles.title,
              ...(isExpired ? styles.expiredTitle : {}),
            }}
          >
            {isExpired ? 'Time to add context has passed' : 'Something was flagged - add context?'}
          </h3>
          <p
            style={{
              ...styles.message,
              ...(isExpired ? styles.expiredMessage : {}),
            }}
          >
            {isExpired
              ? "Your parent can now see this. You can still add your thoughts if you'd like."
              : 'We want your side of the story. Take a moment to explain what happened if you want.'}
          </p>
        </div>
      </div>

      {!isExpired && (
        <div
          style={styles.timer}
          data-testid="notification-timer"
          role="timer"
          aria-label={`Time remaining: ${timerText}`}
          aria-live="off"
        >
          <span style={styles.timerIcon} aria-hidden="true">
            ⏱️
          </span>
          <span>{timerText}</span>
        </div>
      )}

      <div style={styles.footer}>
        <button
          type="button"
          style={{
            ...styles.button,
            ...(isButtonHovered ? styles.buttonHover : {}),
          }}
          onClick={handleAddContext}
          onMouseEnter={() => setIsButtonHovered(true)}
          onMouseLeave={() => setIsButtonHovered(false)}
          data-testid="add-context-button"
        >
          {isExpired ? 'Add your thoughts' : 'Add your side'}
        </button>

        {onDismiss && !isExpired && (
          <button
            type="button"
            style={styles.skipButton}
            onClick={onDismiss}
            data-testid="skip-button"
          >
            Skip for now
          </button>
        )}
      </div>
    </div>
  )
}

export default ChildFlagNotificationBanner
