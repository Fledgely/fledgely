/**
 * Tests for Demo Data Constants
 *
 * Story 8.5.1: Demo Child Profile Creation
 */

import { describe, expect, it } from 'vitest'
import {
  DEMO_CHILD_ID,
  DEMO_CHILD_PROFILE,
  DEMO_SCREENSHOTS,
  isDemoChild,
  getDemoScreenshotsByDay,
  getDemoScreenshotCategoryCounts,
  getDemoActivitySummary,
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
    it('should have 5-10 sample screenshots', () => {
      expect(DEMO_SCREENSHOTS.length).toBeGreaterThanOrEqual(5)
      expect(DEMO_SCREENSHOTS.length).toBeLessThanOrEqual(10)
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
