/**
 * Offline Schedule Enforcement for Fledgely Chrome Extension
 *
 * Story 32.3: Family Offline Time Enforcement
 *
 * Enforces family offline time windows across enrolled devices.
 * This is SEPARATE from daily time limit enforcement (Story 31.x):
 * - Time limits: Based on cumulative usage minutes
 * - Offline schedule: Based on clock time windows
 *
 * Features:
 * - AC1: "Family Offline Time" screen on child devices
 * - AC2: Non-essential sites blocked during offline window
 * - AC3: Parent devices get reminders only (optional enforcement)
 * - AC4: Emergency/crisis domains always allowed
 * - AC5: 5-minute warning before offline time starts
 * - AC6: Countdown badge showing minutes until start
 */

import { isUrlProtected } from './crisis-allowlist'

// Types from shared package (inline for extension bundle)
export interface OfflineTimeWindow {
  startTime: string // HH:MM format
  endTime: string // HH:MM format
  timezone: string
}

export interface FamilyOfflineSchedule {
  familyId: string
  enabled: boolean
  preset: 'custom' | 'dinner_time' | 'bedtime'
  weekdayWindow: OfflineTimeWindow | null
  weekendWindow: OfflineTimeWindow | null
  createdAt: number
  updatedAt: number
}

export interface ParentEnrolledDevice {
  deviceId: string
  parentUid: string
  deviceName: string
  deviceType: 'phone' | 'tablet' | 'laptop' | 'desktop' | 'other'
  enrolledAt: number
  active: boolean
}

// Storage keys
const STORAGE_KEY_OFFLINE_SCHEDULE = 'offlineSchedule'
const STORAGE_KEY_DEVICE_INFO = 'enrolledDeviceInfo'

// Firebase Cloud Functions API
const FIREBASE_PROJECT_ID = 'fledgely-cns-me'
const FIREBASE_REGION = 'us-central1'
const API_BASE_URL = `https://${FIREBASE_REGION}-${FIREBASE_PROJECT_ID}.cloudfunctions.net`

// Alarm for periodic schedule checks
export const ALARM_OFFLINE_CHECK = 'offline-schedule-check'
export const OFFLINE_CHECK_INTERVAL_MINUTES = 1

// Warning threshold (minutes before offline starts)
export const WARNING_THRESHOLD_MINUTES = 5

/**
 * Offline schedule state for UI display
 */
export interface OfflineScheduleState {
  schedule: FamilyOfflineSchedule | null
  isInOfflineWindow: boolean
  isWarningActive: boolean
  minutesUntilStart: number | null
  minutesUntilEnd: number | null
}

/**
 * Device info stored locally
 */
export interface EnrolledDeviceInfo {
  deviceId: string
  isParentDevice: boolean
  parentUid?: string
  childId?: string
  familyId: string
}

/**
 * Get cached offline schedule from storage
 */
export async function getOfflineSchedule(): Promise<FamilyOfflineSchedule | null> {
  try {
    const result = await chrome.storage.local.get(STORAGE_KEY_OFFLINE_SCHEDULE)
    return result[STORAGE_KEY_OFFLINE_SCHEDULE] || null
  } catch {
    return null
  }
}

/**
 * Save offline schedule to storage
 */
export async function saveOfflineSchedule(schedule: FamilyOfflineSchedule): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_KEY_OFFLINE_SCHEDULE]: schedule })
}

/**
 * Get enrolled device info from storage
 */
export async function getEnrolledDeviceInfo(): Promise<EnrolledDeviceInfo | null> {
  try {
    const result = await chrome.storage.local.get(STORAGE_KEY_DEVICE_INFO)
    return result[STORAGE_KEY_DEVICE_INFO] || null
  } catch {
    return null
  }
}

/**
 * Save enrolled device info to storage
 */
export async function saveEnrolledDeviceInfo(info: EnrolledDeviceInfo): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_KEY_DEVICE_INFO]: info })
}

/**
 * Parse time string (HH:MM) to minutes since midnight
 */
