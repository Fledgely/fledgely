/**
 * Proportionality Check Contracts - Story 38.4 Task 1
 *
 * Zod schemas and types for the annual proportionality check system.
 * AC1: Annual prompt triggered after 12+ months of active monitoring (FR-CR4)
 *
 * The proportionality check ensures monitoring level matches developmental stage
 * and doesn't outlast its necessity.
 */

import { z } from 'zod'

// ============================================
// Configuration Constants
// ============================================

/** Months between proportionality checks */
export const PROPORTIONALITY_CHECK_INTERVAL_MONTHS = 12

/** Days before an incomplete check expires */
export const CHECK_EXPIRY_DAYS = 14

/** Days before sending a reminder for incomplete check */
export const REMINDER_AFTER_DAYS = 7

// ============================================
// Enum Schemas
// ============================================

/**
 * What triggered the proportionality check.
 * - annual: Triggered by 12-month anniversary
 * - manual: Triggered by family request
 * - system: Triggered by system event (e.g., major trust change)
 */
export const checkTriggerSchema = z.enum(['annual', 'manual', 'system'])
export type CheckTrigger = z.infer<typeof checkTriggerSchema>

/**
 * Status of the proportionality check.
 * - pending: Check created but not yet started
 * - in_progress: At least one party has responded
 * - completed: All parties have responded
 * - expired: Check expired without completion
 */
export const checkStatusSchema = z.enum(['pending', 'in_progress', 'completed', 'expired'])
export type CheckStatus = z.infer<typeof checkStatusSchema>

/**
 * Response choices for the core "Is monitoring appropriate?" question.
 * - appropriate: Current monitoring is appropriate
 * - reduce: Monitoring should be reduced
 * - increase: Monitoring should be increased
 * - discuss: Need to discuss as a family
 * - graduate: Ready to graduate from monitoring
 */
export const responseChoiceSchema = z.enum([
  'appropriate',
  'reduce',
  'increase',
  'discuss',
  'graduate',
])
export type ResponseChoice = z.infer<typeof responseChoiceSchema>

/**
 * Response for external risk change question.
 */
export const riskChangeSchema = z.enum(['decreased', 'same', 'increased'])
export type RiskChange = z.infer<typeof riskChangeSchema>

/**
 * Types of disagreement between family members.
 * - child_wants_less: Child wants reduced monitoring, parent disagrees
 * - parent_wants_more: Parent wants more monitoring, child comfortable
 * - mixed: Multiple parents have different opinions
 */
export const disagreementTypeSchema = z.enum(['child_wants_less', 'parent_wants_more', 'mixed'])
export type DisagreementType = z.infer<typeof disagreementTypeSchema>

/**
 * Types of suggestions that can be generated.
 */
export const suggestionTypeSchema = z.enum([
  'reduce_monitoring',
  'maintain',
  'graduation_eligible',
  'consider_discussion',
])
export type SuggestionType = z.infer<typeof suggestionTypeSchema>

/**
 * Priority levels for suggestions.
 */
export const suggestionPrioritySchema = z.enum(['high', 'medium', 'low'])
export type SuggestionPriority = z.infer<typeof suggestionPrioritySchema>

// ============================================
// Core Schemas
// ============================================

/**
 * ProportionalityCheck - The main check record.
 *
 * Tracks a single proportionality check instance for a child.
 * Created annually after 12+ months of monitoring.
 */
export const proportionalityCheckSchema = z.object({
  id: z.string().min(1),
  familyId: z.string().min(1),
  childId: z.string().min(1),
  triggerType: checkTriggerSchema,
  status: checkStatusSchema,
  monitoringStartDate: z.date(),
  checkDueDate: z.date(),
  checkCompletedDate: z.date().nullable(),
  expiresAt: z.date(),
  createdAt: z.date(),
})
export type ProportionalityCheck = z.infer<typeof proportionalityCheckSchema>

/**
 * ProportionalityResponse - A single response from a family member.
 *
 * AC5: Responses are always private - parent and child cannot see each other's responses.
 */
