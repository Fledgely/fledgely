/**
 * Reverse Mode Service - Story 52.2 Task 2
 *
 * Service functions for Reverse Mode eligibility, status checks, and audit events.
 *
 * AC1: Check if child is 16+ for reverse mode visibility
 * AC2: Confirmation content for understanding
 * AC3: Check mode status
 * AC6: Create audit events for logging
 */

import {
  type ReverseModeSettings,
  type ReverseModeChangeEvent,
  type ReverseModeStatusValue,
  type ReverseModeConfirmationContent,
  ReverseModeStatus,
  ReverseModeChangeType,
  createReverseModeChangeEvent,
  isReverseModeActive as checkReverseModeActive,
  isReverseModePending as checkReverseModePending,
  getReverseModeConfirmationContent as getConfirmationContentFromContract,
  getDefaultSharingPreferences,
  DEFAULT_REVERSE_MODE_SETTINGS,
} from '../contracts/reverseMode'
import { is16OrOlder } from './age16TransitionService'

// ============================================
// Eligibility Functions
// ============================================

/**
 * Check if a child can activate reverse mode.
 * AC1: Reverse Mode option visible only if child is 16 or older.
 *
 * @param birthdate - Child's birthdate
 * @param referenceDate - Optional reference date (defaults to now)
 * @returns True if child is 16+ and eligible for reverse mode
 */
export function canActivateReverseMode(birthdate: Date, referenceDate: Date = new Date()): boolean {
  return is16OrOlder(birthdate, referenceDate)
}

/**
 * Check if reverse mode can be activated for a child with settings.
 * Returns false if already active.
 *
 * @param birthdate - Child's birthdate
 * @param currentSettings - Current reverse mode settings
 * @param referenceDate - Optional reference date
 * @returns True if child can activate reverse mode
 */
export function canActivateWithSettings(
  birthdate: Date,
  currentSettings: ReverseModeSettings | null | undefined,
  referenceDate: Date = new Date()
): boolean {
  // Must be 16+
  if (!canActivateReverseMode(birthdate, referenceDate)) {
    return false
  }

  // Can't activate if already active
  if (isReverseModeActiveStatus(currentSettings)) {
    return false
  }

  return true
}

// ============================================
// Status Check Functions
// ============================================

/**
 * Check if reverse mode is currently active.
 * AC3: mode switch status check
 *
 * @param settings - Current reverse mode settings
 * @returns True if reverse mode is active
 */
export function isReverseModeActiveStatus(
  settings: ReverseModeSettings | null | undefined
): boolean {
  return checkReverseModeActive(settings)
}

/**
 * Check if reverse mode is pending confirmation.
 *
 * @param settings - Current reverse mode settings
 * @returns True if reverse mode is pending confirmation
 */
export function isReverseModePendingStatus(
  settings: ReverseModeSettings | null | undefined
): boolean {
  return checkReverseModePending(settings)
}

/**
 * Get current reverse mode status string.
 *
 * @param settings - Current reverse mode settings
 * @returns Status value
 */
export function getReverseModeStatus(
  settings: ReverseModeSettings | null | undefined
): ReverseModeStatusValue {
  if (!settings) {
    return ReverseModeStatus.OFF
  }
  return settings.status
}

/**
 * Check if reverse mode has ever been activated.
 *
 * @param settings - Current reverse mode settings
 * @returns True if reverse mode was ever activated
 */
export function wasEverActivated(settings: ReverseModeSettings | null | undefined): boolean {
  if (!settings) return false
  return settings.activatedAt !== undefined
}

// ============================================
// Confirmation Content
// ============================================

/**
 * Get the confirmation dialog content for reverse mode activation.
 * AC2: activation requires understanding confirmation
 *
 * @returns Confirmation content with steps and labels
 */
export function getReverseModeConfirmationContent(): ReverseModeConfirmationContent {
  return getConfirmationContentFromContract()
}

// ============================================
// Settings Management
// ============================================

/**
 * Create activation settings when reverse mode is activated.
 * AC3: default after activation: nothing shared with parents
 *
 * @param childId - ID of the child activating reverse mode
 * @returns New reverse mode settings with active status
 */
export function createActivationSettings(childId: string): ReverseModeSettings {
  return {
    status: 'active',
    activatedAt: new Date(),
    activatedBy: childId,
    sharingPreferences: getDefaultSharingPreferences(),
  }
}

/**
 * Create deactivation settings when reverse mode is deactivated.
 * AC5: can be deactivated anytime
 *
 * @param previousSettings - Previous settings (to preserve activation history)
 * @returns New reverse mode settings with off status
 */
