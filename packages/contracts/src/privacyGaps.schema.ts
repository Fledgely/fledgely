/**
 * Privacy Gaps Schema
 *
 * Story 7.8: Privacy Gaps Injection (FR-SA2)
 *
 * Defines schemas for privacy gap configuration, scheduling, and events.
 * Privacy gaps inject random plausible gaps in ALL screenshot streams
 * to prevent negative inference attacks on crisis resource visitors.
 *
 * CRITICAL: Gap reasons (privacy vs crisis) are NEVER exposed to parents.
 */

import { z } from 'zod'

// ============================================================================
// Constants
// ============================================================================

/**
 * Privacy gaps system constants
 */
export const PRIVACY_GAPS_CONSTANTS = {
  /** Minimum gap duration in milliseconds (5 minutes) */
  MIN_GAP_DURATION_MS: 5 * 60 * 1000,
  /** Maximum gap duration in milliseconds (15 minutes) */
  MAX_GAP_DURATION_MS: 15 * 60 * 1000,
  /** Minimum daily gaps */
  MIN_DAILY_GAPS: 2,
  /** Maximum daily gaps */
  MAX_DAILY_GAPS: 4,
  /** Default waking hours start (7am) */
  WAKING_HOURS_START: 7,
  /** Default waking hours end (10pm) */
  WAKING_HOURS_END: 22,
  /** Minimum gap spacing in milliseconds (2 hours) */
  MIN_GAP_SPACING_MS: 2 * 60 * 60 * 1000,
  /** Firestore collection for gap schedules */
  SCHEDULE_COLLECTION: 'privacy-gap-schedules',
  /** Schedule TTL in hours (auto-delete) */
  SCHEDULE_TTL_HOURS: 24,
  /** Maximum gaps per schedule (safety limit) */
  MAX_GAPS_PER_SCHEDULE: 10,
} as const

// ============================================================================
// Gap Configuration Schema
// ============================================================================

/**
 * Privacy gap configuration - controls gap injection behavior
 */
export const privacyGapConfigSchema = z
  .object({
    /** Whether privacy gaps are enabled (default: true) */
    enabled: z.boolean(),
    /** Minimum gap duration in milliseconds */
    minGapDurationMs: z.number().int().positive(),
    /** Maximum gap duration in milliseconds */
    maxGapDurationMs: z.number().int().positive(),
    /** Minimum number of gaps per day */
    minDailyGaps: z.number().int().min(0),
    /** Maximum number of gaps per day */
    maxDailyGaps: z.number().int().positive(),
    /** Waking hours start (0-23) */
    wakingHoursStart: z.number().int().min(0).max(23),
    /** Waking hours end (0-23) */
    wakingHoursEnd: z.number().int().min(0).max(23),
    /** Minimum spacing between gaps in milliseconds */
    minGapSpacingMs: z.number().int().positive(),
  })
  .refine((data) => data.minGapDurationMs <= data.maxGapDurationMs, {
    message: 'minGapDurationMs must be <= maxGapDurationMs',
    path: ['minGapDurationMs'],
  })
  .refine((data) => data.minDailyGaps <= data.maxDailyGaps, {
    message: 'minDailyGaps must be <= maxDailyGaps',
    path: ['minDailyGaps'],
  })
  .refine((data) => data.wakingHoursStart < data.wakingHoursEnd, {
    message: 'wakingHoursStart must be < wakingHoursEnd',
    path: ['wakingHoursStart'],
  })

export type PrivacyGapConfig = z.infer<typeof privacyGapConfigSchema>

/**
 * Default configuration - ENABLED BY DEFAULT for all children
 */
export const DEFAULT_PRIVACY_GAP_CONFIG: PrivacyGapConfig = {
  enabled: true,
  minGapDurationMs: PRIVACY_GAPS_CONSTANTS.MIN_GAP_DURATION_MS,
  maxGapDurationMs: PRIVACY_GAPS_CONSTANTS.MAX_GAP_DURATION_MS,
  minDailyGaps: PRIVACY_GAPS_CONSTANTS.MIN_DAILY_GAPS,
  maxDailyGaps: PRIVACY_GAPS_CONSTANTS.MAX_DAILY_GAPS,
  wakingHoursStart: PRIVACY_GAPS_CONSTANTS.WAKING_HOURS_START,
  wakingHoursEnd: PRIVACY_GAPS_CONSTANTS.WAKING_HOURS_END,
  minGapSpacingMs: PRIVACY_GAPS_CONSTANTS.MIN_GAP_SPACING_MS,
}

// ============================================================================
// Scheduled Gap Schema
// ============================================================================

/**
 * ISO 8601 timestamp regex for validation
 */
const ISO_TIMESTAMP_REGEX = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/

/**
 * Date format regex (YYYY-MM-DD)
 */
const DATE_FORMAT_REGEX = /^\d{4}-\d{2}-\d{2}$/

/**
 * Individual scheduled gap within a day
 */
export const scheduledGapSchema = z.object({
  /** Gap start time (ISO 8601) */
  startTime: z.string().regex(ISO_TIMESTAMP_REGEX, 'Invalid ISO timestamp'),
  /** Gap end time (ISO 8601) */
  endTime: z.string().regex(ISO_TIMESTAMP_REGEX, 'Invalid ISO timestamp'),
  /** Gap duration in milliseconds */
  durationMs: z.number().int().positive(),
})

export type ScheduledGap = z.infer<typeof scheduledGapSchema>

/**
 * Daily privacy gap schedule for a child
 */
