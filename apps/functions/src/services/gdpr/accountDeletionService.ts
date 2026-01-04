/**
 * Account Deletion Service - Story 51.4
 *
 * Provides complete account deletion including:
 * - Family data deletion (via dataDeletionService)
 * - Firebase Auth account deletion
 * - Family member notifications
 *
 * Follows patterns from:
 * - dataDeletionService.ts: Deletion and cooling off patterns
 */

import { getFirestore, Firestore } from 'firebase-admin/firestore'
import { getAuth, Auth } from 'firebase-admin/auth'
import * as logger from 'firebase-functions/logger'
import {
  AccountDeletionStatus,
  AccountDeletionRequestSchema,
  ACCOUNT_DELETION_CONFIG,
  type AccountDeletionRequest,
  type AffectedUser,
  type AccountDeletionResult,
} from '@fledgely/shared'
import { executeFamilyDeletion } from './dataDeletionService'

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

let auth: Auth | null = null
function getAuthInstance(): Auth {
  if (!auth) {
    auth = getAuth()
  }
  return auth
}

// ============================================================================
// FAMILY MEMBER DISCOVERY
// ============================================================================

/**
 * Get all users affected by account deletion.
 *
 * @param familyId - Family ID
 * @param requestingUid - UID of user requesting deletion
 * @returns Array of affected users
 */
export async function getAffectedUsers(
  familyId: string,
  _requestingUid: string
): Promise<AffectedUser[]> {
  const firestore = getDb()
  const affectedUsers: AffectedUser[] = []

  // Get family document for guardians
  const familyDoc = await firestore.collection('families').doc(familyId).get()

  if (!familyDoc.exists) {
    throw new Error(`Family ${familyId} not found`)
  }

  const familyData = familyDoc.data()
  const guardians = familyData?.guardians || []

  // Add all guardians
  for (const guardianId of guardians) {
    try {
      const authInstance = getAuthInstance()
      const userRecord = await authInstance.getUser(guardianId)
      affectedUsers.push({
        uid: guardianId,
        email: userRecord.email,
        role: 'guardian',
        notifiedAt: null,
      })
    } catch (error) {
      // User may not exist in Auth
      affectedUsers.push({
        uid: guardianId,
        role: 'guardian',
        notifiedAt: null,
      })
    }
  }

  // Get children
  const childrenSnapshot = await firestore
    .collection('children')
    .where('familyId', '==', familyId)
    .get()

  for (const childDoc of childrenSnapshot.docs) {
    const childData = childDoc.data()
    // Children may or may not have Firebase Auth accounts
    affectedUsers.push({
      uid: childDoc.id,
      email: childData.email,
      role: 'child',
      notifiedAt: null,
    })
  }

  return affectedUsers
}

// ============================================================================
// ACCOUNT DELETION REQUEST MANAGEMENT
// ============================================================================

/**
 * Create a new account deletion request with cooling off period.
 *
 * Uses a Firestore transaction to prevent race conditions where multiple
 * concurrent requests could create duplicate deletion requests.
 *
 * @param familyId - Family ID
 * @param requestedBy - UID of requesting guardian
 * @param requestedByEmail - Email of requesting guardian
 * @param affectedUsers - Users affected by deletion
 * @returns Account deletion request document
 * @throws Error if a deletion request already exists (race condition prevention)
 */
export async function createAccountDeletionRequest(
  familyId: string,
  requestedBy: string,
  requestedByEmail: string,
  affectedUsers: AffectedUser[]
): Promise<AccountDeletionRequest> {
  const firestore = getDb()

  // Use transaction to ensure atomic check-and-create (prevents race conditions)
  return firestore.runTransaction(async (transaction) => {
    // Check for existing active deletion within transaction
    const existingQuery = await firestore
      .collection(ACCOUNT_DELETION_CONFIG.COLLECTION_NAME)
      .where('familyId', '==', familyId)
      .where('status', 'in', [
        AccountDeletionStatus.PENDING,
        AccountDeletionStatus.COOLING_OFF,
        AccountDeletionStatus.PROCESSING,
      ])
      .limit(1)
      .get()

    if (!existingQuery.empty) {
      const existing = existingQuery.docs[0].data()
      throw new Error(`Account deletion already in progress: ${existing.deletionId}`)
    }

    const now = Date.now()
    const coolingOffEndsAt = now + ACCOUNT_DELETION_CONFIG.COOLING_OFF_MS

    // Generate unique deletion ID
    const deletionId = `acct_del_${now}_${Math.random().toString(36).substring(2, 8)}`

    const deletionRequest: AccountDeletionRequest = {
      deletionId,
      familyId,
      requestedBy,
      requestedByEmail,
      requestedAt: now,
      status: AccountDeletionStatus.COOLING_OFF,
      coolingOffEndsAt,
      scheduledDeletionAt: coolingOffEndsAt,
      affectedUsers,
      processingStartedAt: null,
      processedAt: null,
      cancelledAt: null,
      cancelledBy: null,
      completedAt: null,
      errorMessage: null,
    }

    // Validate request
    const validation = AccountDeletionRequestSchema.safeParse(deletionRequest)
    if (!validation.success) {
      logger.error('Account deletion request validation failed', {
        errors: validation.error.errors,
      })
      throw new Error('Failed to create valid account deletion request')
    }

    // Create within transaction
    const docRef = firestore.collection(ACCOUNT_DELETION_CONFIG.COLLECTION_NAME).doc(deletionId)
    transaction.set(docRef, deletionRequest)

    logger.info('Account deletion request created (transaction)', {
      deletionId,
      familyId,
      requestedBy,
      affectedUserCount: affectedUsers.length,
      coolingOffEndsAt: new Date(coolingOffEndsAt).toISOString(),
    })

    return deletionRequest
  })
}

