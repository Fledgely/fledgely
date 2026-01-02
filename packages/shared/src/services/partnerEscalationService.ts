/**
 * PartnerEscalationService - Story 7.5.5 Task 4
 *
 * Service for tracking partner escalations.
 * AC3: Family notification suppression during investigation
 * AC6: Partner capability registration
 *
 * CRITICAL SAFETY:
 * - Escalation data stored in isolated collection
 * - Family members have NO access to escalation data
 * - Blackout extensions protect child during investigation
 */

import {
  getFirestore,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  collection,
  query,
  where,
} from 'firebase/firestore'
import {
  type SignalEscalation,
  type EscalationType,
  generateEscalationId,
} from '../contracts/crisisPartner'

// ============================================
// Constants
// ============================================

/**
 * Firestore collection for signal escalations.
 * CRITICAL: This collection is ISOLATED from family data.
 * Family members have NO access to this collection.
 */
export const ESCALATION_COLLECTION = 'signalEscalations'

/**
 * Collection for blackout records.
 */
const BLACKOUT_COLLECTION = 'signalBlackouts'

// ============================================
// Escalation Recording Functions
// ============================================

/**
 * Record a partner escalation for a signal.
 *
 * AC3: Creates escalation record for partner to track.
 * AC6: Associates escalation with partner capabilities.
 *
 * CRITICAL: Escalation data is stored in isolated collection.
 * Family members cannot access this data.
 *
 * @param signalId - Signal ID being escalated
 * @param partnerId - Partner ID handling the escalation
 * @param escalationType - Type of escalation (assessment, mandatory_report, law_enforcement_referral)
 * @param jurisdiction - Jurisdiction code for the escalation
 * @returns Created escalation record
 * @throws Error if required parameters are missing
 */
export async function recordEscalation(
  signalId: string,
  partnerId: string,
  escalationType: EscalationType,
  jurisdiction: string
): Promise<SignalEscalation> {
  if (!signalId || signalId.trim().length === 0) {
    throw new Error('signalId is required')
  }
  if (!partnerId || partnerId.trim().length === 0) {
    throw new Error('partnerId is required')
  }
  if (!jurisdiction || jurisdiction.trim().length === 0) {
    throw new Error('jurisdiction is required')
  }

  const escalationId = generateEscalationId()

  const escalation: SignalEscalation = {
    id: escalationId,
    signalId,
    partnerId,
    escalationType,
    escalatedAt: new Date(),
    jurisdiction,
    sealed: false,
    sealedAt: null,
  }

  const db = getFirestore()
  const escalationRef = doc(db, ESCALATION_COLLECTION, escalationId)
  await setDoc(escalationRef, escalation)

  return escalation
}

// ============================================
// Blackout Extension Functions
// ============================================

/**
 * Extend the blackout period for a signal.
 *
 * AC3: Extends family notification blackout during investigation.
 * Protects child from retaliation while partner investigates.
 *
 * @param signalId - Signal ID to extend blackout for
 * @param extensionHours - Number of hours to extend by
 * @param partnerId - Optional partner ID requesting the extension
 * @throws Error if no blackout found or invalid parameters
 */
export async function extendBlackoutPeriod(
  signalId: string,
  extensionHours: number,
  partnerId?: string
): Promise<void> {
  if (!signalId || signalId.trim().length === 0) {
    throw new Error('signalId is required')
  }
  if (extensionHours <= 0) {
    throw new Error('Extension hours must be positive')
  }

  const db = getFirestore()
  const blackoutCol = collection(db, BLACKOUT_COLLECTION)
  const q = query(blackoutCol, where('signalId', '==', signalId), where('active', '==', true))

  const snapshot = await getDocs(q)

  if (snapshot.empty) {
    throw new Error('No blackout found')
  }

  // Get the first active blackout
  const blackoutDoc = snapshot.docs[0]
  const blackoutData = blackoutDoc.data()

  // Calculate new expiry time
  const currentExpiry =
    blackoutData.expiresAt instanceof Date
      ? blackoutData.expiresAt
      : blackoutData.expiresAt?.toDate?.() || new Date()

  const newExpiry = new Date(currentExpiry.getTime() + extensionHours * 60 * 60 * 1000)

  // Update the blackout - use partnerId if provided, otherwise use extension description
  await updateDoc(blackoutDoc.ref, {
    expiresAt: newExpiry,
    extendedBy: partnerId || `+${extensionHours}h`,
    extendedAt: new Date(),
  })
}

// ============================================
// Escalation Status Functions
// ============================================

/**
 * Get escalation status for a signal.
 *
 * ADMIN ONLY - Never accessible to family members.
 *
 * @param signalId - Signal ID to check
 * @returns Escalation record or null if not escalated
 * @throws Error if signalId is empty
 */
export async function getEscalationStatus(signalId: string): Promise<SignalEscalation | null> {
  if (!signalId || signalId.trim().length === 0) {
    throw new Error('signalId is required')
  }

  const db = getFirestore()
  const escalationCol = collection(db, ESCALATION_COLLECTION)
  const q = query(escalationCol, where('signalId', '==', signalId))

  const snapshot = await getDocs(q)

  if (snapshot.empty) {
    return null
  }

  // Return the first escalation found
  const escalationData = snapshot.docs[0].data() as SignalEscalation

  // Convert Firestore Timestamp to Date if needed
  return {
    ...escalationData,
    escalatedAt:
      escalationData.escalatedAt instanceof Date
        ? escalationData.escalatedAt
        : (escalationData.escalatedAt as { toDate?: () => Date })?.toDate?.() || new Date(),
    sealedAt:
      escalationData.sealedAt instanceof Date
        ? escalationData.sealedAt
        : (escalationData.sealedAt as { toDate?: () => Date } | null)?.toDate?.() || null,
  }
}

// ============================================
// Escalation Sealing Functions
// ============================================

/**
 * Seal an escalation record.
 *
 * AC4: Sealing makes escalation data immutable.
 * Used when escalation is complete or legal hold is applied.
 *
 * @param escalationId - Escalation ID to seal
 * @throws Error if escalation not found or already sealed
 */
export async function sealEscalation(escalationId: string): Promise<void> {
  if (!escalationId || escalationId.trim().length === 0) {
    throw new Error('escalationId is required')
  }

  const db = getFirestore()
  const escalationRef = doc(db, ESCALATION_COLLECTION, escalationId)
  const escalationSnap = await getDoc(escalationRef)

  if (!escalationSnap.exists()) {
    throw new Error('Escalation not found')
  }

  const escalationData = escalationSnap.data()

  if (escalationData.sealed) {
    throw new Error('Escalation already sealed')
  }

  await updateDoc(escalationRef, {
    sealed: true,
    sealedAt: new Date(),
  })
}
