/**
 * DevelopmentalMessagingService - Story 37.5 Task 2
 *
 * Service for generating rights-based messages.
 * AC1: Language uses "recognition" not "reward"
 * AC2: Examples: "Recognizing your maturity" not "You've earned privacy"
 * AC3: Emphasis: privacy is inherent, monitoring is temporary support
 * AC4: Messaging validated with child rights advocate principles
 *
 * Philosophy: Privacy is a RIGHT - not earned, but inherent.
 */

import {
  APPROVED_LANGUAGE,
  DISCOURAGED_LANGUAGE,
  CHILD_MILESTONE_MESSAGES,
  PARENT_MILESTONE_MESSAGES,
  REDUCTION_MESSAGES,
  RIGHTS_MESSAGES,
  SHAME_REDUCING_MESSAGES,
  type ViewerType,
  type MilestoneType,
  type FramingValidationResult,
  type DevelopmentalMessage,
} from '../contracts/developmentalMessaging'

// =============================================================================
// Milestone Messages
// =============================================================================

/**
 * Get milestone message with proper developmental framing.
 */
export function getMilestoneMessage(
  milestone: MilestoneType,
  childName: string,
  viewerType: ViewerType
): string {
  const messages = viewerType === 'child' ? CHILD_MILESTONE_MESSAGES : PARENT_MILESTONE_MESSAGES
  const template = messages[milestone]

  let message: string = template.message
  if (viewerType === 'parent') {
    message = message.replace(/Your child/g, childName)
  }
  return message
}

/**
 * Get milestone heading for UI display.
 */
export function getMilestoneHeading(milestone: MilestoneType, viewerType: ViewerType): string {
  const messages = viewerType === 'child' ? CHILD_MILESTONE_MESSAGES : PARENT_MILESTONE_MESSAGES
  return messages[milestone].title
}

// =============================================================================
// Reduction Messages
// =============================================================================

/**
 * Get reduction notification message.
 */
export function getReductionMessage(
  reductionType: 'screenshotFrequency' | 'notificationOnly' | 'automaticReduction',
  childName: string,
  viewerType: ViewerType
): string {
  const template = REDUCTION_MESSAGES[reductionType][viewerType]
  if (viewerType === 'parent') {
    return template.replace(/your child/gi, childName)
  }
  return template
}

/**
 * Get comprehensive reduction notification.
 */
export function getFullReductionNotification(
  reductionType: 'screenshotFrequency' | 'notificationOnly' | 'automaticReduction',
  childName: string,
  viewerType: ViewerType
): DevelopmentalMessage {
  const message = getReductionMessage(reductionType, childName, viewerType)

  const titles = {
    screenshotFrequency: 'Screenshot Frequency Reducing',
    notificationOnly: 'Notification-Only Mode Activated',
    automaticReduction: 'Automatic Reduction Applied',
  }

  return {
    title: titles[reductionType],
    message,
    context: 'reduction',
    viewerType,
  }
}

// =============================================================================
// Regression Messages
// =============================================================================

/**
 * Regression message types.
 */
export type RegressionMessageType = 'initial' | 'conversation' | 'gracePeriod' | 'support'

/**
 * Get regression message (supportive, not punitive).
 * AC: Regression framed as "let's work on this" not "you failed"
 */
export function getRegressionMessage(
  messageType: RegressionMessageType,
  childName: string,
  viewerType: ViewerType
): string {
  const messages = {
    initial: {
      child:
        "There's been a change in your trust score. Let's talk about what happened and work on this together.",
      parent: `${childName}'s trust score has changed. This is a chance for conversation, not punishment.`,
    },
    conversation: {
      child: 'A conversation with your parent is encouraged before any monitoring changes happen.',
      parent: `Please talk with ${childName} about what happened before any changes take effect.`,
    },
    gracePeriod: {
      child:
        'You have a 2-week grace period. Use this time to talk with your parent and work on rebuilding.',
      parent: `There's a 2-week grace period. Use this time for supportive conversation with ${childName}.`,
    },
    support: {
      child:
        "This isn't about punishment - it's about support. Everyone has setbacks, and they can be learning opportunities.",
      parent: `Frame this as support, not punishment. Help ${childName} understand this is a chance to grow.`,
    },
  }

  return messages[messageType][viewerType]
}

// =============================================================================
// Validation
// =============================================================================

/**
 * Validate message follows developmental framing.
 * Checks for approved vs discouraged language.
 */
