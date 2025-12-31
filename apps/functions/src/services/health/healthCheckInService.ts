/**
 * Health Check-In Service
 *
 * Story 27.5.1: Monthly Health Check-In Prompts
 *
 * Manages periodic family health check-ins for monitoring relationship health.
 * Supports:
 * - 30-day eligibility before first check-in
 * - Configurable frequency (weekly, monthly, quarterly)
 * - Separate check-ins for parents and children
 * - Private responses (not visible to other family members)
 * - 3-day reminder for incomplete check-ins
 */

import { getFirestore, Firestore } from 'firebase-admin/firestore'
import * as logger from 'firebase-functions/logger'
import * as crypto from 'crypto'
import type {
  HealthCheckIn,
  CheckInSettings,
  CheckInFrequency,
  CheckInRecipientType,
  CheckInResponse,
} from '@fledgely/shared'
import {
  DEFAULT_CHECK_IN_SETTINGS,
  CHECK_IN_FREQUENCY_MS,
  CHECK_IN_FAMILY_AGE_THRESHOLD_MS,
  CHECK_IN_REMINDER_DELAY_MS,
} from '@fledgely/shared'

// Lazy initialization for Firestore
let db: Firestore | null = null
function getDb(): Firestore {
  if (!db) {
    db = getFirestore()
  }
  return db
}

/**
 * Generate a unique check-in ID.
 */
function generateCheckInId(): string {
  const timestamp = Date.now().toString(36)
  const random = crypto.randomBytes(8).toString('hex')
  return `checkin_${timestamp}_${random}`
}

/**
 * Get check-in settings for a family.
 * Returns default settings if none are configured.
 *
 * Story 27.5.1 - AC5: Configurable frequency
 */
export async function getCheckInSettings(familyId: string): Promise<CheckInSettings> {
  const db = getDb()

  try {
    const settingsDoc = await db
      .collection('families')
      .doc(familyId)
      .collection('settings')
      .doc('healthCheckIn')
      .get()

    if (!settingsDoc.exists) {
      return {
        ...DEFAULT_CHECK_IN_SETTINGS,
        updatedAt: Date.now(),
      }
    }

    const data = settingsDoc.data()
    return {
      enabled: data?.enabled ?? true,
      frequency: data?.frequency ?? 'monthly',
      lastCheckInPeriodStart: data?.lastCheckInPeriodStart ?? null,
      nextCheckInDue: data?.nextCheckInDue ?? null,
      updatedAt: data?.updatedAt ?? Date.now(),
    }
  } catch (error) {
    logger.warn('Failed to get check-in settings', { familyId, error })
    return {
      ...DEFAULT_CHECK_IN_SETTINGS,
      updatedAt: Date.now(),
    }
  }
}

/**
 * Update check-in settings for a family.
 *
 * Story 27.5.1 - AC5: Configurable frequency
 */
export async function updateCheckInSettings(
  familyId: string,
  settings: Partial<CheckInSettings>
): Promise<void> {
  const db = getDb()

  await db
    .collection('families')
    .doc(familyId)
    .collection('settings')
    .doc('healthCheckIn')
    .set(
      {
        ...settings,
        updatedAt: Date.now(),
      },
      { merge: true }
    )

  logger.info('Updated check-in settings', { familyId })
}

/**
 * Check if a family is eligible for check-ins.
 *
 * Story 27.5.1 - AC1: 30-day eligibility
 * Family must be 30+ days old before first check-in.
 */
export async function isFamilyEligibleForCheckIn(familyId: string): Promise<boolean> {
  const db = getDb()

  try {
    const familyDoc = await db.collection('families').doc(familyId).get()
    if (!familyDoc.exists) return false

    const data = familyDoc.data()
    const createdAt = data?.createdAt

    if (!createdAt) return false

    // Handle both Date and Timestamp types
    const createdAtMs =
      createdAt instanceof Date ? createdAt.getTime() : (createdAt.toMillis?.() ?? createdAt)

    const familyAge = Date.now() - createdAtMs
    return familyAge >= CHECK_IN_FAMILY_AGE_THRESHOLD_MS
  } catch (error) {
    logger.warn('Failed to check family eligibility', { familyId, error })
    return false
  }
}

/**
 * Calculate next check-in due date based on frequency.
 *
 * Story 27.5.1 - AC5: Configurable frequency
 */
