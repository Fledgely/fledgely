/**
 * Cloud Function for sending co-parent invitation emails.
 *
 * Follows the Cloud Functions Template pattern:
 * 1. Auth (FIRST)
 * 2. Validation (SECOND)
 * 3. Permission (THIRD)
 * 4. Business logic via service (LAST)
 *
 * Implements Story 3.2 acceptance criteria:
 * - AC2: Invitation email sending
 * - AC3: Email content requirements
 * - AC4: Secure join link
 * - AC6: Error handling
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { z } from 'zod'
import { verifyAuth } from '../shared/auth'
import { sendInvitationEmail, isValidEmail } from '../services/emailService'

// Input validation schema - mirrors @fledgely/shared/contracts/sendInvitationEmailSchema
// Note: Cloud Functions currently can't use workspace packages directly, so we duplicate
// the schema here. Both should be kept in sync.
const sendInvitationEmailSchema = z.object({
  invitationId: z.string().min(1),
  recipientEmail: z.string().email(),
})

// Response type
interface SendInvitationResponse {
  success: boolean
  message: string
}

/**
 * Send a co-parent invitation email.
 *
 * Validates that:
 * - User is authenticated
 * - Input is valid (invitationId and email)
 * - User is the inviter of this invitation
 * - Invitation is pending and not expired
 *
 * Then sends the email and updates the invitation document with:
 * - recipientEmail
 * - emailSentAt timestamp
 */
export const sendInvitation = onCall<
  z.infer<typeof sendInvitationEmailSchema>,
  Promise<SendInvitationResponse>
>(async (request) => {
  // 1. Auth (FIRST)
  const user = verifyAuth(request.auth)

  // 2. Validation (SECOND) - using shared schema per Unbreakable Rule #1
  const parseResult = sendInvitationEmailSchema.safeParse(request.data)
  if (!parseResult.success) {
    throw new HttpsError('invalid-argument', 'Invalid input: please provide a valid email address')
  }
  const { invitationId, recipientEmail } = parseResult.data

  // Additional email validation
  if (!isValidEmail(recipientEmail)) {
    throw new HttpsError('invalid-argument', 'Please provide a valid email address')
  }

  // 3. Permission and data retrieval (THIRD)
  const db = getFirestore()
  const invitationRef = db.collection('invitations').doc(invitationId)
  const invitationDoc = await invitationRef.get()

  const invitationData = invitationDoc.data()
  if (!invitationDoc.exists || !invitationData) {
    throw new HttpsError('not-found', 'Invitation not found')
  }

  // Verify user is the inviter
  if (invitationData.inviterUid !== user.uid) {
    throw new HttpsError('permission-denied', 'Only the inviter can send this invitation')
  }

  // Verify invitation is pending
  if (invitationData.status !== 'pending') {
    throw new HttpsError('failed-precondition', 'This invitation is no longer pending')
  }

  // Verify invitation hasn't expired
  const expiresAt = invitationData.expiresAt?.toDate?.() || new Date(invitationData.expiresAt)
  if (expiresAt < new Date()) {
    throw new HttpsError('failed-precondition', 'This invitation has expired')
  }

  // 4. Business logic via service (LAST)
  // Build the join link using the secure token (AC4)
  // The base URL should come from environment or be configured
  const baseUrl = process.env.APP_BASE_URL || 'https://fledgely.com'
  const joinLink = `${baseUrl}/invite/accept?token=${invitationData.token}`

  // Send email via email service
  const emailResult = await sendInvitationEmail(recipientEmail, {
    inviterName: invitationData.inviterName,
    familyName: invitationData.familyName,
    joinLink,
  })

  if (!emailResult.success) {
    throw new HttpsError(
      'internal',
      emailResult.error || 'Failed to send invitation email. Please try again.'
    )
  }

  // Update invitation document with email info
  await invitationRef.update({
    recipientEmail,
    emailSentAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  })

  // Log success for audit trail (no PII per project standards)
  console.log(`Invitation email sent: invitationId=${invitationId}, userId=${user.uid}`)

  return {
    success: true,
    message: `Invitation sent to ${recipientEmail}`,
  }
})
