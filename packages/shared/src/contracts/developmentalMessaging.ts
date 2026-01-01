/**
 * DevelopmentalMessaging Contracts - Story 37.5 Task 1
 *
 * Centralized messaging constants for developmental framing.
 * AC1: Language uses "recognition" not "reward"
 * AC2: Examples: "Recognizing your maturity" not "You've earned privacy"
 *
 * Philosophy: Privacy is a RIGHT - not earned, but inherent.
 * Monitoring is temporary support as children grow.
 */

import { z } from 'zod'

// =============================================================================
// Messaging Principles
// =============================================================================

/**
 * Core messaging principles for developmental framing.
 */
export const MESSAGING_PRINCIPLES = {
  privacyIsRight: 'Privacy is your right as you grow',
  monitoringTemporary: 'Monitoring is temporary support',
  recognizingGrowth: 'Recognizing your growth',
  developmentalSupport: 'Supporting your development',
} as const

/**
 * Approved language for developmental framing.
 * These words emphasize rights and growth.
 */
export const APPROVED_LANGUAGE = [
  'recognizing',
  'growth',
  'maturity',
  'developmental',
  'supporting',
  'journey',
  'progress',
  'temporary',
  'right',
  'inherent',
] as const

/**
 * Discouraged language that implies rewards/earning.
 * These words should be avoided in messaging.
 */
export const DISCOURAGED_LANGUAGE = [
  'earned',
  'reward',
  'deserve',
  'privilege',
  'behave',
  'behavior',
  'punishment',
  'punish',
  'consequence',
] as const

// =============================================================================
// Milestone Messages
// =============================================================================

/**
 * Child-facing messages for each milestone.
 * Emphasizes rights and growth, not rewards.
 */
export const CHILD_MILESTONE_MESSAGES = {
  growing: {
    title: 'Growing Together',
    message:
      "You're showing growth in how you navigate online. We're recognizing this by adjusting your monitoring.",
  },
  maturing: {
    title: 'Maturing Responsibility',
    message:
      "Your maturity is being recognized. Monitoring is reducing because you're developing the skills to navigate safely.",
  },
  readyForIndependence: {
    title: 'Ready for Independence',
    message:
      "We recognize you're ready for more independence. Your privacy is expanding as a natural part of your development.",
  },
} as const

/**
 * Parent-facing messages for each milestone.
 * Explains the developmental approach.
 */
export const PARENT_MILESTONE_MESSAGES = {
  growing: {
    title: "Recognizing Your Child's Growth",
    message:
      "Your child is showing growth. We're reducing monitoring to recognize their developing responsibility.",
  },
  maturing: {
    title: 'Developmental Progress',
    message:
      "Your child's maturity is being recognized with reduced monitoring. This supports healthy development.",
  },
  readyForIndependence: {
    title: 'Supporting Independence',
    message:
      'Your child has demonstrated sustained maturity. Their monitoring is reducing as part of their natural path to independence.',
  },
} as const

// =============================================================================
// Reduction Messages
// =============================================================================

/**
 * Messages for monitoring reductions.
 */
export const REDUCTION_MESSAGES = {
  screenshotFrequency: {
    child: "We're taking fewer screenshots to recognize your growing maturity.",
    parent: "Screenshot frequency is reducing to recognize your child's development.",
  },
  notificationOnly: {
    child: "You're in notification-only mode - we trust you. Monitoring is minimal now.",
    parent: 'Notification-only mode recognizes your child has developed strong digital habits.',
  },
  automaticReduction: {
    child:
      'Your monitoring has automatically reduced. This recognizes your sustained maturity over 6 months.',
    parent: 'Monitoring has automatically reduced, recognizing 6 months of demonstrated maturity.',
  },
} as const

// =============================================================================
// Rights-Based Messages
// =============================================================================

/**
 * Messages that emphasize privacy as a right.
 */
