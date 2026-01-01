/**
 * Focus Mode Module - Story 33.1 (AC2), Story 33.2 (Configuration), Story 33.4 (Calendar)
 *
 * Handles focus mode state sync for Chrome extension.
 * Blocks distracting apps during focus mode based on category config.
 * Story 33.2: Supports custom allow/block lists from parent configuration.
 * Story 33.4: Supports calendar-triggered focus mode with event title display.
 */

import { FOCUS_MODE_DEFAULT_CATEGORIES } from '@fledgely/shared'

// Storage keys
const FOCUS_MODE_STATE_KEY = 'focusModeState'
const FOCUS_MODE_CONFIG_KEY = 'focusModeConfig' // Story 33.2
const FOCUS_MODE_CHECK_ALARM = 'focus-mode-check'

/**
 * Focus mode trigger type
 * Story 33.4: Tracks whether focus mode was started manually or by calendar
 */
export type FocusModeTriggerType = 'manual' | 'calendar'

/**
 * Local focus mode state structure
 * Story 33.4: Extended to include calendar trigger information
 */
export interface LocalFocusModeState {
  isActive: boolean
  durationType: string | null
  startedAt: number | null
  durationMs: number | null
  childId: string | null
  familyId: string | null
  lastSyncedAt: number
  /** Story 33.4: How focus mode was triggered */
  triggeredBy: FocusModeTriggerType
  /** Story 33.4: Calendar event ID if triggered by calendar */
  calendarEventId: string | null
  /** Story 33.4: Calendar event title for display */
  calendarEventTitle: string | null
}

/**
 * Story 33.2: Local focus mode configuration
 * Stores custom allow/block lists from parent configuration
 */
export interface LocalFocusModeConfig {
  useDefaultCategories: boolean
  customAllowPatterns: string[]
  customBlockPatterns: string[]
  allowedCategories: string[] // Categories to move to allowed
  blockedCategories: string[] // Categories to move to blocked
  lastSyncedAt: number
}

const DEFAULT_FOCUS_STATE: LocalFocusModeState = {
  isActive: false,
  durationType: null,
  startedAt: null,
  durationMs: null,
  childId: null,
  familyId: null,
  lastSyncedAt: 0,
  triggeredBy: 'manual',
  calendarEventId: null,
  calendarEventTitle: null,
}

const DEFAULT_FOCUS_CONFIG: LocalFocusModeConfig = {
  useDefaultCategories: true,
  customAllowPatterns: [],
  customBlockPatterns: [],
  allowedCategories: [],
  blockedCategories: [],
  lastSyncedAt: 0,
}

/**
 * Known distraction domains by category
 * These are blocked during focus mode
 */
const DISTRACTION_DOMAINS: Record<string, string[]> = {
  social_media: [
    'facebook.com',
    'instagram.com',
    'twitter.com',
    'x.com',
    'tiktok.com',
    'snapchat.com',
    'reddit.com',
    'tumblr.com',
    'pinterest.com',
    'linkedin.com',
  ],
  games: [
    'roblox.com',
    'minecraft.net',
    'fortnite.com',
    'steampowered.com',
    'store.steampowered.com',
    'epicgames.com',
    'twitch.tv',
    'kongregate.com',
    'poki.com',
    'coolmathgames.com',
  ],
  entertainment: [
    'youtube.com',
    'netflix.com',
    'hulu.com',
    'disneyplus.com',
    'primevideo.com',
    'hbomax.com',
    'peacocktv.com',
    'crunchyroll.com',
    'spotify.com',
  ],
  messaging: [
    'discord.com',
    'slack.com',
    'telegram.org',
    'web.telegram.org',
    'whatsapp.com',
    'web.whatsapp.com',
    'messenger.com',
    'meet.google.com',
  ],
}

/**
 * Education/productivity domains that are always allowed
 */
const ALLOWED_DOMAINS: string[] = [
  'khanacademy.org',
  'coursera.org',
  'edx.org',
  'duolingo.com',
  'quizlet.com',
  'desmos.com',
  'wolframalpha.com',
  'wikipedia.org',
  'google.com/search',
  'docs.google.com',
  'classroom.google.com',
  'drive.google.com',
  'notion.so',
  'todoist.com',
  'trello.com',
  'asana.com',
]

/**
 * Get current focus mode state from local storage
 */
export async function getFocusModeState(): Promise<LocalFocusModeState> {
  const result = await chrome.storage.local.get(FOCUS_MODE_STATE_KEY)
  return result[FOCUS_MODE_STATE_KEY] || DEFAULT_FOCUS_STATE
}

/**
 * Update focus mode state in local storage
 */
export async function setFocusModeState(state: LocalFocusModeState): Promise<void> {
  await chrome.storage.local.set({ [FOCUS_MODE_STATE_KEY]: state })
}

/**
 * Story 33.2: Get focus mode configuration from local storage
 */
export async function getFocusModeConfig(): Promise<LocalFocusModeConfig> {
  const result = await chrome.storage.local.get(FOCUS_MODE_CONFIG_KEY)
  return result[FOCUS_MODE_CONFIG_KEY] || DEFAULT_FOCUS_CONFIG
}

