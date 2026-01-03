/**
 * Cloud Function for caregivers to approve time extensions using their PIN.
 *
 * Follows the Cloud Functions Template pattern:
 * 1. Auth (FIRST)
 * 2. Validation (SECOND)
 * 3. Permission (THIRD) - verify caller is caregiver with canExtendTime
 * 4. Business logic via batch write (LAST)
 *
 * Story 39.4: Caregiver PIN for Time Extension
 * - AC2: Extension approval with PIN
 * - AC4: Extension logging
 * - AC6: Child notification
 * - AC7: Permission requirement
 *
 * Security: PIN verified with bcrypt, failed attempts tracked, lockout enforced.
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore'
import * as bcrypt from 'bcryptjs'
import { verifyAuth } from '../shared/auth'
import {
  approveExtensionWithPinInputSchema,
  MAX_PIN_ATTEMPTS,
  PIN_LOCKOUT_MINUTES,
  DEFAULT_EXTENSION_LIMITS,
  type ExtensionLimitConfig,
} from '@fledgely/shared'

// Response type
interface ApproveExtensionWithPinResponse {
  success: boolean
  extensionMinutes: number
  newTimeBalanceMinutes: number
  childUid: string
  childName: string
  message: string
}

interface PinValidationError {
  success: false
  error: string
  remainingAttempts: number
  lockedUntil?: Date
}

/**
 * Approve a time extension using caregiver PIN.
 *
 * Validates that:
 * - User is authenticated
 * - Input is valid
 * - Family exists
 * - Caller is a caregiver with canExtendTime permission
 * - Caregiver is not locked out
 * - PIN is correct
 * - Extension is within configured limits
 * - Daily extension limit not exceeded
 *
 * Then:
 * - Resets failed attempts on success
 * - Applies extension to child's time balance
 * - Creates extension log entry
 * - Creates child notification
 * - Returns success with new time balance
 */
export const approveExtensionWithPin = onCall<
  Parameters<typeof approveExtensionWithPinInputSchema.parse>[0],
  Promise<ApproveExtensionWithPinResponse | PinValidationError>
