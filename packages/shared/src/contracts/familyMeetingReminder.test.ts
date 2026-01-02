/**
 * FamilyMeetingReminder Schema Tests - Story 34.5.4 Task 2
 *
 * Tests for the family meeting reminder Zod schema.
 * AC4: Meeting Reminder (Optional)
 */

import { describe, it, expect } from 'vitest'
import {
  FamilyMeetingReminderSchema,
  CreateFamilyMeetingReminderSchema,
  ReminderStatus,
  type FamilyMeetingReminder,
  type CreateFamilyMeetingReminder,
} from './familyMeetingReminder'

describe('FamilyMeetingReminder Schema - Story 34.5.4', () => {
  // ============================================
  // Valid Schema Tests
  // ============================================

  describe('Valid FamilyMeetingReminder', () => {
    const validReminder: FamilyMeetingReminder = {
      id: 'reminder-123',
      familyId: 'family-456',
      scheduledAt: new Date('2024-01-15T18:00:00Z'),
      createdAt: new Date('2024-01-10T10:00:00Z'),
      createdBy: 'child-789',
      templateId: 'tween-template-001',
      ageTier: 'tween-12-14',
      status: 'pending',
      notificationSentAt: null,
    }

    it('should accept a valid complete reminder', () => {
      const result = FamilyMeetingReminderSchema.safeParse(validReminder)
      expect(result.success).toBe(true)
    })

    it('should accept reminder with notificationSentAt date', () => {
      const reminderWithNotification = {
        ...validReminder,
        status: 'sent',
        notificationSentAt: new Date('2024-01-15T18:00:00Z'),
      }
      const result = FamilyMeetingReminderSchema.safeParse(reminderWithNotification)
      expect(result.success).toBe(true)
    })

    it('should accept all valid status values', () => {
      const statuses: ReminderStatus[] = ['pending', 'sent', 'acknowledged', 'cancelled']
      statuses.forEach((status) => {
        const result = FamilyMeetingReminderSchema.safeParse({
          ...validReminder,
          status,
        })
        expect(result.success).toBe(true)
      })
    })

    it('should accept all valid age tiers', () => {
      const tiers = ['child-8-11', 'tween-12-14', 'teen-15-17'] as const
      tiers.forEach((ageTier) => {
        const result = FamilyMeetingReminderSchema.safeParse({
          ...validReminder,
          ageTier,
        })
        expect(result.success).toBe(true)
      })
    })
  })

  // ============================================
  // Required Field Tests
  // ============================================

  describe('Required Fields', () => {
    it('should reject missing id', () => {
      const result = FamilyMeetingReminderSchema.safeParse({
        familyId: 'family-456',
        scheduledAt: new Date(),
        createdAt: new Date(),
        createdBy: 'child-789',
        templateId: 'template-001',
        ageTier: 'tween-12-14',
        status: 'pending',
        notificationSentAt: null,
      })
      expect(result.success).toBe(false)
    })

    it('should reject missing familyId', () => {
      const result = FamilyMeetingReminderSchema.safeParse({
        id: 'reminder-123',
        scheduledAt: new Date(),
        createdAt: new Date(),
        createdBy: 'child-789',
        templateId: 'template-001',
        ageTier: 'tween-12-14',
        status: 'pending',
        notificationSentAt: null,
      })
      expect(result.success).toBe(false)
    })

    it('should reject missing scheduledAt', () => {
      const result = FamilyMeetingReminderSchema.safeParse({
        id: 'reminder-123',
        familyId: 'family-456',
        createdAt: new Date(),
        createdBy: 'child-789',
        templateId: 'template-001',
        ageTier: 'tween-12-14',
        status: 'pending',
        notificationSentAt: null,
      })
      expect(result.success).toBe(false)
    })

    it('should reject missing createdAt', () => {
      const result = FamilyMeetingReminderSchema.safeParse({
        id: 'reminder-123',
        familyId: 'family-456',
        scheduledAt: new Date(),
        createdBy: 'child-789',
        templateId: 'template-001',
        ageTier: 'tween-12-14',
        status: 'pending',
        notificationSentAt: null,
      })
      expect(result.success).toBe(false)
    })

    it('should reject missing createdBy', () => {
      const result = FamilyMeetingReminderSchema.safeParse({
        id: 'reminder-123',
        familyId: 'family-456',
        scheduledAt: new Date(),
        createdAt: new Date(),
        templateId: 'template-001',
        ageTier: 'tween-12-14',
        status: 'pending',
        notificationSentAt: null,
      })
      expect(result.success).toBe(false)
    })

    it('should reject missing templateId', () => {
      const result = FamilyMeetingReminderSchema.safeParse({
        id: 'reminder-123',
        familyId: 'family-456',
        scheduledAt: new Date(),
        createdAt: new Date(),
        createdBy: 'child-789',
        ageTier: 'tween-12-14',
        status: 'pending',
        notificationSentAt: null,
      })
      expect(result.success).toBe(false)
    })

    it('should reject missing ageTier', () => {
      const result = FamilyMeetingReminderSchema.safeParse({
        id: 'reminder-123',
        familyId: 'family-456',
        scheduledAt: new Date(),
        createdAt: new Date(),
        createdBy: 'child-789',
        templateId: 'template-001',
        status: 'pending',
        notificationSentAt: null,
      })
      expect(result.success).toBe(false)
    })

    it('should reject missing status', () => {
      const result = FamilyMeetingReminderSchema.safeParse({
        id: 'reminder-123',
        familyId: 'family-456',
        scheduledAt: new Date(),
        createdAt: new Date(),
        createdBy: 'child-789',
        templateId: 'template-001',
        ageTier: 'tween-12-14',
        notificationSentAt: null,
      })
      expect(result.success).toBe(false)
    })
  })

  // ============================================
  // Invalid Value Tests
  // ============================================

  describe('Invalid Values', () => {
    it('should reject invalid status value', () => {
      const result = FamilyMeetingReminderSchema.safeParse({
        id: 'reminder-123',
        familyId: 'family-456',
        scheduledAt: new Date(),
        createdAt: new Date(),
        createdBy: 'child-789',
        templateId: 'template-001',
        ageTier: 'tween-12-14',
        status: 'invalid-status',
        notificationSentAt: null,
      })
      expect(result.success).toBe(false)
    })

    it('should reject invalid ageTier value', () => {
      const result = FamilyMeetingReminderSchema.safeParse({
        id: 'reminder-123',
        familyId: 'family-456',
        scheduledAt: new Date(),
        createdAt: new Date(),
        createdBy: 'child-789',
        templateId: 'template-001',
        ageTier: 'invalid-tier',
        status: 'pending',
        notificationSentAt: null,
      })
      expect(result.success).toBe(false)
    })

    it('should reject empty id string', () => {
      const result = FamilyMeetingReminderSchema.safeParse({
        id: '',
        familyId: 'family-456',
        scheduledAt: new Date(),
        createdAt: new Date(),
        createdBy: 'child-789',
        templateId: 'template-001',
        ageTier: 'tween-12-14',
        status: 'pending',
        notificationSentAt: null,
      })
      expect(result.success).toBe(false)
    })

    it('should reject empty familyId string', () => {
      const result = FamilyMeetingReminderSchema.safeParse({
        id: 'reminder-123',
        familyId: '',
        scheduledAt: new Date(),
        createdAt: new Date(),
        createdBy: 'child-789',
        templateId: 'template-001',
        ageTier: 'tween-12-14',
        status: 'pending',
        notificationSentAt: null,
      })
      expect(result.success).toBe(false)
    })
  })

  // ============================================
  // CreateFamilyMeetingReminder Schema Tests
  // ============================================

  describe('CreateFamilyMeetingReminder Schema', () => {
    const validCreate: CreateFamilyMeetingReminder = {
      familyId: 'family-456',
      scheduledAt: new Date('2024-01-15T18:00:00Z'),
      createdBy: 'child-789',
      templateId: 'tween-template-001',
      ageTier: 'tween-12-14',
    }

    it('should accept valid create input', () => {
      const result = CreateFamilyMeetingReminderSchema.safeParse(validCreate)
      expect(result.success).toBe(true)
    })

    it('should not require id for create', () => {
      const result = CreateFamilyMeetingReminderSchema.safeParse(validCreate)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).not.toHaveProperty('id')
      }
    })

    it('should not require createdAt for create', () => {
      const result = CreateFamilyMeetingReminderSchema.safeParse(validCreate)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).not.toHaveProperty('createdAt')
      }
    })

    it('should not require status for create', () => {
      const result = CreateFamilyMeetingReminderSchema.safeParse(validCreate)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).not.toHaveProperty('status')
      }
    })

    it('should not require notificationSentAt for create', () => {
      const result = CreateFamilyMeetingReminderSchema.safeParse(validCreate)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).not.toHaveProperty('notificationSentAt')
      }
    })
  })

  // ============================================
  // ReminderStatus Type Tests
  // ============================================

  describe('ReminderStatus Type', () => {
    it('should export ReminderStatus type', () => {
      const status: ReminderStatus = 'pending'
      expect(status).toBe('pending')
    })

    it('should allow all valid status values', () => {
      const pending: ReminderStatus = 'pending'
      const sent: ReminderStatus = 'sent'
      const acknowledged: ReminderStatus = 'acknowledged'
      const cancelled: ReminderStatus = 'cancelled'

      expect(pending).toBe('pending')
      expect(sent).toBe('sent')
      expect(acknowledged).toBe('acknowledged')
      expect(cancelled).toBe('cancelled')
    })
  })
})
