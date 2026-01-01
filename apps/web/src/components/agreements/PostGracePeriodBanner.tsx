/**
 * PostGracePeriodBanner Component - Story 35.5
 *
 * Banner component for post-grace period notifications.
 * AC4: Both parties notified: "Monitoring paused - renew to resume"
 * AC5: Can renew at any time
 * AC6: No punitive device restrictions
 */

import { POST_GRACE_MESSAGES } from '@fledgely/shared'

/**
 * Props for PostGracePeriodBanner component.
 */
export interface PostGracePeriodBannerProps {
  /** User role determines message content */
  userRole: 'parent' | 'child'
  /** Callback when renew button is clicked */
  onRenew?: () => void
}

/**
 * Banner component for post-grace period notifications.
 * Uses calm, non-punitive messaging.
 */
export function PostGracePeriodBanner({ userRole, onRenew }: PostGracePeriodBannerProps) {
  const message =
    userRole === 'parent'
      ? POST_GRACE_MESSAGES.PARENT_NOTIFICATION
      : POST_GRACE_MESSAGES.CHILD_NOTIFICATION

  return (
    <div
      role="alert"
      data-testid="post-grace-banner"
      className="bg-gray-50 border border-gray-200 rounded-lg p-6"
    >
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <svg
            className="h-6 w-6 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <div className="ml-4 flex-1">
          <h3 className="text-lg font-medium text-gray-800">Monitoring Paused</h3>
          <p className="mt-2 text-gray-600">{message}</p>

          {userRole === 'parent' && (
            <>
              <p className="mt-2 text-sm text-gray-500">{POST_GRACE_MESSAGES.DATA_PRESERVED}</p>
              {onRenew && (
                <button
                  type="button"
                  onClick={onRenew}
                  className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
                >
                  Renew Agreement
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
