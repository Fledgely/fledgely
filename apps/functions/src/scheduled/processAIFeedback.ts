/**
 * AI Feedback Processing Scheduled Function.
 *
 * Story 24.2: Family-Specific Model Tuning - AC2, AC5
 *
 * Runs every 6 hours to process unprocessed correction feedback:
 * - Finds unprocessed FamilyFeedback entries
 * - Groups corrections by family
 * - Calculates category-specific confidence adjustments
 * - Updates FamilyBiasWeights documents
 * - Marks feedback entries as processed
 *
 * AC #2: Family model adjustment applied
 * AC #5: Adaptation happens within 24 hours of corrections
 */

import { onSchedule, ScheduledEvent } from 'firebase-functions/v2/scheduler'
import { getFirestore } from 'firebase-admin/firestore'
import * as logger from 'firebase-functions/logger'
import type {
  FamilyFeedback,
  FamilyBiasWeights,
  CorrectionPattern,
  ConcernCategory,
} from '@fledgely/shared'
import {
  MINIMUM_CORRECTIONS_THRESHOLD,
  familyFeedbackSchema,
  familyBiasWeightsSchema,
} from '@fledgely/shared'

const db = getFirestore()

/**
 * Adjustment calculation constants.
 *
 * When a category is frequently corrected, we reduce its confidence.
 * The adjustment is proportional to the frequency of corrections.
 */
const ADJUSTMENT_CONFIG = {
  /** Base adjustment per correction pattern (-5 confidence per correction) */
  BASE_ADJUSTMENT_PER_CORRECTION: -5,
  /** Maximum negative adjustment for any category */
  MAX_NEGATIVE_ADJUSTMENT: -50,
  /** Maximum positive adjustment (for categories corrected TO) */
  MAX_POSITIVE_ADJUSTMENT: 20,
  /** Decay factor for old patterns (older patterns have less weight) */
  PATTERN_DECAY_DAYS: 30,
} as const

/**
 * Process AI feedback - runs every 6 hours.
 *
 * Story 24.2: Family-Specific Model Tuning - AC2, AC5
 *
 * Schedule: Every 6 hours (cron: 0 0/6 * * *)
 * - Finds unprocessed feedback entries across all families
 * - Groups by family and calculates adjustments
 * - Updates FamilyBiasWeights for each family
 * - Marks feedback as processed
 *
 * Idempotent: Uses `processed` flag to prevent double-processing
 */
export const processAIFeedback = onSchedule(
  {
    schedule: '0 */6 * * *', // Every 6 hours at :00
    timeZone: 'UTC',
    retryCount: 3,
    memory: '512MiB',
  },
  async (_event: ScheduledEvent) => {
    const startTime = Date.now()
    let totalFamiliesProcessed = 0
    let totalFeedbackProcessed = 0
    const errors: string[] = []

    try {
      // Query for unprocessed feedback entries
      // Note: We need to query all families' feedback subcollections
      // Using collectionGroup query for this
      const unprocessedQuery = db
        .collectionGroup('feedback')
        .where('processed', '==', false)
        .limit(500) // Process in batches to avoid memory issues

      const snapshot = await unprocessedQuery.get()

      if (snapshot.empty) {
        logger.info('No unprocessed feedback entries found', {
          durationMs: Date.now() - startTime,
        })
        return
      }

      // Group feedback by familyId with Zod validation
      const feedbackByFamily = new Map<string, FamilyFeedback[]>()

      for (const doc of snapshot.docs) {
        const rawData = doc.data()
        const parseResult = familyFeedbackSchema.safeParse(rawData)

        if (!parseResult.success) {
          logger.warn('Invalid feedback document, skipping', {
            docId: doc.id,
            errors: parseResult.error.errors,
          })
          continue
        }

        const feedback = parseResult.data
        const existing = feedbackByFamily.get(feedback.familyId) || []
        existing.push(feedback)
        feedbackByFamily.set(feedback.familyId, existing)
      }

      logger.info('Processing AI feedback', {
        totalFeedback: snapshot.size,
        uniqueFamilies: feedbackByFamily.size,
      })

      // Process each family's feedback
      for (const [familyId, feedbackEntries] of feedbackByFamily) {
        try {
          await processFamilyFeedback(familyId, feedbackEntries)
          totalFamiliesProcessed++
          totalFeedbackProcessed += feedbackEntries.length
        } catch (familyError) {
          const errorMessage =
            familyError instanceof Error ? familyError.message : String(familyError)
          errors.push(`Family ${familyId}: ${errorMessage}`)
          logger.error('Failed to process family feedback', {
            familyId,
            feedbackCount: feedbackEntries.length,
            error: errorMessage,
          })
        }
      }

      logger.info('AI feedback processing completed', {
        familiesProcessed: totalFamiliesProcessed,
        feedbackProcessed: totalFeedbackProcessed,
        errors: errors.length,
        durationMs: Date.now() - startTime,
      })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      logger.error('AI feedback processing failed', {
        error: errorMessage,
        durationMs: Date.now() - startTime,
      })
      throw error // Trigger retry
    }
  }
)

