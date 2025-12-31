/**
 * Flag Corrected Trigger
 *
 * Story 24.2: Family-Specific Model Tuning - AC1, AC5
 *
 * Firestore trigger that fires when a flag document is updated with a correction.
 * Adds the correction to the family's feedback corpus for AI learning.
 */

import { onDocumentUpdated } from 'firebase-functions/v2/firestore'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import * as logger from 'firebase-functions/logger'
import type { FlagDocument, FamilyFeedback, ConcernCategory } from '@fledgely/shared'
import { CONCERN_CATEGORY_VALUES } from '@fledgely/shared'

/**
 * Validate that a value is a valid ConcernCategory.
 */
function isValidConcernCategory(value: unknown): value is ConcernCategory {
  return typeof value === 'string' && CONCERN_CATEGORY_VALUES.includes(value as ConcernCategory)
}

/**
 * Firestore trigger for flag correction updates.
 *
 * Story 24.2: Family-Specific Model Tuning - AC1, AC5
 *
 * Triggers on: children/{childId}/flags/{flagId}
 *
 * When a flag is updated with a correctedCategory:
 * 1. Validates the correction is new (not previously corrected)
 * 2. Creates a FamilyFeedback entry in the family's feedback collection
 * 3. Increments the correction count for the family
 *
 * AC #1: Correction added to feedback corpus
 * AC #5: Adaptation happens within 24 hours (via scheduled function)
 */
export const onFlagCorrected = onDocumentUpdated(
  {
    document: 'children/{childId}/flags/{flagId}',
    region: 'us-central1',
    memory: '256MiB',
    timeoutSeconds: 60,
  },
  async (event) => {
    const beforeSnapshot = event.data?.before
    const afterSnapshot = event.data?.after

    if (!beforeSnapshot || !afterSnapshot) {
      logger.warn('onFlagCorrected: Missing before/after data')
      return
    }

    const { childId, flagId } = event.params
    const beforeData = beforeSnapshot.data() as FlagDocument
    const afterData = afterSnapshot.data() as FlagDocument

    // Only proceed if correctedCategory was added (not present before, present after)
    const hadCorrectionBefore = !!beforeData.correctedCategory
    const hasCorrectionNow = !!afterData.correctedCategory

    if (hadCorrectionBefore || !hasCorrectionNow) {
      // Either already had correction, or still doesn't have one
      return
    }

    // Validate categories
    if (!isValidConcernCategory(afterData.category)) {
      logger.warn('onFlagCorrected: Invalid original category', {
        flagId,
        category: afterData.category,
      })
      return
    }

    if (!isValidConcernCategory(afterData.correctedCategory)) {
      logger.warn('onFlagCorrected: Invalid corrected category', {
        flagId,
        correctedCategory: afterData.correctedCategory,
      })
      return
    }

    const {
      familyId,
      category: originalCategory,
      correctedCategory,
      correctionParentId,
      correctedAt,
    } = afterData

    if (!familyId || !correctionParentId || !correctedAt) {
      logger.warn('onFlagCorrected: Missing required correction fields', {
        flagId,
        hasFamilyId: !!familyId,
        hasCorrectionParentId: !!correctionParentId,
        hasCorrectedAt: !!correctedAt,
      })
      return
    }

    const db = getFirestore()

    // SECURITY: Verify correctionParentId is a guardian of this family
    const familyRef = db.collection('families').doc(familyId)
    const familyDoc = await familyRef.get()

    if (!familyDoc.exists) {
      logger.warn('onFlagCorrected: Family not found', {
        flagId,
        familyId,
      })
      return
    }

    const familyData = familyDoc.data()
    const guardianUids: string[] = familyData?.guardianUids || []

    if (!guardianUids.includes(correctionParentId)) {
      logger.error('onFlagCorrected: SECURITY VIOLATION - correctionParentId not a guardian', {
        flagId,
        familyId,
        correctionParentId,
      })
      // This is a security violation - reject the correction
      return
    }

    // SECURITY: Verify correction timestamp is recent (within 5 minutes)
    const now = Date.now()
    const timeDiff = Math.abs(now - correctedAt)
    const MAX_TIMESTAMP_DRIFT_MS = 5 * 60 * 1000 // 5 minutes

    if (timeDiff > MAX_TIMESTAMP_DRIFT_MS) {
      logger.warn('onFlagCorrected: Correction timestamp suspicious', {
        flagId,
        correctedAt,
        now,
        timeDiff,
      })
      // Don't reject - might be clock skew, but log for monitoring
    }

    logger.info('Flag corrected, adding to feedback corpus', {
      childId,
      flagId,
      familyId,
      originalCategory,
      correctedCategory,
      correctionParentId,
    })

    try {
      // Generate feedback ID
      const feedbackId = `fb_${flagId}_${correctedAt}`

      // Create feedback entry
      const feedbackEntry: FamilyFeedback = {
        id: feedbackId,
        familyId,
        flagId,
        childId,
        originalCategory,
        correctedCategory,
        correctedBy: correctionParentId,
        correctedAt,
        processed: false,
      }

      // Write to family feedback collection
      const feedbackRef = db
        .collection('families')
        .doc(familyId)
        .collection('feedback')
        .doc(feedbackId)

      await feedbackRef.set(feedbackEntry)

      logger.info('Feedback entry created successfully', {
        feedbackId,
        familyId,
        flagId,
      })

      // Increment correction count in family's AI settings
      // This is used for the threshold check (5 corrections needed)
      const aiSettingsRef = db
        .collection('families')
        .doc(familyId)
        .collection('aiSettings')
        .doc('biasWeights')

      await aiSettingsRef.set(
        {
          familyId,
          correctionCount: FieldValue.increment(1),
          lastUpdatedAt: Date.now(),
        },
        { merge: true }
      )

      logger.info('Family correction count incremented', {
        familyId,
        flagId,
      })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      logger.error('Failed to add correction to feedback corpus', {
        childId,
        flagId,
        familyId,
        error: errorMessage,
      })

      // Check if error is retryable (transient infrastructure errors)
      const isRetryable =
        errorMessage.includes('UNAVAILABLE') ||
        errorMessage.includes('DEADLINE_EXCEEDED') ||
        errorMessage.includes('INTERNAL')

      if (isRetryable) {
        // Throw to trigger automatic Cloud Functions retry
        throw new Error(`Retryable error in onFlagCorrected: ${errorMessage}`)
      }
      // For permanent errors (permission denied, invalid argument), don't retry
    }
  }
)
