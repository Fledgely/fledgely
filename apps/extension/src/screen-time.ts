/**
 * Screen Time Tracking Module for Fledgely Chrome Extension
 *
 * Story 29.2: Chromebook Screen Time Capture
 *
 * Tracks active tab time and syncs to Firestore for dashboard display.
 * - Tracks active tab only (not background tabs)
 * - Pauses during idle/locked states
 * - Excludes crisis URLs (zero-data-path)
 * - Batches and syncs every 15 minutes
 */

import { isUrlProtected } from './crisis-allowlist'
import { logCaptureEvent, ERROR_CODES } from './event-logger'

// Import category type from shared package - we use a subset for screen time
export type ScreenTimeCategory =
  | 'education'
  | 'social_media'
  | 'gaming'
  | 'entertainment'
  | 'productivity'
  | 'communication'
  | 'news'
  | 'shopping'
  | 'other'

/**
 * Screen time tracking state
 */
export interface ScreenTimeState {
  /** Currently active tab being tracked */
  activeTabId: number | null
  /** Domain of active tab */
  activeDomain: string | null
  /** Category of active tab */
  activeCategory: ScreenTimeCategory
  /** When current tracking session started (epoch ms) */
  sessionStartedAt: number | null
  /** Whether currently tracking (false when idle/locked) */
  isTracking: boolean
  /** Last known idle state */
  lastIdleState: chrome.idle.IdleState
}

/**
 * Screen time queue entry for local storage
 */
export interface ScreenTimeQueueEntry {
  /** Date in YYYY-MM-DD format */
  date: string
  /** IANA timezone */
  timezone: string
  /** Domain being tracked (for aggregation, not synced) */
  domain: string
  /** Inferred category */
  category: ScreenTimeCategory
  /** Minutes accumulated */
  minutes: number
  /** When this entry was recorded */
  recordedAt: number
}

/**
 * Aggregated screen time data for sync
 */
export interface ScreenTimeSyncPayload {
  deviceId: string
  familyId: string
  childId: string
  entries: {
    date: string
    timezone: string
    categories: {
      category: ScreenTimeCategory
      minutes: number
    }[]
  }[]
}

// Storage keys
const STORAGE_KEY_STATE = 'screenTimeState'
const STORAGE_KEY_QUEUE = 'screenTimeQueue'

// Max queue size before forced sync
const MAX_QUEUE_SIZE = 500

// Minimum minutes to record (anything less is noise)
const MIN_MINUTES_THRESHOLD = 0.5

// Sync interval in minutes
export const SCREEN_TIME_SYNC_INTERVAL_MINUTES = 15

// Alarm name
export const ALARM_SCREEN_TIME_SYNC = 'screen-time-sync'

/**
 * Domain to category mapping
 * Priority: more specific domains first
 */
const DOMAIN_CATEGORIES: Record<string, ScreenTimeCategory> = {
  // Education - Google Workspace
  'classroom.google.com': 'education',
  'docs.google.com': 'productivity',
  'slides.google.com': 'productivity',
  'sheets.google.com': 'productivity',
  'drive.google.com': 'productivity',
  'forms.google.com': 'productivity',

  // Education - Learning platforms
  'khanacademy.org': 'education',
  'quizlet.com': 'education',
  'canvas.instructure.com': 'education',
  'schoology.com': 'education',
  'clever.com': 'education',
  'ixl.com': 'education',
  'prodigygame.com': 'education',
  'brainpop.com': 'education',
  'duolingo.com': 'education',
  'coursera.org': 'education',
  'edx.org': 'education',
  'udemy.com': 'education',
  'codecademy.com': 'education',

  // Social Media
  'facebook.com': 'social_media',
  'instagram.com': 'social_media',
  'twitter.com': 'social_media',
  'x.com': 'social_media',
  'tiktok.com': 'social_media',
  'snapchat.com': 'social_media',
  'reddit.com': 'social_media',
  'discord.com': 'communication',
  'tumblr.com': 'social_media',
  'pinterest.com': 'social_media',
  'linkedin.com': 'social_media',

  // Gaming
  'roblox.com': 'gaming',
  'minecraft.net': 'gaming',
  'steam.com': 'gaming',
  'steamcommunity.com': 'gaming',
  'twitch.tv': 'gaming',
  'epicgames.com': 'gaming',
  'ea.com': 'gaming',
  'blizzard.com': 'gaming',
  'xbox.com': 'gaming',
  'playstation.com': 'gaming',
  'nintendo.com': 'gaming',
  'coolmathgames.com': 'gaming',
  'poki.com': 'gaming',

  // Entertainment
  'youtube.com': 'entertainment',
  'netflix.com': 'entertainment',
  'hulu.com': 'entertainment',
  'disneyplus.com': 'entertainment',
  'hbomax.com': 'entertainment',
  'max.com': 'entertainment',
  'primevideo.com': 'entertainment',
  'spotify.com': 'entertainment',
  'soundcloud.com': 'entertainment',
  'apple.com/tv': 'entertainment',
  'peacocktv.com': 'entertainment',
  'paramountplus.com': 'entertainment',

  // Communication
  'gmail.com': 'communication',
  'mail.google.com': 'communication',
  'outlook.com': 'communication',
  'outlook.live.com': 'communication',
  'zoom.us': 'communication',
  'meet.google.com': 'communication',
  'teams.microsoft.com': 'communication',
  'slack.com': 'communication',
  'messenger.com': 'communication',
  'web.whatsapp.com': 'communication',

  // News
  'cnn.com': 'news',
  'bbc.com': 'news',
  'nytimes.com': 'news',
  'washingtonpost.com': 'news',
  'npr.org': 'news',
  'reuters.com': 'news',
  'apnews.com': 'news',
  'news.google.com': 'news',

  // Shopping
  'amazon.com': 'shopping',
  'ebay.com': 'shopping',
  'walmart.com': 'shopping',
  'target.com': 'shopping',
  'etsy.com': 'shopping',
  'bestbuy.com': 'shopping',

  // Productivity
  'notion.so': 'productivity',
  'trello.com': 'productivity',
  'asana.com': 'productivity',
  'monday.com': 'productivity',
  'evernote.com': 'productivity',
  'github.com': 'productivity',
  'stackoverflow.com': 'productivity',
  'figma.com': 'productivity',
  'canva.com': 'productivity',
}

