/**
 * DailySummaryService - Story 37.3 Task 3
 *
 * Service for generating daily summaries for notification-only mode.
 * AC2: Parents receive daily summary (e.g., "Emma used device 3 hours today")
 * AC3: Only concerning patterns trigger alerts (not individual events)
 *
 * Philosophy: Maximum privacy while maintaining parental connection.
 * Summaries focus on patterns, not individual activities.
 */

import {
  createDailySummary,
  createConcerningPattern,
  type DailySummary,
  type ConcerningPattern,
  type AppUsageSummary,
} from '../contracts/notificationOnlyMode'

// ============================================================================
// Types
// ============================================================================

/**
 * Raw usage data from the system.
 */
export interface UsageData {
  /** App name or identifier */
  appName: string
  /** App category (optional) */
  category?: string
  /** Usage time in minutes */
  usageMinutes: number
  /** Session start time */
  startTime: Date
  /** Session end time */
  endTime: Date
}

/**
 * Configuration for concerning pattern detection.
 */
export interface PatternConfig {
  /** Normal usage baseline in minutes */
  normalUsageMinutes: number
  /** Multiplier for excessive usage (default 3x) */
  excessiveMultiplier: number
  /** Bedtime hour (24-hour format) */
  bedtimeHour: number
  /** New categories to flag */
  newCategoriesToFlag: string[]
  /** Daily time limit in minutes */
  dailyTimeLimitMinutes: number | null
}

/**
 * Default pattern configuration.
 */
export const DEFAULT_PATTERN_CONFIG: PatternConfig = {
  normalUsageMinutes: 120, // 2 hours
  excessiveMultiplier: 3,
  bedtimeHour: 22, // 10 PM
  newCategoriesToFlag: [],
  dailyTimeLimitMinutes: null,
}

// ============================================================================
// Daily Summary Generation
// ============================================================================

/**
 * Generate a daily summary from usage data.
 * AC2: Parents receive daily summary.
 */
export function generateDailySummary(
  childId: string,
  date: Date,
  usageData: UsageData[],
  config: PatternConfig = DEFAULT_PATTERN_CONFIG
): DailySummary {
  const totalUsageMinutes = calculateTotalUsage(usageData)
  const topApps = getTopApps(usageData, 5)
  const concerningPatterns = detectConcerningPatterns(usageData, config)
  const timeLimitsReached = checkTimeLimitReached(totalUsageMinutes, config.dailyTimeLimitMinutes)

  return createDailySummary({
    childId,
    date,
    totalUsageMinutes,
    topApps,
    concerningPatterns,
    timeLimitsReached,
  })
}

/**
 * Calculate total usage across all apps.
 */
export function calculateTotalUsage(usageData: UsageData[]): number {
  return usageData.reduce((total, data) => total + data.usageMinutes, 0)
}

/**
 * Get top apps by usage time.
 */
export function getTopApps(usageData: UsageData[], limit: number): AppUsageSummary[] {
  // Aggregate usage by app
  const appUsage = new Map<string, { usageMinutes: number; category?: string }>()

  for (const data of usageData) {
    const existing = appUsage.get(data.appName)
    if (existing) {
      existing.usageMinutes += data.usageMinutes
    } else {
      appUsage.set(data.appName, {
        usageMinutes: data.usageMinutes,
        category: data.category,
      })
    }
  }

  // Convert to array and sort by usage
  return Array.from(appUsage.entries())
    .map(([appName, { usageMinutes, category }]) => ({
      appName,
      usageMinutes,
      category,
    }))
    .sort((a, b) => b.usageMinutes - a.usageMinutes)
    .slice(0, limit)
}

/**
 * Check if daily time limit was reached.
 */
export function checkTimeLimitReached(totalMinutes: number, limitMinutes: number | null): boolean {
  if (limitMinutes === null) return false
  return totalMinutes >= limitMinutes
}

// ============================================================================
// Concerning Pattern Detection (AC3)
// ============================================================================

/**
 * Detect concerning patterns in usage data.
 * AC3: Only concerning patterns trigger alerts (not individual events).
 */
export function detectConcerningPatterns(
  usageData: UsageData[],
  config: PatternConfig = DEFAULT_PATTERN_CONFIG
): ConcerningPattern[] {
  const patterns: ConcerningPattern[] = []

  // Check for excessive usage
  const excessivePattern = detectExcessiveUsage(usageData, config)
  if (excessivePattern) patterns.push(excessivePattern)

  // Check for late night usage
  const lateNightPattern = detectLateNightUsage(usageData, config)
  if (lateNightPattern) patterns.push(lateNightPattern)

  // Check for new app categories
  const newCategoryPatterns = detectNewCategories(usageData, config)
  patterns.push(...newCategoryPatterns)

  // Check for time limit violations
  const totalUsage = calculateTotalUsage(usageData)
  if (config.dailyTimeLimitMinutes && totalUsage > config.dailyTimeLimitMinutes) {
    patterns.push(
      createConcerningPattern(
        'time-limit-violation',
        `Exceeded daily limit by ${totalUsage - config.dailyTimeLimitMinutes} minutes`,
        'medium',
        { limit: config.dailyTimeLimitMinutes, actual: totalUsage }
      )
    )
  }

  // Check for rapid app switching (potential distraction)
  const switchingPattern = detectRapidAppSwitching(usageData)
  if (switchingPattern) patterns.push(switchingPattern)

  return patterns
}

/**
 * Detect excessive usage pattern.
 */
