/**
 * Age 16 Transition Service - Story 52.1 Task 2
 *
 * Service for detecting when children are approaching or have reached
 * their 16th birthday for transition eligibility.
 *
 * AC1: 30-Day Pre-Transition Notification detection
 * AC2: Transition Options become available at 16
 */

import {
  AGE_16_IN_YEARS,
  PRE_TRANSITION_DAYS,
  type TransitionEligibility,
} from '../contracts/age16Transition'
import { calculateAge } from './birthdateService'

// ============================================
// Age 16 Detection Functions
// ============================================

/**
 * Check if child is 16 or older.
 * @param birthdate - Child's birthdate
 * @param referenceDate - Optional reference date (defaults to now)
 */
export function is16OrOlder(birthdate: Date, referenceDate: Date = new Date()): boolean {
  const age = calculateAge(birthdate, referenceDate)
  return age >= AGE_16_IN_YEARS
}

/**
 * Get the date of child's 16th birthday.
 * @param birthdate - Child's birthdate
 */
export function get16thBirthdayDate(birthdate: Date): Date {
  const sixteenthBirthday = new Date(birthdate)
  sixteenthBirthday.setFullYear(birthdate.getFullYear() + AGE_16_IN_YEARS)
  return sixteenthBirthday
}

/**
 * Get days until child turns 16.
 * Returns 0 if child is already 16 or older.
 * @param birthdate - Child's birthdate
 * @param referenceDate - Optional reference date (defaults to now)
 */
export function getDaysUntil16(birthdate: Date, referenceDate: Date = new Date()): number {
  if (is16OrOlder(birthdate, referenceDate)) {
    return 0
  }

  const sixteenthBirthday = get16thBirthdayDate(birthdate)
  const today = new Date(referenceDate)
  today.setHours(0, 0, 0, 0)
  sixteenthBirthday.setHours(0, 0, 0, 0)

  const diffTime = sixteenthBirthday.getTime() - today.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

  return Math.max(0, diffDays)
}

/**
 * Check if child is within 30 days of their 16th birthday.
 * Returns false if already 16 or older.
 * @param birthdate - Child's birthdate
 * @param referenceDate - Optional reference date (defaults to now)
 */
export function isWithin30DaysOf16(birthdate: Date, referenceDate: Date = new Date()): boolean {
  if (is16OrOlder(birthdate, referenceDate)) {
    return false
  }

  const daysUntil = getDaysUntil16(birthdate, referenceDate)
  return daysUntil <= PRE_TRANSITION_DAYS && daysUntil > 0
}

/**
 * Check if today is the child's 16th birthday.
 * @param birthdate - Child's birthdate
 * @param referenceDate - Optional reference date (defaults to now)
 */
export function isExactly16Today(birthdate: Date, referenceDate: Date = new Date()): boolean {
  const sixteenthBirthday = get16thBirthdayDate(birthdate)
  const today = new Date(referenceDate)

  return (
    sixteenthBirthday.getFullYear() === today.getFullYear() &&
    sixteenthBirthday.getMonth() === today.getMonth() &&
    sixteenthBirthday.getDate() === today.getDate()
  )
}

/**
 * Get complete transition eligibility status for a child.
 * @param childId - Child's ID
 * @param birthdate - Child's birthdate
 * @param preTransitionSent - Whether pre-transition notification was already sent
 * @param transitionAvailableSent - Whether transition available notification was sent
 * @param referenceDate - Optional reference date (defaults to now)
 */
export function getTransitionEligibility(
  childId: string,
  birthdate: Date,
  preTransitionSent: boolean = false,
  transitionAvailableSent: boolean = false,
  referenceDate: Date = new Date()
): TransitionEligibility {
  const isEligible = is16OrOlder(birthdate, referenceDate)
  const daysUntil = isEligible ? null : getDaysUntil16(birthdate, referenceDate)
  const isApproaching = !isEligible && daysUntil !== null && daysUntil <= PRE_TRANSITION_DAYS

  return {
    childId,
    isEligible,
    isApproaching,
    daysUntil16: daysUntil,
    sixteenthBirthday: get16thBirthdayDate(birthdate),
    currentAge: calculateAge(birthdate, referenceDate),
    preTransitionSent,
    transitionAvailableSent,
  }
}

/**
 * Determine if a pre-transition notification should be sent.
 * @param birthdate - Child's birthdate
 * @param preTransitionSent - Whether notification was already sent
 * @param referenceDate - Optional reference date (defaults to now)
 */
export function shouldSendPreTransitionNotification(
  birthdate: Date,
  preTransitionSent: boolean,
  referenceDate: Date = new Date()
): boolean {
  // Don't send if already sent
  if (preTransitionSent) {
    return false
  }

  // Don't send if already 16 or older
  if (is16OrOlder(birthdate, referenceDate)) {
    return false
  }

  // Send if within 30 days of 16th birthday
  return isWithin30DaysOf16(birthdate, referenceDate)
}

/**
 * Determine if a transition available notification should be sent.
 * @param birthdate - Child's birthdate
 * @param transitionAvailableSent - Whether notification was already sent
 * @param referenceDate - Optional reference date (defaults to now)
 */
export function shouldSendTransitionAvailableNotification(
  birthdate: Date,
  transitionAvailableSent: boolean,
  referenceDate: Date = new Date()
): boolean {
  // Don't send if already sent
  if (transitionAvailableSent) {
    return false
  }

  // Send on exactly the 16th birthday
  return isExactly16Today(birthdate, referenceDate)
}
