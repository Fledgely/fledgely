/**
 * Data Deletion Service
 *
 * Story 51.2: Data Deletion Request (GDPR Article 17)
 *
 * Provides GDPR-compliant right to erasure by:
 * - Creating deletion requests with cooling off period
 * - Cancellation support during cooling off
 * - Permanent deletion of all family data
 * - Deletion from both Firestore and Cloud Storage
 *
 * Follows patterns from:
 * - dataExportService.ts: Service structure and lazy initialization
 * - age18DeletionService.ts: Deletion patterns
 * - dataDeletionQueueService.ts: Queue-based deletion
 */

import { getFirestore, Firestore } from 'firebase-admin/firestore'
import { getStorage, Storage } from 'firebase-admin/storage'
import * as logger from 'firebase-functions/logger'
import {
  DataDeletionStatus,
  DataDeletionRequestSchema,
  DATA_DELETION_CONFIG,
  type DataDeletionRequest,
  type GDPRDeletionResult,
} from '@fledgely/shared'

// ============================================================================
// LAZY INITIALIZATION
// ============================================================================

let db: Firestore | null = null
function getDb(): Firestore {
  if (!db) {
    db = getFirestore()
  }
  return db
}

let storage: Storage | null = null
function getStorageInstance(): Storage {
  if (!storage) {
    storage = getStorage()
  }
  return storage
}

// ============================================================================
// DELETION REQUEST MANAGEMENT
// ============================================================================

/**
 * Create a new data deletion request with cooling off period.
 *
 * @param familyId - Family ID
 * @param requestedBy - UID of requesting guardian
 * @param requestedByEmail - Email of requesting guardian
 * @returns Deletion request document
 */
export async function createDeletionRequest(
  familyId: string,
  requestedBy: string,
  requestedByEmail: string
): Promise<DataDeletionRequest> {
  const firestore = getDb()
  const now = Date.now()
  const coolingOffEndsAt = now + DATA_DELETION_CONFIG.COOLING_OFF_MS

  // Generate unique deletion ID
  const deletionId = `del_${now}_${Math.random().toString(36).substring(2, 8)}`

  const deletionRequest: DataDeletionRequest = {
    deletionId,
    familyId,
    requestedBy,
    requestedByEmail,
    requestedAt: now,
    status: DataDeletionStatus.COOLING_OFF,
    coolingOffEndsAt,
    scheduledDeletionAt: coolingOffEndsAt,
    processingStartedAt: null,
    processedAt: null,
    cancelledAt: null,
    cancelledBy: null,
    completedAt: null,
    errorMessage: null,
  }

  // Validate request
  const validation = DataDeletionRequestSchema.safeParse(deletionRequest)
  if (!validation.success) {
    logger.error('Deletion request validation failed', { errors: validation.error.errors })
    throw new Error('Failed to create valid deletion request')
  }

  // Save to Firestore
  await firestore
    .collection(DATA_DELETION_CONFIG.COLLECTION_NAME)
    .doc(deletionId)
    .set(deletionRequest)

  logger.info('Deletion request created', {
    deletionId,
    familyId,
    requestedBy,
    coolingOffEndsAt: new Date(coolingOffEndsAt).toISOString(),
  })

  return deletionRequest
}

/**
 * Find active deletion request for a family.
 *
 * @param familyId - Family ID
 * @returns Active deletion request or null
 */
export async function findActiveDeletion(familyId: string): Promise<DataDeletionRequest | null> {
  const firestore = getDb()

  const snapshot = await firestore
    .collection(DATA_DELETION_CONFIG.COLLECTION_NAME)
    .where('familyId', '==', familyId)
    .where('status', 'in', [
      DataDeletionStatus.PENDING,
      DataDeletionStatus.COOLING_OFF,
      DataDeletionStatus.PROCESSING,
    ])
    .orderBy('requestedAt', 'desc')
    .limit(1)
    .get()

  if (snapshot.empty) {
    return null
  }

  const data = snapshot.docs[0].data()
  const validation = DataDeletionRequestSchema.safeParse(data)

  if (!validation.success) {
    logger.error('Active deletion validation failed', {
      deletionId: data.deletionId,
      errors: validation.error.errors,
    })
    return null
  }

  return validation.data
}

/**
 * Cancel a deletion request during cooling off period.
 *
 * @param deletionId - Deletion ID
 * @param cancelledBy - UID of canceller
 */
export async function cancelDeletionRequest(
  deletionId: string,
  cancelledBy: string
): Promise<void> {
  const firestore = getDb()
  const docRef = firestore.collection(DATA_DELETION_CONFIG.COLLECTION_NAME).doc(deletionId)

  const doc = await docRef.get()
  if (!doc.exists) {
    throw new Error(`Deletion request ${deletionId} not found`)
  }

  const data = doc.data()
  if (data?.status !== DataDeletionStatus.COOLING_OFF) {
    throw new Error(`Cannot cancel deletion - status is ${data?.status}, not cooling_off`)
  }

  await docRef.update({
    status: DataDeletionStatus.CANCELLED,
    cancelledAt: Date.now(),
    cancelledBy,
  })

  logger.info('Deletion request cancelled', { deletionId, cancelledBy })
}

