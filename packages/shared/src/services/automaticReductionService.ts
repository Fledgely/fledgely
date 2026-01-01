/**
 * AutomaticReductionService - Story 37.4 Task 2
 *
 * Service for managing automatic monitoring reduction lifecycle.
 * AC1: 95%+ trust for 6 months triggers automatic reduction
 * AC2: Reduction is AUTOMATIC, not optional
 * AC4: Parent cannot override without child agreement
 *
 * Philosophy: Privacy is a RIGHT - developmental rights must be honored.
 * This is FR37A - the system MUST reduce monitoring when threshold is met.
 */

import {
  AUTOMATIC_REDUCTION_TRUST_THRESHOLD,
  AUTOMATIC_REDUCTION_DURATION_MONTHS,
  AUTOMATIC_REDUCTION_DURATION_DAYS,
  createDefaultAutomaticReductionConfig,
  createOverrideRequest,
  createReductionResult,
  createGraduationPath,
  daysToMonths,
  type AutomaticReductionConfig,
  type OverrideRequest,
  type ReductionResult,
  type GraduationPath,
} from '../contracts/automaticReduction'

// ============================================================================
// Eligibility Functions
// ============================================================================

/**
 * Check if a child is eligible for automatic reduction.
 * AC1: 95%+ trust for 6 months triggers automatic reduction.
 */
export function isEligibleForAutomaticReduction(
  trustScore: number,
  daysAtThreshold: number
): boolean {
  const monthsAtThreshold = daysToMonths(daysAtThreshold)
  return (
    trustScore >= AUTOMATIC_REDUCTION_TRUST_THRESHOLD &&
    monthsAtThreshold >= AUTOMATIC_REDUCTION_DURATION_MONTHS
  )
}

/**
 * Get months remaining until eligibility.
 * Returns 0 if eligible, -1 if score too low.
 */
export function getMonthsUntilEligible(trustScore: number, daysAtThreshold: number): number {
  if (trustScore < AUTOMATIC_REDUCTION_TRUST_THRESHOLD) {
    return -1
  }

  const currentMonths = daysToMonths(daysAtThreshold)
  const remaining = AUTOMATIC_REDUCTION_DURATION_MONTHS - currentMonths
  return Math.max(0, remaining)
}

/**
 * Get eligibility progress as percentage.
 */
export function getEligibilityProgress(trustScore: number, daysAtThreshold: number): number {
  if (trustScore < AUTOMATIC_REDUCTION_TRUST_THRESHOLD) {
    return 0
  }

  const progress = (daysAtThreshold / AUTOMATIC_REDUCTION_DURATION_DAYS) * 100
  return Math.min(100, Math.round(progress))
}

// ============================================================================
// Reduction Application (AC2)
// ============================================================================

/**
 * Apply automatic reduction for a child.
 * AC2: Reduction is AUTOMATIC, not optional.
 */
export function applyAutomaticReduction(
  childId: string,
  existingConfig?: AutomaticReductionConfig | null
): { config: AutomaticReductionConfig; result: ReductionResult; graduationPath: GraduationPath } {
  const now = new Date()
  const config = existingConfig ?? createDefaultAutomaticReductionConfig(childId)

  // Already reduced
  if (config.appliedAt !== null) {
    return {
      config,
      result: createReductionResult(
        childId,
        'already-reduced',
        true,
        'Automatic reduction was already applied.',
        config.graduationPathStarted
      ),
      graduationPath: createGraduationPath(childId),
    }
  }

  // Apply the reduction - THIS IS AUTOMATIC (FR37A)
  const updatedConfig: AutomaticReductionConfig = {
    ...config,
    appliedAt: now,
    eligibleAt: config.eligibleAt ?? now,
    graduationPathStarted: true,
    expectedGraduationDate: new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000), // 1 year
  }

  const graduationPath = createGraduationPath(childId, 12)

  const result = createReductionResult(
    childId,
    'automatic-full',
    true,
    'Automatic reduction applied per FR37A. Monitoring has been reduced to honor your demonstrated maturity.',
    true
  )

  return { config: updatedConfig, result, graduationPath }
}

/**
 * Check if reduction should be applied.
 */
export function shouldApplyReduction(config: AutomaticReductionConfig): boolean {
  return config.appliedAt === null && !config.overrideRequested
}

// ============================================================================
// Override Functions (AC4)
// ============================================================================

/**
 * Request an override to automatic reduction.
 * AC4: Parent cannot override without child agreement.
 */
export function requestOverride(
  childId: string,
  parentId: string,
  reason: string,
  existingConfig: AutomaticReductionConfig
): { config: AutomaticReductionConfig; request: OverrideRequest } {
  const request = createOverrideRequest(childId, parentId, reason)

  const updatedConfig: AutomaticReductionConfig = {
    ...existingConfig,
    overrideRequested: true,
    overrideAgreedByChild: false,
    overrideReason: reason,
  }

  return { config: updatedConfig, request }
}

/**
 * Child responds to override request.
 * AC4: Child must agree for override to take effect.
 */
