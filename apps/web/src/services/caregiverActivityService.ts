/**
 * Caregiver Activity Service
 *
 * Story 39.6: Caregiver Action Logging - AC1, AC2, AC3, AC5
 * Provides functions to fetch, aggregate, and subscribe to caregiver activity logs.
 *
 * Used for:
 * - Parent dashboard showing "Grandma: 2 time extensions, 1 flag viewed"
 * - Child transparency view of caregiver actions
 * - Real-time activity updates
 */

import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
  onSnapshot,
  limit as firestoreLimit,
  type Unsubscribe,
  type QueryConstraint,
} from 'firebase/firestore'
import { getFirestoreDb } from '../lib/firebase'
import type {
  CaregiverAuditLog,
  CaregiverAuditAction,
  CaregiverActionCounts,
  CaregiverActivitySummary,
} from '@fledgely/shared'

/**
 * Parameters for querying caregiver activity logs
 */
export interface GetActivityParams {
  /** Family ID to query */
  familyId: string
  /** Optional: Filter by specific caregiver UID */
  caregiverUid?: string
  /** Optional: Filter by specific child ID */
  childUid?: string
  /** Optional: Filter by action type */
  action?: CaregiverAuditAction
  /** Optional: Start date for filtering */
  startDate?: Date
  /** Optional: End date for filtering */
  endDate?: Date
  /** Maximum number of results (default: 100) */
  limit?: number
}

/**
 * Fetch caregiver activity logs for a family.
 *
 * Story 39.6: AC1, AC2 - Query caregiver audit logs
 *
 * @param params - Query parameters
 * @returns Array of caregiver audit logs
 */
export async function getCaregiverActivity(
  params: GetActivityParams
): Promise<CaregiverAuditLog[]> {
  const { familyId, caregiverUid, childUid, action, startDate, endDate, limit = 100 } = params

  const db = getFirestoreDb()
  const auditLogsRef = collection(db, 'caregiverAuditLogs')

  // Build query constraints dynamically
  const constraints: QueryConstraint[] = [where('familyId', '==', familyId)]

  // Add caregiver filter if specified (Firestore can combine with familyId)
  if (caregiverUid) {
    constraints.push(where('caregiverUid', '==', caregiverUid))
  }

  // Add action filter if specified (Firestore can combine with familyId)
  if (action) {
    constraints.push(where('action', '==', action))
  }

  // Add ordering and limit
  constraints.push(orderBy('createdAt', 'desc'))
  constraints.push(firestoreLimit(limit * 2)) // Fetch extra for client-side filtering

  // Build and execute query
  const q = query(auditLogsRef, ...constraints)

  // Execute query
  const snapshot = await getDocs(q)

  // Filter and transform results
  const logs: CaregiverAuditLog[] = []

  snapshot.forEach((doc) => {
    const data = doc.data()

    // Apply additional filters that can't be combined in Firestore query
    if (caregiverUid && data.caregiverUid !== caregiverUid) return
    if (childUid && data.childUid !== childUid) return
    if (action && data.action !== action) return

    // Handle both Firestore Timestamp and objects with toDate() method
    const createdAt =
      data.createdAt && typeof data.createdAt.toDate === 'function'
        ? data.createdAt.toDate()
        : data.createdAt instanceof Date
          ? data.createdAt
          : new Date()

    if (startDate && createdAt < startDate) return
    if (endDate && createdAt > endDate) return

    logs.push({
      id: doc.id,
      familyId: data.familyId,
      caregiverUid: data.caregiverUid,
      caregiverName: data.caregiverName,
      action: data.action,
      changedByUid: data.changedByUid,
      changes: data.changes ?? {},
      childUid: data.childUid,
      childName: data.childName,
      createdAt,
    })

    // Stop if we have enough
    if (logs.length >= limit) return
  })

  return logs.slice(0, limit)
}

