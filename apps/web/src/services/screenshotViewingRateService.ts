/**
 * Screenshot Viewing Rate Service - Story 3A.5
 *
 * Tracks screenshot viewing rates per parent within rolling hour window.
 * Triggers alerts when rate threshold (50/hour) is exceeded.
 *
 * SECURITY: Threshold is hardcoded, NOT configurable (prevents gaming).
 */

import { httpsCallable } from 'firebase/functions'
import { getFunctionsInstance } from '../lib/firebase'

/**
 * Rate configuration - hardcoded, NOT configurable.
 * Story 3A.5 AC1: Rate threshold is NOT user-configurable (prevents gaming)
 */
export const VIEWING_RATE_CONFIG = {
  /** Maximum screenshots per window before alert */
  threshold: 50,
  /** Window size in minutes */
  windowMinutes: 60,
} as const

/**
 * A single screenshot view event.
 */
export interface ScreenshotViewEvent {
  /** Epoch milliseconds when screenshot was viewed */
  timestamp: number
  /** Optional screenshot ID (not sent in alerts) */
  screenshotId?: string
}

/**
 * Rate check result.
 */
export interface RateCheckResult {
  /** Whether rate threshold is exceeded */
  exceeded: boolean
  /** Current view count in window */
  count: number
  /** Oldest timestamp in current window */
  windowStart: number
  /** Most recent timestamp */
  windowEnd: number
}

/**
 * Alert input for Cloud Function.
 */
export interface SendViewingRateAlertInput {
  familyId: string
  viewerUid: string
  viewCount: number
  timeframeStart: number
  timeframeEnd: number
}

// Storage key prefix for session storage
const STORAGE_KEY_PREFIX = 'fledgely_screenshot_views_'

/**
 * Get storage key for a specific user.
 */
function getStorageKey(viewerUid: string): string {
  return `${STORAGE_KEY_PREFIX}${viewerUid}`
}

/**
 * Get current view events from session storage.
 */
export function getViewEvents(viewerUid: string): ScreenshotViewEvent[] {
  if (typeof window === 'undefined' || !window.sessionStorage) {
    return []
  }

  try {
    const stored = window.sessionStorage.getItem(getStorageKey(viewerUid))
    if (!stored) {
      return []
    }
    return JSON.parse(stored) as ScreenshotViewEvent[]
  } catch {
    return []
  }
}

/**
 * Save view events to session storage.
 */
function saveViewEvents(viewerUid: string, events: ScreenshotViewEvent[]): void {
  if (typeof window === 'undefined' || !window.sessionStorage) {
    return
  }

  try {
    window.sessionStorage.setItem(getStorageKey(viewerUid), JSON.stringify(events))
  } catch {
    // Storage full or unavailable - fail silently
  }
}

/**
 * Filter events to only those within the rate window.
 */
export function filterToWindow(events: ScreenshotViewEvent[]): ScreenshotViewEvent[] {
  const now = Date.now()
  const windowMs = VIEWING_RATE_CONFIG.windowMinutes * 60 * 1000
  const cutoff = now - windowMs

  return events.filter((e) => e.timestamp >= cutoff)
}

/**
 * Track a screenshot view.
 *
 * @param viewerUid - UID of the user viewing the screenshot
 * @param screenshotId - Optional ID of the screenshot being viewed
 */
export function trackScreenshotView(viewerUid: string, screenshotId?: string): void {
  const events = getViewEvents(viewerUid)

  // Add new event
  events.push({
    timestamp: Date.now(),
    screenshotId,
  })

  // Filter to keep only events in window (prevent unbounded growth)
  const filteredEvents = filterToWindow(events)

  saveViewEvents(viewerUid, filteredEvents)
}

/**
 * Get the current viewing rate (count in window).
 *
 * @param viewerUid - UID of the user to check
 * @returns Count of screenshots viewed in the current window
 */
export function getViewingRate(viewerUid: string): number {
  const events = getViewEvents(viewerUid)
  const filtered = filterToWindow(events)
  return filtered.length
}

/**
 * Check if the viewing rate threshold is exceeded.
 *
 * @param viewerUid - UID of the user to check
 * @returns Rate check result with exceeded status and details
 */
export function checkThresholdExceeded(viewerUid: string): RateCheckResult {
  const events = getViewEvents(viewerUid)
  const filtered = filterToWindow(events)

  const count = filtered.length
  const exceeded = count > VIEWING_RATE_CONFIG.threshold

  // Get window boundaries
  const now = Date.now()
  const timestamps = filtered.map((e) => e.timestamp)
  const windowStart = timestamps.length > 0 ? Math.min(...timestamps) : now
  const windowEnd = timestamps.length > 0 ? Math.max(...timestamps) : now

  return {
    exceeded,
    count,
    windowStart,
    windowEnd,
  }
}

/**
 * Send viewing rate alert to co-parents via Cloud Function.
 *
 * @param input - Alert details
 */
export async function sendViewingRateAlert(input: SendViewingRateAlertInput): Promise<{
  success: boolean
  notifiedCount: number
  message: string
}> {
  const functions = getFunctionsInstance()
  const sendAlert = httpsCallable<
    SendViewingRateAlertInput,
    { success: boolean; notifiedCount: number; message: string }
  >(functions, 'sendViewingRateAlert')

  const result = await sendAlert(input)
  return result.data
}

/**
 * Clear all view events for a user (useful for testing or logout).
 *
 * @param viewerUid - UID of the user to clear
 */
export function clearViewEvents(viewerUid: string): void {
  if (typeof window === 'undefined' || !window.sessionStorage) {
    return
  }

  try {
    window.sessionStorage.removeItem(getStorageKey(viewerUid))
  } catch {
    // Ignore errors
  }
}

/**
 * Check if alert has already been sent this session.
 */
export function hasAlertBeenSentThisSession(viewerUid: string): boolean {
  if (typeof window === 'undefined' || !window.sessionStorage) {
    return false
  }

  try {
    const key = `${STORAGE_KEY_PREFIX}${viewerUid}_alert_sent`
    return window.sessionStorage.getItem(key) === 'true'
  } catch {
    return false
  }
}

/**
 * Mark alert as sent for this session.
 */
export function markAlertSentThisSession(viewerUid: string): void {
  if (typeof window === 'undefined' || !window.sessionStorage) {
    return
  }

  try {
    const key = `${STORAGE_KEY_PREFIX}${viewerUid}_alert_sent`
    window.sessionStorage.setItem(key, 'true')
  } catch {
    // Ignore errors
  }
}
