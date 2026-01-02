/**
 * SafeAdultService - Story 7.5.4 Task 2
 *
 * Service for managing safe adult designations.
 * AC1: Safe adult notification option
 * AC3: Pre-configured safe adult
 * AC4: Safe adult data isolation
 *
 * CRITICAL SAFETY:
 * - Safe adult data stored in ISOLATED collection (not under family)
 * - Separate encryption key from family key
 * - No parent-accessible references to safe adult data
 */

import {
  getFirestore,
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  where,
  query,
} from 'firebase/firestore'
import {
  type SafeAdultDesignation,
  createPreConfiguredSafeAdult,
  createSignalTimeSafeAdult,
  validateContactInput,
  type ContactValidationResult,
} from '../contracts/safeAdult'

// ============================================
// Constants
// ============================================

/**
 * Firestore collection for safe adult designations.
 * CRITICAL: This collection is ISOLATED from family data.
 */
const SAFE_ADULT_COLLECTION = 'safeAdults'

// ============================================
// Firestore Helpers
// ============================================

function getSafeAdultCollection() {
  const db = getFirestore()
  return collection(db, SAFE_ADULT_COLLECTION)
}

function getSafeAdultDocRef(id: string) {
  const db = getFirestore()
  return doc(db, SAFE_ADULT_COLLECTION, id)
}

/**
 * Convert Firestore timestamps to Dates in designation.
 */
function convertTimestamps(data: Record<string, unknown>): SafeAdultDesignation {
  return {
    ...data,
    createdAt:
      data.createdAt instanceof Date
        ? data.createdAt
        : (data.createdAt as { toDate: () => Date })?.toDate?.() || new Date(),
    updatedAt:
      data.updatedAt instanceof Date
        ? data.updatedAt
        : (data.updatedAt as { toDate: () => Date })?.toDate?.() || new Date(),
  } as SafeAdultDesignation
}

// ============================================
// Pre-Configured Safe Adult Functions
// ============================================

/**
 * Set or replace pre-configured safe adult for a child.
 *
 * AC3: Pre-configured safe adult before any crisis.
 *
 * @param childId - The child's ID
 * @param contact - Contact information (phone and/or email)
 * @param displayName - Display name for child's reference
 * @returns Created designation
 * @throws Error if validation fails
 */
export async function setPreConfiguredSafeAdult(
  childId: string,
  contact: { phone?: string; email?: string },
  displayName: string
): Promise<SafeAdultDesignation> {
  // Validate inputs
  if (!childId || childId.trim().length === 0) {
    throw new Error('childId is required')
  }
  if (!displayName || displayName.trim().length === 0) {
    throw new Error('displayName is required')
  }

  const validation = validateContactInput(contact)
  if (!validation.valid) {
    throw new Error('At least one contact method (phone or email) is required')
  }

  // Create designation
  const designation = createPreConfiguredSafeAdult(childId, contact, displayName)

  // Store in Firestore
  const docRef = getSafeAdultDocRef(designation.id)
  await setDoc(docRef, {
    ...designation,
    createdAt: designation.createdAt,
    updatedAt: designation.updatedAt,
  })

  return designation
}

/**
 * Get pre-configured safe adult for a child.
 *
 * @param childId - The child's ID
 * @returns Pre-configured designation or null
 */
export async function getPreConfiguredSafeAdult(
  childId: string
): Promise<SafeAdultDesignation | null> {
  if (!childId || childId.trim().length === 0) {
    throw new Error('childId is required')
  }

  const col = getSafeAdultCollection()
  const q = query(col, where('childId', '==', childId), where('isPreConfigured', '==', true))

  const snapshot = await getDocs(q)

  if (snapshot.empty) {
    return null
  }

  const docData = snapshot.docs[0].data()
  return convertTimestamps(docData)
}

/**
 * Update pre-configured safe adult.
 *
 * @param childId - The child's ID
 * @param updates - Fields to update
 * @returns Updated designation
 * @throws Error if no pre-configured adult exists
 */
export async function updatePreConfiguredSafeAdult(
  childId: string,
  updates: Partial<
    Pick<SafeAdultDesignation, 'phoneNumber' | 'email' | 'displayName' | 'preferredMethod'>
  >
): Promise<SafeAdultDesignation> {
  if (!childId || childId.trim().length === 0) {
    throw new Error('childId is required')
  }

  const existing = await getPreConfiguredSafeAdult(childId)
  if (!existing) {
    throw new Error('No pre-configured safe adult exists')
  }

  const now = new Date()
  const updatedData = {
    ...existing,
    ...updates,
    updatedAt: now,
  }

  const docRef = getSafeAdultDocRef(existing.id)
  await updateDoc(docRef, {
    ...updates,
    updatedAt: now,
  })

  return updatedData
}

