/**
 * Age18PreDeletionNotice Component - Story 38.5 Task 7
 *
 * Shows pre-deletion warning before 18th birthday.
 * AC2: When child turns 18, all monitoring data is automatically deleted
 * AC5: Deletion occurs regardless of parent wishes
 */

'use client'

export type ViewerType = 'child' | 'parent'

export interface Age18PreDeletionNoticeProps {
  childName: string
  daysUntil18: number
  eighteenthBirthday: Date
  viewerType: ViewerType
  onDismiss?: () => void
}

export default function Age18PreDeletionNotice({
  childName,
  daysUntil18,
  eighteenthBirthday,
  viewerType,
  onDismiss,
}: Age18PreDeletionNoticeProps): JSX.Element {
  const isChild = viewerType === 'child'
  const dayWord = daysUntil18 === 1 ? 'day' : 'days'

  const formattedBirthday = eighteenthBirthday.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  const getMessage = () => {
    if (isChild) {
      return `In ${daysUntil18} ${dayWord}, all your monitoring data will be automatically deleted`
    }
    return `In ${daysUntil18} ${dayWord}, ${childName}'s monitoring data will be automatically deleted`
  }

  return (
    <div role="alert" className="bg-amber-50 border-l-4 border-amber-400 p-4 rounded-r-lg">
      <div className="flex">
        {/* Icon */}
        <div className="flex-shrink-0">
          <span className="text-2xl" aria-hidden="true">
            📅
          </span>
        </div>

        {/* Content */}
        <div className="ml-3 flex-1">
          {/* Main message */}
          <p className="text-amber-800 font-medium">{getMessage()}</p>

          {/* Additional details */}
          <p className="mt-2 text-amber-700 text-sm">
            On {formattedBirthday}, when {isChild ? 'you turn' : `${childName} turns`} 18, all
            monitoring data will be automatically and permanently removed. This is automatic and
            cannot be prevented or delayed.
          </p>

          {/* Parent-specific export option */}
          {!isChild && (
            <div className="mt-3">
              <a
                href="/family/export"
                className="text-sm text-amber-900 underline hover:text-amber-700"
              >
                Export data before deletion →
              </a>
            </div>
          )}

          {/* Countdown badge */}
          <div className="mt-3 flex items-center space-x-2">
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-amber-200 text-amber-900">
              {daysUntil18} {dayWord} remaining
            </span>
          </div>
        </div>

        {/* Dismiss button */}
        {onDismiss && (
          <div className="ml-4 flex-shrink-0">
            <button
              onClick={onDismiss}
              className="text-amber-600 hover:text-amber-800 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 rounded"
              aria-label="Dismiss for later"
            >
              <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
