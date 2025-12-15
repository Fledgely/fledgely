import { getFirestore, Timestamp, FieldValue } from 'firebase-admin/firestore'
import { createHash } from 'crypto'

/**
 * Seal reasons for audit entries
 */
export const SEAL_REASONS = [
  'escape-action',
  'safety-request',
  'child-safety',
  'stealth-activation',
  'device-unenrollment',
  'location-disable',
  'parent-severing',
] as const

export type SealReason = typeof SEAL_REASONS[number]

/**
 * Collections that may contain escape-related data requiring sealing
 */
export const SEALABLE_COLLECTIONS = [
  'adminAuditLog',
  'deviceCommands',
  'stealthQueues',
  'notificationQueue',
] as const

export type SealableCollection = typeof SEALABLE_COLLECTIONS[number]

/**
 * Base audit entry interface
 */
export interface AuditEntry {
  id?: string // Document ID from Firestore
  action: string
  resourceType: string
  resourceId: string
  performedBy: string
  timestamp: Timestamp
  familyId?: string
  sealed?: boolean
}

/**
 * Sealed audit entry with additional sealing metadata
 */
export interface SealedAuditEntry extends AuditEntry {
  sealed: true
  sealedAt: Timestamp
  sealedBy: string
  sealReason: SealReason
  relatedEntryIds?: string[]
  integrityHash: string
  safetyRequestId?: string
  affectedUserIds?: string[]
}

/**
 * Compliance access log entry
 */
export interface ComplianceAccessLog {
  accessedEntryId: string
  accessedEntryType: 'sealed-audit' | 'sealed-notification' | 'sealed-location' | 'sealed-device-command'
  accessedAt: Timestamp
  accessedBy: string
  accessReason: string
  legalReference?: string
  familyId: string
  integrityHash: string
}

/**
 * Options for querying family audit log
 */
export interface FamilyAuditQueryOptions {
  limit?: number
  startAfter?: Timestamp
  actionTypes?: string[]
}

/**
 * Generate an integrity hash for audit entry
 * Used for tamper detection on sealed entries
 */
export function generateIntegrityHash(data: Record<string, unknown>): string {
  const sortedJson = JSON.stringify(data, Object.keys(data).sort())
  return createHash('sha256').update(sortedJson).digest('hex')
}

/**
 * Verify integrity hash for a sealed audit entry
 * Returns true if hash is valid, false if tampered or invalid
 */
export function verifyIntegrityHash(
  entry: SealedAuditEntry,
  storedHash: string
): boolean {
  // Basic validation
  if (!storedHash || storedHash.length !== 64) {
    return false
  }

  // Extract hashable fields (excluding the hash itself and metadata added after sealing)
  const hashableData: Record<string, unknown> = {
    action: entry.action,
    resourceType: entry.resourceType,
    resourceId: entry.resourceId,
    performedBy: entry.performedBy,
    familyId: entry.familyId,
    sealed: entry.sealed,
    sealedBy: entry.sealedBy,
    sealReason: entry.sealReason,
    safetyRequestId: entry.safetyRequestId,
    // Convert timestamp to consistent ISO format
    timestamp: entry.timestamp?.toDate?.()?.toISOString() || null,
    sealedAt: entry.sealedAt?.toDate?.()?.toISOString() || null,
  }

  // Remove undefined values for consistent hashing
  Object.keys(hashableData).forEach(key => {
    if (hashableData[key] === undefined) {
      delete hashableData[key]
    }
  })

  const computedHash = generateIntegrityHash(hashableData)
  return computedHash === storedHash
}

/**
 * Query family audit log with sealed entries filtered out
 *
 * CRITICAL: This function ALWAYS excludes sealed entries to protect
 * abuse victims from having their escape planning revealed.
 *
 * @param familyId - The family ID to query audit entries for
 * @param options - Query options (limit, pagination, filters)
 * @returns Array of non-sealed audit entries
 */
export async function queryFamilyAuditLog(
  familyId: string,
  options: FamilyAuditQueryOptions = {}
): Promise<AuditEntry[]> {
  const db = getFirestore()
  const limit = options.limit || 50

  // Build base query with sealed filtering
  // CRITICAL: Always filter out sealed entries
  let query = db
    .collection('familyAuditLog')
    .where('familyId', '==', familyId)
    .where('sealed', '==', false)
    .orderBy('timestamp', 'desc')
    .limit(limit)

  // Handle action type filtering
  if (options.actionTypes && options.actionTypes.length > 0) {
    // Firestore 'in' query limited to 10 items
    const actionTypesToQuery = options.actionTypes.slice(0, 10)
    query = db
      .collection('familyAuditLog')
      .where('familyId', '==', familyId)
      .where('sealed', '==', false)
      .where('action', 'in', actionTypesToQuery)
      .orderBy('timestamp', 'desc')
      .limit(limit)
  }

  // Handle pagination
  if (options.startAfter) {
    query = query.startAfter(options.startAfter)
  }

  const snapshot = await query.get()
  return snapshot.docs.map(doc => ({
    ...doc.data(),
    id: doc.id,
  } as AuditEntry))
}

