/**
 * Escape Audit Sealer.
 *
 * Story 0.5.8: Audit Trail Sealing
 *
 * Handles sealing of audit entries during escape actions.
 * This module provides the integration layer between escape actions
 * and the sealed audit infrastructure.
 *
 * CRITICAL SAFETY REQUIREMENTS:
 * - Entries are MOVED to sealed collection, then DELETED from auditLogs
 * - No suspicious gaps (timestamps remain continuous because entries are gone)
 * - Sealing logged to admin audit only
 * - Called AFTER stealth window activation
 */

import { getFirestore, Timestamp } from 'firebase-admin/firestore'
import { logAdminAction } from '../../utils/adminAudit'

const db = getFirestore()

/**
 * Options for sealing escape-related audit entries.
 */
export interface SealEscapeEntriesOptions {
  familyId: string
  escapedUserIds: string[]
  ticketId: string
  agentId: string
  agentEmail: string | null
  ipAddress: string | null
}

/**
 * Seal all audit entries related to an escape action.
 *
 * Story 0.5.8: AC6 - Integrate with escape actions
 *
 * This function seals audit entries for the escaped users by:
 * 1. Finding all audit entries by the escaped users in this family
 * 2. Moving each entry to sealedAuditEntries collection
 * 3. Deleting original entries from auditLogs
 * 4. Logging the operation to admin audit only
 *
 * CRITICAL: This removes entries from the source, preventing any
 * metadata leakage that could reveal escape activity.
 *
 * @param options - The sealing options
 * @returns Number of entries sealed
 */
export async function sealEscapeRelatedEntries(options: SealEscapeEntriesOptions): Promise<number> {
  const { familyId, escapedUserIds, ticketId, agentId, agentEmail, ipAddress } = options

  // Validate inputs
  if (!familyId || escapedUserIds.length === 0) {
    return 0
  }

  // Find all audit entries for this family by escaped users
  // Note: We seal entries by the ESCAPED user (victim), not by the abuser
  // This removes any evidence of the victim's recent activity
  //
  // Firestore 'in' queries are limited to 30 items
  // If we have more escaped users, we need to batch
  let totalSealed = 0
  const batchSize = 30

  for (let i = 0; i < escapedUserIds.length; i += batchSize) {
    const userBatch = escapedUserIds.slice(i, i + batchSize)
    const sealed = await sealEntriesForUsers(familyId, userBatch, ticketId, agentId)
    totalSealed += sealed
  }

  // Log to admin audit ONLY
  await logAdminAction({
    agentId,
    agentEmail,
    action: 'seal_audit_entries',
    resourceType: 'sealed_audit',
    resourceId: familyId,
    metadata: {
      ticketId,
      escapedUserIds,
      entriesSealed: totalSealed,
    },
    ipAddress,
  })

  return totalSealed
}

/**
 * Seal audit entries for a batch of users.
 *
 * @param familyId - The family ID
 * @param userIds - User IDs to seal entries for (max 30)
 * @param ticketId - The safety ticket ID
 * @param agentId - The agent performing the seal
 * @returns Number of entries sealed
 */
async function sealEntriesForUsers(
  familyId: string,
  userIds: string[],
  ticketId: string,
  agentId: string
): Promise<number> {
  if (userIds.length === 0 || userIds.length > 30) {
    return 0
  }

  // Query for audit entries by these users in this family
  const auditQuery = db
    .collection('auditLogs')
    .where('familyId', '==', familyId)
    .where('viewerUid', 'in', userIds)

  const snapshot = await auditQuery.get()

  if (snapshot.empty) {
    return 0
  }

  const now = Timestamp.now()

  // Process in batches of 500 (Firestore limit)
  const docs = snapshot.docs
  let sealedCount = 0

  for (let i = 0; i < docs.length; i += 500) {
    const batch = db.batch()
    const batchDocs = docs.slice(i, i + 500)

    for (const doc of batchDocs) {
      const originalEntry = doc.data()

      // Create sealed entry
      const sealedRef = db.collection('sealedAuditEntries').doc(doc.id)
      batch.set(sealedRef, {
        id: doc.id,
        familyId,
        originalEntry: {
          viewerUid: originalEntry.viewerUid,
          childId: originalEntry.childId ?? null,
          dataType: originalEntry.dataType,
          viewedAt: originalEntry.viewedAt,
          sessionId: originalEntry.sessionId ?? null,
          deviceId: originalEntry.deviceId ?? null,
          metadata: originalEntry.metadata ?? null,
        },
        sealedAt: now,
        sealedByTicketId: ticketId,
        sealedByAgentId: agentId,
        sealReason: 'escape_action',
        legalHold: true,
        accessLog: [],
      })

      // Delete original entry
      batch.delete(doc.ref)

      sealedCount++
    }

    await batch.commit()
  }

  return sealedCount
}

/**
 * Check if sealing should be performed for an escape action.
 *
 * Story 0.5.8: AC6 - Called from escape actions
 *
 * This function determines if there are any audit entries to seal
 * without actually sealing them. Useful for dry-run checks.
 *
 * @param familyId - The family ID
 * @param escapedUserIds - User IDs that are escaping
 * @returns Number of entries that would be sealed
 */
export async function countEscapeRelatedEntries(
  familyId: string,
  escapedUserIds: string[]
): Promise<number> {
  if (!familyId || escapedUserIds.length === 0) {
    return 0
  }

  let totalCount = 0
  const batchSize = 30

  for (let i = 0; i < escapedUserIds.length; i += batchSize) {
    const userBatch = escapedUserIds.slice(i, i + batchSize)

    const auditQuery = db
      .collection('auditLogs')
      .where('familyId', '==', familyId)
      .where('viewerUid', 'in', userBatch)

    const snapshot = await auditQuery.get()
    totalCount += snapshot.size
  }

  return totalCount
}
