/**
 * Classification Debug Storage
 *
 * Story 20.5: Classification Metadata Storage - AC4
 *
 * Stores raw AI responses for debugging and analysis.
 * Records auto-expire after 30 days via Firestore TTL.
 */

import { getFirestore } from 'firebase-admin/firestore'
import * as logger from 'firebase-functions/logger'
import {
  type ClassificationDebug,
  type Category,
  type SecondaryCategory,
  type ConcernCategory,
  type ConcernSeverity,
  DEBUG_RETENTION_MS,
} from '@fledgely/shared'

/**
 * Parsed concern for debug storage.
 * Story 21.1: Concerning Content Categories
 */
export interface ParsedConcern {
  category: ConcernCategory
  severity: ConcernSeverity
  confidence: number
  reasoning: string
}

/**
 * Input parameters for storing debug data.
 */
export interface StoreDebugInput {
  screenshotId: string
  childId: string
  requestContext: {
    url?: string
    title?: string
    imageSize?: number
  }
  rawResponse: string
  parsedResult: {
    primaryCategory: Category
    confidence: number
    secondaryCategories?: SecondaryCategory[]
    reasoning?: string
  }
  /**
   * Story 21.1: Concerning Content Categories - AC5
   * Raw JSON response from concern detection
   */
  concernRawResponse?: string
  /**
   * Story 21.1: Concerning Content Categories - AC5
   * Parsed concern detection result
   */
  concernParsedResult?: {
    hasConcerns: boolean
    concerns: ParsedConcern[]
    taxonomyVersion: string
  }
  modelVersion: string
  taxonomyVersion: string
  processingTimeMs?: number
}

/**
 * Store classification debug data for later analysis.
 *
 * Story 20.5: Classification Metadata Storage - AC4
 * Story 21.1: Concerning Content Categories - AC5 (concern debug data)
 *
 * Stores the raw AI response and parsed result in a separate collection
 * for debugging and analysis. Records auto-expire after 30 days.
 *
 * @param input - Debug data to store
 * @returns The created debug record ID
 */
export async function storeClassificationDebug(input: StoreDebugInput): Promise<string> {
  const db = getFirestore()
  const now = Date.now()

  const debugData: ClassificationDebug = {
    screenshotId: input.screenshotId,
    childId: input.childId,
    timestamp: now,
    requestContext: input.requestContext,
    rawResponse: input.rawResponse,
    parsedResult: input.parsedResult,
    // Story 21.1: Include concern detection debug data if present
    ...(input.concernRawResponse && { concernRawResponse: input.concernRawResponse }),
    ...(input.concernParsedResult && { concernParsedResult: input.concernParsedResult }),
    modelVersion: input.modelVersion,
    taxonomyVersion: input.taxonomyVersion,
    processingTimeMs: input.processingTimeMs,
    expiresAt: now + DEBUG_RETENTION_MS,
  }

  try {
    const docRef = await db.collection('classificationDebug').add(debugData)

    logger.debug('Classification debug data stored', {
      debugId: docRef.id,
      screenshotId: input.screenshotId,
      childId: input.childId,
    })

    return docRef.id
  } catch (error) {
    logger.error('Failed to store classification debug data', {
      screenshotId: input.screenshotId,
      childId: input.childId,
      error: error instanceof Error ? error.message : String(error),
    })
    // Don't throw - debug storage failure shouldn't fail classification
    return ''
  }
}

/**
 * Get debug data for a screenshot.
 *
 * Story 20.5: Classification Metadata Storage - AC4
 *
 * Retrieves the most recent debug record for a screenshot.
 *
 * @param screenshotId - Screenshot ID to look up
 * @returns Debug record or null if not found
 */
export async function getDebugForScreenshot(
  screenshotId: string
): Promise<ClassificationDebug | null> {
  const db = getFirestore()

  const snapshot = await db
    .collection('classificationDebug')
    .where('screenshotId', '==', screenshotId)
    .orderBy('timestamp', 'desc')
    .limit(1)
    .get()

  if (snapshot.empty) {
    return null
  }

  return snapshot.docs[0].data() as ClassificationDebug
}