/**
 * Story 33.2: Update focus mode configuration in local storage
 */
export async function setFocusModeConfig(config: LocalFocusModeConfig): Promise<void> {
  await chrome.storage.local.set({ [FOCUS_MODE_CONFIG_KEY]: config })
}

/**
 * Check if focus mode has expired based on duration
 */
export function isFocusModeExpired(state: LocalFocusModeState): boolean {
  if (!state.isActive || !state.startedAt) return false
  if (!state.durationMs) return false // untilOff never expires

  const elapsed = Date.now() - state.startedAt
  return elapsed >= state.durationMs
}

/**
 * Get time remaining in focus mode (ms)
 * Returns null for untilOff mode or if not active
 */
export function getTimeRemainingMs(state: LocalFocusModeState): number | null {
  if (!state.isActive || !state.startedAt) return null
  if (!state.durationMs) return null // untilOff

  const elapsed = Date.now() - state.startedAt
  const remaining = state.durationMs - elapsed
  return Math.max(0, remaining)
}

/**
 * Check if a URL should be blocked during focus mode
 * Story 33.2: Uses custom configuration if available
 */
export function shouldBlockUrl(url: string, config?: LocalFocusModeConfig): boolean {
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
      return false
    }

    // Story 33.2: Check custom allow list first
    if (config) {
      for (const pattern of config.customAllowPatterns) {
        if (matchesPattern(hostname, pattern)) {
          return false
        }
      }

      // Story 33.2: Check custom block list
      for (const pattern of config.customBlockPatterns) {
        if (matchesPattern(hostname, pattern)) {
          return true
        }
      }
    }

    // Always allow education/productivity sites (from default list)
    for (const allowed of ALLOWED_DOMAINS) {
      if (hostname.includes(allowed)) {
        return false
      }
    }

    // Story 33.2: If custom config says not to use defaults, only block custom list
    if (config && !config.useDefaultCategories) {
      return false
    }

    // Check blocked categories, respecting any overrides from config
    const blockedCategories = [...FOCUS_MODE_DEFAULT_CATEGORIES.blocked]

    // Story 33.2: Remove categories that were moved to allowed
    if (config?.allowedCategories) {
      for (const cat of config.allowedCategories) {
        const idx = blockedCategories.indexOf(cat)
        if (idx !== -1) blockedCategories.splice(idx, 1)
      }
    }

    // Story 33.2: Add default-allowed categories that were moved to blocked
    if (config?.blockedCategories) {
      for (const cat of config.blockedCategories) {
        if (!blockedCategories.includes(cat)) {
          blockedCategories.push(cat)
        }
      }
    }

    for (const category of blockedCategories) {
      const domains = DISTRACTION_DOMAINS[category] || []
      for (const domain of domains) {
        if (hostname === domain || hostname.endsWith(`.${domain}`)) {
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
 * Story 33.2: Check if hostname matches a pattern
 * Supports exact match and wildcard (*.example.com)
 */
function matchesPattern(hostname: string, pattern: string): boolean {
  if (pattern.startsWith('*.')) {
    const suffix = pattern.slice(2)
    return hostname === suffix || hostname.endsWith(`.${suffix}`)
  }
  return hostname === pattern || hostname.endsWith(`.${pattern}`)
}

/**
 * Sync focus mode state from Firestore
 */
export async function syncFocusModeState(
  childId: string,
  familyId: string
): Promise<LocalFocusModeState | null> {
  try {
    const response = await fetch(
      `https://us-central1-fledgely-cns-me.cloudfunctions.net/getFocusModeState`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ childId, familyId }),
      }
    )

    if (!response.ok) {
      console.error('[Fledgely Focus] Sync failed:', response.status)
      return null
    }

    const data = await response.json()

    // Story 33.4: Extract calendar trigger information from session
    const triggeredBy = data.currentSession?.triggeredBy || 'manual'
    const calendarEventId = data.currentSession?.calendarEventId || null
    const calendarEventTitle = data.currentSession?.calendarEventTitle || null

    const newState: LocalFocusModeState = {
      isActive: data.isActive || false,
      durationType: data.currentSession?.durationType || null,
      startedAt: data.currentSession?.startedAt || null,
      durationMs: data.currentSession?.durationMs || null,
      childId,
      familyId,
      lastSyncedAt: Date.now(),
      triggeredBy,
      calendarEventId,
      calendarEventTitle,
    }

    await setFocusModeState(newState)

    // Story 33.4: Log calendar trigger info for debugging
    if (triggeredBy === 'calendar' && calendarEventTitle) {
      console.log(
        '[Fledgely Focus] State synced:',
        newState.isActive,
        `(calendar: "${calendarEventTitle}")`
      )
    } else {
      console.log('[Fledgely Focus] State synced:', newState.isActive)
    }

    return newState
  } catch (error) {
    console.error('[Fledgely Focus] Sync error:', error)
    return null
  }
}

/**
 * Set up periodic focus mode check alarm
 */