/**
 * Get a deletion request by ID.
 *
 * @param deletionId - Deletion ID
 * @returns Deletion request or null
 */
export async function getDeletionRequest(deletionId: string): Promise<DataDeletionRequest | null> {
  const firestore = getDb()
  const doc = await firestore.collection(DATA_DELETION_CONFIG.COLLECTION_NAME).doc(deletionId).get()

  if (!doc.exists) {
    return null
  }

  const data = doc.data()
  const validation = DataDeletionRequestSchema.safeParse(data)

  if (!validation.success) {
    logger.error('Deletion request validation failed on read', {
      deletionId,
      errors: validation.error.errors,
    })
    return null
  }

  return validation.data
}

/**
 * Update deletion request status.
 *
 * @param deletionId - Deletion ID
 * @param updates - Fields to update
 */
export async function updateDeletionRequest(
  deletionId: string,
  updates: Partial<DataDeletionRequest>
): Promise<void> {
  const firestore = getDb()
  await firestore.collection(DATA_DELETION_CONFIG.COLLECTION_NAME).doc(deletionId).update(updates)
  logger.info('Deletion request updated', { deletionId, updates: Object.keys(updates) })
}

/**
 * Find deletions that have passed cooling off and need processing.
 *
 * @returns Array of deletion requests ready for processing
 */
export async function findDeletionsReadyForProcessing(): Promise<DataDeletionRequest[]> {
  const firestore = getDb()
  const now = Date.now()

  const snapshot = await firestore
    .collection(DATA_DELETION_CONFIG.COLLECTION_NAME)
    .where('status', '==', DataDeletionStatus.COOLING_OFF)
    .where('coolingOffEndsAt', '<=', now)
    .limit(10) // Process in batches
    .get()

  const deletions: DataDeletionRequest[] = []

  for (const doc of snapshot.docs) {
    const data = doc.data()
    const validation = DataDeletionRequestSchema.safeParse(data)
    if (validation.success) {
      deletions.push(validation.data)
    }
  }

  return deletions
}

// ============================================================================
// DATA DELETION EXECUTION
// ============================================================================

/**
 * Delete all subcollection documents in batches.
 */
async function deleteSubcollection(
  parentRef: FirebaseFirestore.DocumentReference,
  subcollectionName: string
): Promise<number> {
  const firestore = getDb()
  let deletedCount = 0
  const batchSize = 500

  const collectionRef = parentRef.collection(subcollectionName)
  let snapshot = await collectionRef.limit(batchSize).get()

  while (!snapshot.empty) {
    const batch = firestore.batch()

    for (const doc of snapshot.docs) {
      batch.delete(doc.ref)
      deletedCount++
    }

    await batch.commit()

    if (snapshot.docs.length < batchSize) {
      break
    }

    snapshot = await collectionRef.limit(batchSize).get()
  }

  return deletedCount
}

/**
 * Delete all files in a Cloud Storage prefix.
 */
async function deleteStoragePrefix(prefix: string): Promise<number> {
  const storageInstance = getStorageInstance()
  const bucket = storageInstance.bucket()
  let deletedCount = 0

  try {
    const [files] = await bucket.getFiles({ prefix })

    for (const file of files) {
      try {
        await file.delete({ ignoreNotFound: true })
        deletedCount++
      } catch (error) {
        logger.warn('Failed to delete storage file', {
          filePath: file.name,
          error: error instanceof Error ? error.message : 'Unknown error',
        })
      }
    }
  } catch (error) {
    logger.error('Failed to list storage files for deletion', {
      prefix,
      error: error instanceof Error ? error.message : 'Unknown error',
    })
  }

  return deletedCount
}

/**
 * Execute complete deletion of all family data.
 *
 * Deletes in this order:
 * 1. Cloud Storage files (screenshots, exports) - largest data
 * 2. Child subcollections (screenshots, flags metadata)
 * 3. Family subcollections (devices, agreements, settings)
 * 4. Children documents
 * 5. Audit events
 * 6. Family document - last to maintain audit trail
 *
 * @param familyId - Family ID to delete
 * @returns Deletion result with counts
 */
