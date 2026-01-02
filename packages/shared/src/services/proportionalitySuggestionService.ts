/**
 * ProportionalitySuggestionService - Story 38.4 Task 4
 *
 * Service that generates suggestions based on age and trust score.
 * AC4: Suggestions based on age and trust score
 */

import {
  type ProportionalitySuggestion,
  type SuggestionType,
  type SuggestionPriority,
} from '../contracts/proportionalityCheck'

// ============================================
// Types
// ============================================

export interface GenerateSuggestionsInput {
  childAge: number
  trustScore: number
  monthsMonitored: number
  currentMonitoringLevel: string
  trustMilestone: string | null
}

interface SuggestionTemplate {
  type: SuggestionType
  title: string
  description: string
}

// ============================================
// Suggestion Templates
// ============================================

export const SUGGESTION_TEMPLATES: Record<string, SuggestionTemplate> = {
  GRADUATION_ELIGIBLE: {
    type: 'graduation_eligible',
    title: 'Ready to Graduate from Monitoring',
    description:
      'Based on consistent perfect trust, your family may be ready to graduate from monitoring. This is a wonderful milestone!',
  },
  REDUCE_MONITORING: {
    type: 'reduce_monitoring',
    title: 'Consider Reduced Monitoring',
    description:
      'The trust level and developmental progress suggest monitoring frequency could be reduced while maintaining safety.',
  },
  NOTIFICATION_ONLY: {
    type: 'reduce_monitoring',
    title: 'Transition to Notification-Only Mode',
    description:
      'Consider moving to notification-only mode where parents receive alerts but no screenshots are captured.',
  },
  MAINTAIN_CURRENT: {
    type: 'maintain',
    title: 'Maintain Current Monitoring',
    description:
      'Current monitoring level appears appropriate for the developmental stage and trust level.',
  },
  CONSIDER_DISCUSSION: {
    type: 'consider_discussion',
    title: 'Family Discussion Recommended',
    description:
      'This is a good time to have a conversation about how monitoring is working for everyone. Open dialogue strengthens family trust.',
  },
}

// ============================================
// Priority Calculation
// ============================================

/**
 * Calculate priority for a suggestion.
 * AC4: Prioritize actionable suggestions.
 */
export function calculateSuggestionPriority(
  suggestion: ProportionalitySuggestion
): SuggestionPriority {
  // Graduation eligible is always high priority
  if (suggestion.type === 'graduation_eligible') {
    return 'high'
  }

  // Reduce monitoring is medium priority
  if (suggestion.type === 'reduce_monitoring') {
    return 'medium'
  }

  // Consider discussion is medium priority
  if (suggestion.type === 'consider_discussion') {
    return 'medium'
  }

  // Maintain is low priority (status quo)
  return 'low'
}

// ============================================
// Suggestion Generation
// ============================================

/**
 * Generate suggestions based on child context.
 * AC4: Suggestions based on age and trust score.
 */
export function generateSuggestions(input: GenerateSuggestionsInput): ProportionalitySuggestion[] {
  const suggestions: ProportionalitySuggestion[] = []
  const { childAge, trustScore, monthsMonitored, currentMonitoringLevel, trustMilestone } = input

  const basedOn = {
    childAge,
    trustScore,
    monthsMonitored,
    trustMilestone,
  }

  // Check for graduation eligibility (100% trust for 12+ months at age 16+)
  if (trustScore === 100 && monthsMonitored >= 12 && childAge >= 16) {
    suggestions.push({
      ...SUGGESTION_TEMPLATES.GRADUATION_ELIGIBLE,
      basedOn,
      priority: 'high',
    })
  }

  // Check for reduced monitoring (high trust, older teen)
  if (trustScore >= 80 && childAge >= 14) {
    if (currentMonitoringLevel === 'standard') {
      suggestions.push({
        ...SUGGESTION_TEMPLATES.REDUCE_MONITORING,
        basedOn,
        priority: 'medium',
      })
    }

    // Suggest notification-only for very high trust
    if (
      trustScore >= 90 &&
      trustMilestone === 'trusted' &&
      currentMonitoringLevel !== 'notification_only'
    ) {
      suggestions.push({
        ...SUGGESTION_TEMPLATES.NOTIFICATION_ONLY,
        basedOn,
        priority: 'medium',
      })
    }
  }

  // Check for younger teen with developing trust
  if (childAge >= 12 && childAge < 14 && trustScore >= 70) {
    suggestions.push({
      ...SUGGESTION_TEMPLATES.CONSIDER_DISCUSSION,
      basedOn,
      priority: 'medium',
    })
  }

  // Default: maintain current if no other strong signals
  if (trustScore < 80 || suggestions.length === 0) {
    // Only add maintain if we haven't already suggested something higher priority
    if (suggestions.length === 0 || !suggestions.some((s) => s.type === 'graduation_eligible')) {
      suggestions.push({
        ...SUGGESTION_TEMPLATES.MAINTAIN_CURRENT,
        basedOn,
        priority: 'low',
      })
    }
  }

  // Sort by priority (high first)
  const priorityOrder: Record<SuggestionPriority, number> = {
    high: 0,
    medium: 1,
    low: 2,
  }

  suggestions.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority])

  return suggestions
}

/**
 * Get a single primary suggestion.
 */
export function getPrimarySuggestion(
  input: GenerateSuggestionsInput
): ProportionalitySuggestion | null {
  const suggestions = generateSuggestions(input)
  return suggestions.length > 0 ? suggestions[0] : null
}

/**
 * Get suggestion text for UI display.
 */
export function getSuggestionDisplayText(
  suggestion: ProportionalitySuggestion,
  childName: string
): { headline: string; body: string } {
  const headline = suggestion.title.replace('{childName}', childName)
  const body = suggestion.description.replace('{childName}', childName)

  return { headline, body }
}
