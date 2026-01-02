/**
 * Graduation Process Service Tests - Story 38.3 Task 2
 *
 * Tests for managing the formal graduation process.
 * AC1: Both parties must confirm graduation decision (dual-consent)
 * AC2: Graduation date can be immediate or scheduled for future
 * AC4: Monitoring stops on graduation date
 */

import { describe, it, expect, beforeEach } from 'vitest'
import {
  initiateGraduationDecision,
  recordGraduationConfirmation,
  checkAllConfirmations,
  scheduleGraduation,
  executeGraduation,
  getGraduationDecision,
  getPendingDecisions,
  getDecisionsForChild,
  getDecisionsForFamily,
  markDecisionProcessing,
  markDecisionCompleted,
  expireDecision,
  clearAllDecisionData,
  getDecisionStats,
} from './graduationProcessService'
import type { GraduationDecision } from '../contracts/graduationProcess'

describe('GraduationProcessService', () => {
  beforeEach(() => {
    clearAllDecisionData()
  })

  // ============================================
  // initiateGraduationDecision Tests
  // ============================================

  describe('initiateGraduationDecision', () => {
    it('should create a pending graduation decision', () => {
      const decision = initiateGraduationDecision({
        conversationId: 'conv-123',
        childId: 'child-456',
        familyId: 'family-789',
        requiredParentIds: ['parent-001', 'parent-002'],
      })

      expect(decision.id).toBeDefined()
      expect(decision.conversationId).toBe('conv-123')
      expect(decision.childId).toBe('child-456')
      expect(decision.familyId).toBe('family-789')
      expect(decision.requiredParentIds).toEqual(['parent-001', 'parent-002'])
      expect(decision.status).toBe('pending')
      expect(decision.childConfirmation).toBeNull()
      expect(decision.parentConfirmations).toEqual([])
    })

    it('should set expiry date 30 days in future', () => {
      const decision = initiateGraduationDecision({
        conversationId: 'conv-123',
        childId: 'child-456',
        familyId: 'family-789',
        requiredParentIds: ['parent-001'],
      })

      const now = Date.now()
      const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000
      expect(decision.expiresAt.getTime()).toBeGreaterThan(now + thirtyDaysMs - 1000)
      expect(decision.expiresAt.getTime()).toBeLessThan(now + thirtyDaysMs + 1000)
    })

    it('should throw if active decision already exists for child', () => {
      initiateGraduationDecision({
        conversationId: 'conv-123',
        childId: 'child-456',
        familyId: 'family-789',
        requiredParentIds: ['parent-001'],
      })

      expect(() =>
        initiateGraduationDecision({
          conversationId: 'conv-456',
          childId: 'child-456',
          familyId: 'family-789',
          requiredParentIds: ['parent-001'],
        })
      ).toThrow(/active graduation decision already exists/i)
    })
  })

  // ============================================
  // recordGraduationConfirmation Tests
  // ============================================

  describe('recordGraduationConfirmation', () => {
    it('should record child confirmation for immediate graduation', () => {
      const decision = initiateGraduationDecision({
        conversationId: 'conv-123',
        childId: 'child-456',
        familyId: 'family-789',
        requiredParentIds: ['parent-001'],
      })

      const updated = recordGraduationConfirmation({
        decisionId: decision.id,
        userId: 'child-456',
        role: 'child',
        graduationType: 'immediate',
        scheduledDate: null,
      })

      expect(updated.childConfirmation).not.toBeNull()
      expect(updated.childConfirmation?.userId).toBe('child-456')
      expect(updated.childConfirmation?.role).toBe('child')
      expect(updated.childConfirmation?.selectedGraduationType).toBe('immediate')
    })

    it('should record parent confirmation with scheduled date', () => {
      const decision = initiateGraduationDecision({
        conversationId: 'conv-123',
        childId: 'child-456',
        familyId: 'family-789',
        requiredParentIds: ['parent-001'],
      })

      const scheduledDate = new Date()
      scheduledDate.setDate(scheduledDate.getDate() + 14)

      const updated = recordGraduationConfirmation({
        decisionId: decision.id,
        userId: 'parent-001',
        role: 'parent',
        graduationType: 'scheduled',
        scheduledDate,
      })

      expect(updated.parentConfirmations).toHaveLength(1)
      expect(updated.parentConfirmations[0].userId).toBe('parent-001')
      expect(updated.parentConfirmations[0].selectedGraduationType).toBe('scheduled')
      expect(updated.parentConfirmations[0].scheduledDatePreference).toEqual(scheduledDate)
    })

    it('should update status to confirmed when all parties confirm', () => {
      const decision = initiateGraduationDecision({
        conversationId: 'conv-123',
        childId: 'child-456',
        familyId: 'family-789',
        requiredParentIds: ['parent-001'],
      })

      recordGraduationConfirmation({
        decisionId: decision.id,
        userId: 'child-456',
        role: 'child',
        graduationType: 'immediate',
        scheduledDate: null,
      })

      const updated = recordGraduationConfirmation({
        decisionId: decision.id,
        userId: 'parent-001',
        role: 'parent',
        graduationType: 'immediate',
        scheduledDate: null,
      })

      expect(updated.status).toBe('confirmed')
      expect(updated.confirmedAt).not.toBeNull()
    })

    it('should throw if decision not found', () => {
      expect(() =>
        recordGraduationConfirmation({
          decisionId: 'nonexistent',
          userId: 'child-456',
          role: 'child',
          graduationType: 'immediate',
          scheduledDate: null,
        })
      ).toThrow(/decision not found/i)
    })

    it('should throw if decision is not pending', () => {
      const decision = initiateGraduationDecision({
        conversationId: 'conv-123',
        childId: 'child-456',
        familyId: 'family-789',
        requiredParentIds: ['parent-001'],
      })

      // Complete the confirmations
      recordGraduationConfirmation({
        decisionId: decision.id,
        userId: 'child-456',
        role: 'child',
        graduationType: 'immediate',
        scheduledDate: null,
      })

      recordGraduationConfirmation({
        decisionId: decision.id,
        userId: 'parent-001',
        role: 'parent',
        graduationType: 'immediate',
        scheduledDate: null,
      })

      // Now try to add another confirmation - should fail since status is 'confirmed'
      expect(() =>
        recordGraduationConfirmation({
          decisionId: decision.id,
          userId: 'parent-002',
          role: 'parent',
          graduationType: 'immediate',
          scheduledDate: null,
        })
      ).toThrow(/cannot confirm decision in status/i)
    })

    it('should throw if child has already confirmed', () => {
      const decision = initiateGraduationDecision({
        conversationId: 'conv-123',
        childId: 'child-456',
        familyId: 'family-789',
        requiredParentIds: ['parent-001'],
      })

      recordGraduationConfirmation({
        decisionId: decision.id,
        userId: 'child-456',
        role: 'child',
        graduationType: 'immediate',
        scheduledDate: null,
      })

      expect(() =>
        recordGraduationConfirmation({
          decisionId: decision.id,
          userId: 'child-456',
          role: 'child',
          graduationType: 'immediate',
          scheduledDate: null,
        })
      ).toThrow(/child has already confirmed/i)
    })

    it('should throw if parent has already confirmed', () => {
      const decision = initiateGraduationDecision({
        conversationId: 'conv-123',
        childId: 'child-456',
        familyId: 'family-789',
        requiredParentIds: ['parent-001'],
      })

      recordGraduationConfirmation({
        decisionId: decision.id,
        userId: 'parent-001',
        role: 'parent',
        graduationType: 'immediate',
        scheduledDate: null,
      })

      expect(() =>
        recordGraduationConfirmation({
          decisionId: decision.id,
          userId: 'parent-001',
          role: 'parent',
          graduationType: 'immediate',
          scheduledDate: null,
        })
      ).toThrow(/parent has already confirmed/i)
    })

    it('should throw if parent is not required', () => {
      const decision = initiateGraduationDecision({
        conversationId: 'conv-123',
        childId: 'child-456',
        familyId: 'family-789',
        requiredParentIds: ['parent-001'],
      })

      expect(() =>
        recordGraduationConfirmation({
          decisionId: decision.id,
          userId: 'parent-999',
          role: 'parent',
          graduationType: 'immediate',
          scheduledDate: null,
        })
      ).toThrow(/not a required parent/i)
    })
  })

  // ============================================
  // checkAllConfirmations Tests
  // ============================================

  describe('checkAllConfirmations', () => {
    it('should return false for pending decision with no confirmations', () => {
      const decision = initiateGraduationDecision({
        conversationId: 'conv-123',
        childId: 'child-456',
        familyId: 'family-789',
        requiredParentIds: ['parent-001'],
      })

      expect(checkAllConfirmations(decision.id)).toBe(false)
    })

    it('should return false when only child has confirmed', () => {
      const decision = initiateGraduationDecision({
        conversationId: 'conv-123',
        childId: 'child-456',
        familyId: 'family-789',
        requiredParentIds: ['parent-001'],
      })

      recordGraduationConfirmation({
        decisionId: decision.id,
        userId: 'child-456',
        role: 'child',
        graduationType: 'immediate',
        scheduledDate: null,
      })

      expect(checkAllConfirmations(decision.id)).toBe(false)
    })

    it('should return true when all parties have confirmed', () => {
      const decision = initiateGraduationDecision({
        conversationId: 'conv-123',
        childId: 'child-456',
        familyId: 'family-789',
        requiredParentIds: ['parent-001'],
      })

      recordGraduationConfirmation({
        decisionId: decision.id,
        userId: 'child-456',
        role: 'child',
        graduationType: 'immediate',
        scheduledDate: null,
      })

      recordGraduationConfirmation({
        decisionId: decision.id,
        userId: 'parent-001',
        role: 'parent',
        graduationType: 'immediate',
        scheduledDate: null,
      })

      expect(checkAllConfirmations(decision.id)).toBe(true)
    })
  })

  // ============================================
  // scheduleGraduation Tests
  // ============================================

  describe('scheduleGraduation', () => {
    const getConfirmedDecision = (): GraduationDecision => {
      const decision = initiateGraduationDecision({
        conversationId: 'conv-123',
        childId: 'child-456',
        familyId: 'family-789',
        requiredParentIds: ['parent-001'],
      })

      const scheduledDate = new Date()
      scheduledDate.setDate(scheduledDate.getDate() + 14)

      recordGraduationConfirmation({
        decisionId: decision.id,
        userId: 'child-456',
        role: 'child',
        graduationType: 'scheduled',
        scheduledDate,
      })

      return recordGraduationConfirmation({
        decisionId: decision.id,
        userId: 'parent-001',
        role: 'parent',
        graduationType: 'scheduled',
        scheduledDate,
      })
    }

    it('should schedule graduation for future date', () => {
      const decision = getConfirmedDecision()
      const scheduledDate = new Date()
      scheduledDate.setDate(scheduledDate.getDate() + 7)

      const updated = scheduleGraduation({
        decisionId: decision.id,
        scheduledDate,
      })

      expect(updated.graduationType).toBe('scheduled')
      expect(updated.scheduledDate).toEqual(scheduledDate)
    })

    it('should throw if decision not confirmed', () => {
      const decision = initiateGraduationDecision({
        conversationId: 'conv-123',
        childId: 'child-456',
        familyId: 'family-789',
        requiredParentIds: ['parent-001'],
      })

      const scheduledDate = new Date()
      scheduledDate.setDate(scheduledDate.getDate() + 7)

      expect(() =>
        scheduleGraduation({
          decisionId: decision.id,
          scheduledDate,
        })
      ).toThrow(/decision must be confirmed before scheduling/i)
    })

    it('should throw if date is in the past', () => {
      const decision = getConfirmedDecision()
      const pastDate = new Date()
      pastDate.setDate(pastDate.getDate() - 1)

      expect(() =>
        scheduleGraduation({
          decisionId: decision.id,
          scheduledDate: pastDate,
        })
      ).toThrow(/scheduled date must be/i)
    })

    it('should throw if date is more than 90 days in future', () => {
      const decision = getConfirmedDecision()
      const farFutureDate = new Date()
      farFutureDate.setDate(farFutureDate.getDate() + 100)

      expect(() =>
        scheduleGraduation({
          decisionId: decision.id,
          scheduledDate: farFutureDate,
        })
      ).toThrow(/scheduled date must be/i)
    })
  })

  // ============================================
  // executeGraduation Tests
  // ============================================

  describe('executeGraduation', () => {
    const getConfirmedDecision = (): GraduationDecision => {
      const decision = initiateGraduationDecision({
        conversationId: 'conv-123',
        childId: 'child-456',
        familyId: 'family-789',
        requiredParentIds: ['parent-001'],
      })

      recordGraduationConfirmation({
        decisionId: decision.id,
        userId: 'child-456',
        role: 'child',
        graduationType: 'immediate',
        scheduledDate: null,
      })

      return recordGraduationConfirmation({
        decisionId: decision.id,
        userId: 'parent-001',
        role: 'parent',
        graduationType: 'immediate',
        scheduledDate: null,
      })
    }

    it('should execute immediate graduation and return result', () => {
      const decision = getConfirmedDecision()
      const result = executeGraduation(decision.id)

      expect(result.success).toBe(true)
      expect(result.graduationType).toBe('immediate')
      expect(result.graduationDate).toBeDefined()
      expect(result.childId).toBe('child-456')
    })

    it('should mark decision as processing then completed', () => {
      const decision = getConfirmedDecision()
      executeGraduation(decision.id)

      const updated = getGraduationDecision(decision.id)
      expect(updated?.status).toBe('completed')
      expect(updated?.completedAt).not.toBeNull()
    })

    it('should throw if decision not confirmed', () => {
      const decision = initiateGraduationDecision({
        conversationId: 'conv-123',
        childId: 'child-456',
        familyId: 'family-789',
        requiredParentIds: ['parent-001'],
      })

      expect(() => executeGraduation(decision.id)).toThrow(/must be confirmed before execution/i)
    })
  })

  // ============================================
  // Query Functions Tests
  // ============================================

  describe('getGraduationDecision', () => {
    it('should return decision by id', () => {
      const decision = initiateGraduationDecision({
        conversationId: 'conv-123',
        childId: 'child-456',
        familyId: 'family-789',
        requiredParentIds: ['parent-001'],
      })

      const found = getGraduationDecision(decision.id)
      expect(found).not.toBeNull()
      expect(found?.id).toBe(decision.id)
    })

    it('should return null for non-existent decision', () => {
      const found = getGraduationDecision('nonexistent')
      expect(found).toBeNull()
    })
  })

  describe('getPendingDecisions', () => {
    it('should return pending decisions for family', () => {
      initiateGraduationDecision({
        conversationId: 'conv-123',
        childId: 'child-456',
        familyId: 'family-789',
        requiredParentIds: ['parent-001'],
      })

      const pending = getPendingDecisions('family-789')
      expect(pending).toHaveLength(1)
    })

    it('should not include completed decisions', () => {
      const decision = initiateGraduationDecision({
        conversationId: 'conv-123',
        childId: 'child-456',
        familyId: 'family-789',
        requiredParentIds: ['parent-001'],
      })

      recordGraduationConfirmation({
        decisionId: decision.id,
        userId: 'child-456',
        role: 'child',
        graduationType: 'immediate',
        scheduledDate: null,
      })

      recordGraduationConfirmation({
        decisionId: decision.id,
        userId: 'parent-001',
        role: 'parent',
        graduationType: 'immediate',
        scheduledDate: null,
      })

      executeGraduation(decision.id)

      const pending = getPendingDecisions('family-789')
      expect(pending).toHaveLength(0)
    })
  })

  describe('getDecisionsForChild', () => {
    it('should return all decisions for a child', () => {
      const decision = initiateGraduationDecision({
        conversationId: 'conv-123',
        childId: 'child-456',
        familyId: 'family-789',
        requiredParentIds: ['parent-001'],
      })

      recordGraduationConfirmation({
        decisionId: decision.id,
        userId: 'child-456',
        role: 'child',
        graduationType: 'immediate',
        scheduledDate: null,
      })

      recordGraduationConfirmation({
        decisionId: decision.id,
        userId: 'parent-001',
        role: 'parent',
        graduationType: 'immediate',
        scheduledDate: null,
      })

      executeGraduation(decision.id)

      // Create another decision for same child (after completion)
      initiateGraduationDecision({
        conversationId: 'conv-456',
        childId: 'child-456',
        familyId: 'family-789',
        requiredParentIds: ['parent-001'],
      })

      const decisions = getDecisionsForChild('child-456')
      expect(decisions).toHaveLength(2)
    })
  })

  describe('getDecisionsForFamily', () => {
    it('should return all decisions for a family', () => {
      initiateGraduationDecision({
        conversationId: 'conv-123',
        childId: 'child-456',
        familyId: 'family-789',
        requiredParentIds: ['parent-001'],
      })

      // Different family
      initiateGraduationDecision({
        conversationId: 'conv-456',
        childId: 'child-789',
        familyId: 'family-other',
        requiredParentIds: ['parent-002'],
      })

      const decisions = getDecisionsForFamily('family-789')
      expect(decisions).toHaveLength(1)
    })
  })

  // ============================================
  // Status Update Functions Tests
  // ============================================

  describe('markDecisionProcessing', () => {
    it('should update status to processing', () => {
      const decision = initiateGraduationDecision({
        conversationId: 'conv-123',
        childId: 'child-456',
        familyId: 'family-789',
        requiredParentIds: ['parent-001'],
      })

      recordGraduationConfirmation({
        decisionId: decision.id,
        userId: 'child-456',
        role: 'child',
        graduationType: 'immediate',
        scheduledDate: null,
      })

      recordGraduationConfirmation({
        decisionId: decision.id,
        userId: 'parent-001',
        role: 'parent',
        graduationType: 'immediate',
        scheduledDate: null,
      })

      const updated = markDecisionProcessing(decision.id)
      expect(updated.status).toBe('processing')
    })
  })

  describe('markDecisionCompleted', () => {
    it('should update status to completed with completedAt', () => {
      const decision = initiateGraduationDecision({
        conversationId: 'conv-123',
        childId: 'child-456',
        familyId: 'family-789',
        requiredParentIds: ['parent-001'],
      })

      recordGraduationConfirmation({
        decisionId: decision.id,
        userId: 'child-456',
        role: 'child',
        graduationType: 'immediate',
        scheduledDate: null,
      })

      recordGraduationConfirmation({
        decisionId: decision.id,
        userId: 'parent-001',
        role: 'parent',
        graduationType: 'immediate',
        scheduledDate: null,
      })

      markDecisionProcessing(decision.id)
      const updated = markDecisionCompleted(decision.id)

      expect(updated.status).toBe('completed')
      expect(updated.completedAt).not.toBeNull()
    })
  })

  describe('expireDecision', () => {
    it('should not expire completed decisions', () => {
      const decision = initiateGraduationDecision({
        conversationId: 'conv-123',
        childId: 'child-456',
        familyId: 'family-789',
        requiredParentIds: ['parent-001'],
      })

      recordGraduationConfirmation({
        decisionId: decision.id,
        userId: 'child-456',
        role: 'child',
        graduationType: 'immediate',
        scheduledDate: null,
      })

      recordGraduationConfirmation({
        decisionId: decision.id,
        userId: 'parent-001',
        role: 'parent',
        graduationType: 'immediate',
        scheduledDate: null,
      })

      executeGraduation(decision.id)

      expect(() => expireDecision(decision.id)).toThrow(/cannot expire a completed decision/i)
    })
  })

  // ============================================
  // Statistics Tests
  // ============================================

  describe('getDecisionStats', () => {
    it('should return accurate statistics', () => {
      // Create pending decision
      initiateGraduationDecision({
        conversationId: 'conv-123',
        childId: 'child-456',
        familyId: 'family-789',
        requiredParentIds: ['parent-001'],
      })

      // Create completed decision
      const decision2 = initiateGraduationDecision({
        conversationId: 'conv-456',
        childId: 'child-789',
        familyId: 'family-other',
        requiredParentIds: ['parent-002'],
      })

      recordGraduationConfirmation({
        decisionId: decision2.id,
        userId: 'child-789',
        role: 'child',
        graduationType: 'immediate',
        scheduledDate: null,
      })

      recordGraduationConfirmation({
        decisionId: decision2.id,
        userId: 'parent-002',
        role: 'parent',
        graduationType: 'immediate',
        scheduledDate: null,
      })

      executeGraduation(decision2.id)

      const stats = getDecisionStats()
      expect(stats.total).toBe(2)
      expect(stats.byStatus.pending).toBe(1)
      expect(stats.byStatus.completed).toBe(1)
    })
  })
})
