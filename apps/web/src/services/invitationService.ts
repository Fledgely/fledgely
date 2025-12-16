'use client'

import {
  doc,
  getDoc,
  getDocs,
  collection,
  query,
  where,
  serverTimestamp,
  writeBatch,
  arrayUnion,
  type Timestamp,
} from 'firebase/firestore'
import { v4 as uuidv4 } from 'uuid'
import { db } from '@/lib/firebase'
import {
  invitationSchema,
  createInvitationInputSchema,
  calculateExpiryDate,
  buildInvitationLink,
  InvitationError,
  maskEmail,
  isEmailRateLimited,
  type Invitation,
  type CreateInvitationInput,
  type InvitationFirestore,
  type AcceptInvitationResult,
} from '@fledgely/contracts'

/**
 * Invitation Service - Firestore operations for co-parent invitation management
 *
 * Story 3.1: Co-Parent Invitation Generation
 *
 * Follows project guidelines:
 * - Direct Firestore SDK (no abstractions)
 * - Types from Zod schemas
 * - Server timestamps for reliability
 * - Batch operations for atomic updates
 *
 * CRITICAL: Token security
 * - Invitation tokens are ONLY returned once at creation time
 * - Tokens are stored hashed (SHA-256) in Firestore
 * - The tokenHash field in Firestore is NOT the original token
 */

/** Collection name for invitation documents */
const INVITATIONS_COLLECTION = 'invitations'

/** Collection name for family documents */
const FAMILIES_COLLECTION = 'families'

/** Collection name for children documents */
const CHILDREN_COLLECTION = 'children'

/** Collection name for user documents */
const USERS_COLLECTION = 'users'

/** Subcollection name for audit logs */
const AUDIT_LOG_SUBCOLLECTION = 'auditLog'

/** Base URL for invitation links */
const INVITATION_BASE_URL = typeof window !== 'undefined'
  ? window.location.origin
  : process.env.NEXT_PUBLIC_APP_URL || 'https://fledgely.app'

/**
 * Result of creating an invitation
 * Includes the invitation details AND the unhashed token (shown only once)
 */
export interface CreateInvitationResult {
  /** Created invitation (without token - hash stored instead) */
  invitation: Invitation
  /** Invitation token - ONLY returned once, not stored in Firestore */
  token: string
  /** Complete invitation link for sharing */
  invitationLink: string
}

/**
 * Result of checking for existing invitation
 */
export interface ExistingInvitationResult {
  /** Whether a pending invitation exists */
  exists: boolean
  /** The existing invitation if found */
  invitation: Invitation | null
}


/**
 * Generate SHA-256 hash of a token
 * Uses Web Crypto API (available in modern browsers)
 */
async function hashToken(token: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(token)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
  return hashHex
}

/**
 * Convert Firestore document data to Invitation type
 * Handles Timestamp to Date conversion
 */
function convertFirestoreInvitation(
  data: Record<string, unknown>,
  id: string
): Invitation {
  return invitationSchema.parse({
    id,
    familyId: data.familyId,
    familyName: data.familyName,
    invitedBy: data.invitedBy,
    invitedByName: data.invitedByName,
    tokenHash: data.tokenHash,
    status: data.status,
    createdAt: (data.createdAt as Timestamp)?.toDate(),
    expiresAt: (data.expiresAt as Timestamp)?.toDate(),
    acceptedAt: data.acceptedAt ? (data.acceptedAt as Timestamp)?.toDate() : null,
    acceptedBy: data.acceptedBy ?? null,
  })
}

/**
 * Check if user is a guardian with full permissions for a family
 */
