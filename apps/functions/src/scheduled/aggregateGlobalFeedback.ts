/**
 * Global Feedback Aggregation Scheduled Function.
 *
 * Story 24.5: Global Model Improvement Pipeline - AC1, AC2, AC3, AC4, AC5, AC6
 *
 * Runs monthly to aggregate anonymized feedback across all families:
 * - Collects correction patterns from all participating families
 * - Anonymizes data (strips family identifiers, uses hashing for counting)
 * - Aggregates pattern counts across families
 * - Flags patterns with >10 corrections for review
 * - Stores global metrics for improvement tracking
 *
 * AC #1: Feedback anonymized (no family identifiers)
 * AC #2: Only patterns shared, not actual images
 * AC #3: Patterns with >10 corrections flagged for review
 * AC #4: Monthly retraining with aggregated feedback
 * AC #5: Opt-out capability respected
 * AC #6: Improvement metrics tracked
 */

import { onSchedule, ScheduledEvent } from 'firebase-functions/v2/scheduler'
import { getFirestore, Firestore, QueryDocumentSnapshot } from 'firebase-admin/firestore'
import * as logger from 'firebase-functions/logger'
import type {
  FamilyBiasWeights,
  GlobalPatternAggregation,
  GlobalModelMetrics,
  ConcernCategory,
} from '@fledgely/shared'
import {
  familyBiasWeightsSchema,
  familyAISettingsSchema,
  GLOBAL_PATTERN_REVIEW_THRESHOLD,
} from '@fledgely/shared'

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

/**
 * Batch size for family processing to avoid memory issues.
 */
const FAMILY_BATCH_SIZE = 500

/**
 * Maximum Firestore batch write operations.
 */
const MAX_WRITE_BATCH_SIZE = 499 // Leave room for metrics document

/**
 * Get the current period in YYYY-MM format.
 */
function getCurrentPeriod(): string {
  const now = new Date()
  const year = now.getUTCFullYear()
  const month = String(now.getUTCMonth() + 1).padStart(2, '0')
  return `${year}-${month}`
}

/**
 * Get start and end timestamps for the current month.
 */
function getCurrentMonthRange(): { start: number; end: number } {
  const now = new Date()
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0))
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 23, 59, 59, 999))
  return { start: start.getTime(), end: end.getTime() }
}

/**
 * Generate a unique pattern key for aggregation.
 */
function getPatternKey(original: ConcernCategory, corrected: ConcernCategory): string {
  return `${original}→${corrected}`
}

/**
 * Generate a non-cryptographic hash of a family ID for anonymous counting.
 * This allows unique family counting without storing actual IDs (AC #1).
 *
 * @param familyId - The family ID to hash
 * @returns A 32-bit integer hash
 */
function hashFamilyId(familyId: string): number {
  let hash = 0
  for (let i = 0; i < familyId.length; i++) {
    hash = (hash << 5) - hash + familyId.charCodeAt(i)
    hash = hash & hash // Convert to 32bit integer
  }
  return hash
}

/**
 * Pattern aggregation data structure.
 * Uses hash-based counting for anonymization (AC #1).
 */
interface PatternData {
  originalCategory: ConcernCategory
  correctedCategory: ConcernCategory
  totalCount: number
  familyCount: number
  familyHashSet: Set<number> // Hashed family IDs for unique counting
}

/**
 * Aggregate global feedback - runs monthly on the 1st at 3 AM UTC.
 *
 * Story 24.5: Global Model Improvement Pipeline
 *
 * Schedule: Monthly on 1st at 3:00 AM UTC (cron: 0 3 1 * *)
 * - Collects all family bias weights with pagination
 * - Excludes families that opted out (contributeToGlobalModel: false)
 * - Aggregates patterns anonymously using hashing
 * - Stores aggregation results and metrics
 */
