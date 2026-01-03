'use client'

/**
 * CaregiverPinEditor - Story 39.4
 *
 * Component for parents to set/update a caregiver's PIN and configure
 * their extension limits.
 *
 * Implements:
 * - AC1: PIN setup by parent (4-6 digits, securely hashed server-side)
 * - AC3: Extension limits configurable (max duration, max daily)
 *
 * NFR49: 44x44px minimum touch targets for buttons.
 * Uses React.CSSProperties inline styles per project pattern.
 */

import { useState, useCallback, useRef, useEffect } from 'react'
import { getFunctions, httpsCallable } from 'firebase/functions'
import type { ExtensionLimitConfig } from '@fledgely/shared/contracts'

interface CaregiverPinEditorProps {
  familyId: string
  caregiverUid: string
  caregiverName: string
  /** Whether the caregiver already has a PIN configured */
  hasPinConfigured?: boolean
  /** Current extension limits if already set */
  currentLimits?: ExtensionLimitConfig
  onSuccess?: (limits: ExtensionLimitConfig) => void
  onCancel?: () => void
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
    backgroundColor: '#fef3c7',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '24px',
    color: '#d97706',
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
    justifyContent: 'flex-start',
  },
  pinInput: {
    width: '44px',
    height: '52px',
    fontSize: '24px',
    fontWeight: 600,
    textAlign: 'center' as const,
    border: '2px solid #d1d5db',
    borderRadius: '8px',
    outline: 'none',
    transition: 'border-color 0.2s ease',
  },
  pinInputFocused: {
    borderColor: '#7c3aed',
  },
  pinInputError: {
    borderColor: '#ef4444',
  },
  helperText: {
    fontSize: '12px',
    color: '#6b7280',
    marginTop: '8px',
    display: 'block',
  },
  selectContainer: {
    position: 'relative' as const,
  },
  select: {
    width: '100%',
    height: '44px',
    padding: '0 12px',
    fontSize: '14px',
    border: '2px solid #d1d5db',
    borderRadius: '8px',
    backgroundColor: '#ffffff',
    color: '#374151',
    cursor: 'pointer',
    outline: 'none',
    appearance: 'none' as const,
    WebkitAppearance: 'none' as const,
  },
  selectArrow: {
    position: 'absolute' as const,
    right: '12px',
    top: '50%',
    transform: 'translateY(-50%)',
    pointerEvents: 'none' as const,
    color: '#6b7280',
  },
  limitsGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '16px',
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
  saveButton: {
    backgroundColor: '#7c3aed',
    color: '#ffffff',
  },
  saveButtonDisabled: {
    backgroundColor: '#a78bfa',
    cursor: 'not-allowed',
  },
  statusMessage: {
    padding: '12px 16px',
    borderRadius: '8px',
    fontSize: '14px',
    marginBottom: '16px',
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
  warningBox: {
    backgroundColor: '#fffbeb',
    border: '1px solid #fcd34d',
    borderRadius: '8px',
    padding: '12px 16px',
    marginBottom: '20px',
    fontSize: '14px',
    color: '#92400e',
    lineHeight: 1.5,
  },
}

const DEFAULT_LIMITS: ExtensionLimitConfig = {
  maxDurationMinutes: 30,
  maxDailyExtensions: 1,
}

const DURATION_OPTIONS: Array<{ value: 30 | 60 | 120; label: string }> = [
  { value: 30, label: '30 minutes' },
  { value: 60, label: '60 minutes' },
  { value: 120, label: '120 minutes (2 hours)' },
]

const DAILY_LIMIT_OPTIONS: Array<{ value: number; label: string }> = [
  { value: 1, label: '1 per day' },
  { value: 2, label: '2 per day' },
  { value: 3, label: '3 per day' },
  { value: 5, label: '5 per day' },
]

