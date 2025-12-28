/**
 * Child service for Firestore operations.
 *
 * Handles CRUD operations for children stored in /children/{childId}.
 * Uses Firebase SDK directly per Unbreakable Rule #2.
 * Validates data with Zod schemas from @fledgely/shared/contracts.
 */

import {
  doc,
  getDoc,
  setDoc,
  collection,
  query,
  where,
  getDocs,
  serverTimestamp,
  Timestamp,
  FirestoreError,
} from 'firebase/firestore'
import {
  childProfileSchema,
  type ChildProfile,
  type ChildGuardian,
} from '@fledgely/shared/contracts'
import { getFirestoreDb } from '../lib/firebase'

/**
 * Convert Firestore Timestamp fields to Date for Zod validation.
 */
function convertChildTimestamps(data: Record<string, unknown>): Record<string, unknown> {
  const result = { ...data }
  if (result.createdAt instanceof Timestamp) {
    result.createdAt = result.createdAt.toDate()
  }
  if (result.updatedAt instanceof Timestamp) {
    result.updatedAt = result.updatedAt.toDate()
  }
  if (result.birthdate instanceof Timestamp) {
    result.birthdate = result.birthdate.toDate()
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
 * Calculate age in years from a birthdate.
 *
 * @param birthdate - The date of birth
 * @returns Age in complete years
 */
export function calculateAge(birthdate: Date): number {
  const today = new Date()
  let age = today.getFullYear() - birthdate.getFullYear()
  const monthDiff = today.getMonth() - birthdate.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthdate.getDate())) {
    age--
  }
  return age
}

/**
 * Get a child by ID from Firestore.
 *
 * @param childId - The child document ID
 * @returns The validated child profile, or null if not found
 * @throws If the document exists but fails schema validation or Firestore error
 */
export async function getChild(childId: string): Promise<ChildProfile | null> {
  try {
    const db = getFirestoreDb()
    const childRef = doc(db, 'children', childId)
    const docSnap = await getDoc(childRef)

    if (!docSnap.exists()) {
      return null
    }

    const data = docSnap.data()
    const convertedData = convertChildTimestamps(data)

    // Validate against schema - throws if invalid
    return childProfileSchema.parse(convertedData)
  } catch (err) {
    if (err instanceof FirestoreError) {
      console.error(`Firestore error getting child ${childId}:`, err.code, err.message)
      throw new Error(`Failed to get child: ${err.message}`)
    }
    throw err
  }
}

/**
 * Get all children for a family.
 *
 * @param familyId - The family ID
 * @returns Array of validated child profiles
 * @throws If Firestore query fails
 */
export async function getChildrenByFamily(familyId: string): Promise<ChildProfile[]> {
  try {
    const db = getFirestoreDb()
    const childrenRef = collection(db, 'children')
    const q = query(childrenRef, where('familyId', '==', familyId))
    const querySnapshot = await getDocs(q)

    const children: ChildProfile[] = []
    for (const docSnap of querySnapshot.docs) {
      const data = docSnap.data()
      const convertedData = convertChildTimestamps(data)
      const child = childProfileSchema.parse(convertedData)
      children.push(child)
    }

    return children
  } catch (err) {
    if (err instanceof FirestoreError) {
      console.error(
        `Firestore error getting children for family ${familyId}:`,
        err.code,
        err.message
      )
      throw new Error(`Failed to get children: ${err.message}`)
    }
    throw err
  }
}

/**
 * Add a child to a family.
 *
 * @param familyId - The family to add the child to
 * @param guardianUid - The UID of the guardian adding the child
 * @param name - The child's name
 * @param birthdate - The child's birthdate
 * @param photoURL - Optional photo URL for the child
 * @returns The created child profile
 * @throws If child creation fails, Firestore error, or data is invalid
 */
export async function addChild(
  familyId: string,
  guardianUid: string,
  name: string,
  birthdate: Date,
  photoURL?: string | null
): Promise<ChildProfile> {
  try {
    const db = getFirestoreDb()

    // Generate unique child ID
    const childId = crypto.randomUUID()

    // Create primary guardian entry
    const guardian: ChildGuardian = {
      uid: guardianUid,
      role: 'primary_guardian',
      addedAt: new Date(),
    }

    // Write child document with server timestamps
    const childRef = doc(db, 'children', childId)
    await setDoc(childRef, {
      id: childId,
      familyId,
      name: name.trim(),
      birthdate,
      photoURL: photoURL || null,
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

    // Read back the child document to get server-generated timestamps
    const createdDoc = await getDoc(childRef)
    if (!createdDoc.exists()) {
      throw new Error('Failed to create child')
    }

    const data = createdDoc.data()
    const convertedData = convertChildTimestamps(data)

    return childProfileSchema.parse(convertedData)
  } catch (err) {
    if (err instanceof FirestoreError) {
      console.error(`Firestore error adding child to family ${familyId}:`, err.code, err.message)
      throw new Error(`Failed to add child: ${err.message}`)
    }
    throw err
  }
}

/**
 * Check if a user is a guardian of a specific child.
 *
 * @param child - The child to check
 * @param uid - The user's UID
 * @returns true if the user is a guardian
 */
export function isChildGuardian(child: ChildProfile, uid: string): boolean {
  return child.guardians.some((g) => g.uid === uid)
}
