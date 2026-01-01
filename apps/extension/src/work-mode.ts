/**
 * Work Mode Module - Story 33.3
 *
 * Handles work mode state sync for Chrome extension.
 * Pauses screenshot capture and applies work app whitelist during work mode.
 * Supports both scheduled and manual activation.
 */

import { WORK_MODE_DEFAULT_APPS } from '@fledgely/shared'

// Storage keys
const WORK_MODE_STATE_KEY = 'workModeState'
const WORK_MODE_CONFIG_KEY = 'workModeConfig'
const WORK_MODE_CHECK_ALARM = 'work-mode-check'

/**
 * Local work mode state structure
 */
export interface LocalWorkModeState {
  isActive: boolean
  activationType: 'scheduled' | 'manual' | null
  scheduleId: string | null
  scheduleName: string | null
  startedAt: number | null
  childId: string | null
  familyId: string | null
  lastSyncedAt: number
}

/**
 * Local work mode configuration
 */
export interface LocalWorkModeConfig {
  schedules: WorkScheduleEntry[]
  useDefaultWorkApps: boolean
  customWorkAppPatterns: string[]
  pauseScreenshots: boolean
  suspendTimeLimits: boolean
  allowManualActivation: boolean
  lastSyncedAt: number
}

export interface WorkScheduleEntry {
  id: string
  name: string
  days: string[]
  startTime: string
  endTime: string
  isEnabled: boolean
}

const DEFAULT_WORK_STATE: LocalWorkModeState = {
  isActive: false,
  activationType: null,
  scheduleId: null,
  scheduleName: null,
  startedAt: null,
  childId: null,
  familyId: null,
  lastSyncedAt: 0,
}

const DEFAULT_WORK_CONFIG: LocalWorkModeConfig = {
  schedules: [],
  useDefaultWorkApps: true,
  customWorkAppPatterns: [],
  pauseScreenshots: true,
  suspendTimeLimits: true,
  allowManualActivation: true,
  lastSyncedAt: 0,
}

/**
 * Get current work mode state from local storage
 */
export async function getWorkModeState(): Promise<LocalWorkModeState> {
  const result = await chrome.storage.local.get(WORK_MODE_STATE_KEY)
  return result[WORK_MODE_STATE_KEY] || DEFAULT_WORK_STATE
}

/**
 * Update work mode state in local storage
 */
export async function setWorkModeState(state: LocalWorkModeState): Promise<void> {
  await chrome.storage.local.set({ [WORK_MODE_STATE_KEY]: state })
}

/**
 * Get work mode configuration from local storage
 */
export async function getWorkModeConfig(): Promise<LocalWorkModeConfig> {
  const result = await chrome.storage.local.get(WORK_MODE_CONFIG_KEY)
  return result[WORK_MODE_CONFIG_KEY] || DEFAULT_WORK_CONFIG
}

/**
 * Update work mode configuration in local storage
 */
export async function setWorkModeConfig(config: LocalWorkModeConfig): Promise<void> {
  await chrome.storage.local.set({ [WORK_MODE_CONFIG_KEY]: config })
}

/**
 * Get current day of week as lowercase string
 */
function getCurrentDayOfWeek(): string {
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
  return days[new Date().getDay()]
}

/**
 * Parse time string "HH:MM" to minutes since midnight
 */
function parseTimeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number)
  return hours * 60 + minutes
}

/**
 * Get current time as minutes since midnight
 */
function getCurrentTimeMinutes(): number {
  const now = new Date()
  return now.getHours() * 60 + now.getMinutes()
}

/**
 * Check if current time falls within a schedule
 */
export function isWithinSchedule(schedule: WorkScheduleEntry): boolean {
  if (!schedule.isEnabled) return false

  const currentDay = getCurrentDayOfWeek()
  if (!schedule.days.includes(currentDay)) return false

  const currentMinutes = getCurrentTimeMinutes()
  const startMinutes = parseTimeToMinutes(schedule.startTime)
  const endMinutes = parseTimeToMinutes(schedule.endTime)

  // Handle schedules that cross midnight
  if (endMinutes < startMinutes) {
    return currentMinutes >= startMinutes || currentMinutes < endMinutes
  }

  return currentMinutes >= startMinutes && currentMinutes < endMinutes
}

/**
 * Find the first active schedule
 */
export function findActiveSchedule(schedules: WorkScheduleEntry[]): WorkScheduleEntry | null {
  for (const schedule of schedules) {
    if (isWithinSchedule(schedule)) {
      return schedule
    }
  }
  return null
}

/**
 * Get all default work app patterns
 */
function getDefaultWorkAppPatterns(): string[] {
  const patterns: string[] = []
  for (const category of Object.values(WORK_MODE_DEFAULT_APPS)) {
    patterns.push(...category.map((app) => app.pattern))
  }
  return patterns
}

/**
 * Check if a URL matches a work app pattern
 */
function matchesPattern(hostname: string, pattern: string): boolean {
  if (pattern.startsWith('*.')) {
    const suffix = pattern.slice(2)
    return hostname === suffix || hostname.endsWith(`.${suffix}`)
  }
  return hostname === pattern || hostname.includes(pattern)
}

/**
 * Check if a URL is a whitelisted work app
 */
