/**
 * AutomaticReductionNotification Component - Story 37.4 Task 3
 *
 * Notification components for automatic monitoring reduction.
 * AC3: Parent notified: "Your child's demonstrated maturity means reduced monitoring"
 * AC4: Parent cannot override without child agreement
 * AC5: Both parties celebrate: "6 months of trust - monitoring reducing"
 * AC6: Sets expectation of eventual graduation
 *
 * Philosophy: Privacy is a RIGHT - developmental rights must be honored.
 */

import type { AutomaticReductionConfig, OverrideRequest, GraduationPath } from '@fledgely/shared'

export interface AutomaticReductionNotificationProps {
  /** Current reduction configuration */
  config: AutomaticReductionConfig
  /** Override request (if any) */
  overrideRequest?: OverrideRequest
  /** Graduation path (if started) */
  graduationPath?: GraduationPath
  /** Whether this is for child or parent view */
  viewerType: 'child' | 'parent'
  /** Child's name */
  childName: string
  /** Callback when override response is submitted */
  onOverrideResponse?: (agreed: boolean, response?: string) => void
}

/**
 * Get celebration message (AC5).
 */
function getCelebrationMessage(childName: string, viewerType: 'child' | 'parent'): string {
  if (viewerType === 'child') {
    return 'Congratulations! 6 months of trust - your monitoring is now reducing. This recognizes your journey toward independence.'
  }
  return `Celebrating ${childName}'s 6 months of sustained trust! Their monitoring is reducing as recognition of their demonstrated maturity.`
}

/**
 * Get parent notification message (AC3).
 */
function getParentMessage(childName: string): string {
  return `${childName}'s demonstrated maturity means reduced monitoring. This reflects their sustained responsibility over 6 months.`
}

/**
 * Get graduation path message (AC6).
 */
function getGraduationMessage(path: GraduationPath, viewerType: 'child' | 'parent'): string {
  const monthsRemaining = Math.max(
    0,
    Math.ceil((path.expectedGraduationDate.getTime() - Date.now()) / (30 * 24 * 60 * 60 * 1000))
  )

  if (viewerType === 'child') {
    return `You're on the path to full independence! Expected graduation in approximately ${monthsRemaining} months.`
  }
  return `Your child is on the graduation path. Expected full independence in approximately ${monthsRemaining} months.`
}

export function AutomaticReductionNotification({
  config,
  overrideRequest,
  graduationPath,
  viewerType,
  childName,
  onOverrideResponse,
}: AutomaticReductionNotificationProps) {
  const isApplied = config.appliedAt !== null
  const hasOverridePending = overrideRequest?.status === 'pending' && viewerType === 'child'

  const ariaLabel = isApplied
    ? `Automatic reduction notification for ${childName}`
    : `Automatic reduction status for ${childName}`

  return (
    <div
      data-testid="automatic-reduction-notification"
      data-applied={isApplied}
      aria-label={ariaLabel}
      className="automatic-reduction-notification"
    >
      {/* Celebration Banner (when applied - AC5) */}
      {isApplied && (
        <div data-testid="celebration-banner" className="celebration-banner">
          <div data-testid="celebration-icon" className="celebration-icon" aria-hidden="true">
            🎉
          </div>
          <h2 data-testid="celebration-heading" className="celebration-heading">
            6 Months of Trust Achieved!
          </h2>
          <p data-testid="celebration-message" className="celebration-message">
            {getCelebrationMessage(childName, viewerType)}
          </p>
        </div>
      )}

      {/* Parent Notification (AC3) */}
      {isApplied && viewerType === 'parent' && (
        <div data-testid="parent-notification" className="parent-notification">
          <p data-testid="maturity-message">{getParentMessage(childName)}</p>
        </div>
      )}

      {/* Graduation Path (AC6) */}
      {isApplied && graduationPath && (
        <div data-testid="graduation-path" className="graduation-path">
          <h3>Graduation Path</h3>
          <div
            data-testid="graduation-progress"
            className="graduation-progress"
            role="progressbar"
            aria-valuenow={graduationPath.progressPercent}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div
              className="progress-fill"
              style={{ width: `${graduationPath.progressPercent}%` }}
            />
          </div>
          <p data-testid="graduation-message">{getGraduationMessage(graduationPath, viewerType)}</p>
          <div data-testid="graduation-status" className="graduation-status">
            Status: {graduationPath.status}
          </div>
        </div>
      )}

      {/* Override Request (AC4) */}
      {hasOverridePending && overrideRequest && (
        <div data-testid="override-request" className="override-request">
          <h3>Override Request</h3>
          <p data-testid="override-explanation">
            Your parent has requested a temporary change to your automatic reduction. Your agreement
            is required for any changes.
          </p>
          <div data-testid="override-reason" className="override-reason">
            <strong>Reason:</strong> {overrideRequest.reason}
          </div>
          <div data-testid="override-actions" className="override-actions">
            <button
              data-testid="approve-override"
              onClick={() => onOverrideResponse?.(true)}
              className="btn-approve"
            >
              I Agree
            </button>
            <button
              data-testid="reject-override"
              onClick={() => onOverrideResponse?.(false)}
              className="btn-reject"
            >
              I Decline
            </button>
          </div>
          <p data-testid="override-rights-note" className="rights-note">
            This is your right to decide. Your automatic reduction continues unless you agree to the
            change.
          </p>
        </div>
      )}

      {/* Override Approved/Rejected Status */}
      {overrideRequest && overrideRequest.status !== 'pending' && (
        <div data-testid="override-result" className="override-result">
          {overrideRequest.status === 'approved' ? (
            <p>Override was mutually agreed. Automatic reduction is temporarily adjusted.</p>
          ) : overrideRequest.status === 'rejected' ? (
            <p>
              {viewerType === 'child'
                ? 'You declined the override. Your automatic reduction continues.'
                : `${childName} declined the override request. Automatic reduction continues.`}
            </p>
          ) : (
            <p>Override request was withdrawn.</p>
          )}
        </div>
      )}

      {/* Not Yet Applied Status */}
      {!isApplied && (
        <div data-testid="pending-status" className="pending-status">
          <p>
            {viewerType === 'child'
              ? 'Automatic reduction has not yet been applied.'
              : `Automatic reduction has not yet been applied for ${childName}.`}
          </p>
        </div>
      )}

      {/* Privacy Rights Reminder */}
      {viewerType === 'child' && (
        <div data-testid="rights-reminder" className="rights-reminder">
          <p>
            {isApplied
              ? 'Your privacy is being honored as your developmental right.'
              : 'Privacy is your right. As you demonstrate sustained responsibility, monitoring will automatically reduce.'}
          </p>
        </div>
      )}
    </div>
  )
}