export async function setupFocusModeCheckAlarm(): Promise<void> {
  await chrome.alarms.clear(FOCUS_MODE_CHECK_ALARM)
  await chrome.alarms.create(FOCUS_MODE_CHECK_ALARM, {
    delayInMinutes: 1,
    periodInMinutes: 1, // Check every minute
  })
  console.log('[Fledgely Focus] Check alarm created')
}

/**
 * Handle focus mode check alarm
 * Checks for expiration and enforces blocking if active
 */
export async function handleFocusModeCheckAlarm(): Promise<void> {
  const state = await getFocusModeState()

  if (!state.isActive) {
    return
  }

  // Check if focus mode has expired
  if (isFocusModeExpired(state)) {
    console.log('[Fledgely Focus] Session expired')
    await setFocusModeState({
      ...state,
      isActive: false,
    })

    // Clear blocking from all tabs
    await clearFocusModeBlockingFromAllTabs()
    return
  }

  // Enforce blocking on active tabs
  await enforceFocusModeOnAllTabs()
}

/**
 * Story 33.4: Calendar context for focus mode blocking overlay
 */
export interface FocusModeCalendarContext {
  triggeredBy: FocusModeTriggerType
  calendarEventTitle: string | null
}

/**
 * Inject focus mode blocking script into a tab
 * Story 33.4: Passes calendar context for display in overlay
 */
export async function injectFocusModeBlockingScript(
  tabId: number,
  calendarContext?: FocusModeCalendarContext
): Promise<void> {
  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ['content-scripts/focus-mode-block.js'],
    })

    // Story 33.4: Send calendar context to content script for display
    if (calendarContext?.triggeredBy === 'calendar' && calendarContext?.calendarEventTitle) {
      try {
        await chrome.tabs.sendMessage(tabId, {
          type: 'FOCUS_MODE_CALENDAR_CONTEXT',
          calendarEventTitle: calendarContext.calendarEventTitle,
        })
      } catch {
        // Content script might not be ready yet, that's OK
      }
    }
  } catch (error) {
    // Tab might be a special page that can't be injected
    console.log('[Fledgely Focus] Could not inject into tab:', tabId, error)
  }
}

/**
 * Enforce focus mode blocking on all tabs
 * Story 33.2: Uses custom configuration for blocking decisions
 * Story 33.4: Passes calendar context for display in blocking overlay
 */
export async function enforceFocusModeOnAllTabs(): Promise<void> {
  try {
    const config = await getFocusModeConfig()
    const state = await getFocusModeState()

    // Story 33.4: Build calendar context for overlay display
    const calendarContext: FocusModeCalendarContext = {
      triggeredBy: state.triggeredBy,
      calendarEventTitle: state.calendarEventTitle,
    }

    const tabs = await chrome.tabs.query({})
    for (const tab of tabs) {
      if (tab.id && tab.url && shouldBlockUrl(tab.url, config)) {
        await injectFocusModeBlockingScript(tab.id, calendarContext)
      }
    }
  } catch (error) {
    console.error('[Fledgely Focus] Enforce all tabs error:', error)
  }
}

/**
 * Story 33.2: Sync focus mode configuration from Firestore
 */
export async function syncFocusModeConfig(
  childId: string,
  familyId: string
): Promise<LocalFocusModeConfig | null> {
  try {
    const { state } = await chrome.storage.local.get('state')
    const deviceId = state?.deviceId

    const response = await fetch(
      `https://us-central1-fledgely-cns-me.cloudfunctions.net/getFocusModeConfig`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ childId, familyId, deviceId }),
      }
    )

    if (!response.ok) {
      console.error('[Fledgely Focus] Config sync failed:', response.status)
      return null
    }

    const data = await response.json()

    const newConfig: LocalFocusModeConfig = {
      useDefaultCategories: data.useDefaultCategories ?? true,
      customAllowPatterns: data.customAllowList?.map((a: { pattern: string }) => a.pattern) || [],
      customBlockPatterns: data.customBlockList?.map((a: { pattern: string }) => a.pattern) || [],
      allowedCategories: data.allowedCategories || [],
      blockedCategories: data.blockedCategories || [],
      lastSyncedAt: Date.now(),
    }

    await setFocusModeConfig(newConfig)
    console.log('[Fledgely Focus] Config synced')

    return newConfig
  } catch (error) {
    console.error('[Fledgely Focus] Config sync error:', error)
    return null
  }
}

/**
 * Clear focus mode blocking from all tabs
 */
export async function clearFocusModeBlockingFromAllTabs(): Promise<void> {
  try {
    const tabs = await chrome.tabs.query({})
    for (const tab of tabs) {
      if (tab.id) {
        try {
          await chrome.tabs.sendMessage(tab.id, { type: 'CLEAR_FOCUS_MODE_BLOCK' })
        } catch {
          // Tab might not have content script
        }
      }
    }
  } catch (error) {
    console.error('[Fledgely Focus] Clear all tabs error:', error)
  }
}

/**
 * Export alarm name for background.ts to use
 */
export { FOCUS_MODE_CHECK_ALARM }
