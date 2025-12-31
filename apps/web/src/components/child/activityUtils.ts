/**
 * Activity Summary Utilities - Story 19B.4
 *
 * Utility functions for aggregating screenshot activity data.
 *
 * Task 1-3: Activity aggregation logic
 */

import type { ChildScreenshot } from '../../hooks/useChildScreenshots'
import { getTimeOfDay, type TimeOfDay } from './timelineUtils'

/**
 * Time distribution across time-of-day categories
 */
export interface TimeDistribution {
  morning: number // 6am-12pm
  afternoon: number // 12pm-6pm
  evening: number // 6pm-12am
  night: number // 12am-6am
  total: number
}

/**
 * App/website capture count
 */
export interface AppCount {
  domain: string
  count: number
}

/**
 * Complete activity summary
 */
export interface ActivitySummary {
  todayCount: number
  weekCount: number
  topApps: AppCount[]
  timeDistribution: TimeDistribution
}

/**
 * Get start of today (midnight local time)
 */
export function getStartOfToday(): number {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
}

/**
 * Get start of this week (Sunday midnight local time)
 */
export function getStartOfWeek(): number {
  const now = new Date()
  const dayOfWeek = now.getDay() // 0 = Sunday
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  startOfToday.setDate(startOfToday.getDate() - dayOfWeek)
  return startOfToday.getTime()
}

/**
 * Count screenshots from today
 */
export function countTodayScreenshots(screenshots: ChildScreenshot[]): number {
  const startOfToday = getStartOfToday()
  return screenshots.filter((s) => s.timestamp >= startOfToday).length
}

/**
 * Count screenshots from this week
 */
export function countWeekScreenshots(screenshots: ChildScreenshot[]): number {
  const startOfWeek = getStartOfWeek()
  return screenshots.filter((s) => s.timestamp >= startOfWeek).length
}

/**
 * Extract domain from URL
 */
export function extractDomain(url: string): string {
  if (!url) return 'Unknown'
  try {
    const parsed = new URL(url)
    return parsed.hostname.replace('www.', '')
  } catch {
    return url || 'Unknown'
  }
}

/**
 * Aggregate top apps/websites from screenshots
 *
 * @param screenshots - All screenshots to analyze
 * @param limit - Maximum number of apps to return (default 3)
 * @returns Array of AppCount sorted by count descending
 */
export function aggregateTopApps(screenshots: ChildScreenshot[], limit = 3): AppCount[] {
  const appCounts = new Map<string, number>()

  for (const screenshot of screenshots) {
    const domain = extractDomain(screenshot.url)
    if (domain !== 'Unknown') {
      appCounts.set(domain, (appCounts.get(domain) || 0) + 1)
    }
  }

  return Array.from(appCounts.entries())
    .map(([domain, count]) => ({ domain, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit)
}

/**
 * Calculate time distribution across time-of-day categories
 *
 * @param screenshots - Screenshots to analyze
 * @returns TimeDistribution with counts for each period
 */
export function calculateTimeDistribution(screenshots: ChildScreenshot[]): TimeDistribution {
  const distribution: TimeDistribution = {
    morning: 0,
    afternoon: 0,
    evening: 0,
    night: 0,
    total: screenshots.length,
  }

  for (const screenshot of screenshots) {
    const timeOfDay = getTimeOfDay(screenshot.timestamp)
    distribution[timeOfDay]++
  }

  return distribution
}

/**
 * Get percentage for a time period
 *
 * @param count - Count for the period
 * @param total - Total count
 * @returns Percentage (0-100)
 */
export function getPercentage(count: number, total: number): number {
  if (total === 0) return 0
  return Math.round((count / total) * 100)
}

/**
 * Calculate complete activity summary from screenshots
 *
 * @param screenshots - All available screenshots
 * @returns ActivitySummary with all aggregated data
 */
export function calculateActivitySummary(screenshots: ChildScreenshot[]): ActivitySummary {
  return {
    todayCount: countTodayScreenshots(screenshots),
    weekCount: countWeekScreenshots(screenshots),
    topApps: aggregateTopApps(screenshots),
    timeDistribution: calculateTimeDistribution(screenshots),
  }
}

/**
 * Get time-of-day config for display
 */
export const TIME_OF_DAY_DISPLAY: Record<
  TimeOfDay,
  { label: string; icon: string; color: string }
> = {
  morning: { label: 'Morning', icon: '🌅', color: '#f59e0b' }, // amber-500
  afternoon: { label: 'Afternoon', icon: '☀️', color: '#eab308' }, // yellow-500
  evening: { label: 'Evening', icon: '🌆', color: '#f97316' }, // orange-500
  night: { label: 'Night', icon: '🌙', color: '#6366f1' }, // indigo-500
}
