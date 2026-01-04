/**
 * Sharing Preview Service - Story 52.3 Task 2
 *
 * Service functions for calculating what parents can see when reverse mode is active.
 * Provides preview of shared data based on teen's sharing preferences.
 *
 * AC1: Daily Screen Time Summary Sharing
 * AC2: Category-Based Sharing
 * AC3: Time Limit Status Sharing
 * AC4: Nothing Shared Option
 * AC5: Granular Controls
 */

import {
  type ReverseModeShareingPreferences,
  type ReverseModeSettings,
  DEFAULT_REVERSE_MODE_SHARING,
} from '../contracts/reverseMode'

// ============================================
// Types
// ============================================

/**
 * Screen time data structure.
 */
export interface ScreenTimeData {
  /** Total screen time in minutes */
  totalMinutes: number
  /** Breakdown by category */
  categoryBreakdown: Record<string, number>
  /** Breakdown by app */
  appBreakdown: Record<string, number>
  /** Whether time limit is approaching */
  isApproachingLimit: boolean
  /** Whether time limit is reached */
  isLimitReached: boolean
  /** Daily limit in minutes (if set) */
  dailyLimit?: number
}

/**
 * Flag/alert data structure.
 */
export interface FlagData {
  /** Flag ID */
  id: string
  /** Category of the flag (e.g., 'social', 'gaming') */
  category: string
  /** Flag type/severity */
  type: string
  /** Timestamp */
  timestamp: Date
  /** Description */
  description: string
}

/**
 * Location data structure.
 */
export interface LocationData {
  /** Last known location */
  lastLocation?: {
    latitude: number
    longitude: number
    timestamp: Date
  }
  /** Location history */
  history?: Array<{
    latitude: number
    longitude: number
    timestamp: Date
  }>
}

/**
 * Screenshot data structure.
 */
export interface ScreenshotData {
  /** Screenshot ID */
  id: string
  /** Timestamp */
  timestamp: Date
  /** App that was captured */
  appName: string
  /** URL for the screenshot */
  url: string
}

/**
 * Complete child activity data.
 */
export interface ChildActivityData {
  screenTime: ScreenTimeData
  flags: FlagData[]
  screenshots: ScreenshotData[]
  location: LocationData
}

/**
 * Parent-visible data after filtering by sharing preferences.
 */
export interface ParentVisibleData {
  /** Screen time visibility */
  screenTime: ParentVisibleScreenTime | null
  /** Visible flags */
  flags: ParentVisibleFlag[] | null
  /** Visible screenshots */
  screenshots: ParentVisibleScreenshot[] | null
  /** Location visibility */
  location: ParentVisibleLocation | null
  /** Time limit status */
  timeLimitStatus: ParentVisibleTimeLimitStatus | null
  /** Whether anything is shared */
  hasAnySharedData: boolean
}

export interface ParentVisibleScreenTime {
  /** Display type: 'summary' or 'full' */
  displayType: 'summary' | 'full'
  /** Total minutes (always shown if shared) */
  totalMinutes: number
  /** Category breakdown (only if full) */
  categoryBreakdown?: Record<string, number>
  /** App breakdown (only if full) */
  appBreakdown?: Record<string, number>
}

export interface ParentVisibleFlag {
  id: string
  category: string
  type: string
  timestamp: Date
  description: string
}

export interface ParentVisibleScreenshot {
  id: string
  timestamp: Date
  appName: string
  url: string
}

export interface ParentVisibleLocation {
  lastLocation?: {
    latitude: number
    longitude: number
    timestamp: Date
  }
}

export interface ParentVisibleTimeLimitStatus {
  /** Status message */
  status: 'within_limit' | 'approaching_limit' | 'limit_reached'
  /** Human-readable message */
  message: string
}

/**
 * Preview text for the sharing configuration.
 */
export interface SharingPreview {
  /** Summary text */
  summary: string
  /** Detailed breakdown */
  details: SharingPreviewDetail[]
  /** Whether nothing is shared */
  isNothingShared: boolean
}

export interface SharingPreviewDetail {
  /** Category name */
  category: string
  /** What is shared */
  sharedItems: string[]
  /** What is private */
  privateItems: string[]
}

// ============================================
// Visibility Calculation Functions
// ============================================

/**
 * Calculate what parents can see based on child's activity data and sharing preferences.
 * AC5: Granular controls determine visibility
 * AC6: Real-time update - this is called whenever data is requested
 *
 * @param childData - Full child activity data
 * @param sharingPrefs - Teen's sharing preferences
 * @param reverseModeSettings - Current reverse mode settings
 * @returns Filtered data visible to parents
 */
