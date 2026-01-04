/**
 * Trusted Adult Service - Story 52.4 Task 2
 *
 * Service functions for trusted adult designation, approval, and management.
 *
 * AC1: Designate Trusted Adult
 * AC2: Invitation Authentication
 * AC3: Teen Approval Required (16+)
 * AC4: View-Only Access
 * AC5: Maximum 2 Trusted Adults
 * AC6: Audit Logging
 */

import {
  type TrustedAdult,
  type TrustedAdultChangeEvent,
  type TrustedAdultInvitationToken,
  TrustedAdultStatus,
  TrustedAdultChangeType,
  MAX_TRUSTED_ADULTS_PER_CHILD,
  generateTrustedAdultId,
  generateInvitationNonce,
  calculateInvitationExpiry,
  isInvitationExpired,
  createTrustedAdultChangeEvent,
  isTrustedAdultActive,
  isPendingTeenApproval,
  isPendingInvitation,
} from '../contracts/trustedAdult'
import { is16OrOlder } from './age16TransitionService'

// ============================================
// Types
// ============================================

export interface CanDesignateTrustedAdultResult {
  canDesignate: boolean
  reason?: string
  currentCount: number
  maxAllowed: number
}

export interface CreateInvitationResult {
  trustedAdult: TrustedAdult
  invitationToken: TrustedAdultInvitationToken
  auditEvent: TrustedAdultChangeEvent
}

export interface AcceptInvitationResult {
  trustedAdult: TrustedAdult
  requiresTeenApproval: boolean
  auditEvent: TrustedAdultChangeEvent
}

export interface TeenApprovalResult {
  trustedAdult: TrustedAdult
  auditEvent: TrustedAdultChangeEvent
}

// ============================================
// Eligibility Functions
// ============================================

/**
 * Check if a parent can designate another trusted adult for a child.
 * AC5: Maximum 2 trusted adults per child
 *
 * @param existingTrustedAdults - Current trusted adults for the child
 * @returns Whether designation is allowed and why
 */
export function canDesignateTrustedAdult(
  existingTrustedAdults: TrustedAdult[]
): CanDesignateTrustedAdultResult {
  // Count active and pending trusted adults
  const activePendingCount = existingTrustedAdults.filter(
    (ta) =>
      ta.status === TrustedAdultStatus.ACTIVE ||
      ta.status === TrustedAdultStatus.PENDING_INVITATION ||
      ta.status === TrustedAdultStatus.PENDING_TEEN_APPROVAL
  ).length

  if (activePendingCount >= MAX_TRUSTED_ADULTS_PER_CHILD) {
    return {
      canDesignate: false,
      reason: `Maximum of ${MAX_TRUSTED_ADULTS_PER_CHILD} trusted adults per child allowed`,
      currentCount: activePendingCount,
      maxAllowed: MAX_TRUSTED_ADULTS_PER_CHILD,
    }
  }

  return {
    canDesignate: true,
    currentCount: activePendingCount,
    maxAllowed: MAX_TRUSTED_ADULTS_PER_CHILD,
  }
}

/**
 * Check if a trusted adult email is already invited or active.
 *
 * @param email - Email to check
 * @param existingTrustedAdults - Current trusted adults for the child
 * @returns Whether the email is already used
 */
export function isEmailAlreadyUsed(email: string, existingTrustedAdults: TrustedAdult[]): boolean {
  const normalizedEmail = email.toLowerCase().trim()
  return existingTrustedAdults.some(
    (ta) =>
      ta.email.toLowerCase() === normalizedEmail &&
      (ta.status === TrustedAdultStatus.ACTIVE ||
        ta.status === TrustedAdultStatus.PENDING_INVITATION ||
        ta.status === TrustedAdultStatus.PENDING_TEEN_APPROVAL)
  )
}

/**
 * Check if teen approval is required for trusted adult.
 * AC3: Teen approval required for 16+
 *
 * @param childBirthdate - Child's birthdate
 * @param referenceDate - Optional reference date
 * @returns Whether teen approval is required
 */
