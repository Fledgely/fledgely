/**
 * useSafetyContact Hook Tests - Story 0.5.1
 *
 * Tests for the safety contact submission hook.
 *
 * Requirements tested:
 * - AC4: Form accepts message and safe contact info
 * - AC6: Form submission calls callable function
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useSafetyContact } from './useSafetyContact'
import type { SafetyContactInput } from '@fledgely/shared/contracts'

// Mock firebase functions
const mockHttpsCallable = vi.fn()
vi.mock('firebase/functions', () => ({
  httpsCallable: () => mockHttpsCallable,
}))

vi.mock('../lib/firebase', () => ({
  getFirebaseFunctions: vi.fn(),
}))

describe('useSafetyContact', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('Initial state', () => {
    it('should start with loading false', () => {
      const { result } = renderHook(() => useSafetyContact())

      expect(result.current.isLoading).toBe(false)
    })

    it('should start with no error', () => {
      const { result } = renderHook(() => useSafetyContact())

      expect(result.current.error).toBeNull()
    })

    it('should start with isSuccess false', () => {
      const { result } = renderHook(() => useSafetyContact())

      expect(result.current.isSuccess).toBe(false)
    })

    it('should provide submit function', () => {
      const { result } = renderHook(() => useSafetyContact())

      expect(typeof result.current.submit).toBe('function')
    })

    it('should provide reset function', () => {
      const { result } = renderHook(() => useSafetyContact())

      expect(typeof result.current.reset).toBe('function')
    })
  })

  describe('Successful submission', () => {
    it('should call callable function with correct data', async () => {
      mockHttpsCallable.mockResolvedValueOnce({
        data: { success: true, message: 'Your message has been received.' },
      })

      const { result } = renderHook(() => useSafetyContact())

      const input: SafetyContactInput = {
        message: 'I need help',
        safeContactInfo: null,
        urgency: 'when_you_can',
      }

      await act(async () => {
        await result.current.submit(input)
      })

      expect(mockHttpsCallable).toHaveBeenCalledWith(input)
    })

    it('should set isSuccess to true on success', async () => {
      mockHttpsCallable.mockResolvedValueOnce({
        data: { success: true, message: 'Your message has been received.' },
      })

      const { result } = renderHook(() => useSafetyContact())

      await act(async () => {
        await result.current.submit({
          message: 'Test message',
          safeContactInfo: null,
          urgency: 'when_you_can',
        })
      })

      expect(result.current.isSuccess).toBe(true)
    })

    it('should clear error on success', async () => {
      mockHttpsCallable.mockResolvedValueOnce({
        data: { success: true, message: 'Your message has been received.' },
      })

      const { result } = renderHook(() => useSafetyContact())

      await act(async () => {
        await result.current.submit({
          message: 'Test message',
          safeContactInfo: null,
          urgency: 'when_you_can',
        })
      })

      expect(result.current.error).toBeNull()
    })

    it('should set isLoading to false after completion', async () => {
      mockHttpsCallable.mockResolvedValueOnce({
        data: { success: true, message: 'Your message has been received.' },
      })

      const { result } = renderHook(() => useSafetyContact())

      await act(async () => {
        await result.current.submit({
          message: 'Test message',
          safeContactInfo: null,
          urgency: 'when_you_can',
        })
      })

      expect(result.current.isLoading).toBe(false)
    })

    it('should handle submission with safe contact info', async () => {
      mockHttpsCallable.mockResolvedValueOnce({
        data: { success: true, message: 'Your message has been received.' },
      })

      const { result } = renderHook(() => useSafetyContact())

      const input: SafetyContactInput = {
        message: 'I need help',
        safeContactInfo: {
          phone: '555-1234',
          email: 'safe@email.com',
          preferredMethod: 'email',
          safeTimeToContact: 'Weekdays 9-5',
        },
        urgency: 'soon',
      }

      await act(async () => {
        await result.current.submit(input)
      })

      expect(mockHttpsCallable).toHaveBeenCalledWith(input)
      expect(result.current.isSuccess).toBe(true)
    })
  })

  describe('Error handling', () => {
    it('should set neutral error message on rate limiting', async () => {
      mockHttpsCallable.mockRejectedValueOnce({ code: 'functions/resource-exhausted' })

      const { result } = renderHook(() => useSafetyContact())

      await act(async () => {
        await result.current.submit({
          message: 'Test message',
          safeContactInfo: null,
          urgency: 'when_you_can',
        })
      })

      expect(result.current.error).toBe('Please wait a moment before submitting again.')
      expect(result.current.isSuccess).toBe(false)
    })

    it('should set neutral error message on invalid argument', async () => {
      mockHttpsCallable.mockRejectedValueOnce({ code: 'functions/invalid-argument' })

      const { result } = renderHook(() => useSafetyContact())

      await act(async () => {
        await result.current.submit({
          message: 'Test message',
          safeContactInfo: null,
          urgency: 'when_you_can',
        })
      })

      expect(result.current.error).toBe('Please check your message and try again.')
    })

    it('should set neutral error message on unavailable', async () => {
      mockHttpsCallable.mockRejectedValueOnce({ code: 'functions/unavailable' })

      const { result } = renderHook(() => useSafetyContact())

      await act(async () => {
        await result.current.submit({
          message: 'Test message',
          safeContactInfo: null,
          urgency: 'when_you_can',
        })
      })

      expect(result.current.error).toBe(
        'Service temporarily unavailable. Please try again shortly.'
      )
    })

    it('should set generic neutral error message on unknown error', async () => {
      mockHttpsCallable.mockRejectedValueOnce({ code: 'functions/unknown' })

      const { result } = renderHook(() => useSafetyContact())

      await act(async () => {
        await result.current.submit({
          message: 'Test message',
          safeContactInfo: null,
          urgency: 'when_you_can',
        })
      })

      expect(result.current.error).toBe('Unable to send your message. Please try again.')
    })

    it('should set isLoading to false on error', async () => {
      mockHttpsCallable.mockRejectedValueOnce(new Error('Network error'))

      const { result } = renderHook(() => useSafetyContact())

      await act(async () => {
        await result.current.submit({
          message: 'Test message',
          safeContactInfo: null,
          urgency: 'when_you_can',
        })
      })

      expect(result.current.isLoading).toBe(false)
    })
  })

  describe('Reset functionality', () => {
    it('should reset all state', async () => {
      mockHttpsCallable.mockResolvedValueOnce({
        data: { success: true, message: 'Your message has been received.' },
      })

      const { result } = renderHook(() => useSafetyContact())

      // Submit successfully first
      await act(async () => {
        await result.current.submit({
          message: 'Test message',
          safeContactInfo: null,
          urgency: 'when_you_can',
        })
      })

      expect(result.current.isSuccess).toBe(true)

      // Reset
      act(() => {
        result.current.reset()
      })

      expect(result.current.isSuccess).toBe(false)
      expect(result.current.error).toBeNull()
      expect(result.current.isLoading).toBe(false)
    })

    it('should clear error on reset', async () => {
      mockHttpsCallable.mockRejectedValueOnce(new Error('Error'))

      const { result } = renderHook(() => useSafetyContact())

      await act(async () => {
        await result.current.submit({
          message: 'Test message',
          safeContactInfo: null,
          urgency: 'when_you_can',
        })
      })

      expect(result.current.error).not.toBeNull()

      act(() => {
        result.current.reset()
      })

      expect(result.current.error).toBeNull()
    })
  })
})
