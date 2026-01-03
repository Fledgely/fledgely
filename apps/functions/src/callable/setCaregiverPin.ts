/**
 * Cloud Function for setting a caregiver's PIN.
 *
 * Follows the Cloud Functions Template pattern:
 * 1. Auth (FIRST)
 * 2. Validation (SECOND)
 * 3. Permission (THIRD) - verify caller is guardian of family
 * 4. Business logic via batch write (LAST)
 *
 * Story 39.4: Caregiver PIN for Time Extension
 * - AC1: PIN setup by parent (4-6 digits, securely hashed)
 * - AC3: Extension limits configurable
 *
 * Security: PIN is hashed with bcrypt before storage - never stored in plain text.
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import * as bcrypt from 'bcryptjs'
import { verifyAuth } from '../shared/auth'
import {
  setCaregiverPinInputSchema,
  DEFAULT_EXTENSION_LIMITS,
  type ExtensionLimitConfig,
} from '@fledgely/shared'

const SALT_ROUNDS = 10

// Response type
interface SetCaregiverPinResponse {
  success: boolean
  caregiverUid: string
  pinSet: boolean
  extensionLimits: ExtensionLimitConfig
}

/**
 * Set or update a caregiver's PIN for time extension approval.
 *
 * Validates that:
 * - User is authenticated
 * - Input is valid (PIN is 4-6 digits)
 * - Family exists
 * - Caller is a guardian of the family
 * - Caregiver exists in the family
 *
 * Then:
 * - Hashes the PIN with bcrypt
 * - Updates caregiver with pinConfig and extensionLimits
 * - Enables canExtendTime permission
 * - Creates audit log entry
 * - Returns success confirmation
 */
export const setCaregiverPin = onCall<
  Parameters<typeof setCaregiverPinInputSchema.parse>[0],
  Promise<SetCaregiverPinResponse>
>(async (request) => {
  // 1. Auth (FIRST)
  const user = verifyAuth(request.auth)

  // 2. Validation (SECOND)
  const parseResult = setCaregiverPinInputSchema.safeParse(request.data)
  if (!parseResult.success) {
    const errorMessage = parseResult.error.errors.map((e) => e.message).join(', ')
    throw new HttpsError('invalid-argument', `Invalid input: ${errorMessage}`)
  }
  const { familyId, caregiverUid, pin, extensionLimits } = parseResult.data

  const db = getFirestore()

  // 3. Permission (THIRD) - Verify caller is guardian of family
  const familyRef = db.collection('families').doc(familyId)
  const familyDoc = await familyRef.get()

  if (!familyDoc.exists) {
    throw new HttpsError('not-found', 'Family not found')
  }

  const familyData = familyDoc.data()!

  // Verify caller is a guardian
  const isGuardian = familyData.guardians?.some((g: { uid: string }) => g.uid === user.uid)
  if (!isGuardian) {
    throw new HttpsError('permission-denied', 'Only guardians can set caregiver PINs')
  }

  // Find the caregiver in the family
  const caregivers = familyData.caregivers || []
  const caregiverIndex = caregivers.findIndex((c: { uid: string }) => c.uid === caregiverUid)

  if (caregiverIndex === -1) {
    throw new HttpsError('not-found', 'Caregiver not found in this family')
  }

  const caregiver = caregivers[caregiverIndex]

  // 4. Business logic - hash PIN and update caregiver (LAST)
  // Hash the PIN securely with bcrypt
  const pinHash = await bcrypt.hash(pin, SALT_ROUNDS)

  // Determine if this is a new PIN or a PIN change
  const isNewPin = !caregiver.pinConfig
  const auditAction = isNewPin ? 'caregiver_pin_set' : 'caregiver_pin_changed'

  // Get current permissions (default to most restricted if not set)
  const oldPermissions = caregiver.permissions || {
    canExtendTime: false,
    canViewFlags: false,
  }

  // Enable canExtendTime when PIN is set
  const newPermissions = {
    ...oldPermissions,
    canExtendTime: true,
  }

  // Determine extension limits to use
  const finalExtensionLimits: ExtensionLimitConfig = extensionLimits || DEFAULT_EXTENSION_LIMITS

  // Create new PIN config
  const pinConfig = {
    pinHash,
    pinSetAt: new Date(),
    pinSetByUid: user.uid,
    failedAttempts: 0,
    // Clear any lockout when PIN is set/changed
    lockedUntil: null,
  }

  // Update caregiver with PIN config and permissions
  caregivers[caregiverIndex] = {
    ...caregiver,
    permissions: newPermissions,
    pinConfig,
    extensionLimits: finalExtensionLimits,
    permissionsUpdatedAt: new Date(),
    permissionsUpdatedByUid: user.uid,
  }

  // Create batch for atomic updates
  const batch = db.batch()

  // Update family document with updated caregiver
  batch.update(familyRef, {
    caregivers,
    updatedAt: FieldValue.serverTimestamp(),
  })

  // Create audit log entry (Story 39.4)
  const auditLogRef = db.collection('caregiverAuditLogs').doc()
  batch.set(auditLogRef, {
    id: auditLogRef.id,
    familyId,
    caregiverUid,
    action: auditAction,
    changedByUid: user.uid,
    changes: {
      pinSet: true,
      extensionLimits: finalExtensionLimits,
      permissionsEnabled: newPermissions.canExtendTime,
    },
    createdAt: FieldValue.serverTimestamp(),
  })

  // Commit all changes atomically
  await batch.commit()

  // Log success for audit trail (no PII per project standards)
  console.log(
    `Caregiver PIN ${isNewPin ? 'set' : 'changed'}: familyId=${familyId}, caregiverUid=${caregiverUid}, changedBy=${user.uid}`
  )

  return {
    success: true,
    caregiverUid,
    pinSet: true,
    extensionLimits: finalExtensionLimits,
  }
})
