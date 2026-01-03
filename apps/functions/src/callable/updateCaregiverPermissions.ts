/**
 * Cloud Function for updating caregiver permissions.
 *
 * Follows the Cloud Functions Template pattern:
 * 1. Auth (FIRST)
 * 2. Validation (SECOND)
 * 3. Permission (THIRD) - verify caller is guardian of family
 * 4. Business logic via batch write (LAST)
 *
 * Story 39.2: Caregiver Permission Configuration
 * - AC1: Permission Toggles (canExtendTime, canViewFlags)
 * - AC2: Default permissions (most restricted)
 * - AC5: Permission changes take effect immediately with audit log
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { z } from 'zod'
import { verifyAuth } from '../shared/auth'

// Input validation schema
const updateCaregiverPermissionsInputSchema = z.object({
  familyId: z.string().min(1, 'familyId is required'),
  caregiverUid: z.string().min(1, 'caregiverUid is required'),
  permissions: z.object({
    canExtendTime: z.boolean().optional(),
    canViewFlags: z.boolean().optional(),
  }),
})

// Response type
interface UpdateCaregiverPermissionsResponse {
  success: boolean
  permissions: {
    canExtendTime: boolean
    canViewFlags: boolean
  }
  caregiverUid: string
}

/**
 * Update permissions for a caregiver in a family.
 *
 * Validates that:
 * - User is authenticated
 * - Input is valid
 * - Family exists
 * - Caller is a guardian of the family
 * - Caregiver exists in the family
 *
 * Then:
 * - Updates caregiver permissions in family document
 * - Creates audit log entry for permission change
 * - Returns updated permissions
 */
export const updateCaregiverPermissions = onCall<
  z.infer<typeof updateCaregiverPermissionsInputSchema>,
  Promise<UpdateCaregiverPermissionsResponse>
>(async (request) => {
  // 1. Auth (FIRST)
  const user = verifyAuth(request.auth)

  // 2. Validation (SECOND)
  const parseResult = updateCaregiverPermissionsInputSchema.safeParse(request.data)
  if (!parseResult.success) {
    const errorMessage = parseResult.error.errors.map((e) => e.message).join(', ')
    throw new HttpsError('invalid-argument', `Invalid input: ${errorMessage}`)
  }
  const { familyId, caregiverUid, permissions } = parseResult.data

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
    throw new HttpsError('permission-denied', 'Only guardians can update caregiver permissions')
  }

  // Find the caregiver in the family
  const caregivers = familyData.caregivers || []
  const caregiverIndex = caregivers.findIndex((c: { uid: string }) => c.uid === caregiverUid)

  if (caregiverIndex === -1) {
    throw new HttpsError('not-found', 'Caregiver not found in this family')
  }

  const caregiver = caregivers[caregiverIndex]

  // 4. Business logic - update permissions (LAST)
  // Get current permissions (default to most restricted if not set)
  const oldPermissions = caregiver.permissions || {
    canExtendTime: false,
    canViewFlags: false,
  }

  // Merge new permissions with existing ones
  const newPermissions = {
    canExtendTime:
      permissions.canExtendTime !== undefined
        ? permissions.canExtendTime
        : oldPermissions.canExtendTime,
    canViewFlags:
      permissions.canViewFlags !== undefined
        ? permissions.canViewFlags
        : oldPermissions.canViewFlags,
  }

  // Update caregiver with new permissions
  caregivers[caregiverIndex] = {
    ...caregiver,
    permissions: newPermissions,
    permissionsUpdatedAt: new Date(),
    permissionsUpdatedByUid: user.uid,
  }

  // Create batch for atomic updates
  const batch = db.batch()

  // Update family document with new caregiver permissions
  batch.update(familyRef, {
    caregivers,
    updatedAt: FieldValue.serverTimestamp(),
  })

  // Create audit log entry (Story 39.2 AC5)
  const auditLogRef = db.collection('caregiverAuditLogs').doc()
  batch.set(auditLogRef, {
    id: auditLogRef.id,
    familyId,
    caregiverUid,
    action: 'permission_change',
    changedByUid: user.uid,
    changes: {
      oldPermissions,
      newPermissions,
    },
    createdAt: FieldValue.serverTimestamp(),
  })

  // Commit all changes atomically
  await batch.commit()

  // Log success for audit trail (no PII per project standards)
  console.log(
    `Caregiver permissions updated: familyId=${familyId}, caregiverUid=${caregiverUid}, changedBy=${user.uid}`
  )

  return {
    success: true,
    permissions: newPermissions,
    caregiverUid,
  }
})
