/**
 * Age 16 Transition Service Tests - Story 52.1 Task 2
 *
 * Tests for age 16 detection and transition eligibility.
 */

import { describe, it, expect } from 'vitest'
import {
  is16OrOlder,
  get16thBirthdayDate,
  getDaysUntil16,
  isWithin30DaysOf16,
  isExactly16Today,
  getTransitionEligibility,
  shouldSendPreTransitionNotification,
  shouldSendTransitionAvailableNotification,
} from './age16TransitionService'

describe('age16TransitionService', () => {
  describe('is16OrOlder', () => {
    it('returns true for child who is exactly 16', () => {
      const referenceDate = new Date('2024-06-15')
      const birthdate = new Date('2008-06-15') // Exactly 16 years ago

      expect(is16OrOlder(birthdate, referenceDate)).toBe(true)
    })

    it('returns true for child who is over 16', () => {
      const referenceDate = new Date('2024-06-15')
      const birthdate = new Date('2007-01-01') // 17+ years old

      expect(is16OrOlder(birthdate, referenceDate)).toBe(true)
    })

    it('returns false for child who is under 16', () => {
      const referenceDate = new Date('2024-06-15')
      const birthdate = new Date('2009-01-01') // Under 16

      expect(is16OrOlder(birthdate, referenceDate)).toBe(false)
    })

    it('returns false day before 16th birthday', () => {
      const referenceDate = new Date('2024-06-14')
      const birthdate = new Date('2008-06-15') // Turns 16 tomorrow

      expect(is16OrOlder(birthdate, referenceDate)).toBe(false)
    })

    it('handles leap year birthday (Feb 29)', () => {
      const referenceDate = new Date('2024-02-29') // Leap year
      const birthdate = new Date('2008-02-29') // Born on leap day

      expect(is16OrOlder(birthdate, referenceDate)).toBe(true)
    })
  })

  describe('get16thBirthdayDate', () => {
    it('returns correct 16th birthday date', () => {
      const birthdate = new Date('2008-06-15')
      const sixteenthBirthday = get16thBirthdayDate(birthdate)

      expect(sixteenthBirthday.getFullYear()).toBe(2024)
      expect(sixteenthBirthday.getMonth()).toBe(5) // June (0-indexed)
      expect(sixteenthBirthday.getDate()).toBe(15)
    })

    it('handles leap year birthday', () => {
      const birthdate = new Date('2008-02-29')
      const sixteenthBirthday = get16thBirthdayDate(birthdate)

      expect(sixteenthBirthday.getFullYear()).toBe(2024)
      expect(sixteenthBirthday.getMonth()).toBe(1) // February
      expect(sixteenthBirthday.getDate()).toBe(29) // Leap year 2024
    })
  })

  describe('getDaysUntil16', () => {
    it('returns 0 if already 16 or older', () => {
      const referenceDate = new Date('2024-06-15')
      const birthdate = new Date('2008-06-15') // Exactly 16

      expect(getDaysUntil16(birthdate, referenceDate)).toBe(0)
    })

    it('returns correct days until 16th birthday', () => {
      const referenceDate = new Date('2024-06-01')
      const birthdate = new Date('2008-06-15') // 14 days until 16

      expect(getDaysUntil16(birthdate, referenceDate)).toBe(14)
    })

    it('returns 1 day before 16th birthday', () => {
      const referenceDate = new Date('2024-06-14')
      const birthdate = new Date('2008-06-15') // 1 day until 16

      expect(getDaysUntil16(birthdate, referenceDate)).toBe(1)
    })

    it('returns 30 exactly at 30 days before', () => {
      const referenceDate = new Date('2024-05-16')
      const birthdate = new Date('2008-06-15') // 30 days until 16

      expect(getDaysUntil16(birthdate, referenceDate)).toBe(30)
    })
  })

  describe('isWithin30DaysOf16', () => {
    it('returns true at exactly 30 days before', () => {
      const referenceDate = new Date('2024-05-16')
      const birthdate = new Date('2008-06-15') // 30 days until 16

      expect(isWithin30DaysOf16(birthdate, referenceDate)).toBe(true)
    })

    it('returns true at 15 days before', () => {
      const referenceDate = new Date('2024-05-31')
      const birthdate = new Date('2008-06-15') // 15 days until 16

      expect(isWithin30DaysOf16(birthdate, referenceDate)).toBe(true)
    })

    it('returns true at 1 day before', () => {
      const referenceDate = new Date('2024-06-14')
      const birthdate = new Date('2008-06-15') // 1 day until 16

      expect(isWithin30DaysOf16(birthdate, referenceDate)).toBe(true)
    })

    it('returns false at 31 days before', () => {
      const referenceDate = new Date('2024-05-15')
      const birthdate = new Date('2008-06-15') // 31 days until 16

      expect(isWithin30DaysOf16(birthdate, referenceDate)).toBe(false)
    })

    it('returns false if already 16', () => {
      const referenceDate = new Date('2024-06-15')
      const birthdate = new Date('2008-06-15') // Exactly 16

      expect(isWithin30DaysOf16(birthdate, referenceDate)).toBe(false)
    })

    it('returns false if over 16', () => {
      const referenceDate = new Date('2024-06-15')
      const birthdate = new Date('2007-01-01') // Over 17

      expect(isWithin30DaysOf16(birthdate, referenceDate)).toBe(false)
    })
  })

  describe('isExactly16Today', () => {
    it('returns true on 16th birthday', () => {
      const referenceDate = new Date('2024-06-15')
      const birthdate = new Date('2008-06-15')

      expect(isExactly16Today(birthdate, referenceDate)).toBe(true)
    })

    it('returns false day before 16th birthday', () => {
      const referenceDate = new Date('2024-06-14')
      const birthdate = new Date('2008-06-15')

      expect(isExactly16Today(birthdate, referenceDate)).toBe(false)
    })

    it('returns false day after 16th birthday', () => {
      const referenceDate = new Date('2024-06-16')
      const birthdate = new Date('2008-06-15')

      expect(isExactly16Today(birthdate, referenceDate)).toBe(false)
    })

    it('handles leap year birthday on leap year', () => {
      const referenceDate = new Date('2024-02-29')
      const birthdate = new Date('2008-02-29')

      expect(isExactly16Today(birthdate, referenceDate)).toBe(true)
    })
  })

  describe('getTransitionEligibility', () => {
    it('returns eligible status for 16+ child', () => {
      const referenceDate = new Date('2024-06-15')
      const birthdate = new Date('2008-06-15')

      const eligibility = getTransitionEligibility(
        'child-1',
        birthdate,
        false,
        false,
        referenceDate
      )

      expect(eligibility.isEligible).toBe(true)
      expect(eligibility.isApproaching).toBe(false)
      expect(eligibility.daysUntil16).toBeNull()
      expect(eligibility.currentAge).toBe(16)
    })

    it('returns approaching status for child within 30 days', () => {
      const referenceDate = new Date('2024-05-20')
      const birthdate = new Date('2008-06-15') // 26 days until 16

      const eligibility = getTransitionEligibility(
        'child-1',
        birthdate,
        false,
        false,
        referenceDate
      )

      expect(eligibility.isEligible).toBe(false)
      expect(eligibility.isApproaching).toBe(true)
      expect(eligibility.daysUntil16).toBe(26)
      expect(eligibility.currentAge).toBe(15)
    })

    it('returns not approaching for child more than 30 days away', () => {
      const referenceDate = new Date('2024-01-01')
      const birthdate = new Date('2008-06-15') // 166 days until 16

      const eligibility = getTransitionEligibility(
        'child-1',
        birthdate,
        false,
        false,
        referenceDate
      )

      expect(eligibility.isEligible).toBe(false)
      expect(eligibility.isApproaching).toBe(false)
      expect(eligibility.daysUntil16).toBeGreaterThan(30)
    })

    it('preserves notification sent flags', () => {
      const referenceDate = new Date('2024-06-15')
      const birthdate = new Date('2008-06-15')

      const eligibility = getTransitionEligibility('child-1', birthdate, true, true, referenceDate)

      expect(eligibility.preTransitionSent).toBe(true)
      expect(eligibility.transitionAvailableSent).toBe(true)
    })
  })

  describe('shouldSendPreTransitionNotification', () => {
    it('returns true when within 30 days and not sent', () => {
      const referenceDate = new Date('2024-05-20')
      const birthdate = new Date('2008-06-15')

      expect(shouldSendPreTransitionNotification(birthdate, false, referenceDate)).toBe(true)
    })

    it('returns false when already sent', () => {
      const referenceDate = new Date('2024-05-20')
      const birthdate = new Date('2008-06-15')

      expect(shouldSendPreTransitionNotification(birthdate, true, referenceDate)).toBe(false)
    })

    it('returns false when more than 30 days away', () => {
      const referenceDate = new Date('2024-01-01')
      const birthdate = new Date('2008-06-15')

      expect(shouldSendPreTransitionNotification(birthdate, false, referenceDate)).toBe(false)
    })

    it('returns false when already 16', () => {
      const referenceDate = new Date('2024-06-15')
      const birthdate = new Date('2008-06-15')

      expect(shouldSendPreTransitionNotification(birthdate, false, referenceDate)).toBe(false)
    })
  })

  describe('shouldSendTransitionAvailableNotification', () => {
    it('returns true on 16th birthday and not sent', () => {
      const referenceDate = new Date('2024-06-15')
      const birthdate = new Date('2008-06-15')

      expect(shouldSendTransitionAvailableNotification(birthdate, false, referenceDate)).toBe(true)
    })

    it('returns false when already sent', () => {
      const referenceDate = new Date('2024-06-15')
      const birthdate = new Date('2008-06-15')

      expect(shouldSendTransitionAvailableNotification(birthdate, true, referenceDate)).toBe(false)
    })

    it('returns false before 16th birthday', () => {
      const referenceDate = new Date('2024-06-14')
      const birthdate = new Date('2008-06-15')

      expect(shouldSendTransitionAvailableNotification(birthdate, false, referenceDate)).toBe(false)
    })

    it('returns false after 16th birthday', () => {
      const referenceDate = new Date('2024-06-16')
      const birthdate = new Date('2008-06-15')

      expect(shouldSendTransitionAvailableNotification(birthdate, false, referenceDate)).toBe(false)
    })
  })
})
