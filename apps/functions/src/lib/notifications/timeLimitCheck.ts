/**
 * Time Limit Check Service
 *
 * Story 41.3: Time Limit Notifications - AC1, AC2, AC4, AC5
 *
 * Called after screen time sync to check if notifications should be sent.
 * Checks current usage against limits and triggers appropriate notifications.
 */

import { getFirestore } from 'firebase-admin/firestore'
import * as logger from 'firebase-functions/logger'
import {
  sendTimeLimitWarningNotification,
  sendLimitReachedNotification,
} from './timeLimitNotificationService'
import {
  sendChildTimeLimitWarning,
  sendChildLimitReachedNotification,
} from './childTimeLimitNotification'

// Lazy Firestore initialization for testing
let db: FirebaseFirestore.Firestore | null = null
function getDb(): FirebaseFirestore.Firestore {
  if (!db) {
    db = getFirestore()
  }
  return db
}

/** Reset Firestore instance for testing */
export function _resetDbForTesting(): void {
  db = null
}

/** Warning thresholds in minutes remaining */
const WARNING_THRESHOLDS = [15, 10, 5]

/**
 * Result of checking time limits
 */
export interface TimeLimitCheckResult {
  /** Whether any notification was triggered */
  notificationsTriggered: boolean
  /** Type of notification sent */
  notificationType?: 'warning' | 'limit_reached'
  /** Minutes remaining when warning sent */
  remainingMinutes?: number
  /** Whether limit was reached */
  limitReached: boolean
}

/**
 * Time limit configuration for a child
 */
interface TimeLimitConfig {
  dailyLimitMinutes: number
  enabled: boolean
  dailyBonusMinutes?: Record<string, number>
}

/**
 * Get time limit configuration for a child
 */
async function getTimeLimitConfig(
  familyId: string,
  childId: string
): Promise<TimeLimitConfig | null> {
  const timeLimitsRef = getDb()
    .collection('families')
    .doc(familyId)
    .collection('timeLimits')
    .doc(childId)

  const doc = await timeLimitsRef.get()
  if (!doc.exists) {
    return null
  }

  const data = doc.data()
  return {
    dailyLimitMinutes: data?.dailyLimitMinutes || 120, // Default 2 hours
    enabled: data?.enabled ?? false,
    dailyBonusMinutes: data?.dailyBonusMinutes,
  }
}

/**
 * Get current screen time for a child today
 */
async function getCurrentScreenTime(familyId: string, childId: string): Promise<number> {
  const today = new Date().toISOString().split('T')[0]
  const screenTimeRef = getDb()
    .collection('families')
    .doc(familyId)
    .collection('children')
    .doc(childId)
    .collection('screenTime')
    .doc(today)

  const doc = await screenTimeRef.get()
  if (!doc.exists) {
    return 0
  }

  return doc.data()?.totalMinutes || 0
}

/**
 * Get child name for notifications
 */
async function getChildName(familyId: string, childId: string): Promise<string> {
  const childRef = getDb().collection('families').doc(familyId).collection('children').doc(childId)

  const doc = await childRef.get()
  if (!doc.exists) {
    return 'Your child'
  }

  return doc.data()?.displayName || doc.data()?.name || 'Your child'
}

/**
 * Get the last warning threshold that was sent today
 */
async function getLastWarningSent(familyId: string, childId: string): Promise<number | null> {
  const today = new Date().toISOString().split('T')[0]
  const warningRef = getDb()
    .collection('families')
    .doc(familyId)
    .collection('timeLimitWarnings')
    .doc(`${childId}-${today}`)

  const doc = await warningRef.get()
  if (!doc.exists) {
    return null
  }

  return doc.data()?.lastWarningThreshold || null
}

/**
 * Record that a warning was sent
 */
async function recordWarningSent(
  familyId: string,
  childId: string,
  threshold: number
): Promise<void> {
  const today = new Date().toISOString().split('T')[0]
  const warningRef = getDb()
    .collection('families')
    .doc(familyId)
    .collection('timeLimitWarnings')
    .doc(`${childId}-${today}`)

  await warningRef.set({
    childId,
    date: today,
    lastWarningThreshold: threshold,
    updatedAt: Date.now(),
  })
}

/**
 * Check if limit reached notification was already sent today
 */
async function wasLimitReachedSentToday(familyId: string, childId: string): Promise<boolean> {
  const today = new Date().toISOString().split('T')[0]
  const limitRef = getDb()
    .collection('families')
    .doc(familyId)
    .collection('timeLimitReached')
    .doc(`${childId}-${today}`)

  const doc = await limitRef.get()
  return doc.exists
}

