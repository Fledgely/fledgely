/**
 * Firestore trigger for device permission changes
 *
 * Story 41.4: Device Sync Status Notifications - AC5
 *
 * Triggers when device permissions are modified to send immediate notifications.
 * Permission revoked notifications BYPASS quiet hours (critical, action required).
 */

import { onDocumentUpdated } from 'firebase-functions/v2/firestore'
import * as logger from 'firebase-functions/logger'
import {
  sendPermissionRevokedNotification,
  sendSyncRestoredNotification,
} from '../lib/notifications/deviceSyncNotification'

/**
 * Device document structure (subset of fields needed for permission detection)
 */
interface DeviceData {
  name?: string
  deviceName?: string
  childId?: string
  ownerId?: string
  status?: 'active' | 'offline' | 'unenrolled'
  extensionPermissions?: {
    tabs?: boolean
    history?: boolean
    webNavigation?: boolean
    contentScripts?: boolean
    storage?: boolean
  }
  permissionsGranted?: boolean
}

/**
 * Check if extension permissions have been reduced
 *
 * Returns true if any required permission was revoked.
 */
export function hasPermissionsReduced(
  before: DeviceData | undefined,
  after: DeviceData | undefined
): boolean {
  if (!before || !after) return false

  // Check permissionsGranted field (simple case)
  if (before.permissionsGranted === true && after.permissionsGranted === false) {
    return true
  }

  // Check detailed extension permissions
  const beforePerms = before.extensionPermissions
  const afterPerms = after.extensionPermissions

  if (!beforePerms || !afterPerms) {
    return false
  }

  // Check each critical permission
  const criticalPermissions: (keyof NonNullable<DeviceData['extensionPermissions']>)[] = [
    'tabs',
    'history',
    'webNavigation',
    'contentScripts',
  ]

  for (const perm of criticalPermissions) {
    if (beforePerms[perm] === true && afterPerms[perm] === false) {
      return true
    }
  }

  return false
}

/**
 * Check if extension permissions have been restored
 *
 * Returns true if permissions went from reduced to fully granted.
 */
export function hasPermissionsRestored(
  before: DeviceData | undefined,
  after: DeviceData | undefined
): boolean {
  if (!before || !after) return false

  // Check permissionsGranted field
  if (before.permissionsGranted === false && after.permissionsGranted === true) {
    return true
  }

  return false
}

/**
 * Extract device name from data with fallbacks
 */
function getDeviceName(data: DeviceData | undefined): string {
  return data?.name || data?.deviceName || 'Unknown Device'
}

/**
 * Extract child ID from data with fallbacks
 */
function getChildId(data: DeviceData | undefined): string {
  return data?.childId || data?.ownerId || ''
}

/**
 * Firestore trigger: Device Permission Change
 *
 * Watches for changes to device documents and detects permission modifications.
 * Sends immediate notification when permissions are reduced (bypasses quiet hours).
 */
export const onDevicePermissionChange = onDocumentUpdated(
  {
    document: 'families/{familyId}/devices/{deviceId}',
    region: 'us-central1',
    memory: '256MiB',
    timeoutSeconds: 60,
  },
  async (event) => {
    const { familyId, deviceId } = event.params

    if (!event.data) {
      logger.warn('No data in permission change event', { familyId, deviceId })
      return
    }

    const beforeData = event.data.before.data() as DeviceData | undefined
    const afterData = event.data.after.data() as DeviceData | undefined

    const deviceName = getDeviceName(afterData) || getDeviceName(beforeData)
    const childId = getChildId(afterData) || getChildId(beforeData)

    logger.info('Processing device permission change', {
      familyId,
      deviceId,
      deviceName,
      childId,
    })

    // Check for permission reduction (critical - send immediate notification)
    if (hasPermissionsReduced(beforeData, afterData)) {
      logger.info('Extension permissions reduced, sending notification', {
        familyId,
        deviceId,
        deviceName,
      })

      try {
        const result = await sendPermissionRevokedNotification({
          deviceId,
          deviceName,
          familyId,
          childId,
        })

        logger.info('Permission revoked notification sent', {
          familyId,
          deviceId,
          parentsNotified: result.parentsNotified,
          notificationGenerated: result.notificationGenerated,
        })
      } catch (error) {
        logger.error('Failed to send permission revoked notification', {
          familyId,
          deviceId,
          error: error instanceof Error ? error.message : String(error),
        })
      }

      return
    }

    // Check for permission restoration (optional notification)
    if (hasPermissionsRestored(beforeData, afterData)) {
      logger.info('Extension permissions restored', {
        familyId,
        deviceId,
        deviceName,
      })

      try {
        const result = await sendSyncRestoredNotification({
          deviceId,
          deviceName,
          familyId,
          childId,
        })

        logger.info('Permission restored notification sent', {
          familyId,
          deviceId,
          parentsNotified: result.parentsNotified,
          notificationGenerated: result.notificationGenerated,
        })
      } catch (error) {
        logger.error('Failed to send permission restored notification', {
          familyId,
          deviceId,
          error: error instanceof Error ? error.message : String(error),
        })
      }

      return
    }

    // No permission change detected
    logger.debug('No permission change detected', { familyId, deviceId })
  }
)