async function verifyGuardianPermissions(
  familyId: string,
  userId: string
): Promise<{ isAuthorized: boolean; familyName: string; invitedByName: string }> {
  const familyRef = doc(db, FAMILIES_COLLECTION, familyId)
  const familySnapshot = await getDoc(familyRef)

  if (!familySnapshot.exists()) {
    throw new InvitationError('family-not-found')
  }

  const familyData = familySnapshot.data()
  const guardians = familyData.guardians as Array<{
    uid: string
    role: string
    permissions: string
  }>

  const guardian = guardians?.find((g) => g.uid === userId)
  if (!guardian) {
    throw new InvitationError('not-authorized')
  }

  // Only guardians with full permissions can invite
  if (guardian.permissions !== 'full') {
    throw new InvitationError('not-authorized')
  }

  // Get user display name
  const userRef = doc(db, USERS_COLLECTION, userId)
  const userSnapshot = await getDoc(userRef)
  const userData = userSnapshot.exists() ? userSnapshot.data() : null
  const invitedByName = userData?.displayName || 'A family member'

  // Use family name or fallback
  const familyName = familyData.name || `${invitedByName}'s Family`

  return {
    isAuthorized: true,
    familyName,
    invitedByName,
  }
}

/**
 * Check if family has at least one child
 */
async function verifyFamilyHasChildren(familyId: string): Promise<boolean> {
  const childrenQuery = query(
    collection(db, CHILDREN_COLLECTION),
    where('familyId', '==', familyId)
  )
  const childrenSnapshot = await getDocs(childrenQuery)
  return !childrenSnapshot.empty
}

/**
 * Get existing pending invitation for a family
 *
 * @param familyId - Family ID to check
 * @returns ExistingInvitationResult with invitation if exists
 */
export async function getExistingPendingInvitation(
  familyId: string
): Promise<ExistingInvitationResult> {
  try {
    const invitationsQuery = query(
      collection(db, INVITATIONS_COLLECTION),
      where('familyId', '==', familyId),
      where('status', '==', 'pending')
    )
    const snapshot = await getDocs(invitationsQuery)

    if (snapshot.empty) {
      return { exists: false, invitation: null }
    }

    // Get the first (should be only) pending invitation
    const invitationDoc = snapshot.docs[0]
    const invitation = convertFirestoreInvitation(
      invitationDoc.data(),
      invitationDoc.id
    )

    // Check if it's actually expired (status not updated)
    if (new Date() > invitation.expiresAt) {
      // Mark as expired in background (don't wait)
      markInvitationExpired(invitationDoc.id).catch(console.error)
      return { exists: false, invitation: null }
    }

    return { exists: true, invitation }
  } catch (error) {
    console.error('[invitationService.getExistingPendingInvitation]', error)
    throw error
  }
}

/**
 * Mark an invitation as expired (background operation)
 */
async function markInvitationExpired(invitationId: string): Promise<void> {
  try {
    const batch = writeBatch(db)
    const invitationRef = doc(db, INVITATIONS_COLLECTION, invitationId)
    batch.update(invitationRef, { status: 'expired' })
    await batch.commit()
  } catch (error) {
    console.error('[invitationService.markInvitationExpired]', error)
    // Don't throw - this is a background operation
  }
}

/**
 * Create a co-parent invitation
 *
 * Story 3.1: Co-Parent Invitation Generation
 *
 * Prerequisites:
 * - User must be a guardian with full permissions
 * - Family must have at least one child
 * - No existing pending invitation for the family
 *
 * Security:
 * - Token is generated using UUID v4
 * - Token is hashed (SHA-256) before storage
 * - Original token is ONLY returned once in the result
 *
 * @param input - Invitation input (familyId, optional expiryDays)
 * @param userId - ID of the user creating the invitation
 * @returns CreateInvitationResult with invitation, token, and link
 * @throws InvitationError for validation failures
 */
