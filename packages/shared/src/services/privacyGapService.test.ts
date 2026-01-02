/**
 * PrivacyGapService Tests - Story 7.5.7 Task 4
 *
 * TDD tests for privacy gap application after blackout ends.
 * AC5: Privacy gaps applied after blackout
 *
 * CRITICAL SAFETY:
 * - Privacy gaps applied automatically when blackout expires
 * - Signal period data is masked/anonymized
 * - Family sees "normal activity" during gapped period
 * - No evidence of safety signal remains visible
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as firestore from 'firebase/firestore'
import {
  applyPostBlackoutPrivacyGap,
  maskSignalPeriodData,
  isPrivacyGapped,
  getSignalPrivacyGapStatus,
  createSignalPrivacyGap,
  SIGNAL_PRIVACY_GAPS_COLLECTION,
  MASKED_DATA_COLLECTION,
  type SignalPrivacyGap,
  type MaskedDataRecord,
} from './privacyGapService'

// Mock Firebase
vi.mock('firebase/firestore', () => ({
  getFirestore: vi.fn(),
  collection: vi.fn(),
  doc: vi.fn(),
  getDoc: vi.fn(),
  setDoc: vi.fn(),
  updateDoc: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  getDocs: vi.fn(),
  addDoc: vi.fn(),
}))

describe('PrivacyGapService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('SIGNAL_PRIVACY_GAPS_COLLECTION', () => {
    it('should be named signalPrivacyGaps', () => {
      expect(SIGNAL_PRIVACY_GAPS_COLLECTION).toBe('signalPrivacyGaps')
    })

    it('should be a root-level collection', () => {
      expect(SIGNAL_PRIVACY_GAPS_COLLECTION).not.toContain('/')
      expect(SIGNAL_PRIVACY_GAPS_COLLECTION).not.toContain('families')
    })
  })

  describe('MASKED_DATA_COLLECTION', () => {
    it('should be named maskedData', () => {
      expect(MASKED_DATA_COLLECTION).toBe('maskedData')
    })

    it('should be a root-level collection', () => {
      expect(MASKED_DATA_COLLECTION).not.toContain('/')
      expect(MASKED_DATA_COLLECTION).not.toContain('families')
    })
  })

  describe('createSignalPrivacyGap', () => {
    it('should create a privacy gap record', async () => {
      const mockDocRef = {}
      vi.mocked(firestore.doc).mockReturnValue(mockDocRef as any)
      vi.mocked(firestore.setDoc).mockResolvedValue(undefined)

      const startTime = new Date()
      const endTime = new Date(Date.now() + 48 * 60 * 60 * 1000)
      const result = await createSignalPrivacyGap('signal-123', 'child-456', startTime, endTime)

      expect(result.signalId).toBe('signal-123')
      expect(result.childId).toBe('child-456')
      expect(result.applied).toBe(false)
      expect(result.appliedAt).toBeNull()
    })

    it('should require signalId', async () => {
      const startTime = new Date()
      const endTime = new Date(Date.now() + 48 * 60 * 60 * 1000)
      await expect(createSignalPrivacyGap('', 'child-456', startTime, endTime)).rejects.toThrow(
        'signalId is required'
      )
    })

    it('should require childId', async () => {
      const startTime = new Date()
      const endTime = new Date(Date.now() + 48 * 60 * 60 * 1000)
      await expect(createSignalPrivacyGap('signal-123', '', startTime, endTime)).rejects.toThrow(
        'childId is required'
      )
    })

    it('should require startTime', async () => {
      const endTime = new Date(Date.now() + 48 * 60 * 60 * 1000)
      await expect(
        createSignalPrivacyGap('signal-123', 'child-456', null as any, endTime)
      ).rejects.toThrow('startTime is required')
    })

    it('should require endTime', async () => {
      const startTime = new Date()
      await expect(
        createSignalPrivacyGap('signal-123', 'child-456', startTime, null as any)
      ).rejects.toThrow('endTime is required')
    })

    it('should store gap in isolated collection', async () => {
      const mockDocRef = {}
      vi.mocked(firestore.doc).mockReturnValue(mockDocRef as any)
      vi.mocked(firestore.setDoc).mockResolvedValue(undefined)

      const startTime = new Date()
      const endTime = new Date(Date.now() + 48 * 60 * 60 * 1000)
      await createSignalPrivacyGap('signal-123', 'child-456', startTime, endTime)

      expect(firestore.doc).toHaveBeenCalledWith(undefined, 'signalPrivacyGaps', expect.any(String))
    })
  })

  describe('applyPostBlackoutPrivacyGap', () => {
    it('should apply privacy gap when blackout ends', async () => {
      const mockGap: SignalPrivacyGap = {
        id: 'gap-123',
        signalId: 'signal-123',
        childId: 'child-456',
        startTime: new Date(Date.now() - 48 * 60 * 60 * 1000),
        endTime: new Date(),
        applied: false,
        appliedAt: null,
      }

      vi.mocked(firestore.query).mockReturnValue({} as any)
      vi.mocked(firestore.where).mockReturnValue({} as any)
      vi.mocked(firestore.getDocs).mockResolvedValue({
        empty: false,
        docs: [{ data: () => mockGap, ref: {} }],
      } as any)
      vi.mocked(firestore.updateDoc).mockResolvedValue(undefined)
      vi.mocked(firestore.doc).mockReturnValue({} as any)
      vi.mocked(firestore.addDoc).mockResolvedValue({ id: 'mask-1' } as any)
      vi.mocked(firestore.collection).mockReturnValue({} as any)

      await applyPostBlackoutPrivacyGap('signal-123')

      expect(firestore.updateDoc).toHaveBeenCalled()
    })

    it('should require signalId', async () => {
      await expect(applyPostBlackoutPrivacyGap('')).rejects.toThrow('signalId is required')
    })

    it('should throw when gap not found', async () => {
      vi.mocked(firestore.query).mockReturnValue({} as any)
      vi.mocked(firestore.where).mockReturnValue({} as any)
      vi.mocked(firestore.getDocs).mockResolvedValue({
        empty: true,
        docs: [],
      } as any)

      await expect(applyPostBlackoutPrivacyGap('nonexistent')).rejects.toThrow(
        'Privacy gap not found'
      )
    })

    it('should not reapply if already applied', async () => {
      const mockGap: SignalPrivacyGap = {
        id: 'gap-123',
        signalId: 'signal-123',
        childId: 'child-456',
        startTime: new Date(Date.now() - 48 * 60 * 60 * 1000),
        endTime: new Date(),
        applied: true,
        appliedAt: new Date(),
      }

      vi.mocked(firestore.query).mockReturnValue({} as any)
      vi.mocked(firestore.where).mockReturnValue({} as any)
      vi.mocked(firestore.getDocs).mockResolvedValue({
        empty: false,
        docs: [{ data: () => mockGap, ref: {} }],
      } as any)

      await applyPostBlackoutPrivacyGap('signal-123')

      // Should not call updateDoc if already applied
      expect(firestore.updateDoc).not.toHaveBeenCalled()
    })

    it('should mark gap as applied with timestamp', async () => {
      const mockGap: SignalPrivacyGap = {
        id: 'gap-123',
        signalId: 'signal-123',
        childId: 'child-456',
        startTime: new Date(Date.now() - 48 * 60 * 60 * 1000),
        endTime: new Date(),
        applied: false,
        appliedAt: null,
      }

      vi.mocked(firestore.query).mockReturnValue({} as any)
      vi.mocked(firestore.where).mockReturnValue({} as any)
      vi.mocked(firestore.getDocs).mockResolvedValue({
        empty: false,
        docs: [{ data: () => mockGap, ref: {} }],
      } as any)
      vi.mocked(firestore.updateDoc).mockResolvedValue(undefined)
      vi.mocked(firestore.doc).mockReturnValue({} as any)
      vi.mocked(firestore.addDoc).mockResolvedValue({ id: 'mask-1' } as any)
      vi.mocked(firestore.collection).mockReturnValue({} as any)

      await applyPostBlackoutPrivacyGap('signal-123')

      expect(firestore.updateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          applied: true,
          appliedAt: expect.any(Date),
        })
      )
    })
  })

  describe('maskSignalPeriodData', () => {
    it('should create masked data record', async () => {
      vi.mocked(firestore.doc).mockReturnValue({} as any)
      vi.mocked(firestore.collection).mockReturnValue({} as any)
      vi.mocked(firestore.addDoc).mockResolvedValue({ id: 'mask-1' } as any)

      const startTime = new Date()
      const endTime = new Date(Date.now() + 2 * 60 * 60 * 1000)

      await maskSignalPeriodData('child-456', startTime, endTime)

      expect(firestore.addDoc).toHaveBeenCalled()
    })

    it('should require childId', async () => {
      const startTime = new Date()
      const endTime = new Date(Date.now() + 2 * 60 * 60 * 1000)
      await expect(maskSignalPeriodData('', startTime, endTime)).rejects.toThrow(
        'childId is required'
      )
    })

    it('should require startTime', async () => {
      const endTime = new Date(Date.now() + 2 * 60 * 60 * 1000)
      await expect(maskSignalPeriodData('child-456', null as any, endTime)).rejects.toThrow(
        'startTime is required'
      )
    })

    it('should require endTime', async () => {
      const startTime = new Date()
      await expect(maskSignalPeriodData('child-456', startTime, null as any)).rejects.toThrow(
        'endTime is required'
      )
    })

    it('should store masked period in collection', async () => {
      vi.mocked(firestore.doc).mockReturnValue({} as any)
      vi.mocked(firestore.collection).mockReturnValue({} as any)
      vi.mocked(firestore.addDoc).mockResolvedValue({ id: 'mask-1' } as any)

      const startTime = new Date()
      const endTime = new Date(Date.now() + 2 * 60 * 60 * 1000)

      await maskSignalPeriodData('child-456', startTime, endTime)

      expect(firestore.collection).toHaveBeenCalledWith(undefined, 'maskedData')
    })
  })

  describe('isPrivacyGapped', () => {
    it('should return true when timestamp is within gapped period', async () => {
      const mockMaskedData: MaskedDataRecord = {
        id: 'mask-123',
        childId: 'child-456',
        startTime: new Date(Date.now() - 24 * 60 * 60 * 1000),
        endTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
        reason: 'signal_blackout',
        createdAt: new Date(),
      }

      vi.mocked(firestore.query).mockReturnValue({} as any)
      vi.mocked(firestore.where).mockReturnValue({} as any)
      vi.mocked(firestore.getDocs).mockResolvedValue({
        empty: false,
        docs: [{ data: () => mockMaskedData }],
      } as any)

      const result = await isPrivacyGapped('child-456', new Date())

      expect(result).toBe(true)
    })

    it('should return false when timestamp is outside gapped period', async () => {
      const mockMaskedData: MaskedDataRecord = {
        id: 'mask-123',
        childId: 'child-456',
        startTime: new Date(Date.now() - 72 * 60 * 60 * 1000),
        endTime: new Date(Date.now() - 24 * 60 * 60 * 1000),
        reason: 'signal_blackout',
        createdAt: new Date(),
      }

      vi.mocked(firestore.query).mockReturnValue({} as any)
      vi.mocked(firestore.where).mockReturnValue({} as any)
      vi.mocked(firestore.getDocs).mockResolvedValue({
        empty: false,
        docs: [{ data: () => mockMaskedData }],
      } as any)

      const result = await isPrivacyGapped('child-456', new Date())

      expect(result).toBe(false)
    })

    it('should return false when no masked data exists', async () => {
      vi.mocked(firestore.query).mockReturnValue({} as any)
      vi.mocked(firestore.where).mockReturnValue({} as any)
      vi.mocked(firestore.getDocs).mockResolvedValue({
        empty: true,
        docs: [],
      } as any)

      const result = await isPrivacyGapped('child-456', new Date())

      expect(result).toBe(false)
    })

    it('should require childId', async () => {
      await expect(isPrivacyGapped('', new Date())).rejects.toThrow('childId is required')
    })

    it('should require timestamp', async () => {
      await expect(isPrivacyGapped('child-456', null as any)).rejects.toThrow(
        'timestamp is required'
      )
    })
  })

  describe('getSignalPrivacyGapStatus', () => {
    it('should return privacy gap when found', async () => {
      const mockGap: SignalPrivacyGap = {
        id: 'gap-123',
        signalId: 'signal-123',
        childId: 'child-456',
        startTime: new Date(),
        endTime: new Date(Date.now() + 48 * 60 * 60 * 1000),
        applied: false,
        appliedAt: null,
      }

      vi.mocked(firestore.query).mockReturnValue({} as any)
      vi.mocked(firestore.where).mockReturnValue({} as any)
      vi.mocked(firestore.getDocs).mockResolvedValue({
        empty: false,
        docs: [{ data: () => mockGap }],
      } as any)

      const result = await getSignalPrivacyGapStatus('signal-123')

      expect(result).not.toBeNull()
      expect(result?.signalId).toBe('signal-123')
    })

    it('should return null when not found', async () => {
      vi.mocked(firestore.query).mockReturnValue({} as any)
      vi.mocked(firestore.where).mockReturnValue({} as any)
      vi.mocked(firestore.getDocs).mockResolvedValue({
        empty: true,
        docs: [],
      } as any)

      const result = await getSignalPrivacyGapStatus('nonexistent')

      expect(result).toBeNull()
    })

    it('should require signalId', async () => {
      await expect(getSignalPrivacyGapStatus('')).rejects.toThrow('signalId is required')
    })

    it('should return applied status correctly', async () => {
      const mockGap: SignalPrivacyGap = {
        id: 'gap-123',
        signalId: 'signal-123',
        childId: 'child-456',
        startTime: new Date(Date.now() - 48 * 60 * 60 * 1000),
        endTime: new Date(),
        applied: true,
        appliedAt: new Date(),
      }

      vi.mocked(firestore.query).mockReturnValue({} as any)
      vi.mocked(firestore.where).mockReturnValue({} as any)
      vi.mocked(firestore.getDocs).mockResolvedValue({
        empty: false,
        docs: [{ data: () => mockGap }],
      } as any)

      const result = await getSignalPrivacyGapStatus('signal-123')

      expect(result?.applied).toBe(true)
      expect(result?.appliedAt).not.toBeNull()
    })
  })
})
