/**
 * Trusted Adult Callable Functions - Story 52.4
 *
 * Callable functions for managing trusted adult designation, approval, and access.
 *
 * AC1: Designate Trusted Adult - parent can invite by email
 * AC2: Invitation Authentication - trusted adult authenticates via link (FR123)
 * AC3: Teen Approval Required - 16+ teens must approve
 * AC4: View-Only Access - trusted adults have no control (FR108)
 * AC5: Maximum 2 Trusted Adults per child
 * AC6: Audit Logging (NFR42)
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore'
import {
  canDesignateTrustedAdult,
  isEmailAlreadyUsed,
  createTrustedAdultInvitation,
  validateInvitationToken,
  acceptTrustedAdultInvitation,
  processTeenapproval,
  revokeTrustedAdult,
  expireInvitation,
  getActiveTrustedAdults,
  getPendingTeenApprovalTrustedAdults,
  getPendingInvitations,
  getTrustedAdultCounts,
  validateTrustedAdultEmail,
  validateTrustedAdultName,
  requiresTeenApproval,
  isInvitationExpired,
  type TrustedAdult,
  type TrustedAdultInvitationToken,
  type TrustedAdultChangeEvent,
  TrustedAdultStatus,
  TrustedAdultInvitationRequestSchema,
  TrustedAdultAcceptInvitationRequestSchema,
  TrustedAdultTeenApprovalRequestSchema,
  TrustedAdultRevokeRequestSchema,
  getTrustedAdultInvitationMessage,
  getTrustedAdultPendingApprovalMessage,
  getTrustedAdultApprovedMessage,
  getTrustedAdultRejectedMessage,
  TRUSTED_ADULT_INFO_LINK,
} from '@fledgely/shared'

const db = getFirestore()

/**
 * Helper to convert Firestore Timestamp or Date to Date.
 */
function toDate(value: Date | Timestamp | undefined | null): Date | null {
  if (!value) return null
  if (value instanceof Timestamp) return value.toDate()
  if (value instanceof Date) return value
  if (typeof (value as { toDate?: () => Date }).toDate === 'function') {
    return (value as { toDate: () => Date }).toDate()
  }
  return null
}

/**
 * Helper to find family and verify parent access.
 */
async function findFamilyWithParentAccess(
  familyId: string,
  authUid: string
): Promise<{
  familyData: FirebaseFirestore.DocumentData
  familyRef: FirebaseFirestore.DocumentReference
}> {
  const familyDoc = await db.collection('families').doc(familyId).get()

  if (!familyDoc.exists) {
    throw new HttpsError('not-found', 'Family not found')
  }

  const familyData = familyDoc.data()!
  const parentIds = familyData.parentIds || []

  if (!parentIds.includes(authUid)) {
    throw new HttpsError('permission-denied', 'Only parents can manage trusted adults')
  }

  return {
    familyData,
    familyRef: familyDoc.ref,
  }
}

/**
 * Helper to find child and verify access.
 */
async function findChildWithAccess(
  familyId: string,
  childId: string,
  authUid: string,
  requireParent: boolean = true
): Promise<{
  childData: FirebaseFirestore.DocumentData
  familyData: FirebaseFirestore.DocumentData
  childRef: FirebaseFirestore.DocumentReference
  familyRef: FirebaseFirestore.DocumentReference
  isParent: boolean
  isChild: boolean
}> {
  const familyDoc = await db.collection('families').doc(familyId).get()

  if (!familyDoc.exists) {
    throw new HttpsError('not-found', 'Family not found')
  }

  const familyData = familyDoc.data()!
  const parentIds = familyData.parentIds || []
  const childIds = familyData.childIds || []
  const isParent = parentIds.includes(authUid)
  const isChild = childIds.includes(authUid)

  if (requireParent && !isParent) {
    throw new HttpsError('permission-denied', 'Only parents can perform this action')
  }

  if (!isParent && !isChild) {
    throw new HttpsError('permission-denied', 'Access denied')
  }

  const childDoc = await db
    .collection('families')
    .doc(familyId)
    .collection('children')
    .doc(childId)
    .get()

  if (!childDoc.exists) {
    throw new HttpsError('not-found', 'Child not found')
  }

  return {
    childData: childDoc.data()!,
    familyData,
    childRef: childDoc.ref,
    familyRef: familyDoc.ref,
    isParent,
    isChild,
  }
}

