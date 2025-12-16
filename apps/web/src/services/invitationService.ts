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
  type Invitation,
  type CreateInvitationInput,
  type InvitationFirestore,
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
 * Custom error class for invitation service errors
 */
export class InvitationServiceError extends Error {
  constructor(
    public readonly code: string,
    message: string
  ) {
    super(message)
    this.name = 'InvitationServiceError'
  }
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
