/**
 * Data View Audit Service
 *
 * Story 3A.1: Data Symmetry Enforcement - AC3
 * Logs when guardians view child or family data to the audit trail.
 *
 * This supports:
 * - Transparency: Both co-parents can see who viewed what
 * - Story 3A.5: Screenshot viewing rate alert (50/hour threshold)
 * - Compliance: Audit trail for custody dispute situations
 */

import { collection, addDoc, Timestamp } from 'firebase/firestore'
import { getFirestoreDb } from '../lib/firebase'
import { dataViewTypeSchema } from '@fledgely/shared/contracts'
import type { DataViewType } from '@fledgely/shared/contracts'

/** Valid data view types for runtime validation */
const VALID_DATA_VIEW_TYPES = [
  'children_list',
  'child_profile',
  'screenshots',
  'activity',
  'agreements',
  'flags',
  'devices', // Story 19.8: Dashboard view logging
  'device_detail', // Story 19.8: Individual device detail view
] as const

/**
 * Parameters for logging a data view action.
 */
export interface LogDataViewParams {
  /** UID of the guardian who is viewing the data */
  viewerUid: string
  /** ID of the child being viewed (null for family-level views like children_list) */
  childId: string | null
  /** ID of the family context */
  familyId: string
  /** Type of data being viewed */
  dataType: DataViewType
  /** Optional session ID for correlation */
  sessionId?: string
  /** Story 19.8: Optional device ID for device-related views */
  deviceId?: string
  /** Story 19.8: Optional additional metadata for audit context */
  metadata?: Record<string, unknown>
}

/**
 * Log a data view action to the audit trail.
 *
 * This creates an immutable record in /auditLogs/{logId} documenting
 * that a guardian viewed specific data at a specific time.
 *
 * Used for:
 * - Epic 3A data symmetry transparency
 * - Story 3A.5 screenshot viewing rate detection
 * - Audit compliance in custody situations
 *
 * @param params - The data view parameters
 * @throws Error if Firestore write fails (caller should handle)
 */
export async function logDataView(params: LogDataViewParams): Promise<string> {
  const { viewerUid, childId, familyId, dataType, sessionId, deviceId, metadata } = params

  // Validate required fields
  if (!viewerUid) {
    throw new Error('viewerUid is required for audit logging')
  }
  if (!familyId) {
    throw new Error('familyId is required for audit logging')
  }
  if (!dataType) {
    throw new Error('dataType is required for audit logging')
  }

  // Validate dataType against allowed values
  const parseResult = dataViewTypeSchema.safeParse(dataType)
  if (!parseResult.success) {
    throw new Error(
      `Invalid dataType: ${dataType}. Must be one of: ${VALID_DATA_VIEW_TYPES.join(', ')}`
    )
  }

  const db = getFirestoreDb()
  const auditLogsRef = collection(db, 'auditLogs')

  // Story 19.8: Include deviceId and metadata in audit log
  const docRef = await addDoc(auditLogsRef, {
    viewerUid,
    childId: childId ?? null,
    familyId,
    dataType,
    viewedAt: Timestamp.now(),
    sessionId: sessionId ?? null,
    deviceId: deviceId ?? null, // Story 19.8
    metadata: metadata ?? null, // Story 19.8
  })

  return docRef.id
}

/**
 * Log a data view action without throwing errors.
 *
 * This is a wrapper around logDataView that catches errors and logs them,
 * ensuring the view logging doesn't block the main user flow.
 *
 * Use this in UI components where audit logging failure should not
 * prevent the user from viewing data.
 *
 * @param params - The data view parameters
 */
export function logDataViewNonBlocking(params: LogDataViewParams): void {
  logDataView(params).catch((err) => {
    // Non-blocking - don't fail the main flow for audit logging issues
    console.error('Failed to log data view:', err)
  })
}
