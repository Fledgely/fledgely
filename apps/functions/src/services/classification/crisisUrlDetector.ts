/**
 * Crisis URL Detector
 *
 * Story 21.2: Distress Detection Suppression (FR21A) - AC3
 *
 * Detects when a screenshot URL is from a crisis resource website.
 * When a crisis URL is detected, no concern flags are created and
 * no parent alerts are sent - this protects children seeking help.
 */

import { getAllProtectedDomains } from '@fledgely/shared'

/**
 * Check if a URL is from a crisis resource website.
 *
 * Story 21.2: Distress Detection Suppression (FR21A) - AC3
 *
 * When true:
 * - No concern flags are created
 * - No parent alerts are sent
 * - Classification proceeds with crisisProtected: true
 *
 * @param url - The URL to check
 * @returns true if URL is from a protected crisis resource
 */
export function isCrisisUrl(url: string): boolean {
  if (!url || typeof url !== 'string') {
    return false
  }

  try {
    const parsedUrl = new URL(url)

    // Only allow http/https protocols
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      return false
    }

    const hostname = parsedUrl.hostname.toLowerCase()
    const protectedDomains = getAllProtectedDomains()

    // Check exact match
    if (protectedDomains.has(hostname)) {
      return true
    }

    // Check parent domains for subdomain matching
    // e.g., "www.988lifeline.org" should match "988lifeline.org"
    const parts = hostname.split('.')
    for (let i = 1; i < parts.length; i++) {
      const parent = parts.slice(i).join('.')
      if (protectedDomains.has(parent)) {
        return true
      }
    }

    return false
  } catch {
    // Invalid URL format
    return false
  }
}

/**
 * Check if content is distress-related based on concern categories.
 *
 * Story 21.2: Distress Detection Suppression (FR21A) - AC1, AC2
 *
 * @param concernCategories - Array of detected concern categories
 * @returns true if any concern indicates distress
 */
export function isDistressContent(
  concernCategories: Array<{ category: string; severity?: string }>
): boolean {
  if (!concernCategories || !Array.isArray(concernCategories)) {
    return false
  }

  // Self-Harm Indicators is the primary distress indicator
  return concernCategories.some((c) => c.category === 'Self-Harm Indicators')
}

/**
 * Calculate the release timestamp for a suppressed flag.
 *
 * Story 21.2: Distress Detection Suppression (FR21A) - AC6
 *
 * @param timestamp - When the flag was created (epoch ms)
 * @returns When the flag may be released (48 hours later)
 */
export function calculateReleasableAfter(timestamp: number): number {
  const FORTY_EIGHT_HOURS_MS = 48 * 60 * 60 * 1000
  return timestamp + FORTY_EIGHT_HOURS_MS
}
