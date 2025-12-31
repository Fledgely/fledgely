/**
 * Caregiver Audit Service
 *
 * Story 19D.3: Caregiver Access Audit Logging - AC3
 * Provides query functions for parents to view caregiver access logs.
 *
 * Used for:
 * - Parents reviewing "Grandpa Joe viewed Emma's status 3 times this week"
 * - Audit trail for family caregiver access
 */

import { collection, query, where, orderBy, getDocs, Timestamp } from 'firebase/firestore'
import { getFirestoreDb } from '../lib/firebase'

/**
 * Caregiver access log entry from Firestore
 */
export interface CaregiverAccessLog {
  id: string
  viewerUid: string
  childId: string | null
  familyId: string
  viewedAt: Date
  metadata: {
    action: 'view' | 'call_parent'
    viewerRole: 'caregiver'
  }
}

/**
 * Summary of caregiver access for parent review
 */
export interface CaregiverAccessSummary {
  caregiverId: string
  caregiverName: string | null
  accessCount: number
  lastAccess: Date
  childrenViewed: string[]
}

/**
 * Parameters for querying caregiver access logs
 */
export interface GetCaregiverLogsParams {
  familyId: string
  /** Optional: Filter by specific caregiver UID */
  caregiverId?: string
  /** Optional: Filter by specific child ID */
  childId?: string
  /** Optional: Start date for filtering */
  startDate?: Date
  /** Optional: End date for filtering */
  endDate?: Date
  /** Maximum number of results (default: 100) */
  limit?: number
}

/**
 * Fetch caregiver access logs for a family.
 *
 * Story 19D.3: AC3 - Query caregiver audit logs for a family
 *
 * @param params - Query parameters
 * @returns Array of caregiver access logs
 */
export async function getCaregiverAccessLogs(
  params: GetCaregiverLogsParams
): Promise<CaregiverAccessLog[]> {
  const { familyId, caregiverId, childId, startDate, endDate, limit = 100 } = params

  const db = getFirestoreDb()
  const auditLogsRef = collection(db, 'auditLogs')

  // Build query constraints
  // Note: Firestore requires index for compound queries
  const q = query(
    auditLogsRef,
    where('familyId', '==', familyId),
    where('dataType', '==', 'caregiver_status'),
    orderBy('viewedAt', 'desc')
  )

  // Execute query
  const snapshot = await getDocs(q)

  // Filter and transform results
  const logs: CaregiverAccessLog[] = []

  snapshot.forEach((doc) => {
    const data = doc.data()

    // Apply additional filters that can't be done in Firestore query
    if (caregiverId && data.viewerUid !== caregiverId) return
    if (childId && data.childId !== childId) return

    const viewedAt = data.viewedAt instanceof Timestamp ? data.viewedAt.toDate() : new Date()

    if (startDate && viewedAt < startDate) return
    if (endDate && viewedAt > endDate) return

    logs.push({
      id: doc.id,
      viewerUid: data.viewerUid,
      childId: data.childId ?? null,
      familyId: data.familyId,
      viewedAt,
      metadata: {
        action: data.metadata?.action ?? 'view',
        viewerRole: 'caregiver',
      },
    })

    // Apply limit
    if (logs.length >= limit) return
  })

  return logs.slice(0, limit)
}

/**
 * Generate access summaries for parents to review.
 *
 * Story 19D.3: AC6 - Parents can review "Grandpa Joe viewed Emma's status 3 times this week"
 *
 * @param params - Query parameters
 * @param caregiverNames - Map of caregiver UID to display name
 * @returns Array of caregiver access summaries
 */
export async function getCaregiverAccessSummaries(
  params: GetCaregiverLogsParams,
  caregiverNames: Record<string, string>
): Promise<CaregiverAccessSummary[]> {
  const logs = await getCaregiverAccessLogs(params)

  // Group by caregiver
  const summaryMap = new Map<
    string,
    {
      accessCount: number
      lastAccess: Date
      childrenViewed: Set<string>
    }
  >()

  logs.forEach((log) => {
    const existing = summaryMap.get(log.viewerUid) ?? {
      accessCount: 0,
      lastAccess: log.viewedAt,
      childrenViewed: new Set<string>(),
    }

    existing.accessCount++
    if (log.viewedAt > existing.lastAccess) {
      existing.lastAccess = log.viewedAt
    }
    if (log.childId) {
      existing.childrenViewed.add(log.childId)
    }

    summaryMap.set(log.viewerUid, existing)
  })

  // Convert to array
  const summaries: CaregiverAccessSummary[] = []

  summaryMap.forEach((data, caregiverId) => {
    summaries.push({
      caregiverId,
      caregiverName: caregiverNames[caregiverId] ?? null,
      accessCount: data.accessCount,
      lastAccess: data.lastAccess,
      childrenViewed: Array.from(data.childrenViewed),
    })
  })

  // Sort by last access (most recent first)
  summaries.sort((a, b) => b.lastAccess.getTime() - a.lastAccess.getTime())

  return summaries
}

/**
 * Get logs for this week for summary display.
 *
 * Story 19D.3: AC6 - "3 times this week" summary
 *
 * @param familyId - Family ID
 * @param caregiverNames - Map of caregiver UID to display name
 * @returns Summaries for the current week
 */
export async function getWeeklyCaregiverAccessSummaries(
  familyId: string,
  caregiverNames: Record<string, string>
): Promise<CaregiverAccessSummary[]> {
  // Calculate start of current week (Sunday)
  const now = new Date()
  const startOfWeek = new Date(now)
  startOfWeek.setDate(now.getDate() - now.getDay())
  startOfWeek.setHours(0, 0, 0, 0)

  return getCaregiverAccessSummaries(
    {
      familyId,
      startDate: startOfWeek,
      endDate: now,
    },
    caregiverNames
  )
}

/**
 * Format access count for display.
 *
 * Story 19D.3: AC6 - Human-readable format
 *
 * @param summary - Caregiver access summary
 * @param childNames - Map of child ID to name
 * @returns Formatted string like "Grandpa Joe viewed 3 times this week"
 */
export function formatAccessSummary(
  summary: CaregiverAccessSummary,
  childNames?: Record<string, string>
): string {
  const name = summary.caregiverName ?? 'A caregiver'
  const count = summary.accessCount
  const times = count === 1 ? 'time' : 'times'

  // Basic format
  if (!childNames || summary.childrenViewed.length === 0) {
    return `${name} viewed ${count} ${times} this week`
  }

  // With child names
  const childNamesList = summary.childrenViewed
    .map((id) => childNames[id] ?? 'a child')
    .filter((name, index, arr) => arr.indexOf(name) === index) // Dedupe

  if (childNamesList.length === 1) {
    return `${name} viewed ${childNamesList[0]}'s status ${count} ${times} this week`
  }

  return `${name} viewed ${count} ${times} this week`
}
