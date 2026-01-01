/**
 * Post-Grace Period Service Tests - Story 35.5
 *
 * Tests for post-grace period service logic.
 * AC1: Monitoring pauses
 * AC3: Time limits no longer enforced
 * AC4: Both parties notified
 * AC5: Can renew at any time
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  checkMonitoringStatus,
  getTimeLimitEnforcementStatus,
  getPostGraceNotification,
  canRenewAgreement,
  getAgreementOperationalStatus,
} from './postGracePeriodService'

describe('Post-Grace Period Service - Story 35.5', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-06-15'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('checkMonitoringStatus (AC1)', () => {
    it('should return active for non-expired agreement', () => {
      const agreement = {
        id: 'agreement-123',
        expiryDate: new Date('2024-07-01'),
        status: 'active',
      }

      expect(checkMonitoringStatus(agreement)).toBe('active')
    })

    it('should return active during grace period', () => {
      const agreement = {
        id: 'agreement-123',
        expiryDate: new Date('2024-06-10'),
        status: 'active',
      }

      expect(checkMonitoringStatus(agreement)).toBe('active')
    })

    it('should return paused after grace period ends', () => {
      const agreement = {
        id: 'agreement-123',
        expiryDate: new Date('2024-05-25'),
        status: 'active',
      }

      expect(checkMonitoringStatus(agreement)).toBe('paused')
    })
  })

  describe('getTimeLimitEnforcementStatus (AC3)', () => {
    it('should return enforced for active agreement', () => {
      const agreement = {
        id: 'agreement-123',
        expiryDate: new Date('2024-07-01'),
        status: 'active',
      }

      expect(getTimeLimitEnforcementStatus(agreement)).toBe('enforced')
    })

    it('should return enforced during grace period', () => {
      const agreement = {
        id: 'agreement-123',
        expiryDate: new Date('2024-06-10'),
        status: 'active',
      }

      expect(getTimeLimitEnforcementStatus(agreement)).toBe('enforced')
    })

    it('should return suspended after grace period', () => {
      const agreement = {
        id: 'agreement-123',
        expiryDate: new Date('2024-05-25'),
        status: 'active',
      }

      expect(getTimeLimitEnforcementStatus(agreement)).toBe('suspended')
    })
  })

  describe('getPostGraceNotification (AC4)', () => {
    it('should return null for active agreement', () => {
      const agreement = {
        id: 'agreement-123',
        expiryDate: new Date('2024-07-01'),
        status: 'active',
      }

      expect(getPostGraceNotification(agreement, 'parent')).toBeNull()
    })

    it('should return notification after grace period', () => {
      const agreement = {
        id: 'agreement-123',
        expiryDate: new Date('2024-05-25'),
        status: 'active',
      }

      const notification = getPostGraceNotification(agreement, 'parent')

      expect(notification).not.toBeNull()
      expect(notification).toContain('paused')
    })

    it('should return child-friendly notification', () => {
      const agreement = {
        id: 'agreement-123',
        expiryDate: new Date('2024-05-25'),
        status: 'active',
      }

      const notification = getPostGraceNotification(agreement, 'child')

      expect(notification).not.toBeNull()
      expect(notification).toContain('expired')
    })
  })

  describe('canRenewAgreement (AC5)', () => {
    it('should always return true', () => {
      const agreement = {
        id: 'agreement-123',
        expiryDate: new Date('2024-05-25'),
        status: 'active',
      }

      expect(canRenewAgreement(agreement)).toBe(true)
    })

    it('should return true for active agreement', () => {
      const agreement = {
        id: 'agreement-123',
        expiryDate: new Date('2024-07-01'),
        status: 'active',
      }

      expect(canRenewAgreement(agreement)).toBe(true)
    })
  })

  describe('getAgreementOperationalStatus', () => {
    it('should return complete status for active agreement', () => {
      const agreement = {
        id: 'agreement-123',
        expiryDate: new Date('2024-07-01'),
        status: 'active',
      }

      const status = getAgreementOperationalStatus(agreement)

      expect(status.monitoringStatus).toBe('active')
      expect(status.timeLimitsEnforced).toBe(true)
      expect(status.screenshotsEnabled).toBe(true)
      expect(status.canRenew).toBe(true)
    })

    it('should return paused status after grace period', () => {
      const agreement = {
        id: 'agreement-123',
        expiryDate: new Date('2024-05-25'),
        status: 'active',
      }

      const status = getAgreementOperationalStatus(agreement)

      expect(status.monitoringStatus).toBe('paused')
      expect(status.timeLimitsEnforced).toBe(false)
      expect(status.screenshotsEnabled).toBe(false)
      expect(status.canRenew).toBe(true)
    })
  })
})