export function calculateNextCheckInDue(
  frequency: CheckInFrequency,
  lastPeriodStart: number | null
): number {
  const now = Date.now()

  if (!lastPeriodStart) {
    // First check-in is due immediately if family is eligible
    return now
  }

  return lastPeriodStart + CHECK_IN_FREQUENCY_MS[frequency]
}

/**
 * Check if a check-in is due for a family.
 */
export async function isCheckInDue(familyId: string): Promise<boolean> {
  const settings = await getCheckInSettings(familyId)

  if (!settings.enabled) return false

  const nextDue = calculateNextCheckInDue(settings.frequency, settings.lastCheckInPeriodStart)
  return Date.now() >= nextDue
}

/**
 * Get prompt text for a check-in based on recipient type.
 *
 * Story 27.5.1 - AC2: Parent prompt
 * Story 27.5.1 - AC3: Child prompt (age-appropriate)
 * Story 27.5.7 - Child-safe check-in language (6th-grade reading level)
 */
export function getCheckInPromptText(
  recipientType: CheckInRecipientType,
  childName?: string,
  childAge?: number
): { title: string; message: string; helpText?: string } {
  if (recipientType === 'guardian') {
    return {
      title: 'Family Check-In',
      message: childName
        ? `How are conversations about monitoring going? Take a moment to reflect on how things have been with ${childName}.`
        : 'How are conversations about monitoring going with your family?',
    }
  }

  // Child prompts - age-appropriate (Story 27.5.7)
  // Younger children (under 10): Very simple language
  if (childAge && childAge < 10) {
    return {
      title: 'How are things going? 💭',
      message: 'How do you feel about mom and dad looking at your phone and computer?',
      helpText: 'Pick the face that shows how you feel. Your answer is just for you!',
    }
  }

  // Pre-teens (10-12): Simple but slightly more mature
  if (childAge && childAge < 13) {
    return {
      title: 'How are things going? 💭',
      message:
        "We want to know how you feel about your parents checking your phone and computer. It's okay to be honest!",
      helpText: 'Your answers help your family talk about how things are going.',
    }
  }

  // Teens (13+): More mature but still friendly
  return {
    title: 'Check-In Time 💬',
    message: 'How do you feel about the monitoring setup? Your honest thoughts matter.',
    helpText: 'This helps your family understand how you feel about things.',
  }
}

/**
 * Create check-in records for all family members.
 *
 * Story 27.5.1 - AC2: Parent check-in prompts
 * Story 27.5.1 - AC3: Child check-in prompts
 */
export async function createCheckInsForFamily(familyId: string): Promise<string[]> {
  const db = getDb()
  const checkInIds: string[] = []
  const now = Date.now()

  try {
    // Get family data
    const familyDoc = await db.collection('families').doc(familyId).get()
    if (!familyDoc.exists) return []

    const familyData = familyDoc.data()
    const guardianUids: string[] = familyData?.guardianUids || []
    const childUids: string[] = familyData?.childUids || []

    // Get settings
    const settings = await getCheckInSettings(familyId)
    const periodStart = now
    const periodEnd = now + CHECK_IN_FREQUENCY_MS[settings.frequency]

    // Create check-ins for each guardian
    for (const guardianUid of guardianUids) {
      const checkInId = generateCheckInId()
      const checkIn: HealthCheckIn = {
        id: checkInId,
        familyId,
        recipientUid: guardianUid,
        recipientType: 'guardian',
        childId: null,
        periodStart,
        periodEnd,
        status: 'pending',
        promptSentAt: now,
        reminderSentAt: null,
        respondedAt: null,
        response: null,
        createdAt: now,
      }

      await db.collection('healthCheckIns').doc(checkInId).set(checkIn)
      checkInIds.push(checkInId)
    }

    // Create check-ins for each child (who has a user account)
    for (const childUid of childUids) {
      // Check if child has a user account
      const userDoc = await db.collection('users').doc(childUid).get()
      if (!userDoc.exists) continue

      const checkInId = generateCheckInId()
      const checkIn: HealthCheckIn = {
        id: checkInId,
        familyId,
        recipientUid: childUid,
        recipientType: 'child',
        childId: childUid,
        periodStart,
        periodEnd,
        status: 'pending',
        promptSentAt: now,
        reminderSentAt: null,
        respondedAt: null,
        response: null,
        createdAt: now,
      }

      await db.collection('healthCheckIns').doc(checkInId).set(checkIn)
      checkInIds.push(checkInId)
    }

    // Update settings with new period
    await updateCheckInSettings(familyId, {
      lastCheckInPeriodStart: periodStart,
      nextCheckInDue: periodEnd,
    })

    logger.info('Created check-ins for family', {
      familyId,
      checkInCount: checkInIds.length,
      guardianCount: guardianUids.length,
      childCount: childUids.length,
    })

    return checkInIds
  } catch (error) {
    logger.error('Failed to create check-ins for family', { familyId, error })
    return []
  }
}

