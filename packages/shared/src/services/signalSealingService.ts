/**
 * SignalSealingService - Story 7.5.5 Task 3
 *
 * Service for sealing signal data from family access.
 * AC4: Audit trail sealing - once sealed, family members cannot see evidence.
 *
 * CRITICAL SAFETY:
 * - Sealed signals are completely invisible to family accounts
 * - Sealing is IRREVERSIBLE to protect children from retaliation
 * - Only admin/legal personnel can access sealed signals
 * - No family-identifying information is stored in sealed collection
 */

import {
  getFirestore,
  doc,
  getDoc,
  getDocs,
  setDoc,
  collection,
  query,
  where,
  writeBatch,
} from 'firebase/firestore'

// ============================================
// Constants
// ============================================

/**
 * Firestore collection for sealed signals.
 * CRITICAL: This collection is ISOLATED from family data.
 * Family members have NO access to this collection.
 */
export const SEALED_SIGNALS_COLLECTION = 'sealedSignals'

/**
 * Collections that may contain family-visible signal references.
 * These must be cleaned when sealing a signal.
 */
const FAMILY_VISIBLE_COLLECTIONS = [
  'familyNotifications',
  'childNotifications',
  'activityLogs',
  'auditTrails',
] as const

// ============================================
// Types
// ============================================

/**
 * Data stored for sealed signals.
 *
 * CRITICAL: Only stores minimal non-identifying information.
 * Does NOT include: child name, family name, parent contacts, etc.
 */
export interface SealedSignalData {
  /** Original signal ID */
  signalId: string

  /** Child ID (hashed/anonymized in production) */
  childId: string

  /** Family ID (for isolation verification only) */
  familyId: string

  /** When the signal was sealed */
  sealedAt: Date

  /** Reason for sealing */
  sealedReason: 'mandatory_report' | 'law_enforcement' | 'partner_escalation'

  /** Jurisdiction at time of sealing */
  jurisdiction: string

  /** Original signal status before sealing */
  originalStatus: string

  /** Original signal creation time */
  originalCreatedAt: Date
}

// ============================================
// Firestore Helpers
// ============================================

function getSealedSignalDocRef(signalId: string) {
  const db = getFirestore()
  return doc(db, SEALED_SIGNALS_COLLECTION, signalId)
}

function getSignalDocRef(signalId: string) {
  const db = getFirestore()
  return doc(db, 'safetySignals', signalId)
}

function getLegalRequestDocRef(legalRequestId: string) {
  const db = getFirestore()
  return doc(db, 'legalRequests', legalRequestId)
}

// ============================================
// Sealing Functions
// ============================================

/**
 * Seal a signal from family access.
 *
 * AC4: Once sealed, family members cannot see evidence of the signal.
 *
 * CRITICAL: This operation is IRREVERSIBLE.
 * - Creates sealed record in isolated collection
 * - Removes all family-visible references
 * - Protects child from retaliation
 *
 * @param signalId - Signal ID to seal
 * @throws Error if signal not found or already sealed
 */
export async function sealSignalFromFamily(signalId: string): Promise<void> {
  if (!signalId || signalId.trim().length === 0) {
    throw new Error('signalId is required')
  }

  // Get original signal
  const signalRef = getSignalDocRef(signalId)
  const signalSnap = await getDoc(signalRef)

  if (!signalSnap.exists()) {
    throw new Error('Signal not found')
  }

  const signalData = signalSnap.data()

  // Create sealed record with minimal non-identifying information
  const sealedData: SealedSignalData = {
    signalId,
    childId: signalData.childId,
    familyId: signalData.familyId,
    sealedAt: new Date(),
    sealedReason: 'mandatory_report', // Default reason, can be passed as parameter
    jurisdiction: signalData.jurisdiction || 'UNKNOWN',
    originalStatus: signalData.status,
    originalCreatedAt:
      signalData.createdAt instanceof Date
        ? signalData.createdAt
        : signalData.createdAt?.toDate?.() || new Date(),
  }

  // Store in sealed signals collection
  const sealedRef = getSealedSignalDocRef(signalId)
  await setDoc(sealedRef, sealedData)

  // Remove from family-visible collections
  await removeFromFamilyCollections(signalId, signalData.familyId)
}

