'use client'

/**
 * SafeAdultEncryptionService
 *
 * Story 7.5.4: Safe Adult Designation - Task 2
 *
 * Provides device-derived encryption for safe adult contact information.
 * Uses AES-GCM with PBKDF2-derived key.
 *
 * CRITICAL SAFETY REQUIREMENTS (INV-002):
 * - Key derivation is SEPARATE from family encryption
 * - Key derivation is SEPARATE from safety signal queue encryption
 * - Uses unique salt specific to safe adult designation
 * - No key material is shared with any family-accessible service
 *
 * Encryption Flow:
 * 1. Derive AES-256-GCM key from device fingerprint + unique safe adult salt
 * 2. Encrypt contact data with AES-GCM using random IV
 * 3. Combine IV + encrypted data for storage
 *
 * CRITICAL INVARIANT (INV-002): Safe adult contact NEVER visible to family.
 */

import type { SafeAdultContact, SafeAdultContactInput } from '@fledgely/contracts'

// ============================================================================
// Types
// ============================================================================

/**
 * Configuration for encryption service
 */
export interface SafeAdultEncryptionConfig {
  /** Enable verbose logging for debugging (NOT in production) */
  enableDebugLogging?: boolean
}

/**
 * Interface for safe adult encryption service
 */
export interface ISafeAdultEncryptionService {
  /** Encrypt a safe adult contact */
  encrypt: (contact: SafeAdultContactInput) => Promise<EncryptedSafeAdultContact>

  /** Decrypt a safe adult contact */
  decrypt: (encrypted: EncryptedSafeAdultContact) => Promise<SafeAdultContactInput>

  /** Get the key identifier (for storage reference) */
  getKeyId: () => Promise<string>
}

/**
 * Encrypted safe adult contact structure
 */
export interface EncryptedSafeAdultContact {
  /** Base64-encoded encrypted data (IV + ciphertext) */
  encryptedData: string
  /** Key identifier used for encryption */
  keyId: string
  /** Encryption algorithm identifier */
  algorithm: 'AES-GCM'
}

// ============================================================================
// Constants
// ============================================================================

/**
 * CRITICAL: These constants MUST differ from SafetySignalQueueService
 * to ensure cryptographic isolation of safe adult data.
 */
const SAFE_ADULT_KEY_MATERIAL_PREFIX = 'fledgely-safe-adult-designation'
const SAFE_ADULT_SALT = 'fledgely-safe-adult-salt-v1-isolated'
const PBKDF2_ITERATIONS = 100000 // TODO(Story 7.5.6): Increase to 310000 for OWASP compliance
const AES_KEY_LENGTH = 256 // bits
const AES_IV_LENGTH = 12 // bytes (96 bits for GCM)

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Convert ArrayBuffer to base64 string
 */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

/**
 * Convert base64 string to ArrayBuffer
 */
function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes.buffer
}

/**
 * Convert ArrayBuffer to hex string
 */