export function detectExcessiveUsage(
  usageData: UsageData[],
  config: PatternConfig
): ConcerningPattern | null {
  const totalUsage = calculateTotalUsage(usageData)
  const threshold = config.normalUsageMinutes * config.excessiveMultiplier

  if (totalUsage >= threshold) {
    const multiplier = Math.round((totalUsage / config.normalUsageMinutes) * 10) / 10
    return createConcerningPattern(
      'excessive-usage',
      `Usage is ${multiplier}x normal level (${formatMinutes(totalUsage)})`,
      totalUsage >= threshold * 1.5 ? 'high' : 'medium',
      { totalMinutes: totalUsage, normalMinutes: config.normalUsageMinutes }
    )
  }

  return null
}

/**
 * Detect late night usage pattern.
 */
export function detectLateNightUsage(
  usageData: UsageData[],
  config: PatternConfig
): ConcerningPattern | null {
  const lateNightSessions = usageData.filter((data) => {
    const hour = data.endTime.getHours()
    return hour >= config.bedtimeHour || hour < 6 // Past bedtime or early morning
  })

  if (lateNightSessions.length > 0) {
    const totalLateMinutes = lateNightSessions.reduce((sum, d) => sum + d.usageMinutes, 0)
    const latestTime = lateNightSessions.reduce(
      (latest, d) => (d.endTime > latest ? d.endTime : latest),
      lateNightSessions[0].endTime
    )

    return createConcerningPattern(
      'late-night-usage',
      `Device used past ${formatHour(config.bedtimeHour)} bedtime (${formatMinutes(totalLateMinutes)})`,
      totalLateMinutes > 30 ? 'high' : 'medium',
      {
        bedtimeHour: config.bedtimeHour,
        latestUsage: latestTime.toISOString(),
        totalLateMinutes,
      }
    )
  }

  return null
}

/**
 * Detect new app category usage.
 */
export function detectNewCategories(
  usageData: UsageData[],
  config: PatternConfig
): ConcerningPattern[] {
  if (config.newCategoriesToFlag.length === 0) return []

  const patterns: ConcerningPattern[] = []
  const seenCategories = new Set<string>()

  for (const data of usageData) {
    if (data.category && config.newCategoriesToFlag.includes(data.category)) {
      if (!seenCategories.has(data.category)) {
        seenCategories.add(data.category)
        patterns.push(
          createConcerningPattern(
            'new-app-category',
            `App in flagged category: ${data.category} (${data.appName})`,
            'low',
            { category: data.category, appName: data.appName }
          )
        )
      }
    }
  }

  return patterns
}

/**
 * Detect rapid app switching pattern.
 * Indicates potential distraction or unfocused usage.
 */
export function detectRapidAppSwitching(usageData: UsageData[]): ConcerningPattern | null {
  // Sort by start time
  const sorted = [...usageData].sort((a, b) => a.startTime.getTime() - b.startTime.getTime())

  // Count short sessions (less than 2 minutes)
  const shortSessions = sorted.filter((d) => d.usageMinutes < 2)

  // If more than 10 very short sessions, flag as rapid switching
  if (shortSessions.length >= 10) {
    return createConcerningPattern(
      'rapid-app-switching',
      `${shortSessions.length} very short app sessions detected`,
      'low',
      { shortSessionCount: shortSessions.length }
    )
  }

  return null
}

// ============================================================================
// Summary Formatting (AC2)
// ============================================================================

/**
 * Format summary for parent notification.
 * AC2: Parents receive daily summary (e.g., "Emma used device 3 hours today")
 */
export function formatSummaryForParent(summary: DailySummary, childName: string): string {
  const usageText = formatMinutes(summary.totalUsageMinutes)
  const dateText = formatDate(summary.date)

  let message = `${childName}'s Daily Summary - ${dateText}\n`
  message += `Device usage: ${usageText}\n`

  if (summary.topApps.length > 0) {
    const topAppNames = summary.topApps.slice(0, 3).map((a) => a.appName)
    message += `Most used: ${topAppNames.join(', ')}\n`
  }

  if (summary.concerningPatterns.length === 0) {
    message += 'No concerning patterns detected ✓'
  } else {
    const patternCount = summary.concerningPatterns.length
    message += `${patternCount} pattern${patternCount > 1 ? 's' : ''} to review`
  }

  return message
}

/**
 * Format summary for child view.
 */
export function formatSummaryForChild(summary: DailySummary): string {
  const usageText = formatMinutes(summary.totalUsageMinutes)

  let message = `Today's usage: ${usageText}\n`

  if (summary.topApps.length > 0) {
    const topAppNames = summary.topApps.slice(0, 3).map((a) => a.appName)
    message += `Most used: ${topAppNames.join(', ')}`
  }

  return message
}

/**
 * Get summary status message.
 */
export function getSummaryStatusMessage(summary: DailySummary): string {
  switch (summary.status) {
    case 'normal':
      return 'Everything looks good!'
    case 'attention-needed':
      return 'Some patterns may need attention.'
    case 'critical':
      return 'Important patterns detected - conversation recommended.'
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Format minutes as human-readable duration.
 */
export function formatMinutes(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} minutes`
  }

  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60

  if (remainingMinutes === 0) {
    return hours === 1 ? '1 hour' : `${hours} hours`
  }

  const hourText = hours === 1 ? '1 hour' : `${hours} hours`
  return `${hourText} ${remainingMinutes} min`
}

/**
 * Format hour as time string.
 */
export function formatHour(hour: number): string {
  if (hour === 0) return '12 AM'
  if (hour === 12) return '12 PM'
  if (hour < 12) return `${hour} AM`
  return `${hour - 12} PM`
}

/**
 * Format date for display.
 */
export function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
}