export function parseTimeToMinutes(timeStr: string): number {
  const [hours, minutes] = timeStr.split(':').map(Number)
  return hours * 60 + minutes
}

/**
 * Get current minutes since midnight
 */
export function getCurrentMinutes(): number {
  const now = new Date()
  return now.getHours() * 60 + now.getMinutes()
}

/**
 * Check if today is a weekend day
 */
export function isWeekend(): boolean {
  const day = new Date().getDay()
  return day === 0 || day === 6 // Sunday or Saturday
}

/**
 * Get the appropriate window for today (weekday or weekend)
 */
export function getTodayWindow(schedule: FamilyOfflineSchedule): OfflineTimeWindow | null {
  return isWeekend() ? schedule.weekendWindow : schedule.weekdayWindow
}

/**
 * Check if current time is within an offline window
 *
 * Handles overnight windows (e.g., 21:00-07:00) correctly.
 */
export function isWithinOfflineWindow(schedule: FamilyOfflineSchedule): boolean {
  if (!schedule.enabled) return false

  const window = getTodayWindow(schedule)
  if (!window) return false

  const currentMinutes = getCurrentMinutes()
  const startMinutes = parseTimeToMinutes(window.startTime)
  const endMinutes = parseTimeToMinutes(window.endTime)

  // Handle overnight windows (e.g., 21:00-07:00)
  if (endMinutes < startMinutes) {
    // Window spans midnight
    return currentMinutes >= startMinutes || currentMinutes < endMinutes
  }

  // Normal window (same day)
  return currentMinutes >= startMinutes && currentMinutes < endMinutes
}

/**
 * Calculate minutes until offline window starts
 *
 * Returns null if:
 * - Schedule is disabled
 * - Already within offline window
 * - No window configured for today
 */
export function getMinutesUntilStart(schedule: FamilyOfflineSchedule): number | null {
  if (!schedule.enabled) return null
  if (isWithinOfflineWindow(schedule)) return null

  const window = getTodayWindow(schedule)
  if (!window) return null

  const currentMinutes = getCurrentMinutes()
  const startMinutes = parseTimeToMinutes(window.startTime)

  if (currentMinutes >= startMinutes) {
    // Past start time today, no upcoming window today
    return null
  }

  return startMinutes - currentMinutes
}

/**
 * Calculate minutes until offline window ends
 *
 * Returns null if not currently in offline window
 */
export function getMinutesUntilEnd(schedule: FamilyOfflineSchedule): number | null {
  if (!schedule.enabled) return null
  if (!isWithinOfflineWindow(schedule)) return null

  const window = getTodayWindow(schedule)
  if (!window) return null

  const currentMinutes = getCurrentMinutes()
  const endMinutes = parseTimeToMinutes(window.endTime)
  const startMinutes = parseTimeToMinutes(window.startTime)

  // Handle overnight windows
  if (endMinutes < startMinutes) {
    if (currentMinutes >= startMinutes) {
      // Before midnight, calculate time to midnight + time after midnight
      return 24 * 60 - currentMinutes + endMinutes
    } else {
      // After midnight
      return endMinutes - currentMinutes
    }
  }

  return endMinutes - currentMinutes
}

/**
 * Check if warning should be shown (5 minutes before start)
 */
export function isWarningActive(schedule: FamilyOfflineSchedule): boolean {
  const minutesUntil = getMinutesUntilStart(schedule)
  if (minutesUntil === null) return false
  return minutesUntil <= WARNING_THRESHOLD_MINUTES && minutesUntil > 0
}

/**
 * Check if this is a parent device
 */
export async function isParentDevice(): Promise<boolean> {
  const deviceInfo = await getEnrolledDeviceInfo()
  return deviceInfo?.isParentDevice === true
}

/**
 * Check if URL should be blocked during offline time
 *
 * Never blocks:
 * - Chrome internal pages
 * - Extension pages
 * - Crisis/emergency resources
 */