export async function createCoParentInvitation(
  input: CreateInvitationInput,
  userId: string
): Promise<CreateInvitationResult> {
  try {
    // Validate input
    const validatedInput = createInvitationInputSchema.parse(input)
    const { familyId, expiryDays } = validatedInput

    // 1. Verify user has guardian permissions
    const { familyName, invitedByName } = await verifyGuardianPermissions(
      familyId,
      userId
    )

    // 2. Verify family has at least one child
    const hasChildren = await verifyFamilyHasChildren(familyId)
    if (!hasChildren) {
      throw new InvitationError('no-children')
    }

    // 3. Check for existing pending invitation
    const existing = await getExistingPendingInvitation(familyId)
    if (existing.exists && existing.invitation) {
      throw new InvitationError('pending-exists')
    }

    // 4. Generate secure token (UUID v4)
    const token = uuidv4()

    // 5. Hash token for storage
    const tokenHash = await hashToken(token)

    // 6. Calculate expiry date
    const now = new Date()
    const expiresAt = calculateExpiryDate(now, expiryDays)

    // 7. Create invitation document
    const invitationRef = doc(collection(db, INVITATIONS_COLLECTION))
    const invitationId = invitationRef.id

    const invitationData = {
      id: invitationId,
      familyId,
      familyName,
      invitedBy: userId,
      invitedByName,
      tokenHash,
      status: 'pending',
      createdAt: serverTimestamp(),
      expiresAt: serverTimestamp(), // Will be set to actual expiry below
      acceptedAt: null,
      acceptedBy: null,
    }

    // 8. Create audit entry
    const auditRef = doc(
      collection(db, FAMILIES_COLLECTION, familyId, AUDIT_LOG_SUBCOLLECTION)
    )
    const auditData = {
      id: auditRef.id,
      action: 'invitation_created',
      entityType: 'invitation',
      entityId: invitationId,
      performedBy: userId,
      performedAt: serverTimestamp(),
      metadata: {
        expiryDays,
        familyName,
      },
    }

    // 9. Execute batch operation atomically
    const batch = writeBatch(db)

    // Set invitation with computed expiresAt (can't use serverTimestamp for calculation)
    batch.set(invitationRef, {
      ...invitationData,
      createdAt: serverTimestamp(),
      expiresAt, // Use the calculated Date
    })

    batch.set(auditRef, auditData)

    await batch.commit()

    // 10. Build invitation link
    const invitationLink = buildInvitationLink(
      INVITATION_BASE_URL,
      invitationId,
      token
    )

    // 11. Return result with token (ONLY TIME token is exposed)
    const invitation = invitationSchema.parse({
      id: invitationId,
      familyId,
      familyName,
      invitedBy: userId,
      invitedByName,
      tokenHash,
      status: 'pending',
      createdAt: now,
      expiresAt,
      acceptedAt: null,
      acceptedBy: null,
    })

    return {
      invitation,
      token,
      invitationLink,
    }
  } catch (error) {
    if (error instanceof InvitationError) {
      console.error('[invitationService.createCoParentInvitation]', error.code)
      throw error
    }
    console.error('[invitationService.createCoParentInvitation]', error)
    throw new InvitationError('creation-failed')
  }
}

/**
 * Get invitation by ID
 *
 * @param invitationId - Invitation document ID
 * @returns Invitation or null if not found
 */
export async function getInvitation(
  invitationId: string
): Promise<Invitation | null> {
  try {
    const invitationRef = doc(db, INVITATIONS_COLLECTION, invitationId)
    const snapshot = await getDoc(invitationRef)

    if (!snapshot.exists()) {
      return null
    }

    return convertFirestoreInvitation(snapshot.data(), snapshot.id)
  } catch (error) {
    console.error('[invitationService.getInvitation]', error)
    throw error
  }
}

/**
 * Revoke a pending invitation
 *
 * @param invitationId - Invitation document ID
 * @param userId - User ID revoking the invitation
 * @returns Updated invitation
 * @throws InvitationError if invitation cannot be revoked
 */