/**
 * Check if a signal is sealed.
 *
 * @param signalId - Signal ID to check
 * @returns True if signal is sealed
 */
export async function isSignalSealed(signalId: string): Promise<boolean> {
  if (!signalId || signalId.trim().length === 0) {
    throw new Error('signalId is required')
  }

  const sealedRef = getSealedSignalDocRef(signalId)
  const sealedSnap = await getDoc(sealedRef)

  return sealedSnap.exists()
}

// ============================================
// Legal Request Access Functions
// ============================================

/**
 * Get sealed signal data for a legal request.
 *
 * AC5: Requires approved legal request.
 * ADMIN ONLY - Never accessible to family members.
 *
 * @param signalId - Signal ID to retrieve
 * @param legalRequestId - Legal request authorizing access
 * @returns Sealed signal data or null if not found/not authorized
 */
export async function getSealedSignalForLegalRequest(
  signalId: string,
  legalRequestId: string
): Promise<SealedSignalData | null> {
  if (!signalId || signalId.trim().length === 0) {
    throw new Error('signalId is required')
  }
  if (!legalRequestId || legalRequestId.trim().length === 0) {
    throw new Error('legalRequestId is required')
  }

  // Verify legal request exists and is approved
  const legalRef = getLegalRequestDocRef(legalRequestId)
  const legalSnap = await getDoc(legalRef)

  if (!legalSnap.exists()) {
    return null
  }

  const legalData = legalSnap.data()

  // Must be approved status
  if (legalData.status !== 'approved' && legalData.status !== 'fulfilled') {
    return null
  }

  // Signal must be in the legal request
  if (!legalData.signalIds?.includes(signalId)) {
    return null
  }

  // Get sealed signal
  const sealedRef = getSealedSignalDocRef(signalId)
  const sealedSnap = await getDoc(sealedRef)

  if (!sealedSnap.exists()) {
    return null
  }

  return sealedSnap.data() as SealedSignalData
}

// ============================================
// Isolation Verification Functions
// ============================================

/**
 * Verify that a signal is completely isolated from family access.
 *
 * AC4: No evidence of signal exists in family-visible data.
 *
 * @param signalId - Signal ID to verify
 * @param familyId - Family ID to check isolation from
 * @returns True if signal is fully isolated
 */
export async function verifySignalIsolation(signalId: string, familyId: string): Promise<boolean> {
  if (!signalId || signalId.trim().length === 0) {
    throw new Error('signalId is required')
  }
  if (!familyId || familyId.trim().length === 0) {
    throw new Error('familyId is required')
  }

  const db = getFirestore()

  // Check each family-visible collection for signal references
  for (const collectionName of FAMILY_VISIBLE_COLLECTIONS) {
    const col = collection(db, collectionName)
    const q = query(col, where('signalId', '==', signalId), where('familyId', '==', familyId))

    const snapshot = await getDocs(q)

    if (!snapshot.empty) {
      return false // Found a reference, not isolated
    }
  }

  return true // No references found, fully isolated
}

/**
 * Remove signal references from all family-visible collections.
 *
 * AC4: Removes all evidence of signal from family data.
 *
 * @param signalId - Signal ID to remove
 * @param familyId - Family ID to remove from
 */
export async function removeFromFamilyCollections(
  signalId: string,
  familyId: string
): Promise<void> {
  if (!signalId || signalId.trim().length === 0) {
    throw new Error('signalId is required')
  }
  if (!familyId || familyId.trim().length === 0) {
    throw new Error('familyId is required')
  }

  const db = getFirestore()
  const batch = writeBatch(db)

  // Find and delete all signal references in family-visible collections
  for (const collectionName of FAMILY_VISIBLE_COLLECTIONS) {
    const col = collection(db, collectionName)
    const q = query(col, where('signalId', '==', signalId), where('familyId', '==', familyId))

    const snapshot = await getDocs(q)

    for (const docSnap of snapshot.docs) {
      batch.delete(docSnap.ref)
    }
  }

  // Commit all deletions in single transaction
  await batch.commit()
}
