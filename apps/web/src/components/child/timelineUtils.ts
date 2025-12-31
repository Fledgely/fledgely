/**
 * Timeline Utilities - Story 19B.2
 *
 * Utility functions for time-of-day grouping and gap detection.
 *
 * Task 1: Add Time-of-Day Grouping Logic (AC: #1)
 * - 1.1 Create getTimeOfDay() utility function
 * - 1.2 Create groupByTimeOfDay() function for screenshot grouping
 */

import type { ChildScreenshot } from '../../hooks/useChildScreenshots'

/**
 * Time of day categories
 */
export type TimeOfDay = 'morning' | 'afternoon' | 'evening' | 'night'

/**
 * Configuration for each time-of-day section
 */
export interface TimeOfDayConfig {
  key: TimeOfDay
  label: string // Child-friendly label
  icon: string // Emoji icon
  startHour: number // Hour to start (0-23)
  endHour: number // Hour to end (exclusive)
}

/**
 * Time-of-day section configurations with child-friendly labels
 */
export const TIME_OF_DAY_CONFIG: TimeOfDayConfig[] = [
  { key: 'morning', label: 'Morning', icon: '🌅', startHour: 6, endHour: 12 },
  { key: 'afternoon', label: 'Afternoon', icon: '☀️', startHour: 12, endHour: 18 },
  { key: 'evening', label: 'Evening', icon: '🌆', startHour: 18, endHour: 24 },
  { key: 'night', label: 'Night', icon: '🌙', startHour: 0, endHour: 6 },
]

/**
 * Get the time-of-day category for a given timestamp
 *
 * @param timestamp - Unix timestamp in milliseconds
 * @returns TimeOfDay category
 */
export function getTimeOfDay(timestamp: number): TimeOfDay {
  const hour = new Date(timestamp).getHours()

  if (hour >= 6 && hour < 12) return 'morning'
  if (hour >= 12 && hour < 18) return 'afternoon'
  if (hour >= 18 && hour < 24) return 'evening'
  return 'night' // 0-5
}

/**
 * Get the configuration for a time-of-day category
 */
export function getTimeOfDayConfig(timeOfDay: TimeOfDay): TimeOfDayConfig {
  const config = TIME_OF_DAY_CONFIG.find((c) => c.key === timeOfDay)
  if (!config) {
    // Fallback to morning if somehow an invalid value is passed (should never happen with TypeScript)
    return TIME_OF_DAY_CONFIG[0]
  }
  return config
}

/**
 * Screenshots grouped by time of day within a single day
 */
export interface TimeOfDayGroup {
  timeOfDay: TimeOfDay
  config: TimeOfDayConfig
  screenshots: ChildScreenshot[]
}

/**
 * Group screenshots by time of day
 *
 * @param screenshots - Screenshots to group (assumed to be from same day)
 * @returns Array of TimeOfDayGroup objects, only including non-empty groups
 */
export function groupByTimeOfDay(screenshots: ChildScreenshot[]): TimeOfDayGroup[] {
  // Create map for grouping
  const groups = new Map<TimeOfDay, ChildScreenshot[]>()

  // Initialize all time periods
  for (const config of TIME_OF_DAY_CONFIG) {
    groups.set(config.key, [])
  }

  // Group screenshots by time of day
  for (const screenshot of screenshots) {
    const timeOfDay = getTimeOfDay(screenshot.timestamp)
    groups.get(timeOfDay)!.push(screenshot)
  }

  // Convert to array of groups, filtering out empty ones
  // Order: morning, afternoon, evening, night
  const result: TimeOfDayGroup[] = []

  for (const config of TIME_OF_DAY_CONFIG) {
    const groupScreenshots = groups.get(config.key)!
    if (groupScreenshots.length > 0) {
      // Sort screenshots within group by timestamp descending (most recent first)
      groupScreenshots.sort((a, b) => b.timestamp - a.timestamp)
      result.push({
        timeOfDay: config.key,
        config,
        screenshots: groupScreenshots,
      })
    }
  }

  return result
}

/**
 * Information about a gap between screenshots
 */
export interface GapInfo {
  id: string
  startTime: number // Earlier timestamp
  endTime: number // Later timestamp
  durationHours: number
  message: string
}

/**
 * Threshold in hours for what constitutes a significant gap
 */
export const GAP_THRESHOLD_HOURS = 2

/**
 * Detect gaps between screenshots
 *
 * @param screenshots - Screenshots sorted by timestamp descending
 * @returns Array of GapInfo objects for gaps > threshold
 */
export function detectGaps(screenshots: ChildScreenshot[]): GapInfo[] {
  const gaps: GapInfo[] = []

  if (screenshots.length < 2) {
    return gaps
  }

  for (let i = 1; i < screenshots.length; i++) {
    const laterTime = screenshots[i - 1].timestamp
    const earlierTime = screenshots[i].timestamp
    const diffHours = (laterTime - earlierTime) / (1000 * 60 * 60)

    if (diffHours >= GAP_THRESHOLD_HOURS) {
      gaps.push({
        id: `gap-${earlierTime}-${laterTime}`,
        startTime: earlierTime,
        endTime: laterTime,
        durationHours: diffHours,
        message: 'No pictures during this time',
      })
    }
  }

  return gaps
}

/**
 * Format a timestamp range as a friendly string
 */
export function formatTimeRange(startTime: number, endTime: number): string {
  const startDate = new Date(startTime)
  const endDate = new Date(endTime)

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })
  }

  return `${formatTime(startDate)} - ${formatTime(endDate)}`
}

/**
 * Get a friendly day label for a date
 */
export function getDayLabel(date: Date): string {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  const targetDay = new Date(date.getFullYear(), date.getMonth(), date.getDate())

  if (targetDay.getTime() === today.getTime()) {
    return 'Today'
  } else if (targetDay.getTime() === yesterday.getTime()) {
    return 'Yesterday'
  } else {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
    })
  }
}

/**
 * Check if a date is today
 */
export function isToday(date: Date): boolean {
  const now = new Date()
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  )
}

/**
 * Get the date key for grouping (YYYY-MM-DD format)
 */
export function getDateKey(timestamp: number): string {
  const date = new Date(timestamp)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}
