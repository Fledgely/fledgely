/**
 * Age 18 Deletion Contracts Tests - Story 38.5 Task 1
 *
 * Tests for Zod schemas and types for age-18 automatic deletion.
 * AC1: Child's birthdate is stored on file (FR72)
 * AC2: When child turns 18, all monitoring data is automatically deleted (INV-005)
 * AC4: Deletion includes: screenshots, flags, activity logs, trust history
 */

import { describe, it, expect } from 'vitest'
import {
  childBirthdateSchema,
  age18DeletionRecordSchema,
  age18DeletionNotificationSchema,
  deletionDataTypeSchema,
  deletionStatusSchema,
  notificationTypeSchema,
  AGE_18_IN_YEARS,
  DELETION_CHECK_INTERVAL,
  PRE_DELETION_NOTICE_DAYS,
  createChildBirthdate,
  createAge18DeletionRecord,
  isValidBirthdateForStorage,
  type DeletionDataType,
} from './age18Deletion'

describe('Age18Deletion Contracts', () => {
  // ============================================
  // Configuration Constants Tests
  // ============================================

  describe('Configuration Constants', () => {
    it('should define age 18 threshold', () => {
      expect(AGE_18_IN_YEARS).toBe(18)
    })

    it('should define daily deletion check interval', () => {
      expect(DELETION_CHECK_INTERVAL).toBe('daily')
    })

    it('should define 30-day pre-deletion notice period', () => {
      expect(PRE_DELETION_NOTICE_DAYS).toBe(30)
    })
  })

  // ============================================
  // DeletionDataType Schema Tests
  // ============================================

  describe('deletionDataTypeSchema', () => {
    it('should accept valid data types', () => {
      const validTypes: DeletionDataType[] = [
        'screenshots',
        'flags',
        'activity_logs',
        'trust_history',
        'child_profile',
        'agreements',
        'devices',
      ]

      for (const type of validTypes) {
        expect(deletionDataTypeSchema.parse(type)).toBe(type)
      }
    })

    it('should reject invalid data type', () => {
      expect(() => deletionDataTypeSchema.parse('invalid_type')).toThrow()
    })
  })

  // ============================================
  // DeletionStatus Schema Tests
  // ============================================

  describe('deletionStatusSchema', () => {
    it('should accept valid statuses', () => {
      const validStatuses = ['pending', 'processing', 'completed', 'failed']

      for (const status of validStatuses) {
        expect(deletionStatusSchema.parse(status)).toBe(status)
      }
    })

    it('should reject invalid status', () => {
      expect(() => deletionStatusSchema.parse('invalid')).toThrow()
    })
  })

  // ============================================
  // NotificationType Schema Tests
  // ============================================

  describe('notificationTypeSchema', () => {
    it('should accept valid notification types', () => {
      const validTypes = ['pre_deletion', 'deletion_complete']

      for (const type of validTypes) {
        expect(notificationTypeSchema.parse(type)).toBe(type)
      }
    })

    it('should reject invalid notification type', () => {
      expect(() => notificationTypeSchema.parse('invalid')).toThrow()
    })
  })

  // ============================================
  // ChildBirthdate Schema Tests (AC1)
  // ============================================

  describe('childBirthdateSchema', () => {
    it('should accept valid child birthdate', () => {
      const validBirthdate = {
        childId: 'child-123',
        familyId: 'family-456',
        birthdate: new Date('2010-06-15'),
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      const result = childBirthdateSchema.parse(validBirthdate)
      expect(result.childId).toBe('child-123')
      expect(result.familyId).toBe('family-456')
    })

    it('should require childId', () => {
      const invalidBirthdate = {
        familyId: 'family-456',
        birthdate: new Date('2010-06-15'),
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      expect(() => childBirthdateSchema.parse(invalidBirthdate)).toThrow()
    })

    it('should require familyId', () => {
      const invalidBirthdate = {
        childId: 'child-123',
        birthdate: new Date('2010-06-15'),
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      expect(() => childBirthdateSchema.parse(invalidBirthdate)).toThrow()
    })

    it('should require birthdate', () => {
      const invalidBirthdate = {
        childId: 'child-123',
        familyId: 'family-456',
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      expect(() => childBirthdateSchema.parse(invalidBirthdate)).toThrow()
    })

    it('should coerce date strings to Date objects', () => {
      const birthdateWithStrings = {
        childId: 'child-123',
        familyId: 'family-456',
        birthdate: '2010-06-15',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      }

      const result = childBirthdateSchema.parse(birthdateWithStrings)
      expect(result.birthdate).toBeInstanceOf(Date)
      expect(result.createdAt).toBeInstanceOf(Date)
    })
  })

  // ============================================
  // Age18DeletionRecord Schema Tests (AC2, AC4)
  // ============================================

  describe('age18DeletionRecordSchema', () => {
    it('should accept valid deletion record', () => {
      const validRecord = {
        id: 'del-123',
        childId: 'child-123',
        familyId: 'family-456',
        birthdate: new Date('2006-01-01'),
        deletionTriggeredAt: new Date(),
        deletionCompletedAt: null,
        dataTypesDeleted: ['screenshots', 'flags', 'activity_logs', 'trust_history'],
        status: 'pending',
        notificationSentAt: null,
      }

      const result = age18DeletionRecordSchema.parse(validRecord)
      expect(result.id).toBe('del-123')
      expect(result.status).toBe('pending')
    })

    it('should require all data types to be valid', () => {
      const invalidRecord = {
        id: 'del-123',
        childId: 'child-123',
        familyId: 'family-456',
        birthdate: new Date('2006-01-01'),
        deletionTriggeredAt: new Date(),
        deletionCompletedAt: null,
        dataTypesDeleted: ['invalid_type'],
        status: 'pending',
        notificationSentAt: null,
      }

      expect(() => age18DeletionRecordSchema.parse(invalidRecord)).toThrow()
    })

    it('should allow completed status with completedAt date', () => {
      const completedRecord = {
        id: 'del-123',
        childId: 'child-123',
        familyId: 'family-456',
        birthdate: new Date('2006-01-01'),
        deletionTriggeredAt: new Date(),
        deletionCompletedAt: new Date(),
        dataTypesDeleted: ['screenshots', 'flags'],
        status: 'completed',
        notificationSentAt: new Date(),
      }

      const result = age18DeletionRecordSchema.parse(completedRecord)
      expect(result.status).toBe('completed')
      expect(result.deletionCompletedAt).toBeInstanceOf(Date)
    })

    it('should allow null for optional fields', () => {
      const record = {
        id: 'del-123',
        childId: 'child-123',
        familyId: 'family-456',
        birthdate: new Date('2006-01-01'),
        deletionTriggeredAt: new Date(),
        deletionCompletedAt: null,
        dataTypesDeleted: [],
        status: 'pending',
        notificationSentAt: null,
      }

      const result = age18DeletionRecordSchema.parse(record)
      expect(result.deletionCompletedAt).toBeNull()
      expect(result.notificationSentAt).toBeNull()
    })
  })

  // ============================================
  // Age18DeletionNotification Schema Tests
  // ============================================

  describe('age18DeletionNotificationSchema', () => {
    it('should accept valid notification', () => {
      const validNotification = {
        id: 'notif-123',
        childId: 'child-123',
        type: 'deletion_complete',
        sentAt: new Date(),
        acknowledged: false,
      }

      const result = age18DeletionNotificationSchema.parse(validNotification)
      expect(result.id).toBe('notif-123')
      expect(result.type).toBe('deletion_complete')
    })

    it('should accept pre_deletion notification type', () => {
      const preDeleteNotification = {
        id: 'notif-123',
        childId: 'child-123',
        type: 'pre_deletion',
        sentAt: new Date(),
        acknowledged: true,
      }

      const result = age18DeletionNotificationSchema.parse(preDeleteNotification)
      expect(result.type).toBe('pre_deletion')
      expect(result.acknowledged).toBe(true)
    })

    it('should require acknowledged boolean', () => {
      const invalidNotification = {
        id: 'notif-123',
        childId: 'child-123',
        type: 'deletion_complete',
        sentAt: new Date(),
      }

      expect(() => age18DeletionNotificationSchema.parse(invalidNotification)).toThrow()
    })
  })

  // ============================================
  // Helper Function Tests
  // ============================================

  describe('createChildBirthdate', () => {
    it('should create child birthdate with current timestamps', () => {
      const result = createChildBirthdate('child-123', 'family-456', new Date('2010-06-15'))

      expect(result.childId).toBe('child-123')
      expect(result.familyId).toBe('family-456')
      expect(result.birthdate.getFullYear()).toBe(2010)
      expect(result.createdAt).toBeInstanceOf(Date)
      expect(result.updatedAt).toBeInstanceOf(Date)
    })
  })

  describe('createAge18DeletionRecord', () => {
    it('should create deletion record with pending status', () => {
      const birthdate = new Date('2006-01-01')
      const result = createAge18DeletionRecord('child-123', 'family-456', birthdate)

      expect(result.id).toBeDefined()
      expect(result.childId).toBe('child-123')
      expect(result.familyId).toBe('family-456')
      expect(result.status).toBe('pending')
      expect(result.deletionCompletedAt).toBeNull()
      expect(result.notificationSentAt).toBeNull()
    })

    it('should include all data types for deletion', () => {
      const birthdate = new Date('2006-01-01')
      const result = createAge18DeletionRecord('child-123', 'family-456', birthdate)

      expect(result.dataTypesDeleted).toContain('screenshots')
      expect(result.dataTypesDeleted).toContain('flags')
      expect(result.dataTypesDeleted).toContain('activity_logs')
      expect(result.dataTypesDeleted).toContain('trust_history')
      expect(result.dataTypesDeleted).toContain('child_profile')
      expect(result.dataTypesDeleted).toContain('agreements')
      expect(result.dataTypesDeleted).toContain('devices')
    })
  })

  describe('isValidBirthdateForStorage', () => {
    it('should return true for valid birthdate (child age 5-17)', () => {
      const fiveYearsAgo = new Date()
      fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - 5)

      expect(isValidBirthdateForStorage(fiveYearsAgo)).toBe(true)
    })

    it('should return true for child exactly at age 17', () => {
      const seventeenYearsAgo = new Date()
      seventeenYearsAgo.setFullYear(seventeenYearsAgo.getFullYear() - 17)

      expect(isValidBirthdateForStorage(seventeenYearsAgo)).toBe(true)
    })

    it('should return false for future date', () => {
      const futureDate = new Date()
      futureDate.setFullYear(futureDate.getFullYear() + 1)

      expect(isValidBirthdateForStorage(futureDate)).toBe(false)
    })

    it('should return false for date more than 100 years ago', () => {
      const ancientDate = new Date()
      ancientDate.setFullYear(ancientDate.getFullYear() - 101)

      expect(isValidBirthdateForStorage(ancientDate)).toBe(false)
    })

    it('should return false for date today (age 0)', () => {
      const today = new Date()
      expect(isValidBirthdateForStorage(today)).toBe(false)
    })
  })
})
