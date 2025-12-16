/**
 * Privacy Gap Scheduler Service
 *
 * Story 7.8: Privacy Gaps Injection - Task 2
 *
 * Generates daily gap schedules using deterministic seeded randomness.
 * Each child gets a unique but reproducible schedule per day.
 *
 * Key design decisions:
 * - Seeded PRNG for deterministic yet unpredictable schedules
 * - Per-child randomization using childId + date as seed
 * - Gap timing distributed across waking hours with minimum spacing
 */

import {
  type PrivacyGapConfig,
  type PrivacyGapSchedule,
  type ScheduledGap,
  DEFAULT_PRIVACY_GAP_CONFIG,
  PRIVACY_GAPS_CONSTANTS,
} from '@fledgely/contracts'

// ============================================================================
// Seeded Random Number Generator
// ============================================================================

/**
 * Result of generating a gap schedule
 */
export type GapScheduleResult = PrivacyGapSchedule

/**
 * Create a seeded pseudo-random number generator
 *
 * Uses a simple but effective xorshift128+ algorithm variant
 * for deterministic random number generation.
 *
 * @param seed - String seed for reproducible randomness
 * @returns Function that returns random number between 0 and 1
 */
export function createSeededRandom(seed: string): () => number {
  // Convert string seed to numeric values using simple hash
  let h1 = 0xdeadbeef
  let h2 = 0x41c6ce57

  for (let i = 0; i < seed.length; i++) {
    const ch = seed.charCodeAt(i)
    h1 = Math.imul(h1 ^ ch, 2654435761)
    h2 = Math.imul(h2 ^ ch, 1597334677)
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909)
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909)

  // Initial state from hash
  let state0 = (h1 >>> 0) + 0x9e3779b9
  let state1 = (h2 >>> 0) + 0x6a09e667

  return function random(): number {
    // Xorshift algorithm
    let s1 = state0
    const s0 = state1
    state0 = s0
    s1 ^= s1 << 23
    s1 ^= s1 >>> 17
    s1 ^= s0
    s1 ^= s0 >>> 26
    state1 = s1

    // Convert to 0-1 range
    return ((state0 + state1) >>> 0) / 4294967296
  }
}

/**
 * Generate a seed string from childId and date
 *
 * Combines childId with date to ensure:
 * - Same child gets different schedules each day
 * - Different children get different schedules on the same day
 */
export function generateSeed(childId: string, date: Date): string {
  const dateStr = date.toISOString().slice(0, 10) // YYYY-MM-DD
  return `${childId}:${dateStr}`
}

/**
 * Generate random integer within range using seeded RNG
 *
 * @param rng - Seeded random function
 * @param min - Minimum value (inclusive)
 * @param max - Maximum value (inclusive)
 */
export function randomIntFromSeed(
  rng: () => number,
  min: number,
  max: number
): number {
  return Math.floor(rng() * (max - min + 1)) + min
}

/**
 * Generate random duration within range using seeded RNG
 */
function randomDurationFromSeed(
  rng: () => number,
  minMs: number,
  maxMs: number
): number {
  return Math.floor(rng() * (maxMs - minMs + 1)) + minMs
}

// ============================================================================
// Gap Distribution
// ============================================================================

/**
 * Get waking hours range from config
 */
export function getWakingHoursRange(config: PrivacyGapConfig): {
  startHour: number
  endHour: number
  totalMinutes: number
} {
  const startHour = config.wakingHoursStart
  const endHour = config.wakingHoursEnd
  const totalMinutes = (endHour - startHour) * 60

  return { startHour, endHour, totalMinutes }
}

/**
 * Distribute gap starting times across waking hours with minimum spacing
 *
 * Uses a stratified random approach:
 * 1. Divide waking hours into segments based on gap count
 * 2. Place each gap randomly within its segment
 * 3. Ensure minimum spacing between gaps
 *
 * @param rng - Seeded random function
 * @param gapCount - Number of gaps to distribute
 * @param totalMinutes - Total minutes in waking hours
 * @param minSpacingMs - Minimum milliseconds between gap ends and starts
 * @returns Array of minute offsets from waking hours start (sorted)
 */
