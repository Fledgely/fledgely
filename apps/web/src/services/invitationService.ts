/**
 * Invitation service for co-parent invitations.
 *
 * Handles CRUD operations for invitations stored in /invitations/{invitationId}.
 * Uses Firebase SDK directly per Unbreakable Rule #2.
 * Validates data with Zod schemas from @fledgely/shared/contracts.
 *
 * IMPORTANT: For MVP, all invitations are BLOCKED until Epic 3A is complete.
 * The checkEpic3ASafeguards() function returns false, preventing actual invitations.
 */

import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
  serverTimestamp,
  Timestamp,
  FirestoreError,
} from 'firebase/firestore'
import { httpsCallable } from 'firebase/functions'
import { User as FirebaseUser } from 'firebase/auth'
import { invitationSchema, type Invitation, type Family } from '@fledgely/shared/contracts'
import { getFirestoreDb, getFirebaseFunctions } from '../lib/firebase'

/**
 * Check if Epic 3A safeguards are active.
 *
 * For MVP, this always returns false, blocking co-parent invitations.
 * When Epic 3A is complete, this will check for:
 * - Data symmetry enforcement rules active
 * - Two-parent approval workflows ready
 * - Cooling period mechanisms in place
 *
 * @returns false for MVP (safeguards not ready)
 */
export function checkEpic3ASafeguards(): boolean {
  // TODO: Implement actual checks when Epic 3A stories are complete:
  // - Story 3A.1: Data Symmetry Enforcement
  // - Story 3A.2: Safety Settings Two-Parent Approval
  // - Story 3A.3: Agreement Changes Two-Parent Approval
  // - Story 3A.4: Safety Rule 48-Hour Cooling Period
  // - Story 3A.5: Screenshot Viewing Rate Alert
  // - Story 3A.6: Co-Parent Removal Prevention
  return false
}

/**
 * Convert Firestore Timestamp fields to Date for Zod validation.
 */
function convertInvitationTimestamps(data: Record<string, unknown>): Record<string, unknown> {
  const result = { ...data }
  if (result.expiresAt instanceof Timestamp) {
    result.expiresAt = result.expiresAt.toDate()
  }
  if (result.createdAt instanceof Timestamp) {
    result.createdAt = result.createdAt.toDate()
  }
  if (result.updatedAt instanceof Timestamp) {
    result.updatedAt = result.updatedAt.toDate()
  }
  if (result.emailSentAt instanceof Timestamp) {
    result.emailSentAt = result.emailSentAt.toDate()
  }
  // Ensure nullable fields have null if not present
  if (!('recipientEmail' in result)) {
    result.recipientEmail = null
  }
  if (!('emailSentAt' in result)) {
    result.emailSentAt = null
  }
  return result
}

/**
 * Get an invitation by ID from Firestore.
 *
 * @param invitationId - The invitation document ID
 * @returns The validated invitation, or null if not found
 * @throws If the document exists but fails schema validation
 */
export async function getInvitation(invitationId: string): Promise<Invitation | null> {
  const db = getFirestoreDb()
  const invitationRef = doc(db, 'invitations', invitationId)
  const docSnap = await getDoc(invitationRef)

  if (!docSnap.exists()) {
    return null
  }

  const data = docSnap.data()
  const convertedData = convertInvitationTimestamps(data)

  return invitationSchema.parse(convertedData)
}

/**
 * Get the pending invitation for a family.
 *
 * Only one pending invitation per family is allowed.
 * Automatically filters out expired invitations.
 *
 * @param familyId - The family ID to check for pending invitations
 * @returns The pending invitation, or null if none exists or all are expired
 */
export async function getPendingInvitation(familyId: string): Promise<Invitation | null> {
  const db = getFirestoreDb()
  const invitationsRef = collection(db, 'invitations')
  const pendingQuery = query(
    invitationsRef,
    where('familyId', '==', familyId),
    where('status', '==', 'pending')
  )

  const snapshot = await getDocs(pendingQuery)

  if (snapshot.empty) {
    return null
  }

  // Check each pending invitation for expiration
  const now = new Date()
  for (const docSnap of snapshot.docs) {
    const data = docSnap.data()
    const convertedData = convertInvitationTimestamps(data)
    const invitation = invitationSchema.parse(convertedData)

    // Return first non-expired pending invitation
    if (invitation.expiresAt > now) {
      return invitation
    }
  }

  // All pending invitations are expired
  return null
}

/**
 * Create a co-parent invitation.
 *
 * IMPORTANT: This function checks Epic 3A safeguards and will throw
 * if safeguards are not ready (which is the case for MVP).
 *
 * @param family - The family to invite a co-parent to
 * @param inviterUser - The Firebase Auth user creating the invitation
 * @returns The created invitation
 * @throws If Epic 3A safeguards are not active
 * @throws If a pending invitation already exists
 */
