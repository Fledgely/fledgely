/**
 * Proportionality Check Contract Tests - Story 38.4 Task 1
 *
 * Tests for the annual proportionality check data model.
 * AC1: Annual prompt triggered after 12+ months of active monitoring (FR-CR4)
 */

import { describe, it, expect } from 'vitest'
import {
  checkTriggerSchema,
  checkStatusSchema,
  responseChoiceSchema,
  riskChangeSchema,
  proportionalityCheckSchema,
  proportionalityResponseSchema,
  proportionalitySuggestionSchema,
  disagreementRecordSchema,
  PROPORTIONALITY_CHECK_INTERVAL_MONTHS,
  CHECK_EXPIRY_DAYS,
  REMINDER_AFTER_DAYS,
  type ProportionalityCheck,
  type ProportionalityResponse,
  type ProportionalitySuggestion,
  type DisagreementRecord,
} from './proportionalityCheck'

describe('ProportionalityCheck Contracts', () => {
  // ============================================
  // Enum Schema Tests
  // ============================================

  describe('checkTriggerSchema', () => {
    it('should accept valid trigger types', () => {
      expect(checkTriggerSchema.parse('annual')).toBe('annual')
      expect(checkTriggerSchema.parse('manual')).toBe('manual')
      expect(checkTriggerSchema.parse('system')).toBe('system')
    })

    it('should reject invalid trigger types', () => {
      expect(() => checkTriggerSchema.parse('daily')).toThrow()
      expect(() => checkTriggerSchema.parse('')).toThrow()
    })
  })

  describe('checkStatusSchema', () => {
    it('should accept valid status values', () => {
      expect(checkStatusSchema.parse('pending')).toBe('pending')
      expect(checkStatusSchema.parse('in_progress')).toBe('in_progress')
      expect(checkStatusSchema.parse('completed')).toBe('completed')
      expect(checkStatusSchema.parse('expired')).toBe('expired')
    })

    it('should reject invalid status values', () => {
      expect(() => checkStatusSchema.parse('done')).toThrow()
    })
  })

  describe('responseChoiceSchema', () => {
    it('should accept valid response choices', () => {
      expect(responseChoiceSchema.parse('appropriate')).toBe('appropriate')
      expect(responseChoiceSchema.parse('reduce')).toBe('reduce')
      expect(responseChoiceSchema.parse('increase')).toBe('increase')
      expect(responseChoiceSchema.parse('discuss')).toBe('discuss')
      expect(responseChoiceSchema.parse('graduate')).toBe('graduate')
    })

    it('should reject invalid response choices', () => {
      expect(() => responseChoiceSchema.parse('maybe')).toThrow()
    })
  })

  describe('riskChangeSchema', () => {
    it('should accept valid risk change values', () => {
      expect(riskChangeSchema.parse('decreased')).toBe('decreased')
      expect(riskChangeSchema.parse('same')).toBe('same')
      expect(riskChangeSchema.parse('increased')).toBe('increased')
    })

    it('should reject invalid risk change values', () => {
      expect(() => riskChangeSchema.parse('unknown')).toThrow()
    })
  })

  // ============================================
  // ProportionalityCheck Schema Tests
  // ============================================

  describe('proportionalityCheckSchema', () => {
    const validCheck: ProportionalityCheck = {
      id: 'check-123',
      familyId: 'family-456',
      childId: 'child-789',
      triggerType: 'annual',
      status: 'pending',
      monitoringStartDate: new Date('2024-01-01'),
      checkDueDate: new Date('2025-01-01'),
      checkCompletedDate: null,
      expiresAt: new Date('2025-01-15'),
      createdAt: new Date('2025-01-01'),
    }

    it('should validate a complete proportionality check', () => {
      const result = proportionalityCheckSchema.parse(validCheck)
      expect(result.id).toBe('check-123')
      expect(result.familyId).toBe('family-456')
      expect(result.childId).toBe('child-789')
      expect(result.triggerType).toBe('annual')
      expect(result.status).toBe('pending')
    })

    it('should allow null checkCompletedDate for pending checks', () => {
      const result = proportionalityCheckSchema.parse(validCheck)
      expect(result.checkCompletedDate).toBeNull()
    })

    it('should allow Date for checkCompletedDate when completed', () => {
      const completedCheck = {
        ...validCheck,
        status: 'completed' as const,
        checkCompletedDate: new Date('2025-01-10'),
      }
      const result = proportionalityCheckSchema.parse(completedCheck)
      expect(result.checkCompletedDate).toBeInstanceOf(Date)
    })

    it('should require all mandatory fields', () => {
      expect(() => proportionalityCheckSchema.parse({})).toThrow()
      expect(() => proportionalityCheckSchema.parse({ id: 'test' })).toThrow()
    })
  })

  // ============================================
  // ProportionalityResponse Schema Tests
  // ============================================

  describe('proportionalityResponseSchema', () => {
    const validResponse: ProportionalityResponse = {
      id: 'resp-123',
      checkId: 'check-456',
      respondentId: 'user-789',
      respondentRole: 'child',
      isMonitoringAppropriate: 'appropriate',
      hasExternalRiskChanged: null,
      hasMaturityIncreased: null,
      freeformFeedback: null,
      suggestedChanges: [],
      respondedAt: new Date(),
      isPrivate: true,
    }

    it('should validate a complete response', () => {
      const result = proportionalityResponseSchema.parse(validResponse)
      expect(result.id).toBe('resp-123')
      expect(result.respondentRole).toBe('child')
      expect(result.isMonitoringAppropriate).toBe('appropriate')
    })

    it('should accept parent as respondentRole', () => {
      const parentResponse = { ...validResponse, respondentRole: 'parent' as const }
      const result = proportionalityResponseSchema.parse(parentResponse)
      expect(result.respondentRole).toBe('parent')
    })

    it('should allow optional feedback fields', () => {
      const withFeedback: ProportionalityResponse = {
        ...validResponse,
        hasExternalRiskChanged: 'decreased',
        hasMaturityIncreased: true,
        freeformFeedback: 'Things are going well',
        suggestedChanges: ['reduce_screenshot_frequency'],
      }
      const result = proportionalityResponseSchema.parse(withFeedback)
      expect(result.hasExternalRiskChanged).toBe('decreased')
      expect(result.hasMaturityIncreased).toBe(true)
      expect(result.freeformFeedback).toBe('Things are going well')
      expect(result.suggestedChanges).toContain('reduce_screenshot_frequency')
    })

    it('should enforce isPrivate is always true', () => {
      const result = proportionalityResponseSchema.parse(validResponse)
      expect(result.isPrivate).toBe(true)
    })
  })

  // ============================================
  // ProportionalitySuggestion Schema Tests
  // ============================================

  describe('proportionalitySuggestionSchema', () => {
    const validSuggestion: ProportionalitySuggestion = {
      type: 'reduce_monitoring',
      title: 'Consider Reduced Monitoring',
      description: 'Based on consistent trust, you may want to reduce monitoring frequency.',
      basedOn: {
        childAge: 15,
        trustScore: 95,
        monthsMonitored: 24,
        trustMilestone: 'trusted',
      },
      priority: 'medium',
    }

    it('should validate a complete suggestion', () => {
      const result = proportionalitySuggestionSchema.parse(validSuggestion)
      expect(result.type).toBe('reduce_monitoring')
      expect(result.title).toBe('Consider Reduced Monitoring')
      expect(result.basedOn.childAge).toBe(15)
    })

    it('should accept all valid suggestion types', () => {
      const types = ['reduce_monitoring', 'maintain', 'graduation_eligible', 'consider_discussion']
      for (const type of types) {
        const suggestion = { ...validSuggestion, type }
        expect(() => proportionalitySuggestionSchema.parse(suggestion)).not.toThrow()
      }
    })

    it('should accept all valid priority levels', () => {
      const priorities = ['high', 'medium', 'low']
      for (const priority of priorities) {
        const suggestion = { ...validSuggestion, priority }
        expect(() => proportionalitySuggestionSchema.parse(suggestion)).not.toThrow()
      }
    })

    it('should allow null trustMilestone', () => {
      const noMilestone = {
        ...validSuggestion,
        basedOn: { ...validSuggestion.basedOn, trustMilestone: null },
      }
      const result = proportionalitySuggestionSchema.parse(noMilestone)
      expect(result.basedOn.trustMilestone).toBeNull()
    })
  })

  // ============================================
  // DisagreementRecord Schema Tests
  // ============================================

  describe('disagreementRecordSchema', () => {
    const validDisagreement: DisagreementRecord = {
      id: 'disagree-123',
      checkId: 'check-456',
      familyId: 'family-789',
      childId: 'child-012',
      childResponse: 'graduate',
      parentResponses: [{ parentId: 'parent-1', response: 'appropriate' }],
      disagreementType: 'child_wants_less',
      surfacedAt: new Date(),
      resolvedAt: null,
      resolution: null,
    }

    it('should validate a complete disagreement record', () => {
      const result = disagreementRecordSchema.parse(validDisagreement)
      expect(result.checkId).toBe('check-456')
      expect(result.disagreementType).toBe('child_wants_less')
    })

    it('should accept all valid disagreement types', () => {
      const types = ['child_wants_less', 'parent_wants_more', 'mixed']
      for (const type of types) {
        const disagreement = { ...validDisagreement, disagreementType: type }
        expect(() => disagreementRecordSchema.parse(disagreement)).not.toThrow()
      }
    })

    it('should allow resolved disagreement with resolution text', () => {
      const resolved: DisagreementRecord = {
        ...validDisagreement,
        resolvedAt: new Date(),
        resolution: 'Discussed and agreed to reduce monitoring',
      }
      const result = disagreementRecordSchema.parse(resolved)
      expect(result.resolvedAt).toBeInstanceOf(Date)
      expect(result.resolution).toBe('Discussed and agreed to reduce monitoring')
    })

    it('should support multiple parent responses', () => {
      const multiParent: DisagreementRecord = {
        ...validDisagreement,
        parentResponses: [
          { parentId: 'parent-1', response: 'appropriate' },
          { parentId: 'parent-2', response: 'reduce' },
        ],
        disagreementType: 'mixed',
      }
      const result = disagreementRecordSchema.parse(multiParent)
      expect(result.parentResponses).toHaveLength(2)
    })
  })

  // ============================================
  // Configuration Constants Tests
  // ============================================

  describe('Configuration Constants', () => {
    it('should have 12-month check interval', () => {
      expect(PROPORTIONALITY_CHECK_INTERVAL_MONTHS).toBe(12)
    })

    it('should have 14-day expiry period', () => {
      expect(CHECK_EXPIRY_DAYS).toBe(14)
    })

    it('should have 7-day reminder delay', () => {
      expect(REMINDER_AFTER_DAYS).toBe(7)
    })
  })
})
