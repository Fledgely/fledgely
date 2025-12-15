'use client'

import {
  doc,
  getDoc,
  collection,
  serverTimestamp,
  runTransaction,
  type Timestamp,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import {
  familySchema,
  createFamilyInputSchema,
  type Family,
  type CreateFamilyInput,
} from '@fledgely/contracts'

/**
 * Family Service - Firestore operations for family management
 *
 * Follows project guidelines:
 * - Direct Firestore SDK (no abstractions)
 * - Types from Zod schemas
 * - Server timestamps for reliability
 * - Transaction-based operations for atomic updates
 */

/** Collection name for family documents */
const FAMILIES_COLLECTION = 'families'

/** Collection name for user documents */
const USERS_COLLECTION = 'users'

/**
 * Error messages at 6th-grade reading level (NFR65)
 */
const ERROR_MESSAGES: Record<string, string> = {
  'already-has-family': 'You already have a family. Go to your dashboard to see it.',
  'user-not-found': 'Something went wrong. Please try signing in again.',
  'permission-denied': 'Unable to create your family. Please try again.',
  unavailable: 'Connection problem. Please check your internet and try again.',
  'network-request-failed': 'Could not connect. Please check your internet.',
  default: 'Something went wrong creating your family. Please try again.',
}

/**
 * Custom error class for family service errors
 */
export class FamilyServiceError extends Error {
  constructor(
    public readonly code: string,
    message: string
  ) {
    super(message)
    this.name = 'FamilyServiceError'
  }
}

/**
 * Get user-friendly error message
 */
function getErrorMessage(error: unknown): string {
  if (error instanceof FamilyServiceError) {
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
 * Convert Firestore document data to Family type
 * Handles Timestamp to Date conversion
 */
function convertFirestoreFamily(
  data: Record<string, unknown>,
  id: string
): Family {
  return familySchema.parse({
    id,
    createdAt: (data.createdAt as Timestamp)?.toDate(),
    createdBy: data.createdBy,
    guardians: (data.guardians as Array<Record<string, unknown>>)?.map((g) => ({
      uid: g.uid,
      role: g.role,
      permissions: g.permissions,
      joinedAt: (g.joinedAt as Timestamp)?.toDate(),
    })),
    children: data.children || [],
  })
}

/**
 * Create a new family with the user as primary guardian
 * Uses Firestore transaction to atomically create family and update user
 *
 * Returns optimistic data immediately after transaction commit to avoid
 * race conditions with serverTimestamp() resolution.
 *
 * @param userId - Firebase Auth uid of the user creating the family
 * @returns Created family
 * @throws FamilyServiceError if user already has a family or creation fails
 */
export async function createFamily(userId: string): Promise<Family> {
  try {
    // Validate input
    const input: CreateFamilyInput = createFamilyInputSchema.parse({
      createdBy: userId,
    })

    // References
    const familyRef = doc(collection(db, FAMILIES_COLLECTION))
    const userRef = doc(db, USERS_COLLECTION, userId)

    // Capture timestamp before transaction for optimistic return
    // This is close enough to server time for immediate UI use
    const now = new Date()

    // Use transaction to atomically create family and update user
    await runTransaction(db, async (transaction) => {
      // Verify user exists and doesn't already have a family
      const userDoc = await transaction.get(userRef)

      if (!userDoc.exists()) {
        throw new FamilyServiceError('user-not-found', 'User not found')
      }

      const userData = userDoc.data()
      if (userData.familyId) {
        throw new FamilyServiceError(
          'already-has-family',
          'User already has a family'
        )
      }

      // Create family document with serverTimestamp for accurate server time
      const familyData = {
        id: familyRef.id,
        createdAt: serverTimestamp(),
        createdBy: input.createdBy,
        guardians: [
          {
            uid: userId,
            role: 'primary',
            permissions: 'full',
            joinedAt: serverTimestamp(),
          },
        ],
        children: [],
      }

      transaction.set(familyRef, familyData)

      // Update user with familyId and role
      transaction.update(userRef, {
        familyId: familyRef.id,
        role: 'guardian',
      })
    })

    // Return optimistic family data immediately after transaction commits
    // This avoids race condition with post-transaction getDoc where
    // serverTimestamp() may not have resolved yet
    //
    // The transaction has committed successfully at this point, so we can
    // construct the return value with known data. The actual serverTimestamp
    // will be within milliseconds of `now`.
    return familySchema.parse({
      id: familyRef.id,
      createdAt: now,
      createdBy: input.createdBy,
      guardians: [
        {
          uid: userId,
          role: 'primary',
          permissions: 'full',
          joinedAt: now,
        },
      ],
      children: [],
    })
  } catch (error) {
    if (error instanceof FamilyServiceError) {
      const message = getErrorMessage(error)
      console.error('[familyService.createFamily]', error)
      throw new Error(message)
    }
    const message = getErrorMessage(error)
    console.error('[familyService.createFamily]', error)
    throw new Error(message)
  }
}

/**
 * Get family by ID
 *
 * @param familyId - Firestore family document ID
 * @returns Family or null if not found
 */
export async function getFamily(familyId: string): Promise<Family | null> {
  try {
    const familyRef = doc(db, FAMILIES_COLLECTION, familyId)
    const snapshot = await getDoc(familyRef)

    if (!snapshot.exists()) {
      return null
    }

    return convertFirestoreFamily(snapshot.data(), snapshot.id)
  } catch (error) {
    const message = getErrorMessage(error)
    console.error('[familyService.getFamily]', error)
    throw new Error(message)
  }
}

/**
 * Get family for a user by checking their familyId
 *
 * @param userId - Firebase Auth uid
 * @returns Family or null if user has no family
 */
export async function getFamilyForUser(userId: string): Promise<Family | null> {
  try {
    const userRef = doc(db, USERS_COLLECTION, userId)
    const userSnapshot = await getDoc(userRef)

    if (!userSnapshot.exists()) {
      return null
    }

    const userData = userSnapshot.data()
    if (!userData.familyId) {
      return null
    }

    return getFamily(userData.familyId as string)
  } catch (error) {
    const message = getErrorMessage(error)
    console.error('[familyService.getFamilyForUser]', error)
    throw new Error(message)
  }
}

/**
 * Check if user has a family
 *
 * @param userId - Firebase Auth uid
 * @returns true if user has a familyId
 */
export async function userHasFamily(userId: string): Promise<boolean> {
  try {
    const userRef = doc(db, USERS_COLLECTION, userId)
    const userSnapshot = await getDoc(userRef)

    if (!userSnapshot.exists()) {
      return false
    }

    const userData = userSnapshot.data()
    return !!userData.familyId
  } catch (error) {
    console.error('[familyService.userHasFamily]', error)
    // On error, assume no family to allow creation attempt
    return false
  }
}
