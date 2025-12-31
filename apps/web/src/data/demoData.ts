/**
 * Demo Data Constants
 *
 * Story 8.5.1: Demo Child Profile Creation
 *
 * Provides static demo data for new parents to preview Fledgely
 * before adding their real children.
 */

import type { ChildProfile } from '@fledgely/shared/contracts'

/**
 * Demo child ID pattern - distinct from real UUID-based IDs.
 * This ID is used to identify demo profiles in the UI.
 */
export const DEMO_CHILD_ID = 'demo-child'

/**
 * Demo child profile with sample data.
 * Used when family has no real children and showDemoProfile is true.
 *
 * Note: This is a static profile - not stored in Firestore.
 * The demo child is displayed locally on the dashboard.
 */
export const DEMO_CHILD_PROFILE: Omit<ChildProfile, 'guardians' | 'guardianUids' | 'custody'> & {
  isDemo: true
} = {
  id: DEMO_CHILD_ID,
  familyId: 'demo-family', // Placeholder - will be replaced with actual familyId in hook
  name: 'Alex Demo',
  birthdate: new Date(Date.now() - 10 * 365 * 24 * 60 * 60 * 1000), // ~10 years old
  photoURL: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  isDemo: true,
}

/**
 * Check if a child profile is a demo profile.
 */
export function isDemoChild(childId: string): boolean {
  return childId === DEMO_CHILD_ID
}

/**
 * Demo screenshot categories for variety.
 */
export type DemoScreenshotCategory = 'homework' | 'gaming' | 'social' | 'video' | 'creative'

/**
 * AI classification result for demo screenshots.
 * Story 8.5.2 AC2: Each screenshot shows AI classification and confidence score
 */
export interface DemoScreenshotClassification {
  /** Human-readable category label */
  label: string
  /** Confidence score from 0.0 to 1.0 */
  confidence: number
}

/**
 * Demo screenshot entry structure.
 * Story 8.5.1 AC3: Sample screenshots pre-populated
 * Story 8.5.2 AC2/AC3: Extended with classification and flagging
 */
export interface DemoScreenshot {
  id: string
  title: string
  url: string
  category: DemoScreenshotCategory
  timestamp: number
  /** Placeholder data URI for the demo thumbnail */
  thumbnailDataUri: string
  /** AI classification with confidence score (Story 8.5.2) */
  classification: DemoScreenshotClassification
  /** Whether this screenshot is flagged for review (Story 8.5.2 AC3) */
  flagged?: boolean
  /** Reason for flagging in non-accusatory language */
  flagReason?: string
}

/**
 * Get confidence level description based on score.
 * Story 8.5.2: Classification display with confidence levels
 */
export function getConfidenceLevel(confidence: number): 'high' | 'medium' | 'low' {
  if (confidence >= 0.9) return 'high'
  if (confidence >= 0.7) return 'medium'
  return 'low'
}

/**
 * Get confidence level label for display.
 */
export function getConfidenceLevelLabel(confidence: number): string {
  if (confidence >= 0.9) return 'Very confident'
  if (confidence >= 0.7) return 'Confident'
  return 'Uncertain'
}

/**
 * Generate a simple placeholder SVG data URI with category-specific color.
 */
