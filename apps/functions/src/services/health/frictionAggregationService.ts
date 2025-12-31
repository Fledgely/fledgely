/**
 * Friction Aggregation Service
 *
 * Story 27.5.3: Flag-Triggered Friction Markers - AC3, AC4, AC5
 *
 * Aggregates friction data from flags to identify patterns.
 * Helps families understand which content types cause friction.
 */

import { getFirestore, Firestore } from 'firebase-admin/firestore'
import * as logger from 'firebase-functions/logger'
import type { ConcernCategory, FlagDocument } from '@fledgely/shared'

// Lazy initialization for Firestore
let db: Firestore | null = null
function getDb(): Firestore {
  if (!db) {
    db = getFirestore()
  }
  return db
}

/**
 * Friction summary by category.
 */
export interface CategoryFrictionSummary {
  category: ConcernCategory
  totalFlags: number
  frictionFlags: number
  frictionPercentage: number
}

/**
 * Overall friction summary for a family.
 */
export interface FrictionSummary {
  familyId: string
  totalReviewedFlags: number
  totalFrictionFlags: number
  overallFrictionPercentage: number
  byCategory: CategoryFrictionSummary[]
  periodStart: number
  periodEnd: number
}

/**
 * Get friction summary for a family.
 *
 * Story 27.5.3 - AC3: Aggregate friction data
 * Story 27.5.3 - AC4: Pattern visibility
 * Story 27.5.3 - AC5: Identify friction content types
 *
 * @param familyId The family ID to get friction data for
 * @param periodDays Number of days to look back (default: 30)
 */
export async function getFrictionSummary(
  familyId: string,
  periodDays: number = 30
): Promise<FrictionSummary> {
  const db = getDb()
  const now = Date.now()
  const periodStart = now - periodDays * 24 * 60 * 60 * 1000

  try {
    // Get all children in the family
    const familyDoc = await db.collection('families').doc(familyId).get()
    if (!familyDoc.exists) {
      return createEmptyFrictionSummary(familyId, periodStart, now)
    }

    const familyData = familyDoc.data()
    const childUids: string[] = familyData?.childUids || []

    if (childUids.length === 0) {
      return createEmptyFrictionSummary(familyId, periodStart, now)
    }

    // Aggregate flags from all children
    const allFlags: FlagDocument[] = []

    for (const childId of childUids) {
      const flagsSnapshot = await db
        .collection('children')
        .doc(childId)
        .collection('flags')
        .where('reviewedAt', '!=', null)
        .get()

      for (const doc of flagsSnapshot.docs) {
        const flag = doc.data() as FlagDocument
        // Only include flags reviewed within the period
        if (flag.reviewedAt && flag.reviewedAt >= periodStart) {
          allFlags.push(flag)
        }
      }
    }

    // Aggregate by category
    const categoryMap = new Map<ConcernCategory, { total: number; friction: number }>()

    let totalReviewedFlags = 0
    let totalFrictionFlags = 0

    for (const flag of allFlags) {
      totalReviewedFlags++

      if (!categoryMap.has(flag.category)) {
        categoryMap.set(flag.category, { total: 0, friction: 0 })
      }

      const categoryData = categoryMap.get(flag.category)!
      categoryData.total++

      if (flag.causedDifficultConversation) {
        categoryData.friction++
        totalFrictionFlags++
      }
    }

    // Build category summaries
    const byCategory: CategoryFrictionSummary[] = []
    for (const [category, data] of categoryMap) {
      byCategory.push({
        category,
        totalFlags: data.total,
        frictionFlags: data.friction,
        frictionPercentage: data.total > 0 ? Math.round((data.friction / data.total) * 100) : 0,
      })
    }

    // Sort by friction count (most friction first)
    byCategory.sort((a, b) => b.frictionFlags - a.frictionFlags)

    return {
      familyId,
      totalReviewedFlags,
      totalFrictionFlags,
      overallFrictionPercentage:
        totalReviewedFlags > 0 ? Math.round((totalFrictionFlags / totalReviewedFlags) * 100) : 0,
      byCategory,
      periodStart,
      periodEnd: now,
    }
  } catch (error) {
    logger.error('Failed to get friction summary', { familyId, error })
    return createEmptyFrictionSummary(familyId, periodStart, now)
  }
}

/**
 * Create an empty friction summary.
 */
function createEmptyFrictionSummary(
  familyId: string,
  periodStart: number,
  periodEnd: number
): FrictionSummary {
  return {
    familyId,
    totalReviewedFlags: 0,
    totalFrictionFlags: 0,
    overallFrictionPercentage: 0,
    byCategory: [],
    periodStart,
    periodEnd,
  }
}

/**
 * Get human-readable pattern text for a category.
 *
 * Story 27.5.3 - AC4: Pattern visible
 */
export function getFrictionPatternText(summary: CategoryFrictionSummary): string {
  if (summary.totalFlags === 0) {
    return `No ${summary.category} flags reviewed yet`
  }

  if (summary.frictionFlags === 0) {
    return `${summary.category} flags rarely cause friction (0 of ${summary.totalFlags})`
  }

  if (summary.frictionPercentage >= 50) {
    return `${summary.frictionFlags} of ${summary.totalFlags} ${summary.category} flags led to difficult conversations`
  }

  return `${summary.category} flags sometimes cause friction (${summary.frictionFlags} of ${summary.totalFlags})`
}

/**
 * For testing - reset Firestore instance.
 */
export function _resetDbForTesting(): void {
  db = null
}
