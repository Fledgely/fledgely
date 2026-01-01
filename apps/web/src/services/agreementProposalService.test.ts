/**
 * Agreement Proposal Service Tests - Story 34.1
 *
 * Tests for proposal notification and activity logging.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createProposalNotification, logProposalActivity } from './agreementProposalService'

// Mock @fledgely/shared
vi.mock('@fledgely/shared', () => ({
  AGREEMENT_PROPOSAL_MESSAGES: {
    childNotification: (name: string) => `${name} proposed a change to your agreement`,
    pendingStatus: (name: string) => `Waiting for ${name} to review`,
    withdrawConfirmation: 'Are you sure you want to withdraw?',
    reasonPrompts: ["You've been responsible with gaming"],
  },
}))

// Mock Firestore
const mockAddDoc = vi.fn()
const mockCollection = vi.fn()

vi.mock('firebase/firestore', () => ({
  collection: (...args: unknown[]) => mockCollection(...args),
  addDoc: (...args: unknown[]) => mockAddDoc(...args),
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
})
