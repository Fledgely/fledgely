/**
 * Signal Encryption Service Tests - Story 7.5.2 Task 5
 *
 * TDD tests for signal payload encryption.
 * AC4: Signal is encrypted in transit and at rest
 */

import { describe, it, expect, beforeEach } from 'vitest'
import {
  encryptPayloadForPartner,
  decryptPartnerResponse,
  generatePartnerKeyPair,
  deriveEncryptionKey,
  validateKeyPair,
  ENCRYPTION_ALGORITHM,
  KEY_SIZE_BITS,
  IV_SIZE_BYTES,
  AUTH_TAG_SIZE_BYTES,
  type EncryptedPayload,
  type KeyPair,
} from './signalEncryptionService'
import { createSignalRoutingPayload, type SignalRoutingPayload } from '@fledgely/shared'

describe('Signal Encryption Service', () => {
  let testPayload: SignalRoutingPayload
  let testKeyPair: KeyPair

  beforeEach(() => {
    const birthDate = new Date()
    birthDate.setFullYear(birthDate.getFullYear() - 12)

    testPayload = createSignalRoutingPayload(
      'sig_123',
      birthDate,
      'two_parent',
      'US-CA',
      'web',
      'logo_tap',
      'device_abc'
    )

    testKeyPair = generatePartnerKeyPair()
  })

  // ============================================
  // Constants Tests
  // ============================================

  describe('Constants', () => {
    it('should use AES-256-GCM algorithm', () => {
      expect(ENCRYPTION_ALGORITHM).toBe('aes-256-gcm')
    })

    it('should use 256-bit key size', () => {
      expect(KEY_SIZE_BITS).toBe(256)
    })

    it('should use 12-byte IV (recommended for GCM)', () => {
      expect(IV_SIZE_BYTES).toBe(12)
    })

    it('should use 16-byte auth tag', () => {
      expect(AUTH_TAG_SIZE_BYTES).toBe(16)
    })
  })

  // ============================================
  // generatePartnerKeyPair Tests
  // ============================================

  describe('generatePartnerKeyPair', () => {
    it('should generate valid key pair', () => {
      const keyPair = generatePartnerKeyPair()

      expect(keyPair.publicKey).toBeDefined()
      expect(keyPair.privateKey).toBeDefined()
    })

    it('should generate unique key pairs', () => {
      const keyPair1 = generatePartnerKeyPair()
      const keyPair2 = generatePartnerKeyPair()

      expect(keyPair1.publicKey).not.toBe(keyPair2.publicKey)
      expect(keyPair1.privateKey).not.toBe(keyPair2.privateKey)
    })

    it('should generate RSA-2048 key pair by default', () => {
      const keyPair = generatePartnerKeyPair()

      // Public key should contain RSA identifier
      expect(keyPair.publicKey).toContain('PUBLIC KEY')
    })

    it('should validate generated key pair', () => {
      const keyPair = generatePartnerKeyPair()

      const result = validateKeyPair(keyPair)

      expect(result.valid).toBe(true)
    })
  })

  // ============================================
  // validateKeyPair Tests
  // ============================================

  describe('validateKeyPair', () => {
    it('should validate valid key pair', () => {
      const result = validateKeyPair(testKeyPair)

      expect(result.valid).toBe(true)
    })

    it('should reject empty public key', () => {
      const invalidPair: KeyPair = { ...testKeyPair, publicKey: '' }

      const result = validateKeyPair(invalidPair)

      expect(result.valid).toBe(false)
      expect(result.error).toContain('public key')
    })

    it('should reject empty private key', () => {
      const invalidPair: KeyPair = { ...testKeyPair, privateKey: '' }

      const result = validateKeyPair(invalidPair)

      expect(result.valid).toBe(false)
      expect(result.error).toContain('private key')
    })

    it('should reject malformed public key', () => {
      const invalidPair: KeyPair = { ...testKeyPair, publicKey: 'not-a-valid-key' }

      const result = validateKeyPair(invalidPair)

      expect(result.valid).toBe(false)
    })
  })

  // ============================================
  // deriveEncryptionKey Tests
  // ============================================

  describe('deriveEncryptionKey', () => {
    it('should derive a 32-byte key', () => {
      const key = deriveEncryptionKey('shared-secret')

      expect(key.length).toBe(32) // 256 bits
    })

    it('should derive same key from same input', () => {
      const key1 = deriveEncryptionKey('same-secret')
      const key2 = deriveEncryptionKey('same-secret')

      expect(key1.toString('hex')).toBe(key2.toString('hex'))
    })

    it('should derive different keys from different inputs', () => {
      const key1 = deriveEncryptionKey('secret-1')
      const key2 = deriveEncryptionKey('secret-2')

      expect(key1.toString('hex')).not.toBe(key2.toString('hex'))
    })
  })

  // ============================================
  // encryptPayloadForPartner Tests
  // ============================================

  describe('encryptPayloadForPartner', () => {
    it('should encrypt payload successfully', () => {
      const encrypted = encryptPayloadForPartner(testPayload, testKeyPair.publicKey)

      expect(encrypted).toBeDefined()
      expect(encrypted.encryptedData).toBeDefined()
      expect(encrypted.encryptedKey).toBeDefined()
      expect(encrypted.iv).toBeDefined()
      expect(encrypted.authTag).toBeDefined()
    })

    it('should produce different ciphertext for same payload', () => {
      const encrypted1 = encryptPayloadForPartner(testPayload, testKeyPair.publicKey)
      const encrypted2 = encryptPayloadForPartner(testPayload, testKeyPair.publicKey)

      // IV should be different each time, so ciphertext differs
      expect(encrypted1.encryptedData).not.toBe(encrypted2.encryptedData)
      expect(encrypted1.iv).not.toBe(encrypted2.iv)
    })

    it('should NOT contain plaintext in encrypted output', () => {
      const encrypted = encryptPayloadForPartner(testPayload, testKeyPair.publicKey)

      // Encrypted data should not contain raw signal ID
      expect(encrypted.encryptedData).not.toContain(testPayload.signalId)
      expect(encrypted.encryptedData).not.toContain('sig_123')
    })

    it('should include all required fields', () => {
      const encrypted = encryptPayloadForPartner(testPayload, testKeyPair.publicKey)

      expect(encrypted.encryptedData).toBeDefined()
      expect(encrypted.encryptedKey).toBeDefined()
      expect(encrypted.iv).toBeDefined()
      expect(encrypted.authTag).toBeDefined()
      expect(encrypted.algorithm).toBe(ENCRYPTION_ALGORITHM)
    })

    it('should encrypt with AES-256-GCM', () => {
      const encrypted = encryptPayloadForPartner(testPayload, testKeyPair.publicKey)

      expect(encrypted.algorithm).toBe('aes-256-gcm')
    })

    it('should throw for invalid public key', () => {
      expect(() => encryptPayloadForPartner(testPayload, 'invalid-key')).toThrow()
    })
  })

  // ============================================
  // decryptPartnerResponse Tests
  // ============================================

  describe('decryptPartnerResponse', () => {
    it('should decrypt encrypted payload', () => {
      const encrypted = encryptPayloadForPartner(testPayload, testKeyPair.publicKey)
      const decrypted = decryptPartnerResponse(encrypted, testKeyPair.privateKey)

      expect(decrypted).toEqual(testPayload)
    })

    it('should throw for tampered ciphertext', () => {
      const encrypted = encryptPayloadForPartner(testPayload, testKeyPair.publicKey)

      // Tamper with encrypted data
      const tampered: EncryptedPayload = {
        ...encrypted,
        encryptedData: encrypted.encryptedData.replace('a', 'b'),
      }

      expect(() => decryptPartnerResponse(tampered, testKeyPair.privateKey)).toThrow()
    })

    it('should throw for wrong private key', () => {
      const encrypted = encryptPayloadForPartner(testPayload, testKeyPair.publicKey)
      const wrongKeyPair = generatePartnerKeyPair()

      expect(() => decryptPartnerResponse(encrypted, wrongKeyPair.privateKey)).toThrow()
    })

    it('should throw for tampered auth tag', () => {
      const encrypted = encryptPayloadForPartner(testPayload, testKeyPair.publicKey)

      // Tamper with auth tag
      const tampered: EncryptedPayload = {
        ...encrypted,
        authTag: 'invalid_auth_tag',
      }

      expect(() => decryptPartnerResponse(tampered, testKeyPair.privateKey)).toThrow()
    })

    it('should throw for missing fields', () => {
      const encrypted = encryptPayloadForPartner(testPayload, testKeyPair.publicKey)

      const incomplete = { ...encrypted }
      delete (incomplete as Partial<EncryptedPayload>).iv

      expect(() =>
        decryptPartnerResponse(incomplete as EncryptedPayload, testKeyPair.privateKey)
      ).toThrow()
    })
  })

  // ============================================
  // Round-trip Tests
  // ============================================

  describe('Round-trip encryption/decryption', () => {
    it('should preserve all payload fields', () => {
      const encrypted = encryptPayloadForPartner(testPayload, testKeyPair.publicKey)
      const decrypted = decryptPartnerResponse(encrypted, testKeyPair.privateKey)

      expect(decrypted.signalId).toBe(testPayload.signalId)
      expect(decrypted.childAge).toBe(testPayload.childAge)
      expect(decrypted.familyStructure).toBe(testPayload.familyStructure)
      expect(decrypted.jurisdiction).toBe(testPayload.jurisdiction)
      expect(decrypted.platform).toBe(testPayload.platform)
      expect(decrypted.triggerMethod).toBe(testPayload.triggerMethod)
      expect(decrypted.deviceId).toBe(testPayload.deviceId)
    })

    it('should handle payload with null deviceId', () => {
      const payloadNoDevice: SignalRoutingPayload = { ...testPayload, deviceId: null }

      const encrypted = encryptPayloadForPartner(payloadNoDevice, testKeyPair.publicKey)
      const decrypted = decryptPartnerResponse(encrypted, testKeyPair.privateKey)

      expect(decrypted.deviceId).toBeNull()
    })

    it('should handle all family structures', () => {
      const structures = ['single_parent', 'two_parent', 'shared_custody', 'caregiver'] as const

      for (const structure of structures) {
        const payload: SignalRoutingPayload = { ...testPayload, familyStructure: structure }

        const encrypted = encryptPayloadForPartner(payload, testKeyPair.publicKey)
        const decrypted = decryptPartnerResponse(encrypted, testKeyPair.privateKey)

        expect(decrypted.familyStructure).toBe(structure)
      }
    })

    it('should handle all platforms', () => {
      const platforms = ['web', 'chrome_extension', 'android'] as const

      for (const platform of platforms) {
        const payload: SignalRoutingPayload = { ...testPayload, platform }

        const encrypted = encryptPayloadForPartner(payload, testKeyPair.publicKey)
        const decrypted = decryptPartnerResponse(encrypted, testKeyPair.privateKey)

        expect(decrypted.platform).toBe(platform)
      }
    })

    it('should handle all trigger methods', () => {
      const methods = ['logo_tap', 'keyboard_shortcut', 'swipe_pattern'] as const

      for (const method of methods) {
        const payload: SignalRoutingPayload = { ...testPayload, triggerMethod: method }

        const encrypted = encryptPayloadForPartner(payload, testKeyPair.publicKey)
        const decrypted = decryptPartnerResponse(encrypted, testKeyPair.privateKey)

        expect(decrypted.triggerMethod).toBe(method)
      }
    })
  })
})
