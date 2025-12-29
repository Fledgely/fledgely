/**
 * Consent Checkbox Component.
 *
 * Story 6.1: Child Digital Signature Ceremony - AC3
 *
 * Displays a consent acknowledgment checkbox with child-friendly language.
 * Required before signature can be submitted.
 */

'use client'

interface ConsentCheckboxProps {
  /** Whether the checkbox is checked */
  checked: boolean
  /** Called when checkbox state changes */
  onChange: (checked: boolean) => void
  /** Whether the checkbox is disabled */
  disabled?: boolean
  /** Custom label text (defaults to child-friendly text) */
  label?: string
  /** Additional CSS classes */
  className?: string
}

export function ConsentCheckbox({
  checked,
  onChange,
  disabled = false,
  label = 'I understand and agree to follow these rules',
  className = '',
}: ConsentCheckboxProps) {
  return (
    <div className={`${className}`} data-testid="consent-checkbox">
      <label
        className={`
          flex items-start gap-3 p-4 rounded-lg border-2
          min-h-[44px]
          transition-colors cursor-pointer
          ${checked ? 'border-green-400 bg-green-50' : 'border-gray-300 bg-white'}
          ${disabled ? 'cursor-not-allowed opacity-60' : 'hover:border-indigo-300'}
        `}
      >
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          disabled={disabled}
          className={`
            mt-0.5 h-6 w-6 rounded
            text-indigo-600
            border-2 border-gray-300
            focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2
            ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}
          `}
          aria-describedby="consent-description"
          data-testid="consent-checkbox-input"
        />
        <div className="flex-1">
          <span className="text-base font-medium text-gray-800">{label}</span>
          <p id="consent-description" className="mt-1 text-sm text-gray-600">
            By checking this box, you promise to try your best to follow the agreement you helped
            create.
          </p>
        </div>
        {checked && (
          <span className="text-green-500 text-xl" aria-hidden="true">
            ✓
          </span>
        )}
      </label>
    </div>
  )
}
