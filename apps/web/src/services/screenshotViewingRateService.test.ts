/**
 * Screenshot Viewing Rate Service Tests - Story 3A.5
 *
 * Tests for tracking screenshot viewing rates and threshold detection.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  VIEWING_RATE_CONFIG,
  getViewEvents,
  filterToWindow,
  trackScreenshotView,
  getViewingRate,
  checkThresholdExceeded,
  sendViewingRateAlert,
  clearViewEvents,
  hasAlertBeenSentThisSession,
  markAlertSentThisSession,
} from './screenshotViewingRateService'

// Mock Firebase
const mockCallableFunction = vi.fn()

vi.mock('firebase/functions', () => ({
  httpsCallable: () => mockCallableFunction,
}))

vi.mock('../lib/firebase', () => ({
  getFunctionsInstance: () => ({}),
}))

// Mock sessionStorage
const mockSessionStorage: Record<string, string> = {}
const mockSessionStorageAPI = {
  getItem: vi.fn((key: string) => mockSessionStorage[key] || null),
  setItem: vi.fn((key: string, value: string) => {
    mockSessionStorage[key] = value
  }),
  removeItem: vi.fn((key: string) => {
    delete mockSessionStorage[key]
  }),
  clear: vi.fn(() => {
    Object.keys(mockSessionStorage).forEach((key) => delete mockSessionStorage[key])
  }),
  length: 0,
  key: vi.fn(),
}

describe('screenshotViewingRateService - Story 3A.5', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSessionStorageAPI.clear()

    // Setup window.sessionStorage mock
    Object.defineProperty(global, 'window', {
      value: {
        sessionStorage: mockSessionStorageAPI,
      },
      writable: true,
    })
  })

  afterEach(() => {
    // Clean up
    Object.defineProperty(global, 'window', {
      value: undefined,
      writable: true,
    })
  })

  describe('VIEWING_RATE_CONFIG', () => {
    it('should have threshold of 50 (AC1: hardcoded, not configurable)', () => {
      expect(VIEWING_RATE_CONFIG.threshold).toBe(50)
    })

    it('should have windowMinutes of 60', () => {
      expect(VIEWING_RATE_CONFIG.windowMinutes).toBe(60)
    })
  })

  describe('trackScreenshotView', () => {
    it('should add view event to storage', () => {
      trackScreenshotView('user-1', 'screenshot-1')

      expect(mockSessionStorageAPI.setItem).toHaveBeenCalled()
      const events = getViewEvents('user-1')
      expect(events).toHaveLength(1)
    })

    it('should include timestamp in event', () => {
      const before = Date.now()
      trackScreenshotView('user-1')
      const after = Date.now()

      const events = getViewEvents('user-1')
      expect(events[0].timestamp).toBeGreaterThanOrEqual(before)
      expect(events[0].timestamp).toBeLessThanOrEqual(after)
    })

    it('should track multiple views', () => {
      trackScreenshotView('user-1', 'screenshot-1')
      trackScreenshotView('user-1', 'screenshot-2')
      trackScreenshotView('user-1', 'screenshot-3')

      const events = getViewEvents('user-1')
      expect(events).toHaveLength(3)
    })

    it('should separate views by user', () => {
      trackScreenshotView('user-1', 'screenshot-1')
      trackScreenshotView('user-2', 'screenshot-2')

      expect(getViewEvents('user-1')).toHaveLength(1)
      expect(getViewEvents('user-2')).toHaveLength(1)
    })
  })

  describe('filterToWindow', () => {
    it('should keep events within 60 minute window', () => {
      const now = Date.now()
      const events = [
        { timestamp: now - 30 * 60 * 1000, screenshotId: 's1' }, // 30 min ago
        { timestamp: now - 45 * 60 * 1000, screenshotId: 's2' }, // 45 min ago
        { timestamp: now - 5 * 60 * 1000, screenshotId: 's3' }, // 5 min ago
      ]

      const filtered = filterToWindow(events)
      expect(filtered).toHaveLength(3)
    })

    it('should exclude events older than 60 minutes', () => {
      const now = Date.now()
      const events = [
        { timestamp: now - 61 * 60 * 1000, screenshotId: 's1' }, // 61 min ago
        { timestamp: now - 90 * 60 * 1000, screenshotId: 's2' }, // 90 min ago
        { timestamp: now - 5 * 60 * 1000, screenshotId: 's3' }, // 5 min ago
      ]

      const filtered = filterToWindow(events)
      expect(filtered).toHaveLength(1)
      expect(filtered[0].screenshotId).toBe('s3')
    })

    it('should return empty array for all old events', () => {
      const now = Date.now()
      const events = [
        { timestamp: now - 120 * 60 * 1000, screenshotId: 's1' }, // 2 hours ago
        { timestamp: now - 180 * 60 * 1000, screenshotId: 's2' }, // 3 hours ago
      ]

      const filtered = filterToWindow(events)
      expect(filtered).toHaveLength(0)
    })
  })

  describe('getViewingRate', () => {
    it('should return 0 for no views', () => {
      expect(getViewingRate('user-1')).toBe(0)
    })

    it('should count views in window', () => {
      trackScreenshotView('user-1')
      trackScreenshotView('user-1')
      trackScreenshotView('user-1')

      expect(getViewingRate('user-1')).toBe(3)
    })
  })

  describe('checkThresholdExceeded', () => {
    it('should return exceeded: false when under threshold', () => {
      // Add 49 views (under threshold of 50)
      for (let i = 0; i < 49; i++) {
        trackScreenshotView('user-1')
      }

      const result = checkThresholdExceeded('user-1')
      expect(result.exceeded).toBe(false)
      expect(result.count).toBe(49)
    })

    it('should return exceeded: false at exactly threshold', () => {
      // Add exactly 50 views (at threshold, not exceeded)
      for (let i = 0; i < 50; i++) {
        trackScreenshotView('user-1')
      }

      const result = checkThresholdExceeded('user-1')
      expect(result.exceeded).toBe(false)
      expect(result.count).toBe(50)
    })

    it('should return exceeded: true when over threshold', () => {
      // Add 51 views (over threshold)
      for (let i = 0; i < 51; i++) {
        trackScreenshotView('user-1')
      }

      const result = checkThresholdExceeded('user-1')
      expect(result.exceeded).toBe(true)
      expect(result.count).toBe(51)
    })

    it('should include window boundaries', () => {
      trackScreenshotView('user-1')

      const result = checkThresholdExceeded('user-1')
      expect(result.windowStart).toBeDefined()
      expect(result.windowEnd).toBeDefined()
      expect(result.windowEnd).toBeGreaterThanOrEqual(result.windowStart)
    })
  })

  describe('sendViewingRateAlert', () => {
    it('should call cloud function with correct parameters', async () => {
      mockCallableFunction.mockResolvedValue({
        data: { success: true, notifiedCount: 1, message: 'Alert sent' },
      })

      await sendViewingRateAlert({
        familyId: 'family-1',
        viewerUid: 'parent-1',
        viewCount: 55,
        timeframeStart: Date.now() - 3600000,
        timeframeEnd: Date.now(),
      })

      expect(mockCallableFunction).toHaveBeenCalledWith({
        familyId: 'family-1',
        viewerUid: 'parent-1',
        viewCount: 55,
        timeframeStart: expect.any(Number),
        timeframeEnd: expect.any(Number),
      })
    })

    it('should return success response', async () => {
      mockCallableFunction.mockResolvedValue({
        data: { success: true, notifiedCount: 1, message: 'Alert sent to 1 guardian(s)' },
      })

      const result = await sendViewingRateAlert({
        familyId: 'family-1',
        viewerUid: 'parent-1',
        viewCount: 55,
        timeframeStart: Date.now() - 3600000,
        timeframeEnd: Date.now(),
      })

      expect(result.success).toBe(true)
      expect(result.notifiedCount).toBe(1)
    })
  })

  describe('clearViewEvents', () => {
    it('should remove all events for user', () => {
      trackScreenshotView('user-1')
      trackScreenshotView('user-1')
      expect(getViewEvents('user-1').length).toBeGreaterThan(0)

      clearViewEvents('user-1')

      expect(mockSessionStorageAPI.removeItem).toHaveBeenCalled()
    })
  })

  describe('hasAlertBeenSentThisSession', () => {
    it('should return false initially', () => {
      expect(hasAlertBeenSentThisSession('user-1')).toBe(false)
    })

    it('should return true after marking as sent', () => {
      markAlertSentThisSession('user-1')
      expect(hasAlertBeenSentThisSession('user-1')).toBe(true)
    })

    it('should be user-specific', () => {
      markAlertSentThisSession('user-1')

      expect(hasAlertBeenSentThisSession('user-1')).toBe(true)
      expect(hasAlertBeenSentThisSession('user-2')).toBe(false)
    })
  })
})
