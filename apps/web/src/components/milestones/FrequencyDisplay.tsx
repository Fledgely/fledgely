/**
 * FrequencyDisplay Component - Story 37.2 Task 4
 *
 * Displays current screenshot frequency setting.
 * AC6: Parent dashboard reflects current frequency setting
 *
 * Philosophy: Privacy grows naturally with demonstrated maturity.
 */

import type { TrustMilestoneLevel } from '@fledgely/shared'
import { DEFAULT_FREQUENCY_MINUTES } from '@fledgely/shared'

export interface FrequencyDisplayProps {
  /** Current screenshot frequency in minutes */
  frequencyMinutes: number
  /** Current milestone level (null if none) */
  milestoneLevel: TrustMilestoneLevel | null
  /** Whether this is for child or parent view */
  viewerType: 'child' | 'parent'
  /** Child's name */
  childName: string
}

/** Milestone display names */
const MILESTONE_NAMES: Record<TrustMilestoneLevel, string> = {
  growing: 'Growing',
  maturing: 'Maturing',
  'ready-for-independence': 'Ready for Independence',
}

/**
 * Get friendly frequency text.
 */
function getFrequencyText(minutes: number): string {
  if (minutes >= 60) {
    const hours = minutes / 60
    return hours === 1 ? 'once per hour' : `every ${hours} hours`
  }
  return `every ${minutes} minutes`
}

/**
 * Get reduction multiplier compared to default.
 */
function getReductionMultiplier(frequencyMinutes: number): number {
  return frequencyMinutes / DEFAULT_FREQUENCY_MINUTES
}

/**
 * Get child-friendly explanation based on milestone.
 */
function getChildExplanation(
  milestoneLevel: TrustMilestoneLevel | null,
  frequencyMinutes: number
): string {
  if (milestoneLevel === null) {
    return `Screenshots are taken ${getFrequencyText(frequencyMinutes)}. As you show consistent responsibility, this will decrease!`
  }

  switch (milestoneLevel) {
    case 'growing':
      return `We recognize your growth! Screenshots are now taken ${getFrequencyText(frequencyMinutes)}.`
    case 'maturing':
      return `Your maturing responsibility is recognized! Screenshots are now taken ${getFrequencyText(frequencyMinutes)}.`
    case 'ready-for-independence':
      return `You've shown remarkable growth! Screenshots are now taken ${getFrequencyText(frequencyMinutes)}, recognizing your independence.`
  }
}

export function FrequencyDisplay({
  frequencyMinutes,
  milestoneLevel,
  viewerType,
  childName,
}: FrequencyDisplayProps) {
  const milestoneName = milestoneLevel ? MILESTONE_NAMES[milestoneLevel] : 'Default'
  const reductionMultiplier = getReductionMultiplier(frequencyMinutes)
  const ariaLabel = `Screenshot frequency for ${childName}: ${getFrequencyText(frequencyMinutes)}`

  return (
    <div data-testid="frequency-display" aria-label={ariaLabel} className="frequency-display">
      <div data-testid="frequency-label" className="frequency-label">
        {viewerType === 'parent'
          ? `${childName}'s Screenshot Frequency`
          : 'Your Screenshot Frequency'}
      </div>

      <div data-testid="current-frequency" className="current-frequency">
        {frequencyMinutes >= 60 ? 'Hourly' : `${frequencyMinutes} minutes`}
      </div>

      <div data-testid="milestone-connection" className="milestone-connection">
        {milestoneLevel ? `${milestoneName} Milestone` : 'Standard frequency'}
      </div>

      <div data-testid="frequency-indicator" className="frequency-indicator">
        {reductionMultiplier > 1
          ? `${reductionMultiplier}x less frequent than default`
          : 'Default frequency'}
      </div>

      <div data-testid="frequency-explanation" className="frequency-explanation">
        {viewerType === 'child'
          ? getChildExplanation(milestoneLevel, frequencyMinutes)
          : `${childName}'s screenshot frequency reflects their demonstrated responsibility through the ${milestoneName} milestone.`}
      </div>
    </div>
  )
}
