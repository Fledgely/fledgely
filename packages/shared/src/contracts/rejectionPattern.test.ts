/**
 * RejectionPattern Schema Tests - Story 34.5.1 Task 2
 *
 * Tests for rejection pattern, event, and escalation schemas.
 * AC4: Privacy-Preserving Tracking
 * AC5: Family Communication Metrics
 */

import { describe, it, expect } from 'vitest'
import {
  rejectionPatternSchema,
  rejectionEventSchema,
  escalationEventSchema,
  REJECTION_WINDOW_DAYS,
  REJECTION_THRESHOLD,
  type RejectionPattern,
  type RejectionEvent,
  type EscalationEvent,
} from './rejectionPattern'

describe('RejectionPattern Schema', () => {
  describe('constants', () => {
    it('should define 90-day window', () => {
      expect(REJECTION_WINDOW_DAYS).toBe(90)
    })

    it('should define threshold of 3', () => {
      expect(REJECTION_THRESHOLD).toBe(3)
    })
  })

  describe('rejectionPatternSchema', () => {
    it('should validate a valid pattern', () => {
      const pattern = {
        id: 'pattern-123',
        familyId: 'family-456',
        childId: 'child-789',
        totalProposals: 5,
        totalRejections: 2,
        rejectionsInWindow: 1,
        lastProposalAt: new Date(),
        lastRejectionAt: new Date(),
        escalationTriggered: false,
        escalationTriggeredAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      const result = rejectionPatternSchema.safeParse(pattern)
      expect(result.success).toBe(true)
    })

    it('should allow null dates', () => {
      const pattern = {
        id: 'pattern-123',
        familyId: 'family-456',
        childId: 'child-789',
        totalProposals: 0,
        totalRejections: 0,
        rejectionsInWindow: 0,
        lastProposalAt: null,
        lastRejectionAt: null,
        escalationTriggered: false,
        escalationTriggeredAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      const result = rejectionPatternSchema.safeParse(pattern)
      expect(result.success).toBe(true)
    })

    it('should require id', () => {
      const pattern = {
        familyId: 'family-456',
        childId: 'child-789',
        totalProposals: 0,
        totalRejections: 0,
        rejectionsInWindow: 0,
        lastProposalAt: null,
        lastRejectionAt: null,
        escalationTriggered: false,
        escalationTriggeredAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      const result = rejectionPatternSchema.safeParse(pattern)
      expect(result.success).toBe(false)
    })

    it('should require familyId', () => {
      const pattern = {
        id: 'pattern-123',
        childId: 'child-789',
        totalProposals: 0,
        totalRejections: 0,
        rejectionsInWindow: 0,
        lastProposalAt: null,
        lastRejectionAt: null,
        escalationTriggered: false,
        escalationTriggeredAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      const result = rejectionPatternSchema.safeParse(pattern)
      expect(result.success).toBe(false)
    })

    it('should require childId', () => {
      const pattern = {
        id: 'pattern-123',
        familyId: 'family-456',
        totalProposals: 0,
        totalRejections: 0,
        rejectionsInWindow: 0,
        lastProposalAt: null,
        lastRejectionAt: null,
        escalationTriggered: false,
        escalationTriggeredAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      const result = rejectionPatternSchema.safeParse(pattern)
      expect(result.success).toBe(false)
    })

    it('should reject negative counts', () => {
      const pattern = {
        id: 'pattern-123',
        familyId: 'family-456',
        childId: 'child-789',
        totalProposals: -1,
        totalRejections: 0,
        rejectionsInWindow: 0,
        lastProposalAt: null,
        lastRejectionAt: null,
        escalationTriggered: false,
        escalationTriggeredAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      const result = rejectionPatternSchema.safeParse(pattern)
      expect(result.success).toBe(false)
    })

    it('should reject non-integer counts', () => {
      const pattern = {
        id: 'pattern-123',
        familyId: 'family-456',
        childId: 'child-789',
        totalProposals: 1.5,
        totalRejections: 0,
        rejectionsInWindow: 0,
        lastProposalAt: null,
        lastRejectionAt: null,
        escalationTriggered: false,
        escalationTriggeredAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      const result = rejectionPatternSchema.safeParse(pattern)
      expect(result.success).toBe(false)
    })

    it('should validate escalation triggered state', () => {
      const pattern = {
        id: 'pattern-123',
        familyId: 'family-456',
        childId: 'child-789',
        totalProposals: 5,
        totalRejections: 3,
        rejectionsInWindow: 3,
        lastProposalAt: new Date(),
        lastRejectionAt: new Date(),
        escalationTriggered: true,
        escalationTriggeredAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      const result = rejectionPatternSchema.safeParse(pattern)
      expect(result.success).toBe(true)
    })
  })

  describe('rejectionEventSchema', () => {
    it('should validate a valid rejection event', () => {
      const event = {
        id: 'event-123',
        familyId: 'family-456',
        childId: 'child-789',
        proposalId: 'proposal-abc',
        rejectedAt: new Date(),
      }

      const result = rejectionEventSchema.safeParse(event)
      expect(result.success).toBe(true)
    })

    it('should require proposalId (reference only - privacy preserving)', () => {
      const event = {
        id: 'event-123',
        familyId: 'family-456',
        childId: 'child-789',
        rejectedAt: new Date(),
      }

      const result = rejectionEventSchema.safeParse(event)
      expect(result.success).toBe(false)
    })

    it('should require rejectedAt date', () => {
      const event = {
        id: 'event-123',
        familyId: 'family-456',
        childId: 'child-789',
        proposalId: 'proposal-abc',
      }

      const result = rejectionEventSchema.safeParse(event)
      expect(result.success).toBe(false)
    })

    it('should not include proposal content (AC4 privacy)', () => {
      // Verify schema does NOT have content field
      const event = {
        id: 'event-123',
        familyId: 'family-456',
        childId: 'child-789',
        proposalId: 'proposal-abc',
        rejectedAt: new Date(),
        proposalContent: 'Should not be stored',
      }

      const result = rejectionEventSchema.safeParse(event)
      // Should pass but strip the extra field
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).not.toHaveProperty('proposalContent')
      }
    })
  })

  describe('escalationEventSchema', () => {
    it('should validate a valid escalation event', () => {
      const event = {
        id: 'escalation-123',
        familyId: 'family-456',
        childId: 'child-789',
        triggeredAt: new Date(),
        rejectionsCount: 3,
        windowDays: 90,
        acknowledged: false,
        acknowledgedAt: null,
      }

      const result = escalationEventSchema.safeParse(event)
      expect(result.success).toBe(true)
    })

    it('should require triggeredAt date', () => {
      const event = {
        id: 'escalation-123',
        familyId: 'family-456',
        childId: 'child-789',
        rejectionsCount: 3,
        windowDays: 90,
        acknowledged: false,
        acknowledgedAt: null,
      }

      const result = escalationEventSchema.safeParse(event)
      expect(result.success).toBe(false)
    })

    it('should require rejectionsCount', () => {
      const event = {
        id: 'escalation-123',
        familyId: 'family-456',
        childId: 'child-789',
        triggeredAt: new Date(),
        windowDays: 90,
        acknowledged: false,
        acknowledgedAt: null,
      }

      const result = escalationEventSchema.safeParse(event)
      expect(result.success).toBe(false)
    })

    it('should allow acknowledgedAt when acknowledged', () => {
      const event = {
        id: 'escalation-123',
        familyId: 'family-456',
        childId: 'child-789',
        triggeredAt: new Date(),
        rejectionsCount: 3,
        windowDays: 90,
        acknowledged: true,
        acknowledgedAt: new Date(),
      }

      const result = escalationEventSchema.safeParse(event)
      expect(result.success).toBe(true)
    })

    it('should reject negative rejectionsCount', () => {
      const event = {
        id: 'escalation-123',
        familyId: 'family-456',
        childId: 'child-789',
        triggeredAt: new Date(),
        rejectionsCount: -1,
        windowDays: 90,
        acknowledged: false,
        acknowledgedAt: null,
      }

      const result = escalationEventSchema.safeParse(event)
      expect(result.success).toBe(false)
    })

    it('should reject negative windowDays', () => {
      const event = {
        id: 'escalation-123',
        familyId: 'family-456',
        childId: 'child-789',
        triggeredAt: new Date(),
        rejectionsCount: 3,
        windowDays: -90,
        acknowledged: false,
        acknowledgedAt: null,
      }

      const result = escalationEventSchema.safeParse(event)
      expect(result.success).toBe(false)
    })
  })

  describe('type exports', () => {
    it('should export RejectionPattern type', () => {
      const pattern: RejectionPattern = {
        id: 'pattern-123',
        familyId: 'family-456',
        childId: 'child-789',
        totalProposals: 5,
        totalRejections: 2,
        rejectionsInWindow: 1,
        lastProposalAt: null,
        lastRejectionAt: null,
        escalationTriggered: false,
        escalationTriggeredAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      expect(pattern.childId).toBe('child-789')
    })

    it('should export RejectionEvent type', () => {
      const event: RejectionEvent = {
        id: 'event-123',
        familyId: 'family-456',
        childId: 'child-789',
        proposalId: 'proposal-abc',
        rejectedAt: new Date(),
      }
      expect(event.proposalId).toBe('proposal-abc')
    })

    it('should export EscalationEvent type', () => {
      const event: EscalationEvent = {
        id: 'escalation-123',
        familyId: 'family-456',
        childId: 'child-789',
        triggeredAt: new Date(),
        rejectionsCount: 3,
        windowDays: 90,
        acknowledged: false,
        acknowledgedAt: null,
      }
      expect(event.rejectionsCount).toBe(3)
    })
  })
})