function arrayBufferToHex(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

// ============================================================================
// SafeAdultEncryptionService
// ============================================================================

/**
 * Service for encrypting safe adult contact information
 *
 * Uses device-derived key that is cryptographically isolated from:
 * - Family encryption keys
 * - Safety signal queue encryption keys
 *
 * @example
 * ```ts
 * const encryptionService = new SafeAdultEncryptionService()
 *
 * // Encrypt contact
 * const encrypted = await encryptionService.encrypt({
 *   type: 'phone',
 *   value: '5551234567'
 * })
 *
 * // Decrypt contact
 * const contact = await encryptionService.decrypt(encrypted)
 * ```
 */
export class SafeAdultEncryptionService implements ISafeAdultEncryptionService {
  private readonly enableDebugLogging: boolean
  private cachedKey: CryptoKey | null = null
  private cachedKeyId: string | null = null

  constructor(config?: SafeAdultEncryptionConfig) {
    this.enableDebugLogging = config?.enableDebugLogging ?? false
  }

  /**
   * Encrypt a safe adult contact
   *
   * @param contact - The contact input to encrypt
   * @returns Encrypted contact structure
   */
  async encrypt(contact: SafeAdultContactInput): Promise<EncryptedSafeAdultContact> {
    const key = await this.deriveKey()
    const keyId = await this.getKeyId()

    // Serialize contact to JSON
    const encoder = new TextEncoder()
    const data = encoder.encode(JSON.stringify(contact))

    // Generate random IV
    const iv = crypto.getRandomValues(new Uint8Array(AES_IV_LENGTH))

    // Encrypt with AES-GCM
    const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, data)

    // Combine IV + encrypted data
    const combined = new Uint8Array(iv.length + encrypted.byteLength)
    combined.set(iv)
    combined.set(new Uint8Array(encrypted), iv.length)

    this.debugLog('Contact encrypted', { keyId, dataLength: combined.length })

    return {
      encryptedData: arrayBufferToBase64(combined.buffer),
      keyId,
      algorithm: 'AES-GCM',
    }
  }

  /**
   * Decrypt a safe adult contact
   *
   * @param encrypted - The encrypted contact structure
   * @returns Decrypted contact input
   */
  async decrypt(encrypted: EncryptedSafeAdultContact): Promise<SafeAdultContactInput> {
    const key = await this.deriveKey()

    // Decode combined data
    const combined = new Uint8Array(base64ToArrayBuffer(encrypted.encryptedData))

    // Extract IV and ciphertext
    const iv = combined.slice(0, AES_IV_LENGTH)
    const ciphertext = combined.slice(AES_IV_LENGTH)

    // Decrypt with AES-GCM
    const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext)

    // Parse JSON
    const decoder = new TextDecoder()
    const json = JSON.parse(decoder.decode(decrypted))

    this.debugLog('Contact decrypted', { type: json.type })

    return json as SafeAdultContactInput
  }

  /**
   * Get the key identifier for this device
   *
   * Used to identify which key was used for encryption.
   * The key ID is a hash of the key material, NOT the key itself.
   */
  async getKeyId(): Promise<string> {
    if (this.cachedKeyId) {
      return this.cachedKeyId
    }

    // Generate key ID from key material hash
    const keyMaterial = this.getKeyMaterial()
    const encoder = new TextEncoder()
    const data = encoder.encode(keyMaterial)
    const hash = await crypto.subtle.digest('SHA-256', data)

    // Use first 16 bytes (32 hex chars) as key ID
    this.cachedKeyId = arrayBufferToHex(hash).slice(0, 32)
    return this.cachedKeyId
  }

  /**
   * Derive encryption key from device fingerprint
   *
   * CRITICAL: This uses a DIFFERENT key derivation than SafetySignalQueueService
   * to ensure cryptographic isolation.
   */
  private async deriveKey(): Promise<CryptoKey> {
    if (this.cachedKey) {
      return this.cachedKey
    }

    const keyMaterial = this.getKeyMaterial()
    const encoder = new TextEncoder()
    const data = encoder.encode(keyMaterial)

    // Import key material for PBKDF2
    const importedKey = await crypto.subtle.importKey('raw', data, 'PBKDF2', false, ['deriveKey'])

    // Derive AES-GCM key
    this.cachedKey = await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: encoder.encode(SAFE_ADULT_SALT),
        iterations: PBKDF2_ITERATIONS,
        hash: 'SHA-256',
      },
      importedKey,
      { name: 'AES-GCM', length: AES_KEY_LENGTH },
      false, // NOT extractable
      ['encrypt', 'decrypt']
    )

    return this.cachedKey
  }

  /**
   * Get key material for derivation
   *
   * CRITICAL: This MUST use different material than SafetySignalQueueService
   */
  private getKeyMaterial(): string {
    // Use device fingerprint + safe-adult-specific prefix
    // This ensures isolation from safety signal queue encryption
    return `${SAFE_ADULT_KEY_MATERIAL_PREFIX}-${navigator.userAgent}-${location.origin}`
  }

  /**
   * Debug logging (only when enabled)
   */
  private debugLog(message: string, data?: Record<string, unknown>): void {
    if (this.enableDebugLogging) {
      console.log(`[SafeAdultEncryptionService] ${message}`, data ?? '')
    }
  }

  /**
   * Clear cached key (for testing)
   */
  clearCache(): void {
    this.cachedKey = null
    this.cachedKeyId = null
  }
}

