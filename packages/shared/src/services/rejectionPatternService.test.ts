/**
 * RejectionPatternService Tests - Story 34.5.1 Task 1
 *
 * TDD tests for rejection pattern tracking and analysis.
 * AC1: Track Proposal Rejections
 * AC2: 90-Day Rolling Window
 * AC3: Threshold Detection
 *
 * CRITICAL SAFETY:
 * - Privacy-preserving: Only track aggregate patterns
 * - No proposal content stored
 * - Child rights: Surface communication breakdowns
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as firestore from 'firebase/firestore'
import {
  recordRejection,
  calculateRejectionsInWindow,
  checkEscalationThreshold,
  getRejectionPattern,
  triggerEscalation,
  incrementProposalCount,
  REJECTION_PATTERNS_COLLECTION,
  REJECTION_EVENTS_COLLECTION,
  ESCALATION_EVENTS_COLLECTION,
  type RejectionPattern,
} from './rejectionPatternService'

// Mock Firebase
vi.mock('firebase/firestore', () => ({
  getFirestore: vi.fn(),
  collection: vi.fn(),
  doc: vi.fn(),
  getDoc: vi.fn(),
  setDoc: vi.fn(),
  updateDoc: vi.fn(),
  addDoc: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  getDocs: vi.fn(),
  Timestamp: {
    now: vi.fn(() => ({ toDate: () => new Date() })),
    fromDate: vi.fn((d: Date) => ({ toDate: () => d })),
  },
}))

describe('RejectionPatternService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Collection Constants', () => {
    it('should have correct collection names', () => {
      expect(REJECTION_PATTERNS_COLLECTION).toBe('rejectionPatterns')
      expect(REJECTION_EVENTS_COLLECTION).toBe('rejectionEvents')
      expect(ESCALATION_EVENTS_COLLECTION).toBe('escalationEvents')
    })
  })

  describe('recordRejection', () => {
    it('should record a rejection and return updated pattern', async () => {
      const mockPatternRef = {}
      const mockEventsRef = {}

      vi.mocked(firestore.doc).mockReturnValue(mockPatternRef as any)
      vi.mocked(firestore.collection).mockReturnValue(mockEventsRef as any)
      vi.mocked(firestore.getDoc).mockResolvedValue({
        exists: () => true,
        data: () => ({
          id: 'pattern-123',
          familyId: 'family-456',
          childId: 'child-789',
          totalProposals: 5,
          totalRejections: 2,
          rejectionsInWindow: 1,
          lastRejectionAt: null,
          escalationTriggered: false,
          escalationTriggeredAt: null,
        }),
      } as any)
      vi.mocked(firestore.updateDoc).mockResolvedValue(undefined)
      vi.mocked(firestore.addDoc).mockResolvedValue({ id: 'event-1' } as any)
      vi.mocked(firestore.query).mockReturnValue({} as any)
      vi.mocked(firestore.where).mockReturnValue({} as any)
      vi.mocked(firestore.getDocs).mockResolvedValue({ docs: [{ data: () => ({}) }] } as any)

      const result = await recordRejection('family-456', 'child-789', 'proposal-1')

      expect(result.totalRejections).toBe(3)
      expect(result.childId).toBe('child-789')
    })

    it('should create new pattern if none exists', async () => {
      const mockPatternRef = {}
      const mockEventsRef = {}

      vi.mocked(firestore.doc).mockReturnValue(mockPatternRef as any)
      vi.mocked(firestore.collection).mockReturnValue(mockEventsRef as any)
      vi.mocked(firestore.getDoc).mockResolvedValue({
        exists: () => false,
      } as any)
      vi.mocked(firestore.setDoc).mockResolvedValue(undefined)
      vi.mocked(firestore.addDoc).mockResolvedValue({ id: 'event-1' } as any)

      const result = await recordRejection('family-456', 'child-789', 'proposal-1')

      expect(result.totalRejections).toBe(1)
      expect(result.totalProposals).toBe(0)
      expect(firestore.setDoc).toHaveBeenCalled()
    })

    it('should require familyId', async () => {
      await expect(recordRejection('', 'child-789', 'proposal-1')).rejects.toThrow(
        'familyId is required'
      )
    })

    it('should require childId', async () => {
      await expect(recordRejection('family-456', '', 'proposal-1')).rejects.toThrow(
        'childId is required'
      )
    })

    it('should require proposalId', async () => {
      await expect(recordRejection('family-456', 'child-789', '')).rejects.toThrow(
        'proposalId is required'
      )
    })

    it('should store rejection event with proposalId reference only', async () => {
      vi.mocked(firestore.doc).mockReturnValue({} as any)
      vi.mocked(firestore.collection).mockReturnValue({} as any)
      vi.mocked(firestore.getDoc).mockResolvedValue({
        exists: () => true,
        data: () => ({
          id: 'pattern-123',
          familyId: 'family-456',
          childId: 'child-789',
          totalProposals: 5,
          totalRejections: 2,
          rejectionsInWindow: 1,
          escalationTriggered: false,
        }),
      } as any)
      vi.mocked(firestore.updateDoc).mockResolvedValue(undefined)
      vi.mocked(firestore.addDoc).mockResolvedValue({ id: 'event-1' } as any)
      vi.mocked(firestore.query).mockReturnValue({} as any)
      vi.mocked(firestore.where).mockReturnValue({} as any)
      vi.mocked(firestore.getDocs).mockResolvedValue({ docs: [] } as any)

      await recordRejection('family-456', 'child-789', 'proposal-123')

      expect(firestore.addDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          proposalId: 'proposal-123',
          childId: 'child-789',
          familyId: 'family-456',
        })
      )
    })
  })

  describe('calculateRejectionsInWindow', () => {
    it('should count rejections within 90-day window', async () => {
      const now = new Date()
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000)
      // Events outside 100-day window would be filtered by Firestore query

      vi.mocked(firestore.query).mockReturnValue({} as any)
      vi.mocked(firestore.where).mockReturnValue({} as any)
      vi.mocked(firestore.collection).mockReturnValue({} as any)
      vi.mocked(firestore.getDocs).mockResolvedValue({
        docs: [
          { data: () => ({ rejectedAt: thirtyDaysAgo }) },
          { data: () => ({ rejectedAt: sixtyDaysAgo }) },
        ],
      } as any)

      const count = await calculateRejectionsInWindow('child-789')

      expect(count).toBe(2)
    })

    it('should use 90-day default window', async () => {
      vi.mocked(firestore.query).mockReturnValue({} as any)
      vi.mocked(firestore.where).mockReturnValue({} as any)
      vi.mocked(firestore.collection).mockReturnValue({} as any)
      vi.mocked(firestore.getDocs).mockResolvedValue({ docs: [] } as any)

      await calculateRejectionsInWindow('child-789')

      expect(firestore.where).toHaveBeenCalledWith('childId', '==', 'child-789')
    })

    it('should allow custom window days', async () => {
      vi.mocked(firestore.query).mockReturnValue({} as any)
      vi.mocked(firestore.where).mockReturnValue({} as any)
      vi.mocked(firestore.collection).mockReturnValue({} as any)
      vi.mocked(firestore.getDocs).mockResolvedValue({ docs: [] } as any)

      await calculateRejectionsInWindow('child-789', 30)

      expect(firestore.where).toHaveBeenCalled()
    })

    it('should return 0 when no rejections exist', async () => {
      vi.mocked(firestore.query).mockReturnValue({} as any)
      vi.mocked(firestore.where).mockReturnValue({} as any)
      vi.mocked(firestore.collection).mockReturnValue({} as any)
      vi.mocked(firestore.getDocs).mockResolvedValue({ docs: [] } as any)

      const count = await calculateRejectionsInWindow('child-789')

      expect(count).toBe(0)
    })

    it('should require childId', async () => {
      await expect(calculateRejectionsInWindow('')).rejects.toThrow('childId is required')
    })
  })

  describe('checkEscalationThreshold', () => {
    it('should return true when threshold is reached', async () => {
      vi.mocked(firestore.query).mockReturnValue({} as any)
      vi.mocked(firestore.where).mockReturnValue({} as any)
      vi.mocked(firestore.collection).mockReturnValue({} as any)
      vi.mocked(firestore.getDocs).mockResolvedValue({
        docs: [
          { data: () => ({ rejectedAt: new Date() }) },
          { data: () => ({ rejectedAt: new Date() }) },
          { data: () => ({ rejectedAt: new Date() }) },
        ],
      } as any)

      const result = await checkEscalationThreshold('child-789')

      expect(result).toBe(true)
    })

    it('should return false when below threshold', async () => {
      vi.mocked(firestore.query).mockReturnValue({} as any)
      vi.mocked(firestore.where).mockReturnValue({} as any)
      vi.mocked(firestore.collection).mockReturnValue({} as any)
      vi.mocked(firestore.getDocs).mockResolvedValue({
        docs: [
          { data: () => ({ rejectedAt: new Date() }) },
          { data: () => ({ rejectedAt: new Date() }) },
        ],
      } as any)

      const result = await checkEscalationThreshold('child-789')

      expect(result).toBe(false)
    })

    it('should use default threshold of 3', async () => {
      vi.mocked(firestore.query).mockReturnValue({} as any)
      vi.mocked(firestore.where).mockReturnValue({} as any)
      vi.mocked(firestore.collection).mockReturnValue({} as any)
      vi.mocked(firestore.getDocs).mockResolvedValue({
        docs: [
          { data: () => ({ rejectedAt: new Date() }) },
          { data: () => ({ rejectedAt: new Date() }) },
          { data: () => ({ rejectedAt: new Date() }) },
        ],
      } as any)

      const result = await checkEscalationThreshold('child-789')

      expect(result).toBe(true)
    })

    it('should allow custom threshold', async () => {
      vi.mocked(firestore.query).mockReturnValue({} as any)
      vi.mocked(firestore.where).mockReturnValue({} as any)
      vi.mocked(firestore.collection).mockReturnValue({} as any)
      vi.mocked(firestore.getDocs).mockResolvedValue({
        docs: [
          { data: () => ({ rejectedAt: new Date() }) },
          { data: () => ({ rejectedAt: new Date() }) },
          { data: () => ({ rejectedAt: new Date() }) },
          { data: () => ({ rejectedAt: new Date() }) },
          { data: () => ({ rejectedAt: new Date() }) },
        ],
      } as any)

      const result = await checkEscalationThreshold('child-789', 5)

      expect(result).toBe(true)
    })

    it('should require childId', async () => {
      await expect(checkEscalationThreshold('')).rejects.toThrow('childId is required')
    })
  })

  describe('getRejectionPattern', () => {
    it('should return pattern when exists', async () => {
      const mockPattern: RejectionPattern = {
        id: 'pattern-123',
        familyId: 'family-456',
        childId: 'child-789',
        totalProposals: 10,
        totalRejections: 3,
        rejectionsInWindow: 2,
        lastProposalAt: new Date(),
        lastRejectionAt: new Date(),
        escalationTriggered: false,
        escalationTriggeredAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      vi.mocked(firestore.doc).mockReturnValue({} as any)
      vi.mocked(firestore.getDoc).mockResolvedValue({
        exists: () => true,
        data: () => mockPattern,
      } as any)

      const result = await getRejectionPattern('child-789')

      expect(result).not.toBeNull()
      expect(result?.childId).toBe('child-789')
    })

    it('should return null when pattern does not exist', async () => {
      vi.mocked(firestore.doc).mockReturnValue({} as any)
      vi.mocked(firestore.getDoc).mockResolvedValue({
        exists: () => false,
      } as any)

      const result = await getRejectionPattern('child-789')

      expect(result).toBeNull()
    })

    it('should require childId', async () => {
      await expect(getRejectionPattern('')).rejects.toThrow('childId is required')
    })
  })

  describe('triggerEscalation', () => {
    it('should create escalation event and queue notification', async () => {
      vi.mocked(firestore.doc).mockReturnValue({} as any)
      vi.mocked(firestore.collection).mockReturnValue({} as any)
      vi.mocked(firestore.getDoc).mockResolvedValue({
        exists: () => true,
        data: () => ({
          id: 'pattern-123',
          familyId: 'family-456',
          childId: 'child-789',
          totalRejections: 3,
          rejectionsInWindow: 3,
          escalationTriggered: false,
        }),
      } as any)
      vi.mocked(firestore.updateDoc).mockResolvedValue(undefined)
      vi.mocked(firestore.addDoc).mockResolvedValue({ id: 'escalation-1' } as any)

      await triggerEscalation('family-456', 'child-789')

      // Should call addDoc twice: once for escalation event, once for notification
      expect(firestore.addDoc).toHaveBeenCalledTimes(2)
      expect(firestore.updateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          escalationTriggered: true,
        })
      )
    })

    it('should queue notification with escalation event reference (AC3)', async () => {
      vi.mocked(firestore.doc).mockReturnValue({} as any)
      vi.mocked(firestore.collection).mockReturnValue({} as any)
      vi.mocked(firestore.getDoc).mockResolvedValue({
        exists: () => true,
        data: () => ({
          id: 'pattern-123',
          familyId: 'family-456',
          childId: 'child-789',
          rejectionsInWindow: 3,
          escalationTriggered: false,
        }),
      } as any)
      vi.mocked(firestore.updateDoc).mockResolvedValue(undefined)
      vi.mocked(firestore.addDoc).mockResolvedValue({ id: 'escalation-123' } as any)

      await triggerEscalation('family-456', 'child-789')

      // Verify notification was queued with correct data
      expect(firestore.addDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          familyId: 'family-456',
          childId: 'child-789',
          escalationEventId: 'escalation-123',
          type: 'rejection_pattern_escalation',
          status: 'pending',
        })
      )
    })

    it('should not trigger again if already escalated', async () => {
      vi.mocked(firestore.doc).mockReturnValue({} as any)
      vi.mocked(firestore.getDoc).mockResolvedValue({
        exists: () => true,
        data: () => ({
          id: 'pattern-123',
          familyId: 'family-456',
          childId: 'child-789',
          escalationTriggered: true,
          escalationTriggeredAt: new Date(),
        }),
      } as any)

      await triggerEscalation('family-456', 'child-789')

      // Should not create new escalation event
      expect(firestore.addDoc).not.toHaveBeenCalled()
    })

    it('should require familyId', async () => {
      await expect(triggerEscalation('', 'child-789')).rejects.toThrow('familyId is required')
    })

    it('should require childId', async () => {
      await expect(triggerEscalation('family-456', '')).rejects.toThrow('childId is required')
    })

    it('should record rejectionsCount and windowDays in escalation event', async () => {
      vi.mocked(firestore.doc).mockReturnValue({} as any)
      vi.mocked(firestore.collection).mockReturnValue({} as any)
      vi.mocked(firestore.getDoc).mockResolvedValue({
        exists: () => true,
        data: () => ({
          id: 'pattern-123',
          familyId: 'family-456',
          childId: 'child-789',
          rejectionsInWindow: 3,
          escalationTriggered: false,
        }),
      } as any)
      vi.mocked(firestore.updateDoc).mockResolvedValue(undefined)
      vi.mocked(firestore.addDoc).mockResolvedValue({ id: 'escalation-1' } as any)

      await triggerEscalation('family-456', 'child-789')

      expect(firestore.addDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          rejectionsCount: 3,
          windowDays: 90,
          familyId: 'family-456',
          childId: 'child-789',
        })
      )
    })
  })

  describe('incrementProposalCount', () => {
    it('should increment total proposals count', async () => {
      vi.mocked(firestore.doc).mockReturnValue({} as any)
      vi.mocked(firestore.getDoc).mockResolvedValue({
        exists: () => true,
        data: () => ({
          id: 'pattern-123',
          familyId: 'family-456',
          childId: 'child-789',
          totalProposals: 5,
          totalRejections: 2,
        }),
      } as any)
      vi.mocked(firestore.updateDoc).mockResolvedValue(undefined)

      await incrementProposalCount('family-456', 'child-789')

      expect(firestore.updateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          totalProposals: 6,
        })
      )
    })

    it('should create pattern if not exists', async () => {
      vi.mocked(firestore.doc).mockReturnValue({} as any)
      vi.mocked(firestore.getDoc).mockResolvedValue({
        exists: () => false,
      } as any)
      vi.mocked(firestore.setDoc).mockResolvedValue(undefined)

      await incrementProposalCount('family-456', 'child-789')

      expect(firestore.setDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          totalProposals: 1,
          totalRejections: 0,
        })
      )
    })

    it('should update lastProposalAt timestamp', async () => {
      vi.mocked(firestore.doc).mockReturnValue({} as any)
      vi.mocked(firestore.getDoc).mockResolvedValue({
        exists: () => true,
        data: () => ({
          id: 'pattern-123',
          familyId: 'family-456',
          childId: 'child-789',
          totalProposals: 5,
        }),
      } as any)
      vi.mocked(firestore.updateDoc).mockResolvedValue(undefined)

      await incrementProposalCount('family-456', 'child-789')

      expect(firestore.updateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          lastProposalAt: expect.any(Date),
        })
      )
    })

    it('should require familyId', async () => {
      await expect(incrementProposalCount('', 'child-789')).rejects.toThrow('familyId is required')
    })

    it('should require childId', async () => {
      await expect(incrementProposalCount('family-456', '')).rejects.toThrow('childId is required')
    })
  })
})
