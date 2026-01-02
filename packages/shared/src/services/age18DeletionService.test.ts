/**
 * Age18DeletionService Tests - Story 38.5 Task 3
 *
 * Tests for automatic deletion when child turns 18.
 * AC2: When child turns 18, all monitoring data is automatically deleted (INV-005)
 * AC3: Deletion is complete and irreversible
 * AC4: Deletion includes: screenshots, flags, activity logs, trust history
 * AC5: Deletion occurs regardless of parent wishes
 * AC7: Scheduled function executes daily to check birthdates
 */

import { describe, it, expect, beforeEach } from 'vitest'
import {
  getChildrenTurning18Today,
  getChildrenTurning18InDays,
  executeAge18Deletion,
  deleteAllChildData,
  getDeletionRecord,
  getAge18DeletionHistory,
  clearAllAge18DeletionData,
  getChildrenWithBirthdateToday,
} from './age18DeletionService'
import { setBirthdate, clearAllBirthdateData } from './birthdateService'
import { ALL_DELETION_DATA_TYPES } from '../contracts/age18Deletion'

describe('Age18DeletionService', () => {
  beforeEach(() => {
    clearAllBirthdateData()
    clearAllAge18DeletionData()
  })

  // ============================================
  // Find Children Turning 18 Tests (AC7)
  // ============================================

  describe('getChildrenTurning18Today', () => {
    it('should find children turning 18 today', () => {
      // Set up a child who turns 18 today
      const eighteenYearsAgo = new Date()
      eighteenYearsAgo.setFullYear(eighteenYearsAgo.getFullYear() - 18)

      setBirthdate('child-turning-18', 'family-123', eighteenYearsAgo)

      // Set up a child who is not 18 yet
      const fifteenYearsAgo = new Date()
      fifteenYearsAgo.setFullYear(fifteenYearsAgo.getFullYear() - 15)
      setBirthdate('child-15', 'family-123', fifteenYearsAgo)

      const turning18 = getChildrenTurning18Today()
      expect(turning18).toHaveLength(1)
      expect(turning18[0].childId).toBe('child-turning-18')
    })

    it('should return empty array when no children turning 18', () => {
      const tenYearsAgo = new Date()
      tenYearsAgo.setFullYear(tenYearsAgo.getFullYear() - 10)
      setBirthdate('child-10', 'family-123', tenYearsAgo)

      const turning18 = getChildrenTurning18Today()
      expect(turning18).toHaveLength(0)
    })

    it('should not include children already over 18', () => {
      const twentyYearsAgo = new Date()
      twentyYearsAgo.setFullYear(twentyYearsAgo.getFullYear() - 20)
      setBirthdate('child-20', 'family-123', twentyYearsAgo)

      const turning18 = getChildrenTurning18Today()
      expect(turning18).toHaveLength(0)
    })
  })

  describe('getChildrenTurning18InDays', () => {
    it('should find children turning 18 in 30 days', () => {
      // Set up a child who turns 18 in 30 days
      const almostEighteen = new Date()
      almostEighteen.setFullYear(almostEighteen.getFullYear() - 18)
      almostEighteen.setDate(almostEighteen.getDate() + 30)

      setBirthdate('child-almost-18', 'family-123', almostEighteen)

      const turning18In30Days = getChildrenTurning18InDays(30)
      expect(turning18In30Days).toHaveLength(1)
      expect(turning18In30Days[0].childId).toBe('child-almost-18')
    })

    it('should return empty for children too young', () => {
      const tenYearsAgo = new Date()
      tenYearsAgo.setFullYear(tenYearsAgo.getFullYear() - 10)
      setBirthdate('child-10', 'family-123', tenYearsAgo)

      const turning18In30Days = getChildrenTurning18InDays(30)
      expect(turning18In30Days).toHaveLength(0)
    })
  })

  describe('getChildrenWithBirthdateToday', () => {
    it('should find children with birthday today regardless of age', () => {
      // Child with today's date but 10 years ago
      const tenYearsAgo = new Date()
      tenYearsAgo.setFullYear(tenYearsAgo.getFullYear() - 10)
      setBirthdate('child-birthday-today', 'family-123', tenYearsAgo)

      // Child with different date
      const differentDate = new Date()
      differentDate.setFullYear(differentDate.getFullYear() - 12)
      differentDate.setDate(differentDate.getDate() + 5)
      setBirthdate('child-different-day', 'family-123', differentDate)

      const birthdayToday = getChildrenWithBirthdateToday()
      expect(birthdayToday).toHaveLength(1)
      expect(birthdayToday[0].childId).toBe('child-birthday-today')
    })
  })

  // ============================================
  // Execute Deletion Tests (AC2, AC3, AC4)
  // ============================================

  describe('executeAge18Deletion', () => {
    it('should create deletion record with pending status', () => {
      const eighteenYearsAgo = new Date()
      eighteenYearsAgo.setFullYear(eighteenYearsAgo.getFullYear() - 18)
      setBirthdate('child-18', 'family-123', eighteenYearsAgo)

      const record = executeAge18Deletion('child-18', 'family-123')

      expect(record.id).toBeDefined()
      expect(record.childId).toBe('child-18')
      expect(record.familyId).toBe('family-123')
      expect(record.status).toBe('pending')
    })

    it('should include all data types for deletion (AC4)', () => {
      const eighteenYearsAgo = new Date()
      eighteenYearsAgo.setFullYear(eighteenYearsAgo.getFullYear() - 18)
      setBirthdate('child-18', 'family-123', eighteenYearsAgo)

      const record = executeAge18Deletion('child-18', 'family-123')

      for (const dataType of ALL_DELETION_DATA_TYPES) {
        expect(record.dataTypesDeleted).toContain(dataType)
      }
    })

    it('should set deletionTriggeredAt timestamp', () => {
      const eighteenYearsAgo = new Date()
      eighteenYearsAgo.setFullYear(eighteenYearsAgo.getFullYear() - 18)
      setBirthdate('child-18', 'family-123', eighteenYearsAgo)

      const before = new Date()
      const record = executeAge18Deletion('child-18', 'family-123')
      const after = new Date()

      expect(record.deletionTriggeredAt.getTime()).toBeGreaterThanOrEqual(before.getTime())
      expect(record.deletionTriggeredAt.getTime()).toBeLessThanOrEqual(after.getTime())
    })

    it('should throw for child not yet 18', () => {
      const fifteenYearsAgo = new Date()
      fifteenYearsAgo.setFullYear(fifteenYearsAgo.getFullYear() - 15)
      setBirthdate('child-15', 'family-123', fifteenYearsAgo)

      expect(() => executeAge18Deletion('child-15', 'family-123')).toThrow(/not.*18/i)
    })

    it('should throw for child without birthdate', () => {
      expect(() => executeAge18Deletion('child-no-birthdate', 'family-123')).toThrow(
        /birthdate.*not found/i
      )
    })
  })

  describe('deleteAllChildData', () => {
    it('should return all data types deleted', () => {
      const eighteenYearsAgo = new Date()
      eighteenYearsAgo.setFullYear(eighteenYearsAgo.getFullYear() - 18)
      setBirthdate('child-18', 'family-123', eighteenYearsAgo)

      const result = deleteAllChildData('child-18')

      for (const dataType of ALL_DELETION_DATA_TYPES) {
        expect(result.dataTypesDeleted).toContain(dataType)
      }
    })

    it('should return records deleted count', () => {
      const eighteenYearsAgo = new Date()
      eighteenYearsAgo.setFullYear(eighteenYearsAgo.getFullYear() - 18)
      setBirthdate('child-18', 'family-123', eighteenYearsAgo)

      const result = deleteAllChildData('child-18')

      expect(typeof result.recordsDeleted).toBe('number')
      expect(result.recordsDeleted).toBeGreaterThanOrEqual(0)
    })
  })

  // ============================================
  // Deletion Record Query Tests
  // ============================================

  describe('getDeletionRecord', () => {
    it('should return deletion record for child', () => {
      const eighteenYearsAgo = new Date()
      eighteenYearsAgo.setFullYear(eighteenYearsAgo.getFullYear() - 18)
      setBirthdate('child-18', 'family-123', eighteenYearsAgo)

      executeAge18Deletion('child-18', 'family-123')

      const record = getDeletionRecord('child-18')
      expect(record).not.toBeNull()
      expect(record?.childId).toBe('child-18')
    })

    it('should return null for child without deletion record', () => {
      const record = getDeletionRecord('nonexistent')
      expect(record).toBeNull()
    })
  })

  describe('getAge18DeletionHistory', () => {
    it('should return all deletion records', () => {
      const eighteenYearsAgo = new Date()
      eighteenYearsAgo.setFullYear(eighteenYearsAgo.getFullYear() - 18)

      setBirthdate('child-1', 'family-1', eighteenYearsAgo)
      setBirthdate('child-2', 'family-2', eighteenYearsAgo)

      executeAge18Deletion('child-1', 'family-1')
      executeAge18Deletion('child-2', 'family-2')

      const history = getAge18DeletionHistory()
      expect(history).toHaveLength(2)
    })

    it('should return empty array when no deletions', () => {
      const history = getAge18DeletionHistory()
      expect(history).toHaveLength(0)
    })
  })

  // ============================================
  // Parent Wishes Tests (AC5)
  // ============================================

  describe('Deletion regardless of parent wishes (AC5)', () => {
    it('should execute deletion without requiring parent consent', () => {
      const eighteenYearsAgo = new Date()
      eighteenYearsAgo.setFullYear(eighteenYearsAgo.getFullYear() - 18)
      setBirthdate('child-18', 'family-123', eighteenYearsAgo)

      // No parent consent mechanism required - deletion just happens
      const record = executeAge18Deletion('child-18', 'family-123')

      expect(record.status).toBe('pending')
      expect(record.dataTypesDeleted.length).toBeGreaterThan(0)
    })

    it('should not have any parent override mechanism', () => {
      // This test documents that there is no way for parents to prevent deletion
      // The executeAge18Deletion function only takes childId and familyId
      // There is no parentConsent or parentOverride parameter
      const eighteenYearsAgo = new Date()
      eighteenYearsAgo.setFullYear(eighteenYearsAgo.getFullYear() - 18)
      setBirthdate('child-18', 'family-123', eighteenYearsAgo)

      // The function signature confirms no parent consent required
      const record = executeAge18Deletion('child-18', 'family-123')
      expect(record).toBeDefined()
    })
  })
})