/**
 * Get the base domain from a URL
 * Example: "https://www.youtube.com/watch?v=123" -> "youtube.com"
 */
export function extractDomain(url: string): string | null {
  try {
    const urlObj = new URL(url)
    let hostname = urlObj.hostname.toLowerCase()

    // Remove www. prefix
    if (hostname.startsWith('www.')) {
      hostname = hostname.substring(4)
    }

    return hostname
  } catch {
    return null
  }
}

/**
 * Infer category from domain
 */
export function inferCategory(domain: string | null): ScreenTimeCategory {
  if (!domain) return 'other'

  // Check exact match first
  if (DOMAIN_CATEGORIES[domain]) {
    return DOMAIN_CATEGORIES[domain]
  }

  // Check if domain ends with any known domain (for subdomains)
  for (const [knownDomain, category] of Object.entries(DOMAIN_CATEGORIES)) {
    if (domain.endsWith('.' + knownDomain) || domain === knownDomain) {
      return category
    }
  }

  // Check common patterns
  if (domain.includes('school') || domain.includes('edu')) {
    return 'education'
  }
  if (domain.endsWith('.edu')) {
    return 'education'
  }
  if (domain.includes('game') || domain.includes('play')) {
    return 'gaming'
  }

  return 'other'
}

/**
 * Get current date in YYYY-MM-DD format for child's timezone
 */
function getCurrentDate(timezone: string): string {
  const now = new Date()
  try {
    return now.toLocaleDateString('en-CA', { timeZone: timezone }) // en-CA gives YYYY-MM-DD format
  } catch {
    // Fallback to local date if timezone is invalid
    return now.toISOString().split('T')[0]
  }
}

/**
 * Get the child's timezone from storage
 */
async function getChildTimezone(): Promise<string> {
  try {
    const { state } = await chrome.storage.local.get('state')
    // Use stored timezone or fall back to browser's timezone
    return state?.childTimezone || Intl.DateTimeFormat().resolvedOptions().timeZone
  } catch {
    return Intl.DateTimeFormat().resolvedOptions().timeZone
  }
}

/**
 * Get current screen time state from storage
 */
export async function getScreenTimeState(): Promise<ScreenTimeState> {
  try {
    const result = await chrome.storage.local.get(STORAGE_KEY_STATE)
    return (
      result[STORAGE_KEY_STATE] || {
        activeTabId: null,
        activeDomain: null,
        activeCategory: 'other',
        sessionStartedAt: null,
        isTracking: false,
        lastIdleState: 'active',
      }
    )
  } catch {
    return {
      activeTabId: null,
      activeDomain: null,
      activeCategory: 'other',
      sessionStartedAt: null,
      isTracking: false,
      lastIdleState: 'active',
    }
  }
}

/**
 * Save screen time state to storage
 */
async function saveScreenTimeState(state: ScreenTimeState): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_KEY_STATE]: state })
}

/**
 * Get screen time queue from storage
 */