/**
 * Get trusted adults for a child from Firestore.
 */
async function getTrustedAdultsForChild(
  familyId: string,
  childId: string
): Promise<TrustedAdult[]> {
  const snapshot = await db
    .collection('families')
    .doc(familyId)
    .collection('trustedAdults')
    .where('childId', '==', childId)
    .get()

  return snapshot.docs.map((doc) => {
    const data = doc.data()
    return {
      id: doc.id,
      email: data.email,
      name: data.name,
      status: data.status,
      childId: data.childId,
      familyId: data.familyId,
      invitedBy: data.invitedBy,
      invitedAt: toDate(data.invitedAt) || new Date(),
      expiresAt: toDate(data.expiresAt) || new Date(),
      acceptedAt: toDate(data.acceptedAt) || undefined,
      userId: data.userId,
      approvedByTeenAt: toDate(data.approvedByTeenAt) || undefined,
      approvedByTeenId: data.approvedByTeenId,
      revokedAt: toDate(data.revokedAt) || undefined,
      revokedBy: data.revokedBy,
      revokedReason: data.revokedReason,
    } as TrustedAdult
  })
}

/**
 * Log a trusted adult change event for audit purposes (NFR42).
 */
async function logTrustedAdultChangeEvent(
  familyId: string,
  event: TrustedAdultChangeEvent
): Promise<void> {
  await db
    .collection('families')
    .doc(familyId)
    .collection('auditLogs')
    .doc(event.id)
    .set({
      ...event,
      timestamp: FieldValue.serverTimestamp(),
      eventType: 'trusted_adult_change',
    })
}

/**
 * Send notification to a user.
 */
async function sendNotification(
  familyId: string,
  recipientId: string,
  type: string,
  title: string,
  message: string,
  childId?: string
): Promise<void> {
  await db
    .collection('families')
    .doc(familyId)
    .collection('notifications')
    .add({
      recipientId,
      type,
      title,
      message,
      resourceLink: TRUSTED_ADULT_INFO_LINK,
      read: false,
      createdAt: FieldValue.serverTimestamp(),
      childId: childId || null,
    })
}

/**
 * Invite a trusted adult for a child.
 * AC1: Parent designates trusted adult by email
 * AC5: Maximum 2 trusted adults per child
 * AC6: Logs audit event
 */