export const privacyGapScheduleSchema = z.object({
  /** Child ID this schedule belongs to */
  childId: z.string().min(1, 'Child ID is required'),
  /** Date this schedule is for (YYYY-MM-DD) */
  date: z.string().regex(DATE_FORMAT_REGEX, 'Date must be in YYYY-MM-DD format'),
  /** Scheduled gaps for this day */
  gaps: z.array(scheduledGapSchema).max(PRIVACY_GAPS_CONSTANTS.MAX_GAPS_PER_SCHEDULE),
  /** When this schedule was generated */
  generatedAt: z.date(),
  /** When this schedule expires (auto-delete) */
  expiresAt: z.date(),
})

export type PrivacyGapSchedule = z.infer<typeof privacyGapScheduleSchema>

/**
 * Firestore-compatible schedule schema (uses Timestamp)
 */
export const privacyGapScheduleFirestoreSchema = z.object({
  childId: z.string().min(1),
  date: z.string().regex(DATE_FORMAT_REGEX),
  gaps: z.array(scheduledGapSchema).max(PRIVACY_GAPS_CONSTANTS.MAX_GAPS_PER_SCHEDULE),
  generatedAt: z.custom<{ toDate: () => Date }>(
    (val) => val && typeof (val as { toDate?: () => Date }).toDate === 'function'
  ),
  expiresAt: z.custom<{ toDate: () => Date }>(
    (val) => val && typeof (val as { toDate?: () => Date }).toDate === 'function'
  ),
})

export type PrivacyGapScheduleFirestore = z.infer<typeof privacyGapScheduleFirestoreSchema>

// ============================================================================
// Gap Event Schema (for internal tracking only - NEVER exposed to parents)
// ============================================================================

/**
 * Gap type - CRITICAL: This is NEVER exposed to parents
 */
export const gapTypeSchema = z.enum(['scheduled', 'crisis'])

export type GapType = z.infer<typeof gapTypeSchema>

/**
 * Gap event for internal tracking (no PII)
 *
 * CRITICAL: This is stored internally only and gap type is NEVER
 * exposed through any parent-facing API.
 */
export const privacyGapEventSchema = z.object({
  /** Child ID (not name or other PII) */
  childId: z.string().min(1),
  /** When the gap occurred */
  timestamp: z.date(),
  /** Duration of the gap in milliseconds */
  durationMs: z.number().int().positive(),
  /** Type of gap - NEVER exposed to parents */
  gapType: gapTypeSchema,
})

export type PrivacyGapEvent = z.infer<typeof privacyGapEventSchema>

// ============================================================================
// Child Privacy Gaps Config (for child profile)
// ============================================================================

/**
 * Privacy gaps configuration stored in child profile
 *
 * Added to children/{childId} document
 */
export const childPrivacyGapsConfigSchema = z.object({
  /** Whether privacy gaps are enabled for this child (default: true) */
  enabled: z.boolean(),
  /** Optional custom configuration override */
  customConfig: privacyGapConfigSchema.optional(),
})

export type ChildPrivacyGapsConfig = z.infer<typeof childPrivacyGapsConfigSchema>

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Check if privacy gaps are enabled for a child
 *
 * Returns true by default if config is undefined/null (opt-out model)
 */
export function isPrivacyGapsEnabled(
  config: ChildPrivacyGapsConfig | null | undefined
): boolean {
  if (config === null || config === undefined) {
    return true // ENABLED BY DEFAULT
  }
  return config.enabled
}

/**
 * Validate privacy gap configuration
 */
export function validatePrivacyGapConfig(input: unknown): PrivacyGapConfig {
  return privacyGapConfigSchema.parse(input)
}

/**
 * Safely parse privacy gap configuration
 */
export function safeParsePrivacyGapConfig(input: unknown): PrivacyGapConfig | null {
  const result = privacyGapConfigSchema.safeParse(input)
  return result.success ? result.data : null
}

/**
 * Safely parse privacy gap schedule
 */
export function safeParsePrivacyGapSchedule(input: unknown): PrivacyGapSchedule | null {
  const result = privacyGapScheduleSchema.safeParse(input)
  return result.success ? result.data : null
}

/**
 * Safely parse privacy gap event
 */
export function safeParsePrivacyGapEvent(input: unknown): PrivacyGapEvent | null {
  const result = privacyGapEventSchema.safeParse(input)
  return result.success ? result.data : null
}

/**
 * Check if a gap duration is valid for a given config
 */
export function isGapDurationValid(durationMs: number, config: PrivacyGapConfig): boolean {
  return durationMs >= config.minGapDurationMs && durationMs <= config.maxGapDurationMs
}

/**
 * Check if a gap count is valid for a given config
 */
export function isGapCountValid(count: number, config: PrivacyGapConfig): boolean {
  return count >= config.minDailyGaps && count <= config.maxDailyGaps
}

/**
 * Check if an hour is within waking hours
 */
export function isWithinWakingHours(hour: number, config: PrivacyGapConfig): boolean {
  return hour >= config.wakingHoursStart && hour < config.wakingHoursEnd
}

/**
 * Get effective privacy gap config for a child
 *
 * Uses custom config if provided, otherwise defaults
 */
export function getEffectivePrivacyGapConfig(
  childConfig: ChildPrivacyGapsConfig | null | undefined
): PrivacyGapConfig {
  if (!childConfig) {
    return DEFAULT_PRIVACY_GAP_CONFIG
  }
  return childConfig.customConfig ?? DEFAULT_PRIVACY_GAP_CONFIG
}

/**
 * Convert Firestore schedule to regular schedule
 */
export function convertFirestoreToPrivacyGapSchedule(
  data: PrivacyGapScheduleFirestore
): PrivacyGapSchedule {
  return privacyGapScheduleSchema.parse({
    childId: data.childId,
    date: data.date,
    gaps: data.gaps,
    generatedAt: data.generatedAt.toDate(),
    expiresAt: data.expiresAt.toDate(),
  })
}
