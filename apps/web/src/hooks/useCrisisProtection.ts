/**
 * useCrisisProtection Hook
 *
 * Story 7.2: Crisis Visit Zero-Data-Path - Task 2
 *
 * React hook providing synchronous blocking checks for crisis URL protection.
 *
 * CRITICAL: AC 6 - Check happens BEFORE any capture attempt (synchronous blocking)
 *
 * This hook wraps the crisisProtectionService for use in React components,
 * providing memoized functions that guarantee synchronous execution.
 */

import { useCallback, useMemo } from 'react'
import {
  shouldBlockMonitoring,
  crisisGuard,
} from '@/services/crisisProtectionService'

/**
 * Hook return type for crisis protection
 */
export interface UseCrisisProtectionReturn {
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

  /**
   * Helper function to check a URL directly (alias for shouldBlock)
   *
   * @param url - The URL to check against the crisis allowlist
   * @returns true if the URL is a crisis URL and monitoring should be blocked
   */
  checkUrl: (url: string) => boolean
}

/**
 * React hook for crisis protection checks
 *
 * Provides synchronous blocking functions that MUST be called
 * BEFORE any monitoring action is attempted.
 *
 * @example
 * ```typescript
 * const { shouldBlock, shouldBlockScreenshot } = useCrisisProtection()
 *
 * // In a monitoring flow
 * if (shouldBlock(currentUrl)) {
 *   // STOP - do not capture, log, or track anything
 *   return
 * }
 * // Continue with normal monitoring...
 * ```
 *
 * @returns Object containing all blocking check functions
 */
export function useCrisisProtection(): UseCrisisProtectionReturn {
  // Memoize the check functions to maintain referential stability
  // while keeping them synchronous

  const shouldBlock = useCallback((url: string): boolean => {
    return crisisGuard.shouldBlock(url)
  }, [])

  const shouldBlockScreenshot = useCallback((url: string): boolean => {
    return crisisGuard.shouldBlockScreenshot(url)
  }, [])

  const shouldBlockUrlLogging = useCallback((url: string): boolean => {
    return crisisGuard.shouldBlockUrlLogging(url)
  }, [])

  const shouldBlockTimeTracking = useCallback((url: string): boolean => {
    return crisisGuard.shouldBlockTimeTracking(url)
  }, [])

  const shouldBlockNotification = useCallback((url: string): boolean => {
    return crisisGuard.shouldBlockNotification(url)
  }, [])

  const shouldBlockAnalytics = useCallback((url: string): boolean => {
    return crisisGuard.shouldBlockAnalytics(url)
  }, [])

  const checkUrl = useCallback((url: string): boolean => {
    return shouldBlockMonitoring(url)
  }, [])

  return useMemo(
    () => ({
      shouldBlock,
      shouldBlockScreenshot,
      shouldBlockUrlLogging,
      shouldBlockTimeTracking,
      shouldBlockNotification,
      shouldBlockAnalytics,
      checkUrl,
    }),
    [
      shouldBlock,
      shouldBlockScreenshot,
      shouldBlockUrlLogging,
      shouldBlockTimeTracking,
      shouldBlockNotification,
      shouldBlockAnalytics,
      checkUrl,
    ]
  )
}

/**
 * Measure the duration of a crisis URL check
 *
 * Used for performance monitoring to ensure checks complete
 * within the target threshold (<10ms).
 *
 * @param url - The URL to check
 * @returns Duration in milliseconds
 */
export function measureCheckDuration(url: string): number {
  const start = performance.now()
  shouldBlockMonitoring(url)
  const end = performance.now()
  return end - start
}
