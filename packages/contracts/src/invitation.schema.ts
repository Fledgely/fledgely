import { z } from 'zod'

/**
 * Invitation Schemas - Story 3.1: Co-Parent Invitation Generation
 *
 * This schema is the source of truth for all Invitation types in the application.
 * Per project guidelines: Types are always derived from Zod schemas.
 *
 * CRITICAL: Token security
 * - Invitation tokens are ONLY returned once at creation time
 * - Tokens are stored hashed (SHA-256) in Firestore
 * - The tokenHash field in Firestore is NOT the original token
 */

/**
 * Invitation status enum
 */
export const invitationStatusSchema = z.enum([
  'pending', // Awaiting acceptance
  'accepted', // Co-parent joined
  'revoked', // Canceled by inviting parent
  'expired', // Past expiry date
])

export type InvitationStatus = z.infer<typeof invitationStatusSchema>

/**
 * Expiry options for invitation (in days)
 */
export const invitationExpiryDaysSchema = z.enum(['1', '3', '7', '14', '30'])

export type InvitationExpiryDays = z.infer<typeof invitationExpiryDaysSchema>

/**
 * Complete invitation document as stored in Firestore
 */
export const invitationSchema = z.object({
  /** Unique invitation identifier (Firestore document ID) */
  id: z.string().min(1, 'Invitation ID is required'),

  /** Reference to family being joined */
  familyId: z.string().min(1, 'Family ID is required'),

  /** Display name of family (for invitation message) */
  familyName: z.string().min(1, 'Family name is required'),

  /** User ID of inviting parent */
  invitedBy: z.string().min(1, 'Inviter ID is required'),

  /** Display name of inviting parent */
  invitedByName: z.string().min(1, 'Inviter name is required'),

  /** SHA-256 hash of secure token (original not stored) */
  tokenHash: z.string().min(1, 'Token hash is required'),

  /** Current status of invitation */
  status: invitationStatusSchema,

  /** When invitation was created */
  createdAt: z.date(),

  /** When invitation expires */
  expiresAt: z.date(),

  /** When invitation was accepted (null if pending) */
  acceptedAt: z.date().nullable(),

  /** User ID who accepted (null if pending) */
  acceptedBy: z.string().nullable(),
})

export type Invitation = z.infer<typeof invitationSchema>

/**
 * Firestore-compatible invitation schema (uses Timestamp)
 */
export const invitationFirestoreSchema = z.object({
  id: z.string().min(1),
  familyId: z.string().min(1),
  familyName: z.string().min(1),
  invitedBy: z.string().min(1),
  invitedByName: z.string().min(1),
  tokenHash: z.string().min(1),
  status: invitationStatusSchema,
  createdAt: z.custom<{ toDate: () => Date }>(
    (val) => val && typeof (val as { toDate?: () => Date }).toDate === 'function'
  ),
  expiresAt: z.custom<{ toDate: () => Date }>(
    (val) => val && typeof (val as { toDate?: () => Date }).toDate === 'function'
  ),
  acceptedAt: z
    .custom<{ toDate: () => Date } | null>(
      (val) =>
        val === null ||
        (val && typeof (val as { toDate?: () => Date }).toDate === 'function')
    )
    .nullable(),
  acceptedBy: z.string().nullable(),
})

export type InvitationFirestore = z.infer<typeof invitationFirestoreSchema>

/**
 * Input schema for creating a new invitation
 */
export const createInvitationInputSchema = z.object({
  familyId: z.string().min(1, 'Family ID is required'),
  expiryDays: invitationExpiryDaysSchema.default('7'),
})

export type CreateInvitationInput = z.infer<typeof createInvitationInputSchema>

/**
 * Error messages at 6th-grade reading level (NFR65)
 */
export const INVITATION_ERROR_MESSAGES: Record<string, string> = {
  'family-not-found': 'We could not find your family.',
  'no-children': 'Add a child first before inviting a co-parent.',
  'pending-exists': 'You already have a pending invitation.',
  'not-authorized': "You don't have permission to invite co-parents.",
  'creation-failed': 'Could not create invitation. Please try again.',
  'invalid-expiry': 'Please choose how long the invitation should last.',
  'invitation-not-found': 'This invitation no longer exists.',
  'invitation-expired': 'This invitation has expired.',
  'invitation-already-used': 'This invitation has already been used.',
  'invitation-revoked': 'This invitation was canceled.',
  'token-invalid': 'This invitation link is not valid.',
  default: 'Something went wrong. Please try again.',
}

/**
 * Get error message by code at 6th-grade reading level
 */
export function getInvitationErrorMessage(code: string): string {
  return INVITATION_ERROR_MESSAGES[code] || INVITATION_ERROR_MESSAGES.default
}

