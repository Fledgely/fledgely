/**
 * Graduation Eligibility Contracts - Story 38.1 Task 1
 *
 * Zod schemas and types for graduation eligibility tracking.
 * Key requirement: 100% trust for 12 consecutive months (FR38A)
 */

import { z } from 'zod'

// FR38A constants
export const GRADUATION_TRUST_THRESHOLD = 100
export const GRADUATION_DURATION_MONTHS = 12

/**
 * Graduation eligibility configuration schema.
 */
export const GraduationEligibilityConfigSchema = z.object({
  /** Required trust score threshold (default: 100) */
  trustScoreThreshold: z.number().min(0).max(100).default(GRADUATION_TRUST_THRESHOLD),
  /** Required duration in months at threshold (default: 12) */
  durationMonths: z.number().min(1).max(24).default(GRADUATION_DURATION_MONTHS),
  /** How often eligibility is checked */
  checkInterval: z.enum(['daily', 'weekly']).default('daily'),
})

export type GraduationEligibilityConfig = z.infer<typeof GraduationEligibilityConfigSchema>

/**
 * Trust score history entry for eligibility calculations.
 */
export const TrustScoreHistoryEntrySchema = z.object({
  /** Date of the score */
  date: z.date(),
  /** Trust score on that date (0-100) */
  score: z.number().min(0).max(100),
  /** Child ID */
  childId: z.string().min(1),
})

export type TrustScoreHistoryEntry = z.infer<typeof TrustScoreHistoryEntrySchema>

/**
 * Graduation eligibility status schema.
 * Tracks child's progress toward graduation.
 */
export const GraduationEligibilityStatusSchema = z.object({
  /** Child's ID */
  childId: z.string().min(1),
  /** Current trust score */
  currentTrustScore: z.number().min(0).max(100),
  /** Months at perfect (100%) trust */
  monthsAtPerfectTrust: z.number().min(0),
  /** Projected date when child will become eligible (if maintaining) */
  eligibilityDate: z.date().nullable(),
  /** Whether child is currently eligible for graduation */
  isEligible: z.boolean(),
  /** Progress percentage (0-100) toward 12-month goal */
  progressPercentage: z.number().min(0).max(100),
  /** When current streak started */
  streakStartDate: z.date().nullable(),
  /** When eligibility was last calculated */
  lastCheckedAt: z.date(),
})

export type GraduationEligibilityStatus = z.infer<typeof GraduationEligibilityStatusSchema>

/**
 * Graduation milestone schema.
 * Milestone markers at 3, 6, 9, and 12 months.
 */
export const GraduationMilestoneSchema = z.object({
  /** Month number (3, 6, 9, 12) */
  month: z.number(),
  /** Display label */
  label: z.string(),
  /** Whether reached */
  reached: z.boolean(),
  /** When reached (if applicable) */
  reachedAt: z.date().optional(),
  /** Celebration message */
  celebrationMessage: z.string().optional(),
})

export type GraduationMilestone = z.infer<typeof GraduationMilestoneSchema>

/**
 * Streak break event schema.
 * Tracks when a perfect trust streak is broken.
 */
export const StreakBreakEventSchema = z.object({
  /** Child's ID */
  childId: z.string().min(1),
  /** When streak was broken */
  breakDate: z.date(),
  /** Score that broke the streak */
  breakingScore: z.number().min(0).max(100),
  /** How many months were lost */
  monthsLost: z.number().min(0),
  /** Previous streak start date */
  previousStreakStart: z.date(),
})

export type StreakBreakEvent = z.infer<typeof StreakBreakEventSchema>

// Default configuration
export const DEFAULT_GRADUATION_CONFIG: GraduationEligibilityConfig = {
  trustScoreThreshold: GRADUATION_TRUST_THRESHOLD,
  durationMonths: GRADUATION_DURATION_MONTHS,
  checkInterval: 'daily',
}

/**
 * Create default graduation eligibility config.
 */
