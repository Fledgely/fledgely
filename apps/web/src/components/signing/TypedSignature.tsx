/**
 * Typed Signature Component.
 *
 * Story 6.1: Child Digital Signature Ceremony - AC2
 * Story 6.7: Signature Accessibility - AC2
 *
 * Allows users to type their name as a signature.
 * Provides an accessible alternative to drawn signatures.
 */

'use client'

import { useState, useCallback, useEffect } from 'react'

interface TypedSignatureProps {
  /** Placeholder text for the input */
  placeholder?: string
  /** Current value (controlled component) */
  value?: string
  /** Called when signature text changes */
  onChange: (value: string) => void
  /** Whether the input is disabled */
  disabled?: boolean
  /** Minimum characters required */
  minLength?: number
  /** Maximum characters allowed */
  maxLength?: number
  /** Additional CSS classes */
  className?: string
}

export function TypedSignature({
  placeholder = 'Type your name here',
  value = '',
  onChange,
  disabled = false,
  minLength = 2,
  maxLength = 100,
  className = '',
}: TypedSignatureProps) {
  const [localValue, setLocalValue] = useState(value)
  const [isFocused, setIsFocused] = useState(false)

  // Sync local value when prop changes (controlled component pattern)
  useEffect(() => {
    setLocalValue(value)
  }, [value])

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value
      setLocalValue(newValue)
      onChange(newValue)
    },
    [onChange]
  )

  const isValid = localValue.length >= minLength

  return (
    <div className={`space-y-2 ${className}`} data-testid="typed-signature">
      <label htmlFor="typed-signature-input" className="block text-sm font-medium text-gray-700">
        Your Name
      </label>
      <div className="relative">
        <input
          id="typed-signature-input"
          type="text"
          value={localValue}
          onChange={handleChange}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          disabled={disabled}
          placeholder={placeholder}
          minLength={minLength}
          maxLength={maxLength}
          aria-describedby="typed-signature-help"
          aria-invalid={localValue.length > 0 && !isValid}
          className={`
            w-full px-4 py-3 text-xl font-signature
            border-2 rounded-lg
            min-h-[44px]
            transition-colors
            ${
              isFocused
                ? 'border-indigo-500 ring-2 ring-indigo-200'
                : isValid
                  ? 'border-green-400'
                  : 'border-gray-300'
            }
            ${disabled ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'}
            focus:outline-none
          `}
          data-testid="typed-signature-input"
        />
        {isValid && !disabled && (
          <span
            className="absolute right-3 top-1/2 -translate-y-1/2 text-green-500"
            aria-hidden="true"
          >
            ✓
          </span>
        )}
      </div>
      <p id="typed-signature-help" className="text-sm text-gray-500">
        Type your name exactly as you want it to appear on the agreement.
      </p>
    </div>
  )
}
