'use client'

import {
  doc,
  getDoc,
  getDocs,
  collection,
  query,
  where,
  serverTimestamp,
  runTransaction,
  arrayUnion,
  type Timestamp,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import {
  childProfileSchema,
  createChildInputSchema,
  type ChildProfile,
  type CreateChildInput,
} from '@fledgely/contracts'

/**
 * Child Service - Firestore operations for child profile management
 *
 * Follows project guidelines:
 * - Direct Firestore SDK (no abstractions)
 * - Types from Zod schemas
 * - Server timestamps for reliability
 * - Transaction-based operations for atomic updates
 *
 * Story 2.2: Add Child to Family
 */

/** Collection name for child documents */
const CHILDREN_COLLECTION = 'children'

/** Collection name for family documents */
const FAMILIES_COLLECTION = 'families'

/**
 * Error messages at 6th-grade reading level (NFR65)
 */
const ERROR_MESSAGES: Record<string, string> = {
  'family-not-found': 'We could not find your family. Please try signing in again.',
  'permission-denied': 'You cannot add children to this family.',
  'not-a-guardian': 'Only parents can add children to this family.',
  'invalid-input': 'Please check the information you entered.',
  'child-not-found': 'We could not find this child profile.',
  unavailable: 'Connection problem. Please check your internet and try again.',
  'network-request-failed': 'Could not connect. Please check your internet.',
  default: 'Something went wrong. Please try again.',
}

/**
 * Custom error class for child service errors
 */
export class ChildServiceError extends Error {
  constructor(
    public readonly code: string,
    message: string
  ) {
    super(message)
    this.name = 'ChildServiceError'
  }
}

/**
 * Get user-friendly error message
 */
function getErrorMessage(error: unknown): string {
  if (error instanceof ChildServiceError) {
    return ERROR_MESSAGES[error.code] || ERROR_MESSAGES.default
  }
  if (error instanceof Error) {
    // Check for Firebase error codes
    const errorCode = (error as { code?: string }).code
    if (errorCode && ERROR_MESSAGES[errorCode]) {
      return ERROR_MESSAGES[errorCode]
    }
    // Check error message for known patterns
    for (const [key, message] of Object.entries(ERROR_MESSAGES)) {
      if (error.message.includes(key)) {
        return message
      }
    }
  }
  return ERROR_MESSAGES.default
}

/**
 * Convert Firestore document data to ChildProfile type
 * Handles Timestamp to Date conversion
 */
function convertFirestoreChildProfile(
  data: Record<string, unknown>,
  id: string
): ChildProfile {
  return childProfileSchema.parse({
    id,
    familyId: data.familyId,
    firstName: data.firstName,
    lastName: data.lastName || null,
    nickname: data.nickname || null,
    birthdate: (data.birthdate as Timestamp)?.toDate(),
    photoUrl: data.photoUrl || null,
    guardians: (data.guardians as Array<Record<string, unknown>>)?.map((g) => ({
      uid: g.uid,
      permissions: g.permissions,
      grantedAt: (g.grantedAt as Timestamp)?.toDate(),
    })),
    createdAt: (data.createdAt as Timestamp)?.toDate(),
    createdBy: data.createdBy,
  })
}

/**
 * Add a child to a family
 * Uses Firestore transaction to atomically create child and update family children array
 *
 * Returns optimistic data immediately after transaction commit to avoid
 * race conditions with serverTimestamp() resolution.
 *
 * @param familyId - ID of the family to add the child to
 * @param input - Child profile input data
 * @param userId - Firebase Auth uid of the user adding the child
 * @returns Created child profile
 * @throws ChildServiceError if user is not a guardian or creation fails
 */
export async function addChildToFamily(
  familyId: string,
  input: CreateChildInput,
  userId: string
): Promise<ChildProfile> {
  try {
    // Validate input
    const validatedInput = createChildInputSchema.parse(input)

    // References
    const childRef = doc(collection(db, CHILDREN_COLLECTION))
    const familyRef = doc(db, FAMILIES_COLLECTION, familyId)

    // Capture timestamp before transaction for optimistic return
    const now = new Date()

    // Use transaction to atomically create child and update family
    await runTransaction(db, async (transaction) => {
      // Verify family exists and user is a guardian with full permissions
      const familyDoc = await transaction.get(familyRef)

      if (!familyDoc.exists()) {
        throw new ChildServiceError('family-not-found', 'Family not found')
      }

      const familyData = familyDoc.data()
      const guardians = familyData.guardians as Array<{
        uid: string
        permissions: string
      }>

      // Find the user in the guardians list
      const userGuardian = guardians.find((g) => g.uid === userId)

      if (!userGuardian) {
        throw new ChildServiceError('not-a-guardian', 'User is not a guardian in this family')
      }

      if (userGuardian.permissions !== 'full') {
        throw new ChildServiceError(
          'permission-denied',
          'User does not have permission to add children'
        )
      }

      // Create child document
      const childData = {
        id: childRef.id,
        familyId,
        firstName: validatedInput.firstName,
        lastName: validatedInput.lastName || null,
        nickname: null, // Not in create input, can be added later
        birthdate: validatedInput.birthdate,
        photoUrl: validatedInput.photoUrl || null,
        guardians: [
          {
            uid: userId,
            permissions: 'full',
            grantedAt: serverTimestamp(),
          },
        ],
        createdAt: serverTimestamp(),
        createdBy: userId,
      }

      transaction.set(childRef, childData)

      // Update family children array
      transaction.update(familyRef, {
        children: arrayUnion(childRef.id),
      })
    })

    // Return optimistic data immediately after transaction commits
    return childProfileSchema.parse({
      id: childRef.id,
      familyId,
      firstName: validatedInput.firstName,
      lastName: validatedInput.lastName || null,
      nickname: null,
      birthdate: validatedInput.birthdate,
      photoUrl: validatedInput.photoUrl || null,
      guardians: [
        {
          uid: userId,
          permissions: 'full',
          grantedAt: now,
        },
      ],
      createdAt: now,
      createdBy: userId,
    })
  } catch (error) {
    if (error instanceof ChildServiceError) {
      const message = getErrorMessage(error)
      console.error('[childService.addChildToFamily]', error)
      throw new Error(message)
    }
    const message = getErrorMessage(error)
    console.error('[childService.addChildToFamily]', error)
    throw new Error(message)
  }
}

/**
 * Get child by ID
 *
 * @param childId - Firestore child document ID
 * @returns Child profile or null if not found
 */
export async function getChild(childId: string): Promise<ChildProfile | null> {
  try {
    const childRef = doc(db, CHILDREN_COLLECTION, childId)
    const snapshot = await getDoc(childRef)

    if (!snapshot.exists()) {
      return null
    }

    return convertFirestoreChildProfile(snapshot.data(), snapshot.id)
  } catch (error) {
    const message = getErrorMessage(error)
    console.error('[childService.getChild]', error)
    throw new Error(message)
  }
}

/**
 * Get all children for a family
 *
 * @param familyId - Firestore family document ID
 * @returns Array of child profiles in the family
 */
export async function getChildrenForFamily(familyId: string): Promise<ChildProfile[]> {
  try {
    const childrenRef = collection(db, CHILDREN_COLLECTION)
    const q = query(childrenRef, where('familyId', '==', familyId))
    const snapshot = await getDocs(q)

    return snapshot.docs.map((doc) => convertFirestoreChildProfile(doc.data(), doc.id))
  } catch (error) {
    const message = getErrorMessage(error)
    console.error('[childService.getChildrenForFamily]', error)
    throw new Error(message)
  }
}

/**
 * Check if user is a guardian for a specific child
 *
 * @param childId - Child document ID
 * @param userId - Firebase Auth uid
 * @returns true if user is a guardian for the child
 */
export async function isUserGuardianForChild(
  childId: string,
  userId: string
): Promise<boolean> {
  try {
    const child = await getChild(childId)
    if (!child) {
      return false
    }
    return child.guardians.some((g) => g.uid === userId)
  } catch (error) {
    console.error('[childService.isUserGuardianForChild]', error)
    return false
  }
}

/**
 * Check if user has full permissions for a specific child
 *
 * @param childId - Child document ID
 * @param userId - Firebase Auth uid
 * @returns true if user has full permissions for the child
 */
export async function hasFullPermissionsForChild(
  childId: string,
  userId: string
): Promise<boolean> {
  try {
    const child = await getChild(childId)
    if (!child) {
      return false
    }
    const guardian = child.guardians.find((g) => g.uid === userId)
    return guardian?.permissions === 'full'
  } catch (error) {
    console.error('[childService.hasFullPermissionsForChild]', error)
    return false
  }
}