export function isWorkApp(url: string, config?: LocalWorkModeConfig): boolean {
  try {
    const parsedUrl = new URL(url)
    const hostname = parsedUrl.hostname.toLowerCase()

    // Skip internal pages
    if (
      hostname === '' ||
      url.startsWith('chrome://') ||
      url.startsWith('chrome-extension://') ||
      url.startsWith('about:')
    ) {
      return true // Allow internal pages
    }

    // Get patterns to check
    const patterns: string[] = []

    // Add default work apps if enabled
    if (config?.useDefaultWorkApps !== false) {
      patterns.push(...getDefaultWorkAppPatterns())
    }

    // Add custom work app patterns
    if (config?.customWorkAppPatterns) {
      patterns.push(...config.customWorkAppPatterns)
    }

    // Check if URL matches any work app pattern
    for (const pattern of patterns) {
      if (matchesPattern(hostname, pattern)) {
        return true
      }
    }

    return false
  } catch {
    return false
  }
}

/**
 * Sync work mode state from Firestore
 */
export async function syncWorkModeState(
  childId: string,
  familyId: string
): Promise<LocalWorkModeState | null> {
  try {
    const response = await fetch(
      `https://us-central1-fledgely-cns-me.cloudfunctions.net/getWorkModeState`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ childId, familyId }),
      }
    )

    if (!response.ok) {
      console.error('[Fledgely Work] State sync failed:', response.status)
      return null
    }

    const data = await response.json()

    const newState: LocalWorkModeState = {
      isActive: data.isActive || false,
      activationType: data.currentSession?.activationType || null,
      scheduleId: data.currentSession?.scheduleId || null,
      scheduleName: data.currentSession?.scheduleName || null,
      startedAt: data.currentSession?.startedAt || null,
      childId,
      familyId,
      lastSyncedAt: Date.now(),
    }

    await setWorkModeState(newState)
    console.log('[Fledgely Work] State synced:', newState.isActive)

    return newState
  } catch (error) {
    console.error('[Fledgely Work] State sync error:', error)
    return null
  }
}

/**
 * Sync work mode configuration from Firestore
 */
export async function syncWorkModeConfig(
  childId: string,
  familyId: string
): Promise<LocalWorkModeConfig | null> {
  try {
    const response = await fetch(
      `https://us-central1-fledgely-cns-me.cloudfunctions.net/getWorkModeConfig`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ childId, familyId }),
      }
    )

    if (!response.ok) {
      console.error('[Fledgely Work] Config sync failed:', response.status)
      return null
    }

    const data = await response.json()

    const newConfig: LocalWorkModeConfig = {
      schedules: (data.schedules || []).map(
        (s: {
          id: string
          name: string
          days: string[]
          startTime: string
          endTime: string
          isEnabled: boolean
        }) => ({
          id: s.id,
          name: s.name,
          days: s.days,
          startTime: s.startTime,
          endTime: s.endTime,
          isEnabled: s.isEnabled,
        })
      ),
      useDefaultWorkApps: data.useDefaultWorkApps ?? true,
      customWorkAppPatterns: data.customWorkApps?.map((a: { pattern: string }) => a.pattern) || [],
      pauseScreenshots: data.pauseScreenshots ?? true,
      suspendTimeLimits: data.suspendTimeLimits ?? true,
      allowManualActivation: data.allowManualActivation ?? true,
      lastSyncedAt: Date.now(),
    }

    await setWorkModeConfig(newConfig)
    console.log('[Fledgely Work] Config synced')

    return newConfig
  } catch (error) {
    console.error('[Fledgely Work] Config sync error:', error)
    return null
  }
}

/**
 * Set up periodic work mode check alarm
 */
export async function setupWorkModeCheckAlarm(): Promise<void> {
  await chrome.alarms.clear(WORK_MODE_CHECK_ALARM)
  await chrome.alarms.create(WORK_MODE_CHECK_ALARM, {
    delayInMinutes: 1,
    periodInMinutes: 1, // Check every minute
  })
  console.log('[Fledgely Work] Check alarm created')
}

/**
 * Handle work mode check alarm
 * Checks schedules and updates state accordingly
 */
export async function handleWorkModeCheckAlarm(): Promise<void> {
  const state = await getWorkModeState()
  const config = await getWorkModeConfig()

  if (!state.childId || !state.familyId) {
    return
  }

  // Check if currently within a scheduled work time
  const activeSchedule = findActiveSchedule(config.schedules)

  if (activeSchedule && !state.isActive) {
    // Auto-start work mode
    console.log('[Fledgely Work] Auto-starting for schedule:', activeSchedule.name)
    const newState: LocalWorkModeState = {
      ...state,
      isActive: true,
      activationType: 'scheduled',
      scheduleId: activeSchedule.id,
      scheduleName: activeSchedule.name,
      startedAt: Date.now(),
      lastSyncedAt: Date.now(),
    }
    await setWorkModeState(newState)
  } else if (!activeSchedule && state.isActive && state.activationType === 'scheduled') {
    // Auto-stop scheduled work mode (schedule ended)
    console.log('[Fledgely Work] Auto-stopping, schedule ended')
    const newState: LocalWorkModeState = {
      ...state,
      isActive: false,
      activationType: null,
      scheduleId: null,
      scheduleName: null,
      startedAt: null,
      lastSyncedAt: Date.now(),
    }
    await setWorkModeState(newState)
  }
}

/**
 * Check if screenshot capture should be paused
 * Returns true if work mode is active and pauseScreenshots is enabled
 */
export async function shouldPauseScreenshots(): Promise<boolean> {
  const state = await getWorkModeState()
  const config = await getWorkModeConfig()

  return state.isActive && config.pauseScreenshots
}

/**
 * Check if time limits should be suspended
 * Returns true if work mode is active and suspendTimeLimits is enabled
 */
export async function shouldSuspendTimeLimits(): Promise<boolean> {
  const state = await getWorkModeState()
  const config = await getWorkModeConfig()

  return state.isActive && config.suspendTimeLimits
}

/**
 * Export alarm name for background.ts to use
 */
export { WORK_MODE_CHECK_ALARM }
