/**
 * Comprehensive Audit Event Service
 *
 * Story 27.1: Audit Event Capture - AC1, AC2, AC3, AC4, AC5
 *
 * Provides reliable audit event logging with:
 * - Exponential backoff retry (3 attempts)
 * - Dead-letter queue for failed writes
 * - Full device/session context capture
 * - Append-only storage in auditEvents collection
 *
 * FRs: FR32, FR53
 * NFRs: NFR58 (2-year retention), NFR82 (screenshot view logging)
 */

import { getFirestore, Firestore } from 'firebase-admin/firestore'
import * as logger from 'firebase-functions/logger'
import * as crypto from 'crypto'
import type { CreateAuditEventInput, AuditEvent, AuditFailure } from '@fledgely/shared'
import { createAuditEventInputSchema } from '@fledgely/shared'

// Lazy initialization for Firestore (supports test mocking)
let db: Firestore | null = null
function getDb(): Firestore {
  if (!db) {
    db = getFirestore()
  }
  return db
}

/** Reset Firestore instance for testing */
export function _resetDbForTesting(): void {
  db = null
}

/**
 * Retry configuration for audit writes.
 * Uses exponential backoff: 1s, 2s, 4s
 */
const MAX_RETRIES = 3
const RETRY_DELAYS_MS = [1000, 2000, 4000]

/**
 * Sleep utility for retry delays.
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Generate a unique audit event ID.
 */
function generateAuditEventId(): string {
  const timestamp = Date.now().toString(36)
  const random = crypto.randomBytes(8).toString('hex')
  return `audit_${timestamp}_${random}`
}

/**
 * Hash an IP address for privacy-preserving logging.
 *
 * Story 27.1: AC3 - Device/session information captured
 * NFR82: IP address logged but hashed for privacy
 *
 * @param ipAddress - Raw IP address
 * @returns SHA-256 hash of the IP (first 16 chars)
 */
export function hashIpAddress(ipAddress: string | null | undefined): string | null {
  if (!ipAddress) return null
  const hash = crypto.createHash('sha256').update(ipAddress).digest('hex')
  return hash.substring(0, 16) // Truncate for storage efficiency
}

/**
 * Write an audit event to the dead-letter queue.
 *
 * Story 27.1: AC5 - Reliable writes with dead-letter queue
 *
 * @param event - The audit event that failed to write
 * @param errorMessage - Error message from the failed write
 * @param attempts - Number of attempts made
 */
async function writeToDeadLetter(
  event: AuditEvent,
  errorMessage: string,
  attempts: number
): Promise<void> {
  const db = getDb()
  const failureId = `failure_${Date.now().toString(36)}_${crypto.randomBytes(4).toString('hex')}`

  const failure: AuditFailure = {
    id: failureId,
    event,
    errorMessage,
    attempts,
    failedAt: Date.now(),
    status: 'pending',
  }

  try {
    await db.collection('auditFailures').doc(failureId).set(failure)
    logger.warn('Audit event moved to dead-letter queue', {
      eventId: event.id,
      failureId,
      attempts,
    })
  } catch (dlError) {
    // Critical: Dead-letter write also failed
    logger.error('CRITICAL: Failed to write to dead-letter queue', {
      eventId: event.id,
      originalError: errorMessage,
      dlError: dlError instanceof Error ? dlError.message : String(dlError),
    })
  }
}

/**
 * Create and store an audit event with retry logic.
 *
 * Story 27.1: Audit Event Capture - AC1, AC2, AC3, AC4, AC5
 *
 * Features:
 * - Validates input against schema before processing
 * - Generates unique event ID
 * - Adds timestamp
 * - Retries with exponential backoff on failure
 * - Falls back to dead-letter queue if all retries fail
 *
 * @param input - Audit event input (without id and timestamp)
 * @returns The created audit event ID
 * @throws Never throws - failures go to dead-letter queue
 */
export async function createAuditEvent(input: CreateAuditEventInput): Promise<string> {
  // CRITICAL: Validate input before processing (Code Review Issue #2)
  const validationResult = createAuditEventInputSchema.safeParse(input)
  if (!validationResult.success) {
    const errorMessage = validationResult.error.errors.map((e) => e.message).join(', ')
    logger.error('Invalid audit event input', {
      error: errorMessage,
      inputKeys: Object.keys(input),
    })
    // Return invalid event ID - don't write bad data
    return `invalid_${Date.now().toString(36)}_${crypto.randomBytes(4).toString('hex')}`
  }

  const db = getDb()
  const eventId = generateAuditEventId()

  const event: AuditEvent = {
    ...validationResult.data,
    id: eventId,
    timestamp: Date.now(),
  }

  // Attempt to write with retries
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      await db.collection('auditEvents').doc(eventId).set(event)

      logger.debug('Audit event created', {
        eventId,
        resourceType: event.resourceType,
        accessType: event.accessType,
        actorUid: event.actorUid,
      })

      return eventId
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)

      if (attempt < MAX_RETRIES - 1) {
        // Retry after delay
        logger.warn('Audit write failed, retrying', {
          eventId,
          attempt: attempt + 1,
          maxRetries: MAX_RETRIES,
          error: errorMessage,
        })
        await sleep(RETRY_DELAYS_MS[attempt])
      } else {
        // All retries exhausted - move to dead-letter queue
        await writeToDeadLetter(event, errorMessage, MAX_RETRIES)
      }
    }
  }

  // Return eventId even if write failed (it's in dead-letter queue)
  return eventId
}

