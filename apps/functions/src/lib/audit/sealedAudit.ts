/**
 * Sealed Audit Management.
 *
 * Story 0.5.8: Audit Trail Sealing
 *
 * Manages sealed audit entries for compliance storage.
 * Sealed entries are preserved for legal/compliance needs while
 * being removed from family-visible audit logs.
 *
 * CRITICAL SECURITY:
 * - Sealed audit entries are NEVER visible to family members
 * - All operations logged to admin audit only
 * - Firestore security rules block all family access
 * - Access requires legal_compliance role
 */

import { getFirestore, Timestamp, FieldValue } from 'firebase-admin/firestore'

const db = getFirestore()

/**
 * Original audit entry data structure.
 *
 * Story 0.5.8: AC2 - Preserve original entry data verbatim
 */
export interface OriginalAuditEntry {
  viewerUid: string
  childId: string | null
  dataType: string
  viewedAt: Timestamp
  sessionId: string | null
  deviceId: string | null
  metadata: Record<string, unknown> | null
}

/**
 * Sealed audit entry structure.
 *
 * Story 0.5.8: AC2, AC3 - Complete sealed entry with metadata
 */
export interface SealedAuditEntry {
  id: string
  familyId: string
  originalEntry: OriginalAuditEntry
  sealedAt: Timestamp
  sealedByTicketId: string
  sealedByAgentId: string
  sealReason: 'escape_action'
  legalHold: boolean
  accessLog: Array<{
    accessedAt: Timestamp
    accessedByAgentId: string
    accessedByAgentEmail: string | null
    accessReason: string
  }>
}

/**
 * Options for sealing a single audit entry.
 */
export interface SealAuditEntryOptions {
  auditLogId: string
  familyId: string
  ticketId: string
  agentId: string
  reason: 'escape_action'
}

/**
 * Seal a single audit entry.
 *
 * Story 0.5.8: AC2 - Move entry to sealed collection
 *
 * This function:
 * 1. Reads the original audit entry
 * 2. Creates a sealed copy in sealedAuditEntries
 * 3. Deletes the original from auditLogs
 *
 * @param options - The sealing options
 * @returns True if entry was sealed, false if it didn't exist
 */
export async function sealAuditEntry(options: SealAuditEntryOptions): Promise<boolean> {
  const { auditLogId, familyId, ticketId, agentId, reason } = options

  const auditRef = db.collection('auditLogs').doc(auditLogId)
  const auditSnap = await auditRef.get()

  if (!auditSnap.exists) {
    return false
  }

  const auditData = auditSnap.data()
  if (!auditData) {
    return false
  }

  // Verify family matches
  if (auditData.familyId !== familyId) {
    return false
  }

  const now = Timestamp.now()

  // Create sealed entry with original data preserved
  const sealedEntry: SealedAuditEntry = {
    id: auditLogId,
    familyId,
    originalEntry: {
      viewerUid: auditData.viewerUid,
      childId: auditData.childId ?? null,
      dataType: auditData.dataType,
      viewedAt: auditData.viewedAt,
      sessionId: auditData.sessionId ?? null,
      deviceId: auditData.deviceId ?? null,
      metadata: auditData.metadata ?? null,
    },
    sealedAt: now,
    sealedByTicketId: ticketId,
    sealedByAgentId: agentId,
    sealReason: reason,
    legalHold: true,
    accessLog: [],
  }

  // Atomic operation: create sealed entry and delete original
  const batch = db.batch()

  const sealedRef = db.collection('sealedAuditEntries').doc(auditLogId)
  batch.set(sealedRef, sealedEntry)
  batch.delete(auditRef)

  await batch.commit()

  return true
}

/**
 * Get all sealed entries for a family.
 *
 * Story 0.5.8: AC3 - Admin access to sealed entries
 *
 * SECURITY: This function should only be called after verifying
 * the caller has legal_compliance role.
 *
 * @param familyId - The family ID to retrieve sealed entries for
 * @param agentId - The agent accessing the entries
 * @param agentEmail - The agent's email
 * @param accessReason - Documented reason for access
 * @returns Array of sealed audit entries
 */
export async function getSealedEntriesForFamily(
  familyId: string,
  agentId: string,
  agentEmail: string | null,
  accessReason: string
): Promise<SealedAuditEntry[]> {
  const query = db.collection('sealedAuditEntries').where('familyId', '==', familyId)

  const snapshot = await query.get()

  if (snapshot.empty) {
    return []
  }

  const entries: SealedAuditEntry[] = []
  const now = Timestamp.now()

  // Log access to each entry
  const batch = db.batch()

  for (const doc of snapshot.docs) {
    const entry = doc.data() as SealedAuditEntry
    entries.push(entry)

    // Add access log entry
    batch.update(doc.ref, {
      accessLog: FieldValue.arrayUnion({
        accessedAt: now,
        accessedByAgentId: agentId,
        accessedByAgentEmail: agentEmail,
        accessReason,
      }),
    })
  }

  await batch.commit()

  return entries
}

/**
 * Check if a family has any sealed audit entries.
 *
 * Story 0.5.8: Optimization helper
 *
 * @param familyId - The family ID to check
 * @returns True if sealed entries exist for this family
 */
export async function hasSealedEntries(familyId: string): Promise<boolean> {
  const query = db.collection('sealedAuditEntries').where('familyId', '==', familyId).limit(1)

  const snapshot = await query.get()

  return !snapshot.empty
}

/**
 * Get count of sealed entries for a family.
 *
 * Story 0.5.8: Utility function for admin dashboard
 *
 * @param familyId - The family ID to count entries for
 * @returns Number of sealed entries
 */
export async function countSealedEntries(familyId: string): Promise<number> {
  const query = db.collection('sealedAuditEntries').where('familyId', '==', familyId)

  const snapshot = await query.get()

  return snapshot.size
}
