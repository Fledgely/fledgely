/**
 * AutomaticReduction Data Model - Story 37.4 Task 1
 *
 * Data model for automatic monitoring reduction (FR37A).
 * AC1: 95%+ trust for 6 months triggers automatic reduction
 * AC2: Reduction is AUTOMATIC, not optional
 *
 * Philosophy: Privacy is a RIGHT - developmental rights must be honored.
 * This is not optional; sustained trust REQUIRES reduced monitoring.
 */

import { z } from 'zod'

// ============================================================================
// Constants (FR37A Requirements)
// ============================================================================

/** Trust score threshold for automatic reduction */
export const AUTOMATIC_REDUCTION_TRUST_THRESHOLD = 95

/** Months at threshold required for automatic reduction */
export const AUTOMATIC_REDUCTION_DURATION_MONTHS = 6

/** Days equivalent (for calculations) */
export const AUTOMATIC_REDUCTION_DURATION_DAYS = AUTOMATIC_REDUCTION_DURATION_MONTHS * 30

// ============================================================================
// Schemas
// ============================================================================

/**
 * Schema for automatic reduction configuration.
 */
export const automaticReductionConfigSchema = z.object({
  /** Child this config applies to */
  childId: z.string().min(1),
  /** When child became eligible for automatic reduction */
  eligibleAt: z.date().nullable(),
  /** When automatic reduction was applied */
  appliedAt: z.date().nullable(),
  /** Whether parent has requested an override */
  overrideRequested: z.boolean().default(false),
  /** Whether child has agreed to the override */
  overrideAgreedByChild: z.boolean().default(false),
  /** Reason for override (if requested) */
  overrideReason: z.string().optional(),
  /** Whether graduation path has been initiated */
  graduationPathStarted: z.boolean().default(false),
  /** Expected graduation date (if path started) */
  expectedGraduationDate: z.date().nullable(),
})

/**
 * Schema for override request.
 */
export const overrideRequestSchema = z.object({
  /** Child this request is for */
  childId: z.string().min(1),
  /** Parent who requested the override */
  requestedBy: z.string().min(1),
  /** Reason for requesting override */
  reason: z.string().min(10),
  /** When the request was made */
  requestedAt: z.date(),
  /** Status of the request */
  status: z.enum(['pending', 'approved', 'rejected', 'withdrawn']),
  /** When child responded (if they did) */
  respondedAt: z.date().nullable(),
  /** Child's response explanation (if provided) */
  childResponse: z.string().optional(),
})

/**
 * Schema for reduction result.
 */
export const reductionResultSchema = z.object({
  /** Child this result is for */
  childId: z.string().min(1),
  /** Whether reduction was successful */
  success: z.boolean(),
  /** Type of reduction applied */
  reductionType: z.enum([
    'automatic-full', // Full automatic reduction per FR37A
    'override-approved', // Reduction with child-approved override
    'already-reduced', // Already at reduced level
  ]),
  /** When reduction was applied */
  appliedAt: z.date(),
  /** Message explaining the result */
  message: z.string(),
  /** Whether graduation path was initiated */
  graduationPathInitiated: z.boolean(),
})

/**
 * Schema for graduation path status.
 */
export const graduationPathSchema = z.object({
  /** Child on this graduation path */
  childId: z.string().min(1),
  /** When the path started */
  startedAt: z.date(),
  /** Current progress (0-100) */
  progressPercent: z.number().min(0).max(100),
  /** Expected graduation date */
  expectedGraduationDate: z.date(),
  /** Milestones achieved on the path */
  milestonesAchieved: z.array(z.string()),
  /** Current status */
  status: z.enum(['active', 'paused', 'completed', 'regressed']),
})

// ============================================================================
// Types
// ============================================================================

export type AutomaticReductionConfig = z.infer<typeof automaticReductionConfigSchema>
export type OverrideRequest = z.infer<typeof overrideRequestSchema>
export type ReductionResult = z.infer<typeof reductionResultSchema>
export type GraduationPath = z.infer<typeof graduationPathSchema>

export type OverrideStatus = OverrideRequest['status']
export type ReductionType = ReductionResult['reductionType']
export type GraduationStatus = GraduationPath['status']

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create default automatic reduction config.
 */
export function createDefaultAutomaticReductionConfig(childId: string): AutomaticReductionConfig {
  return {
    childId,
    eligibleAt: null,
    appliedAt: null,
    overrideRequested: false,
    overrideAgreedByChild: false,
    overrideReason: undefined,
    graduationPathStarted: false,
    expectedGraduationDate: null,
  }
}

/**
 * Create an override request.
 */
export function createOverrideRequest(
  childId: string,
  requestedBy: string,
  reason: string
): OverrideRequest {
  return {
    childId,
    requestedBy,
    reason,
    requestedAt: new Date(),
    status: 'pending',
    respondedAt: null,
    childResponse: undefined,
  }
}

/**
 * Create a reduction result.
 */
export function createReductionResult(
  childId: string,
  reductionType: ReductionType,
  success: boolean,
  message: string,
  graduationPathInitiated: boolean = false
): ReductionResult {
  return {
    childId,
    success,
    reductionType,
    appliedAt: new Date(),
    message,
    graduationPathInitiated,
  }
}

/**
 * Create a graduation path.
 */
export function createGraduationPath(
  childId: string,
  expectedMonthsToGraduation: number = 12
): GraduationPath {
  const now = new Date()
  const expectedGraduationDate = new Date(now)
  expectedGraduationDate.setMonth(now.getMonth() + expectedMonthsToGraduation)

  return {
    childId,
    startedAt: now,
    progressPercent: 0,
    expectedGraduationDate,
    milestonesAchieved: ['automatic-reduction-applied'],
    status: 'active',
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Calculate months from days.
 */
export function daysToMonths(days: number): number {
  return Math.floor(days / 30)
}

/**
 * Check if override is currently in effect.
 */
export function isOverrideActive(config: AutomaticReductionConfig): boolean {
  return config.overrideRequested && config.overrideAgreedByChild
}

/**
 * Get parent notification message (AC3).
 */
export function getParentNotificationMessage(childName: string): string {
  return `${childName}'s demonstrated maturity means reduced monitoring. This reflects their sustained responsibility over 6 months.`
}

/**
 * Get celebration message (AC5).
 */
export function getCelebrationMessage(childName: string, viewerType: 'child' | 'parent'): string {
  if (viewerType === 'child') {
    return 'Congratulations! 6 months of trust - your monitoring is now reducing. This is recognition of your journey toward independence.'
  }
  return `Celebrating ${childName}'s 6 months of sustained trust! Their monitoring is now reducing as recognition of their demonstrated maturity.`
}

/**
 * Get graduation path message (AC6).
 */
export function getGraduationPathMessage(
  expectedGraduationDate: Date,
  viewerType: 'child' | 'parent'
): string {
  const monthsRemaining = Math.ceil(
    (expectedGraduationDate.getTime() - Date.now()) / (30 * 24 * 60 * 60 * 1000)
  )

  if (viewerType === 'child') {
    return `You're on the path to full independence! Expected graduation in approximately ${monthsRemaining} months.`
  }
  return `Your child is on the graduation path. Expected full independence in approximately ${monthsRemaining} months.`
}

/**
 * Get override explanation.
 * AC4: Parent cannot override without child agreement.
 */
export function getOverrideExplanation(): string {
  return "Any changes to automatic reduction require both parent and child agreement. This honors the child's developmental rights while maintaining family dialogue."
}
