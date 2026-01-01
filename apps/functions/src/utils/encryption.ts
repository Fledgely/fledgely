/**
 * Token Encryption Utilities - Story 33.4
 *
 * Shared encryption utilities for secure token storage.
 * Uses AES-256-GCM for authenticated encryption.
 */

import * as crypto from 'crypto'

const ENCRYPTION_ALGORITHM = 'aes-256-gcm'

/**
 * Encrypt sensitive data (tokens) before storing in Firestore
 * Uses AES-256-GCM for authenticated encryption
 */
export function encryptToken(plaintext: string, encryptionKey: string): string {
  // Derive a 32-byte key from the secret
  const key = crypto.createHash('sha256').update(encryptionKey).digest()
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv(ENCRYPTION_ALGORITHM, key, iv)

  let encrypted = cipher.update(plaintext, 'utf8', 'hex')
  encrypted += cipher.final('hex')

  const authTag = cipher.getAuthTag()

  // Combine iv + authTag + encrypted data
  return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted
}

/**
 * Decrypt sensitive data (tokens) from Firestore
 */
export function decryptToken(encryptedData: string, encryptionKey: string): string {
  const parts = encryptedData.split(':')
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted data format')
  }

  const [ivHex, authTagHex, encrypted] = parts
  const key = crypto.createHash('sha256').update(encryptionKey).digest()
  const iv = Buffer.from(ivHex, 'hex')
  const authTag = Buffer.from(authTagHex, 'hex')

  const decipher = crypto.createDecipheriv(ENCRYPTION_ALGORITHM, key, iv)
  decipher.setAuthTag(authTag)

  let decrypted = decipher.update(encrypted, 'hex', 'utf8')
  decrypted += decipher.final('utf8')

  return decrypted
}
