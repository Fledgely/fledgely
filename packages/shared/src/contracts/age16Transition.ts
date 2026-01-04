/**
 * Age 16 Transition Contract - Story 52.1
 *
 * Data types and schemas for age 16 transition notifications.
 * Enables teens to learn about Reverse Mode and Trusted Adults
 * 30 days before their 16th birthday.
 *
 * AC1: 30-Day Pre-Transition Notification
 * AC2: Transition Options Explanation
 * AC3: Parent Notification
 * AC4: In-App Guide
 * AC5: Optional Transition
 */

import { z } from 'zod'

// ============================================
// Constants
// ============================================

/** Age at which transition becomes available */
export const AGE_16_IN_YEARS = 16

/** Days before 16th birthday to send pre-transition notification */
export const PRE_TRANSITION_DAYS = 30

/** Maximum number of trusted adults a teen can designate */
export const MAX_TRUSTED_ADULTS = 3

// ============================================
// Notification Types
// ============================================

/**
 * Types of age 16 transition notifications.
 * - pre_transition: Sent 30 days before 16th birthday
 * - transition_available: Sent on 16th birthday
 */
export const Age16NotificationType = {
  PRE_TRANSITION: 'pre_transition',
  TRANSITION_AVAILABLE: 'transition_available',
} as const

export type Age16NotificationTypeValue =
  (typeof Age16NotificationType)[keyof typeof Age16NotificationType]

// ============================================
// Viewer Types
// ============================================

export type Age16ViewerType = 'child' | 'parent'

// ============================================
// Zod Schemas
// ============================================

/**
 * Schema for age 16 transition notification.
 */
export const Age16TransitionNotificationSchema = z.object({
  /** Unique notification ID */
  id: z.string().min(1),
  /** ID of the child receiving notification */
  childId: z.string().min(1),
  /** ID of the family */
  familyId: z.string().min(1),
  /** Type of notification */
  type: z.enum(['pre_transition', 'transition_available']),
  /** When notification was sent */
  sentAt: z.date(),
  /** Whether notification was acknowledged */
  acknowledged: z.boolean().default(false),
  /** When notification was acknowledged */
  acknowledgedAt: z.date().optional(),
  /** Whether notification was dismissed */
  dismissed: z.boolean().default(false),
  /** Days until 16th birthday (for pre_transition) */
  daysUntil16: z.number().int().min(0).optional(),
})

export type Age16TransitionNotification = z.infer<typeof Age16TransitionNotificationSchema>

/**
 * Schema for transition guide step.
 */
export const TransitionGuideStepSchema = z.object({
  /** Step number */
  step: z.number().int().min(1),
  /** Step title */
  title: z.string().min(1),
  /** Step description */
  description: z.string().min(1),
  /** Icon identifier for step */
  icon: z.string().optional(),
})

export type TransitionGuideStep = z.infer<typeof TransitionGuideStepSchema>

/**
 * Schema for the complete transition guide.
 */
export const TransitionGuideSchema = z.object({
  /** Guide title */
  title: z.string().min(1),
  /** Introduction message */
  introduction: z.string().min(1),
  /** Guide steps */
  steps: z.array(TransitionGuideStepSchema).min(1),
  /** Celebration message */
  celebrationMessage: z.string().min(1),
  /** Call to action text */
  ctaText: z.string().optional(),
})

export type TransitionGuide = z.infer<typeof TransitionGuideSchema>

/**
 * Schema for transition eligibility status.
 */
export const TransitionEligibilitySchema = z.object({
  /** Child ID */
  childId: z.string().min(1),
  /** Whether child is eligible (16 or older) */
  isEligible: z.boolean(),
  /** Whether child is approaching eligibility (within 30 days) */
  isApproaching: z.boolean(),
  /** Days until 16th birthday (null if already 16+) */
  daysUntil16: z.number().int().nullable(),
  /** 16th birthday date */
  sixteenthBirthday: z.date(),
  /** Current age in years */
  currentAge: z.number().int().min(0),
  /** Whether pre-transition notification was sent */
  preTransitionSent: z.boolean(),
  /** Whether transition available notification was sent */
  transitionAvailableSent: z.boolean(),
})

export type TransitionEligibility = z.infer<typeof TransitionEligibilitySchema>

// ============================================
// Helper Functions
// ============================================

/**
 * Generate a unique notification ID.
 */
