/**
 * Template Card Component.
 *
 * Story 4.1: Template Library Structure - AC3, AC5
 * Story 4.2: Age-Appropriate Template Content - AC5, AC6
 * Story 4.3: Template Preview & Selection - AC4
 *
 * Displays a template preview with key information at a glance.
 * Includes screen time summary, monitoring level, and key rules count.
 * Shows age-specific indicators (simple rules for 5-7, autonomy path for 14-16).
 * Supports compare toggle for side-by-side comparison.
 */

'use client'

import type { AgreementTemplate } from '@fledgely/shared/contracts'
import { AGE_GROUP_LABELS, VARIATION_LABELS, MONITORING_LEVEL_LABELS } from '../../data/templates'

/**
 * Check if template has simple rules (for 5-7 age group indicator).
 */
function hasSimpleRules(template: AgreementTemplate): boolean {
  return template.ageGroup === '5-7' && !!template.simpleRules && template.simpleRules.length > 0
}

/**
 * Check if template has autonomy milestones (for 14-16 age group indicator).
 */
function hasAutonomyMilestones(template: AgreementTemplate): boolean {
  return (
    template.ageGroup === '14-16' &&
    !!template.autonomyMilestones &&
    template.autonomyMilestones.length > 0
  )
}

interface TemplateCardProps {
  template: AgreementTemplate
  onSelect?: (template: AgreementTemplate) => void
  isSelected?: boolean
  /** Story 4.3: Compare mode props */
  showCompare?: boolean
  isInComparison?: boolean
  onCompareToggle?: (template: AgreementTemplate) => void
  canAddToComparison?: boolean
}

/**
 * Format minutes to human-readable time string.
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
 * Get color classes for monitoring level badge.
 */
function getMonitoringLevelColor(level: string): string {
  switch (level) {
    case 'high':
      return 'bg-red-100 text-red-800 border-red-200'
    case 'medium':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200'
    case 'low':
      return 'bg-green-100 text-green-800 border-green-200'
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200'
  }
}

/**
 * Get color classes for variation badge.
 */
function getVariationColor(variation: string): string {
  switch (variation) {
    case 'strict':
      return 'bg-purple-100 text-purple-800 border-purple-200'
    case 'balanced':
      return 'bg-blue-100 text-blue-800 border-blue-200'
    case 'permissive':
      return 'bg-teal-100 text-teal-800 border-teal-200'
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200'
  }
}

export function TemplateCard({
  template,
  onSelect,
  isSelected = false,
  showCompare = false,
  isInComparison = false,
  onCompareToggle,
  canAddToComparison = true,
}: TemplateCardProps) {
  const handleClick = () => {
    onSelect?.(template)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onSelect?.(template)
    }
  }

  const handleCompareClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    onCompareToggle?.(template)
  }

  const handleCompareKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      e.stopPropagation()
      onCompareToggle?.(template)
    }
  }

  return (
    <div className="relative">
      {/* Compare checkbox (Story 4.3) */}
      {showCompare && (
        <div className="absolute top-2 right-2 z-10">
          <button
            type="button"
            onClick={handleCompareClick}
            onKeyDown={handleCompareKeyDown}
            disabled={!isInComparison && !canAddToComparison}
            className={`
              min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg
              border-2 transition-all
              focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2
              ${
                isInComparison
                  ? 'bg-primary border-primary text-white'
                  : canAddToComparison
                    ? 'bg-white border-gray-300 text-gray-600 hover:border-primary'
                    : 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed'
              }
            `}
            aria-label={isInComparison ? 'Remove from comparison' : 'Add to comparison'}
            aria-pressed={isInComparison}
          >
            {isInComparison ? (
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
            ) : (
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                />
              </svg>
            )}
          </button>
        </div>
      )}

      <button
        type="button"
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        className={`
          w-full p-4 text-left border rounded-lg transition-all
          hover:border-primary hover:shadow-md
          focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2
          min-h-[180px]
          ${isSelected ? 'border-primary bg-primary/5 ring-2 ring-primary' : 'border-gray-200 bg-white'}
          ${showCompare ? 'pr-14' : ''}
        `}
        aria-label={`Select ${template.name} template for ${AGE_GROUP_LABELS[template.ageGroup]}`}
        aria-pressed={isSelected}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <h3 className="font-semibold text-gray-900 text-lg leading-tight">{template.name}</h3>
          <span
            className={`
            inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border
            ${getVariationColor(template.variation)}
          `}
          >
            {VARIATION_LABELS[template.variation]}
          </span>
        </div>

        {/* Age group badge */}
        <div className="mb-2">
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700">
            {AGE_GROUP_LABELS[template.ageGroup]}
          </span>
        </div>

        {/* Description */}
        <p className="text-sm text-gray-600 mb-3 line-clamp-2">{template.description}</p>

        {/* Stats row */}
        <div className="flex flex-wrap gap-2 mb-3">
          {/* Screen time */}
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span>
              {formatMinutes(template.screenTimeLimits.weekday)}/day weekdays,{' '}
              {formatMinutes(template.screenTimeLimits.weekend)}/day weekends
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between">
          {/* Monitoring level */}
          <span
            className={`
            inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border
            ${getMonitoringLevelColor(template.monitoringLevel)}
          `}
          >
            {MONITORING_LEVEL_LABELS[template.monitoringLevel]}
          </span>

          {/* Key rules count */}
          <span className="text-xs text-gray-500">{template.keyRules.length} core rules</span>
        </div>

        {/* Age-specific indicators (Story 4.2) */}
        {(hasSimpleRules(template) || hasAutonomyMilestones(template)) && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            {hasSimpleRules(template) && (
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-green-50 text-green-700 border border-green-200">
                <span aria-hidden="true">✓</span>
                Simple Yes/No Rules
              </span>
            )}
            {hasAutonomyMilestones(template) && (
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-200">
                <span aria-hidden="true">🎯</span>
                Includes Autonomy Path
              </span>
            )}
          </div>
        )}
      </button>
    </div>
  )
}

export default TemplateCard
