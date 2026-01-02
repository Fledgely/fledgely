/**
 * Agreement Proposal Service Tests - Story 34.1
 *
 * Tests for proposal notification and activity logging.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  createProposalNotification,
  logProposalActivity,
  createParentNotifications,
  notifyProposerOfResponse,
  logProposalResponse,
  handleChildProposalRejection,
  handleChildProposalSubmission,
} from './agreementProposalService'

// Mock rejection pattern service functions
const mockRecordRejection = vi.fn()
const mockCheckEscalationThreshold = vi.fn()
const mockTriggerEscalation = vi.fn()
const mockIncrementProposalCount = vi.fn()

// Mock @fledgely/shared
vi.mock('@fledgely/shared', () => ({
  AGREEMENT_PROPOSAL_MESSAGES: {
    childNotification: (name: string) => `${name} proposed a change to your agreement`,
    pendingStatus: (name: string) => `Waiting for ${name} to review`,
    withdrawConfirmation: 'Are you sure you want to withdraw?',
    reasonPrompts: ["You've been responsible with gaming"],
  },
  CHILD_PROPOSAL_MESSAGES: {
    parentNotification: (name: string) => `${name} proposed a change to the agreement`,
    pendingStatus: (name: string) => `Waiting for ${name} to review`,
    encouragement: 'Tell your parents why this change would help you',
    reasonPrompts: ["I've been responsible with my screen time lately"],
    successMessage: 'Great job speaking up!',
    confirmationMessage: 'Your request has been sent!',
  },
  recordRejection: (...args: unknown[]) => mockRecordRejection(...args),
  checkEscalationThreshold: (...args: unknown[]) => mockCheckEscalationThreshold(...args),
  triggerEscalation: (...args: unknown[]) => mockTriggerEscalation(...args),
  incrementProposalCount: (...args: unknown[]) => mockIncrementProposalCount(...args),
}))

// Mock Firestore
const mockAddDoc = vi.fn()
const mockCollection = vi.fn()
const mockDoc = vi.fn()
const mockGetDoc = vi.fn()

vi.mock('firebase/firestore', () => ({
  collection: (...args: unknown[]) => mockCollection(...args),
  addDoc: (...args: unknown[]) => mockAddDoc(...args),
  doc: (...args: unknown[]) => mockDoc(...args),
  getDoc: (...args: unknown[]) => mockGetDoc(...args),
  serverTimestamp: () => ({ _serverTimestamp: true }),
}))

vi.mock('../lib/firebase', () => ({
  getFirestoreDb: vi.fn(() => ({})),
}))

describe('agreementProposalService - Story 34.1', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockCollection.mockReturnValue({ _collection: 'notifications' })
    mockAddDoc.mockResolvedValue({ id: 'notification-123' })
  })

  describe('createProposalNotification', () => {
    it('should create notification for child', async () => {
      const result = await createProposalNotification({
        familyId: 'family-1',
        childId: 'child-1',
        proposalId: 'proposal-123',
        proposerName: 'Mom',
      })

      expect(mockAddDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          familyId: 'family-1',
          recipientId: 'child-1',
          type: 'agreement_proposal',
          title: 'Agreement Change Proposal',
        })
      )
      expect(result).toBe('notification-123')
    })

    it('should include proposer name in notification body', async () => {
      await createProposalNotification({
        familyId: 'family-1',
        childId: 'child-1',
        proposalId: 'proposal-123',
        proposerName: 'Dad',
      })

      expect(mockAddDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          body: expect.stringContaining('Dad'),
        })
      )
    })

    it('should include proposal ID in notification data', async () => {
      await createProposalNotification({
        familyId: 'family-1',
        childId: 'child-1',
        proposalId: 'proposal-456',
        proposerName: 'Mom',
      })

      expect(mockAddDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          data: expect.objectContaining({
            proposalId: 'proposal-456',
            action: 'view_proposal',
          }),
        })
      )
    })

    it('should mark notification as unread', async () => {
      await createProposalNotification({
        familyId: 'family-1',
        childId: 'child-1',
        proposalId: 'proposal-123',
        proposerName: 'Mom',
      })

      expect(mockAddDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          read: false,
        })
      )
    })
  })

  describe('logProposalActivity', () => {
    it('should log activity to familyActivity collection', async () => {
      mockAddDoc.mockResolvedValue({ id: 'activity-123' })

      const result = await logProposalActivity({
        familyId: 'family-1',
        proposalId: 'proposal-123',
        proposerId: 'parent-1',
        proposerName: 'Mom',
        proposerType: 'parent',
        action: 'created',
        childName: 'Alex',
      })

      expect(mockAddDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          familyId: 'family-1',
          type: 'agreement_proposal_created',
          actorId: 'parent-1',
          actorName: 'Mom',
          actorType: 'parent',
        })
      )
      expect(result).toBe('activity-123')
    })

    it('should include proposal metadata', async () => {
      await logProposalActivity({
        familyId: 'family-1',
        proposalId: 'proposal-123',
        proposerId: 'parent-1',
        proposerName: 'Mom',
        proposerType: 'parent',
        action: 'created',
        childName: 'Alex',
      })

      expect(mockAddDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          metadata: expect.objectContaining({
            proposalId: 'proposal-123',
          }),
        })
      )
    })

    it('should generate readable description', async () => {
      await logProposalActivity({
        familyId: 'family-1',
        proposalId: 'proposal-123',
        proposerId: 'parent-1',
        proposerName: 'Mom',
        proposerType: 'parent',
        action: 'created',
        childName: 'Alex',
      })

      expect(mockAddDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          description: expect.stringContaining('Mom'),
        })
      )
    })
  })

  describe('createParentNotifications - Story 34.2 (AC4)', () => {
    beforeEach(() => {
      mockDoc.mockReturnValue({ _doc: 'family-ref' })
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        data: () => ({
          guardianUids: ['parent-1', 'parent-2'],
        }),
      })
      mockAddDoc.mockResolvedValue({ id: 'notification-123' })
    })

    it('should get guardian UIDs from family document', async () => {
      await createParentNotifications({
        familyId: 'family-1',
        proposalId: 'proposal-123',
        childName: 'Emma',
      })

      expect(mockDoc).toHaveBeenCalled()
      expect(mockGetDoc).toHaveBeenCalled()
    })

    it('should create notification for each guardian', async () => {
      await createParentNotifications({
        familyId: 'family-1',
        proposalId: 'proposal-123',
        childName: 'Emma',
      })

      // Should be called twice - once for each guardian
      expect(mockAddDoc).toHaveBeenCalledTimes(2)
    })

    it('should include child name in notification body', async () => {
      await createParentNotifications({
        familyId: 'family-1',
        proposalId: 'proposal-123',
        childName: 'Emma',
      })

      expect(mockAddDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          body: expect.stringContaining('Emma'),
        })
      )
    })

    it('should include proposal ID in notification data', async () => {
      await createParentNotifications({
        familyId: 'family-1',
        proposalId: 'proposal-456',
        childName: 'Emma',
      })

      expect(mockAddDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          data: expect.objectContaining({
            proposalId: 'proposal-456',
          }),
        })
      )
    })

    it('should return all notification IDs', async () => {
      mockAddDoc
        .mockResolvedValueOnce({ id: 'notification-1' })
        .mockResolvedValueOnce({ id: 'notification-2' })

      const result = await createParentNotifications({
        familyId: 'family-1',
        proposalId: 'proposal-123',
        childName: 'Emma',
      })

      expect(result).toEqual(['notification-1', 'notification-2'])
    })

    it('should handle single guardian family', async () => {
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        data: () => ({
          guardianUids: ['parent-1'],
        }),
      })

      await createParentNotifications({
        familyId: 'family-1',
        proposalId: 'proposal-123',
        childName: 'Emma',
      })

      expect(mockAddDoc).toHaveBeenCalledTimes(1)
    })

    it('should throw error if family not found', async () => {
      mockGetDoc.mockResolvedValue({
        exists: () => false,
      })

      await expect(
        createParentNotifications({
          familyId: 'invalid-family',
          proposalId: 'proposal-123',
          childName: 'Emma',
        })
      ).rejects.toThrow('Family not found')
    })
  })

  describe('notifyProposerOfResponse - Story 34.3 (AC2)', () => {
    beforeEach(() => {
      mockAddDoc.mockResolvedValue({ id: 'notification-123' })
    })

    it('should create notification for proposer on accept', async () => {
      const result = await notifyProposerOfResponse({
        familyId: 'family-1',
        proposalId: 'proposal-123',
        proposerId: 'parent-1',
        responderName: 'Emma',
        action: 'accept',
      })

      expect(mockAddDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          familyId: 'family-1',
          recipientId: 'parent-1',
          type: 'proposal_response',
        })
      )
      expect(result).toBe('notification-123')
    })

    it('should include correct body for accept', async () => {
      await notifyProposerOfResponse({
        familyId: 'family-1',
        proposalId: 'proposal-123',
        proposerId: 'parent-1',
        responderName: 'Emma',
        action: 'accept',
      })

      expect(mockAddDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          body: expect.stringContaining('accepted'),
        })
      )
    })

    it('should include correct body for decline', async () => {
      await notifyProposerOfResponse({
        familyId: 'family-1',
        proposalId: 'proposal-123',
        proposerId: 'parent-1',
        responderName: 'Emma',
        action: 'decline',
      })

      expect(mockAddDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          body: expect.stringContaining('declined'),
        })
      )
    })

    it('should include correct body for counter', async () => {
      await notifyProposerOfResponse({
        familyId: 'family-1',
        proposalId: 'proposal-123',
        proposerId: 'parent-1',
        responderName: 'Emma',
        action: 'counter',
      })

      expect(mockAddDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          body: expect.stringContaining('counter'),
        })
      )
    })

    it('should include proposal ID in notification data', async () => {
      await notifyProposerOfResponse({
        familyId: 'family-1',
        proposalId: 'proposal-456',
        proposerId: 'parent-1',
        responderName: 'Emma',
        action: 'accept',
      })

      expect(mockAddDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          data: expect.objectContaining({
            proposalId: 'proposal-456',
          }),
        })
      )
    })
  })

  describe('logProposalResponse - Story 34.3', () => {
    beforeEach(() => {
      mockAddDoc.mockResolvedValue({ id: 'activity-123' })
    })

    it('should log response activity', async () => {
      const result = await logProposalResponse({
        familyId: 'family-1',
        proposalId: 'proposal-123',
        responderId: 'child-1',
        responderName: 'Emma',
        responderType: 'child',
        action: 'accept',
        proposerName: 'Mom',
      })

      expect(mockAddDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          familyId: 'family-1',
          type: 'proposal_response_accept',
          actorId: 'child-1',
          actorName: 'Emma',
          actorType: 'child',
        })
      )
      expect(result).toBe('activity-123')
    })

    it('should include response metadata', async () => {
      await logProposalResponse({
        familyId: 'family-1',
        proposalId: 'proposal-123',
        responderId: 'child-1',
        responderName: 'Emma',
        responderType: 'child',
        action: 'decline',
        proposerName: 'Mom',
      })

      expect(mockAddDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          metadata: expect.objectContaining({
            proposalId: 'proposal-123',
            action: 'decline',
          }),
        })
      )
    })

    it('should generate readable description for counter', async () => {
      await logProposalResponse({
        familyId: 'family-1',
        proposalId: 'proposal-123',
        responderId: 'child-1',
        responderName: 'Emma',
        responderType: 'child',
        action: 'counter',
        proposerName: 'Mom',
      })

      expect(mockAddDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          description: expect.stringContaining('counter'),
        })
      )
    })
  })

  // ============================================
  // Story 34.5.1: Child Proposal Rejection Tracking
  // ============================================

  describe('handleChildProposalRejection - Story 34.5.1 (AC1, AC2, AC3)', () => {
    beforeEach(() => {
      mockRecordRejection.mockReset()
      mockCheckEscalationThreshold.mockReset()
      mockTriggerEscalation.mockReset()
      mockRecordRejection.mockResolvedValue({
        id: 'pattern-123',
        totalRejections: 1,
      })
      mockCheckEscalationThreshold.mockResolvedValue(false)
    })

    it('should record rejection when child proposal is declined (AC1)', async () => {
      await handleChildProposalRejection({
        familyId: 'family-1',
        childId: 'child-1',
        proposalId: 'proposal-123',
      })

      expect(mockRecordRejection).toHaveBeenCalledWith('family-1', 'child-1', 'proposal-123')
    })

    it('should check escalation threshold after recording (AC3)', async () => {
      await handleChildProposalRejection({
        familyId: 'family-1',
        childId: 'child-1',
        proposalId: 'proposal-123',
      })

      expect(mockCheckEscalationThreshold).toHaveBeenCalledWith('child-1')
    })

    it('should trigger escalation when threshold reached (AC3)', async () => {
      mockCheckEscalationThreshold.mockResolvedValue(true)

      await handleChildProposalRejection({
        familyId: 'family-1',
        childId: 'child-1',
        proposalId: 'proposal-123',
      })

      expect(mockTriggerEscalation).toHaveBeenCalledWith('family-1', 'child-1')
    })

    it('should not trigger escalation when threshold not reached', async () => {
      mockCheckEscalationThreshold.mockResolvedValue(false)

      await handleChildProposalRejection({
        familyId: 'family-1',
        childId: 'child-1',
        proposalId: 'proposal-123',
      })

      expect(mockTriggerEscalation).not.toHaveBeenCalled()
    })

    it('should process rejection flow in correct order', async () => {
      const callOrder: string[] = []
      mockRecordRejection.mockImplementation(async () => {
        callOrder.push('recordRejection')
        return { id: 'pattern-123' }
      })
      mockCheckEscalationThreshold.mockImplementation(async () => {
        callOrder.push('checkThreshold')
        return true
      })
      mockTriggerEscalation.mockImplementation(async () => {
        callOrder.push('triggerEscalation')
      })

      await handleChildProposalRejection({
        familyId: 'family-1',
        childId: 'child-1',
        proposalId: 'proposal-123',
      })

      expect(callOrder).toEqual(['recordRejection', 'checkThreshold', 'triggerEscalation'])
    })
  })

  describe('handleChildProposalSubmission - Story 34.5.1 (AC5)', () => {
    beforeEach(() => {
      mockIncrementProposalCount.mockReset()
      mockIncrementProposalCount.mockResolvedValue(undefined)
    })

    it('should increment proposal count for metrics (AC5)', async () => {
      await handleChildProposalSubmission({
        familyId: 'family-1',
        childId: 'child-1',
        proposalId: 'proposal-123',
      })

      expect(mockIncrementProposalCount).toHaveBeenCalledWith('family-1', 'child-1')
    })

    it('should track submission by family and child', async () => {
      await handleChildProposalSubmission({
        familyId: 'family-2',
        childId: 'child-2',
        proposalId: 'proposal-456',
      })

      expect(mockIncrementProposalCount).toHaveBeenCalledWith('family-2', 'child-2')
    })
  })
})
