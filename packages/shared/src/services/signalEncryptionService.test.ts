/**
 * SignalEncryptionService Tests - Story 7.5.6 Task 1
 *
 * TDD tests for signal encryption key management.
 * AC2: Signal uses separate encryption key (not family key)
 * AC5: Admin access requires authorization
 *
 * CRITICAL SAFETY:
 * - Keys stored in isolated collection (NOT under family)
 * - Key references point to Cloud KMS, not plaintext keys
 * - Family encryption key CANNOT decrypt signal data
 * - All key operations logged to admin audit
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as firestore from 'firebase/firestore'
import {
  generateSignalEncryptionKey,
  encryptSignalData,
  decryptSignalData,
  verifyKeyIsolation,
  getSignalEncryptionKey,
  deleteSignalEncryptionKey,
  isKeyAccessibleToFamily,
  SIGNAL_ENCRYPTION_KEYS_COLLECTION,
  type SignalEncryptionKey,
} from './signalEncryptionService'

// Mock Firebase
vi.mock('firebase/firestore', () => ({
  getFirestore: vi.fn(),
  collection: vi.fn(),
  doc: vi.fn(),
  getDoc: vi.fn(),
  setDoc: vi.fn(),
  deleteDoc: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  getDocs: vi.fn(),
}))

// Mock crypto.subtle
const mockCryptoKey = { type: 'secret' }
const mockEncrypted = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16])
const mockDecrypted = new TextEncoder().encode(JSON.stringify({ test: 'data' }))

vi.stubGlobal('crypto', {
  subtle: {
    generateKey: vi.fn().mockResolvedValue(mockCryptoKey),
    exportKey: vi.fn().mockResolvedValue(new Uint8Array(32).buffer),
    importKey: vi.fn().mockResolvedValue(mockCryptoKey),
    encrypt: vi.fn().mockResolvedValue(mockEncrypted.buffer),
    decrypt: vi.fn().mockResolvedValue(mockDecrypted.buffer),
  },
  getRandomValues: vi.fn((arr: Uint8Array) => {
    for (let i = 0; i < arr.length; i++) {
      arr[i] = Math.floor(Math.random() * 256)
    }
    return arr
  }),
})

describe('SignalEncryptionService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('SIGNAL_ENCRYPTION_KEYS_COLLECTION', () => {
    it('should be named signalEncryptionKeys', () => {
      expect(SIGNAL_ENCRYPTION_KEYS_COLLECTION).toBe('signalEncryptionKeys')
    })

    it('should NOT contain familyId in path', () => {
      // Collection is at root level, not under families/
      expect(SIGNAL_ENCRYPTION_KEYS_COLLECTION).not.toContain('families')
      expect(SIGNAL_ENCRYPTION_KEYS_COLLECTION).not.toContain('familyId')
    })
  })

  describe('generateSignalEncryptionKey', () => {
    it('should generate a unique key ID for each signal', async () => {
      const mockDocRef = {}
      vi.mocked(firestore.doc).mockReturnValue(mockDocRef as any)
      vi.mocked(firestore.setDoc).mockResolvedValue(undefined)

      const result1 = await generateSignalEncryptionKey('signal_123')
      const result2 = await generateSignalEncryptionKey('signal_456')

      expect(result1.id).toBeDefined()
      expect(result2.id).toBeDefined()
      expect(result1.id).not.toBe(result2.id)
    })

    it('should require signalId', async () => {
      await expect(generateSignalEncryptionKey('')).rejects.toThrow('signalId is required')
    })

    it('should store key in isolated collection', async () => {
      const mockDocRef = {}
      vi.mocked(firestore.doc).mockReturnValue(mockDocRef as any)
      vi.mocked(firestore.setDoc).mockResolvedValue(undefined)

      await generateSignalEncryptionKey('signal_123')

      expect(firestore.doc).toHaveBeenCalledWith(
        undefined,
        'signalEncryptionKeys',
        expect.any(String)
      )
    })

    it('should set algorithm to AES-256-GCM', async () => {
      const mockDocRef = {}
      vi.mocked(firestore.doc).mockReturnValue(mockDocRef as any)
      vi.mocked(firestore.setDoc).mockResolvedValue(undefined)

      const result = await generateSignalEncryptionKey('signal_123')

      expect(result.algorithm).toBe('AES-256-GCM')
    })

    it('should include signalId in key metadata', async () => {
      const mockDocRef = {}
      vi.mocked(firestore.doc).mockReturnValue(mockDocRef as any)
      vi.mocked(firestore.setDoc).mockResolvedValue(undefined)

      const result = await generateSignalEncryptionKey('signal_123')

      expect(result.signalId).toBe('signal_123')
    })

    it('should include keyReference (simulated KMS reference)', async () => {
      const mockDocRef = {}
      vi.mocked(firestore.doc).mockReturnValue(mockDocRef as any)
      vi.mocked(firestore.setDoc).mockResolvedValue(undefined)

      const result = await generateSignalEncryptionKey('signal_123')

      expect(result.keyReference).toBeDefined()
      expect(result.keyReference).toContain('kms_ref_')
    })

    it('should include createdAt timestamp', async () => {
      const mockDocRef = {}
      vi.mocked(firestore.doc).mockReturnValue(mockDocRef as any)
      vi.mocked(firestore.setDoc).mockResolvedValue(undefined)

      const result = await generateSignalEncryptionKey('signal_123')

      expect(result.createdAt).toBeInstanceOf(Date)
    })

    it('should NOT include familyId in stored key', async () => {
      const mockDocRef = {}
      vi.mocked(firestore.doc).mockReturnValue(mockDocRef as any)
      vi.mocked(firestore.setDoc).mockResolvedValue(undefined)

      await generateSignalEncryptionKey('signal_123')

      const storedData = vi.mocked(firestore.setDoc).mock.calls[0][1] as any
      expect(storedData.familyId).toBeUndefined()
    })
  })

  describe('getSignalEncryptionKey', () => {
    it('should return key by ID when exists', async () => {
      const mockKey: SignalEncryptionKey = {
        id: 'key_123',
        signalId: 'signal_123',
        algorithm: 'AES-256-GCM',
        createdAt: new Date(),
        keyReference: 'kms_ref_abc',
      }

      vi.mocked(firestore.doc).mockReturnValue({} as any)
      vi.mocked(firestore.getDoc).mockResolvedValue({
        exists: () => true,
        data: () => mockKey,
      } as any)

      const result = await getSignalEncryptionKey('key_123')

      expect(result).toEqual(mockKey)
    })

    it('should return null when key does not exist', async () => {
      vi.mocked(firestore.doc).mockReturnValue({} as any)
      vi.mocked(firestore.getDoc).mockResolvedValue({
        exists: () => false,
      } as any)

      const result = await getSignalEncryptionKey('nonexistent')

      expect(result).toBeNull()
    })

    it('should require keyId', async () => {
      await expect(getSignalEncryptionKey('')).rejects.toThrow('keyId is required')
    })
  })

  describe('deleteSignalEncryptionKey', () => {
    it('should delete key when exists', async () => {
      vi.mocked(firestore.doc).mockReturnValue({} as any)
      vi.mocked(firestore.getDoc).mockResolvedValue({
        exists: () => true,
      } as any)
      vi.mocked(firestore.deleteDoc).mockResolvedValue(undefined)

      await deleteSignalEncryptionKey('key_123')

      expect(firestore.deleteDoc).toHaveBeenCalled()
    })

    it('should not throw when key does not exist', async () => {
      vi.mocked(firestore.doc).mockReturnValue({} as any)
      vi.mocked(firestore.getDoc).mockResolvedValue({
        exists: () => false,
      } as any)

      await expect(deleteSignalEncryptionKey('nonexistent')).resolves.not.toThrow()
    })

    it('should require keyId', async () => {
      await expect(deleteSignalEncryptionKey('')).rejects.toThrow('keyId is required')
    })
  })

  describe('encryptSignalData', () => {
    it('should encrypt data with isolated key', async () => {
      const mockKey = {
        id: 'key_123',
        signalId: 'signal_123',
        algorithm: 'AES-256-GCM',
        createdAt: new Date(),
        keyReference: 'kms_ref_abc',
        keyData: btoa('test-key-data-32-bytes-long-key!'),
      }

      vi.mocked(firestore.collection).mockReturnValue({} as any)
      vi.mocked(firestore.query).mockReturnValue({} as any)
      vi.mocked(firestore.where).mockReturnValue({} as any)
      vi.mocked(firestore.getDocs).mockResolvedValue({
        empty: false,
        docs: [{ data: () => mockKey }],
      } as any)

      const data = { childId: 'child_123', platform: 'web' }
      const result = await encryptSignalData('signal_123', data)

      expect(result.encryptedData).toBeDefined()
      expect(result.keyId).toBe('key_123')
    })

    it('should require signalId', async () => {
      await expect(encryptSignalData('', { test: 'data' })).rejects.toThrow('signalId is required')
    })

    it('should throw when key not found', async () => {
      vi.mocked(firestore.collection).mockReturnValue({} as any)
      vi.mocked(firestore.query).mockReturnValue({} as any)
      vi.mocked(firestore.where).mockReturnValue({} as any)
      vi.mocked(firestore.getDocs).mockResolvedValue({
        empty: true,
        docs: [],
      } as any)

      await expect(encryptSignalData('signal_123', { test: 'data' })).rejects.toThrow(
        'Encryption key not found'
      )
    })
  })

  describe('decryptSignalData', () => {
    it('should require authorizationId', async () => {
      await expect(decryptSignalData('signal_123', 'encrypted-data', '')).rejects.toThrow(
        'authorizationId is required'
      )
    })

    it('should require signalId', async () => {
      await expect(decryptSignalData('', 'encrypted-data', 'auth_123')).rejects.toThrow(
        'signalId is required'
      )
    })

    it('should require encryptedData', async () => {
      await expect(decryptSignalData('signal_123', '', 'auth_123')).rejects.toThrow(
        'encryptedData is required'
      )
    })

    it('should return null when key not found', async () => {
      vi.mocked(firestore.collection).mockReturnValue({} as any)
      vi.mocked(firestore.query).mockReturnValue({} as any)
      vi.mocked(firestore.where).mockReturnValue({} as any)
      vi.mocked(firestore.getDocs).mockResolvedValue({
        empty: true,
        docs: [],
      } as any)

      const result = await decryptSignalData('signal_123', 'encrypted-data', 'auth_123')

      expect(result).toBeNull()
    })

    it('should decrypt data when key exists and authorization valid', async () => {
      const mockKey = {
        id: 'key_123',
        signalId: 'signal_123',
        algorithm: 'AES-256-GCM',
        createdAt: new Date(),
        keyReference: 'kms_ref_abc',
        keyData: btoa('test-key-data-32-bytes-long-key!'),
      }

      // Mock IV + ciphertext
      const iv = new Uint8Array(12)
      const ciphertext = new Uint8Array([1, 2, 3, 4])
      const combined = new Uint8Array([...iv, ...ciphertext])
      const encryptedBase64 = btoa(String.fromCharCode(...combined))

      vi.mocked(firestore.collection).mockReturnValue({} as any)
      vi.mocked(firestore.query).mockReturnValue({} as any)
      vi.mocked(firestore.where).mockReturnValue({} as any)
      vi.mocked(firestore.getDocs).mockResolvedValue({
        empty: false,
        docs: [{ data: () => mockKey }],
      } as any)

      const result = await decryptSignalData('signal_123', encryptedBase64, 'auth_123')

      expect(result).toEqual({ test: 'data' })
    })
  })

  describe('verifyKeyIsolation', () => {
    it('should return true when key is properly isolated', async () => {
      const mockKey = {
        id: 'key_123',
        signalId: 'signal_123',
        algorithm: 'AES-256-GCM',
        createdAt: new Date(),
        keyReference: 'kms_ref_abc',
        // NO familyId - properly isolated
      }

      vi.mocked(firestore.doc).mockReturnValue({} as any)
      vi.mocked(firestore.getDoc).mockResolvedValue({
        exists: () => true,
        data: () => mockKey,
      } as any)

      const result = await verifyKeyIsolation('key_123', 'family_456')

      expect(result).toBe(true)
    })

    it('should return false when key has familyId reference', async () => {
      const mockKey = {
        id: 'key_123',
        signalId: 'signal_123',
        algorithm: 'AES-256-GCM',
        createdAt: new Date(),
        keyReference: 'kms_ref_abc',
        familyId: 'family_456', // BAD - should not exist
      }

      vi.mocked(firestore.doc).mockReturnValue({} as any)
      vi.mocked(firestore.getDoc).mockResolvedValue({
        exists: () => true,
        data: () => mockKey,
      } as any)

      const result = await verifyKeyIsolation('key_123', 'family_456')

      expect(result).toBe(false)
    })

    it('should return true when key does not exist', async () => {
      vi.mocked(firestore.doc).mockReturnValue({} as any)
      vi.mocked(firestore.getDoc).mockResolvedValue({
        exists: () => false,
      } as any)

      const result = await verifyKeyIsolation('nonexistent', 'family_456')

      expect(result).toBe(true)
    })

    it('should require keyId', async () => {
      await expect(verifyKeyIsolation('', 'family_456')).rejects.toThrow('keyId is required')
    })

    it('should require familyId', async () => {
      await expect(verifyKeyIsolation('key_123', '')).rejects.toThrow('familyId is required')
    })
  })

  describe('isKeyAccessibleToFamily', () => {
    it('should return false when key is properly isolated', async () => {
      const mockKey = {
        id: 'key_123',
        signalId: 'signal_123',
        algorithm: 'AES-256-GCM',
        // NO familyId
      }

      vi.mocked(firestore.doc).mockReturnValue({} as any)
      vi.mocked(firestore.getDoc).mockResolvedValue({
        exists: () => true,
        data: () => mockKey,
      } as any)

      const result = await isKeyAccessibleToFamily('key_123', 'family_456')

      expect(result).toBe(false)
    })

    it('should return true when key has matching familyId (BAD)', async () => {
      const mockKey = {
        id: 'key_123',
        signalId: 'signal_123',
        familyId: 'family_456', // BAD - accessible to family
      }

      vi.mocked(firestore.doc).mockReturnValue({} as any)
      vi.mocked(firestore.getDoc).mockResolvedValue({
        exists: () => true,
        data: () => mockKey,
      } as any)

      const result = await isKeyAccessibleToFamily('key_123', 'family_456')

      expect(result).toBe(true)
    })

    it('should return false when key does not exist', async () => {
      vi.mocked(firestore.doc).mockReturnValue({} as any)
      vi.mocked(firestore.getDoc).mockResolvedValue({
        exists: () => false,
      } as any)

      const result = await isKeyAccessibleToFamily('nonexistent', 'family_456')

      expect(result).toBe(false)
    })
  })
})
