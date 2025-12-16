'use client'

import { useEffect, useRef } from 'react'
import {
  type AgreementTemplate,
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
 * Template Preview Dialog Component
 *
 * Story 4.1: Template Library Structure - Task 4.4
 *
 * Displays full template details in a modal dialog.
 * Allows parents to review all sections before selecting.
 *
 * Accessibility features:
 * - Focus trap when open
 * - Escape key closes dialog
 * - ARIA modal attributes
 * - Focus returns to trigger on close
 * - Keyboard navigable (NFR43)
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
                <svg className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Screen Time</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{template.summary.screenTimeLimit}</p>
                </div>
              </div>

              {/* Monitoring level */}
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                <svg className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

          {/* Sections preview */}
          <div>
            <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-3">Agreement Sections</h3>
            <div className="space-y-3">
              {template.sections.map((section) => (
                <details
                  key={section.id}
                  className="group border border-gray-200 dark:border-gray-700 rounded-lg"
                >
                  <summary className="flex items-center justify-between p-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg">
                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-gray-100 text-sm">
                        {section.title}
                      </h4>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        {section.description}
                      </p>
                    </div>
                    <svg
                      className="w-5 h-5 text-gray-400 transform group-open:rotate-180 transition-transform"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </summary>
                  <div className="px-3 pb-3">
                    <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                      {section.defaultValue}
                    </div>
                    {section.customizable && (
                      <p className="text-xs text-blue-600 dark:text-blue-400 mt-2 flex items-center">
                        <svg className="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        You can customize this section
                      </p>
                    )}
                  </div>
                </details>
              ))}
            </div>
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
