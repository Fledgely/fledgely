/**
 * Scheduled Screenshot Cleanup Function
 * Story 18.4: Automatic Screenshot Deletion
 *
 * Runs daily to delete expired screenshots from Firebase Storage and Firestore.
 *
 * Key Design Decisions:
 * 1. Collection Group Query: Find all expired screenshots across all children
 * 2. Two-Phase Deletion: Delete Storage blob first, then Firestore document
 * 3. Batch Processing: Process in batches of 500 to avoid timeout
 * 4. Idempotent: Safe to run multiple times, handles already-deleted files
 *
 * Follows Cloud Functions Template pattern:
 * - Scheduled trigger (no HTTP)
 * - Admin SDK (bypasses security rules)
 * - Logging without PII
 */

import { onSchedule } from 'firebase-functions/v2/scheduler'
import { getFirestore, DocumentSnapshot } from 'firebase-admin/firestore'
import { getStorage } from 'firebase-admin/storage'
import * as logger from 'firebase-functions/logger'

/**
 * Batch size for processing expired screenshots.
 * Smaller batches reduce memory usage and allow for more granular progress.
 */
const BATCH_SIZE = 500

/**
 * Maximum number of batches to process in a single run.
 * With BATCH_SIZE=500 and MAX_BATCHES=10, we can process up to 5000 screenshots.
 * This prevents function timeout (9 minutes max).
 */
const MAX_BATCHES = 10

/**
 * Delete a single screenshot from Storage and Firestore.
 *
 * Story 18.4 AC2, AC3: Delete Storage first, then Firestore.
 * If Storage fails, don't delete Firestore (retry on next run).
 * If Firestore fails after Storage success, orphaned metadata is acceptable
 * (will be cleaned up on next run as doc won't match anymore).
 *
 * @param doc - Firestore document snapshot
 * @returns true if deletion succeeded, false if failed
 */
async function deleteScreenshot(doc: DocumentSnapshot): Promise<boolean> {
  const data = doc.data()
  if (!data) {
    logger.warn('Screenshot document has no data', { docPath: doc.ref.path })
    return false
  }

  const { storagePath, screenshotId, childId, uploadedAt } = data

  if (!storagePath || !screenshotId || !childId) {
    logger.warn('Screenshot missing required fields', { screenshotId, docPath: doc.ref.path })
    return false
  }

  try {
    // 1. Delete from Storage first (AC2)
    const bucket = getStorage().bucket()
    const file = bucket.file(storagePath)

    // Use ignoreNotFound for idempotent deletes (AC6)
    await file.delete({ ignoreNotFound: true })

    // 2. Delete Firestore document after storage success (AC3)
    await doc.ref.delete()

    // 3. Log success without PII (AC4)
    // Calculate age safely - if uploadedAt is missing, use -1 to indicate unknown
    const ageInDays = uploadedAt
      ? Math.floor((Date.now() - uploadedAt) / (24 * 60 * 60 * 1000))
      : -1
    logger.info('Screenshot deleted', { screenshotId, childId, ageInDays })

    return true
  } catch (error) {
    // Log error without PII (AC4)
    // Only log error name/type to avoid potential PII in error messages
    logger.error('Screenshot deletion failed', {
      screenshotId,
      errorType: error instanceof Error ? error.name : 'Unknown',
      errorCode: (error as { code?: string }).code || 'UNKNOWN',
    })
    return false
  }
}

/**
 * Scheduled function to cleanup expired screenshots.
 *
 * Story 18.4: Runs daily at 3 AM UTC to delete screenshots
 * where retentionExpiresAt < now.
 *
 * AC1: Query for expired screenshots using retentionExpiresAt index
 * AC5: Batch processing with pagination for efficiency
 * AC6: Continue processing on individual failures
 */
export const cleanupExpiredScreenshots = onSchedule(
  {
    schedule: '0 3 * * *', // Daily at 3 AM UTC
    timeZone: 'UTC',
    retryCount: 3,
    memory: '512MiB',
    timeoutSeconds: 540, // 9 minutes (max for scheduled functions)
  },
  async (_event) => {
    const startTime = Date.now()
    let totalDeleted = 0
    let totalFailed = 0
    let batchCount = 0

    logger.info('Screenshot cleanup started')

    const db = getFirestore()
    const now = Date.now()

    try {
      // Process in batches to handle large volumes (AC5)
      let lastDoc: DocumentSnapshot | null = null

      while (batchCount < MAX_BATCHES) {
        // Build query for expired screenshots (AC1)
        // Uses COLLECTION_GROUP index from Story 18.2
        let query = db
          .collectionGroup('screenshots')
          .where('retentionExpiresAt', '<', now)
          .orderBy('retentionExpiresAt', 'asc')
          .limit(BATCH_SIZE)

        // Paginate using the last document from previous batch
        if (lastDoc) {
          query = query.startAfter(lastDoc)
        }

        const snapshot = await query.get()

        if (snapshot.empty) {
          logger.info('No more expired screenshots to process')
          break
        }

        batchCount++
        logger.info('Processing batch', { batchNumber: batchCount, docsInBatch: snapshot.size })

        // Process each screenshot in the batch (AC6: continue on failure)
        for (const doc of snapshot.docs) {
          const success = await deleteScreenshot(doc)
          if (success) {
            totalDeleted++
          } else {
            totalFailed++
          }
        }

        // Set up pagination for next batch
        lastDoc = snapshot.docs[snapshot.docs.length - 1]

        // If we got fewer docs than BATCH_SIZE, we've processed all expired screenshots
        if (snapshot.size < BATCH_SIZE) {
          break
        }
      }

      const durationMs = Date.now() - startTime

      logger.info('Screenshot cleanup completed', {
        totalDeleted,
        totalFailed,
        batchCount,
        durationMs,
      })
    } catch (error) {
      const durationMs = Date.now() - startTime

      logger.error('Screenshot cleanup failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        totalDeleted,
        totalFailed,
        batchCount,
        durationMs,
      })

      // Re-throw to trigger retry (if retryCount > 0)
      throw error
    }
  }
)