export const inviteTrustedAdultCallable = onCall({ enforceAppCheck: false }, async (request) => {
  const auth = request.auth
  if (!auth) {
    throw new HttpsError('unauthenticated', 'Authentication required')
  }

  // Validate input
  const parseResult = TrustedAdultInvitationRequestSchema.safeParse(request.data)
  if (!parseResult.success) {
    throw new HttpsError('invalid-argument', parseResult.error.errors[0].message)
  }

  const { email, name, childId } = parseResult.data

  // Validate email format
  const emailValidation = validateTrustedAdultEmail(email)
  if (!emailValidation.valid) {
    throw new HttpsError('invalid-argument', emailValidation.error!)
  }

  // Validate name
  const nameValidation = validateTrustedAdultName(name)
  if (!nameValidation.valid) {
    throw new HttpsError('invalid-argument', nameValidation.error!)
  }

  // Find family where user is a parent
  const familiesSnapshot = await db
    .collection('families')
    .where('parentIds', 'array-contains', auth.uid)
    .get()

  let familyId: string | null = null
  let familyData: FirebaseFirestore.DocumentData | null = null
  let childData: FirebaseFirestore.DocumentData | null = null

  for (const familyDoc of familiesSnapshot.docs) {
    const childDoc = await db
      .collection('families')
      .doc(familyDoc.id)
      .collection('children')
      .doc(childId)
      .get()

    if (childDoc.exists) {
      familyId = familyDoc.id
      familyData = familyDoc.data()!
      childData = childDoc.data()!
      break
    }
  }

  if (!familyId || !familyData || !childData) {
    throw new HttpsError('not-found', 'Child not found or access denied')
  }

  // Get existing trusted adults for the child
  const existingTrustedAdults = await getTrustedAdultsForChild(familyId, childId)

  // Check if can designate more trusted adults (AC5)
  const designationCheck = canDesignateTrustedAdult(existingTrustedAdults)
  if (!designationCheck.canDesignate) {
    throw new HttpsError('failed-precondition', designationCheck.reason!)
  }

  // Check if email is already used
  if (isEmailAlreadyUsed(email, existingTrustedAdults)) {
    throw new HttpsError('already-exists', 'This email has already been invited')
  }

  // Create invitation
  const result = createTrustedAdultInvitation(
    auth.uid,
    familyId,
    childId,
    email,
    name,
    request.rawRequest?.ip,
    request.rawRequest?.headers?.['user-agent'] as string | undefined
  )

  // Store trusted adult record
  await db
    .collection('families')
    .doc(familyId)
    .collection('trustedAdults')
    .doc(result.trustedAdult.id)
    .set({
      ...result.trustedAdult,
      invitedAt: FieldValue.serverTimestamp(),
      expiresAt: result.trustedAdult.expiresAt,
    })

  // Log audit event (AC6)
  await logTrustedAdultChangeEvent(familyId, result.auditEvent)

  // Send invitation email (placeholder - would integrate with email service)
  // In production, this would trigger an email with the invitation token
  const familyName = familyData.name || 'the family'
  const childName = childData.name || childData.displayName || 'the child'
  const parentName =
    familyData.parentNames?.[auth.uid] || familyData.memberNames?.[auth.uid] || 'A parent'

  // Create notification for tracking (email sending would be handled by a trigger or email service)
  await db.collection('pendingEmails').add({
    type: 'trusted_adult_invitation',
    to: email,
    subject: 'You have been invited as a Trusted Adult',
    message: getTrustedAdultInvitationMessage(parentName, childName, familyName),
    invitationToken: result.invitationToken,
    createdAt: FieldValue.serverTimestamp(),
    expiresAt: result.trustedAdult.expiresAt,
  })

  return {
    success: true,
    trustedAdultId: result.trustedAdult.id,
    expiresAt: result.trustedAdult.expiresAt,
    counts: getTrustedAdultCounts(existingTrustedAdults.concat([result.trustedAdult])),
  }
})

/**
 * Accept a trusted adult invitation.
 * AC2: Invitation Authentication (FR123)
 * AC3: Teen Approval Required for 16+
 * AC6: Logs audit event
 */
