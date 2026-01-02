/**
 * Age 18 Deletion Integration Tests - Story 38.5 Task 8
 *
 * Integration tests for the complete age-18 deletion flow.
 * Tests all ACs working together.
 */

import { describe, it, expect, beforeEach } from 'vitest'
import {
  setBirthdate,
  getBirthdate,
  is18OrOlder,
  getDaysUntil18,
  clearAllBirthdateData,
} from '../../birthdateService'
import {
  executeAge18Deletion,
  getChildrenTurning18Today,
  getDeletionRecord,
  clearAllAge18DeletionData,
} from '../../age18DeletionService'
import {
  getNotificationsForChild,
  getAge18DeletionMessage,
  clearAllNotificationData,
} from '../../age18NotificationService'
import {
  executeDailyAge18Check,
  sendPreDeletionNotifications,
  getSchedulerStats,
  clearSchedulerData,
} from '../../age18DeletionScheduler'
import { ALL_DELETION_DATA_TYPES, PRE_DELETION_NOTICE_DAYS } from '../../../contracts/age18Deletion'

describe('Age 18 Deletion Integration', () => {
  beforeEach(() => {
    clearAllBirthdateData()
    clearAllAge18DeletionData()
    clearAllNotificationData()
    clearSchedulerData()
  })

  // ============================================
  // Complete Workflow Tests
  // ============================================

  describe('Complete age-18 deletion workflow', () => {
    it('should execute full deletion flow for child turning 18', () => {
      // Set up child who turns 18 today
      const eighteenYearsAgo = new Date()
      eighteenYearsAgo.setFullYear(eighteenYearsAgo.getFullYear() - 18)

      setBirthdate('child-turning-18', 'family-123', eighteenYearsAgo)

      // Verify child is 18
      const birthdate = getBirthdate('child-turning-18')
      expect(birthdate).not.toBeNull()
      expect(is18OrOlder(birthdate!.birthdate)).toBe(true)

      // Execute daily check
      const result = executeDailyAge18Check()

      // Verify deletion triggered
      expect(result.deletionsTriggered).toBe(1)
      expect(result.deletionsCompleted).toBe(1)

      // Verify deletion record created
      const deletionRecord = getDeletionRecord('child-turning-18')
      expect(deletionRecord).not.toBeNull()
      expect(deletionRecord!.status).toBe('completed')

      // Verify all data types deleted
      for (const dataType of ALL_DELETION_DATA_TYPES) {
        expect(deletionRecord!.dataTypesDeleted).toContain(dataType)
      }

      // Verify notification sent
      expect(result.notificationsSent).toBe(1)
      const notifications = getNotificationsForChild('child-turning-18')
      expect(notifications).toHaveLength(1)
      expect(notifications[0].type).toBe('deletion_complete')
    })

    it('should not affect children under 18', () => {
      // Set up child who is 15
      const fifteenYearsAgo = new Date()
      fifteenYearsAgo.setFullYear(fifteenYearsAgo.getFullYear() - 15)

      setBirthdate('child-15', 'family-123', fifteenYearsAgo)

      // Execute daily check
      const result = executeDailyAge18Check()

      // No deletions
      expect(result.deletionsTriggered).toBe(0)

      // Child still has birthdate on file
      expect(getBirthdate('child-15')).not.toBeNull()

      // Days until 18 should be about 3 years
      const daysUntil = getDaysUntil18(fifteenYearsAgo)
      expect(daysUntil).toBeGreaterThan(365 * 2)
    })
  })

  // ============================================
  // Pre-Deletion Notification Tests
  // ============================================

  describe('Pre-deletion notification flow', () => {
    it('should send notifications 30 days before 18', () => {
      // Set up child who turns 18 in 30 days
      const almostEighteen = new Date()
      almostEighteen.setFullYear(almostEighteen.getFullYear() - 18)
      almostEighteen.setDate(almostEighteen.getDate() + PRE_DELETION_NOTICE_DAYS)

      setBirthdate('child-almost-18', 'family-123', almostEighteen)

      // Send pre-deletion notifications
      const count = sendPreDeletionNotifications()

      expect(count).toBe(1)

      // Verify notification received
      const notifications = getNotificationsForChild('child-almost-18')
      expect(notifications).toHaveLength(1)
      expect(notifications[0].type).toBe('pre_deletion')
    })
  })

  // ============================================
  // Message Content Tests (AC6)
  // ============================================

  describe('Deletion message content (AC6)', () => {
    it('should use the official deletion message', () => {
      const message = getAge18DeletionMessage()
      expect(message).toBe("You're 18 - all data has been deleted")
    })
  })

  // ============================================
  // Parent Cannot Prevent Tests (AC5)
  // ============================================

  describe('Deletion regardless of parent wishes (AC5)', () => {
    it('should delete data without any parent consent mechanism', () => {
      const eighteenYearsAgo = new Date()
      eighteenYearsAgo.setFullYear(eighteenYearsAgo.getFullYear() - 18)

      setBirthdate('child-18', 'family-123', eighteenYearsAgo)

      // Execute deletion - no consent parameter exists
      const record = executeAge18Deletion('child-18', 'family-123')

      // Deletion should proceed
      expect(record.status).toBe('pending')
      expect(record.dataTypesDeleted.length).toBeGreaterThan(0)
    })
  })

  // ============================================
  // Data Completeness Tests (AC4)
  // ============================================

  describe('Complete data deletion (AC4)', () => {
    it('should include all required data types', () => {
      const eighteenYearsAgo = new Date()
      eighteenYearsAgo.setFullYear(eighteenYearsAgo.getFullYear() - 18)

      setBirthdate('child-18', 'family-123', eighteenYearsAgo)

      const record = executeAge18Deletion('child-18', 'family-123')

      // Verify all data types from AC4
      expect(record.dataTypesDeleted).toContain('screenshots')
      expect(record.dataTypesDeleted).toContain('flags')
      expect(record.dataTypesDeleted).toContain('activity_logs')
      expect(record.dataTypesDeleted).toContain('trust_history')
    })
  })

  // ============================================
  // Scheduler Statistics Tests (AC7)
  // ============================================

  describe('Scheduler statistics (AC7)', () => {
    it('should track scheduler runs', () => {
      const eighteenYearsAgo = new Date()
      eighteenYearsAgo.setFullYear(eighteenYearsAgo.getFullYear() - 18)

      setBirthdate('child-1', 'family-1', eighteenYearsAgo)

      executeDailyAge18Check()

      const stats = getSchedulerStats()
      expect(stats.totalRuns).toBe(1)
      expect(stats.totalDeletions).toBe(1)
      expect(stats.lastRunAt).toBeInstanceOf(Date)
    })
  })

  // ============================================
  // Birthdate Storage Tests (AC1)
  // ============================================

  describe('Birthdate storage (AC1)', () => {
    it('should store birthdate on file', () => {
      const birthdate = new Date('2010-06-15')
      setBirthdate('child-123', 'family-456', birthdate)

      const stored = getBirthdate('child-123')
      expect(stored).not.toBeNull()
      expect(stored!.birthdate.getFullYear()).toBe(2010)
      expect(stored!.birthdate.getMonth()).toBe(5) // June
      expect(stored!.birthdate.getDate()).toBe(15)
    })
  })

  // ============================================
  // Edge Case Tests
  // ============================================

  describe('Edge cases', () => {
    it('should handle multiple children turning 18 on same day', () => {
      const eighteenYearsAgo = new Date()
      eighteenYearsAgo.setFullYear(eighteenYearsAgo.getFullYear() - 18)

      setBirthdate('child-1', 'family-1', eighteenYearsAgo)
      setBirthdate('child-2', 'family-2', eighteenYearsAgo)
      setBirthdate('child-3', 'family-3', eighteenYearsAgo)

      const result = executeDailyAge18Check()

      expect(result.deletionsTriggered).toBe(3)
      expect(result.deletionsCompleted).toBe(3)
      expect(result.notificationsSent).toBe(3)
    })

    it('should correctly identify children turning 18 today', () => {
      const eighteenYearsAgo = new Date()
      eighteenYearsAgo.setFullYear(eighteenYearsAgo.getFullYear() - 18)

      // Child turning 18 today
      setBirthdate('child-turning-18-today', 'family-1', eighteenYearsAgo)

      // Child who turned 18 yesterday (already 18)
      const nineteenYearsAgo = new Date()
      nineteenYearsAgo.setFullYear(nineteenYearsAgo.getFullYear() - 19)
      setBirthdate('child-19', 'family-2', nineteenYearsAgo)

      // Child turning 18 tomorrow
      const almostEighteen = new Date()
      almostEighteen.setFullYear(almostEighteen.getFullYear() - 18)
      almostEighteen.setDate(almostEighteen.getDate() + 1)
      setBirthdate('child-almost-18', 'family-3', almostEighteen)

      const turning18Today = getChildrenTurning18Today()

      // Only the child turning 18 today should be found
      expect(turning18Today).toHaveLength(1)
      expect(turning18Today[0].childId).toBe('child-turning-18-today')
    })
  })
})
