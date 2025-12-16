'use client'

import { type AgreementTemplate, getTemplateVariationLabel, getMonitoringLevelLabel, TEMPLATE_CONCERN_LABELS } from '@fledgely/contracts'

interface TemplateCardProps {
  template: AgreementTemplate
  onSelect?: (template: AgreementTemplate) => void
  isSelected?: boolean
}

/**
 * Template Card Component
 *
 * Story 4.1: Template Library Structure - Task 4.3
 *
 * Displays an individual template summary in a card format.
 * Shows key information at a glance for template selection.
 *
 * Accessibility features:
 * - Keyboard navigable (Tab, Enter) per NFR43
 * - ARIA labels for screen readers
 * - 44x44px minimum touch targets (NFR49)
 * - Color contrast 4.5:1 minimum (NFR45)
 * - Visible focus indicators (NFR46)
 *
 * @example
 * ```tsx
 * <TemplateCard
 *   template={template}
 *   onSelect={(t) => handleSelect(t)}
 *   isSelected={selectedId === template.id}
 * />
 * ```
 */
export function TemplateCard({
  template,
  onSelect,
  isSelected = false,
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

  // Get variation badge color
  const getVariationColor = () => {
    switch (template.variation) {
      case 'strict':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
      case 'balanced':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
      case 'permissive':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
    }
  }

  // Get monitoring level badge color
  const getMonitoringColor = () => {
    switch (template.summary.monitoringLevel) {
      case 'comprehensive':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
      case 'moderate':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
      case 'light':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
    }
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      aria-pressed={isSelected}
      aria-label={`Template: ${template.name}. ${template.description}. Click to select.`}
      className={`
        relative rounded-lg border-2 p-4 cursor-pointer transition-all duration-200
        min-h-[180px] flex flex-col
        focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
        hover:shadow-md
        ${isSelected
          ? 'border-blue-500 bg-blue-50 dark:bg-blue-950'
          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
        }
      `}
    >
      {/* Header with name and variation badge */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <h3 className="font-semibold text-base text-gray-900 dark:text-gray-100 leading-tight">
          {template.name}
        </h3>
        <span
          className={`
            inline-flex items-center px-2 py-0.5 rounded text-xs font-medium whitespace-nowrap
            ${getVariationColor()}
          `}
          aria-label={`Variation: ${getTemplateVariationLabel(template.variation)}`}
        >
          {getTemplateVariationLabel(template.variation)}
        </span>
      </div>

      {/* Description */}
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
        {template.description}
      </p>

      {/* Screen time and monitoring badges */}
      <div className="flex flex-wrap gap-2 mb-3">
        <span className="inline-flex items-center text-xs text-gray-600 dark:text-gray-400">
          <svg
            className="w-3.5 h-3.5 mr-1"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {template.summary.screenTimeLimit}
        </span>
      </div>

      {/* Monitoring level badge */}
      <div className="flex items-center gap-2 mb-3">
        <span
          className={`
            inline-flex items-center px-2 py-0.5 rounded text-xs font-medium
            ${getMonitoringColor()}
          `}
          aria-label={`Monitoring: ${getMonitoringLevelLabel(template.summary.monitoringLevel)}`}
        >
          {getMonitoringLevelLabel(template.summary.monitoringLevel)} Monitoring
        </span>
      </div>

      {/* Key rules preview */}
      <div className="flex-1 min-h-0">
        <ul
          className="text-xs text-gray-500 dark:text-gray-400 space-y-0.5"
          aria-label="Key rules"
        >
          {template.summary.keyRules.slice(0, 3).map((rule, index) => (
            <li key={index} className="flex items-start">
              <span className="mr-1.5 text-gray-400" aria-hidden="true">•</span>
              <span className="line-clamp-1">{rule}</span>
            </li>
          ))}
          {template.summary.keyRules.length > 3 && (
            <li className="text-gray-400 italic">
              +{template.summary.keyRules.length - 3} more rules
            </li>
          )}
        </ul>
      </div>

      {/* Concern tags */}
      <div className="flex flex-wrap gap-1 mt-2 pt-2 border-t border-gray-100 dark:border-gray-700">
        {template.concerns.slice(0, 3).map((concern) => (
          <span
            key={concern}
            className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
          >
            {TEMPLATE_CONCERN_LABELS[concern]}
          </span>
        ))}
        {template.concerns.length > 3 && (
          <span className="text-[10px] text-gray-400">
            +{template.concerns.length - 3}
          </span>
        )}
      </div>

      {/* Selected indicator */}
      {isSelected && (
        <div
          className="absolute top-2 right-2 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center"
          aria-hidden="true"
        >
          <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        </div>
      )}
    </div>
  )
}
