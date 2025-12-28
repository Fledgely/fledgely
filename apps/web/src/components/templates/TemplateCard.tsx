/**
 * Template Card Component.
 *
 * Story 4.1: Template Library Structure - AC3, AC5
 * Story 4.2: Age-Appropriate Template Content - AC5, AC6
 *
 * Displays a template preview with key information at a glance.
 * Includes screen time summary, monitoring level, and key rules count.
 * Shows age-specific indicators (simple rules for 5-7, autonomy path for 14-16).
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

export function TemplateCard({ template, onSelect, isSelected = false }: TemplateCardProps) {
  const handleClick = () => {
    onSelect?.(template)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onSelect?.(template)
    }
  }

  return (
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
  )
}

export default TemplateCard
