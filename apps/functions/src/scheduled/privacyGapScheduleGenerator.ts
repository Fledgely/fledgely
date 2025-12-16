/**
 * Privacy Gap Schedule Generator
 *
 * Story 7.8: Privacy Gaps Injection - Task 5
 *
 * Scheduled Firebase function that generates daily privacy gap schedules
 * for all children with monitoring enabled.
 *
 * Runs at midnight (00:00) to generate schedules for the upcoming day.
 * Schedules are stored in Firestore with 24-hour TTL.
 *
 * CRITICAL: Uses secure random number generation via seeded PRNG.
 * The seed is deterministic but unpredictable (childId + date).
 */

import { onSchedule, type ScheduledEvent } from 'firebase-functions/v2/scheduler'
import { getFirestore, Timestamp, FieldValue } from 'firebase-admin/firestore'
import { logger } from 'firebase-functions/v2'
import {
  generateDailyGapSchedule,
  type GapScheduleResult,
} from '@fledgely/shared'
import {
  PRIVACY_GAPS_CONSTANTS,
  isPrivacyGapsEnabled,
  type PrivacyGapSchedule,
  type ChildPrivacyGapsConfig,
} from '@fledgely/contracts'

// ============================================================================
// Types
// ============================================================================

/**
 * Child document with privacy gaps config
 */
interface ChildWithPrivacyConfig {
  id: string
  privacyGapsConfig?: ChildPrivacyGapsConfig | null
}

/**
 * Result of schedule generation for a single child
 */
interface ChildScheduleResult {
  childId: string
  success: boolean
  gapCount?: number
  error?: string
}

/**
 * Result of the scheduled function run
 */
export interface ScheduleGeneratorResult {
  generatedAt: string
  targetDate: string
  totalChildren: number
  successCount: number
  failureCount: number
  skippedCount: number
  results: ChildScheduleResult[]
}

// ============================================================================
// Firestore Operations
// ============================================================================

/**
 * Get all children with monitoring enabled
 *
 * In production, this would filter by children with active monitoring.
 * For now, we get all children and check their privacy gaps config.
 */
export async function getChildrenWithMonitoring(
  db: FirebaseFirestore.Firestore
): Promise<ChildWithPrivacyConfig[]> {
  const childrenRef = db.collection('children')
  const snapshot = await childrenRef.get()

  const children: ChildWithPrivacyConfig[] = []
  snapshot.forEach((doc) => {
    const data = doc.data()
    children.push({
      id: doc.id,
      privacyGapsConfig: data.privacyGapsConfig as ChildPrivacyGapsConfig | undefined,
    })
  })

  return children
}

/**
 * Store a privacy gap schedule in Firestore
 *
 * Structure: privacy-gap-schedules/{childId}/{date}
 *
 * @param db - Firestore instance
 * @param schedule - The generated schedule
 */
export async function storeSchedule(
  db: FirebaseFirestore.Firestore,
  schedule: GapScheduleResult
): Promise<void> {
  const docRef = db
    .collection(PRIVACY_GAPS_CONSTANTS.SCHEDULE_COLLECTION)
    .doc(schedule.childId)
    .collection('schedules')
    .doc(schedule.date)

  await docRef.set({
    childId: schedule.childId,
    date: schedule.date,
    gaps: schedule.gaps,
    generatedAt: Timestamp.fromDate(schedule.generatedAt),
    expiresAt: Timestamp.fromDate(schedule.expiresAt),
    // TTL field for Firestore automatic cleanup (if configured)
    ttl: Timestamp.fromDate(schedule.expiresAt),
  })
}

/**
 * Delete expired schedules for a child
 *
 * Cleans up schedules older than the TTL to maintain data hygiene.
 */
export async function deleteExpiredSchedules(
  db: FirebaseFirestore.Firestore,
  childId: string
): Promise<number> {
  const now = Timestamp.now()
  const schedulesRef = db
    .collection(PRIVACY_GAPS_CONSTANTS.SCHEDULE_COLLECTION)
    .doc(childId)
    .collection('schedules')

  const expiredQuery = schedulesRef.where('expiresAt', '<', now)
  const expiredSnapshot = await expiredQuery.get()

  let deletedCount = 0
  const batch = db.batch()

  expiredSnapshot.forEach((doc) => {
    batch.delete(doc.ref)
    deletedCount++
  })

  if (deletedCount > 0) {
    await batch.commit()
  }

  return deletedCount
}

/**
 * Get a schedule for a specific child and date
 *
 * Used by the privacy gap detector to check if a timestamp is within a gap.
 */
