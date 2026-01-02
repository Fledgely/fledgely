/**
 * SafeAdultEncryptionService - Story 7.5.4 Task 4
 *
 * Service for isolated encryption of safe adult data.
 * AC4: Safe adult data isolation
 *
 * CRITICAL SAFETY:
 * - Keys stored in ISOLATED Firestore collection (not family-accessible)
 * - Key ID in safe adult record, actual key in isolated storage
 * - Decryption only available to system services, not client
 * - Separate from family encryption key
 */

import { getFirestore, doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore'
import { generateEncryptionKeyId } from '../contracts/safeAdult'

// ============================================
// Constants
// ============================================

/**
 * Firestore collection for safe adult encryption keys.
 * CRITICAL: This collection is ISOLATED from family data.
 */
const ENCRYPTION_KEYS_COLLECTION = 'safeAdultEncryptionKeys'

// ============================================
// Types
// ============================================

export interface SafeAdultEncryptionKey {
  keyId: string
  childId: string
  keyData: string // Base64 encoded key material
  createdAt: Date
}

export interface SafeAdultContactData {
  phone?: string
  email?: string
  displayName: string
}

// ============================================
// Firestore Helpers
// ============================================

function getKeyDocRef(keyId: string) {
  const db = getFirestore()
  return doc(db, ENCRYPTION_KEYS_COLLECTION, keyId)
}

// ============================================
// Key Management Functions
// ============================================

/**
 * Generate isolated encryption key for safe adult data.
 *
 * AC4: Key stored in isolated collection, not family-accessible.
 *
 * @param childId - The child's ID (for audit/cleanup purposes only)
 * @returns Key ID
 */
export async function generateSafeAdultEncryptionKey(childId: string): Promise<{ keyId: string }> {
  if (!childId || childId.trim().length === 0) {
    throw new Error('childId is required')
  }

  // Generate cryptographically secure key
  const keyBuffer = await crypto.subtle.generateKey(
    {
      name: 'AES-GCM',
      length: 256,
    },
    true, // extractable
    ['encrypt', 'decrypt']
  )

  // Export key to raw format
  const rawKey = await crypto.subtle.exportKey('raw', keyBuffer)
  const keyData = bufferToBase64(rawKey)

  // Generate unique key ID
  const keyId = generateEncryptionKeyId()

  // Store key in isolated collection
  // CRITICAL: No familyId reference - completely isolated
  const keyRecord: SafeAdultEncryptionKey = {
    keyId,
    childId, // Only for audit/cleanup, NOT for access control
    keyData,
    createdAt: new Date(),
  }

  const docRef = getKeyDocRef(keyId)
  await setDoc(docRef, keyRecord)

  return { keyId }
}

/**
 * Get encryption key by ID.
 *
 * @param keyId - The key ID
 * @returns Key record or null
 */
export async function getSafeAdultEncryptionKey(
  keyId: string
): Promise<SafeAdultEncryptionKey | null> {
  if (!keyId || keyId.trim().length === 0) {
    throw new Error('keyId is required')
  }

  const docRef = getKeyDocRef(keyId)
  const snapshot = await getDoc(docRef)

  if (!snapshot.exists()) {
    return null
  }

  const data = snapshot.data()
  return {
    keyId: data.keyId,
    childId: data.childId,
    keyData: data.keyData,
    createdAt:
      data.createdAt instanceof Date ? data.createdAt : data.createdAt?.toDate?.() || new Date(),
  }
}

/**
 * Delete encryption key.
 *
 * @param keyId - The key ID
 */
export async function deleteSafeAdultEncryptionKey(keyId: string): Promise<void> {
  if (!keyId || keyId.trim().length === 0) {
    throw new Error('keyId is required')
  }

  const docRef = getKeyDocRef(keyId)
  const snapshot = await getDoc(docRef)

  if (!snapshot.exists()) {
    return // No-op if doesn't exist
  }

  await deleteDoc(docRef)
}

// ============================================
// Data Encryption Functions
// ============================================

/**
 * Encrypt safe adult contact data.
 *
 * AC4: Data encrypted with isolated key.
 *
 * @param data - Contact data to encrypt
 * @param keyId - Key ID to use
 * @returns Encrypted data as base64 string
 */
export async function encryptSafeAdultData(
  data: SafeAdultContactData,
  keyId: string
): Promise<string> {
  if (!keyId || keyId.trim().length === 0) {
    throw new Error('keyId is required')
  }

  // Get key from storage
  const keyRecord = await getSafeAdultEncryptionKey(keyId)
  if (!keyRecord) {
    throw new Error('Encryption key not found')
  }

  // Import key
  const keyBuffer = base64ToBuffer(keyRecord.keyData)
  const cryptoKey = await crypto.subtle.importKey('raw', keyBuffer, { name: 'AES-GCM' }, false, [
    'encrypt',
  ])

  // Generate random IV
  const iv = crypto.getRandomValues(new Uint8Array(12))

  // Encrypt data
  const plaintext = new TextEncoder().encode(JSON.stringify(data))
  const ciphertext = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv,
    },
    cryptoKey,
    plaintext
  )

  // Combine IV and ciphertext
  const combined = new Uint8Array(iv.length + new Uint8Array(ciphertext).length)
  combined.set(iv)
  combined.set(new Uint8Array(ciphertext), iv.length)

  return bufferToBase64(combined.buffer)
}

