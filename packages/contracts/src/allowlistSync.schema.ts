/**
 * Allowlist Sync Schema
 *
 * Story 7.7: Allowlist Distribution & Sync - Task 1
 *
 * Zod schemas for cross-platform crisis allowlist synchronization.
 * Ensures consistent protection across all platforms (web, Chrome extension,
 * Android, iOS) with monitoring for stale caches.
 *
 * CRITICAL: This enables fail-safe allowlist distribution.
 * If any platform has a stale allowlist (>48h), alerts are triggered.
 */

import { z } from 'zod'

/**
 * Platform types for allowlist sync
 *
 * - web: Web application (Next.js)
 * - chrome-extension: Chrome/Chromebook extension (Epic 11)
 * - android: Android app (Epic 14)
 * - ios: iOS app (Epic 43)
 */
export const allowlistPlatformSchema = z.enum([
  'web',
  'chrome-extension',
  'android',
  'ios',
])

export type AllowlistPlatform = z.infer<typeof allowlistPlatformSchema>

/**
 * Sync status for a platform
 *
 * Stored in Firestore: `allowlist-sync-status/{platform}`
 */
export const allowlistSyncStatusSchema = z.object({
  /** Platform identifier */
  platform: allowlistPlatformSchema,

  /** Current allowlist version on this platform */
  version: z.string().min(1, 'Version is required'),

  /** When the last successful sync occurred (ISO 8601) */
  lastSyncAt: z.string().datetime(),

  /** Whether this platform is considered stale (>48h since last sync) */
  isStale: z.boolean(),

  /** Age of the cached allowlist in milliseconds */
  cacheAge: z.number().int().min(0),

  /** Whether this was an emergency version sync */
  isEmergency: z.boolean().default(false),

  /** Device/instance identifier for debugging (optional) */
  deviceId: z.string().optional(),

  /** User agent or platform version for debugging (optional) */
  userAgent: z.string().optional(),
})

export type AllowlistSyncStatus = z.infer<typeof allowlistSyncStatusSchema>

/**
 * Firestore document for sync status
 */
export const allowlistSyncStatusFirestoreSchema = allowlistSyncStatusSchema.extend({
  /** Firestore server timestamp - when document was last updated */
  updatedAt: z.unknown(), // Firestore Timestamp
})

export type AllowlistSyncStatusFirestore = z.infer<typeof allowlistSyncStatusFirestoreSchema>

/**
 * Input schema for reporting sync status
 *
 * POST /api/allowlist-sync-status
 */
export const reportSyncStatusInputSchema = z.object({
  /** Platform reporting sync status */
  platform: allowlistPlatformSchema,

  /** Current version on this platform */
  version: z.string().min(1, 'Version is required'),

  /** Age of the cached allowlist in milliseconds */
  cacheAge: z.number().int().min(0),

  /** Whether this was an emergency version sync */
  isEmergency: z.boolean().default(false),

  /** Device/instance identifier for debugging (optional) */
  deviceId: z.string().optional(),

  /** User agent or platform version for debugging (optional) */
  userAgent: z.string().optional(),
})

export type ReportSyncStatusInput = z.infer<typeof reportSyncStatusInputSchema>

/**
 * Alert schema for stale platforms
 *
 * Generated when any platform exceeds the staleness threshold (48h).
 */
export const allowlistSyncAlertSchema = z.object({
  /** Alert identifier (UUID v4) */
  id: z.string().uuid(),

  /** Platform that is stale */
  platform: allowlistPlatformSchema,

  /** Version the platform last reported */
  lastVersion: z.string(),

  /** When the platform last synced (ISO 8601) */
  lastSyncAt: z.string().datetime(),

  /** How stale the platform is (milliseconds since last sync) */
  staleDuration: z.number().int().min(0),

  /** When this alert was created (ISO 8601) */
  alertedAt: z.string().datetime(),

  /** Whether this alert has been acknowledged/resolved */
  resolved: z.boolean().default(false),

  /** When the alert was resolved (ISO 8601) - optional */
  resolvedAt: z.string().datetime().optional(),

  /** Who/what resolved the alert - optional */
  resolvedBy: z.string().optional(),
})

