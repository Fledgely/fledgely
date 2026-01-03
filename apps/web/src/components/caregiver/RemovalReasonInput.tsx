/**
 * RemovalReasonInput Component - Story 39.7 Task 2
 *
 * Optional text area for parent to provide reason when removing caregiver.
 *
 * AC6: Optional Removal Reason
 * - Parent can optionally provide reason
 * - Reason stored in audit log (not shared with caregiver)
 * - UI encourages but doesn't require reason
 *
 * Uses React.CSSProperties inline styles per project pattern.
 */

import { useState, useCallback, type ChangeEvent } from 'react'

export interface RemovalReasonInputProps {
  /** Current reason value */
  value: string
  /** Called when reason changes */
  onChange: (reason: string) => void
  /** Called when user wants to skip providing reason */
  onSkip?: () => void
  /** Maximum character limit (default: 500) */
  maxLength?: number
  /** Disabled state */
  disabled?: boolean
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    marginBottom: '16px',
  },
  label: {
    display: 'block',
    fontSize: '14px',
    fontWeight: 500,
    color: '#374151', // gray-700
    marginBottom: '8px',
  },
  textarea: {
    width: '100%',
    minHeight: '100px',
    padding: '12px',
    fontSize: '14px',
    lineHeight: 1.5,
    color: '#1f2937', // gray-800
    backgroundColor: '#ffffff',
    border: '1px solid #d1d5db', // gray-300
    borderRadius: '8px',
    resize: 'vertical' as const,
    boxSizing: 'border-box' as const,
  },
  textareaDisabled: {
    backgroundColor: '#f9fafb', // gray-50
    color: '#9ca3af', // gray-400
    cursor: 'not-allowed',
  },
  helperText: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: '8px',
    fontSize: '12px',
    color: '#6b7280', // gray-500
  },
  privateNote: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  },
  lockIcon: {
    fontSize: '12px',
  },
  charCount: {
    color: '#9ca3af', // gray-400
  },
  charCountWarning: {
    color: '#dc2626', // red-600
  },
  skipButton: {
    padding: '8px 16px',
    fontSize: '14px',
    fontWeight: 500,
    color: '#6b7280', // gray-500
    backgroundColor: 'transparent',
    border: '1px solid #d1d5db', // gray-300
    borderRadius: '8px',
    cursor: 'pointer',
    marginTop: '12px',
    minWidth: '44px',
    minHeight: '44px',
    transition: 'background-color 0.2s ease',
  },
}

export function RemovalReasonInput({
  value,
  onChange,
  onSkip,
  maxLength = 500,
  disabled = false,
}: RemovalReasonInputProps) {
  const [isFocused, setIsFocused] = useState(false)

  const handleChange = useCallback(
    (e: ChangeEvent<HTMLTextAreaElement>) => {
      const newValue = e.target.value
      if (newValue.length <= maxLength) {
        onChange(newValue)
      }
    },
    [onChange, maxLength]
  )

  const charCount = value.length
  const isNearLimit = charCount >= maxLength * 0.9

  const textareaStyle = {
    ...styles.textarea,
    ...(disabled ? styles.textareaDisabled : {}),
    ...(isFocused
      ? {
          borderColor: '#3b82f6', // blue-500
          outline: 'none',
          boxShadow: '0 0 0 3px rgba(59, 130, 246, 0.1)',
        }
      : {}),
  }

  return (
    <div style={styles.container} data-testid="removal-reason-input">
      <label htmlFor="removal-reason" style={styles.label}>
        Why are you removing this caregiver? (optional)
      </label>
      <textarea
        id="removal-reason"
        data-testid="reason-textarea"
        value={value}
        onChange={handleChange}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        style={textareaStyle}
        placeholder="Share your reason if you'd like. This is private and won't be shared with the caregiver."
        disabled={disabled}
        maxLength={maxLength}
        aria-describedby="reason-helper-text"
      />
      <div id="reason-helper-text" style={styles.helperText}>
        <span style={styles.privateNote} data-testid="private-note">
          <span style={styles.lockIcon} aria-hidden="true">
            🔒
          </span>
          <span>Private - not shared with caregiver</span>
        </span>
        <span
          style={isNearLimit ? styles.charCountWarning : styles.charCount}
          data-testid="char-count"
          aria-live="polite"
        >
          {charCount}/{maxLength}
        </span>
      </div>
      {onSkip && (
        <button
          type="button"
          onClick={onSkip}
          style={styles.skipButton}
          data-testid="skip-button"
          disabled={disabled}
        >
          Skip & Remove Now
        </button>
      )}
    </div>
  )
}

export default RemovalReasonInput