export function requiresTeenApproval(
  childBirthdate: Date,
  referenceDate: Date = new Date()
): boolean {
  return is16OrOlder(childBirthdate, referenceDate)
}

// ============================================
// Invitation Functions
// ============================================

/**
 * Create a trusted adult invitation.
 * AC1: Designate Trusted Adult
 *
 * @param parentId - ID of the parent inviting
 * @param familyId - ID of the family
 * @param childId - ID of the child
 * @param email - Email of the trusted adult
 * @param name - Name of the trusted adult
 * @param ipAddress - Optional IP address for audit
 * @param userAgent - Optional user agent for audit
 * @returns Created trusted adult and invitation token
 */
export function createTrustedAdultInvitation(
  parentId: string,
  familyId: string,
  childId: string,
  email: string,
  name: string,
  ipAddress?: string,
  userAgent?: string
): CreateInvitationResult {
  const now = new Date()
  const trustedAdultId = generateTrustedAdultId()
  const nonce = generateInvitationNonce()
  const expiresAt = calculateInvitationExpiry(now)

  const trustedAdult: TrustedAdult = {
    id: trustedAdultId,
    email: email.toLowerCase().trim(),
    name,
    status: TrustedAdultStatus.PENDING_INVITATION,
    childId,
    familyId,
    invitedBy: parentId,
    invitedAt: now,
    expiresAt,
  }

  const invitationToken: TrustedAdultInvitationToken = {
    invitationId: trustedAdultId,
    familyId,
    childId,
    email: email.toLowerCase().trim(),
    expiresAt,
    nonce,
  }

  const auditEvent = createTrustedAdultChangeEvent(
    trustedAdultId,
    childId,
    familyId,
    TrustedAdultChangeType.INVITED,
    parentId,
    'parent',
    { email, name },
    ipAddress,
    userAgent
  )

  return {
    trustedAdult,
    invitationToken,
    auditEvent,
  }
}

/**
 * Validate an invitation token.
 *
 * @param token - Invitation token to validate
 * @param storedTrustedAdult - Stored trusted adult record
 * @returns Validation result
 */
export function validateInvitationToken(
  token: TrustedAdultInvitationToken,
  storedTrustedAdult: TrustedAdult | null
): { valid: boolean; error?: string } {
  if (!storedTrustedAdult) {
    return { valid: false, error: 'Invitation not found' }
  }

  if (storedTrustedAdult.status !== TrustedAdultStatus.PENDING_INVITATION) {
    return { valid: false, error: 'Invitation is no longer valid' }
  }

  if (isInvitationExpired(token.expiresAt)) {
    return { valid: false, error: 'Invitation has expired' }
  }

  if (token.email.toLowerCase() !== storedTrustedAdult.email.toLowerCase()) {
    return { valid: false, error: 'Email mismatch' }
  }

  return { valid: true }
}

/**
 * Process invitation acceptance.
 * AC2: Invitation Authentication
 *
 * @param trustedAdult - Trusted adult record
 * @param userId - Firebase UID of the accepting user
 * @param childBirthdate - Child's birthdate for teen approval check
 * @param ipAddress - Optional IP address for audit
 * @param userAgent - Optional user agent for audit
 * @returns Updated trusted adult and audit event
 */
export function acceptTrustedAdultInvitation(
  trustedAdult: TrustedAdult,
  userId: string,
  childBirthdate: Date,
  ipAddress?: string,
  userAgent?: string
): AcceptInvitationResult {
  const now = new Date()
  const needsTeenApproval = requiresTeenApproval(childBirthdate)

  const updatedTrustedAdult: TrustedAdult = {
    ...trustedAdult,
    userId,
    acceptedAt: now,
    status: needsTeenApproval
      ? TrustedAdultStatus.PENDING_TEEN_APPROVAL
      : TrustedAdultStatus.ACTIVE,
  }

  const auditEvent = createTrustedAdultChangeEvent(
    trustedAdult.id,
    trustedAdult.childId,
    trustedAdult.familyId,
    TrustedAdultChangeType.INVITATION_ACCEPTED,
    userId,
    'trusted_adult',
    { needsTeenApproval },
    ipAddress,
    userAgent
  )

  return {
    trustedAdult: updatedTrustedAdult,
    requiresTeenApproval: needsTeenApproval,
    auditEvent,
  }
}