export async function createInvitation(
  family: Family,
  inviterUser: FirebaseUser
): Promise<Invitation> {
  // 1. Check Epic 3A safeguards
  if (!checkEpic3ASafeguards()) {
    throw new Error(
      'Co-parent invitations are not yet available. Safety safeguards under development.'
    )
  }

  // 2. Check for existing pending invitation
  const pending = await getPendingInvitation(family.id)
  if (pending) {
    throw new Error('A pending invitation already exists. Please revoke it first.')
  }

  try {
    const db = getFirestoreDb()

    // 3. Generate invitation with secure token
    const invitationId = crypto.randomUUID()
    const token = crypto.randomUUID()
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7) // 7 days expiry

    // 4. Create in Firestore
    const invitationRef = doc(db, 'invitations', invitationId)
    await setDoc(invitationRef, {
      id: invitationId,
      familyId: family.id,
      inviterUid: inviterUser.uid,
      inviterName: inviterUser.displayName || 'Parent',
      familyName: family.name,
      token,
      status: 'pending',
      recipientEmail: null, // Set when email is sent (Story 3.2)
      emailSentAt: null, // Set when email is sent (Story 3.2)
      expiresAt: Timestamp.fromDate(expiresAt),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })

    // Read back the invitation to get server-generated timestamps
    const createdDoc = await getDoc(invitationRef)
    if (!createdDoc.exists()) {
      throw new Error('Failed to create invitation')
    }

    const data = createdDoc.data()
    const convertedData = convertInvitationTimestamps(data)

    return invitationSchema.parse(convertedData)
  } catch (err) {
    if (err instanceof FirestoreError) {
      console.error('Firestore error creating invitation:', err.code, err.message)
      if (err.code === 'permission-denied') {
        throw new Error('You do not have permission to create invitations')
      } else if (err.code === 'unavailable') {
        throw new Error('Unable to connect to the server. Please try again.')
      }
      throw new Error('Unable to create invitation. Please try again.')
    }
    throw err
  }
}

/**
 * Revoke a pending invitation.
 *
 * Only the inviter can revoke their invitation.
 *
 * @param invitationId - The invitation to revoke
 * @param revokerUid - The UID of the user revoking (must be inviter)
 */
export async function revokeInvitation(invitationId: string, revokerUid: string): Promise<void> {
  try {
    const db = getFirestoreDb()
    const invitationRef = doc(db, 'invitations', invitationId)

    // Verify invitation exists and user is inviter
    const docSnap = await getDoc(invitationRef)
    if (!docSnap.exists()) {
      throw new Error('Invitation not found')
    }

    const data = docSnap.data()
    if (data.inviterUid !== revokerUid) {
      throw new Error('Only the inviter can revoke this invitation')
    }

    if (data.status !== 'pending') {
      throw new Error('Only pending invitations can be revoked')
    }

    // Update status to revoked
    await updateDoc(invitationRef, {
      status: 'revoked',
      updatedAt: serverTimestamp(),
    })
  } catch (err) {
    if (err instanceof FirestoreError) {
      console.error('Firestore error revoking invitation:', err.code, err.message)
      if (err.code === 'permission-denied') {
        throw new Error('You do not have permission to revoke this invitation')
      } else if (err.code === 'unavailable') {
        throw new Error('Unable to connect to the server. Please try again.')
      }
      throw new Error('Unable to revoke invitation. Please try again.')
    }
    throw err
  }
}

/**
 * Result of sending an invitation email.
 */
export interface SendInvitationEmailResult {
  success: boolean
  message: string
}

/**
 * Send an invitation email via Cloud Function.
 *
 * Calls the sendInvitation Cloud Function which:
 * - Validates the invitation exists and is pending
 * - Verifies the user is the inviter
 * - Sends the email via Resend
 * - Updates the invitation with recipientEmail and emailSentAt
 *
 * @param invitationId - The invitation ID to send
 * @param recipientEmail - The email address to send the invitation to
 * @returns Result with success status and message
 *
 * Implements AC2 (Invitation Email Sending) and AC6 (Error Handling)
 */
export async function sendInvitationEmail(
  invitationId: string,
  recipientEmail: string
): Promise<SendInvitationEmailResult> {
  try {
    const functions = getFirebaseFunctions()
    const sendInvitation = httpsCallable<
      { invitationId: string; recipientEmail: string },
      { success: boolean; message: string }
    >(functions, 'sendInvitation')

    const result = await sendInvitation({ invitationId, recipientEmail })
    return result.data
  } catch (err) {
    // Handle Firebase Functions errors
    const error = err as { code?: string; message?: string }
    console.error('Error sending invitation email:', error.message)

    // Return user-friendly error messages (AC6)
    if (error.code === 'functions/unauthenticated') {
      return {
        success: false,
        message: 'Please sign in to send invitations.',
      }
    }
    if (error.code === 'functions/permission-denied') {
      return {
        success: false,
        message: 'You do not have permission to send this invitation.',
      }
    }
    if (error.code === 'functions/not-found') {
      return {
        success: false,
        message: 'Invitation not found.',
      }
    }
    if (error.code === 'functions/invalid-argument') {
      return {
        success: false,
        message: 'Please provide a valid email address.',
      }
    }

    return {
      success: false,
      message: 'Unable to send invitation email. Please try again or use the copy link option.',
    }
  }
}

/**
 * Validate email format.
 *
 * Uses a standard email regex pattern.
 *
 * @param email - Email address to validate
 * @returns true if email format is valid
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * Generate the invitation join link for an invitation.
 *
 * @param invitation - The invitation with token
 * @returns The full join link URL
 */
export function getInvitationLink(invitation: Invitation): string {
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://fledgely.com'
  return `${baseUrl}/invite/accept?token=${invitation.token}`
}
