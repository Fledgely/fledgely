/**
 * Re-classification Utilities
 *
 * Story 20.5: Classification Metadata Storage - AC5
 *
 * Provides functions to mark screenshots for re-classification
 * and query by model/taxonomy version.
 */

import { getFirestore, Query, QuerySnapshot } from 'firebase-admin/firestore'
import * as logger from 'firebase-functions/logger'

/**
 * Mark a screenshot for re-classification.
 *
 * Story 20.5: Classification Metadata Storage - AC5
 *
 * Resets the classification status to 'pending' so it will be
 * picked up by the classification trigger again.
 *
 * @param childId - Child ID
 * @param screenshotId - Screenshot ID to re-classify
 * @returns true if successfully marked, false otherwise
 */
export async function markForReclassification(
  childId: string,
  screenshotId: string
): Promise<boolean> {
  const db = getFirestore()
  const screenshotRef = db
    .collection('children')
    .doc(childId)
    .collection('screenshots')
    .doc(screenshotId)

  try {
    await screenshotRef.update({
      'classification.status': 'pending',
      'classification.markedForReclassAt': Date.now(),
    })

    logger.info('Screenshot marked for re-classification', {
      screenshotId,
      childId,
    })

    return true
  } catch (error) {
    logger.error('Failed to mark screenshot for re-classification', {
      screenshotId,
      childId,
      error: error instanceof Error ? error.message : String(error),
    })
    return false
  }
}

/**
 * Find screenshots by model version.
 *
 * Story 20.5: Classification Metadata Storage - AC5
 *
 * Returns completed screenshots that were classified with a specific
 * model version. Useful for identifying screenshots to re-classify
 * when the model is updated.
 *
 * @param modelVersion - Model version to filter by
 * @param limit - Maximum number of results (default 100)
 * @returns QuerySnapshot of matching screenshots
 */
export async function findScreenshotsByModelVersion(
  modelVersion: string,
  limit: number = 100
): Promise<QuerySnapshot> {
  const db = getFirestore()

  // Use collectionGroup to query across all children
  const query: Query = db
    .collectionGroup('screenshots')
    .where('classification.modelVersion', '==', modelVersion)
    .where('classification.status', '==', 'completed')
    .limit(limit)

  return query.get()
}

/**
 * Find screenshots by taxonomy version.
 *
 * Story 20.5: Classification Metadata Storage - AC5
 *
 * Returns completed screenshots that were classified with a specific
 * taxonomy version. Useful for identifying screenshots to re-classify
 * when the taxonomy is updated.
 *
 * @param taxonomyVersion - Taxonomy version to filter by
 * @param limit - Maximum number of results (default 100)
 * @returns QuerySnapshot of matching screenshots
 */
export async function findScreenshotsByTaxonomyVersion(
  taxonomyVersion: string,
  limit: number = 100
): Promise<QuerySnapshot> {
  const db = getFirestore()

  const query: Query = db
    .collectionGroup('screenshots')
    .where('classification.taxonomyVersion', '==', taxonomyVersion)
    .where('classification.status', '==', 'completed')
    .limit(limit)

  return query.get()
}

/**
 * Batch mark multiple screenshots for re-classification.
 *
 * Story 20.5: Classification Metadata Storage - AC5
 *
 * Efficiently marks multiple screenshots for re-classification
 * in a single batch operation.
 *
 * @param screenshots - Array of {childId, screenshotId} to mark
 * @returns Number of successfully marked screenshots
 */
export async function batchMarkForReclassification(
  screenshots: Array<{ childId: string; screenshotId: string }>
): Promise<number> {
  if (screenshots.length === 0) {
    return 0
  }

  const db = getFirestore()
  const batch = db.batch()
  const now = Date.now()

  for (const { childId, screenshotId } of screenshots) {
    const ref = db.collection('children').doc(childId).collection('screenshots').doc(screenshotId)

    batch.update(ref, {
      'classification.status': 'pending',
      'classification.markedForReclassAt': now,
    })
  }

  try {
    await batch.commit()
    logger.info('Batch marked screenshots for re-classification', {
      count: screenshots.length,
    })
    return screenshots.length
  } catch (error) {
    logger.error('Failed to batch mark screenshots for re-classification', {
      count: screenshots.length,
      error: error instanceof Error ? error.message : String(error),
    })
    return 0
  }
}
