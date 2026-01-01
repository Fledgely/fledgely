/**
 * Time Limit Warning System for Fledgely Chrome Extension
 *
 * Story 31.1: Countdown Warning System
 * Story 31.2: Neurodivergent Transition Accommodations
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
 *
 * Story 31.2 Accommodations:
 * - Early 30-minute warning for neurodivergent children
 * - Extended grace period before enforcement
 * - Calming colors instead of alarming red/orange
 * - Silent mode for notifications
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

// Neurodivergent accommodations (Story 31.2)
export interface NeurodivergentAccommodations {
  enabled: boolean
  earlyWarningEnabled: boolean
  earlyWarningMinutes: number
  gracePeriodMinutes: number
  calmingColorsEnabled: boolean
  silentModeEnabled: boolean
  gradualTransitionEnabled: boolean
}

export const DEFAULT_ACCOMMODATIONS: NeurodivergentAccommodations = {
  enabled: false,
  earlyWarningEnabled: true,
  earlyWarningMinutes: 30,
  gracePeriodMinutes: 5,
  calmingColorsEnabled: true,
  silentModeEnabled: false,
  gradualTransitionEnabled: true,
}

// Calming color palette for accommodated mode (Story 31.2 AC3)
export const CALMING_COLORS = {
  normal: '#14b8a6', // Soft teal (instead of green)
  earlyWarning: '#3b82f6', // Soft blue (30 min)
  firstWarning: '#a78bfa', // Lavender (15 min)
  secondWarning: '#8b5cf6', // Soft purple (5 min)
  finalWarning: '#fb923c', // Muted coral (1 min)
  gracePeriod: '#fbbf24', // Soft amber
  exceeded: '#f87171', // Muted red (softer than #ef4444)
}

// Standard alert colors
export const ALERT_COLORS = {
  normal: '#22c55e', // Green
  warning: '#eab308', // Yellow
  urgent: '#f97316', // Orange
  exceeded: '#ef4444', // Red
}

// Warning levels - extended for accommodations
export type WarningLevel = 'none' | 'early' | 'first' | 'second' | 'final' | 'grace' | 'exceeded'

// Warning state for tracking which warnings have been shown
export interface WarningState {
  lastWarningLevel: WarningLevel
  lastWarningAt: number | null
  warningsShownToday: {
    early: boolean
    first: boolean
    second: boolean
    final: boolean
  }
  lastResetDate: string // YYYY-MM-DD
  /** When grace period started (epoch ms), null if not in grace period */
  gracePeriodStartedAt: number | null
  /** Date when grace period was used (YYYY-MM-DD), prevents reuse same day */
  gracePeriodUsedDate: string | null
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
  accommodations: NeurodivergentAccommodations
  lastSyncedAt: number
}

/**
 * Get current warning state from storage
 */
