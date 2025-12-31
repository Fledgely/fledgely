/**
 * Screenshot Description Service
 *
 * Story 28.1: AI Description Generation - AC1, AC2, AC3, AC4, AC5, AC6
 *
 * Generates accessibility descriptions for screenshots using AI.
 * Descriptions help blind or visually impaired parents understand
 * screenshot content via screen readers.
 */

import { getFirestore, Firestore } from 'firebase-admin/firestore'
import { getStorage } from 'firebase-admin/storage'
import * as logger from 'firebase-functions/logger'
import { type ScreenshotDescription } from '@fledgely/shared'
import { createGeminiClient } from '../classification/geminiClient'
import { retryWithBackoff } from '../classification/retryWithBackoff'

// Lazy initialization for Firestore
let db: Firestore | null = null
function getDb(): Firestore {
  if (!db) {
    db = getFirestore()
  }
  return db
}

/**
 * Parameters for description generation job.
 */
export interface DescriptionGenerationJob {
  childId: string
  screenshotId: string
  storagePath: string
  url?: string
  title?: string
  retryCount?: number
}

/**
 * Result of description generation operation.
 */
export interface DescriptionGenerationResult {
  success: boolean
  description?: ScreenshotDescription
  error?: string
}

/**
 * Generate an accessibility description for a screenshot.
 *
 * Story 28.1: AI Description Generation - AC1, AC2, AC3, AC4, AC5, AC6
 *
 * This function:
 * 1. Retrieves the image from Firebase Storage
 * 2. Calls Gemini Vision API for description generation
 * 3. Updates the screenshot document with description
 * 4. Handles retries with exponential backoff
 *
 * @param job - Description generation job parameters
 * @returns Description generation result
 */
export async function generateScreenshotDescription(
  job: DescriptionGenerationJob
): Promise<DescriptionGenerationResult> {
  const { childId, screenshotId, storagePath, url, title, retryCount = 0 } = job
  const db = getDb()
  const screenshotRef = db
    .collection('children')
    .doc(childId)
    .collection('screenshots')
    .doc(screenshotId)

  try {
    // Mark as processing
    await screenshotRef.update({
      'accessibilityDescription.status': 'processing',
      'accessibilityDescription.retryCount': retryCount,
    })

    // 1. Retrieve image from Firebase Storage
    const imageBase64 = await retrieveImageFromStorage(storagePath)

    // 2. Call Gemini API with retry logic
    const geminiClient = createGeminiClient()
    const descriptionResult = await retryWithBackoff(
      () => geminiClient.generateDescription(imageBase64, 'image/jpeg', url, title),
      {
        maxRetries: 2, // Inner retries for transient API errors
        context: `generateDescription:${screenshotId}`,
      }
    )

    // 3. Build description result
    const generatedAt = Date.now()
    const modelVersion = geminiClient.getModelVersion()

    const description: ScreenshotDescription = {
      status: 'completed',
      description: descriptionResult.description,
      wordCount: descriptionResult.wordCount,
      generatedAt,
      modelVersion,
      retryCount,
    }

    // 4. Update Firestore document
    await screenshotRef.update({
      accessibilityDescription: description,
    })

    logger.info('Screenshot description generated successfully', {
      screenshotId,
      childId,
      wordCount: descriptionResult.wordCount,
      appsIdentified: descriptionResult.appsIdentified,
      hasText: descriptionResult.hasText,
    })

    return { success: true, description }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)

    logger.error('Screenshot description generation failed', {
      screenshotId,
      childId,
      error: errorMessage,
      retryCount,
    })

    // Update document with failure status
    const failedDescription: ScreenshotDescription = {
      status: 'failed',
      error: errorMessage,
      retryCount,
    }

    try {
      await screenshotRef.update({
        accessibilityDescription: failedDescription,
      })
    } catch (updateError) {
      logger.error('Failed to update description failure status', {
        screenshotId,
        updateError: updateError instanceof Error ? updateError.message : String(updateError),
      })
    }

    return { success: false, error: errorMessage }
  }
}

/**
 * Generate description asynchronously (fire-and-forget).
 *
 * Story 28.1: AI Description Generation - AC4
 *
 * This function triggers description generation without blocking
 * the calling function. Errors are logged but not thrown.
 *
 * @param job - Description generation job parameters
 */
export function generateScreenshotDescriptionAsync(job: DescriptionGenerationJob): void {
  generateScreenshotDescription(job).catch((error) => {
    logger.warn('Async description generation failed', {
      screenshotId: job.screenshotId,
      childId: job.childId,
      error: error instanceof Error ? error.message : String(error),
    })
  })
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
 * Check if a screenshot needs description generation.
 *
 * @param doc - Firestore document data
 * @returns true if screenshot should have description generated
 */
export function needsDescriptionGeneration(
  doc: FirebaseFirestore.DocumentData | undefined
): boolean {
  if (!doc) return false

  // Skip if already completed
  if (doc.accessibilityDescription?.status === 'completed') {
    return false
  }

  // Skip if currently processing (to avoid duplicate jobs)
  if (doc.accessibilityDescription?.status === 'processing') {
    return false
  }

  // Generate if pending, failed (for retry), or no description exists
  return true
}

/**
 * Get description for a screenshot.
 *
 * @param childId - Child ID
 * @param screenshotId - Screenshot ID
 * @returns Screenshot description or null if not found
 */
export async function getScreenshotDescription(
  childId: string,
  screenshotId: string
): Promise<ScreenshotDescription | null> {
  const db = getDb()

  try {
    const doc = await db
      .collection('children')
      .doc(childId)
      .collection('screenshots')
      .doc(screenshotId)
      .get()

    if (!doc.exists) return null

    const data = doc.data()
    return data?.accessibilityDescription ?? null
  } catch (error) {
    logger.error('Failed to get screenshot description', {
      childId,
      screenshotId,
      error: error instanceof Error ? error.message : String(error),
    })
    return null
  }
}

/**
 * For testing - reset Firestore instance.
 */
export function _resetDbForTesting(): void {
  db = null
}
