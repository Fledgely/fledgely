/**
 * FamilyMeetingReminder Schema - Story 34.5.4 Task 2
 *
 * Zod schema for family meeting reminders.
 * AC4: Meeting Reminder (Optional)
 */

import { z } from 'zod'
import { ageTierSchema } from './mediationResources'

// ============================================
// Status Enum
// ============================================

export const ReminderStatusSchema = z.enum(['pending', 'sent', 'acknowledged', 'cancelled'])

export type ReminderStatus = z.infer<typeof ReminderStatusSchema>

// ============================================
// Main Schema
// ============================================

/**
 * Family Meeting Reminder Schema
 *
 * Represents a scheduled reminder for a family meeting discussion.
 */
export const FamilyMeetingReminderSchema = z.object({
  /** Unique identifier for the reminder */
  id: z.string().min(1),

  /** Family this reminder belongs to */
  familyId: z.string().min(1),

  /** When the meeting is scheduled */
  scheduledAt: z.date(),

  /** When the reminder was created */
  createdAt: z.date(),

  /** Who created the reminder (childId or parentId) */
  createdBy: z.string().min(1),

  /** Which template was viewed when scheduling */
  templateId: z.string().min(1),

  /** Age tier for content adaptation */
  ageTier: ageTierSchema,

  /** Current status of the reminder */
  status: ReminderStatusSchema,

  /** When notification was sent (null if not yet sent) */
  notificationSentAt: z.date().nullable(),

  /** When reminder was acknowledged (null if not yet acknowledged) */
  acknowledgedAt: z.date().nullable().optional(),
})

export type FamilyMeetingReminder = z.infer<typeof FamilyMeetingReminderSchema>

// ============================================
// Create Schema (for new reminders)
// ============================================

/**
 * Schema for creating a new family meeting reminder.
 * Excludes server-generated fields: id, createdAt, status, notificationSentAt
 */
export const CreateFamilyMeetingReminderSchema = z.object({
  /** Family this reminder belongs to */
  familyId: z.string().min(1),

  /** When the meeting is scheduled */
  scheduledAt: z.date(),

  /** Who created the reminder (childId or parentId) */
  createdBy: z.string().min(1),

  /** Which template was viewed when scheduling */
  templateId: z.string().min(1),

  /** Age tier for content adaptation */
  ageTier: ageTierSchema,
})

export type CreateFamilyMeetingReminder = z.infer<typeof CreateFamilyMeetingReminderSchema>
