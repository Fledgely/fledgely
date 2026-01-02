/**
 * ProportionalitySuggestions Component - Story 38.4 Task 7
 *
 * Display suggestions based on age and trust score.
 * AC4: Suggestions based on age and trust score
 */

'use client'

import type { ProportionalitySuggestion } from '@fledgely/shared'

export type ViewerType = 'child' | 'parent'

export interface ProportionalitySuggestionsProps {
  suggestions: ProportionalitySuggestion[]
  childName: string
  viewerType: ViewerType
  onDismiss?: () => void
}

const SUGGESTION_ICONS: Record<ProportionalitySuggestion['type'], string> = {
  graduation_eligible: '🎓',
  reduce_monitoring: '📉',
  maintain: '✅',
  consider_discussion: '💬',
}

const PRIORITY_COLORS: Record<ProportionalitySuggestion['priority'], string> = {
  high: 'bg-green-50 border-green-200',
  medium: 'bg-blue-50 border-blue-200',
  low: 'bg-gray-50 border-gray-200',
}

export default function ProportionalitySuggestions({
  suggestions,
  childName,
  viewerType,
  onDismiss,
}: ProportionalitySuggestionsProps): JSX.Element {
  if (suggestions.length === 0) {
    return (
      <div className="bg-gray-50 rounded-lg p-6 text-center text-gray-600">
        No suggestions available at this time.
      </div>
    )
  }

  const isChild = viewerType === 'child'

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold text-gray-900">
          {isChild ? 'What We Suggest' : `Suggestions for ${childName}`}
        </h2>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="text-gray-400 hover:text-gray-600"
            aria-label="Dismiss suggestions"
          >
            ✕
          </button>
        )}
      </div>

      <div className="space-y-3">
        {suggestions.map((suggestion, index) => (
          <div
            key={`${suggestion.type}-${index}`}
            className={`rounded-lg border-2 p-4 ${PRIORITY_COLORS[suggestion.priority]}`}
          >
            <div className="flex items-start gap-3">
              <span className="text-2xl" role="img" aria-hidden="true">
                {SUGGESTION_ICONS[suggestion.type]}
              </span>
              <div className="flex-1">
                <h3 className="font-medium text-gray-900">{suggestion.title}</h3>
                <p className="text-sm text-gray-600 mt-1">{suggestion.description}</p>

                {/* Show basis for suggestion (AC4) */}
                <div className="mt-3 flex flex-wrap gap-2 text-xs text-gray-500">
                  <span className="bg-white px-2 py-1 rounded">
                    Age: {suggestion.basedOn.childAge}
                  </span>
                  <span className="bg-white px-2 py-1 rounded">
                    Trust: {suggestion.basedOn.trustScore}%
                  </span>
                  <span className="bg-white px-2 py-1 rounded">
                    {suggestion.basedOn.monthsMonitored} months monitored
                  </span>
                  {suggestion.basedOn.trustMilestone && (
                    <span className="bg-white px-2 py-1 rounded">
                      Milestone: {suggestion.basedOn.trustMilestone}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Action links */}
      <div className="pt-4 border-t border-gray-200">
        <p className="text-sm text-gray-600 mb-2">Learn more about:</p>
        <div className="flex flex-wrap gap-2">
          <a href="/dashboard/trust" className="text-sm text-blue-600 hover:underline">
            Trust Score Progress
          </a>
          {suggestions.some((s) => s.type === 'graduation_eligible') && (
            <a href="/dashboard/graduation" className="text-sm text-blue-600 hover:underline">
              Graduation Path
            </a>
          )}
        </div>
      </div>
    </div>
  )
}
