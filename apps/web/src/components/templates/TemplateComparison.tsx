/**
 * Template Comparison Component.
 *
 * Story 4.3: Template Preview & Selection - AC4
 *
 * Displays side-by-side comparison of 2-3 templates with:
 * - Key differences highlighted
 * - Screen time, monitoring, and rules comparison
 * - Select action for each template
 */

'use client'

import type { AgreementTemplate } from '@fledgely/shared/contracts'
import { AGE_GROUP_LABELS, VARIATION_LABELS, MONITORING_LEVEL_LABELS } from '../../data/templates'

interface TemplateComparisonProps {
  templates: AgreementTemplate[]
  onClose: () => void
  onSelect: (template: AgreementTemplate) => void
}

/**
 * Format minutes to compact time string.
 */
function formatMinutes(minutes: number): string {
  if (minutes < 60) {
    return `${minutes}m`
  }
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  if (remainingMinutes === 0) {
    return `${hours}h`
  }
  return `${hours}h ${remainingMinutes}m`
}

/**
 * Get color classes for monitoring level.
 */
function getMonitoringLevelColor(level: string): string {
  switch (level) {
    case 'high':
      return 'bg-red-100 text-red-800'
    case 'medium':
      return 'bg-yellow-100 text-yellow-800'
    case 'low':
      return 'bg-green-100 text-green-800'
    default:
      return 'bg-gray-100 text-gray-800'
  }
}

/**
 * Check if a value differs between templates.
 */
function hasDifference(
  templates: AgreementTemplate[],
  getValue: (t: AgreementTemplate) => unknown
): boolean {
  if (templates.length < 2) return false
  const firstValue = JSON.stringify(getValue(templates[0]))
  return templates.some((t) => JSON.stringify(getValue(t)) !== firstValue)
}

/**
 * Difference indicator component.
 */
function DifferenceIndicator({ show }: { show: boolean }) {
  if (!show) return null
  return (
    <span
      className="absolute -top-1 -right-1 w-3 h-3 bg-orange-500 rounded-full"
      aria-label="This value differs between templates"
      title="Differs between templates"
    />
  )
}

export function TemplateComparison({ templates, onClose, onSelect }: TemplateComparisonProps) {
  if (templates.length < 2) {
    return (
      <div className="p-6 text-center">
        <p className="text-gray-600">Select at least 2 templates to compare.</p>
      </div>
    )
  }

  if (templates.length > 3) {
    return (
      <div className="p-6 text-center">
        <p className="text-gray-600">You can only compare up to 3 templates at a time.</p>
      </div>
    )
  }

  const screenTimeWeekdayDiffers = hasDifference(templates, (t) => t.screenTimeLimits.weekday)
  const screenTimeWeekendDiffers = hasDifference(templates, (t) => t.screenTimeLimits.weekend)
  const monitoringDiffers = hasDifference(templates, (t) => t.monitoringLevel)
  const rulesDiffer = hasDifference(templates, (t) => t.keyRules)

  return (
    <div
      className="fixed inset-0 bg-black/50 z-40 flex items-center justify-center p-4"
      role="dialog"
      aria-label="Compare templates"
      data-testid="comparison-overlay"
    >
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            Compare Templates ({templates.length})
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-primary rounded min-w-[44px] min-h-[44px] flex items-center justify-center"
            aria-label="Close comparison"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Comparison Grid */}
        <div className="overflow-x-auto">
          <div
            className={`grid gap-4 p-4 min-w-[600px] ${
              templates.length === 2 ? 'grid-cols-2' : 'grid-cols-3'
            }`}
          >
            {templates.map((template) => (
              <div
                key={template.id}
                className="border border-gray-200 rounded-lg p-4 flex flex-col"
              >
                {/* Template Header */}
                <div className="mb-4">
                  <h3 className="font-semibold text-gray-900">{template.name}</h3>
                  <div className="flex flex-wrap gap-1 mt-1">
                    <span className="text-xs text-gray-500">
                      {AGE_GROUP_LABELS[template.ageGroup]}
                    </span>
                    <span className="text-xs text-gray-400">•</span>
                    <span className="text-xs text-gray-500">
                      {VARIATION_LABELS[template.variation]}
                    </span>
                  </div>
                </div>

                {/* Screen Time */}
                <div className="mb-4">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                    Screen Time
                  </p>
                  <div className="space-y-1">
                    <div className="relative inline-block">
                      <p className="text-sm text-gray-700">
                        Weekdays:{' '}
                        <span className="font-medium">
                          {formatMinutes(template.screenTimeLimits.weekday)}
                        </span>
                      </p>
                      <DifferenceIndicator show={screenTimeWeekdayDiffers} />
                    </div>
                    <div className="relative inline-block">
                      <p className="text-sm text-gray-700">
                        Weekends:{' '}
                        <span className="font-medium">
                          {formatMinutes(template.screenTimeLimits.weekend)}
                        </span>
                      </p>
                      <DifferenceIndicator show={screenTimeWeekendDiffers} />
                    </div>
                  </div>
                </div>

                {/* Monitoring Level */}
                <div className="mb-4">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                    Monitoring
                  </p>
                  <div className="relative inline-block">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getMonitoringLevelColor(template.monitoringLevel)}`}
                    >
                      {MONITORING_LEVEL_LABELS[template.monitoringLevel]}
                    </span>
                    <DifferenceIndicator show={monitoringDiffers} />
                  </div>
                </div>

                {/* Key Rules */}
                <div className="mb-4 flex-1">
                  <div className="relative inline-block">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                      Key Rules ({template.keyRules.length})
                    </p>
                    <DifferenceIndicator show={rulesDiffer} />
                  </div>
                  <ul className="space-y-1">
                    {template.keyRules.slice(0, 3).map((rule, index) => (
                      <li key={index} className="text-xs text-gray-600 flex items-start gap-1">
                        <span className="text-primary mt-0.5" aria-hidden="true">
                          •
                        </span>
                        <span className="line-clamp-2">{rule}</span>
                      </li>
                    ))}
                    {template.keyRules.length > 3 && (
                      <li className="text-xs text-gray-400 italic">
                        +{template.keyRules.length - 3} more rules
                      </li>
                    )}
                  </ul>
                </div>

                {/* Select Button */}
                <button
                  type="button"
                  onClick={() => {
                    onSelect(template)
                    onClose()
                  }}
                  className="w-full px-4 py-2.5 bg-primary text-white font-medium rounded-lg hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 min-h-[44px]"
                >
                  Use This Template
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Legend */}
        <div className="px-4 pb-4 text-xs text-gray-500">
          <span className="inline-flex items-center gap-1">
            <span className="w-3 h-3 bg-orange-500 rounded-full" aria-hidden="true" />
            Indicates values that differ between templates
          </span>
        </div>
      </div>
    </div>
  )
}

export default TemplateComparison