export type AllowlistSyncAlert = z.infer<typeof allowlistSyncAlertSchema>

/**
 * Alert Firestore schema
 */
export const allowlistSyncAlertFirestoreSchema = allowlistSyncAlertSchema.extend({
  /** Firestore server timestamp - when document was created */
  createdAt: z.unknown(), // Firestore Timestamp
  /** Firestore server timestamp - when document was last updated */
  updatedAt: z.unknown(), // Firestore Timestamp
})

export type AllowlistSyncAlertFirestore = z.infer<typeof allowlistSyncAlertFirestoreSchema>

/**
 * Response schema for sync status report
 */
export const reportSyncStatusResponseSchema = z.object({
  /** Whether the report was accepted */
  success: z.boolean(),

  /** Server's current version (for comparison) */
  serverVersion: z.string(),

  /** Whether the client should re-sync immediately */
  shouldResync: z.boolean(),

  /** Message for logging/debugging */
  message: z.string(),
})

export type ReportSyncStatusResponse = z.infer<typeof reportSyncStatusResponseSchema>

/**
 * Response schema for getting all platform sync statuses (admin endpoint)
 */
export const getAllSyncStatusesResponseSchema = z.object({
  /** Sync statuses for all platforms */
  statuses: z.array(allowlistSyncStatusSchema),

  /** Platforms that are currently stale */
  stalePlatforms: z.array(allowlistPlatformSchema),

  /** Current server allowlist version */
  serverVersion: z.string(),

  /** When this report was generated (ISO 8601) */
  generatedAt: z.string().datetime(),
})

export type GetAllSyncStatusesResponse = z.infer<typeof getAllSyncStatusesResponseSchema>

/**
 * Constants for sync operations
 */
export const ALLOWLIST_SYNC_CONSTANTS = {
  /** Normal cache TTL in milliseconds (24 hours) */
  NORMAL_TTL_MS: 24 * 60 * 60 * 1000,

  /** Emergency cache TTL in milliseconds (1 hour) */
  EMERGENCY_TTL_MS: 60 * 60 * 1000,

  /** Network timeout in milliseconds */
  NETWORK_TIMEOUT_MS: 5000,

  /** Staleness threshold in milliseconds (48 hours) */
  STALENESS_THRESHOLD_MS: 48 * 60 * 60 * 1000,

  /** Monitoring check interval in milliseconds (12 hours) */
  MONITORING_INTERVAL_MS: 12 * 60 * 60 * 1000,

  /** Maximum retry attempts for network failures */
  MAX_RETRY_ATTEMPTS: 2,

  /** Delay between retry attempts in milliseconds */
  RETRY_DELAY_MS: 1000,

  /** Rate limit: 1 status report per platform per hour */
  RATE_LIMIT_WINDOW_MS: 60 * 60 * 1000,

  /** API endpoint for allowlist */
  ALLOWLIST_ENDPOINT: '/api/crisis-allowlist',

  /** API endpoint for sync status reporting */
  SYNC_STATUS_ENDPOINT: '/api/allowlist-sync-status',

  /** Firestore collection for sync status */
  SYNC_STATUS_COLLECTION: 'allowlist-sync-status',

  /** Firestore collection for sync alerts */
  SYNC_ALERTS_COLLECTION: 'allowlist-sync-alerts',
} as const

/**
 * Platform labels for UI display
 */
export const ALLOWLIST_PLATFORM_LABELS: Record<AllowlistPlatform, string> = {
  web: 'Web Application',
  'chrome-extension': 'Chrome Extension',
  android: 'Android App',
  ios: 'iOS App',
}

/**
 * Platform descriptions for UI display
 */
export const ALLOWLIST_PLATFORM_DESCRIPTIONS: Record<AllowlistPlatform, string> = {
  web: 'Next.js web application for parents and families',
  'chrome-extension': 'Chrome/Chromebook extension for device monitoring',
  android: 'Android app for device monitoring',
  ios: 'iOS app for device monitoring',
}