/**
 * Process feedback for a single family.
 *
 * 1. Gets existing bias weights
 * 2. Calculates new adjustments from feedback
 * 3. Merges with existing adjustments
 * 4. Updates FamilyBiasWeights document
 * 5. Marks all feedback as processed
 *
 * @param familyId - Family to process
 * @param feedbackEntries - Unprocessed feedback entries
 */
async function processFamilyFeedback(
  familyId: string,
  feedbackEntries: FamilyFeedback[]
): Promise<void> {
  const now = Date.now()

  // Get existing bias weights
  const biasWeightsRef = db
    .collection('families')
    .doc(familyId)
    .collection('aiSettings')
    .doc('biasWeights')

  const existingDoc = await biasWeightsRef.get()
  let existingWeights: FamilyBiasWeights | null = null

  if (existingDoc.exists) {
    const rawData = existingDoc.data()
    const parseResult = familyBiasWeightsSchema.safeParse(rawData)

    if (parseResult.success) {
      existingWeights = parseResult.data
    } else {
      logger.warn('Invalid existing biasWeights document, treating as new', {
        familyId,
        errors: parseResult.error.errors,
      })
    }
  }

  // Calculate adjustments from new feedback
  const { categoryAdjustments, patterns } = calculateAdjustments(
    feedbackEntries,
    existingWeights?.patterns || []
  )

  // Merge with existing adjustments
  const mergedCategoryAdjustments = mergeAdjustments(
    existingWeights?.categoryAdjustments || {},
    categoryAdjustments
  )

  // Update bias weights
  const updatedWeights: FamilyBiasWeights = {
    familyId,
    correctionCount: (existingWeights?.correctionCount || 0) + feedbackEntries.length,
    lastUpdatedAt: now,
    categoryAdjustments: mergedCategoryAdjustments,
    patterns,
  }

  await biasWeightsRef.set(updatedWeights)

  // Mark all feedback as processed
  const batch = db.batch()
  for (const feedback of feedbackEntries) {
    const feedbackRef = db
      .collection('families')
      .doc(familyId)
      .collection('feedback')
      .doc(feedback.id)

    batch.update(feedbackRef, {
      processed: true,
      processedAt: now,
    })
  }
  await batch.commit()

  logger.info('Family feedback processed', {
    familyId,
    feedbackCount: feedbackEntries.length,
    totalCorrections: updatedWeights.correctionCount,
    isActive: updatedWeights.correctionCount >= MINIMUM_CORRECTIONS_THRESHOLD,
    patternCount: patterns.length,
    categoriesAdjusted: Object.keys(mergedCategoryAdjustments).length,
  })
}

