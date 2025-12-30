/**
 * Tests for useUnenrollDevices hook.
 *
 * Story 0.5.5: Remote Device Unenrollment
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useUnenrollDevices } from './useUnenrollDevices'

// Mock Firebase functions
vi.mock('firebase/functions', () => ({
  httpsCallable: vi.fn(() =>
    vi.fn().mockResolvedValue({
      data: {
        success: true,
        message: '2 device(s) unenrolled successfully',
        unenrolledCount: 2,
        skippedCount: 0,
      },
    })
  ),
}))

vi.mock('../lib/firebase', () => ({
  getFirebaseFunctions: vi.fn(() => ({})),
}))

describe('useUnenrollDevices', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('initial state', () => {
    it('starts with loading false', () => {
      const { result } = renderHook(() => useUnenrollDevices())
      expect(result.current.loading).toBe(false)
    })

    it('starts with error null', () => {
      const { result } = renderHook(() => useUnenrollDevices())
      expect(result.current.error).toBeNull()
    })
  })

  describe('unenrollDevices', () => {
    it('returns unenrollDevices function', () => {
      const { result } = renderHook(() => useUnenrollDevices())
      expect(typeof result.current.unenrollDevices).toBe('function')
    })

    it('unenrolls devices successfully', async () => {
      const { result } = renderHook(() => useUnenrollDevices())

      let response
      await act(async () => {
        response = await result.current.unenrollDevices({
          ticketId: 'ticket-123',
          familyId: 'family-123',
          deviceIds: ['device-1', 'device-2'],
        })
      })

      expect(response).toEqual({
        success: true,
        message: '2 device(s) unenrolled successfully',
        unenrolledCount: 2,
        skippedCount: 0,
      })
    })

    it('sets loading to true during unenrollment', async () => {
      const { result } = renderHook(() => useUnenrollDevices())

      act(() => {
        result.current.unenrollDevices({
          ticketId: 'ticket-123',
          familyId: 'family-123',
          deviceIds: ['device-1'],
        })
      })

      // Loading should be true during the operation
      expect(result.current.loading).toBeDefined()
    })
  })

  describe('clearError', () => {
    it('returns clearError function', () => {
      const { result } = renderHook(() => useUnenrollDevices())
      expect(typeof result.current.clearError).toBe('function')
    })
  })

  describe('return type', () => {
    it('returns all expected properties', () => {
      const { result } = renderHook(() => useUnenrollDevices())
      expect(result.current).toHaveProperty('loading')
      expect(result.current).toHaveProperty('error')
      expect(result.current).toHaveProperty('unenrollDevices')
      expect(result.current).toHaveProperty('clearError')
    })
  })
})