export const acceptTrustedAdultInvitationCallable = onCall(
  { enforceAppCheck: false },
  async (request) => {
    const auth = request.auth
    if (!auth) {
      throw new HttpsError('unauthenticated', 'Authentication required')
    }

    // Validate input
    const parseResult = TrustedAdultAcceptInvitationRequestSchema.safeParse(request.data)
    if (!parseResult.success) {
      throw new HttpsError('invalid-argument', parseResult.error.errors[0].message)
    }

    const { token: tokenString, name: updatedName } = parseResult.data

    // Decode and validate token
    let invitationToken: TrustedAdultInvitationToken
    try {
      // In production, token would be JWT or encrypted
      // For now, we'll assume it's a base64 encoded JSON
      invitationToken = JSON.parse(Buffer.from(tokenString, 'base64').toString())
    } catch {
      throw new HttpsError('invalid-argument', 'Invalid invitation token')
    }

    // Get the stored trusted adult record
    const trustedAdultDoc = await db
      .collection('families')
      .doc(invitationToken.familyId)
      .collection('trustedAdults')
      .doc(invitationToken.invitationId)
      .get()

    if (!trustedAdultDoc.exists) {
      throw new HttpsError('not-found', 'Invitation not found')
    }

    const storedData = trustedAdultDoc.data()!
    const storedTrustedAdult: TrustedAdult = {
      id: trustedAdultDoc.id,
      email: storedData.email,
      name: storedData.name,
      status: storedData.status,
      childId: storedData.childId,
      familyId: storedData.familyId,
      invitedBy: storedData.invitedBy,
      invitedAt: toDate(storedData.invitedAt) || new Date(),
      expiresAt: toDate(storedData.expiresAt) || new Date(),
    }

    // Validate token against stored record
    const validation = validateInvitationToken(invitationToken, storedTrustedAdult)
    if (!validation.valid) {
      throw new HttpsError('failed-precondition', validation.error!)
    }

    // Verify email matches authenticated user's email
    if (auth.token.email?.toLowerCase() !== invitationToken.email.toLowerCase()) {
      throw new HttpsError(
        'permission-denied',
        'Invitation email does not match authenticated user'
      )
    }

    // Get child's birthdate for teen approval check
    const childDoc = await db
      .collection('families')
      .doc(invitationToken.familyId)
      .collection('children')
      .doc(invitationToken.childId)
      .get()

    if (!childDoc.exists) {
      throw new HttpsError('not-found', 'Child not found')
    }

    const childData = childDoc.data()!
    const birthdate = toDate(childData.birthdate)
    if (!birthdate) {
      throw new HttpsError('failed-precondition', 'Child birthdate not set')
    }

    // Process acceptance
    const result = acceptTrustedAdultInvitation(
      storedTrustedAdult,
      auth.uid,
      birthdate,
      request.rawRequest?.ip,
      request.rawRequest?.headers?.['user-agent'] as string | undefined
    )

    // Update trusted adult record
    const updateData: Record<string, unknown> = {
      status: result.trustedAdult.status,
      userId: result.trustedAdult.userId,
      acceptedAt: FieldValue.serverTimestamp(),
    }

    if (updatedName) {
      updateData.name = updatedName
    }

    await trustedAdultDoc.ref.update(updateData)

    // Log audit event (AC6)
    await logTrustedAdultChangeEvent(invitationToken.familyId, result.auditEvent)

    // If teen approval required, notify teen (AC3)
    if (result.requiresTeenApproval) {
      const familyDoc = await db.collection('families').doc(invitationToken.familyId).get()
      const familyData = familyDoc.data()!
      const parentName =
        familyData.parentNames?.[storedTrustedAdult.invitedBy] ||
        familyData.memberNames?.[storedTrustedAdult.invitedBy] ||
        'Your parent'

      // Notify teen
      await sendNotification(
        invitationToken.familyId,
        invitationToken.childId,
        'trusted_adult_pending_approval',
        'Trusted Adult Needs Your Approval',
        getTrustedAdultPendingApprovalMessage(updatedName || storedTrustedAdult.name, parentName),
        invitationToken.childId
      )
    }

    return {
      success: true,
      status: result.trustedAdult.status,
      requiresTeenApproval: result.requiresTeenApproval,
    }
  }
)

/**
 * Process teen approval/rejection of trusted adult.
 * AC3: Teen Approval Required (16+ only)
 * AC6: Logs audit event
 */
