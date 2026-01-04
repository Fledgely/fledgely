/**
 * TransitionNotificationCard - Story 52.1 Task 5.1
 *
 * Dismissable notification card for age 16 transition.
 *
 * AC1: Notification to child: "At 16, you gain new controls"
 * AC2: Explains reverse mode option, trusted adults
 * AC5: No action required - transition is optional
 */

'use client'

import { useState } from 'react'
import { X, ChevronRight, Gift, PartyPopper } from 'lucide-react'

interface TransitionNotificationCardProps {
  /** Days until 16th birthday (null if already 16) */
  daysUntil16: number | null
  /** Whether this is a pre-transition or transition available notification */
  notificationType: 'pre_transition' | 'transition_available'
  /** Callback when user wants to learn more */
  onLearnMore: () => void
  /** Callback when notification is dismissed */
  onDismiss: () => void
}

export function TransitionNotificationCard({
  daysUntil16,
  notificationType,
  onLearnMore,
  onDismiss,
}: TransitionNotificationCardProps) {
  const [isDismissing, setIsDismissing] = useState(false)

  const handleDismiss = () => {
    setIsDismissing(true)
    // Animate out before calling dismiss
    setTimeout(() => {
      onDismiss()
    }, 200)
  }

  const isPreTransition = notificationType === 'pre_transition'

  // Message content based on notification type
  const title = isPreTransition
    ? 'At 16, you gain new controls'
    : "You're 16! New features are available"

  const description = isPreTransition
    ? daysUntil16 === 1
      ? "Tomorrow you'll unlock Reverse Mode and Trusted Adults."
      : `In ${daysUntil16} days, you'll unlock Reverse Mode and Trusted Adults.`
    : 'Reverse Mode and Trusted Adults are now available to you.'

  const Icon = isPreTransition ? Gift : PartyPopper

  return (
    <div
      className={`
        relative overflow-hidden rounded-lg border-2 p-4
        transition-all duration-200
        ${isDismissing ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}
        ${
          isPreTransition
            ? 'border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50'
            : 'border-purple-200 bg-gradient-to-r from-purple-50 to-pink-50'
        }
      `}
      role="alert"
      aria-live="polite"
    >
      {/* Dismiss button */}
      <button
        onClick={handleDismiss}
        className="absolute right-2 top-2 rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
        aria-label="Dismiss notification"
      >
        <X className="h-4 w-4" />
      </button>

      <div className="flex items-start gap-4 pr-8">
        {/* Icon */}
        <div
          className={`
            flex-shrink-0 rounded-full p-2
            ${isPreTransition ? 'bg-blue-100 text-blue-600' : 'bg-purple-100 text-purple-600'}
          `}
        >
          <Icon className="h-6 w-6" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h3
            className={`
              font-semibold text-lg
              ${isPreTransition ? 'text-blue-900' : 'text-purple-900'}
            `}
          >
            {title}
          </h3>

          <p className="mt-1 text-sm text-gray-600">{description}</p>

          {/* What you'll unlock */}
          <div className="mt-3 flex flex-wrap gap-2">
            <span className="inline-flex items-center rounded-full bg-white px-3 py-1 text-xs font-medium text-gray-700 border border-gray-200">
              Reverse Mode
            </span>
            <span className="inline-flex items-center rounded-full bg-white px-3 py-1 text-xs font-medium text-gray-700 border border-gray-200">
              Trusted Adults
            </span>
            <span className="inline-flex items-center rounded-full bg-white px-3 py-1 text-xs font-medium text-gray-700 border border-gray-200">
              Privacy Controls
            </span>
          </div>

          {/* Actions */}
          <div className="mt-4 flex items-center gap-3">
            <button
              onClick={onLearnMore}
              className={`
                inline-flex items-center gap-1 rounded-lg px-4 py-2 text-sm font-medium
                transition-colors
                ${
                  isPreTransition
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-purple-600 text-white hover:bg-purple-700'
                }
              `}
            >
              Learn More
              <ChevronRight className="h-4 w-4" />
            </button>

            <span className="text-xs text-gray-500">No action required</span>
          </div>
        </div>
      </div>

      {/* Celebration sparkles for transition available */}
      {!isPreTransition && (
        <div className="absolute -right-4 -top-4 text-6xl opacity-20 rotate-12">🎉</div>
      )}
    </div>
  )
}

export default TransitionNotificationCard
