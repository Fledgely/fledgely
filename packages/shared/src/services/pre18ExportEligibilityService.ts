/**
 * Pre18 Export Eligibility Service - Story 38.6 Task 5
 *
 * Service for checking if export is available for child approaching 18.
 * AC1: Parent notified "Data will be deleted in 30 days"
 * AC2: Export option available
 */

import { PRE_DELETION_NOTICE_DAYS } from '../contracts/age18Deletion'
import { getDaysUntil18, is18OrOlder, get18thBirthdayDate } from './birthdateService'

// ============================================
// Types
// ============================================

export interface ChildEligibility {
  childId: string
  daysUntil18: number
  eighteenthBirthday: Date
}

export interface ExportEligibilityWindow {
  start: Date
  end: Date
}

// ============================================
// Test Data Storage (would use birthdateService in production)
// ============================================

const testBirthdateStore = new Map<string, Date>()

// ============================================
// Eligibility Functions (AC1, AC2)
// ============================================

/**
 * Check if a child is eligible for pre-18 data export.
 * AC1, AC2: Export available when child approaching 18
 *
 * @param childId - The child's ID
 * @returns True if child is within export window (30 days of turning 18)
 */
export function isEligibleForPre18Export(childId: string): boolean {
  const birthdate = testBirthdateStore.get(childId)

  if (!birthdate) {
    return false
  }

  // Already 18 or older - not eligible (data should already be deleted)
  if (is18OrOlder(birthdate)) {
    return false
  }

  // Check if within 30 days of turning 18
  const daysUntil = getDaysUntil18(birthdate)

  return daysUntil >= 0 && daysUntil <= PRE_DELETION_NOTICE_DAYS
}

/**
 * Get the export eligibility window for a child.
 *
 * @param childId - The child's ID
 * @returns The window or null if not eligible
 */
export function getExportEligibilityWindow(childId: string): ExportEligibilityWindow | null {
  const birthdate = testBirthdateStore.get(childId)

  if (!birthdate) {
    return null
  }

  const daysUntil = getDaysUntil18(birthdate)

  // Not within 30 days - no window
  if (daysUntil < 0 || daysUntil > PRE_DELETION_NOTICE_DAYS) {
    return null
  }

  const eighteenthBirthday = get18thBirthdayDate(birthdate)

  // Window starts 30 days before 18th birthday
  const start = new Date(eighteenthBirthday)
  start.setDate(start.getDate() - PRE_DELETION_NOTICE_DAYS)

  return {
    start,
    end: eighteenthBirthday,
  }
}

/**
 * Get all children eligible for export.
 *
 * @returns Array of eligible children with their details
 */
export function getChildrenEligibleForExport(): ChildEligibility[] {
  const eligible: ChildEligibility[] = []

  for (const [childId, birthdate] of testBirthdateStore) {
    if (isEligibleForPre18Export(childId)) {
      const daysUntil = getDaysUntil18(birthdate)
      const eighteenthBirthday = get18thBirthdayDate(birthdate)

      eligible.push({
        childId,
        daysUntil18: daysUntil,
        eighteenthBirthday,
      })
    }
  }

  return eligible
}

// ============================================
// Days Until Deletion Functions
// ============================================

/**
 * Get days until data deletion for a child.
 * Data is deleted on 18th birthday.
 *
 * @param childId - The child's ID
 * @returns Days until deletion (negative if already 18)
 */
export function getDaysUntilDataDeletion(childId: string): number {
  const birthdate = testBirthdateStore.get(childId)

  if (!birthdate) {
    return Infinity
  }

  return getDaysUntil18(birthdate)
}

/**
 * Check if child is within the export window.
 *
 * @param childId - The child's ID
 * @returns True if in export window
 */
export function isInExportWindow(childId: string): boolean {
  return isEligibleForPre18Export(childId)
}

// ============================================
// Testing Utilities
// ============================================

/**
 * Set child birthdate for testing.
 *
 * @param childId - The child's ID
 * @param birthdate - The birthdate
 */
export function setChildBirthdateForTest(childId: string, birthdate: Date): void {
  testBirthdateStore.set(childId, birthdate)
}

/**
 * Clear eligibility test data.
 */
export function clearEligibilityTestData(): void {
  testBirthdateStore.clear()
}

/**
 * Get test store size.
 */
export function getTestStoreSize(): number {
  return testBirthdateStore.size
}
