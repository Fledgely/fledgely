/**
 * Status Summary Component.
 *
 * Story 5.8: Child Agreement Viewing - AC6
 *
 * Displays current usage statistics (screen time) in a child-friendly format.
 * Shows progress toward daily limits with visual indicators.
 */

'use client'

interface StatusSummaryProps {
  /** Screen time used today (minutes) */
  screenTimeUsed: number
  /** Daily screen time limit (minutes) */
  screenTimeLimit: number
  /** Child's name for personalization */
  childName: string
  /** Callback to refresh status data */
  onRefresh?: () => void
  /** Whether status is refreshing */
  isRefreshing?: boolean
  /** Additional CSS classes */
  className?: string
}

export function StatusSummary({
  screenTimeUsed,
  screenTimeLimit,
  childName: _childName,
  onRefresh,
  isRefreshing = false,
  className = '',
}: StatusSummaryProps) {
  // Handle null/undefined values
  if (screenTimeUsed == null || screenTimeLimit == null) {
    return (
      <section
        role="region"
        aria-label="Today's status"
        className={`rounded-xl bg-gray-50 border border-gray-200 p-4 ${className}`}
        data-testid="status-summary"
      >
        <div className="text-center text-gray-500" data-testid="no-data-message">
          <span className="text-2xl mb-2 block" aria-hidden="true">
            📊
          </span>
          <p>No screen time data available yet.</p>
        </div>
      </section>
    )
  }

  // Calculate percentage (cap at 100)
  const percentage = Math.min(Math.round((screenTimeUsed / screenTimeLimit) * 100), 100)
  const isOverLimit = screenTimeUsed > screenTimeLimit
  const timeRemaining = Math.max(screenTimeLimit - screenTimeUsed, 0)

  /**
   * Format minutes into hours and minutes for display.
   */
  const formatTime = (minutes: number): string => {
    if (minutes < 60) {
      return `${minutes} minutes`
    }
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    if (mins === 0) {
      return `${hours} hour${hours > 1 ? 's' : ''}`
    }
    return `${hours} hour${hours > 1 ? 's' : ''} ${mins} minutes`
  }

  /**
   * Get progress bar color based on percentage.
   */
  const getProgressColor = (): string => {
    if (isOverLimit) return 'bg-red-500'
    if (percentage >= 75) return 'bg-orange-500'
    if (percentage >= 50) return 'bg-yellow-500'
    return 'bg-green-500'
  }

  /**
   * Get friendly status message for the child.
   */
  const getStatusMessage = (): string => {
    if (isOverLimit) {
      return "You've gone over your screen time today."
    }
    if (percentage >= 90) {
      return "You're almost at your limit for today!"
    }
    if (percentage >= 75) {
      return 'Getting close to your screen time limit.'
    }
    if (percentage >= 50) {
      return "You're doing great! About halfway through."
    }
    return 'Great job! You have lots of time left.'
  }

  /**
   * Get emoji for status.
   */
  const getStatusEmoji = (): string => {
    if (isOverLimit) return '😬'
    if (percentage >= 90) return '⏰'
    if (percentage >= 75) return '📱'
    if (percentage >= 50) return '👍'
    return '🎉'
  }

  return (
    <section
      role="region"
      aria-label="Today's status"
      className={`rounded-xl bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-200 p-4 ${className}`}
      data-testid="status-summary"
    >
      {/* Header with refresh button */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
          <span aria-hidden="true">📊</span>
          Today&apos;s Screen Time
        </h2>

        {onRefresh && (
          <button
            type="button"
            onClick={onRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-1 px-3 py-1 text-sm text-indigo-600 hover:text-indigo-800 hover:bg-indigo-100 rounded-full transition-colors min-h-[44px] min-w-[44px] disabled:opacity-50"
            aria-label="Refresh status"
          >
            <span className={isRefreshing ? 'animate-spin' : ''} aria-hidden="true">
              ↻
            </span>
            {isRefreshing ? 'Loading...' : 'Refresh'}
          </button>
        )}
      </div>

      {/* Time display */}
      <div className="mb-4">
        <div className="flex items-baseline gap-2 mb-1">
          <span className="text-3xl font-bold text-indigo-900">{formatTime(screenTimeUsed)}</span>
          <span className="text-gray-500">used</span>
        </div>
        <div className="text-sm text-gray-600">
          {isOverLimit ? (
            <span className="text-red-600 font-medium">
              {formatTime(screenTimeUsed - screenTimeLimit)} over your {formatTime(screenTimeLimit)}{' '}
              limit
            </span>
          ) : (
            <>
              {formatTime(timeRemaining)} left of your {formatTime(screenTimeLimit)} limit
            </>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div className="mb-4">
        <div
          className="h-4 bg-gray-200 rounded-full overflow-hidden"
          role="progressbar"
          aria-valuenow={percentage}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Screen time progress: ${percentage}%`}
        >
          <div
            className={`h-full transition-all duration-500 ${getProgressColor()}`}
            style={{ width: `${percentage}%` }}
            data-testid="progress-fill"
          />
        </div>
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>0</span>
          <span>{percentage}%</span>
          <span>{formatTime(screenTimeLimit)}</span>
        </div>
      </div>

      {/* Status message */}
      <div
        className={`p-3 rounded-lg ${
          isOverLimit
            ? 'bg-red-100 text-red-800'
            : percentage >= 75
              ? 'bg-yellow-100 text-yellow-800'
              : 'bg-green-100 text-green-800'
        }`}
        data-testid="status-message"
      >
        <p className="flex items-center gap-2 text-sm font-medium">
          <span aria-hidden="true">{getStatusEmoji()}</span>
          {getStatusMessage()}
        </p>
      </div>
    </section>
  )
}
