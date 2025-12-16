/**
 * useCrisisProtection Hook Tests
 *
 * Story 7.2: Crisis Visit Zero-Data-Path - Task 2.5
 *
 * Tests the synchronous blocking behavior of the crisis protection hook.
 *
 * CRITICAL: AC 6 - Check happens BEFORE any capture attempt (synchronous blocking)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'

// Mock the service
vi.mock('@/services/crisisProtectionService', () => ({
  shouldBlockMonitoring: vi.fn(),
  crisisGuard: {
    shouldBlock: vi.fn(),
    shouldBlockScreenshot: vi.fn(),
    shouldBlockUrlLogging: vi.fn(),
    shouldBlockTimeTracking: vi.fn(),
    shouldBlockNotification: vi.fn(),
    shouldBlockAnalytics: vi.fn(),
  },
}))

import { useCrisisProtection, measureCheckDuration } from './useCrisisProtection'
import { shouldBlockMonitoring, crisisGuard } from '@/services/crisisProtectionService'

const mockShouldBlockMonitoring = vi.mocked(shouldBlockMonitoring)
const mockCrisisGuard = vi.mocked(crisisGuard)

describe('useCrisisProtection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Default mock implementations
    mockShouldBlockMonitoring.mockReturnValue(false)
    mockCrisisGuard.shouldBlock.mockReturnValue(false)
    mockCrisisGuard.shouldBlockScreenshot.mockReturnValue(false)
    mockCrisisGuard.shouldBlockUrlLogging.mockReturnValue(false)
    mockCrisisGuard.shouldBlockTimeTracking.mockReturnValue(false)
    mockCrisisGuard.shouldBlockNotification.mockReturnValue(false)
    mockCrisisGuard.shouldBlockAnalytics.mockReturnValue(false)
  })

  describe('hook initialization', () => {
    it('returns all blocking functions', () => {
      const { result } = renderHook(() => useCrisisProtection())

      expect(result.current.shouldBlock).toBeDefined()
      expect(typeof result.current.shouldBlock).toBe('function')
      expect(result.current.shouldBlockScreenshot).toBeDefined()
      expect(result.current.shouldBlockUrlLogging).toBeDefined()
      expect(result.current.shouldBlockTimeTracking).toBeDefined()
      expect(result.current.shouldBlockNotification).toBeDefined()
      expect(result.current.shouldBlockAnalytics).toBeDefined()
    })

    it('returns checkUrl helper', () => {
      const { result } = renderHook(() => useCrisisProtection())

      expect(result.current.checkUrl).toBeDefined()
      expect(typeof result.current.checkUrl).toBe('function')
    })
  })

  describe('synchronous blocking (AC: 6)', () => {
    it('shouldBlock is synchronous (not async)', () => {
      mockCrisisGuard.shouldBlock.mockReturnValue(true)

      const { result } = renderHook(() => useCrisisProtection())

      // The function should return immediately, not a promise
      const blockResult = result.current.shouldBlock('https://988lifeline.org')
      expect(blockResult).not.toBeInstanceOf(Promise)
      expect(typeof blockResult).toBe('boolean')
    })

    it('checkUrl returns boolean directly (not promise)', () => {
      mockShouldBlockMonitoring.mockReturnValue(true)

      const { result } = renderHook(() => useCrisisProtection())

      const checkResult = result.current.checkUrl('https://988lifeline.org')
      expect(checkResult).not.toBeInstanceOf(Promise)
      expect(typeof checkResult).toBe('boolean')
    })

    it('check is called BEFORE any action can proceed', () => {
      const captureAttempts: string[] = []

      mockCrisisGuard.shouldBlock.mockImplementation((url: string) => {
        captureAttempts.push(`check:${url}`)
        return url.includes('988lifeline')
      })

      const { result } = renderHook(() => useCrisisProtection())

      // Simulate a monitoring flow
      const url = 'https://988lifeline.org'
      const shouldProceed = !result.current.shouldBlock(url)

      if (shouldProceed) {
        captureAttempts.push('capture')
      }

      // Check should be first, capture should not happen
      expect(captureAttempts).toEqual([`check:${url}`])
      expect(captureAttempts).not.toContain('capture')
    })
  })

  describe('crisis URL detection', () => {
    it('returns true for crisis URLs', () => {
      mockCrisisGuard.shouldBlock.mockReturnValue(true)

      const { result } = renderHook(() => useCrisisProtection())

      expect(result.current.shouldBlock('https://988lifeline.org')).toBe(true)
    })

    it('returns false for non-crisis URLs', () => {
      mockCrisisGuard.shouldBlock.mockReturnValue(false)

      const { result } = renderHook(() => useCrisisProtection())

      expect(result.current.shouldBlock('https://google.com')).toBe(false)
    })
  })

  describe('specific blocking functions', () => {
    it('shouldBlockScreenshot blocks for crisis URLs', () => {
      mockCrisisGuard.shouldBlockScreenshot.mockReturnValue(true)

      const { result } = renderHook(() => useCrisisProtection())

      expect(result.current.shouldBlockScreenshot('https://988lifeline.org')).toBe(true)
    })

    it('shouldBlockUrlLogging blocks for crisis URLs', () => {
      mockCrisisGuard.shouldBlockUrlLogging.mockReturnValue(true)

      const { result } = renderHook(() => useCrisisProtection())

      expect(result.current.shouldBlockUrlLogging('https://rainn.org')).toBe(true)
    })

    it('shouldBlockTimeTracking blocks for crisis URLs', () => {
      mockCrisisGuard.shouldBlockTimeTracking.mockReturnValue(true)

      const { result } = renderHook(() => useCrisisProtection())

      expect(result.current.shouldBlockTimeTracking('https://thetrevoproject.org')).toBe(true)
    })

    it('shouldBlockNotification blocks for crisis URLs', () => {
      mockCrisisGuard.shouldBlockNotification.mockReturnValue(true)

      const { result } = renderHook(() => useCrisisProtection())

      expect(result.current.shouldBlockNotification('https://thehotline.org')).toBe(true)
    })

    it('shouldBlockAnalytics blocks for crisis URLs', () => {
      mockCrisisGuard.shouldBlockAnalytics.mockReturnValue(true)

      const { result } = renderHook(() => useCrisisProtection())

      expect(result.current.shouldBlockAnalytics('https://childhelp.org')).toBe(true)
    })
  })
})

describe('measureCheckDuration', () => {
  it('returns duration in milliseconds', () => {
    mockShouldBlockMonitoring.mockReturnValue(false)

    const duration = measureCheckDuration('https://google.com')

    expect(typeof duration).toBe('number')
    expect(duration).toBeGreaterThanOrEqual(0)
  })

  it('executes quickly (target <10ms)', () => {
    mockShouldBlockMonitoring.mockReturnValue(false)

    const duration = measureCheckDuration('https://google.com')

    // The check should be very fast - well under 10ms
    expect(duration).toBeLessThan(10)
  })

  it('measures actual check execution', () => {
    let checkCalled = false
    mockShouldBlockMonitoring.mockImplementation(() => {
      checkCalled = true
      return false
    })

    measureCheckDuration('https://example.com')

    expect(checkCalled).toBe(true)
  })
})
