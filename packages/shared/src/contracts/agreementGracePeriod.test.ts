/**
 * Agreement Grace Period Types Tests - Story 35.4
 *
 * Tests for grace period types, schemas, and utilities.
 * AC1: 14-day grace period starts automatically
 * AC2: Monitoring continues during grace period
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  gracePeriodStatusSchema,
  gracePeriodInfoSchema,
  GRACE_PERIOD_DAYS,
  GRACE_PERIOD_STATUS,
  GRACE_PERIOD_MESSAGES,
  isInGracePeriod,
  getGracePeriodInfo,
  getGracePeriodEndDate,
  getDaysRemainingInGracePeriod,
  hasGracePeriodExpired,
  isMonitoringActiveInGracePeriod,
  getGracePeriodStatusConfig,
} from './agreementGracePeriod'

describe('Agreement Grace Period Types - Story 35.4', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-06-15'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('gracePeriodStatusSchema', () => {
    it('should accept "not-started"', () => {
      const result = gracePeriodStatusSchema.safeParse('not-started')
      expect(result.success).toBe(true)
      expect(result.data).toBe('not-started')
    })

    it('should accept "active"', () => {
      const result = gracePeriodStatusSchema.safeParse('active')
      expect(result.success).toBe(true)
      expect(result.data).toBe('active')
    })

    it('should accept "expired"', () => {
      const result = gracePeriodStatusSchema.safeParse('expired')
      expect(result.success).toBe(true)
      expect(result.data).toBe('expired')
    })

    it('should reject invalid status', () => {
      const result = gracePeriodStatusSchema.safeParse('invalid')
      expect(result.success).toBe(false)
    })
  })

  describe('gracePeriodInfoSchema', () => {
    it('should accept valid grace period info', () => {
      const result = gracePeriodInfoSchema.safeParse({
        startDate: new Date('2024-06-01'),
        endDate: new Date('2024-06-15'),
        daysRemaining: 5,
        status: 'active',
      })
      expect(result.success).toBe(true)
    })

    it('should reject missing fields', () => {
      const result = gracePeriodInfoSchema.safeParse({
        startDate: new Date(),
      })
      expect(result.success).toBe(false)
    })
  })

  describe('GRACE_PERIOD_DAYS constant (AC1)', () => {
    it('should be 14 days', () => {
      expect(GRACE_PERIOD_DAYS).toBe(14)
    })
  })

  describe('GRACE_PERIOD_STATUS', () => {
    it('should have all status values', () => {
      expect(GRACE_PERIOD_STATUS).toEqual({
        NOT_STARTED: 'not-started',
        ACTIVE: 'active',
        EXPIRED: 'expired',
      })
    })
  })

  describe('GRACE_PERIOD_MESSAGES', () => {
    it('should have parent message', () => {
      expect(GRACE_PERIOD_MESSAGES.PARENT_BANNER).toBeDefined()
      expect(GRACE_PERIOD_MESSAGES.PARENT_BANNER).toContain('expired')
    })

    it('should have child message', () => {
      expect(GRACE_PERIOD_MESSAGES.CHILD_BANNER).toBeDefined()
      expect(GRACE_PERIOD_MESSAGES.CHILD_BANNER).toContain('renewal')
    })

    it('should have urgent message', () => {
      expect(GRACE_PERIOD_MESSAGES.URGENT).toBeDefined()
    })
  })

  describe('isInGracePeriod (AC1)', () => {
    it('should return true when agreement is expired within grace period', () => {
      // Expired 5 days ago (within 14 day grace period)
      const agreement = {
        expiryDate: new Date('2024-06-10'),
        status: 'active',
      }

      expect(isInGracePeriod(agreement)).toBe(true)
    })

    it('should return false when agreement is not expired', () => {
      // Expires in the future
      const agreement = {
        expiryDate: new Date('2024-07-01'),
        status: 'active',
      }

      expect(isInGracePeriod(agreement)).toBe(false)
    })

    it('should return false when grace period has ended', () => {
      // Expired 20 days ago (beyond 14 day grace period)
      const agreement = {
        expiryDate: new Date('2024-05-25'),
        status: 'active',
      }

      expect(isInGracePeriod(agreement)).toBe(false)
    })

    it('should return true on first day of grace period', () => {
      // Just expired today
      const agreement = {
        expiryDate: new Date('2024-06-14'),
        status: 'active',
      }

      expect(isInGracePeriod(agreement)).toBe(true)
    })

    it('should return true on last day of grace period', () => {
      // Expired exactly 14 days ago
      const agreement = {
        expiryDate: new Date('2024-06-01'),
        status: 'active',
      }

      expect(isInGracePeriod(agreement)).toBe(true)
    })

    it('should return false for no-expiry agreements', () => {
      const agreement = {
        expiryDate: null,
        status: 'active',
      }

      expect(isInGracePeriod(agreement)).toBe(false)
    })
  })

  describe('getGracePeriodInfo', () => {
    it('should return grace period info when in grace period', () => {
      // Expired 5 days ago
      const agreement = {
        expiryDate: new Date('2024-06-10'),
        status: 'active',
      }

      const info = getGracePeriodInfo(agreement)

      expect(info).not.toBeNull()
      expect(info?.status).toBe('active')
      expect(info?.daysRemaining).toBe(9) // 14 - 5 = 9
    })

    it('should return null when not expired', () => {
      const agreement = {
        expiryDate: new Date('2024-07-01'),
        status: 'active',
      }

      expect(getGracePeriodInfo(agreement)).toBeNull()
    })

    it('should return expired status after grace period', () => {
      // Expired 20 days ago
      const agreement = {
        expiryDate: new Date('2024-05-25'),
        status: 'active',
      }

      const info = getGracePeriodInfo(agreement)

      expect(info).not.toBeNull()
      expect(info?.status).toBe('expired')
      expect(info?.daysRemaining).toBe(0)
    })
  })

  describe('getGracePeriodEndDate', () => {
    it('should return 14 days after expiry date', () => {
      const expiryDate = new Date('2024-06-01')
      const endDate = getGracePeriodEndDate(expiryDate)

      expect(endDate.getDate()).toBe(15)
      expect(endDate.getMonth()).toBe(5) // June
    })

    it('should handle month boundaries', () => {
      const expiryDate = new Date('2024-06-25')
      const endDate = getGracePeriodEndDate(expiryDate)

      expect(endDate.getMonth()).toBe(6) // July
      expect(endDate.getDate()).toBe(9)
    })
  })

  describe('getDaysRemainingInGracePeriod', () => {
    it('should return positive days when in grace period', () => {
      const gracePeriodEnd = new Date('2024-06-20')

      expect(getDaysRemainingInGracePeriod(gracePeriodEnd)).toBe(5)
    })

    it('should return 0 when grace period has ended', () => {
      const gracePeriodEnd = new Date('2024-06-10')

      expect(getDaysRemainingInGracePeriod(gracePeriodEnd)).toBe(0)
    })

    it('should return 14 on first day', () => {
      const gracePeriodEnd = new Date('2024-06-29')

      expect(getDaysRemainingInGracePeriod(gracePeriodEnd)).toBe(14)
    })
  })

  describe('hasGracePeriodExpired', () => {
    it('should return false when in grace period', () => {
      const agreement = {
        expiryDate: new Date('2024-06-10'),
        status: 'active',
      }

      expect(hasGracePeriodExpired(agreement)).toBe(false)
    })

    it('should return true when grace period has ended', () => {
      const agreement = {
        expiryDate: new Date('2024-05-25'),
        status: 'active',
      }

      expect(hasGracePeriodExpired(agreement)).toBe(true)
    })

    it('should return false when agreement is not expired', () => {
      const agreement = {
        expiryDate: new Date('2024-07-01'),
        status: 'active',
      }

      expect(hasGracePeriodExpired(agreement)).toBe(false)
    })
  })

  describe('isMonitoringActiveInGracePeriod (AC2)', () => {
    it('should return true when in grace period', () => {
      const agreement = {
        expiryDate: new Date('2024-06-10'),
        status: 'active',
      }

      expect(isMonitoringActiveInGracePeriod(agreement)).toBe(true)
    })

    it('should return false when grace period has ended', () => {
      const agreement = {
        expiryDate: new Date('2024-05-25'),
        status: 'active',
      }

      expect(isMonitoringActiveInGracePeriod(agreement)).toBe(false)
    })

    it('should return true when agreement is not expired', () => {
      const agreement = {
        expiryDate: new Date('2024-07-01'),
        status: 'active',
      }

      expect(isMonitoringActiveInGracePeriod(agreement)).toBe(true)
    })
  })

  describe('getGracePeriodStatusConfig', () => {
    it('should return normal config for 14-8 days remaining', () => {
      const config = getGracePeriodStatusConfig(10)

      expect(config.urgency).toBe('normal')
      expect(config.color).toBe('yellow')
    })

    it('should return warning config for 7-3 days remaining', () => {
      const config = getGracePeriodStatusConfig(5)

      expect(config.urgency).toBe('warning')
      expect(config.color).toBe('orange')
    })

    it('should return critical config for 2-1 days remaining', () => {
      const config = getGracePeriodStatusConfig(1)

      expect(config.urgency).toBe('critical')
      expect(config.color).toBe('red')
    })

    it('should return expired config for 0 days', () => {
      const config = getGracePeriodStatusConfig(0)

      expect(config.urgency).toBe('expired')
    })
  })
})
