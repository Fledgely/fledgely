/**
 * NotificationOnlyMode Data Model Tests - Story 37.3 Task 1
 *
 * Tests for notification-only mode data model.
 * AC1: Notification-only mode disables screenshot capture
 * AC6: Mode represents near-graduation status (95+ trust for extended period)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  NOTIFICATION_ONLY_TRUST_THRESHOLD,
  NOTIFICATION_ONLY_DURATION_DAYS,
  NOTIFICATION_ONLY_MILESTONE,
  notificationOnlyConfigSchema,
  concerningPatternSchema,
  dailySummarySchema,
  modeTransitionSchema,
  createDefaultNotificationOnlyConfig,
  createDailySummary,
  createConcerningPattern,
  determineSummaryStatus,
  getNotificationOnlyDescription,
  getModeTransitionMessage,
  type ModeTransition,
} from './notificationOnlyMode'

describe('NotificationOnlyMode Data Model - Story 37.3 Task 1', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-12-15T12:00:00Z'))
  })

  describe('Constants', () => {
    it('should define 95 as trust threshold', () => {
      expect(NOTIFICATION_ONLY_TRUST_THRESHOLD).toBe(95)
    })

    it('should require 30 days at threshold', () => {
      expect(NOTIFICATION_ONLY_DURATION_DAYS).toBe(30)
    })

    it('should require ready-for-independence milestone', () => {
      expect(NOTIFICATION_ONLY_MILESTONE).toBe('ready-for-independence')
    })
  })

  describe('NotificationOnlyConfig Schema', () => {
    it('should validate valid config', () => {
      const config = {
        childId: 'child-1',
        enabled: false,
        enabledAt: null,
        qualifiedAt: null,
        dailySummaryEnabled: true,
        timeLimitsStillEnforced: true,
      }

      const result = notificationOnlyConfigSchema.safeParse(config)
      expect(result.success).toBe(true)
    })

    it('should validate enabled config with dates', () => {
      const config = {
        childId: 'child-1',
        enabled: true,
        enabledAt: new Date('2024-12-01'),
        qualifiedAt: new Date('2024-11-15'),
        dailySummaryEnabled: true,
        timeLimitsStillEnforced: false,
      }

      const result = notificationOnlyConfigSchema.safeParse(config)
      expect(result.success).toBe(true)
    })

    it('should reject empty childId', () => {
      const config = {
        childId: '',
        enabled: false,
        enabledAt: null,
        qualifiedAt: null,
        dailySummaryEnabled: true,
        timeLimitsStillEnforced: true,
      }

      const result = notificationOnlyConfigSchema.safeParse(config)
      expect(result.success).toBe(false)
    })
  })

  describe('ConcerningPattern Schema', () => {
    it('should validate excessive usage pattern', () => {
      const pattern = {
        type: 'excessive-usage',
        description: 'Usage 3x normal level',
        severity: 'medium',
        detectedAt: new Date(),
      }

      const result = concerningPatternSchema.safeParse(pattern)
      expect(result.success).toBe(true)
    })

    it('should validate late night usage pattern', () => {
      const pattern = {
        type: 'late-night-usage',
        description: 'Device used past 11pm bedtime',
        severity: 'high',
        detectedAt: new Date(),
        context: { time: '11:30pm', bedtime: '11:00pm' },
      }

      const result = concerningPatternSchema.safeParse(pattern)
      expect(result.success).toBe(true)
    })

    it('should reject invalid pattern type', () => {
      const pattern = {
        type: 'unknown-pattern',
        description: 'Some pattern',
        severity: 'low',
        detectedAt: new Date(),
      }

      const result = concerningPatternSchema.safeParse(pattern)
      expect(result.success).toBe(false)
    })
  })

  describe('DailySummary Schema', () => {
    it('should validate complete daily summary', () => {
      const summary = {
        childId: 'child-1',
        date: new Date(),
        totalUsageMinutes: 180,
        topApps: [
          { appName: 'YouTube', usageMinutes: 60 },
          { appName: 'Minecraft', usageMinutes: 45 },
        ],
        concerningPatterns: [],
        timeLimitsReached: false,
        status: 'normal',
      }

      const result = dailySummarySchema.safeParse(summary)
      expect(result.success).toBe(true)
    })

    it('should validate summary with concerning patterns', () => {
      const summary = {
        childId: 'child-1',
        date: new Date(),
        totalUsageMinutes: 300,
        topApps: [],
        concerningPatterns: [
          {
            type: 'excessive-usage',
            description: 'High usage',
            severity: 'medium',
            detectedAt: new Date(),
          },
        ],
        timeLimitsReached: true,
        status: 'attention-needed',
      }

      const result = dailySummarySchema.safeParse(summary)
      expect(result.success).toBe(true)
    })

    it('should limit topApps to 5', () => {
      const summary = {
        childId: 'child-1',
        date: new Date(),
        totalUsageMinutes: 180,
        topApps: Array(10).fill({ appName: 'App', usageMinutes: 10 }),
        concerningPatterns: [],
        timeLimitsReached: false,
        status: 'normal',
      }

      const result = dailySummarySchema.safeParse(summary)
      expect(result.success).toBe(false) // Max 5 apps
    })
  })

  describe('ModeTransition Schema', () => {
    it('should validate mode enable transition', () => {
      const transition = {
        childId: 'child-1',
        fromEnabled: false,
        toEnabled: true,
        reason: 'milestone-achieved',
        transitionedAt: new Date(),
      }

      const result = modeTransitionSchema.safeParse(transition)
      expect(result.success).toBe(true)
    })

    it('should validate mode disable transition with notes', () => {
      const transition = {
        childId: 'child-1',
        fromEnabled: true,
        toEnabled: false,
        reason: 'trust-regression',
        transitionedAt: new Date(),
        notes: 'Trust score dropped below 90',
      }

      const result = modeTransitionSchema.safeParse(transition)
      expect(result.success).toBe(true)
    })

    it('should validate all transition reasons', () => {
      const reasons = [
        'milestone-achieved',
        'trust-regression',
        'parent-override',
        'child-request',
        'system-automatic',
      ]

      for (const reason of reasons) {
        const transition = {
          childId: 'child-1',
          fromEnabled: false,
          toEnabled: true,
          reason,
          transitionedAt: new Date(),
        }

        const result = modeTransitionSchema.safeParse(transition)
        expect(result.success).toBe(true)
      }
    })
  })

  describe('createDefaultNotificationOnlyConfig', () => {
    it('should create disabled config by default', () => {
      const config = createDefaultNotificationOnlyConfig('child-1')

      expect(config.childId).toBe('child-1')
      expect(config.enabled).toBe(false)
      expect(config.enabledAt).toBeNull()
      expect(config.qualifiedAt).toBeNull()
    })

    it('should enable daily summaries by default', () => {
      const config = createDefaultNotificationOnlyConfig('child-1')

      expect(config.dailySummaryEnabled).toBe(true)
    })

    it('should enforce time limits by default', () => {
      const config = createDefaultNotificationOnlyConfig('child-1')

      expect(config.timeLimitsStillEnforced).toBe(true)
    })
  })

  describe('createDailySummary', () => {
    it('should create summary with normal status', () => {
      const summary = createDailySummary({
        childId: 'child-1',
        date: new Date(),
        totalUsageMinutes: 120,
        topApps: [{ appName: 'YouTube', usageMinutes: 60 }],
        concerningPatterns: [],
        timeLimitsReached: false,
      })

      expect(summary.status).toBe('normal')
      expect(summary.concerningPatterns).toHaveLength(0)
    })

    it('should create summary with attention-needed status', () => {
      const summary = createDailySummary({
        childId: 'child-1',
        date: new Date(),
        totalUsageMinutes: 200,
        topApps: [],
        concerningPatterns: [createConcerningPattern('excessive-usage', 'High usage', 'medium')],
        timeLimitsReached: false,
      })

      expect(summary.status).toBe('attention-needed')
    })

    it('should create summary with critical status', () => {
      const summary = createDailySummary({
        childId: 'child-1',
        date: new Date(),
        totalUsageMinutes: 300,
        topApps: [],
        concerningPatterns: [
          createConcerningPattern('late-night-usage', 'Used past bedtime', 'high'),
        ],
        timeLimitsReached: true,
      })

      expect(summary.status).toBe('critical')
    })

    it('should limit top apps to 5', () => {
      const manyApps = Array(10)
        .fill(null)
        .map((_, i) => ({ appName: `App${i}`, usageMinutes: 10 }))

      const summary = createDailySummary({
        childId: 'child-1',
        date: new Date(),
        totalUsageMinutes: 100,
        topApps: manyApps,
        concerningPatterns: [],
        timeLimitsReached: false,
      })

      expect(summary.topApps).toHaveLength(5)
    })
  })

  describe('createConcerningPattern', () => {
    it('should create pattern with current timestamp', () => {
      const pattern = createConcerningPattern('excessive-usage', 'High usage', 'medium')

      expect(pattern.type).toBe('excessive-usage')
      expect(pattern.description).toBe('High usage')
      expect(pattern.severity).toBe('medium')
      expect(pattern.detectedAt).toEqual(new Date('2024-12-15T12:00:00Z'))
    })

    it('should include context if provided', () => {
      const pattern = createConcerningPattern('late-night-usage', 'Used past bedtime', 'high', {
        time: '11:30pm',
        bedtime: '11:00pm',
      })

      expect(pattern.context).toEqual({ time: '11:30pm', bedtime: '11:00pm' })
    })
  })

  describe('determineSummaryStatus', () => {
    it('should return normal for no patterns', () => {
      expect(determineSummaryStatus([])).toBe('normal')
    })

    it('should return normal for low severity patterns', () => {
      const patterns = [createConcerningPattern('new-app-category', 'New app', 'low')]
      expect(determineSummaryStatus(patterns)).toBe('normal')
    })

    it('should return attention-needed for medium severity', () => {
      const patterns = [createConcerningPattern('excessive-usage', 'High usage', 'medium')]
      expect(determineSummaryStatus(patterns)).toBe('attention-needed')
    })

    it('should return critical for high severity', () => {
      const patterns = [createConcerningPattern('late-night-usage', 'Past bedtime', 'high')]
      expect(determineSummaryStatus(patterns)).toBe('critical')
    })

    it('should prioritize critical over attention-needed', () => {
      const patterns = [
        createConcerningPattern('excessive-usage', 'High usage', 'medium'),
        createConcerningPattern('late-night-usage', 'Past bedtime', 'high'),
      ]
      expect(determineSummaryStatus(patterns)).toBe('critical')
    })
  })

  describe('getNotificationOnlyDescription', () => {
    it('should return child-friendly message for child', () => {
      const message = getNotificationOnlyDescription('child')

      expect(message).toBe("You're in notification-only mode - we trust you")
    })

    it('should return informative message for parent', () => {
      const message = getNotificationOnlyDescription('parent')

      expect(message).toContain('daily summaries')
      expect(message).toContain('instead of screenshots')
    })
  })

  describe('getModeTransitionMessage', () => {
    describe('enabling mode', () => {
      const enableTransition: ModeTransition = {
        childId: 'child-1',
        fromEnabled: false,
        toEnabled: true,
        reason: 'milestone-achieved',
        transitionedAt: new Date(),
      }

      it('should return celebratory message for child', () => {
        const message = getModeTransitionMessage(enableTransition, 'Emma', 'child')

        expect(message).toContain('Congratulations')
        expect(message).toContain('notification-only mode')
        expect(message).toContain('independence')
      })

      it('should return recognition message for parent', () => {
        const message = getModeTransitionMessage(enableTransition, 'Emma', 'parent')

        expect(message).toContain('Emma')
        expect(message).toContain('notification-only mode')
        expect(message).toContain('maturity')
      })
    })

    describe('disabling mode', () => {
      const disableTransition: ModeTransition = {
        childId: 'child-1',
        fromEnabled: true,
        toEnabled: false,
        reason: 'trust-regression',
        transitionedAt: new Date(),
      }

      it('should return supportive message for child', () => {
        const message = getModeTransitionMessage(disableTransition, 'Emma', 'child')

        expect(message).toContain('stepping back')
        expect(message).toContain("Let's talk")
      })

      it('should suggest conversation for parent', () => {
        const message = getModeTransitionMessage(disableTransition, 'Emma', 'parent')

        expect(message).toContain('Emma')
        expect(message).toContain('conversation')
      })
    })
  })
})