export function calculateParentVisibility(
  childData: ChildActivityData,
  sharingPrefs: ReverseModeShareingPreferences | undefined,
  reverseModeSettings: ReverseModeSettings | null | undefined
): ParentVisibleData {
  // If reverse mode is not active, parents see everything (normal mode)
  if (!reverseModeSettings || reverseModeSettings.status !== 'active') {
    return {
      screenTime: {
        displayType: 'full',
        totalMinutes: childData.screenTime.totalMinutes,
        categoryBreakdown: childData.screenTime.categoryBreakdown,
        appBreakdown: childData.screenTime.appBreakdown,
      },
      flags: childData.flags.map((f) => ({
        id: f.id,
        category: f.category,
        type: f.type,
        timestamp: f.timestamp,
        description: f.description,
      })),
      screenshots: childData.screenshots.map((s) => ({
        id: s.id,
        timestamp: s.timestamp,
        appName: s.appName,
        url: s.url,
      })),
      location: {
        lastLocation: childData.location.lastLocation,
      },
      timeLimitStatus: getTimeLimitStatus(childData.screenTime),
      hasAnySharedData: true,
    }
  }

  // Use default sharing (nothing) if no preferences set
  const prefs = sharingPrefs ?? DEFAULT_REVERSE_MODE_SHARING

  const screenTime = calculateVisibleScreenTime(childData.screenTime, prefs)
  const flags = calculateVisibleFlags(childData.flags, prefs)
  const screenshots = calculateVisibleScreenshots(childData.screenshots, prefs)
  const location = calculateVisibleLocation(childData.location, prefs)
  const timeLimitStatus = calculateVisibleTimeLimitStatus(childData.screenTime, prefs)

  const hasAnySharedData = !!(
    screenTime ||
    (flags && flags.length > 0) ||
    (screenshots && screenshots.length > 0) ||
    location ||
    timeLimitStatus
  )

  return {
    screenTime,
    flags,
    screenshots,
    location,
    timeLimitStatus,
    hasAnySharedData,
  }
}

/**
 * Calculate visible screen time based on preferences.
 * AC1: Can share daily screen time summary only
 */
function calculateVisibleScreenTime(
  screenTime: ScreenTimeData,
  prefs: ReverseModeShareingPreferences
): ParentVisibleScreenTime | null {
  // Check if screen time sharing is enabled
  if (!prefs.screenTime) {
    return null
  }

  // Check detail level
  const detailLevel = prefs.screenTimeDetail ?? 'none'

  if (detailLevel === 'none') {
    return null
  }

  if (detailLevel === 'summary') {
    // AC1: Summary only - just total minutes
    return {
      displayType: 'summary',
      totalMinutes: screenTime.totalMinutes,
    }
  }

  // Full detail - include breakdowns
  // Filter categories if sharedCategories is specified
  let categoryBreakdown = screenTime.categoryBreakdown
  const appBreakdown = screenTime.appBreakdown

  if (prefs.sharedCategories && prefs.sharedCategories.length > 0) {
    // AC2: Only show shared categories
    categoryBreakdown = filterByCategories(screenTime.categoryBreakdown, prefs.sharedCategories)
    // For apps, we'd need category mapping - for now show all if full
  }

  return {
    displayType: 'full',
    totalMinutes: screenTime.totalMinutes,
    categoryBreakdown,
    appBreakdown,
  }
}

/**
 * Calculate visible flags based on preferences.
 * AC2: Category-based sharing
 */
function calculateVisibleFlags(
  flags: FlagData[],
  prefs: ReverseModeShareingPreferences
): ParentVisibleFlag[] | null {
  if (!prefs.flags) {
    return null
  }

  let filteredFlags = flags

  // Filter by shared categories if specified
  if (prefs.sharedCategories && prefs.sharedCategories.length > 0) {
    filteredFlags = flags.filter((f) => prefs.sharedCategories.includes(f.category))
  }

  return filteredFlags.map((f) => ({
    id: f.id,
    category: f.category,
    type: f.type,
    timestamp: f.timestamp,
    description: f.description,
  }))
}

/**
 * Calculate visible screenshots based on preferences.
 */
function calculateVisibleScreenshots(
  screenshots: ScreenshotData[],
  prefs: ReverseModeShareingPreferences
): ParentVisibleScreenshot[] | null {
  if (!prefs.screenshots) {
    return null
  }

  return screenshots.map((s) => ({
    id: s.id,
    timestamp: s.timestamp,
    appName: s.appName,
    url: s.url,
  }))
}

