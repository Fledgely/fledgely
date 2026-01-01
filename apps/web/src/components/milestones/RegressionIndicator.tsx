/**
 * RegressionIndicator Component - Story 37.6 Task 4
 *
 * UI component for displaying regression state and facilitating conversation.
 * AC2: Notification: "Let's talk about what happened"
 * AC4: Parent-child discussion encouraged before changes
 * AC5: Child can explain circumstances
 * AC6: Regression framed as "let's work on this" not "you failed"
 */

import { useState } from 'react'
import {
  type RegressionEvent,
  type ViewerType,
  calculateGraceDaysRemaining,
  REGRESSION_MESSAGES,
  getChildRegressionNotification,
  getParentRegressionNotification,
  getGracePeriodReminder,
  getConversationPrompt,
  getSupportiveFraming,
  getGracePeriodExplanation,
  getExplanationAcknowledgment,
  getConversationCompleteMessage,
  getResolutionOptions,
} from '@fledgely/shared'

export interface RegressionIndicatorProps {
  /** The regression event to display */
  regressionEvent: RegressionEvent
  /** Child's name for personalization */
  childName: string
  /** Whether viewing as child or parent */
  viewerType: ViewerType
  /** Callback when child provides explanation */
  onRecordExplanation?: (explanation: string) => void
  /** Callback when parent marks conversation as held */
  onMarkConversationHeld?: () => void
  /** Callback to resolve regression (keep current level) */
  onResolve?: () => void
  /** Callback to revert monitoring */
  onRevert?: () => void
}