export function respondToOverride(
  existingConfig: AutomaticReductionConfig,
  request: OverrideRequest,
  childAgreed: boolean,
  childResponse?: string
): { config: AutomaticReductionConfig; request: OverrideRequest } {
  const now = new Date()

  const updatedRequest: OverrideRequest = {
    ...request,
    status: childAgreed ? 'approved' : 'rejected',
    respondedAt: now,
    childResponse,
  }

  const updatedConfig: AutomaticReductionConfig = {
    ...existingConfig,
    overrideAgreedByChild: childAgreed,
  }

  return { config: updatedConfig, request: updatedRequest }
}

/**
 * Withdraw an override request.
 */
export function withdrawOverride(
  existingConfig: AutomaticReductionConfig,
  request: OverrideRequest
): { config: AutomaticReductionConfig; request: OverrideRequest } {
  const updatedRequest: OverrideRequest = {
    ...request,
    status: 'withdrawn',
  }

  const updatedConfig: AutomaticReductionConfig = {
    ...existingConfig,
    overrideRequested: false,
    overrideAgreedByChild: false,
    overrideReason: undefined,
  }

  return { config: updatedConfig, request: updatedRequest }
}

/**
 * Check if override is currently active.
 */
export function isOverrideInEffect(config: AutomaticReductionConfig): boolean {
  return config.overrideRequested && config.overrideAgreedByChild
}

// ============================================================================
// Graduation Path Functions
// ============================================================================

/**
 * Update graduation path progress.
 */
export function updateGraduationProgress(
  path: GraduationPath,
  progressPercent: number,
  newMilestone?: string
): GraduationPath {
  const milestones = newMilestone
    ? [...path.milestonesAchieved, newMilestone]
    : path.milestonesAchieved

  return {
    ...path,
    progressPercent: Math.min(100, Math.max(0, progressPercent)),
    milestonesAchieved: milestones,
    status: progressPercent >= 100 ? 'completed' : path.status,
  }
}

/**
 * Pause graduation path (e.g., due to trust regression).
 */
export function pauseGraduationPath(path: GraduationPath): GraduationPath {
  return {
    ...path,
    status: 'paused',
  }
}

/**
 * Resume graduation path.
 */
export function resumeGraduationPath(path: GraduationPath): GraduationPath {
  return {
    ...path,
    status: 'active',
  }
}

/**
 * Mark graduation path as regressed.
 */
export function regressGraduationPath(path: GraduationPath): GraduationPath {
  return {
    ...path,
    status: 'regressed',
  }
}

// ============================================================================
// Status Messages
// ============================================================================

/**
 * Get status message for automatic reduction.
 */
export function getReductionStatusMessage(
  config: AutomaticReductionConfig,
  childName: string,
  viewerType: 'child' | 'parent'
): string {
  if (config.appliedAt === null) {
    if (viewerType === 'child') {
      return 'Automatic reduction has not yet been applied.'
    }
    return `Automatic reduction has not yet been applied for ${childName}.`
  }

  if (isOverrideInEffect(config)) {
    if (viewerType === 'child') {
      return 'Automatic reduction is paused by mutual agreement.'
    }
    return `Automatic reduction is paused for ${childName} by mutual agreement.`
  }

  if (viewerType === 'child') {
    return 'Automatic reduction is active. Your privacy is being honored.'
  }
  return `Automatic reduction is active for ${childName}. Their demonstrated maturity is being recognized.`
}

/**
 * Get override status message.
 */
export function getOverrideStatusMessage(
  request: OverrideRequest,
  viewerType: 'child' | 'parent'
): string {
  switch (request.status) {
    case 'pending':
      if (viewerType === 'child') {
        return 'Your parent has requested a temporary override. Your agreement is needed.'
      }
      return "Override request is pending your child's agreement."

    case 'approved':
      if (viewerType === 'child') {
        return 'You agreed to the temporary override.'
      }
      return 'Override was approved by your child.'

    case 'rejected':
      if (viewerType === 'child') {
        return 'You declined the override request. Your automatic reduction continues.'
      }
      return 'Your child declined the override request. Automatic reduction continues.'

    case 'withdrawn':
      return 'The override request was withdrawn.'
  }
}

/**
 * Get eligibility message.
 */
export function getEligibilityMessage(
  trustScore: number,
  daysAtThreshold: number,
  childName: string,
  viewerType: 'child' | 'parent'
): string {
  if (trustScore < AUTOMATIC_REDUCTION_TRUST_THRESHOLD) {
    if (viewerType === 'child') {
      return `Reach ${AUTOMATIC_REDUCTION_TRUST_THRESHOLD}% trust to start the path to automatic reduction.`
    }
    return `${childName} needs ${AUTOMATIC_REDUCTION_TRUST_THRESHOLD}% trust to begin qualifying for automatic reduction.`
  }

  const monthsRemaining = getMonthsUntilEligible(trustScore, daysAtThreshold)

  if (monthsRemaining === 0) {
    if (viewerType === 'child') {
      return 'You qualify for automatic reduction!'
    }
    return `${childName} qualifies for automatic reduction.`
  }

  if (viewerType === 'child') {
    return `${monthsRemaining} more months at ${AUTOMATIC_REDUCTION_TRUST_THRESHOLD}%+ trust until automatic reduction.`
  }
  return `${childName} needs ${monthsRemaining} more months at ${AUTOMATIC_REDUCTION_TRUST_THRESHOLD}%+ trust for automatic reduction.`
}
