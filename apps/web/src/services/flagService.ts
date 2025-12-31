/**
 * Flag Service - Story 22.1
 *
 * Client-side service for fetching and subscribing to flags from Firestore.
 * Uses the flag document schema from Epic 21.
 */

import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  getDocs,
  type QueryConstraint,
  type Unsubscribe,
} from 'firebase/firestore'
import { getFirestoreDb } from '../lib/firebase'
import type { FlagDocument, FlagStatus, ConcernCategory, ConcernSeverity } from '@fledgely/shared'

/**
 * Filters for flag queries
 */
export interface FlagFilters {
  status?: FlagStatus
  category?: ConcernCategory
  severity?: ConcernSeverity
  childIds?: string[]
}

/**
 * Severity sort order (high = 3, medium = 2, low = 1)
 * Used for client-side sorting since Firestore can't sort by custom order
 */
const SEVERITY_ORDER: Record<ConcernSeverity, number> = {
  high: 3,
  medium: 2,
  low: 1,
}

/**
 * Sort flags by severity (desc) then createdAt (desc)
 * This matches AC #1: priority order (severity, then date)
 */
function sortFlags(flags: FlagDocument[]): FlagDocument[] {
  return [...flags].sort((a, b) => {
    // First sort by severity (high > medium > low)
    const severityDiff = SEVERITY_ORDER[b.severity] - SEVERITY_ORDER[a.severity]
    if (severityDiff !== 0) return severityDiff

    // Then sort by createdAt (newest first)
    return b.createdAt - a.createdAt
  })
}

/**
 * Build query constraints based on filters
 */
function buildQueryConstraints(filters?: FlagFilters): QueryConstraint[] {
  const constraints: QueryConstraint[] = []

  if (filters?.status) {
    constraints.push(where('status', '==', filters.status))
  }

  if (filters?.category) {
    constraints.push(where('category', '==', filters.category))
  }

  if (filters?.severity) {
    constraints.push(where('severity', '==', filters.severity))
  }

  // Always order by createdAt for consistent results
  constraints.push(orderBy('createdAt', 'desc'))

  return constraints
}

/**
 * Get flags for a single child
 */
export async function getFlagsForChild(
  childId: string,
  filters?: Omit<FlagFilters, 'childIds'>
): Promise<FlagDocument[]> {
  try {
    const db = getFirestoreDb()
    const flagsRef = collection(db, 'children', childId, 'flags')
    const constraints = buildQueryConstraints(filters)
    const flagsQuery = query(flagsRef, ...constraints)

    const snapshot = await getDocs(flagsQuery)
    return snapshot.docs.map((doc) => doc.data() as FlagDocument)
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(`Error fetching flags for child ${childId}:`, error)
    return [] // Return empty array instead of crashing
  }
}

/**
 * Get flags for multiple children (all children in family)
 * Story 22.1 - AC #1: Fetch flags for all family children
 */
export async function getFlagsForChildren(
  childIds: string[],
  filters?: Omit<FlagFilters, 'childIds'>
): Promise<FlagDocument[]> {
  if (childIds.length === 0) return []

  // Fetch flags for all children in parallel
  const allFlagsArrays = await Promise.all(
    childIds.map((childId) => getFlagsForChild(childId, filters))
  )

  // Flatten and sort
  const allFlags = allFlagsArrays.flat()
  return sortFlags(allFlags)
}

/**
 * Subscribe to pending flags for a single child (real-time)
 */
export function subscribeToPendingFlagsForChild(
  childId: string,
  callback: (flags: FlagDocument[]) => void
): Unsubscribe {
  const db = getFirestoreDb()
  const flagsRef = collection(db, 'children', childId, 'flags')
  const flagsQuery = query(flagsRef, where('status', '==', 'pending'), orderBy('createdAt', 'desc'))

  return onSnapshot(
    flagsQuery,
    (snapshot) => {
      try {
        const flags = snapshot.docs.map((doc) => doc.data() as FlagDocument)
        callback(flags)
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error(`Error processing flag snapshot for child ${childId}:`, error)
        callback([]) // Don't break the UI
      }
    },
    (error) => {
      // Handle subscription errors (network, permission denied, etc.)
      // eslint-disable-next-line no-console
      console.error(`Error in flag subscription for child ${childId}:`, error)
      callback([]) // Prevent UI from breaking
    }
  )
}

/**
 * Subscribe to pending flags for multiple children (real-time)
 * Story 22.1 - AC #6: Real-time updates
 */
export function subscribeToPendingFlags(
  childIds: string[],
  callback: (flags: FlagDocument[]) => void
): Unsubscribe {
  if (childIds.length === 0) {
    callback([])
    return () => {}
  }

  // Track flags per child
  const flagsByChild: Map<string, FlagDocument[]> = new Map()

  // Subscribe to each child's flags
  const unsubscribes = childIds.map((childId) =>
    subscribeToPendingFlagsForChild(childId, (childFlags) => {
      flagsByChild.set(childId, childFlags)

      // Combine all flags and notify callback
      const allFlags = Array.from(flagsByChild.values()).flat()
      callback(sortFlags(allFlags))
    })
  )

  // Return combined unsubscribe function
  return () => {
    unsubscribes.forEach((unsub) => unsub())
  }
}

/**
 * Get count of pending flags for children
 * Story 22.1 - AC #3: Flag count badge
 */
export async function getPendingFlagCount(childIds: string[]): Promise<number> {
  const flags = await getFlagsForChildren(childIds, { status: 'pending' })
  return flags.length
}

/**
 * Apply client-side filters to flags
 * Used when we need to filter by category/severity after fetching
 */
export function applyClientFilters(flags: FlagDocument[], filters: FlagFilters): FlagDocument[] {
  // Early exit if no filters applied (performance optimization)
  if (!filters.childIds && !filters.category && !filters.severity && !filters.status) {
    return flags
  }

  let filtered = flags

  if (filters.childIds && filters.childIds.length > 0) {
    filtered = filtered.filter((f) => filters.childIds!.includes(f.childId))
  }

  if (filters.category) {
    filtered = filtered.filter((f) => f.category === filters.category)
  }

  if (filters.severity) {
    filtered = filtered.filter((f) => f.severity === filters.severity)
  }

  if (filters.status) {
    filtered = filtered.filter((f) => f.status === filters.status)
  }

  return filtered
}