export function validateDevelopmentalFraming(message: string): FramingValidationResult {
  const messageLower = message.toLowerCase()
  const issues: string[] = []
  const approvedWordsFound: string[] = []
  const discouragedWordsFound: string[] = []

  // Check for approved language
  APPROVED_LANGUAGE.forEach((word) => {
    if (messageLower.includes(word)) {
      approvedWordsFound.push(word)
    }
  })

  // Check for discouraged language
  DISCOURAGED_LANGUAGE.forEach((word) => {
    if (messageLower.includes(word)) {
      // Check if it's negated (acceptable usage)
      // Covers patterns like: "not as a reward", "isn't about punishment", "not punishing"
      const isNegated =
        messageLower.includes('not as a ' + word) ||
        messageLower.includes('not a ' + word) ||
        messageLower.includes("isn't " + word) ||
        messageLower.includes("isn't about " + word) ||
        messageLower.includes('not ' + word + 'ing') ||
        messageLower.includes('not ' + word)

      if (!isNegated) {
        discouragedWordsFound.push(word)
        issues.push(`Contains "${word}" language - consider using recognition framing`)
      }
    }
  })

  // Additional validation rules
  if (approvedWordsFound.length === 0 && !messageLower.includes('your')) {
    issues.push('Message may not emphasize developmental framing')
  }

  return {
    valid: discouragedWordsFound.length === 0,
    issues,
    approvedWordsFound,
    discouragedWordsFound,
  }
}

/**
 * Check if a message passes child rights advocate principles.
 */
export function validateChildRightsPrinciples(message: string): boolean {
  const result = validateDevelopmentalFraming(message)

  // Must have no discouraged language
  if (result.discouragedWordsFound.length > 0) {
    return false
  }

  // Should have at least some approved language (unless very short)
  if (message.length > 50 && result.approvedWordsFound.length === 0) {
    return false
  }

  return true
}

// =============================================================================
// Rights Messages
// =============================================================================

/**
 * Get privacy rights reminder.
 */
export function getPrivacyRightsReminder(viewerType: ViewerType): string {
  return RIGHTS_MESSAGES.privacyReminder[viewerType]
}

/**
 * Get temporary nature message.
 */
export function getTemporaryNatureMessage(viewerType: ViewerType): string {
  return RIGHTS_MESSAGES.temporaryNature[viewerType]
}

/**
 * Get growth recognition message.
 */
export function getGrowthRecognitionMessage(viewerType: ViewerType): string {
  return RIGHTS_MESSAGES.growthRecognition[viewerType]
}

// =============================================================================
// Shame-Reducing Messages
// =============================================================================

/**
 * Get shame-reducing message.
 */
export function getShameReducingMessage(
  messageType: 'monitoringNormal' | 'supportNotSurveillance' | 'noShame',
  viewerType: ViewerType
): string {
  return SHAME_REDUCING_MESSAGES[messageType][viewerType]
}

/**
 * Get comprehensive shame-reducing context.
 */
export function getShameReducingContext(viewerType: ViewerType): string[] {
  return [
    SHAME_REDUCING_MESSAGES.monitoringNormal[viewerType],
    SHAME_REDUCING_MESSAGES.supportNotSurveillance[viewerType],
    SHAME_REDUCING_MESSAGES.noShame[viewerType],
  ]
}

// =============================================================================
// Composite Messages
// =============================================================================

/**
 * Get complete trust milestone notification with all context.
 */
export function getTrustMilestoneNotification(
  milestone: MilestoneType,
  childName: string,
  viewerType: ViewerType
): {
  heading: string
  message: string
  rightsReminder: string
} {
  return {
    heading: getMilestoneHeading(milestone, viewerType),
    message: getMilestoneMessage(milestone, childName, viewerType),
    rightsReminder: getPrivacyRightsReminder(viewerType),
  }
}

/**
 * Get child-specific developmental context.
 * Helps children understand their rights.
 */
export function getChildDevelopmentalContext(): {
  privacyMessage: string
  temporaryMessage: string
  shameReduction: string
} {
  return {
    privacyMessage: RIGHTS_MESSAGES.privacyReminder.child,
    temporaryMessage: RIGHTS_MESSAGES.temporaryNature.child,
    shameReduction: SHAME_REDUCING_MESSAGES.noShame.child,
  }
}

/**
 * Get parent education context.
 * Helps parents understand the developmental approach.
 */
export function getParentEducationContext(): {
  developmentalApproach: string
  temporaryNature: string
  supportFraming: string
} {
  return {
    developmentalApproach: RIGHTS_MESSAGES.growthRecognition.parent,
    temporaryNature: RIGHTS_MESSAGES.temporaryNature.parent,
    supportFraming: SHAME_REDUCING_MESSAGES.supportNotSurveillance.parent,
  }
}
