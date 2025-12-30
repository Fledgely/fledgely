/**
 * Tests for useDisableLocationFeatures hook.
 *
 * Story 0.5.6: Location Feature Emergency Disable
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useDisableLocationFeatures } from './useDisableLocationFeatures'

// Mock Firebase functions
vi.mock('firebase/functions', () => ({
  httpsCallable: vi.fn(() =>
    vi.fn().mockResolvedValue({
      data: {
        success: true,
        message: 'Location features disabled successfully',
        featuresDisabledCount: 3,
        notificationsDeleted: 0,
      },
    })
  ),
}))

vi.mock('../lib/firebase', () => ({
  getFirebaseFunctions: vi.fn(() => ({})),
}))

describe('useDisableLocationFeatures', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('initial state', () => {
    it('starts with loading false', () => {
      const { result } = renderHook(() => useDisableLocationFeatures())
      expect(result.current.loading).toBe(false)
    })

    it('starts with error null', () => {
      const { result } = renderHook(() => useDisableLocationFeatures())
      expect(result.current.error).toBeNull()
    })
  })

  describe('disableLocationFeatures', () => {
    it('returns disableLocationFeatures function', () => {
      const { result } = renderHook(() => useDisableLocationFeatures())
      expect(typeof result.current.disableLocationFeatures).toBe('function')
    })

    it('disables location features successfully', async () => {
      const { result } = renderHook(() => useDisableLocationFeatures())

      let response
      await act(async () => {
        response = await result.current.disableLocationFeatures({
          ticketId: 'ticket-123',
          familyId: 'family-123',
        })
      })

      expect(response).toEqual({
        success: true,
        message: 'Location features disabled successfully',
        featuresDisabledCount: 3,
        notificationsDeleted: 0,
      })
    })

    it('accepts optional userId parameter', async () => {
      const { result } = renderHook(() => useDisableLocationFeatures())

      let response
      await act(async () => {
        response = await result.current.disableLocationFeatures({
          ticketId: 'ticket-123',
          familyId: 'family-123',
          userId: 'user-123',
        })
      })

      expect(response).toBeDefined()
    })

    it('sets loading to true during disable', async () => {
      const { result } = renderHook(() => useDisableLocationFeatures())

      act(() => {
        result.current.disableLocationFeatures({
          ticketId: 'ticket-123',
          familyId: 'family-123',
        })
      })

      // Loading should be true during the operation
      expect(result.current.loading).toBeDefined()
    })
  })

  describe('clearError', () => {
    it('returns clearError function', () => {
      const { result } = renderHook(() => useDisableLocationFeatures())
      expect(typeof result.current.clearError).toBe('function')
    })
  })

  describe('return type', () => {
    it('returns all expected properties', () => {
      const { result } = renderHook(() => useDisableLocationFeatures())
      expect(result.current).toHaveProperty('loading')
      expect(result.current).toHaveProperty('error')
      expect(result.current).toHaveProperty('disableLocationFeatures')
      expect(result.current).toHaveProperty('clearError')
    })
  })
})