export function shouldBlockForOffline(url: string): boolean {
  try {
    const urlObj = new URL(url)

    // Never block chrome:// or extension pages
    if (urlObj.protocol === 'chrome:' || urlObj.protocol === 'chrome-extension:') {
      return false
    }

    // Never block crisis resources (AC4)
    // Uses the same isUrlProtected logic as screenshot capture
    if (isUrlProtected(url)) {
      return false
    }

    // Block all other sites during offline time
    return true
  } catch {
    return false
  }
}

/**
 * Get current offline schedule state
 */
export async function getOfflineScheduleState(): Promise<OfflineScheduleState> {
  const schedule = await getOfflineSchedule()

  if (!schedule || !schedule.enabled) {
    return {
      schedule: null,
      isInOfflineWindow: false,
      isWarningActive: false,
      minutesUntilStart: null,
      minutesUntilEnd: null,
    }
  }

  return {
    schedule,
    isInOfflineWindow: isWithinOfflineWindow(schedule),
    isWarningActive: isWarningActive(schedule),
    minutesUntilStart: getMinutesUntilStart(schedule),
    minutesUntilEnd: getMinutesUntilEnd(schedule),
  }
}

/**
 * Check if notifications permission is granted
 * Notifications is an optional permission, so we need to check before using
 */
async function hasNotificationPermission(): Promise<boolean> {
  try {
    const result = await chrome.permissions.contains({ permissions: ['notifications'] })
    return result
  } catch {
    return false
  }
}

/**
 * Request notifications permission if not already granted
 * Returns true if permission is now available
 */
async function ensureNotificationPermission(): Promise<boolean> {
  if (await hasNotificationPermission()) {
    return true
  }
  try {
    // Note: This will show a permission prompt to the user
    const granted = await chrome.permissions.request({ permissions: ['notifications'] })
    return granted
  } catch {
    return false
  }
}

/**
 * Show parent reminder notification (AC3)
 */
export async function showParentReminder(): Promise<void> {
  try {
    // Check/request notification permission first
    if (!(await ensureNotificationPermission())) {
      console.log('[Fledgely] Notification permission not granted, skipping reminder')
      return
    }

    await chrome.notifications.create('family-offline-reminder', {
      type: 'basic',
      iconUrl: chrome.runtime.getURL('icons/icon48.png'),
      title: 'Family Offline Time',
      message: "It's family offline time! Lead by example 📱➡️✨",
      priority: 1,
      requireInteraction: false,
    })
    console.log('[Fledgely] Parent reminder shown')
  } catch (error) {
    console.error('[Fledgely] Failed to show parent reminder:', error)
  }
}

/**
 * Show warning notification before offline time starts (AC5)
 */
export async function showOfflineWarning(minutesRemaining: number): Promise<void> {
  try {
    // Check/request notification permission first
    if (!(await ensureNotificationPermission())) {
      console.log('[Fledgely] Notification permission not granted, skipping warning')
      return
    }

    await chrome.notifications.create('family-offline-warning', {
      type: 'basic',
      iconUrl: chrome.runtime.getURL('icons/icon48.png'),
      title: 'Family Time Starting Soon',
      message: `Family offline time starts in ${minutesRemaining} minute${minutesRemaining === 1 ? '' : 's'}. Time to wrap up!`,
      priority: 2,
      requireInteraction: false,
    })
    console.log(`[Fledgely] Offline warning shown: ${minutesRemaining} minutes`)
  } catch (error) {
    console.error('[Fledgely] Failed to show offline warning:', error)
  }
}

/**
 * Update extension badge for offline schedule countdown (AC6)
 */