/**
 * Generate activity summaries for each caregiver.
 *
 * Story 39.6: AC3 - Summary display "Grandma: 2 time extensions, 1 flag viewed"
 *
 * @param params - Query parameters
 * @param caregiverNames - Map of caregiver UID to display name
 * @returns Array of caregiver activity summaries
 */
export async function getCaregiverActivitySummaries(
  params: Omit<GetActivityParams, 'caregiverUid' | 'action'>,
  caregiverNames: Record<string, string>
): Promise<CaregiverActivitySummary[]> {
  const logs = await getCaregiverActivity({ ...params, limit: 500 })

  // Group by caregiver
  const summaryMap = new Map<
    string,
    {
      actionCounts: CaregiverActionCounts
      lastActiveAt: Date
    }
  >()

  logs.forEach((log) => {
    const existing = summaryMap.get(log.caregiverUid) ?? {
      actionCounts: {
        time_extension: 0,
        flag_viewed: 0,
        flag_marked_reviewed: 0,
        permission_change: 0,
      },
      lastActiveAt: log.createdAt,
    }

    // Increment action count
    existing.actionCounts[log.action]++

    // Update last active
    if (log.createdAt > existing.lastActiveAt) {
      existing.lastActiveAt = log.createdAt
    }

    summaryMap.set(log.caregiverUid, existing)
  })

  // Convert to array
  const summaries: CaregiverActivitySummary[] = []

  summaryMap.forEach((data, caregiverUid) => {
    const totalActions = Object.values(data.actionCounts).reduce((a, b) => a + b, 0)

    summaries.push({
      caregiverUid,
      caregiverName: caregiverNames[caregiverUid] ?? 'Unknown Caregiver',
      actionCounts: data.actionCounts,
      lastActiveAt: data.lastActiveAt,
      totalActions,
    })
  })

  // Sort by last active (most recent first)
  summaries.sort((a, b) => b.lastActiveAt.getTime() - a.lastActiveAt.getTime())

  return summaries
}

/**
 * Subscribe to real-time activity updates.
 *
 * Story 39.6: AC5 - Real-time updates
 *
 * @param familyId - Family ID to subscribe to
 * @param callback - Function called with updated logs
 * @param limit - Maximum number of logs to return (default: 50)
 * @returns Unsubscribe function
 */
export function subscribeToActivity(
  familyId: string,
  callback: (logs: CaregiverAuditLog[]) => void,
  limit = 50
): Unsubscribe {
  const db = getFirestoreDb()
  const auditLogsRef = collection(db, 'caregiverAuditLogs')

  const q = query(
    auditLogsRef,
    where('familyId', '==', familyId),
    orderBy('createdAt', 'desc'),
    firestoreLimit(limit)
  )

  return onSnapshot(q, (snapshot) => {
    const logs: CaregiverAuditLog[] = []

    snapshot.forEach((doc) => {
      const data = doc.data()
      // Handle both Firestore Timestamp and objects with toDate() method
      const createdAt =
        data.createdAt && typeof data.createdAt.toDate === 'function'
          ? data.createdAt.toDate()
          : data.createdAt instanceof Date
            ? data.createdAt
            : new Date()

      logs.push({
        id: doc.id,
        familyId: data.familyId,
        caregiverUid: data.caregiverUid,
        caregiverName: data.caregiverName,
        action: data.action,
        changedByUid: data.changedByUid,
        changes: data.changes ?? {},
        childUid: data.childUid,
        childName: data.childName,
        createdAt,
      })
    })

    callback(logs)
  })
}

/**
 * Format activity summary for display.
 *
 * Story 39.6: AC3 - "Grandma: 2 time extensions, 1 flag viewed"
 *
 * @param summary - Caregiver activity summary
 * @returns Formatted string
 */
