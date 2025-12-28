/**
 * Shared constants for Fledgely application.
 */

export const ERROR_CODES = {
  // Auth
  AUTH_REQUIRED: 'auth/required',
  AUTH_EXPIRED: 'auth/expired',
  // Permission
  PERMISSION_DENIED: 'permission/denied',
  PERMISSION_CHILD_ACCESS: 'permission/child-access',
  // Validation
  VALIDATION_FAILED: 'validation/failed',
  VALIDATION_SCHEMA: 'validation/schema',
  // Resource
  NOT_FOUND: 'resource/not-found',
  CONFLICT: 'resource/conflict',
} as const

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES]

export const QUERY_STALE_TIMES = {
  agreement: 5 * 60 * 1000, // 5 min - rarely changes
  childProfile: 5 * 60 * 1000, // 5 min - stable
  trustScore: 5 * 60 * 1000, // 5 min - matches batch frequency
  activity: 60 * 1000, // 1 min - moderate volatility
  screenshots: 30 * 1000, // 30s - new captures arrive real-time
} as const
