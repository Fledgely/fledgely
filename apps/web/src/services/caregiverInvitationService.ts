/**
 * Caregiver invitation service.
 *
 * Handles creating and accepting caregiver invitations.
 * Uses Cloud Functions for secure operations.
 * Validates data with Zod schemas from @fledgely/shared/contracts.
 *
 * Story 19D.1: Caregiver Invitation & Onboarding
 * Story 39.1: Caregiver Account Creation
 * - Added relationship field support
 * - Added caregiver limit handling
 */

import { collection, query, where, getDocs, Timestamp, FirestoreError } from 'firebase/firestore'
import { httpsCallable } from 'firebase/functions'
import {
  caregiverInvitationSchema,
  type CaregiverInvitation,
  type CaregiverRelationship,
} from '@fledgely/shared/contracts'
import { getFirestoreDb, getFirebaseFunctions } from '../lib/firebase'

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
  if (result.acceptedAt instanceof Timestamp) {
    result.acceptedAt = result.acceptedAt.toDate()
  }
  // Ensure nullable fields have null if not present
  if (!('emailSentAt' in result)) {
    result.emailSentAt = null
  }
  if (!('acceptedAt' in result)) {
    result.acceptedAt = null
  }
  if (!('acceptedByUid' in result)) {
    result.acceptedByUid = null
  }
  return result
}

/**
 * Result of sending a caregiver invitation.
 */
export interface SendCaregiverInvitationResult {
  success: boolean
  invitationId?: string
  message: string
}

/**
 * Send a caregiver invitation via Cloud Function.
 *
 * @param familyId - The family ID
 * @param recipientEmail - The caregiver's email address
 * @param childIds - Array of child IDs the caregiver can view
 * @param relationship - The caregiver's relationship type (Story 39.1)
 * @param customRelationship - Custom text if relationship is 'other' (Story 39.1)
 * @returns Result with success status and invitation ID
 *
 * Story 19D.1: AC1 (parent invites), AC5 (child selection)
 * Story 39.1: AC1 (relationship field)
 */
export async function sendCaregiverInvitation(
  familyId: string,
  recipientEmail: string,
  childIds: string[],
  relationship: CaregiverRelationship,
  customRelationship?: string
): Promise<SendCaregiverInvitationResult> {
  try {
    const functions = getFirebaseFunctions()
    const sendInvitation = httpsCallable<
      {
        familyId: string
        recipientEmail: string
        childIds: string[]
        relationship: CaregiverRelationship
        customRelationship?: string
      },
      { success: boolean; invitationId: string; message: string }
    >(functions, 'sendCaregiverInvitation')

    const result = await sendInvitation({
      familyId,
      recipientEmail,
      childIds,
      relationship,
      customRelationship,
    })
    return {
      success: result.data.success,
      invitationId: result.data.invitationId,
      message: result.data.message,
    }
  } catch (err) {
    // Handle Firebase Functions errors
    const error = err as { code?: string; message?: string }
    console.error('Error sending caregiver invitation:', error.message)

    // Return user-friendly error messages
    if (error.code === 'functions/unauthenticated') {
      return {
        success: false,
        message: 'Please sign in to send invitations.',
      }
    }
    if (error.code === 'functions/permission-denied') {
      return {
        success: false,
        message: 'Only family guardians can invite caregivers.',
      }
    }
    if (error.code === 'functions/not-found') {
      return {
        success: false,
        message: 'Family not found.',
      }
    }
    if (error.code === 'functions/already-exists') {
      return {
        success: false,
        message: error.message || 'This email is already connected to this family.',
      }
    }
    if (error.code === 'functions/invalid-argument') {
      return {
        success: false,
        message: error.message || 'Please provide a valid email and select at least one child.',
      }
    }
    // Story 39.1 AC2: Handle caregiver limit reached
    if (error.code === 'functions/failed-precondition') {
      return {
        success: false,
        message: error.message || 'Maximum 5 caregivers per family.',
      }
    }

    return {
      success: false,
      message: 'Unable to send invitation. Please try again.',
    }
  }
}

/**
 * Result of accepting a caregiver invitation.
 */
export interface AcceptCaregiverInvitationResult {
  success: boolean
  familyId?: string
  familyName?: string
  childNames?: string[]
  role?: 'status_viewer'
  message: string
}

/**
 * Accept a caregiver invitation via Cloud Function.
 *
 * @param token - The invitation token from the URL
 * @returns Result with success status and family info for onboarding
 *
 * Story 19D.1: AC3 (Google Sign-In), AC4 (onboarding info)
 */
