/**
 * DailySummaryService Tests - Story 37.3 Task 3
 *
 * Tests for daily summary generation.
 * AC2: Parents receive daily summary (e.g., "Emma used device 3 hours today")
 * AC3: Only concerning patterns trigger alerts (not individual events)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  generateDailySummary,
  calculateTotalUsage,
  getTopApps,
  checkTimeLimitReached,
  detectConcerningPatterns,
  detectExcessiveUsage,
  detectLateNightUsage,
  detectNewCategories,
  detectRapidAppSwitching,
  formatSummaryForParent,
  formatSummaryForChild,
  getSummaryStatusMessage,
  formatMinutes,
  formatHour,
  formatDate,
  DEFAULT_PATTERN_CONFIG,
  type UsageData,
  type PatternConfig,
} from './dailySummaryService'

describe('DailySummaryService - Story 37.3 Task 3', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-12-15T12:00:00Z'))
  })

  const createUsageData = (overrides: Partial<UsageData> = {}): UsageData => ({
    appName: 'TestApp',
    usageMinutes: 30,
    startTime: new Date('2024-12-15T10:00:00Z'),
    endTime: new Date('2024-12-15T10:30:00Z'),
    ...overrides,
  })

  describe('generateDailySummary', () => {
    it('should generate summary with correct totals', () => {
      const usageData: UsageData[] = [
        createUsageData({ appName: 'YouTube', usageMinutes: 60 }),
        createUsageData({ appName: 'Minecraft', usageMinutes: 45 }),
      ]

      const summary = generateDailySummary('child-1', new Date(), usageData)

      expect(summary.childId).toBe('child-1')
      expect(summary.totalUsageMinutes).toBe(105)
    })

    it('should include top apps', () => {
      const usageData: UsageData[] = [
        createUsageData({ appName: 'YouTube', usageMinutes: 60 }),
        createUsageData({ appName: 'Minecraft', usageMinutes: 45 }),
        createUsageData({ appName: 'Roblox', usageMinutes: 30 }),
      ]

      const summary = generateDailySummary('child-1', new Date(), usageData)

      expect(summary.topApps).toHaveLength(3)
      expect(summary.topApps[0].appName).toBe('YouTube')
    })

    it('should detect concerning patterns', () => {
      const config: PatternConfig = {
        ...DEFAULT_PATTERN_CONFIG,
        normalUsageMinutes: 60,
        excessiveMultiplier: 2,
      }

      const usageData: UsageData[] = [
        createUsageData({ usageMinutes: 200 }), // 3x+ normal
      ]

      const summary = generateDailySummary('child-1', new Date(), usageData, config)

      expect(summary.concerningPatterns.length).toBeGreaterThan(0)
      expect(summary.status).not.toBe('normal')
    })

    it('should track time limit status', () => {
      const config: PatternConfig = {
        ...DEFAULT_PATTERN_CONFIG,
        dailyTimeLimitMinutes: 120,
      }

      const usageData: UsageData[] = [createUsageData({ usageMinutes: 150 })]

      const summary = generateDailySummary('child-1', new Date(), usageData, config)

      expect(summary.timeLimitsReached).toBe(true)
    })
  })

  describe('calculateTotalUsage', () => {
    it('should sum all usage minutes', () => {
      const data: UsageData[] = [
        createUsageData({ usageMinutes: 30 }),
        createUsageData({ usageMinutes: 45 }),
        createUsageData({ usageMinutes: 15 }),
      ]

      expect(calculateTotalUsage(data)).toBe(90)
    })

    it('should return 0 for empty array', () => {
      expect(calculateTotalUsage([])).toBe(0)
    })
  })

  describe('getTopApps', () => {
    it('should return apps sorted by usage', () => {
      const data: UsageData[] = [
        createUsageData({ appName: 'Low', usageMinutes: 10 }),
        createUsageData({ appName: 'High', usageMinutes: 100 }),
        createUsageData({ appName: 'Medium', usageMinutes: 50 }),
      ]

      const topApps = getTopApps(data, 3)

      expect(topApps[0].appName).toBe('High')
      expect(topApps[1].appName).toBe('Medium')
      expect(topApps[2].appName).toBe('Low')
    })

    it('should aggregate same app usage', () => {
      const data: UsageData[] = [
        createUsageData({ appName: 'YouTube', usageMinutes: 30 }),
        createUsageData({ appName: 'YouTube', usageMinutes: 20 }),
      ]

      const topApps = getTopApps(data, 5)

      expect(topApps).toHaveLength(1)
      expect(topApps[0].usageMinutes).toBe(50)
    })

    it('should respect limit', () => {
      const data: UsageData[] = Array(10)
        .fill(null)
        .map((_, i) => createUsageData({ appName: `App${i}`, usageMinutes: 10 }))

      const topApps = getTopApps(data, 3)

      expect(topApps).toHaveLength(3)
    })
  })

  describe('checkTimeLimitReached', () => {
    it('should return true when limit exceeded', () => {
      expect(checkTimeLimitReached(150, 120)).toBe(true)
    })

    it('should return true when at limit', () => {
      expect(checkTimeLimitReached(120, 120)).toBe(true)
    })

    it('should return false when under limit', () => {
      expect(checkTimeLimitReached(100, 120)).toBe(false)
    })

    it('should return false when no limit set', () => {
      expect(checkTimeLimitReached(500, null)).toBe(false)
    })
  })

  describe('detectConcerningPatterns', () => {
    it('should return empty array for normal usage (AC3)', () => {
      const data: UsageData[] = [createUsageData({ usageMinutes: 60 })]

      const patterns = detectConcerningPatterns(data)

      expect(patterns).toHaveLength(0)
    })

    it('should detect multiple patterns', () => {
      const config: PatternConfig = {
        normalUsageMinutes: 60,
        excessiveMultiplier: 2,
        bedtimeHour: 22,
        newCategoriesToFlag: ['Social'],
        dailyTimeLimitMinutes: 120,
      }

      const data: UsageData[] = [
        createUsageData({
          usageMinutes: 200,
          endTime: new Date('2024-12-15T23:30:00Z'),
        }),
        createUsageData({
          appName: 'TikTok',
          category: 'Social',
          usageMinutes: 30,
        }),
      ]

      const patterns = detectConcerningPatterns(data, config)

      expect(patterns.length).toBeGreaterThan(1)
    })
  })

  describe('detectExcessiveUsage', () => {
    const config: PatternConfig = {
      ...DEFAULT_PATTERN_CONFIG,
      normalUsageMinutes: 60,
      excessiveMultiplier: 3,
    }

    it('should detect excessive usage', () => {
      const data: UsageData[] = [createUsageData({ usageMinutes: 200 })]

      const pattern = detectExcessiveUsage(data, config)

      expect(pattern).not.toBeNull()
      expect(pattern?.type).toBe('excessive-usage')
      expect(pattern?.severity).toBe('medium')
    })

    it('should detect very excessive usage as high severity', () => {
      const data: UsageData[] = [createUsageData({ usageMinutes: 400 })]

      const pattern = detectExcessiveUsage(data, config)

      expect(pattern?.severity).toBe('high')
    })

    it('should not flag normal usage', () => {
      const data: UsageData[] = [createUsageData({ usageMinutes: 100 })]

      const pattern = detectExcessiveUsage(data, config)

      expect(pattern).toBeNull()
    })
  })

  describe('detectLateNightUsage', () => {
    const config: PatternConfig = {
      ...DEFAULT_PATTERN_CONFIG,
      bedtimeHour: 22,
    }

    it('should detect late night usage', () => {
      const data: UsageData[] = [
        createUsageData({
          endTime: new Date('2024-12-15T23:30:00'),
          usageMinutes: 30,
        }),
      ]

      const pattern = detectLateNightUsage(data, config)

      expect(pattern).not.toBeNull()
      expect(pattern?.type).toBe('late-night-usage')
    })

    it('should detect early morning usage', () => {
      const data: UsageData[] = [
        createUsageData({
          endTime: new Date('2024-12-15T04:30:00'),
          usageMinutes: 30,
        }),
      ]

      const pattern = detectLateNightUsage(data, config)

      expect(pattern).not.toBeNull()
    })

    it('should not flag daytime usage', () => {
      const data: UsageData[] = [
        createUsageData({
          endTime: new Date('2024-12-15T18:00:00'),
          usageMinutes: 60,
        }),
      ]

      const pattern = detectLateNightUsage(data, config)

      expect(pattern).toBeNull()
    })

    it('should flag as high severity for extended late usage', () => {
      const data: UsageData[] = [
        createUsageData({
          endTime: new Date('2024-12-15T23:30:00'),
          usageMinutes: 45,
        }),
      ]

      const pattern = detectLateNightUsage(data, config)

      expect(pattern?.severity).toBe('high')
    })
  })

  describe('detectNewCategories', () => {
    const config: PatternConfig = {
      ...DEFAULT_PATTERN_CONFIG,
      newCategoriesToFlag: ['Social', 'Dating'],
    }

    it('should detect flagged categories', () => {
      const data: UsageData[] = [createUsageData({ appName: 'TikTok', category: 'Social' })]

      const patterns = detectNewCategories(data, config)

      expect(patterns).toHaveLength(1)
      expect(patterns[0].type).toBe('new-app-category')
    })

    it('should not duplicate same category', () => {
      const data: UsageData[] = [
        createUsageData({ appName: 'TikTok', category: 'Social' }),
        createUsageData({ appName: 'Instagram', category: 'Social' }),
      ]

      const patterns = detectNewCategories(data, config)

      expect(patterns).toHaveLength(1)
    })

    it('should not flag unconfigured categories', () => {
      const data: UsageData[] = [createUsageData({ appName: 'Chrome', category: 'Browser' })]

      const patterns = detectNewCategories(data, config)

      expect(patterns).toHaveLength(0)
    })
  })

  describe('detectRapidAppSwitching', () => {
    it('should detect rapid switching', () => {
      const data: UsageData[] = Array(15)
        .fill(null)
        .map((_, i) =>
          createUsageData({
            appName: `App${i}`,
            usageMinutes: 1, // Very short sessions
            startTime: new Date(Date.now() + i * 60000),
            endTime: new Date(Date.now() + i * 60000 + 60000),
          })
        )

      const pattern = detectRapidAppSwitching(data)

      expect(pattern).not.toBeNull()
      expect(pattern?.type).toBe('rapid-app-switching')
    })

    it('should not flag normal app usage', () => {
      const data: UsageData[] = [
        createUsageData({ usageMinutes: 30 }),
        createUsageData({ usageMinutes: 20 }),
      ]

      const pattern = detectRapidAppSwitching(data)

      expect(pattern).toBeNull()
    })
  })

  describe('formatSummaryForParent', () => {
    it('should format AC2 summary correctly', () => {
      const summary = generateDailySummary('child-1', new Date(), [
        createUsageData({ appName: 'YouTube', usageMinutes: 180 }),
      ])

      const formatted = formatSummaryForParent(summary, 'Emma')

      // AC2: Parents receive daily summary (e.g., "Emma used device 3 hours today")
      expect(formatted).toContain('Emma')
      expect(formatted).toContain('3 hours')
    })

    it('should include top apps', () => {
      const summary = generateDailySummary('child-1', new Date(), [
        createUsageData({ appName: 'YouTube', usageMinutes: 60 }),
        createUsageData({ appName: 'Minecraft', usageMinutes: 30 }),
      ])

      const formatted = formatSummaryForParent(summary, 'Emma')

      expect(formatted).toContain('YouTube')
    })

    it('should show all clear when no patterns', () => {
      const summary = generateDailySummary('child-1', new Date(), [
        createUsageData({ usageMinutes: 60 }),
      ])

      const formatted = formatSummaryForParent(summary, 'Emma')

      expect(formatted).toContain('No concerning patterns')
      expect(formatted).toContain('✓')
    })

    it('should show pattern count when patterns exist', () => {
      const config: PatternConfig = {
        ...DEFAULT_PATTERN_CONFIG,
        normalUsageMinutes: 30,
        excessiveMultiplier: 2,
      }

      const summary = generateDailySummary(
        'child-1',
        new Date(),
        [createUsageData({ usageMinutes: 200 })],
        config
      )

      const formatted = formatSummaryForParent(summary, 'Emma')

      expect(formatted).toContain('pattern')
      expect(formatted).toContain('review')
    })
  })

  describe('formatSummaryForChild', () => {
    it('should format child-friendly summary', () => {
      const summary = generateDailySummary('child-1', new Date(), [
        createUsageData({ appName: 'Minecraft', usageMinutes: 90 }),
      ])

      const formatted = formatSummaryForChild(summary)

      expect(formatted).toContain("Today's usage")
      expect(formatted).toContain('Minecraft')
    })
  })

  describe('getSummaryStatusMessage', () => {
    it('should return positive message for normal', () => {
      const summary = generateDailySummary('child-1', new Date(), [
        createUsageData({ usageMinutes: 60 }),
      ])

      expect(getSummaryStatusMessage(summary)).toContain('good')
    })

    it('should return attention message for attention-needed', () => {
      const config: PatternConfig = {
        ...DEFAULT_PATTERN_CONFIG,
        normalUsageMinutes: 60,
        excessiveMultiplier: 3,
      }

      // 180 minutes triggers excessive usage (3x) but stays at medium severity
      const summary = generateDailySummary(
        'child-1',
        new Date(),
        [createUsageData({ usageMinutes: 180 })],
        config
      )

      expect(getSummaryStatusMessage(summary)).toContain('attention')
    })
  })

  describe('formatMinutes', () => {
    it('should format minutes only', () => {
      expect(formatMinutes(45)).toBe('45 minutes')
    })

    it('should format exact hours', () => {
      expect(formatMinutes(60)).toBe('1 hour')
      expect(formatMinutes(120)).toBe('2 hours')
    })

    it('should format hours and minutes', () => {
      expect(formatMinutes(90)).toBe('1 hour 30 min')
      expect(formatMinutes(150)).toBe('2 hours 30 min')
    })
  })

  describe('formatHour', () => {
    it('should format AM hours', () => {
      expect(formatHour(9)).toBe('9 AM')
    })

    it('should format PM hours', () => {
      expect(formatHour(22)).toBe('10 PM')
    })

    it('should handle noon and midnight', () => {
      expect(formatHour(0)).toBe('12 AM')
      expect(formatHour(12)).toBe('12 PM')
    })
  })

  describe('formatDate', () => {
    it('should format date with weekday', () => {
      const date = new Date('2024-12-15')
      const formatted = formatDate(date)

      expect(formatted).toMatch(/Sun|Dec|15/)
    })
  })
})