export function formatActivitySummary(summary: CaregiverActivitySummary): string {
  const parts: string[] = []

  if (summary.actionCounts.time_extension > 0) {
    const count = summary.actionCounts.time_extension
    parts.push(`${count} time extension${count === 1 ? '' : 's'}`)
  }

  if (summary.actionCounts.flag_viewed > 0) {
    const count = summary.actionCounts.flag_viewed
    parts.push(`${count} flag${count === 1 ? '' : 's'} viewed`)
  }

  if (summary.actionCounts.flag_marked_reviewed > 0) {
    const count = summary.actionCounts.flag_marked_reviewed
    parts.push(`${count} flag${count === 1 ? '' : 's'} reviewed`)
  }

  if (parts.length === 0) {
    return `${summary.caregiverName}: No recent activity`
  }

  return `${summary.caregiverName}: ${parts.join(', ')}`
}

/**
 * Format activity log for display.
 *
 * Story 39.6: AC2 - Action descriptions
 *
 * @param log - Caregiver audit log entry
 * @returns Formatted description
 */
export function formatActivityDescription(log: CaregiverAuditLog): string {
  const caregiverName = log.caregiverName ?? 'A caregiver'
  const childName = log.childName ?? 'a child'

  switch (log.action) {
    case 'time_extension': {
      const minutes = (log.changes?.extensionMinutes as number) ?? 0
      return `${caregiverName} extended screen time by ${minutes} min for ${childName}`
    }
    case 'flag_viewed':
      return `${caregiverName} viewed a flag for ${childName}`
    case 'flag_marked_reviewed': {
      const category = (log.changes?.flagCategory as string) ?? 'a'
      return `${caregiverName} marked ${category} flag as reviewed for ${childName}`
    }
    case 'permission_change':
      return `${caregiverName}'s permissions were updated`
    default:
      return `${caregiverName} performed an action`
  }
}

/**
 * Format activity log for child-friendly display.
 *
 * Story 39.6: AC4 - Child transparency with 6th-grade reading level
 *
 * @param log - Caregiver audit log entry
 * @returns Child-friendly description
 */
export function formatActivityForChild(log: CaregiverAuditLog): string {
  const caregiverName = log.caregiverName ?? 'Your caregiver'

  switch (log.action) {
    case 'time_extension': {
      const minutes = (log.changes?.extensionMinutes as number) ?? 0
      return `${caregiverName} extended your screen time by ${minutes} min`
    }
    case 'flag_viewed':
      return `${caregiverName} looked at a flagged item`
    case 'flag_marked_reviewed':
      return `${caregiverName} marked something as reviewed`
    case 'permission_change':
      return `${caregiverName}'s access was updated`
    default:
      return `${caregiverName} did something`
  }
}

/**
 * Get activity logs for a specific child (for child transparency view).
 *
 * Story 39.6: AC4 - Child sees caregiver actions
 *
 * @param familyId - Family ID
 * @param childUid - Child UID
 * @param limit - Maximum number of logs (default: 20)
 * @returns Array of caregiver audit logs for this child
 */
export async function getActivityForChild(
  familyId: string,
  childUid: string,
  limit = 20
): Promise<CaregiverAuditLog[]> {
  return getCaregiverActivity({
    familyId,
    childUid,
    limit,
  })
}

/**
 * Get activity for the current week.
 *
 * Story 39.6: AC3 - Weekly summary
 *
 * @param familyId - Family ID
 * @param caregiverNames - Map of caregiver UID to display name
 * @returns Summaries for the current week
 */
export async function getWeeklyActivitySummaries(
  familyId: string,
  caregiverNames: Record<string, string>
): Promise<CaregiverActivitySummary[]> {
  // Calculate start of current week (Sunday)
  const now = new Date()
  const startOfWeek = new Date(now)
  startOfWeek.setDate(now.getDate() - now.getDay())
  startOfWeek.setHours(0, 0, 0, 0)

  return getCaregiverActivitySummaries(
    {
      familyId,
      startDate: startOfWeek,
      endDate: now,
    },
    caregiverNames
  )
}
