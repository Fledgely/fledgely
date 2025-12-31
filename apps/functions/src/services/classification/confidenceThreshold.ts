/**
 * Confidence Threshold Service
 *
 * Story 21.4: Concern Confidence Thresholds - AC1, AC2, AC5
 *
 * Manages confidence threshold configuration for concern flagging.
 * Determines whether detected concerns should create flags based on
 * family-configured thresholds.
 */

import { getFirestore } from 'firebase-admin/firestore'
import * as logger from 'firebase-functions/logger'
import {
  CONFIDENCE_THRESHOLD_VALUES,
  ALWAYS_FLAG_THRESHOLD,
  type ConfidenceThresholdLevel,
  type ConcernCategory,
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
 * Get the effective confidence threshold for a concern category.
 *
 * AC2: Default threshold is 75% (balanced)
 * AC4: Category-specific override takes precedence
 *
 * Resolution order:
 * 1. Per-category override if configured
 * 2. Global threshold level setting
 * 3. Default 75% (balanced) if nothing configured
 *
 * @param familyId - Family ID to get threshold for
 * @param category - Concern category to get threshold for
 * @returns Confidence threshold (0-100)
 */
export async function getEffectiveThreshold(
  familyId: string,
  category: ConcernCategory
): Promise<number> {
  try {
    const familyDoc = await getDb().collection('families').doc(familyId).get()

    if (!familyDoc.exists) {
      // Family not found - use default balanced threshold
      return CONFIDENCE_THRESHOLD_VALUES.balanced
    }

    const data = familyDoc.data()
    const settings = data?.settings || {}

    // 1. Check for category-specific override
    const categoryThresholds = settings.categoryConfidenceThresholds
    if (categoryThresholds && categoryThresholds[category] !== undefined) {
      return categoryThresholds[category]
    }

    // 2. Use global threshold level if configured
    const level = settings.confidenceThresholdLevel as ConfidenceThresholdLevel | undefined
    if (level && CONFIDENCE_THRESHOLD_VALUES[level] !== undefined) {
      return CONFIDENCE_THRESHOLD_VALUES[level]
    }

    // 3. Default to balanced (75%)
    return CONFIDENCE_THRESHOLD_VALUES.balanced
  } catch (error) {
    // On Firestore error, fall back to default threshold to avoid blocking classification
    logger.warn('Failed to get confidence threshold, using default', {
      familyId,
      category,
      error: error instanceof Error ? error.message : String(error),
    })
    return CONFIDENCE_THRESHOLD_VALUES.balanced
  }
}

/**
 * Determine if a concern should create a flag based on confidence threshold.
 *
 * AC1: Flag created only if confidence >= configured threshold
 * AC5: Very high confidence (95%+) ALWAYS flags (safety measure)
 *
 * @param confidence - Confidence score (0-100)
 * @param category - Concern category
 * @param familyId - Family ID
 * @returns true if flag should be created, false if concern should be discarded
 */
export async function shouldCreateFlag(
  confidence: number,
  category: ConcernCategory,
  familyId: string
): Promise<boolean> {
  // AC5: Always flag very high confidence concerns (safety measure)
  // This cannot be overridden by any family setting
  if (confidence >= ALWAYS_FLAG_THRESHOLD) {
    return true
  }

  // AC1: Check against configured threshold
  const threshold = await getEffectiveThreshold(familyId, category)
  return confidence >= threshold
}

/**
 * Get the family's configured confidence threshold level.
 * Returns 'balanced' if not configured.
 *
 * @param familyId - Family ID
 * @returns Configured threshold level or 'balanced' default
 */
export async function getFamilyThresholdLevel(familyId: string): Promise<ConfidenceThresholdLevel> {
  try {
    const familyDoc = await getDb().collection('families').doc(familyId).get()

    if (!familyDoc.exists) {
      return 'balanced'
    }

    const data = familyDoc.data()
    const level = data?.settings?.confidenceThresholdLevel as ConfidenceThresholdLevel | undefined

    if (level && CONFIDENCE_THRESHOLD_VALUES[level] !== undefined) {
      return level
    }

    return 'balanced'
  } catch (error) {
    logger.warn('Failed to get family threshold level, using default', {
      familyId,
      error: error instanceof Error ? error.message : String(error),
    })
    return 'balanced'
  }
}
