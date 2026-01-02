/**
 * ActivityGapFillerService Tests - Story 7.5.7 Task 3
 *
 * TDD tests for synthetic activity gap filling.
 * AC2: Family audit trail shows no unusual entries
 * AC3: Normal activity continues during blackout
 *
 * CRITICAL SAFETY:
 * - Synthetic entries match child's normal patterns
 * - Synthetic flag hidden from family
 * - No monitoring gaps visible
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as firestore from 'firebase/firestore'
import {
  fillActivityGap,
  generateSyntheticActivity,
  isActivitySynthetic,
  getActivityPatterns,
  createActivityGap,
  ACTIVITY_GAPS_COLLECTION,
  type ActivityPattern,
} from './activityGapFillerService'

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

describe('ActivityGapFillerService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('ACTIVITY_GAPS_COLLECTION', () => {
    it('should be named activityGaps', () => {
      expect(ACTIVITY_GAPS_COLLECTION).toBe('activityGaps')
    })

    it('should be a root-level collection', () => {
      expect(ACTIVITY_GAPS_COLLECTION).not.toContain('/')
      expect(ACTIVITY_GAPS_COLLECTION).not.toContain('families')
    })
  })

  describe('createActivityGap', () => {
    it('should create gap record for blackout period', async () => {
      const mockDocRef = {}
      vi.mocked(firestore.doc).mockReturnValue(mockDocRef as any)
      vi.mocked(firestore.setDoc).mockResolvedValue(undefined)

      const startTime = new Date()
      const endTime = new Date(Date.now() + 48 * 60 * 60 * 1000)
      const result = await createActivityGap('child-456', startTime, endTime, 'signal_blackout')

      expect(result.childId).toBe('child-456')
      expect(result.reason).toBe('signal_blackout')
      expect(result.filled).toBe(false)
    })

    it('should require childId', async () => {
      const startTime = new Date()
      const endTime = new Date(Date.now() + 48 * 60 * 60 * 1000)
      await expect(createActivityGap('', startTime, endTime, 'signal_blackout')).rejects.toThrow(
        'childId is required'
      )
    })

    it('should require startTime', async () => {
      const endTime = new Date(Date.now() + 48 * 60 * 60 * 1000)
      await expect(
        createActivityGap('child-456', null as any, endTime, 'signal_blackout')
      ).rejects.toThrow('startTime is required')
    })

    it('should require endTime', async () => {
      const startTime = new Date()
      await expect(
        createActivityGap('child-456', startTime, null as any, 'signal_blackout')
      ).rejects.toThrow('endTime is required')
    })
  })

  describe('fillActivityGap', () => {
    it('should fill gap with synthetic activity', async () => {
      vi.mocked(firestore.doc).mockReturnValue({} as any)
      vi.mocked(firestore.setDoc).mockResolvedValue(undefined)
      vi.mocked(firestore.addDoc).mockResolvedValue({ id: 'synth-1' } as any)
      vi.mocked(firestore.query).mockReturnValue({} as any)
      vi.mocked(firestore.where).mockReturnValue({} as any)
      vi.mocked(firestore.getDocs).mockResolvedValue({
        empty: true,
        docs: [],
      } as any)
      vi.mocked(firestore.updateDoc).mockResolvedValue(undefined)
      vi.mocked(firestore.getDoc).mockResolvedValue({
        exists: () => false,
      } as any)

      const startTime = new Date()
      const endTime = new Date(Date.now() + 2 * 60 * 60 * 1000) // 2 hours

      await fillActivityGap('child-456', startTime, endTime)

      // Should have called addDoc for synthetic activities
      expect(firestore.addDoc).toHaveBeenCalled()
    })

    it('should require childId', async () => {
      const startTime = new Date()
      const endTime = new Date(Date.now() + 2 * 60 * 60 * 1000)
      await expect(fillActivityGap('', startTime, endTime)).rejects.toThrow('childId is required')
    })

    it('should require startTime', async () => {
      const endTime = new Date(Date.now() + 2 * 60 * 60 * 1000)
      await expect(fillActivityGap('child-456', null as any, endTime)).rejects.toThrow(
        'startTime is required'
      )
    })

    it('should require endTime', async () => {
      const startTime = new Date()
      await expect(fillActivityGap('child-456', startTime, null as any)).rejects.toThrow(
        'endTime is required'
      )
    })
  })

  describe('generateSyntheticActivity', () => {
    it('should generate synthetic activity entry', async () => {
      vi.mocked(firestore.doc).mockReturnValue({} as any)
      vi.mocked(firestore.getDoc).mockResolvedValue({
        exists: () => false,
      } as any)

      const result = await generateSyntheticActivity('child-456', new Date(), 'gap-123')

      expect(result.gapId).toBe('gap-123')
      expect(result.synthetic).toBe(true)
      expect(result.type).toBeDefined()
    })

    it('should mark entry as synthetic', async () => {
      vi.mocked(firestore.doc).mockReturnValue({} as any)
      vi.mocked(firestore.getDoc).mockResolvedValue({
        exists: () => false,
      } as any)

      const result = await generateSyntheticActivity('child-456', new Date(), 'gap-123')

      expect(result.synthetic).toBe(true)
    })

    it('should include timestamp', async () => {
      vi.mocked(firestore.doc).mockReturnValue({} as any)
      vi.mocked(firestore.getDoc).mockResolvedValue({
        exists: () => false,
      } as any)

      const timestamp = new Date()
      const result = await generateSyntheticActivity('child-456', timestamp, 'gap-123')

      expect(result.timestamp).toEqual(timestamp)
    })

    it('should require childId', async () => {
      await expect(generateSyntheticActivity('', new Date(), 'gap-123')).rejects.toThrow(
        'childId is required'
      )
    })

    it('should require timestamp', async () => {
      await expect(generateSyntheticActivity('child-456', null as any, 'gap-123')).rejects.toThrow(
        'timestamp is required'
      )
    })

    it('should require gapId', async () => {
      await expect(generateSyntheticActivity('child-456', new Date(), '')).rejects.toThrow(
        'gapId is required'
      )
    })
  })

  describe('isActivitySynthetic', () => {
    it('should return true for synthetic activity', async () => {
      const mockActivity = {
        id: 'synth-123',
        synthetic: true,
        type: 'normal_browsing',
      }

      vi.mocked(firestore.doc).mockReturnValue({} as any)
      vi.mocked(firestore.getDoc).mockResolvedValue({
        exists: () => true,
        data: () => mockActivity,
      } as any)

      const result = await isActivitySynthetic('synth-123')

      expect(result).toBe(true)
    })

    it('should return false for real activity', async () => {
      const mockActivity = {
        id: 'real-123',
        synthetic: false,
        type: 'normal_browsing',
      }

      vi.mocked(firestore.doc).mockReturnValue({} as any)
      vi.mocked(firestore.getDoc).mockResolvedValue({
        exists: () => true,
        data: () => mockActivity,
      } as any)

      const result = await isActivitySynthetic('real-123')

      expect(result).toBe(false)
    })

    it('should return false when activity not found', async () => {
      vi.mocked(firestore.doc).mockReturnValue({} as any)
      vi.mocked(firestore.getDoc).mockResolvedValue({
        exists: () => false,
      } as any)

      const result = await isActivitySynthetic('nonexistent')

      expect(result).toBe(false)
    })

    it('should require activityId', async () => {
      await expect(isActivitySynthetic('')).rejects.toThrow('activityId is required')
    })
  })

  describe('getActivityPatterns', () => {
    it('should return activity patterns for child', async () => {
      const mockPatterns: ActivityPattern = {
        childId: 'child-456',
        typicalActivityTypes: ['normal_browsing', 'normal_app_use'],
        averageActivityInterval: 15 * 60 * 1000, // 15 minutes
        peakHours: [9, 10, 11, 14, 15, 16, 19, 20],
        quietHours: [0, 1, 2, 3, 4, 5, 6, 7, 22, 23],
      }

      vi.mocked(firestore.doc).mockReturnValue({} as any)
      vi.mocked(firestore.getDoc).mockResolvedValue({
        exists: () => true,
        data: () => mockPatterns,
      } as any)

      const result = await getActivityPatterns('child-456')

      expect(result.childId).toBe('child-456')
      expect(result.typicalActivityTypes).toContain('normal_browsing')
    })

    it('should return default patterns when none found', async () => {
      vi.mocked(firestore.doc).mockReturnValue({} as any)
      vi.mocked(firestore.getDoc).mockResolvedValue({
        exists: () => false,
      } as any)

      const result = await getActivityPatterns('child-456')

      expect(result.childId).toBe('child-456')
      expect(result.typicalActivityTypes).toBeDefined()
      expect(result.typicalActivityTypes.length).toBeGreaterThan(0)
    })

    it('should require childId', async () => {
      await expect(getActivityPatterns('')).rejects.toThrow('childId is required')
    })
  })
})
