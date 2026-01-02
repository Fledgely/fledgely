/**
 * Graduation Conversation Contracts - Story 38.2 Task 1
 *
 * Data model for graduation conversation tracking.
 * FR38A: System initiates graduation conversation when child reaches eligibility.
 */

import { z } from 'zod'

// ============================================
// Constants
// ============================================

/** Days allowed for acknowledgment before reminders */
export const ACKNOWLEDGMENT_REMINDER_DAYS = 7

/** Days before conversation expires */
export const CONVERSATION_EXPIRY_DAYS = 30

/** Minimum days before scheduled conversation */
export const MIN_SCHEDULE_LEAD_DAYS = 1

// ============================================
// Enums and Types
// ============================================

/** Conversation status progression */
export const conversationStatusSchema = z.enum([
  'pending', // Awaiting acknowledgments
  'acknowledged', // All parties acknowledged
  'scheduled', // Conversation date set
  'completed', // Conversation finished
  'expired', // Not acknowledged in time
])
export type ConversationStatus = z.infer<typeof conversationStatusSchema>

/** Conversation outcome */
export const conversationOutcomeSchema = z.enum([
  'graduated', // Child graduates from monitoring
  'deferred', // Graduation postponed
  'declined', // Family chooses to continue monitoring
])
export type ConversationOutcome = z.infer<typeof conversationOutcomeSchema>

/** Notification type */
export const graduationNotificationTypeSchema = z.enum([
  'graduation_eligible',
  'acknowledgment_needed',
  'conversation_reminder',
  'conversation_scheduled',
  'conversation_overdue',
])
export type GraduationNotificationType = z.infer<typeof graduationNotificationTypeSchema>

// ============================================
// Schemas
// ============================================

/** Record of acknowledgment by child or parent */
export const acknowledgmentRecordSchema = z.object({
  userId: z.string().min(1),
  role: z.enum(['child', 'parent']),
  acknowledgedAt: z.date(),
  message: z.string().optional(),
})
export type AcknowledgmentRecord = z.infer<typeof acknowledgmentRecordSchema>

/** Graduation conversation tracking */
export const graduationConversationSchema = z.object({
  id: z.string().min(1),
  familyId: z.string().min(1),
  childId: z.string().min(1),
  initiatedAt: z.date(),
  expiresAt: z.date(),
  status: conversationStatusSchema,
  childAcknowledgment: acknowledgmentRecordSchema.nullable(),
  parentAcknowledgments: z.array(acknowledgmentRecordSchema),
  requiredParentIds: z.array(z.string().min(1)),
  scheduledDate: z.date().nullable(),
  completedAt: z.date().nullable(),
  outcome: conversationOutcomeSchema.nullable(),
  remindersSent: z.number().int().min(0).default(0),
  lastReminderAt: z.date().nullable(),
})
export type GraduationConversation = z.infer<typeof graduationConversationSchema>

/** Discussion point in conversation template */
export const discussionPointSchema = z.object({
  topic: z.string().min(1),
  forChild: z.string().min(1),
  forParent: z.string().min(1),
  optional: z.boolean(),
})
export type DiscussionPoint = z.infer<typeof discussionPointSchema>

/** Resource link */
export const resourceSchema = z.object({
  title: z.string().min(1),
  url: z.string().min(1),
  description: z.string().optional(),
})
export type Resource = z.infer<typeof resourceSchema>

/** Conversation template */
export const conversationTemplateSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  introduction: z.string().min(1),
  discussionPoints: z.array(discussionPointSchema),
  suggestedQuestions: z.array(z.string().min(1)),
  closingMessage: z.string().min(1),
  resources: z.array(resourceSchema),
})
export type ConversationTemplate = z.infer<typeof conversationTemplateSchema>

/** Notification content */
export const notificationContentSchema = z.object({
  title: z.string().min(1),
  message: z.string().min(1),
  type: graduationNotificationTypeSchema,
  priority: z.enum(['high', 'normal']),
  actionLabel: z.string().optional(),
  actionUrl: z.string().optional(),
})
export type NotificationContent = z.infer<typeof notificationContentSchema>

/** Input for creating a conversation */
export const createConversationInputSchema = z.object({
  familyId: z.string().min(1),
  childId: z.string().min(1),
  parentIds: z.array(z.string().min(1)).min(1),
})
export type CreateConversationInput = z.infer<typeof createConversationInputSchema>

/** Input for recording acknowledgment */
export const recordAcknowledgmentInputSchema = z.object({
  conversationId: z.string().min(1),
  userId: z.string().min(1),
  role: z.enum(['child', 'parent']),
  message: z.string().optional(),
})
export type RecordAcknowledgmentInput = z.infer<typeof recordAcknowledgmentInputSchema>

/** Input for scheduling conversation */
export const scheduleConversationInputSchema = z.object({
  conversationId: z.string().min(1),
  scheduledDate: z.date(),
})
export type ScheduleConversationInput = z.infer<typeof scheduleConversationInputSchema>

/** Input for completing conversation */
export const completeConversationInputSchema = z.object({
  conversationId: z.string().min(1),
  outcome: conversationOutcomeSchema,
  notes: z.string().optional(),
})
export type CompleteConversationInput = z.infer<typeof completeConversationInputSchema>

// ============================================
// Helper Functions
// ============================================

/**
 * Check if a conversation has all required acknowledgments.
 */
