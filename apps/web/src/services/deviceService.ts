/**
 * Device Service - Story 12.5, 12.6
 *
 * Client-side service for device operations via Cloud Functions.
 * Follows existing service patterns from enrollmentService.ts.
 *
 * Requirements:
 * - Story 12.5 AC3: Assignment updates device document with childId
 * - Story 12.5 AC5: Device can be reassigned to different child
 * - Story 12.6 AC6: Explicit device removal
 */

import { getFunctions, httpsCallable } from 'firebase/functions'
import { getFirebaseApp } from '../lib/firebase'

/**
 * Response from assignDeviceToChild Cloud Function
 */
interface AssignDeviceResponse {
  success: boolean
  message: string
}

/**
 * Assign a device to a child (or unassign by passing null).
 * Calls the assignDeviceToChild Cloud Function.
 *
 * Task 4: Assignment Service (AC: #3, #5)
 * - 4.1 Create assignDeviceToChild function
 * - 4.2 Handle optimistic updates (handled by component)
 * - 4.3 Revert on failure (handled by component)
 *
 * @param familyId - The family ID
 * @param deviceId - The device ID to assign
 * @param childId - The child ID to assign to, or null to unassign
 * @returns Promise with success status and message
 * @throws Error if the function call fails
 */
export async function assignDeviceToChild(
  familyId: string,
  deviceId: string,
  childId: string | null
): Promise<AssignDeviceResponse> {
  if (!familyId) {
    throw new Error('familyId is required')
  }
  if (!deviceId) {
    throw new Error('deviceId is required')
  }

  const app = getFirebaseApp()
  const functions = getFunctions(app)
  const assignFn = httpsCallable<
    { familyId: string; deviceId: string; childId: string | null },
    AssignDeviceResponse
  >(functions, 'assignDeviceToChild')

  const result = await assignFn({ familyId, deviceId, childId })
  return result.data
}

/**
 * Response from removeDevice Cloud Function
 */
interface RemoveDeviceResponse {
  success: boolean
  message: string
}

/**
 * Remove a device from the family.
 * Calls the removeDevice Cloud Function.
 *
 * Story 12.6 Task 5: Device Removal Flow (AC: #6)
 *
 * @param familyId - The family ID
 * @param deviceId - The device ID to remove
 * @returns Promise with success status and message
 * @throws Error if the function call fails
 */
export async function removeDevice(
  familyId: string,
  deviceId: string
): Promise<RemoveDeviceResponse> {
  if (!familyId) {
    throw new Error('familyId is required')
  }
  if (!deviceId) {
    throw new Error('deviceId is required')
  }

  const app = getFirebaseApp()
  const functions = getFunctions(app)
  const removeFn = httpsCallable<{ familyId: string; deviceId: string }, RemoveDeviceResponse>(
    functions,
    'removeDevice'
  )

  const result = await removeFn({ familyId, deviceId })
  return result.data
}
