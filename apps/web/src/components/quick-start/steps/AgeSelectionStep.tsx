'use client'

import { useCallback, useMemo } from 'react'
import { cn } from '@/lib/utils'
import {
  type AgeGroup,
  getTemplatesByAgeGroup,
  type AgreementTemplate,
} from '@fledgely/contracts'
import { useQuickStartWizard } from '../QuickStartWizardProvider'

/**
 * Age group options with labels and descriptions
 */
const AGE_GROUPS: Array<{
  value: AgeGroup
  label: string
  description: string
  icon: string
}> = [
  {
    value: '5-7',
    label: '5-7 years',
    description: 'Early childhood with visual rules',
    icon: '🧒',
  },
  {
    value: '8-10',
    label: '8-10 years',
    description: 'Middle childhood with clear structure',
    icon: '👦',
  },
  {
    value: '11-13',
    label: '11-13 years',
    description: 'Pre-teen with growing independence',
    icon: '🧑',
  },
  {
    value: '14-16',
    label: '14-16 years',
    description: 'Teen with autonomy milestones',
    icon: '👨',
  },
]

/**
 * Age Selection Step Component
 *
 * Story 4.4: Quick Start Wizard - Task 2
 * AC #1: Wizard asks child's age and pre-selects appropriate template
 *
 * Features:
 * - Age group buttons (5-7, 8-10, 11-13, 14-16)
 * - Auto-select "balanced" template for chosen age
 * - Show template preview summary after selection
 * - Child-friendly visuals
 *
 * @example
 * ```tsx
 * <AgeSelectionStep />
 * ```
 */
export function AgeSelectionStep() {
  const { childAge, selectedTemplateId, setChildAge, setTemplate } =
    useQuickStartWizard()

  // Get the selected template details for preview
  const selectedTemplate = useMemo(() => {
    if (!childAge || !selectedTemplateId) return null
    const templates = getTemplatesByAgeGroup(childAge as AgeGroup)
    return templates.find((t) => t.id === selectedTemplateId) || null
  }, [childAge, selectedTemplateId])

  const handleAgeSelect = useCallback(
    (age: AgeGroup) => {
      setChildAge(age)

      // Auto-select the "balanced" template for this age group
      const templates = getTemplatesByAgeGroup(age)
      const balancedTemplate = templates.find((t) => t.variation === 'balanced')
      if (balancedTemplate) {
        setTemplate(balancedTemplate.id)
      } else if (templates.length > 0) {
        // Fallback to first available template
        setTemplate(templates[0].id)
      }
    },
    [setChildAge, setTemplate]
  )

  return (
    <div className="space-y-6">
      {/* Step header */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900">
          Select Your Child's Age Group
        </h2>
        <p className="mt-1 text-gray-600">
          We'll customize the agreement template based on what's appropriate for your
          child's age.
        </p>
      </div>

      {/* Age group buttons */}
      <div
        className="grid grid-cols-1 gap-3 sm:grid-cols-2"
        role="radiogroup"
        aria-label="Select child's age group"
      >
        {AGE_GROUPS.map((ageGroup) => {
          const isSelected = childAge === ageGroup.value

          return (
            <button
              key={ageGroup.value}
              type="button"
              role="radio"
              aria-checked={isSelected}
              aria-pressed={isSelected}
              onClick={() => handleAgeSelect(ageGroup.value)}
              className={cn(
                'flex items-start gap-4 rounded-lg border-2 p-4 text-left transition-all',
                'min-h-[80px] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
                isSelected
                  ? 'border-blue-600 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              )}
            >
              <span
                className="text-3xl"
                role="img"
                aria-hidden="true"
              >
                {ageGroup.icon}
              </span>
              <div className="flex-1">
                <div
                  className={cn(
                    'font-semibold',
                    isSelected ? 'text-blue-900' : 'text-gray-900'
                  )}
                >
                  {ageGroup.label}
                </div>
                <div
                  className={cn(
                    'text-sm',
                    isSelected ? 'text-blue-700' : 'text-gray-500'
                  )}
                >
                  {ageGroup.description}
                </div>
              </div>
              {isSelected && (
                <svg
                  className="h-5 w-5 text-blue-600"
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
            </button>
          )
        })}
      </div>

      {/* Selected template preview */}
      {selectedTemplate && (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
          <h3 className="text-sm font-medium text-gray-900">
            Recommended Template
          </h3>
          <div className="mt-2 flex items-center gap-3">
            <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800">
              {selectedTemplate.variation.charAt(0).toUpperCase() +
                selectedTemplate.variation.slice(1)}
            </span>
            <span className="text-sm text-gray-600">{selectedTemplate.name}</span>
          </div>
          <p className="mt-2 text-sm text-gray-500">
            {selectedTemplate.description}
          </p>
          <div className="mt-3 border-t border-gray-200 pt-3">
            <div className="text-xs text-gray-500">Quick summary:</div>
            <div className="mt-1 text-sm text-gray-700">
              {selectedTemplate.summary.screenTimeLimit}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