function generatePlaceholderImage(category: DemoScreenshotCategory): string {
  const colors: Record<DemoScreenshotCategory, string> = {
    homework: '#4CAF50', // Green for educational
    gaming: '#9C27B0', // Purple for gaming
    social: '#2196F3', // Blue for social
    video: '#FF5722', // Orange for video
    creative: '#E91E63', // Pink for creative
  }
  const labels: Record<DemoScreenshotCategory, string> = {
    homework: 'Homework',
    gaming: 'Gaming',
    social: 'Social',
    video: 'Video',
    creative: 'Creative',
  }
  const color = colors[category]
  const label = labels[category]

  // Create a simple SVG placeholder
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="180" viewBox="0 0 320 180">
    <rect width="320" height="180" fill="${color}" opacity="0.2"/>
    <rect x="10" y="10" width="300" height="160" fill="${color}" opacity="0.3" rx="8"/>
    <text x="160" y="90" text-anchor="middle" fill="${color}" font-family="Arial" font-size="24" font-weight="bold">${label}</text>
    <text x="160" y="120" text-anchor="middle" fill="${color}" font-family="Arial" font-size="14" opacity="0.7">Demo Screenshot</text>
  </svg>`

  // Use modern TextEncoder for Unicode-safe base64 encoding (avoids deprecated unescape)
  const bytes = new TextEncoder().encode(svg)
  const binaryString = Array.from(bytes, (byte) => String.fromCodePoint(byte)).join('')
  return `data:image/svg+xml;base64,${btoa(binaryString)}`
}

/**
 * Category labels for classification display.
 * Story 8.5.2 AC2: Human-readable classification labels
 */
export const CATEGORY_LABELS: Record<DemoScreenshotCategory, string> = {
  homework: 'Educational',
  gaming: 'Gaming',
  social: 'Social Media',
  video: 'Video Content',
  creative: 'Creative',
}

/**
 * Sample screenshot data spanning multiple days.
 * Provides variety of categories, timestamps, classifications, and flagging.
 *
 * Story 8.5.1: Base demo data
 * Story 8.5.2: Extended with classification and flagging
 */
export const DEMO_SCREENSHOTS: DemoScreenshot[] = [
  {
    id: 'demo-screenshot-1',
    title: 'Math Practice',
    url: 'https://khanacademy.org/math/algebra',
    category: 'homework',
    timestamp: Date.now() - 2 * 60 * 60 * 1000, // 2 hours ago
    thumbnailDataUri: generatePlaceholderImage('homework'),
    classification: { label: 'Educational', confidence: 0.95 },
  },
  {
    id: 'demo-screenshot-2',
    title: 'Minecraft Building',
    url: 'https://minecraft.net',
    category: 'gaming',
    timestamp: Date.now() - 4 * 60 * 60 * 1000, // 4 hours ago
    thumbnailDataUri: generatePlaceholderImage('gaming'),
    classification: { label: 'Gaming', confidence: 0.92 },
  },
  {
    id: 'demo-screenshot-3',
    title: 'YouTube Kids Video',
    url: 'https://youtube.com/kids',
    category: 'video',
    timestamp: Date.now() - 24 * 60 * 60 * 1000, // Yesterday
    thumbnailDataUri: generatePlaceholderImage('video'),
    classification: { label: 'Video Content', confidence: 0.88 },
  },
  {
    id: 'demo-screenshot-4',
    title: 'Reading Assignment',
    url: 'https://readingeggs.com',
    category: 'homework',
    timestamp: Date.now() - 26 * 60 * 60 * 1000, // Yesterday
    thumbnailDataUri: generatePlaceholderImage('homework'),
    classification: { label: 'Educational', confidence: 0.91 },
  },
  {
    id: 'demo-screenshot-5',
    title: 'Drawing App',
    url: 'https://sketch.io',
    category: 'creative',
    timestamp: Date.now() - 48 * 60 * 60 * 1000, // 2 days ago
    thumbnailDataUri: generatePlaceholderImage('creative'),
    classification: { label: 'Creative', confidence: 0.87 },
  },
  {
    id: 'demo-screenshot-6',
    title: 'Educational Game',
    url: 'https://coolmathgames.com',
    category: 'gaming',
    timestamp: Date.now() - 50 * 60 * 60 * 1000, // 2 days ago
    thumbnailDataUri: generatePlaceholderImage('gaming'),
    classification: { label: 'Gaming', confidence: 0.76 },
    // Lower confidence - demonstrates uncertain classification
  },
  {
    id: 'demo-screenshot-7',
    title: 'Science Project',
    url: 'https://nasa.gov/kids',
    category: 'homework',
    timestamp: Date.now() - 72 * 60 * 60 * 1000, // 3 days ago
    thumbnailDataUri: generatePlaceholderImage('homework'),
    classification: { label: 'Educational', confidence: 0.94 },
  },
  {
    id: 'demo-screenshot-8',
    title: 'Animated Show',
    url: 'https://pbs.org/kids',
    category: 'video',
    timestamp: Date.now() - 96 * 60 * 60 * 1000, // 4 days ago
    thumbnailDataUri: generatePlaceholderImage('video'),
    classification: { label: 'Video Content', confidence: 0.89 },
  },
  // Story 8.5.2 AC3: Flagged screenshots demonstrating flagging behavior
  {
    id: 'demo-screenshot-9',
    title: 'Chat Messages',
    url: 'https://messages.example.com',
    category: 'social',
    timestamp: Date.now() - 5 * 60 * 60 * 1000, // 5 hours ago
    thumbnailDataUri: generatePlaceholderImage('social'),
    classification: { label: 'Social Media', confidence: 0.82 },
    flagged: true,
    flagReason:
      'This content was flagged because it appears to be a messaging app. This is a great opportunity to have a conversation about online communication.',
  },
  {
    id: 'demo-screenshot-10',
    title: 'Health Information Search',
    url: 'https://health-info.example.com',
    category: 'homework',
    timestamp: Date.now() - 28 * 60 * 60 * 1000, // Yesterday afternoon
    thumbnailDataUri: generatePlaceholderImage('homework'),
    classification: { label: 'Educational', confidence: 0.65 },
    flagged: true,
    flagReason:
      'This content was flagged because it contains health-related searches. This might be a good time to check in and see if your child has any questions.',
  },
]

/**
 * Get flagged demo screenshots.
 * Story 8.5.2 AC3: Filter for flagged items
 */
export function getFlaggedDemoScreenshots(): DemoScreenshot[] {
  return DEMO_SCREENSHOTS.filter((s) => s.flagged === true)
}

/**
 * Filter demo screenshots by category.
 * Story 8.5.2 AC6: Category filtering
 */
export function filterDemoScreenshotsByCategory(
  category: DemoScreenshotCategory | 'all'
): DemoScreenshot[] {
  if (category === 'all') return DEMO_SCREENSHOTS
  return DEMO_SCREENSHOTS.filter((s) => s.category === category)
}

/**
 * Search demo screenshots by title or URL.
 * Story 8.5.2 AC6: Search functionality
 */
export function searchDemoScreenshots(query: string): DemoScreenshot[] {
  const lowerQuery = query.toLowerCase()
  return DEMO_SCREENSHOTS.filter(
    (s) => s.title.toLowerCase().includes(lowerQuery) || s.url.toLowerCase().includes(lowerQuery)
  )
}

/**
 * Get demo screenshots grouped by day for timeline display.
 */
export function getDemoScreenshotsByDay(): Map<string, DemoScreenshot[]> {
  const grouped = new Map<string, DemoScreenshot[]>()

  for (const screenshot of DEMO_SCREENSHOTS) {
    const date = new Date(screenshot.timestamp)
    const dayKey = date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    })

    if (!grouped.has(dayKey)) {
      grouped.set(dayKey, [])
    }
    grouped.get(dayKey)!.push(screenshot)
  }

  return grouped
}

/**
 * Get count of demo screenshots by category.
 */
export function getDemoScreenshotCategoryCounts(): Record<DemoScreenshotCategory, number> {
  const counts: Record<DemoScreenshotCategory, number> = {
    homework: 0,
    gaming: 0,
    social: 0,
    video: 0,
    creative: 0,
  }

  for (const screenshot of DEMO_SCREENSHOTS) {
    counts[screenshot.category]++
  }

  return counts
}

/**
 * Demo activity summary for dashboard display.
 * Shows sample activity data for the demo child.
 */
export interface DemoActivitySummary {
  totalScreenshots: number
  lastCaptureTime: number
  topCategories: { category: DemoScreenshotCategory; count: number }[]
  daysWithActivity: number
}

/**
 * Get activity summary for the demo child.
 */
export function getDemoActivitySummary(): DemoActivitySummary {
  const categoryCounts = getDemoScreenshotCategoryCounts()
  const sortedCategories = (Object.entries(categoryCounts) as [DemoScreenshotCategory, number][])
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([category, count]) => ({ category, count }))

  const uniqueDays = new Set(DEMO_SCREENSHOTS.map((s) => new Date(s.timestamp).toDateString())).size

  return {
    totalScreenshots: DEMO_SCREENSHOTS.length,
    lastCaptureTime: Math.max(...DEMO_SCREENSHOTS.map((s) => s.timestamp)),
    topCategories: sortedCategories,
    daysWithActivity: uniqueDays,
  }
}

// ============================================
// Story 8.5.3: Sample Time Tracking Display
// ============================================

/**
 * Time tracking categories for demo display.
 * Story 8.5.3 AC2: Activity type categorization
 */
export type DemoTimeCategory = 'educational' | 'entertainment' | 'social' | 'other'

/**
 * Time tracking category labels for display.
 */
export const TIME_CATEGORY_LABELS: Record<DemoTimeCategory, string> = {
  educational: 'Educational',
  entertainment: 'Entertainment',
  social: 'Social',
  other: 'Other',
}

/**
 * Time tracking category colors for charts.
 */
export const TIME_CATEGORY_COLORS: Record<DemoTimeCategory, string> = {
  educational: '#22c55e', // Green
  entertainment: '#8b5cf6', // Purple
  social: '#3b82f6', // Blue
  other: '#6b7280', // Gray
}

/**
 * Single time entry for demo data.
 * Story 8.5.3 AC1: Daily/weekly screen time breakdown
 */
export interface DemoTimeEntry {
  id: string
  date: string // YYYY-MM-DD
  category: DemoTimeCategory
  duration: number // minutes
  appName: string
}

/**
 * Daily time limit configuration.
 * Story 8.5.3 AC3: Time limit indicators
 */
export interface DemoTimeLimit {
  category: DemoTimeCategory | 'total'
  dailyLimit: number // minutes
}

/**
 * Aggregated daily time summary.
 */
export interface DemoDailySummary {
  date: string
  dayName: string
  isWeekend: boolean
  totalMinutes: number
  byCategory: Record<DemoTimeCategory, number>
  limitStatus: 'under' | 'at' | 'over'
}

/**
 * Default time limits for demo.
 * Story 8.5.3 AC3: Over/under limit examples
 */
export const DEMO_TIME_LIMITS: DemoTimeLimit[] = [
  { category: 'total', dailyLimit: 180 }, // 3 hours total
  { category: 'entertainment', dailyLimit: 90 }, // 1.5 hours entertainment
  { category: 'social', dailyLimit: 60 }, // 1 hour social
]

/**
 * Get the date string for N days ago.
 */
function getDateNDaysAgo(n: number): string {
  const date = new Date()
  date.setDate(date.getDate() - n)
  return date.toISOString().split('T')[0]
}

/**
 * Get day name from date string.
 */
function getDayName(dateStr: string): string {
  const date = new Date(dateStr + 'T12:00:00')
  return date.toLocaleDateString('en-US', { weekday: 'short' })
}

/**
 * Check if date is a weekend.
 */
function isWeekend(dateStr: string): boolean {
  const date = new Date(dateStr + 'T12:00:00')
  const day = date.getDay()
  return day === 0 || day === 6
}

/**
 * Sample time entries spanning 7 days.
 * Story 8.5.3 AC5: Realistic patterns (school days vs weekends)
 */
export const DEMO_TIME_ENTRIES: DemoTimeEntry[] = [
  // Today (assuming weekday)
  {
    id: 'time-1',
    date: getDateNDaysAgo(0),
    category: 'educational',
    duration: 45,
    appName: 'Khan Academy',
  },
  {
    id: 'time-2',
    date: getDateNDaysAgo(0),
    category: 'educational',
    duration: 30,
    appName: 'Reading Eggs',
  },
  {
    id: 'time-3',
    date: getDateNDaysAgo(0),
    category: 'entertainment',
    duration: 40,
    appName: 'Minecraft',
  },
  { id: 'time-4', date: getDateNDaysAgo(0), category: 'social', duration: 25, appName: 'Messages' },

  // Yesterday
  {
    id: 'time-5',
    date: getDateNDaysAgo(1),
    category: 'educational',
    duration: 60,
    appName: 'Math Practice',
  },
  {
    id: 'time-6',
    date: getDateNDaysAgo(1),
    category: 'entertainment',
    duration: 55,
    appName: 'YouTube Kids',
  },
  {
    id: 'time-7',
    date: getDateNDaysAgo(1),
    category: 'entertainment',
    duration: 45,
    appName: 'Roblox',
  },
  { id: 'time-8', date: getDateNDaysAgo(1), category: 'social', duration: 20, appName: 'FaceTime' },

  // 2 days ago (higher usage - shows "over limit")
  {
    id: 'time-9',
    date: getDateNDaysAgo(2),
    category: 'educational',
    duration: 35,
    appName: 'Duolingo',
  },
  {
    id: 'time-10',
    date: getDateNDaysAgo(2),
    category: 'entertainment',
    duration: 80,
    appName: 'Netflix',
  },
  {
    id: 'time-11',
    date: getDateNDaysAgo(2),
    category: 'entertainment',
    duration: 60,
    appName: 'Minecraft',
  },
  { id: 'time-12', date: getDateNDaysAgo(2), category: 'social', duration: 40, appName: 'Discord' },

  // 3 days ago
  {
    id: 'time-13',
    date: getDateNDaysAgo(3),
    category: 'educational',
    duration: 50,
    appName: 'Science App',
  },
  {
    id: 'time-14',
    date: getDateNDaysAgo(3),
    category: 'entertainment',
    duration: 35,
    appName: 'Spotify',
  },
  { id: 'time-15', date: getDateNDaysAgo(3), category: 'other', duration: 15, appName: 'Browser' },

  // 4 days ago
  {
    id: 'time-16',
    date: getDateNDaysAgo(4),
    category: 'educational',
    duration: 40,
    appName: 'Khan Academy',
  },
  {
    id: 'time-17',
    date: getDateNDaysAgo(4),
    category: 'entertainment',
    duration: 50,
    appName: 'Disney+',
  },
  {
    id: 'time-18',
    date: getDateNDaysAgo(4),
    category: 'social',
    duration: 30,
    appName: 'Messages',
  },

  // 5 days ago (weekend - more entertainment)
  {
    id: 'time-19',
    date: getDateNDaysAgo(5),
    category: 'educational',
    duration: 20,
    appName: 'Reading',
  },
  {
    id: 'time-20',
    date: getDateNDaysAgo(5),
    category: 'entertainment',
    duration: 90,
    appName: 'Minecraft',
  },
  {
    id: 'time-21',
    date: getDateNDaysAgo(5),
    category: 'entertainment',
    duration: 50,
    appName: 'YouTube Kids',
  },
  {
    id: 'time-22',
    date: getDateNDaysAgo(5),
    category: 'social',
    duration: 45,
    appName: 'FaceTime',
  },

  // 6 days ago (weekend)
  {
    id: 'time-23',
    date: getDateNDaysAgo(6),
    category: 'educational',
    duration: 15,
    appName: 'Brain Games',
  },
  {
    id: 'time-24',
    date: getDateNDaysAgo(6),
    category: 'entertainment',
    duration: 85,
    appName: 'Roblox',
  },
  {
    id: 'time-25',
    date: getDateNDaysAgo(6),
    category: 'entertainment',
    duration: 40,
    appName: 'Netflix',
  },
  { id: 'time-26', date: getDateNDaysAgo(6), category: 'social', duration: 35, appName: 'Discord' },
  { id: 'time-27', date: getDateNDaysAgo(6), category: 'other', duration: 20, appName: 'Photos' },
]

/**
 * Get daily limit for a category.
 */
export function getDemoTimeLimit(category: DemoTimeCategory | 'total'): number {
  const limit = DEMO_TIME_LIMITS.find((l) => l.category === category)
  return limit?.dailyLimit ?? 180 // Default 3 hours
}

/**
 * Aggregate time entries by day.
 * Story 8.5.3 AC1: Daily/weekly breakdown
 */
export function getDemoTimeSummaryByDay(): DemoDailySummary[] {
  const byDay = new Map<string, DemoTimeEntry[]>()

  // Group entries by date
  for (const entry of DEMO_TIME_ENTRIES) {
    if (!byDay.has(entry.date)) {
      byDay.set(entry.date, [])
    }
    byDay.get(entry.date)!.push(entry)
  }

  // Calculate summaries
  const summaries: DemoDailySummary[] = []
  const totalLimit = getDemoTimeLimit('total')

  for (const [date, entries] of byDay) {
    const byCategory: Record<DemoTimeCategory, number> = {
      educational: 0,
      entertainment: 0,
      social: 0,
      other: 0,
    }

    for (const entry of entries) {
      byCategory[entry.category] += entry.duration
    }

    const totalMinutes = Object.values(byCategory).reduce((sum, val) => sum + val, 0)

    let limitStatus: 'under' | 'at' | 'over' = 'under'
    if (totalMinutes > totalLimit) {
      limitStatus = 'over'
    } else if (totalMinutes >= totalLimit * 0.9) {
      limitStatus = 'at'
    }

    summaries.push({
      date,
      dayName: getDayName(date),
      isWeekend: isWeekend(date),
      totalMinutes,
      byCategory,
      limitStatus,
    })
  }

  // Sort by date descending (most recent first)
  summaries.sort((a, b) => b.date.localeCompare(a.date))

  return summaries
}

/**
 * Get weekly time totals by category.
 * Story 8.5.3 AC2: Activity type categorization
 */
export function getDemoWeeklyTimeByCategory(): Record<DemoTimeCategory, number> {
  const totals: Record<DemoTimeCategory, number> = {
    educational: 0,
    entertainment: 0,
    social: 0,
    other: 0,
  }

  for (const entry of DEMO_TIME_ENTRIES) {
    totals[entry.category] += entry.duration
  }

  return totals
}

/**
 * Get total weekly screen time in minutes.
 */
export function getDemoWeeklyTotalTime(): number {
  return DEMO_TIME_ENTRIES.reduce((sum, entry) => sum + entry.duration, 0)
}

/**
 * Format minutes as hours and minutes string.
 */
export function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes}m`
  }
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  if (mins === 0) {
    return `${hours}h`
  }
  return `${hours}h ${mins}m`
}