export function distributeGapsWithSpacing(
  rng: () => number,
  gapCount: number,
  totalMinutes: number,
  minSpacingMs: number
): number[] {
  if (gapCount === 0) return []
  if (gapCount === 1) {
    // Single gap: place anywhere in waking hours
    const maxOffset = totalMinutes - 15 // Leave room for gap duration
    return [randomIntFromSeed(rng, 0, Math.max(0, maxOffset))]
  }

  const minSpacingMinutes = minSpacingMs / (60 * 1000)
  const maxGapDuration = 15 // minutes

  // Calculate available space for placing gaps
  const requiredSpacing = (gapCount - 1) * (minSpacingMinutes + maxGapDuration)
  const availableSpace = totalMinutes - gapCount * maxGapDuration

  if (availableSpace < requiredSpacing) {
    // Not enough space - distribute evenly
    const spacing = Math.floor(totalMinutes / gapCount)
    return Array.from({ length: gapCount }, (_, i) => Math.floor(spacing * i + spacing * 0.3))
  }

  // Stratified random placement
  const segmentSize = totalMinutes / gapCount
  const offsets: number[] = []

  for (let i = 0; i < gapCount; i++) {
    const segmentStart = Math.floor(segmentSize * i)
    const segmentEnd = Math.floor(segmentSize * (i + 1)) - maxGapDuration

    // Ensure minimum distance from previous gap
    let minOffset = segmentStart
    if (i > 0 && offsets[i - 1] !== undefined) {
      const prevEnd = offsets[i - 1] + maxGapDuration
      minOffset = Math.max(segmentStart, prevEnd + minSpacingMinutes)
    }

    const maxOffset = Math.max(minOffset, segmentEnd)
    const offset = randomIntFromSeed(rng, minOffset, maxOffset)
    offsets.push(offset)
  }

  return offsets.sort((a, b) => a - b)
}

// ============================================================================
// Schedule Generation
// ============================================================================

/**
 * Generate a daily gap schedule for a child
 *
 * Creates a deterministic schedule based on childId and date.
 * Same inputs always produce the same output.
 *
 * @param childId - Unique child identifier
 * @param date - Date to generate schedule for
 * @param config - Optional custom configuration (defaults to DEFAULT_PRIVACY_GAP_CONFIG)
 * @returns Complete gap schedule for the day
 */
export function generateDailyGapSchedule(
  childId: string,
  date: Date,
  config: PrivacyGapConfig = DEFAULT_PRIVACY_GAP_CONFIG
): GapScheduleResult {
  // Create seeded RNG for deterministic generation
  const seed = generateSeed(childId, date)
  const rng = createSeededRandom(seed)

  // Determine gap count for this day
  const gapCount = randomIntFromSeed(rng, config.minDailyGaps, config.maxDailyGaps)

  // Get waking hours info
  const { startHour, totalMinutes } = getWakingHoursRange(config)

  // Distribute gap starting times
  const minuteOffsets = distributeGapsWithSpacing(
    rng,
    gapCount,
    totalMinutes,
    config.minGapSpacingMs
  )

  // Generate gaps with random durations
  const dateStr = date.toISOString().slice(0, 10) // YYYY-MM-DD
  const baseDate = new Date(Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate(),
    startHour,
    0,
    0,
    0
  ))

  const gaps: ScheduledGap[] = minuteOffsets.map((offsetMinutes) => {
    // Generate random duration for this gap
    const durationMs = randomDurationFromSeed(
      rng,
      config.minGapDurationMs,
      config.maxGapDurationMs
    )

    // Calculate start and end times
    const startTime = new Date(baseDate.getTime() + offsetMinutes * 60 * 1000)
    const endTime = new Date(startTime.getTime() + durationMs)

    return {
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      durationMs,
    }
  })

  // Set schedule metadata
  const now = new Date()
  const expiresAt = new Date(now.getTime() + PRIVACY_GAPS_CONSTANTS.SCHEDULE_TTL_HOURS * 60 * 60 * 1000)

  return {
    childId,
    date: dateStr,
    gaps,
    generatedAt: now,
    expiresAt,
  }
}

/**
 * Check if a timestamp falls within any scheduled gap
 *
 * @param schedule - The day's gap schedule
 * @param timestamp - Timestamp to check
 * @returns True if timestamp is within a scheduled gap
 */
export function isTimestampInScheduledGap(
  schedule: GapScheduleResult,
  timestamp: Date
): boolean {
  const timestampMs = timestamp.getTime()

  for (const gap of schedule.gaps) {
    const startMs = new Date(gap.startTime).getTime()
    const endMs = new Date(gap.endTime).getTime()

    if (timestampMs >= startMs && timestampMs < endMs) {
      return true
    }
  }

  return false
}

/**
 * Get the current gap if timestamp is within one
 *
 * @param schedule - The day's gap schedule
 * @param timestamp - Timestamp to check
 * @returns The active gap or null if not within a gap
 */
export function getCurrentGap(
  schedule: GapScheduleResult,
  timestamp: Date
): ScheduledGap | null {
  const timestampMs = timestamp.getTime()

  for (const gap of schedule.gaps) {
    const startMs = new Date(gap.startTime).getTime()
    const endMs = new Date(gap.endTime).getTime()

    if (timestampMs >= startMs && timestampMs < endMs) {
      return gap
    }
  }

  return null
}

/**
 * Get time until next scheduled gap
 *
 * @param schedule - The day's gap schedule
 * @param timestamp - Current timestamp
 * @returns Milliseconds until next gap, or null if no more gaps today
 */
export function getTimeUntilNextGap(
  schedule: GapScheduleResult,
  timestamp: Date
): number | null {
  const timestampMs = timestamp.getTime()

  for (const gap of schedule.gaps) {
    const startMs = new Date(gap.startTime).getTime()

    if (startMs > timestampMs) {
      return startMs - timestampMs
    }
  }

  return null
}
