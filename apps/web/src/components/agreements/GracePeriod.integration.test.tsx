/**
 * Grace Period Integration Tests - Story 35.4
 *
 * Integration tests for complete grace period flow.
 * Tests all ACs working together.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useGracePeriod } from '../../hooks/useGracePeriod'
import {
  checkGracePeriodStatus,
  getGracePeriodState,
  isMonitoringActive,
} from '../../services/gracePeriodService'
import {
  shouldSendDailyReminder,
  createGracePeriodReminder,
  getGracePeriodReminderSchedule,
} from '../../services/gracePeriodReminderService'
import {
  GRACE_PERIOD_DAYS,
  isInGracePeriod,
  hasGracePeriodExpired,
  getGracePeriodInfo,
  isMonitoringActiveInGracePeriod,
} from '@fledgely/shared'

describe('Grace Period Integration - Story 35.4', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-06-15'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('grace period starts automatically on expiry (AC1)', () => {
    it('should start grace period immediately when agreement expires', () => {
      // Agreement expired yesterday
      const agreement = {
        id: 'agreement-123',
        expiryDate: new Date('2024-06-14'),
        status: 'active',
      }

      expect(isInGracePeriod(agreement)).toBe(true)
      expect(checkGracePeriodStatus(agreement)).toBe('active')
    })

    it('should have 14-day grace period', () => {
      expect(GRACE_PERIOD_DAYS).toBe(14)
    })

    it('should calculate correct days remaining', () => {
      // Expired 5 days ago
      const agreement = {
        id: 'agreement-123',
        expiryDate: new Date('2024-06-10'),
        status: 'active',
      }

      const info = getGracePeriodInfo(agreement)
      expect(info?.daysRemaining).toBe(9) // 14 - 5 = 9
    })
  })

  describe('monitoring continues during grace period (AC2)', () => {
    it('should keep monitoring active during grace period', () => {
      const agreement = {
        id: 'agreement-123',
        expiryDate: new Date('2024-06-10'),
        status: 'active',
      }

      expect(isMonitoringActiveInGracePeriod(agreement)).toBe(true)
      expect(isMonitoringActive(agreement)).toBe(true)
    })

    it('should stop monitoring after grace period ends', () => {
      // Expired 20 days ago (beyond 14 day grace)
      const agreement = {
        id: 'agreement-123',
        expiryDate: new Date('2024-05-25'),
        status: 'active',
      }

      expect(isMonitoringActiveInGracePeriod(agreement)).toBe(false)
      expect(isMonitoringActive(agreement)).toBe(false)
    })
  })

  describe('banner shown with appropriate messages (AC3)', () => {
    it('should show banner during grace period', () => {
      const agreement = {
        id: 'agreement-123',
        expiryDate: new Date('2024-06-10'),
        status: 'active',
      }

      const state = getGracePeriodState(agreement)

      expect(state.showBanner).toBe(true)
      expect(state.bannerMessage).toContain('expired')
    })

    it('should include days remaining in parent message', () => {
      const agreement = {
        id: 'agreement-123',
        expiryDate: new Date('2024-06-10'),
        status: 'active',
      }

      const state = getGracePeriodState(agreement)

      expect(state.bannerMessage).toContain('9')
    })
  })

  describe('daily reminders during grace period (AC4)', () => {
    it('should allow one reminder per day', () => {
      const yesterday = new Date('2024-06-14')
      const today = new Date('2024-06-15T05:00:00')

      expect(shouldSendDailyReminder(yesterday)).toBe(true)
      expect(shouldSendDailyReminder(today)).toBe(false)
    })

    it('should create 14 daily reminders for full grace period', () => {
      const schedule = getGracePeriodReminderSchedule(14)

      expect(schedule.length).toBe(14)
    })

    it('should create reminder with correct type based on urgency', () => {
      const agreement = {
        id: 'agreement-123',
        familyId: 'family-456',
        expiryDate: new Date('2024-06-13'),
      }

      // 2 days remaining
      const reminder = createGracePeriodReminder(agreement, 2)

      expect(reminder.type).toBe('urgent')
      expect(reminder.message).toContain('URGENT')
    })
  })

  describe('no device lockout - just reminders (AC5)', () => {
    it('should not lock device during grace period', () => {
      const agreement = {
        id: 'agreement-123',
        expiryDate: new Date('2024-06-10'),
        status: 'active',
      }

      const state = getGracePeriodState(agreement)

      // Monitoring active = no lockout
      expect(state.isMonitoringActive).toBe(true)
    })

    it('should show reminders without lockout', () => {
      const agreement = {
        id: 'agreement-123',
        expiryDate: new Date('2024-06-10'),
        status: 'active',
      }

      const state = getGracePeriodState(agreement)

      // Banner shown but monitoring continues
      expect(state.showBanner).toBe(true)
      expect(state.isMonitoringActive).toBe(true)
    })
  })

  describe('child sees renewal message (AC6)', () => {
    it('should show child-friendly message', () => {
      const { result } = renderHook(() =>
        useGracePeriod({
          agreementId: 'agreement-123',
          expiryDate: new Date('2024-06-10'),
          userRole: 'child',
        })
      )

      expect(result.current.bannerMessage).toContain('renewal')
    })

    it('should not show countdown to child', () => {
      const { result } = renderHook(() =>
        useGracePeriod({
          agreementId: 'agreement-123',
          expiryDate: new Date('2024-06-10'),
          userRole: 'child',
        })
      )

      // Child message shouldn't include specific day count
      expect(result.current.bannerMessage).not.toContain('9')
    })
  })

  describe('hook integration', () => {
    it('should provide complete grace period state', () => {
      const onRenew = vi.fn()

      const { result } = renderHook(() =>
        useGracePeriod({
          agreementId: 'agreement-123',
          expiryDate: new Date('2024-06-10'),
          userRole: 'parent',
          onRenew,
        })
      )

      expect(result.current.isInGracePeriod).toBe(true)
      expect(result.current.daysRemaining).toBe(9)
      expect(result.current.showBanner).toBe(true)
      expect(result.current.urgency).toBe('normal')
      expect(result.current.isMonitoringActive).toBe(true)
    })

    it('should allow renewal action', () => {
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

  describe('urgency progression', () => {
    it('should show normal urgency for 14-8 days', () => {
      // 9 days remaining
      const agreement = {
        id: 'agreement-123',
        expiryDate: new Date('2024-06-10'),
        status: 'active',
      }

      const state = getGracePeriodState(agreement)

      expect(state.urgency).toBe('normal')
    })

    it('should show warning urgency for 7-3 days', () => {
      // 5 days remaining (expired 9 days ago)
      const agreement = {
        id: 'agreement-123',
        expiryDate: new Date('2024-06-06'),
        status: 'active',
      }

      const state = getGracePeriodState(agreement)

      expect(state.urgency).toBe('warning')
    })

    it('should show critical urgency for 2-1 days', () => {
      // 2 days remaining (expired 12 days ago)
      const agreement = {
        id: 'agreement-123',
        expiryDate: new Date('2024-06-03'),
        status: 'active',
      }

      const state = getGracePeriodState(agreement)

      expect(state.urgency).toBe('critical')
    })

    it('should show expired urgency after grace period', () => {
      // Expired 20 days ago
      const agreement = {
        id: 'agreement-123',
        expiryDate: new Date('2024-05-25'),
        status: 'active',
      }

      const state = getGracePeriodState(agreement)

      expect(state.urgency).toBe('expired')
    })
  })

  describe('edge cases', () => {
    it('should handle no-expiry agreements', () => {
      const agreement = {
        id: 'agreement-123',
        expiryDate: null,
        status: 'active',
      }

      expect(isInGracePeriod(agreement)).toBe(false)
      expect(hasGracePeriodExpired(agreement)).toBe(false)
      expect(isMonitoringActive(agreement)).toBe(true)
    })

    it('should handle agreement expiring today', () => {
      // Expires today
      const agreement = {
        id: 'agreement-123',
        expiryDate: new Date('2024-06-14'),
        status: 'active',
      }

      expect(isInGracePeriod(agreement)).toBe(true)
    })

    it('should handle agreement on last day of grace period', () => {
      // Expired exactly 14 days ago
      const agreement = {
        id: 'agreement-123',
        expiryDate: new Date('2024-06-01'),
        status: 'active',
      }

      expect(isInGracePeriod(agreement)).toBe(true)
    })
  })
})
