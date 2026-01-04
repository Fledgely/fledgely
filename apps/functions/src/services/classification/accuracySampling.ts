/**
 * Classification Accuracy Sampling Service
 *
 * Story 20.6: Classification Accuracy Monitoring - AC1
 *
 * Samples classifications for human review to measure accuracy.
 */

import { getFirestore } from 'firebase-admin/firestore'
import * as logger from 'firebase-functions/logger'
import {
  type ClassificationReviewQueue,
  type ClassificationDebug,
  type SubmitReviewInput,
  type ClassificationFeedback,
  generateReviewQueueId,
  generateFeedbackId,
  validateReviewInput,
  DEFAULT_DAILY_SAMPLE_SIZE,
} from '@fledgely/shared'

/** Current model version for tracking */
const CURRENT_MODEL_VERSION = 'gemini-1.5-flash'
/** Current taxonomy version for tracking */
const CURRENT_TAXONOMY_VERSION = '1.0.0'

/**
 * Select random samples from recent classifications for human review.
 *
 * AC1: Sample classifications flagged for human review
 *
 * Sampling strategy:
 * - 50% from low-confidence classifications (< 70 confidence)
 * - 50% from high-confidence classifications (random sample)
 *
 * @param sampleSize - Number of samples to select (default: 20)
 * @returns Array of review queue items created
 */
export async function selectRandomSamplesForReview(
  sampleSize: number = DEFAULT_DAILY_SAMPLE_SIZE
): Promise<ClassificationReviewQueue[]> {
  const db = getFirestore()
  const now = Date.now()
  const oneDayAgo = now - 24 * 60 * 60 * 1000

  // Track already-queued screenshots to avoid duplicates
  const existingQueueSnapshot = await db
    .collection('classificationReviewQueue')
    .where('status', '==', 'pending')
    .select('screenshotId')
    .get()

  const alreadyQueuedIds = new Set(existingQueueSnapshot.docs.map((doc) => doc.data().screenshotId))

  const samples: ClassificationReviewQueue[] = []
  const halfSize = Math.ceil(sampleSize / 2)

  // Get low-confidence items first (priority sampling)
  try {
    const lowConfidenceSnapshot = await db
      .collection('classificationDebug')
      .where('timestamp', '>=', oneDayAgo)
      .orderBy('timestamp', 'desc')
      .limit(halfSize * 3) // Get more than needed for filtering
      .get()

    const lowConfidenceItems = lowConfidenceSnapshot.docs
      .filter((doc) => {
        const data = doc.data() as ClassificationDebug
        return data.parsedResult.confidence < 70 && !alreadyQueuedIds.has(data.screenshotId)
      })
      .slice(0, halfSize)

    for (const doc of lowConfidenceItems) {
      const data = doc.data() as ClassificationDebug
      const reviewItem = createReviewQueueItem(data, now)
      samples.push(reviewItem)
      alreadyQueuedIds.add(data.screenshotId)
    }
  } catch (error) {
    logger.warn('Failed to fetch low-confidence samples', { error })
  }

  // Get random high-confidence items
  try {
    const highConfidenceSnapshot = await db
      .collection('classificationDebug')
      .where('timestamp', '>=', oneDayAgo)
      .orderBy('timestamp', 'desc')
      .limit(halfSize * 3) // Get more than needed for filtering
      .get()

    const highConfidenceItems = highConfidenceSnapshot.docs
      .filter((doc) => {
        const data = doc.data() as ClassificationDebug
        return data.parsedResult.confidence >= 70 && !alreadyQueuedIds.has(data.screenshotId)
      })
      // Shuffle for randomness
      .sort(() => Math.random() - 0.5)
      .slice(0, halfSize)

    for (const doc of highConfidenceItems) {
      const data = doc.data() as ClassificationDebug
      const reviewItem = createReviewQueueItem(data, now)
      samples.push(reviewItem)
    }
  } catch (error) {
    logger.warn('Failed to fetch high-confidence samples', { error })
  }

  // Store samples in review queue
  if (samples.length > 0) {
    const batch = db.batch()

    for (const sample of samples) {
      const docRef = db.collection('classificationReviewQueue').doc(sample.id)
      batch.set(docRef, sample)
    }

    await batch.commit()

    logger.info('Created review queue samples', {
      totalSamples: samples.length,
      lowConfidence: samples.filter((s) => s.originalConfidence < 70).length,
      highConfidence: samples.filter((s) => s.originalConfidence >= 70).length,
    })
  }

  return samples
}

/**
 * Create a review queue item from classification debug data.
 */
function createReviewQueueItem(
  debugData: ClassificationDebug,
  timestamp: number
): ClassificationReviewQueue {
  return {
    id: generateReviewQueueId(debugData.screenshotId, timestamp),
    screenshotId: debugData.screenshotId,
    childId: debugData.childId,
    originalCategory: debugData.parsedResult.primaryCategory,
    originalConfidence: debugData.parsedResult.confidence,
    secondaryCategories: debugData.parsedResult.secondaryCategories,
    url: debugData.requestContext.url,
    title: debugData.requestContext.title,
    status: 'pending',
    createdAt: timestamp,
  }
}

/**
 * Get pending items from the review queue.
 *
 * @param limit - Maximum items to return
 * @returns Array of pending review items
 */