export async function getWarningState(): Promise<WarningState> {
  const defaultState = (): WarningState => ({
    lastWarningLevel: 'none',
    lastWarningAt: null,
    warningsShownToday: { early: false, first: false, second: false, final: false },
    lastResetDate: getCurrentDateString(),
    gracePeriodStartedAt: null,
    gracePeriodUsedDate: null,
  })

  try {
    const result = await chrome.storage.local.get(STORAGE_KEY_WARNING_STATE)
    const state = result[STORAGE_KEY_WARNING_STATE]
    const today = getCurrentDateString()

    // Reset warnings if it's a new day
    if (state && state.lastResetDate !== today) {
      const newState = defaultState()
      await saveWarningState(newState)
      return newState
    }

    // Ensure state has all required fields (migration from older state shape)
    if (state) {
      return {
        lastWarningLevel: state.lastWarningLevel || 'none',
        lastWarningAt: state.lastWarningAt ?? null,
        warningsShownToday: {
          early: state.warningsShownToday?.early ?? false,
          first: state.warningsShownToday?.first ?? false,
          second: state.warningsShownToday?.second ?? false,
          final: state.warningsShownToday?.final ?? false,
        },
        lastResetDate: state.lastResetDate || today,
        gracePeriodStartedAt: state.gracePeriodStartedAt ?? null,
        gracePeriodUsedDate: state.gracePeriodUsedDate ?? null,
      }
    }

    return defaultState()
  } catch {
    return defaultState()
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
 * Story 31.2: Adds 'early' level for accommodated children and 'grace' for grace period
 */
export function determineWarningLevel(
  remainingMinutes: number | null,
  thresholds: WarningThresholds,
  accommodations?: NeurodivergentAccommodations,
  gracePeriodStartedAt?: number | null
): WarningLevel {
  if (remainingMinutes === null) {
    return 'none' // Unlimited
  }

  // Check if in grace period (Story 31.2 AC2)
  if (remainingMinutes <= 0) {
    if (accommodations?.enabled && gracePeriodStartedAt) {
      const gracePeriodMs = (accommodations.gracePeriodMinutes || 5) * 60 * 1000
      const elapsed = Date.now() - gracePeriodStartedAt
      if (elapsed < gracePeriodMs) {
        return 'grace'
      }
    }
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

  // Early warning for accommodated children (Story 31.2 AC1)
  if (
    accommodations?.enabled &&
    accommodations.earlyWarningEnabled &&
    remainingMinutes <= accommodations.earlyWarningMinutes
  ) {
    return 'early'
  }

  return 'none'
}

/**
 * Get warning message for the given level
 * Story 31.2: Added 'early' and 'grace' messages
 */
export function getWarningMessage(
  level: WarningLevel,
  remainingMinutes: number,
  graceMinutesRemaining?: number
): string {
  switch (level) {
    case 'early':
      return `${remainingMinutes} minutes left - start wrapping up soon`
    case 'first':
      return `${remainingMinutes} minutes left`
    case 'second':
      return `${remainingMinutes} minutes left`
    case 'final':
      return `${remainingMinutes} minute${remainingMinutes === 1 ? '' : 's'} - save your work`
    case 'grace':
      if (graceMinutesRemaining === 0) {
        return 'Time to wrap up now'
      }
      return `Time is up - ${graceMinutesRemaining || 5} minute${(graceMinutesRemaining || 5) === 1 ? '' : 's'} to finish up`
    case 'exceeded':
      return 'Screen time is up!'
    default:
      return ''
  }
}

/**
 * Get warning title for Chrome notification
 * Story 31.2: Added 'early' and 'grace' titles
 */
export function getWarningTitle(level: WarningLevel): string {
  switch (level) {
    case 'early':
      return 'Screen Time Heads Up'
    case 'first':
      return 'Screen Time Reminder'
    case 'second':
      return 'Screen Time Warning'
    case 'final':
      return 'Screen Time Almost Up'
    case 'grace':
      return 'Finishing Up Time'
    case 'exceeded':
      return 'Screen Time Limit Reached'
    default:
      return 'Fledgely'
  }
}

/**
 * Show a non-intrusive warning notification
 * Story 31.1 AC5: Warnings don't interrupt active work
 * Story 31.2 AC4: Silent mode for accommodated children
 */
export async function showWarningNotification(
  level: WarningLevel,
  remainingMinutes: number,
  accommodations?: NeurodivergentAccommodations,
  graceMinutesRemaining?: number
): Promise<void> {
  const message = getWarningMessage(level, remainingMinutes, graceMinutesRemaining)
  const title = getWarningTitle(level)

  // Determine if notification should be silent
  // Story 31.2 AC4: Accommodate silent mode preference
  // If parent enables silent mode, ALL notifications are silent
  // Otherwise, only 'first' warning is silent by default (gentle reminder)
  const isSilent = accommodations?.silentModeEnabled || level === 'first'

  // Use Chrome notifications API for non-intrusive alerts
  try {
    await chrome.notifications.create(`time-warning-${level}`, {
      type: 'basic',
      iconUrl: chrome.runtime.getURL('icons/icon48.png'),
      title,
      message,
      priority: level === 'final' || level === 'exceeded' ? 2 : 1, // Higher priority for urgent
      requireInteraction: level === 'exceeded', // Only persist for exceeded
      silent: isSilent,
    })
  } catch (error) {
    console.error('[Fledgely] Failed to show notification:', error)
  }
}

/**
 * Update extension badge with countdown timer
 * Story 31.1 AC4: Countdown timer in extension badge
 * Story 31.2 AC3: Calming colors for accommodated children
 */
export async function updateCountdownBadge(
  remainingMinutes: number | null,
  accommodations?: NeurodivergentAccommodations,
  warningLevel?: WarningLevel
): Promise<void> {
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

  // Use calming colors for accommodated children (Story 31.2 AC3)
  const useCalmingColors = accommodations?.enabled && accommodations?.calmingColorsEnabled

  if (warningLevel === 'grace') {
    // Grace period - show calming amber
    await chrome.action.setBadgeText({ text: 'GP' })
    await chrome.action.setBadgeBackgroundColor({
      color: useCalmingColors ? CALMING_COLORS.gracePeriod : ALERT_COLORS.urgent,
    })
    await chrome.action.setTitle({ title: 'Fledgely - Finishing up time' })
  } else if (remainingMinutes <= 0) {
    // Time exceeded
    await chrome.action.setBadgeText({ text: '0' })
    await chrome.action.setBadgeBackgroundColor({
      color: useCalmingColors ? CALMING_COLORS.exceeded : ALERT_COLORS.exceeded,
    })
    await chrome.action.setTitle({ title: 'Fledgely - Screen time is up!' })
  } else if (remainingMinutes <= 1) {
    // Final warning - 1 minute
    await chrome.action.setBadgeText({ text: String(remainingMinutes) })
    await chrome.action.setBadgeBackgroundColor({
      color: useCalmingColors ? CALMING_COLORS.finalWarning : ALERT_COLORS.urgent,
    })
    await chrome.action.setTitle({ title: `Fledgely - ${remainingMinutes}m remaining` })
  } else if (remainingMinutes <= 5) {
    // Second warning - under 5 minutes
    await chrome.action.setBadgeText({ text: String(remainingMinutes) })
    await chrome.action.setBadgeBackgroundColor({
      color: useCalmingColors ? CALMING_COLORS.secondWarning : ALERT_COLORS.urgent,
    })
    await chrome.action.setTitle({ title: `Fledgely - ${remainingMinutes}m remaining` })
  } else if (remainingMinutes <= 15) {
    // First warning - under 15 minutes
    await chrome.action.setBadgeText({ text: String(remainingMinutes) })
    await chrome.action.setBadgeBackgroundColor({
      color: useCalmingColors ? CALMING_COLORS.firstWarning : ALERT_COLORS.warning,
    })
    await chrome.action.setTitle({ title: `Fledgely - ${remainingMinutes}m remaining` })
  } else if (warningLevel === 'early' || remainingMinutes <= 30) {
    // Early warning for accommodated children
    await chrome.action.setBadgeText({ text: `${remainingMinutes}m` })
    await chrome.action.setBadgeBackgroundColor({
      color: useCalmingColors ? CALMING_COLORS.earlyWarning : ALERT_COLORS.normal,
    })
    await chrome.action.setTitle({ title: `Fledgely - ${remainingMinutes}m remaining` })
  } else if (remainingMinutes <= 60) {
    // Under an hour - show minutes
    await chrome.action.setBadgeText({ text: `${remainingMinutes}m` })
    await chrome.action.setBadgeBackgroundColor({
      color: useCalmingColors ? CALMING_COLORS.normal : ALERT_COLORS.normal,
    })
    await chrome.action.setTitle({ title: `Fledgely - ${remainingMinutes}m remaining` })
  } else {
    // More than an hour - show hours
    const hours = Math.floor(remainingMinutes / 60)
    await chrome.action.setBadgeText({ text: `${hours}h` })
    await chrome.action.setBadgeBackgroundColor({
      color: useCalmingColors ? CALMING_COLORS.normal : ALERT_COLORS.normal,
    })
    await chrome.action.setTitle({
      title: `Fledgely - ${hours}h ${remainingMinutes % 60}m remaining`,
    })
  }
}

/**
 * Check time limits and trigger warnings if needed
 * Called periodically by background alarm
 * Story 31.2: Added accommodation support with early warnings and grace period
 */
export async function checkAndTriggerWarnings(): Promise<void> {
  const config = await getTimeLimitConfig()
  if (!config || config.dailyTotalMinutes === null) {
    return // No limit configured
  }

  const remainingMinutes = await getRemainingMinutes()
  const state = await getWarningState()
  const thresholds = config.warningThresholds || DEFAULT_WARNING_THRESHOLDS
  const accommodations = config.accommodations || DEFAULT_ACCOMMODATIONS

  // Determine current warning level with accommodation support
  const currentLevel = determineWarningLevel(
    remainingMinutes,
    thresholds,
    accommodations,
    state.gracePeriodStartedAt
  )

  // Handle grace period start (Story 31.2 AC2)
  const today = getCurrentDateString()
  if (accommodations.enabled && remainingMinutes !== null && remainingMinutes <= 0) {
    // Only allow grace period once per day to prevent gaming the system
    if (state.gracePeriodUsedDate !== today) {
      if (state.gracePeriodStartedAt === null) {
        state.gracePeriodStartedAt = Date.now()
        state.gracePeriodUsedDate = today
        console.log('[Fledgely] Grace period started for accommodated child')
      }
    } else if (state.gracePeriodStartedAt !== null) {
      // Check if grace period has expired
      const gracePeriodMs = (accommodations.gracePeriodMinutes || 5) * 60 * 1000
      const elapsed = Date.now() - state.gracePeriodStartedAt
      if (elapsed >= gracePeriodMs) {
        state.gracePeriodStartedAt = null // Grace period expired
      }
    }
  } else if (remainingMinutes !== null && remainingMinutes > 0) {
    // Only clear grace period on a new day (daily reset)
    if (state.lastResetDate !== today) {
      state.gracePeriodStartedAt = null
      state.gracePeriodUsedDate = null
    }
  }

  // Calculate grace minutes remaining for notifications
  let graceMinutesRemaining: number | undefined
  if (currentLevel === 'grace' && state.gracePeriodStartedAt) {
    const gracePeriodMs = (accommodations.gracePeriodMinutes || 5) * 60 * 1000
    const elapsed = Date.now() - state.gracePeriodStartedAt
    // Use floor for realistic display (shows actual minutes left, not rounded up)
    graceMinutesRemaining = Math.max(0, Math.floor((gracePeriodMs - elapsed) / 60000))
  }

  // Update badge if enabled
  if (thresholds.showCountdownBadge) {
    await updateCountdownBadge(remainingMinutes, accommodations, currentLevel)
  }

  // Check if we need to show a new warning
  if (thresholds.showToastNotifications && remainingMinutes !== null) {
    // Only show each warning level once per day
    let shouldShowWarning = false

    if (currentLevel === 'early' && !state.warningsShownToday.early) {
      // Story 31.2 AC1: Early warning for accommodated children
      shouldShowWarning = true
      state.warningsShownToday.early = true
    } else if (currentLevel === 'first' && !state.warningsShownToday.first) {
      shouldShowWarning = true
      state.warningsShownToday.first = true
    } else if (currentLevel === 'second' && !state.warningsShownToday.second) {
      shouldShowWarning = true
      state.warningsShownToday.second = true
    } else if (currentLevel === 'final' && !state.warningsShownToday.final) {
      shouldShowWarning = true
      state.warningsShownToday.final = true
    } else if (currentLevel === 'grace' && state.lastWarningLevel !== 'grace') {
      // Show grace period notification when entering grace
      shouldShowWarning = true
    } else if (currentLevel === 'exceeded' && state.lastWarningLevel !== 'exceeded') {
      // Always show exceeded warning when first reaching it
      shouldShowWarning = true
    }

    if (shouldShowWarning) {
      await showWarningNotification(
        currentLevel,
        remainingMinutes,
        accommodations,
        graceMinutesRemaining
      )
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
 * Story 31.2: Added accommodation support
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

    // Parse accommodations with defaults (Story 31.2)
    const accommodations: NeurodivergentAccommodations = {
      enabled: data.accommodations?.enabled ?? DEFAULT_ACCOMMODATIONS.enabled,
      earlyWarningEnabled:
        data.accommodations?.earlyWarningEnabled ?? DEFAULT_ACCOMMODATIONS.earlyWarningEnabled,
      earlyWarningMinutes:
        data.accommodations?.earlyWarningMinutes ?? DEFAULT_ACCOMMODATIONS.earlyWarningMinutes,
      gracePeriodMinutes:
        data.accommodations?.gracePeriodMinutes ?? DEFAULT_ACCOMMODATIONS.gracePeriodMinutes,
      calmingColorsEnabled:
        data.accommodations?.calmingColorsEnabled ?? DEFAULT_ACCOMMODATIONS.calmingColorsEnabled,
      silentModeEnabled:
        data.accommodations?.silentModeEnabled ?? DEFAULT_ACCOMMODATIONS.silentModeEnabled,
      gradualTransitionEnabled:
        data.accommodations?.gradualTransitionEnabled ??
        DEFAULT_ACCOMMODATIONS.gradualTransitionEnabled,
    }

    const config: TimeLimitConfig = {
      dailyTotalMinutes,
      warningThresholds: data.warningThresholds || DEFAULT_WARNING_THRESHOLDS,
      accommodations,
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
 * Story 31.2: Added accommodation status
 */
export interface TimeLimitStatus {
  hasLimit: boolean
  dailyLimitMinutes: number | null
  usedMinutes: number
  remainingMinutes: number | null
  warningLevel: WarningLevel
  percentUsed: number | null
  accommodationsEnabled: boolean
  inGracePeriod: boolean
  graceMinutesRemaining: number | null
}

export async function getTimeLimitStatus(): Promise<TimeLimitStatus> {
  const config = await getTimeLimitConfig()
  const state = await getWarningState()
  const usedMinutes = await getTodayUsageMinutes()
  const remainingMinutes = await getRemainingMinutes()

  const hasLimit = config !== null && config.dailyTotalMinutes !== null
  const dailyLimitMinutes = config?.dailyTotalMinutes ?? null
  const accommodations = config?.accommodations || DEFAULT_ACCOMMODATIONS

  let warningLevel: WarningLevel = 'none'
  let percentUsed: number | null = null

  if (hasLimit && dailyLimitMinutes !== null) {
    const thresholds = config?.warningThresholds || DEFAULT_WARNING_THRESHOLDS
    warningLevel = determineWarningLevel(
      remainingMinutes,
      thresholds,
      accommodations,
      state.gracePeriodStartedAt
    )
    percentUsed = Math.min(100, Math.round((usedMinutes / dailyLimitMinutes) * 100))
  }

  // Calculate grace period status
  const inGracePeriod = warningLevel === 'grace'
  let graceMinutesRemaining: number | null = null
  if (inGracePeriod && state.gracePeriodStartedAt) {
    const gracePeriodMs = (accommodations.gracePeriodMinutes || 5) * 60 * 1000
    const elapsed = Date.now() - state.gracePeriodStartedAt
    graceMinutesRemaining = Math.max(0, Math.ceil((gracePeriodMs - elapsed) / 60000))
  }

  return {
    hasLimit,
    dailyLimitMinutes,
    usedMinutes,
    remainingMinutes,
    warningLevel,
    percentUsed,
    accommodationsEnabled: accommodations.enabled,
    inGracePeriod,
    graceMinutesRemaining,
  }
}
