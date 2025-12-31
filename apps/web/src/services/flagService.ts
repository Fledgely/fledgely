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
  doc,
  updateDoc,
  arrayUnion,
  serverTimestamp,
  type QueryConstraint,
  type Unsubscribe,
} from 'firebase/firestore'
import { getFirestoreDb } from '../lib/firebase'
import type {
  FlagDocument,
  FlagStatus,
  ConcernCategory,
  ConcernSeverity,
  FlagNote,
} from '@fledgely/shared'

/**
 * Action types for flag review
 * Story 22.6 - Added 'discussed_together' for co-parent reviews
 * Story 24.1 - Added 'correct' for parent classification corrections
 */
export type FlagActionType =
  | 'dismiss'
  | 'discuss'
  | 'escalate'
  | 'view'
  | 'discussed_together'
  | 'correct'

/**
 * Audit trail entry for flag actions
 */
export interface FlagAction {
  action: FlagActionType
  parentId: string
  parentName: string
  timestamp: number
  note?: string
}

/**
 * Parameters for taking action on a flag
 */
export interface TakeFlagActionParams {
  flagId: string
  childId: string
  action: FlagActionType
  parentId: string
  parentName: string
  note?: string
  /** Story 27.5.3: Whether this flag caused a difficult conversation */
  causedDifficultConversation?: boolean
}

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

/**
 * Map action type to flag status
 * Note: No 'escalated' status exists - we use 'reviewed' and track via auditTrail
 */
function getStatusForAction(action: FlagActionType): FlagStatus {
  switch (action) {
    case 'dismiss':
      return 'dismissed'
    case 'discuss':
    case 'view':
    case 'escalate':
    case 'discussed_together':
    case 'correct': // Story 24.1: Correction marks as reviewed
      return 'reviewed'
  }
}

/**
 * Take action on a flag
 * Story 22.3 - AC #2, #3, #4, #6
 */
export async function takeFlagAction({
  flagId,
  childId,
  action,
  parentId,
  parentName,
  note,
  causedDifficultConversation,
}: TakeFlagActionParams): Promise<void> {
  const db = getFirestoreDb()
  const flagRef = doc(db, 'children', childId, 'flags', flagId)

  const auditEntry: FlagAction = {
    action,
    parentId,
    parentName,
    timestamp: Date.now(),
    ...(note && { note }),
  }

  const newStatus = getStatusForAction(action)

  // Story 27.5.3: Include friction marker fields if set
  const frictionFields = causedDifficultConversation
    ? {
        causedDifficultConversation: true,
        frictionMarkedAt: Date.now(),
        frictionMarkedBy: parentId,
      }
    : {}

  await updateDoc(flagRef, {
    status: newStatus,
    reviewedAt: serverTimestamp(),
    reviewedBy: parentId,
    ...(note && { actionNote: note }),
    auditTrail: arrayUnion(auditEntry),
    ...frictionFields,
  })
}

/**
 * Dismiss a flag (false positive or resolved)
 * Story 22.3 - AC #2
 */
export async function dismissFlag(
  flagId: string,
  childId: string,
  parentId: string,
  parentName: string,
  note?: string,
  causedDifficultConversation?: boolean
): Promise<void> {
  return takeFlagAction({
    flagId,
    childId,
    action: 'dismiss',
    parentId,
    parentName,
    note,
    causedDifficultConversation,
  })
}

/**
 * Mark flag for discussion
 * Story 22.3 - AC #3
 */
export async function markFlagForDiscussion(
  flagId: string,
  childId: string,
  parentId: string,
  parentName: string,
  note?: string,
  causedDifficultConversation?: boolean
): Promise<void> {
  return takeFlagAction({
    flagId,
    childId,
    action: 'discuss',
    parentId,
    parentName,
    note,
    causedDifficultConversation,
  })
}

/**
 * Escalate a flag (requires action)
 * Story 22.3 - AC #4
 */
export async function escalateFlag(
  flagId: string,
  childId: string,
  parentId: string,
  parentName: string,
  note?: string,
  causedDifficultConversation?: boolean
): Promise<void> {
  return takeFlagAction({
    flagId,
    childId,
    action: 'escalate',
    parentId,
    parentName,
    note,
    causedDifficultConversation,
  })
}

/**
 * Generate a unique ID for a note
 */
