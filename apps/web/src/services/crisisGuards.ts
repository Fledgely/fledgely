/**
 * Crisis Protection Guards
 *
 * Story 7.2: Crisis Visit Zero-Data-Path - Task 4
 *
 * Type definitions and guard implementations for use in monitoring hooks.
 * These guards ensure crisis URL protection is applied consistently
 * across all monitoring flows.
 *
 * CRITICAL: All guards must be SYNCHRONOUS and called BEFORE any capture.
 */

import {
  crisisGuard,
  type CrisisProtectionGuard,
} from './crisisProtectionService'

/**
 * Guard for screenshot capture flow
 *
 * AC: 1 - NO screenshot is captured during crisis URL visits
 *
 * @example
 * ```typescript
 * // In screenshot capture hook (placeholder - actual capture in Epic 10)
 * if (screenshotGuard.shouldBlock(currentUrl)) {
 *   return // Do not capture
 * }
 * captureScreenshot()
 * ```
 */
export const screenshotGuard = {
  shouldBlock: (url: string): boolean => crisisGuard.shouldBlockScreenshot(url),
}

/**
 * Guard for activity logging flow
 *
 * AC: 2 - NO URL is logged to activity history
 *
 * @example
 * ```typescript
 * // In activity logging hook
 * if (activityGuard.shouldBlock(currentUrl)) {
 *   return // Do not log
 * }
 * logActivity(currentUrl)
 * ```
 */
export const activityGuard = {
  shouldBlock: (url: string): boolean => crisisGuard.shouldBlockUrlLogging(url),
}

/**
 * Guard for time tracking flow
 *
 * AC: 3 - NO time is counted against any category
 *
 * @example
 * ```typescript
 * // In time tracking hook
 * if (timeTrackingGuard.shouldBlock(currentUrl)) {
 *   return // Do not track time
 * }
 * trackTime(currentUrl, duration)
 * ```
 */
export const timeTrackingGuard = {
  shouldBlock: (url: string): boolean =>
    crisisGuard.shouldBlockTimeTracking(url),
}

/**
 * Guard for notification flow
 *
 * AC: 4 - NO notification is generated for parents
 *
 * @example
 * ```typescript
 * // In notification hook
 * if (notificationGuard.shouldBlock(currentUrl)) {
 *   return // Do not notify
 * }
 * sendParentNotification(currentUrl)
 * ```
 */
export const notificationGuard = {
  shouldBlock: (url: string): boolean =>
    crisisGuard.shouldBlockNotification(url),
}

/**
 * Guard for analytics flow
 *
 * AC: 5 - NO analytics event is recorded
 *
 * @example
 * ```typescript
 * // In analytics hook
 * if (analyticsGuard.shouldBlock(currentUrl)) {
 *   return // Do not record
 * }
 * recordAnalytics(event)
 * ```
 */
export const analyticsGuard = {
  shouldBlock: (url: string): boolean => crisisGuard.shouldBlockAnalytics(url),
}

/**
 * Combined guard for use when all monitoring must be blocked
 *
 * Use this when a single check is needed for all monitoring types.
 */
export const allMonitoringGuard = {
  shouldBlock: (url: string): boolean => crisisGuard.shouldBlock(url),
}

/**
 * Guard type for monitoring flows
 *
 * All guards implement this interface for consistent usage.
 */
export interface MonitoringGuard {
  shouldBlock: (url: string) => boolean
}

/**
 * Re-export the main guard for convenience
 */
export { crisisGuard, type CrisisProtectionGuard }

/**
 * Platform-agnostic guard interface for native platform implementation
 *
 * Native platforms (iOS, Android) should implement this interface
 * to ensure consistent crisis protection across all platforms.
 *
 * FR62: Allowlist synchronized across platforms
 *
 * @example
 * ```swift
 * // iOS Implementation
 * class CrisisGuard: PlatformGuardInterface {
 *   func shouldBlockScreenshot(url: String) -> Bool {
 *     return isCrisisUrl(url)
 *   }
 *   // ... other methods
 * }
 * ```
 */
export interface PlatformGuardInterface {
  /** Check if screenshot should be blocked */
  shouldBlockScreenshot: (url: string) => boolean

  /** Check if URL logging should be blocked */
  shouldBlockUrlLogging: (url: string) => boolean

  /** Check if time tracking should be blocked */
  shouldBlockTimeTracking: (url: string) => boolean

  /** Check if notification should be blocked */
  shouldBlockNotification: (url: string) => boolean

  /** Check if analytics should be blocked */
  shouldBlockAnalytics: (url: string) => boolean

  /** Master check - blocks all monitoring */
  shouldBlockAll: (url: string) => boolean
}

/**
 * Create a platform guard from individual check functions
 *
 * Utility for native platform integration.
 */
export function createPlatformGuard(
  checkUrl: (url: string) => boolean
): PlatformGuardInterface {
  return {
    shouldBlockScreenshot: checkUrl,
    shouldBlockUrlLogging: checkUrl,
    shouldBlockTimeTracking: checkUrl,
    shouldBlockNotification: checkUrl,
    shouldBlockAnalytics: checkUrl,
    shouldBlockAll: checkUrl,
  }
}

/**
 * Default platform guard using the crisis check
 */
export const platformGuard: PlatformGuardInterface =
  createPlatformGuard(crisisGuard.shouldBlock)
