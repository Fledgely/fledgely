/**
 * Crisis Protection Service
 *
 * Story 7.2: Crisis Visit Zero-Data-Path - Task 1
 * Story 7.5: Fuzzy Domain Matching - Task 7
 *
 * CRITICAL SAFETY FEATURE: This service implements the zero-data-path
 * for crisis resource visits. When a child visits a crisis URL, NO data
 * is captured, logged, tracked, or notified.
 *
 * Key Architectural Invariant (INV-001): Crisis URLs NEVER captured
 *
 * This is a SYNCHRONOUS, BLOCKING check. It must complete BEFORE any
 * monitoring action is attempted. Never async. Never delayed. Never skipped.
 *
 * Story 7.5 Enhancement: Fuzzy matching catches common typos.
 * When a fuzzy match occurs, it's logged anonymously for allowlist improvement.
 */

import {
  isCrisisUrl,
  isCrisisUrlFuzzy,
  isCrisisSearchQuery,
  getResourcesForCategory,
} from '@fledgely/shared'
import type { CrisisSearchResult, CrisisSearchMatch } from '@fledgely/contracts'

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
 * Log a fuzzy match anonymously for allowlist improvement
 *
 * Story 7.5: Fuzzy Domain Matching - Task 7.3
 *
 * Fire-and-forget - non-blocking, won't affect monitoring decisions.
 *
 * @param inputDomain - The typo'd domain the user visited
 * @param matchedDomain - The crisis domain it matched against
 * @param distance - Levenshtein distance
 */
function logFuzzyMatch(inputDomain: string, matchedDomain: string, distance: number): void {
  // Fire and forget - don't await, don't block
  const logEndpoint = '/api/log-fuzzy-match'

  // Use beacon API for guaranteed delivery without blocking
  if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
    try {
      const payload = JSON.stringify({
        inputDomain,
        matchedDomain,
        distance,
        deviceType: 'web',
      })
      navigator.sendBeacon(logEndpoint, new Blob([payload], { type: 'application/json' }))
    } catch {
      // Silently fail - logging should never impact protection
    }
  } else {
    // Fallback to fetch for environments without beacon
    fetch(logEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        inputDomain,
        matchedDomain,
        distance,
        deviceType: 'web',
      }),
      // Fire and forget
      keepalive: true,
    }).catch(() => {
      // Silently fail - logging should never impact protection
    })
  }
}

/**
 * Check if monitoring should be blocked for this URL
 *
 * CRITICAL: This is the primary check function. It must be called
 * BEFORE any monitoring action is attempted.
 *
 * Story 7.5 Enhancement: Now includes fuzzy matching for typo protection.
 * Fuzzy matches are logged anonymously for allowlist improvement.
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
    // First try exact match (fastest path)
    if (isCrisisUrl(url)) {
      return true
    }

    // Try fuzzy match for typo protection (Story 7.5)
    const fuzzyResult = isCrisisUrlFuzzy(url)
    if (fuzzyResult.match) {
      // If it's a fuzzy match (not exact), log it for allowlist improvement
      if (fuzzyResult.fuzzy && fuzzyResult.matchedAgainst && fuzzyResult.distance) {
        // Extract domain from URL for logging
        const domain = url.toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0]
        logFuzzyMatch(domain, fuzzyResult.matchedAgainst, fuzzyResult.distance)
      }
      return true
    }

    return false
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

/**
 * Check if a search query indicates crisis intent
 *
 * Story 7.6: Crisis Search Redirection - Task 5
 *
 * CRITICAL SAFETY FEATURE: This is a ZERO-DATA-PATH function.
 * - NO logging of the search query
 * - NO analytics events
 * - NO parent notifications
 * - NO family audit trail
 *
 * The query is checked locally and immediately discarded.
 *
 * @param query - The search query to check
 * @returns CrisisSearchResult with interstitial recommendation and resources
 */
export function checkSearchQuery(query: string): CrisisSearchResult {
  // ZERO-DATA-PATH: NO logging, NO analytics, NO tracking
  // The query is processed locally and never persisted

  // Defensive: handle null/undefined gracefully
  if (!query || typeof query !== 'string') {
    return {
      shouldShowInterstitial: false,
      match: null,
      suggestedResources: [],
    }
  }

  try {
    // Check for crisis intent
    const match = isCrisisSearchQuery(query) as CrisisSearchMatch | null

    // No crisis intent detected
    if (!match) {
      return {
        shouldShowInterstitial: false,
        match: null,
        suggestedResources: [],
      }
    }

    // Crisis intent detected - get suggested resources
    // IMPORTANT: Do NOT log or persist the match details
    const suggestedResources = getResourcesForCategory(match.category)

    return {
      shouldShowInterstitial: true,
      match,
      suggestedResources,
    }
  } catch {
    // Fail-open for search queries
    // If the check fails, we don't show the interstitial
    return {
      shouldShowInterstitial: false,
      match: null,
      suggestedResources: [],
    }
  }
}
