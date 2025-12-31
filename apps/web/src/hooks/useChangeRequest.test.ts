/**
 * useChangeRequest Hook Tests - Story 19C.5
 *
 * Task 4: Test useChangeRequest hook (AC: #3)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useChangeRequest } from './useChangeRequest'

// Mock the service
vi.mock('../services/agreementChangeService', () => ({
  submitChangeRequest: vi.fn(),
  createParentNotification: vi.fn(),
}))

import { submitChangeRequest, createParentNotification } from '../services/agreementChangeService'

const mockSubmitChangeRequest = submitChangeRequest as ReturnType<typeof vi.fn>
const mockCreateParentNotification = createParentNotification as ReturnType<typeof vi.fn>

describe('useChangeRequest', () => {
  const defaultProps = {
    childId: 'child-123',
    childName: 'Alex',
    familyId: 'family-456',
    agreementId: 'agreement-789',
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockSubmitChangeRequest.mockResolvedValue({ requestId: 'request-123', parentNotified: false })
    mockCreateParentNotification.mockResolvedValue('notification-123')
  })

  describe('initial state', () => {
    it('should return initial state with isSubmitting false', () => {
      const { result } = renderHook(() => useChangeRequest(defaultProps))

      expect(result.current.isSubmitting).toBe(false)
    })

    it('should return initial state with isSuccess false', () => {
      const { result } = renderHook(() => useChangeRequest(defaultProps))

      expect(result.current.isSuccess).toBe(false)
    })

    it('should return initial state with error null', () => {
      const { result } = renderHook(() => useChangeRequest(defaultProps))

      expect(result.current.error).toBeNull()
    })

    it('should return submit function', () => {
      const { result } = renderHook(() => useChangeRequest(defaultProps))

      expect(typeof result.current.submit).toBe('function')
    })

    it('should return reset function', () => {
      const { result } = renderHook(() => useChangeRequest(defaultProps))

      expect(typeof result.current.reset).toBe('function')
    })
  })

  describe('submit', () => {
    it('should set isSubmitting to true during submission', async () => {
      // Create a promise we can control
      let resolveSubmit: (value: unknown) => void
      const submitPromise = new Promise((resolve) => {
        resolveSubmit = resolve
      })
      mockSubmitChangeRequest.mockReturnValue(submitPromise)

      const { result } = renderHook(() => useChangeRequest(defaultProps))

      act(() => {
        result.current.submit({ whatToChange: 'More time', why: null })
      })

      expect(result.current.isSubmitting).toBe(true)

      // Resolve the promise
      await act(async () => {
        resolveSubmit!({ requestId: 'request-123', parentNotified: false })
        await submitPromise
      })
    })

    it('should call submitChangeRequest with correct input', async () => {
      const { result } = renderHook(() => useChangeRequest(defaultProps))

      await act(async () => {
        await result.current.submit({ whatToChange: 'More time', why: 'Finished homework' })
      })

      expect(mockSubmitChangeRequest).toHaveBeenCalledWith({
        childId: 'child-123',
        childName: 'Alex',
        familyId: 'family-456',
        agreementId: 'agreement-789',
        whatToChange: 'More time',
        why: 'Finished homework',
      })
    })

    it('should call createParentNotification after successful submit (AC3)', async () => {
      const { result } = renderHook(() => useChangeRequest(defaultProps))

      await act(async () => {
        await result.current.submit({ whatToChange: 'More time', why: null })
      })

      expect(mockCreateParentNotification).toHaveBeenCalledWith('family-456', 'request-123', 'Alex')
    })

    it('should set isSuccess to true after successful submission', async () => {
      const { result } = renderHook(() => useChangeRequest(defaultProps))

      await act(async () => {
        await result.current.submit({ whatToChange: 'More time', why: null })
      })

      expect(result.current.isSuccess).toBe(true)
    })

    it('should set isSubmitting to false after successful submission', async () => {
      const { result } = renderHook(() => useChangeRequest(defaultProps))

      await act(async () => {
        await result.current.submit({ whatToChange: 'More time', why: null })
      })

      expect(result.current.isSubmitting).toBe(false)
    })

    it('should handle null why field', async () => {
      const { result } = renderHook(() => useChangeRequest(defaultProps))

      await act(async () => {
        await result.current.submit({ whatToChange: 'More time', why: null })
      })

      expect(mockSubmitChangeRequest).toHaveBeenCalledWith(expect.objectContaining({ why: null }))
    })
  })

  describe('error handling', () => {
    it('should set error message on submitChangeRequest failure', async () => {
      mockSubmitChangeRequest.mockRejectedValue(new Error('Network error'))

      const { result } = renderHook(() => useChangeRequest(defaultProps))

      await act(async () => {
        try {
          await result.current.submit({ whatToChange: 'More time', why: null })
        } catch {
          // Expected to throw
        }
      })

      expect(result.current.error).toBe('Network error')
    })

    it('should set isSubmitting to false on error', async () => {
      mockSubmitChangeRequest.mockRejectedValue(new Error('Network error'))

      const { result } = renderHook(() => useChangeRequest(defaultProps))

      await act(async () => {
        try {
          await result.current.submit({ whatToChange: 'More time', why: null })
        } catch {
          // Expected to throw
        }
      })

      expect(result.current.isSubmitting).toBe(false)
    })

    it('should not set isSuccess on error', async () => {
      mockSubmitChangeRequest.mockRejectedValue(new Error('Network error'))

      const { result } = renderHook(() => useChangeRequest(defaultProps))

      await act(async () => {
        try {
          await result.current.submit({ whatToChange: 'More time', why: null })
        } catch {
          // Expected to throw
        }
      })

      expect(result.current.isSuccess).toBe(false)
    })

    it('should re-throw error for caller to handle', async () => {
      mockSubmitChangeRequest.mockRejectedValue(new Error('Network error'))

      const { result } = renderHook(() => useChangeRequest(defaultProps))

      await expect(
        act(async () => {
          await result.current.submit({ whatToChange: 'More time', why: null })
        })
      ).rejects.toThrow('Network error')
    })

    it('should handle non-Error objects', async () => {
      mockSubmitChangeRequest.mockRejectedValue('Unknown error')

      const { result } = renderHook(() => useChangeRequest(defaultProps))

      await act(async () => {
        try {
          await result.current.submit({ whatToChange: 'More time', why: null })
        } catch {
          // Expected to throw
        }
      })

      expect(result.current.error).toBe('Failed to send request')
    })

    it('should handle createParentNotification failure', async () => {
      mockCreateParentNotification.mockRejectedValue(new Error('Notification failed'))

      const { result } = renderHook(() => useChangeRequest(defaultProps))

      await act(async () => {
        try {
          await result.current.submit({ whatToChange: 'More time', why: null })
        } catch {
          // Expected to throw
        }
      })

      expect(result.current.error).toBe('Notification failed')
    })
  })

  describe('reset', () => {
    it('should reset isSubmitting to false', async () => {
      const { result } = renderHook(() => useChangeRequest(defaultProps))

      await act(async () => {
        await result.current.submit({ whatToChange: 'More time', why: null })
      })

      act(() => {
        result.current.reset()
      })

      expect(result.current.isSubmitting).toBe(false)
    })

    it('should reset isSuccess to false', async () => {
      const { result } = renderHook(() => useChangeRequest(defaultProps))

      await act(async () => {
        await result.current.submit({ whatToChange: 'More time', why: null })
      })

      expect(result.current.isSuccess).toBe(true)

      act(() => {
        result.current.reset()
      })

      expect(result.current.isSuccess).toBe(false)
    })

    it('should reset error to null', async () => {
      mockSubmitChangeRequest.mockRejectedValue(new Error('Network error'))

      const { result } = renderHook(() => useChangeRequest(defaultProps))

      await act(async () => {
        try {
          await result.current.submit({ whatToChange: 'More time', why: null })
        } catch {
          // Expected to throw
        }
      })

      expect(result.current.error).toBe('Network error')

      act(() => {
        result.current.reset()
      })

      expect(result.current.error).toBeNull()
    })
  })

  describe('memoization', () => {
    it('should memoize submit function with same props', () => {
      const { result, rerender } = renderHook(() => useChangeRequest(defaultProps))

      const firstSubmit = result.current.submit
      rerender()
      const secondSubmit = result.current.submit

      expect(firstSubmit).toBe(secondSubmit)
    })

    it('should memoize reset function', () => {
      const { result, rerender } = renderHook(() => useChangeRequest(defaultProps))

      const firstReset = result.current.reset
      rerender()
      const secondReset = result.current.reset

      expect(firstReset).toBe(secondReset)
    })

    it('should update submit when props change', () => {
      const { result, rerender } = renderHook((props) => useChangeRequest(props), {
        initialProps: defaultProps,
      })

      const firstSubmit = result.current.submit
      rerender({ ...defaultProps, childId: 'child-new' })
      const secondSubmit = result.current.submit

      expect(firstSubmit).not.toBe(secondSubmit)
    })
  })

  describe('clear error on new submission', () => {
    it('should clear previous error when starting new submission', async () => {
      mockSubmitChangeRequest.mockRejectedValueOnce(new Error('First error'))
      mockSubmitChangeRequest.mockResolvedValueOnce({
        requestId: 'request-123',
        parentNotified: false,
      })

      const { result } = renderHook(() => useChangeRequest(defaultProps))

      // First submission fails
      await act(async () => {
        try {
          await result.current.submit({ whatToChange: 'More time', why: null })
        } catch {
          // Expected to throw
        }
      })

      expect(result.current.error).toBe('First error')

      // Second submission starts - error should be cleared
      await act(async () => {
        await result.current.submit({ whatToChange: 'More time', why: null })
      })

      expect(result.current.error).toBeNull()
    })
  })
})
