/**
 * Suppression Audit Logging
 *
 * Story 21.2: Distress Detection Suppression (FR21A) - AC5
 *
 * Logs suppression events for internal audit only.
 * This collection is NOT visible to parents.
 */

import type { Firestore } from 'firebase-admin/firestore'
import * as logger from 'firebase-functions/logger'
import type { ConcernCategory, ConcernSeverity, SuppressionReason } from '@fledgely/shared'

/**
 * Suppression event data for audit logging.
 */
export interface SuppressionEventData {
  screenshotId: string
  childId: string
  familyId: string
  concernCategory: ConcernCategory
  severity: ConcernSeverity
  suppressionReason: SuppressionReason
  timestamp: number
  releasableAfter?: number
}

/**
 * Log a suppression event for internal audit.
 *
 * Story 21.2: Distress Detection Suppression (FR21A) - AC5
 *
 * Creates an audit record when a concern flag is suppressed.
 * This collection has strict security rules - admin-only read.
 *
 * @param db - Firestore instance
 * @param data - Suppression event data
 * @returns The created document ID
 */
export async function logSuppressionEvent(
  db: Firestore,
  data: SuppressionEventData
): Promise<string> {
  const {
    screenshotId,
    childId,
    familyId,
    concernCategory,
    severity,
    suppressionReason,
    timestamp,
    releasableAfter,
  } = data

  const docRef = db.collection('suppressionAudit').doc()

  const auditEntry = {
    id: docRef.id,
    screenshotId,
    childId,
    familyId,
    concernCategory,
    severity,
    suppressionReason,
    timestamp,
    ...(releasableAfter && { releasableAfter }),
    released: false,
  }

  await docRef.set(auditEntry)

  logger.info('Suppression event logged', {
    auditId: docRef.id,
    screenshotId,
    childId,
    concernCategory,
    suppressionReason,
  })

  return docRef.id
}

/**
 * Mark a suppressed flag as released.
 *
 * Story 21.2: Distress Detection Suppression (FR21A) - AC6
 *
 * Called when a flag is released from sensitive_hold status.
 *
 * @param db - Firestore instance
 * @param auditId - The audit document ID
 */
export async function markSuppressionReleased(db: Firestore, auditId: string): Promise<void> {
  const docRef = db.collection('suppressionAudit').doc(auditId)

  await docRef.update({
    released: true,
    releasedAt: Date.now(),
  })

  logger.info('Suppression released', {
    auditId,
  })
}
