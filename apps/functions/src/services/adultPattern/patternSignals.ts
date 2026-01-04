/**
 * Adult Pattern Signal Detection
 *
 * Story 8.10: Adult Pattern Detection - AC5: Metadata-Only Detection
 *
 * Detects adult usage patterns from screenshot metadata (URLs, timestamps).
 * NEVER accesses screenshot content - privacy by design.
 */

import { isWorkAppUrl, isFinancialSiteUrl, type AdultPatternSignal } from '@fledgely/shared'

/**
 * Screenshot metadata for pattern analysis.
 *
 * Only contains URL and timestamp - no content or images.
 */
export interface ScreenshotMetadataForAnalysis {
  url: string
  timestamp: number // epoch ms
}

/**
 * Hourly activity pattern for schedule detection.
 */
interface HourlyActivity {
  hour: number // 0-23
  count: number
  weekdayCount: number
  weekendCount: number
}

/**
 * Detect work app URL patterns.
 *
 * AC5: Only analyzes URL domains, never content.
 *
 * @param metadata - Array of screenshot metadata
 * @returns Work app signal detection result
 */
export function detectWorkAppPatterns(
  metadata: ScreenshotMetadataForAnalysis[]
): AdultPatternSignal {
  const workAppUrls: string[] = []
  const triggeredDomains = new Set<string>()

  for (const item of metadata) {
    if (isWorkAppUrl(item.url)) {
      workAppUrls.push(item.url)
      try {
        const hostname = new URL(item.url).hostname
        triggeredDomains.add(hostname)
      } catch {
        // Invalid URL - skip
      }
    }
  }

  const instanceCount = workAppUrls.length
  const totalUrls = metadata.length
  const percentage = totalUrls > 0 ? (instanceCount / totalUrls) * 100 : 0

  // Confidence based on percentage of work app usage
  // >20% work app usage is highly indicative
  // >10% is moderately indicative
  // >5% is slightly indicative
  let confidence = 0
  if (percentage >= 20) {
    confidence = 90
  } else if (percentage >= 15) {
    confidence = 75
  } else if (percentage >= 10) {
    confidence = 60
  } else if (percentage >= 5) {
    confidence = 40
  } else if (instanceCount >= 3) {
    confidence = 25
  }

  // Diversity bonus: multiple different work apps increases confidence
  const diversityBonus = Math.min(triggeredDomains.size * 5, 20)
  confidence = Math.min(confidence + diversityBonus, 100)

  const description =
    instanceCount > 0
      ? `Detected ${instanceCount} work app visits (${percentage.toFixed(1)}% of activity) across ${triggeredDomains.size} services`
      : 'No work app patterns detected'

  return {
    signalType: 'work_apps',
    confidence,
    instanceCount,
    description,
    triggers: Array.from(triggeredDomains).slice(0, 10), // Limit to 10 for privacy
  }
}

/**
 * Detect financial site URL patterns.
 *
 * Financial sites are the strongest signal for adult usage as children
 * rarely use banking, trading, or tax preparation sites.
 *
 * AC5: Only analyzes URL domains, never content.
 *
 * @param metadata - Array of screenshot metadata
 * @returns Financial site signal detection result
 */
export function detectFinancialSitePatterns(
  metadata: ScreenshotMetadataForAnalysis[]
): AdultPatternSignal {
  const financialUrls: string[] = []
  const triggeredDomains = new Set<string>()

  for (const item of metadata) {
    if (isFinancialSiteUrl(item.url)) {
      financialUrls.push(item.url)
      try {
        const hostname = new URL(item.url).hostname
        triggeredDomains.add(hostname)
      } catch {
        // Invalid URL - skip
      }
    }
  }

  const instanceCount = financialUrls.length

  // Financial sites have HIGH confidence even with few visits
  // because children almost never use these sites legitimately
  let confidence = 0
  if (instanceCount >= 10) {
    confidence = 95 // Very strong signal
  } else if (instanceCount >= 5) {
    confidence = 85
  } else if (instanceCount >= 3) {
    confidence = 70
  } else if (instanceCount >= 2) {
    confidence = 55
  } else if (instanceCount === 1) {
    confidence = 35 // Single visit could be curiosity
  }

  // Multiple different financial sites increases confidence significantly
  const diversityBonus = Math.min(triggeredDomains.size * 10, 25)
  confidence = Math.min(confidence + diversityBonus, 100)

  const description =
    instanceCount > 0
      ? `Detected ${instanceCount} financial site visits across ${triggeredDomains.size} services`
      : 'No financial site patterns detected'

  return {
    signalType: 'financial_sites',
    confidence,
    instanceCount,
    description,
    triggers: Array.from(triggeredDomains).slice(0, 10),
  }
}

