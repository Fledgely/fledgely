/**
 * Privacy Gaps Injection Module for Fledgely Chrome Extension
 *
 * This module injects random screenshot gaps for ALL children, making
 * crisis-related gaps indistinguishable from normal gaps (Story 7.8).
 *
 * CRITICAL PRIVACY RULES:
 * - Gap schedule is NEVER transmitted to server
 * - Gap times are NEVER logged to event-logger
 * - Parents cannot distinguish crisis gaps from random gaps
 * - Schedule is unique per-child and regenerates daily
 */

/**
 * Privacy gap schedule for a single day
 */
export interface PrivacyGapSchedule {
  /** Child ID this schedule belongs to */
  childId: string
  /** Date string (YYYY-MM-DD) this schedule is for */
  dateString: string
  /** Timestamp when schedule was generated */
  generatedAt: number
  /** Array of gap windows for the day */
  gaps: Array<{
    /** Start time as minutes since midnight (0-1440) */
    startMinuteOfDay: number
    /** Gap duration in minutes (5-15) */
    durationMinutes: number
  }>
}

// Configuration constants
const MIN_GAPS_PER_DAY = 2
const MAX_GAPS_PER_DAY = 4
const MIN_GAP_DURATION_MINUTES = 5
const MAX_GAP_DURATION_MINUTES = 15
const MINUTES_IN_DAY = 1440

// Storage key for cached schedule
const SCHEDULE_STORAGE_KEY = 'privacyGapSchedule'

/**
 * Seeded pseudo-random number generator for reproducible per-child schedules.
 * Uses a simple linear congruential generator with string-based seed.
 *
 * @param seed - Seed string (childId + date)
 * @returns Function that returns pseudo-random number between 0-1
 */
function seededRandom(seed: string): () => number {
  // Hash the seed string to an integer
  let hash = 0
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash = hash & hash // Convert to 32-bit integer
  }

  // LCG parameters (common values)
  return () => {
    hash = (hash * 1103515245 + 12345) & 0x7fffffff
    return hash / 0x7fffffff
  }
}

/**
 * Get today's date string in YYYY-MM-DD format
 */
function getTodayString(): string {
  return new Date().toISOString().split('T')[0]
}

/**
 * Check if a proposed gap overlaps with existing gaps
 *
 * @param start - Start minute of day
 * @param duration - Duration in minutes
 * @param existingGaps - Array of existing gaps
 * @returns true if overlap detected
 */
function hasOverlap(
  start: number,
  duration: number,
  existingGaps: PrivacyGapSchedule['gaps']
): boolean {
  const end = start + duration

  for (const gap of existingGaps) {
    const gapEnd = gap.startMinuteOfDay + gap.durationMinutes

    // Check for any overlap
    if (start < gapEnd && end > gap.startMinuteOfDay) {
      return true
    }
  }

  return false
}

/**
 * Generate a daily privacy gap schedule for a child.
 * Uses seeded random to ensure reproducible schedules per-child per-day.
 *
 * @param childId - Child's unique identifier
 * @param dateString - Date in YYYY-MM-DD format
 * @returns Privacy gap schedule for the day
 */
export function generateDailySchedule(childId: string, dateString: string): PrivacyGapSchedule {
  // Seed with childId + date for unique daily schedule
  const seed = `${childId}-${dateString}`
  const random = seededRandom(seed)

  // Generate 2-4 gaps
  const gapCount =
    MIN_GAPS_PER_DAY + Math.floor(random() * (MAX_GAPS_PER_DAY - MIN_GAPS_PER_DAY + 1))

  const gaps: PrivacyGapSchedule['gaps'] = []
  let attempts = 0
  const maxAttempts = 100

  while (gaps.length < gapCount && attempts < maxAttempts) {
    // Random start time
    const startMinute = Math.floor(random() * MINUTES_IN_DAY)

    // Random duration between 5-15 minutes
    const duration =
      MIN_GAP_DURATION_MINUTES +
      Math.floor(random() * (MAX_GAP_DURATION_MINUTES - MIN_GAP_DURATION_MINUTES + 1))

    // Check for overlap with existing gaps
    if (!hasOverlap(startMinute, duration, gaps)) {
      gaps.push({
        startMinuteOfDay: startMinute,
        durationMinutes: duration,
      })
    }

    attempts++
  }

  // Sort gaps by start time for easier debugging (not exposed to parents)
  gaps.sort((a, b) => a.startMinuteOfDay - b.startMinuteOfDay)

  return {
    childId,
    dateString,
    generatedAt: Date.now(),
    gaps,
  }
}

