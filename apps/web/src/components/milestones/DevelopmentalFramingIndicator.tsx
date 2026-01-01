/**
 * DevelopmentalFramingIndicator Component - Story 37.5 Task 3
 *
 * UI component for displaying rights-based developmental messaging.
 * AC1: Language uses "recognition" not "reward"
 * AC2: Examples: "Recognizing your maturity" not "You've earned privacy"
 * AC5: Helps children understand their developmental rights
 * AC6: Reduces shame around monitoring
 *
 * Philosophy: Privacy is a RIGHT - not earned, but inherent.
 */

import {
  getPrivacyRightsReminder,
  getTemporaryNatureMessage,
  getGrowthRecognitionMessage,
  getShameReducingContext,
  getDevelopmentalRegressionMessage as getRegressionMessage,
  type MilestoneType,
  type ViewerType,
  getTrustMilestoneNotification,
  getFullReductionNotification,
} from '@fledgely/shared'

export type FramingContext = 'milestone' | 'reduction' | 'regression' | 'rights' | 'info'

export type ReductionType = 'screenshotFrequency' | 'notificationOnly' | 'automaticReduction'

export interface DevelopmentalFramingIndicatorProps {
  /** Context for the message display */
  context: FramingContext
  /** Milestone type (when context is 'milestone') */
  milestone?: MilestoneType
  /** Reduction type (when context is 'reduction') */
  reductionType?: ReductionType
  /** Child's name */
  childName: string
  /** Whether this is for child or parent view */
  viewerType: ViewerType
  /** Show shame-reducing context (child view only) */
  showShameContext?: boolean
}

/**
 * Get context-appropriate message.
 */
function getContextMessage(
  context: FramingContext,
  milestone: MilestoneType | undefined,
  reductionType: ReductionType | undefined,
  childName: string,
  viewerType: ViewerType
): { heading: string; message: string } {
  switch (context) {
    case 'milestone':
      if (milestone) {
        const notification = getTrustMilestoneNotification(milestone, childName, viewerType)
        return { heading: notification.heading, message: notification.message }
      }
      return { heading: 'Development', message: 'Growth is being recognized.' }

    case 'reduction':
      if (reductionType) {
        const notification = getFullReductionNotification(reductionType, childName, viewerType)
        return { heading: notification.title, message: notification.message }
      }
      return { heading: 'Monitoring Reducing', message: 'Your monitoring is reducing.' }

    case 'regression':
      return {
        heading: "Let's Talk",
        message: getRegressionMessage('initial', childName, viewerType),
      }

    case 'rights':
      return {
        heading: 'Your Rights',
        message: getPrivacyRightsReminder(viewerType),
      }

    case 'info':
    default:
      return {
        heading: 'About Monitoring',
        message: getTemporaryNatureMessage(viewerType),
      }
  }
}

export function DevelopmentalFramingIndicator({
  context,
  milestone,
  reductionType,
  childName,
  viewerType,
  showShameContext = false,
}: DevelopmentalFramingIndicatorProps) {
  const { heading, message } = getContextMessage(
    context,
    milestone,
    reductionType,
    childName,
    viewerType
  )

  const ariaLabel = `Developmental framing indicator for ${childName}`

  return (
    <div
      data-testid="developmental-framing-indicator"
      data-context={context}
      data-viewer={viewerType}
      aria-label={ariaLabel}
      className="developmental-framing-indicator"
    >
      {/* Main Message */}
      <div data-testid="framing-content" className="framing-content">
        <h3 data-testid="framing-heading" className="framing-heading">
          {heading}
        </h3>
        <p data-testid="framing-message" className="framing-message">
          {message}
        </p>
      </div>

      {/* Rights Emphasis (Child View) */}
      {viewerType === 'child' && (
        <div data-testid="rights-emphasis" className="rights-emphasis">
          <p data-testid="growth-recognition-message">{getGrowthRecognitionMessage('child')}</p>
        </div>
      )}

      {/* Shame-Reducing Context (Optional, Child View Only) */}
      {showShameContext && viewerType === 'child' && (
        <div data-testid="shame-reducing-context" className="shame-reducing-context">
          <h4>Understanding Monitoring</h4>
          {getShameReducingContext('child').map((msg, index) => (
            <p key={index} data-testid={`shame-context-${index}`}>
              {msg}
            </p>
          ))}
        </div>
      )}

      {/* Parent Education Context */}
      {viewerType === 'parent' && context !== 'regression' && (
        <div data-testid="parent-context" className="parent-context">
          <p data-testid="developmental-approach-note">
            This uses developmental framing - recognizing growth, not rewarding behavior.
          </p>
        </div>
      )}

      {/* Regression-Specific Content */}
      {context === 'regression' && (
        <div data-testid="regression-context" className="regression-context">
          <p data-testid="grace-period-message">
            {getRegressionMessage('gracePeriod', childName, viewerType)}
          </p>
          <p data-testid="support-message">
            {getRegressionMessage('support', childName, viewerType)}
          </p>
        </div>
      )}

      {/* Milestone-Specific Badge */}
      {context === 'milestone' && milestone && (
        <div data-testid="milestone-badge" className="milestone-badge">
          <span data-testid="milestone-type">{milestone}</span>
        </div>
      )}

      {/* Privacy Rights Reminder */}
      {viewerType === 'child' && (
        <div data-testid="privacy-reminder" className="privacy-reminder">
          <small>{getTemporaryNatureMessage('child')}</small>
        </div>
      )}
    </div>
  )
}
