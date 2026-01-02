/**
 * Graduation Celebration Service - Story 38.3 Task 3
 *
 * Service for graduation celebration messaging.
 * AC3: Celebration message displayed: "Congratulations on graduating from monitoring!"
 */

import type { ViewerType } from '../contracts/graduationEligibility'

// ============================================
// Types
// ============================================

export interface CertificateContent {
  title: string
  childName: string
  dateFormatted: string
  achievementText: string
  journeyText: string
}

export interface FullCelebrationContent {
  mainMessage: string
  achievementSummary: string
  transitionMessage: string
  nextStepsMessage: string
}

export interface FullCelebrationInput {
  viewerType: ViewerType
  childName: string
  graduationDate: Date
  monthsAtPerfectTrust: number
  totalMonitoringMonths: number
}

// ============================================
// Celebration Message Constants
// ============================================

export const CELEBRATION_MESSAGES = {
  main: {
    child: "Congratulations! You've graduated from monitoring!",
    parent: 'Congratulations! {{childName}} has graduated from monitoring!',
  },
  transition: {
    child: 'Your account is now in alumni status. No monitoring data is collected.',
    parent: "Your child's account has transitioned to alumni status.",
  },
  nextSteps: {
    child: 'Digital wellness resources are available if you want them.',
    parent: 'Resources for supporting your independent teen are available.',
  },
  certificate: {
    title: 'Certificate of Graduation',
    achievementTemplate: '{{months}} months at 100% trust',
    journeyTemplate: 'Completed a {{total}}-month monitoring journey',
  },
} as const

// ============================================
// Helper Functions
// ============================================

/**
 * Format date for display.
 */
function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

/**
 * Replace template variables in a string.
 */
function replaceVariables(template: string, variables: Record<string, string | number>): string {
  let result = template
  for (const [key, value] of Object.entries(variables)) {
    result = result.replace(new RegExp(`{{${key}}}`, 'g'), String(value))
  }
  return result
}

// ============================================
// Service Functions
// ============================================

/**
 * Get main celebration message.
 * AC3: Celebration message displayed: "Congratulations on graduating from monitoring!"
 */
export function getCelebrationMessage(viewerType: ViewerType, childName: string): string {
  if (viewerType === 'child') {
    return CELEBRATION_MESSAGES.main.child
  }

  return replaceVariables(CELEBRATION_MESSAGES.main.parent, { childName })
}

/**
 * Get achievement summary.
 * Example: "12 months at 100% trust, 24 months total monitoring journey"
 */
export function getAchievementSummary(
  monthsAtPerfectTrust: number,
  totalMonitoringMonths: number
): string {
  return `${monthsAtPerfectTrust} months at 100% trust, ${totalMonitoringMonths} months total monitoring journey`
}

/**
 * Get transition message.
 * Child: "Your account is now in alumni status. No monitoring data is collected."
 * Parent: "Your child's account has transitioned to alumni status."
 */
export function getTransitionMessage(viewerType: ViewerType): string {
  return viewerType === 'child'
    ? CELEBRATION_MESSAGES.transition.child
    : CELEBRATION_MESSAGES.transition.parent
}

/**
 * Get next steps message.
 * Child: "Digital wellness resources are available if you want them."
 * Parent: "Resources for supporting your independent teen are available."
 */
export function getNextStepsMessage(viewerType: ViewerType): string {
  return viewerType === 'child'
    ? CELEBRATION_MESSAGES.nextSteps.child
    : CELEBRATION_MESSAGES.nextSteps.parent
}

/**
 * Get certificate congratulations content.
 */
export function getCertificateCongratulations(
  childName: string,
  graduationDate: Date,
  monthsCompleted: number
): CertificateContent {
  return {
    title: CELEBRATION_MESSAGES.certificate.title,
    childName,
    dateFormatted: formatDate(graduationDate),
    achievementText: replaceVariables(CELEBRATION_MESSAGES.certificate.achievementTemplate, {
      months: monthsCompleted,
    }),
    journeyText: replaceVariables(CELEBRATION_MESSAGES.certificate.journeyTemplate, {
      total: monthsCompleted,
    }),
  }
}

/**
 * Get full celebration content for a viewer.
 */
export function getFullCelebrationContent(input: FullCelebrationInput): FullCelebrationContent {
  return {
    mainMessage: getCelebrationMessage(input.viewerType, input.childName),
    achievementSummary: getAchievementSummary(
      input.monthsAtPerfectTrust,
      input.totalMonitoringMonths
    ),
    transitionMessage: getTransitionMessage(input.viewerType),
    nextStepsMessage: getNextStepsMessage(input.viewerType),
  }
}
