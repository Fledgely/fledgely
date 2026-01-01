/**
 * Post-Grace Period Integration Tests - Story 35.5
 *
 * Integration tests for complete post-grace period flow.
 * Tests all ACs working together.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { usePostGracePeriod } from '../../hooks/usePostGracePeriod'
import {
  checkMonitoringStatus,
  getTimeLimitEnforcementStatus,
  getPostGraceNotification,
  getAgreementOperationalStatus,
} from '../../services/postGracePeriodService'
import {
  isMonitoringPaused,
  shouldCaptureScreenshots,
  shouldEnforceTimeLimits,
  canResumeMonitoring,
  getPostGraceStatus,
  POST_GRACE_BEHAVIOR,
} from '@fledgely/shared'

describe('Post-Grace Period Integration - Story 35.5', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-06-15'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('monitoring pauses after grace period (AC1)', () => {
    it('should pause monitoring when grace period ends', () => {
      // Expired 20 days ago (beyond 14 day grace period)
      const agreement = {
        id: 'agreement-123',
        expiryDate: new Date('2024-05-25'),
        status: 'active',
      }

      expect(isMonitoringPaused(agreement)).toBe(true)
      expect(checkMonitoringStatus(agreement)).toBe('paused')
      expect(getPostGraceStatus(agreement)).toBe('monitoring-paused')
    })

    it('should continue monitoring during grace period', () => {
      const agreement = {
        id: 'agreement-123',
        expiryDate: new Date('2024-06-10'),
        status: 'active',
      }

      expect(isMonitoringPaused(agreement)).toBe(false)
      expect(checkMonitoringStatus(agreement)).toBe('active')
    })

    it('should stop screenshot capture when paused', () => {
      const agreement = {
        expiryDate: new Date('2024-05-25'),
        status: 'active',
      }

      expect(shouldCaptureScreenshots(agreement)).toBe(false)
    })
  })

  describe('existing data preserved (AC2)', () => {
    it('should have data preservation behavior enabled', () => {
      expect(POST_GRACE_BEHAVIOR.PRESERVE_DATA).toBe(true)
    })

    it('should not delete data when monitoring pauses', () => {
      const agreement = {
        id: 'agreement-123',
        expiryDate: new Date('2024-05-25'),
        status: 'active',
      }

      const status = getAgreementOperationalStatus(agreement)

      // Monitoring paused but data preserved
      expect(status.monitoringStatus).toBe('paused')
      // No delete flag or action triggered
      expect(POST_GRACE_BEHAVIOR.PRESERVE_DATA).toBe(true)
    })
  })

  describe('time limits no longer enforced (AC3)', () => {
    it('should suspend time limits when monitoring pauses', () => {
      const agreement = {
        id: 'agreement-123',
        expiryDate: new Date('2024-05-25'),
        status: 'active',
      }

      expect(shouldEnforceTimeLimits(agreement)).toBe(false)
      expect(getTimeLimitEnforcementStatus(agreement)).toBe('suspended')
    })

    it('should enforce time limits during grace period', () => {
      const agreement = {
        id: 'agreement-123',
        expiryDate: new Date('2024-06-10'),
        status: 'active',
      }

      expect(shouldEnforceTimeLimits(agreement)).toBe(true)
      expect(getTimeLimitEnforcementStatus(agreement)).toBe('enforced')
    })
  })

  describe('both parties notified (AC4)', () => {
    it('should provide notification for parent', () => {
      const agreement = {
        id: 'agreement-123',
        expiryDate: new Date('2024-05-25'),
        status: 'active',
      }

      const notification = getPostGraceNotification(agreement, 'parent')

      expect(notification).not.toBeNull()
      expect(notification).toContain('paused')
    })

    it('should provide notification for child', () => {
      const agreement = {
        id: 'agreement-123',
        expiryDate: new Date('2024-05-25'),
        status: 'active',
      }

      const notification = getPostGraceNotification(agreement, 'child')

      expect(notification).not.toBeNull()
    })

    it('should not notify when agreement is active', () => {
      const agreement = {
        id: 'agreement-123',
        expiryDate: new Date('2024-07-01'),
        status: 'active',
      }

      expect(getPostGraceNotification(agreement, 'parent')).toBeNull()
    })
  })

  describe('can renew at any time (AC5)', () => {
    it('should always allow renewal for paused agreement', () => {
      const agreement = {
        expiryDate: new Date('2024-05-25'),
        status: 'active',
      }

      expect(canResumeMonitoring(agreement)).toBe(true)
    })

    it('should have renewal always allowed in behavior config', () => {
      expect(POST_GRACE_BEHAVIOR.ALLOW_RENEWAL).toBe(true)
    })
  })

  describe('no punitive device restrictions (AC6)', () => {
    it('should have no device restrictions in behavior config', () => {
      expect(POST_GRACE_BEHAVIOR.NO_DEVICE_RESTRICTIONS).toBe(true)
    })

    it('should not have blocking or lockout status', () => {
      const agreement = {
        id: 'agreement-123',
        expiryDate: new Date('2024-05-25'),
        status: 'active',
      }

      const status = getAgreementOperationalStatus(agreement)

      // Status is paused, not blocked/locked
      expect(status.monitoringStatus).toBe('paused')
      expect(status.canRenew).toBe(true)
    })
  })

  describe('hook integration', () => {
    it('should provide complete post-grace state', () => {
      const { result } = renderHook(() =>
        usePostGracePeriod({
          agreementId: 'agreement-123',
          expiryDate: new Date('2024-05-25'),
          userRole: 'parent',
        })
      )

      expect(result.current.isMonitoringPaused).toBe(true)
      expect(result.current.areTimeLimitsEnforced).toBe(false)
      expect(result.current.canRenew).toBe(true)
      expect(result.current.notification).not.toBeNull()
    })

    it('should allow renewal action', () => {
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

  describe('complete lifecycle flow', () => {
    it('should transition from active → grace → paused correctly', () => {
      // Active agreement
      const activeAgreement = {
        id: 'agreement-123',
        expiryDate: new Date('2024-07-01'),
        status: 'active',
      }

      expect(getPostGraceStatus(activeAgreement)).toBe('active')
      expect(shouldCaptureScreenshots(activeAgreement)).toBe(true)
      expect(shouldEnforceTimeLimits(activeAgreement)).toBe(true)

      // In grace period (expired 5 days ago)
      const graceAgreement = {
        id: 'agreement-123',
        expiryDate: new Date('2024-06-10'),
        status: 'active',
      }

      expect(getPostGraceStatus(graceAgreement)).toBe('grace-period')
      expect(shouldCaptureScreenshots(graceAgreement)).toBe(true)
      expect(shouldEnforceTimeLimits(graceAgreement)).toBe(true)

      // Post-grace (expired 20 days ago)
      const pausedAgreement = {
        id: 'agreement-123',
        expiryDate: new Date('2024-05-25'),
        status: 'active',
      }

      expect(getPostGraceStatus(pausedAgreement)).toBe('monitoring-paused')
      expect(shouldCaptureScreenshots(pausedAgreement)).toBe(false)
      expect(shouldEnforceTimeLimits(pausedAgreement)).toBe(false)
      expect(canResumeMonitoring(pausedAgreement)).toBe(true)
    })
  })
})
