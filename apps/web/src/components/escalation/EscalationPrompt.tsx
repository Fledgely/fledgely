/**
 * EscalationPrompt Component - Story 34.5.2 Task 3
 *
 * Displays a supportive prompt to children when escalation threshold is reached.
 * AC1: Display Mediation Prompt on Escalation
 * AC5: Supportive, Non-Accusatory Messaging
 *
 * CRITICAL: All messaging must be supportive and empowering, never accusatory.
 */

import type { AgeTier } from '@fledgely/shared/contracts/mediationResources'

// ============================================
// Types
// ============================================

export interface EscalationPromptProps {
  /** Child's unique identifier */
  childId: string
  /** Family's unique identifier */
  familyId: string
  /** Child's age tier for content adaptation */
  ageTier: AgeTier
  /** Callback when child acknowledges the prompt */
  onAcknowledge: () => void
  /** Callback when child wants to view resources */
  onViewResources: () => void
}

// ============================================
// Age-Appropriate Messaging
// ============================================

/**
 * Supportive messaging content by age tier.
 * AC5: All messaging is supportive and empowering, never blaming.
 */
const PROMPT_MESSAGES: Record<AgeTier, { title: string; message: string; cta: string }> = {
  'child-8-11': {
    title: 'We noticed something',
    message:
      "It seems like some of your ideas haven't been approved lately. That can feel frustrating! We have some tips that might help you talk with your parents about what you want.",
    cta: 'See helpful tips',
  },
  'tween-12-14': {
    title: 'Having trouble being heard?',
    message:
      "We've noticed several of your proposals weren't approved. That's okay - disagreements happen in families. Here are some resources that might help you have a productive conversation with your parents.",
    cta: 'View resources',
  },
  'teen-15-17': {
    title: 'Communication support available',
    message:
      "Multiple proposals have been declined recently. This might mean it's time for a deeper conversation with your family. We have resources to help facilitate that discussion.",
    cta: 'Access resources',
  },
}

// ============================================
// Component
// ============================================

/**
 * EscalationPrompt displays a supportive message to children when they've
 * had multiple proposals rejected, guiding them to communication resources.
 */
export function EscalationPrompt({
  childId: _childId,
  familyId: _familyId,
  ageTier,
  onAcknowledge,
  onViewResources,
}: EscalationPromptProps) {
  // Note: childId and familyId are available for future analytics/logging
  const content = PROMPT_MESSAGES[ageTier]

  return (
    <div
      data-testid="escalation-prompt"
      className="escalation-prompt bg-amber-50 border border-amber-200 rounded-lg p-4 shadow-sm"
      role="alert"
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className="flex-shrink-0 text-amber-500">
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
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
            />
          </svg>
        </div>

        {/* Content */}
        <div className="flex-1">
          <h3 data-testid="escalation-title" className="text-lg font-medium text-amber-900">
            {content.title}
          </h3>
          <p data-testid="escalation-message" className="mt-1 text-amber-800">
            {content.message}
          </p>

          {/* Actions */}
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              data-testid="escalation-cta"
              onClick={onViewResources}
              className="px-4 py-2 bg-amber-500 text-white font-medium rounded-md hover:bg-amber-600 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 transition-colors"
              aria-label={content.cta}
            >
              {content.cta}
            </button>
            <button
              data-testid="escalation-acknowledge"
              onClick={onAcknowledge}
              className="px-4 py-2 text-amber-700 font-medium hover:text-amber-900 focus:outline-none focus:underline transition-colors"
              aria-label="Maybe later"
            >
              Maybe later
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
