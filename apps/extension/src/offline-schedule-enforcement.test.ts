/**
 * Offline Schedule Enforcement Tests - Story 32.3
 *
 * Tests for family offline time enforcement functionality.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  parseTimeToMinutes,
  isWithinOfflineWindow,
  getMinutesUntilStart,
  getMinutesUntilEnd,
  isWarningActive,
  shouldBlockForOffline,
  type FamilyOfflineSchedule,
  WARNING_THRESHOLD_MINUTES,
} from './offline-schedule-enforcement'

// Mock crisis-allowlist module
const mockCrisisDomains = ['988lifeline.org', 'suicidepreventionlifeline.org', 'crisistextline.org']
vi.mock('./crisis-allowlist', () => ({
  isUrlProtected: (url: string) => {
    try {
      const hostname = new URL(url).hostname.toLowerCase()
      return mockCrisisDomains.some(
        (domain) => hostname === domain || hostname.endsWith(`.${domain}`)
      )
    } catch {
      return false
    }
  },
}))

describe('offline-schedule-enforcement - Story 32.3', () => {
  describe('parseTimeToMinutes', () => {
    it('parses midnight correctly', () => {
      expect(parseTimeToMinutes('00:00')).toBe(0)
    })

    it('parses noon correctly', () => {
      expect(parseTimeToMinutes('12:00')).toBe(720)
    })

    it('parses evening time correctly', () => {
      expect(parseTimeToMinutes('18:30')).toBe(1110) // 18*60 + 30
    })

    it('parses late night correctly', () => {
      expect(parseTimeToMinutes('23:59')).toBe(1439) // 23*60 + 59
    })
  })

  describe('isWithinOfflineWindow', () => {
    const createSchedule = (
      enabled: boolean,
      startTime: string,
      endTime: string
    ): FamilyOfflineSchedule => ({
      familyId: 'test-family',
      enabled,
      preset: 'custom',
      weekdayWindow: { startTime, endTime, timezone: 'America/Los_Angeles' },
      weekendWindow: { startTime, endTime, timezone: 'America/Los_Angeles' },
      createdAt: Date.now(),
      updatedAt: Date.now(),
    })

    it('returns false when schedule is disabled', () => {
      const schedule = createSchedule(false, '18:00', '19:00')
      expect(isWithinOfflineWindow(schedule)).toBe(false)
    })

    it('returns false when no window is configured', () => {
      const schedule: FamilyOfflineSchedule = {
        familyId: 'test-family',
        enabled: true,
        preset: 'custom',
        weekdayWindow: null,
        weekendWindow: null,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }
      expect(isWithinOfflineWindow(schedule)).toBe(false)
    })

    // Note: These tests are time-dependent and may need mocking
    // For now, testing the logic separately
  })

  describe('getMinutesUntilStart', () => {
    it('returns null when schedule is disabled', () => {
      const schedule: FamilyOfflineSchedule = {
        familyId: 'test-family',
        enabled: false,
        preset: 'custom',
        weekdayWindow: { startTime: '18:00', endTime: '19:00', timezone: 'America/Los_Angeles' },
        weekendWindow: null,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }
      expect(getMinutesUntilStart(schedule)).toBeNull()
    })

    it('returns null when no window is configured', () => {
      const schedule: FamilyOfflineSchedule = {
        familyId: 'test-family',
        enabled: true,
        preset: 'custom',
        weekdayWindow: null,
        weekendWindow: null,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }
      expect(getMinutesUntilStart(schedule)).toBeNull()
    })
  })

  describe('getMinutesUntilEnd', () => {
    it('returns null when schedule is disabled', () => {
      const schedule: FamilyOfflineSchedule = {
        familyId: 'test-family',
        enabled: false,
        preset: 'custom',
        weekdayWindow: { startTime: '18:00', endTime: '19:00', timezone: 'America/Los_Angeles' },
        weekendWindow: null,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }
      expect(getMinutesUntilEnd(schedule)).toBeNull()
    })
  })

  describe('isWarningActive', () => {
    it('returns false when schedule is disabled', () => {
      const schedule: FamilyOfflineSchedule = {
        familyId: 'test-family',
        enabled: false,
        preset: 'custom',
        weekdayWindow: { startTime: '18:00', endTime: '19:00', timezone: 'America/Los_Angeles' },
        weekendWindow: null,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }
      expect(isWarningActive(schedule)).toBe(false)
    })

    it('uses correct warning threshold', () => {
      expect(WARNING_THRESHOLD_MINUTES).toBe(5)
    })
  })

  describe('shouldBlockForOffline', () => {
    it('does not block chrome:// URLs', () => {
      expect(shouldBlockForOffline('chrome://settings')).toBe(false)
      expect(shouldBlockForOffline('chrome://extensions')).toBe(false)
    })

    it('does not block chrome-extension:// URLs', () => {
      expect(shouldBlockForOffline('chrome-extension://abc123/popup.html')).toBe(false)
    })

    it('does not block crisis resources (AC4)', () => {
      expect(shouldBlockForOffline('https://988lifeline.org')).toBe(false)
      expect(shouldBlockForOffline('https://www.988lifeline.org/chat')).toBe(false)
      expect(shouldBlockForOffline('https://suicidepreventionlifeline.org')).toBe(false)
      expect(shouldBlockForOffline('https://crisistextline.org')).toBe(false)
    })

    it('blocks regular websites', () => {
      expect(shouldBlockForOffline('https://youtube.com')).toBe(true)
      expect(shouldBlockForOffline('https://www.google.com')).toBe(true)
      expect(shouldBlockForOffline('https://example.com')).toBe(true)
    })

    it('handles invalid URLs gracefully', () => {
      expect(shouldBlockForOffline('not-a-url')).toBe(false)
      expect(shouldBlockForOffline('')).toBe(false)
    })
  })

  describe('Time window logic', () => {
    // Helper to test window logic with mocked time
    const mockCurrentMinutes = (minutes: number) => {
      const hours = Math.floor(minutes / 60)
      const mins = minutes % 60
      const mockDate = new Date()
      mockDate.setHours(hours, mins, 0, 0)
      vi.setSystemTime(mockDate)
    }

    beforeEach(() => {
      vi.useFakeTimers()
      // Set to a weekday (Wednesday)
      vi.setSystemTime(new Date('2025-01-01T12:00:00'))
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    describe('same-day window (e.g., 18:00-19:00)', () => {
      const schedule: FamilyOfflineSchedule = {
        familyId: 'test-family',
        enabled: true,
        preset: 'dinner_time',
        weekdayWindow: { startTime: '18:00', endTime: '19:00', timezone: 'America/Los_Angeles' },
        weekendWindow: { startTime: '18:00', endTime: '19:00', timezone: 'America/Los_Angeles' },
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }

      it('returns false before window starts', () => {
        mockCurrentMinutes(17 * 60) // 17:00
        expect(isWithinOfflineWindow(schedule)).toBe(false)
      })

      it('returns true at window start', () => {
        mockCurrentMinutes(18 * 60) // 18:00
        expect(isWithinOfflineWindow(schedule)).toBe(true)
      })

      it('returns true during window', () => {
        mockCurrentMinutes(18 * 60 + 30) // 18:30
        expect(isWithinOfflineWindow(schedule)).toBe(true)
      })

      it('returns false at window end', () => {
        mockCurrentMinutes(19 * 60) // 19:00
        expect(isWithinOfflineWindow(schedule)).toBe(false)
      })

      it('returns false after window ends', () => {
        mockCurrentMinutes(20 * 60) // 20:00
        expect(isWithinOfflineWindow(schedule)).toBe(false)
      })
    })

    describe('overnight window (e.g., 21:00-07:00)', () => {
      const schedule: FamilyOfflineSchedule = {
        familyId: 'test-family',
        enabled: true,
        preset: 'bedtime',
        weekdayWindow: { startTime: '21:00', endTime: '07:00', timezone: 'America/Los_Angeles' },
        weekendWindow: { startTime: '22:00', endTime: '08:00', timezone: 'America/Los_Angeles' },
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }

      it('returns false before window starts', () => {
        mockCurrentMinutes(20 * 60) // 20:00
        expect(isWithinOfflineWindow(schedule)).toBe(false)
      })

      it('returns true after window starts (before midnight)', () => {
        mockCurrentMinutes(22 * 60) // 22:00
        expect(isWithinOfflineWindow(schedule)).toBe(true)
      })

      it('returns true at midnight', () => {
        mockCurrentMinutes(0) // 00:00
        expect(isWithinOfflineWindow(schedule)).toBe(true)
      })

      it('returns true in early morning', () => {
        mockCurrentMinutes(5 * 60) // 05:00
        expect(isWithinOfflineWindow(schedule)).toBe(true)
      })

      it('returns false after window ends', () => {
        mockCurrentMinutes(8 * 60) // 08:00
        expect(isWithinOfflineWindow(schedule)).toBe(false)
      })
    })

    describe('minutes until start', () => {
      const schedule: FamilyOfflineSchedule = {
        familyId: 'test-family',
        enabled: true,
        preset: 'dinner_time',
        weekdayWindow: { startTime: '18:00', endTime: '19:00', timezone: 'America/Los_Angeles' },
        weekendWindow: { startTime: '18:00', endTime: '19:00', timezone: 'America/Los_Angeles' },
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }

      it('returns correct minutes before window', () => {
        mockCurrentMinutes(17 * 60 + 55) // 17:55
        expect(getMinutesUntilStart(schedule)).toBe(5)
      })

      it('returns null during window', () => {
        mockCurrentMinutes(18 * 60 + 30) // 18:30
        expect(getMinutesUntilStart(schedule)).toBeNull()
      })

      it('returns null after window ends', () => {
        mockCurrentMinutes(20 * 60) // 20:00
        expect(getMinutesUntilStart(schedule)).toBeNull()
      })
    })

    describe('warning active', () => {
      const schedule: FamilyOfflineSchedule = {
        familyId: 'test-family',
        enabled: true,
        preset: 'dinner_time',
        weekdayWindow: { startTime: '18:00', endTime: '19:00', timezone: 'America/Los_Angeles' },
        weekendWindow: { startTime: '18:00', endTime: '19:00', timezone: 'America/Los_Angeles' },
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }

      it('returns false when more than 5 minutes until start', () => {
        mockCurrentMinutes(17 * 60 + 50) // 17:50 (10 min before)
        expect(isWarningActive(schedule)).toBe(false)
      })

      it('returns true when 5 minutes until start', () => {
        mockCurrentMinutes(17 * 60 + 55) // 17:55 (5 min before)
        expect(isWarningActive(schedule)).toBe(true)
      })

      it('returns true when 1 minute until start', () => {
        mockCurrentMinutes(17 * 60 + 59) // 17:59 (1 min before)
        expect(isWarningActive(schedule)).toBe(true)
      })

      it('returns false during window', () => {
        mockCurrentMinutes(18 * 60 + 30) // 18:30 (during window)
        expect(isWarningActive(schedule)).toBe(false)
      })
    })

    describe('minutes until end', () => {
      const schedule: FamilyOfflineSchedule = {
        familyId: 'test-family',
        enabled: true,
        preset: 'dinner_time',
        weekdayWindow: { startTime: '18:00', endTime: '19:00', timezone: 'America/Los_Angeles' },
        weekendWindow: { startTime: '18:00', endTime: '19:00', timezone: 'America/Los_Angeles' },
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }

      it('returns correct minutes during window', () => {
        mockCurrentMinutes(18 * 60 + 30) // 18:30 (30 min until end)
        expect(getMinutesUntilEnd(schedule)).toBe(30)
      })

      it('returns null before window', () => {
        mockCurrentMinutes(17 * 60) // 17:00
        expect(getMinutesUntilEnd(schedule)).toBeNull()
      })

      it('returns null after window', () => {
        mockCurrentMinutes(20 * 60) // 20:00
        expect(getMinutesUntilEnd(schedule)).toBeNull()
      })
    })
  })
})
