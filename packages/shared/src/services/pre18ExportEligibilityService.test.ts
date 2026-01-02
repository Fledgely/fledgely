/**
 * Pre18 Export Eligibility Service Tests - Story 38.6 Task 5
 *
 * Tests for checking if export is available for child approaching 18.
 * AC1: Parent notified "Data will be deleted in 30 days"
 * AC2: Export option available
 */

import { describe, it, expect, beforeEach } from 'vitest'
import {
  isEligibleForPre18Export,
  getExportEligibilityWindow,
  getChildrenEligibleForExport,
  getDaysUntilDataDeletion,
  isInExportWindow,
  clearEligibilityTestData,
  setChildBirthdateForTest,
} from './pre18ExportEligibilityService'
import { PRE_DELETION_NOTICE_DAYS } from '../contracts/age18Deletion'

describe('Pre18ExportEligibilityService', () => {
  beforeEach(() => {
    clearEligibilityTestData()
  })

  // ============================================
  // Eligibility Tests (AC1, AC2)
  // ============================================

  describe('isEligibleForPre18Export (AC1, AC2)', () => {
    it('should return true for child within 30 days of turning 18', () => {
      // Child turns 18 in 20 days
      const eighteenthBirthday = new Date()
      eighteenthBirthday.setDate(eighteenthBirthday.getDate() + 20)
      const birthdate = new Date(eighteenthBirthday)
      birthdate.setFullYear(birthdate.getFullYear() - 18)

      setChildBirthdateForTest('child-123', birthdate)

      expect(isEligibleForPre18Export('child-123')).toBe(true)
    })

    it('should return false for child more than 30 days from 18', () => {
      // Child turns 18 in 60 days
      const eighteenthBirthday = new Date()
      eighteenthBirthday.setDate(eighteenthBirthday.getDate() + 60)
      const birthdate = new Date(eighteenthBirthday)
      birthdate.setFullYear(birthdate.getFullYear() - 18)

      setChildBirthdateForTest('child-123', birthdate)

      expect(isEligibleForPre18Export('child-123')).toBe(false)
    })

    it('should return false for child already 18', () => {
      // Child turned 18 yesterday
      const birthdate = new Date()
      birthdate.setFullYear(birthdate.getFullYear() - 18)
      birthdate.setDate(birthdate.getDate() - 1)

      setChildBirthdateForTest('child-123', birthdate)

      expect(isEligibleForPre18Export('child-123')).toBe(false)
    })

    it('should return false for child with no birthdate on file', () => {
      expect(isEligibleForPre18Export('child-no-birthdate')).toBe(false)
    })

    it('should return true at exactly 30 days before 18', () => {
      // Child turns 18 in exactly 30 days
      const eighteenthBirthday = new Date()
      eighteenthBirthday.setDate(eighteenthBirthday.getDate() + PRE_DELETION_NOTICE_DAYS)
      const birthdate = new Date(eighteenthBirthday)
      birthdate.setFullYear(birthdate.getFullYear() - 18)

      setChildBirthdateForTest('child-123', birthdate)

      expect(isEligibleForPre18Export('child-123')).toBe(true)
    })
  })

  // ============================================
  // Eligibility Window Tests
  // ============================================

  describe('getExportEligibilityWindow', () => {
    it('should return window for eligible child', () => {
      const eighteenthBirthday = new Date()
      eighteenthBirthday.setDate(eighteenthBirthday.getDate() + 20)
      const birthdate = new Date(eighteenthBirthday)
      birthdate.setFullYear(birthdate.getFullYear() - 18)

      setChildBirthdateForTest('child-123', birthdate)

      const window = getExportEligibilityWindow('child-123')

      expect(window).not.toBeNull()
      expect(window!.start).toBeInstanceOf(Date)
      expect(window!.end).toBeInstanceOf(Date)
    })

    it('should return null for ineligible child', () => {
      // Child is 15
      const birthdate = new Date()
      birthdate.setFullYear(birthdate.getFullYear() - 15)

      setChildBirthdateForTest('child-123', birthdate)

      const window = getExportEligibilityWindow('child-123')
      expect(window).toBeNull()
    })

    it('should return null for child with no birthdate', () => {
      const window = getExportEligibilityWindow('child-no-birthdate')
      expect(window).toBeNull()
    })

    it('should have end date on 18th birthday', () => {
      const eighteenthBirthday = new Date()
      eighteenthBirthday.setDate(eighteenthBirthday.getDate() + 20)
      const birthdate = new Date(eighteenthBirthday)
      birthdate.setFullYear(birthdate.getFullYear() - 18)

      setChildBirthdateForTest('child-123', birthdate)

      const window = getExportEligibilityWindow('child-123')

      // End should be approximately the 18th birthday
      expect(Math.abs(window!.end.getTime() - eighteenthBirthday.getTime())).toBeLessThan(
        24 * 60 * 60 * 1000
      )
    })

    it('should have start date 30 days before 18th birthday', () => {
      const eighteenthBirthday = new Date()
      eighteenthBirthday.setDate(eighteenthBirthday.getDate() + 20)
      const birthdate = new Date(eighteenthBirthday)
      birthdate.setFullYear(birthdate.getFullYear() - 18)

      setChildBirthdateForTest('child-123', birthdate)

      const window = getExportEligibilityWindow('child-123')

      const expectedStart = new Date(eighteenthBirthday)
      expectedStart.setDate(expectedStart.getDate() - PRE_DELETION_NOTICE_DAYS)

      expect(Math.abs(window!.start.getTime() - expectedStart.getTime())).toBeLessThan(
        24 * 60 * 60 * 1000
      )
    })
  })

  // ============================================
  // Batch Eligibility Tests
  // ============================================

  describe('getChildrenEligibleForExport', () => {
    it('should return array of eligible children', () => {
      // Set up multiple children with different ages
      const almostEighteen = new Date()
      almostEighteen.setDate(almostEighteen.getDate() + 20)
      const birthdate1 = new Date(almostEighteen)
      birthdate1.setFullYear(birthdate1.getFullYear() - 18)

      setChildBirthdateForTest('child-1', birthdate1)

      // Child who is 15
      const birthdate2 = new Date()
      birthdate2.setFullYear(birthdate2.getFullYear() - 15)
      setChildBirthdateForTest('child-2', birthdate2)

      const eligible = getChildrenEligibleForExport()

      expect(eligible).toHaveLength(1)
      expect(eligible[0].childId).toBe('child-1')
    })

    it('should return empty array if no children eligible', () => {
      // Set up children not approaching 18
      const birthdate = new Date()
      birthdate.setFullYear(birthdate.getFullYear() - 10)
      setChildBirthdateForTest('child-1', birthdate)

      const eligible = getChildrenEligibleForExport()
      expect(eligible).toHaveLength(0)
    })

    it('should include days until 18 for each eligible child', () => {
      const almostEighteen = new Date()
      almostEighteen.setDate(almostEighteen.getDate() + 20)
      const birthdate = new Date(almostEighteen)
      birthdate.setFullYear(birthdate.getFullYear() - 18)

      setChildBirthdateForTest('child-1', birthdate)

      const eligible = getChildrenEligibleForExport()

      expect(eligible[0].daysUntil18).toBeDefined()
      expect(eligible[0].daysUntil18).toBeCloseTo(20, 0)
    })
  })

  // ============================================
  // Days Until Deletion Tests
  // ============================================

  describe('getDaysUntilDataDeletion', () => {
    it('should return positive days for child approaching 18', () => {
      const eighteenthBirthday = new Date()
      eighteenthBirthday.setDate(eighteenthBirthday.getDate() + 25)
      const birthdate = new Date(eighteenthBirthday)
      birthdate.setFullYear(birthdate.getFullYear() - 18)

      setChildBirthdateForTest('child-123', birthdate)

      const days = getDaysUntilDataDeletion('child-123')
      expect(days).toBeCloseTo(25, 0)
    })

    it('should return 0 for child turning 18 today', () => {
      const birthdate = new Date()
      birthdate.setFullYear(birthdate.getFullYear() - 18)

      setChildBirthdateForTest('child-123', birthdate)

      const days = getDaysUntilDataDeletion('child-123')
      expect(days).toBe(0)
    })

    it('should return 0 for child already 18', () => {
      const birthdate = new Date()
      birthdate.setFullYear(birthdate.getFullYear() - 19)

      setChildBirthdateForTest('child-123', birthdate)

      const days = getDaysUntilDataDeletion('child-123')
      expect(days).toBe(0) // birthdateService returns 0 when already 18+
    })

    it('should return large positive for young child', () => {
      const birthdate = new Date()
      birthdate.setFullYear(birthdate.getFullYear() - 10)

      setChildBirthdateForTest('child-123', birthdate)

      const days = getDaysUntilDataDeletion('child-123')
      expect(days).toBeGreaterThan(365 * 7) // > 7 years
    })
  })

  // ============================================
  // Export Window Check Tests
  // ============================================

  describe('isInExportWindow', () => {
    it('should return true for child in export window', () => {
      const almostEighteen = new Date()
      almostEighteen.setDate(almostEighteen.getDate() + 15)
      const birthdate = new Date(almostEighteen)
      birthdate.setFullYear(birthdate.getFullYear() - 18)

      setChildBirthdateForTest('child-123', birthdate)

      expect(isInExportWindow('child-123')).toBe(true)
    })

    it('should return false for child not in export window', () => {
      const birthdate = new Date()
      birthdate.setFullYear(birthdate.getFullYear() - 15)

      setChildBirthdateForTest('child-123', birthdate)

      expect(isInExportWindow('child-123')).toBe(false)
    })

    it('should return false for child already 18', () => {
      const birthdate = new Date()
      birthdate.setFullYear(birthdate.getFullYear() - 19)

      setChildBirthdateForTest('child-123', birthdate)

      expect(isInExportWindow('child-123')).toBe(false)
    })
  })

  // ============================================
  // Edge Cases
  // ============================================

  describe('Edge Cases', () => {
    it('should handle child turning 18 tomorrow', () => {
      const birthdate = new Date()
      birthdate.setFullYear(birthdate.getFullYear() - 18)
      birthdate.setDate(birthdate.getDate() + 1)

      setChildBirthdateForTest('child-123', birthdate)

      expect(isEligibleForPre18Export('child-123')).toBe(true)
      expect(getDaysUntilDataDeletion('child-123')).toBe(1)
    })

    it('should handle leap year birthday', () => {
      // Set birthday to Feb 29 in a leap year
      const leapYearBirthdate = new Date('2008-02-29')

      setChildBirthdateForTest('child-123', leapYearBirthdate)

      // Should still calculate correctly
      const days = getDaysUntilDataDeletion('child-123')
      expect(typeof days).toBe('number')
    })
  })
})
