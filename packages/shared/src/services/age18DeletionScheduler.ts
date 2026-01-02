/**
 * Age18DeletionScheduler - Story 38.5 Task 5
 *
 * Scheduled function for daily birthdate checks.
 * AC7: Scheduled function executes daily to check birthdates
 */

import { PRE_DELETION_NOTICE_DAYS } from '../contracts/age18Deletion'
import {
  getChildrenTurning18Today,
  getChildrenTurning18InDays,
  executeAge18Deletion,
  deleteAllChildData,
  markDeletionComplete,
  markDeletionProcessing,
  getFailedDeletions,
  markDeletionFailed,
} from './age18DeletionService'
import {
  sendDeletionCompleteNotification,
  sendPreDeletionNotification,
} from './age18NotificationService'
import { getAllBirthdates } from './birthdateService'

// ============================================
// Types
// ============================================

export interface DailyCheckResult {
  childrenChecked: number
  deletionsTriggered: number
  deletionsCompleted: number
  deletionsFailed: number
  notificationsSent: number
}

export interface RetryResult {
  retried: number
  succeeded: number
  failed: number
}

export interface SchedulerStats {
  totalRuns: number
  lastRunAt: Date | null
  totalDeletions: number
  failedDeletions: number
}

export interface LastRunInfo {
  timestamp: Date
  result: DailyCheckResult
}

// ============================================
// Scheduler State
// ============================================

let lastRun: LastRunInfo | null = null
let schedulerStats: SchedulerStats = {
  totalRuns: 0,
  lastRunAt: null,
  totalDeletions: 0,
  failedDeletions: 0,
}

// ============================================
// Scheduled Job Execution Functions (AC7)
// ============================================

/**
 * Execute the daily age-18 check.
 * This is the main scheduled function that runs daily.
 * AC7: Scheduled function executes daily to check birthdates
 */
export function executeDailyAge18Check(): DailyCheckResult {
  const result: DailyCheckResult = {
    childrenChecked: 0,
    deletionsTriggered: 0,
    deletionsCompleted: 0,
    deletionsFailed: 0,
    notificationsSent: 0,
  }

  // Get all birthdates to count checked
  const allBirthdates = getAllBirthdates()
  result.childrenChecked = allBirthdates.length

  // Find children turning 18 today
  const childrenTurning18 = getChildrenTurning18Today()

  // Process each child
  for (const child of childrenTurning18) {
    try {
      // Execute deletion
      executeAge18Deletion(child.childId, child.familyId)
      result.deletionsTriggered++

      // Mark as processing
      markDeletionProcessing(child.childId)

      // Delete all data
      deleteAllChildData(child.childId)

      // Mark as complete
      markDeletionComplete(child.childId)
      result.deletionsCompleted++

      // Send notification
      sendDeletionCompleteNotification(child.childId)
      result.notificationsSent++

      // Update stats
      schedulerStats.totalDeletions++
    } catch (error) {
      // Mark as failed if deletion record was created
      try {
        markDeletionFailed(child.childId)
      } catch {
        // Deletion record may not exist
      }
      result.deletionsFailed++
      schedulerStats.failedDeletions++
    }
  }

  // Update scheduler state
  const now = new Date()
  lastRun = {
    timestamp: now,
    result,
  }

  schedulerStats.totalRuns++
  schedulerStats.lastRunAt = now

  return result
}

/**
 * Send pre-deletion notifications to children approaching 18.
 * Typically run daily, sends notifications 30 days before deletion.
 */
export function sendPreDeletionNotifications(): number {
  const childrenApproaching18 = getChildrenTurning18InDays(PRE_DELETION_NOTICE_DAYS)

  let notificationsSent = 0

  for (const child of childrenApproaching18) {
    try {
      sendPreDeletionNotification(child.childId, PRE_DELETION_NOTICE_DAYS)
      notificationsSent++
    } catch {
      // Log error but continue with other notifications
    }
  }

  return notificationsSent
}

/**
 * Retry failed deletions.
 * Can be run periodically to handle transient failures.
 */
export function retryFailedDeletions(): RetryResult {
  const failedDeletions = getFailedDeletions()

  const result: RetryResult = {
    retried: failedDeletions.length,
    succeeded: 0,
    failed: 0,
  }

  for (const deletion of failedDeletions) {
    try {
      // Mark as processing
      markDeletionProcessing(deletion.childId)

      // Retry deletion
      deleteAllChildData(deletion.childId)

      // Mark as complete
      markDeletionComplete(deletion.childId)
      result.succeeded++

      // Send notification if not already sent
      if (!deletion.notificationSentAt) {
        sendDeletionCompleteNotification(deletion.childId)
      }
    } catch {
      result.failed++
    }
  }

  return result
}

// ============================================
// Scheduler Status Functions
// ============================================

/**
 * Get the last scheduler run info.
 */
export function getLastSchedulerRun(): LastRunInfo | null {
  return lastRun
}

/**
 * Get scheduler statistics.
 */
export function getSchedulerStats(): SchedulerStats {
  return { ...schedulerStats }
}

// ============================================
// Testing Utilities
// ============================================

/**
 * Clear scheduler data (for testing).
 */
export function clearSchedulerData(): void {
  lastRun = null
  schedulerStats = {
    totalRuns: 0,
    lastRunAt: null,
    totalDeletions: 0,
    failedDeletions: 0,
  }
}
