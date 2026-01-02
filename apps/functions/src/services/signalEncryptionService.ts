/**
 * Signal Encryption Service - Story 7.5.2 Task 5
 *
 * Encryption layer for signal payloads.
 * AC4: Signal is encrypted in transit and at rest
 *
 * Security Requirements:
 * - Use AES-256-GCM for symmetric encryption
 * - Use RSA-OAEP for key exchange
 * - Partner public keys stored encrypted in Firestore
 * - Private keys in Secret Manager (not code)
 * - No plaintext logging of encrypted content
 */

import * as crypto from 'crypto'
import type { SignalRoutingPayload } from '@fledgely/shared'

// ============================================
// Constants
// ============================================

/** Symmetric encryption algorithm */
export const ENCRYPTION_ALGORITHM = 'aes-256-gcm'

/** Key size in bits */
export const KEY_SIZE_BITS = 256

/** Key size in bytes */
export const KEY_SIZE_BYTES = KEY_SIZE_BITS / 8

/** IV size in bytes (12 bytes recommended for GCM) */
export const IV_SIZE_BYTES = 12

/** Auth tag size in bytes */
export const AUTH_TAG_SIZE_BYTES = 16

/** RSA key size for asymmetric encryption */
export const RSA_KEY_SIZE_BITS = 2048

// ============================================
// Types
// ============================================

/**
 * Encrypted payload structure.
 */
export interface EncryptedPayload {
  /** Base64-encoded encrypted data */
  encryptedData: string
  /** Base64-encoded encrypted symmetric key (encrypted with partner public key) */
  encryptedKey: string
  /** Base64-encoded initialization vector */
  iv: string
  /** Base64-encoded authentication tag */
  authTag: string
  /** Encryption algorithm used */
  algorithm: string
}

/**
 * RSA key pair for partner communication.
 */
export interface KeyPair {
  publicKey: string
  privateKey: string
}

/**
 * Key pair validation result.
 */
export interface KeyPairValidationResult {
  valid: boolean
  error?: string
}

// ============================================
// Key Generation
// ============================================

/**
 * Generate an RSA key pair for partner communication.
 *
 * In production, the private key should be stored in Secret Manager.
 *
 * @returns RSA key pair
 */
export function generatePartnerKeyPair(): KeyPair {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: RSA_KEY_SIZE_BITS,
    publicKeyEncoding: {
      type: 'spki',
      format: 'pem',
    },
    privateKeyEncoding: {
      type: 'pkcs8',
      format: 'pem',
    },
  })

  return { publicKey, privateKey }
}

/**
 * Validate a key pair.
 *
 * @param keyPair - Key pair to validate
 * @returns Validation result
 */
export function validateKeyPair(keyPair: KeyPair): KeyPairValidationResult {
  if (!keyPair.publicKey) {
    return { valid: false, error: 'Missing public key' }
  }

  if (!keyPair.privateKey) {
    return { valid: false, error: 'Missing private key' }
  }

  try {
    // Try to create key objects to validate format
    crypto.createPublicKey(keyPair.publicKey)
    crypto.createPrivateKey(keyPair.privateKey)
    return { valid: true }
  } catch {
    return { valid: false, error: 'Invalid key format' }
  }
}

/**
 * Derive a symmetric encryption key from a shared secret.
 *
 * @param sharedSecret - Shared secret string
 * @returns 32-byte key buffer
 */
export function deriveEncryptionKey(sharedSecret: string): Buffer {
  // Use HKDF-like derivation with SHA-256
  return crypto.createHash('sha256').update(sharedSecret).digest()
}

// ============================================
// Encryption Functions
// ============================================