/**
 * Record that limit reached notification was sent
 */
async function recordLimitReachedSent(familyId: string, childId: string): Promise<void> {
  const today = new Date().toISOString().split('T')[0]
  const limitRef = getDb()
    .collection('families')
    .doc(familyId)
    .collection('timeLimitReached')
    .doc(`${childId}-${today}`)

  await limitRef.set({
    childId,
    date: today,
    sentAt: Date.now(),
  })
}

/**
 * Check time limits and send notifications if needed
 *
 * Call this after screen time sync to check if notifications should be sent.
 */
export async function checkTimeLimitsAndNotify(
  familyId: string,
  childId: string
): Promise<TimeLimitCheckResult> {
  logger.info('Checking time limits', { familyId, childId })

  // Get time limit config
  const config = await getTimeLimitConfig(familyId, childId)
  if (!config || !config.enabled) {
    logger.info('Time limits not configured or disabled', { familyId, childId })
    return { notificationsTriggered: false, limitReached: false }
  }

  // Get current usage
  const currentMinutes = await getCurrentScreenTime(familyId, childId)

  // Calculate effective limit (including any bonus time)
  const today = new Date().toISOString().split('T')[0]
  const bonusMinutes = config.dailyBonusMinutes?.[today] || 0
  const effectiveLimit = config.dailyLimitMinutes + bonusMinutes
  const remainingMinutes = Math.max(0, effectiveLimit - currentMinutes)

  logger.info('Time limit check', {
    familyId,
    childId,
    currentMinutes,
    effectiveLimit,
    remainingMinutes,
    bonusMinutes,
  })

  // Get child name for notifications
  const childName = await getChildName(familyId, childId)

  // Check if limit reached
  if (remainingMinutes === 0) {
    // Check if we already sent limit reached notification today
    const alreadySent = await wasLimitReachedSentToday(familyId, childId)
    if (alreadySent) {
      logger.info('Limit reached notification already sent today', { familyId, childId })
      return { notificationsTriggered: false, limitReached: true }
    }

    // Send limit reached notifications
    await Promise.all([
      sendLimitReachedNotification({
        childId,
        childName,
        familyId,
        limitType: 'daily_total',
        currentMinutes,
        allowedMinutes: effectiveLimit,
      }),
      sendChildLimitReachedNotification(childId),
    ])

    await recordLimitReachedSent(familyId, childId)

    logger.info('Limit reached notifications sent', { familyId, childId })

    return {
      notificationsTriggered: true,
      notificationType: 'limit_reached',
      limitReached: true,
    }
  }

  // Check warning thresholds (only if not at limit)
  const lastWarning = await getLastWarningSent(familyId, childId)

  // Find the lowest applicable warning threshold
  // Thresholds are [15, 10, 5] - we want the lowest one that applies to current remaining time
  let applicableThreshold: number | null = null
  for (const threshold of WARNING_THRESHOLDS) {
    if (remainingMinutes <= threshold) {
      applicableThreshold = threshold
      // Keep iterating to find lower thresholds that also apply
    }
  }

  if (applicableThreshold !== null) {
    // Find the lowest threshold that we haven't sent yet
    // Thresholds are ordered [15, 10, 5] - find lowest applicable
    for (const threshold of [...WARNING_THRESHOLDS].reverse()) {
      if (remainingMinutes <= threshold) {
        // Check if we already sent this or a lower threshold
        if (lastWarning !== null && lastWarning <= threshold) {
          continue // Already sent at this level, try next lower threshold
        }

        // Send warning notifications
        await Promise.all([
          sendTimeLimitWarningNotification({
            childId,
            childName,
            familyId,
            limitType: 'daily_total',
            currentMinutes,
            allowedMinutes: effectiveLimit,
            remainingMinutes,
          }),
          sendChildTimeLimitWarning(childId, remainingMinutes),
        ])

        await recordWarningSent(familyId, childId, threshold)

        logger.info('Warning notifications sent', {
          familyId,
          childId,
          threshold,
          remainingMinutes,
        })

        return {
          notificationsTriggered: true,
          notificationType: 'warning',
          remainingMinutes,
          limitReached: false,
        }
      }
    }

    // All applicable thresholds already sent
    logger.info('All applicable warning thresholds already sent', {
      familyId,
      childId,
      lastWarning,
      remainingMinutes,
    })
    return { notificationsTriggered: false, limitReached: false }
  }

  // No notifications needed
  return { notificationsTriggered: false, limitReached: false }
}
