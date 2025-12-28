/**
 * Family service for Firestore operations.
 *
 * Handles CRUD operations for families stored in /families/{familyId}.
 * Uses Firebase SDK directly per Unbreakable Rule #2.
 * Validates data with Zod schemas from @fledgely/shared/contracts.
 */

import { doc, getDoc, setDoc, updateDoc, serverTimestamp, Timestamp } from 'firebase/firestore'
import { User as FirebaseUser } from 'firebase/auth'
import { familySchema, type Family, type FamilyGuardian } from '@fledgely/shared/contracts'
import { getFirestoreDb } from '../lib/firebase'

/**
 * Convert Firestore Timestamp fields to Date for Zod validation.
 */
function convertFamilyTimestamps(data: Record<string, unknown>): Record<string, unknown> {
  const result = { ...data }
  if (result.createdAt instanceof Timestamp) {
    result.createdAt = result.createdAt.toDate()
  }
  if (result.updatedAt instanceof Timestamp) {
    result.updatedAt = result.updatedAt.toDate()
  }
  // Convert guardian addedAt timestamps
  if (Array.isArray(result.guardians)) {
    result.guardians = result.guardians.map((g: Record<string, unknown>) => ({
      ...g,
      addedAt: g.addedAt instanceof Timestamp ? g.addedAt.toDate() : g.addedAt,
    }))
  }
  return result
}

/**
 * Get a family by ID from Firestore.
 *
 * @param familyId - The family document ID
 * @returns The validated family, or null if not found
 * @throws If the document exists but fails schema validation
 */
export async function getFamily(familyId: string): Promise<Family | null> {
  const db = getFirestoreDb()
  const familyRef = doc(db, 'families', familyId)
  const docSnap = await getDoc(familyRef)

  if (!docSnap.exists()) {
    return null
  }

  const data = docSnap.data()
  const convertedData = convertFamilyTimestamps(data)

  // Validate against schema - throws if invalid
  return familySchema.parse(convertedData)
}

/**
 * Get the family for a user by their familyId.
 *
 * @param familyId - The family ID from user profile
 * @returns The validated family, or null if not found
 */
export async function getUserFamily(familyId: string | null): Promise<Family | null> {
  if (!familyId) {
    return null
  }
  return getFamily(familyId)
}

/**
 * Create a new family and add the user as primary guardian.
 *
 * @param firebaseUser - The Firebase Auth user creating the family
 * @param familyName - Optional name for the family
 * @returns The created family
 * @throws If family creation fails or data is invalid
 */
export async function createFamily(
  firebaseUser: FirebaseUser,
  familyName?: string
): Promise<Family> {
  const db = getFirestoreDb()

  // Generate unique family ID
  const familyId = crypto.randomUUID()

  // Create default family name from user's display name
  const firstName = firebaseUser.displayName?.split(' ')[0] || 'My'
  const name = familyName?.trim() || `${firstName}'s Family`

  // Create primary guardian entry
  const guardian: FamilyGuardian = {
    uid: firebaseUser.uid,
    role: 'primary_guardian',
    addedAt: new Date(),
  }

  // Write family document with server timestamps
  const familyRef = doc(db, 'families', familyId)
  await setDoc(familyRef, {
    id: familyId,
    name,
    guardians: [
      {
        uid: guardian.uid,
        role: guardian.role,
        addedAt: serverTimestamp(),
      },
    ],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })

  // Update user's familyId reference
  const userRef = doc(db, 'users', firebaseUser.uid)
  await updateDoc(userRef, {
    familyId,
  })

  // Read back the family document to get server-generated timestamps
  const createdDoc = await getDoc(familyRef)
  if (!createdDoc.exists()) {
    throw new Error('Failed to create family')
  }

  const data = createdDoc.data()
  const convertedData = convertFamilyTimestamps(data)

  return familySchema.parse(convertedData)
}

/**
 * Check if a user is a guardian of a specific family.
 *
 * @param family - The family to check
 * @param uid - The user's UID
 * @returns true if the user is a guardian
 */
export function isUserGuardian(family: Family, uid: string): boolean {
  return family.guardians.some((g) => g.uid === uid)
}

/**
 * Check if a user is the primary guardian of a family.
 *
 * @param family - The family to check
 * @param uid - The user's UID
 * @returns true if the user is the primary guardian
 */
export function isUserPrimaryGuardian(family: Family, uid: string): boolean {
  return family.guardians.some((g) => g.uid === uid && g.role === 'primary_guardian')
}

/**
 * Update family name.
 *
 * @param familyId - The family ID
 * @param newName - The new family name
 */
export async function updateFamilyName(familyId: string, newName: string): Promise<void> {
  const db = getFirestoreDb()
  const familyRef = doc(db, 'families', familyId)

  await updateDoc(familyRef, {
    name: newName.trim(),
    updatedAt: serverTimestamp(),
  })
}