/**
 * Calculate visible location based on preferences.
 */
function calculateVisibleLocation(
  location: LocationData,
  prefs: ReverseModeShareingPreferences
): ParentVisibleLocation | null {
  if (!prefs.location) {
    return null
  }

  return {
    lastLocation: location.lastLocation,
  }
}

/**
 * Calculate visible time limit status based on preferences.
 * AC3: Time limit status sharing
 */
function calculateVisibleTimeLimitStatus(
  screenTime: ScreenTimeData,
  prefs: ReverseModeShareingPreferences
): ParentVisibleTimeLimitStatus | null {
  if (!prefs.timeLimitStatus) {
    return null
  }

  return getTimeLimitStatus(screenTime)
}

/**
 * Get time limit status from screen time data.
 */
function getTimeLimitStatus(screenTime: ScreenTimeData): ParentVisibleTimeLimitStatus {
  if (screenTime.isLimitReached) {
    return {
      status: 'limit_reached',
      message: 'Daily limit reached',
    }
  }

  if (screenTime.isApproachingLimit) {
    return {
      status: 'approaching_limit',
      message: 'Approaching daily limit',
    }
  }

  return {
    status: 'within_limit',
    message: 'Within daily limit',
  }
}

/**
 * Filter a record by allowed categories.
 */
function filterByCategories(
  data: Record<string, number>,
  allowedCategories: string[]
): Record<string, number> {
  const result: Record<string, number> = {}
  for (const category of allowedCategories) {
    if (data[category] !== undefined) {
      result[category] = data[category]
    }
  }
  return result
}

// ============================================
// Preview Generation Functions
// ============================================

/**
 * Generate a preview of what parents will see based on sharing preferences.
 * AC5: Preview of what parents will see
 *
 * @param prefs - Sharing preferences
 * @returns Preview text and details
 */
export function generateSharingPreview(
  prefs: ReverseModeShareingPreferences | undefined
): SharingPreview {
  const effectivePrefs = prefs ?? DEFAULT_REVERSE_MODE_SHARING

  const details: SharingPreviewDetail[] = []

  // Screen time preview
  const screenTimeDetail = getScreenTimePreviewDetail(effectivePrefs)
  details.push(screenTimeDetail)

  // Flags preview
  const flagsDetail = getFlagsPreviewDetail(effectivePrefs)
  details.push(flagsDetail)

  // Screenshots preview
  const screenshotsDetail = getScreenshotsPreviewDetail(effectivePrefs)
  details.push(screenshotsDetail)

  // Location preview
  const locationDetail = getLocationPreviewDetail(effectivePrefs)
  details.push(locationDetail)

  // Time limit status preview
  const timeLimitDetail = getTimeLimitPreviewDetail(effectivePrefs)
  details.push(timeLimitDetail)

  // Calculate if anything is shared
  const isNothingShared = details.every((d) => d.sharedItems.length === 0)

  // Generate summary
  const summary = isNothingShared
    ? 'Parents cannot see any of your activity data.'
    : generateSummaryText(details)

  return {
    summary,
    details,
    isNothingShared,
  }
}

/**
 * Get screen time preview detail.
 */
function getScreenTimePreviewDetail(prefs: ReverseModeShareingPreferences): SharingPreviewDetail {
  const sharedItems: string[] = []
  const privateItems: string[] = []

  if (prefs.screenTime && prefs.screenTimeDetail !== 'none') {
    if (prefs.screenTimeDetail === 'summary') {
      sharedItems.push('Daily total screen time')
      privateItems.push('App breakdown', 'Category breakdown')
    } else if (prefs.screenTimeDetail === 'full') {
      sharedItems.push('Daily total screen time', 'App breakdown', 'Category breakdown')
    }

    if (prefs.sharedCategories && prefs.sharedCategories.length > 0) {
      sharedItems.push(`Categories: ${prefs.sharedCategories.join(', ')}`)
    }
  } else {
    privateItems.push('All screen time data')
  }

  return {
    category: 'Screen Time',
    sharedItems,
    privateItems,
  }
}

/**
 * Get flags preview detail.
 */