// ============================================================================
// Mock Encryption Service (for testing)
// ============================================================================

/**
 * Mock encryption service for development and testing
 *
 * Does NOT provide real encryption - only simulates the interface.
 * Use SafeAdultEncryptionService in production.
 */
export class MockSafeAdultEncryptionService implements ISafeAdultEncryptionService {
  private shouldFail = false
  private failureMessage = 'Mock encryption failure'
  private keyId = 'mock-key-id-12345678901234567890'

  /**
   * Configure mock to fail
   */
  setFailure(shouldFail: boolean, message?: string): void {
    this.shouldFail = shouldFail
    if (message) this.failureMessage = message
  }

  /**
   * Set mock key ID
   */
  setKeyId(keyId: string): void {
    this.keyId = keyId
  }

  async encrypt(contact: SafeAdultContactInput): Promise<EncryptedSafeAdultContact> {
    if (this.shouldFail) {
      throw new SafeAdultEncryptionError(this.failureMessage)
    }

    // Mock: Just base64 encode the contact (NOT secure - for testing only)
    const json = JSON.stringify(contact)
    const encoder = new TextEncoder()
    const data = encoder.encode(json)

    // Simulate IV prefix
    const mockIv = new Uint8Array(12).fill(0)
    const combined = new Uint8Array(mockIv.length + data.length)
    combined.set(mockIv)
    combined.set(data, mockIv.length)

    return {
      encryptedData: arrayBufferToBase64(combined.buffer),
      keyId: this.keyId,
      algorithm: 'AES-GCM',
    }
  }

  async decrypt(encrypted: EncryptedSafeAdultContact): Promise<SafeAdultContactInput> {
    if (this.shouldFail) {
      throw new SafeAdultEncryptionError(this.failureMessage)
    }

    // Mock: Just base64 decode (skip mock IV)
    const combined = new Uint8Array(base64ToArrayBuffer(encrypted.encryptedData))
    const data = combined.slice(12) // Skip mock IV

    const decoder = new TextDecoder()
    return JSON.parse(decoder.decode(data)) as SafeAdultContactInput
  }

  async getKeyId(): Promise<string> {
    return this.keyId
  }
}

/**
 * Custom error class for encryption failures
 */
export class SafeAdultEncryptionError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'SafeAdultEncryptionError'
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create a production encryption service
 */
export function createSafeAdultEncryptionService(
  config?: SafeAdultEncryptionConfig
): ISafeAdultEncryptionService {
  return new SafeAdultEncryptionService(config)
}

/**
 * Create a mock encryption service for testing
 */
export function createMockSafeAdultEncryptionService(): MockSafeAdultEncryptionService {
  return new MockSafeAdultEncryptionService()
}

// ============================================================================
// Singleton Instance
// ============================================================================

let instance: ISafeAdultEncryptionService | null = null

/**
 * Get the singleton encryption service instance
 *
 * @param useMock - Use mock service instead of real encryption
 */
export function getSafeAdultEncryptionService(useMock = false): ISafeAdultEncryptionService {
  if (!instance) {
    instance = useMock ? createMockSafeAdultEncryptionService() : createSafeAdultEncryptionService()
  }
  return instance
}

/**
 * Reset the singleton instance (for testing)
 */
export function resetSafeAdultEncryptionService(): void {
  instance = null
}
