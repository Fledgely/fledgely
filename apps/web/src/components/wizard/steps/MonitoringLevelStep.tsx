/**
 * Monitoring Level Step Component.
 *
 * Story 4.4: Quick Start Wizard - AC2
 *
 * Displays monitoring level selection with clear explanations
 * of what each level means.
 */

'use client'

import type { MonitoringLevel } from '../../../hooks/useQuickStartWizard'
import { MONITORING_LEVEL_LABELS } from '../../../data/templates'

interface MonitoringLevelStepProps {
  monitoringLevel: MonitoringLevel
  onSelectLevel: (level: MonitoringLevel) => void
  templateDefault?: MonitoringLevel
}

const MONITORING_LEVELS: MonitoringLevel[] = ['high', 'medium', 'low']

const MONITORING_DESCRIPTIONS: Record<MonitoringLevel, string> = {
  high: 'Regular screenshot reviews and activity monitoring. Best for younger children or new device users.',
  medium:
    'Periodic check-ins with flag-based alerts. Balances trust with oversight for growing independence.',
  low: 'Minimal monitoring with trust-based approach. For teens who have demonstrated responsibility.',
}

const MONITORING_FEATURES: Record<MonitoringLevel, string[]> = {
  high: [
    'Frequent screenshot capture',
    'Real-time activity alerts',
    'App usage tracking',
    'Website history review',
  ],
  medium: [
    'Periodic screenshots',
    'Alerts for concerning content only',
    'Weekly activity summary',
    'Trust-building check-ins',
  ],
  low: ['Minimal screenshots', 'Critical alerts only', 'Monthly reviews', 'Self-reported activity'],
}

const MONITORING_ICONS: Record<MonitoringLevel, React.ReactNode> = {
  high: (
    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
      />
    </svg>
  ),
  medium: (
    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  ),
  low: (
    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
      />
    </svg>
  ),
}

const MONITORING_COLORS: Record<MonitoringLevel, string> = {
  high: 'border-red-200 bg-red-50 text-red-700',
  medium: 'border-yellow-200 bg-yellow-50 text-yellow-700',
  low: 'border-green-200 bg-green-50 text-green-700',
}

export function MonitoringLevelStep({
  monitoringLevel,
  onSelectLevel,
  templateDefault,
}: MonitoringLevelStepProps) {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-xl font-semibold text-gray-900">Choose Monitoring Level</h2>
        <p className="mt-2 text-gray-600">
          How closely should we watch your child&apos;s device activity?
        </p>
      </div>

      <div className="space-y-4" role="radiogroup" aria-label="Select monitoring level">
        {MONITORING_LEVELS.map((level) => (
          <button
            key={level}
            type="button"
            onClick={() => onSelectLevel(level)}
            className={`
              w-full p-4 rounded-lg border-2 text-left transition-all
              focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2
              ${
                monitoringLevel === level
                  ? 'border-primary bg-primary/5 ring-2 ring-primary'
                  : 'border-gray-200 hover:border-primary/50'
              }
            `}
            aria-pressed={monitoringLevel === level}
            aria-label={`Select ${MONITORING_LEVEL_LABELS[level]}`}
          >
            <div className="flex items-start gap-4">
              <div
                className={`
                  p-2 rounded-lg flex-shrink-0
                  ${MONITORING_COLORS[level]}
                `}
              >
                {MONITORING_ICONS[level]}
              </div>

              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-gray-900">{MONITORING_LEVEL_LABELS[level]}</h3>
                  {templateDefault === level && (
                    <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 rounded">
                      Recommended
                    </span>
                  )}
                </div>
                <p className="mt-1 text-sm text-gray-600">{MONITORING_DESCRIPTIONS[level]}</p>
                <ul className="mt-2 grid grid-cols-2 gap-1">
                  {MONITORING_FEATURES[level].map((feature, index) => (
                    <li key={index} className="text-xs text-gray-500 flex items-center gap-1">
                      <svg
                        className="w-3 h-3 text-gray-400"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>

              {monitoringLevel === level && (
                <svg
                  className="w-6 h-6 text-primary flex-shrink-0"
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
          </button>
        ))}
      </div>

      <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
        <p className="text-sm text-blue-800">
          <strong>Remember:</strong> You can adjust the monitoring level anytime as your child earns
          more trust or needs more guidance.
        </p>
      </div>
    </div>
  )
}

export default MonitoringLevelStep