/**
 * Calculate adjustments from feedback entries.
 *
 * For each correction pattern (originalCategory → correctedCategory):
 * - Track the count of corrections
 * - Calculate a negative adjustment for the original category
 *   (since the AI was wrong about it)
 *
 * @param feedbackEntries - New feedback to process
 * @param existingPatterns - Existing correction patterns
 * @returns New category adjustments and updated patterns
 */
function calculateAdjustments(
  feedbackEntries: FamilyFeedback[],
  existingPatterns: CorrectionPattern[]
): {
  categoryAdjustments: Partial<Record<ConcernCategory, number>>
  patterns: CorrectionPattern[]
} {
  // Build pattern map from existing patterns
  const patternMap = new Map<string, CorrectionPattern>()
  for (const pattern of existingPatterns) {
    const key = `${pattern.originalCategory}→${pattern.correctedCategory}`
    patternMap.set(key, { ...pattern })
  }

  // Add new feedback to pattern counts
  for (const feedback of feedbackEntries) {
    const key = `${feedback.originalCategory}→${feedback.correctedCategory}`
    const existing = patternMap.get(key)

    if (existing) {
      existing.count += 1
    } else {
      patternMap.set(key, {
        originalCategory: feedback.originalCategory,
        correctedCategory: feedback.correctedCategory,
        count: 1,
        adjustment: 0, // Will be calculated below
      })
    }
  }

  // Calculate adjustments per pattern
  const categoryAdjustments: Partial<Record<ConcernCategory, number>> = {}

  for (const pattern of patternMap.values()) {
    // Calculate adjustment based on count
    // More corrections = larger negative adjustment for original category
    const rawAdjustment = pattern.count * ADJUSTMENT_CONFIG.BASE_ADJUSTMENT_PER_CORRECTION
    pattern.adjustment = Math.max(rawAdjustment, ADJUSTMENT_CONFIG.MAX_NEGATIVE_ADJUSTMENT)

    // Apply adjustment to original category (reduce confidence)
    const currentAdjustment = categoryAdjustments[pattern.originalCategory] || 0
    categoryAdjustments[pattern.originalCategory] = Math.max(
      currentAdjustment + pattern.adjustment,
      ADJUSTMENT_CONFIG.MAX_NEGATIVE_ADJUSTMENT
    )
  }

  return {
    categoryAdjustments,
    patterns: Array.from(patternMap.values()),
  }
}

/**
 * Clamp a value within the allowed adjustment bounds.
 *
 * @param value - The value to clamp
 * @returns Value clamped between MAX_NEGATIVE_ADJUSTMENT and MAX_POSITIVE_ADJUSTMENT
 */
function clampAdjustment(value: number): number {
  return Math.max(
    ADJUSTMENT_CONFIG.MAX_NEGATIVE_ADJUSTMENT,
    Math.min(ADJUSTMENT_CONFIG.MAX_POSITIVE_ADJUSTMENT, value)
  )
}

/**
 * Merge new adjustments with existing ones.
 *
 * All values are clamped to the allowed bounds (-50 to +20).
 *
 * @param existing - Existing category adjustments
 * @param additions - New adjustments to merge
 * @returns Merged adjustments
 */
function mergeAdjustments(
  existing: Partial<Record<ConcernCategory, number>> | Record<string, number>,
  additions: Partial<Record<ConcernCategory, number>>
): Record<ConcernCategory, number> {
  const merged: Partial<Record<ConcernCategory, number>> = {}

  // Copy existing adjustments with bounds checking
  for (const [category, adjustment] of Object.entries(existing)) {
    if (typeof adjustment === 'number') {
      merged[category as ConcernCategory] = clampAdjustment(adjustment)
    }
  }

  // Apply new adjustments with bounds checking
  // New adjustments replace existing ones (they already include existing pattern counts)
  for (const [category, adjustment] of Object.entries(additions)) {
    if (typeof adjustment === 'number') {
      merged[category as ConcernCategory] = clampAdjustment(adjustment)
    }
  }

  return merged as Record<ConcernCategory, number>
}
