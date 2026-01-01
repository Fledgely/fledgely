/**
 * Grace Period Reminder Service Tests - Story 35.4
 *
 * Tests for daily reminder system during grace period.
 * AC4: Daily reminders during grace period
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  shouldSendDailyReminder,
  getGracePeriodReminderType,
  createGracePeriodReminder,
  getGracePeriodReminderSchedule,
  GRACE_PERIOD_REMINDER_TYPES,
} from './gracePeriodReminderService'

describe('Grace Period Reminder Service - Story 35.4', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-06-15T10:00:00'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('GRACE_PERIOD_REMINDER_TYPES', () => {
    it('should have daily reminder type', () => {
      expect(GRACE_PERIOD_REMINDER_TYPES.DAILY).toBe('daily')
    })

    it('should have urgent reminder type', () => {
      expect(GRACE_PERIOD_REMINDER_TYPES.URGENT).toBe('urgent')
    })

    it('should have final reminder type', () => {
      expect(GRACE_PERIOD_REMINDER_TYPES.FINAL).toBe('final')
    })
  })

  describe('shouldSendDailyReminder (AC4)', () => {
    it('should return true if no reminder sent today', () => {
      // Last reminder was yesterday
      const lastReminderDate = new Date('2024-06-14T10:00:00')

      expect(shouldSendDailyReminder(lastReminderDate)).toBe(true)
    })

    it('should return false if reminder already sent today', () => {
      // Last reminder was earlier today
      const lastReminderDate = new Date('2024-06-15T08:00:00')

      expect(shouldSendDailyReminder(lastReminderDate)).toBe(false)
    })

    it('should return true if no previous reminder', () => {
      expect(shouldSendDailyReminder(null)).toBe(true)
    })

    it('should return true if last reminder was multiple days ago', () => {
      const lastReminderDate = new Date('2024-06-10T10:00:00')

      expect(shouldSendDailyReminder(lastReminderDate)).toBe(true)
    })
  })

  describe('getGracePeriodReminderType', () => {
    it('should return daily type for 14-4 days remaining', () => {
      expect(getGracePeriodReminderType(10)).toBe('daily')
      expect(getGracePeriodReminderType(7)).toBe('daily')
      expect(getGracePeriodReminderType(4)).toBe('daily')
    })

    it('should return urgent type for 3-2 days remaining', () => {
      expect(getGracePeriodReminderType(3)).toBe('urgent')
      expect(getGracePeriodReminderType(2)).toBe('urgent')
    })

    it('should return final type for 1 day remaining', () => {
      expect(getGracePeriodReminderType(1)).toBe('final')
    })

    it('should return expired type for 0 days', () => {
      expect(getGracePeriodReminderType(0)).toBe('expired')
    })
  })

  describe('createGracePeriodReminder', () => {
    it('should create reminder with correct fields', () => {
      const agreement = {
        id: 'agreement-123',
        familyId: 'family-456',
        expiryDate: new Date('2024-06-10'),
      }

      const reminder = createGracePeriodReminder(agreement, 5)

      expect(reminder.agreementId).toBe('agreement-123')
      expect(reminder.familyId).toBe('family-456')
      expect(reminder.daysRemaining).toBe(5)
      expect(reminder.type).toBe('daily')
      expect(reminder.createdAt).toBeDefined()
    })

    it('should create urgent reminder for 2 days', () => {
      const agreement = {
        id: 'agreement-123',
        familyId: 'family-456',
        expiryDate: new Date('2024-06-13'),
      }

      const reminder = createGracePeriodReminder(agreement, 2)

      expect(reminder.type).toBe('urgent')
    })

    it('should create final reminder for 1 day', () => {
      const agreement = {
        id: 'agreement-123',
        familyId: 'family-456',
        expiryDate: new Date('2024-06-14'),
      }

      const reminder = createGracePeriodReminder(agreement, 1)

      expect(reminder.type).toBe('final')
    })

    it('should include message based on days remaining', () => {
      const agreement = {
        id: 'agreement-123',
        familyId: 'family-456',
        expiryDate: new Date('2024-06-10'),
      }

      const reminder = createGracePeriodReminder(agreement, 10)

      expect(reminder.message).toContain('10')
    })
  })

  describe('getGracePeriodReminderSchedule', () => {
    it('should return daily reminders for grace period', () => {
      const schedule = getGracePeriodReminderSchedule(14)

      expect(schedule.length).toBe(14)
    })

    it('should mark urgent reminders for days 3-2', () => {
      const schedule = getGracePeriodReminderSchedule(14)

      const day3 = schedule.find((s) => s.day === 3)
      const day2 = schedule.find((s) => s.day === 2)

      expect(day3?.type).toBe('urgent')
      expect(day2?.type).toBe('urgent')
    })

    it('should mark final reminder for day 1', () => {
      const schedule = getGracePeriodReminderSchedule(14)

      const day1 = schedule.find((s) => s.day === 1)

      expect(day1?.type).toBe('final')
    })

    it('should return partial schedule for remaining days', () => {
      const schedule = getGracePeriodReminderSchedule(5)

      expect(schedule.length).toBe(5)
    })
  })
})