// ============================================
// Teen Approval Functions
// ============================================

/**
 * Process teen approval of trusted adult.
 * AC3: Teen Approval Required
 *
 * @param trustedAdult - Trusted adult record
 * @param teenId - ID of the teen approving
 * @param approved - Whether the teen approves
 * @param rejectionReason - Optional reason for rejection
 * @param ipAddress - Optional IP address for audit
 * @param userAgent - Optional user agent for audit
 * @returns Updated trusted adult and audit event
 */
export function processTeenapproval(
  trustedAdult: TrustedAdult,
  teenId: string,
  approved: boolean,
  rejectionReason?: string,
  ipAddress?: string,
  userAgent?: string
): TeenApprovalResult {
  const now = new Date()

  if (approved) {
    const updatedTrustedAdult: TrustedAdult = {
      ...trustedAdult,
      status: TrustedAdultStatus.ACTIVE,
      approvedByTeenAt: now,
      approvedByTeenId: teenId,
    }

    const auditEvent = createTrustedAdultChangeEvent(
      trustedAdult.id,
      trustedAdult.childId,
      trustedAdult.familyId,
      TrustedAdultChangeType.TEEN_APPROVED,
      teenId,
      'teen',
      undefined,
      ipAddress,
      userAgent
    )

    return {
      trustedAdult: updatedTrustedAdult,
      auditEvent,
    }
  } else {
    const updatedTrustedAdult: TrustedAdult = {
      ...trustedAdult,
      status: TrustedAdultStatus.REVOKED,
      revokedAt: now,
      revokedBy: teenId,
      revokedReason: rejectionReason || 'Rejected by teen',
    }

    const auditEvent = createTrustedAdultChangeEvent(
      trustedAdult.id,
      trustedAdult.childId,
      trustedAdult.familyId,
      TrustedAdultChangeType.TEEN_REJECTED,
      teenId,
      'teen',
      { rejectionReason },
      ipAddress,
      userAgent
    )

    return {
      trustedAdult: updatedTrustedAdult,
      auditEvent,
    }
  }
}

// ============================================
// Revocation Functions
// ============================================

/**
 * Revoke trusted adult access.
 *
 * @param trustedAdult - Trusted adult to revoke
 * @param revokedBy - ID of the person revoking
 * @param revokedByRole - Role of the person revoking
 * @param reason - Optional reason for revocation
 * @param ipAddress - Optional IP address for audit
 * @param userAgent - Optional user agent for audit
 * @returns Updated trusted adult and audit event
 */
export function revokeTrustedAdult(
  trustedAdult: TrustedAdult,
  revokedBy: string,
  revokedByRole: 'parent' | 'teen',
  reason?: string,
  ipAddress?: string,
  userAgent?: string
): TeenApprovalResult {
  const now = new Date()

  const updatedTrustedAdult: TrustedAdult = {
    ...trustedAdult,
    status: TrustedAdultStatus.REVOKED,
    revokedAt: now,
    revokedBy,
    revokedReason: reason,
  }

  const auditEvent = createTrustedAdultChangeEvent(
    trustedAdult.id,
    trustedAdult.childId,
    trustedAdult.familyId,
    revokedByRole === 'parent'
      ? TrustedAdultChangeType.REVOKED_BY_PARENT
      : TrustedAdultChangeType.REVOKED_BY_TEEN,
    revokedBy,
    revokedByRole,
    { reason },
    ipAddress,
    userAgent
  )

  return {
    trustedAdult: updatedTrustedAdult,
    auditEvent,
  }
}

/**
 * Mark an invitation as expired.
 *
 * @param trustedAdult - Trusted adult with expired invitation
 * @returns Updated trusted adult and audit event
 */
