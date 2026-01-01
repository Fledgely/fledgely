/**
 * GracePeriodBanner Component - Story 35.4
 *
 * Banner component for grace period notifications.
 * AC3: Banner shown: "Agreement expired - please renew within 14 days"
 * AC6: Child sees: "Your agreement needs renewal"
 */

import {
  getGracePeriodStatusConfig,
  getGracePeriodMessage,
  type GracePeriodUrgency,
} from '@fledgely/shared'

/**
 * Props for GracePeriodBanner component.
 */
export interface GracePeriodBannerProps {
  /** Days remaining in grace period */
  daysRemaining: number
  /** User role determines message content */
  userRole: 'parent' | 'child'
  /** Callback when renew button is clicked */
  onRenew?: () => void
  /** Callback when dismiss button is clicked */
  onDismiss?: () => void
}

/**
 * Get urgency-based styles.
 */
function getUrgencyStyles(urgency: GracePeriodUrgency): string {
  switch (urgency) {
    case 'normal':
      return 'bg-yellow-50 border-yellow-200 text-yellow-800'
    case 'warning':
      return 'bg-orange-50 border-orange-200 text-orange-800'
    case 'critical':
      return 'bg-red-50 border-red-200 text-red-800'
    case 'expired':
      return 'bg-gray-50 border-gray-200 text-gray-800'
    default:
      return 'bg-yellow-50 border-yellow-200 text-yellow-800'
  }
}

/**
 * Banner component for grace period notifications.
 */
export function GracePeriodBanner({
  daysRemaining,
  userRole,
  onRenew,
  onDismiss,
}: GracePeriodBannerProps) {
  const config = getGracePeriodStatusConfig(daysRemaining)
  const message = getGracePeriodMessage(daysRemaining, userRole)
  const styles = getUrgencyStyles(config.urgency)

  return (
    <div
      role="alert"
      data-testid="grace-period-banner"
      data-urgency={config.urgency}
      className={`flex items-center justify-between p-4 border rounded-lg ${styles}`}
    >
      <div className="flex-1">
        <p data-testid="banner-message" className="font-medium">
          {message}
        </p>
        {userRole === 'parent' && daysRemaining > 0 && (
          <p className="text-sm mt-1 opacity-80">Monitoring continues during the grace period.</p>
        )}
      </div>

      <div className="flex items-center gap-3 ml-4">
        {userRole === 'parent' && onRenew && (
          <button
            type="button"
            onClick={onRenew}
            className={`px-4 py-2 rounded-lg font-medium ${
              config.urgency === 'critical' || config.urgency === 'expired'
                ? 'bg-red-600 text-white hover:bg-red-700'
                : config.urgency === 'warning'
                  ? 'bg-orange-600 text-white hover:bg-orange-700'
                  : 'bg-yellow-600 text-white hover:bg-yellow-700'
            }`}
          >
            Renew Now
          </button>
        )}

        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Dismiss"
            className="p-1 rounded hover:bg-black/10"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        )}
      </div>
    </div>
  )
}