export const RIGHTS_MESSAGES = {
  privacyReminder: {
    child: 'Privacy is your developmental right. Monitoring is temporary support as you grow.',
    parent:
      "Privacy is your child's developmental right. Monitoring should decrease as they mature.",
  },
  temporaryNature: {
    child: 'Monitoring is not permanent. As you grow, your privacy naturally expands.',
    parent: "Monitoring is temporary. Your child's privacy will naturally expand with maturity.",
  },
  growthRecognition: {
    child:
      "We see your growth. That's why your monitoring is reducing - not as a reward, but as recognition of who you're becoming.",
    parent:
      "We're recognizing your child's growth, not rewarding behavior. Privacy expansion is developmental.",
  },
} as const

// =============================================================================
// Shame-Reducing Messages
// =============================================================================

/**
 * Messages designed to reduce shame around monitoring.
 */
export const SHAME_REDUCING_MESSAGES = {
  monitoringNormal: {
    child:
      'Having monitoring is normal while growing up. Many families use it as temporary support.',
    parent:
      'Monitoring is a normal part of guiding children. The goal is always graduation to full independence.',
  },
  supportNotSurveillance: {
    child:
      "This isn't surveillance - it's support while you're developing. The goal is for you to not need it.",
    parent:
      'Frame this as support, not surveillance. Your child should understand monitoring ends with maturity.',
  },
  noShame: {
    child:
      "There's no shame in having monitoring. It's like training wheels - temporary and removed when ready.",
    parent:
      "Help your child understand monitoring without shame. It's developmental support, not punishment.",
  },
} as const

// =============================================================================
// Schemas
// =============================================================================

export const messagingContextSchema = z.enum([
  'milestone',
  'reduction',
  'regression',
  'rights',
  'info',
])

export type MessagingContext = z.infer<typeof messagingContextSchema>

export const viewerTypeSchema = z.enum(['child', 'parent'])

export type ViewerType = z.infer<typeof viewerTypeSchema>

export const milestoneTypeSchema = z.enum(['growing', 'maturing', 'readyForIndependence'])

export type MilestoneType = z.infer<typeof milestoneTypeSchema>

export const developmentalMessageSchema = z.object({
  title: z.string().min(1),
  message: z.string().min(1),
  context: messagingContextSchema,
  viewerType: viewerTypeSchema,
  milestone: milestoneTypeSchema.optional(),
})

export type DevelopmentalMessage = z.infer<typeof developmentalMessageSchema>

export const framingValidationResultSchema = z.object({
  valid: z.boolean(),
  issues: z.array(z.string()),
  approvedWordsFound: z.array(z.string()),
  discouragedWordsFound: z.array(z.string()),
})

export type FramingValidationResult = z.infer<typeof framingValidationResultSchema>

// =============================================================================
// Factory Functions
// =============================================================================

/**
 * Get message for a milestone based on viewer type.
 */
export function getMilestoneMessage(
  milestone: MilestoneType,
  viewerType: ViewerType
): { title: string; message: string } {
  if (viewerType === 'child') {
    return CHILD_MILESTONE_MESSAGES[milestone]
  }
  return PARENT_MILESTONE_MESSAGES[milestone]
}

/**
 * Get reduction message based on type and viewer.
 */
export function getReductionMessage(
  reductionType: keyof typeof REDUCTION_MESSAGES,
  viewerType: ViewerType
): string {
  return REDUCTION_MESSAGES[reductionType][viewerType]
}

/**
 * Get rights-based message.
 */
export function getRightsMessage(
  messageType: keyof typeof RIGHTS_MESSAGES,
  viewerType: ViewerType
): string {
  return RIGHTS_MESSAGES[messageType][viewerType]
}

/**
 * Get shame-reducing message.
 */
export function getShameReducingMessage(
  messageType: keyof typeof SHAME_REDUCING_MESSAGES,
  viewerType: ViewerType
): string {
  return SHAME_REDUCING_MESSAGES[messageType][viewerType]
}

/**
 * Create a developmental message.
 */
export function createDevelopmentalMessage(
  title: string,
  message: string,
  context: MessagingContext,
  viewerType: ViewerType,
  milestone?: MilestoneType
): DevelopmentalMessage {
  return developmentalMessageSchema.parse({
    title,
    message,
    context,
    viewerType,
    milestone,
  })
}
