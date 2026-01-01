/**
 * NotificationOnlyMode Data Model - Story 37.3 Task 1
 *
 * Data model for notification-only monitoring mode.
 * AC1: Notification-only mode disables screenshot capture
 * AC6: Mode represents near-graduation status (95+ trust for extended period)
 *
 * Philosophy: Maximum privacy while maintaining parental connection.
 * Notification-only is RECOGNITION of near-independence.
 */

import { z } from 'zod'

// ============================================================================
// Constants
// ============================================================================

/** Trust score threshold for notification-only mode qualification */
export const NOTIFICATION_ONLY_TRUST_THRESHOLD = 95

/** Days at threshold required for notification-only mode */
export const NOTIFICATION_ONLY_DURATION_DAYS = 30

/** Milestone level that enables notification-only mode */
export const NOTIFICATION_ONLY_MILESTONE = 'ready-for-independence' as const

// ============================================================================
// Schemas
// ============================================================================

/**
 * Schema for notification-only mode configuration.
 */
export const notificationOnlyConfigSchema = z.object({
  /** Child this config applies to */
  childId: z.string().min(1),
  /** Whether notification-only mode is currently enabled */
  enabled: z.boolean(),
  /** When mode was enabled (null if never) */
  enabledAt: z.date().nullable(),
  /** When child first qualified for mode (null if never) */
  qualifiedAt: z.date().nullable(),
  /** Whether daily summaries are sent to parent */
  dailySummaryEnabled: z.boolean().default(true),
  /** Whether time limits are still enforced */
  timeLimitsStillEnforced: z.boolean().default(true),
})

/**
 * Schema for concerning pattern detection.
 */
export const concerningPatternSchema = z.object({
  /** Type of concerning pattern */
  type: z.enum([
    'excessive-usage',
    'late-night-usage',
    'new-app-category',
    'time-limit-violation',
    'rapid-app-switching',
  ]),
  /** Description of the pattern */
  description: z.string(),
  /** Severity level */
  severity: z.enum(['low', 'medium', 'high']),
  /** When pattern was detected */
  detectedAt: z.date(),
  /** Additional context */
  context: z.record(z.unknown()).optional(),
})

/**
 * Schema for app usage summary.
 */
export const appUsageSummarySchema = z.object({
  /** App name or identifier */
  appName: z.string(),
  /** App category */
  category: z.string().optional(),
  /** Usage time in minutes */
  usageMinutes: z.number().min(0),
})

/**
 * Schema for daily summary sent to parents.
 */
export const dailySummarySchema = z.object({
  /** Child this summary is for */
  childId: z.string().min(1),
  /** Date of the summary */
  date: z.date(),
  /** Total device usage in minutes */
  totalUsageMinutes: z.number().min(0),
  /** Top apps by usage time */
  topApps: z.array(appUsageSummarySchema).max(5),
  /** Concerning patterns detected (empty if none) */
  concerningPatterns: z.array(concerningPatternSchema),
  /** Whether any time limits were hit */
  timeLimitsReached: z.boolean(),
  /** Summary status */
  status: z.enum(['normal', 'attention-needed', 'critical']),
})

/**
 * Schema for notification-only mode transition.
 */
export const modeTransitionSchema = z.object({
  /** Child this transition is for */
  childId: z.string().min(1),
  /** Previous mode state */
  fromEnabled: z.boolean(),
  /** New mode state */
  toEnabled: z.boolean(),
  /** Reason for transition */
  reason: z.enum([
    'milestone-achieved',
    'trust-regression',
    'parent-override',
    'child-request',
    'system-automatic',
  ]),
  /** When transition occurred */
  transitionedAt: z.date(),
  /** Optional notes */
  notes: z.string().optional(),
})

// ============================================================================
// Types
// ============================================================================

export type NotificationOnlyConfig = z.infer<typeof notificationOnlyConfigSchema>
export type ConcerningPattern = z.infer<typeof concerningPatternSchema>
export type AppUsageSummary = z.infer<typeof appUsageSummarySchema>
export type DailySummary = z.infer<typeof dailySummarySchema>
export type ModeTransition = z.infer<typeof modeTransitionSchema>

export type ConcerningPatternType = ConcerningPattern['type']
export type PatternSeverity = ConcerningPattern['severity']
export type SummaryStatus = DailySummary['status']
export type TransitionReason = ModeTransition['reason']

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create default notification-only config for a child.
 */
export function createDefaultNotificationOnlyConfig(childId: string): NotificationOnlyConfig {
  return {
    childId,
    enabled: false,
    enabledAt: null,
    qualifiedAt: null,
    dailySummaryEnabled: true,
    timeLimitsStillEnforced: true,
  }
}

/**
 * Create a daily summary.
 */
export function createDailySummary(params: {
  childId: string
  date: Date
  totalUsageMinutes: number
  topApps: AppUsageSummary[]
  concerningPatterns: ConcerningPattern[]
  timeLimitsReached: boolean
}): DailySummary {
  const status = determineSummaryStatus(params.concerningPatterns)

  return {
    childId: params.childId,
    date: params.date,
    totalUsageMinutes: params.totalUsageMinutes,
    topApps: params.topApps.slice(0, 5),
    concerningPatterns: params.concerningPatterns,
    timeLimitsReached: params.timeLimitsReached,
    status,
  }
}

/**
 * Create a concerning pattern.
 */
export function createConcerningPattern(
  type: ConcerningPatternType,
  description: string,
  severity: PatternSeverity,
  context?: Record<string, unknown>
): ConcerningPattern {
  return {
    type,
    description,
    severity,
    detectedAt: new Date(),
    context,
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Determine summary status based on concerning patterns.
 */
export function determineSummaryStatus(patterns: ConcerningPattern[]): SummaryStatus {
  if (patterns.length === 0) {
    return 'normal'
  }

  const hasHighSeverity = patterns.some((p) => p.severity === 'high')
  if (hasHighSeverity) {
    return 'critical'
  }

  const hasMediumSeverity = patterns.some((p) => p.severity === 'medium')
  if (hasMediumSeverity) {
    return 'attention-needed'
  }

  return 'normal'
}

/**
 * Get friendly description for notification-only mode.
 */
export function getNotificationOnlyDescription(viewerType: 'child' | 'parent'): string {
  if (viewerType === 'child') {
    return "You're in notification-only mode - we trust you"
  }
  return "Your child is in notification-only mode. You'll receive daily summaries instead of screenshots."
}

/**
 * Get message for mode transition.
 */
export function getModeTransitionMessage(
  transition: ModeTransition,
  childName: string,
  viewerType: 'child' | 'parent'
): string {
  if (transition.toEnabled) {
    // Enabling notification-only mode
    if (viewerType === 'child') {
      return "Congratulations! You're now in notification-only mode. This recognizes your journey toward independence."
    }
    return `${childName} is now in notification-only mode. This recognizes their demonstrated maturity and readiness for independence.`
  }

  // Disabling notification-only mode
  if (viewerType === 'child') {
    return "We're stepping back from notification-only mode temporarily. Let's talk about what happened."
  }
  return `${childName} is transitioning out of notification-only mode. A conversation is recommended.`
}
