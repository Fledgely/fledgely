/**
 * Graduation Conversation Service Tests - Story 38.2 Task 2
 *
 * Tests for graduation conversation management.
 * FR38A: System initiates graduation conversation when child reaches eligibility.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import {
  initiateGraduationConversation,
  recordAcknowledgment,
  checkAllAcknowledged,
  scheduleConversation,
  completeConversation,
  expireConversation,
  recordReminderSent,
  getConversation,
  getConversationsForFamily,
  getConversationsForChild,
  getPendingConversations,
  getActiveConversationForChild,
  getConversationsNeedingReminders,
  getExpiredConversations,
  hasUserAcknowledged,
  getAcknowledgmentStatus,
  clearAllConversationData,
  getConversationStats,
} from './graduationConversationService'
import { CreateConversationInput } from '../contracts/graduationConversation'

describe('GraduationConversationService - Story 38.2 Task 2', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2025-12-01T12:00:00Z'))
    clearAllConversationData()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  const defaultInput: CreateConversationInput = {
    familyId: 'family-123',
    childId: 'child-456',
    parentIds: ['parent-1', 'parent-2'],
  }

  describe('initiateGraduationConversation', () => {
    it('should create a new conversation', () => {
      const conversation = initiateGraduationConversation(defaultInput)

      expect(conversation.id).toBeDefined()
      expect(conversation.familyId).toBe('family-123')
      expect(conversation.childId).toBe('child-456')
      expect(conversation.status).toBe('pending')
      expect(conversation.requiredParentIds).toEqual(['parent-1', 'parent-2'])
    })

    it('should set expiry date 30 days from now', () => {
      const conversation = initiateGraduationConversation(defaultInput)

      const expectedExpiry = new Date('2025-12-31T12:00:00Z')
      expect(conversation.expiresAt).toEqual(expectedExpiry)
    })

    it('should throw if active conversation already exists', () => {
      initiateGraduationConversation(defaultInput)

      expect(() => initiateGraduationConversation(defaultInput)).toThrow(
        'Active graduation conversation already exists'
      )
    })

    it('should allow new conversation if previous is completed', () => {
      const conv1 = initiateGraduationConversation(defaultInput)

      // Acknowledge all parties
      recordAcknowledgment({
        conversationId: conv1.id,
        userId: 'child-456',
        role: 'child',
      })
      recordAcknowledgment({
        conversationId: conv1.id,
        userId: 'parent-1',
        role: 'parent',
      })
      recordAcknowledgment({
        conversationId: conv1.id,
        userId: 'parent-2',
        role: 'parent',
      })

      // Complete the conversation
      completeConversation({
        conversationId: conv1.id,
        outcome: 'deferred',
      })

      // Should allow new conversation
      const conv2 = initiateGraduationConversation(defaultInput)
      expect(conv2.id).not.toBe(conv1.id)
    })

    it('should index conversation by family and child', () => {
      const conversation = initiateGraduationConversation(defaultInput)

      const familyConversations = getConversationsForFamily('family-123')
      expect(familyConversations).toHaveLength(1)
      expect(familyConversations[0].id).toBe(conversation.id)

      const childConversations = getConversationsForChild('child-456')
      expect(childConversations).toHaveLength(1)
      expect(childConversations[0].id).toBe(conversation.id)
    })
  })

  describe('recordAcknowledgment', () => {
    it('should record child acknowledgment', () => {
      const conv = initiateGraduationConversation(defaultInput)

      const updated = recordAcknowledgment({
        conversationId: conv.id,
        userId: 'child-456',
        role: 'child',
      })

      expect(updated.childAcknowledgment).not.toBeNull()
      expect(updated.childAcknowledgment?.userId).toBe('child-456')
      expect(updated.childAcknowledgment?.role).toBe('child')
    })

    it('should record parent acknowledgment', () => {
      const conv = initiateGraduationConversation(defaultInput)

      const updated = recordAcknowledgment({
        conversationId: conv.id,
        userId: 'parent-1',
        role: 'parent',
      })

      expect(updated.parentAcknowledgments).toHaveLength(1)
      expect(updated.parentAcknowledgments[0].userId).toBe('parent-1')
    })

    it('should record optional message', () => {
      const conv = initiateGraduationConversation(defaultInput)

      const updated = recordAcknowledgment({
        conversationId: conv.id,
        userId: 'child-456',
        role: 'child',
        message: 'Looking forward to the conversation!',
      })

      expect(updated.childAcknowledgment?.message).toBe('Looking forward to the conversation!')
    })

    it('should transition to acknowledged when all parties acknowledge', () => {
      const conv = initiateGraduationConversation(defaultInput)

      recordAcknowledgment({
        conversationId: conv.id,
        userId: 'child-456',
        role: 'child',
      })
      recordAcknowledgment({
        conversationId: conv.id,
        userId: 'parent-1',
        role: 'parent',
      })
      const final = recordAcknowledgment({
        conversationId: conv.id,
        userId: 'parent-2',
        role: 'parent',
      })

      expect(final.status).toBe('acknowledged')
    })

    it('should not transition if not all acknowledged', () => {
      const conv = initiateGraduationConversation(defaultInput)

      const updated = recordAcknowledgment({
        conversationId: conv.id,
        userId: 'child-456',
        role: 'child',
      })

      expect(updated.status).toBe('pending')
    })

    it('should throw if child already acknowledged', () => {
      const conv = initiateGraduationConversation(defaultInput)

      recordAcknowledgment({
        conversationId: conv.id,
        userId: 'child-456',
        role: 'child',
      })

      expect(() =>
        recordAcknowledgment({
          conversationId: conv.id,
          userId: 'child-456',
          role: 'child',
        })
      ).toThrow('Child has already acknowledged')
    })

    it('should throw if parent already acknowledged', () => {
      const conv = initiateGraduationConversation(defaultInput)

      recordAcknowledgment({
        conversationId: conv.id,
        userId: 'parent-1',
        role: 'parent',
      })

      expect(() =>
        recordAcknowledgment({
          conversationId: conv.id,
          userId: 'parent-1',
          role: 'parent',
        })
      ).toThrow('Parent has already acknowledged')
    })

    it('should throw if parent not in required list', () => {
      const conv = initiateGraduationConversation(defaultInput)

      expect(() =>
        recordAcknowledgment({
          conversationId: conv.id,
          userId: 'unauthorized-parent',
          role: 'parent',
        })
      ).toThrow('User is not a required parent')
    })

    it('should throw if conversation not found', () => {
      expect(() =>
        recordAcknowledgment({
          conversationId: 'non-existent',
          userId: 'child-456',
          role: 'child',
        })
      ).toThrow('Conversation not found')
    })

    it('should throw if conversation not pending', () => {
      const conv = initiateGraduationConversation(defaultInput)
      expireConversation(conv.id)

      expect(() =>
        recordAcknowledgment({
          conversationId: conv.id,
          userId: 'child-456',
          role: 'child',
        })
      ).toThrow('Cannot acknowledge conversation in status')
    })
  })

  describe('checkAllAcknowledged', () => {
    it('should return false when not all acknowledged', () => {
      const conv = initiateGraduationConversation(defaultInput)

      expect(checkAllAcknowledged(conv.id)).toBe(false)

      recordAcknowledgment({
        conversationId: conv.id,
        userId: 'child-456',
        role: 'child',
      })

      expect(checkAllAcknowledged(conv.id)).toBe(false)
    })

    it('should return true when all acknowledged', () => {
      const conv = initiateGraduationConversation(defaultInput)

      recordAcknowledgment({
        conversationId: conv.id,
        userId: 'child-456',
        role: 'child',
      })
      recordAcknowledgment({
        conversationId: conv.id,
        userId: 'parent-1',
        role: 'parent',
      })
      recordAcknowledgment({
        conversationId: conv.id,
        userId: 'parent-2',
        role: 'parent',
      })

      expect(checkAllAcknowledged(conv.id)).toBe(true)
    })

    it('should throw if conversation not found', () => {
      expect(() => checkAllAcknowledged('non-existent')).toThrow('Conversation not found')
    })
  })

  describe('scheduleConversation', () => {
    it('should schedule when acknowledged', () => {
      const conv = initiateGraduationConversation(defaultInput)

      // Acknowledge all
      recordAcknowledgment({
        conversationId: conv.id,
        userId: 'child-456',
        role: 'child',
      })
      recordAcknowledgment({
        conversationId: conv.id,
        userId: 'parent-1',
        role: 'parent',
      })
      recordAcknowledgment({
        conversationId: conv.id,
        userId: 'parent-2',
        role: 'parent',
      })

      const scheduledDate = new Date('2025-12-15')
      const updated = scheduleConversation({
        conversationId: conv.id,
        scheduledDate,
      })

      expect(updated.status).toBe('scheduled')
      expect(updated.scheduledDate).toEqual(scheduledDate)
    })

    it('should throw if not acknowledged', () => {
      const conv = initiateGraduationConversation(defaultInput)

      expect(() =>
        scheduleConversation({
          conversationId: conv.id,
          scheduledDate: new Date('2025-12-15'),
        })
      ).toThrow('Cannot schedule conversation in status')
    })

    it('should throw if date is today', () => {
      const conv = initiateGraduationConversation(defaultInput)

      // Acknowledge all
      recordAcknowledgment({
        conversationId: conv.id,
        userId: 'child-456',
        role: 'child',
      })
      recordAcknowledgment({
        conversationId: conv.id,
        userId: 'parent-1',
        role: 'parent',
      })
      recordAcknowledgment({
        conversationId: conv.id,
        userId: 'parent-2',
        role: 'parent',
      })

      expect(() =>
        scheduleConversation({
          conversationId: conv.id,
          scheduledDate: new Date('2025-12-01'),
        })
      ).toThrow('Scheduled date must be at least 1 day in the future')
    })
  })

  describe('completeConversation', () => {
    it('should complete with graduated outcome', () => {
      const conv = initiateGraduationConversation(defaultInput)

      // Acknowledge and schedule
      recordAcknowledgment({
        conversationId: conv.id,
        userId: 'child-456',
        role: 'child',
      })
      recordAcknowledgment({
        conversationId: conv.id,
        userId: 'parent-1',
        role: 'parent',
      })
      recordAcknowledgment({
        conversationId: conv.id,
        userId: 'parent-2',
        role: 'parent',
      })

      const updated = completeConversation({
        conversationId: conv.id,
        outcome: 'graduated',
      })

      expect(updated.status).toBe('completed')
      expect(updated.outcome).toBe('graduated')
      expect(updated.completedAt).toBeDefined()
    })

    it('should complete with deferred outcome', () => {
      const conv = initiateGraduationConversation(defaultInput)

      recordAcknowledgment({
        conversationId: conv.id,
        userId: 'child-456',
        role: 'child',
      })
      recordAcknowledgment({
        conversationId: conv.id,
        userId: 'parent-1',
        role: 'parent',
      })
      recordAcknowledgment({
        conversationId: conv.id,
        userId: 'parent-2',
        role: 'parent',
      })

      const updated = completeConversation({
        conversationId: conv.id,
        outcome: 'deferred',
      })

      expect(updated.outcome).toBe('deferred')
    })

    it('should complete with declined outcome', () => {
      const conv = initiateGraduationConversation(defaultInput)

      recordAcknowledgment({
        conversationId: conv.id,
        userId: 'child-456',
        role: 'child',
      })
      recordAcknowledgment({
        conversationId: conv.id,
        userId: 'parent-1',
        role: 'parent',
      })
      recordAcknowledgment({
        conversationId: conv.id,
        userId: 'parent-2',
        role: 'parent',
      })

      const updated = completeConversation({
        conversationId: conv.id,
        outcome: 'declined',
      })

      expect(updated.outcome).toBe('declined')
    })

    it('should throw if conversation pending', () => {
      const conv = initiateGraduationConversation(defaultInput)

      expect(() =>
        completeConversation({
          conversationId: conv.id,
          outcome: 'graduated',
        })
      ).toThrow('Cannot complete conversation in status')
    })
  })

  describe('expireConversation', () => {
    it('should mark as expired', () => {
      const conv = initiateGraduationConversation(defaultInput)

      const updated = expireConversation(conv.id)

      expect(updated.status).toBe('expired')
    })

    it('should throw if already completed', () => {
      const conv = initiateGraduationConversation(defaultInput)

      recordAcknowledgment({
        conversationId: conv.id,
        userId: 'child-456',
        role: 'child',
      })
      recordAcknowledgment({
        conversationId: conv.id,
        userId: 'parent-1',
        role: 'parent',
      })
      recordAcknowledgment({
        conversationId: conv.id,
        userId: 'parent-2',
        role: 'parent',
      })

      completeConversation({
        conversationId: conv.id,
        outcome: 'graduated',
      })

      expect(() => expireConversation(conv.id)).toThrow('Cannot expire a completed conversation')
    })
  })

  describe('recordReminderSent', () => {
    it('should increment reminder count', () => {
      const conv = initiateGraduationConversation(defaultInput)

      const updated = recordReminderSent(conv.id)

      expect(updated.remindersSent).toBe(1)
      expect(updated.lastReminderAt).toBeDefined()
    })

    it('should track multiple reminders', () => {
      const conv = initiateGraduationConversation(defaultInput)

      recordReminderSent(conv.id)
      const updated = recordReminderSent(conv.id)

      expect(updated.remindersSent).toBe(2)
    })
  })

  describe('Query Functions', () => {
    describe('getConversation', () => {
      it('should return conversation by ID', () => {
        const conv = initiateGraduationConversation(defaultInput)

        const retrieved = getConversation(conv.id)

        expect(retrieved?.id).toBe(conv.id)
      })

      it('should return null for non-existent ID', () => {
        const retrieved = getConversation('non-existent')

        expect(retrieved).toBeNull()
      })
    })

    describe('getConversationsForFamily', () => {
      it('should return all family conversations', () => {
        initiateGraduationConversation(defaultInput)

        // Complete first conversation
        const conv1 = getConversationsForFamily('family-123')[0]
        recordAcknowledgment({
          conversationId: conv1.id,
          userId: 'child-456',
          role: 'child',
        })
        recordAcknowledgment({
          conversationId: conv1.id,
          userId: 'parent-1',
          role: 'parent',
        })
        recordAcknowledgment({
          conversationId: conv1.id,
          userId: 'parent-2',
          role: 'parent',
        })
        completeConversation({
          conversationId: conv1.id,
          outcome: 'deferred',
        })

        // Create second for different child
        initiateGraduationConversation({
          familyId: 'family-123',
          childId: 'child-789',
          parentIds: ['parent-1'],
        })

        const conversations = getConversationsForFamily('family-123')
        expect(conversations).toHaveLength(2)
      })

      it('should return empty array for unknown family', () => {
        const conversations = getConversationsForFamily('unknown')
        expect(conversations).toEqual([])
      })
    })

    describe('getPendingConversations', () => {
      it('should return only pending/acknowledged conversations', () => {
        const conv = initiateGraduationConversation(defaultInput)

        let pending = getPendingConversations('family-123')
        expect(pending).toHaveLength(1)

        // Complete it
        recordAcknowledgment({
          conversationId: conv.id,
          userId: 'child-456',
          role: 'child',
        })
        recordAcknowledgment({
          conversationId: conv.id,
          userId: 'parent-1',
          role: 'parent',
        })
        recordAcknowledgment({
          conversationId: conv.id,
          userId: 'parent-2',
          role: 'parent',
        })

        // Acknowledged counts as pending
        pending = getPendingConversations('family-123')
        expect(pending).toHaveLength(1)

        // Schedule and complete
        scheduleConversation({
          conversationId: conv.id,
          scheduledDate: new Date('2025-12-15'),
        })
        completeConversation({
          conversationId: conv.id,
          outcome: 'graduated',
        })

        pending = getPendingConversations('family-123')
        expect(pending).toHaveLength(0)
      })
    })

    describe('getActiveConversationForChild', () => {
      it('should return active conversation', () => {
        const conv = initiateGraduationConversation(defaultInput)

        const active = getActiveConversationForChild('child-456')

        expect(active?.id).toBe(conv.id)
      })

      it('should return null if no active conversation', () => {
        const active = getActiveConversationForChild('child-456')
        expect(active).toBeNull()
      })

      it('should return null if all completed', () => {
        const conv = initiateGraduationConversation(defaultInput)

        recordAcknowledgment({
          conversationId: conv.id,
          userId: 'child-456',
          role: 'child',
        })
        recordAcknowledgment({
          conversationId: conv.id,
          userId: 'parent-1',
          role: 'parent',
        })
        recordAcknowledgment({
          conversationId: conv.id,
          userId: 'parent-2',
          role: 'parent',
        })
        completeConversation({
          conversationId: conv.id,
          outcome: 'graduated',
        })

        const active = getActiveConversationForChild('child-456')
        expect(active).toBeNull()
      })
    })

    describe('getConversationsNeedingReminders', () => {
      it('should return conversations needing reminders', () => {
        initiateGraduationConversation(defaultInput)

        // No reminders needed initially
        let needing = getConversationsNeedingReminders()
        expect(needing).toHaveLength(0)

        // Advance 7 days
        vi.setSystemTime(new Date('2025-12-08T12:00:00Z'))

        needing = getConversationsNeedingReminders()
        expect(needing).toHaveLength(1)
      })

      it('should not return after reminder sent', () => {
        const conv = initiateGraduationConversation(defaultInput)

        vi.setSystemTime(new Date('2025-12-08T12:00:00Z'))
        recordReminderSent(conv.id)

        const needing = getConversationsNeedingReminders()
        expect(needing).toHaveLength(0)
      })

      it('should return for next reminder period', () => {
        const conv = initiateGraduationConversation(defaultInput)

        // First reminder at 7 days
        vi.setSystemTime(new Date('2025-12-08T12:00:00Z'))
        recordReminderSent(conv.id)

        // No reminder needed yet
        let needing = getConversationsNeedingReminders()
        expect(needing).toHaveLength(0)

        // Advance to 14 days
        vi.setSystemTime(new Date('2025-12-15T12:00:00Z'))

        needing = getConversationsNeedingReminders()
        expect(needing).toHaveLength(1)
      })
    })

    describe('getExpiredConversations', () => {
      it('should return expired conversations', () => {
        initiateGraduationConversation(defaultInput)

        // Not expired initially
        let expired = getExpiredConversations()
        expect(expired).toHaveLength(0)

        // Advance past expiry
        vi.setSystemTime(new Date('2026-01-02T12:00:00Z'))

        expired = getExpiredConversations()
        expect(expired).toHaveLength(1)
      })

      it('should not return already expired status', () => {
        const conv = initiateGraduationConversation(defaultInput)
        expireConversation(conv.id)

        vi.setSystemTime(new Date('2026-01-02T12:00:00Z'))

        const expired = getExpiredConversations()
        expect(expired).toHaveLength(0)
      })
    })

    describe('hasUserAcknowledged', () => {
      it('should return true if child acknowledged', () => {
        const conv = initiateGraduationConversation(defaultInput)

        expect(hasUserAcknowledged(conv.id, 'child-456', 'child')).toBe(false)

        recordAcknowledgment({
          conversationId: conv.id,
          userId: 'child-456',
          role: 'child',
        })

        expect(hasUserAcknowledged(conv.id, 'child-456', 'child')).toBe(true)
      })

      it('should return true if parent acknowledged', () => {
        const conv = initiateGraduationConversation(defaultInput)

        expect(hasUserAcknowledged(conv.id, 'parent-1', 'parent')).toBe(false)

        recordAcknowledgment({
          conversationId: conv.id,
          userId: 'parent-1',
          role: 'parent',
        })

        expect(hasUserAcknowledged(conv.id, 'parent-1', 'parent')).toBe(true)
        expect(hasUserAcknowledged(conv.id, 'parent-2', 'parent')).toBe(false)
      })

      it('should return false for non-existent conversation', () => {
        expect(hasUserAcknowledged('non-existent', 'child-456', 'child')).toBe(false)
      })
    })

    describe('getAcknowledgmentStatus', () => {
      it('should return detailed acknowledgment status', () => {
        const conv = initiateGraduationConversation(defaultInput)

        let status = getAcknowledgmentStatus(conv.id)

        expect(status.childAcknowledged).toBe(false)
        expect(status.parentsAcknowledged).toEqual([
          { parentId: 'parent-1', acknowledged: false },
          { parentId: 'parent-2', acknowledged: false },
        ])
        expect(status.allAcknowledged).toBe(false)

        // Acknowledge child
        recordAcknowledgment({
          conversationId: conv.id,
          userId: 'child-456',
          role: 'child',
        })

        status = getAcknowledgmentStatus(conv.id)
        expect(status.childAcknowledged).toBe(true)
        expect(status.allAcknowledged).toBe(false)

        // Acknowledge all parents
        recordAcknowledgment({
          conversationId: conv.id,
          userId: 'parent-1',
          role: 'parent',
        })
        recordAcknowledgment({
          conversationId: conv.id,
          userId: 'parent-2',
          role: 'parent',
        })

        status = getAcknowledgmentStatus(conv.id)
        expect(status.allAcknowledged).toBe(true)
        expect(status.parentsAcknowledged).toEqual([
          { parentId: 'parent-1', acknowledged: true },
          { parentId: 'parent-2', acknowledged: true },
        ])
      })
    })
  })

  describe('getConversationStats', () => {
    it('should return statistics', () => {
      const conv1 = initiateGraduationConversation(defaultInput)

      let stats = getConversationStats()
      expect(stats.total).toBe(1)
      expect(stats.byStatus.pending).toBe(1)
      expect(stats.byOutcome.none).toBe(1)

      // Complete conv1
      recordAcknowledgment({
        conversationId: conv1.id,
        userId: 'child-456',
        role: 'child',
      })
      recordAcknowledgment({
        conversationId: conv1.id,
        userId: 'parent-1',
        role: 'parent',
      })
      recordAcknowledgment({
        conversationId: conv1.id,
        userId: 'parent-2',
        role: 'parent',
      })
      completeConversation({
        conversationId: conv1.id,
        outcome: 'graduated',
      })

      stats = getConversationStats()
      expect(stats.byStatus.completed).toBe(1)
      expect(stats.byOutcome.graduated).toBe(1)
    })
  })

  describe('AC Verification', () => {
    describe('AC1: System detects eligibility', () => {
      it('should create conversation when eligibility reached', () => {
        const conversation = initiateGraduationConversation(defaultInput)

        expect(conversation.status).toBe('pending')
        expect(conversation.childId).toBe('child-456')
      })
    })

    describe('AC3: Both parties must acknowledge', () => {
      it('should require child acknowledgment', () => {
        const conv = initiateGraduationConversation(defaultInput)

        // Only parents acknowledge
        recordAcknowledgment({
          conversationId: conv.id,
          userId: 'parent-1',
          role: 'parent',
        })
        recordAcknowledgment({
          conversationId: conv.id,
          userId: 'parent-2',
          role: 'parent',
        })

        expect(checkAllAcknowledged(conv.id)).toBe(false)
      })

      it('should require all parent acknowledgments', () => {
        const conv = initiateGraduationConversation(defaultInput)

        recordAcknowledgment({
          conversationId: conv.id,
          userId: 'child-456',
          role: 'child',
        })
        recordAcknowledgment({
          conversationId: conv.id,
          userId: 'parent-1',
          role: 'parent',
        })

        expect(checkAllAcknowledged(conv.id)).toBe(false)

        recordAcknowledgment({
          conversationId: conv.id,
          userId: 'parent-2',
          role: 'parent',
        })

        expect(checkAllAcknowledged(conv.id)).toBe(true)
      })
    })

    describe('AC6: Prevents indefinite monitoring', () => {
      it('should have reminder system', () => {
        initiateGraduationConversation(defaultInput)

        vi.setSystemTime(new Date('2025-12-08T12:00:00Z'))

        const needing = getConversationsNeedingReminders()
        expect(needing).toHaveLength(1)
      })

      it('should have expiry mechanism', () => {
        initiateGraduationConversation(defaultInput)

        vi.setSystemTime(new Date('2026-01-02T12:00:00Z'))

        const expired = getExpiredConversations()
        expect(expired).toHaveLength(1)
      })
    })
  })
})
