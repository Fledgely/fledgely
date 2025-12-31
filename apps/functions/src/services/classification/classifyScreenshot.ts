/**
 * Screenshot Classification Logic
 *
 * Story 20.1: Classification Service Architecture - AC2, AC3, AC4, AC6
 * Story 20.3: Confidence Score Assignment - AC4 (needsReview flag)
 * Story 20.5: Classification Metadata Storage - AC4 (debug storage)
 *
 * Core classification logic that orchestrates image retrieval,
 * Gemini API calls, and result storage.
 */

import { getFirestore } from 'firebase-admin/firestore'
import { getStorage } from 'firebase-admin/storage'
import * as logger from 'firebase-functions/logger'
import {
  type ClassificationJob,
  type ClassificationResult,
  type ConcernFlag,
} from '@fledgely/shared'
import { createGeminiClient, type DetectedConcern } from './geminiClient'
import { retryWithBackoff } from './retryWithBackoff'
import { storeClassificationDebug } from './storeDebug'

/**
 * Result of classifyScreenshot operation.
 */
export interface ClassificationOperationResult {
  success: boolean
  result?: ClassificationResult
  error?: string
}

/**
 * Classify a screenshot and update Firestore document.
 *
 * Story 20.1: Classification Service Architecture - AC2, AC3, AC4, AC6
 *
 * This is the main classification function that:
 * 1. Retrieves the image from Firebase Storage
 * 2. Calls Gemini Vision API for classification
 * 3. Updates the screenshot document with results
 * 4. Handles retries with exponential backoff
 *
 * @param job - Classification job parameters
 * @returns Classification operation result
 */
export async function classifyScreenshot(
  job: ClassificationJob
): Promise<ClassificationOperationResult> {
  const { childId, screenshotId, storagePath, url, title, retryCount = 0 } = job
  const db = getFirestore()
  const screenshotRef = db
    .collection('children')
    .doc(childId)
    .collection('screenshots')
    .doc(screenshotId)

  try {
    // Mark as processing
    await screenshotRef.update({
      'classification.status': 'processing',
      'classification.retryCount': retryCount,
    })

    // 1. Retrieve image from Firebase Storage
    const imageBase64 = await retrieveImageFromStorage(storagePath)

    // 2. Call Gemini API with retry logic - basic classification
    const geminiClient = createGeminiClient()
    const classificationResult = await retryWithBackoff(
      () => geminiClient.classifyImage(imageBase64, 'image/jpeg', url, title),
      {
        maxRetries: 2, // Inner retries for transient API errors
        context: `classifyImage:${screenshotId}`,
      }
    )

    // Story 21.1: Concerning Content Categories - AC1, AC3
    // Call concern detection SEPARATELY from basic classification
    // Concerns coexist with basic categories (a Gaming screenshot can have Violence concerns)
    const concernResult = await retryWithBackoff(
      () => geminiClient.detectConcerns(imageBase64, 'image/jpeg', url, title),
      {
        maxRetries: 2, // Inner retries for transient API errors
        context: `detectConcerns:${screenshotId}`,
      }
    )

    // Convert detected concerns to ConcernFlag format for storage
    const concernFlags: ConcernFlag[] = concernResult.concerns.map(
      (concern: DetectedConcern): ConcernFlag => ({
        category: concern.category,
        severity: concern.severity,
        confidence: concern.confidence,
        reasoning: concern.reasoning,
        detectedAt: Date.now(),
      })
    )

    // 3. Build result object
    // Story 20.2: Basic Category Taxonomy - AC5, AC6
    // Story 20.3: Confidence Score Assignment - AC4
    // Story 20.4: Multi-Label Classification - AC1, AC2, AC3
    // Story 21.1: Concerning Content Categories - AC1, AC3, AC4, AC5
    // Include isLowConfidence, taxonomyVersion, needsReview, secondaryCategories, and concernFlags
    const classifiedAt = Date.now()
    const modelVersion = geminiClient.getModelVersion()
    const result: ClassificationResult = {
      status: 'completed',
      primaryCategory: classificationResult.primaryCategory,
      confidence: classificationResult.confidence,
      classifiedAt,
      modelVersion,
      retryCount,
      isLowConfidence: classificationResult.isLowConfidence,
      taxonomyVersion: classificationResult.taxonomyVersion,
      needsReview: classificationResult.needsReview,
      // Story 20.4: Store secondary categories (only if non-empty)
      ...(classificationResult.secondaryCategories.length > 0 && {
        secondaryCategories: classificationResult.secondaryCategories,
      }),
      // Story 21.1: Store concern flags (only if non-empty) - AC3
      ...(concernFlags.length > 0 && {
        concernFlags,
        concernTaxonomyVersion: concernResult.taxonomyVersion,
      }),
    }

    // Story 20.5: Store debug data for analysis (AC4)
    // Story 21.1: Include concern detection debug data (AC5)
    // Fire-and-forget - don't block on debug storage
    storeClassificationDebug({
      screenshotId,
      childId,
      requestContext: {
        url,
        title,
        imageSize: Buffer.from(imageBase64, 'base64').length,
      },
      rawResponse: classificationResult.rawResponse,
      parsedResult: {
        primaryCategory: classificationResult.primaryCategory,
        confidence: classificationResult.confidence,
        secondaryCategories: classificationResult.secondaryCategories,
        reasoning: classificationResult.reasoning,
      },
      // Story 21.1: Include concern detection debug data
      concernRawResponse: concernResult.rawResponse,
      concernParsedResult: {
        hasConcerns: concernResult.hasConcerns,
        concerns: concernResult.concerns,
        taxonomyVersion: concernResult.taxonomyVersion,
      },
      modelVersion,
      taxonomyVersion: classificationResult.taxonomyVersion,
    }).catch((err) => {
      logger.warn('Failed to store classification debug data', {
        screenshotId,
        error: err instanceof Error ? err.message : String(err),
      })
    })

    // 4. Update Firestore document
    await screenshotRef.update({
      classification: result,
    })

    logger.info('Screenshot classified successfully', {
      screenshotId,
      childId,
      category: result.primaryCategory,
      confidence: result.confidence,
      secondaryCount: classificationResult.secondaryCategories.length,
      // Story 21.1: Log concern detection results
      hasConcerns: concernFlags.length > 0,
      concernCount: concernFlags.length,
    })

    return { success: true, result }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)

    logger.error('Screenshot classification failed', {
      screenshotId,
      childId,
      error: errorMessage,
      retryCount,
    })

    // Update document with failure status
    const failedResult: ClassificationResult = {
      status: 'failed',
      error: errorMessage,
      retryCount,
    }

    try {
      await screenshotRef.update({
        classification: failedResult,
      })
    } catch (updateError) {
      logger.error('Failed to update classification failure status', {
        screenshotId,
        updateError: updateError instanceof Error ? updateError.message : String(updateError),
      })
    }

    return { success: false, error: errorMessage }
  }
}

