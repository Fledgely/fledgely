/**
 * Activate Safe Escape Cloud Function - Story 40.3
 *
 * Instantly disables all location features when any family member
 * feels unsafe. This is a safety-critical feature with NO delays.
 *
 * Acceptance Criteria:
 * - AC1: Instant activation, no confirmation
 * - AC2: Silent operation - no notifications for 72 hours
 * - AC3: Location history cleared for activating user
 * - AC6: Children have same protections as adults
 */

import { onCall, HttpsError, type CallableRequest } from 'firebase-functions/v2/https'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { activateSafeEscapeInputSchema, SAFE_ESCAPE_SILENT_PERIOD_MS } from '@fledgely/shared'

/**
 * Verify caller is a family member (guardian OR child)
 * Safe Escape is available to ALL family members, not just guardians
 */
async function verifyFamilyMember(
  db: FirebaseFirestore.Firestore,
  familyId: string,
  callerId: string
): Promise<{ isGuardian: boolean; isChild: boolean }> {
  const familyDoc = await db.collection('families').doc(familyId).get()

  if (!familyDoc.exists) {
    throw new HttpsError('not-found', 'Family not found')
  }

  const familyData = familyDoc.data()

  // Check if caller is a guardian
  const isGuardian = familyData?.guardians?.some((g: { id: string }) => g.id === callerId) ?? false

  // Check if caller is a child
  const isChild = familyData?.children?.some((c: { id: string }) => c.id === callerId) ?? false

  if (!isGuardian && !isChild) {
    throw new HttpsError('permission-denied', 'Only family members can activate Safe Escape')
  }

  return { isGuardian, isChild }
}

/**
 * Clear location history for the user who activated
 * This prevents anyone from seeing where they were
 *
 * Uses chunked batches to handle datasets larger than Firestore's
 * 500 operation batch limit.
 */
async function clearLocationHistory(
  db: FirebaseFirestore.Firestore,
  familyId: string,
  userId: string
): Promise<number> {
  // Query location history for this user
  const historyRef = db
    .collection('families')
    .doc(familyId)
    .collection('locationHistory')
    .where('userId', '==', userId)

  const snapshot = await historyRef.get()

  if (snapshot.empty) {
    return 0
  }

  // Firestore batch limit is 500 operations
  const BATCH_LIMIT = 500
  const docs = snapshot.docs
  let totalDeleted = 0

  // Delete in chunks of 500
  for (let i = 0; i < docs.length; i += BATCH_LIMIT) {
    const chunk = docs.slice(i, i + BATCH_LIMIT)
    const batch = db.batch()

    chunk.forEach((doc) => {
      batch.delete(doc.ref)
    })

    await batch.commit()
    totalDeleted += chunk.length
  }

  return totalDeleted
}

/**
 * Disable location features for the family
 */
async function disableLocationFeatures(
  db: FirebaseFirestore.Firestore,
  familyId: string
): Promise<void> {
  const settingsRef = db.collection('families').doc(familyId).collection('settings').doc('location')

  await settingsRef.set(
    {
      locationFeaturesEnabled: false,
      disabledAt: FieldValue.serverTimestamp(),
      disabledReason: 'safe_escape',
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  )
}

/**
 * Create sealed audit log entry (privacy-protected)
 * These entries go to a separate collection for compliance
 */
async function createSealedAuditEntry(
  db: FirebaseFirestore.Firestore,
  familyId: string,
  activatedBy: string,
  activationId: string
): Promise<void> {
  const sealedEntry = {
    id: `safe-escape-${activationId}`,
    familyId,
    originalEntry: {
      viewerUid: activatedBy,
      childId: null,
      dataType: 'safe_escape_activation',
      viewedAt: new Date(),
      sessionId: null,
      deviceId: null,
      metadata: { activationId },
    },
    sealedAt: FieldValue.serverTimestamp(),
    sealedByTicketId: `auto-seal-${activationId}`,
    sealedByAgentId: 'system',
    sealReason: 'escape_action',
    legalHold: true,
    accessLog: [],
  }

  await db.collection('sealedAuditEntries').doc(sealedEntry.id).set(sealedEntry)
}

/**
 * Activate Safe Escape - INSTANT, NO CONFIRMATION
 *
 * This function is intentionally designed with NO delays or confirmations
 * to protect family members who may be in danger.
 */
export const activateSafeEscape = onCall(
  { cors: true },
  async (request: CallableRequest<unknown>) => {
    // Step 1: Verify authentication
    if (!request.auth?.uid) {
      throw new HttpsError('unauthenticated', 'Must be signed in')
    }

    const callerId = request.auth.uid

    // Step 2: Validate input
    const parseResult = activateSafeEscapeInputSchema.safeParse(request.data)
    if (!parseResult.success) {
      throw new HttpsError('invalid-argument', `Invalid input: ${parseResult.error.message}`)
    }

    const { familyId } = parseResult.data
    const db = getFirestore()

    // Step 3: Verify caller is family member (NOT just guardian - AC6)
    await verifyFamilyMember(db, familyId, callerId)

    // Step 4: Generate activation ID
    const activationRef = db
      .collection('families')
      .doc(familyId)
      .collection('safeEscapeActivations')
      .doc()
    const activationId = activationRef.id

    // Step 5: IMMEDIATELY disable location features (AC1)
    await disableLocationFeatures(db, familyId)

    // Step 6: Clear location history for this user (AC3)
    const clearedCount = await clearLocationHistory(db, familyId, callerId)

    // Step 7: Create activation record
    const now = new Date()
    const notificationScheduledAt = new Date(now.getTime() + SAFE_ESCAPE_SILENT_PERIOD_MS)

    const activation = {
      id: activationId,
      familyId,
      activatedBy: callerId,
      activatedAt: FieldValue.serverTimestamp(),
      notificationSentAt: null, // Will be set after 72 hours
      clearedLocationHistory: clearedCount > 0,
      reenabledAt: null,
      reenabledBy: null,
    }

    await activationRef.set(activation)

    // Step 8: Create sealed audit entry (privacy-protected)
    await createSealedAuditEntry(db, familyId, callerId, activationId)

    // NO notifications sent - 72-hour silent period (AC2)

    return {
      success: true,
      activationId,
      message: 'Safe Escape activated. Location features disabled.',
      notificationScheduledAt,
    }
  }
)