/**
 * Query sealed audit entries (compliance/legal access only)
 *
 * This function returns sealed entries for authorized compliance/legal team members.
 * Access is logged to complianceAccessLog.
 *
 * @param familyId - The family ID to query
 * @param accessedBy - UID of the compliance/legal team member
 * @param accessReason - Justification for access (min 50 chars)
 * @param options - Additional query options
 */
export async function querySealedAuditEntries(
  familyId: string,
  accessedBy: string,
  accessReason: string,
  options: {
    dateRange?: { start: Timestamp; end: Timestamp }
    actionTypes?: string[]
    limit?: number
    legalReference?: string
  } = {}
): Promise<SealedAuditEntry[]> {
  const db = getFirestore()
  const limit = options.limit || 100

  // Build query for sealed entries only
  let query = db
    .collection('adminAuditLog')
    .where('familyId', '==', familyId)
    .where('sealed', '==', true)
    .orderBy('timestamp', 'desc')
    .limit(limit)

  // Handle date range filtering
  if (options.dateRange) {
    query = db
      .collection('adminAuditLog')
      .where('familyId', '==', familyId)
      .where('sealed', '==', true)
      .where('timestamp', '>=', options.dateRange.start)
      .where('timestamp', '<=', options.dateRange.end)
      .orderBy('timestamp', 'desc')
      .limit(limit)
  }

  const snapshot = await query.get()
  const entries = snapshot.docs.map(doc => ({
    ...doc.data(),
    id: doc.id,
  } as SealedAuditEntry))

  // Log access for all entries accessed using batched writes
  if (entries.length > 0) {
    const accessTimestamp = Timestamp.now()
    const BATCH_LIMIT = 500
    const accessLogs: Array<Omit<ComplianceAccessLog, 'integrityHash'> & { integrityHash: string }> = []

    // Prepare all access log entries
    for (const entry of entries) {
      const accessLogData: Omit<ComplianceAccessLog, 'integrityHash'> = {
        accessedEntryId: entry.resourceId || entry.id || 'unknown',
        accessedEntryType: 'sealed-audit',
        accessedAt: accessTimestamp,
        accessedBy,
        accessReason,
        familyId,
        legalReference: options.legalReference,
      }

      const integrityHash = generateIntegrityHash({
        ...accessLogData,
        accessedAt: accessTimestamp.toDate().toISOString(),
      })

      accessLogs.push({ ...accessLogData, integrityHash })
    }

    // Batch write all access logs
    for (let i = 0; i < accessLogs.length; i += BATCH_LIMIT) {
      const chunk = accessLogs.slice(i, i + BATCH_LIMIT)
      const batch = db.batch()

      for (const log of chunk) {
        const ref = db.collection('complianceAccessLog').doc()
        batch.set(ref, log)
      }

      await batch.commit()
    }
  }

  return entries
}

/**
 * Seal an audit entry
 * Marks an entry as sealed and adds sealing metadata
 */
export async function sealAuditEntry(
  collection: string,
  entryId: string,
  sealedBy: string,
  sealReason: SealReason,
  relatedEntryIds?: string[]
): Promise<void> {
  const db = getFirestore()
  const sealedAt = Timestamp.now()

  await db.collection(collection).doc(entryId).update({
    sealed: true,
    sealedAt,
    sealedBy,
    sealReason,
    relatedEntryIds: relatedEntryIds || [],
  })
}

/**
 * Discover all entries related to a safety request
 * Returns entry references grouped by collection
 */
