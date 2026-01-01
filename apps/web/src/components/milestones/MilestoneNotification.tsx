/**
 * MilestoneNotification Component - Story 37.1 Task 3
 *
 * Displays milestone achievement notifications.
 * AC3: Milestone notifications sent to both parties
 * AC4: Language: "Recognizing your growth" not "You've earned"
 *
 * Philosophy: Privacy is a RIGHT - milestones recognize maturity, not reward behavior.
 */

import type { TrustMilestoneLevel } from '@fledgely/shared'

export interface MilestoneNotificationProps {
  /** The milestone level achieved */
  milestoneLevel: TrustMilestoneLevel
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

/** Milestone benefits for each level */
const MILESTONE_BENEFITS: Record<TrustMilestoneLevel, string[]> = {
  growing: [
    'Reduced screenshot frequency (every 15 minutes instead of every 5)',
    'Recognition of your consistent responsibility',
  ],
  maturing: [
    'Further reduced screenshot frequency (every 30 minutes)',
    'Simplified daily summaries',
    'Recognition of your growing independence',
  ],
  'ready-for-independence': [
    'Notification-only mode available',
    'Hourly or less frequent screenshots',
    'Near-graduation status',
    'Maximum privacy within family agreement',
  ],
}

/**
 * Get the recognition message based on viewer type.
 * Uses developmental language - recognition, not reward.
 */
function getRecognitionMessage(
  _milestoneLevel: TrustMilestoneLevel,
  viewerType: 'child' | 'parent',
  childName: string
): string {
  if (viewerType === 'child') {
    return `We're recognizing your growth! You've reached a new milestone in your journey.`
  }
  return `${childName} is showing consistent growth and has reached a new milestone!`
}

export function MilestoneNotification({
  milestoneLevel,
  viewerType,
  childName,
}: MilestoneNotificationProps) {
  const milestoneName = MILESTONE_NAMES[milestoneLevel]
  const benefits = MILESTONE_BENEFITS[milestoneLevel]
  const message = getRecognitionMessage(milestoneLevel, viewerType, childName)

  return (
    <div
      data-testid="milestone-notification"
      data-celebratory="true"
      role="alert"
      className="milestone-notification"
    >
      <div data-testid="celebration-icon" className="celebration-icon" aria-hidden="true">
        🌟
      </div>

      <h2 className="milestone-heading">Milestone Achieved!</h2>

      <p className="milestone-message">{message}</p>

      <div data-testid="milestone-level" className="milestone-level">
        {milestoneName}
      </div>

      <ul data-testid="milestone-benefits" className="milestone-benefits">
        {benefits.map((benefit, index) => (
          <li key={index}>{benefit}</li>
        ))}
      </ul>
    </div>
  )
}
