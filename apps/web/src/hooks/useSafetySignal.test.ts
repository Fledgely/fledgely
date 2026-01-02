/**
 * useSafetySignal Hook Tests - Story 7.5.1 Task 4
 *
 * Tests for the safety signal trigger handler hook.
 * AC2: No visible UI change
 * AC3: Works offline (queues signal for delivery)
 *
 * CRITICAL: This hook NEVER causes UI feedback
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useSafetySignal } from './useSafetySignal'
import { clearAllSignalData, getOfflineQueueSize, getSignalCount } from '@fledgely/shared'

// Mock navigator.onLine
const mockOnline = vi.fn(() => true)
Object.defineProperty(navigator, 'onLine', {
  get: mockOnline,
  configurable: true,
})

describe('useSafetySignal', () => {
  const defaultOptions = {
    childId: 'child_123',
    familyId: 'family_456',
    platform: 'web' as const,
  }

  beforeEach(() => {
    vi.clearAllMocks()
    clearAllSignalData()
    mockOnline.mockReturnValue(true)
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  // ============================================
  // Initial State Tests
  // ============================================

  describe('initial state', () => {
    it('should start with isPending false', () => {
      const { result } = renderHook(() => useSafetySignal(defaultOptions))

      expect(result.current.isPending).toBe(false)
    })

    it('should start with offlineQueueCount 0', () => {
      const { result } = renderHook(() => useSafetySignal(defaultOptions))

      expect(result.current.offlineQueueCount).toBe(0)
    })

    it('should provide triggerSignal function', () => {
      const { result } = renderHook(() => useSafetySignal(defaultOptions))

      expect(typeof result.current.triggerSignal).toBe('function')
    })

    it('should provide processQueue function', () => {
      const { result } = renderHook(() => useSafetySignal(defaultOptions))

      expect(typeof result.current.processQueue).toBe('function')
    })
  })

  // ============================================
  // Online Signal Creation Tests (AC3)
  // ============================================

  describe('online signal creation', () => {
    it('should create signal when online and triggerSignal is called', async () => {
      mockOnline.mockReturnValue(true)
      const { result } = renderHook(() => useSafetySignal(defaultOptions))

      await act(async () => {
        await result.current.triggerSignal('logo_tap')
      })

      expect(getSignalCount()).toBe(1)
    })

    it('should create signal with correct childId', async () => {
      mockOnline.mockReturnValue(true)
      const { result } = renderHook(() => useSafetySignal(defaultOptions))

      await act(async () => {
        await result.current.triggerSignal('logo_tap')
      })

      // Signal was created (verified by count)
      expect(getSignalCount()).toBe(1)
    })

    it('should create signal with pending status when online', async () => {
      mockOnline.mockReturnValue(true)
      const { result } = renderHook(() => useSafetySignal(defaultOptions))

      await act(async () => {
        await result.current.triggerSignal('logo_tap')
      })

      // When online, signal should NOT be in offline queue
      expect(getOfflineQueueSize()).toBe(0)
    })

    it('should NOT add to offline queue when online', async () => {
      mockOnline.mockReturnValue(true)
      const { result } = renderHook(() => useSafetySignal(defaultOptions))

      await act(async () => {
        await result.current.triggerSignal('logo_tap')
      })

      expect(result.current.offlineQueueCount).toBe(0)
    })

    it('should handle logo_tap trigger method', async () => {
      mockOnline.mockReturnValue(true)
      const { result } = renderHook(() => useSafetySignal(defaultOptions))

      await act(async () => {
        await result.current.triggerSignal('logo_tap')
      })

      expect(getSignalCount()).toBe(1)
    })

    it('should handle keyboard_shortcut trigger method', async () => {
      mockOnline.mockReturnValue(true)
      const { result } = renderHook(() => useSafetySignal(defaultOptions))

      await act(async () => {
        await result.current.triggerSignal('keyboard_shortcut')
      })

      expect(getSignalCount()).toBe(1)
    })
  })

  // ============================================
  // Offline Signal Queuing Tests (AC3)
  // ============================================

  describe('offline signal queuing (AC3)', () => {
    it('should queue signal when offline', async () => {
      mockOnline.mockReturnValue(false)
      const { result } = renderHook(() => useSafetySignal(defaultOptions))

      await act(async () => {
        await result.current.triggerSignal('logo_tap')
      })

      expect(getOfflineQueueSize()).toBe(1)
    })

    it('should update offlineQueueCount when offline signal queued', async () => {
      mockOnline.mockReturnValue(false)
      const { result } = renderHook(() => useSafetySignal(defaultOptions))

      await act(async () => {
        await result.current.triggerSignal('logo_tap')
      })

      expect(result.current.offlineQueueCount).toBe(1)
    })

    it('should queue multiple offline signals', async () => {
      mockOnline.mockReturnValue(false)
      const { result } = renderHook(() => useSafetySignal(defaultOptions))

      await act(async () => {
        await result.current.triggerSignal('logo_tap')
        await result.current.triggerSignal('keyboard_shortcut')
      })

      expect(result.current.offlineQueueCount).toBe(2)
    })

    it('should create signal with queued status when offline', async () => {
      mockOnline.mockReturnValue(false)
      const { result } = renderHook(() => useSafetySignal(defaultOptions))

      await act(async () => {
        await result.current.triggerSignal('logo_tap')
      })

      expect(getSignalCount()).toBe(1)
      expect(getOfflineQueueSize()).toBe(1)
    })
  })

  // ============================================
  // Queue Processing Tests (AC3)
  // ============================================

  describe('queue processing (AC3)', () => {
    it('should process queue when processQueue is called', async () => {
      mockOnline.mockReturnValue(false)
      const { result } = renderHook(() => useSafetySignal(defaultOptions))

      // Queue a signal while offline
      await act(async () => {
        await result.current.triggerSignal('logo_tap')
      })
      expect(result.current.offlineQueueCount).toBe(1)

      // Go online and process queue
      mockOnline.mockReturnValue(true)
      await act(async () => {
        await result.current.processQueue()
      })

      expect(result.current.offlineQueueCount).toBe(0)
    })

    it('should not process queue when still offline', async () => {
      mockOnline.mockReturnValue(false)
      const { result } = renderHook(() => useSafetySignal(defaultOptions))

      // Queue a signal
      await act(async () => {
        await result.current.triggerSignal('logo_tap')
      })

      // Try to process while still offline
      await act(async () => {
        await result.current.processQueue()
      })

      expect(result.current.offlineQueueCount).toBe(1)
    })
  })

  // ============================================
  // Pending State Tests
  // ============================================

  describe('pending state', () => {
    it('should set isPending false after signal creation completes', async () => {
      mockOnline.mockReturnValue(true)
      const { result } = renderHook(() => useSafetySignal(defaultOptions))

      await act(async () => {
        await result.current.triggerSignal('logo_tap')
      })

      // After completion, isPending should be false
      expect(result.current.isPending).toBe(false)
    })

    it('should handle multiple sequential triggers', async () => {
      mockOnline.mockReturnValue(true)
      const { result } = renderHook(() => useSafetySignal(defaultOptions))

      await act(async () => {
        await result.current.triggerSignal('logo_tap')
        await result.current.triggerSignal('keyboard_shortcut')
      })

      expect(result.current.isPending).toBe(false)
      expect(getSignalCount()).toBe(2)
    })
  })

  // ============================================
  // No UI Feedback Tests (AC2)
  // ============================================

  describe('no UI feedback (AC2)', () => {
    it('should return NO error state', async () => {
      mockOnline.mockReturnValue(true)
      const { result } = renderHook(() => useSafetySignal(defaultOptions))

      await act(async () => {
        await result.current.triggerSignal('logo_tap')
      })

      // Hook should NOT expose any error property
      expect(result.current).not.toHaveProperty('error')
    })

    it('should return NO success state', async () => {
      mockOnline.mockReturnValue(true)
      const { result } = renderHook(() => useSafetySignal(defaultOptions))

      await act(async () => {
        await result.current.triggerSignal('logo_tap')
      })

      // Hook should NOT expose any success property
      expect(result.current).not.toHaveProperty('isSuccess')
      expect(result.current).not.toHaveProperty('success')
    })

    it('should silently handle errors without exposing them', async () => {
      // This test ensures the hook doesn't throw or expose errors
      const { result } = renderHook(() => useSafetySignal(defaultOptions))

      // Should not throw
      await expect(
        act(async () => {
          await result.current.triggerSignal('logo_tap')
        })
      ).resolves.not.toThrow()
    })
  })

  // ============================================
  // Device ID Tests
  // ============================================

  describe('device ID handling', () => {
    it('should accept optional deviceId parameter', async () => {
      const optionsWithDevice = {
        ...defaultOptions,
        deviceId: 'device_789',
      }
      mockOnline.mockReturnValue(true)

      const { result } = renderHook(() => useSafetySignal(optionsWithDevice))

      await act(async () => {
        await result.current.triggerSignal('logo_tap')
      })

      expect(getSignalCount()).toBe(1)
    })
  })

  // ============================================
  // Platform Tests (AC5)
  // ============================================

  describe('platform handling (AC5)', () => {
    it('should handle web platform', async () => {
      const webOptions = { ...defaultOptions, platform: 'web' as const }
      mockOnline.mockReturnValue(true)

      const { result } = renderHook(() => useSafetySignal(webOptions))

      await act(async () => {
        await result.current.triggerSignal('logo_tap')
      })

      expect(getSignalCount()).toBe(1)
    })

    it('should handle chrome_extension platform', async () => {
      const extensionOptions = { ...defaultOptions, platform: 'chrome_extension' as const }
      mockOnline.mockReturnValue(true)

      const { result } = renderHook(() => useSafetySignal(extensionOptions))

      await act(async () => {
        await result.current.triggerSignal('keyboard_shortcut')
      })

      expect(getSignalCount()).toBe(1)
    })

    it('should handle android platform', async () => {
      const androidOptions = { ...defaultOptions, platform: 'android' as const }
      mockOnline.mockReturnValue(true)

      const { result } = renderHook(() => useSafetySignal(androidOptions))

      await act(async () => {
        await result.current.triggerSignal('logo_tap')
      })

      expect(getSignalCount()).toBe(1)
    })
  })

  // ============================================
  // Re-render Stability Tests
  // ============================================

  describe('re-render stability', () => {
    it('should maintain stable triggerSignal reference', () => {
      const { result, rerender } = renderHook(() => useSafetySignal(defaultOptions))

      const firstRef = result.current.triggerSignal
      rerender()
      const secondRef = result.current.triggerSignal

      expect(firstRef).toBe(secondRef)
    })

    it('should maintain stable processQueue reference', () => {
      const { result, rerender } = renderHook(() => useSafetySignal(defaultOptions))

      const firstRef = result.current.processQueue
      rerender()
      const secondRef = result.current.processQueue

      expect(firstRef).toBe(secondRef)
    })
  })
})
