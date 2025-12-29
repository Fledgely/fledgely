/**
 * Age Selection Step Component.
 *
 * Story 4.4: Quick Start Wizard - AC1
 *
 * Displays age group selection with friendly labels
 * and template recommendations.
 */

'use client'

import type { AgeGroup } from '../../../hooks/useQuickStartWizard'
import { AGE_GROUP_LABELS } from '../../../data/templates'

interface AgeSelectionStepProps {
  selectedAgeGroup: AgeGroup | null
  childAge: number | null
  onSelectAgeGroup: (ageGroup: AgeGroup) => void
}

const AGE_GROUPS: AgeGroup[] = ['5-7', '8-10', '11-13', '14-16']

const AGE_GROUP_DESCRIPTIONS: Record<AgeGroup, string> = {
  '5-7': 'Young children learning to use devices. High supervision with simple rules.',
  '8-10': 'Growing independence with boundaries. Balanced screen time and safety.',
  '11-13': 'Pre-teens with social media interests. Trust building with oversight.',
  '14-16': 'Teens earning independence. Autonomy path with check-ins.',
}

const AGE_GROUP_ICONS: Record<AgeGroup, string> = {
  '5-7': '🧒',
  '8-10': '👧',
  '11-13': '🧑',
  '14-16': '👤',
}

export function AgeSelectionStep({
  selectedAgeGroup,
  childAge,
  onSelectAgeGroup,
}: AgeSelectionStepProps) {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-xl font-semibold text-gray-900">
          {childAge ? `Your child is ${childAge} years old` : "What's your child's age group?"}
        </h2>
        <p className="mt-2 text-gray-600">
          We&apos;ll suggest an agreement template designed for their age.
        </p>
      </div>

      <div
        className="grid grid-cols-1 sm:grid-cols-2 gap-4"
        role="radiogroup"
        aria-label="Select child's age group"
      >
        {AGE_GROUPS.map((ageGroup) => (
          <button
            key={ageGroup}
            type="button"
            onClick={() => onSelectAgeGroup(ageGroup)}
            className={`
              p-4 rounded-lg border-2 text-left transition-all
              focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2
              min-h-[120px]
              ${
                selectedAgeGroup === ageGroup
                  ? 'border-primary bg-primary/5 ring-2 ring-primary'
                  : 'border-gray-200 hover:border-primary/50'
              }
            `}
            aria-pressed={selectedAgeGroup === ageGroup}
            aria-label={`Select ${AGE_GROUP_LABELS[ageGroup]}`}
          >
            <div className="flex items-start gap-3">
              <span className="text-3xl" aria-hidden="true">
                {AGE_GROUP_ICONS[ageGroup]}
              </span>
              <div className="flex-1">
                <p className="font-semibold text-gray-900">{AGE_GROUP_LABELS[ageGroup]}</p>
                <p className="mt-1 text-sm text-gray-600">{AGE_GROUP_DESCRIPTIONS[ageGroup]}</p>
              </div>
              {selectedAgeGroup === ageGroup && (
                <svg
                  className="w-6 h-6 text-primary flex-shrink-0"
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
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

export default AgeSelectionStep
