/**
 * Template Preview Modal Component.
 *
 * Story 4.3: Template Preview & Selection - AC1, AC2, AC3, AC5, AC6
 * Story 4.6: Template Accessibility - AC5
 *
 * Displays full template preview in an accessible modal with:
 * - All template sections (screen time, monitoring, rules)
 * - Age-appropriate content formatting
 * - Customizable field indicators
 * - Use This Template action
 */

'use client'

import * as Dialog from '@radix-ui/react-dialog'
import type { AgreementTemplate } from '@fledgely/shared/contracts'
import { TemplateRules } from './TemplateRules'
import { AGE_GROUP_LABELS, VARIATION_LABELS, MONITORING_LEVEL_LABELS } from '../../data/templates'

interface TemplatePreviewModalProps {
  template: AgreementTemplate | null
  isOpen: boolean
  onClose: () => void
  onSelect: (template: AgreementTemplate) => void
}

/**
 * Format minutes to human-readable time string.
 */
function formatMinutes(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} minutes`
  }
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  if (remainingMinutes === 0) {
    return `${hours} hour${hours > 1 ? 's' : ''}`
  }
  return `${hours}h ${remainingMinutes}m`
}

/**
 * Get monitoring level description for accessibility.
 */
function getMonitoringDescription(level: string): string {
  switch (level) {
    case 'high':
      return 'Parents review activity frequently. Good for younger children or new device users.'
    case 'medium':
      return 'Parents check in regularly. Balances trust with oversight.'
    case 'low':
      return 'Parents check in occasionally. For teens who have earned trust.'
    default:
      return ''
  }
}

/**
 * Get color classes for monitoring level.
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
 * Customizable indicator badge.
 */
function CustomizableBadge() {
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200 ml-2"
      aria-label="This field can be customized"
    >
      <svg
        className="w-3 h-3"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
        />
      </svg>
      Customizable
    </span>
  )
}

export function TemplatePreviewModal({
  template,
  isOpen,
  onClose,
  onSelect,
}: TemplatePreviewModalProps) {
  if (!template) return null

  const handleSelect = () => {
    onSelect(template)
    onClose()
  }

  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 z-40" data-testid="modal-overlay" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg shadow-xl max-w-2xl w-[95vw] max-h-[90vh] overflow-y-auto z-50 focus:outline-none">
          <Dialog.Description className="sr-only">
            Full preview of the {template.name} template including screen time limits, monitoring
            level, and rules.
          </Dialog.Description>
          {/* Header */}
          <div className="sticky top-0 bg-white border-b border-gray-200 p-4 sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <Dialog.Title className="text-xl font-semibold text-gray-900">
                  {template.name}
                </Dialog.Title>
                <div className="flex flex-wrap gap-2 mt-2">
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700">
                    {AGE_GROUP_LABELS[template.ageGroup]}
                  </span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                    {VARIATION_LABELS[template.variation]}
                  </span>
                </div>
              </div>
              <Dialog.Close asChild>
                <button
                  className="p-2 text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-primary rounded min-w-[44px] min-h-[44px] flex items-center justify-center"
                  aria-label="Close preview"
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
              </Dialog.Close>
            </div>
          </div>

          {/* Content */}
          <div className="p-4 sm:p-6 space-y-6">
            {/* Description */}
            <p className="text-gray-600">{template.description}</p>

            {/* Screen Time Section */}
            <section>
              <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
                Screen Time Limits
                <CustomizableBadge />
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Weekdays</p>
                  <p className="text-lg font-medium text-gray-900 mt-1">
                    {formatMinutes(template.screenTimeLimits.weekday)}
                  </p>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Weekends</p>
                  <p className="text-lg font-medium text-gray-900 mt-1">
                    {formatMinutes(template.screenTimeLimits.weekend)}
                  </p>
                </div>
              </div>
            </section>

            {/* Monitoring Level Section */}
            <section>
              <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
                Monitoring Level
                <CustomizableBadge />
              </h3>
              <div className="flex items-start gap-3">
                <span
                  className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getMonitoringLevelColor(template.monitoringLevel)}`}
                >
                  {MONITORING_LEVEL_LABELS[template.monitoringLevel]}
                </span>
                <p className="text-sm text-gray-600 flex-1">
                  {getMonitoringDescription(template.monitoringLevel)}
                </p>
              </div>
            </section>

            {/* Rules Section */}
            <section>
              <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
                Rules & Expectations
                <CustomizableBadge />
              </h3>
              <TemplateRules template={template} showExamples={true} showMilestones={true} />
            </section>

            {/* Categories */}
            <section>
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Focus Areas</h3>
              <div className="flex flex-wrap gap-2">
                {template.categories.map((category) => (
                  <span
                    key={category}
                    className="inline-flex items-center px-2.5 py-1 rounded text-xs font-medium bg-gray-100 text-gray-700"
                  >
                    {category === 'social_media'
                      ? 'Social Media'
                      : category.charAt(0).toUpperCase() + category.slice(1)}
                  </span>
                ))}
              </div>
            </section>
          </div>

          {/* Footer */}
          <div className="sticky bottom-0 bg-white border-t border-gray-200 p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={handleSelect}
                className="flex-1 px-4 py-3 bg-primary text-white font-medium rounded-lg hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 min-h-[44px]"
              >
                Use This Template
              </button>
              <Dialog.Close asChild>
                <button
                  type="button"
                  className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 min-h-[44px]"
                >
                  Cancel
                </button>
              </Dialog.Close>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

export default TemplatePreviewModal
