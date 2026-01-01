/**
 * Renewal Reminder Service Tests - Story 35.2
 *
 * Tests for managing renewal reminder states and calculations.
 * AC1: Reminder at 30 days
 * AC2: Reminder at 7 days
 * AC3: Reminder at 1 day
 * AC5: One-tap "Renew now" action
 * AC6: Snooze option
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  getActiveReminder,
  getReminderDisplayInfo,
  canSnoozeReminder,
  formatReminderMessage,
  getReminderUrgency,
  getSnoozeExpiryDisplay,
} from './renewalReminderService'

describe('Renewal Reminder Service - Story 35.2', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-06-01'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('getActiveReminder (AC1, AC2, AC3)', () => {
    it('should return 30-day reminder when 30+ days remain', () => {
      const expiryDate = new Date('2024-07-10')
      const reminder = getActiveReminder(expiryDate)

      expect(reminder).not.toBeNull()
      expect(reminder?.type).toBe('30-day')
      expect(reminder?.message).toContain('30 days')
    })

    it('should return 7-day reminder when 7-29 days remain', () => {
      const expiryDate = new Date('2024-06-15')
      const reminder = getActiveReminder(expiryDate)

      expect(reminder).not.toBeNull()
      expect(reminder?.type).toBe('7-day')
      expect(reminder?.message).toContain('week')
    })

    it('should return 1-day reminder when 1-6 days remain', () => {
      const expiryDate = new Date('2024-06-05')
      const reminder = getActiveReminder(expiryDate)

      expect(reminder).not.toBeNull()
      expect(reminder?.type).toBe('1-day')
      expect(reminder?.message).toContain('tomorrow')
    })

    it('should return null when expired', () => {
      const expiryDate = new Date('2024-05-01')
      const reminder = getActiveReminder(expiryDate)

      expect(reminder).toBeNull()
    })

    it('should return null for no-expiry agreements', () => {
      const reminder = getActiveReminder(null)

      expect(reminder).toBeNull()
    })

    it('should include days until expiry in reminder', () => {
      const expiryDate = new Date('2024-06-15') // 14 days
      const reminder = getActiveReminder(expiryDate)

      expect(reminder?.daysUntilExpiry).toBe(14)
    })
  })

  describe('getReminderDisplayInfo', () => {
    it('should return parent message by default', () => {
      const expiryDate = new Date('2024-07-01')
      const info = getReminderDisplayInfo(expiryDate)

      expect(info?.message).toBe('Agreement expires in 30 days')
    })

    it('should return child-friendly message when specified', () => {
      const expiryDate = new Date('2024-07-01')
      const info = getReminderDisplayInfo(expiryDate, 'child')

      expect(info?.message).toContain('month')
      expect(info?.message).toContain('renewing')
    })

    it('should include urgency level', () => {
      const info30 = getReminderDisplayInfo(new Date('2024-07-01'))
      const info7 = getReminderDisplayInfo(new Date('2024-06-10'))
      const info1 = getReminderDisplayInfo(new Date('2024-06-03'))

      expect(info30?.urgency).toBe('info')
      expect(info7?.urgency).toBe('warning')
      expect(info1?.urgency).toBe('critical')
    })
  })

  describe('canSnoozeReminder (AC6)', () => {
    it('should allow snooze for 30-day reminder', () => {
      expect(canSnoozeReminder('30-day')).toBe(true)
    })

    it('should allow snooze for 7-day reminder', () => {
      expect(canSnoozeReminder('7-day')).toBe(true)
    })

    it('should not allow snooze for 1-day reminder', () => {
      expect(canSnoozeReminder('1-day')).toBe(false)
    })
  })

  describe('formatReminderMessage', () => {
    it('should format 30-day message with days', () => {
      const message = formatReminderMessage('30-day', 35)
      expect(message).toContain('35')
    })

    it('should format 7-day message with days', () => {
      const message = formatReminderMessage('7-day', 14)
      expect(message).toContain('14')
    })

    it('should format 1-day message with singular day', () => {
      const message = formatReminderMessage('1-day', 1)
      expect(message.toLowerCase()).toContain('tomorrow')
    })

    it('should format 1-day message with plural days', () => {
      const message = formatReminderMessage('1-day', 5)
      expect(message).toContain('5')
    })
  })

  describe('getReminderUrgency', () => {
    it('should return info for 30-day', () => {
      expect(getReminderUrgency('30-day')).toBe('info')
    })

    it('should return warning for 7-day', () => {
      expect(getReminderUrgency('7-day')).toBe('warning')
    })

    it('should return critical for 1-day', () => {
      expect(getReminderUrgency('1-day')).toBe('critical')
    })
  })

  describe('getSnoozeExpiryDisplay (AC6)', () => {
    it('should format snooze expiry date', () => {
      const snoozedAt = new Date('2024-06-01')
      const display = getSnoozeExpiryDisplay(snoozedAt)

      expect(display).toContain('Jun')
      expect(display).toContain('4')
    })

    it('should show "in 3 days" format', () => {
      const snoozedAt = new Date('2024-06-01')
      const display = getSnoozeExpiryDisplay(snoozedAt)

      expect(display.toLowerCase()).toContain('3 days')
    })
  })
})
