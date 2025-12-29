'use client'

/**
 * Emergency Code Modal - Story 13.2
 *
 * Displays the current TOTP emergency unlock code for a device.
 * Shows countdown timer and auto-refreshes when code expires.
 *
 * Requirements:
 * - AC2: Display 6-digit TOTP code prominently
 * - AC3: Show countdown timer (30 seconds)
 * - AC4: Auto-refresh when timer reaches 0
 * - AC6: Copy to clipboard functionality
 */

import { useEffect, useRef, useState, useCallback } from 'react'
import {
  generateTotpCode,
  getTotpRemainingSeconds,
  TOTP_PERIOD_SECONDS,
} from '../../lib/totp-utils'

interface EmergencyCodeModalProps {
  /** TOTP secret (Base32 encoded) */
  secret: string
  /** Device name for display */
  deviceName: string
  /** Whether modal is open */
  isOpen: boolean
  /** Called when modal is closed */
  onClose: () => void
}

const styles = {
  overlay: {
    position: 'fixed' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '16px',
  },
  modal: {
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    padding: '32px',
    maxWidth: '400px',
    width: '100%',
    textAlign: 'center' as const,
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
  },
  header: {
    marginBottom: '24px',
  },
  icon: {
    width: '64px',
    height: '64px',
    margin: '0 auto 16px',
    borderRadius: '50%',
    backgroundColor: '#fef3c7',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '32px',
  },
  title: {
    margin: '0 0 8px 0',
    fontSize: '20px',
    fontWeight: 600,
    color: '#111827',
  },
  deviceName: {
    color: '#6b7280',
    fontSize: '14px',
    margin: 0,
  },
  codeContainer: {
    marginBottom: '24px',
  },
  code: {
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
    fontSize: '48px',
    fontWeight: 700,
    letterSpacing: '8px',
    color: '#111827',
    padding: '16px 24px',
    backgroundColor: '#f3f4f6',
    borderRadius: '12px',
    display: 'inline-block',
    minWidth: '240px',
  },
  timerContainer: {
    marginBottom: '24px',
  },
  timerLabel: {
    fontSize: '14px',
    color: '#6b7280',
    marginBottom: '8px',
  },
  timerBar: {
    height: '8px',
    backgroundColor: '#e5e7eb',
    borderRadius: '4px',
    overflow: 'hidden',
    marginBottom: '4px',
  },
  timerProgress: {
    height: '100%',
    borderRadius: '4px',
    transition: 'width 1s linear, background-color 0.3s',
  },
  timerText: {
    fontSize: '14px',
    fontWeight: 500,
    color: '#374151',
  },
  buttonGroup: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '12px',
  },
  button: {
    padding: '14px 24px',
    fontSize: '14px',
    fontWeight: 500,
    borderRadius: '8px',
    cursor: 'pointer',
    border: 'none',
    transition: 'all 0.15s',
  },
  copyButton: {
    backgroundColor: '#7c3aed',
    color: '#ffffff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
  },
  copiedButton: {
    backgroundColor: '#10b981',
    color: '#ffffff',
  },
  closeButton: {
    backgroundColor: 'transparent',
    color: '#6b7280',
    border: '1px solid #e5e7eb',
  },
  warning: {
    backgroundColor: '#fef3c7',
    borderRadius: '8px',
    padding: '12px 16px',
    marginBottom: '20px',
    fontSize: '13px',
    color: '#92400e',
    textAlign: 'left' as const,
  },
}

export function EmergencyCodeModal({
  secret,
  deviceName,
  isOpen,
  onClose,
}: EmergencyCodeModalProps) {
  const [code, setCode] = useState<string>('------')
  const [remainingSeconds, setRemainingSeconds] = useState<number>(TOTP_PERIOD_SECONDS)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const modalRef = useRef<HTMLDivElement>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Generate initial code and set up timer
  useEffect(() => {
    if (!isOpen || !secret) return

    const updateCode = async () => {
      try {
        const newCode = await generateTotpCode(secret)
        setCode(newCode)
        setRemainingSeconds(getTotpRemainingSeconds())
        setError(null)
      } catch (err) {
        setError('Failed to generate code')
        console.error('TOTP generation error:', err)
      }
    }

    // Generate code immediately
    updateCode()

    // Update every second
    timerRef.current = setInterval(() => {
      const remaining = getTotpRemainingSeconds()
      setRemainingSeconds(remaining)

      // When period ends, generate new code
      if (remaining === TOTP_PERIOD_SECONDS) {
        updateCode()
      }
    }, 1000)

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }, [isOpen, secret])

  // Reset copied state after 2 seconds
  useEffect(() => {
    if (copied) {
      const timeout = setTimeout(() => setCopied(false), 2000)
      return () => clearTimeout(timeout)
    }
    return undefined
  }, [copied])

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose])

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }, [code])

  // Calculate timer progress percentage
  const progressPercent = (remainingSeconds / TOTP_PERIOD_SECONDS) * 100

  // Timer color based on remaining time
  const getTimerColor = () => {
    if (remainingSeconds <= 5) return '#ef4444' // Red
    if (remainingSeconds <= 10) return '#f59e0b' // Yellow
    return '#10b981' // Green
  }

  if (!isOpen) return null

  return (
    <div
      style={styles.overlay}
      onClick={(e) => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
      aria-labelledby="emergency-code-title"
    >
      <div ref={modalRef} style={styles.modal}>
        <div style={styles.header}>
          <div style={styles.icon}>🔓</div>
          <h2 id="emergency-code-title" style={styles.title}>
            Emergency Unlock Code
          </h2>
          <p style={styles.deviceName}>{deviceName}</p>
        </div>

        <div style={styles.warning}>
          <strong>Only share this code with your child</strong> when they need emergency access to
          their device without internet.
        </div>

        {error ? (
          <div style={{ color: '#dc2626', marginBottom: '24px' }}>{error}</div>
        ) : (
          <>
            <div style={styles.codeContainer}>
              <div style={styles.code} aria-live="polite">
                {code.slice(0, 3)} {code.slice(3)}
              </div>
            </div>

            <div style={styles.timerContainer}>
              <div style={styles.timerLabel}>Code expires in</div>
              <div style={styles.timerBar}>
                <div
                  style={{
                    ...styles.timerProgress,
                    width: `${progressPercent}%`,
                    backgroundColor: getTimerColor(),
                  }}
                />
              </div>
              <div style={styles.timerText}>{remainingSeconds} seconds</div>
            </div>
          </>
        )}

        <div style={styles.buttonGroup}>
          <button
            onClick={handleCopy}
            style={{
              ...styles.button,
              ...styles.copyButton,
              ...(copied ? styles.copiedButton : {}),
            }}
            disabled={!!error}
          >
            {copied ? (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                </svg>
                Copied!
              </>
            ) : (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z" />
                </svg>
                Copy Code
              </>
            )}
          </button>

          <button onClick={onClose} style={{ ...styles.button, ...styles.closeButton }}>
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
