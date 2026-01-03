'use client'

/**
 * CaregiverExtensionApproval - Story 39.4
 *
 * Component for caregivers to approve time extension requests using their PIN.
 *
 * Implements:
 * - AC2: Extension approval with PIN (correct/wrong PIN, lockout)
 * - AC6: Child notification (handled by backend)
 *
 * NFR49: 44x44px minimum touch targets for buttons.
 * Uses React.CSSProperties inline styles per project pattern.
 */

import { useState, useCallback, useRef, useEffect } from 'react'
import { getFunctions, httpsCallable } from 'firebase/functions'

interface CaregiverExtensionApprovalProps {
  /** Family ID */
  familyId: string
  /** Child's UID */
  childUid: string
  /** Child's display name */
  childName: string
  /** Time extension request ID (optional, for linking to pending request) */
  requestId?: string
  /** Extension amount in minutes (optional, uses caregiver's max if not provided) */
  extensionMinutes?: number
  /** Callback on successful extension approval */
  onSuccess?: (result: {
    extensionMinutes: number
    newTimeBalanceMinutes: number
    childName: string
  }) => void
  /** Callback on cancel */
  onCancel?: () => void
  /** PIN length (4, 5, or 6 digits) */
  pinLength?: 4 | 5 | 6
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    padding: '24px',
    maxWidth: '400px',
    width: '100%',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '16px',
  },
  icon: {
    width: '48px',
    height: '48px',
    borderRadius: '50%',
    backgroundColor: '#dbeafe',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '24px',
    color: '#2563eb',
    flexShrink: 0,
  },
  title: {
    fontSize: '1.25rem',
    fontWeight: 600,
    color: '#1f2937',
    margin: 0,
  },
  subtitle: {
    fontSize: '14px',
    color: '#6b7280',
    margin: 0,
  },
  description: {
    fontSize: '14px',
    color: '#6b7280',
    lineHeight: 1.6,
    marginBottom: '20px',
  },
  formGroup: {
    marginBottom: '20px',
  },
  label: {
    display: 'block',
    fontSize: '14px',
    fontWeight: 500,
    color: '#374151',
    marginBottom: '8px',
  },
  pinInputContainer: {
    display: 'flex',
    gap: '8px',
    justifyContent: 'center',
  },
  pinInput: {
    width: '48px',
    height: '56px',
    fontSize: '28px',
    fontWeight: 600,
    textAlign: 'center' as const,
    border: '2px solid #d1d5db',
    borderRadius: '8px',
    outline: 'none',
    transition: 'border-color 0.2s ease',
  },
  pinInputFocused: {
    borderColor: '#2563eb',
  },
  pinInputError: {
    borderColor: '#ef4444',
  },
  buttonGroup: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
    marginTop: '24px',
  },
  button: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '44px',
    padding: '12px 24px',
    fontSize: '14px',
    fontWeight: 500,
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  cancelButton: {
    backgroundColor: '#f3f4f6',
    color: '#374151',
  },
  approveButton: {
    backgroundColor: '#2563eb',
    color: '#ffffff',
  },
  approveButtonDisabled: {
    backgroundColor: '#93c5fd',
    cursor: 'not-allowed',
  },
  statusMessage: {
    padding: '12px 16px',
    borderRadius: '8px',
    fontSize: '14px',
    marginBottom: '16px',
    textAlign: 'center' as const,
  },
  successMessage: {
    backgroundColor: '#f0fdf4',
    color: '#166534',
    border: '1px solid #86efac',
  },
  errorMessage: {
    backgroundColor: '#fef2f2',
    color: '#991b1b',
    border: '1px solid #fecaca',
  },
  lockoutMessage: {
    backgroundColor: '#fef3c7',
    color: '#92400e',
    border: '1px solid #fcd34d',
  },
  remainingAttempts: {
    fontSize: '12px',
    color: '#6b7280',
    textAlign: 'center' as const,
    marginTop: '8px',
  },
  childCard: {
    backgroundColor: '#f9fafb',
    borderRadius: '8px',
    padding: '16px',
    marginBottom: '20px',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  childAvatar: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    backgroundColor: '#dbeafe',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '18px',
  },
  childInfo: {
    flex: 1,
  },
  childNameText: {
    fontSize: '14px',
    fontWeight: 500,
    color: '#1f2937',
    margin: 0,
  },
  requestText: {
    fontSize: '12px',
    color: '#6b7280',
    margin: 0,
  },
  extensionBadge: {
    backgroundColor: '#dbeafe',
    color: '#1d4ed8',
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: 500,
  },
}