export const approveTrustedAdultByTeenCallable = onCall(
  { enforceAppCheck: false },
  async (request) => {
    const auth = request.auth
    if (!auth) {
      throw new HttpsError('unauthenticated', 'Authentication required')
    }

    // Validate input
    const parseResult = TrustedAdultTeenApprovalRequestSchema.safeParse(request.data)
    if (!parseResult.success) {
      throw new HttpsError('invalid-argument', parseResult.error.errors[0].message)
    }

    const { trustedAdultId, approved, rejectionReason } = parseResult.data

    // Find the trusted adult record
    const familiesSnapshot = await db
      .collection('families')
      .where('childIds', 'array-contains', auth.uid)
      .get()

    let familyId: string | null = null
    let trustedAdultDoc: FirebaseFirestore.DocumentSnapshot | null = null

    for (const familyDoc of familiesSnapshot.docs) {
      const taDoc = await db
        .collection('families')
        .doc(familyDoc.id)
        .collection('trustedAdults')
        .doc(trustedAdultId)
        .get()

      if (taDoc.exists) {
        const taData = taDoc.data()!
        // Verify this trusted adult is for this teen
        if (taData.childId === auth.uid) {
          familyId = familyDoc.id
          trustedAdultDoc = taDoc
          break
        }
      }
    }

    if (!familyId || !trustedAdultDoc || !trustedAdultDoc.exists) {
      throw new HttpsError('not-found', 'Trusted adult not found or access denied')
    }

    const storedData = trustedAdultDoc.data()!

    // Verify status is pending teen approval
    if (storedData.status !== TrustedAdultStatus.PENDING_TEEN_APPROVAL) {
      throw new HttpsError('failed-precondition', 'Trusted adult is not pending your approval')
    }

    const storedTrustedAdult: TrustedAdult = {
      id: trustedAdultDoc.id,
      email: storedData.email,
      name: storedData.name,
      status: storedData.status,
      childId: storedData.childId,
      familyId: storedData.familyId,
      invitedBy: storedData.invitedBy,
      invitedAt: toDate(storedData.invitedAt) || new Date(),
      expiresAt: toDate(storedData.expiresAt) || new Date(),
      acceptedAt: toDate(storedData.acceptedAt) ?? undefined,
      userId: storedData.userId,
    }

    // Process approval/rejection
    const result = processTeenapproval(
      storedTrustedAdult,
      auth.uid,
      approved,
      rejectionReason,
      request.rawRequest?.ip,
      request.rawRequest?.headers?.['user-agent'] as string | undefined
    )

    // Update trusted adult record
    if (approved) {
      await trustedAdultDoc.ref.update({
        status: result.trustedAdult.status,
        approvedByTeenAt: FieldValue.serverTimestamp(),
        approvedByTeenId: auth.uid,
      })
    } else {
      await trustedAdultDoc.ref.update({
        status: result.trustedAdult.status,
        revokedAt: FieldValue.serverTimestamp(),
        revokedBy: auth.uid,
        revokedReason: rejectionReason || 'Rejected by teen',
      })
    }

    // Log audit event (AC6)
    await logTrustedAdultChangeEvent(familyId, result.auditEvent)

    // Notify parent of decision
    const childDoc = await db
      .collection('families')
      .doc(familyId)
      .collection('children')
      .doc(auth.uid)
      .get()
    const childData = childDoc.data()!
    const teenName = childData.name || childData.displayName || 'Your teen'

    await sendNotification(
      familyId,
      storedTrustedAdult.invitedBy,
      approved ? 'trusted_adult_approved' : 'trusted_adult_rejected',
      approved ? 'Trusted Adult Approved' : 'Trusted Adult Rejected',
      approved
        ? getTrustedAdultApprovedMessage(storedTrustedAdult.name, teenName)
        : getTrustedAdultRejectedMessage(storedTrustedAdult.name, teenName),
      storedTrustedAdult.childId
    )

    return {
      success: true,
      status: result.trustedAdult.status,
      approved,
    }
  }
)

/**
 * Get trusted adults for a child.
 * Returns all trusted adults with their statuses.
 */
export const getTrustedAdultsCallable = onCall({ enforceAppCheck: false }, async (request) => {
  const { childId, familyId } = request.data as { childId: string; familyId: string }

  if (!childId || !familyId) {
    throw new HttpsError('invalid-argument', 'Child ID and Family ID are required')
  }

  const auth = request.auth
  if (!auth) {
    throw new HttpsError('unauthenticated', 'Authentication required')
  }

  // Verify access
  const { isParent } = await findChildWithAccess(familyId, childId, auth.uid, false)

  // Get all trusted adults for the child
  const trustedAdults = await getTrustedAdultsForChild(familyId, childId)

  // Check for expired invitations and update them
  for (const ta of trustedAdults) {
    if (ta.status === TrustedAdultStatus.PENDING_INVITATION && isInvitationExpired(ta.expiresAt)) {
      const expireResult = expireInvitation(ta)
      await db.collection('families').doc(familyId).collection('trustedAdults').doc(ta.id).update({
        status: TrustedAdultStatus.EXPIRED,
      })
      await logTrustedAdultChangeEvent(familyId, expireResult.auditEvent)
      ta.status = TrustedAdultStatus.EXPIRED
    }
  }

  return {
    trustedAdults: trustedAdults.map((ta) => ({
      id: ta.id,
      email: ta.email,
      name: ta.name,
      status: ta.status,
      invitedAt: ta.invitedAt,
      expiresAt: ta.expiresAt,
      acceptedAt: ta.acceptedAt,
      approvedByTeenAt: ta.approvedByTeenAt,
      // Only include sensitive fields for parents
      ...(isParent && {
        invitedBy: ta.invitedBy,
        userId: ta.userId,
      }),
    })),
    counts: getTrustedAdultCounts(trustedAdults),
    active: getActiveTrustedAdults(trustedAdults),
    pendingTeenApproval: getPendingTeenApprovalTrustedAdults(trustedAdults),
    pendingInvitation: getPendingInvitations(trustedAdults),
  }
})

