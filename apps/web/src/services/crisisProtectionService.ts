/**
 * Crisis Protection Service
 *
 * Story 7.2: Crisis Visit Zero-Data-Path - Task 1
 *
 * CRITICAL SAFETY FEATURE: This service implements the zero-data-path
 * for crisis resource visits. When a child visits a crisis URL, NO data
 * is captured, logged, tracked, or notified.
 *
 * Key Architectural Invariant (INV-001): Crisis URLs NEVER captured
 *
 * This is a SYNCHRONOUS, BLOCKING check. It must complete BEFORE any
 * monitoring action is attempted. Never async. Never delayed. Never skipped.
 */

import { isCrisisUrl } from '@fledgely/shared'

/**
 * Guard type for use in monitoring hooks
 *
 * Implements all blocking interfaces for the zero-data-path.
 * All methods are synchronous and must be called BEFORE any capture attempt.
 */
export interface CrisisProtectionGuard {
  /** Primary check - should ALL monitoring be blocked? */
  shouldBlock: (url: string) => boolean

  /** AC: 1 - Should screenshot capture be blocked? */
  shouldBlockScreenshot: (url: string) => boolean

  /** AC: 2 - Should URL logging be blocked? */
  shouldBlockUrlLogging: (url: string) => boolean

  /** AC: 3 - Should time tracking be blocked? */
  shouldBlockTimeTracking: (url: string) => boolean

  /** AC: 4 - Should parent notification be blocked? */
  shouldBlockNotification: (url: string) => boolean

  /** AC: 5 - Should analytics recording be blocked? */
  shouldBlockAnalytics: (url: string) => boolean
}

/**
 * Check if monitoring should be blocked for this URL
 *
 * CRITICAL: This is the primary check function. It must be called
 * BEFORE any monitoring action is attempted.
 *
 * @param url - The URL being visited
 * @returns true if this is a crisis URL and ALL monitoring must be blocked
 */
export function shouldBlockMonitoring(url: string): boolean {
  // SYNCHRONOUS - no await, no promises
  // Defensive: handle null/undefined gracefully
  if (!url) {
    return false
  }

  try {
    return isCrisisUrl(url)
  } catch {
    // Fail-open for non-crisis URLs
    // If the check fails, we don't block normal browsing
    // (Crisis URLs will be caught by bundled fallback)
    return false
  }
}

/**
 * AC: 1 - Check if screenshot capture should be blocked
 *
 * @param url - The URL being visited
 * @returns true if NO screenshot should be captured
 */
export function shouldBlockScreenshot(url: string): boolean {
  return shouldBlockMonitoring(url)
}

/**
 * AC: 2 - Check if URL logging should be blocked
 *
 * @param url - The URL being visited
 * @returns true if URL should NOT be logged to activity history
 */
export function shouldBlockUrlLogging(url: string): boolean {
  return shouldBlockMonitoring(url)
}

/**
 * AC: 3 - Check if time tracking should be blocked
 *
 * @param url - The URL being visited
 * @returns true if time should NOT be counted against any category
 */
export function shouldBlockTimeTracking(url: string): boolean {
  return shouldBlockMonitoring(url)
}

/**
 * AC: 4 - Check if notifications should be blocked
 *
 * @param url - The URL being visited
 * @returns true if NO notification should be generated for parents
 */
export function shouldBlockNotification(url: string): boolean {
  return shouldBlockMonitoring(url)
}

/**
 * AC: 5 - Check if analytics should be blocked
 *
 * @param url - The URL being visited
 * @returns true if NO analytics event should be recorded
 */
export function shouldBlockAnalytics(url: string): boolean {
  return shouldBlockMonitoring(url)
}

/**
 * Default guard implementation
 *
 * Use this guard in all monitoring hooks to ensure consistent
 * protection across the entire system.
 *
 * @example
 * ```typescript
 * // In a monitoring hook
 * if (crisisGuard.shouldBlock(currentUrl)) {
 *   // STOP - do not capture, log, or track anything
 *   return
 * }
 * // Continue with normal monitoring...
 * ```
 */
export const crisisGuard: CrisisProtectionGuard = {
  shouldBlock: shouldBlockMonitoring,
  shouldBlockScreenshot,
  shouldBlockUrlLogging,
  shouldBlockTimeTracking,
  shouldBlockNotification,
  shouldBlockAnalytics,
}

/**
 * Type guard to check if a guard implements the CrisisProtectionGuard interface
 */
export function isCrisisProtectionGuard(
  guard: unknown
): guard is CrisisProtectionGuard {
  return (
    typeof guard === 'object' &&
    guard !== null &&
    'shouldBlock' in guard &&
    'shouldBlockScreenshot' in guard &&
    'shouldBlockUrlLogging' in guard &&
    'shouldBlockTimeTracking' in guard &&
    'shouldBlockNotification' in guard &&
    'shouldBlockAnalytics' in guard &&
    typeof (guard as CrisisProtectionGuard).shouldBlock === 'function'
  )
}
