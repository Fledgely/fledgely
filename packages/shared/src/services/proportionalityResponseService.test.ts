/**
 * ProportionalityResponseService Tests - Story 38.4 Task 3
 *
 * Tests for handling responses to proportionality checks.
 * AC2: Both parties prompted: "Is current monitoring appropriate?"
 * AC3: Questions include: "Has external risk changed?", "Has maturity increased?"
 * AC5: Parent and child respond separately (private)
 */

import { describe, it, expect, beforeEach } from 'vitest'
import {
  submitResponse,
  getResponseForCheck,
  getAllResponsesForCheck,
  canViewResponse,
  hasAllPartiesResponded,
  getResponsesForUser,
  clearAllResponseData,
} from './proportionalityResponseService'
import { createProportionalityCheck, clearAllCheckData } from './proportionalityCheckService'
import type { ResponseChoice, RiskChange } from '../contracts/proportionalityCheck'

describe('ProportionalityResponseService', () => {
  beforeEach(() => {
    clearAllCheckData()
    clearAllResponseData()
  })

  const createTestCheck = () => {
    const thirteenMonthsAgo = new Date()
    thirteenMonthsAgo.setMonth(thirteenMonthsAgo.getMonth() - 13)

    return createProportionalityCheck('family-123', 'child-456', thirteenMonthsAgo, 'annual')
  }

  // ============================================
  // Response Submission Tests
  // ============================================

  describe('submitResponse', () => {
    it('should submit child response with core question', () => {
      const check = createTestCheck()

      const response = submitResponse({
        checkId: check.id,
        respondentId: 'child-456',
        respondentRole: 'child',
        isMonitoringAppropriate: 'appropriate',
        hasExternalRiskChanged: null,
        hasMaturityIncreased: null,
        freeformFeedback: null,
        suggestedChanges: [],
      })

      expect(response.id).toBeDefined()
      expect(response.checkId).toBe(check.id)
      expect(response.respondentRole).toBe('child')
      expect(response.isMonitoringAppropriate).toBe('appropriate')
      expect(response.isPrivate).toBe(true)
    })

    it('should submit parent response with additional questions (AC3)', () => {
      const check = createTestCheck()

      const response = submitResponse({
        checkId: check.id,
        respondentId: 'parent-789',
        respondentRole: 'parent',
        isMonitoringAppropriate: 'reduce',
        hasExternalRiskChanged: 'decreased',
        hasMaturityIncreased: true,
        freeformFeedback: 'Things have improved significantly',
        suggestedChanges: ['reduce_screenshot_frequency'],
      })

      expect(response.hasExternalRiskChanged).toBe('decreased')
      expect(response.hasMaturityIncreased).toBe(true)
      expect(response.freeformFeedback).toBe('Things have improved significantly')
      expect(response.suggestedChanges).toContain('reduce_screenshot_frequency')
    })

    it('should accept all response choices (AC2)', () => {
      const choices: ResponseChoice[] = ['appropriate', 'reduce', 'increase', 'discuss', 'graduate']

      for (let i = 0; i < choices.length; i++) {
        clearAllCheckData()
        clearAllResponseData()

        const check = createTestCheck()
        const response = submitResponse({
          checkId: check.id,
          respondentId: `user-${i}`,
          respondentRole: i % 2 === 0 ? 'child' : 'parent',
          isMonitoringAppropriate: choices[i],
          hasExternalRiskChanged: null,
          hasMaturityIncreased: null,
          freeformFeedback: null,
          suggestedChanges: [],
        })

        expect(response.isMonitoringAppropriate).toBe(choices[i])
      }
    })

    it('should accept all risk change options (AC3)', () => {
      const riskChanges: RiskChange[] = ['decreased', 'same', 'increased']

      for (let i = 0; i < riskChanges.length; i++) {
        clearAllCheckData()
        clearAllResponseData()

        const check = createTestCheck()
        const response = submitResponse({
          checkId: check.id,
          respondentId: `parent-${i}`,
          respondentRole: 'parent',
          isMonitoringAppropriate: 'appropriate',
          hasExternalRiskChanged: riskChanges[i],
          hasMaturityIncreased: null,
          freeformFeedback: null,
          suggestedChanges: [],
        })

        expect(response.hasExternalRiskChanged).toBe(riskChanges[i])
      }
    })

    it('should throw for non-existent check', () => {
      expect(() =>
        submitResponse({
          checkId: 'nonexistent',
          respondentId: 'user-123',
          respondentRole: 'child',
          isMonitoringAppropriate: 'appropriate',
          hasExternalRiskChanged: null,
          hasMaturityIncreased: null,
          freeformFeedback: null,
          suggestedChanges: [],
        })
      ).toThrow(/not found/i)
    })

    it('should throw if respondent already responded', () => {
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

      expect(() =>
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
      ).toThrow(/already responded/i)
    })

    it('should always set isPrivate to true (AC5)', () => {
      const check = createTestCheck()

      const response = submitResponse({
        checkId: check.id,
        respondentId: 'child-456',
        respondentRole: 'child',
        isMonitoringAppropriate: 'appropriate',
        hasExternalRiskChanged: null,
        hasMaturityIncreased: null,
        freeformFeedback: null,
        suggestedChanges: [],
      })

      expect(response.isPrivate).toBe(true)
    })
  })

  // ============================================
  // Response Query Tests
  // ============================================

  describe('getResponseForCheck', () => {
    it('should return response for specific respondent', () => {
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

      const response = getResponseForCheck(check.id, 'child-456')
      expect(response).not.toBeNull()
      expect(response?.respondentId).toBe('child-456')
    })

    it('should return null for respondent who has not responded', () => {
      const check = createTestCheck()

      const response = getResponseForCheck(check.id, 'nonexistent-user')
      expect(response).toBeNull()
    })
  })

  describe('getAllResponsesForCheck', () => {
    it('should return all responses for a check', () => {
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
        isMonitoringAppropriate: 'reduce',
        hasExternalRiskChanged: 'decreased',
        hasMaturityIncreased: true,
        freeformFeedback: null,
        suggestedChanges: [],
      })

      const responses = getAllResponsesForCheck(check.id)
      expect(responses).toHaveLength(2)
    })

    it('should return empty array for check without responses', () => {
      const check = createTestCheck()

      const responses = getAllResponsesForCheck(check.id)
      expect(responses).toHaveLength(0)
    })
  })

  describe('getResponsesForUser', () => {
    it('should return all responses by a user', () => {
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

      const responses = getResponsesForUser('child-456')
      expect(responses).toHaveLength(1)
      expect(responses[0].respondentId).toBe('child-456')
    })
  })

  // ============================================
  // Privacy Tests (AC5)
  // ============================================

  describe('canViewResponse', () => {
    it('should return true for own response', () => {
      const check = createTestCheck()

      const response = submitResponse({
        checkId: check.id,
        respondentId: 'child-456',
        respondentRole: 'child',
        isMonitoringAppropriate: 'appropriate',
        hasExternalRiskChanged: null,
        hasMaturityIncreased: null,
        freeformFeedback: null,
        suggestedChanges: [],
      })

      expect(canViewResponse('child-456', response)).toBe(true)
    })

    it('should return false for other users (AC5)', () => {
      const check = createTestCheck()

      const response = submitResponse({
        checkId: check.id,
        respondentId: 'child-456',
        respondentRole: 'child',
        isMonitoringAppropriate: 'appropriate',
        hasExternalRiskChanged: null,
        hasMaturityIncreased: null,
        freeformFeedback: null,
        suggestedChanges: [],
      })

      // Parent cannot view child's response
      expect(canViewResponse('parent-789', response)).toBe(false)
    })

    it('should return false for other parents (AC5)', () => {
      const check = createTestCheck()

      const response = submitResponse({
        checkId: check.id,
        respondentId: 'parent-1',
        respondentRole: 'parent',
        isMonitoringAppropriate: 'appropriate',
        hasExternalRiskChanged: null,
        hasMaturityIncreased: null,
        freeformFeedback: null,
        suggestedChanges: [],
      })

      // Other parent cannot view response
      expect(canViewResponse('parent-2', response)).toBe(false)
    })
  })

  // ============================================
  // Completion Check Tests
  // ============================================

  describe('hasAllPartiesResponded', () => {
    it('should return false when no responses', () => {
      const check = createTestCheck()
      expect(hasAllPartiesResponded(check.id, ['child-456'], ['parent-789'])).toBe(false)
    })

    it('should return false when only child responded', () => {
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

      expect(hasAllPartiesResponded(check.id, ['child-456'], ['parent-789'])).toBe(false)
    })

    it('should return false when only parent responded', () => {
      const check = createTestCheck()

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

      expect(hasAllPartiesResponded(check.id, ['child-456'], ['parent-789'])).toBe(false)
    })

    it('should return true when all parties responded', () => {
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

      expect(hasAllPartiesResponded(check.id, ['child-456'], ['parent-789'])).toBe(true)
    })

    it('should handle multiple parents', () => {
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
        respondentId: 'parent-1',
        respondentRole: 'parent',
        isMonitoringAppropriate: 'appropriate',
        hasExternalRiskChanged: null,
        hasMaturityIncreased: null,
        freeformFeedback: null,
        suggestedChanges: [],
      })

      // Only one parent responded
      expect(hasAllPartiesResponded(check.id, ['child-456'], ['parent-1', 'parent-2'])).toBe(false)

      submitResponse({
        checkId: check.id,
        respondentId: 'parent-2',
        respondentRole: 'parent',
        isMonitoringAppropriate: 'reduce',
        hasExternalRiskChanged: 'decreased',
        hasMaturityIncreased: null,
        freeformFeedback: null,
        suggestedChanges: [],
      })

      // Both parents responded
      expect(hasAllPartiesResponded(check.id, ['child-456'], ['parent-1', 'parent-2'])).toBe(true)
    })
  })
})
