/**
 * MilestoneService - Story 37.1 Task 2
 *
 * Service for milestone calculations and transitions.
 * AC1: Milestones at 80, 90, 95
 * AC2: Duration requirement of 30+ days
 *
 * Philosophy: Privacy is a RIGHT - milestones recognize maturity, not reward behavior.
 */

import {
  MILESTONE_DURATION_DAYS,
  getMilestoneByLevel,
  getMilestonesSortedByThreshold,
  type TrustMilestone,
  type TrustMilestoneLevel,
} from '../contracts/trustMilestone'

// ============================================================================
// Types
// ============================================================================

export interface ScoreHistoryEntry {
  date: Date
  score: number
}

export interface MilestoneEligibility {
  /** Whether child is eligible for a milestone */
  eligible: boolean
  /** The milestone level they're eligible for (null if not eligible) */
  milestoneLevel: TrustMilestoneLevel | null
  /** Number of consecutive days at threshold */
  consecutiveDays: number
  /** Days remaining to achieve next milestone (if not eligible) */
  daysRemaining: number
  /** The milestone they're progressing toward */
  progressTowardMilestone: TrustMilestoneLevel | null
}

export interface MilestoneTransition {
  childId: string
  fromMilestone: TrustMilestoneLevel | null
  toMilestone: TrustMilestoneLevel | null
  transitionType: 'achievement' | 'progression' | 'regression'
  message: string
  benefits: string[]
  transitionDate: Date
}

// ============================================================================
// Core Functions
// ============================================================================

/**
 * Get the milestone for a given score.
 * Returns the highest milestone the score qualifies for.
 *
 * @param score - Trust score (0-100)
 * @returns The milestone or null if below all thresholds
 */
export function getMilestoneForScore(score: number): TrustMilestone | null {
  const sorted = getMilestonesSortedByThreshold()

  // Find highest milestone the score qualifies for
  let result: TrustMilestone | null = null
  for (const milestone of sorted) {
    if (score >= milestone.threshold) {
      result = milestone
    }
  }

  return result
}

/**
 * Calculate the number of consecutive days at or above a threshold.
 *
 * @param history - Score history (most recent last)
 * @param threshold - The threshold to check against
 * @returns Number of consecutive days at or above threshold
 */
export function calculateConsecutiveDays(history: ScoreHistoryEntry[], threshold: number): number {
  if (history.length === 0) return 0

  // Sort by date descending (most recent first)
  const sorted = [...history].sort((a, b) => b.date.getTime() - a.date.getTime())

  let consecutiveDays = 0
  let expectedDate = new Date()
  expectedDate.setHours(0, 0, 0, 0)

  for (const entry of sorted) {
    const entryDate = new Date(entry.date)
    entryDate.setHours(0, 0, 0, 0)

    // Check if this is the expected date (consecutive day)
    const dayDiff = Math.floor(
      (expectedDate.getTime() - entryDate.getTime()) / (1000 * 60 * 60 * 24)
    )

    // If there's a gap, streak is broken
    if (dayDiff > 1) {
      break
    }

    // If score is below threshold, streak is broken
    if (entry.score < threshold) {
      break
    }

    consecutiveDays++
    expectedDate = new Date(entryDate)
    expectedDate.setDate(expectedDate.getDate() - 1)
  }

  return consecutiveDays
}

/**
 * Check if a child is eligible for a milestone based on their score history.
 *
 * @param childId - The child's ID
 * @param scoreHistory - Historical score entries
 * @returns Eligibility status and progress information
 */
export function checkMilestoneEligibility(
  _childId: string,
  scoreHistory: ScoreHistoryEntry[]
): MilestoneEligibility {
  if (scoreHistory.length === 0) {
    return {
      eligible: false,
      milestoneLevel: null,
      consecutiveDays: 0,
      daysRemaining: MILESTONE_DURATION_DAYS,
      progressTowardMilestone: 'growing',
    }
  }

  // Check each milestone from highest to lowest
  const sorted = getMilestonesSortedByThreshold().reverse()

  for (const milestone of sorted) {
    const consecutiveDays = calculateConsecutiveDays(scoreHistory, milestone.threshold)

    if (consecutiveDays >= MILESTONE_DURATION_DAYS) {
      return {
        eligible: true,
        milestoneLevel: milestone.level,
        consecutiveDays,
        daysRemaining: 0,
        progressTowardMilestone: null,
      }
    }

    // If they have any days at this level, they're progressing toward it
    if (consecutiveDays > 0) {
      return {
        eligible: false,
        milestoneLevel: null,
        consecutiveDays,
        daysRemaining: MILESTONE_DURATION_DAYS - consecutiveDays,
        progressTowardMilestone: milestone.level,
      }
    }
  }

  // Check if progressing toward lowest milestone
  const lowestMilestone = getMilestonesSortedByThreshold()[0]
  const lowestDays = calculateConsecutiveDays(scoreHistory, lowestMilestone.threshold)

  return {
    eligible: false,
    milestoneLevel: null,
    consecutiveDays: lowestDays,
    daysRemaining: MILESTONE_DURATION_DAYS - lowestDays,
    progressTowardMilestone: lowestDays > 0 ? lowestMilestone.level : null,
  }
}

/**
 * Create a milestone transition record.
 * Uses developmental language - recognition, not reward.
 *
 * @param childId - The child's ID
 * @param fromMilestone - Previous milestone (null if none)
 * @param toMilestone - New milestone (null if regressing to none)
 * @returns Transition record with appropriate messaging
 */
export function transitionMilestone(
  childId: string,
  fromMilestone: TrustMilestoneLevel | null,
  toMilestone: TrustMilestoneLevel | null
): MilestoneTransition {
  const transitionType = getTransitionType(fromMilestone, toMilestone)
  const message = getTransitionMessage(transitionType, fromMilestone, toMilestone)
  const benefits = toMilestone ? (getMilestoneByLevel(toMilestone)?.benefits ?? []) : []

  return {
    childId,
    fromMilestone,
    toMilestone,
    transitionType,
    message,
    benefits,
    transitionDate: new Date(),
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

function getTransitionType(
  from: TrustMilestoneLevel | null,
  to: TrustMilestoneLevel | null
): 'achievement' | 'progression' | 'regression' {
  if (from === null && to !== null) {
    return 'achievement'
  }

  if (from !== null && to === null) {
    return 'regression'
  }

  const fromThreshold = from ? (getMilestoneByLevel(from)?.threshold ?? 0) : 0
  const toThreshold = to ? (getMilestoneByLevel(to)?.threshold ?? 0) : 0

  return toThreshold > fromThreshold ? 'progression' : 'regression'
}

function getTransitionMessage(
  type: 'achievement' | 'progression' | 'regression',
  _from: TrustMilestoneLevel | null,
  to: TrustMilestoneLevel | null
): string {
  switch (type) {
    case 'achievement': {
      const milestone = to ? getMilestoneByLevel(to) : null
      return `We're recognizing your growth! You've reached the ${to} milestone: ${milestone?.description ?? ''}`
    }
    case 'progression': {
      const milestone = to ? getMilestoneByLevel(to) : null
      return `Your continued growth is being recognized! You've progressed to the ${to} milestone: ${milestone?.description ?? ''}`
    }
    case 'regression': {
      if (to === null) {
        return "We've noticed some changes. Remember, growth isn't always linear, and we're here to support you on your journey."
      }
      return "We've adjusted your milestone level. This is part of your journey, and we're here to support your continued growth."
    }
  }
}