export async function revokeInvitation(
  invitationId: string,
  userId: string
): Promise<Invitation> {
  try {
    const invitation = await getInvitation(invitationId)

    if (!invitation) {
      throw new InvitationError('invitation-not-found')
    }

    if (invitation.status !== 'pending') {
      throw new InvitationError('invitation-already-used')
    }

    // Verify user is the one who created the invitation or is a guardian
    const { isAuthorized } = await verifyGuardianPermissions(
      invitation.familyId,
      userId
    )
    if (!isAuthorized) {
      throw new InvitationError('not-authorized')
    }

    // Update invitation status
    const batch = writeBatch(db)
    const invitationRef = doc(db, INVITATIONS_COLLECTION, invitationId)
    batch.update(invitationRef, { status: 'revoked' })

    // Create audit entry
    const auditRef = doc(
      collection(
        db,
        FAMILIES_COLLECTION,
        invitation.familyId,
        AUDIT_LOG_SUBCOLLECTION
      )
    )
    const auditData = {
      id: auditRef.id,
      action: 'invitation_revoked',
      entityType: 'invitation',
      entityId: invitationId,
      performedBy: userId,
      performedAt: serverTimestamp(),
      metadata: {
        familyName: invitation.familyName,
      },
    }
    batch.set(auditRef, auditData)

    await batch.commit()

    return {
      ...invitation,
      status: 'revoked',
    }
  } catch (error) {
    if (error instanceof InvitationError) {
      console.error('[invitationService.revokeInvitation]', error.code)
      throw error
    }
    console.error('[invitationService.revokeInvitation]', error)
    throw new InvitationError('creation-failed')
  }
}

/**
 * Result of verifying an invitation token
 */
export interface VerifyTokenResult {
  /** Whether the token is valid */
  valid: boolean
  /** The invitation if valid */
  invitation: Invitation | null
  /** Error code if invalid */
  errorCode?: 'not-found' | 'expired' | 'already-used' | 'invalid-token'
}

/**
 * Verify an invitation token matches the stored hash
 *
 * Validates:
 * 1. Invitation exists
 * 2. Invitation is not expired
 * 3. Invitation status is 'pending'
 * 4. Token hash matches
 *
 * Uses timing-safe comparison to prevent timing attacks.
 *
 * @param invitationId - Invitation document ID
 * @param token - Token to verify
 * @returns VerifyTokenResult with validity, invitation, and error code
 */
export async function verifyInvitationToken(
  invitationId: string,
  token: string
): Promise<VerifyTokenResult> {
  try {
    const invitation = await getInvitation(invitationId)

    if (!invitation) {
      return { valid: false, invitation: null, errorCode: 'not-found' }
    }

    // Check expiry before processing token
    if (new Date() > invitation.expiresAt) {
      // Mark as expired in background
      markInvitationExpired(invitationId).catch(console.error)
      return { valid: false, invitation: null, errorCode: 'expired' }
    }

    // Check status is pending
    if (invitation.status !== 'pending') {
      return { valid: false, invitation: null, errorCode: 'already-used' }
    }

    // Hash the provided token and compare
    const tokenHash = await hashToken(token)

    // Use timing-safe comparison to prevent timing attacks
    // Both strings must be the same length for this to work
    if (tokenHash.length !== invitation.tokenHash.length) {
      return { valid: false, invitation: null, errorCode: 'invalid-token' }
    }

    // Constant-time comparison
    let result = 0
    for (let i = 0; i < tokenHash.length; i++) {
      result |= tokenHash.charCodeAt(i) ^ invitation.tokenHash.charCodeAt(i)
    }

    if (result !== 0) {
      return { valid: false, invitation: null, errorCode: 'invalid-token' }
    }

    return { valid: true, invitation }
  } catch (error) {
    console.error('[invitationService.verifyInvitationToken]', error)
    return { valid: false, invitation: null, errorCode: 'not-found' }
  }
}

// ============================================================================
// Story 3.2: Invitation Delivery - Email Service Functions
// ============================================================================

