/**
 * Crisis Protection Schema
 *
 * Story 7.2: Crisis Visit Zero-Data-Path - Task 7.2
 *
 * Type definitions for crisis protection functionality.
 * These types are used across the platform to ensure consistent
 * crisis URL handling.
 *
 * CRITICAL: INV-001 - Crisis URLs NEVER captured
 */

import { z } from 'zod'

/**
 * Crisis URL check result
 *
 * Result of checking a URL against the crisis allowlist.
 */
export const crisisCheckResultSchema = z.object({
  /** Whether this is a crisis URL that should block monitoring */
  isCrisisUrl: z.boolean(),

  /** The URL that was checked */
  url: z.string(),

  /** Time taken to perform the check in milliseconds */
  checkDurationMs: z.number().optional(),
})

export type CrisisCheckResult = z.infer<typeof crisisCheckResultSchema>

/**
 * Crisis protection status
 *
 * Status of crisis protection for a monitoring session.
 */
export const crisisProtectionStatusSchema = z.object({
  /** Whether crisis protection is currently active (blocking) */
  isActive: z.boolean(),

  /** The current URL being checked */
  currentUrl: z.string().optional(),

  /** Timestamp when protection was activated */
  activatedAt: z.date().optional(),
})

export type CrisisProtectionStatus = z.infer<typeof crisisProtectionStatusSchema>

/**
 * Monitoring action types that can be blocked
 */
export const monitoringActionSchema = z.enum([
  'screenshot',
  'url_logging',
  'time_tracking',
  'notification',
  'analytics',
  'all',
])

export type MonitoringAction = z.infer<typeof monitoringActionSchema>

/**
 * Blocking decision for a monitoring action
 */
export const blockingDecisionSchema = z.object({
  /** The monitoring action being evaluated */
  action: monitoringActionSchema,

  /** Whether the action should be blocked */
  blocked: z.boolean(),

  /** Reason for blocking (only set when blocked=true) */
  reason: z.string().optional(),

  /** The URL that triggered the block */
  triggerUrl: z.string().optional(),
})

export type BlockingDecision = z.infer<typeof blockingDecisionSchema>

/**
 * Crisis guard configuration
 *
 * Configuration for platform-specific crisis guard implementations.
 */
export const crisisGuardConfigSchema = z.object({
  /** Whether crisis protection is enabled */
  enabled: z.boolean().default(true),

  /** Whether to use bundled allowlist as fallback */
  useBundledFallback: z.boolean().default(true),

  /** Network timeout for allowlist refresh in milliseconds */
  networkTimeoutMs: z.number().default(5000),

  /** Cache TTL in milliseconds */
  cacheTtlMs: z.number().default(24 * 60 * 60 * 1000),
})

export type CrisisGuardConfig = z.infer<typeof crisisGuardConfigSchema>

/**
 * Cache status for the crisis allowlist
 */
export const allowlistCacheStatusSchema = z.object({
  /** Whether cache exists and is valid */
  isValid: z.boolean(),

  /** Age of cache in milliseconds */
  ageMs: z.number().nullable(),

  /** Cached allowlist version */
  version: z.string().nullable(),

  /** Source of current data (network, cache, bundled) */
  source: z.enum(['network', 'cache', 'bundled']),
})

export type AllowlistCacheStatus = z.infer<typeof allowlistCacheStatusSchema>

/**
 * Platform guard interface for cross-platform implementation
 *
 * Native platforms should implement this interface to ensure
 * consistent crisis protection across all platforms.
 *
 * FR62: Allowlist synchronized across platforms
 */
export const platformGuardInterfaceSchema = z.object({
  /** Check if screenshot should be blocked */
  shouldBlockScreenshot: z.function(z.tuple([z.string()]), z.boolean()),

  /** Check if URL logging should be blocked */
  shouldBlockUrlLogging: z.function(z.tuple([z.string()]), z.boolean()),

  /** Check if time tracking should be blocked */
  shouldBlockTimeTracking: z.function(z.tuple([z.string()]), z.boolean()),

  /** Check if notification should be blocked */
  shouldBlockNotification: z.function(z.tuple([z.string()]), z.boolean()),

  /** Check if analytics should be blocked */
  shouldBlockAnalytics: z.function(z.tuple([z.string()]), z.boolean()),

  /** Master check - blocks all monitoring */
  shouldBlockAll: z.function(z.tuple([z.string()]), z.boolean()),
})

/**
 * API response for crisis allowlist endpoint
 */
export const crisisAllowlistResponseSchema = z.object({
  /** Allowlist version for cache validation */
  version: z.string(),

  /** ISO timestamp of last update */
  lastUpdated: z.string(),

  /** Array of crisis resource entries */
  entries: z.array(
    z.object({
      id: z.string(),
      domain: z.string(),
      category: z.string(),
      aliases: z.array(z.string()),
      wildcardPatterns: z.array(z.string()),
      name: z.string(),
      description: z.string(),
      region: z.string(),
      contactMethods: z.array(z.string()),
    })
  ),
})

export type CrisisAllowlistResponse = z.infer<typeof crisisAllowlistResponseSchema>

/**
 * API error response for crisis allowlist endpoint
 */
export const crisisAllowlistErrorSchema = z.object({
  error: z.string(),
  message: z.string(),
  retryAfter: z.number().optional(),
})

export type CrisisAllowlistError = z.infer<typeof crisisAllowlistErrorSchema>
