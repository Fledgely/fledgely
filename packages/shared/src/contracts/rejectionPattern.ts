/**
 * RejectionPattern Schemas - Story 34.5.1 Task 2
 *
 * Zod schemas for rejection pattern tracking.
 * AC4: Privacy-Preserving Tracking
 * AC5: Family Communication Metrics
 *
 * CRITICAL SAFETY:
 * - Privacy-preserving: Only aggregate patterns tracked
 * - No proposal content stored in events
 * - Child rights: Surface communication breakdowns
 */

import { z } from 'zod'

// ============================================
// Constants
// ============================================

/**
 * Default window for rejection pattern analysis (90 days).
 */
export const REJECTION_WINDOW_DAYS = 90

/**
 * Default threshold for escalation (3 rejections within window).
 */
export const REJECTION_THRESHOLD = 3

// ============================================
// Schemas
// ============================================

/**
 * Rejection pattern schema.
 * Aggregate data per child - family-visible.
 */
export const rejectionPatternSchema = z.object({
  /** Unique pattern identifier */
  id: z.string(),
  /** Family ID */
  familyId: z.string(),
  /** Child ID */
  childId: z.string(),
  /** Total proposals submitted by child */
  totalProposals: z.number().int().min(0),
  /** Total rejections received */
  totalRejections: z.number().int().min(0),
  /** Rejections within the rolling window */
  rejectionsInWindow: z.number().int().min(0),
  /** Last proposal timestamp */
  lastProposalAt: z.date().nullable(),
  /** Last rejection timestamp */
  lastRejectionAt: z.date().nullable(),
  /** Whether escalation has been triggered */
  escalationTriggered: z.boolean(),
  /** When escalation was triggered */
  escalationTriggeredAt: z.date().nullable(),
  /** When pattern was created */
  createdAt: z.date(),
  /** When pattern was last updated */
  updatedAt: z.date(),
})

/**
 * Rejection event schema (privacy-preserving).
 * Individual event - system-only for privacy.
 * CRITICAL: No proposal content stored.
 */
export const rejectionEventSchema = z.object({
  /** Unique event identifier */
  id: z.string(),
  /** Family ID */
  familyId: z.string(),
  /** Child ID */
  childId: z.string(),
  /** Proposal ID reference only (no content) */
  proposalId: z.string(),
  /** When rejected */
  rejectedAt: z.date(),
})

/**
 * Escalation event schema.
 * Threshold breach events - family-visible.
 */
export const escalationEventSchema = z.object({
  /** Unique event identifier */
  id: z.string(),
  /** Family ID */
  familyId: z.string(),
  /** Child ID */
  childId: z.string(),
  /** When escalation was triggered */
  triggeredAt: z.date(),
  /** Number of rejections that triggered escalation */
  rejectionsCount: z.number().int().min(0),
  /** Window period in days */
  windowDays: z.number().int().min(0),
  /** Whether escalation has been acknowledged */
  acknowledged: z.boolean(),
  /** When acknowledged */
  acknowledgedAt: z.date().nullable(),
})

// ============================================
// Types
// ============================================

export type RejectionPattern = z.infer<typeof rejectionPatternSchema>
export type RejectionEvent = z.infer<typeof rejectionEventSchema>
export type EscalationEvent = z.infer<typeof escalationEventSchema>
