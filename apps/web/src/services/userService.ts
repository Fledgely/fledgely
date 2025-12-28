/**
 * User profile service for Firestore operations.
 *
 * Handles CRUD operations for user profiles stored in /users/{uid}.
 * Uses Firebase SDK directly per Unbreakable Rule #2.
 * Validates data with Zod schemas from @fledgely/shared/contracts.
 */

import { doc, getDoc, setDoc, updateDoc, serverTimestamp, Timestamp } from 'firebase/firestore'
import { User as FirebaseUser } from 'firebase/auth'
import { userSchema, type User, SESSION_EXPIRY_DAYS } from '@fledgely/shared/contracts'
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
  if (result.lastActivityAt instanceof Timestamp) {
    result.lastActivityAt = result.lastActivityAt.toDate()
  }
  return result
}

/**
 * Check if a session has expired based on lastActivityAt timestamp.
 *
 * @param lastActivityAt - The timestamp of last activity
 * @returns true if session has expired (older than SESSION_EXPIRY_DAYS)
 */
export function isSessionExpired(lastActivityAt: Date): boolean {
  const now = new Date()
  const expiryMs = SESSION_EXPIRY_DAYS * 24 * 60 * 60 * 1000
  const ageMs = now.getTime() - lastActivityAt.getTime()
  return ageMs > expiryMs
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
 * Sets createdAt, lastLoginAt, and lastActivityAt to current server time.
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
    familyId: null, // No family initially
  }

  // Write to Firestore with server timestamps
  await setDoc(userRef, {
    ...userData,
    createdAt: serverTimestamp(),
    lastLoginAt: serverTimestamp(),
    lastActivityAt: serverTimestamp(),
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
 * Update the lastLoginAt and lastActivityAt timestamps for an existing user.
 *
 * @param uid - The user's Firebase Auth UID
 * @throws If the update fails
 */
export async function updateLastLogin(uid: string): Promise<void> {
  const db = getFirestoreDb()
  const userRef = doc(db, 'users', uid)

  await updateDoc(userRef, {
    lastLoginAt: serverTimestamp(),
    lastActivityAt: serverTimestamp(),
  })
}

/**
 * Ensure a user profile exists, creating one if necessary.
 *
 * For new users: creates profile and returns { user, isNewUser: true, sessionExpired: false }
 * For existing users: checks session expiry, updates timestamps if valid
 *
 * @param firebaseUser - The Firebase Auth user object
 * @returns Object containing the user profile, new user flag, and session expiry status
 */
export async function ensureUserProfile(
  firebaseUser: FirebaseUser
): Promise<{ user: User | null; isNewUser: boolean; sessionExpired: boolean }> {
  const existingUser = await getUserProfile(firebaseUser.uid)

  if (existingUser) {
    // Check if session has expired
    if (isSessionExpired(existingUser.lastActivityAt)) {
      return {
        user: null,
        isNewUser: false,
        sessionExpired: true,
      }
    }

    // Existing user with valid session - update timestamps and re-fetch
    await updateLastLogin(firebaseUser.uid)
    const updatedUser = await getUserProfile(firebaseUser.uid)
    return {
      user: updatedUser ?? existingUser,
      isNewUser: false,
      sessionExpired: false,
    }
  }

  // New user - create profile
  const newUser = await createUserProfile(firebaseUser)
  return {
    user: newUser,
    isNewUser: true,
    sessionExpired: false,
  }
}
