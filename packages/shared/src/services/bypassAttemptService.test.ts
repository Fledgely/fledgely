/**
 * BypassAttemptService Tests - Story 36.5 Task 1
 *
 * Tests for bypass attempt logging and retrieval.
 * AC1: Log bypass attempts with timestamp and context
 * AC3: Bypass attempts expire after configurable period
 * AC6: Distinguish between intentional bypass vs accidental
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  createBypassAttempt,
  getBypassAttempts,
  markAsUnintentional,
  isExpired,
  getActiveBypassAttempts,
  calculateBypassImpact,
  type BypassAttempt,
  type BypassAttemptType,
  BYPASS_EXPIRY_DAYS_DEFAULT,
} from './bypassAttemptService'

// Mock Date for consistent testing
const NOW = new Date('2025-12-15T12:00:00Z')

describe('BypassAttemptService - Story 36.5 Task 1', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(NOW)
  })

  describe('AC1: Log bypass attempts with timestamp and context', () => {
    it('should create a bypass attempt with required fields', () => {
      const attempt = createBypassAttempt({
        childId: 'child-123',
        deviceId: 'device-456',
        attemptType: 'extension-disable',
        context: 'Chrome extension was disabled from settings',
      })

      expect(attempt.id).toBeDefined()
      expect(attempt.childId).toBe('child-123')
      expect(attempt.deviceId).toBe('device-456')
      expect(attempt.attemptType).toBe('extension-disable')
      expect(attempt.context).toBe('Chrome extension was disabled from settings')
    })

    it('should set occurredAt to current time', () => {
      const attempt = createBypassAttempt({
        childId: 'child-123',
        deviceId: 'device-456',
        attemptType: 'vpn-detected',
        context: 'VPN connection detected',
      })

      expect(attempt.occurredAt.getTime()).toBe(NOW.getTime())
    })

    it('should calculate expiresAt based on default expiry', () => {
      const attempt = createBypassAttempt({
        childId: 'child-123',
        deviceId: 'device-456',
        attemptType: 'proxy-detected',
        context: 'Proxy server detected',
      })

      const expectedExpiry = new Date(NOW)
      expectedExpiry.setDate(expectedExpiry.getDate() + BYPASS_EXPIRY_DAYS_DEFAULT)

      expect(attempt.expiresAt.getTime()).toBe(expectedExpiry.getTime())
    })

    it('should support custom expiry days', () => {
      const attempt = createBypassAttempt({
        childId: 'child-123',
        deviceId: 'device-456',
        attemptType: 'settings-change',
        context: 'Monitoring settings were modified',
        expiryDays: 14,
      })

      const expectedExpiry = new Date(NOW)
      expectedExpiry.setDate(expectedExpiry.getDate() + 14)

      expect(attempt.expiresAt.getTime()).toBe(expectedExpiry.getTime())
    })

    it('should generate unique IDs for each attempt', () => {
      const attempt1 = createBypassAttempt({
        childId: 'child-123',
        deviceId: 'device-456',
        attemptType: 'vpn-detected',
        context: 'Test 1',
      })

      const attempt2 = createBypassAttempt({
        childId: 'child-123',
        deviceId: 'device-456',
        attemptType: 'vpn-detected',
        context: 'Test 2',
      })

      expect(attempt1.id).not.toBe(attempt2.id)
    })
  })

  describe('AC3: Bypass attempts expire after configurable period', () => {
    it('should mark attempt as not expired when within expiry', () => {
      const attempt = createBypassAttempt({
        childId: 'child-123',
        deviceId: 'device-456',
        attemptType: 'extension-disable',
        context: 'Test',
      })

      expect(isExpired(attempt)).toBe(false)
    })

    it('should mark attempt as expired after expiry date', () => {
      const attempt = createBypassAttempt({
        childId: 'child-123',
        deviceId: 'device-456',
        attemptType: 'extension-disable',
        context: 'Test',
      })

      // Move time forward past expiry
      vi.setSystemTime(
        new Date(NOW.getTime() + (BYPASS_EXPIRY_DAYS_DEFAULT + 1) * 24 * 60 * 60 * 1000)
      )

      expect(isExpired(attempt)).toBe(true)
    })

    it('should filter only active attempts', () => {
      const activeAttempt = createBypassAttempt({
        childId: 'child-123',
        deviceId: 'device-456',
        attemptType: 'vpn-detected',
        context: 'Active',
        expiryDays: 30,
      })

      const expiredAttempt: BypassAttempt = {
        id: 'expired-123',
        childId: 'child-123',
        deviceId: 'device-456',
        attemptType: 'proxy-detected',
        context: 'Expired',
        occurredAt: new Date(NOW.getTime() - 60 * 24 * 60 * 60 * 1000),
        expiresAt: new Date(NOW.getTime() - 30 * 24 * 60 * 60 * 1000),
        impactOnScore: -15,
        wasIntentional: null,
      }

      const attempts = [activeAttempt, expiredAttempt]
      const active = getActiveBypassAttempts(attempts)

      expect(active).toHaveLength(1)
      expect(active[0].id).toBe(activeAttempt.id)
    })

    it('should return all attempts when includeExpired is true', () => {
      const activeAttempt = createBypassAttempt({
        childId: 'child-123',
        deviceId: 'device-456',
        attemptType: 'vpn-detected',
        context: 'Active',
      })

      const expiredAttempt: BypassAttempt = {
        id: 'expired-123',
        childId: 'child-123',
        deviceId: 'device-456',
        attemptType: 'proxy-detected',
        context: 'Expired',
        occurredAt: new Date(NOW.getTime() - 60 * 24 * 60 * 60 * 1000),
        expiresAt: new Date(NOW.getTime() - 30 * 24 * 60 * 60 * 1000),
        impactOnScore: -15,
        wasIntentional: null,
      }

      const attempts = [activeAttempt, expiredAttempt]
      const all = getBypassAttempts(attempts, { includeExpired: true })

      expect(all).toHaveLength(2)
    })
  })

  describe('AC6: Distinguish between intentional bypass vs accidental', () => {
    it('should default wasIntentional to null (unknown)', () => {
      const attempt = createBypassAttempt({
        childId: 'child-123',
        deviceId: 'device-456',
        attemptType: 'extension-disable',
        context: 'Test',
      })

      expect(attempt.wasIntentional).toBeNull()
    })

    it('should mark attempt as unintentional', () => {
      const attempt = createBypassAttempt({
        childId: 'child-123',
        deviceId: 'device-456',
        attemptType: 'extension-disable',
        context: 'Test',
      })

      const updated = markAsUnintentional(attempt)

      expect(updated.wasIntentional).toBe(false)
    })

    it('should preserve other fields when marking as unintentional', () => {
      const attempt = createBypassAttempt({
        childId: 'child-123',
        deviceId: 'device-456',
        attemptType: 'vpn-detected',
        context: 'VPN test',
      })

      const updated = markAsUnintentional(attempt)

      expect(updated.id).toBe(attempt.id)
      expect(updated.childId).toBe(attempt.childId)
      expect(updated.attemptType).toBe(attempt.attemptType)
      expect(updated.context).toBe(attempt.context)
    })

    it('should reduce impact when marked as unintentional', () => {
      const attempt = createBypassAttempt({
        childId: 'child-123',
        deviceId: 'device-456',
        attemptType: 'vpn-detected',
        context: 'Test',
      })

      const originalImpact = attempt.impactOnScore
      const updated = markAsUnintentional(attempt)

      // Impact should be reduced (less negative) when unintentional
      expect(updated.impactOnScore).toBeGreaterThan(originalImpact)
    })
  })

  describe('Bypass attempt types', () => {
    const types: BypassAttemptType[] = [
      'extension-disable',
      'settings-change',
      'vpn-detected',
      'proxy-detected',
      'other',
    ]

    it.each(types)('should support %s attempt type', (attemptType) => {
      const attempt = createBypassAttempt({
        childId: 'child-123',
        deviceId: 'device-456',
        attemptType,
        context: `Test ${attemptType}`,
      })

      expect(attempt.attemptType).toBe(attemptType)
    })
  })

  describe('Impact calculation', () => {
    it('should calculate higher impact for VPN/proxy than extension disable', () => {
      const vpnImpact = calculateBypassImpact('vpn-detected')
      const extensionImpact = calculateBypassImpact('extension-disable')

      expect(Math.abs(vpnImpact)).toBeGreaterThan(Math.abs(extensionImpact))
    })

    it('should calculate negative impact for all types', () => {
      const types: BypassAttemptType[] = [
        'extension-disable',
        'settings-change',
        'vpn-detected',
        'proxy-detected',
        'other',
      ]

      for (const type of types) {
        expect(calculateBypassImpact(type)).toBeLessThan(0)
      }
    })

    it('should apply impact to bypass attempt on creation', () => {
      const attempt = createBypassAttempt({
        childId: 'child-123',
        deviceId: 'device-456',
        attemptType: 'vpn-detected',
        context: 'Test',
      })

      expect(attempt.impactOnScore).toBe(calculateBypassImpact('vpn-detected'))
    })
  })

  describe('Retrieval and filtering', () => {
    it('should filter by child ID', () => {
      const child1Attempt = createBypassAttempt({
        childId: 'child-1',
        deviceId: 'device-456',
        attemptType: 'vpn-detected',
        context: 'Child 1',
      })

      const child2Attempt = createBypassAttempt({
        childId: 'child-2',
        deviceId: 'device-789',
        attemptType: 'proxy-detected',
        context: 'Child 2',
      })

      const attempts = [child1Attempt, child2Attempt]
      const child1Attempts = getBypassAttempts(attempts, { childId: 'child-1' })

      expect(child1Attempts).toHaveLength(1)
      expect(child1Attempts[0].childId).toBe('child-1')
    })

    it('should sort by occurredAt descending (most recent first)', () => {
      const older = createBypassAttempt({
        childId: 'child-123',
        deviceId: 'device-456',
        attemptType: 'vpn-detected',
        context: 'Older',
      })

      vi.setSystemTime(new Date(NOW.getTime() + 1000))

      const newer = createBypassAttempt({
        childId: 'child-123',
        deviceId: 'device-456',
        attemptType: 'proxy-detected',
        context: 'Newer',
      })

      const attempts = [older, newer]
      const sorted = getBypassAttempts(attempts, { childId: 'child-123' })

      expect(sorted[0].context).toBe('Newer')
      expect(sorted[1].context).toBe('Older')
    })
  })
})
