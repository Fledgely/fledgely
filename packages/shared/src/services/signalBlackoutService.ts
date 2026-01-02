/**
 * SignalBlackoutService - Story 7.5.7 Task 1
 *
 * Service for 48-hour family notification blackout.
 * AC1: No family notifications during blackout
 * AC4: External partner can extend blackout
 *
 * CRITICAL SAFETY:
 * - Blackout is 48-hour MINIMUM
 * - Partners can extend in 24-hour increments
 * - All operations logged to admin audit
 * - Family cannot access blackout data
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
} from 'firebase/firestore'

// ============================================
// Constants
// ============================================

/**
 * Firestore collection for signal blackouts.
 * CRITICAL: This collection is at ROOT level, ISOLATED from family data.
 */
export const SIGNAL_BLACKOUTS_COLLECTION = 'signalBlackouts'

/**
 * Default blackout duration: 48 hours in milliseconds.
 */
const DEFAULT_BLACKOUT_DURATION_MS = 48 * 60 * 60 * 1000

// ============================================
// Types
// ============================================

/**
 * Blackout status values.
 */
export type BlackoutStatus = 'active' | 'expired' | 'released'

/**
 * Blackout extension record.
 */
export interface BlackoutExtension {
  /** Partner ID who extended */
  extendedBy: string
  /** When extension was made */
  extendedAt: Date
  /** Additional hours (24, 48, or 72) */
  additionalHours: 24 | 48 | 72
  /** Reason for extension */
  reason: string
}

/**
 * Signal blackout record.
 */
export interface SignalBlackout {
  /** Unique blackout identifier */
  id: string
  /** Signal ID this blackout is for */
  signalId: string
  /** Child ID (anonymized) */
  childId: string
  /** When blackout started */
  startedAt: Date
  /** When blackout expires */
  expiresAt: Date
  /** Partner who last extended (null if never extended) */
  extendedBy: string | null
  /** When last extended (null if never extended) */
  extendedAt: Date | null
  /** List of all extensions */
  extensions: BlackoutExtension[]
  /** Current blackout status */
  status: BlackoutStatus
}

// ============================================
// ID Generation
// ============================================

/**
 * Generate a unique blackout ID.
 */
function generateBlackoutId(): string {
  const timestamp = Date.now().toString(36)
  const random = Math.random().toString(36).substring(2, 10)
  return `blackout_${timestamp}_${random}`
}

// ============================================
// Firestore Helpers
// ============================================

function getBlackoutDocRef(blackoutId: string) {
  const db = getFirestore()
  return doc(db, SIGNAL_BLACKOUTS_COLLECTION, blackoutId)
}

