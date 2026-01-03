/**
 * Caregiver Audit Service - Story 39.2 AC5
 *
 * Service for logging caregiver permission changes and actions.
 *
 * Implements:
 * - NFR62: Caregiver access audit logging (within 5 minutes of action)
 * - Permission change tracking with old/new values
 * - Time extension logging
 * - Flag viewed logging
 *
 * Collection: caregiverAuditLogs
 */

import { getFirestore, Firestore, FieldValue } from 'firebase-admin/firestore'
import * as logger from 'firebase-functions/logger'
import * as crypto from 'crypto'

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

/** Audit action types for caregiver activities */
export type CaregiverAuditAction = 'permission_change' | 'time_extension' | 'flag_viewed'

/** Input for logging a permission change */
export interface LogPermissionChangeInput {
  familyId: string
  caregiverUid: string
  changedByUid: string
  oldPermissions: {
    canExtendTime: boolean
    canViewFlags: boolean
  }
  newPermissions: {
    canExtendTime: boolean
    canViewFlags: boolean
  }
}

/** Input for logging a time extension */
export interface LogTimeExtensionInput {
  familyId: string
  caregiverUid: string
  childId: string
  extensionMinutes: number
  reason?: string
}

/** Input for logging flag viewed */
export interface LogFlagViewedInput {
  familyId: string
  caregiverUid: string
  childId: string
  flagId: string
}

/** Caregiver audit log entry structure */
export interface CaregiverAuditLogEntry {
  id: string
  familyId: string
  caregiverUid: string
  action: CaregiverAuditAction
  changedByUid: string
  changes: Record<string, unknown>
  createdAt: ReturnType<typeof FieldValue.serverTimestamp> | Date
}

/**
 * Generate a unique audit log ID.
 */
function generateAuditLogId(): string {
  const timestamp = Date.now().toString(36)
  const random = crypto.randomBytes(8).toString('hex')
  return `cgaudit_${timestamp}_${random}`
}

/**
 * Log a permission change for a caregiver.
 *
 * Story 39.2 AC5: Permission changes take effect immediately with audit log.
 * NFR62: Logged within 5 minutes of action.
 *
 * @param input - Permission change details
 * @returns The created audit log ID
 */
export async function logPermissionChange(input: LogPermissionChangeInput): Promise<string> {
  const db = getDb()
  const auditLogId = generateAuditLogId()

  const auditLog: CaregiverAuditLogEntry = {
    id: auditLogId,
    familyId: input.familyId,
    caregiverUid: input.caregiverUid,
    action: 'permission_change',
    changedByUid: input.changedByUid,
    changes: {
      oldPermissions: input.oldPermissions,
      newPermissions: input.newPermissions,
    },
    createdAt: FieldValue.serverTimestamp(),
  }

  try {
    await db.collection('caregiverAuditLogs').doc(auditLogId).set(auditLog)

    logger.info('Caregiver permission change logged', {
      auditLogId,
      familyId: input.familyId,
      caregiverUid: input.caregiverUid,
      changedByUid: input.changedByUid,
    })

    return auditLogId
  } catch (error) {
    logger.error('Failed to log caregiver permission change', {
      error: error instanceof Error ? error.message : String(error),
      familyId: input.familyId,
      caregiverUid: input.caregiverUid,
    })
    throw error
  }
}

/**
 * Log a time extension granted by a caregiver.
 *
 * Story 39.4 integration: Time extension audit logging.
 * NFR62: Logged within 5 minutes of action.
 *
 * @param input - Time extension details
 * @returns The created audit log ID
 */
export async function logTimeExtension(input: LogTimeExtensionInput): Promise<string> {
  const db = getDb()
  const auditLogId = generateAuditLogId()

  const auditLog: CaregiverAuditLogEntry = {
    id: auditLogId,
    familyId: input.familyId,
    caregiverUid: input.caregiverUid,
    action: 'time_extension',
    changedByUid: input.caregiverUid, // Caregiver granted the extension
    changes: {
      childId: input.childId,
      extensionMinutes: input.extensionMinutes,
      reason: input.reason || null,
    },
    createdAt: FieldValue.serverTimestamp(),
  }

  try {
    await db.collection('caregiverAuditLogs').doc(auditLogId).set(auditLog)

    logger.info('Caregiver time extension logged', {
      auditLogId,
      familyId: input.familyId,
      caregiverUid: input.caregiverUid,
      childId: input.childId,
      extensionMinutes: input.extensionMinutes,
    })

    return auditLogId
  } catch (error) {
    logger.error('Failed to log caregiver time extension', {
      error: error instanceof Error ? error.message : String(error),
      familyId: input.familyId,
      caregiverUid: input.caregiverUid,
    })
    throw error
  }
}

/**
 * Log a flag view by a caregiver.
 *
 * Story 39.2 AC4: Caregiver can see flagged content.
 * NFR62: Logged within 5 minutes of action.
 *
 * @param input - Flag viewed details
 * @returns The created audit log ID
 */
export async function logFlagViewed(input: LogFlagViewedInput): Promise<string> {
  const db = getDb()
  const auditLogId = generateAuditLogId()

  const auditLog: CaregiverAuditLogEntry = {
    id: auditLogId,
    familyId: input.familyId,
    caregiverUid: input.caregiverUid,
    action: 'flag_viewed',
    changedByUid: input.caregiverUid, // Caregiver viewed the flag
    changes: {
      childId: input.childId,
      flagId: input.flagId,
    },
    createdAt: FieldValue.serverTimestamp(),
  }

  try {
    await db.collection('caregiverAuditLogs').doc(auditLogId).set(auditLog)

    logger.info('Caregiver flag view logged', {
      auditLogId,
      familyId: input.familyId,
      caregiverUid: input.caregiverUid,
      childId: input.childId,
      flagId: input.flagId,
    })

    return auditLogId
  } catch (error) {
    logger.error('Failed to log caregiver flag view', {
      error: error instanceof Error ? error.message : String(error),
      familyId: input.familyId,
      caregiverUid: input.caregiverUid,
    })
    throw error
  }
}

/**
 * Get audit logs for a caregiver.
 *
 * @param familyId - Family ID
 * @param caregiverUid - Caregiver UID
 * @param limit - Maximum number of logs to return (default: 50)
 * @returns Array of audit log entries
 */
export async function getAuditLogsForCaregiver(
  familyId: string,
  caregiverUid: string,
  limit: number = 50
): Promise<CaregiverAuditLogEntry[]> {
  const db = getDb()

  const snapshot = await db
    .collection('caregiverAuditLogs')
    .where('familyId', '==', familyId)
    .where('caregiverUid', '==', caregiverUid)
    .orderBy('createdAt', 'desc')
    .limit(limit)
    .get()

  return snapshot.docs.map((doc) => doc.data() as CaregiverAuditLogEntry)
}

/**
 * Get all audit logs for a family.
 *
 * @param familyId - Family ID
 * @param limit - Maximum number of logs to return (default: 100)
 * @returns Array of audit log entries
 */
export async function getAuditLogsForFamily(
  familyId: string,
  limit: number = 100
): Promise<CaregiverAuditLogEntry[]> {
  const db = getDb()

  const snapshot = await db
    .collection('caregiverAuditLogs')
    .where('familyId', '==', familyId)
    .orderBy('createdAt', 'desc')
    .limit(limit)
    .get()

  return snapshot.docs.map((doc) => doc.data() as CaregiverAuditLogEntry)
}