function getFlagsPreviewDetail(prefs: ReverseModeShareingPreferences): SharingPreviewDetail {
  const sharedItems: string[] = []
  const privateItems: string[] = []

  if (prefs.flags) {
    if (prefs.sharedCategories && prefs.sharedCategories.length > 0) {
      sharedItems.push(`Flags for: ${prefs.sharedCategories.join(', ')}`)
      privateItems.push('Other category flags')
    } else {
      sharedItems.push('All flags')
    }
  } else {
    privateItems.push('All flags')
  }

  return {
    category: 'Flags & Alerts',
    sharedItems,
    privateItems,
  }
}

/**
 * Get screenshots preview detail.
 */
function getScreenshotsPreviewDetail(prefs: ReverseModeShareingPreferences): SharingPreviewDetail {
  const sharedItems: string[] = []
  const privateItems: string[] = []

  if (prefs.screenshots) {
    sharedItems.push('Screenshots')
  } else {
    privateItems.push('Screenshots')
  }

  return {
    category: 'Screenshots',
    sharedItems,
    privateItems,
  }
}

/**
 * Get location preview detail.
 */
function getLocationPreviewDetail(prefs: ReverseModeShareingPreferences): SharingPreviewDetail {
  const sharedItems: string[] = []
  const privateItems: string[] = []

  if (prefs.location) {
    sharedItems.push('Location data')
  } else {
    privateItems.push('Location data')
  }

  return {
    category: 'Location',
    sharedItems,
    privateItems,
  }
}

/**
 * Get time limit status preview detail.
 */
function getTimeLimitPreviewDetail(prefs: ReverseModeShareingPreferences): SharingPreviewDetail {
  const sharedItems: string[] = []
  const privateItems: string[] = []

  if (prefs.timeLimitStatus) {
    sharedItems.push('Time limit status (approaching/reached)')
  } else {
    privateItems.push('Time limit status')
  }

  return {
    category: 'Time Limits',
    sharedItems,
    privateItems,
  }
}

/**
 * Generate summary text from details.
 */
function generateSummaryText(details: SharingPreviewDetail[]): string {
  const sharedCategories = details.filter((d) => d.sharedItems.length > 0).map((d) => d.category)

  if (sharedCategories.length === 0) {
    return 'Parents cannot see any of your activity data.'
  }

  if (sharedCategories.length === 1) {
    return `Parents can see: ${sharedCategories[0]}`
  }

  const lastCategory = sharedCategories.pop()
  return `Parents can see: ${sharedCategories.join(', ')} and ${lastCategory}`
}

// ============================================
// Validation Functions
// ============================================

/**
 * Validate sharing preferences.
 *
 * @param prefs - Preferences to validate
 * @returns Validation result
 */
export function validateSharingPreferences(prefs: ReverseModeShareingPreferences): {
  valid: boolean
  errors: string[]
} {
  const errors: string[] = []

  // Validate screen time detail consistency
  if (prefs.screenTime && prefs.screenTimeDetail === 'none') {
    errors.push('Screen time is enabled but detail level is none')
  }

  // Validate category consistency
  if (prefs.sharedCategories && prefs.sharedCategories.length > 0) {
    // Check for valid category names (non-empty strings)
    const invalidCategories = prefs.sharedCategories.filter(
      (c) => typeof c !== 'string' || c.trim() === ''
    )
    if (invalidCategories.length > 0) {
      errors.push('Some shared categories are invalid')
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

/**
 * Check if any data is shared.
 *
 * @param prefs - Sharing preferences
 * @returns True if anything is shared
 */
export function isAnythingShared(prefs: ReverseModeShareingPreferences | undefined): boolean {
  if (!prefs) return false

  return (
    (prefs.screenTime && prefs.screenTimeDetail !== 'none') ||
    prefs.flags ||
    prefs.screenshots ||
    prefs.location ||
    prefs.timeLimitStatus
  )
}

/**
 * Get a list of what is being shared.
 *
 * @param prefs - Sharing preferences
 * @returns List of shared items
 */
export function getSharedItemsList(prefs: ReverseModeShareingPreferences | undefined): string[] {
  if (!prefs) return []

  const items: string[] = []

  if (prefs.screenTime && prefs.screenTimeDetail !== 'none') {
    items.push(
      prefs.screenTimeDetail === 'summary' ? 'Screen time (summary)' : 'Screen time (full)'
    )
  }

  if (prefs.flags) {
    items.push('Flags')
  }

  if (prefs.screenshots) {
    items.push('Screenshots')
  }

  if (prefs.location) {
    items.push('Location')
  }

  if (prefs.timeLimitStatus) {
    items.push('Time limit status')
  }

  return items
}
