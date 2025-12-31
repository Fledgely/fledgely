/**
 * Category Display Utilities Tests
 *
 * Story 20.2: Basic Category Taxonomy - AC3, Task 5
 * Story 20.3: Confidence Score Assignment - AC2, AC3, AC4, AC5
 */

import { describe, it, expect } from 'vitest'
import {
  getCategoryDescription,
  getCategoryExamples,
  getCategoryColorClass,
  getCategoryIconName,
  formatCategoryForDisplay,
  getAllCategoriesForDisplay,
  formatConfidence,
  getConfidenceLevel,
  getConfidenceLevelColorClasses,
  CATEGORY_VALUES,
  CONFIDENCE_THRESHOLDS,
} from './categories'

describe('Category Display Utilities', () => {
  describe('getCategoryDescription', () => {
    it('returns description for valid category', () => {
      const desc = getCategoryDescription('Gaming')
      expect(desc).toContain('Video games')
    })

    it('returns description for all categories', () => {
      for (const category of CATEGORY_VALUES) {
        const desc = getCategoryDescription(category)
        expect(desc.length).toBeGreaterThan(10)
      }
    })
  })

  describe('getCategoryExamples', () => {
    it('returns examples array for valid category', () => {
      const examples = getCategoryExamples('Gaming')
      expect(examples).toBeInstanceOf(Array)
      expect(examples.length).toBeGreaterThan(0)
    })

    it('includes expected examples', () => {
      const examples = getCategoryExamples('Gaming')
      expect(examples).toContain('Minecraft')
    })

    it('returns examples for all categories', () => {
      for (const category of CATEGORY_VALUES) {
        const examples = getCategoryExamples(category)
        expect(examples.length).toBeGreaterThanOrEqual(3)
      }
    })
  })

  describe('getCategoryColorClass', () => {
    it('returns badge class for category', () => {
      const badgeClass = getCategoryColorClass('Homework', 'badge')
      expect(badgeClass).toContain('blue')
      expect(badgeClass).toContain('bg-')
    })

    it('returns bg class for category', () => {
      const bgClass = getCategoryColorClass('Gaming', 'bg')
      expect(bgClass).toContain('purple')
    })

    it('returns text class for category', () => {
      const textClass = getCategoryColorClass('Entertainment', 'text')
      expect(textClass).toContain('red')
    })

    it('returns border class for category', () => {
      const borderClass = getCategoryColorClass('Creative', 'border')
      expect(borderClass).toContain('orange')
    })

    it('returns classes for all categories', () => {
      for (const category of CATEGORY_VALUES) {
        const badge = getCategoryColorClass(category, 'badge')
        const bg = getCategoryColorClass(category, 'bg')
        const text = getCategoryColorClass(category, 'text')
        const border = getCategoryColorClass(category, 'border')

        expect(badge).toBeTruthy()
        expect(bg).toBeTruthy()
        expect(text).toBeTruthy()
        expect(border).toBeTruthy()
      }
    })
  })

  describe('getCategoryIconName', () => {
    it('returns icon name for category', () => {
      expect(getCategoryIconName('Homework')).toBe('BookOpen')
      expect(getCategoryIconName('Gaming')).toBe('Gamepad2')
      expect(getCategoryIconName('Entertainment')).toBe('Play')
    })

    it('returns icon for all categories', () => {
      for (const category of CATEGORY_VALUES) {
        const icon = getCategoryIconName(category)
        expect(icon).toBeTruthy()
        expect(typeof icon).toBe('string')
      }
    })
  })

  describe('formatCategoryForDisplay', () => {
    it('returns complete display object', () => {
      const display = formatCategoryForDisplay('Gaming')

      expect(display.name).toBe('Gaming')
      expect(display.displayName).toBe('Gaming')
      expect(display.description).toContain('Video games')
      expect(display.examples).toBeInstanceOf(Array)
      expect(display.icon).toBe('Gamepad2')
      expect(display.badgeClass).toContain('purple')
      expect(display.bgClass).toContain('purple')
      expect(display.textClass).toContain('purple')
      expect(display.borderClass).toContain('purple')
    })

    it('works for all categories', () => {
      for (const category of CATEGORY_VALUES) {
        const display = formatCategoryForDisplay(category)
        expect(display.name).toBe(category)
        expect(display.displayName).toBeTruthy()
        expect(display.description).toBeTruthy()
        expect(display.examples.length).toBeGreaterThan(0)
        expect(display.icon).toBeTruthy()
      }
    })
  })

  describe('getAllCategoriesForDisplay', () => {
    it('returns array of all categories', () => {
      const all = getAllCategoriesForDisplay()
      expect(all.length).toBe(10)
    })

    it('includes all category names', () => {
      const all = getAllCategoriesForDisplay()
      const names = all.map((d) => d.name)

      for (const category of CATEGORY_VALUES) {
        expect(names).toContain(category)
      }
    })
  })

  // Story 20.3: Confidence Score Assignment - AC2, AC3, AC4
  describe('formatConfidence', () => {
    // AC2: Scores above 85% considered high confidence
    it('formats high confidence (>= 85)', () => {
      expect(formatConfidence(95)).toBe('95%')
      expect(formatConfidence(85)).toBe('85%')
    })

    // AC3: Scores 60-85% considered medium confidence
    it('formats moderate confidence (60-84)', () => {
      expect(formatConfidence(84)).toBe('84% (moderate)')
      expect(formatConfidence(75)).toBe('75% (moderate)')
      expect(formatConfidence(60)).toBe('60% (moderate)')
    })

    // AC4: Scores below 60% flagged for potential review
    it('formats low confidence (< 60)', () => {
      expect(formatConfidence(59)).toBe('59% (low)')
      expect(formatConfidence(25)).toBe('25% (low)')
    })

    it('formats uncertain (isLowConfidence=true)', () => {
      expect(formatConfidence(25, true)).toBe('25% (uncertain)')
      expect(formatConfidence(75, true)).toBe('75% (uncertain)')
    })

    it('uses CONFIDENCE_THRESHOLDS constants', () => {
      // Verify the thresholds match AC requirements
      expect(CONFIDENCE_THRESHOLDS.HIGH).toBe(85)
      expect(CONFIDENCE_THRESHOLDS.MEDIUM).toBe(60)
    })
  })

  // Story 20.3: Confidence Score Assignment - AC2, AC3, AC4
  describe('getConfidenceLevel', () => {
    // AC2: Scores above 85% considered high confidence
    it('returns high for >= 85', () => {
      expect(getConfidenceLevel(100)).toBe('high')
      expect(getConfidenceLevel(85)).toBe('high')
    })

    // AC3: Scores 60-85% considered medium confidence
    it('returns moderate for >= 60 and < 85', () => {
      expect(getConfidenceLevel(84)).toBe('moderate')
      expect(getConfidenceLevel(75)).toBe('moderate')
      expect(getConfidenceLevel(60)).toBe('moderate')
    })

    // AC4: Scores below 60% flagged for potential review
    it('returns low for < 60', () => {
      expect(getConfidenceLevel(59)).toBe('low')
      expect(getConfidenceLevel(0)).toBe('low')
    })

    it('returns uncertain when isLowConfidence=true', () => {
      expect(getConfidenceLevel(95, true)).toBe('uncertain')
      expect(getConfidenceLevel(25, true)).toBe('uncertain')
    })

    it('handles boundary at 85', () => {
      expect(getConfidenceLevel(85)).toBe('high')
      expect(getConfidenceLevel(84)).toBe('moderate')
    })

    it('handles boundary at 60', () => {
      expect(getConfidenceLevel(60)).toBe('moderate')
      expect(getConfidenceLevel(59)).toBe('low')
    })
  })

  // Story 20.3: Confidence Score Assignment - AC5
  describe('getConfidenceLevelColorClasses', () => {
    it('returns green classes for high confidence', () => {
      const classes = getConfidenceLevelColorClasses('high')
      expect(classes.badge).toContain('green')
      expect(classes.text).toContain('green')
      expect(classes.bg).toContain('green')
    })

    it('returns yellow classes for moderate confidence', () => {
      const classes = getConfidenceLevelColorClasses('moderate')
      expect(classes.badge).toContain('yellow')
      expect(classes.text).toContain('yellow')
      expect(classes.bg).toContain('yellow')
    })

    it('returns red classes for low confidence', () => {
      const classes = getConfidenceLevelColorClasses('low')
      expect(classes.badge).toContain('red')
      expect(classes.text).toContain('red')
      expect(classes.bg).toContain('red')
    })

    it('returns gray classes for uncertain', () => {
      const classes = getConfidenceLevelColorClasses('uncertain')
      expect(classes.badge).toContain('gray')
      expect(classes.text).toContain('gray')
      expect(classes.bg).toContain('gray')
    })
  })
})