export async function getScreenTimeQueue(): Promise<ScreenTimeQueueEntry[]> {
  try {
    const result = await chrome.storage.local.get(STORAGE_KEY_QUEUE)
    const queue = result[STORAGE_KEY_QUEUE]
    return Array.isArray(queue) ? queue : []
  } catch {
    return []
  }
}

/**
 * Save screen time queue to storage
 */
async function saveScreenTimeQueue(queue: ScreenTimeQueueEntry[]): Promise<void> {
  // Limit queue size
  const trimmedQueue = queue.slice(-MAX_QUEUE_SIZE)
  await chrome.storage.local.set({ [STORAGE_KEY_QUEUE]: trimmedQueue })
}

/**
 * Record accumulated time for the current session
 * Called when switching tabs, going idle, or on periodic flush
 */
export async function flushCurrentSession(): Promise<void> {
  const state = await getScreenTimeState()

  if (!state.isTracking || !state.sessionStartedAt || !state.activeDomain) {
    return
  }

  const now = Date.now()
  const sessionDurationMs = now - state.sessionStartedAt
  const sessionDurationMinutes = sessionDurationMs / 60000

  // Only record if duration is meaningful
  if (sessionDurationMinutes < MIN_MINUTES_THRESHOLD) {
    // Just update session start time
    await saveScreenTimeState({
      ...state,
      sessionStartedAt: now,
    })
    return
  }

  const timezone = await getChildTimezone()
  const date = getCurrentDate(timezone)

  // Add entry to queue
  const queue = await getScreenTimeQueue()
  const entry: ScreenTimeQueueEntry = {
    date,
    timezone,
    domain: state.activeDomain,
    category: state.activeCategory,
    minutes: Math.round(sessionDurationMinutes * 10) / 10, // Round to 0.1 min
    recordedAt: now,
  }

  queue.push(entry)
  await saveScreenTimeQueue(queue)

  // Reset session start time
  await saveScreenTimeState({
    ...state,
    sessionStartedAt: now,
  })
}

/**
 * Handle tab activation - start tracking new tab
 */
export async function handleTabActivated(tabId: number): Promise<void> {
  // First, flush any current session
  await flushCurrentSession()

  try {
    const tab = await chrome.tabs.get(tabId)
    await startTrackingTab(tab)
  } catch {
    // Tab may have been closed
    await stopTracking()
  }
}

/**
 * Handle tab update - URL may have changed
 */
export async function handleTabUpdated(
  tabId: number,
  changeInfo: chrome.tabs.TabChangeInfo,
  tab: chrome.tabs.Tab
): Promise<void> {
  // Only care about URL changes on the active tab
  if (!changeInfo.url) return

  const state = await getScreenTimeState()
  if (state.activeTabId !== tabId) return

  // URL changed on active tab - flush and restart
  await flushCurrentSession()
  await startTrackingTab(tab)
}

/**
 * Start tracking a tab
 */
async function startTrackingTab(tab: chrome.tabs.Tab): Promise<void> {
  const state = await getScreenTimeState()

  // Don't track if idle
  if (state.lastIdleState !== 'active') {
    await saveScreenTimeState({
      ...state,
      activeTabId: tab.id ?? null,
      activeDomain: null,
      activeCategory: 'other',
      sessionStartedAt: null,
      isTracking: false,
    })
    return
  }

  // Extract domain from URL
  const url = tab.url || ''
  const domain = extractDomain(url)

  // Check if this is a protected crisis URL
  if (domain && (await isUrlProtected(url))) {
    // Zero-data-path: don't track crisis URLs
    await logCaptureEvent({
      type: 'capture_skipped',
      code: ERROR_CODES.CRISIS_URL_PROTECTED,
    })

    await saveScreenTimeState({
      ...state,
      activeTabId: tab.id ?? null,
      activeDomain: null,
      activeCategory: 'other',
      sessionStartedAt: null,
      isTracking: false,
    })
    return
  }

  // Skip chrome:// and other internal URLs
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    await saveScreenTimeState({
      ...state,
      activeTabId: tab.id ?? null,
      activeDomain: null,
      activeCategory: 'other',
      sessionStartedAt: null,
      isTracking: false,
    })
    return
  }

  // Start tracking
  const category = inferCategory(domain)
  await saveScreenTimeState({
    ...state,
    activeTabId: tab.id ?? null,
    activeDomain: domain,
    activeCategory: category,
    sessionStartedAt: Date.now(),
    isTracking: true,
  })
}

/**
 * Stop tracking (e.g., when going idle)
 */
async function stopTracking(): Promise<void> {
  const state = await getScreenTimeState()
  await saveScreenTimeState({
    ...state,
    sessionStartedAt: null,
    isTracking: false,
  })
}

