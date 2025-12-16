'use client'

import { useCallback } from 'react'
import { cn } from '@/lib/utils'
import { useQuickStartWizard, type MonitoringLevel } from '../QuickStartWizardProvider'

/**
 * Monitoring level options with detailed descriptions
 */
const MONITORING_LEVELS: Array<{
  value: MonitoringLevel
  label: string
  description: string
  icon: string
  features: string[]
  privacyNote: string
}> = [
  {
    value: 'light',
    label: 'Light',
    description: 'Basic oversight with minimal intrusion',
    icon: '👀',
    features: [
      'Weekly activity summaries',
      'Time limit enforcement only',
      'No screenshot captures',
      'App usage totals',
    ],
    privacyNote: 'Best for building trust with older teens',
  },
  {
    value: 'moderate',
    label: 'Moderate',
    description: 'Balanced monitoring with regular check-ins',
    icon: '🔍',
    features: [
      'Daily activity summaries',
      'Periodic screenshots (every 30 min)',
      'App and website categories',
      'Flag concerning content',
    ],
    privacyNote: 'Recommended for most families',
  },
  {
    value: 'comprehensive',
    label: 'Comprehensive',
    description: 'Detailed oversight for younger or at-risk children',
    icon: '🛡️',
    features: [
      'Real-time activity feed',
      'Frequent screenshots (every 10 min)',
      'Detailed app/website logging',
      'Immediate alerts for concerns',
    ],
    privacyNote: 'Best for younger children (5-10)',
  },
]

/**
 * Monitoring Level Step Component
 *
 * Story 4.4: Quick Start Wizard - Task 3.3
 * AC #2: Wizard presents 3-5 key decisions (screen time, bedtime cutoff, monitoring level)
 * AC #3: Defaults are pre-populated from template (parent can adjust or accept)
 *
 * Features:
 * - Visual cards for Light / Moderate / Comprehensive
 * - Description of what each level means
 * - Privacy explanation per level
 *
 * @example
 * ```tsx
 * <MonitoringLevelStep />
 * ```
 */
export function MonitoringLevelStep() {
  const { decisions, setDecision } = useQuickStartWizard()
  const { monitoringLevel } = decisions

  const handleMonitoringChange = useCallback(
    (value: MonitoringLevel) => {
      setDecision('monitoringLevel', value)
    },
    [setDecision]
  )

  return (
    <div className="space-y-6">
      {/* Step header */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Monitoring Level</h2>
        <p className="mt-1 text-gray-600">
          Choose how closely you want to monitor your child's device activity. You can
          always adjust this later.
        </p>
      </div>

      {/* Monitoring level cards */}
      <div
        className="grid gap-4 sm:grid-cols-1 md:grid-cols-3"
        role="radiogroup"
        aria-label="Monitoring level options"
      >
        {MONITORING_LEVELS.map((level) => {
          const isSelected = monitoringLevel === level.value

          return (
            <button
              key={level.value}
              type="button"
              role="radio"
              aria-checked={isSelected}
              onClick={() => handleMonitoringChange(level.value)}
              className={cn(
                'flex flex-col items-start rounded-lg border-2 p-4 text-left transition-all',
                'min-h-[200px] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
                isSelected
                  ? 'border-blue-600 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              )}
            >
              {/* Header */}
              <div className="flex w-full items-start justify-between">
                <span className="text-3xl" role="img" aria-hidden="true">
                  {level.icon}
                </span>
                {isSelected && (
                  <svg
                    className="h-5 w-5 text-blue-600"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                    aria-hidden="true"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
              </div>

              {/* Title and description */}
              <div className="mt-3">
                <div
                  className={cn(
                    'text-lg font-semibold',
                    isSelected ? 'text-blue-900' : 'text-gray-900'
                  )}
                >
                  {level.label}
                </div>
                <p
                  className={cn(
                    'mt-1 text-sm',
                    isSelected ? 'text-blue-700' : 'text-gray-500'
                  )}
                >
                  {level.description}
                </p>
              </div>

              {/* Features list */}
              <ul className="mt-3 flex-1 space-y-1">
                {level.features.map((feature, index) => (
                  <li
                    key={index}
                    className={cn(
                      'flex items-start gap-2 text-xs',
                      isSelected ? 'text-blue-700' : 'text-gray-500'
                    )}
                  >
                    <span className="mt-0.5">•</span>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              {/* Privacy note */}
              <div
                className={cn(
                  'mt-3 w-full rounded bg-opacity-50 px-2 py-1 text-xs italic',
                  isSelected
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-gray-100 text-gray-500'
                )}
              >
                {level.privacyNote}
              </div>
            </button>
          )
        })}
      </div>

      {/* Privacy assurance */}
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
        <div className="flex items-start gap-3">
          <svg
            className="h-5 w-5 flex-shrink-0 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
            />
          </svg>
          <div>
            <div className="font-medium text-gray-900">Privacy & Transparency</div>
            <p className="mt-1 text-sm text-gray-500">
              Your child will always know they're being monitored. Fledgely is
              designed for trust and transparency, not stealth surveillance. All data
              stays private to your family.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
