/**
 * Proportionality Check Integration Tests - Story 38.4 Task 10
 *
 * End-to-end integration tests for the proportionality check workflow.
 * Tests the complete flow from check creation through response collection,
 * suggestion generation, and disagreement detection.
 */

import { describe, it, expect, beforeEach } from 'vitest'

// Services
import {
  isEligibleForProportionalityCheck,
  createProportionalityCheck,
  getActiveCheckForChild,
  markCheckInProgress,
  markCheckCompleted,
  clearAllCheckData,
} from '../../proportionalityCheckService'
import {
  submitResponse,
  hasAllPartiesResponded,
  getResponseSummary,
  canViewResponse,
  clearAllResponseData,
} from '../../proportionalityResponseService'
import { generateSuggestions } from '../../proportionalitySuggestionService'
import {
  detectDisagreement,
  createDisagreementRecord,
  markDisagreementResolved,
  clearAllDisagreementData,
} from '../../proportionalityDisagreementService'

describe('Proportionality Check Integration', () => {
  beforeEach(() => {
    // Clear all stored data before each test
    clearAllCheckData()
    clearAllResponseData()
    clearAllDisagreementData()
  })

  // ============================================
  // Full Workflow Integration Tests
  // ============================================

  describe('Complete Check Workflow', () => {
    it('should complete full workflow: check creation → responses → suggestions', () => {
      // Step 1: Check eligibility (13 months of monitoring)
      const thirteenMonthsAgo = new Date()
      thirteenMonthsAgo.setMonth(thirteenMonthsAgo.getMonth() - 13)
      const childId = 'child-integration-1'

      const isEligible = isEligibleForProportionalityCheck(childId, thirteenMonthsAgo)
      expect(isEligible).toBe(true)

      // Step 2: Create check
      const check = createProportionalityCheck('family-1', childId, thirteenMonthsAgo, 'annual')
      expect(check.status).toBe('pending')
      expect(check.triggerType).toBe('annual')

      // Verify active check is retrievable
      const activeCheck = getActiveCheckForChild(childId)
      expect(activeCheck).not.toBeNull()
      expect(activeCheck?.id).toBe(check.id)

      // Step 3: Child submits response
      const childResponse = submitResponse({
        checkId: check.id,
        respondentId: 'child-integration-1',
        respondentRole: 'child',
        isMonitoringAppropriate: 'appropriate',
        hasExternalRiskChanged: 'decreased',
        hasMaturityIncreased: true,
        freeformFeedback: 'I think things are going well',
        suggestedChanges: [],
      })
      expect(childResponse.isPrivate).toBe(true)

      // Check status should be updated
      markCheckInProgress(check.id)

      // Step 4: Parent submits response
      submitResponse({
        checkId: check.id,
        respondentId: 'parent-1',
        respondentRole: 'parent',
        isMonitoringAppropriate: 'appropriate',
        hasExternalRiskChanged: 'same',
        hasMaturityIncreased: true,
        freeformFeedback: null,
        suggestedChanges: [],
      })

      // Step 5: Verify all parties responded
      const allResponded = hasAllPartiesResponded(check.id, [childId], ['parent-1'])
      expect(allResponded).toBe(true)

      // Step 6: Complete the check
      const completedCheck = markCheckCompleted(check.id)
      expect(completedCheck?.status).toBe('completed')
      expect(completedCheck?.checkCompletedDate).not.toBeNull()

      // Step 7: Generate and store suggestions
      const suggestions = generateSuggestions({
        checkId: check.id,
        childAge: 15,
        trustScore: 85,
        monthsMonitored: 13,
        trustMilestone: 'trusted',
        childResponse: 'appropriate',
        parentResponses: ['appropriate'],
      })
      expect(suggestions.length).toBeGreaterThan(0)

      // Suggestions are generated (not stored - service is stateless)
      // In a real implementation, these would be stored in a database

      // Step 8: No disagreement should be detected (both said "appropriate")
      const disagreement = detectDisagreement(check.id)
      expect(disagreement).toBeNull()

      // Step 9: Verify response summary
      const summary = getResponseSummary(check.id)
      expect(summary.totalResponses).toBe(2)
      expect(summary.childResponded).toBe(true)
      expect(summary.parentResponseCount).toBe(1)
    })

    it('should handle disagreement workflow: child wants graduation, parent wants to maintain', () => {
      // Setup: Create check
      const thirteenMonthsAgo = new Date()
      thirteenMonthsAgo.setMonth(thirteenMonthsAgo.getMonth() - 13)
      const childId = 'child-disagree-1'
      const familyId = 'family-disagree-1'

      const check = createProportionalityCheck(familyId, childId, thirteenMonthsAgo, 'annual')

      // Child wants to graduate
      submitResponse({
        checkId: check.id,
        respondentId: childId,
        respondentRole: 'child',
        isMonitoringAppropriate: 'graduate',
        hasExternalRiskChanged: 'decreased',
        hasMaturityIncreased: true,
        freeformFeedback: 'I feel ready to graduate',
        suggestedChanges: [],
      })

      // Parent wants to maintain current monitoring
      submitResponse({
        checkId: check.id,
        respondentId: 'parent-disagree-1',
        respondentRole: 'parent',
        isMonitoringAppropriate: 'appropriate',
        hasExternalRiskChanged: 'same',
        hasMaturityIncreased: false,
        freeformFeedback: null,
        suggestedChanges: [],
      })

      // Mark check as completed
      markCheckCompleted(check.id)

      // Detect disagreement
      const disagreement = detectDisagreement(check.id)
      expect(disagreement).not.toBeNull()
      expect(disagreement?.disagreementType).toBe('child_wants_less')
      expect(disagreement?.childResponse).toBe('graduate')

      // Create disagreement record
      const record = createDisagreementRecord(check.id, familyId, childId)
      expect(record).not.toBeNull()
      expect(record?.disagreementType).toBe('child_wants_less')

      // Resolve disagreement after family conversation
      const resolved = markDisagreementResolved(
        record!.id,
        'Family agreed to reduce monitoring next month'
      )
      expect(resolved?.resolvedAt).not.toBeNull()
      expect(resolved?.resolution).toBe('Family agreed to reduce monitoring next month')
    })
  })

  // ============================================
  // Privacy Integration Tests (AC5)
  // ============================================

  describe('Response Privacy (AC5)', () => {
    it('should enforce privacy: parent cannot view child response', () => {
      const thirteenMonthsAgo = new Date()
      thirteenMonthsAgo.setMonth(thirteenMonthsAgo.getMonth() - 13)
      const check = createProportionalityCheck(
        'family-privacy',
        'child-privacy',
        thirteenMonthsAgo,
        'annual'
      )

      const childResponse = submitResponse({
        checkId: check.id,
        respondentId: 'child-privacy',
        respondentRole: 'child',
        isMonitoringAppropriate: 'reduce',
        hasExternalRiskChanged: null,
        hasMaturityIncreased: null,
        freeformFeedback: 'I want less monitoring',
        suggestedChanges: [],
      })

      // Parent should not be able to view child's response
      const parentCanView = canViewResponse('parent-privacy', childResponse)
      expect(parentCanView).toBe(false)

      // Child CAN view their own response (own responses visible)
      const childCanView = canViewResponse('child-privacy', childResponse)
      expect(childCanView).toBe(true)
    })

    it('should enforce privacy: child cannot view parent response', () => {
      const thirteenMonthsAgo = new Date()
      thirteenMonthsAgo.setMonth(thirteenMonthsAgo.getMonth() - 13)
      const check = createProportionalityCheck(
        'family-privacy-2',
        'child-privacy-2',
        thirteenMonthsAgo,
        'annual'
      )

      const parentResponse = submitResponse({
        checkId: check.id,
        respondentId: 'parent-privacy-2',
        respondentRole: 'parent',
        isMonitoringAppropriate: 'increase',
        hasExternalRiskChanged: 'increased',
        hasMaturityIncreased: false,
        freeformFeedback: 'I have concerns about recent activity',
        suggestedChanges: [],
      })

      // Child should not be able to view parent's response
      const childCanView = canViewResponse('child-privacy-2', parentResponse)
      expect(childCanView).toBe(false)
    })
  })

  // ============================================
  // Eligibility Integration Tests (AC1)
  // ============================================

  describe('Annual Eligibility (AC1)', () => {
    it('should trigger check after 12 months', () => {
      const twelveMonthsAgo = new Date()
      twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12)
      const childId = 'child-12-months'

      const isEligible = isEligibleForProportionalityCheck(childId, twelveMonthsAgo)
      expect(isEligible).toBe(true)
    })

    it('should not trigger check before 12 months', () => {
      const elevenMonthsAgo = new Date()
      elevenMonthsAgo.setMonth(elevenMonthsAgo.getMonth() - 11)
      const childId = 'child-11-months'

      const isEligible = isEligibleForProportionalityCheck(childId, elevenMonthsAgo)
      expect(isEligible).toBe(false)
    })

    it('should handle multiple checks for same child over years', () => {
      const twentyFiveMonthsAgo = new Date()
      twentyFiveMonthsAgo.setMonth(twentyFiveMonthsAgo.getMonth() - 25)
      const childId = 'child-multi-check'

      // First check (created a year ago, already completed)
      const check1 = createProportionalityCheck(
        'family-multi',
        childId,
        twentyFiveMonthsAgo,
        'annual'
      )
      markCheckCompleted(check1.id)

      // Still eligible for new check (25 months > 12 months)
      const isEligible = isEligibleForProportionalityCheck(childId, twentyFiveMonthsAgo)
      expect(isEligible).toBe(true)
    })
  })

  // ============================================
  // Suggestion Generation Integration Tests (AC4)
  // ============================================

  describe('Suggestion Generation (AC4)', () => {
    it('should generate graduation suggestion for high trust score and long monitoring', () => {
      const thirteenMonthsAgo = new Date()
      thirteenMonthsAgo.setMonth(thirteenMonthsAgo.getMonth() - 13)
      const check = createProportionalityCheck(
        'family-grad-suggest',
        'child-grad',
        thirteenMonthsAgo,
        'annual'
      )

      const suggestions = generateSuggestions({
        checkId: check.id,
        childAge: 17,
        trustScore: 100,
        monthsMonitored: 24,
        trustMilestone: 'trusted',
        childResponse: 'graduate',
        parentResponses: ['graduate'],
      })

      const graduationSuggestion = suggestions.find((s) => s.type === 'graduation_eligible')
      expect(graduationSuggestion).toBeDefined()
      expect(graduationSuggestion?.priority).toBe('high')
    })

    it('should generate suggestions for good trust progression', () => {
      const thirteenMonthsAgo = new Date()
      thirteenMonthsAgo.setMonth(thirteenMonthsAgo.getMonth() - 13)
      const check = createProportionalityCheck(
        'family-reduce-suggest',
        'child-reduce',
        thirteenMonthsAgo,
        'annual'
      )

      const suggestions = generateSuggestions({
        checkId: check.id,
        childAge: 14,
        trustScore: 80,
        monthsMonitored: 18,
        trustMilestone: null,
        childResponse: 'reduce',
        parentResponses: ['reduce'],
      })

      // Should generate at least one suggestion
      expect(suggestions.length).toBeGreaterThan(0)
    })
  })

  // ============================================
  // Disagreement Detection Integration Tests (AC6)
  // ============================================

  describe('Disagreement Detection (AC6)', () => {
    it('should detect child_wants_less disagreement', () => {
      const thirteenMonthsAgo = new Date()
      thirteenMonthsAgo.setMonth(thirteenMonthsAgo.getMonth() - 13)
      const check = createProportionalityCheck(
        'family-disagree-less',
        'child-less',
        thirteenMonthsAgo,
        'annual'
      )

      // Child wants to reduce
      submitResponse({
        checkId: check.id,
        respondentId: 'child-less',
        respondentRole: 'child',
        isMonitoringAppropriate: 'reduce',
        hasExternalRiskChanged: null,
        hasMaturityIncreased: null,
        freeformFeedback: null,
        suggestedChanges: [],
      })

      // Parent thinks it's appropriate
      submitResponse({
        checkId: check.id,
        respondentId: 'parent-less',
        respondentRole: 'parent',
        isMonitoringAppropriate: 'appropriate',
        hasExternalRiskChanged: null,
        hasMaturityIncreased: null,
        freeformFeedback: null,
        suggestedChanges: [],
      })

      const disagreement = detectDisagreement(check.id)
      expect(disagreement?.disagreementType).toBe('child_wants_less')
    })

    it('should detect parent_wants_more disagreement', () => {
      const thirteenMonthsAgo = new Date()
      thirteenMonthsAgo.setMonth(thirteenMonthsAgo.getMonth() - 13)
      const check = createProportionalityCheck(
        'family-disagree-more',
        'child-more',
        thirteenMonthsAgo,
        'annual'
      )

      // Child thinks it's appropriate
      submitResponse({
        checkId: check.id,
        respondentId: 'child-more',
        respondentRole: 'child',
        isMonitoringAppropriate: 'appropriate',
        hasExternalRiskChanged: null,
        hasMaturityIncreased: null,
        freeformFeedback: null,
        suggestedChanges: [],
      })

      // Parent wants more monitoring
      submitResponse({
        checkId: check.id,
        respondentId: 'parent-more',
        respondentRole: 'parent',
        isMonitoringAppropriate: 'increase',
        hasExternalRiskChanged: null,
        hasMaturityIncreased: null,
        freeformFeedback: null,
        suggestedChanges: [],
      })

      const disagreement = detectDisagreement(check.id)
      expect(disagreement?.disagreementType).toBe('parent_wants_more')
    })

    it('should detect mixed disagreement when parents disagree', () => {
      const thirteenMonthsAgo = new Date()
      thirteenMonthsAgo.setMonth(thirteenMonthsAgo.getMonth() - 13)
      const check = createProportionalityCheck(
        'family-mixed',
        'child-mixed',
        thirteenMonthsAgo,
        'annual'
      )

      // Child response
      submitResponse({
        checkId: check.id,
        respondentId: 'child-mixed',
        respondentRole: 'child',
        isMonitoringAppropriate: 'appropriate',
        hasExternalRiskChanged: null,
        hasMaturityIncreased: null,
        freeformFeedback: null,
        suggestedChanges: [],
      })

      // Parent 1 wants to reduce
      submitResponse({
        checkId: check.id,
        respondentId: 'parent-mixed-1',
        respondentRole: 'parent',
        isMonitoringAppropriate: 'reduce',
        hasExternalRiskChanged: null,
        hasMaturityIncreased: null,
        freeformFeedback: null,
        suggestedChanges: [],
      })

      // Parent 2 wants to increase
      submitResponse({
        checkId: check.id,
        respondentId: 'parent-mixed-2',
        respondentRole: 'parent',
        isMonitoringAppropriate: 'increase',
        hasExternalRiskChanged: null,
        hasMaturityIncreased: null,
        freeformFeedback: null,
        suggestedChanges: [],
      })

      const disagreement = detectDisagreement(check.id)
      expect(disagreement?.disagreementType).toBe('mixed')
    })

    it('should not detect disagreement when all agree', () => {
      const thirteenMonthsAgo = new Date()
      thirteenMonthsAgo.setMonth(thirteenMonthsAgo.getMonth() - 13)
      const check = createProportionalityCheck(
        'family-agree',
        'child-agree',
        thirteenMonthsAgo,
        'annual'
      )

      // All parties say appropriate
      submitResponse({
        checkId: check.id,
        respondentId: 'child-agree',
        respondentRole: 'child',
        isMonitoringAppropriate: 'appropriate',
        hasExternalRiskChanged: null,
        hasMaturityIncreased: null,
        freeformFeedback: null,
        suggestedChanges: [],
      })

      submitResponse({
        checkId: check.id,
        respondentId: 'parent-agree-1',
        respondentRole: 'parent',
        isMonitoringAppropriate: 'appropriate',
        hasExternalRiskChanged: null,
        hasMaturityIncreased: null,
        freeformFeedback: null,
        suggestedChanges: [],
      })

      submitResponse({
        checkId: check.id,
        respondentId: 'parent-agree-2',
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
})
