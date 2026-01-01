/**
 * MilestoneProgress Component - Story 37.1 Task 4
 *
 * Visual progress indicator showing days toward milestones.
 * AC1: Shows milestones at 80, 90, 95
 * AC2: Duration requirement of 30+ days
 * AC4: Uses developmental framing language
 *
 * Philosophy: Privacy is a RIGHT - milestones recognize maturity, not reward behavior.
 */

import type { TrustMilestoneLevel } from '@fledgely/shared'
import { MILESTONE_THRESHOLDS, MILESTONE_DURATION_DAYS } from '@fledgely/shared'

export interface MilestoneProgressProps {
  /** Current trust score */
  currentScore: number
  /** Number of consecutive days at current threshold */
  consecutiveDays: number
  /** Currently achieved milestone (null if none) */
  currentMilestone: TrustMilestoneLevel | null
}

/** Milestone display information */
interface MilestoneInfo {
  level: TrustMilestoneLevel
  threshold: number
  name: string
}

const MILESTONES: MilestoneInfo[] = [
  { level: 'growing', threshold: MILESTONE_THRESHOLDS.growing, name: 'Growing' },
  { level: 'maturing', threshold: MILESTONE_THRESHOLDS.maturing, name: 'Maturing' },
  {
    level: 'ready-for-independence',
    threshold: MILESTONE_THRESHOLDS['ready-for-independence'],
    name: 'Ready for Independence',
  },
]

/**
 * Get the next milestone after the current one.
 */
function getNextMilestone(current: TrustMilestoneLevel | null): MilestoneInfo | null {
  if (current === null) {
    return MILESTONES[0]
  }
  const currentIndex = MILESTONES.findIndex((m) => m.level === current)
  if (currentIndex === -1 || currentIndex === MILESTONES.length - 1) {
    return null
  }
  return MILESTONES[currentIndex + 1]
}

/**
 * Get the lowest threshold the score qualifies for.
 */
function getLowestThresholdMet(score: number): number {
  for (const milestone of MILESTONES) {
    if (score >= milestone.threshold) {
      return milestone.threshold
    }
  }
  return MILESTONE_THRESHOLDS.growing
}

export function MilestoneProgress({
  currentScore,
  consecutiveDays,
  currentMilestone,
}: MilestoneProgressProps) {
  const nextMilestone = getNextMilestone(currentMilestone)
  const daysToShow = Math.min(consecutiveDays, MILESTONE_DURATION_DAYS)
  const daysRemaining = Math.max(0, MILESTONE_DURATION_DAYS - consecutiveDays)
  const lowestThreshold = getLowestThresholdMet(currentScore)
  const isAboveThreshold = currentScore >= lowestThreshold

  return (
    <div data-testid="milestone-progress" className="milestone-progress">
      <h3 className="progress-heading">Your Growth Journey</h3>

      <div
        data-testid="current-score"
        data-above-threshold={isAboveThreshold ? 'true' : 'false'}
        className="current-score"
      >
        Current Score: {currentScore}
      </div>

      <div className="days-section">
        <div data-testid="days-progress" className="days-progress">
          {daysToShow} / {MILESTONE_DURATION_DAYS} days
        </div>
        <div data-testid="days-remaining" className="days-remaining">
          {daysRemaining} days remaining
        </div>
      </div>

      <div
        data-testid="progress-bar"
        role="progressbar"
        aria-valuenow={daysToShow}
        aria-valuemin={0}
        aria-valuemax={MILESTONE_DURATION_DAYS}
        aria-label="Progress toward milestone"
        className="progress-bar"
        style={{ width: `${(daysToShow / MILESTONE_DURATION_DAYS) * 100}%` }}
      />

      <div className="milestones-list">
        {MILESTONES.map((milestone) => {
          const isAchieved =
            currentMilestone !== null &&
            MILESTONES.findIndex((m) => m.level === currentMilestone) >=
              MILESTONES.findIndex((m) => m.level === milestone.level)

          return (
            <div
              key={milestone.level}
              data-testid={`milestone-${milestone.level}`}
              data-achieved={isAchieved ? 'true' : 'false'}
              className={`milestone-item ${isAchieved ? 'achieved' : ''}`}
            >
              <span className="milestone-name">{milestone.name}</span>
              <span className="milestone-threshold">{milestone.threshold}+</span>
            </div>
          )
        })}
      </div>

      {nextMilestone && (
        <div data-testid="next-milestone" className="next-milestone">
          Next milestone: {nextMilestone.name}
        </div>
      )}
    </div>
  )
}
