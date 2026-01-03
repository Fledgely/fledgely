/**
 * Cloud Function for sending caregiver invitation emails.
 *
 * Follows the Cloud Functions Template pattern:
 * 1. Auth (FIRST)
 * 2. Validation (SECOND)
 * 3. Permission (THIRD)
 * 4. Business logic via service (LAST)
 *
 * Implements Story 19D.1 acceptance criteria:
 * - AC1: Parent invites caregiver from family settings
 * - AC2: Caregiver role is "Status Viewer"
 * - AC5: Parent can set which children caregiver can see
 * - AC6: Invitation expires in 7 days
 *
 * Story 39.1 additions:
 * - AC1: Relationship field (grandparent, aunt_uncle, babysitter, other)
 * - AC2: Maximum 5 caregivers per family limit enforcement
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { z } from 'zod'
import { randomBytes } from 'crypto'
import { verifyAuth } from '../shared/auth'
import { isValidEmail } from '../services/emailService'
import { sendCaregiverInvitationEmail } from '../services/caregiverEmailService'

// Input validation schema - mirrors @fledgely/shared/contracts/sendCaregiverInvitationInputSchema
// Note: Cloud Functions currently can't use workspace packages directly, so we duplicate
// the schema here. Both should be kept in sync.
// Story 39.1: Added relationship fields
const caregiverRelationshipSchema = z.enum(['grandparent', 'aunt_uncle', 'babysitter', 'other'])
const MAX_CAREGIVERS_PER_FAMILY = 5

const sendCaregiverInvitationInputSchema = z.object({
  familyId: z.string().min(1),
  recipientEmail: z.string().email(),
  childIds: z.array(z.string()).min(1), // AC5: Must specify at least one child
  relationship: caregiverRelationshipSchema, // Story 39.1 AC1
  customRelationship: z.string().max(50).optional(), // Story 39.1 AC1: For "other" relationship
})

// Response type
interface SendCaregiverInvitationResponse {
  success: boolean
  invitationId: string
  message: string
}

/**
 * Generate a cryptographically secure invitation token.
 * Uses 32 bytes (256 bits) of randomness encoded as hex.
 */
function generateSecureToken(): string {
  return randomBytes(32).toString('hex')
}

/**
 * Send a caregiver invitation.
 *
 * Creates an invitation for a caregiver with "status_viewer" role.
 * Caregivers have limited access - they can only view child status,
 * not manage settings or see detailed data.
 *
 * Validates that:
 * - User is authenticated
 * - Input is valid (familyId, email, childIds)
 * - User is a guardian in this family
 * - All specified children belong to this family
 * - Email is not already a guardian or caregiver
 *
 * Then:
 * - Creates invitation document in /caregiverInvitations
 * - Sends email via email service
 * - Sets expiration to 7 days (AC6)
 */
export const sendCaregiverInvitation = onCall<
  z.infer<typeof sendCaregiverInvitationInputSchema>,
  Promise<SendCaregiverInvitationResponse>
