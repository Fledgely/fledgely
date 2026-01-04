/**
 * Trusted Device Management Callable Functions
 *
 * Story 41.5: New Login Notifications
 * - AC2: Trusted device management
 *
 * Provides callable functions to manage trusted devices:
 * - Get list of trusted devices
 * - Mark a device as trusted
 * - Remove a device from trusted list
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https'
import * as logger from 'firebase-functions/logger'
import {
  addTrustedDeviceInputSchema,
  removeTrustedDeviceInputSchema,
  type TrustedDevice,
} from '@fledgely/shared'
import {
  getTrustedDevices as getDevices,
  markDeviceAsTrusted,
  removeTrustedDevice as removeDevice,
} from '../lib/sessions/loginSessionTracker'

// ============================================
// Response Types
// ============================================

/** Response for getTrustedDevices */
export interface GetTrustedDevicesResponse {
  success: boolean
  devices: TrustedDevice[]
}

/** Response for addTrustedDevice */
export interface AddTrustedDeviceResponse {
  success: boolean
  device: TrustedDevice
}

/** Response for removeTrustedDevice */
export interface RemoveTrustedDeviceResponse {
  success: boolean
}

// ============================================
// Callable Functions
// ============================================

/**
 * Get all trusted devices for the current user.
 *
 * Returns a list of devices that have been marked as trusted.
 * Trusted devices do not trigger new login notifications.
 */
export const getTrustedDevicesCallable = onCall(
  { cors: true },
  async (request): Promise<GetTrustedDevicesResponse> => {
    // Verify authentication
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Must be logged in')
    }

    const callerUid = request.auth.uid

    logger.info('Getting trusted devices', { userId: callerUid })

    try {
      const devices = await getDevices(callerUid)

      return {
        success: true,
        devices,
      }
    } catch (error) {
      logger.error('Failed to get trusted devices', { userId: callerUid, error })
      throw new HttpsError('internal', 'Failed to get trusted devices')
    }
  }
)

/**
 * Mark a device as trusted (AC2).
 *
 * Adds a device fingerprint to the user's trusted devices list.
 * Trusted devices will not trigger new login notifications.
 *
 * @param fingerprintId - The fingerprint ID to mark as trusted
 * @param deviceName - Optional custom name for the device
 */
export const addTrustedDeviceCallable = onCall(
  { cors: true },
  async (request): Promise<AddTrustedDeviceResponse> => {
    // Verify authentication
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Must be logged in')
    }

    const callerUid = request.auth.uid

    // Validate input
    const parseResult = addTrustedDeviceInputSchema.safeParse(request.data)
    if (!parseResult.success) {
      throw new HttpsError('invalid-argument', 'Invalid input: ' + parseResult.error.message)
    }

    const { fingerprintId, deviceName } = parseResult.data

    logger.info('Adding trusted device', { userId: callerUid, fingerprintId })

    try {
      const device = await markDeviceAsTrusted(callerUid, fingerprintId, deviceName ?? undefined)

      logger.info('Device marked as trusted', {
        userId: callerUid,
        fingerprintId,
        deviceName: device.deviceName,
      })

      return {
        success: true,
        device,
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes('not found')) {
        throw new HttpsError('not-found', 'Device fingerprint not found')
      }
      logger.error('Failed to add trusted device', { userId: callerUid, fingerprintId, error })
      throw new HttpsError('internal', 'Failed to add trusted device')
    }
  }
)

/**
 * Remove a device from the trusted list.
 *
 * Removes a device fingerprint from the user's trusted devices list.
 * Future logins from this device will trigger new login notifications.
 *
 * @param fingerprintId - The fingerprint ID to remove from trusted list
 */
export const removeTrustedDeviceCallable = onCall(
  { cors: true },
  async (request): Promise<RemoveTrustedDeviceResponse> => {
    // Verify authentication
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Must be logged in')
    }

    const callerUid = request.auth.uid

    // Validate input
    const parseResult = removeTrustedDeviceInputSchema.safeParse(request.data)
    if (!parseResult.success) {
      throw new HttpsError('invalid-argument', 'Invalid input: ' + parseResult.error.message)
    }

    const { fingerprintId } = parseResult.data

    logger.info('Removing trusted device', { userId: callerUid, fingerprintId })

    try {
      await removeDevice(callerUid, fingerprintId)

      logger.info('Trusted device removed', { userId: callerUid, fingerprintId })

      return {
        success: true,
      }
    } catch (error) {
      logger.error('Failed to remove trusted device', { userId: callerUid, fingerprintId, error })
      throw new HttpsError('internal', 'Failed to remove trusted device')
    }
  }
)
