/**
 * Trusted Adult Contract - Story 52.4
 *
 * Data types and schemas for Trusted Adult functionality.
 * Allows parents to designate trusted adults with view-only access.
 *
 * AC1: Designate Trusted Adult
 * AC2: Invitation Authentication (FR123)
 * AC3: Teen Approval Required (16+)
 * AC4: View-Only Access (FR108)
 * AC5: Maximum 2 Trusted Adults
 * AC6: Audit Logging (NFR42)
 */

import { z } from 'zod'

// ============================================
// Constants
// ============================================

/** Maximum trusted adults per child */
export const MAX_TRUSTED_ADULTS_PER_CHILD = 2

/** Invitation expiry in days */
export const INVITATION_EXPIRY_DAYS = 7

/** Invitation expiry in milliseconds */
export const INVITATION_EXPIRY_MS = INVITATION_EXPIRY_DAYS * 24 * 60 * 60 * 1000

// ============================================
// Enums
// ============================================

/**
 * Status of a Trusted Adult relationship.
 * - pending_invitation: Invitation sent, awaiting acceptance
 * - pending_teen_approval: Accepted, awaiting teen approval (16+ only)
 * - active: Fully approved and active
 * - revoked: Access revoked
 * - expired: Invitation expired
 */
export const TrustedAdultStatus = {
  PENDING_INVITATION: 'pending_invitation',
  PENDING_TEEN_APPROVAL: 'pending_teen_approval',
  ACTIVE: 'active',
  REVOKED: 'revoked',
  EXPIRED: 'expired',
} as const

export type TrustedAdultStatusValue = (typeof TrustedAdultStatus)[keyof typeof TrustedAdultStatus]

/**
 * Types of trusted adult change events for audit logging.
 */
export const TrustedAdultChangeType = {
  INVITED: 'invited',
  INVITATION_ACCEPTED: 'invitation_accepted',
  TEEN_APPROVED: 'teen_approved',
  TEEN_REJECTED: 'teen_rejected',
  REVOKED_BY_PARENT: 'revoked_by_parent',
  REVOKED_BY_TEEN: 'revoked_by_teen',
  INVITATION_EXPIRED: 'invitation_expired',
} as const

export type TrustedAdultChangeTypeValue =
  (typeof TrustedAdultChangeType)[keyof typeof TrustedAdultChangeType]

// ============================================
// Zod Schemas
// ============================================

/**
 * Schema for a Trusted Adult record.
 */
export const TrustedAdultSchema = z.object({
  /** Unique trusted adult ID */
  id: z.string().min(1),
  /** Email of the trusted adult */
  email: z.string().email(),
  /** Display name of the trusted adult */
  name: z.string().min(1),
  /** Current status */
  status: z.enum(['pending_invitation', 'pending_teen_approval', 'active', 'revoked', 'expired']),
  /** ID of the child this trusted adult is associated with */
  childId: z.string().min(1),
  /** ID of the family */
  familyId: z.string().min(1),
  /** ID of the parent who invited */
  invitedBy: z.string().min(1),
  /** When the invitation was sent */
  invitedAt: z.date(),
  /** When the invitation expires */
  expiresAt: z.date(),
  /** When the trusted adult accepted the invitation */
  acceptedAt: z.date().optional(),
  /** Firebase UID of the trusted adult (after account creation) */
  userId: z.string().optional(),
  /** When the teen approved (if applicable) */
  approvedByTeenAt: z.date().optional(),
  /** ID of the teen who approved */
  approvedByTeenId: z.string().optional(),
  /** When access was revoked (if applicable) */
  revokedAt: z.date().optional(),
  /** Who revoked access */
  revokedBy: z.string().optional(),
  /** Reason for revocation */
  revokedReason: z.string().optional(),
})

export type TrustedAdult = z.infer<typeof TrustedAdultSchema>

/**
 * Schema for creating a trusted adult invitation.
 */
export const TrustedAdultInvitationRequestSchema = z.object({
  /** Email of the trusted adult to invite */
  email: z.string().email(),
  /** Display name of the trusted adult */
  name: z.string().min(1),
  /** ID of the child this trusted adult will be associated with */
  childId: z.string().min(1),
})

export type TrustedAdultInvitationRequest = z.infer<typeof TrustedAdultInvitationRequestSchema>

/**
 * Schema for the invitation token payload.
 */
export const TrustedAdultInvitationTokenSchema = z.object({
  /** Invitation ID */
  invitationId: z.string().min(1),
  /** Family ID */
  familyId: z.string().min(1),
  /** Child ID */
  childId: z.string().min(1),
  /** Email the invitation was sent to */
  email: z.string().email(),
  /** When the invitation expires */
  expiresAt: z.date(),
  /** Nonce for single-use validation */
  nonce: z.string().min(1),
})

export type TrustedAdultInvitationToken = z.infer<typeof TrustedAdultInvitationTokenSchema>

/**
 * Schema for accepting an invitation.
 */
export const TrustedAdultAcceptInvitationRequestSchema = z.object({
  /** Invitation token */
  token: z.string().min(1),
  /** Display name (can update from invitation) */
  name: z.string().min(1).optional(),
})

export type TrustedAdultAcceptInvitationRequest = z.infer<
  typeof TrustedAdultAcceptInvitationRequestSchema
>

/**
 * Schema for teen approval/rejection.
 */
