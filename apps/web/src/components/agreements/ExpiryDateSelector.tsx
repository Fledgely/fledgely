/**
 * ExpiryDateSelector Component - Story 35.1
 *
 * Component for selecting agreement expiry duration.
 * AC1: Expiry options (3 months, 6 months, 1 year, no expiry)
 * AC2: Age-based recommendations
 */

import {
  EXPIRY_DURATIONS,
  EXPIRY_MESSAGES,
  getRecommendedExpiry,
  type ExpiryDuration,
} from '@fledgely/shared'

export interface ExpiryDateSelectorProps {
  /** Currently selected duration */
  selectedDuration: ExpiryDuration
  /** Callback when duration is selected */
  onSelect: (duration: ExpiryDuration) => void
  /** Child's age for recommendations (optional) */
  childAge?: number
  /** Whether the selector is disabled */
  disabled?: boolean
  /** Compact mode hides descriptions */
  compact?: boolean
}

/**
 * Allows selection of agreement expiry duration with age-based recommendations.
 */
export function ExpiryDateSelector({
  selectedDuration,
  onSelect,
  childAge,
  disabled = false,
  compact = false,
}: ExpiryDateSelectorProps) {
  const recommendedDuration = childAge !== undefined ? getRecommendedExpiry(childAge) : null
  const isYoungerChild = childAge !== undefined && childAge < 13

  const handleSelect = (duration: ExpiryDuration) => {
    if (!disabled) {
      onSelect(duration)
    }
  }

  const recommendationId = 'expiry-recommendation'

  return (
    <div className="space-y-4">
      {/* Header */}
      {!compact && (
        <div className="space-y-1">
          <h3 className="text-lg font-semibold text-gray-900">{EXPIRY_MESSAGES.selector.header}</h3>
          <p className="text-sm text-gray-600">{EXPIRY_MESSAGES.selector.description}</p>
        </div>
      )}

      {/* Age-based recommendation message */}
      {childAge !== undefined && !compact && (
        <p id={recommendationId} className="text-sm text-blue-700 bg-blue-50 rounded-lg p-3">
          {isYoungerChild
            ? EXPIRY_MESSAGES.recommendations.youngerChildren
            : EXPIRY_MESSAGES.recommendations.teens}
        </p>
      )}

      {/* Options */}
      <div
        role="radiogroup"
        aria-label={EXPIRY_MESSAGES.selector.header}
        aria-describedby={childAge !== undefined ? recommendationId : undefined}
        className={compact ? 'flex flex-wrap gap-2' : 'space-y-2'}
      >
        {EXPIRY_DURATIONS.map((option) => {
          const isSelected = selectedDuration === option.id
          const isRecommended = recommendedDuration === option.id

          return (
            <label
              key={option.id}
              data-option={option.id}
              data-recommended={isRecommended ? 'true' : undefined}
              className={`
                relative flex items-start cursor-pointer rounded-lg border p-4 transition-all
                ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-blue-300'}
                ${isSelected ? 'border-blue-500 ring-2 ring-blue-200 bg-blue-50' : 'border-gray-200 bg-white'}
                ${compact ? 'p-2' : 'p-4'}
              `}
            >
              <input
                type="radio"
                name="expiry-duration"
                value={option.id}
                checked={isSelected}
                disabled={disabled}
                onChange={() => handleSelect(option.id)}
                className="sr-only"
                aria-label={option.label}
              />

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`font-medium ${isSelected ? 'text-blue-900' : 'text-gray-900'}`}>
                    {option.label}
                  </span>
                  {isRecommended && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                      {EXPIRY_MESSAGES.selector.recommendedLabel}
                    </span>
                  )}
                </div>
                {!compact && (
                  <p className={`mt-1 text-sm ${isSelected ? 'text-blue-700' : 'text-gray-500'}`}>
                    {option.description}
                  </p>
                )}
              </div>

              {/* Selection indicator */}
              <div
                className={`
                  flex-shrink-0 ml-3 w-5 h-5 rounded-full border-2 flex items-center justify-center
                  ${isSelected ? 'border-blue-500 bg-blue-500' : 'border-gray-300'}
                `}
              >
                {isSelected && <div className="w-2 h-2 rounded-full bg-white" aria-hidden="true" />}
              </div>
            </label>
          )
        })}
      </div>
    </div>
  )
}