export async function executeFamilyDeletion(familyId: string): Promise<GDPRDeletionResult> {
  const firestore = getDb()
  const startedAt = Date.now()
  const errors: string[] = []
  let recordsDeleted = 0
  let storageDeleted = 0
  const dataTypesDeleted: string[] = []

  logger.info('Starting family deletion', { familyId })

  // 1. Delete Cloud Storage - Screenshots
  try {
    const screenshotStorageDeleted = await deleteStoragePrefix(`screenshots/${familyId}/`)
    storageDeleted += screenshotStorageDeleted
    if (screenshotStorageDeleted > 0) {
      dataTypesDeleted.push('screenshot_images')
    }
    logger.info('Deleted screenshot files', { familyId, count: screenshotStorageDeleted })
  } catch (error) {
    const msg = `Failed to delete screenshots: ${error instanceof Error ? error.message : 'Unknown'}`
    errors.push(msg)
    logger.error(msg, { familyId })
  }

  // 2. Delete Cloud Storage - Exports
  try {
    const exportStorageDeleted = await deleteStoragePrefix(`exports/${familyId}/`)
    storageDeleted += exportStorageDeleted
    if (exportStorageDeleted > 0) {
      dataTypesDeleted.push('exports')
    }
    logger.info('Deleted export files', { familyId, count: exportStorageDeleted })
  } catch (error) {
    const msg = `Failed to delete exports: ${error instanceof Error ? error.message : 'Unknown'}`
    errors.push(msg)
    logger.error(msg, { familyId })
  }

  // 3. Get children to delete their subcollections
  const childrenSnapshot = await firestore
    .collection('children')
    .where('familyId', '==', familyId)
    .get()

  for (const childDoc of childrenSnapshot.docs) {
    const childId = childDoc.id

    // Delete child's screenshots metadata
    try {
      const screenshotMetaDeleted = await deleteSubcollection(childDoc.ref, 'screenshots')
      recordsDeleted += screenshotMetaDeleted
      if (screenshotMetaDeleted > 0 && !dataTypesDeleted.includes('screenshots')) {
        dataTypesDeleted.push('screenshots')
      }
    } catch (error) {
      errors.push(`Failed to delete screenshots for child ${childId}`)
    }

    // Delete child's flags
    try {
      const flagsDeleted = await deleteSubcollection(childDoc.ref, 'flags')
      recordsDeleted += flagsDeleted
      if (flagsDeleted > 0 && !dataTypesDeleted.includes('flags')) {
        dataTypesDeleted.push('flags')
      }
    } catch (error) {
      errors.push(`Failed to delete flags for child ${childId}`)
    }
  }

  // 4. Delete family subcollections
  const familyRef = firestore.collection('families').doc(familyId)

  // Devices
  try {
    const devicesDeleted = await deleteSubcollection(familyRef, 'devices')
    recordsDeleted += devicesDeleted
    if (devicesDeleted > 0) {
      dataTypesDeleted.push('devices')
    }
  } catch (error) {
    errors.push('Failed to delete devices')
  }

  // Agreements
  try {
    const agreementsDeleted = await deleteSubcollection(familyRef, 'agreements')
    recordsDeleted += agreementsDeleted
    if (agreementsDeleted > 0) {
      dataTypesDeleted.push('agreements')
    }
  } catch (error) {
    errors.push('Failed to delete agreements')
  }

  // Settings
  try {
    const settingsDeleted = await deleteSubcollection(familyRef, 'settings')
    recordsDeleted += settingsDeleted
    if (settingsDeleted > 0) {
      dataTypesDeleted.push('settings')
    }
  } catch (error) {
    errors.push('Failed to delete settings')
  }

  // 5. Delete children documents
  if (childrenSnapshot.docs.length > 0) {
    const batch = firestore.batch()
    for (const childDoc of childrenSnapshot.docs) {
      batch.delete(childDoc.ref)
      recordsDeleted++
    }
    await batch.commit()
    dataTypesDeleted.push('children')
  }

  // 6. Delete audit events for this family
  try {
    const auditSnapshot = await firestore
      .collection('auditEvents')
      .where('familyId', '==', familyId)
      .limit(500)
      .get()

    while (auditSnapshot.docs.length > 0) {
      const batch = firestore.batch()
      for (const doc of auditSnapshot.docs) {
        batch.delete(doc.ref)
        recordsDeleted++
      }
      await batch.commit()

      if (auditSnapshot.docs.length < 500) break

      // Get next batch
      const nextSnapshot = await firestore
        .collection('auditEvents')
        .where('familyId', '==', familyId)
        .limit(500)
        .get()

      if (nextSnapshot.empty) break
    }
    dataTypesDeleted.push('audit_events')
  } catch (error) {
    errors.push('Failed to delete audit events')
  }

  // 7. Delete family document last
  try {
    await familyRef.delete()
    recordsDeleted++
    dataTypesDeleted.push('family_profile')
    logger.info('Family document deleted', { familyId })
  } catch (error) {
    const msg = `Failed to delete family document: ${error instanceof Error ? error.message : 'Unknown'}`
    errors.push(msg)
    logger.error(msg, { familyId })
  }

  const result: GDPRDeletionResult = {
    deletionId: '', // Will be set by caller
    familyId,
    startedAt,
    completedAt: errors.length === 0 ? Date.now() : null,
    dataTypesDeleted,
    recordsDeleted,
    storageDeleted,
    errors,
  }

  logger.info('Family deletion completed', {
    familyId,
    recordsDeleted,
    storageDeleted,
    dataTypesDeleted,
    errorCount: errors.length,
  })

  return result
}

// ============================================================================
// TESTING UTILITIES
// ============================================================================

/**
 * For testing - reset Firestore and Storage instances
 */
export function _resetForTesting(): void {
  db = null
  storage = null
}
