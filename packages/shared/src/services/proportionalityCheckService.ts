/**
 * ProportionalityCheckService - Story 38.4 Task 2
 *
 * Service for managing proportionality checks.
 * AC1: Annual prompt triggered after 12+ months of active monitoring
 * AC7: Ensures monitoring doesn't outlast its necessity
 */

import {
  type ProportionalityCheck,
  type CheckTrigger,
  createInitialCheck,
  isCheckExpired,
  PROPORTIONALITY_CHECK_INTERVAL_MONTHS,
} from '../contracts/proportionalityCheck'

// ============================================
// In-memory stores (would be replaced with database)
// ============================================

const checkStore: Map<string, ProportionalityCheck> = new Map()
const childCheckIndex: Map<string, string[]> = new Map()
const familyCheckIndex: Map<string, string[]> = new Map()

// ============================================
// Helper Functions
// ============================================

/**
 * Generate unique ID for check.
 */
function generateCheckId(): string {
  return `prop-check-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
}

/**
 * Calculate months between two dates.
 */
function monthsBetween(startDate: Date, endDate: Date): number {
  const start = new Date(startDate)
  const end = new Date(endDate)

  const years = end.getFullYear() - start.getFullYear()
  const months = end.getMonth() - start.getMonth()

  return Math.max(0, years * 12 + months)
}

// ============================================
// Eligibility Functions
// ============================================

/**
 * Check if a child is eligible for a proportionality check.
 * Eligible if monitoring has been active for 12+ months.
 *
 * AC1: Annual prompt triggered after 12+ months
 */
export function isEligibleForProportionalityCheck(
  childId: string,
  monitoringStartDate: Date
): boolean {
  const months = getMonitoringDurationMonths(monitoringStartDate)
  return months >= PROPORTIONALITY_CHECK_INTERVAL_MONTHS
}

/**
 * Get the number of months since monitoring started.
 */
export function getMonitoringDurationMonths(monitoringStartDate: Date): number {
  return monthsBetween(monitoringStartDate, new Date())
}

/**
 * Check if a check is overdue for a child.
 * A check is overdue if:
 * - Child is eligible (12+ months monitoring)
 * - No active (pending/in_progress) check exists
 */
export function isCheckOverdue(childId: string, monitoringStartDate: Date): boolean {
  // Not eligible yet
  if (!isEligibleForProportionalityCheck(childId, monitoringStartDate)) {
    return false
  }

  // Has active check
  const activeCheck = getActiveCheckForChild(childId)
  if (activeCheck) {
    return false
  }

  return true
}

// ============================================
// Lifecycle Functions
// ============================================

/**
 * Create a new proportionality check for a child.
 *
 * @throws Error if child already has an active check
 */
export function createProportionalityCheck(
  familyId: string,
  childId: string,
  monitoringStartDate: Date,
  triggerType: CheckTrigger
): ProportionalityCheck {
  // Check for existing active check
  const existingCheck = getActiveCheckForChild(childId)
  if (existingCheck) {
    throw new Error(`Active proportionality check already exists for child ${childId}`)
  }

  // Create check
  const id = generateCheckId()
  const check = createInitialCheck(id, familyId, childId, monitoringStartDate, triggerType)

  // Store check
  checkStore.set(id, check)

  // Update indexes
  const childChecks = childCheckIndex.get(childId) || []
  childChecks.push(id)
  childCheckIndex.set(childId, childChecks)

  const familyChecks = familyCheckIndex.get(familyId) || []
  familyChecks.push(id)
  familyCheckIndex.set(familyId, familyChecks)

  return check
}

/**
 * Expire overdue checks.
 * Returns the count of checks that were expired.
 */
export function expireOverdueChecks(): number {
  let expiredCount = 0

  for (const [id, check] of checkStore) {
    if (isCheckExpired(check) && check.status !== 'expired') {
      const expiredCheck: ProportionalityCheck = {
        ...check,
        status: 'expired',
      }
      checkStore.set(id, expiredCheck)
      expiredCount++
    }
  }

  return expiredCount
}

// ============================================
// Query Functions
// ============================================

/**
 * Get active check for a child (pending or in_progress).
 */
export function getActiveCheckForChild(childId: string): ProportionalityCheck | null {
  const checkIds = childCheckIndex.get(childId) || []

  for (const id of checkIds) {
    const check = checkStore.get(id)
    if (check && (check.status === 'pending' || check.status === 'in_progress')) {
      return check
    }
  }

  return null
}

/**
 * Get all pending checks for a family.
 */
export function getPendingChecksForFamily(familyId: string): ProportionalityCheck[] {
  const checkIds = familyCheckIndex.get(familyId) || []

  return checkIds
    .map((id) => checkStore.get(id))
    .filter((check): check is ProportionalityCheck => {
      return check !== undefined && (check.status === 'pending' || check.status === 'in_progress')
    })
}

/**
 * Get check history for a child (all checks).
 */
export function getCheckHistory(childId: string): ProportionalityCheck[] {
  const checkIds = childCheckIndex.get(childId) || []

  return checkIds
    .map((id) => checkStore.get(id))
    .filter((check): check is ProportionalityCheck => check !== undefined)
}

/**
 * Get a check by ID.
 */
export function getCheckById(checkId: string): ProportionalityCheck | null {
  return checkStore.get(checkId) || null
}

/**
 * Update check status to in_progress.
 */
export function markCheckInProgress(checkId: string): ProportionalityCheck {
  const check = checkStore.get(checkId)
  if (!check) {
    throw new Error(`Check not found: ${checkId}`)
  }

  const updated: ProportionalityCheck = {
    ...check,
    status: 'in_progress',
  }

  checkStore.set(checkId, updated)
  return updated
}

/**
 * Mark check as completed.
 */
export function markCheckCompleted(checkId: string): ProportionalityCheck {
  const check = checkStore.get(checkId)
  if (!check) {
    throw new Error(`Check not found: ${checkId}`)
  }

  const updated: ProportionalityCheck = {
    ...check,
    status: 'completed',
    checkCompletedDate: new Date(),
  }

  checkStore.set(checkId, updated)
  return updated
}

// ============================================
// Utility Functions
// ============================================

/**
 * Clear all stored data (for testing).
 */
export function clearAllCheckData(): void {
  checkStore.clear()
  childCheckIndex.clear()
  familyCheckIndex.clear()
}

/**
 * Get statistics for testing/debugging.
 */
export function getCheckStats(): {
  total: number
  byStatus: Record<ProportionalityCheck['status'], number>
} {
  const allChecks = Array.from(checkStore.values())

  const byStatus: Record<ProportionalityCheck['status'], number> = {
    pending: 0,
    in_progress: 0,
    completed: 0,
    expired: 0,
  }

  for (const check of allChecks) {
    byStatus[check.status]++
  }

  return {
    total: allChecks.length,
    byStatus,
  }
}
