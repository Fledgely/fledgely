/**
 * Family Bias Weights Service
 *
 * Story 24.2: Family-Specific Model Tuning - AC2, AC3, AC4
 *
 * Loads and applies family-specific bias weights to classification confidence.
 * These weights are calculated from parent corrections over time.
 *
 * AC #2: Family model adjustment applied (bias toward corrected patterns)
 * AC #3: Adjustment isolated to family (not affecting others)
 * AC #4: Minimum corrections threshold (5 corrections before applying)
 */

import { getFirestore } from 'firebase-admin/firestore'
import * as logger from 'firebase-functions/logger'
import type { FamilyBiasWeights, ConcernCategory } from '@fledgely/shared'
import { MINIMUM_CORRECTIONS_THRESHOLD } from '@fledgely/shared'

// Cache for family bias weights to reduce Firestore reads
// TTL: 5 minutes (weights don't change frequently)
const biasWeightsCache = new Map<string, { weights: FamilyBiasWeights | null; expiresAt: number }>()
const CACHE_TTL_MS = 5 * 60 * 1000

/**
 * Get family bias weights from Firestore (with caching).
 *
 * @param familyId - Family to get weights for
 * @returns FamilyBiasWeights or null if none exist
 */
export async function getFamilyBiasWeights(familyId: string): Promise<FamilyBiasWeights | null> {
  const now = Date.now()

  // Check cache first
  const cached = biasWeightsCache.get(familyId)
  if (cached && cached.expiresAt > now) {
    return cached.weights
  }

  // Fetch from Firestore
  const db = getFirestore()
  const biasWeightsRef = db
    .collection('families')
    .doc(familyId)
    .collection('aiSettings')
    .doc('biasWeights')

  try {
    const doc = await biasWeightsRef.get()

    if (!doc.exists) {
      // Cache the null result too
      biasWeightsCache.set(familyId, { weights: null, expiresAt: now + CACHE_TTL_MS })
      return null
    }

    const weights = doc.data() as FamilyBiasWeights

    // Cache the result
    biasWeightsCache.set(familyId, { weights, expiresAt: now + CACHE_TTL_MS })

    return weights
  } catch (error) {
    logger.warn('Failed to get family bias weights', {
      familyId,
      error: error instanceof Error ? error.message : String(error),
    })
    return null
  }
}

/**
 * Apply family bias to a category's confidence score.
 *
 * Story 24.2: Family-Specific Model Tuning - AC2, AC3, AC4
 *
 * - If family has < 5 corrections, returns original confidence
 * - If family has >= 5 corrections, applies category-specific adjustment
 * - Adjustment is clamped to ensure confidence stays in 0-100 range
 *
 * @param familyId - Family to apply bias for
 * @param category - Concern category being classified
 * @param originalConfidence - Original AI confidence (0-100)
 * @returns Adjusted confidence (0-100)
 */
export async function applyFamilyBiasToConfidence(
  familyId: string,
  category: ConcernCategory,
  originalConfidence: number
): Promise<number> {
  const biasWeights = await getFamilyBiasWeights(familyId)

  // AC #4: If no weights or below threshold, use original confidence
  if (!biasWeights || biasWeights.correctionCount < MINIMUM_CORRECTIONS_THRESHOLD) {
    return originalConfidence
  }

  // Get category-specific adjustment
  const adjustment = biasWeights.categoryAdjustments?.[category] || 0

  if (adjustment === 0) {
    return originalConfidence
  }

  // Apply adjustment and clamp to valid range
  const adjustedConfidence = Math.max(0, Math.min(100, originalConfidence + adjustment))

  logger.info('Applied family bias to confidence', {
    familyId,
    category,
    originalConfidence,
    adjustment,
    adjustedConfidence,
    correctionCount: biasWeights.correctionCount,
  })

  return adjustedConfidence
}

/**
 * Apply family bias to multiple concern detections.
 *
 * Used by classifyScreenshot to adjust confidence for all detected concerns.
 *
 * @param familyId - Family to apply bias for
 * @param concerns - Array of detected concerns with confidence scores
 * @returns Concerns with adjusted confidence scores
 */
export async function applyFamilyBiasToConcerns<
  T extends { category: ConcernCategory; confidence: number },
>(familyId: string, concerns: T[]): Promise<T[]> {
  const biasWeights = await getFamilyBiasWeights(familyId)

  // AC #4: If no weights or below threshold, return original concerns
  if (!biasWeights || biasWeights.correctionCount < MINIMUM_CORRECTIONS_THRESHOLD) {
    return concerns
  }

  // Apply adjustments to each concern
  const adjustedConcerns: T[] = []

  for (const concern of concerns) {
    const adjustment = biasWeights.categoryAdjustments?.[concern.category] || 0

    if (adjustment === 0) {
      adjustedConcerns.push(concern)
      continue
    }

    const adjustedConfidence = Math.max(0, Math.min(100, concern.confidence + adjustment))

    adjustedConcerns.push({
      ...concern,
      confidence: adjustedConfidence,
    })

    logger.info('Applied family bias to concern', {
      familyId,
      category: concern.category,
      originalConfidence: concern.confidence,
      adjustment,
      adjustedConfidence,
    })
  }

  return adjustedConcerns
}

/**
 * Check if a category should be filtered out due to family bias.
 *
 * If the family has heavily corrected a category (adjustment <= -30),
 * and the concern confidence is now below threshold after adjustment,
 * the concern should be filtered out.
 *
 * @param familyId - Family to check
 * @param category - Category to check
 * @param confidence - Current confidence score
 * @param threshold - Threshold for flagging
 * @returns true if concern should be filtered out
 */
export async function shouldFilterDueToFamilyBias(
  familyId: string,
  category: ConcernCategory,
  confidence: number,
  threshold: number
): Promise<boolean> {
  const adjustedConfidence = await applyFamilyBiasToConfidence(familyId, category, confidence)
  return adjustedConfidence < threshold
}

/**
 * Clear the bias weights cache for a family.
 *
 * Called when bias weights are updated to ensure fresh data.
 *
 * @param familyId - Family to clear cache for
 */
export function clearBiasWeightsCache(familyId: string): void {
  biasWeightsCache.delete(familyId)
}

/**
 * Clear all cached bias weights.
 *
 * Used for testing and when system restarts.
 */
export function clearAllBiasWeightsCache(): void {
  biasWeightsCache.clear()
}
