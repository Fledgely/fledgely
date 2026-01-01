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
} from './agreementProposalService'

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
})