/**
 * Check if an invitation has expired based on status or date
 */
export function isInvitationExpired(invitation: Invitation): boolean {
  return invitation.status === 'expired' || new Date() > invitation.expiresAt
}

/**
 * Check if an invitation is still pending and valid
 */
export function isInvitationPending(invitation: Invitation): boolean {
  return invitation.status === 'pending' && !isInvitationExpired(invitation)
}

/**
 * Check if an invitation can be revoked
 */
export function canRevokeInvitation(invitation: Invitation): boolean {
  return invitation.status === 'pending'
}

/**
 * Check if an invitation can be accepted
 */
export function canAcceptInvitation(invitation: Invitation): boolean {
  return isInvitationPending(invitation)
}

/**
 * Convert Firestore document data to Invitation type
 * Handles Timestamp to Date conversion for all timestamp fields
 */
export function convertFirestoreToInvitation(data: InvitationFirestore): Invitation {
  return invitationSchema.parse({
    id: data.id,
    familyId: data.familyId,
    familyName: data.familyName,
    invitedBy: data.invitedBy,
    invitedByName: data.invitedByName,
    tokenHash: data.tokenHash,
    status: data.status,
    createdAt: data.createdAt.toDate(),
    expiresAt: data.expiresAt.toDate(),
    acceptedAt: data.acceptedAt?.toDate() || null,
    acceptedBy: data.acceptedBy,
  })
}

/**
 * Validate CreateInvitationInput and return typed result
 */
export function validateCreateInvitationInput(input: unknown): CreateInvitationInput {
  return createInvitationInputSchema.parse(input)
}

/**
 * Safely parse invitation data, returning null if invalid
 */
export function safeParseInvitation(data: unknown): Invitation | null {
  const result = invitationSchema.safeParse(data)
  return result.success ? result.data : null
}

/**
 * Safely parse create invitation input, returning null if invalid
 */
export function safeParseCreateInvitationInput(
  data: unknown
): CreateInvitationInput | null {
  const result = createInvitationInputSchema.safeParse(data)
  return result.success ? result.data : null
}

/**
 * Build invitation link URL
 */
export function buildInvitationLink(
  baseUrl: string,
  invitationId: string,
  token: string
): string {
  return `${baseUrl}/join/${invitationId}?token=${token}`
}

/**
 * Calculate expiry date from creation date and days
 */
export function calculateExpiryDate(createdAt: Date, expiryDays: string): Date {
  const days = parseInt(expiryDays, 10)
  const expiryMs = days * 24 * 60 * 60 * 1000
  return new Date(createdAt.getTime() + expiryMs)
}

/**
 * Get human-readable time until expiry
 */
export function getTimeUntilExpiry(expiresAt: Date): string {
  const now = new Date()
  const diff = expiresAt.getTime() - now.getTime()

  if (diff <= 0) {
    return 'Expired'
  }

  const days = Math.floor(diff / (24 * 60 * 60 * 1000))
  const hours = Math.floor((diff % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000))

  if (days > 0) {
    return `${days} day${days !== 1 ? 's' : ''}`
  }

  return `${hours} hour${hours !== 1 ? 's' : ''}`
}

/**
 * Invitation service error class
 */
export class InvitationError extends Error {
  constructor(
    public code: string,
    message?: string
  ) {
    super(message || getInvitationErrorMessage(code))
    this.name = 'InvitationError'
  }
}

// ============================================================================
// Story 3.2: Invitation Delivery - Email Tracking
// ============================================================================

/**
 * Extended invitation schema with email tracking fields
 * Story 3.2: Invitation Delivery
 */
export const invitationWithEmailSchema = invitationSchema.extend({
  /** Masked email address (for audit display, e.g., "ja***@example.com") */
  emailSentTo: z.string().nullable().optional(),

  /** When invitation email was last sent */
  emailSentAt: z.date().nullable().optional(),

  /** Number of times email was sent (for rate limiting, max 3/hour) */
  emailSendCount: z.number().int().nonnegative().default(0),
})

export type InvitationWithEmail = z.infer<typeof invitationWithEmailSchema>

/**
 * Input schema for sending invitation email
 */
export const sendInvitationEmailInputSchema = z.object({
  invitationId: z.string().min(1, 'Invitation ID is required'),
  email: z.string().email('Please enter a valid email address.'),
})

export type SendInvitationEmailInput = z.infer<typeof sendInvitationEmailInputSchema>

/**
 * Email-related error messages at 6th-grade reading level (NFR65)
 */
