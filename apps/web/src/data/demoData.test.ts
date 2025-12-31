/**
 * Tests for Demo Data Constants
 *
 * Story 8.5.1: Demo Child Profile Creation
 * Story 8.5.2: Sample Screenshot Gallery
 */

import { describe, expect, it } from 'vitest'
import {
  DEMO_CHILD_ID,
  DEMO_CHILD_PROFILE,
  DEMO_SCREENSHOTS,
  CATEGORY_LABELS,
  isDemoChild,
  getDemoScreenshotsByDay,
  getDemoScreenshotCategoryCounts,
  getDemoActivitySummary,
  getConfidenceLevel,
  getConfidenceLevelLabel,
  getFlaggedDemoScreenshots,
  filterDemoScreenshotsByCategory,
  searchDemoScreenshots,
} from './demoData'

describe('Demo Data (Story 8.5.1)', () => {
  describe('DEMO_CHILD_ID', () => {
    it('should have a distinct ID pattern', () => {
      expect(DEMO_CHILD_ID).toBe('demo-child')
      // Should not look like a UUID
      expect(DEMO_CHILD_ID).not.toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      )
    })
  })

  describe('DEMO_CHILD_PROFILE', () => {
    it('should have required fields', () => {
      expect(DEMO_CHILD_PROFILE.id).toBe(DEMO_CHILD_ID)
      expect(DEMO_CHILD_PROFILE.name).toBe('Alex Demo')
      expect(DEMO_CHILD_PROFILE.isDemo).toBe(true)
    })

    it('should have a reasonable birthdate (around 10 years old)', () => {
      const tenYearsAgo = Date.now() - 10 * 365 * 24 * 60 * 60 * 1000
      const oneYearMs = 365 * 24 * 60 * 60 * 1000
      const birthTime = DEMO_CHILD_PROFILE.birthdate.getTime()

      // Should be within a year of 10 years ago
      expect(Math.abs(birthTime - tenYearsAgo)).toBeLessThan(oneYearMs)
    })

    it('should be marked as demo', () => {
      expect(DEMO_CHILD_PROFILE.isDemo).toBe(true)
    })
  })

  describe('isDemoChild()', () => {
    it('should return true for demo child ID', () => {
      expect(isDemoChild(DEMO_CHILD_ID)).toBe(true)
      expect(isDemoChild('demo-child')).toBe(true)
    })

    it('should return false for regular child IDs', () => {
      expect(isDemoChild('abc123')).toBe(false)
      expect(isDemoChild('550e8400-e29b-41d4-a716-446655440000')).toBe(false)
      expect(isDemoChild('')).toBe(false)
    })
  })

  describe('DEMO_SCREENSHOTS', () => {
    it('should have 8-12 sample screenshots', () => {
      expect(DEMO_SCREENSHOTS.length).toBeGreaterThanOrEqual(8)
      expect(DEMO_SCREENSHOTS.length).toBeLessThanOrEqual(12)
    })

    it('should have variety of categories', () => {
      const categories = new Set(DEMO_SCREENSHOTS.map((s) => s.category))
      expect(categories.size).toBeGreaterThanOrEqual(3) // At least 3 different categories
    })

    it('should have valid timestamps', () => {
      const now = Date.now()
      for (const screenshot of DEMO_SCREENSHOTS) {
        expect(screenshot.timestamp).toBeLessThan(now)
        expect(screenshot.timestamp).toBeGreaterThan(now - 7 * 24 * 60 * 60 * 1000) // Within a week
      }
    })

    it('should have valid SVG data URIs', () => {
      for (const screenshot of DEMO_SCREENSHOTS) {
        expect(screenshot.thumbnailDataUri).toMatch(/^data:image\/svg\+xml;base64,/)
      }
    })

    it('should have screenshots spanning multiple days', () => {
      const uniqueDays = new Set(DEMO_SCREENSHOTS.map((s) => new Date(s.timestamp).toDateString()))
      expect(uniqueDays.size).toBeGreaterThanOrEqual(3)
    })
  })

  describe('getDemoScreenshotsByDay()', () => {
    it('should group screenshots by day', () => {
      const grouped = getDemoScreenshotsByDay()

      expect(grouped.size).toBeGreaterThanOrEqual(3)

      let totalCount = 0
      for (const screenshots of grouped.values()) {
        totalCount += screenshots.length
      }
      expect(totalCount).toBe(DEMO_SCREENSHOTS.length)
    })
  })

  describe('getDemoScreenshotCategoryCounts()', () => {
    it('should count all categories', () => {
      const counts = getDemoScreenshotCategoryCounts()

      expect(counts).toHaveProperty('homework')
      expect(counts).toHaveProperty('gaming')
      expect(counts).toHaveProperty('social')
      expect(counts).toHaveProperty('video')
      expect(counts).toHaveProperty('creative')
    })

    it('should sum to total screenshots', () => {
      const counts = getDemoScreenshotCategoryCounts()
      const total = Object.values(counts).reduce((sum, count) => sum + count, 0)
      expect(total).toBe(DEMO_SCREENSHOTS.length)
    })
  })

  describe('getDemoActivitySummary()', () => {
    it('should return activity summary', () => {
      const summary = getDemoActivitySummary()

      expect(summary.totalScreenshots).toBe(DEMO_SCREENSHOTS.length)
      expect(summary.lastCaptureTime).toBeGreaterThan(0)
      expect(summary.topCategories.length).toBeLessThanOrEqual(3)
      expect(summary.daysWithActivity).toBeGreaterThanOrEqual(3)
    })

    it('should have sorted top categories', () => {
      const summary = getDemoActivitySummary()

      for (let i = 1; i < summary.topCategories.length; i++) {
        expect(summary.topCategories[i - 1].count).toBeGreaterThanOrEqual(
          summary.topCategories[i].count
        )
      }
    })
  })
})

