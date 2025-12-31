/**
 * Flag Storage Service
 *
 * Story 21.5: Flag Creation and Storage - AC1, AC2, AC3, AC5, AC6
 *
 * Creates and stores flag documents in dedicated Firestore collection
 * for efficient querying and parent review functionality.
 */

import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import * as logger from 'firebase-functions/logger'
import {
  type CreateFlagParams,
  type FlagDocument,
  type ConcernCategory,
  type ConcernSeverity,
  type FlagStatus,
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
 * Generate a unique flag ID
 * Format: {screenshotId}_{category}_{timestamp}_{random}
 *
 * Story 21.5 - AC1: Flag ID uses predictable format
 * Includes random suffix to prevent collision on simultaneous calls
 */
export function generateFlagId(screenshotId: string, category: ConcernCategory): string {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 8)
  return `${screenshotId}_${category}_${timestamp}_${random}`
}

/**
 * Generate the screenshot reference path
 * Format: children/{childId}/screenshots/{screenshotId}
 *
 * Story 21.5 - AC3: Flag linked to screenshot
 */
export function generateScreenshotRef(childId: string, screenshotId: string): string {
  return `children/${childId}/screenshots/${screenshotId}`
}

/**
 * Get the flags collection reference for a child
 */
function getFlagsCollection(childId: string) {
  return getDb().collection('children').doc(childId).collection('flags')
}

/**
 * Get the screenshot document reference
 */
function getScreenshotRef(childId: string, screenshotId: string) {
  return getDb().collection('children').doc(childId).collection('screenshots').doc(screenshotId)
}

/**
 * Create a flag document in the dedicated flags collection
 *
 * Story 21.5 - AC1: Flag document created in /children/{childId}/flags/{flagId}
 * Story 21.5 - AC2: Flag includes complete context
 * Story 21.5 - AC3: Flag linked to screenshot via screenshotRef
 * Story 21.5 - AC5: Throttle status preserved on flag
 * Story 21.5 - AC6: Suppression status preserved on flag
 *
 * @param params - Flag creation parameters
 * @returns Created flag document
 */
export async function createFlag(params: CreateFlagParams): Promise<FlagDocument> {
  const {
    childId,
    familyId,
    screenshotId,
    category,
    severity,
    confidence,
    reasoning,
    status = 'pending',
    suppressionReason,
    releasableAfter,
    throttled = false,
    throttledAt,
  } = params

  // Generate flag ID and screenshot reference
  const flagId = generateFlagId(screenshotId, category)
  const screenshotRef = generateScreenshotRef(childId, screenshotId)
  const createdAt = Date.now()

  // Build flag document
  const flagDocument: FlagDocument = {
    id: flagId,
    childId,
    familyId,
    screenshotRef,
    screenshotId,
    category,
    severity,
    confidence,
    reasoning,
    createdAt,
    status,
    throttled,
    // Include optional fields only if present
    ...(suppressionReason && { suppressionReason }),
    ...(releasableAfter !== undefined && { releasableAfter }),
    ...(throttledAt !== undefined && { throttledAt }),
  }

  // Write to Firestore
  const flagsCollection = getFlagsCollection(childId)
  await flagsCollection.doc(flagId).set(flagDocument)

  logger.info('Flag document created', {
    flagId,
    childId,
    familyId,
    screenshotId,
    category,
    severity,
    confidence,
    status,
    throttled,
  })

  return flagDocument
}

/**
 * Update screenshot document with flag IDs
 *
 * Story 21.5 - AC3: Screenshot document references flag IDs in flagIds array
 *
 * @param childId - Child ID
 * @param screenshotId - Screenshot ID
 * @param flagIds - Array of flag IDs to add
 */
export async function updateScreenshotFlagIds(
  childId: string,
  screenshotId: string,
  flagIds: string[]
): Promise<void> {
  if (flagIds.length === 0) {
    return
  }

  const screenshotRef = getScreenshotRef(childId, screenshotId)

  // Use arrayUnion to append without overwriting existing flag IDs
  await screenshotRef.update({
    flagIds: FieldValue.arrayUnion(...flagIds),
  })

  logger.info('Screenshot flagIds updated', {
    childId,
    screenshotId,
    addedFlagIds: flagIds.length,
  })
}

