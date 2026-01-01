/**
 * NotificationOnlyModeService Tests - Story 37.3 Task 2
 *
 * Tests for managing notification-only mode transitions.
 * AC1: Notification-only mode disables screenshot capture
 * AC6: Mode represents near-graduation status (95+ trust for extended period)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  isQualifiedForNotificationOnlyMode,
  getDaysUntilQualification,
  getQualificationProgress,
  isInNotificationOnlyMode,
  hasEverQualified,
  getTimeSinceEnabled,
  enableNotificationOnlyMode,
  disableNotificationOnlyMode,
  updateModeSettings,
  shouldCaptureScreenshots,
  getCaptureStatusMessage,
  shouldEnforceTimeLimits,
  getTimeLimitsMessage,
  getNotificationOnlyModeStatus,
  getQualificationMessage,
} from './notificationOnlyModeService'
import {
  NOTIFICATION_ONLY_TRUST_THRESHOLD,
  NOTIFICATION_ONLY_DURATION_DAYS,
  createDefaultNotificationOnlyConfig,
  type NotificationOnlyConfig,
} from '../contracts/notificationOnlyMode'

describe('NotificationOnlyModeService - Story 37.3 Task 2', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-12-15T12:00:00Z'))
  })

  describe('isQualifiedForNotificationOnlyMode', () => {
    it('should return true when meeting both thresholds', () => {
      expect(isQualifiedForNotificationOnlyMode(95, 30)).toBe(true)
      expect(isQualifiedForNotificationOnlyMode(100, 45)).toBe(true)
    })

    it('should return false when trust score is too low', () => {
      expect(isQualifiedForNotificationOnlyMode(94, 30)).toBe(false)
      expect(isQualifiedForNotificationOnlyMode(80, 60)).toBe(false)
    })

    it('should return false when duration is too short', () => {
      expect(isQualifiedForNotificationOnlyMode(95, 29)).toBe(false)
      expect(isQualifiedForNotificationOnlyMode(100, 15)).toBe(false)
    })

    it('should use configured thresholds', () => {
      expect(NOTIFICATION_ONLY_TRUST_THRESHOLD).toBe(95)
      expect(NOTIFICATION_ONLY_DURATION_DAYS).toBe(30)
    })
  })

  describe('getDaysUntilQualification', () => {
    it('should return 0 when already qualified', () => {
      expect(getDaysUntilQualification(95, 30)).toBe(0)
      expect(getDaysUntilQualification(100, 45)).toBe(0)
    })

    it('should return remaining days when not yet qualified', () => {
      expect(getDaysUntilQualification(95, 20)).toBe(10)
      expect(getDaysUntilQualification(100, 0)).toBe(30)
    })

    it('should return -1 when trust score too low', () => {
      expect(getDaysUntilQualification(90, 30)).toBe(-1)
      expect(getDaysUntilQualification(50, 100)).toBe(-1)
    })
  })

  describe('getQualificationProgress', () => {
    it('should return 100 when fully qualified', () => {
      expect(getQualificationProgress(95, 30)).toBe(100)
      expect(getQualificationProgress(100, 60)).toBe(100)
    })

    it('should return 0 when trust score too low', () => {
      expect(getQualificationProgress(90, 30)).toBe(0)
      expect(getQualificationProgress(80, 100)).toBe(0)
    })

    it('should return percentage when in progress', () => {
      expect(getQualificationProgress(95, 15)).toBe(50)
      expect(getQualificationProgress(95, 10)).toBe(33)
    })
  })

  describe('isInNotificationOnlyMode', () => {
    it('should return true when enabled with date', () => {
      const config: NotificationOnlyConfig = {
        ...createDefaultNotificationOnlyConfig('child-1'),
        enabled: true,
        enabledAt: new Date(),
      }

      expect(isInNotificationOnlyMode(config)).toBe(true)
    })

    it('should return false when not enabled', () => {
      const config = createDefaultNotificationOnlyConfig('child-1')

      expect(isInNotificationOnlyMode(config)).toBe(false)
    })

    it('should return false when enabled but no date', () => {
      const config: NotificationOnlyConfig = {
        ...createDefaultNotificationOnlyConfig('child-1'),
        enabled: true,
        enabledAt: null,
      }

      expect(isInNotificationOnlyMode(config)).toBe(false)
    })
  })

  describe('hasEverQualified', () => {
    it('should return true when qualifiedAt is set', () => {
      const config: NotificationOnlyConfig = {
        ...createDefaultNotificationOnlyConfig('child-1'),
        qualifiedAt: new Date('2024-01-01'),
      }

      expect(hasEverQualified(config)).toBe(true)
    })

    it('should return false when never qualified', () => {
      const config = createDefaultNotificationOnlyConfig('child-1')

      expect(hasEverQualified(config)).toBe(false)
    })
  })

  describe('getTimeSinceEnabled', () => {
    it('should return time in ms since enabled', () => {
      const enabledAt = new Date('2024-12-14T12:00:00Z') // 24 hours ago
      const config: NotificationOnlyConfig = {
        ...createDefaultNotificationOnlyConfig('child-1'),
        enabled: true,
        enabledAt,
      }

      expect(getTimeSinceEnabled(config)).toBe(24 * 60 * 60 * 1000)
    })

    it('should return null when not enabled', () => {
      const config = createDefaultNotificationOnlyConfig('child-1')

      expect(getTimeSinceEnabled(config)).toBeNull()
    })
  })

  describe('enableNotificationOnlyMode', () => {
    it('should enable mode with current timestamp', () => {
      const { config, transition } = enableNotificationOnlyMode('child-1')

      expect(config.enabled).toBe(true)
      expect(config.enabledAt).toEqual(new Date('2024-12-15T12:00:00Z'))
      expect(transition.toEnabled).toBe(true)
      expect(transition.reason).toBe('milestone-achieved')
    })

    it('should set qualifiedAt if not already set', () => {
      const { config } = enableNotificationOnlyMode('child-1')

      expect(config.qualifiedAt).toEqual(new Date('2024-12-15T12:00:00Z'))
    })

    it('should preserve existing qualifiedAt', () => {
      const existingConfig: NotificationOnlyConfig = {
        ...createDefaultNotificationOnlyConfig('child-1'),
        qualifiedAt: new Date('2024-11-01'),
      }

      const { config } = enableNotificationOnlyMode('child-1', existingConfig)

      expect(config.qualifiedAt).toEqual(new Date('2024-11-01'))
    })

    it('should create transition record', () => {
      const { transition } = enableNotificationOnlyMode('child-1')

      expect(transition.childId).toBe('child-1')
      expect(transition.fromEnabled).toBe(false)
      expect(transition.toEnabled).toBe(true)
      expect(transition.transitionedAt).toEqual(new Date('2024-12-15T12:00:00Z'))
    })

    it('should accept custom reason', () => {
      const { transition } = enableNotificationOnlyMode('child-1', null, 'system-automatic')

      expect(transition.reason).toBe('system-automatic')
    })
  })

  describe('disableNotificationOnlyMode', () => {
    it('should disable mode', () => {
      const existingConfig: NotificationOnlyConfig = {
        ...createDefaultNotificationOnlyConfig('child-1'),
        enabled: true,
        enabledAt: new Date('2024-12-01'),
        qualifiedAt: new Date('2024-11-01'),
      }

      const { config, transition } = disableNotificationOnlyMode(
        'child-1',
        existingConfig,
        'trust-regression'
      )

      expect(config.enabled).toBe(false)
      expect(config.enabledAt).toBeNull()
      expect(transition.toEnabled).toBe(false)
      expect(transition.reason).toBe('trust-regression')
    })

    it('should preserve qualifiedAt history', () => {
      const existingConfig: NotificationOnlyConfig = {
        ...createDefaultNotificationOnlyConfig('child-1'),
        enabled: true,
        enabledAt: new Date('2024-12-01'),
        qualifiedAt: new Date('2024-11-01'),
      }

      const { config } = disableNotificationOnlyMode('child-1', existingConfig, 'trust-regression')

      expect(config.qualifiedAt).toEqual(new Date('2024-11-01'))
    })

    it('should include notes when provided', () => {
      const existingConfig: NotificationOnlyConfig = {
        ...createDefaultNotificationOnlyConfig('child-1'),
        enabled: true,
        enabledAt: new Date(),
      }

      const { transition } = disableNotificationOnlyMode(
        'child-1',
        existingConfig,
        'trust-regression',
        'Trust dropped to 85%'
      )

      expect(transition.notes).toBe('Trust dropped to 85%')
    })
  })

  describe('updateModeSettings', () => {
    it('should update daily summary setting', () => {
      const config = createDefaultNotificationOnlyConfig('child-1')

      const updated = updateModeSettings(config, { dailySummaryEnabled: false })

      expect(updated.dailySummaryEnabled).toBe(false)
    })

    it('should update time limits setting', () => {
      const config = createDefaultNotificationOnlyConfig('child-1')

      const updated = updateModeSettings(config, { timeLimitsStillEnforced: false })

      expect(updated.timeLimitsStillEnforced).toBe(false)
    })

    it('should preserve other settings', () => {
      const config: NotificationOnlyConfig = {
        ...createDefaultNotificationOnlyConfig('child-1'),
        enabled: true,
        enabledAt: new Date(),
      }

      const updated = updateModeSettings(config, { dailySummaryEnabled: false })

      expect(updated.enabled).toBe(true)
      expect(updated.timeLimitsStillEnforced).toBe(true)
    })
  })

  describe('shouldCaptureScreenshots', () => {
    it('should return false when in notification-only mode (AC1)', () => {
      const config: NotificationOnlyConfig = {
        ...createDefaultNotificationOnlyConfig('child-1'),
        enabled: true,
        enabledAt: new Date(),
      }

      expect(shouldCaptureScreenshots(config)).toBe(false)
    })

    it('should return true when not in notification-only mode', () => {
      const config = createDefaultNotificationOnlyConfig('child-1')

      expect(shouldCaptureScreenshots(config)).toBe(true)
    })
  })

  describe('getCaptureStatusMessage', () => {
    const activeConfig: NotificationOnlyConfig = {
      ...createDefaultNotificationOnlyConfig('child-1'),
      enabled: true,
      enabledAt: new Date(),
    }

    it('should return child message for active mode', () => {
      const message = getCaptureStatusMessage(activeConfig, 'child')

      expect(message).toContain('paused')
      expect(message).toContain('maximum privacy')
    })

    it('should return parent message for active mode', () => {
      const message = getCaptureStatusMessage(activeConfig, 'parent')

      expect(message).toContain('paused')
      expect(message).toContain('Daily summaries')
    })

    it('should return active capture message when mode off', () => {
      const config = createDefaultNotificationOnlyConfig('child-1')

      expect(getCaptureStatusMessage(config, 'child')).toContain('captured')
    })
  })

  describe('shouldEnforceTimeLimits', () => {
    it('should return true when configured (AC4)', () => {
      const config = createDefaultNotificationOnlyConfig('child-1')

      expect(shouldEnforceTimeLimits(config)).toBe(true)
    })

    it('should return false when disabled', () => {
      const config: NotificationOnlyConfig = {
        ...createDefaultNotificationOnlyConfig('child-1'),
        timeLimitsStillEnforced: false,
      }

      expect(shouldEnforceTimeLimits(config)).toBe(false)
    })
  })

  describe('getTimeLimitsMessage', () => {
    it('should return active message for child in mode', () => {
      const config: NotificationOnlyConfig = {
        ...createDefaultNotificationOnlyConfig('child-1'),
        enabled: true,
        enabledAt: new Date(),
        timeLimitsStillEnforced: true,
      }

      const message = getTimeLimitsMessage(config, 'child')

      expect(message).toContain('still active')
    })

    it('should return not active message when disabled', () => {
      const config: NotificationOnlyConfig = {
        ...createDefaultNotificationOnlyConfig('child-1'),
        enabled: true,
        enabledAt: new Date(),
        timeLimitsStillEnforced: false,
      }

      const message = getTimeLimitsMessage(config, 'child')

      expect(message).toContain('not active')
    })
  })

  describe('getNotificationOnlyModeStatus', () => {
    it('should return AC5 message for child in mode', () => {
      const config: NotificationOnlyConfig = {
        ...createDefaultNotificationOnlyConfig('child-1'),
        enabled: true,
        enabledAt: new Date(),
      }

      const message = getNotificationOnlyModeStatus(config, 'Emma', 'child')

      // AC5: Child sees "You're in notification-only mode - we trust you"
      expect(message).toBe("You're in notification-only mode - we trust you")
    })

    it('should return parent message in mode', () => {
      const config: NotificationOnlyConfig = {
        ...createDefaultNotificationOnlyConfig('child-1'),
        enabled: true,
        enabledAt: new Date(),
      }

      const message = getNotificationOnlyModeStatus(config, 'Emma', 'parent')

      expect(message).toContain('Emma')
      expect(message).toContain('notification-only mode')
    })

    it('should return standard monitoring message when off', () => {
      const config = createDefaultNotificationOnlyConfig('child-1')

      const message = getNotificationOnlyModeStatus(config, 'Emma', 'child')

      expect(message).toContain('Standard monitoring')
    })
  })

  describe('getQualificationMessage', () => {
    it('should prompt to reach threshold when score too low', () => {
      const message = getQualificationMessage(80, 30, 'Emma', 'child')

      expect(message).toContain('Reach')
      expect(message).toContain('95%')
    })

    it('should show days remaining when in progress', () => {
      const message = getQualificationMessage(95, 20, 'Emma', 'child')

      expect(message).toContain('10 more days')
    })

    it('should show qualified message when ready', () => {
      const message = getQualificationMessage(95, 30, 'Emma', 'child')

      expect(message).toContain('qualify')
    })

    it('should include child name for parent view', () => {
      const message = getQualificationMessage(90, 30, 'Emma', 'parent')

      expect(message).toContain('Emma')
    })
  })
})
