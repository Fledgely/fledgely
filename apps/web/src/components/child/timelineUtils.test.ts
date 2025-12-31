/**
 * Timeline Utilities Tests - Story 19B.2
 *
 * Task 1.5: Create unit tests for time grouping logic
 */

import { describe, it, expect } from 'vitest'
import {
  getTimeOfDay,
  getTimeOfDayConfig,
  groupByTimeOfDay,
  detectGaps,
  formatTimeRange,
  getDayLabel,
  isToday,
  getDateKey,
  TIME_OF_DAY_CONFIG,
  GAP_THRESHOLD_HOURS,
} from './timelineUtils'
import type { ChildScreenshot } from '../../hooks/useChildScreenshots'

// Helper to create mock screenshots
function createMockScreenshot(timestamp: number, id?: string): ChildScreenshot {
  return {
    id: id || `ss-${timestamp}`,
    imageUrl: 'https://example.com/screenshot.png',
    timestamp,
    url: 'https://example.com',
    title: 'Test Screenshot',
    deviceId: 'device-1',
  }
}

describe('timelineUtils', () => {
  describe('getTimeOfDay', () => {
    it('should return morning for hours 6-11', () => {
      const morning6am = new Date('2024-01-15T06:00:00').getTime()
      const morning11am = new Date('2024-01-15T11:59:00').getTime()

      expect(getTimeOfDay(morning6am)).toBe('morning')
      expect(getTimeOfDay(morning11am)).toBe('morning')
    })

    it('should return afternoon for hours 12-17', () => {
      const afternoon12pm = new Date('2024-01-15T12:00:00').getTime()
      const afternoon5pm = new Date('2024-01-15T17:59:00').getTime()

      expect(getTimeOfDay(afternoon12pm)).toBe('afternoon')
      expect(getTimeOfDay(afternoon5pm)).toBe('afternoon')
    })

    it('should return evening for hours 18-23', () => {
      const evening6pm = new Date('2024-01-15T18:00:00').getTime()
      const evening11pm = new Date('2024-01-15T23:59:00').getTime()

      expect(getTimeOfDay(evening6pm)).toBe('evening')
      expect(getTimeOfDay(evening11pm)).toBe('evening')
    })

    it('should return night for hours 0-5', () => {
      const nightMidnight = new Date('2024-01-15T00:00:00').getTime()
      const night5am = new Date('2024-01-15T05:59:00').getTime()

      expect(getTimeOfDay(nightMidnight)).toBe('night')
      expect(getTimeOfDay(night5am)).toBe('night')
    })
  })

  describe('getTimeOfDayConfig', () => {
    it('should return correct config for morning', () => {
      const config = getTimeOfDayConfig('morning')

      expect(config.key).toBe('morning')
      expect(config.label).toBe('Morning')
      expect(config.icon).toBe('🌅')
      expect(config.startHour).toBe(6)
      expect(config.endHour).toBe(12)
    })

    it('should return correct config for afternoon', () => {
      const config = getTimeOfDayConfig('afternoon')

      expect(config.key).toBe('afternoon')
      expect(config.label).toBe('Afternoon')
      expect(config.icon).toBe('☀️')
    })

    it('should return correct config for evening', () => {
      const config = getTimeOfDayConfig('evening')

      expect(config.key).toBe('evening')
      expect(config.label).toBe('Evening')
      expect(config.icon).toBe('🌆')
    })

    it('should return correct config for night', () => {
      const config = getTimeOfDayConfig('night')

      expect(config.key).toBe('night')
      expect(config.label).toBe('Night')
      expect(config.icon).toBe('🌙')
    })
  })

  describe('TIME_OF_DAY_CONFIG', () => {
    it('should have 4 time periods', () => {
      expect(TIME_OF_DAY_CONFIG).toHaveLength(4)
    })

    it('should cover all 24 hours without overlap', () => {
      const hours = new Set<number>()
      for (const config of TIME_OF_DAY_CONFIG) {
        for (let h = config.startHour; h < config.endHour; h++) {
          const normalizedHour = h % 24
          expect(hours.has(normalizedHour)).toBe(false)
          hours.add(normalizedHour)
        }
      }
      expect(hours.size).toBe(24)
    })
  })

  describe('groupByTimeOfDay', () => {
    it('should group screenshots by time of day', () => {
      const screenshots = [
        createMockScreenshot(new Date('2024-01-15T08:00:00').getTime(), 'morning-1'),
        createMockScreenshot(new Date('2024-01-15T09:00:00').getTime(), 'morning-2'),
        createMockScreenshot(new Date('2024-01-15T14:00:00').getTime(), 'afternoon-1'),
        createMockScreenshot(new Date('2024-01-15T20:00:00').getTime(), 'evening-1'),
      ]

      const groups = groupByTimeOfDay(screenshots)

      expect(groups).toHaveLength(3) // morning, afternoon, evening (no night)
      expect(groups[0].timeOfDay).toBe('morning')
      expect(groups[0].screenshots).toHaveLength(2)
      expect(groups[1].timeOfDay).toBe('afternoon')
      expect(groups[1].screenshots).toHaveLength(1)
      expect(groups[2].timeOfDay).toBe('evening')
      expect(groups[2].screenshots).toHaveLength(1)
    })

    it('should return empty array for no screenshots', () => {
      const groups = groupByTimeOfDay([])
      expect(groups).toHaveLength(0)
    })

    it('should only include non-empty groups', () => {
      const screenshots = [
        createMockScreenshot(new Date('2024-01-15T08:00:00').getTime(), 'morning-1'),
      ]

      const groups = groupByTimeOfDay(screenshots)

      expect(groups).toHaveLength(1)
      expect(groups[0].timeOfDay).toBe('morning')
    })

    it('should sort screenshots within group by timestamp descending', () => {
      const screenshots = [
        createMockScreenshot(new Date('2024-01-15T08:00:00').getTime(), 'earlier'),
        createMockScreenshot(new Date('2024-01-15T10:00:00').getTime(), 'later'),
      ]

      const groups = groupByTimeOfDay(screenshots)

      expect(groups[0].screenshots[0].id).toBe('later')
      expect(groups[0].screenshots[1].id).toBe('earlier')
    })

    it('should include config with each group', () => {
      const screenshots = [createMockScreenshot(new Date('2024-01-15T14:00:00').getTime())]

      const groups = groupByTimeOfDay(screenshots)

      expect(groups[0].config.label).toBe('Afternoon')
      expect(groups[0].config.icon).toBe('☀️')
    })
  })

  describe('detectGaps', () => {
    it('should detect gaps longer than threshold', () => {
      const screenshots = [
        createMockScreenshot(new Date('2024-01-15T14:00:00').getTime()), // later
        createMockScreenshot(new Date('2024-01-15T10:00:00').getTime()), // earlier (4 hour gap)
      ]

      const gaps = detectGaps(screenshots)

      expect(gaps).toHaveLength(1)
      expect(gaps[0].durationHours).toBeCloseTo(4)
      expect(gaps[0].message).toBe('No pictures during this time')
    })

    it('should not detect gaps shorter than threshold', () => {
      const screenshots = [
        createMockScreenshot(new Date('2024-01-15T10:30:00').getTime()), // later
        createMockScreenshot(new Date('2024-01-15T10:00:00').getTime()), // earlier (30 min gap)
      ]

      const gaps = detectGaps(screenshots)

      expect(gaps).toHaveLength(0)
    })

    it('should return empty array for single screenshot', () => {
      const screenshots = [createMockScreenshot(new Date('2024-01-15T10:00:00').getTime())]

      const gaps = detectGaps(screenshots)

      expect(gaps).toHaveLength(0)
    })

    it('should return empty array for no screenshots', () => {
      const gaps = detectGaps([])
      expect(gaps).toHaveLength(0)
    })

    it('should detect multiple gaps', () => {
      const screenshots = [
        createMockScreenshot(new Date('2024-01-15T20:00:00').getTime()),
        createMockScreenshot(new Date('2024-01-15T14:00:00').getTime()), // 6 hour gap
        createMockScreenshot(new Date('2024-01-15T08:00:00').getTime()), // 6 hour gap
      ]

      const gaps = detectGaps(screenshots)

      expect(gaps).toHaveLength(2)
    })

    it('should have unique ids for each gap', () => {
      const screenshots = [
        createMockScreenshot(new Date('2024-01-15T20:00:00').getTime()),
        createMockScreenshot(new Date('2024-01-15T14:00:00').getTime()),
        createMockScreenshot(new Date('2024-01-15T08:00:00').getTime()),
      ]

      const gaps = detectGaps(screenshots)

      expect(gaps[0].id).not.toBe(gaps[1].id)
    })
  })

  describe('GAP_THRESHOLD_HOURS', () => {
    it('should be set to 2 hours', () => {
      expect(GAP_THRESHOLD_HOURS).toBe(2)
    })
  })

  describe('formatTimeRange', () => {
    it('should format time range correctly', () => {
      const start = new Date('2024-01-15T09:30:00').getTime()
      const end = new Date('2024-01-15T14:00:00').getTime()

      const result = formatTimeRange(start, end)

      expect(result).toContain('9:30')
      expect(result).toContain('2:00')
    })
  })

  describe('getDayLabel', () => {
    it('should return "Today" for today', () => {
      const today = new Date()
      expect(getDayLabel(today)).toBe('Today')
    })

    it('should return "Yesterday" for yesterday', () => {
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      expect(getDayLabel(yesterday)).toBe('Yesterday')
    })

    it('should return formatted date for other days', () => {
      const oldDate = new Date('2024-01-15')
      const label = getDayLabel(oldDate)

      expect(label).toContain('Monday')
      expect(label).toContain('Jan')
      expect(label).toContain('15')
    })
  })

  describe('isToday', () => {
    it('should return true for today', () => {
      const today = new Date()
      expect(isToday(today)).toBe(true)
    })

    it('should return false for yesterday', () => {
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      expect(isToday(yesterday)).toBe(false)
    })

    it('should return false for past dates', () => {
      const pastDate = new Date('2024-01-15')
      expect(isToday(pastDate)).toBe(false)
    })
  })

  describe('getDateKey', () => {
    it('should return date in YYYY-MM-DD format', () => {
      const timestamp = new Date('2024-01-15T10:30:00').getTime()
      expect(getDateKey(timestamp)).toBe('2024-01-15')
    })

    it('should pad month and day with zeros', () => {
      const timestamp = new Date('2024-03-05T10:30:00').getTime()
      expect(getDateKey(timestamp)).toBe('2024-03-05')
    })
  })
})
