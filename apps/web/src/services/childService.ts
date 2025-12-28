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
  updateDoc,
  deleteDoc,
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
  // Convert custody timestamps if present
  if (result.custody && typeof result.custody === 'object') {
    const custody = result.custody as Record<string, unknown>
    result.custody = {
      ...custody,
      declaredAt:
        custody.declaredAt instanceof Timestamp ? custody.declaredAt.toDate() : custody.declaredAt,
      updatedAt:
        custody.updatedAt instanceof Timestamp ? custody.updatedAt.toDate() : custody.updatedAt,
    }
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
      custody: null, // Custody must be declared separately
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

/**
 * Update a child's profile.
 *
 * @param childId - The child document ID
 * @param guardianUid - The UID of the guardian making the update
 * @param name - The child's updated name
 * @param birthdate - The child's updated birthdate
 * @param photoURL - Optional updated photo URL
 * @returns The updated child profile
 * @throws If update fails, validation fails, authorization fails, or Firestore error
 */
export async function updateChild(
  childId: string,
  guardianUid: string,
  name: string,
  birthdate: Date,
  photoURL?: string | null
): Promise<ChildProfile> {
  // Validate name
  const trimmedName = name.trim()
  if (!trimmedName) {
    throw new Error('Name is required')
  }

  // Validate birthdate (not in future, reasonable age 0-25 years)
  const today = new Date()
  if (birthdate > today) {
    throw new Error('Birthdate cannot be in the future')
  }
  const age = calculateAge(birthdate)
  if (age < 0 || age > 25) {
    throw new Error('Birthdate must result in age between 0 and 25 years')
  }

  // Validate photoURL if provided
  if (photoURL !== null && photoURL !== undefined && photoURL.trim() !== '') {
    try {
      new URL(photoURL)
    } catch {
      throw new Error('Invalid photo URL format')
    }
  }

  try {
    const db = getFirestoreDb()
    const childRef = doc(db, 'children', childId)

    // Check that child exists before update
    const existingDoc = await getDoc(childRef)
    if (!existingDoc.exists()) {
      throw new Error('Child not found')
    }

    // Verify authorization - must be a guardian of the child
    const existingData = existingDoc.data()
    const convertedExisting = convertChildTimestamps(existingData)
    const existingChild = childProfileSchema.parse(convertedExisting)

    if (!isChildGuardian(existingChild, guardianUid)) {
      throw new Error('Not authorized to update this child')
    }

    // Update child document
    await updateDoc(childRef, {
      name: trimmedName,
      birthdate,
      photoURL: photoURL ?? null,
      updatedAt: serverTimestamp(),
    })

    // Read back the child document to get updated data
    const updatedDoc = await getDoc(childRef)
    if (!updatedDoc.exists()) {
      throw new Error('Failed to read updated child')
    }

    const data = updatedDoc.data()
    const convertedData = convertChildTimestamps(data)

    // Validate against schema before returning
    return childProfileSchema.parse(convertedData)
  } catch (err) {
    if (err instanceof FirestoreError) {
      console.error(`Firestore error updating child ${childId}:`, err.code, err.message)
      throw new Error(`Failed to update child: ${err.message}`)
    }
    throw err
  }
}

/**
 * Delete a child from a family.
 *
 * This permanently deletes the child document. In the future, this will
 * also handle: device unenrollment, screenshot deletion, activity log deletion,
 * and child account conversion.
 *
 * @param childId - The child document ID
 * @param guardianUid - The UID of the guardian requesting deletion
 * @throws If deletion fails, authorization fails, or Firestore error
 */
export async function deleteChild(childId: string, guardianUid: string): Promise<void> {
  try {
    const db = getFirestoreDb()
    const childRef = doc(db, 'children', childId)

    // Verify child exists
    const existingDoc = await getDoc(childRef)
    if (!existingDoc.exists()) {
      throw new Error('Child not found')
    }

    // Verify authorization - must be a guardian of the child
    const existingData = existingDoc.data()
    const convertedExisting = convertChildTimestamps(existingData)
    const existingChild = childProfileSchema.parse(convertedExisting)

    if (!isChildGuardian(existingChild, guardianUid)) {
      throw new Error('Not authorized to delete this child')
    }

    // Delete the child document
    await deleteDoc(childRef)

    // TODO: Future enhancements (when features exist):
    // - Unenroll all devices associated with this child
    // - Delete all screenshots for this child
    // - Delete all activity logs for this child
    // - Convert child account to standalone if exists
    // - Log deletion to family audit trail
  } catch (err) {
    if (err instanceof FirestoreError) {
      console.error(`Firestore error deleting child ${childId}:`, err.code, err.message)
      throw new Error(`Failed to delete child: ${err.message}`)
    }
    throw err
  }
}