export default function CaregiverPinEditor({
  familyId,
  caregiverUid,
  caregiverName,
  hasPinConfigured = false,
  currentLimits,
  onSuccess,
  onCancel,
}: CaregiverPinEditorProps) {
  // PIN state - 4-6 digit code stored as array for individual inputs
  const [pinDigits, setPinDigits] = useState<string[]>(['', '', '', '', '', ''])
  const [pinLength, setPinLength] = useState<4 | 5 | 6>(4)
  const [confirmPinDigits, setConfirmPinDigits] = useState<string[]>(['', '', '', '', '', ''])

  // Extension limits state
  const [limits, setLimits] = useState<ExtensionLimitConfig>(currentLimits || DEFAULT_LIMITS)

  // UI state
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [pinError, setPinError] = useState<string | null>(null)

  // Refs for PIN inputs
  const pinInputRefs = useRef<(HTMLInputElement | null)[]>([])
  const confirmPinInputRefs = useRef<(HTMLInputElement | null)[]>([])

  // Focus first input on mount
  useEffect(() => {
    pinInputRefs.current[0]?.focus()
  }, [])

  const handlePinDigitChange = (index: number, value: string, isConfirm: boolean = false) => {
    // Only allow digits
    if (value && !/^\d$/.test(value)) return

    const setDigits = isConfirm ? setConfirmPinDigits : setPinDigits
    const refs = isConfirm ? confirmPinInputRefs : pinInputRefs

    setDigits((prev) => {
      const newDigits = [...prev]
      newDigits[index] = value
      return newDigits
    })

    setPinError(null)
    setStatus(null)

    // Move to next input if a digit was entered
    if (value && index < pinLength - 1) {
      refs.current[index + 1]?.focus()
    }
  }

  const handlePinKeyDown = (
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>,
    isConfirm: boolean = false
  ) => {
    const digits = isConfirm ? confirmPinDigits : pinDigits
    const refs = isConfirm ? confirmPinInputRefs : pinInputRefs

    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      refs.current[index - 1]?.focus()
    }

    // Allow moving with arrow keys
    if (e.key === 'ArrowLeft' && index > 0) {
      refs.current[index - 1]?.focus()
    }
    if (e.key === 'ArrowRight' && index < pinLength - 1) {
      refs.current[index + 1]?.focus()
    }
  }

  const handlePinPaste = (
    e: React.ClipboardEvent<HTMLInputElement>,
    isConfirm: boolean = false
  ) => {
    e.preventDefault()
    const pastedData = e.clipboardData.getData('text')
    const digits = pastedData.replace(/\D/g, '').slice(0, 6).split('')

    const setDigits = isConfirm ? setConfirmPinDigits : setPinDigits
    setDigits((prev) => {
      const newDigits = [...prev]
      digits.forEach((digit, i) => {
        if (i < 6) newDigits[i] = digit
      })
      return newDigits
    })

    setPinError(null)
  }

  const getPin = useCallback(() => pinDigits.slice(0, pinLength).join(''), [pinDigits, pinLength])
  const getConfirmPin = useCallback(
    () => confirmPinDigits.slice(0, pinLength).join(''),
    [confirmPinDigits, pinLength]
  )

  const validatePin = useCallback((): boolean => {
    const pin = getPin()
    const confirmPin = getConfirmPin()

    if (pin.length < pinLength) {
      setPinError(`PIN must be ${pinLength} digits`)
      return false
    }

    if (pin !== confirmPin) {
      setPinError('PINs do not match')
      return false
    }

    // Check for simple patterns
    if (/^(\d)\1+$/.test(pin)) {
      setPinError('PIN cannot be all the same digit')
      return false
    }

    // Check for sequential patterns (1234, 4321)
    const isSequential = pin.split('').every((digit, i, arr) => {
      if (i === 0) return true
      return parseInt(digit) === parseInt(arr[i - 1]) + 1
    })
    const isReverseSequential = pin.split('').every((digit, i, arr) => {
      if (i === 0) return true
      return parseInt(digit) === parseInt(arr[i - 1]) - 1
    })

    if (isSequential || isReverseSequential) {
      setPinError('PIN cannot be a sequential pattern')
      return false
    }

    return true
  }, [getPin, getConfirmPin, pinLength])

  const handleSave = useCallback(async () => {
    if (saving) return

    if (!validatePin()) {
      return
    }

    setSaving(true)
    setStatus(null)
    setPinError(null)

    try {
      const functions = getFunctions()
      const setCaregiverPin = httpsCallable<
        {
          familyId: string
          caregiverUid: string
          pin: string
          extensionLimits: ExtensionLimitConfig
        },
        { success: boolean; extensionLimits: ExtensionLimitConfig }
      >(functions, 'setCaregiverPin')

      const result = await setCaregiverPin({
        familyId,
        caregiverUid,
        pin: getPin(),
        extensionLimits: limits,
      })

      if (result.data.success) {
        setStatus({
          type: 'success',
          message: hasPinConfigured ? 'PIN updated successfully' : 'PIN set successfully',
        })
        // Clear PIN inputs on success
        setPinDigits(['', '', '', '', '', ''])
        setConfirmPinDigits(['', '', '', '', '', ''])
        onSuccess?.(result.data.extensionLimits)
      }
    } catch (err) {
      console.error('Failed to set PIN:', err)
      setStatus({
        type: 'error',
        message: err instanceof Error ? err.message : 'Failed to set PIN',
      })
    } finally {
      setSaving(false)
    }
  }, [
    saving,
    familyId,
    caregiverUid,
    limits,
    hasPinConfigured,
    onSuccess,
    pinLength,
    validatePin,
    getPin,
  ])

  const canSave = getPin().length === pinLength && getConfirmPin().length === pinLength

  return (
    <div style={styles.container} data-testid="caregiver-pin-editor">
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.icon} aria-hidden="true">
          <span aria-hidden="true">&#x1F511;</span>
        </div>
        <div>
          <h2 style={styles.title}>{hasPinConfigured ? 'Update PIN' : 'Set PIN'}</h2>
          <p style={styles.subtitle}>{caregiverName}</p>
        </div>
      </div>

      {/* Description */}
      <p style={styles.description}>
        {hasPinConfigured
          ? `Change ${caregiverName}'s PIN for approving time extensions.`
          : `Create a PIN for ${caregiverName} to approve time extensions when children request more screen time.`}
      </p>

      {/* Status Message */}
      {status && (
        <div
          style={{
            ...styles.statusMessage,
            ...(status.type === 'success' ? styles.successMessage : styles.errorMessage),
          }}
          role={status.type === 'error' ? 'alert' : 'status'}
          data-testid={`${status.type}-message`}
        >
          {status.message}
        </div>
      )}

      {/* PIN Error */}
      {pinError && (
        <div
          style={{ ...styles.statusMessage, ...styles.errorMessage }}
          role="alert"
          data-testid="pin-error"
        >
          {pinError}
        </div>
      )}

      {/* PIN Length Selection */}
      <div style={styles.formGroup}>
        <label style={styles.label} htmlFor="pin-length">
          PIN Length
        </label>
        <div style={styles.selectContainer}>
          <select
            id="pin-length"
            style={styles.select}
            value={pinLength}
            onChange={(e) => {
              const newLength = parseInt(e.target.value) as 4 | 5 | 6
              setPinLength(newLength)
              setPinDigits(['', '', '', '', '', ''])
              setConfirmPinDigits(['', '', '', '', '', ''])
              setPinError(null)
            }}
            disabled={saving}
            data-testid="pin-length-select"
          >
            <option value={4}>4 digits</option>
            <option value={5}>5 digits</option>
            <option value={6}>6 digits</option>
          </select>
          <span style={styles.selectArrow} aria-hidden="true">
            &#x25BC;
          </span>
        </div>
      </div>

      {/* PIN Entry */}
      <div style={styles.formGroup}>
        <label style={styles.label}>Enter PIN</label>
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
              disabled={saving}
              style={{
                ...styles.pinInput,
                ...(pinError ? styles.pinInputError : {}),
              }}
              aria-label={`PIN digit ${index + 1}`}
              data-testid={`pin-digit-${index}`}
            />
          ))}
        </div>
      </div>

      {/* Confirm PIN Entry */}
      <div style={styles.formGroup}>
        <label style={styles.label}>Confirm PIN</label>
        <div style={styles.pinInputContainer} data-testid="confirm-pin-input-container">
          {Array.from({ length: pinLength }).map((_, index) => (
            <input
              key={`confirm-pin-${index}`}
              ref={(el) => (confirmPinInputRefs.current[index] = el)}
              type="password"
              inputMode="numeric"
              pattern="\d*"
              maxLength={1}
              value={confirmPinDigits[index]}
              onChange={(e) => handlePinDigitChange(index, e.target.value, true)}
              onKeyDown={(e) => handlePinKeyDown(index, e, true)}
              onPaste={(e) => handlePinPaste(e, true)}
              disabled={saving}
              style={{
                ...styles.pinInput,
                ...(pinError ? styles.pinInputError : {}),
              }}
              aria-label={`Confirm PIN digit ${index + 1}`}
              data-testid={`confirm-pin-digit-${index}`}
            />
          ))}
        </div>
        <span style={styles.helperText}>Share this PIN with {caregiverName} securely</span>
      </div>

      {/* Extension Limits (AC3) */}
      <div style={styles.formGroup}>
        <label style={styles.label}>Extension Limits</label>
        <div style={styles.limitsGrid}>
          {/* Max Duration */}
          <div>
            <label style={{ ...styles.label, fontSize: '12px', marginBottom: '4px' }}>
              Max per Extension
            </label>
            <div style={styles.selectContainer}>
              <select
                style={styles.select}
                value={limits.maxDurationMinutes}
                onChange={(e) =>
                  setLimits((prev) => ({
                    ...prev,
                    maxDurationMinutes: parseInt(e.target.value) as 30 | 60 | 120,
                  }))
                }
                disabled={saving}
                data-testid="max-duration-select"
              >
                {DURATION_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <span style={styles.selectArrow} aria-hidden="true">
                &#x25BC;
              </span>
            </div>
          </div>

          {/* Max Daily Extensions */}
          <div>
            <label style={{ ...styles.label, fontSize: '12px', marginBottom: '4px' }}>
              Daily Limit
            </label>
            <div style={styles.selectContainer}>
              <select
                style={styles.select}
                value={limits.maxDailyExtensions}
                onChange={(e) =>
                  setLimits((prev) => ({
                    ...prev,
                    maxDailyExtensions: parseInt(e.target.value),
                  }))
                }
                disabled={saving}
                data-testid="max-daily-select"
              >
                {DAILY_LIMIT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <span style={styles.selectArrow} aria-hidden="true">
                &#x25BC;
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Buttons */}
      <div style={styles.buttonGroup}>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            style={{ ...styles.button, ...styles.cancelButton }}
            data-testid="cancel-button"
          >
            Cancel
          </button>
        )}
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || !canSave}
          style={{
            ...styles.button,
            ...styles.saveButton,
            ...(saving || !canSave ? styles.saveButtonDisabled : {}),
          }}
          data-testid="save-button"
        >
          {saving ? 'Saving...' : hasPinConfigured ? 'Update PIN' : 'Set PIN'}
        </button>
      </div>
    </div>
  )
}

export { CaregiverPinEditor }
export type { CaregiverPinEditorProps }
