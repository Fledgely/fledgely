/**
 * Graduation Progress Message Service - Story 38.1 Task 3
 *
 * Service for generating progress messages for child and parent.
 * Uses developmental framing from Epic 37.
 */

import {
  GraduationEligibilityStatus,
  GRADUATION_MESSAGES,
  GRADUATION_DURATION_MONTHS,
} from '../contracts/graduationEligibility'
import { ViewerType } from '../contracts/developmentalMessaging'

/**
 * Get progress message for child.
 * AC2: Progress visible to child: "9 months at 100% trust - 3 months to graduation eligibility"
 */
export function getChildProgressMessage(status: GraduationEligibilityStatus): string {
  if (status.isEligible) {
    return GRADUATION_MESSAGES.eligible
  }

  const months = status.monthsAtPerfectTrust
  const remaining = GRADUATION_DURATION_MONTHS - months

  if (months === 0) {
    return GRADUATION_MESSAGES.pathIntro
  }

  if (months === 6) {
    return GRADUATION_MESSAGES.halfwayPoint
  }

  if (months === 9) {
    return GRADUATION_MESSAGES.almostThere
  }

  return GRADUATION_MESSAGES.progressTemplate
    .replace('{months}', String(months))
    .replace('{remaining}', String(remaining))
}

/**
 * Get progress message for parent.
 * AC4: Parent sees same progress (transparency)
 */
export function getParentProgressMessage(
  status: GraduationEligibilityStatus,
  childName: string
): string {
  if (status.isEligible) {
    return GRADUATION_MESSAGES.parentEligible.replace('{childName}', childName)
  }

  if (status.monthsAtPerfectTrust === 0) {
    return GRADUATION_MESSAGES.parentPathIntro.replace('{childName}', childName)
  }

  return GRADUATION_MESSAGES.parentProgress
    .replace('{childName}', childName)
    .replace('{months}', String(status.monthsAtPerfectTrust))
}

/**
 * Get milestone celebration message when milestone is reached.
 */
export function getMilestoneMessage(
  monthsCompleted: number,
  viewerType: ViewerType
): string | null {
  // Only show messages at milestones (3, 6, 9, 12)
  const milestones = [3, 6, 9, 12]
  if (!milestones.includes(monthsCompleted)) {
    return null
  }

  if (viewerType === 'child') {
    switch (monthsCompleted) {
      case 3:
        return "Great progress! You've maintained perfect trust for 3 months. Keep going!"
      case 6:
        return "Halfway there! 6 months of sustained responsibility. You're doing amazing."
      case 9:
        return 'Almost there! Just 3 more months to graduation eligibility.'
      case 12:
        return "Congratulations! You've reached graduation eligibility. Time for a family conversation."
      default:
        return null
    }
  }

  // Parent view
  switch (monthsCompleted) {
    case 3:
      return `Milestone reached: 3 months of perfect trust. Your child is making great progress.`
    case 6:
      return `Halfway milestone: 6 months of sustained responsibility. Consider discussing their progress.`
    case 9:
      return `Near graduation: Just 3 more months until your child reaches eligibility.`
    case 12:
      return `Graduation eligible: Your child has demonstrated 12 months of perfect trust. Time for a graduation conversation.`
    default:
      return null
  }
}

/**
 * Get motivational message based on current status.
 * AC6: Motivates sustained responsible behavior
 */