>(async (request) => {
  // 1. Auth (FIRST)
  const user = verifyAuth(request.auth)

  // 2. Validation (SECOND) - using shared schema per Unbreakable Rule #1
  const parseResult = sendCaregiverInvitationInputSchema.safeParse(request.data)
  if (!parseResult.success) {
    throw new HttpsError(
      'invalid-argument',
      'Invalid input: please provide family ID, email, and at least one child'
    )
  }
  const { familyId, recipientEmail, childIds, relationship, customRelationship } = parseResult.data

  // Additional email validation
  if (!isValidEmail(recipientEmail)) {
    throw new HttpsError('invalid-argument', 'Please provide a valid email address')
  }

  const db = getFirestore()

  // 3. Permission (THIRD) - Verify user is a guardian in this family
  const familyRef = db.collection('families').doc(familyId)
  const familyDoc = await familyRef.get()

  if (!familyDoc.exists) {
    throw new HttpsError('not-found', 'Family not found')
  }

  const familyData = familyDoc.data()!

  // Check if user is a guardian (AC1: Only parents/guardians can invite)
  const isGuardian = familyData.guardians?.some((g: { uid: string }) => g.uid === user.uid)
  if (!isGuardian) {
    throw new HttpsError('permission-denied', 'Only family guardians can invite caregivers')
  }

  // Verify all specified children belong to this family
  const childrenSnapshot = await db.collection('children').where('familyId', '==', familyId).get()

  const familyChildIds = childrenSnapshot.docs.map((doc) => doc.id)
  const invalidChildIds = childIds.filter((id) => !familyChildIds.includes(id))

  if (invalidChildIds.length > 0) {
    throw new HttpsError(
      'invalid-argument',
      'One or more selected children do not belong to this family'
    )
  }

  // Check if email is already a guardian
  const existingGuardian = familyData.guardians?.find(
    (g: { uid: string; email?: string }) => g.email?.toLowerCase() === recipientEmail.toLowerCase()
  )
  if (existingGuardian) {
    throw new HttpsError('already-exists', 'This email is already a guardian in this family')
  }

  // Check if email is already a caregiver
  const existingCaregiver = familyData.caregivers?.find(
    (c: { email: string }) => c.email.toLowerCase() === recipientEmail.toLowerCase()
  )
  if (existingCaregiver) {
    throw new HttpsError('already-exists', 'This email is already a caregiver in this family')
  }

  // Check for pending invitation to same email
  const pendingInvitations = await db
    .collection('caregiverInvitations')
    .where('familyId', '==', familyId)
    .where('recipientEmail', '==', recipientEmail.toLowerCase())
    .where('status', '==', 'pending')
    .get()

  if (!pendingInvitations.empty) {
    throw new HttpsError('already-exists', 'An invitation has already been sent to this email')
  }

  // Story 39.1 AC2: Enforce maximum caregiver limit
  const activeCaregiversCount = familyData.caregivers?.length || 0
  const allPendingInvitations = await db
    .collection('caregiverInvitations')
    .where('familyId', '==', familyId)
    .where('status', '==', 'pending')
    .get()
  const pendingInvitationsCount = allPendingInvitations.size

  if (activeCaregiversCount + pendingInvitationsCount >= MAX_CAREGIVERS_PER_FAMILY) {
    throw new HttpsError(
      'failed-precondition',
      `Maximum ${MAX_CAREGIVERS_PER_FAMILY} caregivers per family. You have ${activeCaregiversCount} active and ${pendingInvitationsCount} pending.`
    )
  }

  // 4. Business logic (LAST)
  // Generate secure token
  const token = generateSecureToken()

  // Calculate expiration (7 days from now - AC6)
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + 7)

  // Get inviter name for the email
  const inviterName = user.displayName || user.email || 'A family member'

  // Create invitation document
  const invitationRef = db.collection('caregiverInvitations').doc()
  const invitationData = {
    id: invitationRef.id,
    familyId,
    inviterUid: user.uid,
    inviterName,
    familyName: familyData.name || 'Your family',
    token,
    status: 'pending',
    recipientEmail: recipientEmail.toLowerCase(),
    caregiverRole: 'status_viewer', // AC2: Status Viewer role
    relationship, // Story 39.1 AC1: Relationship type
    customRelationship: customRelationship || null, // Story 39.1 AC1: Custom text for "other"
    childIds, // AC5: Which children caregiver can see
    emailSentAt: null,
    acceptedAt: null,
    acceptedByUid: null,
    expiresAt,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  }

  await invitationRef.set(invitationData)

  // Build the join link
  const baseUrl = process.env.APP_BASE_URL || 'https://fledgely.com'
  const joinLink = `${baseUrl}/caregiver/accept?token=${token}`

  // Send email via email service
  const emailResult = await sendCaregiverInvitationEmail(recipientEmail.toLowerCase(), {
    inviterName,
    familyName: familyData.name || 'Your family',
    joinLink,
  })

  if (emailResult.success) {
    // Update invitation with email sent timestamp
    await invitationRef.update({
      emailSentAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    })
  } else {
    // Log email failure but don't fail the function
    // User can resend or share link manually
    console.warn(
      `Caregiver invitation email failed: invitationId=${invitationRef.id}, error=${emailResult.error}`
    )
  }

  // Log success for audit trail (no PII per project standards)
  console.log(
    `Caregiver invitation created: invitationId=${invitationRef.id}, familyId=${familyId}, userId=${user.uid}`
  )

  return {
    success: true,
    invitationId: invitationRef.id,
    message: emailResult.success
      ? `Invitation sent to ${recipientEmail}`
      : `Invitation created. Email could not be sent - please share the link manually.`,
  }
})
