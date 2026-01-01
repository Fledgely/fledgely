/**
 * CooldownNotice Component - Story 34.5
 *
 * Displays 7-day cooldown notice when a similar proposal was recently declined.
 * AC4: 7-day cooldown for same change
 */

export interface CooldownNoticeProps {
  /** Number of days until cooldown expires */
  daysRemaining: number
  /** Date when cooldown ends */
  cooldownEndDate: Date
  /** ID of the declined proposal that triggered cooldown */
  declinedProposalId: string
  /** Compact mode for inline display */
  compact?: boolean
}

/**
 * Displays an informative notice about proposal cooldown period.
 */
export function CooldownNotice({
  daysRemaining,
  cooldownEndDate,
  compact = false,
}: CooldownNoticeProps) {
  const dayWord = daysRemaining === 1 ? 'day' : 'days'

  const formattedDate = cooldownEndDate.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })

  if (compact) {
    return (
      <div role="alert" className="bg-amber-50 border border-amber-200 rounded-lg p-2 text-sm">
        <div className="flex items-center gap-2">
          <span className="text-amber-600">⏳</span>
          <span className="text-amber-800">
            Cooldown: <strong>{daysRemaining}</strong> {dayWord} remaining
          </span>
        </div>
      </div>
    )
  }

  return (
    <div role="alert" className="bg-amber-50 border border-amber-200 rounded-lg p-4 space-y-2">
      {/* Header */}
      <div className="flex items-center gap-2">
        <span className="text-xl">⏳</span>
        <h3 className="text-amber-900 font-semibold">Cooldown Period Active</h3>
      </div>

      {/* Explanation */}
      <p className="text-amber-800 text-sm">
        A similar change was declined recently. You can propose again after the cooldown period.
      </p>

      {/* Countdown */}
      <div className="bg-amber-100 rounded-lg p-3 text-center">
        <p className="text-amber-900">
          <span className="text-2xl font-bold">{daysRemaining}</span>{' '}
          <span className="text-lg">{dayWord} remaining</span>
        </p>
        <p className="text-amber-700 text-sm mt-1">You can propose again on {formattedDate}</p>
      </div>

      {/* Encouragement */}
      <p className="text-amber-700 text-xs text-center">
        Use this time to discuss the change together before proposing again.
      </p>
    </div>
  )
}
