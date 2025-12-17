/**
 * SignalEncryptionService Tests
 *
 * Story 7.5.2: External Signal Routing - Task 4
 *
 * Tests for hybrid RSA-OAEP + AES-GCM encryption for partner delivery.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  SignalEncryptionService,
  MockSignalEncryptionService,
  EncryptionError,
  createEncryptionService,
  createMockEncryptionService,
  getSignalEncryptionService,
  resetSignalEncryptionService,
} from '../SignalEncryptionService'
import {
  type ExternalSignalPayload,
  type CrisisPartnerConfig,
} from '@fledgely/contracts'

// ============================================================================
// Test Fixtures
// ============================================================================

const mockPayload: ExternalSignalPayload = {
  signalId: 'sig_test_123456789012345',
  childAge: 12,
  hasSharedCustody: true,
  signalTimestamp: '2024-01-15T10:30:00.000Z',
  jurisdiction: 'US-CA',
  devicePlatform: 'web',
}

// Valid RSA-2048 public key for testing (NOT a real key - just structurally valid)
const VALID_TEST_PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAu1SU1LfVLPHCozMxH2Mo
4lgOEePzNm0tRgeLezV6ffAt0gunVTLw7onLRnrq0/IzW7yWR7QkrmBL7jTKEn5u
+qKhbwKfBstIs+bMY2Zkp18gnTxKLxoS2tFczGkPLPgizskuemMghRniWaoLcyeh
kd3qqGElvW/VDL5AaWTg0nLVkjRo9z+40RQzuVaE8AkAFmxZzow3x+VJYKdjykkJ
0iT9wCS0DRTXu269V264Vf/3jvredZiKRkgwlL9xNAwxXFg0x/XFw005UWVRIkdg
cKWTjpBP2dPwVZ4WWC+9aGVd+Gyn1o0CLelf4rEjGoXbAAEgAqeGUxrcIlbjXfbc
mwIDAQAB
-----END PUBLIC KEY-----`

const mockPartner: CrisisPartnerConfig = {
  partnerId: 'test_partner',
  name: 'Test Crisis Partner',
  description: 'Test partner',
  status: 'active',
  webhookUrl: 'https://test-partner.example.com/webhook',
  publicKey: VALID_TEST_PUBLIC_KEY,
  jurisdictions: ['US-CA'],
  isFallback: false,
  priority: 1,
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
  keyExpiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
}

const expiredPartner: CrisisPartnerConfig = {
  ...mockPartner,
  partnerId: 'expired_partner',
  keyExpiresAt: '2020-01-01T00:00:00.000Z', // Expired
}

// ============================================================================
// SignalEncryptionService Tests
// ============================================================================

describe('SignalEncryptionService', () => {
  let service: SignalEncryptionService

  beforeEach(() => {
    service = new SignalEncryptionService()
  })

  describe('encryptForPartner', () => {
    it('returns encrypted package with required fields', async () => {
      const result = await service.encryptForPartner(mockPayload, mockPartner)

      expect(result.encryptedKey).toBeDefined()
      expect(result.encryptedPayload).toBeDefined()
      expect(result.iv).toBeDefined()
      expect(result.keyAlgorithm).toBe('RSA-OAEP')
      expect(result.payloadAlgorithm).toBe('AES-GCM')
      expect(result.partnerId).toBe(mockPartner.partnerId)
      expect(result.publicKeyHash).toHaveLength(64)
    })

    it('produces base64-encoded encrypted key', async () => {
      const result = await service.encryptForPartner(mockPayload, mockPartner)

      // Should be valid base64
      expect(() => atob(result.encryptedKey)).not.toThrow()
      // RSA-2048 produces 256 byte output, base64 encoded = ~344 chars
      expect(result.encryptedKey.length).toBeGreaterThanOrEqual(100)
    })

    it('produces base64-encoded encrypted payload', async () => {
      const result = await service.encryptForPartner(mockPayload, mockPartner)

      // Should be valid base64
      expect(() => atob(result.encryptedPayload)).not.toThrow()
    })

    it('produces base64-encoded IV', async () => {
      const result = await service.encryptForPartner(mockPayload, mockPartner)

      // 12-byte IV = 16 base64 chars
      expect(result.iv.length).toBe(16)
      expect(() => atob(result.iv)).not.toThrow()
    })

    it('produces different encrypted output for same payload', async () => {
      const result1 = await service.encryptForPartner(mockPayload, mockPartner)
      const result2 = await service.encryptForPartner(mockPayload, mockPartner)

      // Random key and IV should produce different output
      expect(result1.encryptedPayload).not.toBe(result2.encryptedPayload)
      expect(result1.encryptedKey).not.toBe(result2.encryptedKey)
      expect(result1.iv).not.toBe(result2.iv)
    })

    it('throws EncryptionError when partner key is expired', async () => {
      await expect(
        service.encryptForPartner(mockPayload, expiredPartner)
      ).rejects.toThrow(EncryptionError)

      await expect(
        service.encryptForPartner(mockPayload, expiredPartner)
      ).rejects.toThrow('Partner key has expired')
    })

    it('throws EncryptionError for invalid public key', async () => {
      const invalidPartner: CrisisPartnerConfig = {
        ...mockPartner,
        publicKey: 'not-a-valid-pem-key-' + 'x'.repeat(100),
      }

      await expect(
        service.encryptForPartner(mockPayload, invalidPartner)
      ).rejects.toThrow(EncryptionError)
    })

    it('includes correct partner ID in output', async () => {
      const result = await service.encryptForPartner(mockPayload, mockPartner)

      expect(result.partnerId).toBe('test_partner')
    })

    it('computes deterministic public key hash', async () => {
      const result1 = await service.encryptForPartner(mockPayload, mockPartner)
      const result2 = await service.encryptForPartner(mockPayload, mockPartner)

      // Same key should produce same hash
      expect(result1.publicKeyHash).toBe(result2.publicKeyHash)
    })
  })

  describe('verifyPartnerKey', () => {
    it('returns true for valid key', async () => {
      const result = await service.verifyPartnerKey(mockPartner)
      expect(result).toBe(true)
    })

    it('returns false for expired key', async () => {
      const result = await service.verifyPartnerKey(expiredPartner)
      expect(result).toBe(false)
    })

    it('returns false for invalid key format', async () => {
      const invalidPartner: CrisisPartnerConfig = {
        ...mockPartner,
        publicKey: 'invalid-key-format',
      }

      const result = await service.verifyPartnerKey(invalidPartner)
      expect(result).toBe(false)
    })

    it('returns true when keyExpiresAt is null', async () => {
      const noExpiryPartner: CrisisPartnerConfig = {
        ...mockPartner,
        keyExpiresAt: null,
      }

      const result = await service.verifyPartnerKey(noExpiryPartner)
      expect(result).toBe(true)
    })
  })

  describe('computePublicKeyHash', () => {
    it('returns 64-character hex hash', async () => {
      const hash = await service.computePublicKeyHash(mockPartner.publicKey)

      expect(hash).toHaveLength(64)
      expect(hash).toMatch(/^[a-f0-9]+$/)
    })

    it('returns consistent hash for same key', async () => {
      const hash1 = await service.computePublicKeyHash(mockPartner.publicKey)
      const hash2 = await service.computePublicKeyHash(mockPartner.publicKey)

      expect(hash1).toBe(hash2)
    })

    it('returns different hash for different keys', async () => {
      const hash1 = await service.computePublicKeyHash(mockPartner.publicKey)
      const hash2 = await service.computePublicKeyHash('different-key')

      expect(hash1).not.toBe(hash2)
    })
  })
})

// ============================================================================
// MockSignalEncryptionService Tests
// ============================================================================

describe('MockSignalEncryptionService', () => {
  let mockService: MockSignalEncryptionService

  beforeEach(() => {
    mockService = new MockSignalEncryptionService()
  })

  describe('encryptForPartner', () => {
    it('returns valid encrypted package structure', async () => {
      const result = await mockService.encryptForPartner(mockPayload, mockPartner)

      expect(result.encryptedKey).toBeDefined()
      expect(result.encryptedPayload).toBeDefined()
      expect(result.iv).toBeDefined()
      expect(result.keyAlgorithm).toBe('RSA-OAEP')
      expect(result.payloadAlgorithm).toBe('AES-GCM')
      expect(result.partnerId).toBe(mockPartner.partnerId)
      expect(result.publicKeyHash).toHaveLength(64)
    })

    it('can be configured to fail', async () => {
      mockService.setFailure(true, 'Custom failure message')

      await expect(
        mockService.encryptForPartner(mockPayload, mockPartner)
      ).rejects.toThrow(EncryptionError)

      await expect(
        mockService.encryptForPartner(mockPayload, mockPartner)
      ).rejects.toThrow('Custom failure message')
    })

    it('encodes payload as base64 (mock)', async () => {
      const result = await mockService.encryptForPartner(mockPayload, mockPartner)

      // Mock just base64 encodes - can decode and verify
      const decoded = atob(result.encryptedPayload)
      const payload = JSON.parse(decoded)
      expect(payload.signalId).toBe(mockPayload.signalId)
    })
  })

  describe('verifyPartnerKey', () => {
    it('returns true by default', async () => {
      const result = await mockService.verifyPartnerKey(mockPartner)
      expect(result).toBe(true)
    })

    it('returns false when configured to fail', async () => {
      mockService.setFailure(true)
      const result = await mockService.verifyPartnerKey(mockPartner)
      expect(result).toBe(false)
    })

    it('returns false for expired key', async () => {
      const result = await mockService.verifyPartnerKey(expiredPartner)
      expect(result).toBe(false)
    })

    it('returns false for short key', async () => {
      const shortKeyPartner: CrisisPartnerConfig = {
        ...mockPartner,
        publicKey: 'short',
      }

      const result = await mockService.verifyPartnerKey(shortKeyPartner)
      expect(result).toBe(false)
    })
  })

  describe('computePublicKeyHash', () => {
    it('returns 64-character hash', async () => {
      const hash = await mockService.computePublicKeyHash(mockPartner.publicKey)

      expect(hash).toHaveLength(64)
      expect(hash).toMatch(/^[a-f0-9]+$/)
    })
  })
})

// ============================================================================
// Factory Function Tests
// ============================================================================

describe('createEncryptionService', () => {
  it('creates SignalEncryptionService', () => {
    const service = createEncryptionService()
    expect(service).toBeInstanceOf(SignalEncryptionService)
  })

  it('passes config to service', () => {
    const service = createEncryptionService({ enableDebugLogging: true })
    expect(service).toBeInstanceOf(SignalEncryptionService)
  })
})

describe('createMockEncryptionService', () => {
  it('creates MockSignalEncryptionService', () => {
    const service = createMockEncryptionService()
    expect(service).toBeInstanceOf(MockSignalEncryptionService)
  })
})

// ============================================================================
// Singleton Tests
// ============================================================================

describe('getSignalEncryptionService', () => {
  beforeEach(() => {
    resetSignalEncryptionService()
  })

  it('returns singleton instance', () => {
    const instance1 = getSignalEncryptionService()
    const instance2 = getSignalEncryptionService()

    expect(instance1).toBe(instance2)
  })

  it('returns new instance after reset', () => {
    const instance1 = getSignalEncryptionService()
    resetSignalEncryptionService()
    const instance2 = getSignalEncryptionService()

    expect(instance1).not.toBe(instance2)
  })

  it('returns mock service when requested', () => {
    const mockInstance = getSignalEncryptionService(true)
    expect(mockInstance).toBeInstanceOf(MockSignalEncryptionService)
  })

  it('returns real service by default', () => {
    const instance = getSignalEncryptionService()
    expect(instance).toBeInstanceOf(SignalEncryptionService)
  })
})

// ============================================================================
// Security Tests
// ============================================================================

describe('Security Requirements', () => {
  let service: SignalEncryptionService

  beforeEach(() => {
    service = new SignalEncryptionService()
  })

  describe('Encryption Strength', () => {
    it('uses RSA-OAEP for key encryption', async () => {
      const result = await service.encryptForPartner(mockPayload, mockPartner)
      expect(result.keyAlgorithm).toBe('RSA-OAEP')
    })

    it('uses AES-GCM for payload encryption', async () => {
      const result = await service.encryptForPartner(mockPayload, mockPartner)
      expect(result.payloadAlgorithm).toBe('AES-GCM')
    })

    it('generates unique IV for each encryption', async () => {
      const ivs = new Set<string>()

      for (let i = 0; i < 10; i++) {
        const result = await service.encryptForPartner(mockPayload, mockPartner)
        ivs.add(result.iv)
      }

      // All IVs should be unique
      expect(ivs.size).toBe(10)
    })

    it('generates unique AES key for each encryption', async () => {
      const encryptedKeys = new Set<string>()

      for (let i = 0; i < 10; i++) {
        const result = await service.encryptForPartner(mockPayload, mockPartner)
        encryptedKeys.add(result.encryptedKey)
      }

      // All encrypted keys should be unique
      expect(encryptedKeys.size).toBe(10)
    })
  })

  describe('Key Validation', () => {
    it('rejects expired keys', async () => {
      await expect(
        service.encryptForPartner(mockPayload, expiredPartner)
      ).rejects.toThrow('expired')
    })

    it('rejects malformed keys', async () => {
      const malformedPartner: CrisisPartnerConfig = {
        ...mockPartner,
        publicKey: '-----BEGIN PUBLIC KEY-----\ninvalid\n-----END PUBLIC KEY-----',
      }

      await expect(
        service.encryptForPartner(mockPayload, malformedPartner)
      ).rejects.toThrow(EncryptionError)
    })
  })

  describe('No Data Leakage', () => {
    it('encrypted payload does not contain plaintext', async () => {
      const result = await service.encryptForPartner(mockPayload, mockPartner)

      // Encrypted payload should not contain plaintext fields
      expect(result.encryptedPayload).not.toContain('sig_test_123456789012345')
      expect(result.encryptedPayload).not.toContain('US-CA')
      expect(result.encryptedPayload).not.toContain('2024-01-15')
    })

    it('encrypted key is not the raw AES key', async () => {
      const result = await service.encryptForPartner(mockPayload, mockPartner)

      // Should be encrypted, not raw
      expect(result.encryptedKey.length).toBeGreaterThanOrEqual(200)
    })
  })
})

// ============================================================================
// Integration Tests
// ============================================================================

describe('Encryption Integration', () => {
  it('encrypted package can be validated against schema', async () => {
    const service = new SignalEncryptionService()
    const result = await service.encryptForPartner(mockPayload, mockPartner)

    // Validate package structure
    expect(typeof result.encryptedKey).toBe('string')
    expect(result.encryptedKey.length).toBeGreaterThanOrEqual(100)

    expect(typeof result.encryptedPayload).toBe('string')
    expect(result.encryptedPayload.length).toBeGreaterThanOrEqual(10)

    expect(typeof result.iv).toBe('string')
    expect(result.iv.length).toBe(16)

    expect(result.keyAlgorithm).toBe('RSA-OAEP')
    expect(result.payloadAlgorithm).toBe('AES-GCM')

    expect(typeof result.partnerId).toBe('string')
    expect(result.partnerId.length).toBeGreaterThanOrEqual(1)

    expect(typeof result.publicKeyHash).toBe('string')
    expect(result.publicKeyHash.length).toBe(64)
  })

  it('handles large payloads', async () => {
    const service = new SignalEncryptionService()

    // Add some extra data (though real payloads are minimal)
    const payload: ExternalSignalPayload = {
      ...mockPayload,
      signalId: 'sig_' + 'x'.repeat(1000),
    }

    const result = await service.encryptForPartner(payload, mockPartner)

    expect(result.encryptedPayload).toBeDefined()
    expect(result.encryptedPayload.length).toBeGreaterThan(1000)
  })
})