/**
 * Retrieve image data from Firebase Storage.
 *
 * @param storagePath - Path to image in Firebase Storage
 * @returns Base64-encoded image data (without data URL prefix)
 * @throws Error if image cannot be retrieved
 */
async function retrieveImageFromStorage(storagePath: string): Promise<string> {
  const storage = getStorage()
  const bucket = storage.bucket()
  const file = bucket.file(storagePath)

  // Check if file exists
  const [exists] = await file.exists()
  if (!exists) {
    throw new Error(`Image not found at path: ${storagePath}`)
  }

  // Download file contents
  const [contents] = await file.download()

  // Convert to base64
  return contents.toString('base64')
}

/**
 * Check if a screenshot needs classification.
 *
 * Story 20.1: Classification Service Architecture - AC1
 *
 * @param doc - Firestore document data
 * @returns true if screenshot should be classified
 */
export function needsClassification(doc: FirebaseFirestore.DocumentData | undefined): boolean {
  if (!doc) return false

  // Skip if already classified
  if (doc.classification?.status === 'completed') {
    return false
  }

  // Skip if currently processing (to avoid duplicate jobs)
  if (doc.classification?.status === 'processing') {
    return false
  }

  // Classify if pending, failed (for retry), or no classification exists
  return true
}

/**
 * Build a classification job from screenshot document.
 *
 * Story 20.1: Classification Service Architecture - AC1, AC5
 *
 * @param doc - Firestore document data
 * @param screenshotId - Document ID
 * @returns ClassificationJob or null if document is invalid
 */
export function buildClassificationJob(
  doc: FirebaseFirestore.DocumentData | undefined,
  screenshotId: string
): ClassificationJob | null {
  if (!doc) return null

  const { childId, familyId, storagePath, url, title } = doc

  if (!childId || !familyId || !storagePath) {
    logger.warn('Screenshot document missing required fields', {
      screenshotId,
      hasChildId: !!childId,
      hasFamilyId: !!familyId,
      hasStoragePath: !!storagePath,
    })
    return null
  }

  return {
    childId,
    screenshotId,
    storagePath,
    url,
    title,
    familyId,
    retryCount: doc.classification?.retryCount ?? 0,
  }
}
