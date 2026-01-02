/**
 * ProportionalitySuggestionService Tests - Story 38.4 Task 4
 *
 * Tests for generating suggestions based on age and trust score.
 * AC4: Suggestions based on age and trust score
 */

import { describe, it, expect } from 'vitest'
import {
  generateSuggestions,
  calculateSuggestionPriority,
  SUGGESTION_TEMPLATES,
  type GenerateSuggestionsInput,
} from './proportionalitySuggestionService'
import type {
  ProportionalitySuggestion,
  SuggestionPriority,
} from '../contracts/proportionalityCheck'

describe('ProportionalitySuggestionService', () => {
  // ============================================
  // generateSuggestions Tests
  // ============================================

  describe('generateSuggestions', () => {
    it('should suggest graduation for 100% trust for 12+ months', () => {
      const input: GenerateSuggestionsInput = {
        childAge: 16,
        trustScore: 100,
        monthsMonitored: 24,
        currentMonitoringLevel: 'standard',
        trustMilestone: 'trusted',
      }

      const suggestions = generateSuggestions(input)
      const graduationSuggestion = suggestions.find((s) => s.type === 'graduation_eligible')

      expect(graduationSuggestion).toBeDefined()
      expect(graduationSuggestion?.priority).toBe('high')
    })

    it('should suggest reduced monitoring for age 14+ with high trust', () => {
      const input: GenerateSuggestionsInput = {
        childAge: 15,
        trustScore: 85,
        monthsMonitored: 18,
        currentMonitoringLevel: 'standard',
        trustMilestone: null,
      }

      const suggestions = generateSuggestions(input)
      const reduceSuggestion = suggestions.find((s) => s.type === 'reduce_monitoring')

      expect(reduceSuggestion).toBeDefined()
    })

    it('should suggest maintain for low trust score', () => {
      const input: GenerateSuggestionsInput = {
        childAge: 14,
        trustScore: 50,
        monthsMonitored: 18,
        currentMonitoringLevel: 'standard',
        trustMilestone: null,
      }

      const suggestions = generateSuggestions(input)
      const maintainSuggestion = suggestions.find((s) => s.type === 'maintain')

      expect(maintainSuggestion).toBeDefined()
    })

    it('should consider discussion for recent trust changes', () => {
      const input: GenerateSuggestionsInput = {
        childAge: 13,
        trustScore: 70,
        monthsMonitored: 14,
        currentMonitoringLevel: 'standard',
        trustMilestone: 'developing',
      }

      const suggestions = generateSuggestions(input)
      expect(suggestions.length).toBeGreaterThan(0)
    })

    it('should include basedOn data in suggestions', () => {
      const input: GenerateSuggestionsInput = {
        childAge: 16,
        trustScore: 95,
        monthsMonitored: 20,
        currentMonitoringLevel: 'notification_only',
        trustMilestone: 'trusted',
      }

      const suggestions = generateSuggestions(input)

      for (const suggestion of suggestions) {
        expect(suggestion.basedOn.childAge).toBe(16)
        expect(suggestion.basedOn.trustScore).toBe(95)
        expect(suggestion.basedOn.monthsMonitored).toBe(20)
      }
    })

    it('should return at least one suggestion', () => {
      const input: GenerateSuggestionsInput = {
        childAge: 12,
        trustScore: 60,
        monthsMonitored: 12,
        currentMonitoringLevel: 'standard',
        trustMilestone: null,
      }

      const suggestions = generateSuggestions(input)
      expect(suggestions.length).toBeGreaterThanOrEqual(1)
    })

    it('should prioritize high priority suggestions first', () => {
      const input: GenerateSuggestionsInput = {
        childAge: 17,
        trustScore: 100,
        monthsMonitored: 24,
        currentMonitoringLevel: 'standard',
        trustMilestone: 'trusted',
      }

      const suggestions = generateSuggestions(input)

      if (suggestions.length > 1) {
        const priorities: SuggestionPriority[] = ['high', 'medium', 'low']
        const firstPriorityIndex = priorities.indexOf(suggestions[0].priority)
        const secondPriorityIndex = priorities.indexOf(suggestions[1].priority)
        expect(firstPriorityIndex).toBeLessThanOrEqual(secondPriorityIndex)
      }
    })
  })

  // ============================================
  // calculateSuggestionPriority Tests
  // ============================================

  describe('calculateSuggestionPriority', () => {
    it('should return high for graduation eligible suggestions', () => {
      const suggestion: ProportionalitySuggestion = {
        type: 'graduation_eligible',
        title: 'Ready to Graduate',
        description: 'Child has maintained perfect trust',
        basedOn: {
          childAge: 16,
          trustScore: 100,
          monthsMonitored: 24,
          trustMilestone: 'trusted',
        },
        priority: 'high', // This will be recalculated
      }

      const priority = calculateSuggestionPriority(suggestion)
      expect(priority).toBe('high')
    })

    it('should return medium for reduce monitoring suggestions', () => {
      const suggestion: ProportionalitySuggestion = {
        type: 'reduce_monitoring',
        title: 'Consider Reducing',
        description: 'Monitoring can be reduced',
        basedOn: {
          childAge: 15,
          trustScore: 85,
          monthsMonitored: 18,
          trustMilestone: null,
        },
        priority: 'medium',
      }

      const priority = calculateSuggestionPriority(suggestion)
      expect(priority).toBe('medium')
    })

    it('should return low for maintain suggestions', () => {
      const suggestion: ProportionalitySuggestion = {
        type: 'maintain',
        title: 'Maintain Current',
        description: 'Keep current monitoring level',
        basedOn: {
          childAge: 13,
          trustScore: 70,
          monthsMonitored: 14,
          trustMilestone: null,
        },
        priority: 'low',
      }

      const priority = calculateSuggestionPriority(suggestion)
      expect(priority).toBe('low')
    })
  })

  // ============================================
  // SUGGESTION_TEMPLATES Tests
  // ============================================

  describe('SUGGESTION_TEMPLATES', () => {
    it('should have graduation eligible template', () => {
      expect(SUGGESTION_TEMPLATES.GRADUATION_ELIGIBLE).toBeDefined()
      expect(SUGGESTION_TEMPLATES.GRADUATION_ELIGIBLE.type).toBe('graduation_eligible')
    })

    it('should have reduce monitoring template', () => {
      expect(SUGGESTION_TEMPLATES.REDUCE_MONITORING).toBeDefined()
      expect(SUGGESTION_TEMPLATES.REDUCE_MONITORING.type).toBe('reduce_monitoring')
    })

    it('should have maintain template', () => {
      expect(SUGGESTION_TEMPLATES.MAINTAIN_CURRENT).toBeDefined()
      expect(SUGGESTION_TEMPLATES.MAINTAIN_CURRENT.type).toBe('maintain')
    })

    it('should have consider discussion template', () => {
      expect(SUGGESTION_TEMPLATES.CONSIDER_DISCUSSION).toBeDefined()
      expect(SUGGESTION_TEMPLATES.CONSIDER_DISCUSSION.type).toBe('consider_discussion')
    })
  })

  // ============================================
  // Age-Based Logic Tests
  // ============================================

  describe('Age-Based Suggestions', () => {
    it('should be more likely to suggest reduction for older teens', () => {
      const youngerInput: GenerateSuggestionsInput = {
        childAge: 12,
        trustScore: 85,
        monthsMonitored: 18,
        currentMonitoringLevel: 'standard',
        trustMilestone: null,
      }

      const olderInput: GenerateSuggestionsInput = {
        childAge: 17,
        trustScore: 85,
        monthsMonitored: 18,
        currentMonitoringLevel: 'standard',
        trustMilestone: null,
      }

      const youngerSuggestions = generateSuggestions(youngerInput)
      const olderSuggestions = generateSuggestions(olderInput)

      const youngerReduce = youngerSuggestions.filter((s) => s.type === 'reduce_monitoring').length
      const olderReduce = olderSuggestions.filter((s) => s.type === 'reduce_monitoring').length

      expect(olderReduce).toBeGreaterThanOrEqual(youngerReduce)
    })

    it('should suggest graduation for 16+ with perfect trust', () => {
      const input: GenerateSuggestionsInput = {
        childAge: 16,
        trustScore: 100,
        monthsMonitored: 24,
        currentMonitoringLevel: 'standard',
        trustMilestone: 'trusted',
      }

      const suggestions = generateSuggestions(input)
      const hasGraduation = suggestions.some((s) => s.type === 'graduation_eligible')

      expect(hasGraduation).toBe(true)
    })
  })

  // ============================================
  // Trust-Based Logic Tests
  // ============================================

  describe('Trust-Based Suggestions', () => {
    it('should suggest reduction for very high trust', () => {
      const input: GenerateSuggestionsInput = {
        childAge: 14,
        trustScore: 95,
        monthsMonitored: 18,
        currentMonitoringLevel: 'standard',
        trustMilestone: 'trusted',
      }

      const suggestions = generateSuggestions(input)
      const hasReduction = suggestions.some((s) => s.type === 'reduce_monitoring')

      expect(hasReduction).toBe(true)
    })

    it('should suggest maintain for moderate trust', () => {
      const input: GenerateSuggestionsInput = {
        childAge: 14,
        trustScore: 65,
        monthsMonitored: 14,
        currentMonitoringLevel: 'standard',
        trustMilestone: null,
      }

      const suggestions = generateSuggestions(input)
      const hasMaintain = suggestions.some((s) => s.type === 'maintain')

      expect(hasMaintain).toBe(true)
    })
  })
})
