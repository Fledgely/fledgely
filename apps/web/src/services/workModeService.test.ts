/**
 * Work Mode Service Tests - Story 33.6
 *
 * Tests for session history tracking, check-ins, and notifications
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { isOutsideScheduledHours } from './workModeService'

// Mock Firebase
vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  doc: vi.fn(),
  getDoc: vi.fn(),
  setDoc: vi.fn(),
  updateDoc: vi.fn(),
  addDoc: vi.fn(),
  getDocs: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
  limit: vi.fn(),
}))

vi.mock('../lib/firebase', () => ({
  getFirestoreDb: () => ({}),
}))

describe('workModeService - Story 33.6', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('isOutsideScheduledHours', () => {
    it('returns false when no schedules exist', () => {
      expect(isOutsideScheduledHours([])).toBe(false)
    })

    it('returns false when within a scheduled time', () => {
      // Mock current time to be Tuesday at 2:00 PM
      const now = new Date('2024-01-09T14:00:00') // Tuesday
      vi.setSystemTime(now)

      const schedules = [
        {
          days: ['tuesday', 'thursday'],
          startTime: '09:00',
          endTime: '17:00',
          isEnabled: true,
        },
      ]

      expect(isOutsideScheduledHours(schedules)).toBe(false)
    })

    it('returns true when outside all scheduled times', () => {
      // Mock current time to be Tuesday at 8:00 PM (outside 9-5)
      const now = new Date('2024-01-09T20:00:00') // Tuesday
      vi.setSystemTime(now)

      const schedules = [
        {
          days: ['tuesday', 'thursday'],
          startTime: '09:00',
          endTime: '17:00',
          isEnabled: true,
        },
      ]

      expect(isOutsideScheduledHours(schedules)).toBe(true)
    })

    it('returns true when on a day not in schedule', () => {
      // Mock current time to be Wednesday at 10:00 AM
      const now = new Date('2024-01-10T10:00:00') // Wednesday
      vi.setSystemTime(now)

      const schedules = [
        {
          days: ['tuesday', 'thursday'],
          startTime: '09:00',
          endTime: '17:00',
          isEnabled: true,
        },
      ]

      expect(isOutsideScheduledHours(schedules)).toBe(true)
    })

    it('ignores disabled schedules', () => {
      // Mock current time to be Tuesday at 2:00 PM
      const now = new Date('2024-01-09T14:00:00') // Tuesday
      vi.setSystemTime(now)

      const schedules = [
        {
          days: ['tuesday', 'thursday'],
          startTime: '09:00',
          endTime: '17:00',
          isEnabled: false, // Disabled
        },
      ]

      // Disabled schedules are skipped, so we're "outside" all enabled schedules
      expect(isOutsideScheduledHours(schedules)).toBe(true)
    })

    it('handles midnight-crossing schedules', () => {
      // Mock current time to be Friday at 11:00 PM
      const now = new Date('2024-01-12T23:00:00') // Friday
      vi.setSystemTime(now)

      const schedules = [
        {
          days: ['friday'],
          startTime: '22:00',
          endTime: '02:00', // Crosses midnight
          isEnabled: true,
        },
      ]

      expect(isOutsideScheduledHours(schedules)).toBe(false)
    })

    it('handles midnight-crossing schedules (after midnight)', () => {
      // Mock current time to be Saturday at 1:00 AM
      const now = new Date('2024-01-13T01:00:00') // Saturday
      vi.setSystemTime(now)

      const schedules = [
        {
          days: ['saturday'],
          startTime: '22:00',
          endTime: '02:00', // Crosses midnight
          isEnabled: true,
        },
      ]

      expect(isOutsideScheduledHours(schedules)).toBe(false)
    })

    it('handles multiple schedules - within one', () => {
      // Mock current time to be Saturday at 10:00 AM
      const now = new Date('2024-01-13T10:00:00') // Saturday
      vi.setSystemTime(now)

      const schedules = [
        {
          days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
          startTime: '09:00',
          endTime: '17:00',
          isEnabled: true,
        },
        {
          days: ['saturday'],
          startTime: '08:00',
          endTime: '12:00',
          isEnabled: true,
        },
      ]

      expect(isOutsideScheduledHours(schedules)).toBe(false)
    })

    it('handles multiple schedules - outside all', () => {
      // Mock current time to be Sunday at 10:00 AM
      const now = new Date('2024-01-14T10:00:00') // Sunday
      vi.setSystemTime(now)

      const schedules = [
        {
          days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
          startTime: '09:00',
          endTime: '17:00',
          isEnabled: true,
        },
        {
          days: ['saturday'],
          startTime: '08:00',
          endTime: '12:00',
          isEnabled: true,
        },
      ]

      expect(isOutsideScheduledHours(schedules)).toBe(true)
    })
  })
})