/**
 * Result of sending an invitation email
 */
export interface SendEmailResult {
  /** Whether the email was sent successfully */
  success: boolean
  /** Error code if failed */
  errorCode?:
    | 'rate-limited'
    | 'invitation-not-found'
    | 'invitation-expired'
    | 'not-authorized'
    | 'email-send-failed'
  /** Masked email address (for display) */
  maskedEmail?: string
}

/**
 * Send invitation email
 *
 * Story 3.2: Invitation Delivery
 *
 * Rate limiting: Maximum 3 emails per hour per invitation
 *
 * @param invitationId - Invitation document ID
 * @param email - Recipient email address
 * @param userId - User ID sending the email
 * @param invitationLink - Full invitation link to include in email
 * @returns SendEmailResult with success status and masked email
 */
export async function sendInvitationEmail(
  invitationId: string,
  email: string,
  userId: string,
  invitationLink: string
): Promise<SendEmailResult> {
  try {
    // 0. Normalize email (trim and lowercase for consistency)
    const normalizedEmail = email.trim().toLowerCase()

    // Validate email format after normalization
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(normalizedEmail) || normalizedEmail.length > 254) {
      return { success: false, errorCode: 'invalid-email' }
    }

    // 1. Get invitation
    const invitationRef = doc(db, INVITATIONS_COLLECTION, invitationId)
    const invitationSnapshot = await getDoc(invitationRef)

    if (!invitationSnapshot.exists()) {
      return { success: false, errorCode: 'invitation-not-found' }
    }

    const invitationData = invitationSnapshot.data()

    // 2. Verify user is the inviter
    if (invitationData.invitedBy !== userId) {
      return { success: false, errorCode: 'not-authorized' }
    }

    // 3. Check if expired
    const expiresAt =
      invitationData.expiresAt instanceof Date
        ? invitationData.expiresAt
        : (invitationData.expiresAt as Timestamp)?.toDate()

    if (new Date() > expiresAt) {
      return { success: false, errorCode: 'invitation-expired' }
    }

    // 4. Check rate limit
    const emailSendCount = invitationData.emailSendCount || 0
    const emailSentAt = invitationData.emailSentAt
      ? (invitationData.emailSentAt as Timestamp)?.toDate()
      : null

    if (isEmailRateLimited(emailSendCount, emailSentAt)) {
      return { success: false, errorCode: 'rate-limited' }
    }

    // 5. Mask email for storage
    const maskedEmail = maskEmail(normalizedEmail)

    // 6. Calculate new send count (reset if past hour)
    const hourAgo = new Date(Date.now() - 60 * 60 * 1000)
    const newEmailSendCount =
      emailSentAt && emailSentAt > hourAgo ? emailSendCount + 1 : 1

    // 7. Prepare email via Firebase Extension (Trigger Email)
    // Using the 'mail' collection pattern for Firebase Extensions
    const mailRef = doc(collection(db, 'mail'))
    const emailData = {
      to: normalizedEmail,
      // Include invitationId for Firestore security rules verification
      invitationId,
      message: {
        subject: `Join ${invitationData.familyName} on fledgely`,
        html: generateInvitationEmailHtml({
          familyName: invitationData.familyName,
          inviterName: invitationData.invitedByName,
          invitationLink,
          expiresAt,
        }),
        text: generateInvitationEmailText({
          familyName: invitationData.familyName,
          inviterName: invitationData.invitedByName,
          invitationLink,
          expiresAt,
        }),
      },
    }

    // 8. Execute batch operation
    // CRITICAL ORDER: Update tracking FIRST, then audit, then email
    // This ensures rate limit counter is accurate even if extension fails
    const batch = writeBatch(db)

    // Update invitation with email tracking FIRST
    batch.update(invitationRef, {
      emailSentTo: maskedEmail,
      emailSentAt: serverTimestamp(),
      emailSendCount: newEmailSendCount,
    })

    // Create audit entry SECOND
    const auditRef = doc(
      collection(
        db,
        FAMILIES_COLLECTION,
        invitationData.familyId,
        AUDIT_LOG_SUBCOLLECTION
      )
    )
    batch.set(auditRef, {
      id: auditRef.id,
      action: 'invitation_email_sent',
      entityType: 'invitation',
      entityId: invitationId,
      performedBy: userId,
      performedAt: serverTimestamp(),
      metadata: {
        emailSentTo: maskedEmail,
        sendCount: newEmailSendCount,
      },
    })

    // Add email to mail collection LAST (triggers Firebase extension)
    // If batch fails, email won't be sent
    // If batch succeeds but extension fails, tracking is still accurate
    batch.set(mailRef, emailData)

    await batch.commit()

    return { success: true, maskedEmail }
  } catch (error) {
    console.error('[invitationService.sendInvitationEmail]', error)
    return { success: false, errorCode: 'email-send-failed' }
  }
}

