/**
 * MilestoneRegressionService - Story 37.1 Task 5
 *
 * Service for graceful regression when score drops.
 * AC6: Regression handled gracefully (not punitive)
 *
 * Philosophy: Regression is part of the journey, not a punishment.
 * We support growth, not penalize setbacks.
 */

import {
  MILESTONE_THRESHOLDS,
  getMilestoneByLevel,
  type TrustMilestoneLevel,
} from '../contracts/trustMilestone'

// ============================================================================
// Constants
// ============================================================================

/** Number of days in grace period before regression */
export const MILESTONE_GRACE_PERIOD_DAYS = 14

// ============================================================================
// Types
// ============================================================================

export interface RegressionRiskStatus {
  /** Whether child is at risk of regression */
  atRisk: boolean
  /** Current milestone level */
  currentMilestone: TrustMilestoneLevel | null
  /** The milestone they would regress to */
  targetMilestone: TrustMilestoneLevel | null
  /** How far below threshold they are */
  scoreDeficit: number
}

export interface GracePeriodState {
  /** Whether grace period is active */
  isActive: boolean
  /** When grace period started */
  startDate: Date | null
  /** Original milestone being protected */
  originalMilestone: TrustMilestoneLevel | null
  /** Days elapsed in grace period */
  daysElapsed: number
  /** Days remaining in grace period */
  daysRemaining: number
}

export interface RegressionNotification {
  /** Type of notification */
  type: 'regression'
  /** Who is viewing */
  viewerType: 'child' | 'parent'
  /** The message to display */
  message: string
  /** Suggested next steps */
  nextSteps: string[]
  /** From milestone */
  fromMilestone: TrustMilestoneLevel | null
  /** To milestone */
  toMilestone: TrustMilestoneLevel | null
}

// ============================================================================
// Core Functions
// ============================================================================

/**
 * Check if a child is at risk of regression.
 *
 * @param currentMilestone - Current milestone level
 * @param currentScore - Current trust score
 * @returns Risk status with details
 */
export function checkForRegressionRisk(
  currentMilestone: TrustMilestoneLevel | null,
  currentScore: number
): RegressionRiskStatus {
  if (currentMilestone === null) {
    return {
      atRisk: false,
      currentMilestone: null,
      targetMilestone: null,
      scoreDeficit: 0,
    }
  }

  const milestone = getMilestoneByLevel(currentMilestone)
  if (!milestone) {
    return {
      atRisk: false,
      currentMilestone,
      targetMilestone: null,
      scoreDeficit: 0,
    }
  }

  if (currentScore >= milestone.threshold) {
    return {
      atRisk: false,
      currentMilestone,
      targetMilestone: null,
      scoreDeficit: 0,
    }
  }

  // Find target milestone
  const targetMilestone = getTargetMilestoneForScore(currentScore)

  return {
    atRisk: true,
    currentMilestone,
    targetMilestone,
    scoreDeficit: milestone.threshold - currentScore,
  }
}

/**
 * Apply or update grace period state.
 *
 * @param currentMilestone - Current milestone level
 * @param currentScore - Current trust score
 * @param existingState - Existing grace period state (if any)
 * @returns Updated grace period state
 */
export function applyGracePeriod(
  currentMilestone: TrustMilestoneLevel | null,
  currentScore: number,
  existingState: GracePeriodState | null
): GracePeriodState {
  const riskStatus = checkForRegressionRisk(currentMilestone, currentScore)

  // If not at risk, clear grace period
  if (!riskStatus.atRisk) {
    return {
      isActive: false,
      startDate: null,
      originalMilestone: null,
      daysElapsed: 0,
      daysRemaining: 0,
    }
  }

  // If already in grace period, update elapsed/remaining
  if (existingState?.isActive && existingState.startDate) {
    const now = new Date()
    const elapsed = Math.floor(
      (now.getTime() - existingState.startDate.getTime()) / (1000 * 60 * 60 * 24)
    )
    const remaining = Math.max(0, MILESTONE_GRACE_PERIOD_DAYS - elapsed)

    return {
      isActive: true,
      startDate: existingState.startDate,
      originalMilestone: existingState.originalMilestone,
      daysElapsed: elapsed,
      daysRemaining: remaining,
    }
  }

  // Start new grace period
  return {
    isActive: true,
    startDate: new Date(),
    originalMilestone: currentMilestone,
    daysElapsed: 0,
    daysRemaining: MILESTONE_GRACE_PERIOD_DAYS,
  }
}

/**
 * Check if currently in active milestone grace period.
 *
 * @param state - Grace period state
 * @returns True if in active, non-expired grace period
 */
export function isMilestoneInGracePeriod(state: GracePeriodState): boolean {
  return state.isActive && state.daysRemaining > 0
}

/**
 * Check if regression should be triggered.
 *
 * @param state - Grace period state
 * @param currentScore - Current trust score
 * @returns True if regression should occur
 */
export function shouldTriggerRegression(state: GracePeriodState, currentScore: number): boolean {
  // If grace period still active, don't trigger
  if (isMilestoneInGracePeriod(state)) {
    return false
  }

  // If score has recovered, don't trigger
  if (state.originalMilestone) {
    const milestone = getMilestoneByLevel(state.originalMilestone)
    if (milestone && currentScore >= milestone.threshold) {
      return false
    }
  }

  // Grace period expired and score still low
  return state.isActive && state.daysRemaining === 0
}

/**
 * Get compassionate regression message.
 * Uses supportive language, not punitive.
 *
 * @param toMilestone - The milestone they're regressing to
 * @param fromMilestone - The milestone they're regressing from
 * @returns Compassionate message
 */
export function getRegressionMessage(
  toMilestone: TrustMilestoneLevel | null,
  _fromMilestone: TrustMilestoneLevel | null
): string {
  if (toMilestone === null) {
    return "We've noticed some changes in your journey. Remember, growth isn't always linear, and we're here to support you every step of the way."
  }

  return "We've adjusted your milestone as part of your ongoing journey. This is a natural part of growth, and we're here to support you as you continue to develop."
}

/**
 * Create a regression notification.
 *
 * @param toMilestone - The milestone they're regressing to
 * @param fromMilestone - The milestone they're regressing from
 * @param viewerType - Who is viewing
 * @param childName - Child's name
 * @returns Regression notification
 */
export function createRegressionNotification(
  toMilestone: TrustMilestoneLevel | null,
  fromMilestone: TrustMilestoneLevel | null,
  viewerType: 'child' | 'parent',
  childName: string
): RegressionNotification {
  const baseMessage = getRegressionMessage(toMilestone, fromMilestone)

  const message =
    viewerType === 'child'
      ? baseMessage
      : `${childName}'s milestone has been adjusted. ${baseMessage}`

  const nextSteps =
    viewerType === 'child'
      ? [
          'Continue focusing on your daily activities',
          'Remember that setbacks are part of growth',
          "Talk to your family if you'd like support",
        ]
      : [
          'Have a supportive conversation with ' + childName,
          'Focus on encouragement, not criticism',
          'Review goals together when ready',
        ]

  return {
    type: 'regression',
    viewerType,
    message,
    nextSteps,
    fromMilestone,
    toMilestone,
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get the target milestone for a given score.
 */
function getTargetMilestoneForScore(score: number): TrustMilestoneLevel | null {
  if (score >= MILESTONE_THRESHOLDS['ready-for-independence']) {
    return 'ready-for-independence'
  }
  if (score >= MILESTONE_THRESHOLDS.maturing) {
    return 'maturing'
  }
  if (score >= MILESTONE_THRESHOLDS.growing) {
    return 'growing'
  }
  return null
}