export async function getSchedule(
  db: FirebaseFirestore.Firestore,
  childId: string,
  date: string
): Promise<PrivacyGapSchedule | null> {
  const docRef = db
    .collection(PRIVACY_GAPS_CONSTANTS.SCHEDULE_COLLECTION)
    .doc(childId)
    .collection('schedules')
    .doc(date)

  const doc = await docRef.get()

  if (!doc.exists) {
    return null
  }

  const data = doc.data()
  if (!data) {
    return null
  }

  return {
    childId: data.childId,
    date: data.date,
    gaps: data.gaps,
    generatedAt: (data.generatedAt as Timestamp).toDate(),
    expiresAt: (data.expiresAt as Timestamp).toDate(),
  }
}

// ============================================================================
// Schedule Generation
// ============================================================================

/**
 * Generate schedule for a single child
 */
export async function generateScheduleForChild(
  db: FirebaseFirestore.Firestore,
  child: ChildWithPrivacyConfig,
  targetDate: Date
): Promise<ChildScheduleResult> {
  // Check if privacy gaps are enabled for this child
  if (!isPrivacyGapsEnabled(child.privacyGapsConfig)) {
    return {
      childId: child.id,
      success: true,
      gapCount: 0,
      error: 'Privacy gaps disabled',
    }
  }

  try {
    // Generate the schedule
    const schedule = generateDailyGapSchedule(child.id, targetDate)

    // Store in Firestore
    await storeSchedule(db, schedule)

    // Clean up expired schedules
    await deleteExpiredSchedules(db, child.id)

    return {
      childId: child.id,
      success: true,
      gapCount: schedule.gaps.length,
    }
  } catch (error) {
    return {
      childId: child.id,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Generate schedules for all children
 *
 * This is the main function called by the scheduled trigger.
 */
export async function generateAllSchedules(
  db: FirebaseFirestore.Firestore,
  targetDate: Date
): Promise<ScheduleGeneratorResult> {
  const children = await getChildrenWithMonitoring(db)
  const results: ChildScheduleResult[] = []

  let successCount = 0
  let failureCount = 0
  let skippedCount = 0

  // Process children in parallel with concurrency limit
  const BATCH_SIZE = 10
  for (let i = 0; i < children.length; i += BATCH_SIZE) {
    const batch = children.slice(i, i + BATCH_SIZE)
    const batchResults = await Promise.all(
      batch.map((child) => generateScheduleForChild(db, child, targetDate))
    )

    for (const result of batchResults) {
      results.push(result)
      if (result.success) {
        if (result.gapCount === 0) {
          skippedCount++
        } else {
          successCount++
        }
      } else {
        failureCount++
      }
    }
  }

  return {
    generatedAt: new Date().toISOString(),
    targetDate: targetDate.toISOString().slice(0, 10),
    totalChildren: children.length,
    successCount,
    failureCount,
    skippedCount,
    results,
  }
}

// ============================================================================
// Scheduled Function
// ============================================================================

/**
 * Privacy Gap Schedule Generator - Scheduled Function
 *
 * Runs daily at midnight to generate gap schedules for the upcoming day.
 *
 * Schedule: Every day at 00:00 (midnight)
 * Timezone: UTC (children's local timezones handled by gap timing)
 */
export const privacyGapScheduleGenerator = onSchedule(
  {
    schedule: 'every day 00:00',
    timeZone: 'UTC',
    region: 'us-central1',
    memory: '256MiB',
    timeoutSeconds: 540, // 9 minutes (under 10 minute limit)
    retryCount: 3,
  },
  async (_event: ScheduledEvent) => {
    const db = getFirestore()

    // Generate schedules for tomorrow (gives time for distribution)
    const tomorrow = new Date()
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1)
    tomorrow.setUTCHours(0, 0, 0, 0)

    logger.info('Starting privacy gap schedule generation', {
      targetDate: tomorrow.toISOString().slice(0, 10),
    })

    try {
      const result = await generateAllSchedules(db, tomorrow)

      // Log summary (no PII - just counts)
      logger.info('Privacy gap schedule generation complete', {
        targetDate: result.targetDate,
        totalChildren: result.totalChildren,
        successCount: result.successCount,
        failureCount: result.failureCount,
        skippedCount: result.skippedCount,
      })

      if (result.failureCount > 0) {
        logger.warn('Some schedules failed to generate', {
          failureCount: result.failureCount,
          // Don't log child IDs - privacy
        })
      }
    } catch (error) {
      logger.error('Privacy gap schedule generation failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      })
      throw error // Re-throw to trigger retry
    }
  }
)

// ============================================================================
// Exports for Testing
// ============================================================================

export const __testing = {
  getChildrenWithMonitoring,
  storeSchedule,
  deleteExpiredSchedules,
  getSchedule,
  generateScheduleForChild,
  generateAllSchedules,
}
