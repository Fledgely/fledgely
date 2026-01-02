/**
 * PrivacyGapService - Story 7.5.7 Task 4
 *
 * Service for applying privacy gaps after blackout ends.
 * AC5: Privacy gaps applied after blackout
 *
 * CRITICAL SAFETY:
 * - Privacy gaps applied automatically when blackout expires
 * - Signal period data is masked/anonymized
 * - Family sees "normal activity" during gapped period
 * - No evidence of safety signal remains visible to family
 */

import {
  getFirestore,
  doc,
  setDoc,
  updateDoc,
  query,
  where,
  getDocs,
  collection,
  addDoc,
} from 'firebase/firestore'

// ============================================
// Constants
// ============================================

/**
 * Firestore collection for signal privacy gaps.
 * CRITICAL: This collection is at ROOT level, ISOLATED from family data.
 */
export const SIGNAL_PRIVACY_GAPS_COLLECTION = 'signalPrivacyGaps'

/**
 * Firestore collection for masked data periods.
 * CRITICAL: This collection is at ROOT level, ISOLATED from family data.
 */
export const MASKED_DATA_COLLECTION = 'maskedData'

// ============================================
// Types
// ============================================

/**
 * Reason for masking data.
 */
export type MaskReason = 'signal_blackout' | 'privacy_request' | 'legal_hold'

/**
 * Signal privacy gap record.
 */
export interface SignalPrivacyGap {
  /** Unique gap identifier */
  id: string
  /** Signal ID */
  signalId: string
  /** Child ID */
  childId: string
  /** When gap period starts */
  startTime: Date
  /** When gap period ends */
  endTime: Date
  /** Whether gap has been applied */
  applied: boolean
  /** When gap was applied */
  appliedAt: Date | null
}

/**
 * Masked data record.
 */
export interface MaskedDataRecord {
  /** Unique record identifier */
  id: string
  /** Child ID */
  childId: string
  /** When masking starts */
  startTime: Date
  /** When masking ends */
  endTime: Date
  /** Reason for masking */
  reason: MaskReason
  /** When record was created */
  createdAt: Date
}

// ============================================
// ID Generation
// ============================================

/**
 * Generate a unique privacy gap ID.
 */
function generateGapId(): string {
  const timestamp = Date.now().toString(36)
  const random = Math.random().toString(36).substring(2, 10)
  return `pgap_${timestamp}_${random}`
}

// ============================================
// Firestore Helpers
// ============================================

function getGapDocRef(gapId: string) {
  const db = getFirestore()
  return doc(db, SIGNAL_PRIVACY_GAPS_COLLECTION, gapId)
}

function getPrivacyGapsCollection() {
  const db = getFirestore()
  return collection(db, SIGNAL_PRIVACY_GAPS_COLLECTION)
}

function getMaskedDataCollection() {
  const db = getFirestore()
  return collection(db, MASKED_DATA_COLLECTION)
}

/**
 * Convert Firestore timestamp to Date if needed.
 */
function toDate(value: unknown): Date {
  if (value instanceof Date) {
    return value
  }
  if (value && typeof value === 'object' && 'toDate' in value) {
    return (value as { toDate: () => Date }).toDate()
  }
  return new Date()
}

// ============================================
// Privacy Gap Creation
// ============================================

/**
 * Create a signal privacy gap record.
 *
 * @param signalId - Signal ID
 * @param childId - Child ID
 * @param startTime - When gap period starts
 * @param endTime - When gap period ends
 * @returns Created privacy gap
 */
export async function createSignalPrivacyGap(
  signalId: string,
  childId: string,
  startTime: Date,
  endTime: Date
): Promise<SignalPrivacyGap> {
  if (!signalId || signalId.trim().length === 0) {
    throw new Error('signalId is required')
  }
  if (!childId || childId.trim().length === 0) {
    throw new Error('childId is required')
  }
  if (!startTime) {
    throw new Error('startTime is required')
  }
  if (!endTime) {
    throw new Error('endTime is required')
  }

  const gapId = generateGapId()

  const gap: SignalPrivacyGap = {
    id: gapId,
    signalId,
    childId,
    startTime,
    endTime,
    applied: false,
    appliedAt: null,
  }

  const docRef = getGapDocRef(gapId)
  await setDoc(docRef, gap)

  return gap
}