export function hasAllAcknowledgments(conversation: GraduationConversation): boolean {
  // Child must acknowledge
  if (!conversation.childAcknowledgment) {
    return false
  }

  // All required parents must acknowledge
  const acknowledgedParentIds = new Set(conversation.parentAcknowledgments.map((ack) => ack.userId))

  return conversation.requiredParentIds.every((parentId) => acknowledgedParentIds.has(parentId))
}

/**
 * Check if conversation is expired.
 */
export function isConversationExpired(conversation: GraduationConversation): boolean {
  return new Date() > conversation.expiresAt
}

/**
 * Check if conversation is overdue for scheduling.
 * Overdue if acknowledged but not scheduled within 7 days.
 */
export function isConversationOverdue(conversation: GraduationConversation): boolean {
  if (conversation.status !== 'acknowledged') {
    return false
  }

  // Find earliest acknowledgment
  const allAcknowledgments = [
    conversation.childAcknowledgment,
    ...conversation.parentAcknowledgments,
  ].filter((ack): ack is AcknowledgmentRecord => ack !== null)

  if (allAcknowledgments.length === 0) {
    return false
  }

  const latestAck = allAcknowledgments.reduce((latest, current) =>
    current.acknowledgedAt > latest.acknowledgedAt ? current : latest
  )

  const sevenDaysLater = new Date(latestAck.acknowledgedAt)
  sevenDaysLater.setDate(sevenDaysLater.getDate() + 7)

  return new Date() > sevenDaysLater
}

/**
 * Check if a reminder should be sent.
 */
export function shouldSendReminder(conversation: GraduationConversation): boolean {
  if (conversation.status !== 'pending') {
    return false
  }

  const now = new Date()
  const daysSinceInitiated = Math.floor(
    (now.getTime() - conversation.initiatedAt.getTime()) / (1000 * 60 * 60 * 24)
  )

  // Send reminder at 7, 14, 21 days
  const reminderDays = [7, 14, 21]
  const shouldRemind = reminderDays.some(
    (day) => daysSinceInitiated >= day && conversation.remindersSent < reminderDays.indexOf(day) + 1
  )

  return shouldRemind
}

/**
 * Get days remaining until conversation expires.
 */
export function getConversationDaysUntilExpiry(conversation: GraduationConversation): number {
  const now = new Date()
  const diffMs = conversation.expiresAt.getTime() - now.getTime()
  return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)))
}

/**
 * Get missing acknowledgments for a conversation.
 */
export function getMissingAcknowledgments(conversation: GraduationConversation): {
  childMissing: boolean
  missingParentIds: string[]
} {
  const childMissing = conversation.childAcknowledgment === null

  const acknowledgedParentIds = new Set(conversation.parentAcknowledgments.map((ack) => ack.userId))

  const missingParentIds = conversation.requiredParentIds.filter(
    (parentId) => !acknowledgedParentIds.has(parentId)
  )

  return { childMissing, missingParentIds }
}

/**
 * Create initial conversation object.
 */
export function createInitialConversation(
  id: string,
  input: CreateConversationInput
): GraduationConversation {
  const now = new Date()
  const expiresAt = new Date(now)
  expiresAt.setDate(expiresAt.getDate() + CONVERSATION_EXPIRY_DAYS)

  return {
    id,
    familyId: input.familyId,
    childId: input.childId,
    initiatedAt: now,
    expiresAt,
    status: 'pending',
    childAcknowledgment: null,
    parentAcknowledgments: [],
    requiredParentIds: input.parentIds,
    scheduledDate: null,
    completedAt: null,
    outcome: null,
    remindersSent: 0,
    lastReminderAt: null,
  }
}

/**
 * Validate that a scheduled date is valid.
 */
export function isValidScheduleDate(date: Date): boolean {
  const now = new Date()
  const minDate = new Date(now)
  minDate.setDate(minDate.getDate() + MIN_SCHEDULE_LEAD_DAYS)

  return date >= minDate
}

/**
 * Get status display text.
 */
export function getConversationStatusText(
  status: ConversationStatus,
  viewerType: 'child' | 'parent'
): string {
  const statusTexts: Record<ConversationStatus, { child: string; parent: string }> = {
    pending: {
      child: 'Waiting for acknowledgments',
      parent: 'Waiting for all family members to acknowledge',
    },
    acknowledged: {
      child: 'Ready to schedule your graduation conversation',
      parent: 'Ready to schedule the graduation conversation',
    },
    scheduled: {
      child: 'Conversation scheduled',
      parent: 'Conversation scheduled',
    },
    completed: {
      child: 'Conversation completed',
      parent: 'Conversation completed',
    },
    expired: {
      child: 'Conversation window expired',
      parent: 'Conversation window expired - please restart',
    },
  }

  return statusTexts[status][viewerType]
}

/**
 * Get outcome display text.
 */
export function getOutcomeText(
  outcome: ConversationOutcome,
  viewerType: 'child' | 'parent',
  childName?: string
): string {
  const name = childName || 'your child'

  const outcomeTexts: Record<ConversationOutcome, { child: string; parent: string }> = {
    graduated: {
      child: 'Congratulations on graduating from monitoring!',
      parent: `Congratulations! ${name} has graduated from monitoring.`,
    },
    deferred: {
      child: "You've decided to continue for now. You can revisit this anytime.",
      parent: `The family has decided to continue monitoring ${name} for now.`,
    },
    declined: {
      child: 'The graduation was declined. Keep building trust!',
      parent: `The graduation was declined. ${name} can try again in the future.`,
    },
  }

  return outcomeTexts[outcome][viewerType]
}