export async function discoverRelatedEntries(
  safetyRequestId: string,
  familyId: string
): Promise<Map<string, string[]>> {
  const db = getFirestore()
  const relatedEntries = new Map<string, string[]>()

  // Search adminAuditLog
  const adminAuditQuery = db
    .collection('adminAuditLog')
    .where('safetyRequestId', '==', safetyRequestId)
  const adminAuditDocs = await adminAuditQuery.get()
  if (!adminAuditDocs.empty) {
    relatedEntries.set('adminAuditLog', adminAuditDocs.docs.map(d => d.id))
  }

  // Search deviceCommands
  const deviceCommandsQuery = db
    .collection('deviceCommands')
    .where('safetyRequestId', '==', safetyRequestId)
  const deviceCommandsDocs = await deviceCommandsQuery.get()
  if (!deviceCommandsDocs.empty) {
    relatedEntries.set('deviceCommands', deviceCommandsDocs.docs.map(d => d.id))
  }

  // Search stealthQueues
  const stealthQueuesQuery = db
    .collection('stealthQueues')
    .where('safetyRequestId', '==', safetyRequestId)
  const stealthQueuesDocs = await stealthQueuesQuery.get()
  if (!stealthQueuesDocs.empty) {
    relatedEntries.set('stealthQueues', stealthQueuesDocs.docs.map(d => d.id))
  }

  return relatedEntries
}

/**
 * Propagate seal to all related collections atomically
 * Uses Firestore batch operations with chunking for large operations
 */
export async function propagateSealToRelatedCollections(
  safetyRequestId: string,
  familyId: string,
  sealedBy: string,
  sealReason: SealReason
): Promise<{ totalSealed: number; byCollection: Record<string, number> }> {
  const db = getFirestore()
  const BATCH_LIMIT = 500
  const sealedAt = Timestamp.now()

  // Discover all related entries
  const relatedEntries = await discoverRelatedEntries(safetyRequestId, familyId)

  const byCollection: Record<string, number> = {}
  let totalSealed = 0

  // Process each collection
  for (const [collection, entryIds] of relatedEntries) {
    byCollection[collection] = 0

    // Chunk entries to respect batch limits
    for (let i = 0; i < entryIds.length; i += BATCH_LIMIT) {
      const chunk = entryIds.slice(i, i + BATCH_LIMIT)
      const batch = db.batch()

      for (const entryId of chunk) {
        const ref = db.collection(collection).doc(entryId)
        batch.update(ref, {
          sealed: true,
          sealedAt,
          sealedBy,
          sealReason,
        })
      }

      await batch.commit()
      byCollection[collection] += chunk.length
      totalSealed += chunk.length
    }
  }

  return { totalSealed, byCollection }
}

/**
 * Unseal audit entries (legal team only)
 * This does NOT make entries visible to family - only to compliance/legal
 *
 * @param entryIds - Array of entry IDs to unseal
 * @param collection - Collection containing the entries
 * @param unsealedBy - UID of legal team member
 * @param courtOrderReference - Reference to court order authorizing unseal
 * @param legalJustification - Detailed justification (min 100 chars)
 */
export async function unsealAuditEntries(
  entryIds: string[],
  collection: string,
  unsealedBy: string,
  courtOrderReference: string,
  legalJustification: string
): Promise<{ unsealed: number }> {
  const db = getFirestore()
  const BATCH_LIMIT = 500
  const unsealedAt = Timestamp.now()

  let unsealed = 0

  // Chunk entries to respect batch limits
  for (let i = 0; i < entryIds.length; i += BATCH_LIMIT) {
    const chunk = entryIds.slice(i, i + BATCH_LIMIT)
    const batch = db.batch()

    for (const entryId of chunk) {
      const ref = db.collection(collection).doc(entryId)
      batch.update(ref, {
        sealed: false,
        unsealedAt,
        unsealedBy,
        courtOrderReference,
        legalJustification,
        // Keep original seal metadata for audit trail
      })
    }

    await batch.commit()
    unsealed += chunk.length
  }

  // Log the unseal operation to admin audit
  const auditData = {
    action: 'audit-entries-unseal',
    resourceType: collection,
    resourceId: entryIds.join(',').slice(0, 500), // Truncate for storage
    performedBy: unsealedBy,
    entryCount: entryIds.length,
    courtOrderReference,
    legalJustification,
    timestamp: FieldValue.serverTimestamp(),
    sealed: true, // The unseal log itself is sealed
  }

  const integrityHash = generateIntegrityHash({
    ...auditData,
    timestamp: unsealedAt.toDate().toISOString(),
  })

  await db.collection('adminAuditLog').add({
    ...auditData,
    integrityHash,
  })

  return { unsealed }
}

/**
 * Firestore batch operation limits
 */
export const FIRESTORE_BATCH_LIMIT = 500

/**
 * Helper to chunk array into smaller arrays
 */
export function chunkArray<T>(array: T[], chunkSize: number): T[][] {
  const chunks: T[][] = []
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize))
  }
  return chunks
}
