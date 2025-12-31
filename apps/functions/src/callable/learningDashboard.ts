/**
 * Cloud Functions for AI Learning Dashboard.
 *
 * Story 24.4: Learning Progress Dashboard - AC1, AC2, AC3, AC4, AC5
 *
 * Provides:
 * - getLearningDashboard: Fetch learning progress data for display
 * - resetFamilyLearning: Clear family's AI learning data
 *
 * Security:
 * - Only authenticated guardians can access/modify family data
 * - Reset action is logged to audit trail
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { Firestore, getFirestore, FieldValue } from 'firebase-admin/firestore'
import * as logger from 'firebase-functions/logger'
import { z } from 'zod'
import type {
  LearningDashboardData,
  CategoryImprovement,
  LearnedPattern,
  FamilyBiasWeights,
  ConcernCategory,
} from '@fledgely/shared'
import { MINIMUM_CORRECTIONS_THRESHOLD } from '@fledgely/shared'

// Lazy initialization for Firestore (supports test mocking)
let db: Firestore | null = null
function getDb(): Firestore {
  if (!db) {
    db = getFirestore()
  }
  return db
}

/** Reset Firestore instance for testing */
export function _resetDbForTesting(): void {
  db = null
}

// =============================================================================
// Get Learning Dashboard
// =============================================================================

/**
 * Input schema for getLearningDashboard.
 */
export const getLearningDashboardInputSchema = z.object({
  familyId: z.string().min(1, 'Family ID is required'),
})

export type GetLearningDashboardInput = z.infer<typeof getLearningDashboardInputSchema>

/**
 * Generate human-readable pattern descriptions.
 *
 * Story 24.4: Learning Progress Dashboard - AC3
 */
function generatePatternDescription(category: ConcernCategory, adjustment: number): string {
  const direction = adjustment < 0 ? 'Reduced' : 'Increased'
  const magnitude = Math.abs(adjustment)

  if (magnitude < 10) {
    return `Slightly ${direction.toLowerCase()} flagging for ${category}`
  } else if (magnitude < 25) {
    return `${direction} flagging sensitivity for ${category}`
  } else {
    return `Significantly ${direction.toLowerCase()} ${category} detection`
  }
}

/**
 * Calculate accuracy improvement estimate from adjustments.
 *
 * Story 24.4: Learning Progress Dashboard - AC2
 * Based on total adjustment magnitude, capped at 30%
 */
function calculateAccuracyImprovement(adjustments: Record<string, number> | undefined): number {
  if (!adjustments) return 0

  const totalMagnitude = Object.values(adjustments).reduce((sum, adj) => sum + Math.abs(adj), 0)

  // Formula: ~0.6% per adjustment point, capped at 30%
  return Math.min(30, Math.round(totalMagnitude * 0.6))
}

/**
 * Get learning dashboard data for a family.
 *
 * Story 24.4: Learning Progress Dashboard - AC1, AC2, AC3, AC4
 *
 * Returns summary of:
 * - Total corrections made
 * - Applied corrections (with active bias)
 * - Accuracy improvement estimate
 * - Learned patterns
 * - Pending adaptations
 */
export const getLearningDashboard = onCall<GetLearningDashboardInput>(async (request) => {
  const { auth, data } = request

  // Authenticate
  if (!auth?.uid) {
    throw new HttpsError('unauthenticated', 'Must be logged in to view learning dashboard')
  }

  // Validate input
  const parseResult = getLearningDashboardInputSchema.safeParse(data)
  if (!parseResult.success) {
    throw new HttpsError('invalid-argument', parseResult.error.errors[0].message)
  }

  const { familyId } = parseResult.data
  const db = getDb()

  try {
    // Verify user is a guardian of this family
    const familyDoc = await db.collection('families').doc(familyId).get()

    if (!familyDoc.exists) {
      throw new HttpsError('not-found', 'Family not found')
    }

    const familyData = familyDoc.data()
    const guardianUids = familyData?.guardianUids || []

    if (!guardianUids.includes(auth.uid)) {
      throw new HttpsError('permission-denied', 'Only guardians can view learning dashboard')
    }

    // Get bias weights
    const biasWeightsRef = db
      .collection('families')
      .doc(familyId)
      .collection('aiSettings')
      .doc('biasWeights')

    const biasWeightsDoc = await biasWeightsRef.get()
    const biasWeights = biasWeightsDoc.exists ? (biasWeightsDoc.data() as FamilyBiasWeights) : null

    // Get recent corrections count (from last 7 days, not yet processed)
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
    const recentCorrectionsQuery = db
      .collectionGroup('corrections')
      .where('familyId', '==', familyId)
      .where('createdAt', '>', sevenDaysAgo)
      .limit(100)

    const recentCorrectionsSnapshot = await recentCorrectionsQuery.get()
    const pendingCorrections = Math.max(
      0,
      recentCorrectionsSnapshot.size - (biasWeights?.correctionCount || 0)
    )

    // Calculate dashboard data
    const totalCorrections = biasWeights?.correctionCount || 0
    const appliedCorrections =
      totalCorrections >= MINIMUM_CORRECTIONS_THRESHOLD ? totalCorrections : 0
    const isLearningActive = totalCorrections >= MINIMUM_CORRECTIONS_THRESHOLD

    // Build improvement categories
    const improvementCategories: CategoryImprovement[] = []
    if (biasWeights?.categoryAdjustments) {
      for (const [category, adjustment] of Object.entries(biasWeights.categoryAdjustments)) {
        if (adjustment !== 0) {
          improvementCategories.push({
            category: category as ConcernCategory,
            adjustment,
            description: generatePatternDescription(category as ConcernCategory, adjustment),
          })
        }
      }
    }

    // Build learned patterns
    const learnedPatterns: LearnedPattern[] = []
    if (biasWeights?.patterns && biasWeights.patterns.length > 0) {
      for (const pattern of biasWeights.patterns.slice(0, 5)) {
        learnedPatterns.push({
          description: `${pattern.originalCategory} → ${pattern.correctedCategory} corrections`,
          category: pattern.originalCategory,
          count: pattern.count,
        })
      }
    } else if (improvementCategories.length > 0) {
      // Generate patterns from category adjustments if no explicit patterns
      for (const cat of improvementCategories.slice(0, 3)) {
        learnedPatterns.push({
          description: cat.description,
          category: cat.category,
          count: Math.ceil(Math.abs(cat.adjustment) / 5),
        })
      }
    }

    const dashboardData: LearningDashboardData = {
      totalCorrections,
      appliedCorrections,
      pendingCorrections: Math.max(0, pendingCorrections),
      accuracyImprovement: calculateAccuracyImprovement(biasWeights?.categoryAdjustments),
      improvementCategories,
      learnedPatterns,
      isLearningActive,
      lastAdaptedAt: biasWeights?.lastUpdatedAt,
      nextProcessingAt: biasWeights?.lastUpdatedAt
        ? biasWeights.lastUpdatedAt + 24 * 60 * 60 * 1000
        : undefined,
    }

    logger.info('Learning dashboard data fetched', {
      familyId,
      userId: auth.uid,
      totalCorrections,
      isLearningActive,
    })

    return dashboardData
  } catch (error) {
    if (error instanceof HttpsError) throw error

    logger.error('Failed to get learning dashboard', {
      familyId,
      userId: auth.uid,
      error: error instanceof Error ? error.message : String(error),
    })

    throw new HttpsError('internal', 'Failed to load learning dashboard data')
  }
})