export function RegressionIndicator({
  regressionEvent,
  childName,
  viewerType,
  onRecordExplanation,
  onMarkConversationHeld,
  onResolve,
  onRevert,
}: RegressionIndicatorProps) {
  const [explanation, setExplanation] = useState('')
  const [showExplanationForm, setShowExplanationForm] = useState(false)

  const daysRemaining = calculateGraceDaysRemaining(regressionEvent)
  const isGracePeriod = daysRemaining > 0

  // Get notification based on viewer type
  const notification =
    viewerType === 'child'
      ? getChildRegressionNotification(childName)
      : getParentRegressionNotification(childName)

  // Handle explanation submission
  const handleSubmitExplanation = () => {
    if (explanation.trim() && onRecordExplanation) {
      onRecordExplanation(explanation.trim())
      setShowExplanationForm(false)
    }
  }

  const ariaLabel = `Regression indicator for ${childName}`

  return (
    <div
      data-testid="regression-indicator"
      data-status={regressionEvent.status}
      data-viewer={viewerType}
      aria-label={ariaLabel}
      className="regression-indicator"
    >
      {/* Main Notification Header */}
      <div data-testid="notification-header" className="notification-header">
        <h3 data-testid="notification-title">{notification.title}</h3>
        <p data-testid="notification-message">{notification.message}</p>
      </div>

      {/* Grace Period Status */}
      <div data-testid="grace-period-status" className="grace-period-status">
        <div data-testid="grace-period-countdown" className="countdown">
          <span data-testid="days-remaining">{daysRemaining}</span>
          <span className="label">{daysRemaining === 1 ? 'day' : 'days'} remaining</span>
        </div>
        <p data-testid="grace-period-explanation">{getGracePeriodExplanation(viewerType)}</p>
        <p data-testid="grace-period-reminder">
          {getGracePeriodReminder(daysRemaining, viewerType)}
        </p>
      </div>

      {/* Supportive Context */}
      <div data-testid="supportive-context" className="supportive-context">
        <p data-testid="supportive-framing">{getSupportiveFraming(viewerType)}</p>
        <p data-testid="conversation-prompt">{getConversationPrompt(viewerType)}</p>
      </div>

      {/* Key Messages Display */}
      <div data-testid="key-messages" className="key-messages">
        <p data-testid="lets-work-on-this">{REGRESSION_MESSAGES.letWorkOnThis}</p>
        <p data-testid="not-punishment">{REGRESSION_MESSAGES.notPunishment}</p>
        {viewerType === 'child' && (
          <p data-testid="explanation-matters">{REGRESSION_MESSAGES.yourExplanationMatters}</p>
        )}
      </div>

      {/* Child Explanation Section */}
      {viewerType === 'child' && (
        <div data-testid="child-explanation-section" className="explanation-section">
          {regressionEvent.childExplanation ? (
            <div data-testid="explanation-submitted">
              <p>{getExplanationAcknowledgment('child')}</p>
              <blockquote data-testid="submitted-explanation">
                {regressionEvent.childExplanation}
              </blockquote>
            </div>
          ) : showExplanationForm ? (
            <div data-testid="explanation-form" className="explanation-form">
              <label htmlFor="explanation-input">Share what happened (optional but helps):</label>
              <textarea
                id="explanation-input"
                data-testid="explanation-input"
                value={explanation}
                onChange={(e) => setExplanation(e.target.value)}
                placeholder="Tell us what was going on..."
                maxLength={2000}
                rows={4}
              />
              <div className="form-actions">
                <button
                  data-testid="submit-explanation"
                  onClick={handleSubmitExplanation}
                  disabled={!explanation.trim()}
                >
                  Share Explanation
                </button>
                <button
                  data-testid="cancel-explanation"
                  onClick={() => setShowExplanationForm(false)}
                >
                  Not Now
                </button>
              </div>
            </div>
          ) : (
            <button
              data-testid="show-explanation-form"
              onClick={() => setShowExplanationForm(true)}
            >
              {notification.callToAction}
            </button>
          )}
        </div>
      )}

      {/* Parent Explanation View */}
      {viewerType === 'parent' && regressionEvent.childExplanation && (
        <div data-testid="child-explanation-view" className="child-explanation-view">
          <h4>Child&apos;s Explanation</h4>
          <p data-testid="explanation-intro">{getExplanationAcknowledgment('parent')}</p>
          <blockquote data-testid="child-explanation-text">
            {regressionEvent.childExplanation}
          </blockquote>
        </div>
      )}

      {/* Parent Conversation Section */}
      {viewerType === 'parent' && (
        <div data-testid="parent-actions-section" className="parent-actions">
          {!regressionEvent.conversationHeld ? (
            <div data-testid="conversation-prompt-section">
              <p>{notification.supportiveContext}</p>
              <button data-testid="mark-conversation-held" onClick={onMarkConversationHeld}>
                {notification.callToAction}
              </button>
            </div>
          ) : (
            <div data-testid="conversation-held-section">
              <p data-testid="conversation-complete-message">
                {getConversationCompleteMessage('parent')}
              </p>
              {regressionEvent.conversationHeldAt && (
                <p data-testid="conversation-date">
                  Conversation held: {regressionEvent.conversationHeldAt.toLocaleDateString()}
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Resolution Options (Parent only, after conversation) */}
      {viewerType === 'parent' && regressionEvent.conversationHeld && !isGracePeriod && (
        <div data-testid="resolution-options" className="resolution-options">
          <h4>Next Steps</h4>
          <div className="options">
            <div data-testid="resolve-option" className="option">
              <p>{getResolutionOptions('parent').resolveMessage}</p>
              <button data-testid="resolve-button" onClick={onResolve}>
                Keep Current Level
              </button>
            </div>
            <div data-testid="revert-option" className="option">
              <p>{getResolutionOptions('parent').revertMessage}</p>
              <button data-testid="revert-button" onClick={onRevert}>
                Adjust Monitoring
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Child Resolution View */}
      {viewerType === 'child' && regressionEvent.conversationHeld && (
        <div data-testid="child-conversation-held" className="conversation-held">
          <p>{getConversationCompleteMessage('child')}</p>
        </div>
      )}

      {/* Status Badge */}
      <div data-testid="status-badge" className="status-badge">
        <span data-testid="regression-status">{regressionEvent.status}</span>
        {regressionEvent.conversationHeld && (
          <span data-testid="conversation-badge" className="badge">
            Conversation Held
          </span>
        )}
        {regressionEvent.childExplanation && (
          <span data-testid="explanation-badge" className="badge">
            Explanation Provided
          </span>
        )}
      </div>
    </div>
  )
}
