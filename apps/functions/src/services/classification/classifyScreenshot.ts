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
  type SuppressedConcernFlag,
  type ThrottledConcernFlag,
  ALWAYS_FLAG_THRESHOLD,
} from '@fledgely/shared'
import { createGeminiClient, type DetectedConcern } from './geminiClient'
import { retryWithBackoff } from './retryWithBackoff'
import { storeClassificationDebug } from './storeDebug'
import { isCrisisUrl, isDistressContent, calculateReleasableAfter } from './crisisUrlDetector'
import { logSuppressionEvent } from './suppressionAudit'
import { shouldAlertForFlag, recordFlagAlert, recordThrottledFlag } from './flagThrottle'
import { getEffectiveThreshold } from './confidenceThreshold'
import { createFlagsFromConcerns } from './flagStorage'
import { applyFamilyBiasToConcerns } from './familyBias'
import {
  getChildAppApprovals,
  extractAppIdentifier,
  applyAppApprovalsToConcerns,
} from './appApprovals'
import { generateScreenshotDescriptionAsync } from '../accessibility'

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
  const { childId, screenshotId, storagePath, url, title, retryCount = 0, familyId } = job
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

    // Story 21.2: Crisis URL Detection (AC3) - Check BEFORE any concern detection
    // If URL is from crisis resource, set crisisProtected and skip concern detection entirely
    const crisisProtected = url ? isCrisisUrl(url) : false

    if (crisisProtected) {
      logger.info('Crisis URL detected - skipping concern detection', {
        screenshotId,
        childId,
        url,
      })
    }

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
    // Story 21.2: Crisis URL Detection (AC3) - Skip concern detection if crisis URL
    // Concerns coexist with basic categories (a Gaming screenshot can have Violence concerns)
    let concernResult: {
      concerns: DetectedConcern[]
      hasConcerns: boolean
      rawResponse: string
      taxonomyVersion: string
    } | null = null
    let concernFlags: ConcernFlag[] = []
    let suppressedConcernFlags: SuppressedConcernFlag[] = []

    if (!crisisProtected) {
      concernResult = await retryWithBackoff(
        () => geminiClient.detectConcerns(imageBase64, 'image/jpeg', url, title),
        {
          maxRetries: 2, // Inner retries for transient API errors
          context: `detectConcerns:${screenshotId}`,
        }
      )

      // Story 24.2: Family-Specific Model Tuning - AC2, AC3, AC4
      // Apply family bias weights to adjust confidence scores before filtering
      // This allows families with many corrections to reduce false positives
      const biasAdjustedConcerns = await applyFamilyBiasToConcerns(familyId, concernResult.concerns)

      // Story 24.3: Explicit Approval of Categories - AC3, AC4, AC6, AC7
      // Apply per-child, per-app approval adjustments
      // Approved apps get reduced sensitivity, disapproved apps get increased sensitivity
      const appIdentifier = extractAppIdentifier(url, title)
      const childAppApprovals = await getChildAppApprovals(childId)
      const approvalAdjustedConcerns = applyAppApprovalsToConcerns(
        biasAdjustedConcerns,
        childAppApprovals,
        appIdentifier
      )

      // Story 21.4: Filter concerns by confidence threshold (AC1, AC5)
      // Only create flags for concerns that meet the configured threshold
      const filteredConcerns: DetectedConcern[] = []
      let discardedCount = 0

      for (const concern of approvalAdjustedConcerns) {
        // Get threshold first (single query), then check if should flag
        const threshold = await getEffectiveThreshold(familyId, concern.category)
        const shouldFlag =
          concern.confidence >= ALWAYS_FLAG_THRESHOLD || concern.confidence >= threshold

        if (shouldFlag) {
          filteredConcerns.push(concern)
        } else {
          // Log discarded concern with reason (no additional query needed)
          logger.info('Concern discarded due to low confidence', {
            screenshotId,
            childId,
            familyId,
            category: concern.category,
            confidence: concern.confidence,
            threshold,
            reason: 'below_confidence_threshold',
          })
          discardedCount++
        }
      }

      if (discardedCount > 0) {
        logger.info('Confidence threshold filtering applied', {
          screenshotId,
          childId,
          familyId,
          originalCount: concernResult.concerns.length,
          filteredCount: filteredConcerns.length,
          discardedCount,
        })
      }

      // Convert filtered concerns to ConcernFlag format for storage
      concernFlags = filteredConcerns.map(
        (concern: DetectedConcern): ConcernFlag => ({
          category: concern.category,
          severity: concern.severity,
          confidence: concern.confidence,
          reasoning: concern.reasoning,
          detectedAt: Date.now(),
        })
      )

      // Story 21.2: Distress Detection Suppression (AC1, AC2)
      // Check if any concern is distress-related (Self-Harm Indicators)
      const hasDistressContent = isDistressContent(concernFlags)

      if (hasDistressContent) {
        const now = Date.now()
        const releasableAfter = calculateReleasableAfter(now)

        // Convert to suppressed flags with sensitive_hold status
        suppressedConcernFlags = concernFlags.map((flag): SuppressedConcernFlag => {
          if (flag.category === 'Self-Harm Indicators') {
            return {
              ...flag,
              status: 'sensitive_hold',
              suppressionReason: 'self_harm_detected',
              releasableAfter,
            }
          }
          // Non-distress concerns remain pending
          return {
            ...flag,
            status: 'pending',
          }
        })

        // Log suppression for internal audit (AC5)
        await logSuppressionEvent(db, {
          screenshotId,
          childId,
          familyId,
          concernCategory: 'Self-Harm Indicators',
          severity:
            concernFlags.find((f) => f.category === 'Self-Harm Indicators')?.severity ?? 'medium',
          suppressionReason: 'self_harm_detected',
          timestamp: now,
          releasableAfter,
        })

        logger.info('Distress content detected - flags suppressed', {
          screenshotId,
          childId,
          suppressedCount: suppressedConcernFlags.filter((f) => f.status === 'sensitive_hold')
            .length,
          releasableAfter: new Date(releasableAfter).toISOString(),
        })
      }
    }

    // Story 21.3: Flag Throttling (AC1, AC2, AC5)
    // Check each flag against throttle rules to determine if parent should be alerted
    // Throttling only affects notifications - all flags are ALWAYS stored
    const throttledFlags: ThrottledConcernFlag[] = []
    const flagsToProcess = suppressedConcernFlags.length > 0 ? suppressedConcernFlags : concernFlags

    if (flagsToProcess.length > 0 && familyId) {
      let alertedCount = 0
      let throttledCount = 0

      for (const flag of flagsToProcess) {
        // Generate unique flag ID for deduplication
        const flagId = `${screenshotId}_${flag.category}_${flag.detectedAt}`

        // Check if this flag should trigger a parent alert
        const shouldAlert = await shouldAlertForFlag(familyId, childId, flag.severity, flagId)

        // Create throttled flag with status
        const throttledFlag: ThrottledConcernFlag = {
          ...flag,
          status: (flag as SuppressedConcernFlag).status ?? 'pending',
          throttled: !shouldAlert,
          ...(shouldAlert ? {} : { throttledAt: Date.now() }),
          // Preserve suppression fields if present
          ...((flag as SuppressedConcernFlag).suppressionReason && {
            suppressionReason: (flag as SuppressedConcernFlag).suppressionReason,
          }),
          ...((flag as SuppressedConcernFlag).releasableAfter && {
            releasableAfter: (flag as SuppressedConcernFlag).releasableAfter,
          }),
        }

        throttledFlags.push(throttledFlag)

        // Record outcome for throttle tracking
        if (shouldAlert) {
          await recordFlagAlert(familyId, childId, flagId, flag.severity)
          alertedCount++
        } else {
          await recordThrottledFlag(familyId, childId)
          throttledCount++
        }
      }

      logger.info('Flag throttling applied', {
        screenshotId,
        childId,
        familyId,
        totalFlags: flagsToProcess.length,
        alertedCount,
        throttledCount,
      })
    } else if (flagsToProcess.length > 0) {
      // No familyId - convert flags without throttle processing
      for (const flag of flagsToProcess) {
        throttledFlags.push({
          ...flag,
          status: (flag as SuppressedConcernFlag).status ?? 'pending',
          throttled: false,
          ...((flag as SuppressedConcernFlag).suppressionReason && {
            suppressionReason: (flag as SuppressedConcernFlag).suppressionReason,
          }),
          ...((flag as SuppressedConcernFlag).releasableAfter && {
            releasableAfter: (flag as SuppressedConcernFlag).releasableAfter,
          }),
        })
      }
    }

    // Story 21.5: Flag Creation and Storage - AC1, AC2, AC3, AC5, AC6
    // Create flag documents in dedicated collection for querying
    // This happens after throttling so throttle/suppression status is preserved
    let createdFlagIds: string[] = []
    if (throttledFlags.length > 0 && familyId) {
      try {
        const createdFlags = await createFlagsFromConcerns(
          childId,
          familyId,
          screenshotId,
          throttledFlags.map((flag) => ({
            category: flag.category,
            severity: flag.severity,
            confidence: flag.confidence,
            reasoning: flag.reasoning,
            status: flag.status,
            suppressionReason: flag.suppressionReason,
            releasableAfter: flag.releasableAfter,
            throttled: flag.throttled,
            throttledAt: flag.throttledAt,
          }))
        )
        createdFlagIds = createdFlags.map((f) => f.id)

        logger.info('Flag documents created', {
          screenshotId,
          childId,
          familyId,
          flagCount: createdFlags.length,
        })
      } catch (err) {
        // Log error but don't fail classification - flags collection is supplementary
        logger.warn('Failed to create flag documents', {
          screenshotId,
          childId,
          familyId,
          error: err instanceof Error ? err.message : String(err),
        })
      }
    }

    // 3. Build result object
    // Story 20.2: Basic Category Taxonomy - AC5, AC6
    // Story 20.3: Confidence Score Assignment - AC4
    // Story 20.4: Multi-Label Classification - AC1, AC2, AC3
    // Story 21.1: Concerning Content Categories - AC1, AC3, AC4, AC5
    // Story 21.2: Distress Detection Suppression - AC1, AC2, AC3
    // Story 21.3: Flag Throttling - AC1, AC2, AC5
    // Story 21.5: Flag Creation and Storage - AC1, AC2, AC3
    // Include isLowConfidence, taxonomyVersion, needsReview, secondaryCategories, concernFlags, crisisProtected
    const classifiedAt = Date.now()
    const modelVersion = geminiClient.getModelVersion()

    // Use throttled flags which include both suppression and throttle metadata
    const finalConcernFlags = throttledFlags

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
      // Story 21.2: Use suppressed flags when distress detected - AC2
      ...(finalConcernFlags.length > 0 &&
        concernResult && {
          concernFlags: finalConcernFlags,
          concernTaxonomyVersion: concernResult.taxonomyVersion,
        }),
      // Story 21.2: Mark as crisis protected when URL matches crisis allowlist - AC3
      ...(crisisProtected && {
        crisisProtected: true,
      }),
    }

    // Story 20.5: Store debug data for analysis (AC4)
    // Story 21.1: Include concern detection debug data (AC5)
    // Story 21.2: Handle crisis URL case where concernResult is null
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
      // Story 21.2: Handle crisis URL case - concernResult may be null
      ...(concernResult && {
        concernRawResponse: concernResult.rawResponse,
        concernParsedResult: {
          hasConcerns: concernResult.hasConcerns,
          concerns: concernResult.concerns,
          taxonomyVersion: concernResult.taxonomyVersion,
        },
      }),
      // Story 21.2: Include crisis protection status
      ...(crisisProtected && {
        crisisProtected: true,
      }),
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
      hasConcerns: finalConcernFlags.length > 0,
      concernCount: finalConcernFlags.length,
      // Story 21.2: Log suppression status
      crisisProtected,
      suppressedCount: suppressedConcernFlags.filter((f) => f.status === 'sensitive_hold').length,
      // Story 21.3: Log throttle status
      throttledCount: finalConcernFlags.filter((f) => f.throttled).length,
      alertedCount: finalConcernFlags.filter((f) => !f.throttled).length,
      // Story 21.5: Log flag document creation
      flagDocumentsCreated: createdFlagIds.length,
    })

    // Story 28.1: Trigger description generation asynchronously (AC4)
    // Don't block classification on description generation
    generateScreenshotDescriptionAsync({
      childId,
      screenshotId,
      storagePath,
      url,
      title,
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
