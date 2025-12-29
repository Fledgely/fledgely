/**
 * Device Service - Story 12.5, 12.6, 13.2
 *
 * Client-side service for device operations via Cloud Functions.
 * Follows existing service patterns from enrollmentService.ts.
 *
 * Requirements:
 * - Story 12.5 AC3: Assignment updates device document with childId
 * - Story 12.5 AC5: Device can be reassigned to different child
 * - Story 12.6 AC6: Explicit device removal
 * - Story 13.2 AC2: Fetch device TOTP secret for emergency code display
 */

import { getFunctions, httpsCallable } from 'firebase/functions'
import {
  getFirestore,
  doc,
  getDoc,
  collection,
  addDoc,
  serverTimestamp,
  updateDoc,
  increment,
} from 'firebase/firestore'
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

/**
 * Device document structure (partial - fields relevant to TOTP)
 */
interface DeviceDocument {
  deviceId: string
  name: string
  totpSecret?: string
  totpCreatedAt?: { seconds: number; nanoseconds: number }
  totpAlgorithm?: 'SHA1'
  totpDigits?: 6
  totpPeriod?: 30
}

/**
 * Result from getDeviceTotpSecret
 */
interface DeviceTotpResult {
  totpSecret: string
  deviceName: string
}

/**
 * Get the TOTP secret for a device.
 * Reads directly from Firestore (guardians have read access per security rules).
 *
 * Story 13.2 Task 4: Device Service Extension (AC: #2)
 *
 * @param familyId - The family ID
 * @param deviceId - The device ID
 * @returns Promise with TOTP secret and device name
 * @throws Error if device not found or no TOTP secret
 */
export async function getDeviceTotpSecret(
  familyId: string,
  deviceId: string
): Promise<DeviceTotpResult> {
  if (!familyId) {
    throw new Error('familyId is required')
  }
  if (!deviceId) {
    throw new Error('deviceId is required')
  }

  const app = getFirebaseApp()
  const db = getFirestore(app)

  // Read device document from /families/{familyId}/devices/{deviceId}
  const deviceRef = doc(db, 'families', familyId, 'devices', deviceId)
  const deviceSnap = await getDoc(deviceRef)

  if (!deviceSnap.exists()) {
    throw new Error('Device not found')
  }

  const data = deviceSnap.data() as DeviceDocument

  if (!data.totpSecret) {
    throw new Error('Device does not have TOTP secret configured')
  }

  return {
    totpSecret: data.totpSecret,
    deviceName: data.name || `Device ${deviceId.slice(0, 8)}`,
  }
}

/**
 * Log an emergency code view event to the audit trail.
 * Story 13.2 Task 5: Audit Trail Logging (AC: #5)
 *
 * @param familyId - The family ID
 * @param deviceId - The device ID
 * @param viewerUid - The UID of the user viewing the code
 * @returns Promise that resolves when log is written
 */
export async function logEmergencyCodeView(
  familyId: string,
  deviceId: string,
  viewerUid: string
): Promise<void> {
  if (!familyId || !deviceId || !viewerUid) {
    throw new Error('familyId, deviceId, and viewerUid are required')
  }

  const app = getFirebaseApp()
  const db = getFirestore(app)

  // Write to /auditLogs collection
  // Security rules allow guardians to write logs for their own views
  const auditLogsRef = collection(db, 'auditLogs')
  await addDoc(auditLogsRef, {
    type: 'emergency_code_viewed',
    familyId,
    deviceId,
    viewerUid,
    timestamp: serverTimestamp(),
  })
}

/**
 * Base32 alphabet for secret generation (RFC 4648)
 */
const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'

/**
 * Generate a cryptographically random Base32 secret
 * Story 13.6 Task 2.2: Generate new Base32 secret
 *
 * @param length - Length in bytes (default: 32 for 256-bit)
 * @returns Base32 encoded secret string
 */
function generateBase32Secret(length: number = 32): string {
  const randomBytes = new Uint8Array(length)
  crypto.getRandomValues(randomBytes)

  // Convert bytes to Base32
  let result = ''
  let bits = 0
  let value = 0

  for (let i = 0; i < randomBytes.length; i++) {
    value = (value << 8) | randomBytes[i]
    bits += 8

    while (bits >= 5) {
      bits -= 5
      result += BASE32_ALPHABET[(value >>> bits) & 0x1f]
    }
  }

  // Handle any remaining bits
  if (bits > 0) {
    result += BASE32_ALPHABET[(value << (5 - bits)) & 0x1f]
  }

  return result
}

/**
 * Reset the TOTP secret for a device.
 * Story 13.6: TOTP Secret Recovery
 *
 * This generates a new secret and updates the device document.
 * The device will receive the new secret on next sync.
 *
 * @param familyId - The family ID
 * @param deviceId - The device ID
 * @param resetterUid - The UID of the user performing the reset
 * @returns Promise that resolves with the new secret for display
 */
export async function resetTotpSecret(
  familyId: string,
  deviceId: string,
  resetterUid: string
): Promise<{ success: boolean; newSecret: string }> {
  if (!familyId || !deviceId || !resetterUid) {
    throw new Error('familyId, deviceId, and resetterUid are required')
  }

  const app = getFirebaseApp()
  const db = getFirestore(app)

  // Generate new secret (256-bit, 32 bytes)
  const newSecret = generateBase32Secret(32)

  // Update device document with new secret
  // Story 13.6 AC2, AC3: New secret replaces old, increments version
  const deviceRef = doc(db, 'families', familyId, 'devices', deviceId)
  await updateDoc(deviceRef, {
    totpSecret: newSecret,
    totpSecretVersion: increment(1),
    totpSecretResetAt: serverTimestamp(),
  })

  // Log the reset event
  // Story 13.6 AC5: Reset event is logged in audit trail
  await logTotpSecretReset(familyId, deviceId, resetterUid)

  return { success: true, newSecret }
}

/**
 * Log a TOTP secret reset event to the audit trail.
 * Story 13.6 Task 3: Audit Logging (AC: #5)
 *
 * @param familyId - The family ID
 * @param deviceId - The device ID
 * @param resetterUid - The UID of the user who reset the secret
 * @returns Promise that resolves when log is written
 */
async function logTotpSecretReset(
  familyId: string,
  deviceId: string,
  resetterUid: string
): Promise<void> {
  const app = getFirebaseApp()
  const db = getFirestore(app)

  const auditLogsRef = collection(db, 'auditLogs')
  await addDoc(auditLogsRef, {
    type: 'totp_secret_reset',
    familyId,
    deviceId,
    resetterUid,
    timestamp: serverTimestamp(),
  })
}