// ============================================
// Story 8.5.4: Sample Flag & Alert Examples
// ============================================

/**
 * Flag concern types for categorizing flagged content.
 * Story 8.5.4 AC1: Various concern types
 */
export type DemoFlagConcernType = 'research' | 'communication' | 'content' | 'time' | 'unknown'

/**
 * Concern type labels for display.
 */
export const FLAG_CONCERN_TYPE_LABELS: Record<DemoFlagConcernType, string> = {
  research: 'Research Topic',
  communication: 'Communication',
  content: 'Content Review',
  time: 'Screen Time',
  unknown: 'Needs Review',
}

/**
 * Concern type colors for visual indicators.
 */
export const FLAG_CONCERN_TYPE_COLORS: Record<DemoFlagConcernType, string> = {
  research: '#3b82f6', // Blue
  communication: '#8b5cf6', // Purple
  content: '#f59e0b', // Amber
  time: '#ef4444', // Red
  unknown: '#6b7280', // Gray
}

/**
 * Child annotation for flagged content.
 * Story 8.5.4 AC3: Child annotation examples
 */
export interface DemoFlagAnnotation {
  text: string
  timestamp: number
  fromChild: boolean
}

/**
 * Resolution status for flagged content.
 * Story 8.5.4 AC5: Resolution flow demonstration
 */