/**
 * Revoke a trusted adult's access.
 * Can be done by parent or teen (16+).
 * AC6: Logs audit event
 */
export const revokeTrustedAdultCallable = onCall({ enforceAppCheck: false }, async (request) => {
  const auth = request.auth
  if (!auth) {
    throw new HttpsError('unauthenticated', 'Authentication required')
  }

  // Validate input
  const parseResult = TrustedAdultRevokeRequestSchema.safeParse(request.data)
  if (!parseResult.success) {
    throw new HttpsError('invalid-argument', parseResult.error.errors[0].message)
  }

  const { trustedAdultId, reason } = parseResult.data

  // Find the trusted adult record
  const familiesSnapshot = await db
    .collection('families')
    .where('memberIds', 'array-contains', auth.uid)
    .get()

  let familyId: string | null = null
  let trustedAdultDoc: FirebaseFirestore.DocumentSnapshot | null = null
  let isParent = false
  let isTeen = false

  for (const familyDoc of familiesSnapshot.docs) {
    const taDoc = await db
      .collection('families')
      .doc(familyDoc.id)
      .collection('trustedAdults')
      .doc(trustedAdultId)
      .get()

    if (taDoc.exists) {
      const taData = taDoc.data()!
      const fData = familyDoc.data()!
      isParent = (fData.parentIds || []).includes(auth.uid)
      isTeen = taData.childId === auth.uid

      if (isParent || isTeen) {
        familyId = familyDoc.id
        trustedAdultDoc = taDoc
        break
      }
    }
  }

  if (!familyId || !trustedAdultDoc || !trustedAdultDoc.exists) {
    throw new HttpsError('not-found', 'Trusted adult not found or access denied')
  }

  const storedData = trustedAdultDoc.data()!

  // Verify trusted adult can be revoked (must be active or pending)
  if (
    storedData.status !== TrustedAdultStatus.ACTIVE &&
    storedData.status !== TrustedAdultStatus.PENDING_INVITATION &&
    storedData.status !== TrustedAdultStatus.PENDING_TEEN_APPROVAL
  ) {
    throw new HttpsError('failed-precondition', 'Trusted adult cannot be revoked')
  }

  // If teen is revoking, verify they're 16+
  if (isTeen && !isParent) {
    const childDoc = await db
      .collection('families')
      .doc(familyId)
      .collection('children')
      .doc(auth.uid)
      .get()

    if (!childDoc.exists) {
      throw new HttpsError('not-found', 'Child profile not found')
    }

    const childData = childDoc.data()!
    const birthdate = toDate(childData.birthdate)

    if (!birthdate || !requiresTeenApproval(birthdate)) {
      throw new HttpsError('permission-denied', 'Only teens 16 and older can revoke trusted adults')
    }
  }

  const storedTrustedAdult: TrustedAdult = {
    id: trustedAdultDoc.id,
    email: storedData.email,
    name: storedData.name,
    status: storedData.status,
    childId: storedData.childId,
    familyId: storedData.familyId,
    invitedBy: storedData.invitedBy,
    invitedAt: toDate(storedData.invitedAt) || new Date(),
    expiresAt: toDate(storedData.expiresAt) || new Date(),
    acceptedAt: toDate(storedData.acceptedAt) ?? undefined,
    userId: storedData.userId,
    approvedByTeenAt: toDate(storedData.approvedByTeenAt) ?? undefined,
    approvedByTeenId: storedData.approvedByTeenId,
  }

  // Revoke access
  const result = revokeTrustedAdult(
    storedTrustedAdult,
    auth.uid,
    isParent ? 'parent' : 'teen',
    reason,
    request.rawRequest?.ip,
    request.rawRequest?.headers?.['user-agent'] as string | undefined
  )

  // Update trusted adult record
  await trustedAdultDoc.ref.update({
    status: result.trustedAdult.status,
    revokedAt: FieldValue.serverTimestamp(),
    revokedBy: auth.uid,
    revokedReason: reason,
  })

  // Log audit event (AC6)
  await logTrustedAdultChangeEvent(familyId, result.auditEvent)

  return {
    success: true,
    status: result.trustedAdult.status,
  }
})

