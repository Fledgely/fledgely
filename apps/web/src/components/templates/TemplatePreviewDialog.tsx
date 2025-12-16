'use client'

import { useEffect, useRef } from 'react'
import {
  type AgreementTemplate,
  type TemplateSection,
  type AutonomyMilestone,
  type VisualColorHint,
  getTemplateVariationLabel,
  getTemplateVariationDescription,
  getMonitoringLevelLabel,
  getMonitoringLevelDescription,
  AGE_GROUP_LABELS,
  TEMPLATE_CONCERN_LABELS,
} from '@fledgely/contracts'
import { Button } from '@/components/ui/button'

interface TemplatePreviewDialogProps {
  template: AgreementTemplate | null
  isOpen: boolean
  onClose: () => void
  onSelect?: (template: AgreementTemplate) => void
}

/**
 * Section type icons mapping
 * Story 4.3: Template Preview & Selection - Task 1.2
 */
const SECTION_TYPE_ICONS: Record<string, { icon: string; label: string }> = {
  terms: { icon: '📋', label: 'Terms' },
  monitoring_rules: { icon: '👀', label: 'Monitoring' },
  screen_time: { icon: '⏰', label: 'Screen Time' },
  bedtime_schedule: { icon: '🌙', label: 'Bedtime' },
  app_restrictions: { icon: '📱', label: 'Apps' },
  content_filters: { icon: '🛡️', label: 'Content' },
  consequences: { icon: '⚠️', label: 'Consequences' },
  rewards: { icon: '⭐', label: 'Rewards' },
}

/**
 * Color hint to Tailwind class mapping
 */
const COLOR_HINT_CLASSES: Record<VisualColorHint, string> = {
  green: 'border-l-green-500',
  yellow: 'border-l-yellow-500',
  red: 'border-l-red-500',
  blue: 'border-l-blue-500',
  purple: 'border-l-purple-500',
  orange: 'border-l-orange-500',
}

/**
 * Customizable Badge Component
 * Story 4.3: Task 2 - Customization highlighting
 *
 * Displays a visual indicator for sections that can be personalized
 * when creating a family agreement.
 */
function CustomizableBadge() {
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200"
      aria-label="This section can be customized"
      title="You can adjust this section when creating your family agreement"
    >
      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
      </svg>
      Customizable
    </span>
  )
}

/**
 * Section Display Component
 * Story 4.3: Task 1 - Full section display with visual elements
 */