export interface DemoFlagResolution {
  status: 'pending' | 'reviewed' | 'resolved'
  action?: 'talked' | 'dismissed' | 'false_positive'
  resolvedAt?: number
  note?: string
}

/**
 * Resolution action labels for display.
 */
export const FLAG_RESOLUTION_ACTION_LABELS: Record<
  NonNullable<DemoFlagResolution['action']>,
  string
> = {
  talked: 'Discussed with child',
  dismissed: 'Dismissed',
  false_positive: 'False positive',
}

/**
 * Resolution status labels for display.
 */
export const FLAG_RESOLUTION_STATUS_LABELS: Record<DemoFlagResolution['status'], string> = {
  pending: 'Pending Review',
  reviewed: 'Reviewed',
  resolved: 'Resolved',
}

/**
 * Resolution status colors.
 */
export const FLAG_RESOLUTION_STATUS_COLORS: Record<DemoFlagResolution['status'], string> = {
  pending: '#f59e0b', // Amber
  reviewed: '#3b82f6', // Blue
  resolved: '#22c55e', // Green
}

/**
 * Demo flag entry structure.
 * Story 8.5.4 AC1, AC2: Flag with details
 */
export interface DemoFlag {
  id: string
  screenshotId: string // Links to DemoScreenshot
  concernType: DemoFlagConcernType
  confidence: number
  aiReasoning: string // Conversation-starter framing (AC6)
  annotation?: DemoFlagAnnotation
  resolution: DemoFlagResolution
  createdAt: number
}