export async function updateOfflineBadge(state: OfflineScheduleState): Promise<void> {
  try {
    if (state.isInOfflineWindow) {
      // Show green badge during offline time
      await chrome.action.setBadgeText({ text: 'OFF' })
      await chrome.action.setBadgeBackgroundColor({ color: '#22c55e' })
      await chrome.action.setTitle({ title: 'Fledgely - Family Offline Time' })
    } else if (state.isWarningActive && state.minutesUntilStart !== null) {
      // Show countdown badge before offline time
      await chrome.action.setBadgeText({ text: `${state.minutesUntilStart}m` })
      await chrome.action.setBadgeBackgroundColor({ color: '#f59e0b' })
      await chrome.action.setTitle({
        title: `Fledgely - Family time in ${state.minutesUntilStart} minutes`,
      })
    } else {
      // Clear offline badge (let time-limit system handle badge if active)
      // Only clear if we were showing offline-related badge
      const currentBadge = await chrome.action.getBadgeText({})
      if (currentBadge === 'OFF' || currentBadge?.endsWith('m')) {
        await chrome.action.setBadgeText({ text: '' })
        await chrome.action.setTitle({ title: 'Fledgely' })
      }
    }
  } catch (error) {
    console.error('[Fledgely] Failed to update offline badge:', error)
  }
}

// Enforcement state
const STORAGE_KEY_OFFLINE_ENFORCEMENT = 'offlineEnforcementState'

export interface OfflineEnforcementState {
  isEnforcing: boolean
  enforcementStartedAt: number | null
  blockedTabIds: number[]
  warningShownToday: boolean
  lastWarningDate: string // YYYY-MM-DD
}

/**
 * Get current date string
 */
function getCurrentDateString(): string {
  return new Date().toISOString().split('T')[0]
}

/**
 * Get offline enforcement state
 */
export async function getOfflineEnforcementState(): Promise<OfflineEnforcementState> {
  const defaultState = (): OfflineEnforcementState => ({
    isEnforcing: false,
    enforcementStartedAt: null,
    blockedTabIds: [],
    warningShownToday: false,
    lastWarningDate: getCurrentDateString(),
  })

  try {
    const result = await chrome.storage.local.get(STORAGE_KEY_OFFLINE_ENFORCEMENT)
    const state = result[STORAGE_KEY_OFFLINE_ENFORCEMENT]
    const today = getCurrentDateString()

    // Reset warning flag on new day
    if (state && state.lastWarningDate !== today) {
      const newState = { ...state, warningShownToday: false, lastWarningDate: today }
      await saveOfflineEnforcementState(newState)
      return newState
    }

    return state || defaultState()
  } catch {
    return defaultState()
  }
}

/**
 * Save offline enforcement state
 */
export async function saveOfflineEnforcementState(state: OfflineEnforcementState): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_KEY_OFFLINE_ENFORCEMENT]: state })
}

/**
 * Start offline time enforcement
 */
export async function startOfflineEnforcement(): Promise<void> {
  const state = await getOfflineEnforcementState()

  if (!state.isEnforcing) {
    state.isEnforcing = true
    state.enforcementStartedAt = Date.now()
    await saveOfflineEnforcementState(state)
    console.log('[Fledgely] Offline time enforcement started')
  }
}

/**
 * Stop offline time enforcement
 */
export async function stopOfflineEnforcement(): Promise<void> {
  const state = await getOfflineEnforcementState()

  if (state.isEnforcing) {
    state.isEnforcing = false
    state.enforcementStartedAt = null
    state.blockedTabIds = []
    await saveOfflineEnforcementState(state)
    console.log('[Fledgely] Offline time enforcement stopped')
  }
}

/**
 * Check and handle offline schedule - called periodically
 */
export async function checkOfflineSchedule(): Promise<void> {
  const scheduleState = await getOfflineScheduleState()
  const enforcementState = await getOfflineEnforcementState()
  const isParent = await isParentDevice()

  // Update badge
  await updateOfflineBadge(scheduleState)

  // Handle warning phase (AC5)
  if (scheduleState.isWarningActive && !enforcementState.warningShownToday) {
    if (scheduleState.minutesUntilStart !== null) {
      await showOfflineWarning(scheduleState.minutesUntilStart)
      enforcementState.warningShownToday = true
      enforcementState.lastWarningDate = getCurrentDateString()
      await saveOfflineEnforcementState(enforcementState)
    }
  }

  // Handle offline window
  if (scheduleState.isInOfflineWindow) {
    if (isParent) {
      // Parents get reminder only (AC3)
      if (!enforcementState.isEnforcing) {
        await showParentReminder()
        // Mark as "enforcing" to prevent repeated reminders
        await startOfflineEnforcement()
      }
    } else {
      // Children get full enforcement (AC1, AC2)
      if (!enforcementState.isEnforcing) {
        await startOfflineEnforcement()
        await enforceOfflineOnAllTabs()
      }
    }
  } else {
    // Outside offline window - stop enforcement
    if (enforcementState.isEnforcing) {
      await stopOfflineEnforcement()
      await clearOfflineEnforcementFromAllTabs()
    }
  }
}

