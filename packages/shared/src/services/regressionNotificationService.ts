/**
 * Regression Notification Service - Story 37.6 Task 3
 *
 * Service for generating supportive regression notifications.
 * Key principles:
 * - "Let's talk about what happened" (AC2)
 * - Framed as "let's work on this" not "you failed" (AC6)
 * - Never punitive language
 */

import {
  RegressionNotification,
  REGRESSION_MESSAGES,
  RegressionEvent,
  calculateGraceDaysRemaining,
} from '../contracts/trustRegression'
import { ViewerType } from '../contracts/developmentalMessaging'

/**
 * Get "Let's talk" notification for child.
 * AC2: Notification says "Let's talk about what happened"
 */
export function getChildRegressionNotification(_childName: string): RegressionNotification {
  return {
    title: REGRESSION_MESSAGES.childTitle, // "Let's Talk"
    message: REGRESSION_MESSAGES.childMessage,
    supportiveContext: REGRESSION_MESSAGES.childSupportive,
    callToAction: REGRESSION_MESSAGES.childCallToAction,
    viewerType: 'child',
  }
}

/**
 * Get notification for parent.
 */
export function getParentRegressionNotification(childName: string): RegressionNotification {
  const message = REGRESSION_MESSAGES.parentMessage.replace("Your child's", `${childName}'s`)

  return {
    title: REGRESSION_MESSAGES.parentTitle,
    message,
    supportiveContext: REGRESSION_MESSAGES.parentSupportive,
    callToAction: REGRESSION_MESSAGES.parentCallToAction,
    viewerType: 'parent',
  }
}

/**
 * Get complete regression notification based on event and viewer.
 */
export function getRegressionNotification(
  event: RegressionEvent,
  childName: string,
  viewerType: ViewerType
): RegressionNotification {
  const base =
    viewerType === 'child'
      ? getChildRegressionNotification(childName)
      : getParentRegressionNotification(childName)

  return {
    ...base,
    eventId: event.id,
    graceDaysRemaining: calculateGraceDaysRemaining(event),
  }
}

/**
 * Get grace period reminder message.
 */
export function getGracePeriodReminder(daysRemaining: number, viewerType: ViewerType): string {
  if (daysRemaining === 0) {
    return viewerType === 'child'
      ? "The grace period has ended. It's time for a conversation about what happened and how to move forward together."
      : 'The grace period has ended. Please have a conversation with your child about what happened before any monitoring changes are made.'
  }

  if (daysRemaining === 1) {
    return viewerType === 'child'
      ? "There's 1 day left in the grace period. Nothing changes during this time - it's about having a supportive conversation."
      : "There's 1 day remaining in the grace period. This is a good time to have a supportive conversation with your child."
  }

  return viewerType === 'child'
    ? `There are ${daysRemaining} days left in the grace period. Monitoring stays the same while we have time to talk.`
    : `There are ${daysRemaining} days remaining in the grace period. Use this time for a supportive conversation before any decisions are made.`
}

/**
 * Get conversation prompt message.
 * AC4: Parent-child discussion encouraged
 */
export function getConversationPrompt(viewerType: ViewerType): string {
  if (viewerType === 'child') {
    return "When you're ready, let's talk about what happened. Your perspective matters, and this conversation is about understanding and support - not punishment."
  }

  return 'Consider having an open conversation with your child. Ask questions, listen to their perspective, and work together on next steps. This approach builds trust and understanding.'
}

/**
 * Get "let's work on this" supportive framing.
 * AC6: Regression framed as "let's work on this" not "you failed"
 */
export function getSupportiveFraming(viewerType: ViewerType): string {
  if (viewerType === 'child') {
    return "This isn't about failure - everyone has challenging times. Let's work on this together and figure out what support you need."
  }

  return 'This is a learning opportunity, not a failure. Work with your child to understand what happened and what support they need going forward.'
}

/**
 * Get message explaining why monitoring hasn't changed yet.
 * AC1: Grace period explanation
 */
export function getGracePeriodExplanation(viewerType: ViewerType): string {
  if (viewerType === 'child') {
    return 'Your monitoring level stays the same during this 2-week period. Nothing changes automatically - any decisions will be made together after talking.'
  }

  return 'Monitoring levels remain unchanged during the 2-week grace period. This allows time for a meaningful conversation before any adjustments are considered.'
}

/**
 * Get message for when child provides explanation.
 * AC5: Child can explain circumstances
 */
export function getExplanationAcknowledgment(viewerType: ViewerType): string {
  if (viewerType === 'child') {
    return 'Thank you for sharing. Your explanation helps everyone understand what happened. This information will be part of the conversation with your parent.'
  }

  return 'Your child has shared their perspective on what happened. Take time to read and understand their explanation before your conversation.'
}

/**
 * Get message after conversation is marked as held.
 */
export function getConversationCompleteMessage(viewerType: ViewerType): string {
  if (viewerType === 'child') {
    return 'Great job having that conversation. Whatever happens next, remember that talking through challenges is how families grow stronger together.'
  }

  return 'Thank you for having this conversation. Together with your child, you can now decide on next steps.'
}

/**
 * Get message for resolution options.
 */
export function getResolutionOptions(viewerType: ViewerType): {
  resolveMessage: string
  revertMessage: string
} {
  if (viewerType === 'child') {
    return {
      resolveMessage:
        'Your family has decided to keep your current monitoring level. This shows trust in working through challenges together.',
      revertMessage:
        "Your family has decided to adjust monitoring for now. This isn't punishment - it's temporary support while you work through this together.",
    }
  }

  return {
    resolveMessage:
      'You can choose to maintain the current monitoring level, showing trust in your child to work through this challenge.',
    revertMessage:
      'You can choose to temporarily increase monitoring. Frame this as additional support, not punishment, to maintain trust.',
  }
}

/**
 * Validate that a message follows supportive framing (no punitive language).
 */
export function validateSupportiveFraming(message: string): {
  valid: boolean
  issues: string[]
} {
  const issues: string[] = []
  const messageLower = message.toLowerCase()

  // Check for punitive words (not in negated context)
  const punitiveWords = ['failed', 'failure', 'violated', 'consequence', 'lost']
  for (const word of punitiveWords) {
    if (messageLower.includes(word)) {
      // Check if it's negated
      const negatedPatterns = [
        `isn't ${word}`,
        `isn't about ${word}`,
        `not ${word}`,
        `not a ${word}`,
        `not about ${word}`,
      ]
      const isNegated = negatedPatterns.some((pattern) => messageLower.includes(pattern))
      if (!isNegated) {
        issues.push(`Contains "${word}" without negation`)
      }
    }
  }

  // Check for "you failed" specifically
  if (messageLower.includes('you failed') && !messageLower.includes("isn't about")) {
    issues.push('Contains "you failed" framing')
  }

  return {
    valid: issues.length === 0,
    issues,
  }
}

/**
 * Get all notification messages for regression state.
 */
export function getAllRegressionMessages(
  event: RegressionEvent,
  childName: string,
  viewerType: ViewerType
): {
  notification: RegressionNotification
  gracePeriodReminder: string
  conversationPrompt: string
  supportiveFraming: string
  gracePeriodExplanation: string
} {
  const daysRemaining = calculateGraceDaysRemaining(event)

  return {
    notification: getRegressionNotification(event, childName, viewerType),
    gracePeriodReminder: getGracePeriodReminder(daysRemaining, viewerType),
    conversationPrompt: getConversationPrompt(viewerType),
    supportiveFraming: getSupportiveFraming(viewerType),
    gracePeriodExplanation: getGracePeriodExplanation(viewerType),
  }
}
