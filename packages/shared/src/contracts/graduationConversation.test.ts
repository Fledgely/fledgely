/**
 * Graduation Conversation Contracts Tests - Story 38.2 Task 1
 *
 * Tests for graduation conversation data model and helper functions.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import {
  graduationConversationSchema,
  acknowledgmentRecordSchema,
  conversationTemplateSchema,
  discussionPointSchema,
  resourceSchema as _resourceSchema,
  notificationContentSchema,
  createConversationInputSchema,
  recordAcknowledgmentInputSchema,
  scheduleConversationInputSchema,
  completeConversationInputSchema,
  hasAllAcknowledgments,
  isConversationExpired,
  isConversationOverdue,
  shouldSendReminder,
  getConversationDaysUntilExpiry,
  getMissingAcknowledgments,
  createInitialConversation,
  isValidScheduleDate,
  getConversationStatusText,
  getOutcomeText,
  ACKNOWLEDGMENT_REMINDER_DAYS,
  CONVERSATION_EXPIRY_DAYS,
  MIN_SCHEDULE_LEAD_DAYS,
  GraduationConversation,
  AcknowledgmentRecord as _AcknowledgmentRecord,
} from './graduationConversation'

describe('GraduationConversation Contracts - Story 38.2 Task 1', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2025-12-01T12:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('Constants', () => {
    it('should have correct acknowledgment reminder days', () => {
      expect(ACKNOWLEDGMENT_REMINDER_DAYS).toBe(7)
    })

    it('should have correct conversation expiry days', () => {
      expect(CONVERSATION_EXPIRY_DAYS).toBe(30)
    })

    it('should have correct minimum schedule lead days', () => {
      expect(MIN_SCHEDULE_LEAD_DAYS).toBe(1)
    })
  })

  describe('acknowledgmentRecordSchema', () => {
    it('should validate valid acknowledgment record', () => {
      const record = {
        userId: 'user-123',
        role: 'child' as const,
        acknowledgedAt: new Date(),
      }

      expect(() => acknowledgmentRecordSchema.parse(record)).not.toThrow()
    })

    it('should validate with optional message', () => {
      const record = {
        userId: 'user-123',
        role: 'parent' as const,
        acknowledgedAt: new Date(),
        message: 'Looking forward to the conversation',
      }

      expect(() => acknowledgmentRecordSchema.parse(record)).not.toThrow()
    })

    it('should reject empty userId', () => {
      const record = {
        userId: '',
        role: 'child' as const,
        acknowledgedAt: new Date(),
      }

      expect(() => acknowledgmentRecordSchema.parse(record)).toThrow()
    })

    it('should reject invalid role', () => {
      const record = {
        userId: 'user-123',
        role: 'admin' as const,
        acknowledgedAt: new Date(),
      }

      expect(() => acknowledgmentRecordSchema.parse(record)).toThrow()
    })
  })

  describe('graduationConversationSchema', () => {
    const validConversation = {
      id: 'conv-123',
      familyId: 'family-456',
      childId: 'child-789',
      initiatedAt: new Date('2025-12-01'),
      expiresAt: new Date('2025-12-31'),
      status: 'pending' as const,
      childAcknowledgment: null,
      parentAcknowledgments: [],
      requiredParentIds: ['parent-1', 'parent-2'],
      scheduledDate: null,
      completedAt: null,
      outcome: null,
      remindersSent: 0,
      lastReminderAt: null,
    }

    it('should validate valid conversation', () => {
      expect(() => graduationConversationSchema.parse(validConversation)).not.toThrow()
    })

    it('should validate all status values', () => {
      const statuses = ['pending', 'acknowledged', 'scheduled', 'completed', 'expired'] as const

      for (const status of statuses) {
        const conv = { ...validConversation, status }
        expect(() => graduationConversationSchema.parse(conv)).not.toThrow()
      }
    })

    it('should validate all outcome values', () => {
      const outcomes = ['graduated', 'deferred', 'declined'] as const

      for (const outcome of outcomes) {
        const conv = {
          ...validConversation,
          status: 'completed' as const,
          completedAt: new Date(),
          outcome,
        }
        expect(() => graduationConversationSchema.parse(conv)).not.toThrow()
      }
    })

    it('should validate with acknowledgments', () => {
      const conv = {
        ...validConversation,
        childAcknowledgment: {
          userId: 'child-789',
          role: 'child' as const,
          acknowledgedAt: new Date(),
        },
        parentAcknowledgments: [
          {
            userId: 'parent-1',
            role: 'parent' as const,
            acknowledgedAt: new Date(),
          },
        ],
      }

      expect(() => graduationConversationSchema.parse(conv)).not.toThrow()
    })

    it('should reject missing required fields', () => {
      const invalid = { id: 'conv-123' }
      expect(() => graduationConversationSchema.parse(invalid)).toThrow()
    })
  })

  describe('discussionPointSchema', () => {
    it('should validate valid discussion point', () => {
      const point = {
        topic: 'Celebrating Achievement',
        forChild: 'How do you feel about this milestone?',
        forParent: 'Share your pride in their growth.',
        optional: false,
      }

      expect(() => discussionPointSchema.parse(point)).not.toThrow()
    })

    it('should reject empty strings', () => {
      const point = {
        topic: '',
        forChild: 'Question',
        forParent: 'Question',
        optional: false,
      }

      expect(() => discussionPointSchema.parse(point)).toThrow()
    })
  })

  describe('conversationTemplateSchema', () => {
    it('should validate valid template', () => {
      const template = {
        id: 'default',
        title: 'Graduation Conversation Guide',
        introduction: 'Welcome to your graduation conversation.',
        discussionPoints: [
          {
            topic: 'Achievement',
            forChild: 'How do you feel?',
            forParent: 'Share your pride.',
            optional: false,
          },
        ],
        suggestedQuestions: ['What have you learned?'],
        closingMessage: 'Thank you for having this conversation.',
        resources: [{ title: 'Guide', url: '/guide' }],
      }

      expect(() => conversationTemplateSchema.parse(template)).not.toThrow()
    })
  })

  describe('notificationContentSchema', () => {
    it('should validate valid notification', () => {
      const notification = {
        title: 'Graduation Eligible!',
        message: 'Congratulations on reaching eligibility.',
        type: 'graduation_eligible' as const,
        priority: 'high' as const,
        actionLabel: 'View Details',
      }

      expect(() => notificationContentSchema.parse(notification)).not.toThrow()
    })

    it('should validate all notification types', () => {
      const types = [
        'graduation_eligible',
        'acknowledgment_needed',
        'conversation_reminder',
        'conversation_scheduled',
        'conversation_overdue',
      ] as const

      for (const type of types) {
        const notification = {
          title: 'Title',
          message: 'Message',
          type,
          priority: 'normal' as const,
        }
        expect(() => notificationContentSchema.parse(notification)).not.toThrow()
      }
    })
  })

  describe('Input Schemas', () => {
    describe('createConversationInputSchema', () => {
      it('should validate valid input', () => {
        const input = {
          familyId: 'family-123',
          childId: 'child-456',
          parentIds: ['parent-1', 'parent-2'],
        }

        expect(() => createConversationInputSchema.parse(input)).not.toThrow()
      })

      it('should reject empty parentIds', () => {
        const input = {
          familyId: 'family-123',
          childId: 'child-456',
          parentIds: [],
        }

        expect(() => createConversationInputSchema.parse(input)).toThrow()
      })
    })

    describe('recordAcknowledgmentInputSchema', () => {
      it('should validate valid input', () => {
        const input = {
          conversationId: 'conv-123',
          userId: 'user-456',
          role: 'child' as const,
        }

        expect(() => recordAcknowledgmentInputSchema.parse(input)).not.toThrow()
      })

      it('should validate with optional message', () => {
        const input = {
          conversationId: 'conv-123',
          userId: 'user-456',
          role: 'parent' as const,
          message: 'Looking forward to it',
        }

        expect(() => recordAcknowledgmentInputSchema.parse(input)).not.toThrow()
      })
    })

    describe('scheduleConversationInputSchema', () => {
      it('should validate valid input', () => {
        const input = {
          conversationId: 'conv-123',
          scheduledDate: new Date('2025-12-15'),
        }

        expect(() => scheduleConversationInputSchema.parse(input)).not.toThrow()
      })
    })

    describe('completeConversationInputSchema', () => {
      it('should validate all outcomes', () => {
        const outcomes = ['graduated', 'deferred', 'declined'] as const

        for (const outcome of outcomes) {
          const input = {
            conversationId: 'conv-123',
            outcome,
          }
          expect(() => completeConversationInputSchema.parse(input)).not.toThrow()
        }
      })
    })
  })

  describe('Helper Functions', () => {
    describe('hasAllAcknowledgments', () => {
      it('should return false if child has not acknowledged', () => {
        const conversation: GraduationConversation = {
          id: 'conv-123',
          familyId: 'family-456',
          childId: 'child-789',
          initiatedAt: new Date(),
          expiresAt: new Date(),
          status: 'pending',
          childAcknowledgment: null,
          parentAcknowledgments: [
            { userId: 'parent-1', role: 'parent', acknowledgedAt: new Date() },
          ],
          requiredParentIds: ['parent-1'],
          scheduledDate: null,
          completedAt: null,
          outcome: null,
          remindersSent: 0,
          lastReminderAt: null,
        }

        expect(hasAllAcknowledgments(conversation)).toBe(false)
      })

      it('should return false if not all parents have acknowledged', () => {
        const conversation: GraduationConversation = {
          id: 'conv-123',
          familyId: 'family-456',
          childId: 'child-789',
          initiatedAt: new Date(),
          expiresAt: new Date(),
          status: 'pending',
          childAcknowledgment: {
            userId: 'child-789',
            role: 'child',
            acknowledgedAt: new Date(),
          },
          parentAcknowledgments: [
            { userId: 'parent-1', role: 'parent', acknowledgedAt: new Date() },
          ],
          requiredParentIds: ['parent-1', 'parent-2'],
          scheduledDate: null,
          completedAt: null,
          outcome: null,
          remindersSent: 0,
          lastReminderAt: null,
        }

        expect(hasAllAcknowledgments(conversation)).toBe(false)
      })

      it('should return true when all have acknowledged', () => {
        const conversation: GraduationConversation = {
          id: 'conv-123',
          familyId: 'family-456',
          childId: 'child-789',
          initiatedAt: new Date(),
          expiresAt: new Date(),
          status: 'pending',
          childAcknowledgment: {
            userId: 'child-789',
            role: 'child',
            acknowledgedAt: new Date(),
          },
          parentAcknowledgments: [
            { userId: 'parent-1', role: 'parent', acknowledgedAt: new Date() },
            { userId: 'parent-2', role: 'parent', acknowledgedAt: new Date() },
          ],
          requiredParentIds: ['parent-1', 'parent-2'],
          scheduledDate: null,
          completedAt: null,
          outcome: null,
          remindersSent: 0,
          lastReminderAt: null,
        }

        expect(hasAllAcknowledgments(conversation)).toBe(true)
      })
    })

    describe('isConversationExpired', () => {
      it('should return true when past expiry date', () => {
        const conversation: GraduationConversation = {
          id: 'conv-123',
          familyId: 'family-456',
          childId: 'child-789',
          initiatedAt: new Date('2025-11-01'),
          expiresAt: new Date('2025-11-30'),
          status: 'pending',
          childAcknowledgment: null,
          parentAcknowledgments: [],
          requiredParentIds: ['parent-1'],
          scheduledDate: null,
          completedAt: null,
          outcome: null,
          remindersSent: 0,
          lastReminderAt: null,
        }

        expect(isConversationExpired(conversation)).toBe(true)
      })

      it('should return false when before expiry date', () => {
        const conversation: GraduationConversation = {
          id: 'conv-123',
          familyId: 'family-456',
          childId: 'child-789',
          initiatedAt: new Date('2025-12-01'),
          expiresAt: new Date('2025-12-31'),
          status: 'pending',
          childAcknowledgment: null,
          parentAcknowledgments: [],
          requiredParentIds: ['parent-1'],
          scheduledDate: null,
          completedAt: null,
          outcome: null,
          remindersSent: 0,
          lastReminderAt: null,
        }

        expect(isConversationExpired(conversation)).toBe(false)
      })
    })

    describe('isConversationOverdue', () => {
      it('should return false if not acknowledged', () => {
        const conversation: GraduationConversation = {
          id: 'conv-123',
          familyId: 'family-456',
          childId: 'child-789',
          initiatedAt: new Date('2025-11-01'),
          expiresAt: new Date('2025-12-31'),
          status: 'pending',
          childAcknowledgment: null,
          parentAcknowledgments: [],
          requiredParentIds: ['parent-1'],
          scheduledDate: null,
          completedAt: null,
          outcome: null,
          remindersSent: 0,
          lastReminderAt: null,
        }

        expect(isConversationOverdue(conversation)).toBe(false)
      })

      it('should return true if acknowledged more than 7 days ago', () => {
        const conversation: GraduationConversation = {
          id: 'conv-123',
          familyId: 'family-456',
          childId: 'child-789',
          initiatedAt: new Date('2025-11-01'),
          expiresAt: new Date('2025-12-31'),
          status: 'acknowledged',
          childAcknowledgment: {
            userId: 'child-789',
            role: 'child',
            acknowledgedAt: new Date('2025-11-20'),
          },
          parentAcknowledgments: [
            {
              userId: 'parent-1',
              role: 'parent',
              acknowledgedAt: new Date('2025-11-21'),
            },
          ],
          requiredParentIds: ['parent-1'],
          scheduledDate: null,
          completedAt: null,
          outcome: null,
          remindersSent: 0,
          lastReminderAt: null,
        }

        expect(isConversationOverdue(conversation)).toBe(true)
      })

      it('should return false if acknowledged less than 7 days ago', () => {
        const conversation: GraduationConversation = {
          id: 'conv-123',
          familyId: 'family-456',
          childId: 'child-789',
          initiatedAt: new Date('2025-11-01'),
          expiresAt: new Date('2025-12-31'),
          status: 'acknowledged',
          childAcknowledgment: {
            userId: 'child-789',
            role: 'child',
            acknowledgedAt: new Date('2025-11-28'),
          },
          parentAcknowledgments: [
            {
              userId: 'parent-1',
              role: 'parent',
              acknowledgedAt: new Date('2025-11-29'),
            },
          ],
          requiredParentIds: ['parent-1'],
          scheduledDate: null,
          completedAt: null,
          outcome: null,
          remindersSent: 0,
          lastReminderAt: null,
        }

        expect(isConversationOverdue(conversation)).toBe(false)
      })
    })

    describe('shouldSendReminder', () => {
      it('should return false if not pending', () => {
        const conversation: GraduationConversation = {
          id: 'conv-123',
          familyId: 'family-456',
          childId: 'child-789',
          initiatedAt: new Date('2025-11-01'),
          expiresAt: new Date('2025-12-31'),
          status: 'acknowledged',
          childAcknowledgment: null,
          parentAcknowledgments: [],
          requiredParentIds: ['parent-1'],
          scheduledDate: null,
          completedAt: null,
          outcome: null,
          remindersSent: 0,
          lastReminderAt: null,
        }

        expect(shouldSendReminder(conversation)).toBe(false)
      })

      it('should return true after 7 days if no reminders sent', () => {
        const conversation: GraduationConversation = {
          id: 'conv-123',
          familyId: 'family-456',
          childId: 'child-789',
          initiatedAt: new Date('2025-11-20'),
          expiresAt: new Date('2025-12-31'),
          status: 'pending',
          childAcknowledgment: null,
          parentAcknowledgments: [],
          requiredParentIds: ['parent-1'],
          scheduledDate: null,
          completedAt: null,
          outcome: null,
          remindersSent: 0,
          lastReminderAt: null,
        }

        expect(shouldSendReminder(conversation)).toBe(true)
      })

      it('should return false if reminder already sent for this period', () => {
        const conversation: GraduationConversation = {
          id: 'conv-123',
          familyId: 'family-456',
          childId: 'child-789',
          initiatedAt: new Date('2025-11-20'),
          expiresAt: new Date('2025-12-31'),
          status: 'pending',
          childAcknowledgment: null,
          parentAcknowledgments: [],
          requiredParentIds: ['parent-1'],
          scheduledDate: null,
          completedAt: null,
          outcome: null,
          remindersSent: 1,
          lastReminderAt: new Date('2025-11-27'),
        }

        expect(shouldSendReminder(conversation)).toBe(false)
      })
    })

    describe('getConversationDaysUntilExpiry', () => {
      it('should return correct days remaining', () => {
        const conversation: GraduationConversation = {
          id: 'conv-123',
          familyId: 'family-456',
          childId: 'child-789',
          initiatedAt: new Date('2025-12-01'),
          expiresAt: new Date('2025-12-15T12:00:00Z'),
          status: 'pending',
          childAcknowledgment: null,
          parentAcknowledgments: [],
          requiredParentIds: ['parent-1'],
          scheduledDate: null,
          completedAt: null,
          outcome: null,
          remindersSent: 0,
          lastReminderAt: null,
        }

        expect(getConversationDaysUntilExpiry(conversation)).toBe(14)
      })

      it('should return 0 if already expired', () => {
        const conversation: GraduationConversation = {
          id: 'conv-123',
          familyId: 'family-456',
          childId: 'child-789',
          initiatedAt: new Date('2025-11-01'),
          expiresAt: new Date('2025-11-30'),
          status: 'pending',
          childAcknowledgment: null,
          parentAcknowledgments: [],
          requiredParentIds: ['parent-1'],
          scheduledDate: null,
          completedAt: null,
          outcome: null,
          remindersSent: 0,
          lastReminderAt: null,
        }

        expect(getConversationDaysUntilExpiry(conversation)).toBe(0)
      })
    })

    describe('getMissingAcknowledgments', () => {
      it('should return child missing if not acknowledged', () => {
        const conversation: GraduationConversation = {
          id: 'conv-123',
          familyId: 'family-456',
          childId: 'child-789',
          initiatedAt: new Date(),
          expiresAt: new Date(),
          status: 'pending',
          childAcknowledgment: null,
          parentAcknowledgments: [],
          requiredParentIds: ['parent-1'],
          scheduledDate: null,
          completedAt: null,
          outcome: null,
          remindersSent: 0,
          lastReminderAt: null,
        }

        const result = getMissingAcknowledgments(conversation)
        expect(result.childMissing).toBe(true)
        expect(result.missingParentIds).toEqual(['parent-1'])
      })

      it('should return missing parent IDs', () => {
        const conversation: GraduationConversation = {
          id: 'conv-123',
          familyId: 'family-456',
          childId: 'child-789',
          initiatedAt: new Date(),
          expiresAt: new Date(),
          status: 'pending',
          childAcknowledgment: {
            userId: 'child-789',
            role: 'child',
            acknowledgedAt: new Date(),
          },
          parentAcknowledgments: [
            { userId: 'parent-1', role: 'parent', acknowledgedAt: new Date() },
          ],
          requiredParentIds: ['parent-1', 'parent-2'],
          scheduledDate: null,
          completedAt: null,
          outcome: null,
          remindersSent: 0,
          lastReminderAt: null,
        }

        const result = getMissingAcknowledgments(conversation)
        expect(result.childMissing).toBe(false)
        expect(result.missingParentIds).toEqual(['parent-2'])
      })

      it('should return empty when all acknowledged', () => {
        const conversation: GraduationConversation = {
          id: 'conv-123',
          familyId: 'family-456',
          childId: 'child-789',
          initiatedAt: new Date(),
          expiresAt: new Date(),
          status: 'acknowledged',
          childAcknowledgment: {
            userId: 'child-789',
            role: 'child',
            acknowledgedAt: new Date(),
          },
          parentAcknowledgments: [
            { userId: 'parent-1', role: 'parent', acknowledgedAt: new Date() },
          ],
          requiredParentIds: ['parent-1'],
          scheduledDate: null,
          completedAt: null,
          outcome: null,
          remindersSent: 0,
          lastReminderAt: null,
        }

        const result = getMissingAcknowledgments(conversation)
        expect(result.childMissing).toBe(false)
        expect(result.missingParentIds).toEqual([])
      })
    })

    describe('createInitialConversation', () => {
      it('should create valid initial conversation', () => {
        const input = {
          familyId: 'family-123',
          childId: 'child-456',
          parentIds: ['parent-1', 'parent-2'],
        }

        const conversation = createInitialConversation('conv-123', input)

        expect(conversation.id).toBe('conv-123')
        expect(conversation.familyId).toBe('family-123')
        expect(conversation.childId).toBe('child-456')
        expect(conversation.status).toBe('pending')
        expect(conversation.childAcknowledgment).toBeNull()
        expect(conversation.parentAcknowledgments).toEqual([])
        expect(conversation.requiredParentIds).toEqual(['parent-1', 'parent-2'])
        expect(conversation.scheduledDate).toBeNull()
        expect(conversation.completedAt).toBeNull()
        expect(conversation.outcome).toBeNull()
        expect(conversation.remindersSent).toBe(0)
      })

      it('should set expiry date 30 days from now', () => {
        const input = {
          familyId: 'family-123',
          childId: 'child-456',
          parentIds: ['parent-1'],
        }

        const conversation = createInitialConversation('conv-123', input)

        const expectedExpiry = new Date('2025-12-31T12:00:00Z')
        expect(conversation.expiresAt).toEqual(expectedExpiry)
      })
    })

    describe('isValidScheduleDate', () => {
      it('should return true for date after minimum lead days', () => {
        const date = new Date('2025-12-05')
        expect(isValidScheduleDate(date)).toBe(true)
      })

      it('should return false for today', () => {
        const date = new Date('2025-12-01')
        expect(isValidScheduleDate(date)).toBe(false)
      })

      it('should return false for past dates', () => {
        const date = new Date('2025-11-30')
        expect(isValidScheduleDate(date)).toBe(false)
      })
    })

    describe('getConversationStatusText', () => {
      it('should return child text for child viewer', () => {
        expect(getConversationStatusText('pending', 'child')).toBe('Waiting for acknowledgments')
        expect(getConversationStatusText('acknowledged', 'child')).toBe(
          'Ready to schedule your graduation conversation'
        )
        expect(getConversationStatusText('scheduled', 'child')).toBe('Conversation scheduled')
        expect(getConversationStatusText('completed', 'child')).toBe('Conversation completed')
        expect(getConversationStatusText('expired', 'child')).toBe('Conversation window expired')
      })

      it('should return parent text for parent viewer', () => {
        expect(getConversationStatusText('pending', 'parent')).toBe(
          'Waiting for all family members to acknowledge'
        )
        expect(getConversationStatusText('acknowledged', 'parent')).toBe(
          'Ready to schedule the graduation conversation'
        )
        expect(getConversationStatusText('expired', 'parent')).toBe(
          'Conversation window expired - please restart'
        )
      })
    })

    describe('getOutcomeText', () => {
      it('should return child text for child viewer', () => {
        expect(getOutcomeText('graduated', 'child')).toBe(
          'Congratulations on graduating from monitoring!'
        )
        expect(getOutcomeText('deferred', 'child')).toBe(
          "You've decided to continue for now. You can revisit this anytime."
        )
        expect(getOutcomeText('declined', 'child')).toBe(
          'The graduation was declined. Keep building trust!'
        )
      })

      it('should return parent text with child name', () => {
        expect(getOutcomeText('graduated', 'parent', 'Emma')).toBe(
          'Congratulations! Emma has graduated from monitoring.'
        )
        expect(getOutcomeText('deferred', 'parent', 'Emma')).toBe(
          'The family has decided to continue monitoring Emma for now.'
        )
      })

      it('should use default name if not provided', () => {
        expect(getOutcomeText('graduated', 'parent')).toBe(
          'Congratulations! your child has graduated from monitoring.'
        )
      })
    })
  })

  describe('AC Verification', () => {
    describe('AC1: System detects eligibility', () => {
      it('should have status progression for detection', () => {
        // Conversation starts as pending when eligibility detected
        const input = {
          familyId: 'family-123',
          childId: 'child-456',
          parentIds: ['parent-1'],
        }

        const conversation = createInitialConversation('conv-123', input)
        expect(conversation.status).toBe('pending')
      })
    })

    describe('AC3: Both parties must acknowledge', () => {
      it('should require child acknowledgment', () => {
        const conversation: GraduationConversation = {
          id: 'conv-123',
          familyId: 'family-456',
          childId: 'child-789',
          initiatedAt: new Date(),
          expiresAt: new Date(),
          status: 'pending',
          childAcknowledgment: null,
          parentAcknowledgments: [
            { userId: 'parent-1', role: 'parent', acknowledgedAt: new Date() },
          ],
          requiredParentIds: ['parent-1'],
          scheduledDate: null,
          completedAt: null,
          outcome: null,
          remindersSent: 0,
          lastReminderAt: null,
        }

        expect(hasAllAcknowledgments(conversation)).toBe(false)
      })

      it('should require all parent acknowledgments', () => {
        const conversation: GraduationConversation = {
          id: 'conv-123',
          familyId: 'family-456',
          childId: 'child-789',
          initiatedAt: new Date(),
          expiresAt: new Date(),
          status: 'pending',
          childAcknowledgment: {
            userId: 'child-789',
            role: 'child',
            acknowledgedAt: new Date(),
          },
          parentAcknowledgments: [],
          requiredParentIds: ['parent-1', 'parent-2'],
          scheduledDate: null,
          completedAt: null,
          outcome: null,
          remindersSent: 0,
          lastReminderAt: null,
        }

        expect(hasAllAcknowledgments(conversation)).toBe(false)
      })
    })

    describe('AC6: Prevents indefinite monitoring', () => {
      it('should have expiry mechanism', () => {
        const input = {
          familyId: 'family-123',
          childId: 'child-456',
          parentIds: ['parent-1'],
        }

        const conversation = createInitialConversation('conv-123', input)

        // Conversation expires after 30 days if not acted upon
        expect(conversation.expiresAt > conversation.initiatedAt).toBe(true)
        expect(getConversationDaysUntilExpiry(conversation)).toBe(30)
      })

      it('should track reminders', () => {
        const conversation: GraduationConversation = {
          id: 'conv-123',
          familyId: 'family-456',
          childId: 'child-789',
          initiatedAt: new Date('2025-11-20'),
          expiresAt: new Date('2025-12-31'),
          status: 'pending',
          childAcknowledgment: null,
          parentAcknowledgments: [],
          requiredParentIds: ['parent-1'],
          scheduledDate: null,
          completedAt: null,
          outcome: null,
          remindersSent: 0,
          lastReminderAt: null,
        }

        expect(shouldSendReminder(conversation)).toBe(true)
      })
    })
  })
})