/**
 * Get pending check-ins that need reminders.
 *
 * Story 27.5.1 - AC6: 3-day reminder
 */
export async function getPendingCheckInsNeedingReminder(): Promise<HealthCheckIn[]> {
  const db = getDb()
  const reminderThreshold = Date.now() - CHECK_IN_REMINDER_DELAY_MS

  try {
    const snapshot = await db
      .collection('healthCheckIns')
      .where('status', '==', 'pending')
      .where('reminderSentAt', '==', null)
      .where('promptSentAt', '<', reminderThreshold)
      .limit(100)
      .get()

    return snapshot.docs.map((doc) => doc.data() as HealthCheckIn)
  } catch (error) {
    logger.error('Failed to get pending check-ins', { error })
    return []
  }
}

/**
 * Mark reminder as sent for a check-in.
 *
 * Story 27.5.1 - AC6: 3-day reminder
 */
export async function markReminderSent(checkInId: string): Promise<void> {
  const db = getDb()

  await db.collection('healthCheckIns').doc(checkInId).update({
    reminderSentAt: Date.now(),
  })

  logger.info('Marked reminder sent', { checkInId })
}

/**
 * Submit a response to a check-in.
 *
 * Story 27.5.1 - AC4: Private responses
 */
export async function submitCheckInResponse(
  checkInId: string,
  response: CheckInResponse
): Promise<void> {
  const db = getDb()

  await db.collection('healthCheckIns').doc(checkInId).update({
    response,
    respondedAt: Date.now(),
    status: 'completed',
  })

  logger.info('Check-in response submitted', { checkInId })
}

/**
 * Skip a check-in.
 */
export async function skipCheckIn(checkInId: string): Promise<void> {
  const db = getDb()

  await db.collection('healthCheckIns').doc(checkInId).update({
    status: 'skipped',
    respondedAt: Date.now(),
  })

  logger.info('Check-in skipped', { checkInId })
}

/**
 * Get check-in by ID.
 */
export async function getCheckIn(checkInId: string): Promise<HealthCheckIn | null> {
  const db = getDb()

  try {
    const doc = await db.collection('healthCheckIns').doc(checkInId).get()
    if (!doc.exists) return null
    return doc.data() as HealthCheckIn
  } catch (error) {
    logger.error('Failed to get check-in', { checkInId, error })
    return null
  }
}

/**
 * Get pending check-ins for a user.
 */
export async function getPendingCheckInsForUser(userUid: string): Promise<HealthCheckIn[]> {
  const db = getDb()

  try {
    const snapshot = await db
      .collection('healthCheckIns')
      .where('recipientUid', '==', userUid)
      .where('status', '==', 'pending')
      .orderBy('promptSentAt', 'desc')
      .limit(10)
      .get()

    return snapshot.docs.map((doc) => doc.data() as HealthCheckIn)
  } catch (error) {
    logger.error('Failed to get pending check-ins for user', { userUid, error })
    return []
  }
}

/**
 * Get eligible families for check-in generation.
 *
 * Story 27.5.1 - AC1: 30-day eligibility
 */
export async function getEligibleFamiliesForCheckIn(): Promise<string[]> {
  const db = getDb()
  const eligibleFamilies: string[] = []
  const thirtyDaysAgo = new Date(Date.now() - CHECK_IN_FAMILY_AGE_THRESHOLD_MS)

  try {
    // Query families created more than 30 days ago
    const snapshot = await db
      .collection('families')
      .where('createdAt', '<', thirtyDaysAgo)
      .limit(500)
      .get()

    for (const doc of snapshot.docs) {
      const familyId = doc.id

      // Check if check-in is due
      if (await isCheckInDue(familyId)) {
        eligibleFamilies.push(familyId)
      }
    }

    return eligibleFamilies
  } catch (error) {
    logger.error('Failed to get eligible families', { error })
    return []
  }
}

/**
 * For testing - reset Firestore instance.
 */
export function _resetDbForTesting(): void {
  db = null
}
