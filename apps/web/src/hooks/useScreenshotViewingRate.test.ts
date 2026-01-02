/**
 * useScreenshotViewingRate Hook Tests - Story 3A.5
 *
 * Tests for the hook that integrates screenshot viewing rate tracking.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useScreenshotViewingRate } from './useScreenshotViewingRate'

// Create mock functions
const mockTrackScreenshotView = vi.fn()
const mockGetViewingRate = vi.fn().mockReturnValue(0)
const mockCheckThresholdExceeded = vi.fn().mockReturnValue({
  exceeded: false,
  count: 0,
  windowStart: Date.now() - 3600000,
  windowEnd: Date.now(),
})
const mockSendViewingRateAlert = vi.fn().mockResolvedValue({
  success: true,
  notifiedCount: 1,
  message: 'Alert sent',
})
const mockHasAlertBeenSentThisSession = vi.fn().mockReturnValue(false)
const mockMarkAlertSentThisSession = vi.fn()

// Mock the service module
vi.mock('../services/screenshotViewingRateService', () => ({
  VIEWING_RATE_CONFIG: {
    threshold: 50,
    windowMinutes: 60,
  },
  trackScreenshotView: (...args: unknown[]) => mockTrackScreenshotView(...args),
  getViewingRate: (...args: unknown[]) => mockGetViewingRate(...args),
  checkThresholdExceeded: (...args: unknown[]) => mockCheckThresholdExceeded(...args),
  sendViewingRateAlert: (...args: unknown[]) => mockSendViewingRateAlert(...args),
  hasAlertBeenSentThisSession: (...args: unknown[]) => mockHasAlertBeenSentThisSession(...args),
  markAlertSentThisSession: (...args: unknown[]) => mockMarkAlertSentThisSession(...args),
}))

describe('useScreenshotViewingRate - Story 3A.5', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Reset mocks to default values
    mockGetViewingRate.mockReturnValue(0)
    mockCheckThresholdExceeded.mockReturnValue({
      exceeded: false,
      count: 0,
      windowStart: Date.now() - 3600000,
      windowEnd: Date.now(),
    })
    mockHasAlertBeenSentThisSession.mockReturnValue(false)
  })

  describe('initialization', () => {
    it('should return config with threshold of 50', () => {
      const { result } = renderHook(() => useScreenshotViewingRate('family-1', 'user-1'))

      expect(result.current.config.threshold).toBe(50)
      expect(result.current.config.windowMinutes).toBe(60)
    })

    it('should start with alertSentThisSession as false', () => {
      const { result } = renderHook(() => useScreenshotViewingRate('family-1', 'user-1'))

      expect(result.current.alertSentThisSession).toBe(false)
    })

    it('should start with no error', () => {
      const { result } = renderHook(() => useScreenshotViewingRate('family-1', 'user-1'))

      expect(result.current.alertError).toBeNull()
    })

    it('should start with isSendingAlert as false', () => {
      const { result } = renderHook(() => useScreenshotViewingRate('family-1', 'user-1'))

      expect(result.current.isSendingAlert).toBe(false)
    })
  })

  describe('recordView', () => {
    it('should call trackScreenshotView with correct parameters', async () => {
      const { result } = renderHook(() => useScreenshotViewingRate('family-1', 'user-1'))

      await act(async () => {
        await result.current.recordView('screenshot-123')
      })

      expect(mockTrackScreenshotView).toHaveBeenCalledWith('user-1', 'screenshot-123')
    })

    it('should check threshold after each view', async () => {
      const { result } = renderHook(() => useScreenshotViewingRate('family-1', 'user-1'))

      await act(async () => {
        await result.current.recordView('screenshot-1')
      })

      expect(mockCheckThresholdExceeded).toHaveBeenCalledWith('user-1')
    })

    it('should not send alert when under threshold', async () => {
      mockCheckThresholdExceeded.mockReturnValue({
        exceeded: false,
        count: 25,
        windowStart: Date.now() - 3600000,
        windowEnd: Date.now(),
      })

      const { result } = renderHook(() => useScreenshotViewingRate('family-1', 'user-1'))

      await act(async () => {
        await result.current.recordView('screenshot-1')
      })

      expect(mockSendViewingRateAlert).not.toHaveBeenCalled()
    })
  })

  describe('threshold exceeded behavior', () => {
    it('should send alert when threshold is exceeded', async () => {
      mockCheckThresholdExceeded.mockReturnValue({
        exceeded: true,
        count: 55,
        windowStart: Date.now() - 3600000,
        windowEnd: Date.now(),
      })

      const { result } = renderHook(() => useScreenshotViewingRate('family-1', 'user-1'))

      await act(async () => {
        await result.current.recordView('screenshot-55')
      })

      expect(mockSendViewingRateAlert).toHaveBeenCalledWith(
        expect.objectContaining({
          familyId: 'family-1',
          viewerUid: 'user-1',
          viewCount: 55,
        })
      )
    })

    it('should mark alert as sent after successful send', async () => {
      mockCheckThresholdExceeded.mockReturnValue({
        exceeded: true,
        count: 55,
        windowStart: Date.now() - 3600000,
        windowEnd: Date.now(),
      })

      const { result } = renderHook(() => useScreenshotViewingRate('family-1', 'user-1'))

      await act(async () => {
        await result.current.recordView('screenshot-55')
      })

      expect(mockMarkAlertSentThisSession).toHaveBeenCalledWith('user-1')
    })

    it('should only send alert once per session (AC3: prevent spam)', async () => {
      mockCheckThresholdExceeded.mockReturnValue({
        exceeded: true,
        count: 55,
        windowStart: Date.now() - 3600000,
        windowEnd: Date.now(),
      })

      // Simulate alert already sent
      mockHasAlertBeenSentThisSession.mockReturnValue(true)

      const { result } = renderHook(() => useScreenshotViewingRate('family-1', 'user-1'))

      await act(async () => {
        await result.current.recordView('screenshot-56')
      })

      expect(mockSendViewingRateAlert).not.toHaveBeenCalled()
    })
  })

  describe('error handling', () => {
    it('should set alertError on failed alert send', async () => {
      mockCheckThresholdExceeded.mockReturnValue({
        exceeded: true,
        count: 55,
        windowStart: Date.now() - 3600000,
        windowEnd: Date.now(),
      })
      mockSendViewingRateAlert.mockRejectedValue(new Error('Network error'))

      const { result } = renderHook(() => useScreenshotViewingRate('family-1', 'user-1'))

      await act(async () => {
        await result.current.recordView('screenshot-55')
      })

      await waitFor(() => {
        expect(result.current.alertError).toBe('Network error')
      })
    })

    it('should continue allowing views after alert error (AC3: non-blocking)', async () => {
      mockCheckThresholdExceeded.mockReturnValue({
        exceeded: true,
        count: 55,
        windowStart: Date.now() - 3600000,
        windowEnd: Date.now(),
      })
      mockSendViewingRateAlert.mockRejectedValue(new Error('Network error'))

      const { result } = renderHook(() => useScreenshotViewingRate('family-1', 'user-1'))

      // First view triggers failed alert
      await act(async () => {
        await result.current.recordView('screenshot-55')
      })

      // Viewing should still work after error
      await act(async () => {
        await result.current.recordView('screenshot-56')
      })

      // Both views were tracked
      expect(mockTrackScreenshotView).toHaveBeenCalledTimes(2)
    })
  })

  describe('rate tracking', () => {
    it('should expose current rate', () => {
      mockGetViewingRate.mockReturnValue(25)

      const { result } = renderHook(() => useScreenshotViewingRate('family-1', 'user-1'))

      expect(typeof result.current.currentRate).toBe('number')
    })

    it('should expose isThresholdExceeded', () => {
      mockCheckThresholdExceeded.mockReturnValue({
        exceeded: false,
        count: 25,
        windowStart: Date.now() - 3600000,
        windowEnd: Date.now(),
      })

      const { result } = renderHook(() => useScreenshotViewingRate('family-1', 'user-1'))

      expect(result.current.isThresholdExceeded).toBe(false)
    })
  })
})