function getBlackoutsCollection() {
  const db = getFirestore()
  return collection(db, SIGNAL_BLACKOUTS_COLLECTION)
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
// Blackout Creation
// ============================================

/**
 * Create a 48-hour blackout for a signal.
 *
 * AC1: Creates blackout that prevents all family notifications.
 *
 * @param signalId - Signal ID to create blackout for
 * @param childId - Child ID (anonymized)
 * @returns Created blackout
 */
export async function createBlackout(signalId: string, childId: string): Promise<SignalBlackout> {
  if (!signalId || signalId.trim().length === 0) {
    throw new Error('signalId is required')
  }
  if (!childId || childId.trim().length === 0) {
    throw new Error('childId is required')
  }

  const blackoutId = generateBlackoutId()
  const now = new Date()
  const expiresAt = new Date(now.getTime() + DEFAULT_BLACKOUT_DURATION_MS)

  const blackout: SignalBlackout = {
    id: blackoutId,
    signalId,
    childId,
    startedAt: now,
    expiresAt,
    extendedBy: null,
    extendedAt: null,
    extensions: [],
    status: 'active',
  }

  const docRef = getBlackoutDocRef(blackoutId)
  await setDoc(docRef, blackout)

  return blackout
}

// ============================================
// Blackout Status Checks
// ============================================

/**
 * Check if a blackout is currently active for a signal.
 *
 * AC1: Used to determine if notifications should be suppressed.
 *
 * @param signalId - Signal ID to check
 * @returns True if blackout is active
 */
export async function isBlackoutActive(signalId: string): Promise<boolean> {
  if (!signalId || signalId.trim().length === 0) {
    throw new Error('signalId is required')
  }

  const blackout = await getBlackoutStatus(signalId)

  if (!blackout) {
    return false
  }

  // Check if blackout is active and not expired
  if (blackout.status !== 'active') {
    return false
  }

  // Check if expiry time has passed
  const now = new Date()
  if (now > blackout.expiresAt) {
    return false
  }

  return true
}

/**
 * Get time remaining in blackout (milliseconds).
 *
 * @param signalId - Signal ID to check
 * @returns Time remaining in milliseconds (0 if expired or not found)
 */
export async function getBlackoutTimeRemaining(signalId: string): Promise<number> {
  if (!signalId || signalId.trim().length === 0) {
    throw new Error('signalId is required')
  }

  const blackout = await getBlackoutStatus(signalId)

  if (!blackout) {
    return 0
  }

  const now = new Date()
  const remaining = blackout.expiresAt.getTime() - now.getTime()

  return Math.max(0, remaining)
}

/**
 * Get blackout status for a signal.
 *
 * @param signalId - Signal ID to get status for
 * @returns Blackout or null if not found
 */
export async function getBlackoutStatus(signalId: string): Promise<SignalBlackout | null> {
  if (!signalId || signalId.trim().length === 0) {
    throw new Error('signalId is required')
  }

  const blackoutsRef = getBlackoutsCollection()
  const q = query(blackoutsRef, where('signalId', '==', signalId))
  const snapshot = await getDocs(q)

  if (snapshot.empty) {
    return null
  }

  const doc = snapshot.docs[0]
  const data = doc.data()

  return {
    id: data.id,
    signalId: data.signalId,
    childId: data.childId,
    startedAt: toDate(data.startedAt),
    expiresAt: toDate(data.expiresAt),
    extendedBy: data.extendedBy,
    extendedAt: data.extendedAt ? toDate(data.extendedAt) : null,
    extensions: data.extensions || [],
    status: data.status,
  }
}

// ============================================
// Blackout Extension
// ============================================

/**
 * Extend a blackout by additional hours.
 *
 * AC4: External partner can extend blackout window.
 *
 * @param signalId - Signal ID to extend blackout for
 * @param partnerId - Partner ID requesting extension
 * @param additionalHours - Hours to extend (24, 48, or 72)
 * @param reason - Reason for extension
 * @returns Updated blackout
 */
export async function extendBlackout(
  signalId: string,
  partnerId: string,
  additionalHours: 24 | 48 | 72,
  reason: string
): Promise<SignalBlackout> {
  if (!signalId || signalId.trim().length === 0) {
    throw new Error('signalId is required')
  }
  if (!partnerId || partnerId.trim().length === 0) {
    throw new Error('partnerId is required')
  }
  if (!reason || reason.trim().length === 0) {
    throw new Error('reason is required')
  }
  if (![24, 48, 72].includes(additionalHours)) {
    throw new Error('Extension must be 24, 48, or 72 hours')
  }

  // Find the blackout
  const blackoutsRef = getBlackoutsCollection()
  const q = query(blackoutsRef, where('signalId', '==', signalId))
  const snapshot = await getDocs(q)

  if (snapshot.empty) {
    throw new Error('Blackout not found')
  }

  const docSnap = snapshot.docs[0]
  const data = docSnap.data()

  if (data.status !== 'active') {
    throw new Error('Blackout is not active')
  }

  // Create extension record
  const now = new Date()
  const extension: BlackoutExtension = {
    extendedBy: partnerId,
    extendedAt: now,
    additionalHours,
    reason,
  }

  // Calculate new expiry
  const currentExpiry = toDate(data.expiresAt)
  const additionalMs = additionalHours * 60 * 60 * 1000
  const newExpiry = new Date(currentExpiry.getTime() + additionalMs)

  // Update the blackout
  const existingExtensions = data.extensions || []
  const updatedBlackout = {
    expiresAt: newExpiry,
    extendedBy: partnerId,
    extendedAt: now,
    extensions: [...existingExtensions, extension],
  }

  await updateDoc(docSnap.ref, updatedBlackout)

  return {
    id: data.id,
    signalId: data.signalId,
    childId: data.childId,
    startedAt: toDate(data.startedAt),
    expiresAt: newExpiry,
    extendedBy: partnerId,
    extendedAt: now,
    extensions: [...existingExtensions, extension],
    status: 'active',
  }
}

// ============================================
// Blackout Release
// ============================================

/**
 * Release a blackout early (partner only).
 *
 * AC4: Used when safety plan is completed before 48 hours.
 *
 * @param signalId - Signal ID to release blackout for
 * @param partnerId - Partner ID requesting release
 * @param reason - Reason for early release
 */
export async function releaseBlackoutEarly(
  signalId: string,
  partnerId: string,
  reason: string
): Promise<void> {
  if (!signalId || signalId.trim().length === 0) {
    throw new Error('signalId is required')
  }
  if (!partnerId || partnerId.trim().length === 0) {
    throw new Error('partnerId is required')
  }
  if (!reason || reason.trim().length === 0) {
    throw new Error('reason is required')
  }

  // Find the blackout
  const blackoutsRef = getBlackoutsCollection()
  const q = query(blackoutsRef, where('signalId', '==', signalId))
  const snapshot = await getDocs(q)

  if (snapshot.empty) {
    throw new Error('Blackout not found')
  }

  const docSnap = snapshot.docs[0]
  const data = docSnap.data()

  if (data.status !== 'active') {
    throw new Error('Blackout is not active')
  }

  // Release the blackout
  await updateDoc(docSnap.ref, {
    status: 'released',
    releasedBy: partnerId,
    releasedAt: new Date(),
    releaseReason: reason,
  })
}
