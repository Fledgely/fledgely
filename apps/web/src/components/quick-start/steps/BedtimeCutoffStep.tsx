'use client'

import { useCallback } from 'react'
import { cn } from '@/lib/utils'
import { useQuickStartWizard } from '../QuickStartWizardProvider'

/**
 * Bedtime cutoff preset options
 */
const BEDTIME_PRESETS = [
  { value: '19:00', label: '7:00 PM', description: 'Early (ages 5-7)' },
  { value: '20:00', label: '8:00 PM', description: 'Standard (ages 8-10)' },
  { value: '21:00', label: '9:00 PM', description: 'Later (ages 11-13)' },
  { value: '22:00', label: '10:00 PM', description: 'Teen (ages 14-16)' },
]

/**
 * Format time from 24h to 12h display
 */
function formatTime(time24: string): string {
  const [hours, minutes] = time24.split(':').map(Number)
  const period = hours >= 12 ? 'PM' : 'AM'
  const hours12 = hours % 12 || 12
  return `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`
}

/**
 * Bedtime Cutoff Step Component
 *
 * Story 4.4: Quick Start Wizard - Task 3.2
 * AC #2: Wizard presents 3-5 key decisions (screen time, bedtime cutoff, monitoring level)
 * AC #3: Defaults are pre-populated from template (parent can adjust or accept)
 *
 * Features:
 * - Time picker for bedtime cutoff
 * - Pre-populated defaults from template
 * - Impact preview
 *
 * @example
 * ```tsx
 * <BedtimeCutoffStep />
 * ```
 */
export function BedtimeCutoffStep() {
  const { decisions, setDecision } = useQuickStartWizard()
  const { bedtimeCutoff } = decisions

  const handleBedtimeChange = useCallback(
    (value: string) => {
      setDecision('bedtimeCutoff', value)
    },
    [setDecision]
  )

  return (
    <div className="space-y-6">
      {/* Step header */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Bedtime Screen Cutoff</h2>
        <p className="mt-1 text-gray-600">
          Set a time when all screens must be put away. This helps ensure healthy sleep
          habits.
        </p>
      </div>

      {/* Preset options */}
      <div className="space-y-3" role="radiogroup" aria-label="Bedtime cutoff options">
        {BEDTIME_PRESETS.map((preset) => {
          const isSelected = bedtimeCutoff === preset.value

          return (
            <button
              key={preset.value}
              type="button"
              role="radio"
              aria-checked={isSelected}
              onClick={() => handleBedtimeChange(preset.value)}
              className={cn(
                'flex w-full items-center justify-between rounded-lg border-2 p-4 text-left transition-all',
                'min-h-[64px] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
                isSelected
                  ? 'border-blue-600 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              )}
            >
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    'flex h-4 w-4 items-center justify-center rounded-full border-2',
                    isSelected
                      ? 'border-blue-600 bg-blue-600'
                      : 'border-gray-300'
                  )}
                >
                  {isSelected && (
                    <div className="h-1.5 w-1.5 rounded-full bg-white" />
                  )}
                </div>
                <div>
                  <div
                    className={cn(
                      'font-medium',
                      isSelected ? 'text-blue-900' : 'text-gray-900'
                    )}
                  >
                    {preset.label}
                  </div>
                  <div
                    className={cn(
                      'text-sm',
                      isSelected ? 'text-blue-700' : 'text-gray-500'
                    )}
                  >
                    {preset.description}
                  </div>
                </div>
              </div>
              <span
                className={cn(
                  'text-2xl',
                  isSelected ? 'opacity-100' : 'opacity-30'
                )}
                role="img"
                aria-hidden="true"
              >
                🌙
              </span>
            </button>
          )
        })}
      </div>

      {/* Custom time picker */}
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
        <label
          htmlFor="bedtime-picker"
          className="block text-sm font-medium text-gray-700"
        >
          Or choose a custom time:
        </label>
        <input
          type="time"
          id="bedtime-picker"
          value={bedtimeCutoff}
          onChange={(e) => handleBedtimeChange(e.target.value)}
          min="18:00"
          max="23:00"
          className={cn(
            'mt-2 block w-full rounded-md border-gray-300 px-3 py-2',
            'text-lg shadow-sm focus:border-blue-500 focus:ring-blue-500'
          )}
          aria-describedby="bedtime-help"
        />
        <p id="bedtime-help" className="mt-1 text-xs text-gray-500">
          Choose a time between 6:00 PM and 11:00 PM
        </p>
      </div>

      {/* Impact preview */}
      <div className="rounded-lg border border-purple-200 bg-purple-50 p-4">
        <div className="flex items-start gap-3">
          <span className="text-2xl" role="img" aria-label="Moon icon">
            🌙
          </span>
          <div>
            <div className="font-medium text-purple-900">This means...</div>
            <p className="mt-1 text-sm text-purple-700">
              No screens after {formatTime(bedtimeCutoff)}. All devices should be put
              away at this time to help your child wind down for sleep.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
