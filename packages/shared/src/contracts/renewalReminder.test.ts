/**
 * Renewal Reminder Types and Constants Tests - Story 35.2
 *
 * Tests for renewal reminder configuration types and constants.
 * AC1: Reminder at 30 days
 * AC2: Reminder at 7 days
 * AC3: Reminder at 1 day
 * AC6: Snooze option (3 days)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  reminderTypeSchema,
  reminderStatusSchema,
  REMINDER_THRESHOLDS,
  SNOOZE_DURATION_DAYS,
  REMINDER_MESSAGES,
  getReminderType,
  shouldShowReminder,
  calculateSnoozeExpiry,
  isSnoozeExpired,
} from './renewalReminder'

describe('Renewal Reminder Types - Story 35.2', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-06-01'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('reminderTypeSchema', () => {
    it('should validate "30-day" reminder type', () => {
      const result = reminderTypeSchema.safeParse('30-day')
      expect(result.success).toBe(true)
    })

    it('should validate "7-day" reminder type', () => {
      const result = reminderTypeSchema.safeParse('7-day')
      expect(result.success).toBe(true)
    })

    it('should validate "1-day" reminder type', () => {
      const result = reminderTypeSchema.safeParse('1-day')
      expect(result.success).toBe(true)
    })

    it('should reject invalid reminder types', () => {
      const result = reminderTypeSchema.safeParse('2-day')
      expect(result.success).toBe(false)
    })
  })

  describe('reminderStatusSchema', () => {
    it('should validate "pending" status', () => {
      const result = reminderStatusSchema.safeParse('pending')
      expect(result.success).toBe(true)
    })

    it('should validate "shown" status', () => {
      const result = reminderStatusSchema.safeParse('shown')
      expect(result.success).toBe(true)
    })

    it('should validate "dismissed" status', () => {
      const result = reminderStatusSchema.safeParse('dismissed')
      expect(result.success).toBe(true)
    })

    it('should validate "snoozed" status', () => {
      const result = reminderStatusSchema.safeParse('snoozed')
      expect(result.success).toBe(true)
    })

    it('should validate "actioned" status', () => {
      const result = reminderStatusSchema.safeParse('actioned')
      expect(result.success).toBe(true)
    })
  })

  describe('REMINDER_THRESHOLDS (AC1, AC2, AC3)', () => {
    it('should have 30-day threshold', () => {
      expect(REMINDER_THRESHOLDS.THIRTY_DAYS).toBe(30)
    })

    it('should have 7-day threshold', () => {
      expect(REMINDER_THRESHOLDS.SEVEN_DAYS).toBe(7)
    })

    it('should have 1-day threshold', () => {
      expect(REMINDER_THRESHOLDS.ONE_DAY).toBe(1)
    })
  })

  describe('SNOOZE_DURATION_DAYS (AC6)', () => {
    it('should be 3 days', () => {
      expect(SNOOZE_DURATION_DAYS).toBe(3)
    })
  })

  describe('REMINDER_MESSAGES (AC1, AC2, AC3)', () => {
    it('should have 30-day message', () => {
      expect(REMINDER_MESSAGES['30-day']).toBe('Agreement expires in 30 days')
    })

    it('should have 7-day message', () => {
      expect(REMINDER_MESSAGES['7-day']).toBe('Renew your agreement this week')
    })

    it('should have 1-day message', () => {
      expect(REMINDER_MESSAGES['1-day']).toBe('Agreement expires tomorrow')
    })

    it('should have child-friendly messages', () => {
      expect(REMINDER_MESSAGES.child['30-day']).toBeDefined()
      expect(REMINDER_MESSAGES.child['7-day']).toBeDefined()
      expect(REMINDER_MESSAGES.child['1-day']).toBeDefined()
    })
  })

  describe('getReminderType', () => {
    it('should return "30-day" when 30+ days remain', () => {
      const expiryDate = new Date('2024-07-10') // 39 days away
      expect(getReminderType(expiryDate)).toBe('30-day')
    })

    it('should return "30-day" when exactly 30 days remain', () => {
      const expiryDate = new Date('2024-07-01') // 30 days away
      expect(getReminderType(expiryDate)).toBe('30-day')
    })

    it('should return "7-day" when 7-29 days remain', () => {
      const expiryDate = new Date('2024-06-15') // 14 days away
      expect(getReminderType(expiryDate)).toBe('7-day')
    })

    it('should return "7-day" when exactly 7 days remain', () => {
      const expiryDate = new Date('2024-06-08') // 7 days away
      expect(getReminderType(expiryDate)).toBe('7-day')
    })

    it('should return "1-day" when 1-6 days remain', () => {
      const expiryDate = new Date('2024-06-05') // 4 days away
      expect(getReminderType(expiryDate)).toBe('1-day')
    })

    it('should return "1-day" when exactly 1 day remains', () => {
      const expiryDate = new Date('2024-06-02') // 1 day away
      expect(getReminderType(expiryDate)).toBe('1-day')
    })

    it('should return null when expired', () => {
      const expiryDate = new Date('2024-05-01') // past
      expect(getReminderType(expiryDate)).toBeNull()
    })

    it('should return null for null expiry date', () => {
      expect(getReminderType(null)).toBeNull()
    })
  })

  describe('shouldShowReminder', () => {
    it('should show reminder when in threshold and not snoozed', () => {
      const expiryDate = new Date('2024-07-01') // 30 days
      expect(shouldShowReminder(expiryDate)).toBe(true)
    })

    it('should not show reminder when snoozed recently', () => {
      const expiryDate = new Date('2024-07-01')
      const snoozedAt = new Date('2024-05-30') // 2 days ago
      expect(shouldShowReminder(expiryDate, { snoozedAt, reminderType: '30-day' })).toBe(false)
    })

    it('should show reminder when snooze expired', () => {
      const expiryDate = new Date('2024-07-01')
      const snoozedAt = new Date('2024-05-25') // 7 days ago (snooze expired)
      expect(shouldShowReminder(expiryDate, { snoozedAt, reminderType: '30-day' })).toBe(true)
    })

    it('should not show reminder for expired agreement', () => {
      const expiryDate = new Date('2024-05-01')
      expect(shouldShowReminder(expiryDate)).toBe(false)
    })

    it('should not show reminder for null expiry', () => {
      expect(shouldShowReminder(null)).toBe(false)
    })

    it('should show different reminder type even if previous snoozed', () => {
      const expiryDate = new Date('2024-06-08') // 7 days - now in 7-day zone
      const snoozedAt = new Date('2024-05-30') // snoozed 30-day reminder
      expect(shouldShowReminder(expiryDate, { snoozedAt, reminderType: '30-day' })).toBe(true)
    })
  })

  describe('calculateSnoozeExpiry', () => {
    it('should calculate expiry 3 days from snooze time', () => {
      const snoozedAt = new Date('2024-06-01')
      const expiry = calculateSnoozeExpiry(snoozedAt)
      expect(expiry.getDate()).toBe(4) // June 4
    })

    it('should handle month boundaries', () => {
      const snoozedAt = new Date('2024-06-29')
      const expiry = calculateSnoozeExpiry(snoozedAt)
      expect(expiry.getMonth()).toBe(6) // July
      expect(expiry.getDate()).toBe(2)
    })
  })

  describe('isSnoozeExpired', () => {
    it('should return false when within snooze period', () => {
      const snoozedAt = new Date('2024-05-30') // 2 days ago
      expect(isSnoozeExpired(snoozedAt)).toBe(false)
    })

    it('should return true when snooze period passed', () => {
      const snoozedAt = new Date('2024-05-25') // 7 days ago
      expect(isSnoozeExpired(snoozedAt)).toBe(true)
    })

    it('should return true when exactly at expiry', () => {
      const snoozedAt = new Date('2024-05-29') // exactly 3 days ago
      expect(isSnoozeExpired(snoozedAt)).toBe(true)
    })
  })
})
