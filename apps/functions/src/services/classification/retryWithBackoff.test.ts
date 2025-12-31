/**
 * Retry with Backoff Tests
 *
 * Story 20.1: Classification Service Architecture - AC6
 *
 * @vitest-environment node
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { retryWithBackoff, sleep } from './retryWithBackoff'

// Mock logger
vi.mock('firebase-functions/logger', () => ({
  error: vi.fn(),
  warn: vi.fn(),
  info: vi.fn(),
}))

describe('retryWithBackoff', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('successful operations', () => {
    it('returns result on first success', async () => {
      const fn = vi.fn().mockResolvedValue('success')

      const resultPromise = retryWithBackoff(fn)
      await vi.runAllTimersAsync()
      const result = await resultPromise

      expect(result).toBe('success')
      expect(fn).toHaveBeenCalledTimes(1)
    })

    it('returns result after retry success', async () => {
      const fn = vi.fn().mockRejectedValueOnce(new Error('timeout')).mockResolvedValue('success')

      const resultPromise = retryWithBackoff(fn)
      await vi.runAllTimersAsync()
      const result = await resultPromise

      expect(result).toBe('success')
      expect(fn).toHaveBeenCalledTimes(2)
    })
  })

  describe('retry behavior', () => {
    it('retries up to maxRetries times', async () => {
      const fn = vi.fn().mockRejectedValue(new Error('network error'))

      const promise = retryWithBackoff(fn, { maxRetries: 3 })

      // Catch the error before running timers to prevent unhandled rejection
      const catchPromise = promise.catch((e) => e)
      await vi.runAllTimersAsync()
      const error = await catchPromise

      expect(error.message).toBe('network error')
      expect(fn).toHaveBeenCalledTimes(4) // Initial + 3 retries
    })

    it('uses exponential backoff delays', async () => {
      const fn = vi.fn().mockRejectedValue(new Error('timeout'))
      const delays: number[] = []

      const originalSetTimeout = globalThis.setTimeout
      vi.spyOn(global, 'setTimeout').mockImplementation((callback, delay) => {
        if (typeof delay === 'number' && delay > 0) {
          delays.push(delay)
        }
        return originalSetTimeout(callback as () => void, 0)
      })

      const promise = retryWithBackoff(fn, { maxRetries: 3, baseDelayMs: 1000 })

      // Catch the error before running timers
      const catchPromise = promise.catch((e) => e)
      await vi.runAllTimersAsync()
      const error = await catchPromise

      expect(error).toBeInstanceOf(Error)

      // Expect delays of 1000, 2000, 4000
      expect(delays).toContain(1000)
      expect(delays).toContain(2000)
      expect(delays).toContain(4000)
    })

    it('respects custom maxRetries', async () => {
      const fn = vi.fn().mockRejectedValue(new Error('error'))

      const promise = retryWithBackoff(fn, { maxRetries: 1 })

      // Catch the error before running timers
      const catchPromise = promise.catch((e) => e)
      await vi.runAllTimersAsync()
      const error = await catchPromise

      expect(error.message).toBe('error')
      expect(fn).toHaveBeenCalledTimes(2) // Initial + 1 retry
    })
  })

  describe('retryable error detection', () => {
    it('does not retry authentication errors', async () => {
      const fn = vi.fn().mockRejectedValue(new Error('authentication failed'))

      const promise = retryWithBackoff(fn)

      // Catch the error before running timers
      const catchPromise = promise.catch((e) => e)
      await vi.runAllTimersAsync()
      const error = await catchPromise

      expect(error.message).toBe('authentication failed')
      expect(fn).toHaveBeenCalledTimes(1) // No retries
    })

    it('does not retry permission errors', async () => {
      const fn = vi.fn().mockRejectedValue(new Error('permission denied'))

      const promise = retryWithBackoff(fn)

      // Catch the error before running timers
      const catchPromise = promise.catch((e) => e)
      await vi.runAllTimersAsync()
      const error = await catchPromise

      expect(error.message).toBe('permission denied')
      expect(fn).toHaveBeenCalledTimes(1)
    })

    it('does not retry 400 errors', async () => {
      const fn = vi.fn().mockRejectedValue(new Error('400 Bad Request'))

      const promise = retryWithBackoff(fn)

      // Catch the error before running timers
      const catchPromise = promise.catch((e) => e)
      await vi.runAllTimersAsync()
      const error = await catchPromise

      expect(error.message).toBe('400 Bad Request')
      expect(fn).toHaveBeenCalledTimes(1)
    })

    it('retries timeout errors', async () => {
      const fn = vi.fn().mockRejectedValueOnce(new Error('timeout')).mockResolvedValue('success')

      const promise = retryWithBackoff(fn)
      await vi.runAllTimersAsync()

      const result = await promise
      expect(result).toBe('success')
      expect(fn).toHaveBeenCalledTimes(2)
    })

    it('retries 503 errors', async () => {
      const fn = vi
        .fn()
        .mockRejectedValueOnce(new Error('503 Service Unavailable'))
        .mockResolvedValue('success')

      const promise = retryWithBackoff(fn)
      await vi.runAllTimersAsync()

      const result = await promise
      expect(result).toBe('success')
      expect(fn).toHaveBeenCalledTimes(2)
    })

    it('retries 429 rate limit errors', async () => {
      const fn = vi
        .fn()
        .mockRejectedValueOnce(new Error('429 Rate Limit'))
        .mockResolvedValue('success')

      const promise = retryWithBackoff(fn)
      await vi.runAllTimersAsync()

      const result = await promise
      expect(result).toBe('success')
      expect(fn).toHaveBeenCalledTimes(2)
    })

    it('supports custom isRetryable function', async () => {
      const fn = vi.fn().mockRejectedValue(new Error('custom error'))
      const customIsRetryable = vi.fn().mockReturnValue(false)

      const promise = retryWithBackoff(fn, { isRetryable: customIsRetryable })

      // Catch the error before running timers
      const catchPromise = promise.catch((e) => e)
      await vi.runAllTimersAsync()
      const error = await catchPromise

      expect(error.message).toBe('custom error')
      expect(fn).toHaveBeenCalledTimes(1)
      expect(customIsRetryable).toHaveBeenCalled()
    })
  })
})

describe('sleep', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('resolves after specified delay', async () => {
    const promise = sleep(1000)
    vi.advanceTimersByTime(1000)
    await promise
  })

  it('does not resolve before delay', async () => {
    let resolved = false
    const promise = sleep(1000).then(() => {
      resolved = true
    })

    vi.advanceTimersByTime(500)
    expect(resolved).toBe(false)

    vi.advanceTimersByTime(500)
    await promise
    expect(resolved).toBe(true)
  })
})
