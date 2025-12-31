/**
 * Flag Throttle Service
 *
 * Story 21.3: False Positive Throttling - AC1, AC2, AC6
 *
 * Throttles flag alerts to prevent parent alert fatigue.
 * Tracks daily alert counts per child and prioritizes by severity.
 */

import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import {
  FLAG_THROTTLE_LIMITS,
  type FlagThrottleLevel,
  type FlagThrottleState,
  type ConcernSeverity,
} from '@fledgely/shared'

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

/**
 * Get today's date in YYYY-MM-DD format (UTC)
 */
export function getTodayDateString(): string {
  return new Date().toISOString().split('T')[0]
}

/**
 * Get the throttle state document reference for a child
 */
function getThrottleStateRef(familyId: string, childId: string) {
  return getDb().collection('families').doc(familyId).collection('flagThrottleState').doc(childId)
}

/**
 * Get raw throttle state data from Firestore (not normalized)
 * Returns null if no state exists
 */
async function getRawThrottleStateDate(familyId: string, childId: string): Promise<string | null> {
  const stateRef = getThrottleStateRef(familyId, childId)
  const stateDoc = await stateRef.get()

  if (!stateDoc.exists) {
    return null
  }

  const data = stateDoc.data() as FlagThrottleState
  return data.date
}

/**
 * Get family's throttle level setting (default: 'standard')
 */
export async function getFamilyThrottleLevel(familyId: string): Promise<FlagThrottleLevel> {
  const familyDoc = await getDb().collection('families').doc(familyId).get()

  if (!familyDoc.exists) {
    return 'standard'
  }

  const data = familyDoc.data()
  const level = data?.settings?.flagThrottleLevel

  if (level && FLAG_THROTTLE_LIMITS[level as FlagThrottleLevel] !== undefined) {
    return level as FlagThrottleLevel
  }

  return 'standard'
}

/**
 * Get or create today's throttle state for a child
 */
export async function getThrottleState(
  familyId: string,
  childId: string
): Promise<FlagThrottleState> {
  const stateRef = getThrottleStateRef(familyId, childId)
  const today = getTodayDateString()

  const stateDoc = await stateRef.get()

  if (!stateDoc.exists) {
    // Create fresh state for today
    const newState: FlagThrottleState = {
      childId,
      familyId,
      date: today,
      alertsSentToday: 0,
      throttledToday: 0,
      alertedFlagIds: [],
      severityCounts: { high: 0, medium: 0, low: 0 },
    }
    return newState
  }

  const data = stateDoc.data() as FlagThrottleState

  // Check if state is from today - if not, reset
  if (data.date !== today) {
    const newState: FlagThrottleState = {
      childId,
      familyId,
      date: today,
      alertsSentToday: 0,
      throttledToday: 0,
      alertedFlagIds: [],
      severityCounts: { high: 0, medium: 0, low: 0 },
    }
    return newState
  }

  return data
}

/**
 * Determine if a flag should trigger an alert based on throttle rules
 *
 * AC1: Maximum alerts per child per day based on throttle level
 * AC2: Prioritize by severity (high > medium > low)
 *
 * @param familyId - Family ID
 * @param childId - Child ID
 * @param severity - Severity of the new flag
 * @param flagId - Optional flag ID for deduplication
 * @returns true if alert should be sent, false if throttled
 */
export async function shouldAlertForFlag(
  familyId: string,
  childId: string,
  severity: ConcernSeverity,
  flagId?: string
): Promise<boolean> {
  // Get family's throttle level
  const throttleLevel = await getFamilyThrottleLevel(familyId)
  const maxAlerts = FLAG_THROTTLE_LIMITS[throttleLevel]

  // 'all' level means no throttling
  if (maxAlerts === Infinity) {
    return true
  }

  // Get current throttle state
  const state = await getThrottleState(familyId, childId)

  // Check for duplicate flag
  if (flagId && state.alertedFlagIds.includes(flagId)) {
    return false // Already alerted for this flag
  }

  // Under threshold - always alert
  if (state.alertsSentToday < maxAlerts) {
    return true
  }

  // At threshold - only alert if higher severity than existing alerts
  // High severity can bump if we have low severity alerts
  if (severity === 'high' && state.severityCounts.low > 0) {
    return true
  }

  // Medium severity can bump if we have low severity alerts
  if (severity === 'medium' && state.severityCounts.low > 0) {
    return true
  }

  // At or over threshold with no lower-priority alerts to bump
  return false
}

/**
 * Record that a flag alert was sent
 *
 * AC1: Track daily alert count
 * AC2: Track severity distribution
 *
 * @param familyId - Family ID
 * @param childId - Child ID
 * @param flagId - Flag ID that was alerted
 * @param severity - Severity of the flag
 */
export async function recordFlagAlert(
  familyId: string,
  childId: string,
  flagId: string,
  severity: ConcernSeverity
): Promise<void> {
  const stateRef = getThrottleStateRef(familyId, childId)
  const today = getTodayDateString()

  // Get raw state date to check if it's from today (don't use normalized state)
  const rawDate = await getRawThrottleStateDate(familyId, childId)

  if (rawDate === today) {
    // Update existing state from today
    await stateRef.set(
      {
        alertsSentToday: FieldValue.increment(1),
        alertedFlagIds: FieldValue.arrayUnion(flagId),
        [`severityCounts.${severity}`]: FieldValue.increment(1),
        date: today,
        childId,
        familyId,
      },
      { merge: true }
    )
  } else {
    // Create new state for today (no state exists or state is from different day)
    const newState: FlagThrottleState = {
      childId,
      familyId,
      date: today,
      alertsSentToday: 1,
      throttledToday: 0,
      alertedFlagIds: [flagId],
      severityCounts: {
        high: severity === 'high' ? 1 : 0,
        medium: severity === 'medium' ? 1 : 0,
        low: severity === 'low' ? 1 : 0,
      },
    }
    await stateRef.set(newState)
  }
}

/**
 * Record that a flag was throttled (not alerted)
 *
 * AC6: Track throttled count for dashboard display
 *
 * @param familyId - Family ID
 * @param childId - Child ID
 */
export async function recordThrottledFlag(familyId: string, childId: string): Promise<void> {
  const stateRef = getThrottleStateRef(familyId, childId)
  const today = getTodayDateString()

  // Get raw state date to check if it's from today (don't use normalized state)
  const rawDate = await getRawThrottleStateDate(familyId, childId)

  if (rawDate === today) {
    // Update existing state from today
    await stateRef.set(
      {
        throttledToday: FieldValue.increment(1),
        date: today,
        childId,
        familyId,
      },
      { merge: true }
    )
  } else {
    // Create new state for today (no state exists or state is from different day)
    const newState: FlagThrottleState = {
      childId,
      familyId,
      date: today,
      alertsSentToday: 0,
      throttledToday: 1,
      alertedFlagIds: [],
      severityCounts: { high: 0, medium: 0, low: 0 },
    }
    await stateRef.set(newState)
  }
}

/**
 * Get the count of throttled flags for today
 *
 * AC6: "X additional flags today" shown in dashboard
 *
 * @param familyId - Family ID
 * @param childId - Child ID
 * @returns Number of throttled flags today
 */
export async function getThrottledFlagCount(familyId: string, childId: string): Promise<number> {
  const state = await getThrottleState(familyId, childId)
  const today = getTodayDateString()

  // If state is from a different day, no throttled flags today
  if (state.date !== today) {
    return 0
  }

  return state.throttledToday
}
