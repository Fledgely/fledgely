/**
 * Rate Limiting Library
 * Story 18.6: View Rate Limiting
 *
 * Provides rate limiting utilities for screenshot viewing.
 */

export {
  checkViewRateLimit,
  getViewCountInWindow,
  getFamilyRateLimitConfig,
  DEFAULT_RATE_LIMIT,
  type RateLimitConfig,
  type RateLimitResult,
} from './screenshot-view-rate'
