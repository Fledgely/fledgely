/**
 * IsolatedSignalStorageService Tests - Story 7.5.6 Task 2
 *
 * TDD tests for isolated signal storage.
 * AC1: Signal stored in isolated collection (not under family document)
 * AC4: Signal excluded from family audit trail
 *
 * CRITICAL SAFETY:
 * - Collection at ROOT level (NOT under families/)
 * - childId is anonymized/hashed
 * - No familyId in document
 * - All access requires authorization
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as firestore from 'firebase/firestore'
import {
  storeIsolatedSignal,
  getIsolatedSignal,
  anonymizeChildId,
  verifyIsolatedStorage,
  deleteIsolatedSignal,
  ISOLATED_SIGNALS_COLLECTION,
  type IsolatedSignal,
} from './isolatedSignalStorageService'

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

describe('IsolatedSignalStorageService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('ISOLATED_SIGNALS_COLLECTION', () => {
    it('should be named isolatedSafetySignals', () => {
      expect(ISOLATED_SIGNALS_COLLECTION).toBe('isolatedSafetySignals')
    })

    it('should NOT contain familyId in path', () => {
      // Collection is at root level, not under families/
      expect(ISOLATED_SIGNALS_COLLECTION).not.toContain('families')
      expect(ISOLATED_SIGNALS_COLLECTION).not.toContain('familyId')
    })

    it('should be a root-level collection', () => {
      // Path should not start with nested path
      expect(ISOLATED_SIGNALS_COLLECTION).not.toContain('/')
    })
  })

  describe('anonymizeChildId', () => {
    it('should return different output than input', () => {
      const childId = 'child_123'
      const anonymized = anonymizeChildId(childId)

      expect(anonymized).not.toBe(childId)
    })

    it('should produce consistent hash for same input', () => {
      const childId = 'child_123'
      const hash1 = anonymizeChildId(childId)
      const hash2 = anonymizeChildId(childId)

      expect(hash1).toBe(hash2)
    })

    it('should produce different hashes for different inputs', () => {
      const hash1 = anonymizeChildId('child_123')
      const hash2 = anonymizeChildId('child_456')

      expect(hash1).not.toBe(hash2)
    })

    it('should require childId', () => {
      expect(() => anonymizeChildId('')).toThrow('childId is required')
    })

    it('should produce fixed-length output', () => {
      const hash1 = anonymizeChildId('short')
      const hash2 = anonymizeChildId('very_long_child_id_that_is_much_longer')

      expect(hash1.length).toBe(hash2.length)
    })

    it('should prefix with anon_ for clarity', () => {
      const anonymized = anonymizeChildId('child_123')

      expect(anonymized).toMatch(/^anon_/)
    })
  })

  describe('storeIsolatedSignal', () => {
    it('should store signal in isolated collection', async () => {
      const mockDocRef = {}
      vi.mocked(firestore.doc).mockReturnValue(mockDocRef as any)
      vi.mocked(firestore.setDoc).mockResolvedValue(undefined)

      await storeIsolatedSignal('signal_123', 'child_456', 'encrypted-payload', 'key_789', 'US')

      expect(firestore.doc).toHaveBeenCalledWith(undefined, 'isolatedSafetySignals', 'signal_123')
    })

    it('should require signalId', async () => {
      await expect(
        storeIsolatedSignal('', 'child_456', 'payload', 'key_789', 'US')
      ).rejects.toThrow('signalId is required')
    })

    it('should require childId', async () => {
      await expect(
        storeIsolatedSignal('signal_123', '', 'payload', 'key_789', 'US')
      ).rejects.toThrow('childId is required')
    })

    it('should require encryptedPayload', async () => {
      await expect(
        storeIsolatedSignal('signal_123', 'child_456', '', 'key_789', 'US')
      ).rejects.toThrow('encryptedPayload is required')
    })

    it('should require encryptionKeyId', async () => {
      await expect(
        storeIsolatedSignal('signal_123', 'child_456', 'payload', '', 'US')
      ).rejects.toThrow('encryptionKeyId is required')
    })

    it('should require jurisdiction', async () => {
      await expect(
        storeIsolatedSignal('signal_123', 'child_456', 'payload', 'key_789', '')
      ).rejects.toThrow('jurisdiction is required')
    })

    it('should anonymize childId in stored data', async () => {
      const mockDocRef = {}
      vi.mocked(firestore.doc).mockReturnValue(mockDocRef as any)
      vi.mocked(firestore.setDoc).mockResolvedValue(undefined)

      await storeIsolatedSignal('signal_123', 'child_456', 'encrypted-payload', 'key_789', 'US')

      const storedData = vi.mocked(firestore.setDoc).mock.calls[0][1] as any
      expect(storedData.anonymizedChildId).not.toBe('child_456')
      expect(storedData.anonymizedChildId).toMatch(/^anon_/)
    })

    it('should NOT store original childId', async () => {
      const mockDocRef = {}
      vi.mocked(firestore.doc).mockReturnValue(mockDocRef as any)
      vi.mocked(firestore.setDoc).mockResolvedValue(undefined)

      await storeIsolatedSignal('signal_123', 'child_456', 'encrypted-payload', 'key_789', 'US')

      const storedData = vi.mocked(firestore.setDoc).mock.calls[0][1] as any
      expect(storedData.childId).toBeUndefined()
    })

    it('should NOT store familyId', async () => {
      const mockDocRef = {}
      vi.mocked(firestore.doc).mockReturnValue(mockDocRef as any)
      vi.mocked(firestore.setDoc).mockResolvedValue(undefined)

      await storeIsolatedSignal('signal_123', 'child_456', 'encrypted-payload', 'key_789', 'US')

      const storedData = vi.mocked(firestore.setDoc).mock.calls[0][1] as any
      expect(storedData.familyId).toBeUndefined()
    })

    it('should NOT store parentIds', async () => {
      const mockDocRef = {}
      vi.mocked(firestore.doc).mockReturnValue(mockDocRef as any)
      vi.mocked(firestore.setDoc).mockResolvedValue(undefined)

      await storeIsolatedSignal('signal_123', 'child_456', 'encrypted-payload', 'key_789', 'US')

      const storedData = vi.mocked(firestore.setDoc).mock.calls[0][1] as any
      expect(storedData.parentIds).toBeUndefined()
    })

    it('should include createdAt timestamp', async () => {
      const mockDocRef = {}
      vi.mocked(firestore.doc).mockReturnValue(mockDocRef as any)
      vi.mocked(firestore.setDoc).mockResolvedValue(undefined)

      await storeIsolatedSignal('signal_123', 'child_456', 'encrypted-payload', 'key_789', 'US')

      const storedData = vi.mocked(firestore.setDoc).mock.calls[0][1] as any
      expect(storedData.createdAt).toBeInstanceOf(Date)
    })

    it('should return created IsolatedSignal', async () => {
      const mockDocRef = {}
      vi.mocked(firestore.doc).mockReturnValue(mockDocRef as any)
      vi.mocked(firestore.setDoc).mockResolvedValue(undefined)

      const result = await storeIsolatedSignal(
        'signal_123',
        'child_456',
        'encrypted-payload',
        'key_789',
        'US'
      )

      expect(result.id).toBe('signal_123')
      expect(result.encryptedPayload).toBe('encrypted-payload')
      expect(result.encryptionKeyId).toBe('key_789')
      expect(result.jurisdiction).toBe('US')
    })
  })

  describe('getIsolatedSignal', () => {
    it('should require signalId', async () => {
      await expect(getIsolatedSignal('', 'auth_123')).rejects.toThrow('signalId is required')
    })

    it('should require authorizationId', async () => {
      await expect(getIsolatedSignal('signal_123', '')).rejects.toThrow(
        'authorizationId is required'
      )
    })

    it('should return signal when exists', async () => {
      const mockSignal: IsolatedSignal = {
        id: 'signal_123',
        anonymizedChildId: 'anon_abc123',
        encryptedPayload: 'encrypted-data',
        encryptionKeyId: 'key_789',
        createdAt: new Date(),
        jurisdiction: 'US',
      }

      vi.mocked(firestore.doc).mockReturnValue({} as any)
      vi.mocked(firestore.getDoc).mockResolvedValue({
        exists: () => true,
        data: () => mockSignal,
      } as any)

      const result = await getIsolatedSignal('signal_123', 'auth_123')

      expect(result).not.toBeNull()
      expect(result?.id).toBe('signal_123')
    })

    it('should return null when signal does not exist', async () => {
      vi.mocked(firestore.doc).mockReturnValue({} as any)
      vi.mocked(firestore.getDoc).mockResolvedValue({
        exists: () => false,
      } as any)

      const result = await getIsolatedSignal('nonexistent', 'auth_123')

      expect(result).toBeNull()
    })

    it('should NOT return familyId in response', async () => {
      const mockSignal = {
        id: 'signal_123',
        anonymizedChildId: 'anon_abc123',
        encryptedPayload: 'encrypted-data',
        encryptionKeyId: 'key_789',
        createdAt: new Date(),
        jurisdiction: 'US',
      }

      vi.mocked(firestore.doc).mockReturnValue({} as any)
      vi.mocked(firestore.getDoc).mockResolvedValue({
        exists: () => true,
        data: () => mockSignal,
      } as any)

      const result = await getIsolatedSignal('signal_123', 'auth_123')

      expect((result as any)?.familyId).toBeUndefined()
    })
  })

  describe('deleteIsolatedSignal', () => {
    it('should require signalId', async () => {
      await expect(deleteIsolatedSignal('', 'auth_123')).rejects.toThrow('signalId is required')
    })

    it('should require authorizationId', async () => {
      await expect(deleteIsolatedSignal('signal_123', '')).rejects.toThrow(
        'authorizationId is required'
      )
    })

    it('should delete signal when exists', async () => {
      vi.mocked(firestore.doc).mockReturnValue({} as any)
      vi.mocked(firestore.getDoc).mockResolvedValue({
        exists: () => true,
      } as any)
      vi.mocked(firestore.deleteDoc).mockResolvedValue(undefined)

      await deleteIsolatedSignal('signal_123', 'auth_123')

      expect(firestore.deleteDoc).toHaveBeenCalled()
    })

    it('should throw when signal does not exist', async () => {
      vi.mocked(firestore.doc).mockReturnValue({} as any)
      vi.mocked(firestore.getDoc).mockResolvedValue({
        exists: () => false,
      } as any)

      await expect(deleteIsolatedSignal('nonexistent', 'auth_123')).rejects.toThrow(
        'Signal not found'
      )
    })
  })

  describe('verifyIsolatedStorage', () => {
    it('should require signalId', async () => {
      await expect(verifyIsolatedStorage('')).rejects.toThrow('signalId is required')
    })

    it('should return true when signal is in isolated collection', async () => {
      vi.mocked(firestore.doc).mockReturnValue({} as any)
      vi.mocked(firestore.getDoc).mockResolvedValue({
        exists: () => true,
      } as any)

      const result = await verifyIsolatedStorage('signal_123')

      expect(result).toBe(true)
    })

    it('should return false when signal is not in isolated collection', async () => {
      vi.mocked(firestore.doc).mockReturnValue({} as any)
      vi.mocked(firestore.getDoc).mockResolvedValue({
        exists: () => false,
      } as any)

      const result = await verifyIsolatedStorage('signal_123')

      expect(result).toBe(false)
    })
  })

  describe('IsolatedSignal interface', () => {
    it('should NOT have familyId field', () => {
      // This is a compile-time check that familyId is not in the interface
      const signal: IsolatedSignal = {
        id: 'signal_123',
        anonymizedChildId: 'anon_abc123',
        encryptedPayload: 'encrypted-data',
        encryptionKeyId: 'key_789',
        createdAt: new Date(),
        jurisdiction: 'US',
      }

      // TypeScript would error if we tried to add familyId
      expect((signal as any).familyId).toBeUndefined()
    })

    it('should NOT have parentIds field', () => {
      const signal: IsolatedSignal = {
        id: 'signal_123',
        anonymizedChildId: 'anon_abc123',
        encryptedPayload: 'encrypted-data',
        encryptionKeyId: 'key_789',
        createdAt: new Date(),
        jurisdiction: 'US',
      }

      expect((signal as any).parentIds).toBeUndefined()
    })

    it('should NOT have childId field (uses anonymizedChildId)', () => {
      const signal: IsolatedSignal = {
        id: 'signal_123',
        anonymizedChildId: 'anon_abc123',
        encryptedPayload: 'encrypted-data',
        encryptionKeyId: 'key_789',
        createdAt: new Date(),
        jurisdiction: 'US',
      }

      expect((signal as any).childId).toBeUndefined()
    })
  })
})
