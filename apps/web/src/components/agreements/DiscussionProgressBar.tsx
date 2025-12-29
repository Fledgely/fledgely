/**
 * Discussion Progress Bar Component.
 *
 * Story 5.4: Negotiation & Discussion Support - AC5
 *
 * Shows progress indicator for resolved vs. pending discussions.
 * Displays encouraging messages based on progress.
 */

'use client'

import type { DiscussionStatus } from '@fledgely/shared/contracts'

/**
 * Encouraging messages based on progress level.
 */
const PROGRESS_MESSAGES = {
  none: '🌟 No discussions needed yet!',
  starting: '💬 Great start! Keep talking together.',
  halfway: "🎯 Halfway there! You're making progress!",
  almostDone: '🚀 Almost done! Just a little more!',
  complete: '🎉 All discussions resolved! Amazing teamwork!',
}

interface DiscussionProgressBarProps {
  /** Terms with their discussion status */
  discussionStatuses: DiscussionStatus[]
  /** Whether to show detailed breakdown */
  showDetails?: boolean
  /** Child's name for personalization */
  childName?: string
}

export function DiscussionProgressBar({
  discussionStatuses,
  showDetails = false,
  childName,
}: DiscussionProgressBarProps) {
  // Count discussions by status
  const counts = discussionStatuses.reduce(
    (acc, status) => {
      acc[status] = (acc[status] || 0) + 1
      return acc
    },
    {} as Record<DiscussionStatus, number>
  )

  const needsDiscussion = counts.needs_discussion || 0
  const resolved = counts.resolved || 0
  const totalDiscussions = needsDiscussion + resolved

  // Calculate progress
  const progressPercent =
    totalDiscussions === 0 ? 100 : Math.round((resolved / totalDiscussions) * 100)

  // Determine message based on progress
  let message: string
  if (totalDiscussions === 0) {
    message = PROGRESS_MESSAGES.none
  } else if (progressPercent === 100) {
    message = PROGRESS_MESSAGES.complete
  } else if (progressPercent >= 75) {
    message = PROGRESS_MESSAGES.almostDone
  } else if (progressPercent >= 50) {
    message = PROGRESS_MESSAGES.halfway
  } else {
    message = PROGRESS_MESSAGES.starting
  }

  // If no discussions needed, show minimal UI
  if (totalDiscussions === 0) {
    return (
      <div className="bg-gray-50 rounded-lg p-3 text-center" data-testid="discussion-progress-bar">
        <p className="text-sm text-gray-600">{message}</p>
      </div>
    )
  }

  return (
    <div
      className="bg-white rounded-xl border border-gray-200 p-4"
      data-testid="discussion-progress-bar"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-semibold text-gray-900 flex items-center gap-2">
          <span aria-hidden="true">💬</span>
          Discussion Progress
        </h4>
        <span className="text-sm font-medium text-gray-700">
          {resolved}/{totalDiscussions}
        </span>
      </div>

      {/* Progress bar */}
      <div className="relative h-4 bg-gray-200 rounded-full overflow-hidden mb-3">
        <div
          className={`
            absolute inset-y-0 left-0 rounded-full transition-all duration-500
            ${progressPercent === 100 ? 'bg-green-500' : 'bg-blue-500'}
          `}
          style={{ width: `${progressPercent}%` }}
          role="progressbar"
          aria-valuenow={resolved}
          aria-valuemin={0}
          aria-valuemax={totalDiscussions}
          aria-label={`${resolved} of ${totalDiscussions} discussions resolved`}
          data-testid="progress-fill"
        />

        {/* Animated shine effect when progressing */}
        {progressPercent > 0 && progressPercent < 100 && (
          <div
            className="absolute inset-y-0 left-0 w-full animate-pulse opacity-20 bg-gradient-to-r from-transparent via-white to-transparent"
            style={{ width: `${progressPercent}%` }}
          />
        )}
      </div>

      {/* Encouraging message */}
      <p className="text-sm text-center text-gray-600 mb-2" data-testid="progress-message">
        {message}
      </p>

      {/* Detailed breakdown (optional) */}
      {showDetails && (
        <div className="flex justify-center gap-4 pt-2 border-t border-gray-100 mt-2">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-yellow-400" aria-hidden="true" />
            <span className="text-xs text-gray-600">{needsDiscussion} pending</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-green-500" aria-hidden="true" />
            <span className="text-xs text-gray-600">{resolved} resolved</span>
          </div>
        </div>
      )}

      {/* Personalized encouragement */}
      {childName && needsDiscussion > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <p className="text-xs text-gray-500 text-center">
            Keep going, {childName}! Work with your parent to resolve the remaining discussions.
          </p>
        </div>
      )}

      {/* Celebration for completion */}
      {progressPercent === 100 && (
        <div
          className="mt-3 pt-3 border-t border-green-100 bg-green-50 rounded-lg p-3 -mx-4 -mb-4"
          data-testid="completion-celebration"
        >
          <div className="flex items-center justify-center gap-2 text-green-700">
            <span className="text-2xl" aria-hidden="true">
              🏆
            </span>
            <div className="text-center">
              <p className="font-semibold">All Discussions Complete!</p>
              <p className="text-sm">
                {childName ? `${childName} and parent` : 'You'} worked together to reach an
                agreement.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