export const proportionalityResponseSchema = z.object({
  id: z.string().min(1),
  checkId: z.string().min(1),
  respondentId: z.string().min(1),
  respondentRole: z.enum(['child', 'parent']),

  // Core question (AC2)
  isMonitoringAppropriate: responseChoiceSchema,

  // Additional questions (AC3)
  hasExternalRiskChanged: riskChangeSchema.nullable(),
  hasMaturityIncreased: z.boolean().nullable(),

  // Optional feedback
  freeformFeedback: z.string().nullable(),
  suggestedChanges: z.array(z.string()),

  respondedAt: z.date(),
  isPrivate: z.literal(true), // Always true - responses are private (AC5)
})
export type ProportionalityResponse = z.infer<typeof proportionalityResponseSchema>

/**
 * ProportionalitySuggestion - AI-generated suggestion based on responses.
 *
 * AC4: Suggestions based on age and trust score.
 */
export const proportionalitySuggestionSchema = z.object({
  type: suggestionTypeSchema,
  title: z.string().min(1),
  description: z.string().min(1),
  basedOn: z.object({
    childAge: z.number().min(0),
    trustScore: z.number().min(0).max(100),
    monthsMonitored: z.number().min(0),
    trustMilestone: z.string().nullable(),
  }),
  priority: suggestionPrioritySchema,
})
export type ProportionalitySuggestion = z.infer<typeof proportionalitySuggestionSchema>

/**
 * ParentResponseRecord - Records a parent's response within a disagreement.
 */
export const parentResponseRecordSchema = z.object({
  parentId: z.string().min(1),
  response: responseChoiceSchema,
})
export type ParentResponseRecord = z.infer<typeof parentResponseRecordSchema>

/**
 * DisagreementRecord - Tracks disagreement between family members.
 *
 * AC6: Disagreement surfaces for family conversation.
 */
export const disagreementRecordSchema = z.object({
  id: z.string().min(1),
  checkId: z.string().min(1),
  familyId: z.string().min(1),
  childId: z.string().min(1),
  childResponse: responseChoiceSchema,
  parentResponses: z.array(parentResponseRecordSchema),
  disagreementType: disagreementTypeSchema,
  surfacedAt: z.date(),
  resolvedAt: z.date().nullable(),
  resolution: z.string().nullable(),
})
export type DisagreementRecord = z.infer<typeof disagreementRecordSchema>

// ============================================
// Helper Functions
// ============================================

/**
 * Calculate expiry date for a check.
 */
export function calculateCheckExpiryDate(createdAt: Date): Date {
  const expiry = new Date(createdAt)
  expiry.setDate(expiry.getDate() + CHECK_EXPIRY_DAYS)
  return expiry
}

/**
 * Calculate reminder date for a check.
 */
export function calculateReminderDate(createdAt: Date): Date {
  const reminder = new Date(createdAt)
  reminder.setDate(reminder.getDate() + REMINDER_AFTER_DAYS)
  return reminder
}

/**
 * Check if a check has expired.
 */
export function isCheckExpired(check: ProportionalityCheck): boolean {
  return new Date() > check.expiresAt && check.status !== 'completed'
}

/**
 * Check if a check is due for a reminder.
 */
export function isCheckDueForReminder(check: ProportionalityCheck): boolean {
  if (check.status === 'completed' || check.status === 'expired') {
    return false
  }
  const reminderDate = calculateReminderDate(check.createdAt)
  return new Date() >= reminderDate
}

/**
 * Create initial proportionality check.
 */
export function createInitialCheck(
  id: string,
  familyId: string,
  childId: string,
  monitoringStartDate: Date,
  triggerType: CheckTrigger = 'annual'
): ProportionalityCheck {
  const now = new Date()
  return {
    id,
    familyId,
    childId,
    triggerType,
    status: 'pending',
    monitoringStartDate,
    checkDueDate: now,
    checkCompletedDate: null,
    expiresAt: calculateCheckExpiryDate(now),
    createdAt: now,
  }
}
