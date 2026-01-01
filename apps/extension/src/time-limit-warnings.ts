/**
 * Time Limit Warning System for Fledgely Chrome Extension
 *
 * Story 31.1: Countdown Warning System
 *
 * Tracks time usage against configured limits and triggers warnings
 * at configurable thresholds (default: 15m, 5m, 1m before limit).
 *
 * Features:
 * - AC1: 15-minute gentle warning ("15 minutes left")
 * - AC2: 5-minute prominent warning ("5 minutes left")
 * - AC3: 1-minute urgent warning ("1 minute - save your work")
 * - AC4: Countdown timer in extension badge
 * - AC5: Non-intrusive warnings (toast notifications)
 * - AC6: Configurable warning thresholds (FR143)
 */

import { getScreenTimeQueue, aggregateQueueEntries } from './screen-time'

// Default warning thresholds (matches schema defaults)
export interface WarningThresholds {
  firstWarningMinutes: number
  secondWarningMinutes: number
  finalWarningMinutes: number
  showCountdownBadge: boolean
  showToastNotifications: boolean
}

export const DEFAULT_WARNING_THRESHOLDS: WarningThresholds = {
  firstWarningMinutes: 15,
  secondWarningMinutes: 5,
  finalWarningMinutes: 1,
  showCountdownBadge: true,
  showToastNotifications: true,
}

// Warning levels
export type WarningLevel = 'none' | 'first' | 'second' | 'final' | 'exceeded'

// Warning state for tracking which warnings have been shown
export interface WarningState {
  lastWarningLevel: WarningLevel
  lastWarningAt: number | null
  warningsShownToday: {
    first: boolean
    second: boolean
    final: boolean
  }
  lastResetDate: string // YYYY-MM-DD
}

const STORAGE_KEY_WARNING_STATE = 'timeLimitWarningState'
const STORAGE_KEY_TIME_LIMITS = 'timeLimitConfig'

// Alarm for periodic warning checks
export const ALARM_WARNING_CHECK = 'time-limit-warning-check'
export const WARNING_CHECK_INTERVAL_MINUTES = 1

/**
 * Time limit configuration cached from Firestore
 */
export interface TimeLimitConfig {
  dailyTotalMinutes: number | null // null = unlimited
  warningThresholds: WarningThresholds
  lastSyncedAt: number
}

/**
 * Get current warning state from storage
 */
export async function getWarningState(): Promise<WarningState> {
  try {
    const result = await chrome.storage.local.get(STORAGE_KEY_WARNING_STATE)
    const state = result[STORAGE_KEY_WARNING_STATE]
    const today = getCurrentDateString()

    // Reset warnings if it's a new day
    if (state && state.lastResetDate !== today) {
      const newState: WarningState = {
        lastWarningLevel: 'none',
        lastWarningAt: null,
        warningsShownToday: { first: false, second: false, final: false },
        lastResetDate: today,
      }
      await saveWarningState(newState)
      return newState
    }

    return (
      state || {
        lastWarningLevel: 'none',
        lastWarningAt: null,
        warningsShownToday: { first: false, second: false, final: false },
        lastResetDate: today,
      }
    )
  } catch {
    return {
      lastWarningLevel: 'none',
      lastWarningAt: null,
      warningsShownToday: { first: false, second: false, final: false },
      lastResetDate: getCurrentDateString(),
    }
  }
}

/**
 * Save warning state to storage
 */
async function saveWarningState(state: WarningState): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_KEY_WARNING_STATE]: state })
}

/**
 * Get cached time limit configuration
 */
export async function getTimeLimitConfig(): Promise<TimeLimitConfig | null> {
  try {
    const result = await chrome.storage.local.get(STORAGE_KEY_TIME_LIMITS)
    return result[STORAGE_KEY_TIME_LIMITS] || null
  } catch {
    return null
  }
}

/**
 * Save time limit configuration to storage
 */
export async function saveTimeLimitConfig(config: TimeLimitConfig): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_KEY_TIME_LIMITS]: config })
}

/**
 * Get current date string in YYYY-MM-DD format
 */
function getCurrentDateString(): string {
  return new Date().toISOString().split('T')[0]
}

/**
 * Calculate total minutes used today from screen time queue
 */
export async function getTodayUsageMinutes(): Promise<number> {
  const queue = await getScreenTimeQueue()
  if (queue.length === 0) return 0

  const today = getCurrentDateString()
  const aggregated = aggregateQueueEntries(queue)

  let totalMinutes = 0
  for (const [dateKey, categoryMap] of aggregated) {
    const [date] = dateKey.split('|')
    if (date === today) {
      for (const minutes of categoryMap.values()) {
        totalMinutes += minutes
      }
    }
  }

  return Math.round(totalMinutes)
}

/**
 * Calculate remaining time based on usage and limit
 */
export async function getRemainingMinutes(): Promise<number | null> {
  const config = await getTimeLimitConfig()
  if (!config || config.dailyTotalMinutes === null) {
    return null // Unlimited
  }

  const usedMinutes = await getTodayUsageMinutes()
  return Math.max(0, config.dailyTotalMinutes - usedMinutes)
}