export function createDefaultGraduationConfig(): GraduationEligibilityConfig {
  return { ...DEFAULT_GRADUATION_CONFIG }
}

/**
 * Create initial graduation eligibility status.
 */
export function createInitialEligibilityStatus(childId: string): GraduationEligibilityStatus {
  return {
    childId,
    currentTrustScore: 0,
    monthsAtPerfectTrust: 0,
    eligibilityDate: null,
    isEligible: false,
    progressPercentage: 0,
    streakStartDate: null,
    lastCheckedAt: new Date(),
  }
}

/**
 * Calculate progress percentage from months.
 */
export function calculateProgressPercentage(
  monthsAtPerfect: number,
  requiredMonths: number = GRADUATION_DURATION_MONTHS
): number {
  return Math.min(100, Math.round((monthsAtPerfect / requiredMonths) * 100 * 10) / 10)
}

/**
 * Get graduation milestones with current progress.
 */
export function getGraduationMilestones(monthsCompleted: number): GraduationMilestone[] {
  const milestoneMonths = [3, 6, 9, 12]

  return milestoneMonths.map((month) => ({
    month,
    label: `${month} months`,
    reached: monthsCompleted >= month,
    celebrationMessage: monthsCompleted >= month ? getMilestoneCelebration(month) : undefined,
  }))
}

/**
 * Get celebration message for reaching a milestone.
 */
function getMilestoneCelebration(month: number): string {
  switch (month) {
    case 3:
      return "Great start! You've maintained perfect trust for 3 months."
    case 6:
      return 'Halfway there! 6 months of consistent responsibility.'
    case 9:
      return 'Almost there! Just 3 more months to graduation eligibility.'
    case 12:
      return "Congratulations! You've reached graduation eligibility."
    default:
      return `${month} months of perfect trust achieved.`
  }
}

/**
 * Check if a score qualifies as "perfect trust".
 */
export function isPerfectTrust(score: number): boolean {
  return score >= GRADUATION_TRUST_THRESHOLD
}

/**
 * Validate trust score history for eligibility calculation.
 */
export function validateTrustScoreHistory(history: TrustScoreHistoryEntry[]): {
  valid: boolean
  issues: string[]
} {
  const issues: string[] = []

  if (history.length === 0) {
    issues.push('Trust score history is empty')
    return { valid: false, issues }
  }

  // Check all entries have same childId
  const childIds = new Set(history.map((h) => h.childId))
  if (childIds.size > 1) {
    issues.push('Trust score history contains entries for multiple children')
  }

  // Check entries are in chronological order
  for (let i = 1; i < history.length; i++) {
    if (history[i].date.getTime() < history[i - 1].date.getTime()) {
      issues.push('Trust score history is not in chronological order')
      break
    }
  }

  return { valid: issues.length === 0, issues }
}

/**
 * Supportive messaging for graduation progress.
 */
export const GRADUATION_MESSAGES = {
  // Child-facing messages
  pathIntro: 'Your path to graduation: maintain 100% trust for 12 months',
  progressTemplate: '{months} months at 100% trust - {remaining} months to graduation eligibility',
  halfwayPoint: 'Halfway there! 6 months at 100% trust',
  almostThere: '9 months at 100% trust - 3 months to graduation eligibility',
  eligible: "Congratulations! You've reached graduation eligibility",

  // Parent-facing messages
  parentPathIntro: "{childName}'s path to graduation: 12 months at 100% trust",
  parentProgress: '{childName} has maintained 100% trust for {months} months',
  parentEligible: '{childName} has reached graduation eligibility',

  // Streak break messages (supportive, not punitive)
  streakBreakChild: 'Your path continues - maintain 100% trust to resume progress',
  streakBreakParent: "{childName}'s graduation progress paused - the journey continues",

  // Eligibility explanation
  eligibilityExplainer:
    "Reaching eligibility means it's time for a graduation conversation with your family",
  notAutomatic: 'Eligibility triggers a conversation, not automatic graduation',
}
