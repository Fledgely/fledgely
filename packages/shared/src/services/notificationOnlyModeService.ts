/**
 * NotificationOnlyModeService - Story 37.3 Task 2
 *
 * Service for managing notification-only mode transitions.
 * AC1: Notification-only mode disables screenshot capture
 * AC6: Mode represents near-graduation status (95+ trust for extended period)
 *
 * Philosophy: Notification-only is RECOGNITION of near-independence.
 * Maximum privacy while maintaining parental connection.
 */

import {
  NOTIFICATION_ONLY_TRUST_THRESHOLD,
  NOTIFICATION_ONLY_DURATION_DAYS,
  createDefaultNotificationOnlyConfig,
  type NotificationOnlyConfig,
  type ModeTransition,
  type TransitionReason,
} from '../contracts/notificationOnlyMode'

// ============================================================================
// Qualification Functions
// ============================================================================

/**
 * Check if a child is qualified for notification-only mode.
 * Requires 95+ trust for 30+ days at threshold.
 */
export function isQualifiedForNotificationOnlyMode(
  trustScore: number,
  daysAtThreshold: number
): boolean {
  return (
    trustScore >= NOTIFICATION_ONLY_TRUST_THRESHOLD &&
    daysAtThreshold >= NOTIFICATION_ONLY_DURATION_DAYS
  )
}

/**
 * Calculate days remaining until qualification.
 * Returns 0 if already qualified, or negative if not meeting score threshold.
 */
export function getDaysUntilQualification(trustScore: number, daysAtThreshold: number): number {
  if (trustScore < NOTIFICATION_ONLY_TRUST_THRESHOLD) {
    return -1 // Score too low, can't calculate days
  }

  const remaining = NOTIFICATION_ONLY_DURATION_DAYS - daysAtThreshold
  return Math.max(0, remaining)
}

/**
 * Get qualification progress as percentage (0-100).
 */
export function getQualificationProgress(trustScore: number, daysAtThreshold: number): number {
  if (trustScore < NOTIFICATION_ONLY_TRUST_THRESHOLD) {
    return 0
  }

  const progress = (daysAtThreshold / NOTIFICATION_ONLY_DURATION_DAYS) * 100
  return Math.min(100, Math.round(progress))
}

// ============================================================================
// Mode State Functions
// ============================================================================

/**
 * Check if notification-only mode is currently active.
 */
export function isInNotificationOnlyMode(config: NotificationOnlyConfig): boolean {
  return config.enabled && config.enabledAt !== null
}

/**
 * Check if child has ever qualified for notification-only mode.
 */
export function hasEverQualified(config: NotificationOnlyConfig): boolean {
  return config.qualifiedAt !== null
}

/**
 * Get time since mode was enabled.
 * Returns null if mode is not enabled.
 */
export function getTimeSinceEnabled(config: NotificationOnlyConfig): number | null {
  if (!config.enabled || config.enabledAt === null) {
    return null
  }

  return Date.now() - config.enabledAt.getTime()
}

// ============================================================================
// Mode Transition Functions
// ============================================================================

/**
 * Enable notification-only mode for a child.
 */
export function enableNotificationOnlyMode(
  childId: string,
  existingConfig?: NotificationOnlyConfig | null,
  reason: TransitionReason = 'milestone-achieved'
): { config: NotificationOnlyConfig; transition: ModeTransition } {
  const now = new Date()
  const previousConfig = existingConfig ?? createDefaultNotificationOnlyConfig(childId)

  const newConfig: NotificationOnlyConfig = {
    ...previousConfig,
    childId,
    enabled: true,
    enabledAt: now,
    qualifiedAt: previousConfig.qualifiedAt ?? now,
  }

  const transition: ModeTransition = {
    childId,
    fromEnabled: previousConfig.enabled,
    toEnabled: true,
    reason,
    transitionedAt: now,
  }

  return { config: newConfig, transition }
}

/**
 * Disable notification-only mode for a child.
 */
export function disableNotificationOnlyMode(
  childId: string,
  existingConfig: NotificationOnlyConfig,
  reason: TransitionReason,
  notes?: string
): { config: NotificationOnlyConfig; transition: ModeTransition } {
  const now = new Date()

  const newConfig: NotificationOnlyConfig = {
    ...existingConfig,
    enabled: false,
    enabledAt: null,
    // Keep qualifiedAt to track history
  }

  const transition: ModeTransition = {
    childId,
    fromEnabled: existingConfig.enabled,
    toEnabled: false,
    reason,
    transitionedAt: now,
    notes,
  }

  return { config: newConfig, transition }
}

