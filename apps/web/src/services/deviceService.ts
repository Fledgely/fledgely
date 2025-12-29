/**
 * Device Service - Story 12.5
 *
 * Client-side service for device operations via Cloud Functions.
 * Follows existing service patterns from enrollmentService.ts.
 *
 * Requirements:
 * - AC3: Assignment updates device document with childId
 * - AC5: Device can be reassigned to different child
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