/**
 * Handle idle state change
 */
export async function handleIdleStateChanged(newState: chrome.idle.IdleState): Promise<void> {
  const state = await getScreenTimeState()

  if (newState === 'active' && state.lastIdleState !== 'active') {
    // Coming back from idle - restart tracking on current tab
    await saveScreenTimeState({
      ...state,
      lastIdleState: newState,
    })

    // Get current active tab and start tracking
    try {
      const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true })
      if (activeTab?.id) {
        await startTrackingTab(activeTab)
      }
    } catch {
      // No active tab
    }
  } else if (newState !== 'active' && state.lastIdleState === 'active') {
    // Going idle - flush current session and pause
    await flushCurrentSession()
    await saveScreenTimeState({
      ...state,
      lastIdleState: newState,
      sessionStartedAt: null,
      isTracking: false,
    })
  } else {
    // Just update state
    await saveScreenTimeState({
      ...state,
      lastIdleState: newState,
    })
  }
}

/**
 * Aggregate queue entries by date and category
 */
export function aggregateQueueEntries(
  entries: ScreenTimeQueueEntry[]
): Map<string, Map<ScreenTimeCategory, number>> {
  const aggregated = new Map<string, Map<ScreenTimeCategory, number>>()

  for (const entry of entries) {
    const dateKey = `${entry.date}|${entry.timezone}`

    if (!aggregated.has(dateKey)) {
      aggregated.set(dateKey, new Map())
    }

    const dateMap = aggregated.get(dateKey)!
    const currentMinutes = dateMap.get(entry.category) || 0
    dateMap.set(entry.category, currentMinutes + entry.minutes)
  }

  return aggregated
}

/**
 * Sync screen time data to the server
 */
export async function syncScreenTime(): Promise<boolean> {
  try {
    // Flush current session first
    await flushCurrentSession()

    // Get enrollment state
    const { state } = await chrome.storage.local.get('state')
    if (!state?.enrolled || !state?.deviceId || !state?.familyId || !state?.childId) {
      console.log('[Fledgely] Screen time sync skipped - not enrolled')
      return false
    }

    // Get queue
    const queue = await getScreenTimeQueue()
    if (queue.length === 0) {
      console.log('[Fledgely] Screen time sync skipped - empty queue')
      return true
    }

    // Aggregate entries
    const aggregated = aggregateQueueEntries(queue)

    // Build sync payload
    const entries: ScreenTimeSyncPayload['entries'] = []

    for (const [dateKey, categoryMap] of aggregated) {
      const [date, timezone] = dateKey.split('|')
      const categories: { category: ScreenTimeCategory; minutes: number }[] = []

      for (const [category, minutes] of categoryMap) {
        // Round to whole minutes
        categories.push({
          category,
          minutes: Math.round(minutes),
        })
      }

      entries.push({ date, timezone, categories })
    }

    const payload: ScreenTimeSyncPayload = {
      deviceId: state.deviceId,
      familyId: state.familyId,
      childId: state.childId,
      entries,
    }

    // Send to server
    const response = await fetch(
      'https://us-central1-fledgely-cns-me.cloudfunctions.net/syncScreenTime',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      }
    )

    if (!response.ok) {
      console.error('[Fledgely] Screen time sync failed:', response.status)
      return false
    }

    // Clear queue on success
    await saveScreenTimeQueue([])

    console.log('[Fledgely] Screen time synced successfully:', entries.length, 'date entries')
    return true
  } catch (error) {
    console.error('[Fledgely] Screen time sync error:', error)
    return false
  }
}

/**
 * Set up periodic screen time sync using chrome.alarms
 */
export function setupScreenTimeSyncAlarm(): void {
  // Create alarm for periodic sync
  chrome.alarms.create(ALARM_SCREEN_TIME_SYNC, {
    delayInMinutes: 1, // First sync after 1 minute
    periodInMinutes: SCREEN_TIME_SYNC_INTERVAL_MINUTES,
  })

  console.log(
    `[Fledgely] Screen time sync alarm configured (every ${SCREEN_TIME_SYNC_INTERVAL_MINUTES} minutes)`
  )
}

/**
 * Initialize screen time tracking
 * Call this from background.ts during extension startup
 */
export async function initScreenTimeTracking(): Promise<void> {
  // Set up sync alarm
  setupScreenTimeSyncAlarm()

  // Initialize state if needed
  const state = await getScreenTimeState()
  if (!state.sessionStartedAt) {
    // Fresh start - begin tracking current tab
    try {
      const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true })
      if (activeTab?.id) {
        await startTrackingTab(activeTab)
      }
    } catch {
      // No active tab
    }
  }

  console.log('[Fledgely] Screen time tracking initialized')
}
