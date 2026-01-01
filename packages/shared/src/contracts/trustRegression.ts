/**
 * Trust Regression Contracts - Story 37.6 Task 1
 *
 * Zod schemas and types for trust regression handling.
 * Key principles:
 * - 2-week grace period before any monitoring changes
 * - Conversation-first approach
 * - Child can always explain circumstances
 * - Framed as "let's work on this" not "you failed"
 */

import { z } from 'zod'
import { milestoneTypeSchema } from './developmentalMessaging'

// Regression status enum
export const RegressionStatusSchema = z.enum([
  'grace_period', // Within 2-week grace period
  'awaiting_conversation', // Grace expired, waiting for parent-child talk
  'resolved', // Regression addressed, staying at current level
  'reverted', // After conversation, decided to revert monitoring
])

export type RegressionStatus = z.infer<typeof RegressionStatusSchema>

/**
 * Trust regression configuration schema.
 * Defines how regression events are handled.
 */
export const TrustRegressionConfigSchema = z.object({
  /** Grace period in days before monitoring can change (default: 14) */
  gracePeriodDays: z.number().min(7).max(30).default(14),
  /** Always require conversation before changes */
  conversationFirst: z.literal(true).default(true),
  /** Always allow child to explain */
  childCanExplain: z.literal(true).default(true),
  /** Whether monitoring auto-reverts after grace if no resolution */
  autoRevertAfterGrace: z.boolean().default(false),
})

export type TrustRegressionConfig = z.infer<typeof TrustRegressionConfigSchema>

/**
 * Regression event schema.
 * Tracks a single regression occurrence and its resolution.
 */
export const RegressionEventSchema = z.object({
  /** Unique event ID */
  id: z.string().uuid(),
  /** Child's ID */
  childId: z.string().min(1),
  /** Previous (higher) milestone */
  previousMilestone: milestoneTypeSchema,
  /** Current (lower) milestone */
  currentMilestone: milestoneTypeSchema,
  /** When regression was detected */
  occurredAt: z.date(),
  /** When grace period expires */
  graceExpiresAt: z.date(),
  /** Current status */
  status: RegressionStatusSchema,
  /** Child's explanation (if provided) */
  childExplanation: z.string().optional(),
  /** Whether parent-child conversation has occurred */
  conversationHeld: z.boolean().default(false),
  /** When conversation was held */
  conversationHeldAt: z.date().optional(),
  /** When status was last updated */
  updatedAt: z.date(),
  /** Parent notes about conversation */
  parentNotes: z.string().optional(),
})

export type RegressionEvent = z.infer<typeof RegressionEventSchema>

/**
 * Regression notification schema.
 * Structure for regression-related notifications.
 */
export const RegressionNotificationSchema = z.object({
  /** Notification title */
  title: z.string(),
  /** Main message */
  message: z.string(),
  /** Supportive context */
  supportiveContext: z.string(),
  /** Call to action */
  callToAction: z.string(),
  /** Who receives this */
  viewerType: z.enum(['child', 'parent']),
  /** Event ID reference */
  eventId: z.string().uuid().optional(),
  /** Days remaining in grace period */
  graceDaysRemaining: z.number().optional(),
})

export type RegressionNotification = z.infer<typeof RegressionNotificationSchema>

/**
 * Child explanation input schema.
 * What the child provides when explaining circumstances.
 */
export const ChildExplanationInputSchema = z.object({
  /** Child's explanation text */
  explanation: z.string().min(1).max(2000),
  /** When explanation was provided */
  providedAt: z.date(),
})

export type ChildExplanationInput = z.infer<typeof ChildExplanationInputSchema>

/**
 * Conversation record schema.
 * Tracks that parent-child conversation occurred.
 */
export const ConversationRecordSchema = z.object({
  /** Event ID */
  eventId: z.string().uuid(),
  /** When conversation was held */
  heldAt: z.date(),
  /** Parent's notes (optional) */
  parentNotes: z.string().max(2000).optional(),
  /** Outcome: resolve or revert */
  outcome: z.enum(['resolve', 'revert', 'pending']),
})

export type ConversationRecord = z.infer<typeof ConversationRecordSchema>

// Default configuration
export const DEFAULT_REGRESSION_CONFIG: TrustRegressionConfig = {
  gracePeriodDays: 14, // 2 weeks
  conversationFirst: true,
  childCanExplain: true,
  autoRevertAfterGrace: false,
}

// Factory functions
export function createDefaultRegressionConfig(): TrustRegressionConfig {
  return { ...DEFAULT_REGRESSION_CONFIG }
}

export function createRegressionEvent(input: {
  id: string
  childId: string
  previousMilestone: string
  currentMilestone: string
  gracePeriodDays?: number
}): RegressionEvent {
  const now = new Date()
  const graceDays = input.gracePeriodDays ?? 14
  const graceExpires = new Date(now.getTime() + graceDays * 24 * 60 * 60 * 1000)

  return {
    id: input.id,
    childId: input.childId,
    previousMilestone: input.previousMilestone as RegressionEvent['previousMilestone'],
    currentMilestone: input.currentMilestone as RegressionEvent['currentMilestone'],
    occurredAt: now,
    graceExpiresAt: graceExpires,
    status: 'grace_period',
    conversationHeld: false,
    updatedAt: now,
  }
}

/**
 * Validate that regression is valid (previous > current milestone).
 */
export function validateRegression(previousMilestone: string, currentMilestone: string): boolean {
  const milestoneOrder = ['growing', 'maturing', 'readyForIndependence']
  const prevIndex = milestoneOrder.indexOf(previousMilestone)
  const currIndex = milestoneOrder.indexOf(currentMilestone)

  // Valid regression: previous milestone is higher than current
  return prevIndex > currIndex && prevIndex !== -1 && currIndex !== -1
}

/**
 * Calculate days remaining in grace period.
 */
export function calculateGraceDaysRemaining(event: RegressionEvent): number {
  const now = new Date()
  const diffMs = event.graceExpiresAt.getTime() - now.getTime()
  return Math.max(0, Math.ceil(diffMs / (24 * 60 * 60 * 1000)))
}

/**
 * Check if event is in grace period.
 */
export function isInGracePeriod(event: RegressionEvent): boolean {
  return event.status === 'grace_period' && calculateGraceDaysRemaining(event) > 0
}

/**
 * Check if conversation is required before any monitoring changes.
 */
export function isConversationRequired(event: RegressionEvent): boolean {
  return !event.conversationHeld && event.status !== 'resolved'
}

/**
 * Supportive messaging constants.
 */
export const REGRESSION_MESSAGES = {
  childTitle: "Let's Talk",
  childMessage:
    "Something happened that we should discuss together. This isn't about punishment - it's about understanding and support.",
  childSupportive: "Your perspective matters. Take your time to share what's going on.",
  childCallToAction: 'Share Your Thoughts',

  parentTitle: 'Conversation Needed',
  parentMessage:
    "Your child's trust score has changed. This is an opportunity for a supportive conversation, not automatic changes.",
  parentSupportive:
    'A 2-week grace period allows time for understanding before any monitoring adjustments.',
  parentCallToAction: 'Start Conversation',

  gracePeriodExplainer:
    'During this 2-week period, monitoring stays the same while you have time to talk.',
  noAutoChanges: 'No automatic changes will happen without a parent-child conversation.',
  letWorkOnThis: "Let's work on this together",
  notPunishment: "This isn't punishment - it's support",
  yourExplanationMatters: 'Your explanation matters',
}
