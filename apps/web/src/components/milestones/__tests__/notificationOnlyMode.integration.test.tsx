/**
 * Notification-Only Mode Integration Tests - Story 37.3 Task 5
 *
 * Integration tests for the complete notification-only mode system.
 * Tests all acceptance criteria together.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import {
  NOTIFICATION_ONLY_TRUST_THRESHOLD,
  NOTIFICATION_ONLY_DURATION_DAYS,
  isQualifiedForNotificationOnlyMode,
  enableNotificationOnlyMode,
  disableNotificationOnlyMode,
  shouldCaptureScreenshotsNotificationMode as shouldCaptureScreenshots,
  shouldEnforceTimeLimitsNotificationMode as shouldEnforceTimeLimits,
  generateDailySummary,
  formatSummaryForParent,
  createDefaultNotificationOnlyConfig,
  DEFAULT_PATTERN_CONFIG,
  type UsageData,
  type NotificationOnlyConfig,
} from '@fledgely/shared'
import { NotificationOnlyModeIndicator } from '../NotificationOnlyModeIndicator'

describe('Notification-Only Mode Integration - Story 37.3 Task 5', () => {
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

  describe('AC1: Notification-only mode disables screenshot capture', () => {
    it('should disable screenshots when mode is active', () => {
      const config: NotificationOnlyConfig = {
        ...createDefaultNotificationOnlyConfig('child-1'),
        enabled: true,
        enabledAt: new Date(),
      }

      expect(shouldCaptureScreenshots(config)).toBe(false)
    })

    it('should enable screenshots when mode is inactive', () => {
      const config = createDefaultNotificationOnlyConfig('child-1')

      expect(shouldCaptureScreenshots(config)).toBe(true)
    })

    it('should disable screenshots after enabling mode', () => {
      const { config } = enableNotificationOnlyMode('child-1')

      expect(shouldCaptureScreenshots(config)).toBe(false)
    })

    it('should re-enable screenshots after disabling mode', () => {
      const { config: enabledConfig } = enableNotificationOnlyMode('child-1')
      const { config: disabledConfig } = disableNotificationOnlyMode(
        'child-1',
        enabledConfig,
        'trust-regression'
      )

      expect(shouldCaptureScreenshots(disabledConfig)).toBe(true)
    })
  })

  describe('AC2: Parents receive daily summary', () => {
    it('should generate daily summary with usage data', () => {
      const usageData: UsageData[] = [createUsageData({ appName: 'YouTube', usageMinutes: 180 })]

      const summary = generateDailySummary('child-1', new Date(), usageData)

      expect(summary.totalUsageMinutes).toBe(180)
    })

    it('should format summary for parent notification', () => {
      const usageData: UsageData[] = [createUsageData({ appName: 'YouTube', usageMinutes: 180 })]

      const summary = generateDailySummary('child-1', new Date(), usageData)
      const formatted = formatSummaryForParent(summary, 'Emma')

      // AC2: "Emma used device 3 hours today"
      expect(formatted).toContain('Emma')
      expect(formatted).toContain('3 hours')
    })

    it('should show summary in parent indicator', () => {
      const summary = generateDailySummary('child-1', new Date(), [
        createUsageData({ usageMinutes: 180 }),
      ])

      render(
        <NotificationOnlyModeIndicator
          config={{
            ...createDefaultNotificationOnlyConfig('child-1'),
            enabled: true,
            enabledAt: new Date(),
          }}
          viewerType="parent"
          childName="Emma"
          latestSummary={summary}
        />
      )

      expect(screen.getByTestId('summary-preview')).toBeInTheDocument()
      expect(screen.getByTestId('usage-summary')).toHaveTextContent('3 hours')
    })
  })

  describe('AC3: Only concerning patterns trigger alerts', () => {
    it('should not alert for normal usage', () => {
      const usageData: UsageData[] = [createUsageData({ usageMinutes: 60 })]

      const summary = generateDailySummary('child-1', new Date(), usageData)

      expect(summary.concerningPatterns).toHaveLength(0)
      expect(summary.status).toBe('normal')
    })

    it('should alert for excessive usage', () => {
      const config = {
        ...DEFAULT_PATTERN_CONFIG,
        normalUsageMinutes: 60,
        excessiveMultiplier: 3,
      }

      const usageData: UsageData[] = [createUsageData({ usageMinutes: 200 })]

      const summary = generateDailySummary('child-1', new Date(), usageData, config)

      expect(summary.concerningPatterns.some((p) => p.type === 'excessive-usage')).toBe(true)
    })

    it('should alert for late night usage', () => {
      const usageData: UsageData[] = [
        createUsageData({
          endTime: new Date('2024-12-15T23:30:00Z'),
          usageMinutes: 30,
        }),
      ]

      const summary = generateDailySummary('child-1', new Date(), usageData)

      expect(summary.concerningPatterns.some((p) => p.type === 'late-night-usage')).toBe(true)
    })

    it('should display pattern count in indicator', () => {
      const summary = generateDailySummary(
        'child-1',
        new Date(),
        [createUsageData({ usageMinutes: 400 })],
        { ...DEFAULT_PATTERN_CONFIG, normalUsageMinutes: 60, excessiveMultiplier: 3 }
      )

      render(
        <NotificationOnlyModeIndicator
          config={{
            ...createDefaultNotificationOnlyConfig('child-1'),
            enabled: true,
            enabledAt: new Date(),
          }}
          viewerType="parent"
          childName="Emma"
          latestSummary={summary}
        />
      )

      expect(screen.getByTestId('has-concerns')).toBeInTheDocument()
    })
  })

  describe('AC4: Time limits still enforced if configured', () => {
    it('should enforce time limits when configured', () => {
      const config: NotificationOnlyConfig = {
        ...createDefaultNotificationOnlyConfig('child-1'),
        enabled: true,
        enabledAt: new Date(),
        timeLimitsStillEnforced: true,
      }

      expect(shouldEnforceTimeLimits(config)).toBe(true)
    })

    it('should not enforce time limits when disabled', () => {
      const config: NotificationOnlyConfig = {
        ...createDefaultNotificationOnlyConfig('child-1'),
        enabled: true,
        enabledAt: new Date(),
        timeLimitsStillEnforced: false,
      }

      expect(shouldEnforceTimeLimits(config)).toBe(false)
    })

    it('should show time limits status in child indicator', () => {
      render(
        <NotificationOnlyModeIndicator
          config={{
            ...createDefaultNotificationOnlyConfig('child-1'),
            enabled: true,
            enabledAt: new Date(),
            timeLimitsStillEnforced: true,
          }}
          viewerType="child"
          childName="Emma"
        />
      )

      expect(screen.getByTestId('time-limits-status')).toHaveTextContent(
        'Time limits are still active'
      )
    })
  })

  describe('AC5: Child sees trust message', () => {
    it('should show AC5 message in child indicator', () => {
      render(
        <NotificationOnlyModeIndicator
          config={{
            ...createDefaultNotificationOnlyConfig('child-1'),
            enabled: true,
            enabledAt: new Date(),
          }}
          viewerType="child"
          childName="Emma"
        />
      )

      // AC5: Child sees "You're in notification-only mode - we trust you"
      expect(screen.getByTestId('status-message')).toHaveTextContent(
        "You're in notification-only mode - we trust you"
      )
    })

    it('should show privacy message', () => {
      render(
        <NotificationOnlyModeIndicator
          config={{
            ...createDefaultNotificationOnlyConfig('child-1'),
            enabled: true,
            enabledAt: new Date(),
          }}
          viewerType="child"
          childName="Emma"
        />
      )

      expect(screen.getByTestId('privacy-message')).toHaveTextContent('Screenshots are paused')
    })

    it('should show near-graduation badge', () => {
      render(
        <NotificationOnlyModeIndicator
          config={{
            ...createDefaultNotificationOnlyConfig('child-1'),
            enabled: true,
            enabledAt: new Date(),
          }}
          viewerType="child"
          childName="Emma"
        />
      )

      expect(screen.getByTestId('near-graduation-badge')).toHaveTextContent('Near Graduation')
    })
  })

  describe('AC6: Mode qualification (95+ trust for extended period)', () => {
    it('should require 95% trust threshold', () => {
      expect(NOTIFICATION_ONLY_TRUST_THRESHOLD).toBe(95)
    })

    it('should require 30 days at threshold', () => {
      expect(NOTIFICATION_ONLY_DURATION_DAYS).toBe(30)
    })

    it('should qualify at 95+ for 30+ days', () => {
      expect(isQualifiedForNotificationOnlyMode(95, 30)).toBe(true)
      expect(isQualifiedForNotificationOnlyMode(100, 45)).toBe(true)
    })

    it('should not qualify below 95%', () => {
      expect(isQualifiedForNotificationOnlyMode(94, 30)).toBe(false)
      expect(isQualifiedForNotificationOnlyMode(90, 60)).toBe(false)
    })

    it('should not qualify below 30 days', () => {
      expect(isQualifiedForNotificationOnlyMode(95, 29)).toBe(false)
      expect(isQualifiedForNotificationOnlyMode(100, 15)).toBe(false)
    })

    it('should show qualification progress in indicator', () => {
      render(
        <NotificationOnlyModeIndicator
          config={createDefaultNotificationOnlyConfig('child-1')}
          viewerType="child"
          childName="Emma"
          qualificationProgress={50}
          daysUntilQualification={15}
        />
      )

      expect(screen.getByTestId('qualification-progress')).toBeInTheDocument()
      expect(screen.getByTestId('qualification-message')).toHaveTextContent(
        '15 days until you qualify'
      )
    })
  })

  describe('Mode transitions', () => {
    it('should properly enable mode', () => {
      const { config, transition } = enableNotificationOnlyMode('child-1')

      expect(config.enabled).toBe(true)
      expect(config.enabledAt).not.toBeNull()
      expect(transition.toEnabled).toBe(true)
    })

    it('should properly disable mode', () => {
      const { config: enabled } = enableNotificationOnlyMode('child-1')
      const { config: disabled, transition } = disableNotificationOnlyMode(
        'child-1',
        enabled,
        'trust-regression'
      )

      expect(disabled.enabled).toBe(false)
      expect(disabled.enabledAt).toBeNull()
      expect(transition.toEnabled).toBe(false)
      expect(transition.reason).toBe('trust-regression')
    })

    it('should preserve qualification history on disable', () => {
      const { config: enabled } = enableNotificationOnlyMode('child-1')
      const { config: disabled } = disableNotificationOnlyMode(
        'child-1',
        enabled,
        'trust-regression'
      )

      expect(disabled.qualifiedAt).not.toBeNull()
    })
  })

  describe('Complete workflow', () => {
    it('should support full qualification to active mode flow', () => {
      // 1. Child qualifies
      expect(isQualifiedForNotificationOnlyMode(96, 35)).toBe(true)

      // 2. Mode is enabled
      const { config } = enableNotificationOnlyMode('child-1')

      // 3. Screenshots disabled
      expect(shouldCaptureScreenshots(config)).toBe(false)

      // 4. Time limits can be enforced
      expect(shouldEnforceTimeLimits(config)).toBe(true)

      // 5. Daily summary can be generated
      const usageData: UsageData[] = [createUsageData({ appName: 'Minecraft', usageMinutes: 120 })]
      const summary = generateDailySummary('child-1', new Date(), usageData)

      expect(summary.totalUsageMinutes).toBe(120)
    })

    it('should support regression handling', () => {
      // 1. Mode is active
      const { config: active } = enableNotificationOnlyMode('child-1')
      expect(shouldCaptureScreenshots(active)).toBe(false)

      // 2. Trust drops, mode disabled
      const { config: inactive } = disableNotificationOnlyMode(
        'child-1',
        active,
        'trust-regression'
      )

      // 3. Screenshots re-enabled
      expect(shouldCaptureScreenshots(inactive)).toBe(true)

      // 4. Qualification history preserved
      expect(inactive.qualifiedAt).not.toBeNull()
    })
  })
})
