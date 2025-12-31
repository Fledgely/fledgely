/**
 * App Approvals Service.
 *
 * Story 24.3: Explicit Approval of Categories - AC2, AC3, AC4, AC5, AC6, AC7
 *
 * Provides functions for:
 * - Loading child's app category approvals
 * - Applying approval-based confidence adjustments
 * - Managing approval documents
 *
 * Key behaviors:
 * - AC3: Approved apps get reduced flag sensitivity (-20 confidence)
 * - AC4: Disapproved apps get increased flag sensitivity (+15 confidence)
 * - AC5: Preferences stored per-family, per-child
 * - AC6: Preferences override default model thresholds
 * - AC7: Child-specific preferences
 */

import { getFirestore } from 'firebase-admin/firestore'
import * as logger from 'firebase-functions/logger'
import type { AppCategoryApproval, ConcernCategory } from '@fledgely/shared'
import { APP_APPROVAL_ADJUSTMENTS, appCategoryApprovalSchema } from '@fledgely/shared'
import type { DetectedConcern } from './geminiClient'

const db = getFirestore()

/**
 * Cache for app approvals to reduce Firestore reads.
 * Key: childId, Value: { approvals, timestamp }
 */
const approvalsCache = new Map<
  string,
  {
    approvals: AppCategoryApproval[]
    timestamp: number
  }
>()

/** Cache TTL in milliseconds (5 minutes) */
const CACHE_TTL_MS = 5 * 60 * 1000

/**
 * Get app category approvals for a child.
 *
 * Story 24.3: Explicit Approval of Categories - AC5, AC7
 * Loads approvals from /children/{childId}/appApprovals collection.
 *
 * @param childId - Child to get approvals for
 * @returns Array of app category approvals
 */
export async function getChildAppApprovals(childId: string): Promise<AppCategoryApproval[]> {
  const now = Date.now()

  // Check cache first
  const cached = approvalsCache.get(childId)
  if (cached && now - cached.timestamp < CACHE_TTL_MS) {
    logger.debug('Using cached app approvals', { childId, count: cached.approvals.length })
    return cached.approvals
  }

  try {
    const approvalsRef = db.collection('children').doc(childId).collection('appApprovals')

    const snapshot = await approvalsRef.get()

    if (snapshot.empty) {
      logger.debug('No app approvals found for child', { childId })
      // Cache empty result
      approvalsCache.set(childId, { approvals: [], timestamp: now })
      return []
    }

    const approvals: AppCategoryApproval[] = []

    for (const doc of snapshot.docs) {
      const rawData = doc.data()
      const parseResult = appCategoryApprovalSchema.safeParse(rawData)

      if (parseResult.success) {
        approvals.push(parseResult.data)
      } else {
        logger.warn('Invalid app approval document, skipping', {
          docId: doc.id,
          childId,
          errors: parseResult.error.errors,
        })
      }
    }

    // Cache results
    approvalsCache.set(childId, { approvals, timestamp: now })

    logger.debug('Loaded app approvals', { childId, count: approvals.length })

    return approvals
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    logger.error('Failed to load app approvals', { childId, error: errorMessage })
    // Return empty array on error to not block classification
    return []
  }
}

/**
 * Extract app identifier from screenshot metadata.
 *
 * Story 24.3: Explicit Approval of Categories
 * For web content: extracts domain from URL
 * For native apps: uses app name (normalized)
 *
 * @param url - URL from screenshot (if browser content)
 * @param appName - App name from screenshot (if native app)
 * @returns Normalized app identifier
 */
export function extractAppIdentifier(url?: string | null, appName?: string | null): string {
  // Try URL first (for browser content)
  if (url) {
    try {
      const parsedUrl = new URL(url)
      return parsedUrl.hostname.toLowerCase()
    } catch {
      // Invalid URL, fall through to app name
    }
  }

  // Try app name (for native apps)
  if (appName) {
    return appName.toLowerCase().replace(/\s+/g, '_')
  }

  return 'unknown'
}

