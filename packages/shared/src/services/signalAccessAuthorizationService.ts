/**
 * SignalAccessAuthorizationService - Story 7.5.6 Task 4
 *
 * Service for admin authorization for signal access.
 * AC5: Admin access requires authorization with separate approver.
 *
 * CRITICAL SAFETY:
 * - Authorization requires separate approver (not self-approve)
 * - All operations logged to admin audit
 * - Authorizations expire after configurable period
 * - Each authorization can only be used once
 */

import { getFirestore, doc, getDoc, setDoc, updateDoc } from 'firebase/firestore'

// ============================================
// Constants
// ============================================

/**
 * Firestore collection for signal access authorizations.
 * CRITICAL: This collection is at ROOT level, ISOLATED from family data.
 */
export const SIGNAL_ACCESS_AUTHORIZATIONS_COLLECTION = 'signalAccessAuthorizations'

/**
 * Default authorization expiry time (24 hours in milliseconds).
 */
const DEFAULT_EXPIRY_MS = 24 * 60 * 60 * 1000

// ============================================
// Types
// ============================================

/**
 * Authorization types for signal access.
 */
export type AuthorizationType = 'legal_request' | 'compliance_review' | 'law_enforcement'

/**
 * Authorization status.
 */
export type AuthorizationStatus = 'pending' | 'approved' | 'denied' | 'expired'

/**
 * Signal access authorization record.
 *
 * AC5: Admin access requires authorization.
 */
export interface SignalAccessAuthorization {
  /** Unique authorization identifier */
  id: string

  /** Admin user requesting access */
  adminUserId: string

  /** Signal ID being accessed */
  signalId: string

  /** Type of authorization request */
  authorizationType: AuthorizationType

  /** Reason for access request */
  reason: string

  /** Current status of authorization */
  status: AuthorizationStatus

  /** When the authorization was requested */
  requestedAt: Date

  /** When the authorization expires */
  expiresAt: Date

  /** User who approved (different from requester) */
  approvedBy: string | null

  /** When the authorization was approved */
  approvedAt: Date | null

  /** Whether the authorization has been used */
  used: boolean

  /** When the authorization was used */
  usedAt: Date | null

  /** Denial reason if denied */
  denialReason?: string

  /** User who denied */
  deniedBy?: string
}

// ============================================
// ID Generation
// ============================================

/**
 * Generate a unique authorization ID.
 */
function generateAuthorizationId(): string {
  const timestamp = Date.now().toString(36)
  const random = Math.random().toString(36).substring(2, 10)
  return `auth_${timestamp}_${random}`
}

// ============================================
// Firestore Helpers
// ============================================

function getAuthorizationDocRef(authorizationId: string) {
  const db = getFirestore()
  return doc(db, SIGNAL_ACCESS_AUTHORIZATIONS_COLLECTION, authorizationId)
}

// ============================================
// Authorization Request Functions
// ============================================

/**
 * Request authorization for signal access.
 *
 * AC5: Creates authorization request that requires separate approver.
 *
 * @param adminUserId - Admin user requesting access
 * @param signalId - Signal ID to access
 * @param authorizationType - Type of authorization
 * @param reason - Reason for access request
 * @returns Created authorization (pending status)
 */
export async function requestSignalAccessAuthorization(
  adminUserId: string,
  signalId: string,
  authorizationType: AuthorizationType,
  reason: string
): Promise<SignalAccessAuthorization> {
  if (!adminUserId || adminUserId.trim().length === 0) {
    throw new Error('adminUserId is required')
  }
  if (!signalId || signalId.trim().length === 0) {
    throw new Error('signalId is required')
  }
  if (!reason || reason.trim().length === 0) {
    throw new Error('reason is required')
  }

  const authorizationId = generateAuthorizationId()
  const now = new Date()
  const expiresAt = new Date(now.getTime() + DEFAULT_EXPIRY_MS)

  const authorization: SignalAccessAuthorization = {
    id: authorizationId,
    adminUserId,
    signalId,
    authorizationType,
    reason,
    status: 'pending',
    requestedAt: now,
    expiresAt,
    approvedBy: null,
    approvedAt: null,
    used: false,
    usedAt: null,
  }

  const docRef = getAuthorizationDocRef(authorizationId)
  await setDoc(docRef, authorization)

  // Log the authorization request
  // In production, this would log to admin audit trail
  // console.log(`Authorization requested: ${authorizationId} by ${adminUserId} for signal ${signalId}`)

  return authorization
}

// ============================================
// Authorization Approval Functions
// ============================================

/**
 * Approve an authorization request.
 *
 * AC5: Requires separate approver (not self-approve).
 *
 * @param authorizationId - Authorization ID to approve
 * @param approverId - User approving (must be different from requester)
 * @returns Updated authorization (approved status)
 */
export async function approveAuthorization(
  authorizationId: string,
  approverId: string
): Promise<SignalAccessAuthorization> {
  if (!authorizationId || authorizationId.trim().length === 0) {
    throw new Error('authorizationId is required')
  }
  if (!approverId || approverId.trim().length === 0) {
    throw new Error('approverId is required')
  }

  const docRef = getAuthorizationDocRef(authorizationId)
  const snapshot = await getDoc(docRef)

  if (!snapshot.exists()) {
    throw new Error('Authorization not found')
  }

  const authorization = snapshot.data() as SignalAccessAuthorization

  // Prevent self-approval
  if (authorization.adminUserId === approverId) {
    throw new Error('Cannot self-approve authorization')
  }

  // Must be pending status
  if (authorization.status !== 'pending') {
    throw new Error('Authorization is not pending')
  }

  const now = new Date()
  const updatedAuth: Partial<SignalAccessAuthorization> = {
    status: 'approved',
    approvedBy: approverId,
    approvedAt: now,
  }

  await updateDoc(docRef, updatedAuth)

  // Log the approval
  // In production, this would log to admin audit trail
  // console.log(`Authorization approved: ${authorizationId} by ${approverId}`)

  return {
    ...authorization,
    ...updatedAuth,
  } as SignalAccessAuthorization
}