/**
 * Decrypt safe adult contact data.
 *
 * AC4: Decryption only for system services, not client.
 *
 * @param encryptedData - Base64 encoded encrypted data
 * @param keyId - Key ID to use
 * @returns Decrypted contact data
 */
export async function decryptSafeAdultData(
  encryptedData: string,
  keyId: string
): Promise<SafeAdultContactData> {
  if (!encryptedData || encryptedData.trim().length === 0) {
    throw new Error('Encrypted data is required')
  }
  if (!keyId || keyId.trim().length === 0) {
    throw new Error('keyId is required')
  }

  // Get key from storage
  const keyRecord = await getSafeAdultEncryptionKey(keyId)
  if (!keyRecord) {
    throw new Error('Encryption key not found')
  }

  // Import key
  const keyBuffer = base64ToBuffer(keyRecord.keyData)
  const cryptoKey = await crypto.subtle.importKey('raw', keyBuffer, { name: 'AES-GCM' }, false, [
    'decrypt',
  ])

  // Split IV and ciphertext
  const combined = new Uint8Array(base64ToBuffer(encryptedData))
  const iv = combined.slice(0, 12)
  const ciphertext = combined.slice(12)

  // Decrypt data
  const plaintext = await crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv,
    },
    cryptoKey,
    ciphertext
  )

  return JSON.parse(new TextDecoder().decode(plaintext))
}

// ============================================
// Isolation Verification Functions
// ============================================

/**
 * Verify key is isolated from family access.
 *
 * AC4: Key must NOT have any family-accessible references.
 *
 * @param keyId - Key ID to verify
 * @param familyId - Family ID to check against
 * @returns True if properly isolated
 */
export async function verifyKeyIsolation(keyId: string, _familyId: string): Promise<boolean> {
  const docRef = getKeyDocRef(keyId)
  const snapshot = await getDoc(docRef)

  if (!snapshot.exists()) {
    return true // Key doesn't exist, nothing to leak
  }

  const data = snapshot.data()

  // Check for any family reference (SHOULD NOT EXIST)
  if (data.familyId) {
    return false // Key incorrectly references family
  }

  return true // Properly isolated
}

/**
 * Check if key is accessible to family.
 *
 * CRITICAL: Should ALWAYS return false for properly configured keys.
 *
 * @param keyId - Key ID to check
 * @param familyId - Family ID to check against
 * @returns True if accessible (BAD), false if isolated (GOOD)
 */
export async function isKeyAccessibleToFamily(keyId: string, familyId: string): Promise<boolean> {
  const docRef = getKeyDocRef(keyId)
  const snapshot = await getDoc(docRef)

  if (!snapshot.exists()) {
    return false // Key doesn't exist
  }

  const data = snapshot.data()

  // If key has familyId reference, it's accessible (BAD)
  if (data.familyId === familyId) {
    return true
  }

  return false // Properly isolated
}

// ============================================
// Helper Functions
// ============================================

/**
 * Derive a deterministic key identifier from an ID.
 * Used for consistent hashing when needed.
 *
 * @param id - Source ID
 * @returns Derived key string
 */
export function deriveKeyFromId(id: string): string {
  if (!id || id.trim().length === 0) {
    throw new Error('id is required')
  }

  // Simple hash for deterministic derivation
  let hash = 0
  for (let i = 0; i < id.length; i++) {
    const char = id.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash = hash & hash // Convert to 32-bit integer
  }

  return `derived_${Math.abs(hash).toString(36)}`
}

/**
 * Convert ArrayBuffer to base64 string.
 */
function bufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

/**
 * Convert base64 string to ArrayBuffer.
 */
function base64ToBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes.buffer
}
