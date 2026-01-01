/**
 * useAgreementExpiry Hook Tests - Story 35.1
 *
 * Tests for managing agreement expiry date state and calculations.
 * AC1: Expiry options (3 months, 6 months, 1 year, no expiry)
 * AC4: Annual review for no-expiry agreements
 * AC5: Expiry date can be changed
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useAgreementExpiry } from './useAgreementExpiry'

describe('useAgreementExpiry - Story 35.1', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-06-01'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('initialization', () => {
    it('should initialize with default values', () => {
      const { result } = renderHook(() => useAgreementExpiry())

      expect(result.current.selectedDuration).toBe('6-months')
      expect(result.current.expiryDate).toBeDefined()
    })

    it('should accept initial duration', () => {
      const { result } = renderHook(() => useAgreementExpiry({ initialDuration: '1-year' }))

      expect(result.current.selectedDuration).toBe('1-year')
    })

    it('should accept initial expiry date', () => {
      const initialDate = new Date('2024-12-01')
      const { result } = renderHook(() => useAgreementExpiry({ initialExpiryDate: initialDate }))

      expect(result.current.expiryDate).toEqual(initialDate)
    })
  })

  describe('duration selection (AC1)', () => {
    it('should update duration when selected', () => {
      const { result } = renderHook(() => useAgreementExpiry())

      act(() => {
        result.current.setDuration('3-months')
      })

      expect(result.current.selectedDuration).toBe('3-months')
    })

    it('should calculate correct expiry date for 3 months', () => {
      const { result } = renderHook(() => useAgreementExpiry())

      act(() => {
        result.current.setDuration('3-months')
      })

      const expectedDate = new Date('2024-09-01')
      expect(result.current.expiryDate?.getMonth()).toBe(expectedDate.getMonth())
      expect(result.current.expiryDate?.getFullYear()).toBe(expectedDate.getFullYear())
    })

    it('should calculate correct expiry date for 6 months', () => {
      const { result } = renderHook(() => useAgreementExpiry())

      act(() => {
        result.current.setDuration('6-months')
      })

      const expectedDate = new Date('2024-12-01')
      expect(result.current.expiryDate?.getMonth()).toBe(expectedDate.getMonth())
    })

    it('should calculate correct expiry date for 1 year', () => {
      const { result } = renderHook(() => useAgreementExpiry())

      act(() => {
        result.current.setDuration('1-year')
      })

      const expectedDate = new Date('2025-06-01')
      expect(result.current.expiryDate?.getFullYear()).toBe(expectedDate.getFullYear())
    })

    it('should set null expiry date for no-expiry', () => {
      const { result } = renderHook(() => useAgreementExpiry())

      act(() => {
        result.current.setDuration('no-expiry')
      })

      expect(result.current.expiryDate).toBeNull()
    })
  })

  describe('age-based recommendations', () => {
    it('should return recommended duration for children under 13', () => {
      const { result } = renderHook(() => useAgreementExpiry({ childAge: 10 }))

      expect(result.current.recommendedDuration).toBe('6-months')
    })

    it('should return recommended duration for teens 13+', () => {
      const { result } = renderHook(() => useAgreementExpiry({ childAge: 15 }))

      expect(result.current.recommendedDuration).toBe('1-year')
    })

    it('should return null when no child age provided', () => {
      const { result } = renderHook(() => useAgreementExpiry())

      expect(result.current.recommendedDuration).toBeNull()
    })
  })

  describe('expiry status', () => {
    it('should indicate when expiry is soon', () => {
      const soonDate = new Date('2024-06-20') // 19 days away
      const { result } = renderHook(() => useAgreementExpiry({ initialExpiryDate: soonDate }))

      expect(result.current.isExpiringSoon).toBe(true)
    })

    it('should not indicate soon when far away', () => {
      const farDate = new Date('2024-12-01') // 6 months away
      const { result } = renderHook(() => useAgreementExpiry({ initialExpiryDate: farDate }))

      expect(result.current.isExpiringSoon).toBe(false)
    })

    it('should indicate when expired', () => {
      const pastDate = new Date('2024-05-01') // in the past
      const { result } = renderHook(() => useAgreementExpiry({ initialExpiryDate: pastDate }))

      expect(result.current.isExpired).toBe(true)
    })

    it('should return days until expiry', () => {
      const futureDate = new Date('2024-06-11') // 10 days away
      const { result } = renderHook(() => useAgreementExpiry({ initialExpiryDate: futureDate }))

      expect(result.current.daysUntilExpiry).toBe(10)
    })
  })

  describe('annual review for no-expiry (AC4)', () => {
    it('should calculate annual review date', () => {
      const { result } = renderHook(() => useAgreementExpiry())

      act(() => {
        result.current.setDuration('no-expiry')
      })

      expect(result.current.annualReviewDate).toBeDefined()
      expect(result.current.annualReviewDate?.getFullYear()).toBe(2025)
    })

    it('should not have annual review for expiring agreements', () => {
      const { result } = renderHook(() => useAgreementExpiry())

      act(() => {
        result.current.setDuration('6-months')
      })

      expect(result.current.annualReviewDate).toBeNull()
    })
  })

  describe('reset functionality', () => {
    it('should reset to default values', () => {
      const { result } = renderHook(() => useAgreementExpiry())

      act(() => {
        result.current.setDuration('1-year')
      })

      act(() => {
        result.current.reset()
      })

      expect(result.current.selectedDuration).toBe('6-months')
    })
  })

  describe('custom start date', () => {
    it('should calculate expiry from custom start date', () => {
      const startDate = new Date('2024-08-01')
      const { result } = renderHook(() => useAgreementExpiry({ startDate }))

      act(() => {
        result.current.setDuration('3-months')
      })

      expect(result.current.expiryDate?.getMonth()).toBe(10) // November
    })
  })
})
