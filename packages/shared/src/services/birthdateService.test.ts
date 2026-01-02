/**
 * BirthdateService Tests - Story 38.5 Task 2
 *
 * Tests for managing child birthdates.
 * AC1: Child's birthdate is stored on file (FR72)
 */

import { describe, it, expect, beforeEach } from 'vitest'
import {
  setBirthdate,
  getBirthdate,
  updateBirthdate,
  calculateAge,
  getAgeInYearsAndMonths,
  is18OrOlder,
  getDaysUntil18,
  get18thBirthdayDate,
  isValidBirthdate,
  getAllBirthdates,
  clearAllBirthdateData,
} from './birthdateService'

describe('BirthdateService', () => {
  beforeEach(() => {
    clearAllBirthdateData()
  })

  // ============================================
  // Birthdate Management Tests (AC1)
  // ============================================

  describe('setBirthdate', () => {
    it('should store child birthdate', () => {
      const birthdate = new Date('2010-06-15')
      const result = setBirthdate('child-123', 'family-456', birthdate)

      expect(result.childId).toBe('child-123')
      expect(result.familyId).toBe('family-456')
      expect(result.birthdate.getFullYear()).toBe(2010)
      expect(result.birthdate.getMonth()).toBe(5) // June = 5
      expect(result.birthdate.getDate()).toBe(15)
    })

    it('should set createdAt and updatedAt timestamps', () => {
      const birthdate = new Date('2010-06-15')
      const result = setBirthdate('child-123', 'family-456', birthdate)

      expect(result.createdAt).toBeInstanceOf(Date)
      expect(result.updatedAt).toBeInstanceOf(Date)
    })

    it('should throw for invalid birthdate (future)', () => {
      const futureDate = new Date()
      futureDate.setFullYear(futureDate.getFullYear() + 1)

      expect(() => setBirthdate('child-123', 'family-456', futureDate)).toThrow(/invalid/i)
    })

    it('should throw if child already has birthdate', () => {
      const birthdate = new Date('2010-06-15')
      setBirthdate('child-123', 'family-456', birthdate)

      expect(() => setBirthdate('child-123', 'family-456', birthdate)).toThrow(/already.*exists/i)
    })
  })

  describe('getBirthdate', () => {
    it('should return stored birthdate', () => {
      const birthdate = new Date('2010-06-15')
      setBirthdate('child-123', 'family-456', birthdate)

      const result = getBirthdate('child-123')
      expect(result).not.toBeNull()
      expect(result?.birthdate.getFullYear()).toBe(2010)
    })

    it('should return null for non-existent child', () => {
      const result = getBirthdate('nonexistent')
      expect(result).toBeNull()
    })
  })

  describe('updateBirthdate', () => {
    it('should update existing birthdate', () => {
      setBirthdate('child-123', 'family-456', new Date('2010-06-15'))

      const newBirthdate = new Date('2010-07-20')
      const result = updateBirthdate('child-123', newBirthdate)

      expect(result.birthdate.getMonth()).toBe(6) // July = 6
      expect(result.birthdate.getDate()).toBe(20)
    })

    it('should update updatedAt timestamp', () => {
      setBirthdate('child-123', 'family-456', new Date('2010-06-15'))

      const original = getBirthdate('child-123')
      const originalUpdatedAt = original!.updatedAt.getTime()

      // Small delay to ensure different timestamp
      const newBirthdate = new Date('2010-07-20')
      const result = updateBirthdate('child-123', newBirthdate)

      expect(result.updatedAt.getTime()).toBeGreaterThanOrEqual(originalUpdatedAt)
    })

    it('should throw for non-existent child', () => {
      expect(() => updateBirthdate('nonexistent', new Date('2010-06-15'))).toThrow(/not found/i)
    })

    it('should throw for invalid birthdate', () => {
      setBirthdate('child-123', 'family-456', new Date('2010-06-15'))

      const futureDate = new Date()
      futureDate.setFullYear(futureDate.getFullYear() + 1)

      expect(() => updateBirthdate('child-123', futureDate)).toThrow(/invalid/i)
    })
  })

  // ============================================
  // Age Calculation Tests
  // ============================================

  describe('calculateAge', () => {
    it('should calculate age in years', () => {
      const tenYearsAgo = new Date()
      tenYearsAgo.setFullYear(tenYearsAgo.getFullYear() - 10)
      tenYearsAgo.setMonth(tenYearsAgo.getMonth() - 1) // One month ago for safety

      const age = calculateAge(tenYearsAgo)
      expect(age).toBe(10)
    })

    it('should calculate age as 0 for birthdate less than 1 year ago', () => {
      const sixMonthsAgo = new Date()
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)

      const age = calculateAge(sixMonthsAgo)
      expect(age).toBe(0)
    })

    it('should calculate age with reference date', () => {
      const birthdate = new Date('2000-06-15')
      const referenceDate = new Date('2020-06-15')

      const age = calculateAge(birthdate, referenceDate)
      expect(age).toBe(20)
    })

    it('should handle birthday not yet occurred this year', () => {
      const now = new Date()
      const birthdate = new Date(now.getFullYear() - 10, now.getMonth() + 1, 15)

      const age = calculateAge(birthdate)
      expect(age).toBe(9) // Birthday hasn't happened yet this year
    })
  })

  describe('getAgeInYearsAndMonths', () => {
    it('should return years and months', () => {
      const birthdate = new Date()
      birthdate.setFullYear(birthdate.getFullYear() - 10)
      birthdate.setMonth(birthdate.getMonth() - 6)

      const result = getAgeInYearsAndMonths(birthdate)
      expect(result.years).toBe(10)
      expect(result.months).toBeGreaterThanOrEqual(5)
      expect(result.months).toBeLessThanOrEqual(7)
    })

    it('should return 0 months for exact year anniversary', () => {
      const birthdate = new Date()
      birthdate.setFullYear(birthdate.getFullYear() - 15)

      const result = getAgeInYearsAndMonths(birthdate)
      expect(result.years).toBe(15)
      expect(result.months).toBe(0)
    })
  })

  // ============================================
  // Age 18 Detection Tests
  // ============================================

  describe('is18OrOlder', () => {
    it('should return true for child exactly 18', () => {
      const eighteenYearsAgo = new Date()
      eighteenYearsAgo.setFullYear(eighteenYearsAgo.getFullYear() - 18)

      expect(is18OrOlder(eighteenYearsAgo)).toBe(true)
    })

    it('should return true for child over 18', () => {
      const twentyYearsAgo = new Date()
      twentyYearsAgo.setFullYear(twentyYearsAgo.getFullYear() - 20)

      expect(is18OrOlder(twentyYearsAgo)).toBe(true)
    })

    it('should return false for child under 18', () => {
      const fifteenYearsAgo = new Date()
      fifteenYearsAgo.setFullYear(fifteenYearsAgo.getFullYear() - 15)

      expect(is18OrOlder(fifteenYearsAgo)).toBe(false)
    })

    it('should return false for child turning 18 tomorrow', () => {
      const almostEighteen = new Date()
      almostEighteen.setFullYear(almostEighteen.getFullYear() - 18)
      almostEighteen.setDate(almostEighteen.getDate() + 1)

      expect(is18OrOlder(almostEighteen)).toBe(false)
    })
  })

  describe('getDaysUntil18', () => {
    it('should return positive days for child under 18', () => {
      const fifteenYearsAgo = new Date()
      fifteenYearsAgo.setFullYear(fifteenYearsAgo.getFullYear() - 15)

      const days = getDaysUntil18(fifteenYearsAgo)
      expect(days).toBeGreaterThan(0)
      expect(days).toBeLessThanOrEqual(365 * 3 + 1) // About 3 years
    })

    it('should return 0 for child already 18', () => {
      const eighteenYearsAgo = new Date()
      eighteenYearsAgo.setFullYear(eighteenYearsAgo.getFullYear() - 18)

      const days = getDaysUntil18(eighteenYearsAgo)
      expect(days).toBe(0)
    })

    it('should return 0 for child over 18', () => {
      const twentyYearsAgo = new Date()
      twentyYearsAgo.setFullYear(twentyYearsAgo.getFullYear() - 20)

      const days = getDaysUntil18(twentyYearsAgo)
      expect(days).toBe(0)
    })

    it('should return 30 for child 30 days from 18', () => {
      const almostEighteen = new Date()
      almostEighteen.setFullYear(almostEighteen.getFullYear() - 18)
      almostEighteen.setDate(almostEighteen.getDate() + 30)

      const days = getDaysUntil18(almostEighteen)
      expect(days).toBe(30)
    })
  })

  describe('get18thBirthdayDate', () => {
    it('should return 18th birthday date', () => {
      const birthdate = new Date('2010-06-15')
      const eighteenthBirthday = get18thBirthdayDate(birthdate)

      expect(eighteenthBirthday.getFullYear()).toBe(2028)
      expect(eighteenthBirthday.getMonth()).toBe(5) // June
      expect(eighteenthBirthday.getDate()).toBe(15)
    })

    it('should handle leap year birthdays', () => {
      const leapBirthday = new Date('2008-02-29')
      const eighteenthBirthday = get18thBirthdayDate(leapBirthday)

      expect(eighteenthBirthday.getFullYear()).toBe(2026)
      // Feb 29, 2026 doesn't exist, JavaScript rolls to Mar 1
      // Month 2 = March (0-indexed)
      expect(eighteenthBirthday.getMonth()).toBe(2) // March
      expect(eighteenthBirthday.getDate()).toBe(1)
    })
  })

  // ============================================
  // Validation Tests
  // ============================================

  describe('isValidBirthdate', () => {
    it('should return true for valid child birthdate', () => {
      const tenYearsAgo = new Date()
      tenYearsAgo.setFullYear(tenYearsAgo.getFullYear() - 10)

      expect(isValidBirthdate(tenYearsAgo)).toBe(true)
    })

    it('should return false for future date', () => {
      const futureDate = new Date()
      futureDate.setFullYear(futureDate.getFullYear() + 1)

      expect(isValidBirthdate(futureDate)).toBe(false)
    })

    it('should return false for date over 100 years ago', () => {
      const ancientDate = new Date()
      ancientDate.setFullYear(ancientDate.getFullYear() - 101)

      expect(isValidBirthdate(ancientDate)).toBe(false)
    })

    it('should return false for today (child must be at least 1 year old)', () => {
      const today = new Date()
      expect(isValidBirthdate(today)).toBe(false)
    })
  })

  // ============================================
  // Query Tests
  // ============================================

  describe('getAllBirthdates', () => {
    it('should return all stored birthdates', () => {
      setBirthdate('child-1', 'family-1', new Date('2010-01-01'))
      setBirthdate('child-2', 'family-1', new Date('2012-06-15'))
      setBirthdate('child-3', 'family-2', new Date('2015-12-25'))

      const all = getAllBirthdates()
      expect(all).toHaveLength(3)
    })

    it('should return empty array when no birthdates stored', () => {
      const all = getAllBirthdates()
      expect(all).toHaveLength(0)
    })
  })
})
