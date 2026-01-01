/**
 * RenewalModeSelector Component - Story 35.3
 *
 * Component for selecting renewal mode.
 * AC1: Option: "Renew as-is" or "Renew with changes"
 * AC2: "Renew as-is" extends expiry with same terms
 * AC3: "Renew with changes" enters modification flow
 */

import { type RenewalMode, type ExpiryDuration, EXPIRY_DURATION_LABELS } from '@fledgely/shared'
import { getRenewalModeOptions } from '../../services/agreementRenewalService'

export interface RenewalModeSelectorProps {
  /** Callback when a mode is selected */
  onModeSelected: (mode: RenewalMode) => void
  /** Callback when cancel is clicked */
  onCancel: () => void
  /** Current agreement expiry date */
  currentExpiryDate?: Date
  /** Current agreement duration */
  currentDuration?: ExpiryDuration
}

/**
 * Component for selecting renewal mode.
 */
export function RenewalModeSelector({
  onModeSelected,
  onCancel,
  currentExpiryDate,
  currentDuration,
}: RenewalModeSelectorProps) {
  const modeOptions = getRenewalModeOptions()

  // Format current expiry date
  const formattedExpiryDate = currentExpiryDate
    ? currentExpiryDate.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : null

  // Format current duration
  const formattedDuration = currentDuration ? EXPIRY_DURATION_LABELS[currentDuration] : null

  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold mb-4">How would you like to renew?</h2>

      {/* Current terms info */}
      {(formattedExpiryDate || formattedDuration) && (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-600 mb-2">Current agreement terms:</p>
          {formattedExpiryDate && (
            <p className="text-sm">
              <span className="font-medium">Expires:</span> {formattedExpiryDate}
            </p>
          )}
          {formattedDuration && (
            <p className="text-sm">
              <span className="font-medium">Duration:</span> {formattedDuration}
            </p>
          )}
        </div>
      )}

      {/* Mode options */}
      <div className="space-y-4 mb-6">
        {modeOptions.map((option) => (
          <button
            key={option.mode}
            type="button"
            data-testid={`mode-${option.mode}`}
            onClick={() => onModeSelected(option.mode)}
            className="w-full p-4 text-left border-2 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors"
          >
            <div className="font-medium text-lg">{option.title}</div>
            <div className="text-gray-600 mt-1">{option.description}</div>
            {option.requiresModificationFlow && (
              <div className="text-sm text-blue-600 mt-2">→ Opens modification flow</div>
            )}
          </button>
        ))}
      </div>

      {/* Cancel button */}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-gray-600 hover:text-gray-800"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