export function expireInvitation(trustedAdult: TrustedAdult): TeenApprovalResult {
  const updatedTrustedAdult: TrustedAdult = {
    ...trustedAdult,
    status: TrustedAdultStatus.EXPIRED,
  }

  const auditEvent = createTrustedAdultChangeEvent(
    trustedAdult.id,
    trustedAdult.childId,
    trustedAdult.familyId,
    TrustedAdultChangeType.INVITATION_EXPIRED,
    'system',
    'system',
    undefined
  )

  return {
    trustedAdult: updatedTrustedAdult,
    auditEvent,
  }
}

// ============================================
// Query Functions
// ============================================

/**
 * Get active trusted adults for a child.
 *
 * @param trustedAdults - All trusted adults for a child
 * @returns Active trusted adults only
 */
export function getActiveTrustedAdults(trustedAdults: TrustedAdult[]): TrustedAdult[] {
  return trustedAdults.filter((ta) => isTrustedAdultActive(ta))
}

/**
 * Get pending trusted adults (awaiting teen approval).
 *
 * @param trustedAdults - All trusted adults for a child
 * @returns Pending trusted adults only
 */
export function getPendingTeenApprovalTrustedAdults(trustedAdults: TrustedAdult[]): TrustedAdult[] {
  return trustedAdults.filter((ta) => isPendingTeenApproval(ta))
}

/**
 * Get pending invitations.
 *
 * @param trustedAdults - All trusted adults for a child
 * @returns Pending invitations only
 */
export function getPendingInvitations(trustedAdults: TrustedAdult[]): TrustedAdult[] {
  return trustedAdults.filter((ta) => isPendingInvitation(ta))
}

/**
 * Get count summary of trusted adults for a child.
 *
 * @param trustedAdults - All trusted adults for a child
 * @returns Count summary
 */
export function getTrustedAdultCounts(trustedAdults: TrustedAdult[]): {
  active: number
  pendingInvitation: number
  pendingTeenApproval: number
  total: number
  maxAllowed: number
  canAddMore: boolean
} {
  const active = trustedAdults.filter((ta) => isTrustedAdultActive(ta)).length
  const pendingInvitation = trustedAdults.filter((ta) => isPendingInvitation(ta)).length
  const pendingTeenApproval = trustedAdults.filter((ta) => isPendingTeenApproval(ta)).length
  const total = active + pendingInvitation + pendingTeenApproval

  return {
    active,
    pendingInvitation,
    pendingTeenApproval,
    total,
    maxAllowed: MAX_TRUSTED_ADULTS_PER_CHILD,
    canAddMore: total < MAX_TRUSTED_ADULTS_PER_CHILD,
  }
}

// ============================================
// Validation Functions
// ============================================

/**
 * Validate trusted adult email format and domain.
 *
 * @param email - Email to validate
 * @returns Validation result
 */
export function validateTrustedAdultEmail(email: string): {
  valid: boolean
  error?: string
} {
  const trimmedEmail = email.trim()

  if (!trimmedEmail) {
    return { valid: false, error: 'Email is required' }
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(trimmedEmail)) {
    return { valid: false, error: 'Invalid email format' }
  }

  return { valid: true }
}

/**
 * Validate trusted adult name.
 *
 * @param name - Name to validate
 * @returns Validation result
 */
export function validateTrustedAdultName(name: string): {
  valid: boolean
  error?: string
} {
  const trimmedName = name.trim()

  if (!trimmedName) {
    return { valid: false, error: 'Name is required' }
  }

  if (trimmedName.length < 2) {
    return { valid: false, error: 'Name must be at least 2 characters' }
  }

  if (trimmedName.length > 100) {
    return { valid: false, error: 'Name must be less than 100 characters' }
  }

  return { valid: true }
}

// Re-export contract functions for convenience
export {
  isTrustedAdultActive,
  isPendingTeenApproval,
  isPendingInvitation,
  isInvitationExpired,
  MAX_TRUSTED_ADULTS_PER_CHILD,
}
