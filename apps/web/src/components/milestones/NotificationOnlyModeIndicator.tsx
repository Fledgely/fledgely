/**
 * NotificationOnlyModeIndicator Component - Story 37.3 Task 4
 *
 * Displays notification-only mode status and settings.
 * AC4: Time limits still enforced if configured
 * AC5: Child sees "You're in notification-only mode - we trust you"
 *
 * Philosophy: Maximum privacy while maintaining parental connection.
 * Represents near-graduation status.
 */

import type { NotificationOnlyConfig, DailySummary } from '@fledgely/shared'

export interface NotificationOnlyModeIndicatorProps {
  /** Current notification-only mode configuration */
  config: NotificationOnlyConfig
  /** Whether this is for child or parent view */
  viewerType: 'child' | 'parent'
  /** Child's name */
  childName: string
  /** Latest daily summary (for parent view) */
  latestSummary?: DailySummary
  /** Qualification progress (0-100) */
  qualificationProgress?: number
  /** Days until qualification (null if qualified, -1 if score too low) */
  daysUntilQualification?: number | null
}

/**
 * Get the main status message.
 * AC5: Child sees "You're in notification-only mode - we trust you"
 */
function getStatusMessage(
  isActive: boolean,
  viewerType: 'child' | 'parent',
  childName: string
): string {
  if (isActive) {
    if (viewerType === 'child') {
      // AC5 exact message
      return "You're in notification-only mode - we trust you"
    }
    return `${childName} is in notification-only mode. Daily summaries will be sent instead of screenshots.`
  }

  if (viewerType === 'child') {
    return 'Standard monitoring is active.'
  }
  return `Standard monitoring is active for ${childName}.`
}

/**
 * Get time limits message.
 * AC4: Time limits still enforced if configured.
 */
function getTimeLimitsMessage(
  isActive: boolean,
  timeLimitsEnforced: boolean,
  viewerType: 'child' | 'parent'
): string | null {
  if (!isActive) return null

  if (timeLimitsEnforced) {
    if (viewerType === 'child') {
      return 'Time limits are still active.'
    }
    return 'Time limits remain enforced.'
  }

  if (viewerType === 'child') {
    return 'Time limits are not active.'
  }
  return 'Time limits are not enforced.'
}

/**
 * Get qualification progress message.
 */
function getQualificationMessage(
  qualificationProgress: number | undefined,
  daysUntilQualification: number | null | undefined,
  viewerType: 'child' | 'parent',
  childName: string
): string | null {
  if (qualificationProgress === undefined) return null

  if (qualificationProgress >= 100) {
    return viewerType === 'child'
      ? 'You qualify for notification-only mode!'
      : `${childName} qualifies for notification-only mode.`
  }

  if (daysUntilQualification === -1) {
    return viewerType === 'child'
      ? 'Reach 95% trust to start qualifying.'
      : `${childName} needs 95% trust to qualify.`
  }

  if (daysUntilQualification !== null && daysUntilQualification !== undefined) {
    return viewerType === 'child'
      ? `${daysUntilQualification} days until you qualify!`
      : `${childName} is ${daysUntilQualification} days from qualifying.`
  }

  return null
}

export function NotificationOnlyModeIndicator({
  config,
  viewerType,
  childName,
  latestSummary,
  qualificationProgress,
  daysUntilQualification,
}: NotificationOnlyModeIndicatorProps) {
  const isActive = config.enabled && config.enabledAt !== null
  const statusMessage = getStatusMessage(isActive, viewerType, childName)
  const timeLimitsMessage = getTimeLimitsMessage(
    isActive,
    config.timeLimitsStillEnforced,
    viewerType
  )
  const qualificationMessage = getQualificationMessage(
    qualificationProgress,
    daysUntilQualification,
    viewerType,
    childName
  )

  const ariaLabel = isActive
    ? `Notification-only mode is active for ${childName}`
    : `Standard monitoring is active for ${childName}`

  return (
    <div
      data-testid="notification-only-indicator"
      data-active={isActive}
      aria-label={ariaLabel}
      className="notification-only-indicator"
    >
      {/* Mode Status Icon */}
      <div data-testid="mode-icon" className="mode-icon" aria-hidden="true">
        {isActive ? '🎓' : '📊'}
      </div>

      {/* Main Status Message */}
      <div data-testid="status-message" className="status-message">
        {statusMessage}
      </div>

      {/* Near-Graduation Badge (when active) */}
      {isActive && (
        <div data-testid="near-graduation-badge" className="near-graduation-badge">
          Near Graduation
        </div>
      )}

      {/* Time Limits Status (AC4) */}
      {timeLimitsMessage && (
        <div data-testid="time-limits-status" className="time-limits-status">
          {timeLimitsMessage}
        </div>
      )}

      {/* Qualification Progress (when not active) */}
      {!isActive && qualificationProgress !== undefined && (
        <div data-testid="qualification-progress" className="qualification-progress">
          <div
            data-testid="progress-bar"
            className="progress-bar"
            role="progressbar"
            aria-valuenow={qualificationProgress}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div className="progress-fill" style={{ width: `${qualificationProgress}%` }} />
          </div>
          {qualificationMessage && (
            <p data-testid="qualification-message" className="qualification-message">
              {qualificationMessage}
            </p>
          )}
        </div>
      )}

      {/* Daily Summary Preview (parent view when active) */}
      {isActive && viewerType === 'parent' && latestSummary && (
        <div data-testid="summary-preview" className="summary-preview">
          <h3>Latest Summary</h3>
          <p data-testid="usage-summary">
            {Math.round(latestSummary.totalUsageMinutes / 60)} hours today
          </p>
          {latestSummary.concerningPatterns.length === 0 ? (
            <p data-testid="no-concerns">No concerning patterns ✓</p>
          ) : (
            <p data-testid="has-concerns">
              {latestSummary.concerningPatterns.length} patterns to review
            </p>
          )}
        </div>
      )}

      {/* Privacy Message (child view when active) */}
      {isActive && viewerType === 'child' && (
        <div data-testid="privacy-message" className="privacy-message">
          <p>Screenshots are paused. You have maximum privacy.</p>
          <p>Daily summaries are shared with your parent instead.</p>
        </div>
      )}

      {/* Daily Summary Toggle (parent view) */}
      {viewerType === 'parent' && (
        <div data-testid="settings-info" className="settings-info">
          <p>Daily summaries: {config.dailySummaryEnabled ? 'Enabled' : 'Disabled'}</p>
        </div>
      )}
    </div>
  )
}
