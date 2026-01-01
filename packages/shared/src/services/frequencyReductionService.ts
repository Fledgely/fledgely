/**
 * FrequencyReductionService - Story 37.2 Task 2
 *
 * Service for calculating and applying frequency reductions.
 * AC1: Growing milestone reduces to 15 minutes
 * AC2: Maturing milestone reduces to 30 minutes
 * AC3: Ready for Independence reduces to 60 minutes
 * AC4: Changes apply automatically upon milestone achievement
 *
 * Philosophy: Privacy grows naturally with demonstrated maturity.
 */

import type { TrustMilestoneLevel } from '../contracts/trustMilestone'
import { getFrequencyForMilestone } from '../contracts/milestoneFrequency'

// ============================================================================
// Types
// ============================================================================

export interface FrequencyChange {
  /** Child this change applies to */
  childId: string
  /** Previous frequency in minutes */
  previousFrequency: number
  /** New frequency in minutes */
  newFrequency: number
  /** Minutes of reduction (positive = less frequent) */
  reductionMinutes: number
  /** Whether this is a reduction (true) or increase (false) */
  isReduction: boolean
  /** Previous milestone level */
  previousMilestone: TrustMilestoneLevel | null
  /** New milestone level */
  newMilestone: TrustMilestoneLevel | null
}

export interface FrequencyUpdate {
  /** Child this update applies to */
  childId: string
  /** New frequency in minutes */
  newFrequencyMinutes: number
  /** Previous frequency in minutes */
  previousFrequencyMinutes: number
  /** Milestone that triggered this update */
  appliedMilestone: TrustMilestoneLevel | null
  /** Previous milestone */
  previousMilestone: TrustMilestoneLevel | null
  /** When the update was applied */
  appliedAt: Date
  /** Whether the update was successful */
  success: boolean
  /** The frequency change details */
  change: FrequencyChange
  /** Percentage reduction in screenshots */
  reductionPercentage: number
}

// ============================================================================
// Core Functions
// ============================================================================

/**
 * Calculate the frequency change for a milestone transition.
 *
 * @param childId - Child this change applies to
 * @param previousMilestone - Previous milestone level
 * @param newMilestone - New milestone level
 * @returns Frequency change details
 */
export function calculateFrequencyChange(
  childId: string,
  previousMilestone: TrustMilestoneLevel | null,
  newMilestone: TrustMilestoneLevel | null
): FrequencyChange {
  const previousFrequency = getFrequencyForMilestone(previousMilestone)
  const newFrequency = getFrequencyForMilestone(newMilestone)
  const reductionMinutes = newFrequency - previousFrequency
  const isReduction = newFrequency > previousFrequency

  return {
    childId,
    previousFrequency,
    newFrequency,
    reductionMinutes: Math.abs(reductionMinutes),
    isReduction,
    previousMilestone,
    newMilestone,
  }
}

/**
 * Apply a frequency reduction for a milestone achievement.
 *
 * @param childId - Child to apply reduction to
 * @param newMilestone - New milestone level
 * @param previousMilestone - Previous milestone level
 * @returns Frequency update record
 */
export function applyFrequencyReduction(
  childId: string,
  newMilestone: TrustMilestoneLevel | null,
  previousMilestone: TrustMilestoneLevel | null
): FrequencyUpdate {
  const change = calculateFrequencyChange(childId, previousMilestone, newMilestone)
  const newFrequency = getFrequencyForMilestone(newMilestone)
  const previousFrequency = getFrequencyForMilestone(previousMilestone)

  // Calculate reduction percentage (fewer screenshots)
  // Higher frequency = fewer screenshots, so we calculate the reduction
  const reductionPercentage =
    previousFrequency > 0 ? ((newFrequency - previousFrequency) / newFrequency) * 100 : 0

  return {
    childId,
    newFrequencyMinutes: newFrequency,
    previousFrequencyMinutes: previousFrequency,
    appliedMilestone: newMilestone,
    previousMilestone,
    appliedAt: new Date(),
    success: true,
    change,
    reductionPercentage: Math.abs(reductionPercentage),
  }
}

/**
 * Get a celebratory message for a frequency change.
 * Uses developmental language, not reward language.
 *
 * @param milestone - The new milestone level
 * @param previousFrequency - Previous frequency in minutes
 * @param newFrequency - New frequency in minutes
 * @param viewerType - Whether child or parent is viewing
 * @returns Celebratory message
 */
export function getFrequencyChangeMessage(
  milestone: TrustMilestoneLevel | null,
  previousFrequency: number,
  newFrequency: number,
  viewerType: 'child' | 'parent'
): string {
  if (viewerType === 'child') {
    switch (milestone) {
      case 'growing':
        return `Wonderful news! We're recognizing your growth. Screenshots will now be taken every ${newFrequency} minutes instead of every ${previousFrequency} minutes.`
      case 'maturing':
        return `Congratulations on your continued growth! Screenshots will now be taken every ${newFrequency} minutes, recognizing your maturing responsibility.`
      case 'ready-for-independence':
        return `We're celebrating your journey toward independence! Screenshots will now be taken about once an hour, recognizing your demonstrated maturity.`
      default:
        return `Screenshots will be taken every ${newFrequency} minutes.`
    }
  }

  // Parent view
  switch (milestone) {
    case 'growing':
      return `Your child has reached the Growing milestone. Screenshot frequency has been reduced to every ${newFrequency} minutes to recognize their consistent responsibility.`
    case 'maturing':
      return `Your child has reached the Maturing milestone. Screenshot frequency has been reduced to every ${newFrequency} minutes to recognize their sustained growth.`
    case 'ready-for-independence':
      return `Your child has reached the Ready for Independence milestone. Screenshot frequency has been reduced to hourly, recognizing their demonstrated maturity.`
    default:
      return `Screenshot frequency is set to every ${newFrequency} minutes.`
  }
}

/**
 * Create a complete frequency update record.
 *
 * @param childId - Child to update
 * @param newMilestone - New milestone level
 * @param previousMilestone - Previous milestone level
 * @returns Complete frequency update record
 */
export function createFrequencyUpdate(
  childId: string,
  newMilestone: TrustMilestoneLevel | null,
  previousMilestone: TrustMilestoneLevel | null
): FrequencyUpdate {
  return applyFrequencyReduction(childId, newMilestone, previousMilestone)
}