/**
 * Apply app approval adjustments to detected concerns.
 *
 * Story 24.3: Explicit Approval of Categories - AC3, AC4, AC6
 *
 * For each concern:
 * - If app+category is approved: reduce confidence by 20
 * - If app+category is disapproved: increase confidence by 15
 * - Clamps result to 0-100 range
 *
 * @param concerns - Array of detected concerns from classification
 * @param appApprovals - Child's app category approvals
 * @param appIdentifier - Normalized app identifier from screenshot
 * @returns Adjusted detected concerns
 */
export function applyAppApprovalsToConcerns(
  concerns: DetectedConcern[],
  appApprovals: AppCategoryApproval[],
  appIdentifier: string
): DetectedConcern[] {
  if (appApprovals.length === 0) {
    return concerns
  }

  // Find all approvals for this app
  const relevantApprovals = appApprovals.filter(
    (a) => a.appIdentifier.toLowerCase() === appIdentifier.toLowerCase()
  )

  if (relevantApprovals.length === 0) {
    return concerns
  }

  return concerns.map((concern) => {
    // Find approval matching this concern's category
    const approval = relevantApprovals.find((a) => a.category === concern.category)

    if (!approval || approval.status === 'neutral') {
      return concern
    }

    const adjustment = APP_APPROVAL_ADJUSTMENTS[approval.status]

    // Apply adjustment and clamp to valid range
    const adjustedConfidence = Math.max(0, Math.min(100, concern.confidence + adjustment))

    logger.debug('Applied app approval adjustment', {
      appIdentifier,
      category: concern.category,
      status: approval.status,
      originalConfidence: concern.confidence,
      adjustment,
      adjustedConfidence,
    })

    return {
      ...concern,
      confidence: adjustedConfidence,
    }
  })
}

/**
 * Clear cached approvals for a child.
 *
 * Call this when approvals are updated to ensure
 * fresh data is loaded on next classification.
 *
 * @param childId - Child to clear cache for
 */
export function clearAppApprovalsCache(childId: string): void {
  approvalsCache.delete(childId)
}

/**
 * Set an app category approval for a child.
 *
 * Story 24.3: Explicit Approval of Categories - AC2, AC5, AC7
 *
 * @param approval - Approval to create/update
 * @returns The saved approval
 */
export async function setAppCategoryApproval(
  approval: Omit<AppCategoryApproval, 'id' | 'createdAt' | 'updatedAt'>
): Promise<AppCategoryApproval> {
  const now = Date.now()

  // Generate ID from app identifier and category for upsert behavior
  const approvalId = `${approval.appIdentifier}_${approval.category}`.replace(
    /[^a-zA-Z0-9_-]/g,
    '_'
  )

  const approvalRef = db
    .collection('children')
    .doc(approval.childId)
    .collection('appApprovals')
    .doc(approvalId)

  const existingDoc = await approvalRef.get()

  const fullApproval: AppCategoryApproval = {
    ...approval,
    id: approvalId,
    createdAt: existingDoc.exists ? (existingDoc.data()?.createdAt ?? now) : now,
    updatedAt: now,
  }

  await approvalRef.set(fullApproval)

  // Clear cache to ensure fresh data
  clearAppApprovalsCache(approval.childId)

  logger.info('App category approval set', {
    approvalId,
    childId: approval.childId,
    appIdentifier: approval.appIdentifier,
    category: approval.category,
    status: approval.status,
  })

  return fullApproval
}

/**
 * Remove an app category approval.
 *
 * Story 24.3: Explicit Approval of Categories - AC2
 *
 * @param childId - Child the approval belongs to
 * @param appIdentifier - App identifier
 * @param category - Concern category
 */
export async function removeAppCategoryApproval(
  childId: string,
  appIdentifier: string,
  category: ConcernCategory
): Promise<void> {
  const approvalId = `${appIdentifier}_${category}`.replace(/[^a-zA-Z0-9_-]/g, '_')

  const approvalRef = db
    .collection('children')
    .doc(childId)
    .collection('appApprovals')
    .doc(approvalId)

  try {
    await approvalRef.delete()

    // Clear cache
    clearAppApprovalsCache(childId)

    logger.info('App category approval removed', {
      approvalId,
      childId,
      appIdentifier,
      category,
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    logger.error('Failed to remove app category approval', {
      approvalId,
      childId,
      appIdentifier,
      category,
      error: errorMessage,
    })
    throw error
  }
}