/**
 * Detect adult schedule patterns.
 *
 * Adult users tend to have consistent 9-5 workday patterns or
 * late night usage that differs from typical child schedules.
 *
 * AC5: Only analyzes timestamps, never content.
 *
 * @param metadata - Array of screenshot metadata
 * @returns Schedule pattern signal detection result
 */
export function detectAdultSchedulePatterns(
  metadata: ScreenshotMetadataForAnalysis[]
): AdultPatternSignal {
  if (metadata.length === 0) {
    return {
      signalType: 'adult_schedule',
      confidence: 0,
      instanceCount: 0,
      description: 'No activity data available',
      triggers: [],
    }
  }

  // Build hourly activity profile
  const hourlyActivity: Map<number, HourlyActivity> = new Map()
  for (let i = 0; i < 24; i++) {
    hourlyActivity.set(i, { hour: i, count: 0, weekdayCount: 0, weekendCount: 0 })
  }

  for (const item of metadata) {
    const date = new Date(item.timestamp)
    const hour = date.getHours()
    const dayOfWeek = date.getDay() // 0 = Sunday
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6

    const activity = hourlyActivity.get(hour)!
    activity.count++
    if (isWeekend) {
      activity.weekendCount++
    } else {
      activity.weekdayCount++
    }
  }

  // Analyze patterns
  const triggers: string[] = []
  let patternScore = 0

  // Pattern 1: 9-5 workday activity (Mon-Fri, 9am-5pm heavy usage)
  const workHourActivity = Array.from({ length: 8 }, (_, i) => hourlyActivity.get(9 + i)!)
  const totalWorkHours = workHourActivity.reduce((sum, h) => sum + h.weekdayCount, 0)
  const totalWeekdayActivity = Array.from(hourlyActivity.values()).reduce(
    (sum, h) => sum + h.weekdayCount,
    0
  )

  if (totalWeekdayActivity > 0) {
    const workHourPercentage = (totalWorkHours / totalWeekdayActivity) * 100
    if (workHourPercentage >= 70) {
      patternScore += 40
      triggers.push(
        `9-5 pattern: ${workHourPercentage.toFixed(0)}% weekday activity during work hours`
      )
    } else if (workHourPercentage >= 50) {
      patternScore += 25
      triggers.push(
        `Partial 9-5 pattern: ${workHourPercentage.toFixed(0)}% weekday activity during work hours`
      )
    }
  }

  // Pattern 2: Late night consistent usage (11pm-2am)
  const lateNightHours = [23, 0, 1, 2]
  const lateNightActivity = lateNightHours.reduce((sum, h) => sum + hourlyActivity.get(h)!.count, 0)
  const lateNightPercentage = metadata.length > 0 ? (lateNightActivity / metadata.length) * 100 : 0

  if (lateNightPercentage >= 15) {
    patternScore += 30
    triggers.push(
      `Late night pattern: ${lateNightPercentage.toFixed(0)}% activity between 11pm-2am`
    )
  } else if (lateNightPercentage >= 8) {
    patternScore += 15
    triggers.push(`Some late night activity: ${lateNightPercentage.toFixed(0)}% between 11pm-2am`)
  }

  // Pattern 3: Weekday > Weekend activity (adults work more on weekdays)
  const weekdayTotal = Array.from(hourlyActivity.values()).reduce(
    (sum, h) => sum + h.weekdayCount,
    0
  )
  const weekendTotal = Array.from(hourlyActivity.values()).reduce(
    (sum, h) => sum + h.weekendCount,
    0
  )

  // Normalize for 5 weekdays vs 2 weekend days
  const normalizedWeekday = weekdayTotal / 5
  const normalizedWeekend = weekendTotal / 2

  if (normalizedWeekend > 0 && normalizedWeekday / normalizedWeekend >= 2) {
    patternScore += 20
    triggers.push('Weekday-heavy pattern: 2x more activity on weekdays')
  }

  // Calculate confidence from pattern score
  const confidence = Math.min(patternScore, 100)
  const instanceCount = triggers.length

  const description =
    triggers.length > 0
      ? `Detected ${triggers.length} adult schedule patterns`
      : 'Schedule patterns consistent with child usage'

  return {
    signalType: 'adult_schedule',
    confidence,
    instanceCount,
    description,
    triggers,
  }
}

