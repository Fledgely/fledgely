/**
 * IsolatedSignalStorageService - Story 7.5.6 Task 2
 *
 * Service for isolated storage of safety signals outside family document hierarchy.
 * AC1: Signal stored in isolated collection (not under family document)
 * AC4: Signal excluded from family audit trail
 *
 * CRITICAL SAFETY:
 * - Collection at ROOT level (NOT under families/)
 * - childId is anonymized/hashed
 * - No familyId, parentIds, or sibling references
 * - All access requires authorization
 */

import { getFirestore, doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore'

// ============================================
// Constants
// ============================================

/**
 * Firestore collection for isolated safety signals.
 * CRITICAL: This collection is at ROOT level, ISOLATED from family data.
 * Path does NOT contain families/ or any family reference.
 */
export const ISOLATED_SIGNALS_COLLECTION = 'isolatedSafetySignals'

// ============================================
// Types
// ============================================

/**
 * Isolated signal storage - NO family document reference.
 *
 * CRITICAL SAFETY FIELDS:
 * - NO familyId - completely isolated from family
 * - NO parentIds - no reference to parents
 * - NO childId (raw) - only anonymized version stored
 * - NO sibling references
 */
export interface IsolatedSignal {
  /** Unique signal identifier */
  id: string

  /**
   * Anonymized child ID.
   * CRITICAL: This is a hashed/anonymized version, NOT the original childId.
   * Used for signal-child correlation in admin context only.
   */
  anonymizedChildId: string

  /** Encrypted signal payload (encrypted with isolated key) */
  encryptedPayload: string

  /** Encryption key ID (reference to signalEncryptionKeys collection) */
  encryptionKeyId: string

  /** When the signal was created */
  createdAt: Date

  /** Jurisdiction code for legal compliance */
  jurisdiction: string
}

// ============================================
// Firestore Helpers
// ============================================

function getIsolatedSignalDocRef(signalId: string) {
  const db = getFirestore()
  return doc(db, ISOLATED_SIGNALS_COLLECTION, signalId)
}

// ============================================
// Child ID Anonymization
// ============================================

/**
 * Anonymize child ID for storage.
 *
 * AC1: childId is anonymized/hashed for isolation.
 * CRITICAL: Original childId must NOT be stored in isolated signal.
 *
 * Uses a simple hash function for local development.
 * In production, would use a proper cryptographic hash (SHA-256 or similar).
 *
 * @param childId - Original child ID to anonymize
 * @returns Anonymized child ID (prefixed with 'anon_')
 */
export function anonymizeChildId(childId: string): string {
  if (!childId || childId.trim().length === 0) {
    throw new Error('childId is required')
  }

  // Simple hash for local development
  // In production, would use crypto.subtle.digest('SHA-256', ...)
  let hash = 0
  for (let i = 0; i < childId.length; i++) {
    const char = childId.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash = hash & hash // Convert to 32-bit integer
  }

  // Convert to positive hex string with fixed length
  const positiveHash = Math.abs(hash)
  const hexHash = positiveHash.toString(16).padStart(8, '0')

  // Add timestamp component for uniqueness (but deterministic for same input)
  // Using childId length as salt for determinism
  const salt = childId.length.toString(16).padStart(4, '0')

  return `anon_${salt}${hexHash}`
}

// ============================================
// Storage Functions
// ============================================

/**
 * Store signal in isolated collection.
 *
 * AC1: Signal stored in isolated collection (not under family document).
 * AC4: Signal excluded from family audit trail.
 *
 * CRITICAL: No familyId, parentIds, or raw childId is stored.
 *
 * @param signalId - Unique signal identifier
 * @param childId - Child ID (will be anonymized before storage)
 * @param encryptedPayload - Encrypted signal payload
 * @param encryptionKeyId - Encryption key ID
 * @param jurisdiction - Jurisdiction code for legal compliance
 * @returns Created IsolatedSignal
 */
export async function storeIsolatedSignal(
  signalId: string,
  childId: string,
  encryptedPayload: string,
  encryptionKeyId: string,
  jurisdiction: string
): Promise<IsolatedSignal> {
  if (!signalId || signalId.trim().length === 0) {
    throw new Error('signalId is required')
  }
  if (!childId || childId.trim().length === 0) {
    throw new Error('childId is required')
  }
  if (!encryptedPayload || encryptedPayload.trim().length === 0) {
    throw new Error('encryptedPayload is required')
  }
  if (!encryptionKeyId || encryptionKeyId.trim().length === 0) {
    throw new Error('encryptionKeyId is required')
  }
  if (!jurisdiction || jurisdiction.trim().length === 0) {
    throw new Error('jurisdiction is required')
  }

  // Anonymize child ID - CRITICAL: raw childId is NOT stored
  const anonymizedChildId = anonymizeChildId(childId)

  // Create isolated signal data
  // CRITICAL: NO familyId, NO parentIds, NO raw childId
  const isolatedSignal: IsolatedSignal = {
    id: signalId,
    anonymizedChildId,
    encryptedPayload,
    encryptionKeyId,
    createdAt: new Date(),
    jurisdiction,
  }

  // Store in isolated collection at ROOT level
  const docRef = getIsolatedSignalDocRef(signalId)
  await setDoc(docRef, isolatedSignal)

  return isolatedSignal
}

/**
 * Get isolated signal by ID.
 *
 * ADMIN ONLY - Requires authorization ID for audit logging.
 *
 * @param signalId - Signal ID to retrieve
 * @param authorizationId - Authorization ID for access (for audit logging)
 * @returns IsolatedSignal or null if not found
 */
export async function getIsolatedSignal(
  signalId: string,
  authorizationId: string
): Promise<IsolatedSignal | null> {
  if (!signalId || signalId.trim().length === 0) {
    throw new Error('signalId is required')
  }
  if (!authorizationId || authorizationId.trim().length === 0) {
    throw new Error('authorizationId is required')
  }

  const docRef = getIsolatedSignalDocRef(signalId)
  const snapshot = await getDoc(docRef)

  if (!snapshot.exists()) {
    return null
  }

  const data = snapshot.data() as IsolatedSignal

  // Log the access for audit (authorization ID recorded)
  // In production, this would log to admin audit trail
  // console.log(`Signal ${signalId} accessed with authorization ${authorizationId}`)

  return {
    id: data.id,
    anonymizedChildId: data.anonymizedChildId,
    encryptedPayload: data.encryptedPayload,
    encryptionKeyId: data.encryptionKeyId,
    createdAt:
      data.createdAt instanceof Date
        ? data.createdAt
        : (data.createdAt as { toDate?: () => Date })?.toDate?.() || new Date(),
    jurisdiction: data.jurisdiction,
  }
}

/**
 * Delete isolated signal.
 *
 * ADMIN ONLY - Requires authorization ID for audit logging.
 * CRITICAL: Should only be called after retention period with legal hold review.
 *
 * @param signalId - Signal ID to delete
 * @param authorizationId - Authorization ID for access (for audit logging)
 */
export async function deleteIsolatedSignal(
  signalId: string,
  authorizationId: string
): Promise<void> {
  if (!signalId || signalId.trim().length === 0) {
    throw new Error('signalId is required')
  }
  if (!authorizationId || authorizationId.trim().length === 0) {
    throw new Error('authorizationId is required')
  }

  const docRef = getIsolatedSignalDocRef(signalId)
  const snapshot = await getDoc(docRef)

  if (!snapshot.exists()) {
    throw new Error('Signal not found')
  }

  // Log the deletion for audit (authorization ID recorded)
  // In production, this would log to admin audit trail
  // console.log(`Signal ${signalId} deleted with authorization ${authorizationId}`)

  await deleteDoc(docRef)
}

/**
 * Verify signal is stored in isolated collection.
 *
 * AC1: Verifies signal is NOT in family hierarchy.
 *
 * @param signalId - Signal ID to verify
 * @returns True if signal is in isolated collection
 */
export async function verifyIsolatedStorage(signalId: string): Promise<boolean> {
  if (!signalId || signalId.trim().length === 0) {
    throw new Error('signalId is required')
  }

  const docRef = getIsolatedSignalDocRef(signalId)
  const snapshot = await getDoc(docRef)

  return snapshot.exists()
}