>(async (request) => {
  // 1. Auth (FIRST)
  const user = verifyAuth(request.auth)

  // 2. Validation (SECOND)
  const parseResult = approveExtensionWithPinInputSchema.safeParse(request.data)
  if (!parseResult.success) {
    const errorMessage = parseResult.error.errors.map((e) => e.message).join(', ')
    throw new HttpsError('invalid-argument', `Invalid input: ${errorMessage}`)
  }
  const { familyId, childUid, pin, extensionMinutes, requestId } = parseResult.data

  const db = getFirestore()

  // 3. Permission (THIRD) - Verify caller is caregiver with canExtendTime
  const familyRef = db.collection('families').doc(familyId)
  const familyDoc = await familyRef.get()

  if (!familyDoc.exists) {
    throw new HttpsError('not-found', 'Family not found')
  }

  const familyData = familyDoc.data()!

  // Find the caregiver
  const caregivers = familyData.caregivers || []
  const caregiverIndex = caregivers.findIndex((c: { uid: string }) => c.uid === user.uid)

  if (caregiverIndex === -1) {
    throw new HttpsError('permission-denied', 'You are not a caregiver in this family')
  }

  const caregiver = caregivers[caregiverIndex]

  // Check canExtendTime permission (AC7)
  const permissions = caregiver.permissions || { canExtendTime: false, canViewFlags: false }
  if (!permissions.canExtendTime) {
    throw new HttpsError(
      'permission-denied',
      'You do not have permission to extend time. Contact the parent for extensions.'
    )
  }

  // Check if PIN is configured
  if (!caregiver.pinConfig || !caregiver.pinConfig.pinHash) {
    throw new HttpsError('failed-precondition', 'PIN not configured. Parent needs to set your PIN.')
  }

  const pinConfig = caregiver.pinConfig

  // Check if caregiver is locked out
  if (pinConfig.lockedUntil) {
    const lockedUntilDate =
      pinConfig.lockedUntil instanceof Timestamp
        ? pinConfig.lockedUntil.toDate()
        : new Date(pinConfig.lockedUntil)

    if (new Date() < lockedUntilDate) {
      const remainingMinutes = Math.ceil((lockedUntilDate.getTime() - Date.now()) / (1000 * 60))
      return {
        success: false,
        error: `Too many failed attempts. Try again in ${remainingMinutes} minutes.`,
        remainingAttempts: 0,
        lockedUntil: lockedUntilDate,
      }
    }
  }

  // 4. Business logic - verify PIN (LAST)
  const pinValid = await bcrypt.compare(pin, pinConfig.pinHash)

  if (!pinValid) {
    // Increment failed attempts
    const newFailedAttempts = (pinConfig.failedAttempts || 0) + 1
    const remainingAttempts = MAX_PIN_ATTEMPTS - newFailedAttempts

    // Check if we should lock out
    const updates: Record<string, unknown> = {
      'pinConfig.failedAttempts': newFailedAttempts,
    }

    if (newFailedAttempts >= MAX_PIN_ATTEMPTS) {
      const lockoutUntil = new Date(Date.now() + PIN_LOCKOUT_MINUTES * 60 * 1000)
      updates['pinConfig.lockedUntil'] = lockoutUntil

      // Update caregiver in array
      caregivers[caregiverIndex] = {
        ...caregiver,
        pinConfig: {
          ...pinConfig,
          failedAttempts: newFailedAttempts,
          lockedUntil: lockoutUntil,
        },
      }

      await familyRef.update({ caregivers })

      // Create audit log for lockout
      await db.collection('caregiverAuditLogs').add({
        familyId,
        caregiverUid: user.uid,
        action: 'caregiver_pin_lockout',
        changes: { failedAttempts: newFailedAttempts },
        createdAt: FieldValue.serverTimestamp(),
      })

      console.log(`Caregiver locked out: familyId=${familyId}, caregiverUid=${user.uid}`)

      return {
        success: false,
        error: `Too many failed attempts. Locked out for ${PIN_LOCKOUT_MINUTES} minutes.`,
        remainingAttempts: 0,
        lockedUntil: lockoutUntil,
      }
    }

    // Just update failed attempts (not locked out yet)
    caregivers[caregiverIndex] = {
      ...caregiver,
      pinConfig: {
        ...pinConfig,
        failedAttempts: newFailedAttempts,
      },
    }

    await familyRef.update({ caregivers })

    return {
      success: false,
      error: `Incorrect PIN. ${remainingAttempts} attempt${remainingAttempts === 1 ? '' : 's'} remaining.`,
      remainingAttempts,
    }
  }

  // PIN is correct - reset failed attempts
  caregivers[caregiverIndex] = {
    ...caregiver,
    pinConfig: {
      ...pinConfig,
      failedAttempts: 0,
      lockedUntil: null,
    },
  }

  // Get extension limits
  const extensionLimits: ExtensionLimitConfig =
    caregiver.extensionLimits || DEFAULT_EXTENSION_LIMITS

  // Determine extension amount
  const actualExtensionMinutes = extensionMinutes || extensionLimits.maxDurationMinutes

  // Validate extension is within limits
  if (actualExtensionMinutes > extensionLimits.maxDurationMinutes) {
    throw new HttpsError(
      'invalid-argument',
      `Extension exceeds your limit of ${extensionLimits.maxDurationMinutes} minutes.`
    )
  }

  // Check daily extension limit
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const extensionLogsRef = db
    .collection('families')
    .doc(familyId)
    .collection('caregiverExtensionLogs')
  const todayLogsQuery = extensionLogsRef
    .where('caregiverUid', '==', user.uid)
    .where('childUid', '==', childUid)
    .where('createdAt', '>=', Timestamp.fromDate(today))

  const todayLogs = await todayLogsQuery.get()
  const extensionsToday = todayLogs.size

  if (extensionsToday >= extensionLimits.maxDailyExtensions) {
    throw new HttpsError(
      'resource-exhausted',
      `Daily extension limit reached (${extensionLimits.maxDailyExtensions} per day for this child).`
    )
  }

  // Find the child
  const childRef = db.collection('families').doc(familyId).collection('children').doc(childUid)
  const childDoc = await childRef.get()

  if (!childDoc.exists) {
    throw new HttpsError('not-found', 'Child not found')
  }

  const childData = childDoc.data()!
  const childName = childData.displayName || childData.name || 'Child'

  // Get current time balance (or default to 0)
  const currentBalance = childData.timeBalanceMinutes || 0
  const newBalance = currentBalance + actualExtensionMinutes

  // Create batch for atomic updates
  const batch = db.batch()

  // Update family with reset PIN attempts
  batch.update(familyRef, {
    caregivers,
    updatedAt: FieldValue.serverTimestamp(),
  })

  // Update child's time balance
  batch.update(childRef, {
    timeBalanceMinutes: newBalance,
    lastExtensionAt: FieldValue.serverTimestamp(),
    lastExtensionByUid: user.uid,
    updatedAt: FieldValue.serverTimestamp(),
  })

  // Create extension log (AC4, AC5)
  const extensionLogRef = extensionLogsRef.doc()
  const caregiverName = caregiver.displayName || caregiver.email || 'Caregiver'
  batch.set(extensionLogRef, {
    id: extensionLogRef.id,
    familyId,
    caregiverUid: user.uid,
    caregiverName,
    childUid,
    childName,
    extensionMinutes: actualExtensionMinutes,
    requestId: requestId || null,
    createdAt: FieldValue.serverTimestamp(),
  })

  // Create child notification (AC6)
  const notificationRef = db
    .collection('families')
    .doc(familyId)
    .collection('children')
    .doc(childUid)
    .collection('notifications')
    .doc()
  batch.set(notificationRef, {
    id: notificationRef.id,
    type: 'caregiver_extension',
    message: `${caregiverName} gave you ${actualExtensionMinutes} more minutes!`,
    caregiverUid: user.uid,
    caregiverName,
    extensionMinutes: actualExtensionMinutes,
    read: false,
    createdAt: FieldValue.serverTimestamp(),
  })

  // Update request status if requestId provided
  if (requestId) {
    const requestRef = db
      .collection('families')
      .doc(familyId)
      .collection('timeExtensionRequests')
      .doc(requestId)
    batch.update(requestRef, {
      status: 'approved',
      approvedByUid: user.uid,
      approvedByType: 'caregiver',
      approvedAt: FieldValue.serverTimestamp(),
      extensionMinutes: actualExtensionMinutes,
      updatedAt: FieldValue.serverTimestamp(),
    })
  }

  // Create audit log
  const auditLogRef = db.collection('caregiverAuditLogs').doc()
  batch.set(auditLogRef, {
    id: auditLogRef.id,
    familyId,
    caregiverUid: user.uid,
    childUid,
    action: 'caregiver_extension_granted',
    changes: {
      extensionMinutes: actualExtensionMinutes,
      previousBalance: currentBalance,
      newBalance,
    },
    createdAt: FieldValue.serverTimestamp(),
  })

  // Commit all changes atomically
  await batch.commit()

  // Log success (no PII)
  console.log(
    `Caregiver extension granted: familyId=${familyId}, caregiverUid=${user.uid}, childUid=${childUid}, minutes=${actualExtensionMinutes}`
  )

  return {
    success: true,
    extensionMinutes: actualExtensionMinutes,
    newTimeBalanceMinutes: newBalance,
    childUid,
    childName,
    message: `${caregiverName} gave ${childName} ${actualExtensionMinutes} more minutes!`,
  }
})
