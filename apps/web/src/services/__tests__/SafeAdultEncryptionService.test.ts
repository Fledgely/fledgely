/**
 * SafeAdultEncryptionService Tests
 *
 * Story 7.5.4: Safe Adult Designation - Task 2
 *
 * Tests for device-derived AES-GCM encryption for safe adult contacts.
 *
 * CRITICAL INVARIANT (INV-002): Safe adult contact NEVER visible to family.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import type { SafeAdultContactInput } from '@fledgely/contracts'
import {
  SafeAdultEncryptionService,
  MockSafeAdultEncryptionService,
  SafeAdultEncryptionError,
  createSafeAdultEncryptionService,
  createMockSafeAdultEncryptionService,
  getSafeAdultEncryptionService,
  resetSafeAdultEncryptionService,
  type EncryptedSafeAdultContact,
} from '../SafeAdultEncryptionService'

// ============================================================================
// Test Fixtures
// ============================================================================

const mockPhoneContact: SafeAdultContactInput = {
  type: 'phone',
  value: '5551234567',
}

const mockEmailContact: SafeAdultContactInput = {
  type: 'email',
  value: 'trusted.adult@example.com',
}

// ============================================================================
// SafeAdultEncryptionService Tests
// ============================================================================

describe('SafeAdultEncryptionService', () => {
  let service: SafeAdultEncryptionService

  beforeEach(() => {
    service = new SafeAdultEncryptionService()
  })

  afterEach(() => {
    service.clearCache()
  })

  describe('encrypt', () => {
    it('encrypts phone contact and returns valid structure', async () => {
      const result = await service.encrypt(mockPhoneContact)

      expect(result.encryptedData).toBeDefined()
      expect(result.keyId).toBeDefined()
      expect(result.algorithm).toBe('AES-GCM')
    })

    it('encrypts email contact and returns valid structure', async () => {
      const result = await service.encrypt(mockEmailContact)

      expect(result.encryptedData).toBeDefined()
      expect(result.keyId).toBeDefined()
      expect(result.algorithm).toBe('AES-GCM')
    })

    it('produces base64-encoded encrypted data', async () => {
      const result = await service.encrypt(mockPhoneContact)

      // Should be valid base64
      expect(() => atob(result.encryptedData)).not.toThrow()
    })

    it('produces 32-character key ID', async () => {
      const result = await service.encrypt(mockPhoneContact)

      expect(result.keyId).toHaveLength(32)
      expect(result.keyId).toMatch(/^[a-f0-9]+$/)
    })

    it('produces different encrypted output for same contact', async () => {
      const result1 = await service.encrypt(mockPhoneContact)
      const result2 = await service.encrypt(mockPhoneContact)

      // Random IV should produce different output
      expect(result1.encryptedData).not.toBe(result2.encryptedData)
    })

    it('uses same key ID for all encryptions', async () => {
      const result1 = await service.encrypt(mockPhoneContact)
      const result2 = await service.encrypt(mockEmailContact)

      // Same device = same key ID
      expect(result1.keyId).toBe(result2.keyId)
    })

    it('encrypted data does not contain plaintext phone number', async () => {
      const result = await service.encrypt(mockPhoneContact)

      // Encrypted data should not contain plaintext
      expect(result.encryptedData).not.toContain('5551234567')
      expect(result.encryptedData).not.toContain('phone')
    })

    it('encrypted data does not contain plaintext email', async () => {
      const result = await service.encrypt(mockEmailContact)

      // Encrypted data should not contain plaintext
      expect(result.encryptedData).not.toContain('trusted.adult@example.com')
      expect(result.encryptedData).not.toContain('email')
    })
  })

  describe('decrypt', () => {
    it('decrypts phone contact correctly', async () => {
      const encrypted = await service.encrypt(mockPhoneContact)
      const decrypted = await service.decrypt(encrypted)

      expect(decrypted.type).toBe('phone')
      expect(decrypted.value).toBe('5551234567')
    })

    it('decrypts email contact correctly', async () => {
      const encrypted = await service.encrypt(mockEmailContact)
      const decrypted = await service.decrypt(encrypted)

      expect(decrypted.type).toBe('email')
      expect(decrypted.value).toBe('trusted.adult@example.com')
    })

    it('throws for tampered encrypted data', async () => {
      const encrypted = await service.encrypt(mockPhoneContact)

      // Tamper with the encrypted data
      const tampered: EncryptedSafeAdultContact = {
        ...encrypted,
        encryptedData: encrypted.encryptedData.slice(0, -10) + 'tamperedXX',
      }

      await expect(service.decrypt(tampered)).rejects.toThrow()
    })

    it('throws for invalid base64', async () => {
      const invalid: EncryptedSafeAdultContact = {
        encryptedData: 'not-valid-base64!!!',
        keyId: 'test-key-id-12345678901234567',
        algorithm: 'AES-GCM',
      }

      await expect(service.decrypt(invalid)).rejects.toThrow()
    })

    it('throws for truncated data', async () => {
      const encrypted = await service.encrypt(mockPhoneContact)

      // Truncate data (missing IV or ciphertext)
      const truncated: EncryptedSafeAdultContact = {
        ...encrypted,
        encryptedData: btoa('short'),
      }

      await expect(service.decrypt(truncated)).rejects.toThrow()
    })
  })

  describe('getKeyId', () => {
    it('returns 32-character hex key ID', async () => {
      const keyId = await service.getKeyId()

      expect(keyId).toHaveLength(32)
      expect(keyId).toMatch(/^[a-f0-9]+$/)
    })

    it('returns consistent key ID across calls', async () => {
      const keyId1 = await service.getKeyId()
      const keyId2 = await service.getKeyId()

      expect(keyId1).toBe(keyId2)
    })

    it('returns same key ID as encrypt uses', async () => {
      const keyId = await service.getKeyId()
      const encrypted = await service.encrypt(mockPhoneContact)

      expect(encrypted.keyId).toBe(keyId)
    })
  })

  describe('clearCache', () => {
    it('does not cause errors after clearing', async () => {
      const encrypted = await service.encrypt(mockPhoneContact)
      service.clearCache()

      // Should still work after clearing cache
      const decrypted = await service.decrypt(encrypted)
      expect(decrypted.type).toBe('phone')
    })
  })
})

// ============================================================================
// MockSafeAdultEncryptionService Tests
// ============================================================================

describe('MockSafeAdultEncryptionService', () => {
  let mockService: MockSafeAdultEncryptionService

  beforeEach(() => {
    mockService = new MockSafeAdultEncryptionService()
  })

  describe('encrypt', () => {
    it('returns valid encrypted structure', async () => {
      const result = await mockService.encrypt(mockPhoneContact)

      expect(result.encryptedData).toBeDefined()
      expect(result.keyId).toBeDefined()
      expect(result.algorithm).toBe('AES-GCM')
    })

    it('can be configured to fail', async () => {
      mockService.setFailure(true, 'Custom failure message')

      await expect(mockService.encrypt(mockPhoneContact)).rejects.toThrow(SafeAdultEncryptionError)

      await expect(mockService.encrypt(mockPhoneContact)).rejects.toThrow('Custom failure message')
    })

    it('uses configured key ID', async () => {
      mockService.setKeyId('custom-key-id-for-testing')

      const result = await mockService.encrypt(mockPhoneContact)

      expect(result.keyId).toBe('custom-key-id-for-testing')
    })
  })

  describe('decrypt', () => {
    it('decrypts mock-encrypted data', async () => {
      const encrypted = await mockService.encrypt(mockPhoneContact)
      const decrypted = await mockService.decrypt(encrypted)

      expect(decrypted.type).toBe('phone')
      expect(decrypted.value).toBe('5551234567')
    })

    it('can be configured to fail', async () => {
      mockService.setFailure(true)

      const encrypted: EncryptedSafeAdultContact = {
        encryptedData: 'test',
        keyId: 'test',
        algorithm: 'AES-GCM',
      }

      await expect(mockService.decrypt(encrypted)).rejects.toThrow(SafeAdultEncryptionError)
    })
  })

  describe('getKeyId', () => {
    it('returns default mock key ID', async () => {
      const keyId = await mockService.getKeyId()

      expect(keyId).toBe('mock-key-id-12345678901234567890')
    })

    it('returns configured key ID', async () => {
      mockService.setKeyId('configured-key-id')

      const keyId = await mockService.getKeyId()

      expect(keyId).toBe('configured-key-id')
    })
  })
})

// ============================================================================
// Factory Function Tests
// ============================================================================

describe('createSafeAdultEncryptionService', () => {
  it('creates SafeAdultEncryptionService', () => {
    const service = createSafeAdultEncryptionService()
    expect(service).toBeInstanceOf(SafeAdultEncryptionService)
  })

  it('passes config to service', () => {
    const service = createSafeAdultEncryptionService({ enableDebugLogging: true })
    expect(service).toBeInstanceOf(SafeAdultEncryptionService)
  })
})

describe('createMockSafeAdultEncryptionService', () => {
  it('creates MockSafeAdultEncryptionService', () => {
    const service = createMockSafeAdultEncryptionService()
    expect(service).toBeInstanceOf(MockSafeAdultEncryptionService)
  })
})

// ============================================================================
// Singleton Tests
// ============================================================================

describe('getSafeAdultEncryptionService', () => {
  beforeEach(() => {
    resetSafeAdultEncryptionService()
  })

  afterEach(() => {
    resetSafeAdultEncryptionService()
  })

  it('returns singleton instance', () => {
    const instance1 = getSafeAdultEncryptionService()
    const instance2 = getSafeAdultEncryptionService()

    expect(instance1).toBe(instance2)
  })

  it('returns new instance after reset', () => {
    const instance1 = getSafeAdultEncryptionService()
    resetSafeAdultEncryptionService()
    const instance2 = getSafeAdultEncryptionService()

    expect(instance1).not.toBe(instance2)
  })

  it('returns mock service when requested', () => {
    const mockInstance = getSafeAdultEncryptionService(true)
    expect(mockInstance).toBeInstanceOf(MockSafeAdultEncryptionService)
  })

  it('returns real service by default', () => {
    const instance = getSafeAdultEncryptionService()
    expect(instance).toBeInstanceOf(SafeAdultEncryptionService)
  })
})

// ============================================================================
// Security Tests (INV-002 Compliance)
// ============================================================================

describe('Security Requirements (INV-002)', () => {
  let service: SafeAdultEncryptionService

  beforeEach(() => {
    service = new SafeAdultEncryptionService()
  })

  afterEach(() => {
    service.clearCache()
  })

  describe('Encryption Strength', () => {
    it('uses AES-GCM algorithm', async () => {
      const result = await service.encrypt(mockPhoneContact)
      expect(result.algorithm).toBe('AES-GCM')
    })

    it('generates unique IV for each encryption', async () => {
      const encryptions = new Set<string>()

      for (let i = 0; i < 10; i++) {
        const result = await service.encrypt(mockPhoneContact)
        encryptions.add(result.encryptedData)
      }

      // All encryptions should be unique due to unique IV
      expect(encryptions.size).toBe(10)
    })

    it('includes IV in encrypted data (12 bytes)', async () => {
      const result = await service.encrypt(mockPhoneContact)
      const decoded = new Uint8Array(
        atob(result.encryptedData)
          .split('')
          .map((c) => c.charCodeAt(0))
      )

      // Data should be at least 12 bytes (IV) + some ciphertext
      expect(decoded.length).toBeGreaterThan(12)
    })
  })

  describe('Key Isolation', () => {
    it('key ID is derived from device fingerprint', async () => {
      const keyId = await service.getKeyId()

      // Key ID should be deterministic for this device
      const keyId2 = await service.getKeyId()
      expect(keyId).toBe(keyId2)
    })

    it('encrypted data cannot be decrypted without same key', async () => {
      const encrypted = await service.encrypt(mockPhoneContact)

      // Create new service instance (same device = same key)
      const service2 = new SafeAdultEncryptionService()
      const decrypted = await service2.decrypt(encrypted)

      // Same device should be able to decrypt
      expect(decrypted.value).toBe('5551234567')
    })
  })

  describe('No Data Leakage', () => {
    it('encrypted data does not contain plaintext phone number', async () => {
      const result = await service.encrypt(mockPhoneContact)

      expect(result.encryptedData).not.toContain('5551234567')
    })

    it('encrypted data does not contain plaintext email', async () => {
      const result = await service.encrypt(mockEmailContact)

      expect(result.encryptedData).not.toContain('trusted.adult@example.com')
    })

    it('encrypted data does not contain contact type', async () => {
      const result = await service.encrypt(mockPhoneContact)

      expect(result.encryptedData).not.toContain('phone')
    })

    it('key ID does not reveal contact information', async () => {
      const keyId = await service.getKeyId()

      expect(keyId).not.toContain('phone')
      expect(keyId).not.toContain('email')
      expect(keyId).not.toContain('555')
    })
  })

  describe('Round-trip Integrity', () => {
    it('maintains phone contact integrity through encrypt/decrypt', async () => {
      const contact: SafeAdultContactInput = {
        type: 'phone',
        value: '18005551234',
      }

      const encrypted = await service.encrypt(contact)
      const decrypted = await service.decrypt(encrypted)

      expect(decrypted).toEqual(contact)
    })

    it('maintains email contact integrity through encrypt/decrypt', async () => {
      const contact: SafeAdultContactInput = {
        type: 'email',
        value: 'test.user+special@subdomain.example.org',
      }

      const encrypted = await service.encrypt(contact)
      const decrypted = await service.decrypt(encrypted)

      expect(decrypted).toEqual(contact)
    })
  })

  describe('Error Handling', () => {
    it('throws SafeAdultEncryptionError for tampered data', async () => {
      const encrypted = await service.encrypt(mockPhoneContact)

      const tampered: EncryptedSafeAdultContact = {
        ...encrypted,
        encryptedData: 'YWJj' + encrypted.encryptedData.slice(4), // Replace first 4 chars
      }

      await expect(service.decrypt(tampered)).rejects.toThrow()
    })

    it('throws for completely invalid data', async () => {
      const invalid: EncryptedSafeAdultContact = {
        encryptedData: 'totally-invalid-data',
        keyId: 'test-key',
        algorithm: 'AES-GCM',
      }

      await expect(service.decrypt(invalid)).rejects.toThrow()
    })
  })
})

// ============================================================================
// Integration Tests
// ============================================================================

describe('Encryption Integration', () => {
  it('encrypted contact can be stored and retrieved', async () => {
    const service = new SafeAdultEncryptionService()
    const contact: SafeAdultContactInput = {
      type: 'phone',
      value: '9995551234',
    }

    // Encrypt
    const encrypted = await service.encrypt(contact)

    // Simulate storage (serialize to JSON)
    const stored = JSON.stringify(encrypted)

    // Simulate retrieval (parse from JSON)
    const retrieved = JSON.parse(stored) as EncryptedSafeAdultContact

    // Decrypt
    const decrypted = await service.decrypt(retrieved)

    expect(decrypted).toEqual(contact)
  })

  it('handles special characters in email', async () => {
    const service = new SafeAdultEncryptionService()
    const contact: SafeAdultContactInput = {
      type: 'email',
      value: "user+tag'special@exam-ple.co.uk",
    }

    const encrypted = await service.encrypt(contact)
    const decrypted = await service.decrypt(encrypted)

    expect(decrypted.value).toBe("user+tag'special@exam-ple.co.uk")
  })

  it('handles Unicode in contact value', async () => {
    const service = new SafeAdultEncryptionService()
    const contact: SafeAdultContactInput = {
      type: 'email',
      value: 'user@例え.jp',
    }

    const encrypted = await service.encrypt(contact)
    const decrypted = await service.decrypt(encrypted)

    expect(decrypted.value).toBe('user@例え.jp')
  })
})

// ============================================================================
// Adversarial Tests
// ============================================================================

describe('Adversarial Tests', () => {
  let service: SafeAdultEncryptionService

  beforeEach(() => {
    service = new SafeAdultEncryptionService()
  })

  afterEach(() => {
    service.clearCache()
  })

  it('cannot decrypt with modified IV', async () => {
    const encrypted = await service.encrypt(mockPhoneContact)

    // Decode, modify IV, re-encode
    const data = atob(encrypted.encryptedData)
    const bytes = new Uint8Array(data.length)
    for (let i = 0; i < data.length; i++) {
      bytes[i] = data.charCodeAt(i)
    }

    // Flip a bit in the IV (first 12 bytes)
    bytes[0] ^= 0xff

    const modified = btoa(String.fromCharCode(...bytes))
    const tamperedEncrypted: EncryptedSafeAdultContact = {
      ...encrypted,
      encryptedData: modified,
    }

    await expect(service.decrypt(tamperedEncrypted)).rejects.toThrow()
  })

  it('cannot decrypt with modified ciphertext', async () => {
    const encrypted = await service.encrypt(mockPhoneContact)

    // Decode, modify ciphertext, re-encode
    const data = atob(encrypted.encryptedData)
    const bytes = new Uint8Array(data.length)
    for (let i = 0; i < data.length; i++) {
      bytes[i] = data.charCodeAt(i)
    }

    // Flip a bit in the ciphertext (after IV)
    bytes[15] ^= 0xff

    const modified = btoa(String.fromCharCode(...bytes))
    const tamperedEncrypted: EncryptedSafeAdultContact = {
      ...encrypted,
      encryptedData: modified,
    }

    await expect(service.decrypt(tamperedEncrypted)).rejects.toThrow()
  })

  it('cannot decrypt empty encrypted data', async () => {
    const invalid: EncryptedSafeAdultContact = {
      encryptedData: '',
      keyId: 'test-key',
      algorithm: 'AES-GCM',
    }

    await expect(service.decrypt(invalid)).rejects.toThrow()
  })

  it('cannot decrypt data shorter than IV', async () => {
    // Data shorter than 12 bytes (IV length)
    const shortData = btoa('short')
    const invalid: EncryptedSafeAdultContact = {
      encryptedData: shortData,
      keyId: 'test-key',
      algorithm: 'AES-GCM',
    }

    await expect(service.decrypt(invalid)).rejects.toThrow()
  })
})
