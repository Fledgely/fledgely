/**
 * useDevices Hook Tests - Story 19.3, 46.4
 *
 * Tests for helper functions exported from useDevices.
 * Story 19.3: formatLastSeen, isValidDate
 * Story 46.4: formatOfflineSince
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { formatLastSeen, formatOfflineSince, isValidDate } from './useDevices'

describe('useDevices helpers', () => {
  describe('isValidDate', () => {
    it('should return false for null', () => {
      expect(isValidDate(null)).toBe(false)
    })

    it('should return false for undefined', () => {
      expect(isValidDate(undefined)).toBe(false)
    })

    it('should return false for epoch 0', () => {
      expect(isValidDate(new Date(0))).toBe(false)
    })

    it('should return false for NaN date', () => {
      expect(isValidDate(new Date('invalid'))).toBe(false)
    })

    it('should return true for valid date', () => {
      expect(isValidDate(new Date())).toBe(true)
      expect(isValidDate(new Date('2024-01-15'))).toBe(true)
    })
  })

  describe('formatLastSeen', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('should return "Never synced" for null', () => {
      expect(formatLastSeen(null)).toBe('Never synced')
    })

    it('should return "Never synced" for undefined', () => {
      expect(formatLastSeen(undefined)).toBe('Never synced')
    })

    it('should return "Just now" for less than 60 seconds', () => {
      const now = Date.now()
      vi.setSystemTime(now)
      expect(formatLastSeen(new Date(now - 30000))).toBe('Just now')
    })

    it('should return "X min ago" for less than 60 minutes', () => {
      const now = Date.now()
      vi.setSystemTime(now)
      expect(formatLastSeen(new Date(now - 5 * 60000))).toBe('5 min ago')
    })

    it('should return "X hours ago" for less than 24 hours', () => {
      const now = Date.now()
      vi.setSystemTime(now)
      expect(formatLastSeen(new Date(now - 3 * 3600000))).toBe('3 hours ago')
    })

    it('should return "X days ago" for 24+ hours', () => {
      const now = Date.now()
      vi.setSystemTime(now)
      expect(formatLastSeen(new Date(now - 2 * 86400000))).toBe('2 days ago')
    })
  })

  describe('formatOfflineSince (Story 46.4)', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('should return empty string for null', () => {
      expect(formatOfflineSince(null)).toBe('')
    })

    it('should return empty string for undefined', () => {
      expect(formatOfflineSince(undefined)).toBe('')
    })

    it('should return empty string for invalid date', () => {
      expect(formatOfflineSince(new Date('invalid'))).toBe('')
      expect(formatOfflineSince(new Date(0))).toBe('')
    })

    it('should return time only for same day (e.g., "2:30 PM")', () => {
      // Set current time to Jan 15, 2024 at 4:00 PM
      const now = new Date('2024-01-15T16:00:00')
      vi.setSystemTime(now)

      // Offline since 2:30 PM same day
      const offlineSince = new Date('2024-01-15T14:30:00')
      const result = formatOfflineSince(offlineSince)

      // Should be just time, no day prefix
      expect(result).toMatch(/2:30\s*PM/i)
      expect(result).not.toMatch(/Mon|Tue|Wed|Thu|Fri|Sat|Sun/)
    })

    it('should return day and time for different day (e.g., "Mon, 2:30 PM")', () => {
      // Set current time to Jan 16, 2024 (Tuesday) at 4:00 PM
      const now = new Date('2024-01-16T16:00:00')
      vi.setSystemTime(now)

      // Offline since Jan 15 (Monday) at 2:30 PM
      const offlineSince = new Date('2024-01-15T14:30:00')
      const result = formatOfflineSince(offlineSince)

      // Should include day and time
      expect(result).toMatch(/Mon/i)
      expect(result).toMatch(/2:30\s*PM/i)
    })

    it('should format AM times correctly', () => {
      const now = new Date('2024-01-15T16:00:00')
      vi.setSystemTime(now)

      const offlineSince = new Date('2024-01-15T09:15:00')
      const result = formatOfflineSince(offlineSince)

      expect(result).toMatch(/9:15\s*AM/i)
    })

    it('should handle midnight correctly', () => {
      const now = new Date('2024-01-15T16:00:00')
      vi.setSystemTime(now)

      const offlineSince = new Date('2024-01-15T00:00:00')
      const result = formatOfflineSince(offlineSince)

      expect(result).toMatch(/12:00\s*AM/i)
    })

    it('should handle noon correctly', () => {
      const now = new Date('2024-01-15T16:00:00')
      vi.setSystemTime(now)

      const offlineSince = new Date('2024-01-15T12:00:00')
      const result = formatOfflineSince(offlineSince)

      expect(result).toMatch(/12:00\s*PM/i)
    })
  })
})
