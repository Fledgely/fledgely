/**
 * Crisis Guards Tests
 *
 * Story 7.2: Crisis Visit Zero-Data-Path - Task 4
 *
 * Tests the guard implementations for each monitoring flow.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock the crisis protection service
vi.mock('./crisisProtectionService', () => ({
  crisisGuard: {
    shouldBlock: vi.fn(),
    shouldBlockScreenshot: vi.fn(),
    shouldBlockUrlLogging: vi.fn(),
    shouldBlockTimeTracking: vi.fn(),
    shouldBlockNotification: vi.fn(),
    shouldBlockAnalytics: vi.fn(),
  },
}))

import {
  screenshotGuard,
  activityGuard,
  timeTrackingGuard,
  notificationGuard,
  analyticsGuard,
  allMonitoringGuard,
  platformGuard,
  createPlatformGuard,
  type MonitoringGuard,
  type PlatformGuardInterface,
} from './crisisGuards'
import { crisisGuard } from './crisisProtectionService'

const mockCrisisGuard = vi.mocked(crisisGuard)

describe('crisisGuards', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('screenshotGuard (AC: 1)', () => {
    it('delegates to crisisGuard.shouldBlockScreenshot', () => {
      mockCrisisGuard.shouldBlockScreenshot.mockReturnValue(true)

      const result = screenshotGuard.shouldBlock('https://988lifeline.org')

      expect(result).toBe(true)
      expect(mockCrisisGuard.shouldBlockScreenshot).toHaveBeenCalledWith(
        'https://988lifeline.org'
      )
    })

    it('returns false for non-crisis URLs', () => {
      mockCrisisGuard.shouldBlockScreenshot.mockReturnValue(false)

      const result = screenshotGuard.shouldBlock('https://google.com')

      expect(result).toBe(false)
    })

    it('implements MonitoringGuard interface', () => {
      const guard: MonitoringGuard = screenshotGuard
      expect(typeof guard.shouldBlock).toBe('function')
    })
  })

  describe('activityGuard (AC: 2)', () => {
    it('delegates to crisisGuard.shouldBlockUrlLogging', () => {
      mockCrisisGuard.shouldBlockUrlLogging.mockReturnValue(true)

      const result = activityGuard.shouldBlock('https://rainn.org')

      expect(result).toBe(true)
      expect(mockCrisisGuard.shouldBlockUrlLogging).toHaveBeenCalledWith(
        'https://rainn.org'
      )
    })

    it('returns false for non-crisis URLs', () => {
      mockCrisisGuard.shouldBlockUrlLogging.mockReturnValue(false)

      const result = activityGuard.shouldBlock('https://youtube.com')

      expect(result).toBe(false)
    })
  })

  describe('timeTrackingGuard (AC: 3)', () => {
    it('delegates to crisisGuard.shouldBlockTimeTracking', () => {
      mockCrisisGuard.shouldBlockTimeTracking.mockReturnValue(true)

      const result = timeTrackingGuard.shouldBlock('https://thetrevoproject.org')

      expect(result).toBe(true)
      expect(mockCrisisGuard.shouldBlockTimeTracking).toHaveBeenCalledWith(
        'https://thetrevoproject.org'
      )
    })

    it('returns false for non-crisis URLs', () => {
      mockCrisisGuard.shouldBlockTimeTracking.mockReturnValue(false)

      const result = timeTrackingGuard.shouldBlock('https://twitter.com')

      expect(result).toBe(false)
    })
  })

  describe('notificationGuard (AC: 4)', () => {
    it('delegates to crisisGuard.shouldBlockNotification', () => {
      mockCrisisGuard.shouldBlockNotification.mockReturnValue(true)

      const result = notificationGuard.shouldBlock('https://thehotline.org')

      expect(result).toBe(true)
      expect(mockCrisisGuard.shouldBlockNotification).toHaveBeenCalledWith(
        'https://thehotline.org'
      )
    })

    it('returns false for non-crisis URLs', () => {
      mockCrisisGuard.shouldBlockNotification.mockReturnValue(false)

      const result = notificationGuard.shouldBlock('https://instagram.com')

      expect(result).toBe(false)
    })
  })

  describe('analyticsGuard (AC: 5)', () => {
    it('delegates to crisisGuard.shouldBlockAnalytics', () => {
      mockCrisisGuard.shouldBlockAnalytics.mockReturnValue(true)

      const result = analyticsGuard.shouldBlock('https://childhelp.org')

      expect(result).toBe(true)
      expect(mockCrisisGuard.shouldBlockAnalytics).toHaveBeenCalledWith(
        'https://childhelp.org'
      )
    })

    it('returns false for non-crisis URLs', () => {
      mockCrisisGuard.shouldBlockAnalytics.mockReturnValue(false)

      const result = analyticsGuard.shouldBlock('https://tiktok.com')

      expect(result).toBe(false)
    })
  })

  describe('allMonitoringGuard', () => {
    it('delegates to crisisGuard.shouldBlock', () => {
      mockCrisisGuard.shouldBlock.mockReturnValue(true)

      const result = allMonitoringGuard.shouldBlock('https://988lifeline.org')

      expect(result).toBe(true)
      expect(mockCrisisGuard.shouldBlock).toHaveBeenCalledWith(
        'https://988lifeline.org'
      )
    })
  })

  describe('platformGuard', () => {
    it('implements PlatformGuardInterface', () => {
      const guard: PlatformGuardInterface = platformGuard
      expect(typeof guard.shouldBlockScreenshot).toBe('function')
      expect(typeof guard.shouldBlockUrlLogging).toBe('function')
      expect(typeof guard.shouldBlockTimeTracking).toBe('function')
      expect(typeof guard.shouldBlockNotification).toBe('function')
      expect(typeof guard.shouldBlockAnalytics).toBe('function')
      expect(typeof guard.shouldBlockAll).toBe('function')
    })

    it('all methods delegate to crisis check', () => {
      mockCrisisGuard.shouldBlock.mockReturnValue(true)

      const url = 'https://988lifeline.org'
      expect(platformGuard.shouldBlockScreenshot(url)).toBe(true)
      expect(platformGuard.shouldBlockUrlLogging(url)).toBe(true)
      expect(platformGuard.shouldBlockTimeTracking(url)).toBe(true)
      expect(platformGuard.shouldBlockNotification(url)).toBe(true)
      expect(platformGuard.shouldBlockAnalytics(url)).toBe(true)
      expect(platformGuard.shouldBlockAll(url)).toBe(true)
    })
  })

  describe('createPlatformGuard', () => {
    it('creates guard from custom check function', () => {
      const customCheck = vi.fn().mockReturnValue(true)

      const guard = createPlatformGuard(customCheck)

      expect(guard.shouldBlockScreenshot('test')).toBe(true)
      expect(guard.shouldBlockUrlLogging('test')).toBe(true)
      expect(guard.shouldBlockTimeTracking('test')).toBe(true)
      expect(guard.shouldBlockNotification('test')).toBe(true)
      expect(guard.shouldBlockAnalytics('test')).toBe(true)
      expect(guard.shouldBlockAll('test')).toBe(true)

      expect(customCheck).toHaveBeenCalledTimes(6)
    })
  })

  describe('Guard Synchronization', () => {
    it('all guards are synchronous (not async)', () => {
      mockCrisisGuard.shouldBlock.mockReturnValue(false)
      mockCrisisGuard.shouldBlockScreenshot.mockReturnValue(false)
      mockCrisisGuard.shouldBlockUrlLogging.mockReturnValue(false)
      mockCrisisGuard.shouldBlockTimeTracking.mockReturnValue(false)
      mockCrisisGuard.shouldBlockNotification.mockReturnValue(false)
      mockCrisisGuard.shouldBlockAnalytics.mockReturnValue(false)

      const url = 'https://example.com'

      // All should return boolean, not Promise
      const results = [
        screenshotGuard.shouldBlock(url),
        activityGuard.shouldBlock(url),
        timeTrackingGuard.shouldBlock(url),
        notificationGuard.shouldBlock(url),
        analyticsGuard.shouldBlock(url),
        allMonitoringGuard.shouldBlock(url),
      ]

      results.forEach((result) => {
        expect(result).not.toBeInstanceOf(Promise)
        expect(typeof result).toBe('boolean')
      })
    })
  })
})