/**
 * Update notification-only mode settings.
 */
export function updateModeSettings(
  config: NotificationOnlyConfig,
  settings: {
    dailySummaryEnabled?: boolean
    timeLimitsStillEnforced?: boolean
  }
): NotificationOnlyConfig {
  return {
    ...config,
    dailySummaryEnabled: settings.dailySummaryEnabled ?? config.dailySummaryEnabled,
    timeLimitsStillEnforced: settings.timeLimitsStillEnforced ?? config.timeLimitsStillEnforced,
  }
}

// ============================================================================
// Screenshot Capture Control
// ============================================================================

/**
 * Determine if screenshots should be captured based on mode.
 * AC1: Notification-only mode disables screenshot capture.
 */
export function shouldCaptureScreenshots(config: NotificationOnlyConfig): boolean {
  return !isInNotificationOnlyMode(config)
}

/**
 * Get capture status message.
 */
export function getCaptureStatusMessage(
  config: NotificationOnlyConfig,
  viewerType: 'child' | 'parent'
): string {
  if (isInNotificationOnlyMode(config)) {
    if (viewerType === 'child') {
      return 'Screenshots are paused. You have maximum privacy in notification-only mode.'
    }
    return 'Screenshots are paused. Daily summaries are sent instead.'
  }

  if (viewerType === 'child') {
    return 'Screenshots are being captured as part of your current monitoring level.'
  }
  return 'Screenshots are being captured according to the current frequency setting.'
}

// ============================================================================
// Time Limit Enforcement
// ============================================================================

/**
 * Determine if time limits should be enforced.
 * AC4: Time limits still enforced if configured.
 */
export function shouldEnforceTimeLimits(config: NotificationOnlyConfig): boolean {
  return config.timeLimitsStillEnforced
}

/**
 * Get time limits status message.
 */
export function getTimeLimitsMessage(
  config: NotificationOnlyConfig,
  viewerType: 'child' | 'parent'
): string {
  if (!isInNotificationOnlyMode(config)) {
    return 'Time limits are active.'
  }

  if (config.timeLimitsStillEnforced) {
    if (viewerType === 'child') {
      return 'Time limits are still active in notification-only mode.'
    }
    return 'Time limits remain enforced in notification-only mode.'
  }

  if (viewerType === 'child') {
    return 'Time limits are not active in notification-only mode.'
  }
  return 'Time limits are not enforced in notification-only mode.'
}

// ============================================================================
// Messaging Functions
// ============================================================================

/**
 * Get status message for notification-only mode.
 * AC5: Child sees "You're in notification-only mode - we trust you"
 */
export function getNotificationOnlyModeStatus(
  config: NotificationOnlyConfig,
  childName: string,
  viewerType: 'child' | 'parent'
): string {
  if (!isInNotificationOnlyMode(config)) {
    if (viewerType === 'child') {
      return 'Standard monitoring is active.'
    }
    return `Standard monitoring is active for ${childName}.`
  }

  // AC5: Child view message
  if (viewerType === 'child') {
    return "You're in notification-only mode - we trust you"
  }

  // Parent view
  return `${childName} is in notification-only mode. Daily summaries will be sent.`
}

/**
 * Get qualification message based on progress.
 */
export function getQualificationMessage(
  trustScore: number,
  daysAtThreshold: number,
  childName: string,
  viewerType: 'child' | 'parent'
): string {
  if (trustScore < NOTIFICATION_ONLY_TRUST_THRESHOLD) {
    if (viewerType === 'child') {
      return `Reach ${NOTIFICATION_ONLY_TRUST_THRESHOLD}% trust to start qualifying for notification-only mode.`
    }
    return `${childName} needs ${NOTIFICATION_ONLY_TRUST_THRESHOLD}% trust to qualify for notification-only mode.`
  }

  const daysRemaining = getDaysUntilQualification(trustScore, daysAtThreshold)

  if (daysRemaining === 0) {
    if (viewerType === 'child') {
      return 'You qualify for notification-only mode!'
    }
    return `${childName} qualifies for notification-only mode.`
  }

  if (viewerType === 'child') {
    return `${daysRemaining} more days at ${NOTIFICATION_ONLY_TRUST_THRESHOLD}%+ trust to qualify for notification-only mode.`
  }
  return `${childName} needs ${daysRemaining} more days at ${NOTIFICATION_ONLY_TRUST_THRESHOLD}%+ trust for notification-only mode.`
}
