/**
 * Activity Utils Tests - Story 19B.4
 *
 * Tests for activity aggregation utilities.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  getStartOfToday,
  getStartOfWeek,
  countTodayScreenshots,
  countWeekScreenshots,
  extractDomain,
  aggregateTopApps,
  calculateTimeDistribution,
  getPercentage,
  calculateActivitySummary,
  TIME_OF_DAY_DISPLAY,
} from './activityUtils'
import type { ChildScreenshot } from '../../hooks/useChildScreenshots'

// Mock screenshot factory
const createMockScreenshot = (id: string, timestamp: number, url: string): ChildScreenshot => ({
  id,
  imageUrl: `https://example.com/image-${id}.png`,
  timestamp,
  url,
  title: `Screenshot ${id}`,
  deviceId: 'device-1',
})

describe('activityUtils', () => {
  beforeEach(() => {
    // Mock current date to ensure consistent tests
    vi.useFakeTimers()
    // Set to Wednesday, Dec 25, 2024 at 14:30:00
    vi.setSystemTime(new Date(2024, 11, 25, 14, 30, 0))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('getStartOfToday', () => {
    it('returns midnight of current day', () => {
      const startOfToday = getStartOfToday()
      const date = new Date(startOfToday)

      expect(date.getFullYear()).toBe(2024)
      expect(date.getMonth()).toBe(11) // December
      expect(date.getDate()).toBe(25)
      expect(date.getHours()).toBe(0)
      expect(date.getMinutes()).toBe(0)
      expect(date.getSeconds()).toBe(0)
    })
  })

  describe('getStartOfWeek', () => {
    it('returns Sunday midnight of current week', () => {
      // Dec 25, 2024 is Wednesday, so start of week is Dec 22 (Sunday)
      const startOfWeek = getStartOfWeek()
      const date = new Date(startOfWeek)

      expect(date.getFullYear()).toBe(2024)
      expect(date.getMonth()).toBe(11) // December
      expect(date.getDate()).toBe(22) // Sunday Dec 22
      expect(date.getDay()).toBe(0) // Sunday
      expect(date.getHours()).toBe(0)
      expect(date.getMinutes()).toBe(0)
    })

    it('handles Sunday correctly', () => {
      // Set to Sunday Dec 22
      vi.setSystemTime(new Date(2024, 11, 22, 10, 0, 0))
      const startOfWeek = getStartOfWeek()
      const date = new Date(startOfWeek)

      expect(date.getDate()).toBe(22) // Same day
      expect(date.getDay()).toBe(0)
      expect(date.getHours()).toBe(0)
    })
  })

  describe('countTodayScreenshots', () => {
    it('counts screenshots from today only', () => {
      const todayMorning = new Date(2024, 11, 25, 8, 0, 0).getTime()
      const yesterdayEvening = new Date(2024, 11, 24, 20, 0, 0).getTime()
      const todayNoon = new Date(2024, 11, 25, 12, 0, 0).getTime()

      const screenshots = [
        createMockScreenshot('1', todayMorning, 'https://example.com'),
        createMockScreenshot('2', yesterdayEvening, 'https://example.com'),
        createMockScreenshot('3', todayNoon, 'https://example.com'),
      ]

      expect(countTodayScreenshots(screenshots)).toBe(2)
    })

    it('returns 0 for empty array', () => {
      expect(countTodayScreenshots([])).toBe(0)
    })

    it('returns 0 when no screenshots from today', () => {
      const yesterday = new Date(2024, 11, 24, 10, 0, 0).getTime()
      const screenshots = [createMockScreenshot('1', yesterday, 'https://example.com')]

      expect(countTodayScreenshots(screenshots)).toBe(0)
    })
  })

  describe('countWeekScreenshots', () => {
    it('counts screenshots from current week', () => {
      // Dec 25 is Wednesday, week starts Dec 22 (Sunday)
      const sunday = new Date(2024, 11, 22, 10, 0, 0).getTime()
      const monday = new Date(2024, 11, 23, 10, 0, 0).getTime()
      const wednesday = new Date(2024, 11, 25, 10, 0, 0).getTime()
      const lastSaturday = new Date(2024, 11, 21, 10, 0, 0).getTime() // Previous week

      const screenshots = [
        createMockScreenshot('1', sunday, 'https://example.com'),
        createMockScreenshot('2', monday, 'https://example.com'),
        createMockScreenshot('3', wednesday, 'https://example.com'),
        createMockScreenshot('4', lastSaturday, 'https://example.com'),
      ]

      expect(countWeekScreenshots(screenshots)).toBe(3)
    })

    it('returns 0 for empty array', () => {
      expect(countWeekScreenshots([])).toBe(0)
    })
  })

  describe('extractDomain', () => {
    it('extracts domain from full URL', () => {
      expect(extractDomain('https://www.youtube.com/watch?v=123')).toBe('youtube.com')
    })

    it('removes www prefix', () => {
      expect(extractDomain('https://www.google.com/search')).toBe('google.com')
    })

    it('handles URLs without www', () => {
      expect(extractDomain('https://example.org/path')).toBe('example.org')
    })

    it('handles http protocol', () => {
      expect(extractDomain('http://test.com')).toBe('test.com')
    })

    it('returns Unknown for empty string', () => {
      expect(extractDomain('')).toBe('Unknown')
    })

    it('returns Unknown for null/undefined', () => {
      expect(extractDomain(null as unknown as string)).toBe('Unknown')
      expect(extractDomain(undefined as unknown as string)).toBe('Unknown')
    })

    it('handles invalid URLs gracefully', () => {
      expect(extractDomain('not-a-url')).toBe('not-a-url')
    })

    it('handles subdomain URLs', () => {
      expect(extractDomain('https://mail.google.com')).toBe('mail.google.com')
    })
  })

  describe('aggregateTopApps', () => {
    it('returns top 3 apps by default', () => {
      const screenshots = [
        createMockScreenshot('1', Date.now(), 'https://youtube.com'),
        createMockScreenshot('2', Date.now(), 'https://youtube.com'),
        createMockScreenshot('3', Date.now(), 'https://youtube.com'),
        createMockScreenshot('4', Date.now(), 'https://google.com'),
        createMockScreenshot('5', Date.now(), 'https://google.com'),
        createMockScreenshot('6', Date.now(), 'https://facebook.com'),
        createMockScreenshot('7', Date.now(), 'https://twitter.com'),
      ]

      const topApps = aggregateTopApps(screenshots)

      expect(topApps).toHaveLength(3)
      expect(topApps[0]).toEqual({ domain: 'youtube.com', count: 3 })
      expect(topApps[1]).toEqual({ domain: 'google.com', count: 2 })
      expect(topApps[2]).toEqual({ domain: 'facebook.com', count: 1 })
    })

    it('respects custom limit', () => {
      const screenshots = [
        createMockScreenshot('1', Date.now(), 'https://a.com'),
        createMockScreenshot('2', Date.now(), 'https://b.com'),
        createMockScreenshot('3', Date.now(), 'https://c.com'),
        createMockScreenshot('4', Date.now(), 'https://d.com'),
        createMockScreenshot('5', Date.now(), 'https://e.com'),
      ]

      const topApps = aggregateTopApps(screenshots, 5)
      expect(topApps).toHaveLength(5)
    })

    it('returns fewer if less than limit', () => {
      const screenshots = [createMockScreenshot('1', Date.now(), 'https://only.com')]

      const topApps = aggregateTopApps(screenshots)
      expect(topApps).toHaveLength(1)
    })

    it('excludes Unknown domains', () => {
      const screenshots = [
        createMockScreenshot('1', Date.now(), ''),
        createMockScreenshot('2', Date.now(), 'https://valid.com'),
      ]

      const topApps = aggregateTopApps(screenshots)
      expect(topApps).toHaveLength(1)
      expect(topApps[0].domain).toBe('valid.com')
    })

    it('returns empty array for empty input', () => {
      expect(aggregateTopApps([])).toHaveLength(0)
    })

    it('handles tie-breaker by keeping first encountered', () => {
      const screenshots = [
        createMockScreenshot('1', Date.now(), 'https://first.com'),
        createMockScreenshot('2', Date.now(), 'https://second.com'),
      ]

      const topApps = aggregateTopApps(screenshots)
      expect(topApps).toHaveLength(2)
      // Both have count of 1, order depends on map iteration
    })
  })

  describe('calculateTimeDistribution', () => {
    it('categorizes morning screenshots (6am-12pm)', () => {
      const screenshots = [
        createMockScreenshot('1', new Date(2024, 11, 25, 6, 0, 0).getTime(), 'https://a.com'),
        createMockScreenshot('2', new Date(2024, 11, 25, 9, 30, 0).getTime(), 'https://b.com'),
        createMockScreenshot('3', new Date(2024, 11, 25, 11, 59, 0).getTime(), 'https://c.com'),
      ]

      const distribution = calculateTimeDistribution(screenshots)
      expect(distribution.morning).toBe(3)
      expect(distribution.total).toBe(3)
    })

    it('categorizes afternoon screenshots (12pm-6pm)', () => {
      const screenshots = [
        createMockScreenshot('1', new Date(2024, 11, 25, 12, 0, 0).getTime(), 'https://a.com'),
        createMockScreenshot('2', new Date(2024, 11, 25, 15, 0, 0).getTime(), 'https://b.com'),
        createMockScreenshot('3', new Date(2024, 11, 25, 17, 59, 0).getTime(), 'https://c.com'),
      ]

      const distribution = calculateTimeDistribution(screenshots)
      expect(distribution.afternoon).toBe(3)
    })

    it('categorizes evening screenshots (6pm-12am)', () => {
      const screenshots = [
        createMockScreenshot('1', new Date(2024, 11, 25, 18, 0, 0).getTime(), 'https://a.com'),
        createMockScreenshot('2', new Date(2024, 11, 25, 21, 0, 0).getTime(), 'https://b.com'),
        createMockScreenshot('3', new Date(2024, 11, 25, 23, 59, 0).getTime(), 'https://c.com'),
      ]

      const distribution = calculateTimeDistribution(screenshots)
      expect(distribution.evening).toBe(3)
    })

    it('categorizes night screenshots (12am-6am)', () => {
      const screenshots = [
        createMockScreenshot('1', new Date(2024, 11, 25, 0, 0, 0).getTime(), 'https://a.com'),
        createMockScreenshot('2', new Date(2024, 11, 25, 3, 0, 0).getTime(), 'https://b.com'),
        createMockScreenshot('3', new Date(2024, 11, 25, 5, 59, 0).getTime(), 'https://c.com'),
      ]

      const distribution = calculateTimeDistribution(screenshots)
      expect(distribution.night).toBe(3)
    })

    it('distributes across all periods', () => {
      const screenshots = [
        createMockScreenshot('1', new Date(2024, 11, 25, 2, 0, 0).getTime(), 'https://a.com'), // night
        createMockScreenshot('2', new Date(2024, 11, 25, 8, 0, 0).getTime(), 'https://b.com'), // morning
        createMockScreenshot('3', new Date(2024, 11, 25, 14, 0, 0).getTime(), 'https://c.com'), // afternoon
        createMockScreenshot('4', new Date(2024, 11, 25, 20, 0, 0).getTime(), 'https://d.com'), // evening
      ]

      const distribution = calculateTimeDistribution(screenshots)
      expect(distribution.night).toBe(1)
      expect(distribution.morning).toBe(1)
      expect(distribution.afternoon).toBe(1)
      expect(distribution.evening).toBe(1)
      expect(distribution.total).toBe(4)
    })

    it('returns zeros for empty array', () => {
      const distribution = calculateTimeDistribution([])
      expect(distribution.morning).toBe(0)
      expect(distribution.afternoon).toBe(0)
      expect(distribution.evening).toBe(0)
      expect(distribution.night).toBe(0)
      expect(distribution.total).toBe(0)
    })
  })

  describe('getPercentage', () => {
    it('calculates correct percentage', () => {
      expect(getPercentage(25, 100)).toBe(25)
      expect(getPercentage(1, 4)).toBe(25)
      expect(getPercentage(3, 4)).toBe(75)
    })

    it('rounds to nearest integer', () => {
      expect(getPercentage(1, 3)).toBe(33)
      expect(getPercentage(2, 3)).toBe(67)
    })

    it('returns 0 when total is 0', () => {
      expect(getPercentage(5, 0)).toBe(0)
    })

    it('returns 100 for full count', () => {
      expect(getPercentage(10, 10)).toBe(100)
    })
  })

  describe('calculateActivitySummary', () => {
    it('returns complete summary object', () => {
      const screenshots = [
        createMockScreenshot(
          '1',
          new Date(2024, 11, 25, 10, 0, 0).getTime(),
          'https://youtube.com'
        ),
        createMockScreenshot('2', new Date(2024, 11, 25, 14, 0, 0).getTime(), 'https://google.com'),
      ]

      const summary = calculateActivitySummary(screenshots)

      expect(summary).toHaveProperty('todayCount')
      expect(summary).toHaveProperty('weekCount')
      expect(summary).toHaveProperty('topApps')
      expect(summary).toHaveProperty('timeDistribution')
    })

    it('calculates correct today and week counts', () => {
      const today = new Date(2024, 11, 25, 10, 0, 0).getTime()
      const monday = new Date(2024, 11, 23, 10, 0, 0).getTime()
      const lastWeek = new Date(2024, 11, 15, 10, 0, 0).getTime()

      const screenshots = [
        createMockScreenshot('1', today, 'https://a.com'),
        createMockScreenshot('2', today, 'https://b.com'),
        createMockScreenshot('3', monday, 'https://c.com'),
        createMockScreenshot('4', lastWeek, 'https://d.com'),
      ]

      const summary = calculateActivitySummary(screenshots)

      expect(summary.todayCount).toBe(2)
      expect(summary.weekCount).toBe(3) // today (2) + monday (1)
    })

    it('aggregates top apps correctly', () => {
      const screenshots = [
        createMockScreenshot('1', Date.now(), 'https://site1.com'),
        createMockScreenshot('2', Date.now(), 'https://site1.com'),
        createMockScreenshot('3', Date.now(), 'https://site2.com'),
      ]

      const summary = calculateActivitySummary(screenshots)

      expect(summary.topApps[0]).toEqual({ domain: 'site1.com', count: 2 })
      expect(summary.topApps[1]).toEqual({ domain: 'site2.com', count: 1 })
    })

    it('calculates time distribution correctly', () => {
      const screenshots = [
        createMockScreenshot('1', new Date(2024, 11, 25, 8, 0, 0).getTime(), 'https://a.com'),
        createMockScreenshot('2', new Date(2024, 11, 25, 9, 0, 0).getTime(), 'https://b.com'),
      ]

      const summary = calculateActivitySummary(screenshots)

      expect(summary.timeDistribution.morning).toBe(2)
      expect(summary.timeDistribution.total).toBe(2)
    })

    it('handles empty screenshots', () => {
      const summary = calculateActivitySummary([])

      expect(summary.todayCount).toBe(0)
      expect(summary.weekCount).toBe(0)
      expect(summary.topApps).toHaveLength(0)
      expect(summary.timeDistribution.total).toBe(0)
    })
  })

  describe('TIME_OF_DAY_DISPLAY', () => {
    it('has configuration for all time periods', () => {
      expect(TIME_OF_DAY_DISPLAY.morning).toBeDefined()
      expect(TIME_OF_DAY_DISPLAY.afternoon).toBeDefined()
      expect(TIME_OF_DAY_DISPLAY.evening).toBeDefined()
      expect(TIME_OF_DAY_DISPLAY.night).toBeDefined()
    })

    it('has label, icon, and color for each period', () => {
      for (const period of ['morning', 'afternoon', 'evening', 'night'] as const) {
        const config = TIME_OF_DAY_DISPLAY[period]
        expect(config.label).toBeTruthy()
        expect(config.icon).toBeTruthy()
        expect(config.color).toMatch(/^#[0-9a-fA-F]{6}$/)
      }
    })
  })
})