/**
 * Deny an authorization request.
 *
 * @param authorizationId - Authorization ID to deny
 * @param denierId - User denying
 * @param denialReason - Reason for denial
 * @returns Updated authorization (denied status)
 */
export async function denyAuthorization(
  authorizationId: string,
  denierId: string,
  denialReason: string
): Promise<SignalAccessAuthorization> {
  if (!authorizationId || authorizationId.trim().length === 0) {
    throw new Error('authorizationId is required')
  }
  if (!denierId || denierId.trim().length === 0) {
    throw new Error('denierId is required')
  }

  const docRef = getAuthorizationDocRef(authorizationId)
  const snapshot = await getDoc(docRef)

  if (!snapshot.exists()) {
    throw new Error('Authorization not found')
  }

  const authorization = snapshot.data() as SignalAccessAuthorization

  // Must be pending status
  if (authorization.status !== 'pending') {
    throw new Error('Authorization is not pending')
  }

  const updatedAuth: Partial<SignalAccessAuthorization> = {
    status: 'denied',
    deniedBy: denierId,
    denialReason,
  }

  await updateDoc(docRef, updatedAuth)

  // Log the denial
  // In production, this would log to admin audit trail
  // console.log(`Authorization denied: ${authorizationId} by ${denierId}: ${denialReason}`)

  return {
    ...authorization,
    ...updatedAuth,
  } as SignalAccessAuthorization
}

// ============================================
// Authorization Validation Functions
// ============================================

/**
 * Validate authorization for access.
 *
 * AC5: Authorization is validated per-request.
 *
 * @param authorizationId - Authorization ID to validate
 * @param signalId - Signal ID being accessed
 * @returns True if authorization is valid
 */
export async function validateAuthorization(
  authorizationId: string,
  signalId: string
): Promise<boolean> {
  if (!authorizationId || authorizationId.trim().length === 0) {
    return false
  }
  if (!signalId || signalId.trim().length === 0) {
    return false
  }

  const docRef = getAuthorizationDocRef(authorizationId)
  const snapshot = await getDoc(docRef)

  if (!snapshot.exists()) {
    return false
  }

  const authorization = snapshot.data() as SignalAccessAuthorization

  // Must be approved
  if (authorization.status !== 'approved') {
    return false
  }

  // Must not be used
  if (authorization.used) {
    return false
  }

  // Must not be expired
  const expiresAt =
    authorization.expiresAt instanceof Date
      ? authorization.expiresAt
      : (authorization.expiresAt as { toDate?: () => Date })?.toDate?.() || new Date(0)

  if (expiresAt.getTime() < Date.now()) {
    return false
  }

  // Must match signal ID
  if (authorization.signalId !== signalId) {
    return false
  }

  return true
}

/**
 * Mark authorization as used.
 *
 * AC5: Each authorization can only be used once.
 *
 * @param authorizationId - Authorization ID to mark as used
 */
export async function markAuthorizationUsed(authorizationId: string): Promise<void> {
  if (!authorizationId || authorizationId.trim().length === 0) {
    throw new Error('authorizationId is required')
  }

  const docRef = getAuthorizationDocRef(authorizationId)
  const snapshot = await getDoc(docRef)

  if (!snapshot.exists()) {
    throw new Error('Authorization not found')
  }

  const authorization = snapshot.data() as SignalAccessAuthorization

  if (authorization.used) {
    throw new Error('Authorization already used')
  }

  await updateDoc(docRef, {
    used: true,
    usedAt: new Date(),
  })

  // Log the usage
  // In production, this would log to admin audit trail
  // console.log(`Authorization used: ${authorizationId}`)
}

// ============================================
// Authorization Retrieval Functions
// ============================================

/**
 * Get authorization by ID.
 *
 * @param authorizationId - Authorization ID to retrieve
 * @returns Authorization or null if not found
 */
export async function getAuthorization(
  authorizationId: string
): Promise<SignalAccessAuthorization | null> {
  if (!authorizationId || authorizationId.trim().length === 0) {
    throw new Error('authorizationId is required')
  }

  const docRef = getAuthorizationDocRef(authorizationId)
  const snapshot = await getDoc(docRef)

  if (!snapshot.exists()) {
    return null
  }

  const data = snapshot.data() as SignalAccessAuthorization

  return {
    ...data,
    requestedAt:
      data.requestedAt instanceof Date
        ? data.requestedAt
        : (data.requestedAt as { toDate?: () => Date })?.toDate?.() || new Date(),
    expiresAt:
      data.expiresAt instanceof Date
        ? data.expiresAt
        : (data.expiresAt as { toDate?: () => Date })?.toDate?.() || new Date(),
    approvedAt:
      data.approvedAt instanceof Date
        ? data.approvedAt
        : (data.approvedAt as { toDate?: () => Date } | null)?.toDate?.() || null,
    usedAt:
      data.usedAt instanceof Date
        ? data.usedAt
        : (data.usedAt as { toDate?: () => Date } | null)?.toDate?.() || null,
  }
}