/**
 * Sample flag data with conversation-starter framing.
 * Story 8.5.4 AC1, AC6: Various concern types with supportive language
 */
export const DEMO_FLAGS: DemoFlag[] = [
  {
    id: 'flag-1',
    screenshotId: 'demo-screenshot-10', // Health Information Search
    concernType: 'research',
    confidence: 0.72,
    aiReasoning:
      'Alex searched for health-related topics. This might be a great opportunity to check in and see if they have questions about their health or wellness.',
    annotation: {
      text: 'I was researching for my science project about the human body.',
      timestamp: Date.now() - 26 * 60 * 60 * 1000, // 26 hours ago
      fromChild: true,
    },
    resolution: {
      status: 'resolved',
      action: 'talked',
      resolvedAt: Date.now() - 24 * 60 * 60 * 1000,
      note: 'Great conversation about the science project!',
    },
    createdAt: Date.now() - 28 * 60 * 60 * 1000,
  },
  {
    id: 'flag-2',
    screenshotId: 'demo-screenshot-9', // Chat Messages
    concernType: 'communication',
    confidence: 0.85,
    aiReasoning:
      'We noticed messaging app activity. This could be a good time to discuss online communication and who Alex chats with.',
    annotation: {
      text: 'I was talking to my friend about our homework.',
      timestamp: Date.now() - 4 * 60 * 60 * 1000,
      fromChild: true,
    },
    resolution: {
      status: 'reviewed',
    },
    createdAt: Date.now() - 5 * 60 * 60 * 1000,
  },
  {
    id: 'flag-3',
    screenshotId: 'demo-screenshot-2', // Minecraft (gaming time)
    concernType: 'time',
    confidence: 0.95,
    aiReasoning:
      'Screen time exceeded the daily limit. Consider discussing how to balance gaming with other activities.',
    resolution: {
      status: 'pending',
    },
    createdAt: Date.now() - 3 * 60 * 60 * 1000,
  },
  {
    id: 'flag-4',
    screenshotId: 'demo-screenshot-6', // Cool Math Games
    concernType: 'unknown',
    confidence: 0.58,
    aiReasoning:
      "We couldn't classify this content with high confidence. You might want to take a look and discuss with Alex.",
    annotation: {
      text: 'It was just a math game website my teacher recommended!',
      timestamp: Date.now() - 48 * 60 * 60 * 1000,
      fromChild: true,
    },
    resolution: {
      status: 'resolved',
      action: 'false_positive',
      resolvedAt: Date.now() - 47 * 60 * 60 * 1000,
      note: 'Teacher-approved educational game site',
    },
    createdAt: Date.now() - 50 * 60 * 60 * 1000,
  },
]

