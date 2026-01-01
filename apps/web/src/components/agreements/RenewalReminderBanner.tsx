/**
 * RenewalReminderBanner Component - Story 35.2
 *
 * Banner component for displaying renewal reminders prominently.
 * AC1, AC2, AC3: Different reminder thresholds with urgency styling
 * AC4: Parent and child variants
 * AC5: "Renew Now" action button
 * AC6: Snooze option
 */

import { getReminderType } from '@fledgely/shared'
import { getReminderDisplayInfo, canSnoozeReminder } from '../../services/renewalReminderService'

export interface RenewalReminderBannerProps {
  /** Agreement expiry date */
  expiryDate: Date | null
  /** Callback when renew action is clicked */
  onRenewClick: () => void
  /** Callback when snooze is clicked */
  onSnoozeClick: () => void
  /** Callback when banner is dismissed */
  onDismiss: () => void
  /** Display variant */
  variant?: 'parent' | 'child'
}

/**
 * Banner component for displaying renewal reminders.
 */
export function RenewalReminderBanner({
  expiryDate,
  onRenewClick,
  onSnoozeClick,
  onDismiss,
  variant = 'parent',
}: RenewalReminderBannerProps) {
  // Get reminder type and display info
  const reminderType = getReminderType(expiryDate)

  if (!reminderType) {
    return null
  }

  const displayInfo = getReminderDisplayInfo(expiryDate, variant)

  if (!displayInfo) {
    return null
  }

  const showSnooze = canSnoozeReminder(reminderType)

  // Urgency-based styling classes
  const urgencyStyles: Record<string, string> = {
    info: 'bg-blue-50 border-blue-200 text-blue-800',
    warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
    critical: 'bg-red-50 border-red-200 text-red-800',
  }

  const buttonStyles: Record<string, string> = {
    info: 'bg-blue-600 hover:bg-blue-700 text-white',
    warning: 'bg-yellow-600 hover:bg-yellow-700 text-white',
    critical: 'bg-red-600 hover:bg-red-700 text-white',
  }

  return (
    <div
      role="alert"
      data-urgency={displayInfo.urgency}
      className={`w-full p-4 border rounded-lg ${urgencyStyles[displayInfo.urgency]}`}
    >
      <div className="flex items-center justify-between gap-4">
        {/* Message */}
        <div className="flex-1">
          <p className="font-medium">{displayInfo.message}</p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          {/* Snooze link */}
          {showSnooze && (
            <button
              type="button"
              onClick={onSnoozeClick}
              className="text-sm underline opacity-75 hover:opacity-100"
              aria-label="Remind me in 3 days"
            >
              Remind me in 3 days
            </button>
          )}

          {/* Renew Now button */}
          <button
            type="button"
            onClick={onRenewClick}
            data-prominent="true"
            className={`px-4 py-2 rounded-md font-medium ${buttonStyles[displayInfo.urgency]}`}
            aria-label="Renew Now"
          >
            {displayInfo.actionLabel}
          </button>

          {/* Dismiss button */}
          <button
            type="button"
            onClick={onDismiss}
            className="p-1 opacity-50 hover:opacity-100"
            aria-label="Dismiss"
          >
            <span aria-hidden="true">×</span>
          </button>
        </div>
      </div>
    </div>
  )
}