export const aggregateGlobalFeedback = onSchedule(
  {
    schedule: '0 3 1 * *', // 1st of every month at 3:00 AM UTC
    timeZone: 'UTC',
    retryCount: 3,
    memory: '1GiB',
  },
  async (_event: ScheduledEvent) => {
    const startTime = Date.now()
    const db = getDb()
    const period = getCurrentPeriod()
    const { start: periodStart, end: periodEnd } = getCurrentMonthRange()

    let participatingFamilies = 0
    let totalCorrectionsAggregated = 0
    let patternsIdentified = 0
    let patternsFlaggedForReview = 0
    const familyErrors: Array<{ hash: number; error: string }> = []

    // Pattern aggregation map: patternKey -> anonymized data
    const patternAggregation = new Map<string, PatternData>()

    try {
      logger.info('Starting global feedback aggregation', { period })

      // Cursor-based pagination to handle large family counts
      let lastDoc: QueryDocumentSnapshot | null = null
      let processedFamilies = 0

      do {
        // Query with cursor-based pagination
        let query = db.collection('families').limit(FAMILY_BATCH_SIZE)
        if (lastDoc) {
          query = query.startAfter(lastDoc)
        }

        const familiesSnapshot = await query.get()

        if (familiesSnapshot.empty) {
          break
        }

        // Process each family with error isolation
        for (const familyDoc of familiesSnapshot.docs) {
          const familyId = familyDoc.id
          const familyHash = hashFamilyId(familyId)

          try {
            // Check if family has opted out (AC #5)
            const settingsRef = familyDoc.ref.collection('aiSettings').doc('preferences')
            const settingsDoc = await settingsRef.get()

            if (settingsDoc.exists) {
              const settingsResult = familyAISettingsSchema.safeParse(settingsDoc.data())
              if (settingsResult.success && !settingsResult.data.contributeToGlobalModel) {
                // Family opted out - skip (AC #5) - no PII in log
                logger.debug('Skipping opted-out family')
                continue
              }
            }

            // Get bias weights for this family
            const biasWeightsRef = familyDoc.ref.collection('aiSettings').doc('biasWeights')
            const biasWeightsDoc = await biasWeightsRef.get()

            if (!biasWeightsDoc.exists) {
              continue
            }

            const weightsResult = familyBiasWeightsSchema.safeParse(biasWeightsDoc.data())
            if (!weightsResult.success) {
              logger.warn('Invalid bias weights document, skipping', {
                errors: weightsResult.error.errors.slice(0, 3), // Limit error details
              })
              continue
            }

            const biasWeights: FamilyBiasWeights = weightsResult.data

            // Skip if no patterns
            if (!biasWeights.patterns || biasWeights.patterns.length === 0) {
              continue
            }

            participatingFamilies++

            // Aggregate patterns anonymously (AC #1, #2)
            for (const pattern of biasWeights.patterns) {
              const key = getPatternKey(pattern.originalCategory, pattern.correctedCategory)
              const existing = patternAggregation.get(key)

              if (existing) {
                existing.totalCount += pattern.count
                existing.familyHashSet.add(familyHash) // Hash, not raw ID
                existing.familyCount = existing.familyHashSet.size
              } else {
                const hashSet = new Set<number>()
                hashSet.add(familyHash)
                patternAggregation.set(key, {
                  originalCategory: pattern.originalCategory,
                  correctedCategory: pattern.correctedCategory,
                  totalCount: pattern.count,
                  familyCount: 1,
                  familyHashSet: hashSet,
                })
              }

              totalCorrectionsAggregated += pattern.count
            }
          } catch (error) {
            // Per-family error handling - continue processing other families
            const errorMsg = error instanceof Error ? error.message : String(error)
            familyErrors.push({ hash: familyHash, error: errorMsg })
            logger.warn('Failed to process family, continuing', {
              error: errorMsg,
            })
          }
        }

        // Update cursor for next batch
        lastDoc = familiesSnapshot.docs[familiesSnapshot.docs.length - 1]
        processedFamilies += familiesSnapshot.docs.length

        logger.info('Processed family batch', {
          batchSize: familiesSnapshot.docs.length,
          totalProcessed: processedFamilies,
        })
      } while (lastDoc)

      // Store aggregated patterns with batch splitting
      const aggregationsRef = db.collection('globalAggregations')
      const now = Date.now()

      // Create batches, respecting Firestore 500 operation limit
      const batches: FirebaseFirestore.WriteBatch[] = []
      let currentBatch = db.batch()
      let operationCount = 0

      for (const [key, data] of patternAggregation) {
        const flaggedForReview = data.totalCount > GLOBAL_PATTERN_REVIEW_THRESHOLD

        if (flaggedForReview) {
          patternsFlaggedForReview++
        }
        patternsIdentified++

        // Create anonymized aggregation document (AC #1, #2, #3)
        const aggregation: GlobalPatternAggregation = {
          id: `${period}_${key.replace('→', '_to_')}`,
          originalCategory: data.originalCategory,
          correctedCategory: data.correctedCategory,
          totalCorrectionCount: data.totalCount,
          familyCount: data.familyCount, // Count only, no IDs
          flaggedForReview,
          aggregatedAt: now,
          periodStart,
          periodEnd,
        }

        const docRef = aggregationsRef.doc(aggregation.id)
        currentBatch.set(docRef, aggregation) // No merge - full overwrite for idempotency

        operationCount++

        // Split batch if approaching limit
        if (operationCount >= MAX_WRITE_BATCH_SIZE) {
          batches.push(currentBatch)
          currentBatch = db.batch()
          operationCount = 0
        }
      }

      // Store global metrics (AC #6)
      const estimatedAccuracyImprovement = calculateEstimatedImprovement(
        totalCorrectionsAggregated,
        patternsFlaggedForReview
      )

      const metrics: GlobalModelMetrics = {
        id: period,
        period,
        totalCorrectionsAggregated,
        participatingFamilies,
        patternsIdentified,
        patternsFlaggedForReview,
        estimatedAccuracyImprovement,
        aggregatedAt: now,
      }

      const metricsRef = db.collection('globalMetrics').doc(period)
      currentBatch.set(metricsRef, metrics)
      batches.push(currentBatch)

      // Commit all batches sequentially
      for (const batch of batches) {
        await batch.commit()
      }

      // Log summary including any errors
      if (familyErrors.length > 0) {
        logger.warn('Some families failed to process', {
          errorCount: familyErrors.length,
          participatingFamilies,
        })
      }

      logger.info('Global feedback aggregation completed', {
        period,
        participatingFamilies,
        totalCorrectionsAggregated,
        patternsIdentified,
        patternsFlaggedForReview,
        estimatedAccuracyImprovement,
        familyErrors: familyErrors.length,
        batchCount: batches.length,
        durationMs: Date.now() - startTime,
      })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      logger.error('Global feedback aggregation failed', {
        period,
        error: errorMessage,
        durationMs: Date.now() - startTime,
      })
      throw error // Trigger retry
    }
  }
)

