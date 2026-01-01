/**
 * DeclineReasonSelector Component - Story 34.5
 *
 * Provides predefined respectful decline reasons for proposal responses.
 * AC1: Decline reason required
 * AC2: Respectful language
 */

import { DECLINE_REASONS, DECLINE_MESSAGES } from '@fledgely/shared'

export interface DeclineReasonSelectorProps {
  /** Currently selected reason ID */
  selectedReasonId: string | null
  /** Callback when a reason is selected */
  onReasonSelect: (reasonId: string) => void
  /** Custom reason text (when "Other" is selected) */
  customReason: string
  /** Callback when custom reason changes */
  onCustomReasonChange: (reason: string) => void
  /** Whether the selector is disabled */
  disabled?: boolean
}

/**
 * Renders a selector for predefined decline reasons with respectful language.
 */
export function DeclineReasonSelector({
  selectedReasonId,
  onReasonSelect,
  customReason,
  onCustomReasonChange,
  disabled = false,
}: DeclineReasonSelectorProps) {
  const showCustomInput = selectedReasonId === 'custom'
  const isCustomTooShort = customReason.length < DECLINE_MESSAGES.customMinChars

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="text-center">
        <h3 id="decline-reason-header" className="text-lg font-semibold text-gray-900">
          {DECLINE_MESSAGES.header}
        </h3>
        <p className="text-sm text-gray-600 mt-1">{DECLINE_MESSAGES.subheader}</p>
      </div>

      {/* Reason buttons */}
      <div className="space-y-2" role="radiogroup" aria-labelledby="decline-reason-header">
        {DECLINE_REASONS.map((reason) => {
          const isSelected = selectedReasonId === reason.id

          return (
            <button
              key={reason.id}
              type="button"
              role="radio"
              aria-checked={isSelected}
              onClick={() => onReasonSelect(reason.id)}
              disabled={disabled}
              className={`
                w-full p-3 text-left rounded-lg border-2 transition-all
                ${
                  isSelected
                    ? 'border-blue-500 bg-blue-50 text-blue-900'
                    : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                }
                ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              `}
            >
              <span className="text-sm font-medium">{reason.label}</span>
            </button>
          )
        })}
      </div>

      {/* Custom reason input */}
      {showCustomInput && (
        <div className="space-y-2">
          <label htmlFor="custom-reason" className="block text-sm font-medium text-gray-700">
            {DECLINE_MESSAGES.customPrompt}
          </label>
          <textarea
            id="custom-reason"
            value={customReason}
            onChange={(e) => onCustomReasonChange(e.target.value)}
            placeholder="Share your thoughts..."
            disabled={disabled}
            rows={3}
            maxLength={500}
            className={`
              w-full p-3 border rounded-lg text-sm resize-none
              ${disabled ? 'opacity-50 cursor-not-allowed bg-gray-50' : 'bg-white'}
              ${isCustomTooShort && customReason.length > 0 ? 'border-yellow-400' : 'border-gray-300'}
              focus:ring-2 focus:ring-blue-500 focus:border-blue-500
            `}
          />
          <div className="flex justify-between text-xs">
            <span className={isCustomTooShort ? 'text-yellow-600' : 'text-gray-500'}>
              {isCustomTooShort && customReason.length > 0
                ? `Please write at least ${DECLINE_MESSAGES.customMinChars} characters`
                : DECLINE_MESSAGES.encouragement}
            </span>
            <span className="text-gray-400">{customReason.length} characters</span>
          </div>
        </div>
      )}
    </div>
  )
}
