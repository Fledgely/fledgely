'use client'

import {
  doc,
  getDocs,
  collection,
  query,
  where,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore'
import { ref, listAll, deleteObject } from 'firebase/storage'
import { db, storage } from '@/lib/firebase'
import { getChildRemovalErrorMessage } from '@fledgely/contracts'

/**
 * Data Deletion Service - Handles permanent deletion of child data
 *
 * Follows project guidelines:
 * - Direct Firestore SDK (no abstractions)
 * - Server timestamps for reliability
 * - Batch operations for atomic updates
 *
 * Story 2.6: Remove Child from Family - Data deletion
 *
 * This service is future-proofed for features not yet implemented:
 * - Screenshots
 * - Activity logs
 * - Agreements
 */

/** Collection name for family documents */
const FAMILIES_COLLECTION = 'families'

/** Collection name for screenshots (future) */
const SCREENSHOTS_COLLECTION = 'screenshots'

/** Collection name for activity logs (future) */
const ACTIVITY_LOGS_COLLECTION = 'activityLogs'

/** Collection name for agreements (future) */
const AGREEMENTS_COLLECTION = 'agreements'

/** Subcollection name for audit logs */
const AUDIT_LOG_SUBCOLLECTION = 'auditLog'

/**
 * Custom error class for data deletion service errors
 */
export class DataDeletionError extends Error {
  constructor(
    public readonly code: string,
    message: string
  ) {
    super(message)
    this.name = 'DataDeletionError'
  }
}

/**
 * Result of deleting child data
 */
export interface DeleteChildDataResult {
  success: true
  childId: string
  familyId: string
  screenshotsDeleted: number
  activityLogsDeleted: number
  agreementsDeleted: number
}

/**
 * Delete all data associated with a child
 * DESTRUCTIVE: This operation is irreversible
 *
 * Story 2.6: Remove Child from Family - Data deletion
 *
 * Currently handles:
 * 1. Screenshots (from Firebase Storage - future-proofed)
 * 2. Activity logs (future-proofed)
 * 3. Agreements (future-proofed)
 *
 * @param childId - ID of the child whose data should be deleted
 * @param familyId - ID of the family (for audit log and storage path)
 * @param userId - Firebase Auth uid of the user performing the action
 * @returns Result with counts of deleted items
 */
export async function deleteChildData(
  childId: string,
  familyId: string,
  userId: string
): Promise<DeleteChildDataResult> {
  try {
    if (!childId) {
      throw new DataDeletionError('invalid-child-id', 'Child ID is required')
    }
    if (!familyId) {
      throw new DataDeletionError('invalid-family-id', 'Family ID is required')
    }

    let screenshotsDeleted = 0
    let activityLogsDeleted = 0
    let agreementsDeleted = 0

    // 1. Delete screenshots from Firebase Storage (future-proofed)
    try {
      const screenshotsRef = ref(storage, `families/${familyId}/children/${childId}/screenshots`)
      const screenshotsList = await listAll(screenshotsRef)

      if (screenshotsList.items.length > 0) {
        // Delete all screenshot files
        const deletePromises = screenshotsList.items.map((item) => deleteObject(item))
        await Promise.all(deletePromises)
        screenshotsDeleted = screenshotsList.items.length
      }
    } catch (storageError) {
      // Storage may not have items for this child - that's OK
      // Only log if it's not a "not found" type error
      const errorCode = (storageError as { code?: string }).code
      if (errorCode !== 'storage/object-not-found') {
        console.warn('[dataDeletionService] Error deleting screenshots:', storageError)
      }
    }

    // 2. Delete screenshot metadata and activity logs from Firestore (future-proofed)
    const batch = writeBatch(db)

    // Query and delete screenshot metadata documents (if they exist)
    try {
      const screenshotsQuery = query(
        collection(db, SCREENSHOTS_COLLECTION),
        where('childId', '==', childId)
      )
      const screenshotDocs = await getDocs(screenshotsQuery)
      screenshotDocs.forEach((docSnapshot) => {
        batch.delete(doc(db, SCREENSHOTS_COLLECTION, docSnapshot.id))
      })
      // Count already tracked from storage deletion
    } catch (queryError) {
      // Collection may not exist - that's OK
      console.debug('[dataDeletionService] Screenshots collection query:', queryError)
    }

    // 3. Delete activity logs (future-proofed)
    try {
      const activityLogsQuery = query(
        collection(db, ACTIVITY_LOGS_COLLECTION),
        where('childId', '==', childId)
      )
      const activityLogDocs = await getDocs(activityLogsQuery)
      activityLogDocs.forEach((docSnapshot) => {
        batch.delete(doc(db, ACTIVITY_LOGS_COLLECTION, docSnapshot.id))
        activityLogsDeleted++
      })
    } catch (queryError) {
      // Collection may not exist - that's OK
      console.debug('[dataDeletionService] Activity logs collection query:', queryError)
    }

    // 4. Delete agreements (future-proofed)
    try {
      const agreementsQuery = query(
        collection(db, AGREEMENTS_COLLECTION),
        where('childId', '==', childId)
      )
      const agreementDocs = await getDocs(agreementsQuery)
      agreementDocs.forEach((docSnapshot) => {
        batch.delete(doc(db, AGREEMENTS_COLLECTION, docSnapshot.id))
        agreementsDeleted++
      })
    } catch (queryError) {
      // Collection may not exist - that's OK
      console.debug('[dataDeletionService] Agreements collection query:', queryError)
    }

    // 5. Create audit log entry for data deletion
    const auditRef = doc(collection(db, FAMILIES_COLLECTION, familyId, AUDIT_LOG_SUBCOLLECTION))
    batch.set(auditRef, {
      id: auditRef.id,
      action: 'child_data_deleted',
      entityId: childId,
      entityType: 'child',
      metadata: {
        screenshotsDeleted,
        activityLogsDeleted,
        agreementsDeleted,
        reason: 'child_removed',
      },
      performedBy: userId,
      performedAt: serverTimestamp(),
    })

    // Commit batch
    await batch.commit()

    return {
      success: true,
      childId,
      familyId,
      screenshotsDeleted,
      activityLogsDeleted,
      agreementsDeleted,
    }
  } catch (error) {
    if (error instanceof DataDeletionError) {
      const message = getChildRemovalErrorMessage('removal-failed')
      console.error('[dataDeletionService.deleteChildData]', error)
      throw new Error(message)
    }
    const message = getChildRemovalErrorMessage('default')
    console.error('[dataDeletionService.deleteChildData]', error)
    throw new Error(message)
  }
}
