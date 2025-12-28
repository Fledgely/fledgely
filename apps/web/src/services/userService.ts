/**
 * User profile service for Firestore operations.
 *
 * Handles CRUD operations for user profiles stored in /users/{uid}.
 * Uses Firebase SDK directly per Unbreakable Rule #2.
 * Validates data with Zod schemas from @fledgely/shared/contracts.
 */

import { doc, getDoc, setDoc, updateDoc, serverTimestamp, Timestamp } from 'firebase/firestore'
import { User as FirebaseUser } from 'firebase/auth'
import { userSchema, type User } from '@fledgely/shared/contracts'
import { getFirestoreDb } from '../lib/firebase'

/**
 * Convert Firestore Timestamp fields to Date for Zod validation.
 */
function convertTimestamps(data: Record<string, unknown>): Record<string, unknown> {
  const result = { ...data }
  if (result.createdAt instanceof Timestamp) {
    result.createdAt = result.createdAt.toDate()
  }
  if (result.lastLoginAt instanceof Timestamp) {
    result.lastLoginAt = result.lastLoginAt.toDate()
  }
  return result
}

/**
 * Get a user profile from Firestore.
 *
 * @param uid - The user's Firebase Auth UID
 * @returns The validated user profile, or null if not found
 * @throws If the document exists but fails schema validation
 */
export async function getUserProfile(uid: string): Promise<User | null> {
  const db = getFirestoreDb()
  const userRef = doc(db, 'users', uid)
  const docSnap = await getDoc(userRef)

  if (!docSnap.exists()) {
    return null
  }

  const data = docSnap.data()
  const convertedData = convertTimestamps(data)

  // Validate against schema - throws if invalid
  return userSchema.parse(convertedData)
}

/**
 * Create a new user profile in Firestore.
 *
 * Extracts profile data from Firebase Auth user object.
 * Sets both createdAt and lastLoginAt to current server time.
 *
 * @param firebaseUser - The Firebase Auth user object
 * @returns The created user profile
 * @throws If profile creation fails or data is invalid
 */
export async function createUserProfile(firebaseUser: FirebaseUser): Promise<User> {
  const db = getFirestoreDb()
  const userRef = doc(db, 'users', firebaseUser.uid)

  // Prepare user data from Firebase Auth
  const userData = {
    uid: firebaseUser.uid,
    email: firebaseUser.email ?? '',
    displayName: firebaseUser.displayName,
    photoURL: firebaseUser.photoURL,
  }

  // Write to Firestore with server timestamps
  await setDoc(userRef, {
    ...userData,
    createdAt: serverTimestamp(),
    lastLoginAt: serverTimestamp(),
  })

  // Read back the document to get server-generated timestamps
  const createdDoc = await getDoc(userRef)
  if (!createdDoc.exists()) {
    throw new Error('Failed to create user profile')
  }

  const data = createdDoc.data()
  const convertedData = convertTimestamps(data)

  return userSchema.parse(convertedData)
}

/**
 * Update the lastLoginAt timestamp for an existing user.
 *
 * @param uid - The user's Firebase Auth UID
 * @throws If the update fails
 */
export async function updateLastLogin(uid: string): Promise<void> {
  const db = getFirestoreDb()
  const userRef = doc(db, 'users', uid)

  await updateDoc(userRef, {
    lastLoginAt: serverTimestamp(),
  })
}

/**
 * Ensure a user profile exists, creating one if necessary.
 *
 * For new users: creates profile and returns { user, isNewUser: true }
 * For existing users: updates lastLoginAt and returns { user, isNewUser: false }
 *
 * @param firebaseUser - The Firebase Auth user object
 * @returns Object containing the user profile and whether they're new
 */
export async function ensureUserProfile(
  firebaseUser: FirebaseUser
): Promise<{ user: User; isNewUser: boolean }> {
  const existingUser = await getUserProfile(firebaseUser.uid)

  if (existingUser) {
    // Existing user - update last login and re-fetch to get server timestamp
    await updateLastLogin(firebaseUser.uid)
    const updatedUser = await getUserProfile(firebaseUser.uid)
    return {
      user: updatedUser ?? existingUser,
      isNewUser: false,
    }
  }

  // New user - create profile
  const newUser = await createUserProfile(firebaseUser)
  return {
    user: newUser,
    isNewUser: true,
  }
}