/**
 * Create multiple flags from throttled concern flags
 *
 * Story 21.5 - AC1, AC2, AC3: Batch create flags and update screenshot
 *
 * @param childId - Child ID
 * @param familyId - Family ID
 * @param screenshotId - Screenshot ID
 * @param flags - Array of throttled concern flags
 * @returns Array of created flag documents
 */
export async function createFlagsFromConcerns(
  childId: string,
  familyId: string,
  screenshotId: string,
  flags: Array<{
    category: ConcernCategory
    severity: ConcernSeverity
    confidence: number
    reasoning: string
    status?: FlagStatus
    suppressionReason?: 'self_harm_detected' | 'crisis_url_visited' | 'distress_signals'
    releasableAfter?: number
    throttled?: boolean
    throttledAt?: number
  }>
): Promise<FlagDocument[]> {
  if (flags.length === 0) {
    return []
  }

  // Create all flag documents in parallel for better performance
  const createdFlags = await Promise.all(
    flags.map((flag) =>
      createFlag({
        childId,
        familyId,
        screenshotId,
        category: flag.category,
        severity: flag.severity,
        confidence: flag.confidence,
        reasoning: flag.reasoning,
        status: flag.status,
        suppressionReason: flag.suppressionReason,
        releasableAfter: flag.releasableAfter,
        throttled: flag.throttled,
        throttledAt: flag.throttledAt,
      })
    )
  )

  const flagIds = createdFlags.map((f) => f.id)

  // Update screenshot with all flag IDs
  await updateScreenshotFlagIds(childId, screenshotId, flagIds)

  logger.info('Flags created from concerns', {
    childId,
    familyId,
    screenshotId,
    flagCount: createdFlags.length,
    flagIds,
  })

  return createdFlags
}

/**
 * Query filters for flag retrieval
 *
 * Story 21.5 - AC4: Flags are queryable
 */
export interface FlagQueryFilters {
  /** Filter by flag status */
  status?: FlagStatus
  /** Filter by severity */
  severity?: ConcernSeverity
  /** Filter by date range (createdAt >= startDate) */
  startDate?: number
  /** Filter by date range (createdAt <= endDate) */
  endDate?: number
}

/**
 * Pagination options for flag queries
 *
 * Story 21.5 - AC4: Pagination support
 */
export interface FlagQueryPagination {
  /** Maximum number of flags to return */
  limit?: number
  /** Start after this document ID for pagination */
  startAfter?: string
}

/**
 * Get flags for a child with optional filters
 *
 * Story 21.5 - AC4: Flags are queryable by status, severity, date range, childId
 *
 * @param childId - Child ID
 * @param filters - Optional query filters
 * @param pagination - Optional pagination options
 * @returns Array of flag documents
 */
export async function getFlagsForChild(
  childId: string,
  filters: FlagQueryFilters = {},
  pagination: FlagQueryPagination = {}
): Promise<FlagDocument[]> {
  const { status, severity, startDate, endDate } = filters
  const { limit = 50, startAfter } = pagination

  let query: FirebaseFirestore.Query = getFlagsCollection(childId)

  // Apply filters
  if (status) {
    query = query.where('status', '==', status)
  }

  if (severity) {
    query = query.where('severity', '==', severity)
  }

  if (startDate !== undefined) {
    query = query.where('createdAt', '>=', startDate)
  }

  if (endDate !== undefined) {
    query = query.where('createdAt', '<=', endDate)
  }

  // Order by createdAt descending (newest first)
  query = query.orderBy('createdAt', 'desc')

  // Apply pagination
  if (startAfter) {
    const startAfterDoc = await getFlagsCollection(childId).doc(startAfter).get()
    if (startAfterDoc.exists) {
      query = query.startAfter(startAfterDoc)
    }
  }

  query = query.limit(limit)

  // Execute query
  const snapshot = await query.get()

  const flags: FlagDocument[] = []
  snapshot.forEach((doc) => {
    flags.push(doc.data() as FlagDocument)
  })

  return flags
}

/**
 * Get a single flag by ID
 *
 * @param childId - Child ID
 * @param flagId - Flag ID
 * @returns Flag document or null if not found
 */
export async function getFlagById(childId: string, flagId: string): Promise<FlagDocument | null> {
  const flagDoc = await getFlagsCollection(childId).doc(flagId).get()

  if (!flagDoc.exists) {
    return null
  }

  return flagDoc.data() as FlagDocument
}
