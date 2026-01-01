/**
 * usePostGracePeriod Hook Tests - Story 35.5
 *
 * Tests for post-grace period state management hook.
 * AC1: Monitoring pauses
 * AC3: Time limits no longer enforced
 * AC4: Both parties notified
 * AC5: Can renew at any time
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { usePostGracePeriod } from './usePostGracePeriod'

describe('usePostGracePeriod - Story 35.5', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-06-15'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('monitoring status (AC1)', () => {
    it('should return active for non-expired agreement', () => {
      const { result } = renderHook(() =>
        usePostGracePeriod({
          agreementId: 'agreement-123',
          expiryDate: new Date('2024-07-01'),
          userRole: 'parent',
        })
      )

      expect(result.current.isMonitoringPaused).toBe(false)
    })

    it('should return paused after grace period', () => {
      const { result } = renderHook(() =>
        usePostGracePeriod({
          agreementId: 'agreement-123',
          expiryDate: new Date('2024-05-25'),
          userRole: 'parent',
        })
      )

      expect(result.current.isMonitoringPaused).toBe(true)
    })
  })

  describe('time limits (AC3)', () => {
    it('should be enforced for active agreement', () => {
      const { result } = renderHook(() =>
        usePostGracePeriod({
          agreementId: 'agreement-123',
          expiryDate: new Date('2024-07-01'),
          userRole: 'parent',
        })
      )

      expect(result.current.areTimeLimitsEnforced).toBe(true)
    })

    it('should be suspended after grace period', () => {
      const { result } = renderHook(() =>
        usePostGracePeriod({
          agreementId: 'agreement-123',
          expiryDate: new Date('2024-05-25'),
          userRole: 'parent',
        })
      )

      expect(result.current.areTimeLimitsEnforced).toBe(false)
    })
  })

  describe('notifications (AC4)', () => {
    it('should return notification when monitoring is paused', () => {
      const { result } = renderHook(() =>
        usePostGracePeriod({
          agreementId: 'agreement-123',
          expiryDate: new Date('2024-05-25'),
          userRole: 'parent',
        })
      )

      expect(result.current.notification).not.toBeNull()
      expect(result.current.notification).toContain('paused')
    })

    it('should return null notification for active agreement', () => {
      const { result } = renderHook(() =>
        usePostGracePeriod({
          agreementId: 'agreement-123',
          expiryDate: new Date('2024-07-01'),
          userRole: 'parent',
        })
      )

      expect(result.current.notification).toBeNull()
    })
  })

  describe('renewal (AC5)', () => {
    it('should always allow renewal', () => {
      const { result } = renderHook(() =>
        usePostGracePeriod({
          agreementId: 'agreement-123',
          expiryDate: new Date('2024-05-25'),
          userRole: 'parent',
        })
      )

      expect(result.current.canRenew).toBe(true)
    })

    it('should call onRenew when renewAgreement is called', () => {
      const onRenew = vi.fn()

      const { result } = renderHook(() =>
        usePostGracePeriod({
          agreementId: 'agreement-123',
          expiryDate: new Date('2024-05-25'),
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
})