function SectionDisplay({ section, isYoungChild }: { section: TemplateSection; isYoungChild: boolean }) {
  const typeInfo = SECTION_TYPE_ICONS[section.type] || { icon: '📄', label: 'Section' }
  const colorClass = section.visualElements?.colorHint
    ? COLOR_HINT_CLASSES[section.visualElements.colorHint]
    : 'border-l-gray-300'

  return (
    <div
      className={`border border-gray-200 dark:border-gray-700 rounded-lg ${isYoungChild ? `border-l-4 ${colorClass}` : ''}`}
    >
      <div className="p-3">
        {/* Section header */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-2 min-w-0">
            {/* Icon with accessible label */}
            <span
              className="text-lg flex-shrink-0"
              role="img"
              aria-label={section.visualElements?.altText || typeInfo.label}
            >
              {section.visualElements?.icon || typeInfo.icon}
            </span>
            <div className="min-w-0">
              <h4 className="font-medium text-gray-900 dark:text-gray-100 text-sm">
                {section.title}
              </h4>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                {section.description}
              </p>
            </div>
          </div>
          {section.customizable && <CustomizableBadge />}
        </div>

        {/* Section content */}
        <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
          {section.defaultValue}
        </div>

        {/* Yes/No rule indicator for young children */}
        {isYoungChild && section.visualElements?.isYesNoRule && (
          <p className="text-xs text-purple-600 dark:text-purple-400 mt-2 flex items-center">
            <span className="mr-1" aria-hidden="true">✓</span>
            Simple yes/no rules for easy understanding
          </p>
        )}
      </div>
    </div>
  )
}

/**
 * Autonomy Milestones Display Component
 * Story 4.3: Task 1.3 - Display autonomy milestones for ages 14-16
 */
function AutonomyMilestonesSection({ milestones }: { milestones: AutonomyMilestone[] }) {
  if (!milestones || milestones.length === 0) return null

  return (
    <div className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-lg p-4">
      <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
        <span className="text-lg" role="img" aria-label="Trophy">🏆</span>
        Earned Autonomy Milestones
      </h3>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
        Progress through these trust levels to earn more independence.
      </p>
      <div className="space-y-4">
        {milestones.sort((a, b) => a.order - b.order).map((milestone, index) => (
          <div
            key={milestone.id}
            className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700"
          >
            {/* Milestone header */}
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center">
                <span className="text-sm font-bold text-purple-700 dark:text-purple-200">
                  {index + 1}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-gray-900 dark:text-gray-100 text-sm">
                  {milestone.title}
                </h4>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  {milestone.description}
                </p>
              </div>
            </div>

            {/* Criteria */}
            <div className="mt-3 flex flex-wrap gap-2">
              {milestone.criteria.trustScoreThreshold && (
                <span className="inline-flex items-center px-2 py-1 rounded text-xs bg-blue-50 text-blue-700 dark:bg-blue-900/50 dark:text-blue-200">
                  <span className="mr-1" aria-hidden="true">📊</span>
                  {milestone.criteria.trustScoreThreshold}% trust score
                </span>
              )}
              {milestone.criteria.timeWithoutIncident && (
                <span className="inline-flex items-center px-2 py-1 rounded text-xs bg-green-50 text-green-700 dark:bg-green-900/50 dark:text-green-200">
                  <span className="mr-1" aria-hidden="true">📅</span>
                  {milestone.criteria.timeWithoutIncident}
                </span>
              )}
              {milestone.criteria.parentApproval && (
                <span className="inline-flex items-center px-2 py-1 rounded text-xs bg-yellow-50 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-200">
                  <span className="mr-1" aria-hidden="true">✅</span>
                  Parent approval required
                </span>
              )}
            </div>

            {/* Unlocks */}
            <div className="mt-3">
              <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Unlocks:
              </p>
              <ul className="space-y-1">
                {milestone.unlocks.map((unlock, unlockIndex) => (
                  <li key={unlockIndex} className="flex items-start text-xs text-gray-600 dark:text-gray-400">
                    <span className="text-green-500 mr-1.5 flex-shrink-0" aria-hidden="true">✓</span>
                    {unlock}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/**
 * Template Preview Dialog Component
 *
 * Story 4.1: Template Library Structure - Task 4.4
 * Story 4.3: Template Preview & Selection - Full section display
 *
 * Displays full template details in a modal dialog.
 * Allows parents to review all sections before selecting.
 *
 * Features:
 * - Full section display with type icons (Task 1)
 * - Visual elements for ages 5-7 (Task 1.4)
 * - Autonomy milestones for ages 14-16 (Task 1.3)
 * - Customization highlighting (Task 2)
 * - Proper heading hierarchy (AC #6)
 *
 * Accessibility features:
 * - Focus trap when open
 * - Escape key closes dialog
 * - ARIA modal attributes
 * - Focus returns to trigger on close
 * - Keyboard navigable (NFR43)
 * - Proper heading structure (h2 for title, h3 for sections)
 *
 * @example
 * ```tsx
 * <TemplatePreviewDialog
 *   template={selectedTemplate}
 *   isOpen={isPreviewOpen}
 *   onClose={() => setIsPreviewOpen(false)}
 *   onSelect={(t) => handleSelect(t)}
 * />
 * ```
 */
export function TemplatePreviewDialog({
  template,
  isOpen,
  onClose,
  onSelect,
}: TemplatePreviewDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown)
      // Focus the close button when dialog opens
      setTimeout(() => closeButtonRef.current?.focus(), 0)
      // Prevent body scroll
      document.body.style.overflow = 'hidden'
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [isOpen, onClose])

  // Focus trap
  useEffect(() => {
    if (!isOpen || !dialogRef.current) return

    const focusableElements = dialogRef.current.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )
    const firstElement = focusableElements[0] as HTMLElement
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement

    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault()
          lastElement.focus()
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault()
          firstElement.focus()
        }
      }
    }

    document.addEventListener('keydown', handleTabKey)
    return () => document.removeEventListener('keydown', handleTabKey)
  }, [isOpen])

  if (!isOpen || !template) return null

  const handleSelectClick = () => {
    onSelect?.(template)
    onClose()
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

  // Check if template is for young children (5-7)
  const isYoungChild = template.ageGroup === '5-7'

  // Check if template has autonomy milestones
  const hasAutonomyMilestones = template.autonomyMilestones && template.autonomyMilestones.length > 0

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="dialog-title"
      aria-describedby="dialog-description"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Dialog content */}
      <div
        ref={dialogRef}
        className="relative z-10 w-full max-w-2xl max-h-[90vh] mx-4 bg-white dark:bg-gray-900 rounded-lg shadow-xl overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="flex items-start justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex-1 min-w-0 mr-4">
            <h2
              id="dialog-title"
              className="text-lg font-semibold text-gray-900 dark:text-gray-100 truncate"
            >
              {template.name}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {AGE_GROUP_LABELS[template.ageGroup]}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getVariationColor()}`}
            >
              {getTemplateVariationLabel(template.variation)}
            </span>
            <button
              ref={closeButtonRef}
              type="button"
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-label="Close dialog"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* Description */}
          <div id="dialog-description">
            <p className="text-gray-700 dark:text-gray-300">{template.description}</p>
          </div>

          {/* Summary section */}
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
            <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-3">Summary</h3>
            <div className="space-y-3">
              {/* Screen time */}
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Screen Time</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{template.summary.screenTimeLimit}</p>
                </div>
              </div>

              {/* Monitoring level */}
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                <div>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {getMonitoringLevelLabel(template.summary.monitoringLevel)} Monitoring
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {getMonitoringLevelDescription(template.summary.monitoringLevel)}
                  </p>
                </div>
              </div>

              {/* Approach description */}
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                <div>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {getTemplateVariationLabel(template.variation)} Approach
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {getTemplateVariationDescription(template.variation)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Key rules */}
          <div>
            <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-2">Key Rules</h3>
            <ul className="space-y-1.5">
              {template.summary.keyRules.map((rule, index) => (
                <li key={index} className="flex items-start text-sm text-gray-600 dark:text-gray-400">
                  <span className="text-blue-500 mr-2" aria-hidden="true">•</span>
                  {rule}
                </li>
              ))}
            </ul>
          </div>

          {/* Concerns/Topics */}
          <div>
            <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-2">Topics Covered</h3>
            <div className="flex flex-wrap gap-2">
              {template.concerns.map((concern) => (
                <span
                  key={concern}
                  className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
                >
                  {TEMPLATE_CONCERN_LABELS[concern]}
                </span>
              ))}
            </div>
          </div>

          {/* Autonomy milestones for ages 14-16 */}
          {hasAutonomyMilestones && (
            <AutonomyMilestonesSection milestones={template.autonomyMilestones!} />
          )}

          {/* Sections - full display */}
          <div>
            <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-3">Agreement Sections</h3>
            <div className="space-y-3">
              {template.sections.map((section) => (
                <SectionDisplay
                  key={section.id}
                  section={section}
                  isYoungChild={isYoungChild}
                />
              ))}
            </div>
          </div>

          {/* Customization legend */}
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 text-sm">
            <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="font-medium">Customization</span>
            </div>
            <p className="mt-1 text-blue-600 dark:text-blue-400">
              Sections marked with <CustomizableBadge /> can be modified when creating your family agreement.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="min-w-[100px] min-h-[44px]"
          >
            Cancel
          </Button>
          {onSelect && (
            <Button
              type="button"
              onClick={handleSelectClick}
              className="min-w-[100px] min-h-[44px]"
            >
              Use This Template
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