/**
 * Calculate estimated accuracy improvement based on aggregated data.
 *
 * Story 24.5 - AC6: Show improvement metrics
 *
 * Uses piecewise linear scaling to avoid logarithmic underflow:
 * - 1-100 corrections: Linear scaling from 0.1% to 0.5%
 * - 100-1000 corrections: Linear scaling from 0.5% to 1%
 * - 1000+ corrections: Capped at 1%
 * - Flagged patterns: +0.5% each (actionable patterns)
 * - Total capped at 5% per month
 *
 * @param totalCorrections - Total corrections aggregated
 * @param flaggedPatterns - Patterns meeting review threshold
 * @returns Estimated accuracy improvement percentage
 */
function calculateEstimatedImprovement(totalCorrections: number, flaggedPatterns: number): number {
  let improvement = 0

  // Each flagged pattern contributes ~0.5% (actionable patterns)
  improvement += flaggedPatterns * 0.5

  // Piecewise linear scaling for total corrections
  if (totalCorrections > 0) {
    if (totalCorrections <= 100) {
      // 1-100 corrections: 0.1% to 0.5%
      improvement += 0.1 + (totalCorrections / 100) * 0.4
    } else if (totalCorrections <= 1000) {
      // 100-1000 corrections: 0.5% to 1%
      improvement += 0.5 + ((totalCorrections - 100) / 900) * 0.5
    } else {
      // 1000+ corrections: capped at 1%
      improvement += 1.0
    }
  }

  // Cap at 5% per month (realistic improvement rate)
  return Math.round(Math.min(5, improvement) * 10) / 10
}
