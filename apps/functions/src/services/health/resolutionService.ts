/**
 * Resolution Service
 *
 * Story 27.5.6: Resolution Markers
 *
 * Manages family resolution markers for tracking issue resolution.
 * - AC1: Add resolution markers
 * - AC2: Either parent or child can add
 * - AC4: Resolutions factor into friction indicators
 * - AC6: Resolution history
 */

import { getFirestore, Firestore } from 'firebase-admin/firestore'
import * as logger from 'firebase-functions/logger'
import * as crypto from 'crypto'
import type { Resolution, ResolutionMarkerType, ResolutionCreatorType } from '@fledgely/shared'

// Lazy initialization for Firestore
let db: Firestore | null = null
function getDb(): Firestore {
  if (!db) {
    db = getFirestore()
  }
  return db
}

/**
 * Generate a unique resolution ID.
 */
function generateResolutionId(): string {
  const timestamp = Date.now().toString(36)
  const random = crypto.randomBytes(8).toString('hex')
  return `res_${timestamp}_${random}`
}

/**
 * Create a resolution marker.
 *
 * Story 27.5.6 - AC1, AC2
 *
 * @param params Resolution creation parameters
 */
export interface CreateResolutionParams {
  familyId: string
  createdBy: string
  createdByType: ResolutionCreatorType
  createdByName: string
  markerType: ResolutionMarkerType
  note?: string
}

export async function createResolution(params: CreateResolutionParams): Promise<Resolution> {
  const db = getDb()
  const resolutionId = generateResolutionId()
  const now = Date.now()

  const resolution: Resolution = {
    id: resolutionId,
    familyId: params.familyId,
    createdBy: params.createdBy,
    createdByType: params.createdByType,
    createdByName: params.createdByName,
    markerType: params.markerType,
    note: params.note,
    createdAt: now,
  }

  await db
    .collection('families')
    .doc(params.familyId)
    .collection('resolutions')
    .doc(resolutionId)
    .set(resolution)

  logger.info('Created resolution marker', { familyId: params.familyId, resolutionId })

  return resolution
}

/**
 * Get resolutions for a family.
 *
 * Story 27.5.6 - AC6
 *
 * @param familyId Family ID
 * @param limit Maximum number of resolutions to return
 */
export async function getResolutions(familyId: string, limit: number = 20): Promise<Resolution[]> {
  const db = getDb()

  try {
    const snapshot = await db
      .collection('families')
      .doc(familyId)
      .collection('resolutions')
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .get()

    return snapshot.docs.map((doc) => doc.data() as Resolution)
  } catch (error) {
    logger.error('Failed to get resolutions', { familyId, error })
    return []
  }
}

/**
 * Get resolutions for a family within a time period.
 *
 * Story 27.5.6 - AC4
 * Used by friction indicators to factor in resolutions.
 *
 * @param familyId Family ID
 * @param periodStart Start of period (epoch ms)
 * @param periodEnd End of period (epoch ms)
 */
export async function getResolutionsForPeriod(
  familyId: string,
  periodStart: number,
  periodEnd: number
): Promise<Resolution[]> {
  const db = getDb()

  try {
    const snapshot = await db
      .collection('families')
      .doc(familyId)
      .collection('resolutions')
      .where('createdAt', '>=', periodStart)
      .where('createdAt', '<=', periodEnd)
      .orderBy('createdAt', 'desc')
      .get()

    return snapshot.docs.map((doc) => doc.data() as Resolution)
  } catch (error) {
    logger.error('Failed to get resolutions for period', { familyId, error })
    return []
  }
}

/**
 * Count positive resolutions for friction indicator calculation.
 *
 * Story 27.5.6 - AC4
 * Resolutions (except 'in_progress') count as positive data points.
 *
 * @param familyId Family ID
 * @param periodStart Start of period (epoch ms)
 * @param periodEnd End of period (epoch ms)
 */
export async function countPositiveResolutions(
  familyId: string,
  periodStart: number,
  periodEnd: number
): Promise<number> {
  const resolutions = await getResolutionsForPeriod(familyId, periodStart, periodEnd)

  // All resolutions except 'in_progress' count as positive
  return resolutions.filter((r) => r.markerType !== 'in_progress').length
}

/**
 * For testing - reset Firestore instance.
 */
export function _resetDbForTesting(): void {
  db = null
}
