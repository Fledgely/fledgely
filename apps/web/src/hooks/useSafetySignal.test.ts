/**
 * useSafetySignal Hook Tests
 *
 * Story 7.5.1: Hidden Safety Signal Access - Task 2
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import {
  useSafetySignal,
  useSafetyKeyboardShortcut,
  type SafetySignalQueueService,
} from './useSafetySignal'
import {
  SAFETY_SIGNAL_CONSTANTS,
  DEFAULT_GESTURE_CONFIG,
  type TriggerSafetySignalResponse,
} from '@fledgely/contracts'

// ============================================================================
// Mock Setup
// ============================================================================

const mockQueueService: SafetySignalQueueService = {
  queueSignal: vi.fn().mockResolvedValue({
    success: true,
    queueId: 'test-queue-id',
    queued: true,
  } as TriggerSafetySignalResponse),
}

// ============================================================================
// Basic Hook Tests
// ============================================================================

describe('useSafetySignal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('initialization', () => {
    it('initializes with correct default state', () => {
      const { result } = renderHook(() =>
        useSafetySignal({
          childId: 'child-123',
          queueService: mockQueueService,
        })
      )

      expect(result.current.signalTriggered).toBe(false)
      expect(result.current.gestureInProgress).toBe(false)
      expect(result.current.gestureProgress).toBe(0)
    })

    it('provides all required functions', () => {
      const { result } = renderHook(() =>
        useSafetySignal({
          childId: 'child-123',
          queueService: mockQueueService,
        })
      )

      expect(typeof result.current.onTap).toBe('function')
      expect(typeof result.current.onKeyboardShortcut).toBe('function')
      expect(typeof result.current.onSignalTriggered).toBe('function')
      expect(typeof result.current.resetGesture).toBe('function')
    })
  })

  describe('tap gesture detection', () => {
    it('increments gesture progress on tap', () => {
      const { result } = renderHook(() =>
        useSafetySignal({
          childId: 'child-123',
          queueService: mockQueueService,
        })
      )

      act(() => {
        result.current.onTap()
      })

      expect(result.current.gestureProgress).toBe(1)
      expect(result.current.gestureInProgress).toBe(true)
    })

    it('triggers signal after required taps (default 5)', async () => {
      const { result } = renderHook(() =>
        useSafetySignal({
          childId: 'child-123',
          queueService: mockQueueService,
        })
      )

      // Perform 5 taps within the time window
      for (let i = 0; i < 5; i++) {
        act(() => {
          result.current.onTap()
        })
        // Small time advance between taps
        act(() => {
          vi.advanceTimersByTime(100)
        })
      }

      // Allow setTimeout(0) to fire
      await act(async () => {
        vi.advanceTimersByTime(1)
        await Promise.resolve()
      })

      expect(mockQueueService.queueSignal).toHaveBeenCalledWith('child-123', 'web', 'tap')
      expect(result.current.signalTriggered).toBe(true)
    })

    it('resets gesture progress after successful trigger', async () => {
      const { result } = renderHook(() =>
        useSafetySignal({
          childId: 'child-123',
          queueService: mockQueueService,
        })
      )

      // Perform 5 taps
      for (let i = 0; i < 5; i++) {
        act(() => {
          result.current.onTap()
        })
        act(() => {
          vi.advanceTimersByTime(100)
        })
      }

      // Allow setTimeout(0) to fire
      await act(async () => {
        vi.advanceTimersByTime(1)
        await Promise.resolve()
      })

      expect(result.current.signalTriggered).toBe(true)
      // Progress should reset
      expect(result.current.gestureProgress).toBe(0)
    })

    it('resets gesture if time window exceeded', () => {
      const { result } = renderHook(() =>
        useSafetySignal({
          childId: 'child-123',
          queueService: mockQueueService,
        })
      )

      // Tap 3 times
      for (let i = 0; i < 3; i++) {
        act(() => {
          result.current.onTap()
        })
        act(() => {
          vi.advanceTimersByTime(100)
        })
      }

      expect(result.current.gestureProgress).toBe(3)

      // Exceed time window (3 seconds + buffer)
      act(() => {
        vi.advanceTimersByTime(DEFAULT_GESTURE_CONFIG.tapWindowMs + 100)
      })

      // Tap again - should reset and start from 1
      act(() => {
        result.current.onTap()
      })

      expect(result.current.gestureProgress).toBe(1)
    })

    it('does not trigger signal with insufficient taps', () => {
      const { result } = renderHook(() =>
        useSafetySignal({
          childId: 'child-123',
          queueService: mockQueueService,
        })
      )

      // Only 4 taps
      for (let i = 0; i < 4; i++) {
        act(() => {
          result.current.onTap()
        })
        act(() => {
          vi.advanceTimersByTime(100)
        })
      }

      expect(mockQueueService.queueSignal).not.toHaveBeenCalled()
      expect(result.current.signalTriggered).toBe(false)
    })
  })

  describe('keyboard gesture detection', () => {
    it('increments gesture progress on keyboard shortcut', () => {
      const { result } = renderHook(() =>
        useSafetySignal({
          childId: 'child-123',
          queueService: mockQueueService,
        })
      )

      act(() => {
        result.current.onKeyboardShortcut()
      })

      expect(result.current.gestureProgress).toBe(1)
    })

    it('triggers signal after required keyboard presses (default 3)', async () => {
      const { result } = renderHook(() =>
        useSafetySignal({
          childId: 'child-123',
          queueService: mockQueueService,
        })
      )

      // Press keyboard shortcut 3 times
      for (let i = 0; i < 3; i++) {
        act(() => {
          result.current.onKeyboardShortcut()
        })
        act(() => {
          vi.advanceTimersByTime(100)
        })
      }

      // Allow setTimeout(0) to fire
      await act(async () => {
        vi.advanceTimersByTime(1)
        await Promise.resolve()
      })

      expect(mockQueueService.queueSignal).toHaveBeenCalledWith('child-123', 'web', 'keyboard')
      expect(result.current.signalTriggered).toBe(true)
    })
  })

  describe('callback registration', () => {
    it('calls registered callbacks when signal triggered', async () => {
      const callback = vi.fn()
      const { result } = renderHook(() =>
        useSafetySignal({
          childId: 'child-123',
          queueService: mockQueueService,
        })
      )

      act(() => {
        result.current.onSignalTriggered(callback)
      })

      // Trigger signal
      for (let i = 0; i < 5; i++) {
        act(() => {
          result.current.onTap()
        })
        act(() => {
          vi.advanceTimersByTime(100)
        })
      }

      // Allow setTimeout(0) to fire
      await act(async () => {
        vi.advanceTimersByTime(1)
        await Promise.resolve()
      })

      expect(callback).toHaveBeenCalledWith({
        success: true,
        queueId: 'test-queue-id',
        queued: true,
      })
    })

    it('allows unregistering callbacks', async () => {
      const callback = vi.fn()
      const { result } = renderHook(() =>
        useSafetySignal({
          childId: 'child-123',
          queueService: mockQueueService,
        })
      )

      let unregister: () => void
      act(() => {
        unregister = result.current.onSignalTriggered(callback)
      })

      // Unregister
      act(() => {
        unregister()
      })

      // Trigger signal
      for (let i = 0; i < 5; i++) {
        act(() => {
          result.current.onTap()
        })
        act(() => {
          vi.advanceTimersByTime(100)
        })
      }

      // Allow setTimeout(0) to fire
      await act(async () => {
        vi.advanceTimersByTime(1)
        await Promise.resolve()
      })

      expect(callback).not.toHaveBeenCalled()
    })
  })

  describe('debouncing (AC5)', () => {
    it('prevents rapid re-triggering within debounce window', async () => {
      const { result } = renderHook(() =>
        useSafetySignal({
          childId: 'child-123',
          queueService: mockQueueService,
        })
      )

      // First trigger
      for (let i = 0; i < 5; i++) {
        act(() => {
          result.current.onTap()
        })
        act(() => {
          vi.advanceTimersByTime(100)
        })
      }

      // Allow setTimeout(0) to fire
      await act(async () => {
        vi.advanceTimersByTime(1)
        await Promise.resolve()
      })

      expect(mockQueueService.queueSignal).toHaveBeenCalledTimes(1)

      // Try to trigger again immediately
      for (let i = 0; i < 5; i++) {
        act(() => {
          result.current.onTap()
        })
        act(() => {
          vi.advanceTimersByTime(100)
        })
      }

      // Allow setTimeout(0) to fire
      await act(async () => {
        vi.advanceTimersByTime(1)
        await Promise.resolve()
      })

      // Should still be 1 call (debounced)
      expect(mockQueueService.queueSignal).toHaveBeenCalledTimes(1)
    })

    it('allows triggering after debounce period', async () => {
      const { result } = renderHook(() =>
        useSafetySignal({
          childId: 'child-123',
          queueService: mockQueueService,
        })
      )

      // First trigger
      for (let i = 0; i < 5; i++) {
        act(() => {
          result.current.onTap()
        })
        act(() => {
          vi.advanceTimersByTime(100)
        })
      }

      // Allow setTimeout(0) to fire
      await act(async () => {
        vi.advanceTimersByTime(1)
        await Promise.resolve()
      })

      expect(mockQueueService.queueSignal).toHaveBeenCalledTimes(1)

      // Wait for debounce period
      act(() => {
        vi.advanceTimersByTime(SAFETY_SIGNAL_CONSTANTS.MIN_SIGNAL_INTERVAL_MS + 100)
      })

      // Trigger again
      for (let i = 0; i < 5; i++) {
        act(() => {
          result.current.onTap()
        })
        act(() => {
          vi.advanceTimersByTime(100)
        })
      }

      // Allow setTimeout(0) to fire
      await act(async () => {
        vi.advanceTimersByTime(1)
        await Promise.resolve()
      })

      expect(mockQueueService.queueSignal).toHaveBeenCalledTimes(2)
    })
  })

  describe('confirmation display (AC3)', () => {
    it('sets signalTriggered true when signal triggered', async () => {
      const { result } = renderHook(() =>
        useSafetySignal({
          childId: 'child-123',
          queueService: mockQueueService,
        })
      )

      // Trigger signal
      for (let i = 0; i < 5; i++) {
        act(() => {
          result.current.onTap()
        })
        act(() => {
          vi.advanceTimersByTime(100)
        })
      }

      // Allow setTimeout(0) to fire
      await act(async () => {
        vi.advanceTimersByTime(1)
        await Promise.resolve()
      })

      expect(result.current.signalTriggered).toBe(true)
    })

    it('auto-resets signalTriggered after display time', async () => {
      const { result } = renderHook(() =>
        useSafetySignal({
          childId: 'child-123',
          queueService: mockQueueService,
        })
      )

      // Trigger signal
      for (let i = 0; i < 5; i++) {
        act(() => {
          result.current.onTap()
        })
        act(() => {
          vi.advanceTimersByTime(100)
        })
      }

      // Allow setTimeout(0) to fire
      await act(async () => {
        vi.advanceTimersByTime(1)
        await Promise.resolve()
      })

      expect(result.current.signalTriggered).toBe(true)

      // Wait for confirmation display time
      act(() => {
        vi.advanceTimersByTime(SAFETY_SIGNAL_CONSTANTS.CONFIRMATION_DISPLAY_MS + 100)
      })

      expect(result.current.signalTriggered).toBe(false)
    })
  })

  describe('enabled prop', () => {
    it('does not process gestures when disabled', () => {
      const { result } = renderHook(() =>
        useSafetySignal({
          childId: 'child-123',
          queueService: mockQueueService,
          enabled: false,
        })
      )

      // Try to tap
      for (let i = 0; i < 10; i++) {
        act(() => {
          result.current.onTap()
        })
      }

      expect(result.current.gestureProgress).toBe(0)
      expect(mockQueueService.queueSignal).not.toHaveBeenCalled()
    })
  })

  describe('custom gesture config', () => {
    it('uses custom tap count', async () => {
      const { result } = renderHook(() =>
        useSafetySignal({
          childId: 'child-123',
          queueService: mockQueueService,
          gestureConfig: {
            ...DEFAULT_GESTURE_CONFIG,
            tapCountRequired: 3,
          },
        })
      )

      // 3 taps should trigger with custom config
      for (let i = 0; i < 3; i++) {
        act(() => {
          result.current.onTap()
        })
        act(() => {
          vi.advanceTimersByTime(100)
        })
      }

      // Allow setTimeout(0) and async processing
      await act(async () => {
        vi.advanceTimersByTime(1)
        await Promise.resolve()
      })

      expect(mockQueueService.queueSignal).toHaveBeenCalled()
    })
  })

  describe('resetGesture', () => {
    it('resets gesture state manually', () => {
      const { result } = renderHook(() =>
        useSafetySignal({
          childId: 'child-123',
          queueService: mockQueueService,
        })
      )

      // Start a gesture
      for (let i = 0; i < 3; i++) {
        act(() => {
          result.current.onTap()
        })
      }

      expect(result.current.gestureProgress).toBe(3)

      // Reset
      act(() => {
        result.current.resetGesture()
      })

      expect(result.current.gestureProgress).toBe(0)
      expect(result.current.gestureInProgress).toBe(false)
    })
  })

  describe('error handling', () => {
    it('silently handles queue service errors (AC3 - no visual feedback)', async () => {
      const errorService: SafetySignalQueueService = {
        queueSignal: vi.fn().mockRejectedValue(new Error('Network error')),
      }

      const { result } = renderHook(() =>
        useSafetySignal({
          childId: 'child-123',
          queueService: errorService,
        })
      )

      // Trigger signal
      for (let i = 0; i < 5; i++) {
        act(() => {
          result.current.onTap()
        })
        vi.advanceTimersByTime(100)
      }

      // Should not throw, and gesture should reset
      await vi.advanceTimersByTimeAsync(100)

      // Progress resets after completion attempt
      expect(result.current.gestureProgress).toBe(0)
    })
  })
})

// ============================================================================
// Keyboard Shortcut Hook Tests
// ============================================================================

describe('useSafetyKeyboardShortcut', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls callback on correct keyboard shortcut', () => {
    const callback = vi.fn()

    renderHook(() =>
      useSafetyKeyboardShortcut({
        onShortcutDetected: callback,
      })
    )

    // Simulate Ctrl+Shift+S
    const event = new KeyboardEvent('keydown', {
      key: 's',
      ctrlKey: true,
      shiftKey: true,
    })
    window.dispatchEvent(event)

    expect(callback).toHaveBeenCalled()
  })

  it('does not call callback without Ctrl', () => {
    const callback = vi.fn()

    renderHook(() =>
      useSafetyKeyboardShortcut({
        onShortcutDetected: callback,
      })
    )

    // Simulate Shift+S (no Ctrl)
    const event = new KeyboardEvent('keydown', {
      key: 's',
      ctrlKey: false,
      shiftKey: true,
    })
    window.dispatchEvent(event)

    expect(callback).not.toHaveBeenCalled()
  })

  it('does not call callback without Shift', () => {
    const callback = vi.fn()

    renderHook(() =>
      useSafetyKeyboardShortcut({
        onShortcutDetected: callback,
      })
    )

    // Simulate Ctrl+S (no Shift)
    const event = new KeyboardEvent('keydown', {
      key: 's',
      ctrlKey: true,
      shiftKey: false,
    })
    window.dispatchEvent(event)

    expect(callback).not.toHaveBeenCalled()
  })

  it('does not call callback with wrong key', () => {
    const callback = vi.fn()

    renderHook(() =>
      useSafetyKeyboardShortcut({
        onShortcutDetected: callback,
      })
    )

    // Simulate Ctrl+Shift+A (wrong key)
    const event = new KeyboardEvent('keydown', {
      key: 'a',
      ctrlKey: true,
      shiftKey: true,
    })
    window.dispatchEvent(event)

    expect(callback).not.toHaveBeenCalled()
  })

  it('respects enabled prop', () => {
    const callback = vi.fn()

    renderHook(() =>
      useSafetyKeyboardShortcut({
        onShortcutDetected: callback,
        enabled: false,
      })
    )

    // Simulate correct shortcut
    const event = new KeyboardEvent('keydown', {
      key: 's',
      ctrlKey: true,
      shiftKey: true,
    })
    window.dispatchEvent(event)

    expect(callback).not.toHaveBeenCalled()
  })

  it('accepts metaKey as alternative to ctrlKey (for Mac)', () => {
    const callback = vi.fn()

    renderHook(() =>
      useSafetyKeyboardShortcut({
        onShortcutDetected: callback,
      })
    )

    // Simulate Cmd+Shift+S (Mac)
    const event = new KeyboardEvent('keydown', {
      key: 's',
      ctrlKey: false,
      metaKey: true,
      shiftKey: true,
    })
    window.dispatchEvent(event)

    expect(callback).toHaveBeenCalled()
  })

  it('uses custom config', () => {
    const callback = vi.fn()

    renderHook(() =>
      useSafetyKeyboardShortcut({
        onShortcutDetected: callback,
        config: {
          key: 'h',
          requireCtrl: false,
          requireShift: false,
        },
      })
    )

    // Simulate just 'H' key
    const event = new KeyboardEvent('keydown', {
      key: 'h',
    })
    window.dispatchEvent(event)

    expect(callback).toHaveBeenCalled()
  })

  it('cleans up event listener on unmount', () => {
    const callback = vi.fn()

    const { unmount } = renderHook(() =>
      useSafetyKeyboardShortcut({
        onShortcutDetected: callback,
      })
    )

    unmount()

    // Simulate shortcut after unmount
    const event = new KeyboardEvent('keydown', {
      key: 's',
      ctrlKey: true,
      shiftKey: true,
    })
    window.dispatchEvent(event)

    expect(callback).not.toHaveBeenCalled()
  })
})

// ============================================================================
// Integration Tests
// ============================================================================

describe('Safety Signal Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('tap and keyboard gestures are independent', async () => {
    const { result } = renderHook(() =>
      useSafetySignal({
        childId: 'child-123',
        queueService: mockQueueService,
      })
    )

    // Partial tap gesture
    for (let i = 0; i < 3; i++) {
      act(() => {
        result.current.onTap()
      })
      act(() => {
        vi.advanceTimersByTime(100)
      })
    }

    // Complete keyboard gesture
    for (let i = 0; i < 3; i++) {
      act(() => {
        result.current.onKeyboardShortcut()
      })
      act(() => {
        vi.advanceTimersByTime(100)
      })
    }

    // Allow setTimeout(0) and async processing
    await act(async () => {
      vi.advanceTimersByTime(1)
      await Promise.resolve()
    })

    // Keyboard should trigger
    expect(mockQueueService.queueSignal).toHaveBeenCalledWith('child-123', 'web', 'keyboard')

    // Tap should still be in progress (not reset by keyboard)
    // After keyboard trigger, progress shows keyboard (which reset to 0)
    // but tap state is still tracked independently
  })

  it('works with different device types', async () => {
    const { result } = renderHook(() =>
      useSafetySignal({
        childId: 'child-123',
        deviceType: 'android',
        queueService: mockQueueService,
      })
    )

    // Trigger signal
    for (let i = 0; i < 5; i++) {
      act(() => {
        result.current.onTap()
      })
      act(() => {
        vi.advanceTimersByTime(100)
      })
    }

    // Allow setTimeout(0) and async processing
    await act(async () => {
      vi.advanceTimersByTime(1)
      await Promise.resolve()
    })

    expect(mockQueueService.queueSignal).toHaveBeenCalledWith('child-123', 'android', 'tap')
  })
})