/**
 * Determine the current warning level based on remaining time
 */
export function determineWarningLevel(
  remainingMinutes: number | null,
  thresholds: WarningThresholds
): WarningLevel {
  if (remainingMinutes === null) {
    return 'none' // Unlimited
  }

  if (remainingMinutes <= 0) {
    return 'exceeded'
  }

  if (remainingMinutes <= thresholds.finalWarningMinutes) {
    return 'final'
  }

  if (remainingMinutes <= thresholds.secondWarningMinutes) {
    return 'second'
  }

  if (remainingMinutes <= thresholds.firstWarningMinutes) {
    return 'first'
  }

  return 'none'
}

/**
 * Get warning message for the given level
 */
export function getWarningMessage(level: WarningLevel, remainingMinutes: number): string {
  switch (level) {
    case 'first':
      return `${remainingMinutes} minutes left`
    case 'second':
      return `${remainingMinutes} minutes left`
    case 'final':
      return `${remainingMinutes} minute${remainingMinutes === 1 ? '' : 's'} - save your work`
    case 'exceeded':
      return 'Screen time is up!'
    default:
      return ''
  }
}

/**
 * Get warning title for Chrome notification
 */
export function getWarningTitle(level: WarningLevel): string {
  switch (level) {
    case 'first':
      return 'Screen Time Reminder'
    case 'second':
      return 'Screen Time Warning'
    case 'final':
      return 'Screen Time Almost Up'
    case 'exceeded':
      return 'Screen Time Limit Reached'
    default:
      return 'Fledgely'
  }
}

/**
 * Show a non-intrusive warning notification
 * Story 31.1 AC5: Warnings don't interrupt active work
 */
export async function showWarningNotification(
  level: WarningLevel,
  remainingMinutes: number
): Promise<void> {
  const message = getWarningMessage(level, remainingMinutes)
  const title = getWarningTitle(level)

  // Use Chrome notifications API for non-intrusive alerts
  try {
    await chrome.notifications.create(`time-warning-${level}`, {
      type: 'basic',
      iconUrl: chrome.runtime.getURL('icons/icon48.png'),
      title,
      message,
      priority: level === 'final' || level === 'exceeded' ? 2 : 1, // Higher priority for urgent
      requireInteraction: level === 'exceeded', // Only persist for exceeded
      silent: level === 'first', // Silent for gentle warnings
    })
  } catch (error) {
    console.error('[Fledgely] Failed to show notification:', error)
  }
}

/**
 * Update extension badge with countdown timer
 * Story 31.1 AC4: Countdown timer in extension badge
 */
export async function updateCountdownBadge(remainingMinutes: number | null): Promise<void> {
  if (remainingMinutes === null) {
    // No limit - clear any existing countdown badge
    try {
      await chrome.action.setBadgeText({ text: '' })
      await chrome.action.setTitle({ title: 'Fledgely' })
    } catch {
      // Badge API may not be available in all contexts
    }
    return
  }

  if (remainingMinutes <= 0) {
    // Time exceeded - show red warning
    await chrome.action.setBadgeText({ text: '0' })
    await chrome.action.setBadgeBackgroundColor({ color: '#ef4444' }) // Red
    await chrome.action.setTitle({ title: 'Fledgely - Screen time is up!' })
  } else if (remainingMinutes <= 5) {
    // Under 5 minutes - show orange warning with minutes
    await chrome.action.setBadgeText({ text: String(remainingMinutes) })
    await chrome.action.setBadgeBackgroundColor({ color: '#f97316' }) // Orange
    await chrome.action.setTitle({ title: `Fledgely - ${remainingMinutes}m remaining` })
  } else if (remainingMinutes <= 15) {
    // Under 15 minutes - show yellow with minutes
    await chrome.action.setBadgeText({ text: String(remainingMinutes) })
    await chrome.action.setBadgeBackgroundColor({ color: '#eab308' }) // Yellow
    await chrome.action.setTitle({ title: `Fledgely - ${remainingMinutes}m remaining` })
  } else if (remainingMinutes <= 60) {
    // Under an hour - show minutes
    await chrome.action.setBadgeText({ text: `${remainingMinutes}m` })
    await chrome.action.setBadgeBackgroundColor({ color: '#22c55e' }) // Green
    await chrome.action.setTitle({ title: `Fledgely - ${remainingMinutes}m remaining` })
  } else {
    // More than an hour - show hours
    const hours = Math.floor(remainingMinutes / 60)
    await chrome.action.setBadgeText({ text: `${hours}h` })
    await chrome.action.setBadgeBackgroundColor({ color: '#22c55e' }) // Green
    await chrome.action.setTitle({
      title: `Fledgely - ${hours}h ${remainingMinutes % 60}m remaining`,
    })
  }
}

/**
 * Check time limits and trigger warnings if needed
 * Called periodically by background alarm
 */