/**
 * Get display label for platform
 */
export function getAllowlistPlatformLabel(platform: AllowlistPlatform): string {
  return ALLOWLIST_PLATFORM_LABELS[platform]
}

/**
 * Get description for platform
 */
export function getAllowlistPlatformDescription(platform: AllowlistPlatform): string {
  return ALLOWLIST_PLATFORM_DESCRIPTIONS[platform]
}

/**
 * Check if a sync status is considered stale
 *
 * @param lastSyncAt - ISO 8601 timestamp of last sync
 * @returns true if more than 48 hours since last sync
 */
export function isSyncStatusStale(lastSyncAt: string): boolean {
  const lastSync = new Date(lastSyncAt).getTime()
  const now = Date.now()
  return now - lastSync > ALLOWLIST_SYNC_CONSTANTS.STALENESS_THRESHOLD_MS
}

/**
 * Calculate staleness duration in milliseconds
 *
 * @param lastSyncAt - ISO 8601 timestamp of last sync
 * @returns Milliseconds since last sync
 */
export function calculateStaleDuration(lastSyncAt: string): number {
  const lastSync = new Date(lastSyncAt).getTime()
  return Date.now() - lastSync
}

/**
 * Format staleness duration for display
 *
 * @param durationMs - Duration in milliseconds
 * @returns Human-readable duration string
 */
export function formatStaleDuration(durationMs: number): string {
  const hours = Math.floor(durationMs / (60 * 60 * 1000))
  const days = Math.floor(hours / 24)

  if (days > 0) {
    const remainingHours = hours % 24
    return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days}d`
  }

  return `${hours}h`
}

/**
 * Get appropriate TTL based on version type
 *
 * @param version - Allowlist version string
 * @returns TTL in milliseconds
 */
export function getTTLForVersion(version: string): number {
  // Emergency versions use shorter TTL
  if (version.includes('-emergency-')) {
    return ALLOWLIST_SYNC_CONSTANTS.EMERGENCY_TTL_MS
  }
  return ALLOWLIST_SYNC_CONSTANTS.NORMAL_TTL_MS
}

/**
 * Check if a cache should be refreshed based on age and version
 *
 * @param cacheAge - Current cache age in milliseconds
 * @param version - Cached version string
 * @returns true if cache should be refreshed
 */
export function shouldRefreshCache(cacheAge: number, version: string): boolean {
  const ttl = getTTLForVersion(version)
  return cacheAge > ttl
}

/**
 * Create a sync status object
 *
 * @param platform - Platform identifier
 * @param version - Current version
 * @param cacheAge - Cache age in milliseconds
 * @param isEmergency - Whether this is an emergency version
 * @returns AllowlistSyncStatus object
 */
export function createSyncStatus(
  platform: AllowlistPlatform,
  version: string,
  cacheAge: number,
  isEmergency: boolean = false
): AllowlistSyncStatus {
  const now = new Date().toISOString()
  return {
    platform,
    version,
    lastSyncAt: now,
    isStale: false, // Just synced, so not stale
    cacheAge,
    isEmergency,
  }
}

/**
 * Safe parse for sync status
 */
export function safeParseSyncStatus(data: unknown): AllowlistSyncStatus | null {
  const result = allowlistSyncStatusSchema.safeParse(data)
  return result.success ? result.data : null
}

/**
 * Safe parse for sync alert
 */
export function safeParseSyncAlert(data: unknown): AllowlistSyncAlert | null {
  const result = allowlistSyncAlertSchema.safeParse(data)
  return result.success ? result.data : null
}

/**
 * Validate report sync status input
 */
export function validateReportSyncStatusInput(data: unknown): ReportSyncStatusInput {
  return reportSyncStatusInputSchema.parse(data)
}

/**
 * Safe parse for report sync status input
 */
export function safeParseReportSyncStatusInput(
  data: unknown
): ReportSyncStatusInput | null {
  const result = reportSyncStatusInputSchema.safeParse(data)
  return result.success ? result.data : null
}