/**
 * Create an audit event without blocking the caller.
 *
 * Use this for non-critical audit logging where we don't want
 * to block the main request flow.
 *
 * @param input - Audit event input
 */
export function createAuditEventNonBlocking(input: CreateAuditEventInput): void {
  createAuditEvent(input).catch((error) => {
    // This should rarely happen since createAuditEvent handles errors internally
    logger.error('Unexpected error in non-blocking audit', {
      error: error instanceof Error ? error.message : String(error),
    })
  })
}

/**
 * Extract device context from a request.
 *
 * Story 27.1: AC3 - Device/session information captured
 *
 * @param req - Express request object (from Cloud Functions)
 * @returns Device context fields for audit event
 */
export function extractDeviceContext(req: {
  headers: Record<string, string | string[] | undefined>
  ip?: string
}): {
  userAgent: string | null
  ipAddressHash: string | null
  deviceId: string | null
} {
  const userAgent = (req.headers['user-agent'] as string) || null
  const ipAddress = req.ip || (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim()
  const deviceId = (req.headers['x-device-id'] as string) || null

  return {
    userAgent,
    ipAddressHash: hashIpAddress(ipAddress),
    deviceId,
  }
}

/**
 * Clean up old resolved/abandoned dead-letter entries.
 *
 * Story 27.1: Maintenance - remove processed entries older than retention period
 *
 * @param retentionDays - Days to retain resolved/abandoned entries (default: 30)
 * @param limit - Maximum entries to delete per run
 * @returns Number of entries deleted
 */
export async function cleanupDeadLetterEntries(
  retentionDays: number = 30,
  limit: number = 500
): Promise<number> {
  const db = getDb()
  const cutoffTime = Date.now() - retentionDays * 24 * 60 * 60 * 1000
  let deleteCount = 0

  // Clean up resolved entries
  const resolvedSnapshot = await db
    .collection('auditFailures')
    .where('status', '==', 'resolved')
    .where('resolvedAt', '<', cutoffTime)
    .limit(limit)
    .get()

  // Clean up abandoned entries
  const abandonedSnapshot = await db
    .collection('auditFailures')
    .where('status', '==', 'abandoned')
    .where('failedAt', '<', cutoffTime)
    .limit(limit)
    .get()

  const docsToDelete = [...resolvedSnapshot.docs, ...abandonedSnapshot.docs]

  if (docsToDelete.length === 0) {
    return 0
  }

  // Batch delete for efficiency
  const batch = db.batch()
  for (const doc of docsToDelete.slice(0, 500)) {
    batch.delete(doc.ref)
    deleteCount++
  }

  await batch.commit()

  logger.info('Dead-letter cleanup completed', {
    resolved: resolvedSnapshot.size,
    abandoned: abandonedSnapshot.size,
    deleted: deleteCount,
  })

  return deleteCount
}

/**
 * Retry processing of dead-letter queue entries.
 *
 * Story 27.1: AC5 - Retry failed writes
 *
 * Called by scheduled function to process pending failures.
 * Uses Firestore transactions to prevent race conditions when
 * multiple function instances run concurrently.
 *
 * @param limit - Maximum entries to process
 * @returns Number of successfully retried entries
 */
export async function retryDeadLetterEntries(limit: number = 100): Promise<number> {
  const db = getDb()
  let successCount = 0

  const snapshot = await db
    .collection('auditFailures')
    .where('status', '==', 'pending')
    .orderBy('failedAt', 'asc')
    .limit(limit)
    .get()

  if (snapshot.empty) {
    return 0
  }

  logger.info('Processing dead-letter entries', { count: snapshot.docs.length })

  for (const doc of snapshot.docs) {
    try {
      // Use transaction to prevent race conditions with concurrent instances
      const result = await db.runTransaction(async (transaction) => {
        // Re-read the document inside transaction for consistency
        const failureDoc = await transaction.get(doc.ref)

        if (!failureDoc.exists) {
          return { processed: false, reason: 'not_found' }
        }

        const failure = failureDoc.data() as AuditFailure

        // Check if still pending (another instance may have claimed it)
        if (failure.status !== 'pending') {
          return { processed: false, reason: 'already_claimed' }
        }

        // Mark as retrying atomically
        transaction.update(doc.ref, {
          status: 'retrying',
          lastAttemptAt: Date.now(),
        })

        // Write the audit event
        const auditEventRef = db.collection('auditEvents').doc(failure.event.id)
        transaction.set(auditEventRef, failure.event)

        // Mark as resolved
        transaction.update(doc.ref, {
          status: 'resolved',
          resolvedAt: Date.now(),
        })

        return { processed: true, failureId: failure.id, eventId: failure.event.id }
      })

      if (result.processed) {
        successCount++
        logger.info('Dead-letter entry resolved', {
          failureId: result.failureId,
          eventId: result.eventId,
        })
      }
    } catch (error) {
      // Transaction failed - update failure record outside transaction
      const failureDoc = await doc.ref.get()
      if (failureDoc.exists) {
        const failure = failureDoc.data() as AuditFailure
        const newAttempts = failure.attempts + 1
        const status = newAttempts >= 10 ? 'abandoned' : 'pending'

        await doc.ref.update({
          attempts: newAttempts,
          lastAttemptAt: Date.now(),
          status,
          errorMessage: error instanceof Error ? error.message : String(error),
        })

        if (status === 'abandoned') {
          logger.error('Dead-letter entry abandoned after 10 attempts', {
            failureId: failure.id,
            eventId: failure.event.id,
          })
        }
      }
    }
  }

  return successCount
}
