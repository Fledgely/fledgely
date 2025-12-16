'use client'

import { useCallback } from 'react'
import type { AgreementMode } from '@fledgely/contracts'
import {
  AGREEMENT_MODE_LABELS,
  AGREEMENT_MODE_DESCRIPTIONS,
  AGREEMENT_MODE_FEATURES,
} from '@fledgely/contracts'

interface AgreementModeSelectorProps {
  selectedMode: AgreementMode
  onModeChange: (mode: AgreementMode) => void
  disabled?: boolean
}

/**
 * Agreement Mode Selector Component
 *
 * Story 5.6: Agreement-Only Mode Selection - Task 2
 *
 * Allows parents to choose between Full Agreement (with monitoring)
 * and Agreement Only (without monitoring) modes.
 *
 * Design considerations:
 * - Large, clear cards for easy selection (AC #6)
 * - Shows included/excluded features visually
 * - 44x44px touch targets (NFR49)
 * - Keyboard accessible (NFR43)
 * - 6th-grade reading level (NFR65)
 *
 * @example
 * ```tsx
 * <AgreementModeSelector
 *   selectedMode={mode}
 *   onModeChange={setMode}
 * />
 * ```
 */
export function AgreementModeSelector({
  selectedMode,
  onModeChange,
  disabled = false,
}: AgreementModeSelectorProps) {
  const handleModeSelect = useCallback(
    (mode: AgreementMode) => {
      if (!disabled) {
        onModeChange(mode)
      }
    },
    [disabled, onModeChange]
  )

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent, mode: AgreementMode) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault()
        handleModeSelect(mode)
      }
    },
    [handleModeSelect]
  )

  return (
    <div
      className="flex flex-col items-center justify-center min-h-[400px] px-6 py-8"
      data-testid="agreement-mode-selector"
    >
      {/* Header */}
      <div className="text-center mb-8 max-w-2xl">
        <h2
          id="mode-selector-title"
          className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100 mb-4"
        >
          Choose Your Agreement Type
        </h2>
        <p className="text-lg text-gray-600 dark:text-gray-300">
          Pick the type of agreement that works best for your family.
          You can always change this later.
        </p>
      </div>

      {/* Mode Cards */}
      <div
        role="radiogroup"
        aria-labelledby="mode-selector-title"
        aria-describedby="mode-selector-description"
        className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-4xl"
      >
        {/* Full Agreement Card */}
        <ModeCard
          mode="full"
          isSelected={selectedMode === 'full'}
          onSelect={() => handleModeSelect('full')}
          onKeyDown={(e) => handleKeyDown(e, 'full')}
          disabled={disabled}
        />

        {/* Agreement Only Card */}
        <ModeCard
          mode="agreement_only"
          isSelected={selectedMode === 'agreement_only'}
          onSelect={() => handleModeSelect('agreement_only')}
          onKeyDown={(e) => handleKeyDown(e, 'agreement_only')}
          disabled={disabled}
        />
      </div>

      {/* Screen reader description */}
      <p id="mode-selector-description" className="sr-only">
        Choose between Full Agreement with device monitoring or Agreement Only without monitoring.
        Use arrow keys to navigate and Enter or Space to select.
      </p>

      {/* Upgrade Note */}
      <div className="mt-8 text-center max-w-2xl">
        <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center justify-center gap-2">
          <svg
            className="w-5 h-5 text-blue-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span>
            You can upgrade from Agreement Only to Full Agreement anytime.
          </span>
        </p>
      </div>
    </div>
  )
}

/**
 * Individual Mode Card Component
 */
interface ModeCardProps {
  mode: AgreementMode
  isSelected: boolean
  onSelect: () => void
  onKeyDown: (e: React.KeyboardEvent) => void
  disabled: boolean
}

