'use client'

import { useMemo } from 'react'
import { cn } from '@/lib/utils'
import {
  type AgeGroup,
  getTemplatesByAgeGroup,
} from '@fledgely/contracts'
import { useQuickStartWizard } from '../QuickStartWizardProvider'

/**
 * Format time from 24h to 12h display
 */
function formatTime(time24: string): string {
  const [hours, minutes] = time24.split(':').map(Number)
  const period = hours >= 12 ? 'PM' : 'AM'
  const hours12 = hours % 12 || 12
  return `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`
}

/**
 * Get monitoring level display info
 */
function getMonitoringDisplay(level: string) {
  switch (level) {
    case 'light':
      return { label: 'Light', icon: '👀', color: 'text-green-700 bg-green-50' }
    case 'moderate':
      return { label: 'Moderate', icon: '🔍', color: 'text-blue-700 bg-blue-50' }
    case 'comprehensive':
      return {
        label: 'Comprehensive',
        icon: '🛡️',
        color: 'text-purple-700 bg-purple-50',
      }
    default:
      return { label: level, icon: '📋', color: 'text-gray-700 bg-gray-50' }
  }
}

/**
 * Agreement Preview Step Component
 *
 * Story 4.4: Quick Start Wizard - Task 5
 * AC #5: Wizard can be completed in under 10 minutes with defaults (NFR59)
 * AC #6: Wizard ends with agreement preview before proceeding to co-creation
 *
 * Features:
 * - Summary of all chosen options
 * - Ability to go back and edit any decision
 * - Create draft agreement object for Epic 5 handoff
 * - "Start Co-Creation" button
 *
 * @example
 * ```tsx
 * <AgreementPreviewStep />
 * ```
 */
export function AgreementPreviewStep() {
  const { childAge, selectedTemplateId, decisions, setStep } = useQuickStartWizard()

  // Get the selected template details
  const selectedTemplate = useMemo(() => {
    if (!childAge || !selectedTemplateId) return null
    const templates = getTemplatesByAgeGroup(childAge as AgeGroup)
    return templates.find((t) => t.id === selectedTemplateId) || null
  }, [childAge, selectedTemplateId])

  const monitoringDisplay = getMonitoringDisplay(decisions.monitoringLevel)

  // Calculate weekly screen time
  const weeklyTotal =
    decisions.screenTimeMinutes * 5 +
    Math.round(decisions.screenTimeMinutes * 1.5) * 2

  return (
    <div className="space-y-6">
      {/* Step header */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Preview Your Agreement</h2>
        <p className="mt-1 text-gray-600">
          Review your choices before starting the co-creation process with your child.
        </p>
      </div>

      {/* Summary cards */}
      <div className="space-y-4">
        {/* Age & Template */}
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-sm font-medium text-gray-500">
                Child's Age Group & Template
              </div>
              <div className="mt-1 flex items-center gap-2">
                <span className="text-lg font-semibold text-gray-900">
                  {childAge || 'Not set'}
                </span>
                {selectedTemplate && (
                  <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800">
                    {selectedTemplate.variation.charAt(0).toUpperCase() +
                      selectedTemplate.variation.slice(1)}
                  </span>
                )}
              </div>
              {selectedTemplate && (
                <p className="mt-1 text-sm text-gray-500">{selectedTemplate.name}</p>
              )}
            </div>
            <button
              type="button"
              onClick={() => setStep(0)}
              className="text-sm font-medium text-blue-600 hover:text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded"
              aria-label="Edit age selection"
            >
              Edit
            </button>
          </div>
        </div>

        {/* Screen Time */}
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-sm font-medium text-gray-500">Daily Screen Time</div>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-lg font-semibold text-gray-900">
                  {decisions.screenTimeMinutes} minutes
                </span>
                <span className="text-sm text-gray-500">on school days</span>
              </div>
              <div className="mt-1 text-sm text-gray-500">
                {Math.round(decisions.screenTimeMinutes * 1.5)} minutes on weekends
                <span className="mx-1">•</span>
                ~{Math.round(weeklyTotal / 60)} hours/week
              </div>
            </div>
            <button
              type="button"
              onClick={() => setStep(1)}
              className="text-sm font-medium text-blue-600 hover:text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded"
              aria-label="Edit screen time"
            >
              Edit
            </button>
          </div>
        </div>

        {/* Bedtime Cutoff */}
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-sm font-medium text-gray-500">Bedtime Screen Cutoff</div>
              <div className="mt-1 flex items-center gap-2">
                <span className="text-2xl" role="img" aria-hidden="true">
                  🌙
                </span>
                <span className="text-lg font-semibold text-gray-900">
                  {formatTime(decisions.bedtimeCutoff)}
                </span>
              </div>
              <p className="mt-1 text-sm text-gray-500">
                No screens after this time
              </p>
            </div>
            <button
              type="button"
              onClick={() => setStep(2)}
              className="text-sm font-medium text-blue-600 hover:text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded"
              aria-label="Edit bedtime cutoff"
            >
              Edit
            </button>
          </div>
        </div>

        {/* Monitoring Level */}
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-sm font-medium text-gray-500">Monitoring Level</div>
              <div className="mt-1 flex items-center gap-2">
                <span
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-full px-3 py-1',
                    monitoringDisplay.color
                  )}
                >
                  <span role="img" aria-hidden="true">
                    {monitoringDisplay.icon}
                  </span>
                  <span className="font-medium">{monitoringDisplay.label}</span>
                </span>
              </div>
              <p className="mt-2 text-sm text-gray-500">
                {decisions.monitoringLevel === 'light' &&
                  'Weekly summaries and time limits only'}
                {decisions.monitoringLevel === 'moderate' &&
                  'Daily activity summaries with periodic screenshots'}
                {decisions.monitoringLevel === 'comprehensive' &&
                  'Detailed activity feed with frequent screenshots'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setStep(3)}
              className="text-sm font-medium text-blue-600 hover:text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded"
              aria-label="Edit monitoring level"
            >
              Edit
            </button>
          </div>
        </div>
      </div>

      {/* Next steps info */}
      <div className="rounded-lg border border-green-200 bg-green-50 p-4">
        <div className="flex items-start gap-3">
          <svg
            className="h-5 w-5 flex-shrink-0 text-green-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <div>
            <div className="font-medium text-green-900">Ready for Co-Creation!</div>
            <p className="mt-1 text-sm text-green-700">
              When you click "Start Co-Creation", you'll work together with your child to
              finalize these rules and create a family agreement you both sign.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
