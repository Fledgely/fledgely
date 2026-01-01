/**
 * RenewalReminderCard Component - Story 35.2
 *
 * Card component for displaying renewal reminders with countdown.
 * AC1, AC2, AC3: Different reminder thresholds with urgency styling
 * AC4: Parent and child variants
 * AC5: "Renew Now" action button
 * AC6: Snooze option
 */

import { getReminderType } from '@fledgely/shared'
import { getReminderDisplayInfo, canSnoozeReminder } from '../../services/renewalReminderService'

export interface RenewalReminderCardProps {
  /** Agreement expiry date */
  expiryDate: Date | null
  /** Callback when renew action is clicked */
  onRenewClick: () => void
  /** Callback when snooze is clicked */
  onSnoozeClick: () => void
  /** Display variant */
  variant?: 'parent' | 'child'
}

/**
 * Card component for displaying renewal reminders with countdown.
 */
export function RenewalReminderCard({
  expiryDate,
  onRenewClick,
  onSnoozeClick,
  variant = 'parent',
}: RenewalReminderCardProps) {
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

  // Calculate days remaining
  const now = new Date()
  const daysRemaining = expiryDate
    ? Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    : 0

  // Format expiry date
  const formattedExpiryDate = expiryDate
    ? expiryDate.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : ''

  // Urgency-based styling classes
  const urgencyStyles: Record<string, string> = {
    info: 'border-blue-200 bg-blue-50',
    warning: 'border-yellow-200 bg-yellow-50',
    critical: 'border-red-200 bg-red-50',
  }

  const textStyles: Record<string, string> = {
    info: 'text-blue-800',
    warning: 'text-yellow-800',
    critical: 'text-red-800',
  }

  const buttonStyles: Record<string, string> = {
    info: 'bg-blue-600 hover:bg-blue-700 text-white',
    warning: 'bg-yellow-600 hover:bg-yellow-700 text-white',
    critical: 'bg-red-600 hover:bg-red-700 text-white',
  }

  const countdownStyles: Record<string, string> = {
    info: 'text-blue-600',
    warning: 'text-yellow-600',
    critical: 'text-red-600',
  }

  const cardTitle = variant === 'child' ? 'Time to Renew!' : 'Renewal Reminder'

  return (
    <section
      aria-label="Renewal Reminder"
      data-testid="renewal-reminder-card"
      data-urgency={displayInfo.urgency}
      className={`rounded-lg border-2 p-6 ${urgencyStyles[displayInfo.urgency]}`}
    >
      {/* Header */}
      <div className="mb-4 flex items-start justify-between">
        <h3 className={`text-lg font-semibold ${textStyles[displayInfo.urgency]}`}>{cardTitle}</h3>
        <span className={`text-sm ${textStyles[displayInfo.urgency]} opacity-75`}>
          Expires: {formattedExpiryDate}
        </span>
      </div>

      {/* Countdown */}
      <div data-testid="days-countdown" className="mb-4 flex items-baseline gap-2">
        <span className={`text-4xl font-bold ${countdownStyles[displayInfo.urgency]}`}>
          {daysRemaining}
        </span>
        <span className={`text-lg ${textStyles[displayInfo.urgency]}`}>
          {daysRemaining === 1 ? 'day left' : 'days left'}
        </span>
      </div>

      {/* Message */}
      <p className={`mb-6 ${textStyles[displayInfo.urgency]}`}>{displayInfo.message}</p>

      {/* Actions */}
      <div className="flex items-center gap-4">
        {/* Renew Now button */}
        <button
          type="button"
          onClick={onRenewClick}
          data-prominent="true"
          className={`px-6 py-2 rounded-md font-medium ${buttonStyles[displayInfo.urgency]}`}
          aria-label="Renew Now"
        >
          {displayInfo.actionLabel}
        </button>

        {/* Snooze link */}
        {showSnooze && (
          <button
            type="button"
            onClick={onSnoozeClick}
            className={`text-sm underline ${textStyles[displayInfo.urgency]} opacity-75 hover:opacity-100`}
            aria-label="Remind me later"
          >
            Remind me later
          </button>
        )}
      </div>
    </section>
  )
}
