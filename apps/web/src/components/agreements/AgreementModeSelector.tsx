/**
 * Agreement Mode Selector Component.
 *
 * Story 5.6: Agreement-Only Mode Selection - AC1, AC6
 *
 * Allows parents to choose between "Agreement Only" (no monitoring)
 * and "Agreement + Monitoring" (full device tracking).
 */

import type { AgreementMode } from '@fledgely/shared/contracts'

interface AgreementModeSelectorProps {
  /** Currently selected mode */
  selectedMode: AgreementMode | null
  /** Callback when mode is selected */
  onModeSelect: (mode: AgreementMode) => void
  /** Child name for personalized messaging */
  childName: string
  /** Whether selection is disabled */
  disabled?: boolean
}

interface ModeFeature {
  text: string
  included: boolean
}

interface ModeConfig {
  title: string
  description: string
  icon: string
  features: ModeFeature[]
  color: string
  bgColor: string
  borderColor: string
}

const MODE_CONFIGS: Record<AgreementMode, ModeConfig> = {
  agreement_only: {
    title: 'Agreement Only',
    description: 'Set screen time rules and family expectations together without device tracking',
    icon: '📝',
    features: [
      { text: 'Screen time limits', included: true },
      { text: 'App and game rules', included: true },
      { text: 'Family agreements', included: true },
      { text: 'Reward system', included: true },
      { text: 'Device screenshots', included: false },
      { text: 'Activity tracking', included: false },
    ],
    color: 'text-blue-800',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-500',
  },
  full_monitoring: {
    title: 'Agreement + Monitoring',
    description: 'Full protection with device tracking, screenshots, and activity alerts',
    icon: '🛡️',
    features: [
      { text: 'Screen time limits', included: true },
      { text: 'App and game rules', included: true },
      { text: 'Family agreements', included: true },
      { text: 'Reward system', included: true },
      { text: 'Device screenshots', included: true },
      { text: 'Activity tracking', included: true },
    ],
    color: 'text-purple-800',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-500',
  },
}

/**
 * Renders a single mode selection card.
 */
function ModeCard({
  mode,
  config,
  isSelected,
  onSelect,
  disabled,
}: {
  mode: AgreementMode
  config: ModeConfig
  isSelected: boolean
  onSelect: () => void
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={disabled}
      aria-pressed={isSelected}
      data-testid={`mode-card-${mode}`}
      className={`
        relative flex flex-col p-6 rounded-xl border-2 transition-all min-h-[48px]
        focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
        ${isSelected ? `${config.borderColor} ${config.bgColor} shadow-lg` : 'border-gray-200 bg-white hover:border-gray-300'}
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
      `}
    >
      {/* Selection indicator */}
      {isSelected && (
        <div
          className={`absolute top-3 right-3 w-6 h-6 rounded-full ${config.borderColor.replace('border', 'bg')} flex items-center justify-center`}
          aria-hidden="true"
        >
          <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
              clipRule="evenodd"
            />
          </svg>
        </div>
      )}

      {/* Icon and title */}
      <div className="flex items-center gap-3 mb-3">
        <span className="text-3xl" role="img" aria-hidden="true">
          {config.icon}
        </span>
        <h3 className={`text-lg font-semibold ${config.color}`}>{config.title}</h3>
      </div>

      {/* Description */}
      <p className="text-gray-600 text-sm mb-4 text-left">{config.description}</p>

      {/* Features list */}
      <ul className="space-y-2 text-left" aria-label={`${config.title} features`}>
        {config.features.map((feature, index) => (
          <li
            key={index}
            className={`flex items-center gap-2 text-sm ${feature.included ? 'text-gray-700' : 'text-gray-400'}`}
          >
            {feature.included ? (
              <span className="text-green-500" aria-hidden="true">
                ✓
              </span>
            ) : (
              <span className="text-gray-300" aria-hidden="true">
                ✗
              </span>
            )}
            <span>
              {feature.text}
              {!feature.included && <span className="sr-only"> (not included)</span>}
            </span>
          </li>
        ))}
      </ul>
    </button>
  )
}

/**
 * AgreementModeSelector renders mode selection cards for choosing
 * between agreement-only and full monitoring modes.
 */
export function AgreementModeSelector({
  selectedMode,
  onModeSelect,
  childName,
  disabled = false,
}: AgreementModeSelectorProps) {
  return (
    <div
      className="w-full"
      role="radiogroup"
      aria-label="Select agreement mode"
      data-testid="agreement-mode-selector"
    >
      {/* Header */}
      <div className="text-center mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Choose How to Protect {childName}
        </h2>
        <p className="text-gray-600">
          Pick the option that works best for your family. You can change this later.
        </p>
      </div>

      {/* Mode cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {(Object.keys(MODE_CONFIGS) as AgreementMode[]).map((mode) => (
          <ModeCard
            key={mode}
            mode={mode}
            config={MODE_CONFIGS[mode]}
            isSelected={selectedMode === mode}
            onSelect={() => onModeSelect(mode)}
            disabled={disabled}
          />
        ))}
      </div>

      {/* Child-friendly explanation (NFR65: 6th-grade reading level) */}
      <div className="mt-6 p-4 bg-amber-50 rounded-lg border border-amber-200">
        <h3 className="font-medium text-amber-900 mb-2">What does this mean?</h3>
        {selectedMode === 'agreement_only' ? (
          <p className="text-amber-800 text-sm">
            You and {childName} will make rules together about screen time and apps. {childName}
            &apos;s devices won&apos;t be watched, but you&apos;ll both promise to follow the rules
            you agree on.
          </p>
        ) : selectedMode === 'full_monitoring' ? (
          <p className="text-amber-800 text-sm">
            You and {childName} will make rules together, plus you&apos;ll be able to see what{' '}
            {childName} does on their devices. This helps keep {childName} safe online.
          </p>
        ) : (
          <p className="text-amber-800 text-sm">
            Choose an option above to see what it means for you and {childName}.
          </p>
        )}
      </div>

      {/* Upgrade notice for agreement_only */}
      {selectedMode === 'agreement_only' && (
        <p className="mt-4 text-center text-sm text-gray-500">
          You can add device monitoring later if you decide you need it.
        </p>
      )}
    </div>
  )
}