/**
 * Escape HTML special characters to prevent injection
 * Used for user-provided values in email templates
 */
function escapeHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

/**
 * Generate HTML email content for invitation
 *
 * Content is at 6th-grade reading level (NFR65)
 */
function generateInvitationEmailHtml(params: {
  familyName: string
  inviterName: string
  invitationLink: string
  expiresAt: Date
}): string {
  const { familyName, inviterName, invitationLink, expiresAt } = params

  // Sanitize user-provided values to prevent HTML injection
  const safeFamilyName = escapeHtml(familyName)
  const safeInviterName = escapeHtml(inviterName)
  const safeInvitationLink = escapeHtml(invitationLink)

  const expiryDate = expiresAt.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light dark">
  <title>Join ${safeFamilyName} on fledgely</title>
</head>
<body role="article" aria-label="Family invitation email" style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <header style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 24px;">You're Invited!</h1>
  </header>

  <main style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
    <p style="font-size: 16px; margin-bottom: 20px;">
      Hi there!
    </p>

    <p style="font-size: 16px; margin-bottom: 20px;">
      <strong>${safeInviterName}</strong> has invited you to join <strong>${safeFamilyName}</strong> on fledgely.
    </p>

    <p style="font-size: 16px; margin-bottom: 20px;">
      Fledgely helps parents work together to keep their children safe online. When you join, you'll be able to:
    </p>

    <ul style="font-size: 16px; margin-bottom: 25px; padding-left: 20px;">
      <li style="margin-bottom: 10px;">See and help manage family agreements</li>
      <li style="margin-bottom: 10px;">View your children's online activity</li>
      <li style="margin-bottom: 10px;">Make decisions together as co-parents</li>
    </ul>

    <div style="text-align: center; margin: 30px 0;">
      <a href="${safeInvitationLink}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; padding: 15px 40px; border-radius: 8px; font-size: 18px; font-weight: bold;">
        Join Family
      </a>
    </div>

    <p style="font-size: 14px; color: #666; margin-top: 20px;">
      Or copy and paste this link into your browser:<br>
      <a href="${safeInvitationLink}" style="color: #667eea; word-break: break-all;">${safeInvitationLink}</a>
    </p>

    <p style="font-size: 14px; color: #888; margin-top: 20px; font-style: italic;">
      This invitation expires on ${expiryDate}.
    </p>

    <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">

    <p style="font-size: 12px; color: #999; text-align: center;">
      If you weren't expecting this invitation, you can safely ignore this email.
    </p>
  </main>
</body>
</html>
  `.trim()
}

/**
 * Generate plain text email content for invitation
 *
 * Content is at 6th-grade reading level (NFR65)
 */
function generateInvitationEmailText(params: {
  familyName: string
  inviterName: string
  invitationLink: string
  expiresAt: Date
}): string {
  const { familyName, inviterName, invitationLink, expiresAt } = params
  const expiryDate = expiresAt.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })

  return `
You're Invited!

Hi there!

${inviterName} has invited you to join ${familyName} on fledgely.

Fledgely helps parents work together to keep their children safe online. When you join, you'll be able to:

- See and help manage family agreements
- View your children's online activity
- Make decisions together as co-parents

Click here to join: ${invitationLink}

This invitation expires on ${expiryDate}.

---

If you weren't expecting this invitation, you can safely ignore this email.
  `.trim()
}

/**
 * Get email tracking info for an invitation
 *
 * @param invitationId - Invitation document ID
 * @returns Email tracking info or null if invitation not found
 */
export async function getInvitationEmailInfo(
  invitationId: string
): Promise<{
  emailSentTo: string | null
  emailSentAt: Date | null
  emailSendCount: number
} | null> {
  try {
    const invitationRef = doc(db, INVITATIONS_COLLECTION, invitationId)
    const snapshot = await getDoc(invitationRef)

    if (!snapshot.exists()) {
      return null
    }

    const data = snapshot.data()
    return {
      emailSentTo: data.emailSentTo || null,
      emailSentAt: data.emailSentAt
        ? (data.emailSentAt as Timestamp)?.toDate()
        : null,
      emailSendCount: data.emailSendCount || 0,
    }
  } catch (error) {
    console.error('[invitationService.getInvitationEmailInfo]', error)
    return null
  }
}

// ============================================================================
// Story 3.3: Co-Parent Invitation Acceptance
// ============================================================================

/**
 * Accept a co-parent invitation and join a family
 *
 * Story 3.3: Co-Parent Invitation Acceptance
 *
 * This function performs the following atomic operations:
 * 1. Verify token matches stored hash (timing-safe comparison)
 * 2. Validate invitation is pending and not expired
 * 3. Check user is not the inviter (self-invitation prevention)
 * 4. Check user is not already a guardian in the family
 * 5. Add user to family's guardians array as co-parent with full permissions
 * 6. Add user to all children's guardians array with full permissions
 * 7. Update invitation status to 'accepted' with acceptedAt and acceptedBy
 * 8. Create audit log entry for the acceptance
 *
 * Security:
 * - Token verification uses timing-safe comparison
 * - All updates are atomic via Firestore batch
 * - User must be authenticated (userId required)
 *
 * @param invitationId - Invitation document ID
 * @param token - Invitation token to verify
 * @param userId - ID of the user accepting the invitation
 * @returns AcceptInvitationResult with success status and family details or error
 */
export async function acceptInvitation(
  invitationId: string,
  token: string,
  userId: string
): Promise<AcceptInvitationResult> {
  try {
    // 1. Verify the token
    const verifyResult = await verifyInvitationToken(invitationId, token)

    if (!verifyResult.valid || !verifyResult.invitation) {
      // Map error codes to acceptance error codes
      const errorCodeMap: Record<string, AcceptInvitationResult['errorCode']> = {
        'not-found': 'invitation-not-found',
        'expired': 'invitation-expired',
        'already-used': 'invitation-revoked', // Revoked or accepted
        'invalid-token': 'token-invalid',
      }
      return {
        success: false,
        errorCode: errorCodeMap[verifyResult.errorCode || 'not-found'] || 'invitation-not-found',
      }
    }

    const invitation = verifyResult.invitation

    // 2. Check for self-invitation
    if (invitation.invitedBy === userId) {
      return { success: false, errorCode: 'self-invitation' }
    }

    // 3. Get family document to check if user is already a guardian
    const familyRef = doc(db, FAMILIES_COLLECTION, invitation.familyId)
    const familySnapshot = await getDoc(familyRef)

    if (!familySnapshot.exists()) {
      return { success: false, errorCode: 'invitation-not-found' }
    }

    const familyData = familySnapshot.data()
    const guardians = familyData.guardians as Array<{
      uid: string
      role: string
      permissions: string
    }>

    // 4. Check if user is already a guardian
    const existingGuardian = guardians?.find((g) => g.uid === userId)
    if (existingGuardian) {
      return { success: false, errorCode: 'already-guardian' }
    }

    // 5. Get all children in this family for guardian addition
    const childrenQuery = query(
      collection(db, CHILDREN_COLLECTION),
      where('familyId', '==', invitation.familyId)
    )
    const childrenSnapshot = await getDocs(childrenQuery)
    const childrenCount = childrenSnapshot.docs.length

    // 6. Prepare the new guardian entry for family
    const newFamilyGuardian = {
      uid: userId,
      role: 'co-parent',
      permissions: 'full',
      joinedAt: serverTimestamp(),
    }

    // 7. Prepare the new guardian entry for children
    const newChildGuardian = {
      uid: userId,
      permissions: 'full',
      grantedAt: serverTimestamp(),
    }

    // 8. Execute atomic batch operation
    const batch = writeBatch(db)

    // 8a. Update invitation status to 'accepted'
    const invitationRef = doc(db, INVITATIONS_COLLECTION, invitationId)
    batch.update(invitationRef, {
      status: 'accepted',
      acceptedAt: serverTimestamp(),
      acceptedBy: userId,
    })

    // 8b. Add user to family guardians array
    batch.update(familyRef, {
      guardians: arrayUnion(newFamilyGuardian),
    })

    // 8c. Add user to each child's guardians array
    childrenSnapshot.docs.forEach((childDoc) => {
      const childRef = doc(db, CHILDREN_COLLECTION, childDoc.id)
      batch.update(childRef, {
        guardians: arrayUnion(newChildGuardian),
      })
    })

    // 8d. Create audit log entry
    const auditRef = doc(
      collection(
        db,
        FAMILIES_COLLECTION,
        invitation.familyId,
        AUDIT_LOG_SUBCOLLECTION
      )
    )
    batch.set(auditRef, {
      id: auditRef.id,
      action: 'guardian_joined',
      entityType: 'family',
      entityId: invitation.familyId,
      performedBy: userId,
      performedAt: serverTimestamp(),
      metadata: {
        invitationId,
        joinedAs: 'co-parent',
        childrenCount,
        invitedBy: invitation.invitedBy,
      },
    })

    // 9. Commit the batch
    await batch.commit()

    // 10. Return success result
    return {
      success: true,
      familyId: invitation.familyId,
      familyName: invitation.familyName,
      childrenCount,
    }
  } catch (error) {
    console.error('[invitationService.acceptInvitation]', error)
    return { success: false, errorCode: 'acceptance-failed' }
  }
}

/**
 * Get invitation details for the join page (without requiring token verification)
 *
 * This function returns limited invitation details for display purposes.
 * It does NOT verify the token - that's done during acceptance.
 *
 * Returns:
 * - Family name for display
 * - Inviter name for display
 * - Status to show appropriate messaging
 * - Expiry information
 *
 * @param invitationId - Invitation document ID
 * @returns Invitation preview or null if not found
 */
export async function getInvitationPreview(
  invitationId: string
): Promise<{
  familyName: string
  invitedByName: string
  status: 'pending' | 'expired' | 'accepted' | 'revoked'
  expiresAt: Date
  isExpired: boolean
} | null> {
  try {
    const invitation = await getInvitation(invitationId)

    if (!invitation) {
      return null
    }

    const isExpired =
      invitation.status === 'expired' || new Date() > invitation.expiresAt

    // Determine effective status
    const status = isExpired && invitation.status === 'pending' ? 'expired' : invitation.status

    return {
      familyName: invitation.familyName,
      invitedByName: invitation.invitedByName,
      status,
      expiresAt: invitation.expiresAt,
      isExpired,
    }
  } catch (error) {
    console.error('[invitationService.getInvitationPreview]', error)
    return null
  }
}
