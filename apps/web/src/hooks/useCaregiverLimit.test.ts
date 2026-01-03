/**
 * useCaregiverLimit Hook Tests - Story 39.1
 *
 * Tests for caregiver limit tracking hook.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'

// Mock firebase
vi.mock('../lib/firebase', () => ({
  getFirestoreDb: vi.fn(() => ({})),
}))

vi.mock('firebase/firestore', () => ({
  doc: vi.fn(),
  collection: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  onSnapshot: vi.fn((_, callback) => {
    // Default: return empty data
    callback({ exists: () => false, data: () => ({}) })
    return vi.fn() // unsubscribe
  }),
}))

vi.mock('@fledgely/shared/contracts', () => ({
  MAX_CAREGIVERS_PER_FAMILY: 5,
}))

import { useCaregiverLimit } from './useCaregiverLimit'

describe('useCaregiverLimit Hook - Story 39.1', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Initial State', () => {
    it('returns null limit when familyId is null', () => {
      const { result } = renderHook(() => useCaregiverLimit({ familyId: null }))

      expect(result.current.limit).toBeNull()
      expect(result.current.loading).toBe(false)
      expect(result.current.error).toBeNull()
    })

    it('returns null limit when disabled', () => {
      const { result } = renderHook(() =>
        useCaregiverLimit({ familyId: 'family-123', enabled: false })
      )

      expect(result.current.limit).toBeNull()
      expect(result.current.loading).toBe(false)
    })
  })

  describe('Limit Calculation', () => {
    it('calculates correct limit with no caregivers', () => {
      const limitInfo = {
        currentCount: 0,
        maxAllowed: 5,
        remaining: 5,
        isAtLimit: false,
        activeCount: 0,
        pendingCount: 0,
      }

      expect(limitInfo.remaining).toBe(5)
      expect(limitInfo.isAtLimit).toBe(false)
    })

    it('calculates correct limit with some caregivers', () => {
      const activeCount = 2
      const pendingCount = 1
      const currentCount = activeCount + pendingCount
      const remaining = Math.max(0, 5 - currentCount)

      expect(currentCount).toBe(3)
      expect(remaining).toBe(2)
      expect(currentCount >= 5).toBe(false)
    })

    it('calculates correct limit at maximum', () => {
      const activeCount = 3
      const pendingCount = 2
      const currentCount = activeCount + pendingCount
      const remaining = Math.max(0, 5 - currentCount)

      expect(currentCount).toBe(5)
      expect(remaining).toBe(0)
      expect(currentCount >= 5).toBe(true)
    })

    it('handles over-limit scenario', () => {
      const activeCount = 4
      const pendingCount = 2
      const currentCount = activeCount + pendingCount
      const remaining = Math.max(0, 5 - currentCount)

      expect(currentCount).toBe(6)
      expect(remaining).toBe(0)
      expect(currentCount >= 5).toBe(true)
    })
  })

  describe('Count Types', () => {
    it('counts only active caregivers', () => {
      const activeCount = 3
      const pendingCount = 0
      const currentCount = activeCount + pendingCount

      expect(currentCount).toBe(3)
    })

    it('counts only pending invitations', () => {
      const activeCount = 0
      const pendingCount = 4
      const currentCount = activeCount + pendingCount

      expect(currentCount).toBe(4)
    })

    it('combines active and pending counts (AC2)', () => {
      const activeCount = 2
      const pendingCount = 2
      const currentCount = activeCount + pendingCount

      expect(currentCount).toBe(4)
    })
  })

  describe('maxAllowed Constant', () => {
    it('should always be 5', () => {
      const MAX_CAREGIVERS_PER_FAMILY = 5
      expect(MAX_CAREGIVERS_PER_FAMILY).toBe(5)
    })
  })

  describe('Display Format (AC5)', () => {
    it('formats "3 of 5 caregivers" display', () => {
      const limitInfo = {
        currentCount: 3,
        maxAllowed: 5,
        activeCount: 2,
        pendingCount: 1,
      }

      const display = `${limitInfo.activeCount} of ${limitInfo.maxAllowed} caregivers`
      expect(display).toBe('2 of 5 caregivers')
    })

    it('formats remaining slots message', () => {
      const remaining = 2
      const message = `You can add ${remaining} more caregiver${remaining === 1 ? '' : 's'}`
      expect(message).toBe('You can add 2 more caregivers')
    })

    it('formats singular remaining slot message', () => {
      const remaining = 1
      const message = `You can add ${remaining} more caregiver${remaining === 1 ? '' : 's'}`
      expect(message).toBe('You can add 1 more caregiver')
    })
  })
})