export async function acceptCaregiverInvitation(
  token: string
): Promise<AcceptCaregiverInvitationResult> {
  try {
    const functions = getFirebaseFunctions()
    const acceptInvitation = httpsCallable<
      { token: string },
      {
        success: boolean
        familyId: string
        familyName: string
        childNames: string[]
        role: 'status_viewer'
      }
    >(functions, 'acceptCaregiverInvitation')

    const result = await acceptInvitation({ token })
    return {
      success: result.data.success,
      familyId: result.data.familyId,
      familyName: result.data.familyName,
      childNames: result.data.childNames,
      role: result.data.role,
      message: 'You have joined the family as a status viewer!',
    }
  } catch (err) {
    // Handle Firebase Functions errors
    const error = err as { code?: string; message?: string }
    console.error('Error accepting caregiver invitation:', error.message)

    // Return user-friendly error messages
    if (error.code === 'functions/unauthenticated') {
      return {
        success: false,
        message: 'Please sign in with Google to accept this invitation.',
      }
    }
    if (error.code === 'functions/not-found') {
      return {
        success: false,
        message: 'Invitation not found.',
      }
    }
    if (error.code === 'functions/failed-precondition') {
      // Could be expired, already accepted, already a member, etc.
      return {
        success: false,
        message: error.message || 'This invitation is no longer valid.',
      }
    }

    return {
      success: false,
      message: 'Unable to accept invitation. Please try again.',
    }
  }
}

/**
 * Error reason for invalid caregiver invitations.
 */
export type CaregiverInvitationErrorReason =
  | 'not-found'
  | 'expired'
  | 'accepted'
  | 'revoked'
  | 'invalid'
  | 'unknown'

/**
 * Result of caregiver invitation lookup by token.
 */
export interface GetCaregiverInvitationByTokenResult {
  invitation: CaregiverInvitation | null
  error: CaregiverInvitationErrorReason | null
  errorMessage: string | null
}

/**
 * Get caregiver invitation by token for acceptance page.
 *
 * This function allows unauthenticated users to view pending invitation
 * details before signing in to accept.
 *
 * @param token - The secure token from the invitation link
 * @returns The invitation if valid, or error details
 */
export async function getCaregiverInvitationByToken(
  token: string
): Promise<GetCaregiverInvitationByTokenResult> {
  if (!token) {
    return {
      invitation: null,
      error: 'invalid',
      errorMessage: 'No invitation token provided',
    }
  }

  try {
    const db = getFirestoreDb()
    const invitationsRef = collection(db, 'caregiverInvitations')
    const tokenQuery = query(invitationsRef, where('token', '==', token))
    const snapshot = await getDocs(tokenQuery)

    if (snapshot.empty) {
      return {
        invitation: null,
        error: 'not-found',
        errorMessage: 'Invitation not found. It may have been revoked or never existed.',
      }
    }

    const docSnap = snapshot.docs[0]
    const data = docSnap.data()
    const convertedData = convertInvitationTimestamps(data)
    const invitation = caregiverInvitationSchema.parse(convertedData)

    // Check invitation status
    if (invitation.status === 'accepted') {
      return {
        invitation: null,
        error: 'accepted',
        errorMessage: 'This invitation has already been used.',
      }
    }

    if (invitation.status === 'revoked') {
      return {
        invitation: null,
        error: 'revoked',
        errorMessage: 'This invitation has been cancelled.',
      }
    }

    if (invitation.status === 'expired' || invitation.expiresAt < new Date()) {
      return {
        invitation: null,
        error: 'expired',
        errorMessage: 'This invitation has expired. Please ask for a new one.',
      }
    }

    if (invitation.status !== 'pending') {
      return {
        invitation: null,
        error: 'invalid',
        errorMessage: 'This invitation is no longer valid.',
      }
    }

    return {
      invitation,
      error: null,
      errorMessage: null,
    }
  } catch (err) {
    if (err instanceof FirestoreError) {
      console.error('Firestore error fetching caregiver invitation:', err.code, err.message)
      if (err.code === 'unavailable') {
        return {
          invitation: null,
          error: 'unknown',
          errorMessage: 'Unable to connect. Please try again.',
        }
      }
    }
    console.error('Error fetching caregiver invitation by token:', err)
    return {
      invitation: null,
      error: 'unknown',
      errorMessage: 'Something went wrong. Please try again.',
    }
  }
}

/**
 * Validate email format.
 *
 * @param email - Email address to validate
 * @returns true if email format is valid
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * Get all caregiver invitations for a family.
 *
 * @param familyId - The family ID
 * @returns Array of caregiver invitations
 */
export async function getCaregiverInvitationsByFamily(
  familyId: string
): Promise<CaregiverInvitation[]> {
  try {
    const db = getFirestoreDb()
    const invitationsRef = collection(db, 'caregiverInvitations')
    const familyQuery = query(invitationsRef, where('familyId', '==', familyId))

    const snapshot = await getDocs(familyQuery)

    if (snapshot.empty) {
      return []
    }

    const invitations: CaregiverInvitation[] = []
    for (const docSnap of snapshot.docs) {
      const data = docSnap.data()
      const convertedData = convertInvitationTimestamps(data)
      invitations.push(caregiverInvitationSchema.parse(convertedData))
    }

    // Sort by createdAt descending (newest first)
    return invitations.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
  } catch (err) {
    if (err instanceof FirestoreError) {
      console.error('Firestore error fetching caregiver invitations:', err.code, err.message)
      if (err.code === 'permission-denied') {
        throw new Error('You do not have permission to view caregiver invitations')
      }
    }
    console.error('Error fetching caregiver invitations:', err)
    throw new Error('Unable to load caregiver invitations. Please try again.')
  }
}