/**
 * Remove pre-configured safe adult.
 *
 * @param childId - The child's ID
 */
export async function removePreConfiguredSafeAdult(childId: string): Promise<void> {
  if (!childId || childId.trim().length === 0) {
    throw new Error('childId is required')
  }

  const existing = await getPreConfiguredSafeAdult(childId)
  if (!existing) {
    return // No-op if doesn't exist
  }

  const docRef = getSafeAdultDocRef(existing.id)
  await deleteDoc(docRef)
}

// ============================================
// Signal-Time Safe Adult Functions
// ============================================

/**
 * Designate safe adult during signal processing.
 *
 * AC1: Designate during signal, one-time use.
 *
 * @param signalId - The safety signal ID
 * @param childId - The child's ID
 * @param contact - Contact information
 * @returns Created designation
 */
export async function designateSafeAdultForSignal(
  signalId: string,
  childId: string,
  contact: { phone?: string; email?: string }
): Promise<SafeAdultDesignation> {
  // Validate inputs
  if (!signalId || signalId.trim().length === 0) {
    throw new Error('signalId is required')
  }
  if (!childId || childId.trim().length === 0) {
    throw new Error('childId is required')
  }

  const validation = validateContactInput(contact)
  if (!validation.valid) {
    throw new Error('At least one contact method (phone or email) is required')
  }

  // Create signal-time designation
  const designation = createSignalTimeSafeAdult(childId, contact)

  // Store in Firestore with signal reference
  const docRef = getSafeAdultDocRef(designation.id)
  await setDoc(docRef, {
    ...designation,
    signalId, // Link to the signal
    createdAt: designation.createdAt,
    updatedAt: designation.updatedAt,
  })

  return designation
}

/**
 * Get signal-time safe adult for a specific signal.
 *
 * @param childId - The child's ID
 * @param signalId - The signal ID
 * @returns Signal-time designation or null
 */
export async function getSignalTimeSafeAdult(
  childId: string,
  signalId: string
): Promise<SafeAdultDesignation | null> {
  const col = getSafeAdultCollection()
  const q = query(
    col,
    where('childId', '==', childId),
    where('signalId', '==', signalId),
    where('isPreConfigured', '==', false)
  )

  const snapshot = await getDocs(q)

  if (snapshot.empty) {
    return null
  }

  const docData = snapshot.docs[0].data()
  return convertTimestamps(docData)
}

// ============================================
// Query Functions
// ============================================

/**
 * Get safe adult designation by ID.
 *
 * @param id - The designation ID
 * @returns Designation or null
 */
export async function getSafeAdultById(id: string): Promise<SafeAdultDesignation | null> {
  if (!id || id.trim().length === 0) {
    throw new Error('id is required')
  }

  const docRef = getSafeAdultDocRef(id)
  const snapshot = await getDoc(docRef)

  if (!snapshot.exists()) {
    return null
  }

  const docData = snapshot.data()
  return convertTimestamps(docData)
}

/**
 * Get all safe adult designations for a child.
 *
 * @param childId - The child's ID
 * @returns Array of designations
 */
export async function getAllSafeAdultsForChild(childId: string): Promise<SafeAdultDesignation[]> {
  if (!childId || childId.trim().length === 0) {
    throw new Error('childId is required')
  }

  const col = getSafeAdultCollection()
  const q = query(col, where('childId', '==', childId))

  const snapshot = await getDocs(q)

  if (snapshot.empty) {
    return []
  }

  return snapshot.docs.map((d) => convertTimestamps(d.data()))
}

/**
 * Check if child has a pre-configured safe adult.
 *
 * @param childId - The child's ID
 * @returns True if configured
 */
export async function hasSafeAdultConfigured(childId: string): Promise<boolean> {
  if (!childId || childId.trim().length === 0) {
    throw new Error('childId is required')
  }

  const existing = await getPreConfiguredSafeAdult(childId)
  return existing !== null
}

// ============================================
// Validation Functions
// ============================================

/**
 * Validate safe adult contact information.
 *
 * @param contact - Contact to validate
 * @returns Validation result
 */
export function validateSafeAdultContact(contact: {
  phone?: string
  email?: string
}): ContactValidationResult {
  return validateContactInput(contact)
}