// =============================================================================
// Reset Family Learning
// =============================================================================

/**
 * Input schema for resetFamilyLearning.
 */
export const resetFamilyLearningInputSchema = z.object({
  familyId: z.string().min(1, 'Family ID is required'),
  confirmReset: z.boolean().refine((val) => val === true, {
    message: 'Must confirm reset by setting confirmReset to true',
  }),
})

export type ResetFamilyLearningInput = z.infer<typeof resetFamilyLearningInputSchema>

export interface ResetFamilyLearningResponse {
  success: boolean
  message: string
  clearedCorrections: number
}

/**
 * Reset family's AI learning data.
 *
 * Story 24.4: Learning Progress Dashboard - AC5
 *
 * Clears:
 * - Bias weights document
 * - Correction patterns
 *
 * Does NOT clear:
 * - App approvals (Story 24.3) - these are explicit preferences
 */
export const resetFamilyLearning = onCall<ResetFamilyLearningInput>(async (request) => {
  const { auth, data } = request

  // Authenticate
  if (!auth?.uid) {
    throw new HttpsError('unauthenticated', 'Must be logged in to reset learning data')
  }

  // Validate input
  const parseResult = resetFamilyLearningInputSchema.safeParse(data)
  if (!parseResult.success) {
    throw new HttpsError('invalid-argument', parseResult.error.errors[0].message)
  }

  const { familyId } = parseResult.data
  const db = getDb()

  try {
    // Verify user is a guardian of this family
    const familyDoc = await db.collection('families').doc(familyId).get()

    if (!familyDoc.exists) {
      throw new HttpsError('not-found', 'Family not found')
    }

    const familyData = familyDoc.data()
    const guardianUids = familyData?.guardianUids || []

    if (!guardianUids.includes(auth.uid)) {
      throw new HttpsError('permission-denied', 'Only guardians can reset learning data')
    }

    // Get current correction count before reset
    const biasWeightsRef = db
      .collection('families')
      .doc(familyId)
      .collection('aiSettings')
      .doc('biasWeights')

    const biasWeightsDoc = await biasWeightsRef.get()
    const clearedCorrections = biasWeightsDoc.exists
      ? (biasWeightsDoc.data() as FamilyBiasWeights)?.correctionCount || 0
      : 0

    // Delete bias weights document
    if (biasWeightsDoc.exists) {
      await biasWeightsRef.delete()
    }

    // Log reset action to audit trail
    const auditRef = db.collection('families').doc(familyId).collection('auditLog').doc()
    await auditRef.set({
      action: 'reset_learning_data',
      actorUid: auth.uid,
      timestamp: FieldValue.serverTimestamp(),
      details: {
        clearedCorrections,
        reason: 'User requested reset via learning dashboard',
      },
    })

    logger.info('Family learning data reset', {
      familyId,
      userId: auth.uid,
      clearedCorrections,
    })

    const response: ResetFamilyLearningResponse = {
      success: true,
      message: `Successfully cleared learning data from ${clearedCorrections} corrections`,
      clearedCorrections,
    }

    return response
  } catch (error) {
    if (error instanceof HttpsError) throw error

    logger.error('Failed to reset family learning', {
      familyId,
      userId: auth.uid,
      error: error instanceof Error ? error.message : String(error),
    })

    throw new HttpsError('internal', 'Failed to reset learning data')
  }
})
