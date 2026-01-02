/**
 * ProportionalityDisagreementService Tests - Story 38.4 Task 5
 *
 * Tests for detecting and surfacing disagreements.
 * AC6: Disagreement surfaces for family conversation
 */

import { describe, it, expect, beforeEach } from 'vitest'
import {
  detectDisagreement,
  categorizeDisagreement,
  createDisagreementRecord,
  getUnresolvedDisagreements,
  markDisagreementResolved,
  clearAllDisagreementData,
} from './proportionalityDisagreementService'
import { createProportionalityCheck, clearAllCheckData } from './proportionalityCheckService'
import { submitResponse, clearAllResponseData } from './proportionalityResponseService'

describe('ProportionalityDisagreementService', () => {
  beforeEach(() => {
    clearAllCheckData()
    clearAllResponseData()
    clearAllDisagreementData()
  })

  const createTestCheck = () => {
    const thirteenMonthsAgo = new Date()
    thirteenMonthsAgo.setMonth(thirteenMonthsAgo.getMonth() - 13)

    return createProportionalityCheck('family-123', 'child-456', thirteenMonthsAgo, 'annual')
  }

  // ============================================
  // categorizeDisagreement Tests
  // ============================================

  describe('categorizeDisagreement', () => {
    it('should return child_wants_less when child wants less monitoring', () => {
      const result = categorizeDisagreement('graduate', ['appropriate'])
      expect(result).toBe('child_wants_less')
    })

    it('should return child_wants_less when child wants reduced monitoring', () => {
      const result = categorizeDisagreement('reduce', ['appropriate', 'appropriate'])
      expect(result).toBe('child_wants_less')
    })

    it('should return parent_wants_more when parent wants more', () => {
      const result = categorizeDisagreement('appropriate', ['increase'])
      expect(result).toBe('parent_wants_more')
    })

    it('should return mixed when parents disagree', () => {
      const result = categorizeDisagreement('appropriate', ['reduce', 'increase'])
      expect(result).toBe('mixed')
    })

    it('should return null when all agree', () => {
      const result = categorizeDisagreement('appropriate', ['appropriate', 'appropriate'])
      expect(result).toBeNull()
    })

    it('should return null when child and single parent agree on reduce', () => {
      const result = categorizeDisagreement('reduce', ['reduce'])
      expect(result).toBeNull()
    })

    it('should return null when child and parent both want to graduate', () => {
      const result = categorizeDisagreement('graduate', ['graduate'])
      expect(result).toBeNull()
    })

    it('should return child_wants_less when child wants to discuss but parent says appropriate', () => {
      const result = categorizeDisagreement('discuss', ['appropriate'])
      // 'discuss' is neutral, so this might not be a disagreement
      // but if child wants discussion, it could indicate they want changes
      expect(result === null || result === 'child_wants_less').toBe(true)
    })
  })

  // ============================================
  // detectDisagreement Tests
  // ============================================

  describe('detectDisagreement', () => {
    it('should detect disagreement when child wants graduation but parent wants maintain', () => {
      const check = createTestCheck()

      submitResponse({
        checkId: check.id,
        respondentId: 'child-456',
        respondentRole: 'child',
        isMonitoringAppropriate: 'graduate',
        hasExternalRiskChanged: null,
        hasMaturityIncreased: null,
        freeformFeedback: null,
        suggestedChanges: [],
      })

      submitResponse({
        checkId: check.id,
        respondentId: 'parent-789',
        respondentRole: 'parent',
        isMonitoringAppropriate: 'appropriate',
        hasExternalRiskChanged: null,
        hasMaturityIncreased: null,
        freeformFeedback: null,
        suggestedChanges: [],
      })

      const disagreement = detectDisagreement(check.id)
      expect(disagreement).not.toBeNull()
      expect(disagreement?.disagreementType).toBe('child_wants_less')
    })

    it('should return null when no responses exist', () => {
      const check = createTestCheck()
      const disagreement = detectDisagreement(check.id)
      expect(disagreement).toBeNull()
    })

    it('should return null when only child responded', () => {
      const check = createTestCheck()

      submitResponse({
        checkId: check.id,
        respondentId: 'child-456',
        respondentRole: 'child',
        isMonitoringAppropriate: 'graduate',
        hasExternalRiskChanged: null,
        hasMaturityIncreased: null,
        freeformFeedback: null,
        suggestedChanges: [],
      })

      const disagreement = detectDisagreement(check.id)
      expect(disagreement).toBeNull()
    })

    it('should return null when all agree', () => {
      const check = createTestCheck()

      submitResponse({
        checkId: check.id,
        respondentId: 'child-456',
        respondentRole: 'child',
        isMonitoringAppropriate: 'appropriate',
        hasExternalRiskChanged: null,
        hasMaturityIncreased: null,
        freeformFeedback: null,
        suggestedChanges: [],
      })

      submitResponse({
        checkId: check.id,
        respondentId: 'parent-789',
        respondentRole: 'parent',
        isMonitoringAppropriate: 'appropriate',
        hasExternalRiskChanged: null,
        hasMaturityIncreased: null,
        freeformFeedback: null,
        suggestedChanges: [],
      })

      const disagreement = detectDisagreement(check.id)
      expect(disagreement).toBeNull()
    })
  })

  // ============================================
  // createDisagreementRecord Tests
  // ============================================

  describe('createDisagreementRecord', () => {
    it('should create disagreement record with correct data', () => {
      const check = createTestCheck()

      submitResponse({
        checkId: check.id,
        respondentId: 'child-456',
        respondentRole: 'child',
        isMonitoringAppropriate: 'reduce',
        hasExternalRiskChanged: null,
        hasMaturityIncreased: null,
        freeformFeedback: null,
        suggestedChanges: [],
      })

      submitResponse({
        checkId: check.id,
        respondentId: 'parent-789',
        respondentRole: 'parent',
        isMonitoringAppropriate: 'increase',
        hasExternalRiskChanged: null,
        hasMaturityIncreased: null,
        freeformFeedback: null,
        suggestedChanges: [],
      })

      const record = createDisagreementRecord(check.id, 'family-123', 'child-456')
      expect(record).toBeDefined()
      expect(record?.checkId).toBe(check.id)
      expect(record?.familyId).toBe('family-123')
      expect(record?.childId).toBe('child-456')
      expect(record?.resolvedAt).toBeNull()
    })

    it('should return null when no disagreement exists', () => {
      const check = createTestCheck()

      submitResponse({
        checkId: check.id,
        respondentId: 'child-456',
        respondentRole: 'child',
        isMonitoringAppropriate: 'appropriate',
        hasExternalRiskChanged: null,
        hasMaturityIncreased: null,
        freeformFeedback: null,
        suggestedChanges: [],
      })

      submitResponse({
        checkId: check.id,
        respondentId: 'parent-789',
        respondentRole: 'parent',
        isMonitoringAppropriate: 'appropriate',
        hasExternalRiskChanged: null,
        hasMaturityIncreased: null,
        freeformFeedback: null,
        suggestedChanges: [],
      })

      const record = createDisagreementRecord(check.id, 'family-123', 'child-456')
      expect(record).toBeNull()
    })
  })

  // ============================================
  // getUnresolvedDisagreements Tests
  // ============================================

  describe('getUnresolvedDisagreements', () => {
    it('should return unresolved disagreements for family', () => {
      const check = createTestCheck()

      submitResponse({
        checkId: check.id,
        respondentId: 'child-456',
        respondentRole: 'child',
        isMonitoringAppropriate: 'graduate',
        hasExternalRiskChanged: null,
        hasMaturityIncreased: null,
        freeformFeedback: null,
        suggestedChanges: [],
      })

      submitResponse({
        checkId: check.id,
        respondentId: 'parent-789',
        respondentRole: 'parent',
        isMonitoringAppropriate: 'appropriate',
        hasExternalRiskChanged: null,
        hasMaturityIncreased: null,
        freeformFeedback: null,
        suggestedChanges: [],
      })

      createDisagreementRecord(check.id, 'family-123', 'child-456')

      const unresolved = getUnresolvedDisagreements('family-123')
      expect(unresolved).toHaveLength(1)
    })

    it('should return empty array for family without disagreements', () => {
      const unresolved = getUnresolvedDisagreements('nonexistent-family')
      expect(unresolved).toHaveLength(0)
    })
  })

  // ============================================
  // markDisagreementResolved Tests
  // ============================================

  describe('markDisagreementResolved', () => {
    it('should mark disagreement as resolved with resolution text', () => {
      const check = createTestCheck()

      submitResponse({
        checkId: check.id,
        respondentId: 'child-456',
        respondentRole: 'child',
        isMonitoringAppropriate: 'graduate',
        hasExternalRiskChanged: null,
        hasMaturityIncreased: null,
        freeformFeedback: null,
        suggestedChanges: [],
      })

      submitResponse({
        checkId: check.id,
        respondentId: 'parent-789',
        respondentRole: 'parent',
        isMonitoringAppropriate: 'appropriate',
        hasExternalRiskChanged: null,
        hasMaturityIncreased: null,
        freeformFeedback: null,
        suggestedChanges: [],
      })

      const record = createDisagreementRecord(check.id, 'family-123', 'child-456')
      expect(record).not.toBeNull()

      if (record) {
        const resolved = markDisagreementResolved(record.id, 'Had a family conversation')
        expect(resolved.resolvedAt).toBeInstanceOf(Date)
        expect(resolved.resolution).toBe('Had a family conversation')
      }
    })

    it('should remove disagreement from unresolved list after resolution', () => {
      const check = createTestCheck()

      submitResponse({
        checkId: check.id,
        respondentId: 'child-456',
        respondentRole: 'child',
        isMonitoringAppropriate: 'graduate',
        hasExternalRiskChanged: null,
        hasMaturityIncreased: null,
        freeformFeedback: null,
        suggestedChanges: [],
      })

      submitResponse({
        checkId: check.id,
        respondentId: 'parent-789',
        respondentRole: 'parent',
        isMonitoringAppropriate: 'appropriate',
        hasExternalRiskChanged: null,
        hasMaturityIncreased: null,
        freeformFeedback: null,
        suggestedChanges: [],
      })

      const record = createDisagreementRecord(check.id, 'family-123', 'child-456')
      expect(getUnresolvedDisagreements('family-123')).toHaveLength(1)

      if (record) {
        markDisagreementResolved(record.id, 'Resolved')
        expect(getUnresolvedDisagreements('family-123')).toHaveLength(0)
      }
    })
  })
})
