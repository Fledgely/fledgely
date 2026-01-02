/**
 * Age18DeletionService - Story 38.5 Task 3
 *
 * Service for automatic deletion when child turns 18.
 * AC2: When child turns 18, all monitoring data is automatically deleted (INV-005)
 * AC3: Deletion is complete and irreversible
 * AC4: Deletion includes: screenshots, flags, activity logs, trust history
 * AC5: Deletion occurs regardless of parent wishes
 * AC7: Scheduled function executes daily to check birthdates
 */

import type { Age18DeletionRecord, DeletionDataType } from '../contracts/age18Deletion'
import { createAge18DeletionRecord, ALL_DELETION_DATA_TYPES } from '../contracts/age18Deletion'
import { getAllBirthdates, getBirthdate, is18OrOlder, getDaysUntil18 } from './birthdateService'

// ============================================
// In-memory stores (would be replaced with database)
// ============================================

const deletionRecordStore: Map<string, Age18DeletionRecord> = new Map()

// ============================================
// Types
// ============================================

export interface ChildTurning18 {
  childId: string
  familyId: string
  birthdate: Date
}

export interface DeletionResult {
  dataTypesDeleted: DeletionDataType[]
  recordsDeleted: number
}

// ============================================
// Find Children Turning 18 Functions (AC7)
// ============================================

/**
 * Get children turning 18 today.
 * Used by the daily scheduled function.
 */
export function getChildrenTurning18Today(): ChildTurning18[] {
  const allBirthdates = getAllBirthdates()
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  return allBirthdates
    .filter((record) => {
      const birthdate = new Date(record.birthdate)
      // Check if this is the exact 18th birthday
      const eighteenthBirthday = new Date(birthdate)
      eighteenthBirthday.setFullYear(birthdate.getFullYear() + 18)
      eighteenthBirthday.setHours(0, 0, 0, 0)

      return eighteenthBirthday.getTime() === today.getTime()
    })
    .map((record) => ({
      childId: record.childId,
      familyId: record.familyId,
      birthdate: record.birthdate,
    }))
}

/**
 * Get children turning 18 in a specific number of days.
 * Used for pre-deletion notifications (e.g., 30 days before).
 */
export function getChildrenTurning18InDays(days: number): ChildTurning18[] {
  const allBirthdates = getAllBirthdates()

  return allBirthdates
    .filter((record) => {
      const daysUntil = getDaysUntil18(record.birthdate)
      return daysUntil === days
    })
    .map((record) => ({
      childId: record.childId,
      familyId: record.familyId,
      birthdate: record.birthdate,
    }))
}

/**
 * Get all children with birthday today (any age).
 * Useful for anniversary calculations.
 */
export function getChildrenWithBirthdateToday(): ChildTurning18[] {
  const allBirthdates = getAllBirthdates()
  const today = new Date()
  const todayMonth = today.getMonth()
  const todayDate = today.getDate()

  return allBirthdates
    .filter((record) => {
      const birthdate = new Date(record.birthdate)
      return birthdate.getMonth() === todayMonth && birthdate.getDate() === todayDate
    })
    .map((record) => ({
      childId: record.childId,
      familyId: record.familyId,
      birthdate: record.birthdate,
    }))
}

// ============================================
// Execute Deletion Functions (AC2, AC3, AC4, AC5)
// ============================================

/**
 * Execute age-18 deletion for a child.
 * AC2: When child turns 18, all monitoring data is automatically deleted (INV-005)
 * AC5: Deletion occurs regardless of parent wishes - no consent parameter
 */
export function executeAge18Deletion(childId: string, familyId: string): Age18DeletionRecord {
  // Get and validate birthdate
  const birthdateRecord = getBirthdate(childId)
  if (!birthdateRecord) {
    throw new Error(`Birthdate not found for child: ${childId}`)
  }

  // Verify child is 18 or older
  if (!is18OrOlder(birthdateRecord.birthdate)) {
    throw new Error(`Child ${childId} is not 18 yet - deletion not allowed`)
  }

  // Create deletion record
  const deletionRecord = createAge18DeletionRecord(childId, familyId, birthdateRecord.birthdate)

  // Store the record
  deletionRecordStore.set(childId, deletionRecord)

  return deletionRecord
}

/**
 * Delete all data for a child.
 * AC3: Deletion is complete and irreversible
 * AC4: Includes screenshots, flags, activity logs, trust history
 *
 * Note: In real implementation, this would call actual deletion
 * functions for each data type. Here we simulate the deletion.
 */
export function deleteAllChildData(_childId: string): DeletionResult {
  // In real implementation, would delete from each data store:
  // - deleteScreenshots(childId)
  // - deleteFlags(childId)
  // - deleteActivityLogs(childId)
  // - deleteTrustHistory(childId)
  // - deleteChildProfile(childId)
  // - deleteAgreements(childId)
  // - deleteDevices(childId)

  // Simulate deletion
  const dataTypesDeleted = [...ALL_DELETION_DATA_TYPES]

  // In real implementation, would return actual count of records deleted
  const recordsDeleted = dataTypesDeleted.length * 10 // Simulated count

  return {
    dataTypesDeleted,
    recordsDeleted,
  }
}

/**
 * Mark deletion as complete.
 */
export function markDeletionComplete(childId: string): Age18DeletionRecord {
  const record = deletionRecordStore.get(childId)
  if (!record) {
    throw new Error(`Deletion record not found for child: ${childId}`)
  }

  const updated: Age18DeletionRecord = {
    ...record,
    status: 'completed',
    deletionCompletedAt: new Date(),
  }

  deletionRecordStore.set(childId, updated)
  return updated
}

/**
 * Mark deletion as failed.
 */
export function markDeletionFailed(childId: string): Age18DeletionRecord {
  const record = deletionRecordStore.get(childId)
  if (!record) {
    throw new Error(`Deletion record not found for child: ${childId}`)
  }

  const updated: Age18DeletionRecord = {
    ...record,
    status: 'failed',
  }

  deletionRecordStore.set(childId, updated)
  return updated
}

/**
 * Mark deletion as processing.
 */
export function markDeletionProcessing(childId: string): Age18DeletionRecord {
  const record = deletionRecordStore.get(childId)
  if (!record) {
    throw new Error(`Deletion record not found for child: ${childId}`)
  }

  const updated: Age18DeletionRecord = {
    ...record,
    status: 'processing',
  }

  deletionRecordStore.set(childId, updated)
  return updated
}

// ============================================
// Query Functions
// ============================================

/**
 * Get deletion record for a child.
 */
export function getDeletionRecord(childId: string): Age18DeletionRecord | null {
  return deletionRecordStore.get(childId) || null
}

/**
 * Get all deletion history.
 */
export function getAge18DeletionHistory(): Age18DeletionRecord[] {
  return Array.from(deletionRecordStore.values())
}

/**
 * Get pending deletions.
 */
export function getPendingDeletions(): Age18DeletionRecord[] {
  return Array.from(deletionRecordStore.values()).filter((record) => record.status === 'pending')
}

/**
 * Get failed deletions.
 */
export function getFailedDeletions(): Age18DeletionRecord[] {
  return Array.from(deletionRecordStore.values()).filter((record) => record.status === 'failed')
}

// ============================================
// Testing Utilities
// ============================================

/**
 * Clear all deletion data (for testing).
 */
export function clearAllAge18DeletionData(): void {
  deletionRecordStore.clear()
}
