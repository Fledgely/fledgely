/**
 * SignalSealingService Tests - Story 7.5.5 Task 3
 *
 * TDD tests for signal sealing from family access.
 * AC4: Audit trail sealing - once sealed, family members cannot see evidence.
 *
 * CRITICAL SAFETY:
 * - Sealed signals must be completely invisible to family accounts
 * - Only admin/legal personnel can access sealed signals
 * - Sealing is irreversible (protects children from retaliation)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import * as firestore from 'firebase/firestore'
import {
  sealSignalFromFamily,
  isSignalSealed,
  getSealedSignalForLegalRequest,
  verifySignalIsolation,
  removeFromFamilyCollections,
  SEALED_SIGNALS_COLLECTION,
  type SealedSignalData,
} from './signalSealingService'

// Mock Firebase
vi.mock('firebase/firestore', () => ({
  getFirestore: vi.fn(),
  collection: vi.fn(),
  doc: vi.fn(),
  getDoc: vi.fn(),
  getDocs: vi.fn(),
  setDoc: vi.fn(),
  updateDoc: vi.fn(),
  deleteDoc: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  writeBatch: vi.fn(() => ({
    delete: vi.fn(),
    commit: vi.fn(),
  })),
}))

describe('SignalSealingService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  // ============================================
  // Constants Tests
  // ============================================

  describe('SEALED_SIGNALS_COLLECTION', () => {
    it('should be named sealedSignals', () => {
      expect(SEALED_SIGNALS_COLLECTION).toBe('sealedSignals')
    })
  })

  // ============================================
  // sealSignalFromFamily Tests
  // ============================================

  describe('sealSignalFromFamily', () => {
    const setupSealMocks = () => {
      const mockBatch = {
        delete: vi.fn(),
        commit: vi.fn().mockResolvedValue(undefined),
      }
      vi.mocked(firestore.writeBatch).mockReturnValue(mockBatch as any)
      vi.mocked(firestore.getDocs).mockResolvedValue({ docs: [], empty: true } as any)
    }

    it('should seal a signal from family access', async () => {
      setupSealMocks()

      const mockSignal = {
        exists: () => true,
        data: () => ({
          id: 'sig_123',
          childId: 'child_456',
          familyId: 'family_789',
          status: 'sent',
          createdAt: new Date(),
        }),
      }

      vi.mocked(firestore.getDoc).mockResolvedValue(mockSignal as any)
      vi.mocked(firestore.setDoc).mockResolvedValue(undefined)

      await sealSignalFromFamily('sig_123')

      // Verify setDoc was called for sealed signal
      expect(firestore.setDoc).toHaveBeenCalled()
    })

    it('should throw if signal not found', async () => {
      const mockSignal = {
        exists: () => false,
      }

      vi.mocked(firestore.getDoc).mockResolvedValue(mockSignal as any)

      await expect(sealSignalFromFamily('nonexistent')).rejects.toThrow('Signal not found')
    })

    it('should throw for empty signalId', async () => {
      await expect(sealSignalFromFamily('')).rejects.toThrow('signalId is required')
    })

    it('should record sealedAt timestamp', async () => {
      setupSealMocks()

      const mockSignal = {
        exists: () => true,
        data: () => ({
          id: 'sig_123',
          childId: 'child_456',
          familyId: 'family_789',
          status: 'sent',
          createdAt: new Date(),
        }),
      }

      vi.mocked(firestore.getDoc).mockResolvedValue(mockSignal as any)
      vi.mocked(firestore.setDoc).mockResolvedValue(undefined)

      const before = new Date()
      await sealSignalFromFamily('sig_123')
      const after = new Date()

      // Verify setDoc was called with sealedAt timestamp
      expect(firestore.setDoc).toHaveBeenCalled()
      const setDocCall = vi.mocked(firestore.setDoc).mock.calls[0]
      const savedData = setDocCall[1] as SealedSignalData
      expect(savedData.sealedAt.getTime()).toBeGreaterThanOrEqual(before.getTime())
      expect(savedData.sealedAt.getTime()).toBeLessThanOrEqual(after.getTime())
    })

    it('should store reference to original signal', async () => {
      setupSealMocks()

      const mockSignal = {
        exists: () => true,
        data: () => ({
          id: 'sig_123',
          childId: 'child_456',
          familyId: 'family_789',
          status: 'sent',
          createdAt: new Date(),
        }),
      }

      vi.mocked(firestore.getDoc).mockResolvedValue(mockSignal as any)
      vi.mocked(firestore.setDoc).mockResolvedValue(undefined)

      await sealSignalFromFamily('sig_123')

      expect(firestore.setDoc).toHaveBeenCalled()
      const setDocCall = vi.mocked(firestore.setDoc).mock.calls[0]
      const savedData = setDocCall[1] as SealedSignalData
      expect(savedData.signalId).toBe('sig_123')
    })

    it('should NOT store family-identifying information', async () => {
      setupSealMocks()

      const mockSignal = {
        exists: () => true,
        data: () => ({
          id: 'sig_123',
          childId: 'child_456',
          familyId: 'family_789',
          status: 'sent',
          createdAt: new Date(),
          // These should NOT be stored in sealed version
          childName: 'John',
          familyName: 'Doe',
          parentEmail: 'parent@example.com',
        }),
      }

      vi.mocked(firestore.getDoc).mockResolvedValue(mockSignal as any)
      vi.mocked(firestore.setDoc).mockResolvedValue(undefined)

      await sealSignalFromFamily('sig_123')

      expect(firestore.setDoc).toHaveBeenCalled()
      const setDocCall = vi.mocked(firestore.setDoc).mock.calls[0]
      const savedData = setDocCall[1] as SealedSignalData

      // Should NOT have family-identifying info
      expect(savedData).not.toHaveProperty('childName')
      expect(savedData).not.toHaveProperty('familyName')
      expect(savedData).not.toHaveProperty('parentEmail')
    })
  })

  // ============================================
  // isSignalSealed Tests
  // ============================================

  describe('isSignalSealed', () => {
    it('should return true for sealed signal', async () => {
      const mockSealed = {
        exists: () => true,
      }

      vi.mocked(firestore.getDoc).mockResolvedValue(mockSealed as any)

      const result = await isSignalSealed('sig_123')
      expect(result).toBe(true)
    })

    it('should return false for non-sealed signal', async () => {
      const mockSealed = {
        exists: () => false,
      }

      vi.mocked(firestore.getDoc).mockResolvedValue(mockSealed as any)

      const result = await isSignalSealed('sig_456')
      expect(result).toBe(false)
    })

    it('should throw for empty signalId', async () => {
      await expect(isSignalSealed('')).rejects.toThrow('signalId is required')
    })
  })

  // ============================================
  // getSealedSignalForLegalRequest Tests
  // ============================================

  describe('getSealedSignalForLegalRequest', () => {
    it('should return sealed signal data for valid legal request', async () => {
      const sealedData: SealedSignalData = {
        signalId: 'sig_123',
        childId: 'child_456',
        familyId: 'family_789',
        sealedAt: new Date(),
        sealedReason: 'mandatory_report',
        jurisdiction: 'US-CA',
        originalStatus: 'sent',
        originalCreatedAt: new Date(),
      }

      const mockSealed = {
        exists: () => true,
        data: () => sealedData,
      }

      const mockLegalRequest = {
        exists: () => true,
        data: () => ({
          id: 'legal_123',
          signalIds: ['sig_123'],
          status: 'approved',
        }),
      }

      vi.mocked(firestore.getDoc)
        .mockResolvedValueOnce(mockLegalRequest as any) // First call for legal request
        .mockResolvedValueOnce(mockSealed as any) // Second call for sealed signal

      const result = await getSealedSignalForLegalRequest('sig_123', 'legal_123')

      expect(result).not.toBeNull()
      expect(result?.signalId).toBe('sig_123')
    })

    it('should return null if legal request not found', async () => {
      const mockLegalRequest = {
        exists: () => false,
      }

      vi.mocked(firestore.getDoc).mockResolvedValue(mockLegalRequest as any)

      const result = await getSealedSignalForLegalRequest('sig_123', 'nonexistent')
      expect(result).toBeNull()
    })

    it('should return null if legal request not approved', async () => {
      const mockLegalRequest = {
        exists: () => true,
        data: () => ({
          id: 'legal_123',
          signalIds: ['sig_123'],
          status: 'pending_legal_review',
        }),
      }

      vi.mocked(firestore.getDoc).mockResolvedValue(mockLegalRequest as any)

      const result = await getSealedSignalForLegalRequest('sig_123', 'legal_123')
      expect(result).toBeNull()
    })

    it('should return null if signal not in legal request', async () => {
      const mockLegalRequest = {
        exists: () => true,
        data: () => ({
          id: 'legal_123',
          signalIds: ['sig_999'], // Different signal
          status: 'approved',
        }),
      }

      vi.mocked(firestore.getDoc).mockResolvedValue(mockLegalRequest as any)

      const result = await getSealedSignalForLegalRequest('sig_123', 'legal_123')
      expect(result).toBeNull()
    })

    it('should return null if sealed signal not found', async () => {
      const mockLegalRequest = {
        exists: () => true,
        data: () => ({
          id: 'legal_123',
          signalIds: ['sig_123'],
          status: 'approved',
        }),
      }

      const mockSealed = {
        exists: () => false,
      }

      vi.mocked(firestore.getDoc)
        .mockResolvedValueOnce(mockLegalRequest as any)
        .mockResolvedValueOnce(mockSealed as any)

      const result = await getSealedSignalForLegalRequest('sig_123', 'legal_123')
      expect(result).toBeNull()
    })

    it('should throw for empty signalId', async () => {
      await expect(getSealedSignalForLegalRequest('', 'legal_123')).rejects.toThrow(
        'signalId is required'
      )
    })

    it('should throw for empty legalRequestId', async () => {
      await expect(getSealedSignalForLegalRequest('sig_123', '')).rejects.toThrow(
        'legalRequestId is required'
      )
    })
  })

  // ============================================
  // verifySignalIsolation Tests
  // ============================================

  describe('verifySignalIsolation', () => {
    it('should return true when signal is fully isolated from family', async () => {
      // Mock no signal references in family-visible collections
      const mockEmpty = {
        docs: [],
        empty: true,
      }

      vi.mocked(firestore.getDocs).mockResolvedValue(mockEmpty as any)

      const result = await verifySignalIsolation('sig_123', 'family_789')
      expect(result).toBe(true)
    })

    it('should return false when signal reference exists in family notifications', async () => {
      const mockWithDocs = {
        docs: [{ id: 'notif_1' }],
        empty: false,
      }

      vi.mocked(firestore.getDocs).mockResolvedValue(mockWithDocs as any)

      const result = await verifySignalIsolation('sig_123', 'family_789')
      expect(result).toBe(false)
    })

    it('should check multiple family-visible collections', async () => {
      // First collection has no docs, second has docs
      vi.mocked(firestore.getDocs)
        .mockResolvedValueOnce({ docs: [], empty: true } as any) // First collection
        .mockResolvedValueOnce({ docs: [], empty: true } as any) // Second collection
        .mockResolvedValueOnce({ docs: [{ id: 'ref_1' }], empty: false } as any) // Third has reference

      const result = await verifySignalIsolation('sig_123', 'family_789')
      expect(result).toBe(false)
    })

    it('should throw for empty signalId', async () => {
      await expect(verifySignalIsolation('', 'family_123')).rejects.toThrow('signalId is required')
    })

    it('should throw for empty familyId', async () => {
      await expect(verifySignalIsolation('sig_123', '')).rejects.toThrow('familyId is required')
    })
  })

  // ============================================
  // removeFromFamilyCollections Tests
  // ============================================

  describe('removeFromFamilyCollections', () => {
    it('should remove signal references from all family-visible collections', async () => {
      const mockBatch = {
        delete: vi.fn(),
        commit: vi.fn().mockResolvedValue(undefined),
      }

      vi.mocked(firestore.writeBatch).mockReturnValue(mockBatch as any)

      const mockDocs = {
        docs: [{ ref: 'ref_1' }, { ref: 'ref_2' }],
        empty: false,
      }

      vi.mocked(firestore.getDocs).mockResolvedValue(mockDocs as any)

      await removeFromFamilyCollections('sig_123', 'family_789')

      // Verify batch delete was called for each found document
      expect(mockBatch.delete).toHaveBeenCalled()
      expect(mockBatch.commit).toHaveBeenCalled()
    })

    it('should handle case where no references exist', async () => {
      const mockBatch = {
        delete: vi.fn(),
        commit: vi.fn().mockResolvedValue(undefined),
      }

      vi.mocked(firestore.writeBatch).mockReturnValue(mockBatch as any)

      const mockEmpty = {
        docs: [],
        empty: true,
      }

      vi.mocked(firestore.getDocs).mockResolvedValue(mockEmpty as any)

      // Should not throw even when no references exist
      await removeFromFamilyCollections('sig_123', 'family_789')

      // Commit should still be called (empty batch is valid)
      expect(mockBatch.commit).toHaveBeenCalled()
    })

    it('should throw for empty signalId', async () => {
      await expect(removeFromFamilyCollections('', 'family_123')).rejects.toThrow(
        'signalId is required'
      )
    })

    it('should throw for empty familyId', async () => {
      await expect(removeFromFamilyCollections('sig_123', '')).rejects.toThrow(
        'familyId is required'
      )
    })
  })
})
