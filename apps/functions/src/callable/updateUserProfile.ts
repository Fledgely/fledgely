/**
 * Update User Profile - Callable
 *
 * Story 51.8: Right to Rectification - AC1, AC4
 *
 * Allows users to update their profile data with full audit trail.
 * Implements GDPR Article 16 right to rectification.
 */

import { HttpsError, onCall, type CallableRequest } from 'firebase-functions/v2/https'
import { getFirestore } from 'firebase-admin/firestore'
import * as logger from 'firebase-functions/logger'
import {
  EditableField,
  generateAuditLogId,
  RECTIFICATION_CONFIG,
  type UpdateProfileInput,
  type UpdateProfileResponse,
  type ProfileChangeLog,
  type EditableFieldValue,
} from '@fledgely/shared'

/**
 * Allowed fields that can be edited by users.
 */
const ALLOWED_FIELDS: EditableFieldValue[] = [
  EditableField.DISPLAY_NAME,
  EditableField.PROFILE_PHOTO,
  EditableField.DATE_OF_BIRTH,
  EditableField.EMAIL,
  EditableField.PHONE,
  EditableField.TIMEZONE,
  EditableField.LOCALE,
]

export const updateUserProfile = onCall<UpdateProfileInput, Promise<UpdateProfileResponse>>(
  { maxInstances: 20 },
  async (request: CallableRequest<UpdateProfileInput>): Promise<UpdateProfileResponse> => {
    // Require authentication
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Must be authenticated')
    }

    const uid = request.auth.uid
    const db = getFirestore()
    const { field, value, reason } = request.data

    // Validate field is editable
    if (!ALLOWED_FIELDS.includes(field)) {
      throw new HttpsError('invalid-argument', `Field '${field}' is not editable`)
    }

    // Validate value is not empty
    if (!value || value.trim().length === 0) {
      throw new HttpsError('invalid-argument', 'Value cannot be empty')
    }

    try {
      // Get user document
      const userRef = db.collection('users').doc(uid)
      const userDoc = await userRef.get()

      if (!userDoc.exists) {
        throw new HttpsError('not-found', 'User not found')
      }

      const userData = userDoc.data()
      const familyId = userData?.familyId

      // Get old value for audit log
      const oldValue = userData?.[field] ?? null

      // Don't update if value hasn't changed
      if (oldValue === value) {
        return {
          success: true,
          message: 'No changes made - value is the same',
        }
      }

      // Create audit log entry
      const auditLogId = generateAuditLogId()
      const auditLog: ProfileChangeLog = {
        id: auditLogId,
        uid,
        familyId: familyId || '',
        field,
        oldValue: oldValue ? String(oldValue) : null,
        newValue: value,
        changedBy: uid,
        changedAt: Date.now(),
        ipAddress: maskIpAddress(request.rawRequest?.ip || null),
        reason: reason || null,
      }

      // Batch write: update profile and create audit log
      const batch = db.batch()

      // Update user profile
      batch.update(userRef, {
        [field]: value,
        updatedAt: Date.now(),
      })

      // Create audit log
      const auditRef = db.collection(RECTIFICATION_CONFIG.AUDIT_LOG_COLLECTION).doc(auditLogId)
      batch.set(auditRef, auditLog)

      await batch.commit()

      logger.info('Profile updated with audit trail', {
        uid,
        field,
        auditLogId,
        hasReason: !!reason,
      })

      return {
        success: true,
        message: 'Profile updated successfully',
        auditLogId,
      }
    } catch (error) {
      if (error instanceof HttpsError) {
        throw error
      }

      logger.error('Failed to update profile', {
        uid,
        field,
        error: error instanceof Error ? error.message : 'Unknown',
      })
      throw new HttpsError('internal', 'Failed to update profile')
    }
  }
)

/**
 * Mask IP address for privacy (show first two octets only).
 */
function maskIpAddress(ip: string | null): string | null {
  if (!ip) return null

  // Handle IPv4
  if (ip.includes('.')) {
    const parts = ip.split('.')
    if (parts.length === 4) {
      return `${parts[0]}.${parts[1]}.*.*`
    }
  }

  // Handle IPv6 - just mask most of it
  if (ip.includes(':')) {
    const parts = ip.split(':')
    if (parts.length >= 2) {
      return `${parts[0]}:${parts[1]}:****:****`
    }
  }

  return null
}
