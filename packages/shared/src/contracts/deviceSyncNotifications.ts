/**
 * Device Sync Notification Schemas
 *
 * Story 41.4: Device Sync Status Notifications
 *
 * Schemas for device sync status notifications:
 * - Sync timeout notifications when device hasn't synced
 * - Permission revoked alerts (critical)
 * - Sync restored notifications (optional)
 */

import { z } from 'zod'
import { syncThresholdHoursSchema, type SyncThresholdHours } from './notificationPreferences'

// Re-export for convenience
export { syncThresholdHoursSchema, type SyncThresholdHours }

/**
 * Default sync threshold in hours
 */
export const DEFAULT_SYNC_THRESHOLD_HOURS: SyncThresholdHours = 4

// ============================================================================
// Notification Type Schema
// ============================================================================

/**
 * Types of device sync notifications
 */
export const deviceSyncNotificationTypeSchema = z.enum([
  'sync_timeout', // Device hasn't synced in threshold
  'permission_revoked', // Extension permissions changed (critical)
  'sync_restored', // Device is syncing again (optional)
])

export type DeviceSyncNotificationType = z.infer<typeof deviceSyncNotificationTypeSchema>

// ============================================================================
// Notification Event Schema
// ============================================================================

/**
 * Device sync notification event (for logging/tracking)
 */
export const deviceSyncNotificationEventSchema = z.object({
  id: z.string().min(1),
  type: deviceSyncNotificationTypeSchema,
  deviceId: z.string().min(1),
  deviceName: z.string().min(1),
  familyId: z.string().min(1),
  childId: z.string().min(1),
  lastSyncAt: z.number(),
  thresholdHours: syncThresholdHoursSchema.optional(),
  createdAt: z.number(),
})

export type DeviceSyncNotificationEvent = z.infer<typeof deviceSyncNotificationEventSchema>

// ============================================================================
// Notification Content Schema
// ============================================================================

/**
 * Notification content for FCM
 */
export const deviceSyncNotificationContentSchema = z.object({
  title: z.string().min(1),
  body: z.string().min(1),
  data: z.object({
    type: deviceSyncNotificationTypeSchema,
    deviceId: z.string().min(1),
    familyId: z.string().min(1),
    childId: z.string().min(1),
    action: z.enum(['view_device', 'check_permissions', 'dismiss']),
  }),
})

export type DeviceSyncNotificationContent = z.infer<typeof deviceSyncNotificationContentSchema>

// ============================================================================
// Notification Status Schema (for deduplication)
// ============================================================================

/**
 * Track notification status per device to prevent spam
 */
export const deviceNotificationStatusSchema = z.object({
  deviceId: z.string().min(1),
  lastSyncTimeoutNotifiedAt: z.number().optional(),
  lastSyncTimeoutThreshold: syncThresholdHoursSchema.optional(),
  lastPermissionRevokedNotifiedAt: z.number().optional(),
  lastSyncRestoredNotifiedAt: z.number().optional(),
  isOffline: z.boolean(),
  updatedAt: z.number(),
})

export type DeviceNotificationStatus = z.infer<typeof deviceNotificationStatusSchema>

// ============================================================================
// Helper Function Parameters
// ============================================================================

/**
 * Parameters for building sync timeout notification
 */
export interface SyncTimeoutParams {
  deviceId: string
  deviceName: string
  familyId: string
  childId: string
  lastSyncAt: number
  thresholdHours: SyncThresholdHours
}

/**
 * Parameters for building permission revoked notification
 */
export interface PermissionRevokedParams {
  deviceId: string
  deviceName: string
  familyId: string
  childId: string
}

/**
 * Parameters for building sync restored notification
 */
export interface SyncRestoredParams {
  deviceId: string
  deviceName: string
  familyId: string
  childId: string
}

// ============================================================================
// Content Builder Functions
// ============================================================================

/**
 * Format hours for display
 */
function formatHours(hours: number): string {
  if (hours === 1) {
    return '1 hour'
  }
  return `${hours} hours`
}

/**
 * Format time since last sync
 */
function formatTimeSinceSync(lastSyncAt: number): string {
  const now = Date.now()
  const diffMs = now - lastSyncAt
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))

  if (diffHours === 0) {
    return `${diffMinutes} minutes`
  }
  if (diffHours === 1) {
    return '1 hour'
  }
  if (diffHours < 24) {
    return `${diffHours} hours`
  }
  const diffDays = Math.floor(diffHours / 24)
  if (diffDays === 1) {
    return '1 day'
  }
  return `${diffDays} days`
}

/**
 * Build notification content for sync timeout
 */
export function buildSyncTimeoutContent(params: SyncTimeoutParams): DeviceSyncNotificationContent {
  const { deviceName, deviceId, familyId, childId, thresholdHours } = params

  return {
    title: 'Device Sync Issue',
    body: `${deviceName} hasn't synced in ${formatHours(thresholdHours)}`,
    data: {
      type: 'sync_timeout',
      deviceId,
      familyId,
      childId,
      action: 'view_device',
    },
  }
}

/**
 * Build notification content for permission revoked (critical)
 */
export function buildPermissionRevokedContent(
  params: PermissionRevokedParams
): DeviceSyncNotificationContent {
  const { deviceName, deviceId, familyId, childId } = params

  return {
    title: 'Extension Permissions Changed',
    body: `${deviceName} extension permissions may have been modified`,
    data: {
      type: 'permission_revoked',
      deviceId,
      familyId,
      childId,
      action: 'check_permissions',
    },
  }
}

/**
 * Build notification content for sync restored
 */
export function buildSyncRestoredContent(
  params: SyncRestoredParams
): DeviceSyncNotificationContent {
  const { deviceName, deviceId, familyId, childId } = params

  return {
    title: 'Device Back Online',
    body: `${deviceName} is syncing again`,
    data: {
      type: 'sync_restored',
      deviceId,
      familyId,
      childId,
      action: 'dismiss',
    },
  }
}

/**
 * Build detailed notification content with time since last sync
 */
export function buildDetailedSyncTimeoutContent(
  params: SyncTimeoutParams
): DeviceSyncNotificationContent {
  const { deviceName, deviceId, familyId, childId, lastSyncAt } = params
  const timeSince = formatTimeSinceSync(lastSyncAt)

  return {
    title: 'Device Sync Issue',
    body: `${deviceName} hasn't synced in ${timeSince}. Tap to troubleshoot.`,
    data: {
      type: 'sync_timeout',
      deviceId,
      familyId,
      childId,
      action: 'view_device',
    },
  }
}