/**
 * Encrypt a signal routing payload for a partner.
 *
 * AC4: Signal is encrypted in transit.
 *
 * Uses hybrid encryption:
 * 1. Generate random AES-256-GCM key
 * 2. Encrypt payload with AES key
 * 3. Encrypt AES key with partner's RSA public key
 *
 * CRITICAL: No plaintext logging of payload contents.
 *
 * @param payload - Signal routing payload
 * @param partnerPublicKey - Partner's RSA public key (PEM format)
 * @returns Encrypted payload
 */
export function encryptPayloadForPartner(
  payload: SignalRoutingPayload,
  partnerPublicKey: string
): EncryptedPayload {
  // Validate public key
  let publicKeyObject: crypto.KeyObject
  try {
    publicKeyObject = crypto.createPublicKey(partnerPublicKey)
  } catch {
    throw new Error('Invalid partner public key')
  }

  // Generate random symmetric key
  const symmetricKey = crypto.randomBytes(KEY_SIZE_BYTES)

  // Generate random IV
  const iv = crypto.randomBytes(IV_SIZE_BYTES)

  // Serialize payload to JSON
  const plaintext = JSON.stringify(payload)

  // Encrypt payload with AES-256-GCM
  const cipher = crypto.createCipheriv(ENCRYPTION_ALGORITHM, symmetricKey, iv)
  let encryptedData = cipher.update(plaintext, 'utf8', 'base64')
  encryptedData += cipher.final('base64')
  const authTag = cipher.getAuthTag()

  // Encrypt symmetric key with RSA-OAEP
  const encryptedKey = crypto.publicEncrypt(
    {
      key: publicKeyObject,
      padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
      oaepHash: 'sha256',
    },
    symmetricKey
  )

  return {
    encryptedData,
    encryptedKey: encryptedKey.toString('base64'),
    iv: iv.toString('base64'),
    authTag: authTag.toString('base64'),
    algorithm: ENCRYPTION_ALGORITHM,
  }
}

/**
 * Decrypt a partner response.
 *
 * Used to decrypt acknowledgment data from partners if they use encryption.
 *
 * @param encrypted - Encrypted payload
 * @param privateKey - Our RSA private key (PEM format)
 * @returns Decrypted payload
 */
export function decryptPartnerResponse(
  encrypted: EncryptedPayload,
  privateKey: string
): SignalRoutingPayload {
  // Validate required fields
  if (!encrypted.encryptedData || !encrypted.encryptedKey || !encrypted.iv || !encrypted.authTag) {
    throw new Error('Invalid encrypted payload: missing required fields')
  }

  // Validate private key
  let privateKeyObject: crypto.KeyObject
  try {
    privateKeyObject = crypto.createPrivateKey(privateKey)
  } catch {
    throw new Error('Invalid private key')
  }

  // Decrypt symmetric key with RSA-OAEP
  let symmetricKey: Buffer
  try {
    symmetricKey = crypto.privateDecrypt(
      {
        key: privateKeyObject,
        padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
        oaepHash: 'sha256',
      },
      Buffer.from(encrypted.encryptedKey, 'base64')
    )
  } catch {
    throw new Error('Failed to decrypt symmetric key: wrong private key or corrupted data')
  }

  // Decode IV and auth tag
  const iv = Buffer.from(encrypted.iv, 'base64')
  const authTag = Buffer.from(encrypted.authTag, 'base64')

  // Decrypt payload with AES-256-GCM
  try {
    const decipher = crypto.createDecipheriv(ENCRYPTION_ALGORITHM, symmetricKey, iv)
    decipher.setAuthTag(authTag)

    let decrypted = decipher.update(encrypted.encryptedData, 'base64', 'utf8')
    decrypted += decipher.final('utf8')

    // Parse JSON and return
    const parsed = JSON.parse(decrypted)

    // Restore Date object for signalTimestamp
    if (parsed.signalTimestamp) {
      parsed.signalTimestamp = new Date(parsed.signalTimestamp)
    }

    return parsed as SignalRoutingPayload
  } catch {
    throw new Error('Failed to decrypt payload: tampered data or invalid auth tag')
  }
}
