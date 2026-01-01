/**
 * Trust Milestone Types and Constants - Story 37.1 Task 1
 *
 * Data model for trust milestones that trigger monitoring adjustments.
 * AC1: Milestones defined: 80 (Growing), 90 (Maturing), 95 (Ready for independence)
 * AC2: Duration requirement: score maintained for 30+ days
 *
 * Philosophy: Privacy is a RIGHT - milestones recognize maturity, not reward behavior.
 * Language: "We're recognizing your growth" not "You've earned this"
 */

import { z } from 'zod'

// ============================================================================
// Constants
// ============================================================================

/** Number of consecutive days required to achieve a milestone */
export const MILESTONE_DURATION_DAYS = 30

/** Threshold scores for each milestone level */
export const MILESTONE_THRESHOLDS = {
  growing: 80,
  maturing: 90,
  'ready-for-independence': 95,
} as const

// ============================================================================
// Milestone Level Schema
// ============================================================================

/**
 * Trust milestone levels representing stages of recognized maturity.
 *
 * - growing: Beginning to show consistent responsibility
 * - maturing: Demonstrated sustained responsibility
 * - ready-for-independence: Approaching graduation from monitoring
 */
export const trustMilestoneLevelSchema = z.enum(['growing', 'maturing', 'ready-for-independence'])

export type TrustMilestoneLevel = z.infer<typeof trustMilestoneLevelSchema>

// ============================================================================
// Trust Milestone Schema
// ============================================================================

/**
 * A trust milestone that unlocks privacy benefits.
 * Uses developmental framing - privacy as recognition, not reward.
 */
export const trustMilestoneSchema = z.object({
  /** Milestone level identifier */
  level: trustMilestoneLevelSchema,
  /** Trust score threshold to reach this milestone */
  threshold: z.number().min(0).max(100),
  /** Consecutive days required at or above threshold */
  durationDays: z.number().min(1),
  /** Developmental description (recognition, not reward) */
  description: z.string().min(1),
  /** Benefits unlocked at this milestone */
  benefits: z.array(z.string()).min(1),
})

export type TrustMilestone = z.infer<typeof trustMilestoneSchema>

// ============================================================================
// Milestone History Entry Schema
// ============================================================================

/**
 * Historical record of milestone transitions.
 * Tracks when milestones were achieved or lost.
 */
export const milestoneHistoryEntrySchema = z.object({
  /** When the transition occurred */
  date: z.date(),
  /** Previous milestone (null if no previous milestone) */
  fromMilestone: trustMilestoneLevelSchema.nullable(),
  /** New milestone (null if regressed to no milestone) */
  toMilestone: trustMilestoneLevelSchema.nullable(),
  /** Reason for transition (uses compassionate language for regression) */
  reason: z.string(),
})

export type MilestoneHistoryEntry = z.infer<typeof milestoneHistoryEntrySchema>

// ============================================================================
// Child Milestone Status Schema
// ============================================================================

/**
 * Complete milestone status for a child.
 * Tracks current milestone, history, and progress toward next milestone.
 */
export const childMilestoneStatusSchema = z.object({
  /** Child this status belongs to */
  childId: z.string(),
  /** Current milestone level (null if none achieved) */
  currentMilestone: trustMilestoneLevelSchema.nullable(),
  /** History of milestone transitions */
  milestoneHistory: z.array(milestoneHistoryEntrySchema),
  /** When the current streak started (null if no active streak) */
  streakStartDate: z.date().nullable(),
  /** Number of consecutive days at current threshold level */
  consecutiveDays: z.number().min(0),
})

export type ChildMilestoneStatus = z.infer<typeof childMilestoneStatusSchema>

// ============================================================================
// Milestone Definitions
// ============================================================================

/**
 * All trust milestones with their definitions.
 * Uses developmental framing - recognizing growth, not rewarding behavior.
 */
export const TRUST_MILESTONES: TrustMilestone[] = [
  {
    level: 'growing',
    threshold: MILESTONE_THRESHOLDS.growing,
    durationDays: MILESTONE_DURATION_DAYS,
    description: 'Beginning to show consistent responsibility and growth',
    benefits: [
      'Reduced screenshot frequency (every 15 minutes instead of every 5)',
      'Recognition notification sent to celebrate growth',
    ],
  },
  {
    level: 'maturing',
    threshold: MILESTONE_THRESHOLDS.maturing,
    durationDays: MILESTONE_DURATION_DAYS,
    description: 'Demonstrating sustained responsibility and maturing judgment',
    benefits: [
      'Further reduced screenshot frequency (every 30 minutes)',
      'Simplified daily summaries for parents',
      'Recognition of growing independence',
    ],
  },
  {
    level: 'ready-for-independence',
    threshold: MILESTONE_THRESHOLDS['ready-for-independence'],
    durationDays: MILESTONE_DURATION_DAYS,
    description: 'Approaching full independence with demonstrated maturity',
    benefits: [
      'Notification-only mode available',
      'Hourly or less frequent screenshots',
      'Near-graduation status recognition',
      'Maximum privacy within family agreement',
    ],
  },
]

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get a milestone by its level.
 *
 * @param level - The milestone level to find
 * @returns The milestone or undefined if not found
 */
export function getMilestoneByLevel(level: TrustMilestoneLevel): TrustMilestone | undefined {
  return TRUST_MILESTONES.find((m) => m.level === level)
}

/**
 * Get all milestones sorted by threshold (ascending).
 *
 * @returns Array of milestones sorted by threshold
 */
export function getMilestonesSortedByThreshold(): TrustMilestone[] {
  return [...TRUST_MILESTONES].sort((a, b) => a.threshold - b.threshold)
}

/**
 * Get the next milestone after the given level.
 *
 * @param currentLevel - Current milestone level (null if none)
 * @returns The next milestone or undefined if at highest
 */
export function getNextMilestone(
  currentLevel: TrustMilestoneLevel | null
): TrustMilestone | undefined {
  const sorted = getMilestonesSortedByThreshold()

  if (currentLevel === null) {
    return sorted[0]
  }

  const currentIndex = sorted.findIndex((m) => m.level === currentLevel)
  if (currentIndex === -1 || currentIndex === sorted.length - 1) {
    return undefined
  }

  return sorted[currentIndex + 1]
}
