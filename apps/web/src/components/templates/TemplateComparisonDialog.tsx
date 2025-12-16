'use client'

import { useEffect, useRef } from 'react'
import {
  type AgreementTemplate,
  getTemplateVariationLabel,
  getMonitoringLevelLabel,
} from '@fledgely/contracts'
import { Button } from '@/components/ui/button'

interface TemplateComparisonDialogProps {
  /** Templates to compare (1-3) */
  templates: AgreementTemplate[]
  /** Whether the dialog is open */
  isOpen: boolean
  /** Called when dialog should close */
  onClose: () => void
  /** Called when a template is selected */
  onSelect?: (template: AgreementTemplate) => void
  /** Called when a template is removed from comparison */
  onRemove?: (templateId: string) => void
  /** Called when all comparisons should be cleared */
  onClear?: () => void
}

/**
 * Template Comparison Dialog
 *
 * Story 4.3: Template Preview & Selection - Task 4
 * AC #5: Side-by-side template comparison
 *
 * Displays 1-3 templates in a side-by-side grid for easy comparison.
 * Highlights key differences: screen time, monitoring level, approach.
 *
 * @example
 * ```tsx
 * <TemplateComparisonDialog
 *   templates={selectedTemplates}
 *   isOpen={isComparisonOpen}
 *   onClose={() => setIsComparisonOpen(false)}
 *   onSelect={handleSelectTemplate}
 *   onRemove={handleRemoveFromComparison}
 *   onClear={handleClearComparison}
 * />
 * ```
 */
export function TemplateComparisonDialog({
  templates,
  isOpen,
  onClose,
  onSelect,
  onRemove,
  onClear,
}: TemplateComparisonDialogProps) {
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

  if (!isOpen) return null

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="comparison-dialog-title"
      className="fixed inset-0 z-50 flex items-center justify-center"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        aria-hidden="true"
        onClick={onClose}
      />

      {/* Dialog content */}
      <div className="relative z-10 w-full max-w-5xl max-h-[90vh] mx-4 bg-white dark:bg-gray-900 rounded-lg shadow-xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h2
            id="comparison-dialog-title"
            className="text-lg font-semibold text-gray-900 dark:text-gray-100"
          >
            Compare Templates
          </h2>
          <div className="flex items-center gap-2">
            {onClear && templates.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onClear}
                className="text-gray-500 hover:text-gray-700"
              >
                Clear All
              </Button>
            )}
            <button
              ref={closeButtonRef}
              type="button"
              onClick={onClose}
              aria-label="Close dialog"
              className="p-2 text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
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
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {templates.length === 0 ? (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              <svg
                className="w-12 h-12 mx-auto mb-4 text-gray-300"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                />
              </svg>
              <p className="text-lg font-medium">No templates selected</p>
              <p className="mt-1 text-sm">
                Select templates from the library to compare them side by side.
              </p>
            </div>
          ) : (
            <div
              className={`grid gap-4 ${
                templates.length === 1
                  ? 'grid-cols-1'
                  : templates.length === 2
                    ? 'grid-cols-1 md:grid-cols-2'
                    : 'grid-cols-1 md:grid-cols-3'
              }`}
            >
              {templates.map((template) => (
                <div
                  key={template.id}
                  className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 flex flex-col"
                >
                  {/* Template header */}
                  <div className="mb-4">
                    <div className="flex items-start justify-between">
                      <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                        {template.name}
                      </h3>
                      {onRemove && (
                        <button
                          type="button"
                          onClick={() => onRemove(template.id)}
                          aria-label="Remove from comparison"
                          className="p-1 text-gray-400 hover:text-red-500 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
                        >
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M6 18L18 6M6 6l12 12"
                            />
                          </svg>
                        </button>
                      )}
                    </div>
                    <span className="inline-block mt-1 px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                      {getTemplateVariationLabel(template.variation)}
                    </span>
                  </div>

                  {/* Comparison metrics */}
                  <div className="space-y-3 flex-1">
                    {/* Screen time */}
                    <div className="flex items-start gap-2">
                      <svg
                        className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0"
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
                      <div>
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          Screen Time
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {template.summary.screenTimeLimit}
                        </p>
                      </div>
                    </div>

                    {/* Monitoring level */}
                    <div className="flex items-start gap-2">
                      <svg
                        className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                      >
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
                      <div>
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          Monitoring
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {getMonitoringLevelLabel(template.summary.monitoringLevel)}
                        </p>
                      </div>
                    </div>

                    {/* Key rules */}
                    <div>
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Key Rules
                      </p>
                      <ul className="space-y-1">
                        {template.summary.keyRules.slice(0, 3).map((rule, index) => (
                          <li
                            key={index}
                            className="flex items-start text-sm text-gray-600 dark:text-gray-400"
                          >
                            <span className="text-blue-500 mr-1.5 flex-shrink-0">•</span>
                            {rule}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Actions */}
                  {onSelect && (
                    <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                      <Button
                        onClick={() => onSelect(template)}
                        className="w-full"
                        aria-label="Select this template"
                      >
                        Select This Template
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