export function createDeactivationSettings(
  previousSettings: ReverseModeSettings
): ReverseModeSettings {
  return {
    status: 'off',
    activatedAt: previousSettings.activatedAt,
    activatedBy: previousSettings.activatedBy,
    deactivatedAt: new Date(),
    sharingPreferences: undefined, // Clear sharing preferences when deactivated
  }
}

/**
 * Get default reverse mode settings (off state).
 *
 * @returns Default settings with off status
 */
export function getDefaultReverseModeSettings(): ReverseModeSettings {
  return { ...DEFAULT_REVERSE_MODE_SETTINGS }
}

// ============================================
// Audit Event Functions
// ============================================

/**
 * Create an activation audit event.
 * AC6: NFR42 mode changes logged
 *
 * @param childId - ID of the child
 * @param familyId - ID of the family
 * @param previousStatus - Previous status before activation
 * @param ipAddress - Optional IP address for audit
 * @param userAgent - Optional user agent for audit
 * @returns Audit event for activation
 */
export function createActivationEvent(
  childId: string,
  familyId: string,
  previousStatus: ReverseModeStatusValue = 'off',
  ipAddress?: string,
  userAgent?: string
): ReverseModeChangeEvent {
  return createReverseModeChangeEvent(
    childId,
    familyId,
    ReverseModeChangeType.ACTIVATED,
    previousStatus,
    ReverseModeStatus.ACTIVE,
    ipAddress,
    userAgent
  )
}

/**
 * Create a deactivation audit event.
 * AC6: NFR42 mode changes logged
 *
 * @param childId - ID of the child
 * @param familyId - ID of the family
 * @param ipAddress - Optional IP address for audit
 * @param userAgent - Optional user agent for audit
 * @returns Audit event for deactivation
 */
export function createDeactivationEvent(
  childId: string,
  familyId: string,
  ipAddress?: string,
  userAgent?: string
): ReverseModeChangeEvent {
  return createReverseModeChangeEvent(
    childId,
    familyId,
    ReverseModeChangeType.DEACTIVATED,
    ReverseModeStatus.ACTIVE,
    ReverseModeStatus.OFF,
    ipAddress,
    userAgent
  )
}

/**
 * Create a confirmation started audit event.
 *
 * @param childId - ID of the child
 * @param familyId - ID of the family
 * @param ipAddress - Optional IP address for audit
 * @param userAgent - Optional user agent for audit
 * @returns Audit event for confirmation started
 */
export function createConfirmationStartedEvent(
  childId: string,
  familyId: string,
  ipAddress?: string,
  userAgent?: string
): ReverseModeChangeEvent {
  return createReverseModeChangeEvent(
    childId,
    familyId,
    ReverseModeChangeType.CONFIRMATION_STARTED,
    ReverseModeStatus.OFF,
    ReverseModeStatus.PENDING_CONFIRMATION,
    ipAddress,
    userAgent
  )
}

/**
 * Create a confirmation cancelled audit event.
 *
 * @param childId - ID of the child
 * @param familyId - ID of the family
 * @param ipAddress - Optional IP address for audit
 * @param userAgent - Optional user agent for audit
 * @returns Audit event for confirmation cancelled
 */
export function createConfirmationCancelledEvent(
  childId: string,
  familyId: string,
  ipAddress?: string,
  userAgent?: string
): ReverseModeChangeEvent {
  return createReverseModeChangeEvent(
    childId,
    familyId,
    ReverseModeChangeType.CONFIRMATION_CANCELLED,
    ReverseModeStatus.PENDING_CONFIRMATION,
    ReverseModeStatus.OFF,
    ipAddress,
    userAgent
  )
}

// ============================================
// Validation Functions
// ============================================

/**
 * Validate that confirmation was properly acknowledged.
 *
 * @param acknowledged - Whether confirmation was acknowledged
 * @returns Validation result
 */
export function validateConfirmationAcknowledged(acknowledged: boolean): {
  valid: boolean
  error?: string
} {
  if (!acknowledged) {
    return {
      valid: false,
      error: 'You must acknowledge understanding before activating Reverse Mode',
    }
  }
  return { valid: true }
}

/**
 * Validate that a child can perform a reverse mode action.
 *
 * @param birthdate - Child's birthdate
 * @param action - Action being attempted
 * @returns Validation result
 */
export function validateReverseModeAction(
  birthdate: Date,
  _action: 'activate' | 'deactivate'
): { valid: boolean; error?: string } {
  if (!canActivateReverseMode(birthdate)) {
    return {
      valid: false,
      error: 'Reverse Mode is only available for children 16 years or older',
    }
  }
  return { valid: true }
}
