/**
 * Enrollment Service - Story 12.1
 *
 * Manages device enrollment tokens for QR code-based device registration.
 * Tokens are stored in Firestore and expire after 15 minutes for security.
 *
 * Requirements:
 * - FR7: Device enrollment
 * - FR11: QR code-based enrollment
 * - FR12: Family-device association
 * - NFR42: Security - token expiry prevents replay attacks
 */

import {
  collection,
  doc,
  setDoc,
  query,
  where,
  getDocs,
  updateDoc,
  Timestamp,
} from 'firebase/firestore'
import { getFirestoreDb } from '../lib/firebase'

/**
 * QR Code payload structure for device enrollment
 */
export interface EnrollmentPayload {
  familyId: string // Family to enroll into
  token: string // One-time enrollment token
  expiry: number // Unix timestamp when token expires
  version: number // Payload version for future compatibility
}

/**
 * Firestore enrollment token document structure
 */
export interface EnrollmentToken {
  token: string // The actual token value
  createdAt: Timestamp // When the token was created
  expiresAt: Timestamp // 15 minutes from creation
  createdBy: string // UID of parent who generated
  status: 'active' | 'used' | 'expired'
  deviceType: 'chromebook'
}

/** Token expiry time in milliseconds (15 minutes) */
const TOKEN_EXPIRY_MS = 15 * 60 * 1000

/** Current payload version */
const PAYLOAD_VERSION = 1

/**
 * Generates a cryptographically secure enrollment token
 * and stores it in Firestore.
 *
 * Only one active token per family is allowed at a time.
 * Any existing active tokens are invalidated.
 *
 * @param familyId - The family ID to generate token for
 * @param userId - The UID of the parent generating the token
 * @returns The enrollment payload for QR code encoding
 */
export async function generateEnrollmentToken(
  familyId: string,
  userId: string
): Promise<EnrollmentPayload> {
  // Input validation
  if (!familyId || typeof familyId !== 'string') {
    throw new Error('familyId is required and must be a string')
  }
  if (!userId || typeof userId !== 'string') {
    throw new Error('userId is required and must be a string')
  }

  // Task 1.6: Invalidate any existing active tokens for this family
  await invalidateExistingTokens(familyId)

  // Task 1.3: Generate cryptographically secure token
  const token = crypto.randomUUID()

  // Calculate expiry timestamp
  const now = Date.now()
  const expiresAt = new Date(now + TOKEN_EXPIRY_MS)

  // Task 1.4: Store token in Firestore
  const db = getFirestoreDb()
  const tokenRef = doc(collection(db, 'families', familyId, 'enrollmentTokens'))
  const tokenData: EnrollmentToken = {
    token,
    createdAt: Timestamp.now(),
    expiresAt: Timestamp.fromDate(expiresAt),
    createdBy: userId,
    status: 'active',
    deviceType: 'chromebook',
  }

  await setDoc(tokenRef, tokenData)

  // Return payload for QR code
  const payload: EnrollmentPayload = {
    familyId,
    token,
    expiry: expiresAt.getTime(),
    version: PAYLOAD_VERSION,
  }

  return payload
}

/**
 * Invalidates all active enrollment tokens for a family.
 * Called before generating a new token to ensure only one active token exists.
 *
 * @param familyId - The family ID to invalidate tokens for
 */
async function invalidateExistingTokens(familyId: string): Promise<void> {
  const db = getFirestoreDb()
  const tokensRef = collection(db, 'families', familyId, 'enrollmentTokens')
  const activeTokensQuery = query(tokensRef, where('status', '==', 'active'))

  const snapshot = await getDocs(activeTokensQuery)

  const updatePromises = snapshot.docs.map((tokenDoc) =>
    updateDoc(tokenDoc.ref, { status: 'expired' })
  )

  await Promise.all(updatePromises)
}

/**
 * Checks if an enrollment token is still valid (not expired and not used).
 *
 * @param familyId - The family ID the token belongs to
 * @param token - The token value to validate
 * @returns True if the token is valid, false otherwise
 */
export async function validateEnrollmentToken(familyId: string, token: string): Promise<boolean> {
  const db = getFirestoreDb()
  const tokensRef = collection(db, 'families', familyId, 'enrollmentTokens')
  const tokenQuery = query(tokensRef, where('token', '==', token), where('status', '==', 'active'))

  const snapshot = await getDocs(tokenQuery)

  if (snapshot.empty) {
    return false
  }

  const tokenDoc = snapshot.docs[0]
  const tokenData = tokenDoc.data() as EnrollmentToken

  // Check if token has expired
  const now = Date.now()
  const expiresAt = tokenData.expiresAt.toMillis()

  if (now > expiresAt) {
    // Mark as expired
    await updateDoc(tokenDoc.ref, { status: 'expired' })
    return false
  }

  return true
}

/**
 * Marks an enrollment token as used after successful device enrollment.
 *
 * @param familyId - The family ID the token belongs to
 * @param token - The token value to mark as used
 */
export async function markTokenAsUsed(familyId: string, token: string): Promise<void> {
  const db = getFirestoreDb()
  const tokensRef = collection(db, 'families', familyId, 'enrollmentTokens')
  const tokenQuery = query(tokensRef, where('token', '==', token))

  const snapshot = await getDocs(tokenQuery)

  if (!snapshot.empty) {
    await updateDoc(snapshot.docs[0].ref, { status: 'used' })
  }
}

/**
 * Calculates time remaining until token expiry.
 *
 * @param expiryTimestamp - Unix timestamp of token expiry
 * @returns Time remaining in milliseconds, or 0 if expired
 */
export function getTimeRemaining(expiryTimestamp: number): number {
  const remaining = expiryTimestamp - Date.now()
  return Math.max(0, remaining)
}

/**
 * Formats time remaining in a human-readable format (MM:SS).
 *
 * @param milliseconds - Time remaining in milliseconds
 * @returns Formatted time string
 */
export function formatTimeRemaining(milliseconds: number): string {
  const totalSeconds = Math.floor(milliseconds / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}