/**
 * Resend a trusted adult invitation.
 * Creates a new invitation token and extends expiry.
 */
export const resendTrustedAdultInvitationCallable = onCall(
  { enforceAppCheck: false },
  async (request) => {
    const { trustedAdultId, familyId } = request.data as {
      trustedAdultId: string
      familyId: string
    }

    if (!trustedAdultId || !familyId) {
      throw new HttpsError('invalid-argument', 'Trusted Adult ID and Family ID are required')
    }

    const auth = request.auth
    if (!auth) {
      throw new HttpsError('unauthenticated', 'Authentication required')
    }

    // Verify parent access
    await findFamilyWithParentAccess(familyId, auth.uid)

    // Get the trusted adult
    const trustedAdultDoc = await db
      .collection('families')
      .doc(familyId)
      .collection('trustedAdults')
      .doc(trustedAdultId)
      .get()

    if (!trustedAdultDoc.exists) {
      throw new HttpsError('not-found', 'Trusted adult not found')
    }

    const storedData = trustedAdultDoc.data()!

    // Verify status allows resend
    if (
      storedData.status !== TrustedAdultStatus.PENDING_INVITATION &&
      storedData.status !== TrustedAdultStatus.EXPIRED
    ) {
      throw new HttpsError(
        'failed-precondition',
        'Can only resend invitations that are pending or expired'
      )
    }

    // Create new invitation with fresh token and expiry
    const result = createTrustedAdultInvitation(
      auth.uid,
      familyId,
      storedData.childId,
      storedData.email,
      storedData.name,
      request.rawRequest?.ip,
      request.rawRequest?.headers?.['user-agent'] as string | undefined
    )

    // Update trusted adult record with new expiry
    await trustedAdultDoc.ref.update({
      status: TrustedAdultStatus.PENDING_INVITATION,
      invitedBy: auth.uid,
      invitedAt: FieldValue.serverTimestamp(),
      expiresAt: result.trustedAdult.expiresAt,
    })

    // Log audit event
    await logTrustedAdultChangeEvent(familyId, result.auditEvent)

    // Queue new invitation email
    const familyDoc = await db.collection('families').doc(familyId).get()
    const familyData = familyDoc.data()!
    const childDoc = await db
      .collection('families')
      .doc(familyId)
      .collection('children')
      .doc(storedData.childId)
      .get()
    const childData = childDoc.data()!
    const familyName = familyData.name || 'the family'
    const childName = childData.name || childData.displayName || 'the child'
    const parentName =
      familyData.parentNames?.[auth.uid] || familyData.memberNames?.[auth.uid] || 'A parent'

    await db.collection('pendingEmails').add({
      type: 'trusted_adult_invitation',
      to: storedData.email,
      subject: 'Reminder: You have been invited as a Trusted Adult',
      message: getTrustedAdultInvitationMessage(parentName, childName, familyName),
      invitationToken: result.invitationToken,
      createdAt: FieldValue.serverTimestamp(),
      expiresAt: result.trustedAdult.expiresAt,
    })

    return {
      success: true,
      expiresAt: result.trustedAdult.expiresAt,
    }
  }
)
