/**
 * useSessionTimeout Hook Tests.
 *
 * Story 5.1: Co-Creation Session Initiation - AC6
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useSessionTimeout } from '../useSessionTimeout'

describe('useSessionTimeout', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('AC6: Session Timeout Warning', () => {
    it('initializes with warning not visible', () => {
      const { result } = renderHook(() => useSessionTimeout({ enabled: true }))

      expect(result.current.isWarningVisible).toBe(false)
    })

    it('shows warning after 25 minutes of inactivity', () => {
      const onWarning = vi.fn()
      const { result } = renderHook(() =>
        useSessionTimeout({
          enabled: true,
          timeoutMs: 30 * 60 * 1000, // 30 minutes
          warningMs: 5 * 60 * 1000, // 5 minutes before timeout
          onWarning,
        })
      )

      // Advance 25 minutes (warning threshold)
      act(() => {
        vi.advanceTimersByTime(25 * 60 * 1000)
      })

      // Trigger activity check
      act(() => {
        vi.advanceTimersByTime(60 * 1000) // 1 minute interval
      })

      expect(result.current.isWarningVisible).toBe(true)
      expect(onWarning).toHaveBeenCalledTimes(1)
    })

    it('calls onTimeout after 30 minutes of inactivity', () => {
      const onTimeout = vi.fn()
      renderHook(() =>
        useSessionTimeout({
          enabled: true,
          timeoutMs: 30 * 60 * 1000,
          warningMs: 5 * 60 * 1000,
          onTimeout,
        })
      )

      // Advance past timeout threshold in one go
      act(() => {
        vi.advanceTimersByTime(31 * 60 * 1000)
      })

      // onTimeout should have been called (at least once)
      expect(onTimeout).toHaveBeenCalled()
    })

    it('resets warning when extendSession is called', () => {
      const { result } = renderHook(() =>
        useSessionTimeout({
          enabled: true,
          timeoutMs: 30 * 60 * 1000,
          warningMs: 5 * 60 * 1000,
        })
      )

      // Advance to show warning
      act(() => {
        vi.advanceTimersByTime(26 * 60 * 1000)
      })

      expect(result.current.isWarningVisible).toBe(true)

      // Extend session
      act(() => {
        result.current.extendSession()
      })

      expect(result.current.isWarningVisible).toBe(false)
    })

    it('calculates minutes remaining correctly', () => {
      const { result } = renderHook(() =>
        useSessionTimeout({
          enabled: true,
          timeoutMs: 30 * 60 * 1000,
          warningMs: 5 * 60 * 1000,
        })
      )

      // Initially should be 5 minutes (warning shows at 25 min)
      act(() => {
        vi.advanceTimersByTime(25 * 60 * 1000)
      })

      // Trigger activity check
      act(() => {
        vi.advanceTimersByTime(60 * 1000)
      })

      // Should show approximately 4 minutes remaining
      expect(result.current.minutesRemaining).toBeGreaterThanOrEqual(4)
      expect(result.current.minutesRemaining).toBeLessThanOrEqual(5)
    })

    it('does not trigger timeout when disabled', () => {
      const onTimeout = vi.fn()
      renderHook(() =>
        useSessionTimeout({
          enabled: false,
          timeoutMs: 30 * 60 * 1000,
          onTimeout,
        })
      )

      // Advance past timeout
      act(() => {
        vi.advanceTimersByTime(35 * 60 * 1000)
      })

      expect(onTimeout).not.toHaveBeenCalled()
    })

    it('resets activity timer with resetActivity', () => {
      const onWarning = vi.fn()
      const { result } = renderHook(() =>
        useSessionTimeout({
          enabled: true,
          timeoutMs: 30 * 60 * 1000,
          warningMs: 5 * 60 * 1000,
          onWarning,
        })
      )

      // Advance 20 minutes
      act(() => {
        vi.advanceTimersByTime(20 * 60 * 1000)
      })

      // Reset activity
      act(() => {
        result.current.resetActivity()
      })

      // Advance another 20 minutes
      act(() => {
        vi.advanceTimersByTime(20 * 60 * 1000)
      })

      // Warning should not show because we reset
      expect(result.current.isWarningVisible).toBe(false)
    })
  })

  describe('Custom Timeout Configuration', () => {
    it('respects custom timeout duration', () => {
      const onTimeout = vi.fn()
      renderHook(() =>
        useSessionTimeout({
          enabled: true,
          timeoutMs: 10 * 60 * 1000, // 10 minutes
          warningMs: 2 * 60 * 1000, // 2 minutes warning
          onTimeout,
        })
      )

      // Advance 10 minutes
      act(() => {
        vi.advanceTimersByTime(10 * 60 * 1000)
      })

      // Trigger check
      act(() => {
        vi.advanceTimersByTime(60 * 1000)
      })

      expect(onTimeout).toHaveBeenCalled()
    })

    it('respects custom warning duration', () => {
      const onWarning = vi.fn()
      renderHook(() =>
        useSessionTimeout({
          enabled: true,
          timeoutMs: 10 * 60 * 1000, // 10 minutes
          warningMs: 3 * 60 * 1000, // 3 minutes warning
          onWarning,
        })
      )

      // Advance 7 minutes (warning threshold at 10 - 3 = 7)
      act(() => {
        vi.advanceTimersByTime(7 * 60 * 1000)
      })

      // Trigger check
      act(() => {
        vi.advanceTimersByTime(60 * 1000)
      })

      expect(onWarning).toHaveBeenCalled()
    })
  })
})