/**
 * Inject offline blocking script into a tab
 */
export async function injectOfflineBlockingScript(
  tabId: number,
  minutesUntilEnd: number | null
): Promise<boolean> {
  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ['content-scripts/family-offline-block.js'],
    })

    // Send message to show the overlay
    await chrome.tabs.sendMessage(tabId, {
      type: 'SHOW_FAMILY_OFFLINE_BLOCK',
      minutesUntilEnd,
    })

    console.log(`[Fledgely] Offline blocking script injected into tab ${tabId}`)
    return true
  } catch (error) {
    console.log(`[Fledgely] Could not inject offline blocking into tab ${tabId}:`, error)
    return false
  }
}

/**
 * Remove offline blocking from a tab
 */
export async function removeOfflineBlockingFromTab(tabId: number): Promise<void> {
  try {
    await chrome.tabs.sendMessage(tabId, { type: 'HIDE_FAMILY_OFFLINE_BLOCK' })
  } catch {
    // Tab may not have the content script
  }
}

/**
 * Enforce offline time on all open tabs
 */
export async function enforceOfflineOnAllTabs(): Promise<void> {
  const scheduleState = await getOfflineScheduleState()
  const enforcementState = await getOfflineEnforcementState()

  if (!scheduleState.isInOfflineWindow) return

  try {
    const tabs = await chrome.tabs.query({})
    const blockedTabIds: number[] = []

    for (const tab of tabs) {
      if (!tab.id || !tab.url) continue

      if (shouldBlockForOffline(tab.url)) {
        const success = await injectOfflineBlockingScript(tab.id, scheduleState.minutesUntilEnd)
        if (success) {
          blockedTabIds.push(tab.id)
        }
      }
    }

    enforcementState.blockedTabIds = blockedTabIds
    await saveOfflineEnforcementState(enforcementState)
  } catch (error) {
    console.error('[Fledgely] Error enforcing offline on tabs:', error)
  }
}

/**
 * Clear offline enforcement from all tabs
 */
export async function clearOfflineEnforcementFromAllTabs(): Promise<void> {
  try {
    const tabs = await chrome.tabs.query({})

    for (const tab of tabs) {
      if (tab.id) {
        await removeOfflineBlockingFromTab(tab.id)
      }
    }
  } catch (error) {
    console.error('[Fledgely] Error clearing offline enforcement:', error)
  }
}

/**
 * Setup offline schedule check alarm
 */
export function setupOfflineCheckAlarm(): void {
  chrome.alarms.create(ALARM_OFFLINE_CHECK, {
    delayInMinutes: 1,
    periodInMinutes: OFFLINE_CHECK_INTERVAL_MINUTES,
  })
  console.log('[Fledgely] Offline schedule check alarm configured')
}

/**
 * Sync offline schedule from Firestore
 * Note: The getOfflineSchedule cloud function will be implemented in Story 32.5
 */
export async function syncOfflineSchedule(familyId: string): Promise<FamilyOfflineSchedule | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/getOfflineSchedule`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ familyId }),
    })

    if (!response.ok) {
      console.error('[Fledgely] Failed to fetch offline schedule:', response.status)
      return null
    }

    const schedule = (await response.json()) as FamilyOfflineSchedule
    await saveOfflineSchedule(schedule)
    console.log('[Fledgely] Offline schedule synced:', schedule)
    return schedule
  } catch (error) {
    console.error('[Fledgely] Error syncing offline schedule:', error)
    return null
  }
}