/**
 * Get all demo flags.
 */
export function getDemoFlags(): DemoFlag[] {
  return DEMO_FLAGS
}

/**
 * Get demo flags by resolution status.
 * Story 8.5.4: Flag filtering
 */
export function getDemoFlagsByStatus(status: DemoFlagResolution['status']): DemoFlag[] {
  return DEMO_FLAGS.filter((flag) => flag.resolution.status === status)
}

/**
 * Get pending demo flags.
 */
export function getPendingDemoFlags(): DemoFlag[] {
  return getDemoFlagsByStatus('pending')
}

/**
 * Get resolved demo flags.
 */
export function getResolvedDemoFlags(): DemoFlag[] {
  return getDemoFlagsByStatus('resolved')
}

/**
 * Get demo flag statistics.
 */
export function getDemoFlagStats(): {
  total: number
  pending: number
  reviewed: number
  resolved: number
  byConcernType: Record<DemoFlagConcernType, number>
} {
  const stats = {
    total: DEMO_FLAGS.length,
    pending: 0,
    reviewed: 0,
    resolved: 0,
    byConcernType: {
      research: 0,
      communication: 0,
      content: 0,
      time: 0,
      unknown: 0,
    } as Record<DemoFlagConcernType, number>,
  }

  for (const flag of DEMO_FLAGS) {
    stats[flag.resolution.status]++
    stats.byConcernType[flag.concernType]++
  }

  return stats
}

/**
 * Get a demo flag by ID.
 */
export function getDemoFlagById(id: string): DemoFlag | undefined {
  return DEMO_FLAGS.find((flag) => flag.id === id)
}

/**
 * Get demo flags with annotations.
 * Story 8.5.4 AC3: Flags with child annotations
 */
export function getDemoFlagsWithAnnotations(): DemoFlag[] {
  return DEMO_FLAGS.filter((flag) => flag.annotation !== undefined)
}

/**
 * Get screenshot for a flag.
 */
export function getScreenshotForFlag(flag: DemoFlag): DemoScreenshot | undefined {
  return DEMO_SCREENSHOTS.find((s) => s.id === flag.screenshotId)
}