// ============================================
// Privacy Gap Application
// ============================================

/**
 * Apply privacy gap after blackout ends.
 *
 * AC5: Privacy gaps applied automatically when blackout expires.
 *
 * @param signalId - Signal ID to apply privacy gap for
 */
export async function applyPostBlackoutPrivacyGap(signalId: string): Promise<void> {
  if (!signalId || signalId.trim().length === 0) {
    throw new Error('signalId is required')
  }

  // Find the privacy gap for this signal
  const gapsRef = getPrivacyGapsCollection()
  const q = query(gapsRef, where('signalId', '==', signalId))
  const snapshot = await getDocs(q)

  if (snapshot.empty) {
    throw new Error('Privacy gap not found')
  }

  const docSnap = snapshot.docs[0]
  const data = docSnap.data()

  // Check if already applied
  if (data.applied) {
    return // Already applied, nothing to do
  }

  // Mask the signal period data
  await maskSignalPeriodData(data.childId, toDate(data.startTime), toDate(data.endTime))

  // Mark gap as applied
  await updateDoc(docSnap.ref, {
    applied: true,
    appliedAt: new Date(),
  })
}

// ============================================
// Data Masking
// ============================================

/**
 * Mask monitoring data during signal period.
 *
 * AC5: Signal period data is masked/anonymized.
 *
 * @param childId - Child ID
 * @param startTime - When masking starts
 * @param endTime - When masking ends
 */
export async function maskSignalPeriodData(
  childId: string,
  startTime: Date,
  endTime: Date
): Promise<void> {
  if (!childId || childId.trim().length === 0) {
    throw new Error('childId is required')
  }
  if (!startTime) {
    throw new Error('startTime is required')
  }
  if (!endTime) {
    throw new Error('endTime is required')
  }

  const maskedDataRef = getMaskedDataCollection()

  const maskedRecord: Omit<MaskedDataRecord, 'id'> = {
    id: '', // Will be set by Firestore
    childId,
    startTime,
    endTime,
    reason: 'signal_blackout',
    createdAt: new Date(),
  }

  await addDoc(maskedDataRef, maskedRecord)
}

// ============================================
// Privacy Gap Checks
// ============================================

/**
 * Check if a timestamp falls within a privacy-gapped period.
 *
 * AC5: Used to determine if data should be masked for family view.
 *
 * @param childId - Child ID
 * @param timestamp - Timestamp to check
 * @returns True if timestamp is within a privacy-gapped period
 */
export async function isPrivacyGapped(childId: string, timestamp: Date): Promise<boolean> {
  if (!childId || childId.trim().length === 0) {
    throw new Error('childId is required')
  }
  if (!timestamp) {
    throw new Error('timestamp is required')
  }

  const maskedDataRef = getMaskedDataCollection()
  const q = query(maskedDataRef, where('childId', '==', childId))
  const snapshot = await getDocs(q)

  if (snapshot.empty) {
    return false
  }

  const timestampMs = timestamp.getTime()

  for (const docSnap of snapshot.docs) {
    const data = docSnap.data()
    const startTime = toDate(data.startTime)
    const endTime = toDate(data.endTime)

    if (timestampMs >= startTime.getTime() && timestampMs <= endTime.getTime()) {
      return true
    }
  }

  return false
}

// ============================================
// Privacy Gap Status
// ============================================

/**
 * Get privacy gap status for a signal.
 *
 * @param signalId - Signal ID to get status for
 * @returns Privacy gap or null if not found
 */
export async function getSignalPrivacyGapStatus(
  signalId: string
): Promise<SignalPrivacyGap | null> {
  if (!signalId || signalId.trim().length === 0) {
    throw new Error('signalId is required')
  }

  const gapsRef = getPrivacyGapsCollection()
  const q = query(gapsRef, where('signalId', '==', signalId))
  const snapshot = await getDocs(q)

  if (snapshot.empty) {
    return null
  }

  const data = snapshot.docs[0].data()

  return {
    id: data.id,
    signalId: data.signalId,
    childId: data.childId,
    startTime: toDate(data.startTime),
    endTime: toDate(data.endTime),
    applied: data.applied,
    appliedAt: data.appliedAt ? toDate(data.appliedAt) : null,
  }
}