/**
 * Detect adult communication patterns.
 *
 * Lower weight signal based on volume and timing of activity.
 * Professional adults tend to have high volume, consistent activity.
 *
 * AC5: Only analyzes metadata counts and timing, never content.
 *
 * @param metadata - Array of screenshot metadata
 * @returns Communication pattern signal detection result
 */
export function detectCommunicationPatterns(
  metadata: ScreenshotMetadataForAnalysis[]
): AdultPatternSignal {
  if (metadata.length === 0) {
    return {
      signalType: 'communication_patterns',
      confidence: 0,
      instanceCount: 0,
      description: 'No activity data available',
      triggers: [],
    }
  }

  const triggers: string[] = []
  let patternScore = 0

  // Pattern 1: High activity volume (adults typically use devices more)
  const daysSpan = calculateDaysSpan(metadata)
  const avgScreenshotsPerDay = daysSpan > 0 ? metadata.length / daysSpan : metadata.length

  if (avgScreenshotsPerDay >= 100) {
    patternScore += 30
    triggers.push(`High volume: ${avgScreenshotsPerDay.toFixed(0)} screenshots/day average`)
  } else if (avgScreenshotsPerDay >= 50) {
    patternScore += 15
    triggers.push(`Moderate volume: ${avgScreenshotsPerDay.toFixed(0)} screenshots/day average`)
  }

  // Pattern 2: Consistent daily activity (no gaps typical of school hours)
  const dailyCounts = groupByDay(metadata)
  const activeDays = dailyCounts.filter((c) => c > 0).length
  const consistencyRatio = daysSpan > 0 ? activeDays / daysSpan : 0

  if (consistencyRatio >= 0.9 && activeDays >= 7) {
    patternScore += 25
    triggers.push(`Consistent activity: ${(consistencyRatio * 100).toFixed(0)}% of days active`)
  }

  // Pattern 3: Activity during school hours on weekdays (9am-3pm Mon-Fri)
  const schoolHourActivity = countSchoolHourActivity(metadata)
  const schoolHourPercentage =
    metadata.length > 0 ? (schoolHourActivity / metadata.length) * 100 : 0

  if (schoolHourPercentage >= 30) {
    patternScore += 30
    triggers.push(
      `School hour activity: ${schoolHourPercentage.toFixed(0)}% of activity during school hours`
    )
  } else if (schoolHourPercentage >= 20) {
    patternScore += 15
    triggers.push(
      `Some school hour activity: ${schoolHourPercentage.toFixed(0)}% during school hours`
    )
  }

  const confidence = Math.min(patternScore, 100)
  const instanceCount = triggers.length

  const description =
    triggers.length > 0
      ? `Detected ${triggers.length} adult communication patterns`
      : 'Communication patterns consistent with child usage'

  return {
    signalType: 'communication_patterns',
    confidence,
    instanceCount,
    description,
    triggers,
  }
}

/**
 * Calculate the span of days covered by the metadata.
 */
function calculateDaysSpan(metadata: ScreenshotMetadataForAnalysis[]): number {
  if (metadata.length === 0) return 0

  const timestamps = metadata.map((m) => m.timestamp)
  const minTime = Math.min(...timestamps)
  const maxTime = Math.max(...timestamps)

  return Math.ceil((maxTime - minTime) / (24 * 60 * 60 * 1000)) + 1
}

/**
 * Group metadata by day and return daily counts.
 */
function groupByDay(metadata: ScreenshotMetadataForAnalysis[]): number[] {
  const dailyCounts: Map<string, number> = new Map()

  for (const item of metadata) {
    const date = new Date(item.timestamp).toISOString().split('T')[0]
    dailyCounts.set(date, (dailyCounts.get(date) || 0) + 1)
  }

  return Array.from(dailyCounts.values())
}

/**
 * Count activity during school hours (9am-3pm Mon-Fri).
 */
function countSchoolHourActivity(metadata: ScreenshotMetadataForAnalysis[]): number {
  let count = 0

  for (const item of metadata) {
    const date = new Date(item.timestamp)
    const hour = date.getHours()
    const dayOfWeek = date.getDay()

    // Monday-Friday (1-5), 9am-3pm (9-14)
    if (dayOfWeek >= 1 && dayOfWeek <= 5 && hour >= 9 && hour <= 14) {
      count++
    }
  }

  return count
}