export async function getReviewQueue(
  limit: number = 50
): Promise<{ items: ClassificationReviewQueue[]; totalPending: number }> {
  const db = getFirestore()

  // Get total pending count
  const countSnapshot = await db
    .collection('classificationReviewQueue')
    .where('status', '==', 'pending')
    .count()
    .get()

  const totalPending = countSnapshot.data().count

  // Get items
  const snapshot = await db
    .collection('classificationReviewQueue')
    .where('status', '==', 'pending')
    .orderBy('createdAt', 'asc')
    .limit(limit)
    .get()

  const items = snapshot.docs.map((doc) => doc.data() as ClassificationReviewQueue)

  return { items, totalPending }
}

/**
 * Submit a review for a classification.
 *
 * AC2: Accuracy calculated from reviewed samples
 * AC6: Feedback loop for model improvement
 *
 * @param input - Review submission input
 * @param reviewerUid - UID of the reviewer
 * @returns Success status and feedback ID (if created)
 */
export async function submitReview(
  input: SubmitReviewInput,
  reviewerUid: string
): Promise<{ success: boolean; feedbackId?: string; message: string }> {
  // Validate input
  const validationError = validateReviewInput(input)
  if (validationError) {
    return { success: false, message: validationError }
  }

  const db = getFirestore()
  const now = Date.now()

  // Get the review queue item
  const queueRef = db.collection('classificationReviewQueue').doc(input.reviewQueueId)
  const queueDoc = await queueRef.get()

  if (!queueDoc.exists) {
    return { success: false, message: 'Review queue item not found' }
  }

  const queueItem = queueDoc.data() as ClassificationReviewQueue

  if (queueItem.status !== 'pending') {
    return { success: false, message: 'Item has already been reviewed' }
  }

  // Update the review queue item
  const updateData: Partial<ClassificationReviewQueue> = {
    status: 'reviewed',
    reviewedAt: now,
    reviewedByUid: reviewerUid,
    isCorrect: input.isCorrect,
    reviewerNotes: input.reviewerNotes,
  }

  if (!input.isCorrect && input.correctedCategory) {
    updateData.correctedCategory = input.correctedCategory
  }

  await queueRef.update(updateData)

  // If incorrect, create feedback record for model improvement
  let feedbackId: string | undefined

  if (!input.isCorrect && input.correctedCategory) {
    feedbackId = generateFeedbackId(queueItem.screenshotId, now)

    const feedback: ClassificationFeedback = {
      id: feedbackId,
      screenshotId: queueItem.screenshotId,
      childId: queueItem.childId,
      predictedCategory: queueItem.originalCategory,
      predictedConfidence: queueItem.originalConfidence,
      correctCategory: input.correctedCategory,
      url: queueItem.url,
      title: queueItem.title,
      reviewerNotes: input.reviewerNotes,
      createdAt: now,
      reviewedByUid: reviewerUid,
      modelVersion: CURRENT_MODEL_VERSION,
      taxonomyVersion: CURRENT_TAXONOMY_VERSION,
      processedForTraining: false,
    }

    await db.collection('classificationFeedback').doc(feedbackId).set(feedback)

    logger.info('Created classification feedback', {
      feedbackId,
      screenshotId: queueItem.screenshotId,
      predictedCategory: queueItem.originalCategory,
      correctCategory: input.correctedCategory,
    })
  }

  logger.info('Review submitted', {
    reviewQueueId: input.reviewQueueId,
    isCorrect: input.isCorrect,
    feedbackId,
    reviewerUid,
  })

  return {
    success: true,
    feedbackId,
    message: input.isCorrect
      ? 'Classification marked as correct'
      : 'Classification marked as incorrect, feedback recorded',
  }
}

/**
 * Skip a review queue item (mark as skipped).
 *
 * @param reviewQueueId - ID of the item to skip
 * @param reviewerUid - UID of the reviewer
 * @returns Success status
 */
export async function skipReviewItem(
  reviewQueueId: string,
  reviewerUid: string
): Promise<{ success: boolean; message: string }> {
  const db = getFirestore()
  const now = Date.now()

  const queueRef = db.collection('classificationReviewQueue').doc(reviewQueueId)
  const queueDoc = await queueRef.get()

  if (!queueDoc.exists) {
    return { success: false, message: 'Review queue item not found' }
  }

  const queueItem = queueDoc.data() as ClassificationReviewQueue

  if (queueItem.status !== 'pending') {
    return { success: false, message: 'Item has already been processed' }
  }

  await queueRef.update({
    status: 'skipped',
    reviewedAt: now,
    reviewedByUid: reviewerUid,
  })

  return { success: true, message: 'Item skipped' }
}

/**
 * Get review statistics for a time period.
 *
 * @param startDate - Start of period (Unix timestamp ms)
 * @param endDate - End of period (Unix timestamp ms)
 * @returns Review statistics
 */
export async function getReviewStats(
  startDate: number,
  endDate: number
): Promise<{
  totalReviewed: number
  correctCount: number
  incorrectCount: number
  skippedCount: number
}> {
  const db = getFirestore()

  const snapshot = await db
    .collection('classificationReviewQueue')
    .where('reviewedAt', '>=', startDate)
    .where('reviewedAt', '<', endDate)
    .get()

  let correctCount = 0
  let incorrectCount = 0
  let skippedCount = 0

  for (const doc of snapshot.docs) {
    const data = doc.data() as ClassificationReviewQueue
    if (data.status === 'reviewed') {
      if (data.isCorrect) {
        correctCount++
      } else {
        incorrectCount++
      }
    } else if (data.status === 'skipped') {
      skippedCount++
    }
  }

  return {
    totalReviewed: correctCount + incorrectCount,
    correctCount,
    incorrectCount,
    skippedCount,
  }
}
