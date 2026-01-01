/**
 * Agreement Post-Grace Period Types Tests - Story 35.5
 *
 * Tests for post-grace period types, schemas, and utilities.
 * AC1: Monitoring pauses after grace period
 * AC2: Existing data preserved
 * AC3: Time limits no longer enforced
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  postGraceStatusSchema,
  POST_GRACE_STATUS,
  POST_GRACE_BEHAVIOR,
  POST_GRACE_MESSAGES,
  isMonitoringPaused,
  getPostGraceStatus,
  canResumeMonitoring,
  shouldCaptureScreenshots,
  shouldEnforceTimeLimits,
  getPostGraceMessage,
} from './agreementPostGrace'

describe('Agreement Post-Grace Period Types - Story 35.5', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-06-15'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('postGraceStatusSchema', () => {
    it('should accept "active"', () => {
      const result = postGraceStatusSchema.safeParse('active')
      expect(result.success).toBe(true)
      expect(result.data).toBe('active')
    })

    it('should accept "grace-period"', () => {
      const result = postGraceStatusSchema.safeParse('grace-period')
      expect(result.success).toBe(true)
      expect(result.data).toBe('grace-period')
    })

    it('should accept "monitoring-paused"', () => {
      const result = postGraceStatusSchema.safeParse('monitoring-paused')
      expect(result.success).toBe(true)
      expect(result.data).toBe('monitoring-paused')
    })

    it('should reject invalid status', () => {
      const result = postGraceStatusSchema.safeParse('invalid')
      expect(result.success).toBe(false)
    })
  })

  describe('POST_GRACE_STATUS', () => {
    it('should have all status values', () => {
      expect(POST_GRACE_STATUS).toEqual({
        ACTIVE: 'active',
        GRACE_PERIOD: 'grace-period',
        MONITORING_PAUSED: 'monitoring-paused',
      })
    })
  })

  describe('POST_GRACE_BEHAVIOR', () => {
    it('should pause screenshots (AC1)', () => {
      expect(POST_GRACE_BEHAVIOR.PAUSE_SCREENSHOTS).toBe(true)
    })

    it('should preserve data (AC2)', () => {
      expect(POST_GRACE_BEHAVIOR.PRESERVE_DATA).toBe(true)
    })

    it('should disable time limits (AC3)', () => {
      expect(POST_GRACE_BEHAVIOR.DISABLE_TIME_LIMITS).toBe(true)
    })

    it('should allow renewal (AC5)', () => {
      expect(POST_GRACE_BEHAVIOR.ALLOW_RENEWAL).toBe(true)
    })

    it('should have no device restrictions (AC6)', () => {
      expect(POST_GRACE_BEHAVIOR.NO_DEVICE_RESTRICTIONS).toBe(true)
    })
  })

  describe('POST_GRACE_MESSAGES', () => {
    it('should have parent notification message (AC4)', () => {
      expect(POST_GRACE_MESSAGES.PARENT_NOTIFICATION).toBeDefined()
      expect(POST_GRACE_MESSAGES.PARENT_NOTIFICATION).toContain('paused')
    })

    it('should have child notification message (AC4)', () => {
      expect(POST_GRACE_MESSAGES.CHILD_NOTIFICATION).toBeDefined()
    })

    it('should have data preservation message (AC2)', () => {
      expect(POST_GRACE_MESSAGES.DATA_PRESERVED).toBeDefined()
      expect(POST_GRACE_MESSAGES.DATA_PRESERVED).toContain('safe')
    })
  })

  describe('isMonitoringPaused (AC1)', () => {
    it('should return true when grace period has ended', () => {
      // Expired 20 days ago (beyond 14 day grace period)
      const agreement = {
        expiryDate: new Date('2024-05-25'),
        status: 'active',
      }

      expect(isMonitoringPaused(agreement)).toBe(true)
    })

    it('should return false when in grace period', () => {
      // Expired 5 days ago (within grace period)
      const agreement = {
        expiryDate: new Date('2024-06-10'),
        status: 'active',
      }

      expect(isMonitoringPaused(agreement)).toBe(false)
    })

    it('should return false when agreement is active', () => {
      const agreement = {
        expiryDate: new Date('2024-07-01'),
        status: 'active',
      }

      expect(isMonitoringPaused(agreement)).toBe(false)
    })

    it('should return false for no-expiry agreement', () => {
      const agreement = {
        expiryDate: null,
        status: 'active',
      }

      expect(isMonitoringPaused(agreement)).toBe(false)
    })
  })

  describe('getPostGraceStatus', () => {
    it('should return active for non-expired agreement', () => {
      const agreement = {
        expiryDate: new Date('2024-07-01'),
        status: 'active',
      }

      expect(getPostGraceStatus(agreement)).toBe('active')
    })

    it('should return grace-period during grace period', () => {
      const agreement = {
        expiryDate: new Date('2024-06-10'),
        status: 'active',
      }

      expect(getPostGraceStatus(agreement)).toBe('grace-period')
    })

    it('should return monitoring-paused after grace period', () => {
      const agreement = {
        expiryDate: new Date('2024-05-25'),
        status: 'active',
      }

      expect(getPostGraceStatus(agreement)).toBe('monitoring-paused')
    })
  })

  describe('canResumeMonitoring (AC5)', () => {
    it('should always return true for paused monitoring', () => {
      const agreement = {
        expiryDate: new Date('2024-05-25'),
        status: 'active',
      }

      expect(canResumeMonitoring(agreement)).toBe(true)
    })

    it('should return true for active agreement', () => {
      const agreement = {
        expiryDate: new Date('2024-07-01'),
        status: 'active',
      }

      expect(canResumeMonitoring(agreement)).toBe(true)
    })

    it('should return true for grace period agreement', () => {
      const agreement = {
        expiryDate: new Date('2024-06-10'),
        status: 'active',
      }

      expect(canResumeMonitoring(agreement)).toBe(true)
    })
  })

  describe('shouldCaptureScreenshots (AC1)', () => {
    it('should return false when monitoring is paused', () => {
      const agreement = {
        expiryDate: new Date('2024-05-25'),
        status: 'active',
      }

      expect(shouldCaptureScreenshots(agreement)).toBe(false)
    })

    it('should return true during grace period', () => {
      const agreement = {
        expiryDate: new Date('2024-06-10'),
        status: 'active',
      }

      expect(shouldCaptureScreenshots(agreement)).toBe(true)
    })

    it('should return true for active agreement', () => {
      const agreement = {
        expiryDate: new Date('2024-07-01'),
        status: 'active',
      }

      expect(shouldCaptureScreenshots(agreement)).toBe(true)
    })
  })

  describe('shouldEnforceTimeLimits (AC3)', () => {
    it('should return false when monitoring is paused', () => {
      const agreement = {
        expiryDate: new Date('2024-05-25'),
        status: 'active',
      }

      expect(shouldEnforceTimeLimits(agreement)).toBe(false)
    })

    it('should return true during grace period', () => {
      const agreement = {
        expiryDate: new Date('2024-06-10'),
        status: 'active',
      }

      expect(shouldEnforceTimeLimits(agreement)).toBe(true)
    })

    it('should return true for active agreement', () => {
      const agreement = {
        expiryDate: new Date('2024-07-01'),
        status: 'active',
      }

      expect(shouldEnforceTimeLimits(agreement)).toBe(true)
    })
  })

  describe('getPostGraceMessage (AC4)', () => {
    it('should return parent message', () => {
      const message = getPostGraceMessage('parent')

      expect(message).toContain('paused')
      expect(message.toLowerCase()).toContain('renew')
    })

    it('should return child message', () => {
      const message = getPostGraceMessage('child')

      expect(message).toBeDefined()
      expect(message.length).toBeGreaterThan(0)
    })
  })
})