/**
 * Find active account deletion request for a family.
 *
 * @param familyId - Family ID
 * @returns Active deletion request or null
 */
export async function findActiveAccountDeletion(
  familyId: string
): Promise<AccountDeletionRequest | null> {
  const firestore = getDb()

  const snapshot = await firestore
    .collection(ACCOUNT_DELETION_CONFIG.COLLECTION_NAME)
    .where('familyId', '==', familyId)
    .where('status', 'in', [
      AccountDeletionStatus.PENDING,
      AccountDeletionStatus.COOLING_OFF,
      AccountDeletionStatus.PROCESSING,
    ])
    .orderBy('requestedAt', 'desc')
    .limit(1)
    .get()

  if (snapshot.empty) {
    return null
  }

  const data = snapshot.docs[0].data()
  const validation = AccountDeletionRequestSchema.safeParse(data)

  if (!validation.success) {
    logger.error('Active account deletion validation failed', {
      deletionId: data.deletionId,
      errors: validation.error.errors,
    })
    return null
  }

  return validation.data
}

/**
 * Cancel an account deletion request during cooling off period.
 *
 * @param deletionId - Deletion ID
 * @param cancelledBy - UID of canceller
 */
export async function cancelAccountDeletionRequest(
  deletionId: string,
  cancelledBy: string
): Promise<void> {
  const firestore = getDb()
  const docRef = firestore.collection(ACCOUNT_DELETION_CONFIG.COLLECTION_NAME).doc(deletionId)

  const doc = await docRef.get()
  if (!doc.exists) {
    throw new Error(`Account deletion request ${deletionId} not found`)
  }

  const data = doc.data()
  if (data?.status !== AccountDeletionStatus.COOLING_OFF) {
    throw new Error(`Cannot cancel account deletion - status is ${data?.status}, not cooling_off`)
  }

  await docRef.update({
    status: AccountDeletionStatus.CANCELLED,
    cancelledAt: Date.now(),
    cancelledBy,
  })

  logger.info('Account deletion request cancelled', { deletionId, cancelledBy })
}

/**
 * Get an account deletion request by ID.
 *
 * @param deletionId - Deletion ID
 * @returns Deletion request or null
 */
export async function getAccountDeletionRequest(
  deletionId: string
): Promise<AccountDeletionRequest | null> {
  const firestore = getDb()
  const doc = await firestore
    .collection(ACCOUNT_DELETION_CONFIG.COLLECTION_NAME)
    .doc(deletionId)
    .get()

  if (!doc.exists) {
    return null
  }

  const data = doc.data()
  const validation = AccountDeletionRequestSchema.safeParse(data)

  if (!validation.success) {
    logger.error('Account deletion request validation failed on read', {
      deletionId,
      errors: validation.error.errors,
    })
    return null
  }

  return validation.data
}

/**
 * Update account deletion request status.
 *
 * @param deletionId - Deletion ID
 * @param updates - Fields to update
 */
export async function updateAccountDeletionRequest(
  deletionId: string,
  updates: Partial<AccountDeletionRequest>
): Promise<void> {
  const firestore = getDb()
  await firestore
    .collection(ACCOUNT_DELETION_CONFIG.COLLECTION_NAME)
    .doc(deletionId)
    .update(updates)
  logger.info('Account deletion request updated', { deletionId, updates: Object.keys(updates) })
}

