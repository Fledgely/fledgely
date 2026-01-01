/**
 * useGracePeriod Hook Tests - Story 35.4
 *
 * Tests for grace period state management hook.
 * AC1: 14-day grace period starts automatically
 * AC3: Banner shown to users
 * AC6: Child sees appropriate message
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useGracePeriod } from './useGracePeriod'

describe('useGracePeriod - Story 35.4', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-06-15'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('initial state', () => {
    it('should return not in grace period for active agreement', () => {
      const { result } = renderHook(() =>
        useGracePeriod({
          agreementId: 'agreement-123',
          expiryDate: new Date('2024-07-01'),
          userRole: 'parent',
        })
      )

      expect(result.current.isInGracePeriod).toBe(false)
      expect(result.current.showBanner).toBe(false)
      expect(result.current.daysRemaining).toBeNull()
    })

    it('should return in grace period for expired agreement', () => {
      const { result } = renderHook(() =>
        useGracePeriod({
          agreementId: 'agreement-123',
          expiryDate: new Date('2024-06-10'),
          userRole: 'parent',
        })
      )

      expect(result.current.isInGracePeriod).toBe(true)
      expect(result.current.showBanner).toBe(true)
      expect(result.current.daysRemaining).toBe(9)
    })
  })

  describe('banner display (AC3)', () => {
    it('should show banner when in grace period', () => {
      const { result } = renderHook(() =>
        useGracePeriod({
          agreementId: 'agreement-123',
          expiryDate: new Date('2024-06-10'),
          userRole: 'parent',
        })
      )

      expect(result.current.showBanner).toBe(true)
      expect(result.current.bannerMessage).toContain('expired')
    })

    it('should not show banner for active agreement', () => {
      const { result } = renderHook(() =>
        useGracePeriod({
          agreementId: 'agreement-123',
          expiryDate: new Date('2024-07-01'),
          userRole: 'parent',
        })
      )

      expect(result.current.showBanner).toBe(false)
      expect(result.current.bannerMessage).toBeNull()
    })

    it('should allow dismissing banner', () => {
      const { result } = renderHook(() =>
        useGracePeriod({
          agreementId: 'agreement-123',
          expiryDate: new Date('2024-06-10'),
          userRole: 'parent',
        })
      )

      expect(result.current.showBanner).toBe(true)

      act(() => {
        result.current.dismissBanner()
      })

      expect(result.current.bannerDismissed).toBe(true)
    })
  })

  describe('user role messages (AC6)', () => {
    it('should return parent message with countdown', () => {
      const { result } = renderHook(() =>
        useGracePeriod({
          agreementId: 'agreement-123',
          expiryDate: new Date('2024-06-10'),
          userRole: 'parent',
        })
      )

      expect(result.current.bannerMessage).toContain('9')
    })

    it('should return child-friendly message', () => {
      const { result } = renderHook(() =>
        useGracePeriod({
          agreementId: 'agreement-123',
          expiryDate: new Date('2024-06-10'),
          userRole: 'child',
        })
      )

      expect(result.current.bannerMessage).toContain('renewal')
      expect(result.current.bannerMessage).not.toContain('9')
    })
  })

  describe('urgency levels', () => {
    it('should return normal urgency for 10 days remaining', () => {
      const { result } = renderHook(() =>
        useGracePeriod({
          agreementId: 'agreement-123',
          expiryDate: new Date('2024-06-10'),
          userRole: 'parent',
        })
      )

      expect(result.current.urgency).toBe('normal')
    })

    it('should return warning urgency for 5 days remaining', () => {
      const { result } = renderHook(() =>
        useGracePeriod({
          agreementId: 'agreement-123',
          expiryDate: new Date('2024-06-06'),
          userRole: 'parent',
        })
      )

      expect(result.current.urgency).toBe('warning')
    })

    it('should return critical urgency for 2 days remaining', () => {
      const { result } = renderHook(() =>
        useGracePeriod({
          agreementId: 'agreement-123',
          expiryDate: new Date('2024-06-03'),
          userRole: 'parent',
        })
      )

      expect(result.current.urgency).toBe('critical')
    })
  })

  describe('renewal action', () => {
    it('should call onRenew when renewAgreement is called', () => {
      const onRenew = vi.fn()

      const { result } = renderHook(() =>
        useGracePeriod({
          agreementId: 'agreement-123',
          expiryDate: new Date('2024-06-10'),
          userRole: 'parent',
          onRenew,
        })
      )

      act(() => {
        result.current.renewAgreement()
      })

      expect(onRenew).toHaveBeenCalledWith('agreement-123')
    })
  })

  describe('monitoring status', () => {
    it('should indicate monitoring is active during grace period', () => {
      const { result } = renderHook(() =>
        useGracePeriod({
          agreementId: 'agreement-123',
          expiryDate: new Date('2024-06-10'),
          userRole: 'parent',
        })
      )

      expect(result.current.isMonitoringActive).toBe(true)
    })

    it('should indicate monitoring is inactive after grace period', () => {
      const { result } = renderHook(() =>
        useGracePeriod({
          agreementId: 'agreement-123',
          expiryDate: new Date('2024-05-25'),
          userRole: 'parent',
        })
      )

      expect(result.current.isMonitoringActive).toBe(false)
    })
  })
})
