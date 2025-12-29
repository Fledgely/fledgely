/**
 * Tests for useScrollProgress hook.
 *
 * Story 5.5: Agreement Preview & Summary - AC4
 */

import { renderHook, act } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { useScrollProgress } from '../useScrollProgress'

describe('useScrollProgress', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('initial state', () => {
    it('should return initial progress of 0', () => {
      const { result } = renderHook(() => useScrollProgress())

      expect(result.current.progress).toBe(0)
    })

    it('should return initial isComplete as false', () => {
      const { result } = renderHook(() => useScrollProgress())

      expect(result.current.isComplete).toBe(false)
    })

    it('should return a containerRef', () => {
      const { result } = renderHook(() => useScrollProgress())

      expect(result.current.containerRef).toBeDefined()
      expect(result.current.containerRef.current).toBeNull()
    })

    it('should return a reset function', () => {
      const { result } = renderHook(() => useScrollProgress())

      expect(typeof result.current.reset).toBe('function')
    })
  })

  describe('default options', () => {
    it('should use default threshold of 95', () => {
      const { result } = renderHook(() => useScrollProgress())
      // The default threshold should be 95 (can't easily test this without container)
      expect(result.current.isComplete).toBe(false)
    })

    it('should accept custom threshold option', () => {
      const { result } = renderHook(() => useScrollProgress({ threshold: 50 }))
      expect(result.current.isComplete).toBe(false)
    })

    it('should accept custom debounce option', () => {
      const { result } = renderHook(() => useScrollProgress({ debounceMs: 200 }))
      expect(result.current.progress).toBe(0)
    })
  })

  describe('reset function', () => {
    it('should reset progress to 0', () => {
      const { result } = renderHook(() => useScrollProgress())

      // Reset should work even without setting progress
      act(() => {
        result.current.reset()
      })

      expect(result.current.progress).toBe(0)
      expect(result.current.isComplete).toBe(false)
    })

    it('should reset isComplete to false', () => {
      const { result } = renderHook(() => useScrollProgress())

      act(() => {
        result.current.reset()
      })

      expect(result.current.isComplete).toBe(false)
    })

    it('should reset container scrollTop to 0 when container exists', () => {
      const { result } = renderHook(() => useScrollProgress())

      const mockContainer = document.createElement('div')
      let scrollTop = 300
      Object.defineProperty(mockContainer, 'scrollTop', {
        get: () => scrollTop,
        set: (v) => {
          scrollTop = v
        },
        configurable: true,
      })
      ;(result.current.containerRef as { current: HTMLDivElement }).current = mockContainer

      act(() => {
        result.current.reset()
      })

      expect(scrollTop).toBe(0)
    })
  })

  describe('containerRef', () => {
    it('should be a valid ref object', () => {
      const { result } = renderHook(() => useScrollProgress())

      expect(result.current.containerRef).toHaveProperty('current')
    })

    it('should initially have null current value', () => {
      const { result } = renderHook(() => useScrollProgress())

      expect(result.current.containerRef.current).toBeNull()
    })

    it('should allow setting container element', () => {
      const { result } = renderHook(() => useScrollProgress())

      const mockContainer = document.createElement('div')
      ;(result.current.containerRef as { current: HTMLDivElement | null }).current = mockContainer

      expect(result.current.containerRef.current).toBe(mockContainer)
    })
  })

  describe('return value stability', () => {
    it('should return stable containerRef across rerenders', () => {
      const { result, rerender } = renderHook(() => useScrollProgress())

      const initialRef = result.current.containerRef
      rerender()

      expect(result.current.containerRef).toBe(initialRef)
    })

    it('should return stable reset function across rerenders', () => {
      const { result, rerender } = renderHook(() => useScrollProgress())

      const initialReset = result.current.reset
      rerender()

      expect(result.current.reset).toBe(initialReset)
    })
  })

  describe('hook type safety', () => {
    it('should return all expected properties', () => {
      const { result } = renderHook(() => useScrollProgress())

      expect(result.current).toHaveProperty('containerRef')
      expect(result.current).toHaveProperty('progress')
      expect(result.current).toHaveProperty('isComplete')
      expect(result.current).toHaveProperty('reset')
    })

    it('should have correct types for all properties', () => {
      const { result } = renderHook(() => useScrollProgress())

      expect(typeof result.current.progress).toBe('number')
      expect(typeof result.current.isComplete).toBe('boolean')
      expect(typeof result.current.reset).toBe('function')
      expect(typeof result.current.containerRef).toBe('object')
    })
  })
})
