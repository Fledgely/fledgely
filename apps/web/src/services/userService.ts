'use client'

import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
  runTransaction,
  type Timestamp,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import {
  userSchema,
  createUserInputSchema,
  type User,
  type CreateUserInput,
} from '@fledgely/contracts'
import type { User as FirebaseUser } from 'firebase/auth'

/**
 * User Service - Firestore operations for user profiles
 *
 * Follows project guidelines:
 * - Direct Firestore SDK (no abstractions)
 * - Types from Zod schemas
 * - Server timestamps for reliability
 */

/** Collection name for user documents */
const USERS_COLLECTION = 'users'

/**
 * Error messages at 6th-grade reading level (NFR65)
 */
const ERROR_MESSAGES: Record<string, string> = {
  'permission-denied': 'Unable to save your profile. Please try signing in again.',
  unavailable: 'Connection problem. Please check your internet and try again.',
  'network-request-failed': 'Could not connect. Please check your internet.',
  'not-found': 'Profile not found. Please try again.',
  default: 'Something went wrong with your profile. Please try again.',
}

/**
 * Get user-friendly error message
 */
function getErrorMessage(error: unknown): string {
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
 * Convert Firestore document data to User type
 * Handles Timestamp to Date conversion
 */
function convertFirestoreUser(data: Record<string, unknown>): User {
  return userSchema.parse({
    uid: data.uid,
    email: data.email,
    displayName: data.displayName ?? null,
    photoURL: data.photoURL ?? null,
    createdAt: (data.createdAt as Timestamp)?.toDate(),
    lastLoginAt: (data.lastLoginAt as Timestamp)?.toDate(),
  })
}

/**
 * Create a new user document from Firebase Auth user
 *
 * @param authUser - Firebase Auth user object
 * @returns Created user profile
 * @throws Error with user-friendly message if creation fails
 */
export async function createUser(authUser: FirebaseUser): Promise<User> {
  try {
    // Validate input
    const input: CreateUserInput = createUserInputSchema.parse({
      uid: authUser.uid,
      email: authUser.email,
      displayName: authUser.displayName,
      photoURL: authUser.photoURL,
    })

    const userRef = doc(db, USERS_COLLECTION, authUser.uid)

    // Use setDoc with server timestamps
    await setDoc(userRef, {
      ...input,
      createdAt: serverTimestamp(),
      lastLoginAt: serverTimestamp(),
    })

    // Fetch the created document to get actual timestamps
    const snapshot = await getDoc(userRef)
    if (!snapshot.exists()) {
      throw new Error('Failed to create user profile')
    }

    return convertFirestoreUser(snapshot.data())
  } catch (error) {
    const message = getErrorMessage(error)
    console.error('[userService.createUser]', error)
    throw new Error(message)
  }
}

/**
 * Get user by uid
 *
 * @param uid - Firebase Auth uid
 * @returns User profile or null if not found
 * @throws Error with user-friendly message if fetch fails
 */
export async function getUser(uid: string): Promise<User | null> {
  try {
    const userRef = doc(db, USERS_COLLECTION, uid)
    const snapshot = await getDoc(userRef)

    if (!snapshot.exists()) {
      return null
    }

    return convertFirestoreUser(snapshot.data())
  } catch (error) {
    const message = getErrorMessage(error)
    console.error('[userService.getUser]', error)
    throw new Error(message)
  }
}

/**
 * Check if user document exists
 *
 * @param uid - Firebase Auth uid
 * @returns true if user document exists
 */
export async function userExists(uid: string): Promise<boolean> {
  try {
    const userRef = doc(db, USERS_COLLECTION, uid)
    const snapshot = await getDoc(userRef)
    return snapshot.exists()
  } catch (error) {
    console.error('[userService.userExists]', error)
    // On error, assume user doesn't exist to allow creation attempt
    return false
  }
}

/**
 * Update lastLoginAt timestamp
 *
 * @param uid - Firebase Auth uid
 * @throws Error with user-friendly message if update fails
 */
export async function updateLastLogin(uid: string): Promise<void> {
  try {
    const userRef = doc(db, USERS_COLLECTION, uid)
    await updateDoc(userRef, {
      lastLoginAt: serverTimestamp(),
    })
  } catch (error) {
    // Log but don't throw - updating last login is not critical
    console.error('[userService.updateLastLogin]', error)
  }
}

/**
 * Get or create user profile
 * Uses Firestore transaction to prevent race conditions
 * Idempotent operation - safe to call multiple times
 *
 * @param authUser - Firebase Auth user object
 * @returns User profile and isNewUser flag
 */
export async function getOrCreateUser(authUser: FirebaseUser): Promise<{
  user: User
  isNewUser: boolean
}> {
  try {
    // Validate input first (before transaction)
    const input = createUserInputSchema.parse({
      uid: authUser.uid,
      email: authUser.email,
      displayName: authUser.displayName,
      photoURL: authUser.photoURL,
    })

    const userRef = doc(db, USERS_COLLECTION, authUser.uid)

    // Use transaction to atomically check-and-create
    const result = await runTransaction(db, async (transaction) => {
      const snapshot = await transaction.get(userRef)

      if (snapshot.exists()) {
        // User exists - update last login timestamp
        transaction.update(userRef, {
          lastLoginAt: serverTimestamp(),
        })
        return {
          isNewUser: false,
          data: snapshot.data(),
        }
      }

      // User doesn't exist - create new profile
      const newUserData = {
        ...input,
        createdAt: serverTimestamp(),
        lastLoginAt: serverTimestamp(),
      }
      transaction.set(userRef, newUserData)

      return {
        isNewUser: true,
        data: null, // Will fetch after transaction to get server timestamps
      }
    })

    // If new user, we need to fetch to get server timestamps
    // If existing user, we already have the data
    if (result.isNewUser) {
      const snapshot = await getDoc(userRef)
      if (!snapshot.exists()) {
        throw new Error('Failed to create user profile')
      }
      return {
        user: convertFirestoreUser(snapshot.data()),
        isNewUser: true,
      }
    }

    return {
      user: convertFirestoreUser(result.data as Record<string, unknown>),
      isNewUser: false,
    }
  } catch (error) {
    const message = getErrorMessage(error)
    console.error('[userService.getOrCreateUser]', error)
    throw new Error(message)
  }
}
