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
const STORAGE_KEY_ACTIVE_EXCEPTION = 'activeOfflineException'

// ============================================================================
// Story 32.5: Offline Exception Types
// ============================================================================

/**
 * Offline exception types - matches shared schema
 */
export type OfflineExceptionType = 'pause' | 'skip' | 'work' | 'homework'
export type OfflineExceptionStatus = 'active' | 'completed' | 'cancelled'

/**
 * Offline exception record
 * Story 32.5: Exceptions to offline time enforcement
 */
export interface OfflineException {
  id: string
  familyId: string
  type: OfflineExceptionType
  requestedBy: string
  requestedByName?: string
  approvedBy?: string
  startTime: number
  endTime: number | null
  status: OfflineExceptionStatus
  createdAt: number
  whitelistedUrls?: string[]
  whitelistedCategories?: string[]
}

/**
 * Education-related categories for homework exceptions
 * Story 32.5 AC4: Only education apps allowed during homework exception
 */
export const EDUCATION_CATEGORIES = ['education', 'reference', 'learning', 'research', 'academic']

/**
 * Common education domains for homework exceptions
 */
export const EDUCATION_DOMAINS = [
  'khanacademy.org',
  'coursera.org',
  'edx.org',
  'wikipedia.org',
  'wolframalpha.com',
  'quizlet.com',
  'mathway.com',
  'duolingo.com',
  'google.com/search', // Google Search for research
  'scholar.google.com',
  'docs.google.com',
  'drive.google.com',
]

// Firebase Cloud Functions API
const FIREBASE_PROJECT_ID = 'fledgely-cns-me'
const FIREBASE_REGION = 'us-central1'
const API_BASE_URL = `https://${FIREBASE_REGION}-${FIREBASE_PROJECT_ID}.cloudfunctions.net`

// Alarm for periodic schedule checks
export const ALARM_OFFLINE_CHECK = 'offline-schedule-check'
export const OFFLINE_CHECK_INTERVAL_MINUTES = 1

// Warning threshold (minutes before offline starts)
export const WARNING_THRESHOLD_MINUTES = 5

// Storage key for parent compliance events during current offline window
const STORAGE_KEY_PARENT_ACTIVITY = 'parentActivityEvents'
const STORAGE_KEY_CURRENT_OFFLINE_WINDOW = 'currentOfflineWindow'

/**
 * Parent activity event during offline window
 * Story 32.4 AC5: Real-Time Activity Detection
 */
export interface ParentActivityEvent {
  timestamp: number
  type: 'navigation' | 'browser_active'
}

/**
 * Current offline window tracking for compliance
 * Story 32.4 AC1: Parent Compliance Logging
 */
interface CurrentOfflineWindow {
  familyId: string
  parentUid: string
  deviceId: string
  parentDisplayName?: string
  offlineWindowStart: number
  offlineWindowEnd: number
}

/**
 * Offline schedule state for UI display
 */
export interface OfflineScheduleState {
  schedule: FamilyOfflineSchedule | null
  isInOfflineWindow: boolean
  isWarningActive: boolean
  minutesUntilStart: number | null
  minutesUntilEnd: number | null
  /** Story 32.5: Active exception that bypasses enforcement */
  activeException: OfflineException | null
  /** Story 32.5: Whether enforcement is bypassed due to exception */
  isExceptionActive: boolean
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

// ============================================================================
// Story 32.5: Exception Storage Functions
// ============================================================================

/**
 * Get cached active exception from storage
 * Story 32.5 AC1-5: Check for active exceptions before blocking
 */
export async function getActiveException(): Promise<OfflineException | null> {
  try {
    const result = await chrome.storage.local.get(STORAGE_KEY_ACTIVE_EXCEPTION)
    const exception = result[STORAGE_KEY_ACTIVE_EXCEPTION] as OfflineException | null

    if (!exception) return null

    // Check if exception is still valid
    if (exception.status !== 'active') return null

    // Check if exception has expired
    if (exception.endTime && exception.endTime < Date.now()) {
      // Exception expired, clear it
      await clearActiveException()
      return null
    }

    return exception
  } catch {
    return null
  }
}

/**
 * Save active exception to storage
 * Story 32.5: Cache exception for quick access during enforcement
 */
export async function saveActiveException(exception: OfflineException): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_KEY_ACTIVE_EXCEPTION]: exception })
}

/**
 * Clear active exception from storage
 * Story 32.5: Called when exception ends or is cancelled
 */
