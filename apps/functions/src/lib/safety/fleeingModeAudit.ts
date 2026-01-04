/**
 * Fleeing Mode Safety Audit Logging
 *
 * Story 41.8: Fleeing Mode Notification Suppression - AC5
 *
 * Logs suppressed notifications for safety audit.
 * These logs are NOT visible to family members - only accessible
 * by safety/support team through Cloud Functions.
 *
 * Firestore Path: safetyAudit/{familyId}/fleeingModeLogs/{logId}
 */

import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore'
import * as logger from 'firebase-functions/logger'

// Lazy Firestore initialization for testing
let db: FirebaseFirestore.Firestore | null = null
function getDb(): FirebaseFirestore.Firestore {
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
 * Types of notifications that can be suppressed during fleeing mode
 */
export const FLEEING_MODE_SUPPRESSED_TYPES = [
  'location_transition',
  'geofence_entry',
  'geofence_exit',
  'location_paused',
  'location_disabled',
  'location_zone_change',
] as const

export type FleeingModeSuppressedType = (typeof FLEEING_MODE_SUPPRESSED_TYPES)[number]

/**
 * Parameters for logging a fleeing mode suppression
 */
export interface FleeingModeSuppressionLogParams {
  /** Family ID where suppression occurred */
  familyId: string
  /** Type of notification that was suppressed */
  notificationType: FleeingModeSuppressedType
  /** Additional event data (sanitized - no location details) */
  eventData: {
    childId?: string
    deviceId?: string
    transitionId?: string
    [key: string]: unknown
  }
}

/**
 * Fleeing mode suppression log entry
 */
export interface FleeingModeSuppressionLog {
  id: string
  familyId: string
  notificationType: FleeingModeSuppressedType
  eventData: Record<string, unknown>
  suppressedAt: Timestamp | FieldValue
  createdAt: Timestamp | FieldValue
}

/**
 * Log a notification suppression during fleeing mode.
 *
 * These logs are stored in a separate safety audit collection
 * that is NOT accessible to family members.
 *
 * @param params - Suppression log parameters
 */
export async function logFleeingModeSuppression(
  params: FleeingModeSuppressionLogParams
): Promise<void> {
  const { familyId, notificationType, eventData } = params

  try {
    const logRef = getDb()
      .collection('safetyAudit')
      .doc(familyId)
      .collection('fleeingModeLogs')
      .doc()

    const logEntry: FleeingModeSuppressionLog = {
      id: logRef.id,
      familyId,
      notificationType,
      eventData: sanitizeEventData(eventData),
      suppressedAt: FieldValue.serverTimestamp(),
      createdAt: FieldValue.serverTimestamp(),
    }

    await logRef.set(logEntry)

    logger.info('Fleeing mode notification suppressed and logged', {
      logId: logRef.id,
      familyId,
      notificationType,
      // Don't log full eventData for privacy
    })
  } catch (error) {
    // Log error but don't throw - suppression should still succeed
    logger.error('Failed to log fleeing mode suppression', {
      familyId,
      notificationType,
      error: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}

/**
 * Log fleeing mode expiry event.
 *
 * @param familyId - Family ID where expiry occurred
 */
export async function logFleeingModeExpiry(familyId: string): Promise<void> {
  try {
    const logRef = getDb()
      .collection('safetyAudit')
      .doc(familyId)
      .collection('fleeingModeLogs')
      .doc()

    await logRef.set({
      id: logRef.id,
      familyId,
      eventType: 'fleeing_mode_expired',
      expiryNotificationSent: true,
      expiredAt: FieldValue.serverTimestamp(),
      createdAt: FieldValue.serverTimestamp(),
    })

    logger.info('Fleeing mode expiry logged', {
      logId: logRef.id,
      familyId,
    })
  } catch (error) {
    logger.error('Failed to log fleeing mode expiry', {
      familyId,
      error: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}

/**
 * Sanitize event data to remove sensitive information.
 *
 * We log enough to track the suppression but not actual location data.
 */
function sanitizeEventData(eventData: Record<string, unknown>): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {}

  // Safe fields to log
  const safeFields = ['childId', 'deviceId', 'transitionId', 'zoneId', 'fromZoneId', 'toZoneId']

  for (const field of safeFields) {
    if (field in eventData) {
      sanitized[field] = eventData[field]
    }
  }

  // Do NOT log: coordinates, addresses, location names, timestamps that reveal timing

  return sanitized
}

/**
 * Check if a notification type should be suppressed during fleeing mode.
 *
 * @param notificationType - Type of notification
 * @returns true if the type should be suppressed
 */
export function isFleeingModeSuppressedType(
  notificationType: string
): notificationType is FleeingModeSuppressedType {
  return FLEEING_MODE_SUPPRESSED_TYPES.includes(notificationType as FleeingModeSuppressedType)
}