export default function CaregiverExtensionApproval({
  familyId,
  childUid,
  childName,
  requestId,
  extensionMinutes,
  onSuccess,
  onCancel,
  pinLength = 4,
}: CaregiverExtensionApprovalProps) {
  // PIN state
  const [pinDigits, setPinDigits] = useState<string[]>(Array(6).fill(''))
  const pinInputRefs = useRef<(HTMLInputElement | null)[]>([])

  // UI state
  const [approving, setApproving] = useState(false)
  const [status, setStatus] = useState<{
    type: 'success' | 'error' | 'lockout'
    message: string
    remainingAttempts?: number
    lockedUntil?: Date
  } | null>(null)
  const [result, setResult] = useState<{
    extensionMinutes: number
    newTimeBalanceMinutes: number
    childName: string
  } | null>(null)

  // Focus first input on mount
  useEffect(() => {
    pinInputRefs.current[0]?.focus()
  }, [])

  const handlePinDigitChange = (index: number, value: string) => {
    // Only allow digits
    if (value && !/^\d$/.test(value)) return

    setPinDigits((prev) => {
      const newDigits = [...prev]
      newDigits[index] = value
      return newDigits
    })

    setStatus(null)

    // Move to next input if a digit was entered
    if (value && index < pinLength - 1) {
      pinInputRefs.current[index + 1]?.focus()
    }
  }

  const handlePinKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !pinDigits[index] && index > 0) {
      pinInputRefs.current[index - 1]?.focus()
    }
    if (e.key === 'ArrowLeft' && index > 0) {
      pinInputRefs.current[index - 1]?.focus()
    }
    if (e.key === 'ArrowRight' && index < pinLength - 1) {
      pinInputRefs.current[index + 1]?.focus()
    }
    if (e.key === 'Enter') {
      handleApprove()
    }
  }

  const handlePinPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault()
    const pastedData = e.clipboardData.getData('text')
    const digits = pastedData.replace(/\D/g, '').slice(0, 6).split('')

    setPinDigits((prev) => {
      const newDigits = [...prev]
      digits.forEach((digit, i) => {
        if (i < 6) newDigits[i] = digit
      })
      return newDigits
    })

    setStatus(null)
  }

  const getPin = useCallback(() => pinDigits.slice(0, pinLength).join(''), [pinDigits, pinLength])

  const handleApprove = useCallback(async () => {
    const pin = getPin()
    if (pin.length !== pinLength || approving) return

    setApproving(true)
    setStatus(null)

    try {
      const functions = getFunctions()
      const approveExtensionWithPin = httpsCallable<
        {
          familyId: string
          childUid: string
          pin: string
          extensionMinutes?: number
          requestId?: string
        },
        {
          success: boolean
          extensionMinutes?: number
          newTimeBalanceMinutes?: number
          childName?: string
          message?: string
          error?: string
          remainingAttempts?: number
          lockedUntil?: string
        }
      >(functions, 'approveExtensionWithPin')

      const response = await approveExtensionWithPin({
        familyId,
        childUid,
        pin,
        extensionMinutes,
        requestId,
      })

      if (response.data.success) {
        const successResult = {
          extensionMinutes: response.data.extensionMinutes!,
          newTimeBalanceMinutes: response.data.newTimeBalanceMinutes!,
          childName: response.data.childName!,
        }
        setResult(successResult)
        setStatus({
          type: 'success',
          message:
            response.data.message ||
            `Gave ${childName} ${successResult.extensionMinutes} more minutes!`,
        })
        // Clear PIN on success
        setPinDigits(Array(6).fill(''))
        onSuccess?.(successResult)
      } else {
        // PIN verification failed
        if (response.data.lockedUntil) {
          const lockedUntil = new Date(response.data.lockedUntil)
          setStatus({
            type: 'lockout',
            message: response.data.error || 'Too many failed attempts',
            remainingAttempts: 0,
            lockedUntil,
          })
        } else {
          setStatus({
            type: 'error',
            message: response.data.error || 'Incorrect PIN',
            remainingAttempts: response.data.remainingAttempts,
          })
        }
        // Clear PIN on failure
        setPinDigits(Array(6).fill(''))
        pinInputRefs.current[0]?.focus()
      }
    } catch (err) {
      console.error('Failed to approve extension:', err)
      setStatus({
        type: 'error',
        message: err instanceof Error ? err.message : 'Failed to approve extension',
      })
      setPinDigits(Array(6).fill(''))
      pinInputRefs.current[0]?.focus()
    } finally {
      setApproving(false)
    }
  }, [
    approving,
    familyId,
    childUid,
    extensionMinutes,
    requestId,
    pinLength,
    childName,
    onSuccess,
    getPin,
  ])

  const canApprove = getPin().length === pinLength && !approving && status?.type !== 'lockout'

  // Calculate lockout remaining time
  const getLockoutRemainingTime = () => {
    if (!status?.lockedUntil) return null
    const remaining = Math.max(0, status.lockedUntil.getTime() - Date.now())
    const minutes = Math.ceil(remaining / 60000)
    return minutes > 0 ? `${minutes} minute${minutes === 1 ? '' : 's'}` : null
  }

  return (
    <div style={styles.container} data-testid="caregiver-extension-approval">
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.icon} aria-hidden="true">
          <span aria-hidden="true">&#x23F0;</span>
        </div>
        <div>
          <h2 style={styles.title}>Approve Extension</h2>
          <p style={styles.subtitle}>Enter your PIN to grant more time</p>
        </div>
      </div>

      {/* Child Info Card */}
      <div style={styles.childCard} data-testid="child-info-card">
        <div style={styles.childAvatar} aria-hidden="true">
          {childName.charAt(0).toUpperCase()}
        </div>
        <div style={styles.childInfo}>
          <p style={styles.childNameText}>{childName}</p>
          <p style={styles.requestText}>
            {requestId ? 'Requested more time' : 'Grant extra screen time'}
          </p>
        </div>
        {extensionMinutes && (
          <span style={styles.extensionBadge} data-testid="extension-amount">
            +{extensionMinutes} min
          </span>
        )}
      </div>

      {/* Status Messages */}
      {status && (
        <div
          style={{
            ...styles.statusMessage,
            ...(status.type === 'success'
              ? styles.successMessage
              : status.type === 'lockout'
                ? styles.lockoutMessage
                : styles.errorMessage),
          }}
          role={status.type === 'error' || status.type === 'lockout' ? 'alert' : 'status'}
          data-testid={`${status.type}-message`}
        >
          {status.message}
          {status.type === 'lockout' && getLockoutRemainingTime() && (
            <div style={{ marginTop: '4px', fontSize: '12px' }}>
              Try again in {getLockoutRemainingTime()}
            </div>
          )}
        </div>
      )}

      {/* Success Result */}
      {status?.type === 'success' && result && (
        <div style={{ ...styles.statusMessage, backgroundColor: '#ecfdf5', border: 'none' }}>
          <div style={{ fontSize: '24px', marginBottom: '8px' }}>&#x2705;</div>
          <div style={{ fontWeight: 500, color: '#166534' }}>
            {childName} now has {result.newTimeBalanceMinutes} minutes
          </div>
        </div>
      )}

      {/* PIN Entry (only show if not locked out and not success) */}
      {status?.type !== 'lockout' && status?.type !== 'success' && (
        <div style={styles.formGroup}>
          <label style={styles.label}>Enter your PIN</label>
          <div style={styles.pinInputContainer} data-testid="pin-input-container">
            {Array.from({ length: pinLength }).map((_, index) => (
              <input
                key={`pin-${index}`}
                ref={(el) => (pinInputRefs.current[index] = el)}
                type="password"
                inputMode="numeric"
                pattern="\d*"
                maxLength={1}
                value={pinDigits[index]}
                onChange={(e) => handlePinDigitChange(index, e.target.value)}
                onKeyDown={(e) => handlePinKeyDown(index, e)}
                onPaste={(e) => handlePinPaste(e)}
                disabled={approving}
                style={{
                  ...styles.pinInput,
                  ...(status?.type === 'error' ? styles.pinInputError : {}),
                }}
                aria-label={`PIN digit ${index + 1}`}
                data-testid={`pin-digit-${index}`}
              />
            ))}
          </div>
          {status?.remainingAttempts !== undefined && status.remainingAttempts > 0 && (
            <p style={styles.remainingAttempts} data-testid="remaining-attempts">
              {status.remainingAttempts} attempt{status.remainingAttempts === 1 ? '' : 's'}{' '}
              remaining
            </p>
          )}
        </div>
      )}

      {/* Buttons */}
      <div style={styles.buttonGroup}>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            style={{ ...styles.button, ...styles.cancelButton }}
            disabled={approving}
            data-testid="cancel-button"
          >
            Cancel
          </button>
        )}
        {status?.type !== 'success' && (
          <button
            type="button"
            onClick={handleApprove}
            disabled={!canApprove}
            style={{
              ...styles.button,
              ...styles.approveButton,
              ...(!canApprove ? styles.approveButtonDisabled : {}),
            }}
            data-testid="approve-button"
          >
            {approving ? 'Approving...' : 'Approve Extension'}
          </button>
        )}
        {status?.type === 'success' && onCancel && (
          <button
            type="button"
            onClick={onCancel}
            style={{ ...styles.button, ...styles.approveButton }}
            data-testid="done-button"
          >
            Done
          </button>
        )}
      </div>
    </div>
  )
}

export { CaregiverExtensionApproval }
export type { CaregiverExtensionApprovalProps }