function generateNoteId(): string {
  return `note_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
}

/**
 * Parameters for adding a note to a flag
 */
export interface AddFlagNoteParams {
  flagId: string
  childId: string
  content: string
  authorId: string
  authorName: string
}

/**
 * Add a discussion note to a flag
 * Story 22.4 - AC #1, #2, #4, #5
 */
export async function addFlagNote({
  flagId,
  childId,
  content,
  authorId,
  authorName,
}: AddFlagNoteParams): Promise<FlagNote> {
  const db = getFirestoreDb()
  const flagRef = doc(db, 'children', childId, 'flags', flagId)

  const note: FlagNote = {
    id: generateNoteId(),
    content,
    authorId,
    authorName,
    timestamp: Date.now(),
  }

  await updateDoc(flagRef, {
    notes: arrayUnion(note),
  })

  return note
}

/**
 * Mark a flag as viewed by a parent
 * Story 22.6 - AC #2
 */
export async function markFlagViewed(
  flagId: string,
  childId: string,
  parentId: string
): Promise<void> {
  const db = getFirestoreDb()
  const flagRef = doc(db, 'children', childId, 'flags', flagId)

  await updateDoc(flagRef, {
    viewedBy: arrayUnion(parentId),
  })
}

/**
 * Parameters for correcting a flag's category
 * Story 24.1 - Parent Classification Correction
 */
export interface CorrectFlagCategoryParams {
  flagId: string
  childId: string
  correctedCategory: ConcernCategory
  parentId: string
  parentName: string
}

/**
 * Result of flag correction
 */
export interface CorrectFlagCategoryResult {
  success: boolean
  error?: string
}

import { CONCERN_CATEGORY_VALUES } from '@fledgely/shared'

/**
 * Correct a flag's category when parent disagrees with AI classification
 * Story 24.1 - AC #3: Correction saved with original category, corrected category, parentId
 */
export async function correctFlagCategory({
  flagId,
  childId,
  correctedCategory,
  parentId,
  parentName,
}: CorrectFlagCategoryParams): Promise<CorrectFlagCategoryResult> {
  // Validate required parameters
  if (!flagId || !childId || !correctedCategory || !parentId || !parentName) {
    return { success: false, error: 'Missing required parameters' }
  }

  // Validate category at runtime
  if (!CONCERN_CATEGORY_VALUES.includes(correctedCategory)) {
    return { success: false, error: 'Invalid category selected' }
  }

  const db = getFirestoreDb()
  const flagRef = doc(db, 'children', childId, 'flags', flagId)

  try {
    // Use transaction to prevent race conditions
    const { runTransaction } = await import('firebase/firestore')

    await runTransaction(db, async (transaction) => {
      // Read current flag state
      const flagDoc = await transaction.get(flagRef)

      if (!flagDoc.exists()) {
        throw new Error('Flag not found')
      }

      const currentFlag = flagDoc.data() as FlagDocument

      // Prevent correction to same category
      if (correctedCategory === currentFlag.category) {
        throw new Error('Corrected category must differ from original')
      }

      // Prevent duplicate corrections (optional: allow re-correction)
      if (currentFlag.correctedCategory) {
        throw new Error('Flag has already been corrected')
      }

      const correctedAt = Date.now()

      // Create audit entry with original category
      const auditEntry: FlagAction = {
        action: 'correct' as FlagActionType,
        parentId,
        parentName,
        timestamp: correctedAt,
        note: `Corrected category from "${currentFlag.category}" to "${correctedCategory}"`,
      }

      // Apply atomic update
      transaction.update(flagRef, {
        correctedCategory,
        correctionParentId: parentId,
        correctedAt,
        status: 'reviewed',
        reviewedAt: correctedAt,
        reviewedBy: parentId,
        auditTrail: arrayUnion(auditEntry),
      })
    })

    return { success: true }
  } catch (error) {
    // Sanitize error messages for user display
    const errorMessage =
      error instanceof Error && error.message.includes('already been corrected')
        ? 'This flag has already been corrected'
        : error instanceof Error && error.message.includes('must differ')
          ? 'Please select a different category than the original'
          : error instanceof Error && error.message.includes('not found')
            ? 'Flag not found'
            : 'Unable to save correction. Please try again.'

    // eslint-disable-next-line no-console
    console.error('Failed to correct flag category:', error)
    return { success: false, error: errorMessage }
  }
}
