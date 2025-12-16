/**
 * Privacy Gap Detector Service
 *
 * Story 7.8: Privacy Gaps Injection - Task 3
 *
 * Determines whether screenshot capture should be suppressed.
 *
 * CRITICAL SECURITY REQUIREMENT:
 * The return value NEVER indicates whether suppression is due to
 * a crisis URL or a privacy gap. From the parent's perspective,
 * all gaps appear identical and unexplained.
 */

import {
  type PrivacyGapConfig,
  type PrivacyGapSchedule,
  DEFAULT_PRIVACY_GAP_CONFIG,
} from '@fledgely/contracts'

// ============================================================================
// Types
// ============================================================================

/**
 * Configuration for the privacy gap detector
 */
export interface PrivacyGapDetectorConfig {
  /**
   * Function to fetch the gap schedule for a child on a given date
   * Should return null if no schedule exists
   */
  getSchedule: (childId: string, date: Date) => Promise<PrivacyGapSchedule | null>

  /**
   * Function to check if a URL is a crisis resource
   * This integrates with the crisis allowlist from Story 7.2
   */
  isCrisisUrl: (url: string) => boolean

  /**
   * Privacy gap configuration
   */
  privacyGapsConfig: PrivacyGapConfig
}

/**
 * Result of capture suppression check
 *
 * CRITICAL: This type intentionally has NO fields that indicate
 * WHY capture was suppressed. This ensures parents cannot distinguish
 * between crisis-related gaps and privacy gaps.
 */
export interface CaptureSuppressResult {
  /** Whether capture should be suppressed */
  suppress: boolean
}

/**
 * Privacy gap detector interface
 */
export interface PrivacyGapDetector {
  /**
   * Check if screenshot capture should be suppressed
   *
   * Suppression occurs for:
   * 1. Crisis URLs (always suppressed)
   * 2. Privacy gap windows (scheduled random suppressions)
   *
   * @param childId - Child's unique identifier
   * @param timestamp - When the capture would occur
   * @param url - URL being visited
   * @returns Result with suppress flag ONLY - no reason exposed
   */
  shouldSuppressCapture: (
    childId: string,
    timestamp: Date,
    url: string
  ) => Promise<CaptureSuppressResult>

  /**
   * Check if a timestamp falls within a scheduled privacy gap
   *
   * This is a lower-level function used internally.
   * For external use, prefer shouldSuppressCapture.
   *
   * @param childId - Child's unique identifier
   * @param timestamp - Timestamp to check
   * @returns True if within a scheduled gap
   */
  isWithinScheduledGap: (childId: string, timestamp: Date) => Promise<boolean>
}

// ============================================================================
// Implementation
// ============================================================================

/**
 * Create a privacy gap detector
 *
 * @param config - Detector configuration
 * @returns Privacy gap detector instance
 */
export function createPrivacyGapDetector(
  config: PrivacyGapDetectorConfig
): PrivacyGapDetector {
  const { getSchedule, isCrisisUrl, privacyGapsConfig } = config

  /**
   * Check if timestamp is within any gap in the schedule
   */
  function isWithinGaps(
    schedule: PrivacyGapSchedule,
    timestamp: Date
  ): boolean {
    const timestampMs = timestamp.getTime()

    for (const gap of schedule.gaps) {
      const startMs = new Date(gap.startTime).getTime()
      const endMs = new Date(gap.endTime).getTime()

      if (timestampMs >= startMs && timestampMs < endMs) {
        return true
      }
    }

    return false
  }

  /**
   * Check if capture should be suppressed for privacy gaps
   *
   * Returns suppress: true if within a scheduled gap
   */
  async function checkPrivacyGap(
    childId: string,
    timestamp: Date
  ): Promise<boolean> {
    // Privacy gaps disabled - no suppression
    if (!privacyGapsConfig.enabled) {
      return false
    }

    // Get schedule for this date
    const schedule = await getSchedule(childId, timestamp)

    if (!schedule) {
      return false
    }

    return isWithinGaps(schedule, timestamp)
  }

  return {
    async shouldSuppressCapture(
      childId: string,
      timestamp: Date,
      url: string
    ): Promise<CaptureSuppressResult> {
      // 1. Crisis URL check FIRST (highest priority)
      // CRITICAL: Do NOT log or track which URLs triggered this
      if (isCrisisUrl(url)) {
        return { suppress: true }
      }

      // 2. Privacy gap check
      const inPrivacyGap = await checkPrivacyGap(childId, timestamp)
      if (inPrivacyGap) {
        return { suppress: true }
      }

      // 3. No suppression needed
      return { suppress: false }
    },

    async isWithinScheduledGap(
      childId: string,
      timestamp: Date
    ): Promise<boolean> {
      // Get schedule for this date
      const schedule = await getSchedule(childId, timestamp)

      if (!schedule) {
        return false
      }

      return isWithinGaps(schedule, timestamp)
    },
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Create a simple in-memory schedule cache for testing
 *
 * In production, use Firestore-backed storage
 */
export function createInMemoryScheduleStore(): {
  get: (childId: string, date: Date) => Promise<PrivacyGapSchedule | null>
  set: (schedule: PrivacyGapSchedule) => void
  clear: () => void
} {
  const store = new Map<string, PrivacyGapSchedule>()

  return {
    async get(childId: string, date: Date): Promise<PrivacyGapSchedule | null> {
      const key = `${childId}:${date.toISOString().slice(0, 10)}`
      return store.get(key) ?? null
    },

    set(schedule: PrivacyGapSchedule): void {
      const key = `${schedule.childId}:${schedule.date}`
      store.set(key, schedule)
    },

    clear(): void {
      store.clear()
    },
  }
}

/**
 * Create a default detector configuration using provided functions
 */
export function createDefaultDetectorConfig(
  getSchedule: (childId: string, date: Date) => Promise<PrivacyGapSchedule | null>,
  isCrisisUrl: (url: string) => boolean,
  config: PrivacyGapConfig = DEFAULT_PRIVACY_GAP_CONFIG
): PrivacyGapDetectorConfig {
  return {
    getSchedule,
    isCrisisUrl,
    privacyGapsConfig: config,
  }
}