export function getMotivationalMessage(
  status: GraduationEligibilityStatus,
  viewerType: ViewerType
): string {
  const remaining = GRADUATION_DURATION_MONTHS - status.monthsAtPerfectTrust

  if (status.isEligible) {
    return viewerType === 'child'
      ? "You've shown incredible responsibility. Time to talk about the next chapter."
      : "Your child has demonstrated sustained maturity. They're ready for a graduation conversation."
  }

  // Not at perfect trust currently
  if (status.currentTrustScore < 100) {
    return viewerType === 'child'
      ? 'Your path continues - maintain 100% trust to resume progress toward graduation.'
      : 'Graduation progress paused while trust score is below 100%. This is part of the journey.'
  }

  // At perfect trust, making progress
  if (remaining <= 3) {
    return viewerType === 'child'
      ? `You're almost there! Just ${remaining} more month${remaining === 1 ? '' : 's'} of perfect trust.`
      : `Your child is close to graduation eligibility - ${remaining} month${remaining === 1 ? '' : 's'} remaining.`
  }

  if (remaining <= 6) {
    return viewerType === 'child'
      ? 'Great momentum! Keep demonstrating your responsibility.'
      : 'Your child is making steady progress toward graduation.'
  }

  return viewerType === 'child'
    ? 'Every month of perfect trust brings you closer to graduation.'
    : 'Encourage your child as they work toward graduation eligibility.'
}

/**
 * Get streak break message (supportive, not punitive).
 */
export function getStreakBreakMessage(viewerType: ViewerType, monthsLost: number): string {
  if (viewerType === 'child') {
    if (monthsLost === 0) {
      return GRADUATION_MESSAGES.streakBreakChild
    }
    return "Your graduation path is still there - when you're ready, the journey continues."
  }

  // Parent view
  if (monthsLost === 0) {
    return GRADUATION_MESSAGES.streakBreakParent.replace('{childName}', 'Your child')
  }
  return 'Graduation progress paused. This is an opportunity to discuss what happened together.'
}

/**
 * Get eligibility explanation message.
 * AC5: Eligibility doesn't mean automatic graduation - triggers conversation
 */
export function getEligibilityExplanation(viewerType: ViewerType): string {
  if (viewerType === 'child') {
    return `${GRADUATION_MESSAGES.eligibilityExplainer} ${GRADUATION_MESSAGES.notAutomatic}`
  }

  return (
    'When your child reaches eligibility, it means they have demonstrated 12 months of perfect trust. ' +
    "This triggers a graduation conversation - monitoring doesn't automatically end."
  )
}

/**
 * Get path overview message.
 * AC3: Child sees clear path to end of monitoring
 */
export function getPathOverview(viewerType: ViewerType): string {
  if (viewerType === 'child') {
    return (
      'Your path to graduation: maintain 100% trust for 12 consecutive months. ' +
      "This shows you're ready for full independence. " +
      'When you reach eligibility, your family will discuss next steps together.'
    )
  }

  return (
    'The graduation path requires 12 consecutive months at 100% trust. ' +
    'This ensures your child has demonstrated sustained responsibility. ' +
    'Reaching eligibility opens a family conversation, not automatic changes.'
  )
}

/**
 * Format progress for display.
 */
export function formatProgressDisplay(status: GraduationEligibilityStatus): {
  percentage: string
  months: string
  remaining: string
} {
  const remaining = GRADUATION_DURATION_MONTHS - status.monthsAtPerfectTrust

  return {
    percentage: `${status.progressPercentage}%`,
    months: `${status.monthsAtPerfectTrust}/${GRADUATION_DURATION_MONTHS} months`,
    remaining: remaining === 0 ? 'Eligible!' : `${remaining} months to go`,
  }
}

/**
 * Get all graduation messages for a status.
 */
export function getAllGraduationMessages(
  status: GraduationEligibilityStatus,
  childName: string,
  viewerType: ViewerType
): {
  progressMessage: string
  motivationalMessage: string
  pathOverview: string
  milestoneMessage: string | null
  eligibilityExplanation: string
} {
  return {
    progressMessage:
      viewerType === 'child'
        ? getChildProgressMessage(status)
        : getParentProgressMessage(status, childName),
    motivationalMessage: getMotivationalMessage(status, viewerType),
    pathOverview: getPathOverview(viewerType),
    milestoneMessage: getMilestoneMessage(status.monthsAtPerfectTrust, viewerType),
    eligibilityExplanation: getEligibilityExplanation(viewerType),
  }
}
