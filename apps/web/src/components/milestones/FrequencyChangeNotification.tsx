/**
 * FrequencyChangeNotification Component - Story 37.2 Task 3
 *
 * Displays celebratory notification for frequency changes.
 * AC5: Child notified of frequency reduction with celebratory message
 *
 * Philosophy: Privacy grows naturally with demonstrated maturity.
 */

import type { TrustMilestoneLevel } from '@fledgely/shared'

export interface FrequencyChangeNotificationProps {
  /** The milestone level that triggered this change */
  milestoneLevel: TrustMilestoneLevel
  /** Previous screenshot frequency in minutes */
  previousFrequency: number
  /** New screenshot frequency in minutes */
  newFrequency: number
  /** Whether this is for child or parent view */
  viewerType: 'child' | 'parent'
  /** Child's name (used in parent view) */
  childName: string
}

/** Milestone display names */
const MILESTONE_NAMES: Record<TrustMilestoneLevel, string> = {
  growing: 'Growing',
  maturing: 'Maturing',
  'ready-for-independence': 'Ready for Independence',
}

/**
 * Get the celebratory message based on viewer type and milestone.
 * Uses developmental language - recognition, not reward.
 */
function getMessage(
  milestoneLevel: TrustMilestoneLevel,
  viewerType: 'child' | 'parent',
  childName: string,
  newFrequency: number
): string {
  if (viewerType === 'child') {
    switch (milestoneLevel) {
      case 'growing':
        return `We're recognizing your growth! Your screenshots will now be taken less frequently.`
      case 'maturing':
        return `Your continued growth is being recognized! You now have even more privacy.`
      case 'ready-for-independence':
        return `We're celebrating your journey toward independence! You now have the highest level of privacy.`
    }
  }

  // Parent view
  switch (milestoneLevel) {
    case 'growing':
      return `${childName} has reached the Growing milestone. Screenshot frequency is now every ${newFrequency} minutes.`
    case 'maturing':
      return `${childName} has reached the Maturing milestone. Screenshot frequency is now every ${newFrequency} minutes.`
    case 'ready-for-independence':
      return `${childName} has reached the Ready for Independence milestone. Screenshots will now be taken hourly.`
  }
}

export function FrequencyChangeNotification({
  milestoneLevel,
  previousFrequency,
  newFrequency,
  viewerType,
  childName,
}: FrequencyChangeNotificationProps) {
  const milestoneName = MILESTONE_NAMES[milestoneLevel]
  const message = getMessage(milestoneLevel, viewerType, childName, newFrequency)

  return (
    <div
      data-testid="frequency-notification"
      data-celebratory="true"
      role="alert"
      className="frequency-notification"
    >
      <div data-testid="celebration-icon" className="celebration-icon" aria-hidden="true">
        🎉
      </div>

      <h2 className="notification-heading">Privacy Recognition!</h2>

      <p className="notification-message">{message}</p>

      <div data-testid="milestone-level" className="milestone-level">
        {milestoneName} Milestone
      </div>

      <div data-testid="frequency-comparison" className="frequency-comparison">
        <div className="frequency-change">
          <span data-testid="previous-frequency" className="previous-frequency">
            {previousFrequency} min
          </span>
          <span className="arrow">→</span>
          <span data-testid="new-frequency" className="new-frequency">
            {newFrequency} min
          </span>
        </div>
        <p className="frequency-explanation">
          {viewerType === 'child'
            ? 'Fewer screenshots - your privacy is growing with you!'
            : `Reduced monitoring frequency reflects ${childName}'s demonstrated responsibility.`}
        </p>
      </div>
    </div>
  )
}
