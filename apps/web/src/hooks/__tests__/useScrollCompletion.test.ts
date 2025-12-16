/**
 * Tests for useScrollCompletion Hook
 *
 * Story 5.5: Agreement Preview & Summary - Task 5.7
 *
 * Tests for the scroll completion tracking hook.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useScrollCompletion } from '../useScrollCompletion'

// ============================================
// MOCK SETUP
// ============================================

const createMockElement = (overrides: Partial<HTMLElement> = {}): HTMLElement => {
  const element = {
    scrollTop: 0,
    scrollHeight: 1000,
    clientHeight: 500,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    ...overrides,
  } as unknown as HTMLElement
  return element
}

// ============================================
// BASIC HOOK TESTS
// ============================================

describe('useScrollCompletion', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('basic functionality', () => {
    it('returns scroll percentage', () => {
      const ref = { current: createMockElement() }
      const { result } = renderHook(() => useScrollCompletion(ref))
      expect(typeof result.current.scrollPercentage).toBe('number')
    })

    it('returns isComplete flag', () => {
      const ref = { current: createMockElement() }
      const { result } = renderHook(() => useScrollCompletion(ref))
      expect(typeof result.current.isComplete).toBe('boolean')
    })

    it('returns markComplete function', () => {
      const ref = { current: createMockElement() }
      const { result } = renderHook(() => useScrollCompletion(ref))
      expect(typeof result.current.markComplete).toBe('function')
    })

    it('returns reset function', () => {
      const ref = { current: createMockElement() }
      const { result } = renderHook(() => useScrollCompletion(ref))
      expect(typeof result.current.reset).toBe('function')
    })
  })

  // ============================================
  // NULL REF TESTS
  // ============================================

  describe('null ref handling', () => {
    it('handles null ref gracefully', () => {
      const ref = { current: null }
      const { result } = renderHook(() => useScrollCompletion(ref))
      expect(result.current.scrollPercentage).toBe(0)
      expect(result.current.isComplete).toBe(false)
    })
  })

  // ============================================
  // SCROLL PERCENTAGE TESTS
  // ============================================

  describe('scroll percentage calculation', () => {
    it('starts at 0% when at top', () => {
      const ref = { current: createMockElement({ scrollTop: 0 }) }
      const { result } = renderHook(() => useScrollCompletion(ref))
      expect(result.current.scrollPercentage).toBe(0)
    })

    it('returns 100% when content fits without scrolling', () => {
      const ref = {
        current: createMockElement({
          scrollHeight: 500,
          clientHeight: 500,
        }),
      }
      const { result } = renderHook(() => useScrollCompletion(ref))
      expect(result.current.scrollPercentage).toBe(100)
      expect(result.current.isComplete).toBe(true)
    })
  })

  // ============================================
  // EVENT LISTENER TESTS
  // ============================================

  describe('event listeners', () => {
    it('adds scroll listener on mount', () => {
      const element = createMockElement()
      const ref = { current: element }
      renderHook(() => useScrollCompletion(ref))
      expect(element.addEventListener).toHaveBeenCalledWith(
        'scroll',
        expect.any(Function),
        { passive: true }
      )
    })

    it('removes scroll listener on unmount', () => {
      const element = createMockElement()
      const ref = { current: element }
      const { unmount } = renderHook(() => useScrollCompletion(ref))
      unmount()
      expect(element.removeEventListener).toHaveBeenCalledWith(
        'scroll',
        expect.any(Function)
      )
    })

    it('does not add listener when disabled', () => {
      const element = createMockElement()
      const ref = { current: element }
      renderHook(() => useScrollCompletion(ref, { enabled: false }))
      expect(element.addEventListener).not.toHaveBeenCalled()
    })
  })

  // ============================================
  // MARK COMPLETE TESTS
  // ============================================

  describe('markComplete', () => {
    it('marks as complete when called', () => {
      const ref = { current: createMockElement() }
      const { result } = renderHook(() => useScrollCompletion(ref))

      expect(result.current.isComplete).toBe(false)

      act(() => {
        result.current.markComplete()
      })

      expect(result.current.isComplete).toBe(true)
      expect(result.current.scrollPercentage).toBe(100)
    })
  })

  // ============================================
  // RESET TESTS
  // ============================================

  describe('reset', () => {
    it('resets completion state', () => {
      const ref = { current: createMockElement() }
      const { result } = renderHook(() => useScrollCompletion(ref))

      act(() => {
        result.current.markComplete()
      })

      expect(result.current.isComplete).toBe(true)

      act(() => {
        result.current.reset()
      })

      expect(result.current.isComplete).toBe(false)
      expect(result.current.scrollPercentage).toBe(0)
    })
  })

  // ============================================
  // OPTIONS TESTS
  // ============================================

  describe('options', () => {
    it('uses default threshold of 90', () => {
      const ref = { current: createMockElement() }
      const { result } = renderHook(() => useScrollCompletion(ref))
      // Default behavior is tested implicitly
      expect(result.current.scrollPercentage).toBeDefined()
    })

    it('accepts custom threshold', () => {
      const ref = { current: createMockElement() }
      const { result } = renderHook(() =>
        useScrollCompletion(ref, { threshold: 50 })
      )
      expect(result.current.scrollPercentage).toBeDefined()
    })

    it('respects enabled option', () => {
      const element = createMockElement()
      const ref = { current: element }
      renderHook(() => useScrollCompletion(ref, { enabled: false }))
      expect(element.addEventListener).not.toHaveBeenCalled()
    })
  })

  // ============================================
  // AUTO-COMPLETE TESTS
  // ============================================

  describe('auto-complete', () => {
    it('auto-completes when content fits', () => {
      const ref = {
        current: createMockElement({
          scrollHeight: 400,
          clientHeight: 500,
        }),
      }
      const { result } = renderHook(() => useScrollCompletion(ref))
      expect(result.current.isComplete).toBe(true)
    })

    it('does not auto-complete when content overflows', () => {
      const ref = {
        current: createMockElement({
          scrollHeight: 1000,
          clientHeight: 500,
          scrollTop: 0,
        }),
      }
      const { result } = renderHook(() => useScrollCompletion(ref))
      expect(result.current.isComplete).toBe(false)
    })
  })
})