function ModeCard({
  mode,
  isSelected,
  onSelect,
  onKeyDown,
  disabled,
}: ModeCardProps) {
  const features = AGREEMENT_MODE_FEATURES[mode]
  const label = AGREEMENT_MODE_LABELS[mode]
  const description = AGREEMENT_MODE_DESCRIPTIONS[mode]

  const isFullMode = mode === 'full'

  return (
    <div
      role="radio"
      aria-checked={isSelected}
      aria-label={`${label}: ${description}`}
      tabIndex={disabled ? -1 : 0}
      onClick={onSelect}
      onKeyDown={onKeyDown}
      data-testid={`mode-card-${mode}`}
      className={`
        relative p-6 rounded-xl border-2 cursor-pointer transition-all
        min-h-[44px] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
        ${
          isSelected
            ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-500'
            : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600'
        }
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
      `}
    >
      {/* Selected Indicator */}
      {isSelected && (
        <div className="absolute top-4 right-4" aria-hidden="true">
          <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
          </div>
        </div>
      )}

      {/* Icon */}
      <div
        className={`w-14 h-14 mb-4 rounded-lg flex items-center justify-center ${
          isFullMode
            ? 'bg-purple-100 dark:bg-purple-900/30'
            : 'bg-green-100 dark:bg-green-900/30'
        }`}
        aria-hidden="true"
      >
        {isFullMode ? (
          // Monitor/Shield icon for Full Agreement
          <svg
            className="w-7 h-7 text-purple-600 dark:text-purple-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
            />
          </svg>
        ) : (
          // Handshake/Trust icon for Agreement Only
          <svg
            className="w-7 h-7 text-green-600 dark:text-green-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 11.5V14m0-2.5v-6a1.5 1.5 0 113 0m-3 6a1.5 1.5 0 00-3 0v2a7.5 7.5 0 0015 0v-5a1.5 1.5 0 00-3 0m-6-3V11m0-5.5v-1a1.5 1.5 0 013 0v1m0 0V11m0-5.5a1.5 1.5 0 013 0v3m0 0V11"
            />
          </svg>
        )}
      </div>

      {/* Title */}
      <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
        {label}
      </h3>

      {/* Description - 6th grade reading level */}
      <p className="text-gray-600 dark:text-gray-300 mb-4 text-sm">
        {description}
      </p>

      {/* Included Features */}
      <div className="mb-4">
        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
          Includes
        </p>
        <ul className="space-y-1.5">
          {features.included.map((feature, index) => (
            <li
              key={index}
              className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300"
            >
              <svg
                className="w-4 h-4 text-green-500 flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span>{feature}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Excluded Features (for Agreement Only) */}
      {features.excluded.length > 0 && (
        <div>
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
            Not Included
          </p>
          <ul className="space-y-1.5">
            {features.excluded.map((feature, index) => (
              <li
                key={index}
                className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400"
              >
                <svg
                  className="w-4 h-4 text-gray-400 flex-shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                <span>{feature}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Recommended Badge for Full */}
      {isFullMode && (
        <div className="mt-4 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-xs font-medium">
          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
            <path
              fillRule="evenodd"
              d="M10.868 2.884c-.321-.772-1.415-.772-1.736 0l-1.83 4.401-4.753.381c-.833.067-1.171 1.107-.536 1.651l3.62 3.102-1.106 4.637c-.194.813.691 1.456 1.405 1.02L10 15.591l4.069 2.485c.713.436 1.598-.207 1.404-1.02l-1.106-4.637 3.62-3.102c.635-.544.297-1.584-.536-1.65l-4.752-.382-1.831-4.401z"
              clipRule="evenodd"
            />
          </svg>
          <span>Most Popular</span>
        </div>
      )}

      {/* Upgrade Note for Agreement Only */}
      {!isFullMode && (
        <div className="mt-4 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-300 text-xs font-medium">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 10l7-7m0 0l7 7m-7-7v18"
            />
          </svg>
          <span>Can upgrade later</span>
        </div>
      )}
    </div>
  )
}

export default AgreementModeSelector