export const TrustedAdultTeenApprovalRequestSchema = z.object({
  /** Trusted adult ID */
  trustedAdultId: z.string().min(1),
  /** Whether the teen approves */
  approved: z.boolean(),
  /** Optional reason for rejection */
  rejectionReason: z.string().optional(),
})

export type TrustedAdultTeenApprovalRequest = z.infer<typeof TrustedAdultTeenApprovalRequestSchema>

/**
 * Schema for revoking trusted adult access.
 */
export const TrustedAdultRevokeRequestSchema = z.object({
  /** Trusted adult ID */
  trustedAdultId: z.string().min(1),
  /** Reason for revocation */
  reason: z.string().optional(),
})

export type TrustedAdultRevokeRequest = z.infer<typeof TrustedAdultRevokeRequestSchema>

/**
 * Schema for trusted adult change event for audit logging.
 * AC6: NFR42 changes logged
 */
export const TrustedAdultChangeEventSchema = z.object({
  /** Unique event ID */
  id: z.string().min(1),
  /** Trusted adult ID */
  trustedAdultId: z.string().min(1),
  /** ID of the child */
  childId: z.string().min(1),
  /** ID of the family */
  familyId: z.string().min(1),
  /** Type of change */
  changeType: z.enum([
    'invited',
    'invitation_accepted',
    'teen_approved',
    'teen_rejected',
    'revoked_by_parent',
    'revoked_by_teen',
    'invitation_expired',
  ]),
  /** Who performed the action */
  performedBy: z.string().min(1),
  /** Role of the person who performed the action */
  performedByRole: z.enum(['parent', 'teen', 'trusted_adult', 'system']),
  /** When the change occurred */
  timestamp: z.date(),
  /** Additional details */
  details: z.record(z.string(), z.unknown()).optional(),
  /** IP address of requester (for audit) */
  ipAddress: z.string().optional(),
  /** User agent of requester (for audit) */
  userAgent: z.string().optional(),
})

export type TrustedAdultChangeEvent = z.infer<typeof TrustedAdultChangeEventSchema>

// ============================================
// Helper Functions
// ============================================

/**
 * Generate a unique trusted adult ID.
 */
export function generateTrustedAdultId(): string {
  return `ta-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
}

/**
 * Generate a unique trusted adult event ID.
 */
export function generateTrustedAdultEventId(): string {
  return `ta-event-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
}

/**
 * Generate a unique invitation nonce.
 */
export function generateInvitationNonce(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`
}

/**
 * Calculate invitation expiry date.
 */
export function calculateInvitationExpiry(invitedAt: Date = new Date()): Date {
  return new Date(invitedAt.getTime() + INVITATION_EXPIRY_MS)
}

/**
 * Check if an invitation has expired.
 */
export function isInvitationExpired(expiresAt: Date, now: Date = new Date()): boolean {
  return now > expiresAt
}

/**
 * Create a trusted adult change event for audit logging.
 */
export function createTrustedAdultChangeEvent(
  trustedAdultId: string,
  childId: string,
  familyId: string,
  changeType: TrustedAdultChangeTypeValue,
  performedBy: string,
  performedByRole: 'parent' | 'teen' | 'trusted_adult' | 'system',
  details?: Record<string, unknown>,
  ipAddress?: string,
  userAgent?: string
): TrustedAdultChangeEvent {
  return {
    id: generateTrustedAdultEventId(),
    trustedAdultId,
    childId,
    familyId,
    changeType,
    performedBy,
    performedByRole,
    timestamp: new Date(),
    details,
    ipAddress,
    userAgent,
  }
}

/**
 * Check if a trusted adult is active.
 */
export function isTrustedAdultActive(trustedAdult: TrustedAdult): boolean {
  return trustedAdult.status === TrustedAdultStatus.ACTIVE
}

/**
 * Check if a trusted adult is pending teen approval.
 */
export function isPendingTeenApproval(trustedAdult: TrustedAdult): boolean {
  return trustedAdult.status === TrustedAdultStatus.PENDING_TEEN_APPROVAL
}

/**
 * Check if a trusted adult invitation is pending.
 */
export function isPendingInvitation(trustedAdult: TrustedAdult): boolean {
  return trustedAdult.status === TrustedAdultStatus.PENDING_INVITATION
}

// ============================================
// Notification Messages
// ============================================

/** Parent notification when trusted adult is invited */
export function getTrustedAdultInvitedMessage(trustedAdultName: string, childName: string): string {
  return `You invited ${trustedAdultName} as a trusted adult for ${childName}`
}

/** Teen notification when trusted adult needs approval */
export function getTrustedAdultPendingApprovalMessage(
  trustedAdultName: string,
  parentName: string
): string {
  return `${parentName} has invited ${trustedAdultName} as your trusted adult. Please review and approve.`
}

/** Parent notification when teen approves trusted adult */
export function getTrustedAdultApprovedMessage(trustedAdultName: string, teenName: string): string {
  return `${teenName} has approved ${trustedAdultName} as a trusted adult`
}

/** Parent notification when teen rejects trusted adult */
export function getTrustedAdultRejectedMessage(trustedAdultName: string, teenName: string): string {
  return `${teenName} has declined ${trustedAdultName} as a trusted adult`
}

/** Trusted adult notification when invitation is sent */
export function getTrustedAdultInvitationMessage(
  parentName: string,
  childName: string,
  familyName: string
): string {
  return `${parentName} has invited you to be a trusted adult for ${childName} in the ${familyName} family`
}

/** Link to learn about trusted adults */
export const TRUSTED_ADULT_INFO_LINK = '/help/trusted-adults'