export async function clearActiveException(): Promise<void> {
  await chrome.storage.local.remove(STORAGE_KEY_ACTIVE_EXCEPTION)
}

/**
 * Sync active exception from Firestore
 * Story 32.5: Fetch latest exception state from server
 */
export async function syncActiveException(familyId: string): Promise<OfflineException | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/getActiveOfflineException`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ familyId }),
    })

    if (!response.ok) {
      if (response.status === 404) {
        // No active exception
        await clearActiveException()
        return null
      }
      console.error('[Fledgely] Failed to fetch active exception:', response.status)
      return null
    }

    const exception = (await response.json()) as OfflineException
    await saveActiveException(exception)
    console.log('[Fledgely] Active exception synced:', exception.type)
    return exception
  } catch (error) {
    console.error('[Fledgely] Error syncing active exception:', error)
    return null
  }
}

/**
 * Check if URL is allowed during a homework exception
 * Story 32.5 AC4: Only education apps allowed during homework exception
 */
export function isUrlAllowedForHomework(url: string, exception: OfflineException): boolean {
  try {
    const urlObj = new URL(url)
    const hostname = urlObj.hostname.toLowerCase()

    // Check whitelisted URLs from exception
    if (exception.whitelistedUrls?.length) {
      for (const whitelistedUrl of exception.whitelistedUrls) {
        if (hostname.includes(whitelistedUrl.toLowerCase())) {
          return true
        }
      }
    }

    // Check default education domains
    for (const eduDomain of EDUCATION_DOMAINS) {
      if (hostname.includes(eduDomain) || url.includes(eduDomain)) {
        return true
      }
    }

    return false
  } catch {
    return false
  }
}

/**
 * Check if URL is allowed during a work exception
 * Story 32.5 AC3: Whitelisted work apps/sites during work exception
 */
export function isUrlAllowedForWork(url: string, exception: OfflineException): boolean {
  try {
    const urlObj = new URL(url)
    const hostname = urlObj.hostname.toLowerCase()

    // Check whitelisted URLs from exception
    if (exception.whitelistedUrls?.length) {
      for (const whitelistedUrl of exception.whitelistedUrls) {
        if (hostname.includes(whitelistedUrl.toLowerCase())) {
          return true
        }
      }
    }

    return false
  } catch {
    return false
  }
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
 * - Crisis/emergency resources (AC2: Emergency contacts always reachable)
 */
export function shouldBlockForOffline(url: string): boolean {
  try {
    const urlObj = new URL(url)

    // Never block chrome:// or extension pages
    if (urlObj.protocol === 'chrome:' || urlObj.protocol === 'chrome-extension:') {
      return false
    }

    // Story 32.5 AC2: Never block crisis resources
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
 * Check if URL should be blocked considering active exceptions
 * Story 32.5: Check for pause, skip, work, homework exceptions
 *
 * @param url - URL to check
 * @param exception - Active exception (if any)
 * @returns true if URL should be blocked
 */
export function shouldBlockForOfflineWithException(
  url: string,
  exception: OfflineException | null
): boolean {
  // First check basic blocking rules
  if (!shouldBlockForOffline(url)) {
    return false
  }

  // If no exception, block normally
  if (!exception || exception.status !== 'active') {
    return true
  }

  // Story 32.5 AC1 & AC5: Pause or Skip exceptions bypass all blocking
  if (exception.type === 'pause' || exception.type === 'skip') {
    return false
  }

  // Story 32.5 AC3: Work exception - only whitelisted work sites allowed
  if (exception.type === 'work') {
    return !isUrlAllowedForWork(url, exception)
  }

  // Story 32.5 AC4: Homework exception - only education sites allowed
  if (exception.type === 'homework') {
    return !isUrlAllowedForHomework(url, exception)
  }

  // Unknown exception type, block normally
  return true
}

/**
 * Get current offline schedule state
 * Story 32.5: Now includes active exception info
 */
export async function getOfflineScheduleState(): Promise<OfflineScheduleState> {
  const schedule = await getOfflineSchedule()
  const activeException = await getActiveException()

  if (!schedule || !schedule.enabled) {
    return {
      schedule: null,
      isInOfflineWindow: false,
      isWarningActive: false,
      minutesUntilStart: null,
      minutesUntilEnd: null,
      activeException: null,
      isExceptionActive: false,
    }
  }

  const isInWindow = isWithinOfflineWindow(schedule)

  return {
    schedule,
    isInOfflineWindow: isInWindow,
    isWarningActive: isWarningActive(schedule),
    minutesUntilStart: getMinutesUntilStart(schedule),
    minutesUntilEnd: getMinutesUntilEnd(schedule),
    activeException: isInWindow ? activeException : null,
    isExceptionActive: isInWindow && activeException !== null,
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
 * Story 32.4: Also tracks parent compliance during offline windows
 * Story 32.5: Now checks for active exceptions before enforcing
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
    // Story 32.5: Check for active exceptions
    const exception = scheduleState.activeException

    // Story 32.5 AC1 & AC5: If pause or skip exception, no enforcement
    const shouldSkipEnforcement =
      exception && (exception.type === 'pause' || exception.type === 'skip')

    if (isParent) {
      // Parents get reminder only (AC3)
      if (!enforcementState.isEnforcing) {
        await showParentReminder()
        // Mark as "enforcing" to prevent repeated reminders
        await startOfflineEnforcement()

        // Story 32.4 AC1: Start parent compliance tracking
        await startParentComplianceWindow()
      }
    } else {
      // Children get enforcement (AC1, AC2)
      if (shouldSkipEnforcement) {
        // Story 32.5: Exception active - stop enforcement if running
        if (enforcementState.isEnforcing) {
          await stopOfflineEnforcement()
          await clearOfflineEnforcementFromAllTabs()
          console.log(`[Fledgely] Offline enforcement paused due to ${exception?.type} exception`)
        }
      } else if (!enforcementState.isEnforcing) {
        // No exception or partial exception (work/homework) - enforce
        await startOfflineEnforcement()
        await enforceOfflineOnAllTabs()
      } else if (exception && (exception.type === 'work' || exception.type === 'homework')) {
        // Re-evaluate tabs for partial exceptions (work/homework may allow some URLs)
        await enforceOfflineOnAllTabs()
      }
    }
  } else {
    // Outside offline window - stop enforcement
    if (enforcementState.isEnforcing) {
      await stopOfflineEnforcement()
      await clearOfflineEnforcementFromAllTabs()

      // Story 32.4 AC1: End parent compliance tracking and record
      if (isParent) {
        await endParentComplianceWindow()
      }
    }
  }
}

/**
 * Inject offline blocking script into a tab
 * Story 32.5 AC4: Show exception status in blocking overlay
 */
export async function injectOfflineBlockingScript(
  tabId: number,
  minutesUntilEnd: number | null,
  exception: OfflineException | null = null
): Promise<boolean> {
  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ['content-scripts/family-offline-block.js'],
    })

    // Story 32.5: Include exception info for overlay display
    await chrome.tabs.sendMessage(tabId, {
      type: 'SHOW_FAMILY_OFFLINE_BLOCK',
      minutesUntilEnd,
      // Story 32.5 AC4: Exception status for overlay message
      exception: exception
        ? {
            type: exception.type,
            requestedByName: exception.requestedByName,
          }
        : null,
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
 * Story 32.5: Now respects active exceptions (work/homework whitelists)
 */
export async function enforceOfflineOnAllTabs(): Promise<void> {
  const scheduleState = await getOfflineScheduleState()
  const enforcementState = await getOfflineEnforcementState()

  if (!scheduleState.isInOfflineWindow) return

  try {
    const tabs = await chrome.tabs.query({})
    const blockedTabIds: number[] = []
    const exception = scheduleState.activeException

    for (const tab of tabs) {
      if (!tab.id || !tab.url) continue

      // Story 32.5: Use exception-aware blocking check
      if (shouldBlockForOfflineWithException(tab.url, exception)) {
        const success = await injectOfflineBlockingScript(
          tab.id,
          scheduleState.minutesUntilEnd,
          exception
        )
        if (success) {
          blockedTabIds.push(tab.id)
        }
      } else if (exception) {
        // URL is allowed during exception - clear any existing block
        await removeOfflineBlockingFromTab(tab.id)
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

// ============================================================================
// Story 32.4: Parent Compliance Tracking
// ============================================================================

/**
 * Get current offline window info from storage
 * Story 32.4 AC1: Track offline window for compliance recording
 */
async function getCurrentOfflineWindow(): Promise<CurrentOfflineWindow | null> {
  try {
    const result = await chrome.storage.local.get(STORAGE_KEY_CURRENT_OFFLINE_WINDOW)
    return result[STORAGE_KEY_CURRENT_OFFLINE_WINDOW] || null
  } catch {
    return null
  }
}

/**
 * Save current offline window info to storage
 */
async function saveCurrentOfflineWindow(window: CurrentOfflineWindow | null): Promise<void> {
  if (window) {
    await chrome.storage.local.set({ [STORAGE_KEY_CURRENT_OFFLINE_WINDOW]: window })
  } else {
    await chrome.storage.local.remove(STORAGE_KEY_CURRENT_OFFLINE_WINDOW)
  }
}

/**
 * Get parent activity events during current offline window
 * Story 32.4 AC5: Real-Time Activity Detection
 */
async function getParentActivityEvents(): Promise<ParentActivityEvent[]> {
  try {
    const result = await chrome.storage.local.get(STORAGE_KEY_PARENT_ACTIVITY)
    return result[STORAGE_KEY_PARENT_ACTIVITY] || []
  } catch {
    return []
  }
}

/**
 * Save parent activity events to storage
 */
async function saveParentActivityEvents(events: ParentActivityEvent[]): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_KEY_PARENT_ACTIVITY]: events })
}

/**
 * Clear parent activity events (after recording compliance)
 */
async function clearParentActivityEvents(): Promise<void> {
  await chrome.storage.local.remove(STORAGE_KEY_PARENT_ACTIVITY)
}

/**
 * Log a parent activity event during offline window
 * Story 32.4 AC5: Real-Time Activity Detection
 *
 * @param event - The activity event to log
 */
export async function logParentActivityEvent(event: ParentActivityEvent): Promise<void> {
  try {
    const events = await getParentActivityEvents()
    events.push(event)
    await saveParentActivityEvents(events)
    console.log(
      `[Fledgely] Parent activity logged: ${event.type} at ${new Date(event.timestamp).toISOString()}`
    )
  } catch (error) {
    console.error('[Fledgely] Failed to log parent activity:', error)
  }
}

/**
 * Track parent activity during offline window
 * Story 32.4 AC5: Real-Time Activity Detection
 *
 * Called periodically to check if parent is using browser during offline time.
 */
export async function trackParentActivity(): Promise<void> {
  const isParent = await isParentDevice()
  if (!isParent) return

  const state = await getOfflineScheduleState()
  if (!state.isInOfflineWindow) return

  // Log browser_active event
  await logParentActivityEvent({
    timestamp: Date.now(),
    type: 'browser_active',
  })
}

/**
 * Track parent tab navigation during offline window
 * Story 32.4 AC5: Real-Time Activity Detection
 *
 * Called from background script when parent navigates to a new tab/URL.
 *
 * @param _tabId - Tab ID (unused but kept for handler signature)
 * @param _url - URL being navigated to (unused but kept for handler signature)
 */
export async function onParentTabNavigation(_tabId: number, _url: string): Promise<void> {
  const isParent = await isParentDevice()
  if (!isParent) return

  const state = await getOfflineScheduleState()
  if (!state.isInOfflineWindow) return

  // Log navigation event
  await logParentActivityEvent({
    timestamp: Date.now(),
    type: 'navigation',
  })
}

/**
 * Start tracking a new offline window for parent compliance
 * Story 32.4 AC1: Parent Compliance Logging
 *
 * Called when offline window starts for a parent device.
 */
export async function startParentComplianceWindow(): Promise<void> {
  const deviceInfo = await getEnrolledDeviceInfo()
  if (!deviceInfo?.isParentDevice || !deviceInfo.parentUid) return

  const schedule = await getOfflineSchedule()
  if (!schedule) return

  const window = getTodayWindow(schedule)
  if (!window) return

  // Calculate window start/end timestamps
  const now = new Date()
  const startMinutes = parseTimeToMinutes(window.startTime)
  const endMinutes = parseTimeToMinutes(window.endTime)

  const startTime = new Date(now)
  startTime.setHours(Math.floor(startMinutes / 60), startMinutes % 60, 0, 0)

  const endTime = new Date(now)
  endTime.setHours(Math.floor(endMinutes / 60), endMinutes % 60, 0, 0)

  // Handle overnight windows
  if (endMinutes < startMinutes) {
    if (now.getHours() * 60 + now.getMinutes() >= startMinutes) {
      // After start but before midnight - end is tomorrow
      endTime.setDate(endTime.getDate() + 1)
    } else {
      // After midnight but before end - start was yesterday
      startTime.setDate(startTime.getDate() - 1)
    }
  }

  const currentWindow: CurrentOfflineWindow = {
    familyId: deviceInfo.familyId,
    parentUid: deviceInfo.parentUid,
    deviceId: deviceInfo.deviceId,
    offlineWindowStart: startTime.getTime(),
    offlineWindowEnd: endTime.getTime(),
  }

  await saveCurrentOfflineWindow(currentWindow)
  await clearParentActivityEvents()

  console.log('[Fledgely] Started tracking parent compliance window')
}

/**
 * End offline window and record parent compliance
 * Story 32.4 AC1: Parent Compliance Logging
 *
 * Called when offline window ends for a parent device.
 * Records compliance status to Firestore.
 */
export async function endParentComplianceWindow(): Promise<void> {
  const currentWindow = await getCurrentOfflineWindow()
  if (!currentWindow) return

  const events = await getParentActivityEvents()
  const wasCompliant = events.length === 0

  // Create compliance record
  const record = {
    familyId: currentWindow.familyId,
    parentUid: currentWindow.parentUid,
    deviceId: currentWindow.deviceId,
    parentDisplayName: currentWindow.parentDisplayName,
    offlineWindowStart: currentWindow.offlineWindowStart,
    offlineWindowEnd: currentWindow.offlineWindowEnd,
    wasCompliant,
    activityEvents: events,
    createdAt: Date.now(),
  }

  // Try to sync to Firestore
  try {
    const response = await fetch(`${API_BASE_URL}/logParentCompliance`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(record),
    })

    if (response.ok) {
      console.log(
        `[Fledgely] Parent compliance recorded: ${wasCompliant ? 'compliant' : 'non-compliant'}`
      )
    } else {
      console.error('[Fledgely] Failed to record parent compliance:', response.status)
      // Queue for retry - store locally
      await queueComplianceRecord(record)
    }
  } catch (error) {
    console.error('[Fledgely] Error recording parent compliance:', error)
    // Queue for retry - store locally
    await queueComplianceRecord(record)
  }

  // Clear tracking state
  await saveCurrentOfflineWindow(null)
  await clearParentActivityEvents()
}

/**
 * Queue a compliance record for later sync
 * Story 32.4: Offline-first approach for compliance recording
 */
const STORAGE_KEY_COMPLIANCE_QUEUE = 'parentComplianceQueue'

async function queueComplianceRecord(record: Record<string, unknown>): Promise<void> {
  try {
    const result = await chrome.storage.local.get(STORAGE_KEY_COMPLIANCE_QUEUE)
    const queue = result[STORAGE_KEY_COMPLIANCE_QUEUE] || []
    queue.push(record)
    await chrome.storage.local.set({ [STORAGE_KEY_COMPLIANCE_QUEUE]: queue })
    console.log('[Fledgely] Compliance record queued for later sync')
  } catch (error) {
    console.error('[Fledgely] Failed to queue compliance record:', error)
  }
}

/**
 * Sync queued compliance records to Firestore
 * Story 32.4: Called periodically to sync offline records
 */
export async function syncQueuedComplianceRecords(): Promise<void> {
  try {
    const result = await chrome.storage.local.get(STORAGE_KEY_COMPLIANCE_QUEUE)
    const queue = result[STORAGE_KEY_COMPLIANCE_QUEUE] || []

    if (queue.length === 0) return

    const successfulIds: number[] = []

    for (let i = 0; i < queue.length; i++) {
      const record = queue[i]
      try {
        const response = await fetch(`${API_BASE_URL}/logParentCompliance`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(record),
        })

        if (response.ok) {
          successfulIds.push(i)
        }
      } catch {
        // Keep in queue for retry
      }
    }

    // Remove successfully synced records
    if (successfulIds.length > 0) {
      const remainingQueue = queue.filter(
        (_: unknown, index: number) => !successfulIds.includes(index)
      )
      await chrome.storage.local.set({ [STORAGE_KEY_COMPLIANCE_QUEUE]: remainingQueue })
      console.log(`[Fledgely] Synced ${successfulIds.length} compliance records`)
    }
  } catch (error) {
    console.error('[Fledgely] Error syncing compliance queue:', error)
  }
}

/**
 * Get parent compliance status for current offline window
 * Story 32.4 AC5: Real-time compliance checking
 */
export async function getParentComplianceStatus(): Promise<{
  isTracking: boolean
  wasCompliant: boolean
  activityCount: number
}> {
  const currentWindow = await getCurrentOfflineWindow()
  if (!currentWindow) {
    return { isTracking: false, wasCompliant: true, activityCount: 0 }
  }

  const events = await getParentActivityEvents()
  return {
    isTracking: true,
    wasCompliant: events.length === 0,
    activityCount: events.length,
  }
}
