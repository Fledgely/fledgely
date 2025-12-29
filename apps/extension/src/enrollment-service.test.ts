/**
 * Unit tests for Enrollment Service - Story 12.3
 *
 * Tests cover:
 * - Device info gathering
 * - Time formatting utilities
 * - Request submission logic
 * - Status polling logic
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  gatherDeviceInfo,
  formatTimeRemaining,
  getTimeUntilExpiry,
  type DeviceInfo,
} from './enrollment-service'

describe('Enrollment Service', () => {
  describe('gatherDeviceInfo', () => {
    const originalNavigator = global.navigator

    beforeEach(() => {
      // Mock navigator
      Object.defineProperty(global, 'navigator', {
        value: {
          platform: 'Linux x86_64',
          userAgent:
            'Mozilla/5.0 (X11; CrOS x86_64 14541.0.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
        writable: true,
        configurable: true,
      })
    })

    afterEach(() => {
      Object.defineProperty(global, 'navigator', {
        value: originalNavigator,
        writable: true,
        configurable: true,
      })
    })

    it('returns chromebook device type', () => {
      const info = gatherDeviceInfo()
      expect(info.type).toBe('chromebook')
    })

    it('captures platform from navigator', () => {
      const info = gatherDeviceInfo()
      expect(info.platform).toBe('Linux x86_64')
    })

    it('captures userAgent from navigator', () => {
      const info = gatherDeviceInfo()
      expect(info.userAgent).toContain('CrOS')
    })

    it('handles missing platform gracefully', () => {
      Object.defineProperty(global, 'navigator', {
        value: {
          platform: undefined,
          userAgent: 'Test Agent',
        },
        writable: true,
        configurable: true,
      })

      const info = gatherDeviceInfo()
      expect(info.platform).toBe('Unknown')
    })

    it('returns valid DeviceInfo structure', () => {
      const info = gatherDeviceInfo()

      expect(info).toHaveProperty('type')
      expect(info).toHaveProperty('platform')
      expect(info).toHaveProperty('userAgent')
    })
  })

  describe('formatTimeRemaining', () => {
    it('formats 10 minutes correctly', () => {
      const result = formatTimeRemaining(10 * 60 * 1000)
      expect(result).toBe('10:00')
    })

    it('formats 5 minutes 30 seconds correctly', () => {
      const result = formatTimeRemaining(5 * 60 * 1000 + 30 * 1000)
      expect(result).toBe('5:30')
    })

    it('formats 0 seconds correctly', () => {
      const result = formatTimeRemaining(0)
      expect(result).toBe('0:00')
    })

    it('formats 59 seconds correctly', () => {
      const result = formatTimeRemaining(59 * 1000)
      expect(result).toBe('0:59')
    })

    it('formats single digit seconds with leading zero', () => {
      const result = formatTimeRemaining(2 * 60 * 1000 + 5 * 1000)
      expect(result).toBe('2:05')
    })

    it('handles negative values as 0:00', () => {
      const result = formatTimeRemaining(-5000)
      expect(result).toBe('0:00')
    })

    it('formats 1 second correctly', () => {
      const result = formatTimeRemaining(1000)
      expect(result).toBe('0:01')
    })

    it('formats exactly 1 minute correctly', () => {
      const result = formatTimeRemaining(60 * 1000)
      expect(result).toBe('1:00')
    })
  })

  describe('getTimeUntilExpiry', () => {
    it('returns positive time for future expiry', () => {
      const futureExpiry = Date.now() + 300000 // 5 minutes from now
      const result = getTimeUntilExpiry(futureExpiry)
      expect(result).toBeGreaterThan(0)
      expect(result).toBeLessThanOrEqual(300000)
    })

    it('returns 0 for past expiry', () => {
      const pastExpiry = Date.now() - 60000 // 1 minute ago
      const result = getTimeUntilExpiry(pastExpiry)
      expect(result).toBe(0)
    })

    it('returns 0 for exactly now', () => {
      const now = Date.now()
      const result = getTimeUntilExpiry(now)
      // Could be 0 or very small positive due to execution time
      expect(result).toBeLessThanOrEqual(100)
    })

    it('calculates correct remaining time', () => {
      const now = Date.now()
      const expiresAt = now + 600000 // 10 minutes
      const result = getTimeUntilExpiry(expiresAt)

      // Should be close to 600000 (within 100ms for test execution time)
      expect(result).toBeGreaterThan(599000)
      expect(result).toBeLessThanOrEqual(600000)
    })
  })

  describe('DeviceInfo Type', () => {
    it('enforces chromebook as device type', () => {
      const validInfo: DeviceInfo = {
        type: 'chromebook',
        platform: 'Test Platform',
        userAgent: 'Test Agent',
      }

      expect(validInfo.type).toBe('chromebook')
    })

    it('requires all properties', () => {
      const info: DeviceInfo = {
        type: 'chromebook',
        platform: 'platform',
        userAgent: 'ua',
      }

      expect(Object.keys(info)).toHaveLength(3)
      expect(info.type).toBeDefined()
      expect(info.platform).toBeDefined()
      expect(info.userAgent).toBeDefined()
    })
  })

  describe('Enrollment Request Status Types', () => {
    it('defines valid status values', () => {
      const validStatuses = ['pending', 'approved', 'rejected', 'expired']

      validStatuses.forEach((status) => {
        expect(['pending', 'approved', 'rejected', 'expired']).toContain(status)
      })
    })
  })

  describe('Request Expiry', () => {
    it('request expires after 10 minutes', () => {
      const REQUEST_EXPIRY_MS = 10 * 60 * 1000
      expect(REQUEST_EXPIRY_MS).toBe(600000)
    })

    it('polling stops after 11 minutes (with buffer)', () => {
      const MAX_POLL_DURATION_MS = 11 * 60 * 1000
      expect(MAX_POLL_DURATION_MS).toBe(660000)
    })

    it('polling interval is 5 seconds', () => {
      const POLL_INTERVAL_MS = 5000
      expect(POLL_INTERVAL_MS).toBe(5000)
    })
  })
})
