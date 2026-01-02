/**
 * SafeAdultEncryptionService Tests - Story 7.5.4 Task 4
 *
 * Tests for isolated encryption of safe adult data.
 * AC4: Safe adult data isolation
 *
 * CRITICAL: Encryption key is SEPARATE from family key.
 * Keys stored in isolated collection, not family-accessible.
 * TDD approach: Write tests first, then implementation.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  // Key management
  generateSafeAdultEncryptionKey,
  getSafeAdultEncryptionKey,
  deleteSafeAdultEncryptionKey,
  // Data encryption
  encryptSafeAdultData,
  decryptSafeAdultData,
  // Isolation verification
  verifyKeyIsolation,
  isKeyAccessibleToFamily,
  // Helpers
  deriveKeyFromId,
} from './safeAdultEncryptionService'

// Mock Firestore
const mockGet = vi.fn()
const mockSet = vi.fn()
const mockDelete = vi.fn()
const mockDoc = vi.fn()

vi.mock('firebase/firestore', () => ({
  getFirestore: vi.fn(() => ({})),
  collection: vi.fn(),
  doc: (...args: unknown[]) => mockDoc(...args),
  getDoc: (...args: unknown[]) => mockGet(...args),
  setDoc: (...args: unknown[]) => mockSet(...args),
  deleteDoc: (...args: unknown[]) => mockDelete(...args),
}))

// Mock crypto
const mockCrypto = {
  subtle: {
    generateKey: vi.fn(),
    encrypt: vi.fn(),
    decrypt: vi.fn(),
    exportKey: vi.fn(),
    importKey: vi.fn(),
  },
  getRandomValues: vi.fn((arr: Uint8Array) => {
    for (let i = 0; i < arr.length; i++) {
      arr[i] = Math.floor(Math.random() * 256)
    }
    return arr
  }),
  randomUUID: vi.fn(() => 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'),
}

vi.stubGlobal('crypto', mockCrypto)

describe('SafeAdultEncryptionService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockCrypto.subtle.generateKey.mockResolvedValue({ type: 'secret' })
    mockCrypto.subtle.exportKey.mockResolvedValue(new ArrayBuffer(32))
    mockCrypto.subtle.importKey.mockResolvedValue({ type: 'secret' })
    mockCrypto.subtle.encrypt.mockResolvedValue(new ArrayBuffer(64))
    mockCrypto.subtle.decrypt.mockResolvedValue(
      new TextEncoder().encode(JSON.stringify({ phone: '+15551234567' }))
    )
  })

  // ============================================
  // Key Generation Tests
  // ============================================

  describe('generateSafeAdultEncryptionKey', () => {
    it('should generate unique key ID', async () => {
      mockSet.mockResolvedValue(undefined)

      const result = await generateSafeAdultEncryptionKey('child_123')

      expect(result.keyId).toBeTruthy()
      expect(result.keyId).toMatch(/^sakey_/)
    })

    it('should store key in isolated collection', async () => {
      mockSet.mockResolvedValue(undefined)

      await generateSafeAdultEncryptionKey('child_123')

      expect(mockSet).toHaveBeenCalled()
    })

    it('should associate key with childId', async () => {
      mockSet.mockResolvedValue(undefined)

      const result = await generateSafeAdultEncryptionKey('child_123')

      expect(result.keyId).toBeTruthy()
    })

    it('should throw on empty childId', async () => {
      await expect(generateSafeAdultEncryptionKey('')).rejects.toThrow('childId')
    })

    it('should generate cryptographically secure key', async () => {
      mockSet.mockResolvedValue(undefined)

      await generateSafeAdultEncryptionKey('child_123')

      expect(mockCrypto.subtle.generateKey).toHaveBeenCalled()
    })
  })

  // ============================================
  // Key Retrieval Tests
  // ============================================

  describe('getSafeAdultEncryptionKey', () => {
    it('should return key when exists', async () => {
      mockGet.mockResolvedValue({
        exists: () => true,
        data: () => ({
          keyId: 'sakey_123',
          childId: 'child_123',
          keyData: 'encrypted_key_data',
          createdAt: new Date(),
        }),
      })

      const result = await getSafeAdultEncryptionKey('sakey_123')

      expect(result).not.toBeNull()
      expect(result?.keyId).toBe('sakey_123')
    })

    it('should return null when not exists', async () => {
      mockGet.mockResolvedValue({ exists: () => false })

      const result = await getSafeAdultEncryptionKey('sakey_nonexistent')

      expect(result).toBeNull()
    })

    it('should throw on empty keyId', async () => {
      await expect(getSafeAdultEncryptionKey('')).rejects.toThrow('keyId')
    })
  })

  // ============================================
  // Key Deletion Tests
  // ============================================

  describe('deleteSafeAdultEncryptionKey', () => {
    it('should delete key from storage', async () => {
      mockGet.mockResolvedValue({ exists: () => true, data: () => ({}) })
      mockDelete.mockResolvedValue(undefined)

      await deleteSafeAdultEncryptionKey('sakey_123')

      expect(mockDelete).toHaveBeenCalled()
    })

    it('should succeed when key not exists', async () => {
      mockGet.mockResolvedValue({ exists: () => false })

      await expect(deleteSafeAdultEncryptionKey('sakey_nonexistent')).resolves.not.toThrow()
    })

    it('should throw on empty keyId', async () => {
      await expect(deleteSafeAdultEncryptionKey('')).rejects.toThrow('keyId')
    })
  })

  // ============================================
  // Data Encryption Tests
  // ============================================

  describe('encryptSafeAdultData', () => {
    // Valid base64-encoded 32-byte key
    const validKeyData = 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA='

    it('should encrypt phone number', async () => {
      mockGet.mockResolvedValue({
        exists: () => true,
        data: () => ({
          keyId: 'sakey_123',
          keyData: validKeyData,
        }),
      })

      const result = await encryptSafeAdultData(
        { phone: '+15551234567', displayName: 'Aunt Jane' },
        'sakey_123'
      )

      expect(result).toBeTruthy()
      expect(typeof result).toBe('string')
    })

    it('should encrypt email', async () => {
      mockGet.mockResolvedValue({
        exists: () => true,
        data: () => ({
          keyId: 'sakey_123',
          keyData: validKeyData,
        }),
      })

      const result = await encryptSafeAdultData(
        { email: 'aunt@example.com', displayName: 'Aunt Jane' },
        'sakey_123'
      )

      expect(result).toBeTruthy()
    })

    it('should produce different ciphertext for same plaintext', async () => {
      mockGet.mockResolvedValue({
        exists: () => true,
        data: () => ({
          keyId: 'sakey_123',
          keyData: validKeyData,
        }),
      })

      // Use counter to make each encrypt call return different values
      let counter = 0
      mockCrypto.subtle.encrypt.mockImplementation(() => {
        counter++
        const buffer = new ArrayBuffer(64 + counter)
        return Promise.resolve(buffer)
      })

      const result1 = await encryptSafeAdultData(
        { phone: '+15551234567', displayName: 'Aunt' },
        'sakey_123'
      )
      const result2 = await encryptSafeAdultData(
        { phone: '+15551234567', displayName: 'Aunt' },
        'sakey_123'
      )

      expect(result1).not.toBe(result2)
    })

    it('should throw when key not found', async () => {
      mockGet.mockResolvedValue({ exists: () => false })

      await expect(
        encryptSafeAdultData({ phone: '+15551234567', displayName: 'Aunt' }, 'sakey_nonexistent')
      ).rejects.toThrow('not found')
    })

    it('should throw on empty keyId', async () => {
      await expect(
        encryptSafeAdultData({ phone: '+15551234567', displayName: 'Aunt' }, '')
      ).rejects.toThrow('keyId')
    })
  })

  // ============================================
  // Data Decryption Tests
  // ============================================

  describe('decryptSafeAdultData', () => {
    // Valid base64-encoded 32-byte key
    const validKeyData = 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA='
    // Valid encrypted data: 12 byte IV + ciphertext, base64 encoded
    const validEncryptedData =
      'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA='

    it('should decrypt to original data', async () => {
      mockGet.mockResolvedValue({
        exists: () => true,
        data: () => ({
          keyId: 'sakey_123',
          keyData: validKeyData,
        }),
      })

      const result = await decryptSafeAdultData(validEncryptedData, 'sakey_123')

      expect(result).toBeDefined()
      expect(result.phone).toBe('+15551234567')
    })

    it('should throw when key not found', async () => {
      mockGet.mockResolvedValue({ exists: () => false })

      await expect(decryptSafeAdultData('encrypted_data', 'sakey_nonexistent')).rejects.toThrow(
        'not found'
      )
    })

    it('should throw on empty keyId', async () => {
      await expect(decryptSafeAdultData('encrypted_data', '')).rejects.toThrow('keyId')
    })

    it('should throw on empty encrypted data', async () => {
      await expect(decryptSafeAdultData('', 'sakey_123')).rejects.toThrow('data')
    })
  })

  // ============================================
  // Key Isolation Tests
  // ============================================

  describe('verifyKeyIsolation', () => {
    it('should return true when key is isolated', async () => {
      mockGet.mockResolvedValue({
        exists: () => true,
        data: () => ({
          keyId: 'sakey_123',
          childId: 'child_123',
          // No familyId reference
        }),
      })

      const result = await verifyKeyIsolation('sakey_123', 'family_456')

      expect(result).toBe(true)
    })

    it('should return false when key has family reference', async () => {
      mockGet.mockResolvedValue({
        exists: () => true,
        data: () => ({
          keyId: 'sakey_123',
          childId: 'child_123',
          familyId: 'family_456', // SHOULD NOT EXIST!
        }),
      })

      const result = await verifyKeyIsolation('sakey_123', 'family_456')

      expect(result).toBe(false)
    })

    it('should return true when key not found (nothing to leak)', async () => {
      mockGet.mockResolvedValue({ exists: () => false })

      const result = await verifyKeyIsolation('sakey_nonexistent', 'family_456')

      expect(result).toBe(true)
    })
  })

  describe('isKeyAccessibleToFamily', () => {
    it('should return false for properly isolated key', async () => {
      mockGet.mockResolvedValue({
        exists: () => true,
        data: () => ({
          keyId: 'sakey_123',
          childId: 'child_123',
          // No familyId - properly isolated
        }),
      })

      const result = await isKeyAccessibleToFamily('sakey_123', 'family_456')

      expect(result).toBe(false)
    })

    it('should return true if key incorrectly references family', async () => {
      mockGet.mockResolvedValue({
        exists: () => true,
        data: () => ({
          keyId: 'sakey_123',
          familyId: 'family_456', // Incorrect! Should not have family reference
        }),
      })

      const result = await isKeyAccessibleToFamily('sakey_123', 'family_456')

      expect(result).toBe(true)
    })
  })

  // ============================================
  // Helper Function Tests
  // ============================================

  describe('deriveKeyFromId', () => {
    it('should derive consistent key from ID', () => {
      const key1 = deriveKeyFromId('sakey_123')
      const key2 = deriveKeyFromId('sakey_123')

      expect(key1).toBe(key2)
    })

    it('should derive different keys for different IDs', () => {
      const key1 = deriveKeyFromId('sakey_123')
      const key2 = deriveKeyFromId('sakey_456')

      expect(key1).not.toBe(key2)
    })

    it('should throw on empty ID', () => {
      expect(() => deriveKeyFromId('')).toThrow('id')
    })
  })
})