export function generateTransitionNotificationId(): string {
  return `age16-notif-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
}

/**
 * Check if a child is eligible for transition (16 or older).
 * @param birthdate - Child's birthdate
 * @param referenceDate - Optional reference date (defaults to now)
 */
export function isEligibleForTransition(
  birthdate: Date,
  referenceDate: Date = new Date()
): boolean {
  const age = calculateAgeFromBirthdate(birthdate, referenceDate)
  return age >= AGE_16_IN_YEARS
}

/**
 * Check if a child is approaching transition eligibility.
 * @param birthdate - Child's birthdate
 * @param referenceDate - Optional reference date (defaults to now)
 */
export function isApproachingTransition(
  birthdate: Date,
  referenceDate: Date = new Date()
): boolean {
  if (isEligibleForTransition(birthdate, referenceDate)) {
    return false // Already eligible
  }

  const daysUntil = getDaysUntil16FromBirthdate(birthdate, referenceDate)
  return daysUntil <= PRE_TRANSITION_DAYS && daysUntil > 0
}

/**
 * Calculate age from birthdate.
 * @param birthdate - The birthdate
 * @param referenceDate - Reference date for calculation
 */
function calculateAgeFromBirthdate(birthdate: Date, referenceDate: Date): number {
  const today = new Date(referenceDate)
  const birth = new Date(birthdate)

  let age = today.getFullYear() - birth.getFullYear()
  const monthDiff = today.getMonth() - birth.getMonth()

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--
  }

  return Math.max(0, age)
}

/**
 * Get days until 16th birthday.
 * @param birthdate - Child's birthdate
 * @param referenceDate - Reference date for calculation
 */
function getDaysUntil16FromBirthdate(birthdate: Date, referenceDate: Date): number {
  if (isEligibleForTransition(birthdate, referenceDate)) {
    return 0
  }

  const sixteenthBirthday = new Date(birthdate)
  sixteenthBirthday.setFullYear(birthdate.getFullYear() + AGE_16_IN_YEARS)

  const today = new Date(referenceDate)
  today.setHours(0, 0, 0, 0)
  sixteenthBirthday.setHours(0, 0, 0, 0)

  const diffTime = sixteenthBirthday.getTime() - today.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

  return Math.max(0, diffDays)
}

/**
 * Create an age 16 transition notification.
 */
export function createAge16TransitionNotification(
  childId: string,
  familyId: string,
  type: Age16NotificationTypeValue,
  daysUntil16?: number
): Age16TransitionNotification {
  return {
    id: generateTransitionNotificationId(),
    childId,
    familyId,
    type,
    sentAt: new Date(),
    acknowledged: false,
    dismissed: false,
    daysUntil16: type === 'pre_transition' ? daysUntil16 : undefined,
  }
}

// ============================================
// Default Guide Content
// ============================================

/**
 * Get the default transition guide content.
 * AC4: In-app guide walks through new features
 */
export function getDefaultTransitionGuide(): TransitionGuide {
  return {
    title: "You're Growing Up!",
    introduction: "At 16, you gain new controls over your digital life. Here's what's changing:",
    steps: [
      {
        step: 1,
        title: 'What is Reverse Mode?',
        description:
          'Reverse Mode puts you in control. Instead of parents monitoring you, you choose what to share with them. You can share everything, nothing, or something in between.',
        icon: 'toggle',
      },
      {
        step: 2,
        title: 'Trusted Adults',
        description:
          'You can invite up to 3 trusted adults (teacher, counselor, mentor, relative) to see what you choose to share. Parents cannot see who your trusted adults are.',
        icon: 'users',
      },
      {
        step: 3,
        title: 'Your Privacy Controls',
        description:
          "You're in the driver's seat. You can turn Reverse Mode on or off anytime, change what you share, and add or remove trusted adults whenever you want.",
        icon: 'shield',
      },
    ],
    celebrationMessage:
      "🎉 You're growing up! These new features are yours to explore when you're ready.",
    ctaText: 'Learn More',
  }
}

// ============================================
// Message Templates
// ============================================

/** Child pre-transition message (AC1) */
export const CHILD_PRE_TRANSITION_MESSAGE = 'At 16, you gain new controls'

/** Child transition available message */
export const CHILD_TRANSITION_AVAILABLE_MESSAGE = "You're 16! New features are available"

/** Parent pre-transition message (AC3) */
export const PARENT_PRE_TRANSITION_MESSAGE = "Your child's controls are changing at 16"

/** Parent transition available message template */
export const PARENT_TRANSITION_AVAILABLE_TEMPLATE =
  '{childName} is 16 - they now have access to Reverse Mode'