/**
 * Check if a given timestamp falls within a privacy gap window.
 *
 * @param schedule - The day's privacy gap schedule
 * @param timestamp - Timestamp to check (milliseconds since epoch)
 * @returns true if currently in a privacy gap
 */
export function isInPrivacyGap(schedule: PrivacyGapSchedule, timestamp: number): boolean {
  // Validate schedule is for today
  const timestampDate = new Date(timestamp).toISOString().split('T')[0]
  if (schedule.dateString !== timestampDate) {
    // Schedule is stale - need to regenerate
    return false
  }

  // Get minute of day from timestamp
  const date = new Date(timestamp)
  const minuteOfDay = date.getHours() * 60 + date.getMinutes()

  // Check if current minute falls within any gap
  return schedule.gaps.some((gap) => {
    const endMinute = gap.startMinuteOfDay + gap.durationMinutes

    // Normal case: gap doesn't wrap around midnight
    if (endMinute <= MINUTES_IN_DAY) {
      return minuteOfDay >= gap.startMinuteOfDay && minuteOfDay < endMinute
    }

    // Gap wraps around midnight (rare but possible)
    return minuteOfDay >= gap.startMinuteOfDay || minuteOfDay < endMinute % MINUTES_IN_DAY
  })
}

/**
 * Get current schedule from storage or generate new one
 *
 * @param childId - Child's unique identifier
 * @returns Current day's privacy gap schedule
 */
export async function getOrGenerateSchedule(childId: string): Promise<PrivacyGapSchedule> {
  const today = getTodayString()

  // Try to get cached schedule
  const result = await chrome.storage.local.get(SCHEDULE_STORAGE_KEY)
  const cached = result[SCHEDULE_STORAGE_KEY] as PrivacyGapSchedule | undefined

  // Check if cached schedule is valid for today and this child
  if (cached && cached.childId === childId && cached.dateString === today) {
    return cached
  }

  // Generate new schedule for today
  const schedule = generateDailySchedule(childId, today)

  // Cache the schedule (local storage only - never synced)
  await chrome.storage.local.set({ [SCHEDULE_STORAGE_KEY]: schedule })

  return schedule
}

/**
 * Force regenerate schedule (e.g., when child changes)
 *
 * @param childId - Child's unique identifier
 * @returns New privacy gap schedule
 */
export async function regenerateSchedule(childId: string): Promise<PrivacyGapSchedule> {
  const today = getTodayString()
  const schedule = generateDailySchedule(childId, today)

  await chrome.storage.local.set({ [SCHEDULE_STORAGE_KEY]: schedule })

  return schedule
}

/**
 * Clear privacy gap schedule (e.g., when child disconnected)
 */
export async function clearSchedule(): Promise<void> {
  await chrome.storage.local.remove(SCHEDULE_STORAGE_KEY)
}

/**
 * Get schedule statistics for testing (NOT exposed to parents)
 *
 * @param schedule - Privacy gap schedule
 * @returns Statistics about the schedule
 */
export function getScheduleStats(schedule: PrivacyGapSchedule): {
  gapCount: number
  totalGapMinutes: number
  averageGapDuration: number
} {
  const totalGapMinutes = schedule.gaps.reduce((sum, gap) => sum + gap.durationMinutes, 0)

  return {
    gapCount: schedule.gaps.length,
    totalGapMinutes,
    averageGapDuration: schedule.gaps.length > 0 ? totalGapMinutes / schedule.gaps.length : 0,
  }
}

// Export for testing
export const _testExports = {
  seededRandom,
  getTodayString,
  hasOverlap,
  SCHEDULE_STORAGE_KEY,
  MIN_GAPS_PER_DAY,
  MAX_GAPS_PER_DAY,
  MIN_GAP_DURATION_MINUTES,
  MAX_GAP_DURATION_MINUTES,
  MINUTES_IN_DAY,
}
