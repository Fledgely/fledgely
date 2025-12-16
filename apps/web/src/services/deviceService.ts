'use client'

import {
  doc,
  getDocs,
  collection,
  query,
  where,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { getChildRemovalErrorMessage } from '@fledgely/contracts'

/**
 * Device Service - Firestore operations for device management
 *
 * Follows project guidelines:
 * - Direct Firestore SDK (no abstractions)
 * - Types from Zod schemas
 * - Server timestamps for reliability
 * - Batch operations for atomic updates
 *
 * Story 2.6: Remove Child from Family - Device unenrollment
 */

/** Collection name for device documents */
const DEVICES_COLLECTION = 'devices'

/** Collection name for family documents */
const FAMILIES_COLLECTION = 'families'

/** Subcollection name for audit logs */
const AUDIT_LOG_SUBCOLLECTION = 'auditLog'

/**
 * Custom error class for device service errors
 */
export class DeviceServiceError extends Error {
  constructor(
    public readonly code: string,
    message: string
  ) {
    super(message)
    this.name = 'DeviceServiceError'
  }
}

/**
 * Device document shape (minimal for unenrollment)
 */
export interface DeviceDocument {
  id: string
  childId: string
  familyId: string
  deviceName: string
  deviceType: string
  enrolledAt: Date
  enrolledBy: string
}

/**
 * Result of unenrolling devices for a child
 */
export interface UnenrollDevicesResult {
  success: true
  childId: string
  devicesUnenrolled: number
  deviceNames: string[]
}

/**
 * Get all enrolled devices for a child
 *
 * Story 2.6: Device Unenrollment
 *
 * @param childId - ID of the child to get devices for
 * @returns Array of device documents enrolled for this child
 */
export async function getDevicesForChild(childId: string): Promise<DeviceDocument[]> {
  try {
    if (!childId) {
      return []
    }

    const devicesRef = collection(db, DEVICES_COLLECTION)
    const q = query(devicesRef, where('childId', '==', childId))
    const snapshot = await getDocs(q)

    return snapshot.docs.map((docSnapshot) => {
      const data = docSnapshot.data()
      return {
        id: docSnapshot.id,
        childId: data.childId,
        familyId: data.familyId,
        deviceName: data.deviceName || 'Unknown Device',
        deviceType: data.deviceType || 'unknown',
        enrolledAt: data.enrolledAt?.toDate() || new Date(),
        enrolledBy: data.enrolledBy,
      }
    })
  } catch (error) {
    console.error('[deviceService.getDevicesForChild]', error)
    throw new DeviceServiceError('devices-fetch-failed', 'Could not fetch devices')
  }
}

/**
 * Unenroll all devices for a child
 * DESTRUCTIVE: Deletes device documents and invalidates enrollment tokens
 *
 * Story 2.6: Remove Child from Family - Device unenrollment
 *
 * Uses Firestore batch to atomically:
 * 1. Delete all device documents for the child
 * 2. Create audit log entry for each device unenrolled
 *
 * @param childId - ID of the child whose devices should be unenrolled
 * @param familyId - ID of the family (for audit log)
 * @param userId - Firebase Auth uid of the user performing the action
 * @returns Result with count of devices unenrolled
 */
export async function unenrollDevicesForChild(
  childId: string,
  familyId: string,
  userId: string
): Promise<UnenrollDevicesResult> {
  try {
    if (!childId) {
      throw new DeviceServiceError('invalid-child-id', 'Child ID is required')
    }

    // Get all devices for the child
    const devices = await getDevicesForChild(childId)

    // If no devices, return early with success (nothing to unenroll)
    if (devices.length === 0) {
      return {
        success: true,
        childId,
        devicesUnenrolled: 0,
        deviceNames: [],
      }
    }

    // Create batch for atomic deletion
    const batch = writeBatch(db)
    const deviceNames: string[] = []

    // Delete each device document
    for (const device of devices) {
      const deviceRef = doc(db, DEVICES_COLLECTION, device.id)
      batch.delete(deviceRef)
      deviceNames.push(device.deviceName)
    }

    // Create audit log entry for device unenrollment
    const auditRef = doc(collection(db, FAMILIES_COLLECTION, familyId, AUDIT_LOG_SUBCOLLECTION))
    batch.set(auditRef, {
      id: auditRef.id,
      action: 'devices_unenrolled',
      entityId: childId,
      entityType: 'child',
      metadata: {
        devicesUnenrolled: devices.length,
        deviceNames,
        reason: 'child_removed',
      },
      performedBy: userId,
      performedAt: serverTimestamp(),
    })

    // Commit batch
    await batch.commit()

    return {
      success: true,
      childId,
      devicesUnenrolled: devices.length,
      deviceNames,
    }
  } catch (error) {
    if (error instanceof DeviceServiceError) {
      const message = getChildRemovalErrorMessage('removal-failed')
      console.error('[deviceService.unenrollDevicesForChild]', error)
      throw new Error(message)
    }
    const message = getChildRemovalErrorMessage('default')
    console.error('[deviceService.unenrollDevicesForChild]', error)
    throw new Error(message)
  }
}
