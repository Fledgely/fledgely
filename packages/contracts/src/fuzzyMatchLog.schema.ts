/**
 * Fuzzy Match Log Schema
 *
 * Story 7.5: Fuzzy Domain Matching - Task 4
 *
 * Defines the schema for logging fuzzy matches to improve
 * the allowlist over time. These logs are ANONYMOUS - no
 * user/family/child IDs are stored for privacy.
 */

import { z } from 'zod'

/**
 * Device types that can log fuzzy matches
 */
export const deviceTypeSchema = z.enum(['web', 'extension', 'android', 'ios'])

export type DeviceType = z.infer<typeof deviceTypeSchema>

/**
 * Schema for creating a new fuzzy match log entry
 */
export const fuzzyMatchLogInputSchema = z.object({
  /** The domain the user navigated to (typo'd) */
  inputDomain: z
    .string()
    .min(1, 'Input domain is required')
    .max(255, 'Domain too long')
    .transform((s) => s.toLowerCase().trim()),

  /** The crisis domain it matched against */
  matchedDomain: z
    .string()
    .min(1, 'Matched domain is required')
    .max(255, 'Domain too long')
    .transform((s) => s.toLowerCase().trim()),

  /** Levenshtein distance (1-2 for valid fuzzy matches) */
  distance: z
    .number()
    .int()
    .min(1, 'Distance must be at least 1')
    .max(2, 'Distance cannot exceed 2'),

  /** Device/platform type */
  deviceType: deviceTypeSchema,
})

export type FuzzyMatchLogInput = z.infer<typeof fuzzyMatchLogInputSchema>

/**
 * Schema for a stored fuzzy match log entry (includes server-generated fields)
 */
export const fuzzyMatchLogSchema = z.object({
  /** Unique identifier (UUID) */
  id: z.string().uuid(),

  /** The domain the user navigated to (typo'd) */
  inputDomain: z.string().min(1).max(255),

  /** The crisis domain it matched against */
  matchedDomain: z.string().min(1).max(255),

  /** Levenshtein distance (1-2 for valid fuzzy matches) */
  distance: z.number().int().min(1).max(2),

  /** Device/platform type */
  deviceType: deviceTypeSchema,

  /** ISO datetime when logged */
  timestamp: z.string().datetime(),
})

export type FuzzyMatchLog = z.infer<typeof fuzzyMatchLogSchema>

/**
 * Schema for aggregated fuzzy match stats (for admin view)
 */
export const fuzzyMatchStatsSchema = z.object({
  /** The typo'd domain */
  inputDomain: z.string(),

  /** The matched crisis domain */
  matchedDomain: z.string(),

  /** Average Levenshtein distance */
  avgDistance: z.number(),

  /** Total number of times this match occurred */
  count: z.number().int().min(0),

  /** First time this match was logged */
  firstSeen: z.string().datetime(),

  /** Most recent time this match was logged */
  lastSeen: z.string().datetime(),
})

export type FuzzyMatchStats = z.infer<typeof fuzzyMatchStatsSchema>

/**
 * Rate limit schema for tracking log submissions by IP
 */
export const fuzzyMatchRateLimitSchema = z.object({
  /** IP address (hashed for privacy) */
  ipHash: z.string(),

  /** Date (YYYY-MM-DD) */
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),

  /** Number of logs submitted today */
  count: z.number().int().min(0),
})

export type FuzzyMatchRateLimit = z.infer<typeof fuzzyMatchRateLimitSchema>

/**
 * Constants for rate limiting
 */
export const FUZZY_MATCH_RATE_LIMIT = {
  /** Maximum logs per IP per day */
  MAX_LOGS_PER_DAY: 100,

  /** Firestore collection name for rate limit tracking */
  COLLECTION: 'fuzzy-match-rate-limits',
}

/**
 * Firestore collection name for fuzzy match logs
 */
export const FUZZY_MATCH_LOGS_COLLECTION = 'fuzzy-match-logs'
