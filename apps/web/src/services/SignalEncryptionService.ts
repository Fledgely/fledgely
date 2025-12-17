'use client'

/**
 * SignalEncryptionService
 *
 * Story 7.5.2: External Signal Routing - Task 4
 *
 * Provides hybrid encryption (RSA-OAEP + AES-GCM) for signal payloads
 * sent to external crisis partners.
 *
 * Encryption Flow:
 * 1. Generate random 256-bit AES key
 * 2. Encrypt payload with AES-GCM using random IV
 * 3. Encrypt AES key with partner's RSA public key (RSA-OAEP)
 * 4. Package encrypted key, encrypted payload, and IV
 *
 * CRITICAL SAFETY REQUIREMENTS:
 * - Use only cryptographically secure random sources
 * - Keys never logged or exposed
 * - Encryption happens in isolated service
 *
 * CRITICAL INVARIANT (INV-002): Safety signals NEVER visible to family.
 */

import {
  type ExternalSignalPayload,
  type CrisisPartnerConfig,
  type EncryptedSignalPackage,
} from '@fledgely/contracts'

// ============================================================================
// Types
// ============================================================================

/**
 * Configuration for encryption service
 */
export interface EncryptionServiceConfig {
  /** Enable verbose logging for debugging (NOT in production) */
  enableDebugLogging?: boolean
}

/**
 * Interface for encryption service
 */
export interface ISignalEncryptionService {
  /** Encrypt payload for a specific partner */
  encryptForPartner: (
    payload: ExternalSignalPayload,
    partner: CrisisPartnerConfig
  ) => Promise<EncryptedSignalPackage>

  /** Verify a partner's public key is valid and not expired */
  verifyPartnerKey: (partner: CrisisPartnerConfig) => Promise<boolean>

  /** Compute hash of partner's public key */
  computePublicKeyHash: (publicKey: string) => Promise<string>
}

// ============================================================================
// Constants
// ============================================================================

const AES_KEY_LENGTH = 256 // bits
const AES_IV_LENGTH = 12 // bytes (96 bits for GCM)
const RSA_ALGORITHM = 'RSA-OAEP'
const AES_ALGORITHM = 'AES-GCM'

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
 * Convert hex string to ArrayBuffer
 */
function hexToArrayBuffer(hex: string): ArrayBuffer {
  const bytes = new Uint8Array(hex.length / 2)
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16)
  }
  return bytes.buffer
}

/**
 * Convert ArrayBuffer to hex string
 */
function arrayBufferToHex(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

/**
 * Parse PEM public key to ArrayBuffer
 */
function pemToArrayBuffer(pem: string): ArrayBuffer {
  // Remove PEM header/footer and whitespace
  const pemContents = pem
    .replace(/-----BEGIN [A-Z ]+-----/, '')
    .replace(/-----END [A-Z ]+-----/, '')
    .replace(/\s+/g, '')

  return base64ToArrayBuffer(pemContents)
}

/**
 * Import RSA public key from PEM
 */
async function importRsaPublicKey(pem: string): Promise<CryptoKey> {
  const keyData = pemToArrayBuffer(pem)

  return crypto.subtle.importKey(
    'spki',
    keyData,
    {
      name: RSA_ALGORITHM,
      hash: 'SHA-256',
    },
    false, // not extractable
    ['encrypt']
  )
}

/**
 * Generate cryptographically secure random bytes
 */
function generateRandomBytes(length: number): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(length))
}

/**
 * Generate AES-256 key
 */
async function generateAesKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey(
    {
      name: AES_ALGORITHM,
      length: AES_KEY_LENGTH,
    },
    true, // extractable (needed for RSA encryption)
    ['encrypt']
  )
}

/**
 * Export raw AES key bytes
 */
async function exportAesKey(key: CryptoKey): Promise<ArrayBuffer> {
  return crypto.subtle.exportKey('raw', key)
}

// ============================================================================
// SignalEncryptionService
// ============================================================================