describe('Demo Data (Story 8.5.2)', () => {
  describe('CATEGORY_LABELS', () => {
    it('should have labels for all categories', () => {
      expect(CATEGORY_LABELS).toHaveProperty('homework', 'Educational')
      expect(CATEGORY_LABELS).toHaveProperty('gaming', 'Gaming')
      expect(CATEGORY_LABELS).toHaveProperty('social', 'Social Media')
      expect(CATEGORY_LABELS).toHaveProperty('video', 'Video Content')
      expect(CATEGORY_LABELS).toHaveProperty('creative', 'Creative')
    })
  })

  describe('Classification data (AC2)', () => {
    it('should have classification on all screenshots', () => {
      for (const screenshot of DEMO_SCREENSHOTS) {
        expect(screenshot.classification).toBeDefined()
        expect(screenshot.classification.label).toBeTruthy()
        expect(screenshot.classification.confidence).toBeGreaterThanOrEqual(0)
        expect(screenshot.classification.confidence).toBeLessThanOrEqual(1)
      }
    })

    it('should have varied confidence levels', () => {
      const confidences = DEMO_SCREENSHOTS.map((s) => s.classification.confidence)
      const highConfidence = confidences.filter((c) => c >= 0.9)
      const medConfidence = confidences.filter((c) => c >= 0.7 && c < 0.9)
      const _lowConfidence = confidences.filter((c) => c < 0.7)

      // Should have at least some variety
      expect(highConfidence.length).toBeGreaterThan(0)
      expect(medConfidence.length).toBeGreaterThan(0)
      // Low confidence is optional but good to have - _lowConfidence exists for completeness
    })
  })

  describe('getConfidenceLevel()', () => {
    it('should return high for 90%+', () => {
      expect(getConfidenceLevel(0.9)).toBe('high')
      expect(getConfidenceLevel(0.95)).toBe('high')
      expect(getConfidenceLevel(1.0)).toBe('high')
    })

    it('should return medium for 70-89%', () => {
      expect(getConfidenceLevel(0.7)).toBe('medium')
      expect(getConfidenceLevel(0.85)).toBe('medium')
      expect(getConfidenceLevel(0.89)).toBe('medium')
    })

    it('should return low for below 70%', () => {
      expect(getConfidenceLevel(0.69)).toBe('low')
      expect(getConfidenceLevel(0.5)).toBe('low')
      expect(getConfidenceLevel(0.0)).toBe('low')
    })
  })

  describe('getConfidenceLevelLabel()', () => {
    it('should return descriptive labels', () => {
      expect(getConfidenceLevelLabel(0.95)).toBe('Very confident')
      expect(getConfidenceLevelLabel(0.8)).toBe('Confident')
      expect(getConfidenceLevelLabel(0.5)).toBe('Uncertain')
    })
  })

  describe('Flagged screenshots (AC3)', () => {
    it('should have some flagged screenshots', () => {
      const flagged = DEMO_SCREENSHOTS.filter((s) => s.flagged)
      expect(flagged.length).toBeGreaterThanOrEqual(1)
      expect(flagged.length).toBeLessThanOrEqual(3) // Not too many
    })

    it('should have non-accusatory flag reasons', () => {
      const flagged = DEMO_SCREENSHOTS.filter((s) => s.flagged)

      for (const screenshot of flagged) {
        expect(screenshot.flagReason).toBeTruthy()
        // Should NOT contain accusatory language
        const lowerReason = screenshot.flagReason!.toLowerCase()
        expect(lowerReason).not.toContain('dangerous')
        expect(lowerReason).not.toContain('bad')
        expect(lowerReason).not.toContain('wrong')
        expect(lowerReason).not.toContain('illegal')
        // Should contain conversational language
        expect(lowerReason).toMatch(/conversation|opportunity|check in|might|appears/)
      }
    })

    it('should have mostly non-flagged screenshots', () => {
      const notFlagged = DEMO_SCREENSHOTS.filter((s) => !s.flagged)
      expect(notFlagged.length).toBeGreaterThan(DEMO_SCREENSHOTS.length / 2)
    })
  })

  describe('getFlaggedDemoScreenshots()', () => {
    it('should return only flagged screenshots', () => {
      const flagged = getFlaggedDemoScreenshots()

      expect(flagged.length).toBeGreaterThanOrEqual(1)
      for (const screenshot of flagged) {
        expect(screenshot.flagged).toBe(true)
      }
    })
  })

  describe('filterDemoScreenshotsByCategory() (AC6)', () => {
    it('should return all screenshots for "all" category', () => {
      const all = filterDemoScreenshotsByCategory('all')
      expect(all.length).toBe(DEMO_SCREENSHOTS.length)
    })

    it('should filter by homework category', () => {
      const homework = filterDemoScreenshotsByCategory('homework')
      expect(homework.length).toBeGreaterThan(0)
      for (const screenshot of homework) {
        expect(screenshot.category).toBe('homework')
      }
    })

    it('should filter by gaming category', () => {
      const gaming = filterDemoScreenshotsByCategory('gaming')
      expect(gaming.length).toBeGreaterThan(0)
      for (const screenshot of gaming) {
        expect(screenshot.category).toBe('gaming')
      }
    })

    it('should filter by social category', () => {
      const social = filterDemoScreenshotsByCategory('social')
      expect(social.length).toBeGreaterThan(0)
      for (const screenshot of social) {
        expect(screenshot.category).toBe('social')
      }
    })
  })

  describe('searchDemoScreenshots() (AC6)', () => {
    it('should find screenshots by title', () => {
      const results = searchDemoScreenshots('math')
      expect(results.length).toBeGreaterThan(0)
      expect(results[0].title.toLowerCase()).toContain('math')
    })

    it('should find screenshots by URL', () => {
      const results = searchDemoScreenshots('khanacademy')
      expect(results.length).toBeGreaterThan(0)
      expect(results[0].url.toLowerCase()).toContain('khanacademy')
    })

    it('should be case insensitive', () => {
      const lower = searchDemoScreenshots('math')
      const upper = searchDemoScreenshots('MATH')
      expect(lower.length).toBe(upper.length)
    })

    it('should return empty array for no matches', () => {
      const results = searchDemoScreenshots('xyznonexistent123')
      expect(results).toEqual([])
    })
  })
})