export async function checkAndTriggerWarnings(): Promise<void> {
  const config = await getTimeLimitConfig()
  if (!config || config.dailyTotalMinutes === null) {
    return // No limit configured
  }

  const remainingMinutes = await getRemainingMinutes()
  const state = await getWarningState()
  const thresholds = config.warningThresholds || DEFAULT_WARNING_THRESHOLDS

  // Update badge if enabled
  if (thresholds.showCountdownBadge) {
    await updateCountdownBadge(remainingMinutes)
  }

  // Determine current warning level
  const currentLevel = determineWarningLevel(remainingMinutes, thresholds)

  // Check if we need to show a new warning
  if (thresholds.showToastNotifications && remainingMinutes !== null) {
    // Only show each warning level once per day
    let shouldShowWarning = false

    if (currentLevel === 'first' && !state.warningsShownToday.first) {
      shouldShowWarning = true
      state.warningsShownToday.first = true
    } else if (currentLevel === 'second' && !state.warningsShownToday.second) {
      shouldShowWarning = true
      state.warningsShownToday.second = true
    } else if (currentLevel === 'final' && !state.warningsShownToday.final) {
      shouldShowWarning = true
      state.warningsShownToday.final = true
    } else if (currentLevel === 'exceeded' && state.lastWarningLevel !== 'exceeded') {
      // Always show exceeded warning when first reaching it
      shouldShowWarning = true
    }

    if (shouldShowWarning) {
      await showWarningNotification(currentLevel, remainingMinutes)
    }
  }

  // Update state
  state.lastWarningLevel = currentLevel
  state.lastWarningAt = Date.now()
  await saveWarningState(state)
}

/**
 * Initialize warning system alarm
 * Called from background.ts during startup
 */
export function setupWarningCheckAlarm(): void {
  chrome.alarms.create(ALARM_WARNING_CHECK, {
    delayInMinutes: 1,
    periodInMinutes: WARNING_CHECK_INTERVAL_MINUTES,
  })
  console.log('[Fledgely] Warning check alarm configured (every 1 minute)')
}

/**
 * Sync time limit configuration from Firestore
 * Called when extension starts or when limits are updated
 */
export async function syncTimeLimitConfig(
  childId: string,
  familyId: string
): Promise<TimeLimitConfig | null> {
  try {
    // Fetch time limit config from Firestore via cloud function
    const response = await fetch(
      'https://us-central1-fledgely-cns-me.cloudfunctions.net/getTimeLimitConfig',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ childId, familyId }),
      }
    )

    if (!response.ok) {
      console.error('[Fledgely] Failed to fetch time limit config:', response.status)
      return null
    }

    const data = await response.json()

    // Extract daily total from config
    let dailyTotalMinutes: number | null = null
    if (data.dailyTotal?.weekdayMinutes !== undefined) {
      // Use weekday/weekend based on current day
      const today = new Date().getDay()
      const isWeekend = today === 0 || today === 6
      dailyTotalMinutes = isWeekend
        ? (data.dailyTotal.weekendMinutes ?? null)
        : (data.dailyTotal.weekdayMinutes ?? null)
    }

    const config: TimeLimitConfig = {
      dailyTotalMinutes,
      warningThresholds: data.warningThresholds || DEFAULT_WARNING_THRESHOLDS,
      lastSyncedAt: Date.now(),
    }

    await saveTimeLimitConfig(config)
    console.log('[Fledgely] Time limit config synced:', config)
    return config
  } catch (error) {
    console.error('[Fledgely] Error syncing time limit config:', error)
    return null
  }
}

/**
 * Clear warning state (e.g., on child disconnect)
 */
export async function clearWarningState(): Promise<void> {
  await chrome.storage.local.remove([STORAGE_KEY_WARNING_STATE, STORAGE_KEY_TIME_LIMITS])
  console.log('[Fledgely] Warning state cleared')
}

/**
 * Get current time limit status for popup display
 */
export interface TimeLimitStatus {
  hasLimit: boolean
  dailyLimitMinutes: number | null
  usedMinutes: number
  remainingMinutes: number | null
  warningLevel: WarningLevel
  percentUsed: number | null
}

export async function getTimeLimitStatus(): Promise<TimeLimitStatus> {
  const config = await getTimeLimitConfig()
  const usedMinutes = await getTodayUsageMinutes()
  const remainingMinutes = await getRemainingMinutes()

  const hasLimit = config !== null && config.dailyTotalMinutes !== null
  const dailyLimitMinutes = config?.dailyTotalMinutes ?? null

  let warningLevel: WarningLevel = 'none'
  let percentUsed: number | null = null

  if (hasLimit && dailyLimitMinutes !== null) {
    const thresholds = config?.warningThresholds || DEFAULT_WARNING_THRESHOLDS
    warningLevel = determineWarningLevel(remainingMinutes, thresholds)
    percentUsed = Math.min(100, Math.round((usedMinutes / dailyLimitMinutes) * 100))
  }

  return {
    hasLimit,
    dailyLimitMinutes,
    usedMinutes,
    remainingMinutes,
    warningLevel,
    percentUsed,
  }
}
