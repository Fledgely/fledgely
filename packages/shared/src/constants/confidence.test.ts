/**
 * Confidence Score Constants Tests
 *
 * Story 20.3: Confidence Score Assignment - AC2, AC3, AC4, AC6
 * Story 20.4: Multi-Label Classification - AC2, AC3
 */

import { describe, it, expect } from 'vitest'
import {
  CONFIDENCE_THRESHOLDS,
  MAX_CATEGORIES,
  getConfidenceLevelFromScore,
  classificationNeedsReview,
  shouldTriggerAutomation,
  getConfidenceLevelColor,
  LOW_CONFIDENCE_THRESHOLD,
  type ConfidenceLevel,
} from './confidence'

describe('Confidence Constants', () => {
  describe('CONFIDENCE_THRESHOLDS', () => {
    // Story 20.3 AC2: Scores above 85% considered high confidence
    it('has HIGH threshold of 85', () => {
      expect(CONFIDENCE_THRESHOLDS.HIGH).toBe(85)
    })

    // Story 20.3 AC3: Scores 60-85% considered medium confidence
    it('has MEDIUM threshold of 60', () => {
      expect(CONFIDENCE_THRESHOLDS.MEDIUM).toBe(60)
    })

    it('HIGH is greater than MEDIUM', () => {
      expect(CONFIDENCE_THRESHOLDS.HIGH).toBeGreaterThan(CONFIDENCE_THRESHOLDS.MEDIUM)
    })

    it('MEDIUM is greater than LOW_CONFIDENCE_THRESHOLD', () => {
      expect(CONFIDENCE_THRESHOLDS.MEDIUM).toBeGreaterThan(LOW_CONFIDENCE_THRESHOLD)
    })

    // Story 20.4 AC2: Secondary categories assigned if confidence > 50%
    it('has SECONDARY threshold of 50', () => {
      expect(CONFIDENCE_THRESHOLDS.SECONDARY).toBe(50)
    })

    it('SECONDARY is less than MEDIUM', () => {
      expect(CONFIDENCE_THRESHOLDS.SECONDARY).toBeLessThan(CONFIDENCE_THRESHOLDS.MEDIUM)
    })
  })

  // Story 20.4 AC3: Maximum 3 categories per screenshot
  describe('MAX_CATEGORIES', () => {
    it('has value of 3', () => {
      expect(MAX_CATEGORIES).toBe(3)
    })
  })

  describe('getConfidenceLevelFromScore', () => {
    // Story 20.3 AC2: Scores above 85% considered high confidence
    describe('high confidence (>= 85)', () => {
      it('returns high for 100', () => {
        expect(getConfidenceLevelFromScore(100)).toBe('high')
      })

      it('returns high for 85 (boundary)', () => {
        expect(getConfidenceLevelFromScore(85)).toBe('high')
      })

      it('returns high for 90', () => {
        expect(getConfidenceLevelFromScore(90)).toBe('high')
      })
    })

    // Story 20.3 AC3: Scores 60-85% considered medium confidence
    describe('medium confidence (60-84)', () => {
      it('returns medium for 84 (upper boundary)', () => {
        expect(getConfidenceLevelFromScore(84)).toBe('medium')
      })

      it('returns medium for 60 (lower boundary)', () => {
        expect(getConfidenceLevelFromScore(60)).toBe('medium')
      })

      it('returns medium for 75', () => {
        expect(getConfidenceLevelFromScore(75)).toBe('medium')
      })
    })

    // Story 20.3 AC4: Scores below 60% flagged for potential review
    describe('low confidence (< 60)', () => {
      it('returns low for 59 (boundary)', () => {
        expect(getConfidenceLevelFromScore(59)).toBe('low')
      })

      it('returns low for 50', () => {
        expect(getConfidenceLevelFromScore(50)).toBe('low')
      })

      it('returns low for 30', () => {
        expect(getConfidenceLevelFromScore(30)).toBe('low')
      })

      it('returns low for 0', () => {
        expect(getConfidenceLevelFromScore(0)).toBe('low')
      })
    })

    // Uncertain state when isLowConfidence is true
    describe('uncertain (isLowConfidence=true)', () => {
      it('returns uncertain when isLowConfidence is true regardless of score', () => {
        expect(getConfidenceLevelFromScore(95, true)).toBe('uncertain')
        expect(getConfidenceLevelFromScore(75, true)).toBe('uncertain')
        expect(getConfidenceLevelFromScore(50, true)).toBe('uncertain')
        expect(getConfidenceLevelFromScore(25, true)).toBe('uncertain')
      })

      it('returns uncertain for typical low-confidence fallback score', () => {
        expect(getConfidenceLevelFromScore(25, true)).toBe('uncertain')
      })
    })

    // Boundary tests
    describe('boundary cases', () => {
      it('handles exact boundary between high and medium', () => {
        expect(getConfidenceLevelFromScore(85)).toBe('high')
        expect(getConfidenceLevelFromScore(84)).toBe('medium')
      })

      it('handles exact boundary between medium and low', () => {
        expect(getConfidenceLevelFromScore(60)).toBe('medium')
        expect(getConfidenceLevelFromScore(59)).toBe('low')
      })
    })
  })

  describe('classificationNeedsReview', () => {
    // Story 20.3 AC4: Scores below 60% flagged for potential review
    it('returns true for confidence < 60', () => {
      expect(classificationNeedsReview(59)).toBe(true)
      expect(classificationNeedsReview(50)).toBe(true)
      expect(classificationNeedsReview(0)).toBe(true)
    })

    it('returns false for confidence >= 60', () => {
      expect(classificationNeedsReview(60)).toBe(false)
      expect(classificationNeedsReview(75)).toBe(false)
      expect(classificationNeedsReview(85)).toBe(false)
      expect(classificationNeedsReview(100)).toBe(false)
    })

    it('returns true when isLowConfidence is true', () => {
      expect(classificationNeedsReview(90, true)).toBe(true)
      expect(classificationNeedsReview(75, true)).toBe(true)
      expect(classificationNeedsReview(25, true)).toBe(true)
    })

    // Boundary test
    it('handles exact boundary at 60', () => {
      expect(classificationNeedsReview(60)).toBe(false)
      expect(classificationNeedsReview(59)).toBe(true)
    })
  })

  describe('shouldTriggerAutomation', () => {
    // Story 20.3 AC6: Low-confidence classifications don't trigger automated actions
    it('returns true for high confidence', () => {
      expect(shouldTriggerAutomation(85)).toBe(true)
      expect(shouldTriggerAutomation(100)).toBe(true)
    })

    it('returns true for medium confidence', () => {
      expect(shouldTriggerAutomation(60)).toBe(true)
      expect(shouldTriggerAutomation(75)).toBe(true)
      expect(shouldTriggerAutomation(84)).toBe(true)
    })

    it('returns false for low confidence', () => {
      expect(shouldTriggerAutomation(59)).toBe(false)
      expect(shouldTriggerAutomation(50)).toBe(false)
      expect(shouldTriggerAutomation(0)).toBe(false)
    })

    it('returns false when isLowConfidence is true', () => {
      expect(shouldTriggerAutomation(90, true)).toBe(false)
      expect(shouldTriggerAutomation(75, true)).toBe(false)
    })

    // Inverse relationship with needsReview
    it('is inverse of classificationNeedsReview', () => {
      const testScores = [0, 25, 50, 59, 60, 75, 84, 85, 100]
      for (const score of testScores) {
        expect(shouldTriggerAutomation(score)).toBe(!classificationNeedsReview(score))
      }
    })
  })

  describe('getConfidenceLevelColor', () => {
    it('returns green for high', () => {
      expect(getConfidenceLevelColor('high')).toBe('green')
    })

    it('returns yellow for medium', () => {
      expect(getConfidenceLevelColor('medium')).toBe('yellow')
    })

    it('returns red for low', () => {
      expect(getConfidenceLevelColor('low')).toBe('red')
    })

    it('returns gray for uncertain', () => {
      expect(getConfidenceLevelColor('uncertain')).toBe('gray')
    })

    it('returns correct color for all confidence levels', () => {
      const levels: ConfidenceLevel[] = ['high', 'medium', 'low', 'uncertain']
      const expectedColors = ['green', 'yellow', 'red', 'gray']

      levels.forEach((level, i) => {
        expect(getConfidenceLevelColor(level)).toBe(expectedColors[i])
      })
    })
  })

  describe('LOW_CONFIDENCE_THRESHOLD re-export', () => {
    it('re-exports LOW_CONFIDENCE_THRESHOLD from category-definitions', () => {
      expect(LOW_CONFIDENCE_THRESHOLD).toBe(30)
    })
  })
})
