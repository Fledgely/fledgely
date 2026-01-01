/**
 * Graduation Progress Indicator Component - Story 38.1 Task 4
 *
 * Visual component showing graduation progress.
 * AC2: Progress visible to child
 * AC3: Child sees clear path to end
 * AC4: Parent sees same progress
 */

import React from 'react'
import {
  GraduationEligibilityStatus,
  getGraduationMilestones,
  GraduationMilestone,
} from '@fledgely/shared'
import { ViewerType } from '@fledgely/shared'
import {
  getChildProgressMessage,
  getParentProgressMessage,
  getMotivationalMessage,
  formatProgressDisplay,
} from '@fledgely/shared'

export interface GraduationProgressIndicatorProps {
  eligibilityStatus: GraduationEligibilityStatus
  childName: string
  viewerType: ViewerType
  onLearnMore?: () => void
}

/**
 * Graduation Progress Indicator
 *
 * Shows visual progress bar with milestone markers and messaging.
 */
export function GraduationProgressIndicator({
  eligibilityStatus,
  childName,
  viewerType,
  onLearnMore,
}: GraduationProgressIndicatorProps) {
  const progressMessage =
    viewerType === 'child'
      ? getChildProgressMessage(eligibilityStatus)
      : getParentProgressMessage(eligibilityStatus, childName)

  const motivationalMessage = getMotivationalMessage(eligibilityStatus, viewerType)
  const milestones = getGraduationMilestones(eligibilityStatus.monthsAtPerfectTrust)
  const display = formatProgressDisplay(eligibilityStatus)

  return (
    <div data-testid="graduation-progress-indicator" className="graduation-progress-indicator">
      {/* Header */}
      <div className="graduation-header" data-testid="graduation-header">
        <h3>
          {viewerType === 'child' ? 'Your Path to Graduation' : `${childName}'s Graduation Path`}
        </h3>
        {eligibilityStatus.isEligible && (
          <span className="eligible-badge" data-testid="eligible-badge">
            Eligible!
          </span>
        )}
      </div>

      {/* Progress bar */}
      <div className="progress-container" data-testid="progress-container">
        <div
          className="progress-bar"
          data-testid="progress-bar"
          style={{ width: `${eligibilityStatus.progressPercentage}%` }}
          role="progressbar"
          aria-valuenow={eligibilityStatus.progressPercentage}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Graduation progress: ${display.percentage}`}
        />
        {/* Milestone markers */}
        <div className="milestone-markers" data-testid="milestone-markers">
          {milestones.map((milestone) => (
            <MilestoneMarker key={milestone.month} milestone={milestone} />
          ))}
        </div>
      </div>

      {/* Progress text */}
      <div className="progress-text" data-testid="progress-text">
        <span className="months" data-testid="months-display">
          {display.months}
        </span>
        <span className="remaining" data-testid="remaining-display">
          {display.remaining}
        </span>
      </div>

      {/* Progress message */}
      <p className="progress-message" data-testid="progress-message">
        {progressMessage}
      </p>

      {/* Motivational message */}
      <p className="motivational-message" data-testid="motivational-message">
        {motivationalMessage}
      </p>

      {/* Learn more link */}
      {onLearnMore && (
        <button
          className="learn-more-button"
          data-testid="learn-more-button"
          onClick={onLearnMore}
          type="button"
        >
          Learn about graduation
        </button>
      )}
    </div>
  )
}

interface MilestoneMarkerProps {
  milestone: GraduationMilestone
}

function MilestoneMarker({ milestone }: MilestoneMarkerProps) {
  const position = (milestone.month / 12) * 100

  return (
    <div
      className={`milestone-marker ${milestone.reached ? 'reached' : ''}`}
      data-testid={`milestone-marker-${milestone.month}`}
      style={{ left: `${position}%` }}
      title={milestone.celebrationMessage || milestone.label}
    >
      <span className="milestone-label">{milestone.month}m</span>
      {milestone.reached && (
        <span className="milestone-check" data-testid={`milestone-check-${milestone.month}`}>
          ✓
        </span>
      )}
    </div>
  )
}

export default GraduationProgressIndicator
