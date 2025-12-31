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

// ============================================
// Story 8.5.3: Sample Time Tracking Tests
// ============================================

import {
  DEMO_TIME_ENTRIES,
  DEMO_TIME_LIMITS,
  TIME_CATEGORY_LABELS,
  TIME_CATEGORY_COLORS,
  getDemoTimeLimit,
  getDemoTimeSummaryByDay,
  getDemoWeeklyTimeByCategory,
  getDemoWeeklyTotalTime,
  formatDuration,
} from './demoData'

describe('Demo Time Tracking Data (Story 8.5.3)', () => {
  describe('DEMO_TIME_ENTRIES', () => {
    it('should have time entries spanning multiple days (AC1)', () => {
      const uniqueDates = new Set(DEMO_TIME_ENTRIES.map((e) => e.date))
      expect(uniqueDates.size).toBeGreaterThanOrEqual(7)
    })

    it('should have entries for all categories (AC2)', () => {
      const categories = new Set(DEMO_TIME_ENTRIES.map((e) => e.category))
      expect(categories.has('educational')).toBe(true)
      expect(categories.has('entertainment')).toBe(true)
      expect(categories.has('social')).toBe(true)
      expect(categories.has('other')).toBe(true)
    })

    it('should have valid duration values', () => {
      for (const entry of DEMO_TIME_ENTRIES) {
        expect(entry.duration).toBeGreaterThan(0)
        expect(entry.duration).toBeLessThanOrEqual(120) // Max 2 hours per entry
      }
    })

    it('should have unique IDs', () => {
      const ids = DEMO_TIME_ENTRIES.map((e) => e.id)
      const uniqueIds = new Set(ids)
      expect(uniqueIds.size).toBe(ids.length)
    })
  })

  describe('DEMO_TIME_LIMITS (AC3)', () => {
    it('should have a total daily limit', () => {
      const totalLimit = DEMO_TIME_LIMITS.find((l) => l.category === 'total')
      expect(totalLimit).toBeDefined()
      expect(totalLimit!.dailyLimit).toBeGreaterThan(0)
    })

    it('should have entertainment limit', () => {
      const entertainmentLimit = DEMO_TIME_LIMITS.find((l) => l.category === 'entertainment')
      expect(entertainmentLimit).toBeDefined()
    })
  })

  describe('TIME_CATEGORY_LABELS', () => {
    it('should have labels for all categories', () => {
      expect(TIME_CATEGORY_LABELS.educational).toBe('Educational')
      expect(TIME_CATEGORY_LABELS.entertainment).toBe('Entertainment')
      expect(TIME_CATEGORY_LABELS.social).toBe('Social')
      expect(TIME_CATEGORY_LABELS.other).toBe('Other')
    })
  })

  describe('TIME_CATEGORY_COLORS', () => {
    it('should have colors for all categories', () => {
      expect(TIME_CATEGORY_COLORS.educational).toBeTruthy()
      expect(TIME_CATEGORY_COLORS.entertainment).toBeTruthy()
      expect(TIME_CATEGORY_COLORS.social).toBeTruthy()
      expect(TIME_CATEGORY_COLORS.other).toBeTruthy()
    })
  })

  describe('getDemoTimeLimit()', () => {
    it('should return limit for total category', () => {
      const limit = getDemoTimeLimit('total')
      expect(limit).toBe(180) // 3 hours
    })

    it('should return limit for entertainment', () => {
      const limit = getDemoTimeLimit('entertainment')
      expect(limit).toBe(90) // 1.5 hours
    })

    it('should return default for unknown category', () => {
      const limit = getDemoTimeLimit('educational')
      expect(limit).toBe(180) // Default
    })
  })

  describe('getDemoTimeSummaryByDay() (AC1)', () => {
    it('should return summaries for each unique day', () => {
      const summaries = getDemoTimeSummaryByDay()
      expect(summaries.length).toBeGreaterThanOrEqual(7)
    })

    it('should calculate total minutes per day', () => {
      const summaries = getDemoTimeSummaryByDay()
      for (const summary of summaries) {
        expect(summary.totalMinutes).toBeGreaterThan(0)
      }
    })

    it('should have category breakdown for each day', () => {
      const summaries = getDemoTimeSummaryByDay()
      for (const summary of summaries) {
        expect(summary.byCategory).toBeDefined()
        expect(typeof summary.byCategory.educational).toBe('number')
        expect(typeof summary.byCategory.entertainment).toBe('number')
        expect(typeof summary.byCategory.social).toBe('number')
        expect(typeof summary.byCategory.other).toBe('number')
      }
    })

    it('should determine limit status (AC3)', () => {
      const summaries = getDemoTimeSummaryByDay()
      for (const summary of summaries) {
        expect(['under', 'at', 'over']).toContain(summary.limitStatus)
      }
    })

    it('should have at least one over-limit day', () => {
      const summaries = getDemoTimeSummaryByDay()
      const overLimitDays = summaries.filter((s) => s.limitStatus === 'over')
      expect(overLimitDays.length).toBeGreaterThanOrEqual(1)
    })

    it('should include day name', () => {
      const summaries = getDemoTimeSummaryByDay()
      for (const summary of summaries) {
        expect(summary.dayName).toBeTruthy()
        expect(['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']).toContain(summary.dayName)
      }
    })

    it('should be sorted by date descending', () => {
      const summaries = getDemoTimeSummaryByDay()
      for (let i = 0; i < summaries.length - 1; i++) {
        expect(summaries[i].date >= summaries[i + 1].date).toBe(true)
      }
    })
  })

  describe('getDemoWeeklyTimeByCategory() (AC2)', () => {
    it('should return totals for all categories', () => {
      const totals = getDemoWeeklyTimeByCategory()
      expect(typeof totals.educational).toBe('number')
      expect(typeof totals.entertainment).toBe('number')
      expect(typeof totals.social).toBe('number')
      expect(typeof totals.other).toBe('number')
    })

    it('should have entertainment as significant category', () => {
      const totals = getDemoWeeklyTimeByCategory()
      expect(totals.entertainment).toBeGreaterThan(totals.educational) // More entertainment than educational
    })
  })

  describe('getDemoWeeklyTotalTime()', () => {
    it('should return total minutes for the week', () => {
      const total = getDemoWeeklyTotalTime()
      expect(total).toBeGreaterThan(0)
      // Should be at least 7 hours across the week
      expect(total).toBeGreaterThan(420)
    })

    it('should equal sum of all entries', () => {
      const total = getDemoWeeklyTotalTime()
      const summed = DEMO_TIME_ENTRIES.reduce((sum, e) => sum + e.duration, 0)
      expect(total).toBe(summed)
    })
  })

  describe('formatDuration()', () => {
    it('should format minutes only', () => {
      expect(formatDuration(30)).toBe('30m')
      expect(formatDuration(45)).toBe('45m')
    })

    it('should format hours only', () => {
      expect(formatDuration(60)).toBe('1h')
      expect(formatDuration(120)).toBe('2h')
    })

    it('should format hours and minutes', () => {
      expect(formatDuration(90)).toBe('1h 30m')
      expect(formatDuration(150)).toBe('2h 30m')
    })
  })
})
