/**
 * Network Status Detection Tests - Story 46.1 Task 3
 *
 * Tests for network connectivity detection.
 * AC1: Offline Detection
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  isOnline,
  getLastOnlineAt,
  getOfflineSinceAt,
  getOfflineDurationSeconds,
  getLastOfflineDuration,
  onNetworkStatusChange,
  checkConnectivity,
  clearListeners,
  resetNetworkStatus,
  setNetworkStatus,
  // Story 46.4: Syncing state functions
  isSyncing,
  setSyncingState,
  getNetworkStatusString,
} from './network-status'

describe('Network Status Module', () => {
  beforeEach(() => {
    resetNetworkStatus()
    vi.useFakeTimers()
  })

  afterEach(() => {
    clearListeners()
    vi.useRealTimers()
  })

  describe('isOnline', () => {
    it('should return true by default', () => {
      expect(isOnline()).toBe(true)
    })

    it('should return false when set to offline', () => {
      setNetworkStatus(false)
      expect(isOnline()).toBe(false)
    })

    it('should return true when set back to online', () => {
      setNetworkStatus(false)
      setNetworkStatus(true)
      expect(isOnline()).toBe(true)
    })
  })

  describe('getLastOnlineAt', () => {
    it('should return null initially', () => {
      expect(getLastOnlineAt()).toBe(null)
    })

    it('should return timestamp when coming back online', () => {
      const now = Date.now()
      vi.setSystemTime(now)

      setNetworkStatus(false)
      vi.advanceTimersByTime(5000)
      setNetworkStatus(true)

      expect(getLastOnlineAt()).toBe(now + 5000)
    })
  })

  describe('getOfflineSinceAt', () => {
    it('should return null when online', () => {
      expect(getOfflineSinceAt()).toBe(null)
    })

    it('should return timestamp when offline', () => {
      const now = Date.now()
      vi.setSystemTime(now)

      setNetworkStatus(false)

      expect(getOfflineSinceAt()).toBe(now)
    })

    it('should return null after coming back online', () => {
      setNetworkStatus(false)
      setNetworkStatus(true)

      expect(getOfflineSinceAt()).toBe(null)
    })
  })

  describe('getOfflineDurationSeconds', () => {
    it('should return 0 when online', () => {
      expect(getOfflineDurationSeconds()).toBe(0)
    })

    it('should return correct duration when offline', () => {
      const now = Date.now()
      vi.setSystemTime(now)

      setNetworkStatus(false)
      vi.advanceTimersByTime(30000) // 30 seconds

      expect(getOfflineDurationSeconds()).toBe(30)
    })

    it('should return 0 after coming back online', () => {
      setNetworkStatus(false)
      vi.advanceTimersByTime(10000)
      setNetworkStatus(true)

      expect(getOfflineDurationSeconds()).toBe(0)
    })
  })

  describe('getLastOfflineDuration', () => {
    it('should return 0 initially', () => {
      expect(getLastOfflineDuration()).toBe(0)
    })

    it('should capture offline duration when coming back online', () => {
      setNetworkStatus(false)
      vi.advanceTimersByTime(45000) // 45 seconds offline
      setNetworkStatus(true)

      // Now getLastOfflineDuration should return the duration
      expect(getLastOfflineDuration()).toBe(45)
    })

    it('should update on each offline period', () => {
      // First offline period
      setNetworkStatus(false)
      vi.advanceTimersByTime(30000) // 30 seconds
      setNetworkStatus(true)
      expect(getLastOfflineDuration()).toBe(30)

      // Second offline period
      setNetworkStatus(false)
      vi.advanceTimersByTime(60000) // 60 seconds
      setNetworkStatus(true)
      expect(getLastOfflineDuration()).toBe(60)
    })

    it('should be usable in online callback for logging', () => {
      let capturedDuration = 0
      onNetworkStatusChange((online) => {
        if (online) {
          capturedDuration = getLastOfflineDuration()
        }
      })

      setNetworkStatus(false)
      vi.advanceTimersByTime(120000) // 2 minutes
      setNetworkStatus(true)

      // The callback should have received the correct duration
      expect(capturedDuration).toBe(120)
    })
  })

  describe('onNetworkStatusChange', () => {
    it('should call callback when status changes to offline', () => {
      const callback = vi.fn()
      onNetworkStatusChange(callback)

      setNetworkStatus(false)

      expect(callback).toHaveBeenCalledWith(false)
      expect(callback).toHaveBeenCalledTimes(1)
    })

    it('should call callback when status changes to online', () => {
      const callback = vi.fn()
      setNetworkStatus(false)

      onNetworkStatusChange(callback)
      setNetworkStatus(true)

      expect(callback).toHaveBeenCalledWith(true)
    })

    it('should not call callback when status does not change', () => {
      const callback = vi.fn()
      onNetworkStatusChange(callback)

      // Already online, setting to online again
      setNetworkStatus(true)

      expect(callback).not.toHaveBeenCalled()
    })

    it('should call multiple listeners', () => {
      const callback1 = vi.fn()
      const callback2 = vi.fn()

      onNetworkStatusChange(callback1)
      onNetworkStatusChange(callback2)

      setNetworkStatus(false)

      expect(callback1).toHaveBeenCalledWith(false)
      expect(callback2).toHaveBeenCalledWith(false)
    })

    it('should allow unsubscribing', () => {
      const callback = vi.fn()
      const unsubscribe = onNetworkStatusChange(callback)

      unsubscribe()
      setNetworkStatus(false)

      expect(callback).not.toHaveBeenCalled()
    })

    it('should handle listener errors gracefully', () => {
      const errorCallback = vi.fn(() => {
        throw new Error('Listener error')
      })
      const normalCallback = vi.fn()

      onNetworkStatusChange(errorCallback)
      onNetworkStatusChange(normalCallback)

      // Should not throw, and should call remaining listeners
      expect(() => setNetworkStatus(false)).not.toThrow()
      expect(normalCallback).toHaveBeenCalledWith(false)
    })
  })

  describe('checkConnectivity', () => {
    it('should return false when navigator.onLine is false', async () => {
      // Mock navigator.onLine
      Object.defineProperty(navigator, 'onLine', {
        value: false,
        configurable: true,
      })

      const result = await checkConnectivity()
      expect(result).toBe(false)
      expect(isOnline()).toBe(false)

      // Restore
      Object.defineProperty(navigator, 'onLine', {
        value: true,
        configurable: true,
      })
    })

    it('should update status based on fetch result', async () => {
      // Mock successful fetch
      global.fetch = vi.fn().mockResolvedValue({ ok: true })

      const result = await checkConnectivity()
      expect(result).toBe(true)
      expect(isOnline()).toBe(true)
    })

    it('should handle fetch failure', async () => {
      // Mock failed fetch
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'))

      const result = await checkConnectivity()
      expect(result).toBe(false)
      expect(isOnline()).toBe(false)
    })
  })

  describe('clearListeners', () => {
    it('should remove all listeners', () => {
      const callback1 = vi.fn()
      const callback2 = vi.fn()

      onNetworkStatusChange(callback1)
      onNetworkStatusChange(callback2)

      clearListeners()
      setNetworkStatus(false)

      expect(callback1).not.toHaveBeenCalled()
      expect(callback2).not.toHaveBeenCalled()
    })
  })

  describe('resetNetworkStatus', () => {
    it('should reset all state', () => {
      setNetworkStatus(false)
      const callback = vi.fn()
      onNetworkStatusChange(callback)

      resetNetworkStatus()

      expect(isOnline()).toBe(true)
      expect(getLastOnlineAt()).toBe(null)
      expect(getOfflineSinceAt()).toBe(null)

      // Listeners should be cleared
      setNetworkStatus(false)
      expect(callback).not.toHaveBeenCalled()
    })
  })

  describe('Status transition tracking', () => {
    it('should track multiple offline/online cycles', () => {
      const callback = vi.fn()
      onNetworkStatusChange(callback)

      setNetworkStatus(false) // Go offline
      setNetworkStatus(true) // Come online
      setNetworkStatus(false) // Go offline again
      setNetworkStatus(true) // Come online again

      expect(callback).toHaveBeenCalledTimes(4)
      expect(callback).toHaveBeenNthCalledWith(1, false)
      expect(callback).toHaveBeenNthCalledWith(2, true)
      expect(callback).toHaveBeenNthCalledWith(3, false)
      expect(callback).toHaveBeenNthCalledWith(4, true)
    })
  })

  // Story 46.4: Syncing State Tests
  describe('isSyncing (Story 46.4)', () => {
    it('should return false by default', () => {
      expect(isSyncing()).toBe(false)
    })

    it('should return true when syncing state is set', () => {
      setSyncingState(true)
      expect(isSyncing()).toBe(true)
    })

    it('should return false when syncing state is cleared', () => {
      setSyncingState(true)
      setSyncingState(false)
      expect(isSyncing()).toBe(false)
    })

    it('should be reset by resetNetworkStatus', () => {
      setSyncingState(true)
      resetNetworkStatus()
      expect(isSyncing()).toBe(false)
    })
  })

  describe('setSyncingState (Story 46.4)', () => {
    it('should set syncing state to true', () => {
      setSyncingState(true)
      expect(isSyncing()).toBe(true)
    })

    it('should set syncing state to false', () => {
      setSyncingState(true)
      setSyncingState(false)
      expect(isSyncing()).toBe(false)
    })
  })

  describe('getNetworkStatusString (Story 46.4)', () => {
    it('should return "online" when online and not syncing', () => {
      setNetworkStatus(true)
      setSyncingState(false)
      expect(getNetworkStatusString()).toBe('online')
    })

    it('should return "offline" when offline', () => {
      setNetworkStatus(false)
      expect(getNetworkStatusString()).toBe('offline')
    })

    it('should return "syncing" when online and syncing', () => {
      setNetworkStatus(true)
      setSyncingState(true)
      expect(getNetworkStatusString()).toBe('syncing')
    })

    it('should return "offline" when offline even if syncing flag is set', () => {
      setNetworkStatus(false)
      setSyncingState(true)
      // When offline, syncing doesn't apply - should still be offline
      expect(getNetworkStatusString()).toBe('offline')
    })

    it('should return "online" after syncing completes', () => {
      setNetworkStatus(true)
      setSyncingState(true)
      expect(getNetworkStatusString()).toBe('syncing')

      setSyncingState(false)
      expect(getNetworkStatusString()).toBe('online')
    })
  })
})
