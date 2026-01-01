/**
 * MilestoneFrequency Data Model - Story 37.2 Task 1
 *
 * Milestone-based screenshot frequency configuration.
 * AC1: Growing milestone (80+) reduces frequency to every 15 minutes
 * AC2: Maturing milestone (90+) reduces frequency to every 30 minutes
 * AC3: Ready for Independence (95+) enables hourly frequency option
 *
 * Philosophy: Privacy grows naturally with demonstrated maturity.
 * Frequency reduction is RECOGNITION of growth, not a reward.
 */

import { z } from 'zod'
import { trustMilestoneLevelSchema, type TrustMilestoneLevel } from './trustMilestone'

// ============================================================================
// Constants
// ============================================================================

/** Default screenshot frequency (no milestone achieved) */
export const DEFAULT_FREQUENCY_MINUTES = 5

/** Screenshot frequency in minutes for each milestone level */
export const MILESTONE_FREQUENCIES: Record<TrustMilestoneLevel, number> = {
  growing: 15, // 3x less frequent than default
  maturing: 30, // 6x less frequent than default
  'ready-for-independence': 60, // 12x less frequent than default (hourly)
}

// ============================================================================
// Schemas
// ============================================================================

/**
 * Configuration for milestone-based frequency.
 */
export const milestoneFrequencyConfigSchema = z.object({
  /** Milestone level for this configuration */
  milestoneLevel: trustMilestoneLevelSchema,
  /** Screenshot frequency in minutes */
  frequencyMinutes: z.number().min(1),
  /** Human-readable description */
  description: z.string().min(1),
})

export type MilestoneFrequencyConfig = z.infer<typeof milestoneFrequencyConfigSchema>

/**
 * Record of frequency change for a child.
 */
export const frequencyChangeRecordSchema = z.object({
  /** Child this change applies to */
  childId: z.string(),
  /** Previous frequency in minutes */
  previousFrequencyMinutes: z.number().min(1),
  /** New frequency in minutes */
  newFrequencyMinutes: z.number().min(1),
  /** Milestone that triggered this change */
  triggeredByMilestone: trustMilestoneLevelSchema.nullable(),
  /** When the change occurred */
  changedAt: z.date(),
})

export type FrequencyChangeRecord = z.infer<typeof frequencyChangeRecordSchema>

// ============================================================================
// Functions
// ============================================================================

/**
 * Get the screenshot frequency for a given milestone level.
 *
 * @param milestone - The milestone level (null if none)
 * @returns Frequency in minutes
 */
export function getFrequencyForMilestone(milestone: TrustMilestoneLevel | null): number {
  if (milestone === null) {
    return DEFAULT_FREQUENCY_MINUTES
  }
  return MILESTONE_FREQUENCIES[milestone]
}

/**
 * Get a child-friendly description of the frequency for a milestone.
 *
 * @param milestone - The milestone level (null if none)
 * @returns Human-readable description
 */
export function getFrequencyDescription(milestone: TrustMilestoneLevel | null): string {
  const frequency = getFrequencyForMilestone(milestone)

  if (frequency >= 60) {
    const hours = frequency / 60
    return hours === 1
      ? 'Screenshots about once per hour - recognizing your growing independence!'
      : `Screenshots about once every ${hours} hours`
  }

  if (milestone === null) {
    return `Screenshots every ${frequency} minutes`
  }

  return `Screenshots every ${frequency} minutes - fewer screenshots as we recognize your growth!`
}

/**
 * Calculate the frequency reduction ratio compared to default.
 *
 * @param milestone - The milestone level (null if none)
 * @returns Reduction ratio (e.g., 3 means 3x less frequent)
 */
export function getFrequencyReductionRatio(milestone: TrustMilestoneLevel | null): number {
  if (milestone === null) {
    return 1
  }
  return MILESTONE_FREQUENCIES[milestone] / DEFAULT_FREQUENCY_MINUTES
}

/**
 * Get all frequency configurations as an array.
 *
 * @returns Array of frequency configurations
 */
export function getAllFrequencyConfigs(): MilestoneFrequencyConfig[] {
  const levels: TrustMilestoneLevel[] = ['growing', 'maturing', 'ready-for-independence']

  return levels.map((level) => ({
    milestoneLevel: level,
    frequencyMinutes: MILESTONE_FREQUENCIES[level],
    description: getFrequencyDescription(level),
  }))
}
