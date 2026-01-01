/**
 * Grace Period Service Tests - Story 35.4
 *
 * Tests for grace period service logic.
 * AC1: 14-day grace period starts automatically
 * AC2: Monitoring continues during grace period
 * AC5: No device lockout - just reminders
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  checkGracePeriodStatus,
  getGracePeriodDaysRemaining,
  shouldShowGracePeriodBanner,
  getGracePeriodBannerMessage,
  isMonitoringActive,
  getGracePeriodState,
} from './gracePeriodService'

describe('Grace Period Service - Story 35.4', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-06-15'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('checkGracePeriodStatus (AC1)', () => {
    it('should return not-started for active agreement', () => {
      const agreement = {
        id: 'agreement-123',
        expiryDate: new Date('2024-07-01'),
        status: 'active',
      }

      expect(checkGracePeriodStatus(agreement)).toBe('not-started')
    })

    it('should return active for recently expired agreement', () => {
      // Expired 5 days ago
      const agreement = {
        id: 'agreement-123',
        expiryDate: new Date('2024-06-10'),
        status: 'active',
      }

      expect(checkGracePeriodStatus(agreement)).toBe('active')
    })

    it('should return expired after 14 days', () => {
      // Expired 20 days ago
      const agreement = {
        id: 'agreement-123',
        expiryDate: new Date('2024-05-25'),
        status: 'active',
      }

      expect(checkGracePeriodStatus(agreement)).toBe('expired')
    })

    it('should return not-started for no-expiry agreement', () => {
      const agreement = {
        id: 'agreement-123',
        expiryDate: null,
        status: 'active',
      }

      expect(checkGracePeriodStatus(agreement)).toBe('not-started')
    })
  })

  describe('getGracePeriodDaysRemaining', () => {
    it('should return correct days remaining', () => {
      // Expired 5 days ago, 9 days remaining
      const agreement = {
        id: 'agreement-123',
        expiryDate: new Date('2024-06-10'),
        status: 'active',
      }

      expect(getGracePeriodDaysRemaining(agreement)).toBe(9)
    })

    it('should return 0 when grace period ended', () => {
      const agreement = {
        id: 'agreement-123',
        expiryDate: new Date('2024-05-25'),
        status: 'active',
      }

      expect(getGracePeriodDaysRemaining(agreement)).toBe(0)
    })

    it('should return null for active agreement', () => {
      const agreement = {
        id: 'agreement-123',
        expiryDate: new Date('2024-07-01'),
        status: 'active',
      }

      expect(getGracePeriodDaysRemaining(agreement)).toBeNull()
    })
  })

  describe('shouldShowGracePeriodBanner (AC3)', () => {
    it('should return true when in grace period', () => {
      const agreement = {
        id: 'agreement-123',
        expiryDate: new Date('2024-06-10'),
        status: 'active',
      }

      expect(shouldShowGracePeriodBanner(agreement)).toBe(true)
    })

    it('should return false when not expired', () => {
      const agreement = {
        id: 'agreement-123',
        expiryDate: new Date('2024-07-01'),
        status: 'active',
      }

      expect(shouldShowGracePeriodBanner(agreement)).toBe(false)
    })

    it('should return true when grace period expired', () => {
      const agreement = {
        id: 'agreement-123',
        expiryDate: new Date('2024-05-25'),
        status: 'active',
      }

      // Still show banner after grace period ends
      expect(shouldShowGracePeriodBanner(agreement)).toBe(true)
    })
  })

  describe('getGracePeriodBannerMessage (AC3, AC6)', () => {
    it('should return parent message with days remaining', () => {
      const message = getGracePeriodBannerMessage(10, 'parent')

      expect(message).toContain('expired')
      expect(message).toContain('10')
    })

    it('should return urgent message for low days', () => {
      const message = getGracePeriodBannerMessage(2, 'parent')

      expect(message).toContain('Urgent')
      expect(message).toContain('2')
    })

    it('should return child-friendly message (AC6)', () => {
      const message = getGracePeriodBannerMessage(10, 'child')

      expect(message).toContain('renewal')
      expect(message).not.toContain('10') // Child doesn't see countdown
    })

    it('should return expired message when days is 0', () => {
      const parentMessage = getGracePeriodBannerMessage(0, 'parent')
      const childMessage = getGracePeriodBannerMessage(0, 'child')

      expect(parentMessage).toContain('ended')
      expect(childMessage).toContain('expired')
    })
  })

  describe('isMonitoringActive (AC2, AC5)', () => {
    it('should return true for active agreement', () => {
      const agreement = {
        id: 'agreement-123',
        expiryDate: new Date('2024-07-01'),
        status: 'active',
      }

      expect(isMonitoringActive(agreement)).toBe(true)
    })

    it('should return true during grace period (AC2)', () => {
      const agreement = {
        id: 'agreement-123',
        expiryDate: new Date('2024-06-10'),
        status: 'active',
      }

      // Monitoring continues during grace period
      expect(isMonitoringActive(agreement)).toBe(true)
    })

    it('should return false after grace period ends', () => {
      const agreement = {
        id: 'agreement-123',
        expiryDate: new Date('2024-05-25'),
        status: 'active',
      }

      expect(isMonitoringActive(agreement)).toBe(false)
    })

    it('should return true for no-expiry agreement', () => {
      const agreement = {
        id: 'agreement-123',
        expiryDate: null,
        status: 'active',
      }

      expect(isMonitoringActive(agreement)).toBe(true)
    })
  })

  describe('getGracePeriodState', () => {
    it('should return complete state for active agreement', () => {
      const agreement = {
        id: 'agreement-123',
        expiryDate: new Date('2024-07-01'),
        status: 'active',
      }

      const state = getGracePeriodState(agreement)

      expect(state.status).toBe('not-started')
      expect(state.isInGracePeriod).toBe(false)
      expect(state.showBanner).toBe(false)
      expect(state.isMonitoringActive).toBe(true)
    })

    it('should return complete state during grace period', () => {
      const agreement = {
        id: 'agreement-123',
        expiryDate: new Date('2024-06-10'),
        status: 'active',
      }

      const state = getGracePeriodState(agreement)

      expect(state.status).toBe('active')
      expect(state.isInGracePeriod).toBe(true)
      expect(state.daysRemaining).toBe(9)
      expect(state.showBanner).toBe(true)
      expect(state.isMonitoringActive).toBe(true)
      expect(state.urgency).toBe('normal')
    })

    it('should return warning urgency for 5 days remaining', () => {
      // Expired 9 days ago, 5 days remaining
      const agreement = {
        id: 'agreement-123',
        expiryDate: new Date('2024-06-06'),
        status: 'active',
      }

      const state = getGracePeriodState(agreement)

      expect(state.urgency).toBe('warning')
    })

    it('should return critical urgency for 2 days remaining', () => {
      // Expired 12 days ago, 2 days remaining
      const agreement = {
        id: 'agreement-123',
        expiryDate: new Date('2024-06-03'),
        status: 'active',
      }

      const state = getGracePeriodState(agreement)

      expect(state.urgency).toBe('critical')
    })

    it('should return expired state after grace period', () => {
      const agreement = {
        id: 'agreement-123',
        expiryDate: new Date('2024-05-25'),
        status: 'active',
      }

      const state = getGracePeriodState(agreement)

      expect(state.status).toBe('expired')
      expect(state.isInGracePeriod).toBe(false)
      expect(state.daysRemaining).toBe(0)
      expect(state.showBanner).toBe(true)
      expect(state.isMonitoringActive).toBe(false)
      expect(state.urgency).toBe('expired')
    })
  })
})