/**
 * Service for encrypting signal payloads using hybrid encryption
 *
 * Uses RSA-OAEP to encrypt an AES-256 key, and AES-GCM to encrypt the payload.
 * This provides both confidentiality and integrity.
 *
 * @example
 * ```ts
 * const encryptionService = new SignalEncryptionService()
 *
 * // Encrypt payload for partner
 * const encrypted = await encryptionService.encryptForPartner(
 *   payload,
 *   partnerConfig
 * )
 * ```
 */
export class SignalEncryptionService implements ISignalEncryptionService {
  private readonly enableDebugLogging: boolean

  constructor(config?: EncryptionServiceConfig) {
    this.enableDebugLogging = config?.enableDebugLogging ?? false
  }

  /**
   * Encrypt payload for a specific crisis partner
   *
   * @param payload - The signal payload to encrypt
   * @param partner - Partner configuration with public key
   * @returns Encrypted package ready for delivery
   */
  async encryptForPartner(
    payload: ExternalSignalPayload,
    partner: CrisisPartnerConfig
  ): Promise<EncryptedSignalPackage> {
    // 1. Verify partner key before use
    if (partner.keyExpiresAt) {
      const expiresAt = new Date(partner.keyExpiresAt)
      if (expiresAt <= new Date()) {
        throw new EncryptionError('Partner key has expired')
      }
    }

    // 2. Compute public key hash for verification
    const publicKeyHash = await this.computePublicKeyHash(partner.publicKey)

    // 3. Import partner's RSA public key
    let rsaPublicKey: CryptoKey
    try {
      rsaPublicKey = await importRsaPublicKey(partner.publicKey)
    } catch (error) {
      throw new EncryptionError(
        `Invalid partner public key: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }

    // 4. Generate random AES-256 key
    const aesKey = await generateAesKey()

    // 5. Generate random IV for AES-GCM
    const iv = generateRandomBytes(AES_IV_LENGTH)

    // 6. Serialize payload to JSON
    const payloadJson = JSON.stringify(payload)
    const payloadBytes = new TextEncoder().encode(payloadJson)

    // 7. Encrypt payload with AES-GCM
    const encryptedPayloadBuffer = await crypto.subtle.encrypt(
      {
        name: AES_ALGORITHM,
        iv,
      },
      aesKey,
      payloadBytes
    )

    // 8. Export and encrypt AES key with RSA-OAEP
    const rawAesKey = await exportAesKey(aesKey)
    const encryptedKeyBuffer = await crypto.subtle.encrypt(
      {
        name: RSA_ALGORITHM,
      },
      rsaPublicKey,
      rawAesKey
    )

    // 9. Encode results as base64
    const encryptedKey = arrayBufferToBase64(encryptedKeyBuffer)
    const encryptedPayload = arrayBufferToBase64(encryptedPayloadBuffer)
    const ivBase64 = arrayBufferToBase64(iv.buffer)

    this.debugLog('Encryption complete', {
      partnerId: partner.partnerId,
      keyLength: encryptedKey.length,
      payloadLength: encryptedPayload.length,
    })

    return {
      encryptedKey,
      encryptedPayload,
      iv: ivBase64,
      keyAlgorithm: 'RSA-OAEP',
      payloadAlgorithm: 'AES-GCM',
      partnerId: partner.partnerId,
      publicKeyHash,
    }
  }

  /**
   * Verify a partner's public key is valid and not expired
   *
   * @param partner - Partner configuration to verify
   * @returns Whether the key is valid
   */
  async verifyPartnerKey(partner: CrisisPartnerConfig): Promise<boolean> {
    try {
      // Check expiration
      if (partner.keyExpiresAt) {
        const expiresAt = new Date(partner.keyExpiresAt)
        if (expiresAt <= new Date()) {
          return false
        }
      }

      // Try to import the key
      await importRsaPublicKey(partner.publicKey)
      return true
    } catch {
      return false
    }
  }

  /**
   * Compute SHA-256 hash of partner's public key
   *
   * Used for verification that the correct key is being used.
   *
   * @param publicKey - PEM-encoded public key
   * @returns Hex-encoded SHA-256 hash
   */
  async computePublicKeyHash(publicKey: string): Promise<string> {
    const keyBytes = new TextEncoder().encode(publicKey)
    const hashBuffer = await crypto.subtle.digest('SHA-256', keyBytes)
    return arrayBufferToHex(hashBuffer)
  }

  /**
   * Debug logging (only when enabled)
   */
  private debugLog(message: string, data?: Record<string, unknown>): void {
    if (this.enableDebugLogging) {
      console.log(`[SignalEncryptionService] ${message}`, data ?? '')
    }
  }
}

/**
 * Custom error class for encryption failures
 */
export class EncryptionError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'EncryptionError'
  }
}

// ============================================================================
// Mock Encryption Service (for testing/development)
// ============================================================================

/**
 * Mock encryption service for development and testing
 *
 * Does NOT provide real encryption - only simulates the interface.
 * Use SignalEncryptionService in production.
 */
export class MockSignalEncryptionService implements ISignalEncryptionService {
  private shouldFail = false
  private failureMessage = 'Mock encryption failure'

  /**
   * Configure mock to fail
   */
  setFailure(shouldFail: boolean, message?: string): void {
    this.shouldFail = shouldFail
    if (message) this.failureMessage = message
  }

  async encryptForPartner(
    payload: ExternalSignalPayload,
    partner: CrisisPartnerConfig
  ): Promise<EncryptedSignalPackage> {
    if (this.shouldFail) {
      throw new EncryptionError(this.failureMessage)
    }

    // Mock: Just base64 encode the payload (NOT secure - for dev only)
    const payloadJson = JSON.stringify(payload)
    const payloadBytes = new TextEncoder().encode(payloadJson)
    const base64Payload = btoa(String.fromCharCode(...payloadBytes))

    // Generate mock encrypted key
    const mockEncryptedKey = btoa('MOCK_AES_KEY_' + Date.now())

    // Generate mock IV (base64 of 12 bytes)
    const mockIv = btoa('MOCK_IV_12B!')

    // Mock public key hash
    const publicKeyHash = Array.from({ length: 32 })
      .map(() => Math.floor(Math.random() * 256).toString(16).padStart(2, '0'))
      .join('')

    return {
      encryptedKey: mockEncryptedKey.padEnd(100, '='),
      encryptedPayload: base64Payload,
      iv: mockIv,
      keyAlgorithm: 'RSA-OAEP',
      payloadAlgorithm: 'AES-GCM',
      partnerId: partner.partnerId,
      publicKeyHash,
    }
  }

  async verifyPartnerKey(partner: CrisisPartnerConfig): Promise<boolean> {
    if (this.shouldFail) return false

    // Check expiration
    if (partner.keyExpiresAt) {
      const expiresAt = new Date(partner.keyExpiresAt)
      if (expiresAt <= new Date()) {
        return false
      }
    }

    // Check key length (basic validation)
    return partner.publicKey.length >= 100
  }

  async computePublicKeyHash(publicKey: string): Promise<string> {
    // Generate deterministic-ish hash based on key length
    const seed = publicKey.length
    return Array.from({ length: 32 })
      .map((_, i) => ((seed * (i + 1)) % 256).toString(16).padStart(2, '0'))
      .join('')
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create a production encryption service
 */
export function createEncryptionService(
  config?: EncryptionServiceConfig
): ISignalEncryptionService {
  return new SignalEncryptionService(config)
}

/**
 * Create a mock encryption service for testing
 */
export function createMockEncryptionService(): MockSignalEncryptionService {
  return new MockSignalEncryptionService()
}

// ============================================================================
// Singleton Instance
// ============================================================================

let instance: ISignalEncryptionService | null = null

/**
 * Get the singleton encryption service instance
 *
 * @param useMock - Use mock service instead of real encryption
 */
export function getSignalEncryptionService(
  useMock = false
): ISignalEncryptionService {
  if (!instance) {
    instance = useMock
      ? createMockEncryptionService()
      : createEncryptionService()
  }
  return instance
}

/**
 * Reset the singleton instance (for testing)
 */
export function resetSignalEncryptionService(): void {
  instance = null
}
