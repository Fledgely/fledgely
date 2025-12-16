'use client'

import { useCallback } from 'react'
import { cn } from '@/lib/utils'
import { useQuickStartWizard } from '../QuickStartWizardProvider'

/**
 * Screen time preset options
 */
const SCREEN_TIME_PRESETS = [
  { value: 30, label: '30 minutes', description: 'Very limited' },
  { value: 60, label: '1 hour', description: 'Recommended for younger kids' },
  { value: 90, label: '1.5 hours', description: 'Moderate' },
  { value: 120, label: '2 hours', description: 'Standard' },
  { value: 180, label: '3 hours', description: 'Extended for older kids' },
]

/**
 * Screen Time Decision Step Component
 *
 * Story 4.4: Quick Start Wizard - Task 3.1
 * AC #2: Wizard presents 3-5 key decisions (screen time, bedtime cutoff, monitoring level)
 * AC #3: Defaults are pre-populated from template (parent can adjust or accept)
 *
 * Features:
 * - Slider/preset options for screen time
 * - Pre-populated defaults from template
 * - Impact preview showing weekly total
 *
 * @example
 * ```tsx
 * <ScreenTimeDecisionStep />
 * ```
 */
export function ScreenTimeDecisionStep() {
  const { decisions, setDecision } = useQuickStartWizard()
  const { screenTimeMinutes } = decisions

  const handleScreenTimeChange = useCallback(
    (value: number) => {
      setDecision('screenTimeMinutes', value)
    },
    [setDecision]
  )

  // Calculate weekly total (5 school days + 2 weekend days with 50% more)
  const weeklyTotal = screenTimeMinutes * 5 + Math.round(screenTimeMinutes * 1.5) * 2

  return (
    <div className="space-y-6">
      {/* Step header */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900">
          Daily Screen Time Limit
        </h2>
        <p className="mt-1 text-gray-600">
          Set a daily screen time limit for school days. Weekend limits are
          automatically 50% more.
        </p>
      </div>

      {/* Preset options */}
      <div className="space-y-3" role="radiogroup" aria-label="Screen time options">
        {SCREEN_TIME_PRESETS.map((preset) => {
          const isSelected = screenTimeMinutes === preset.value

          return (
            <button
              key={preset.value}
              type="button"
              role="radio"
              aria-checked={isSelected}
              onClick={() => handleScreenTimeChange(preset.value)}
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
              <div
                className={cn(
                  'text-sm',
                  isSelected ? 'text-blue-600' : 'text-gray-400'
                )}
              >
                {Math.round(preset.value * 1.5)} min weekends
              </div>
            </button>
          )
        })}
      </div>

      {/* Custom slider for fine-tuning */}
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
        <label htmlFor="screen-time-slider" className="block text-sm font-medium text-gray-700">
          Or adjust precisely: {screenTimeMinutes} minutes
        </label>
        <input
          type="range"
          id="screen-time-slider"
          min={15}
          max={240}
          step={15}
          value={screenTimeMinutes}
          onChange={(e) => handleScreenTimeChange(Number(e.target.value))}
          className="mt-2 h-2 w-full cursor-pointer appearance-none rounded-lg bg-gray-200 accent-blue-600"
          aria-valuemin={15}
          aria-valuemax={240}
          aria-valuenow={screenTimeMinutes}
          aria-valuetext={`${screenTimeMinutes} minutes per day`}
        />
        <div className="mt-1 flex justify-between text-xs text-gray-500">
          <span>15 min</span>
          <span>4 hours</span>
        </div>
      </div>

      {/* Impact preview */}
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
        <div className="flex items-start gap-3">
          <svg
            className="h-5 w-5 text-blue-600"
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
          <div>
            <div className="font-medium text-blue-900">This means...</div>
            <p className="mt-1 text-sm text-blue-700">
              About {Math.round(weeklyTotal / 60)} hours per week total. On school days,
              your child gets {screenTimeMinutes} minutes, and on weekends{' '}
              {Math.round(screenTimeMinutes * 1.5)} minutes.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