/**
 * Find account deletions that have passed cooling off and need processing.
 *
 * @returns Array of deletion requests ready for processing
 */
export async function findAccountDeletionsReadyForProcessing(): Promise<AccountDeletionRequest[]> {
  const firestore = getDb()
  const now = Date.now()

  const snapshot = await firestore
    .collection(ACCOUNT_DELETION_CONFIG.COLLECTION_NAME)
    .where('status', '==', AccountDeletionStatus.COOLING_OFF)
    .where('coolingOffEndsAt', '<=', now)
    .limit(10) // Process in batches
    .get()

  const deletions: AccountDeletionRequest[] = []

  for (const doc of snapshot.docs) {
    const data = doc.data()
    const validation = AccountDeletionRequestSchema.safeParse(data)
    if (validation.success) {
      deletions.push(validation.data)
    }
  }

  return deletions
}

// ============================================================================
// ACCOUNT DELETION EXECUTION
// ============================================================================

/**
 * Delete a Firebase Auth user account.
 *
 * @param uid - User UID to delete
 * @returns true if deleted, false if not found
 */
async function deleteUserAccount(uid: string): Promise<boolean> {
  const authInstance = getAuthInstance()

  try {
    await authInstance.deleteUser(uid)
    logger.info('Firebase Auth account deleted', { uid })
    return true
  } catch (error: unknown) {
    const errorCode = (error as { code?: string }).code
    if (errorCode === 'auth/user-not-found') {
      logger.info('Firebase Auth account not found (already deleted)', { uid })
      return false
    }
    throw error
  }
}

/**
 * Execute complete account deletion.
 *
 * 1. Delete all family data (via dataDeletionService)
 * 2. Delete all Firebase Auth accounts
 *
 * @param deletionRequest - Account deletion request
 * @returns Deletion result with counts
 */
export async function executeAccountDeletion(
  deletionRequest: AccountDeletionRequest
): Promise<AccountDeletionResult> {
  const { deletionId, familyId, affectedUsers } = deletionRequest
  const startedAt = Date.now()
  const errors: string[] = []
  const deletedAccounts: string[] = []
  const failedAccounts: string[] = []
  let dataDeleted = false

  logger.info('Starting account deletion', {
    deletionId,
    familyId,
    affectedUserCount: affectedUsers.length,
  })

  // Step 1: Delete all family data
  try {
    const dataResult = await executeFamilyDeletion(familyId)
    dataDeleted = dataResult.errors.length === 0
    if (dataResult.errors.length > 0) {
      errors.push(...dataResult.errors)
    }
    logger.info('Family data deletion completed', {
      deletionId,
      familyId,
      recordsDeleted: dataResult.recordsDeleted,
      storageDeleted: dataResult.storageDeleted,
    })
  } catch (error) {
    const msg = `Failed to delete family data: ${error instanceof Error ? error.message : 'Unknown'}`
    errors.push(msg)
    logger.error(msg, { deletionId, familyId })
  }

  // Step 2: Delete Firebase Auth accounts for ALL users (guardians AND children)
  // AC9: Both guardian and child Firebase Auth accounts must be deleted
  for (const user of affectedUsers) {
    try {
      const deleted = await deleteUserAccount(user.uid)
      if (deleted) {
        deletedAccounts.push(user.uid)
      } else {
        // User didn't exist in Auth - this is OK for children who may not have accounts
        logger.info('Firebase Auth account not found (may not exist)', {
          uid: user.uid,
          role: user.role,
          deletionId,
        })
      }
    } catch (error) {
      const msg = `Failed to delete ${user.role} account ${user.uid}: ${error instanceof Error ? error.message : 'Unknown'}`
      errors.push(msg)
      failedAccounts.push(user.uid)
      logger.error(msg, { deletionId, uid: user.uid, role: user.role })
    }
  }

  const result: AccountDeletionResult = {
    deletionId,
    familyId,
    startedAt,
    completedAt: errors.length === 0 ? Date.now() : null,
    dataDeleted,
    accountsDeleted: deletedAccounts,
    accountsFailed: failedAccounts,
    errors,
  }

  logger.info('Account deletion completed', {
    deletionId,
    familyId,
    dataDeleted,
    accountsDeleted: deletedAccounts.length,
    accountsFailed: failedAccounts.length,
    errorCount: errors.length,
  })

  return result
}

// ============================================================================
// TESTING UTILITIES
// ============================================================================

/**
 * For testing - reset Firestore and Auth instances
 */
export function _resetForTesting(): void {
  db = null
  auth = null
}