export const EMAIL_ERROR_MESSAGES: Record<string, string> = {
  'invalid-email': 'Please enter a valid email address.',
  'email-send-failed': 'Could not send email. Please try again or copy the link.',
  'rate-limited': 'Please wait a moment before sending again.',
  'invitation-expired': 'This invitation has expired. Create a new one.',
  'invitation-not-found': 'Could not find this invitation.',
  'not-authorized': 'You can only send emails for your own invitations.',
  default: 'Something went wrong. Please try again.',
}

/**
 * Get email error message by code at 6th-grade reading level
 */
export function getEmailErrorMessage(code: string): string {
  return EMAIL_ERROR_MESSAGES[code] || EMAIL_ERROR_MESSAGES.default
}

/**
 * Mask email address for audit storage (privacy)
 * Example: "jane@example.com" -> "ja***@example.com"
 */
export function maskEmail(email: string): string {
  const atIndex = email.indexOf('@')
  if (atIndex <= 0) return '***@' + email

  const localPart = email.substring(0, atIndex)
  const domain = email.substring(atIndex)

  // Show first 2 characters (or less if local part is short)
  const visibleChars = Math.min(2, localPart.length)
  const masked = localPart.substring(0, visibleChars) + '***'

  return masked + domain
}

/**
 * Rate limit constant: maximum emails per hour per invitation
 */
export const MAX_EMAILS_PER_HOUR = 3

/**
 * Check if email sending is rate limited
 * Returns true if rate limited (should NOT send)
 */
export function isEmailRateLimited(
  emailSendCount: number,
  emailSentAt: Date | null | undefined
): boolean {
  if (!emailSentAt) return false

  // Reset counter if last send was more than an hour ago
  const hourAgo = new Date(Date.now() - 60 * 60 * 1000)
  if (emailSentAt < hourAgo) return false

  return emailSendCount >= MAX_EMAILS_PER_HOUR
}

// ============================================================================
// Story 3.3: Invitation Acceptance
// ============================================================================

/**
 * Input schema for accepting an invitation
 * Story 3.3: Co-Parent Invitation Acceptance
 */
export const acceptInvitationInputSchema = z.object({
  /** Invitation document ID */
  invitationId: z.string().min(1, 'Invitation ID is required'),
  /** Invitation token for verification */
  token: z.string().min(1, 'Token is required'),
})

export type AcceptInvitationInput = z.infer<typeof acceptInvitationInputSchema>

/**
 * Result schema for invitation acceptance
 * Story 3.3: Co-Parent Invitation Acceptance
 */
export const acceptInvitationResultSchema = z.object({
  /** Whether acceptance was successful */
  success: z.boolean(),
  /** Error code if failed */
  errorCode: z
    .enum([
      'self-invitation',
      'already-guardian',
      'token-invalid',
      'invitation-expired',
      'invitation-not-found',
      'invitation-revoked',
      'acceptance-failed',
    ])
    .optional(),
  /** Family ID if successful */
  familyId: z.string().optional(),
  /** Family name if successful */
  familyName: z.string().optional(),
  /** Number of children in family if successful */
  childrenCount: z.number().int().nonnegative().optional(),
})

export type AcceptInvitationResult = z.infer<typeof acceptInvitationResultSchema>

/**
 * Acceptance-related error messages at 6th-grade reading level (NFR65)
 * Story 3.3: Co-Parent Invitation Acceptance
 */
export const ACCEPTANCE_ERROR_MESSAGES: Record<string, string> = {
  'self-invitation':
    "You can't join your own family. Share this link with your co-parent instead.",
  'already-guardian': "You're already a member of this family.",
  'token-invalid': 'This invitation link is not valid.',
  'invitation-expired':
    'This invitation has expired. Please ask the person who invited you to send a new one.',
  'invitation-not-found': 'This invitation no longer exists.',
  'invitation-revoked': 'This invitation was canceled.',
  'acceptance-failed': 'Could not join the family. Please try again.',
  default: 'Something went wrong. Please try again.',
}

/**
 * Get acceptance error message by code at 6th-grade reading level
 * Story 3.3: Co-Parent Invitation Acceptance
 */
export function getAcceptanceErrorMessage(code: string): string {
  return ACCEPTANCE_ERROR_MESSAGES[code] || ACCEPTANCE_ERROR_MESSAGES.default
}

/**
 * Validate AcceptInvitationInput and return typed result
 * Story 3.3: Co-Parent Invitation Acceptance
 */
export function validateAcceptInvitationInput(input: unknown): AcceptInvitationInput {
  return acceptInvitationInputSchema.parse(input)
}

/**
 * Safely parse accept invitation input, returning null if invalid
 * Story 3.3: Co-Parent Invitation Acceptance
 */
export function safeParseAcceptInvitationInput(
  data: unknown
): AcceptInvitationInput | null {
  const result = acceptInvitationInputSchema.safeParse(data)
  return result.success ? result.data : null
}
