import { z } from 'zod'

/**
 * Agreement Change Proposal Schema - Story 3A.3: Agreement Changes Two-Parent Approval
 *
 * This schema defines types for dual-approval of family agreement changes in shared custody families.
 * One parent cannot unilaterally change agreements - both must approve before child can sign.
 *
 * Security invariants:
 * 1. Agreement changes are proposed, not immediately applied (shared custody)
 * 2. Other parent must approve within 14 days or change expires
 * 3. Declined changes can be re-proposed after 7-day cooldown
 * 4. Child cannot sign until both parents have approved
 * 5. Original agreement remains active until new version is signed by all parties
 * 6. All proposals are immutable audit trail entries
 *
 * Key differences from Safety Settings (Story 3A.2):
 * - 14-day expiry window (vs 72 hours)
 * - No emergency auto-apply (always requires approval)
 * - Requires signature collection after approval
 * - Modifications link to original proposal
 */

// ============================================
// AGREEMENT CHANGE TYPES
// ============================================

/**
 * Types of agreement changes that require dual-approval in shared custody
 */
export const agreementChangeTypeSchema = z.enum([
  'terms', // General terms and conditions text changes
  'monitoring_rules', // What monitoring occurs and when
  'screen_time', // Screen time limits and schedules
  'bedtime_schedule', // Bedtime/device lockout times
  'app_restrictions', // Allowed/blocked app lists
  'content_filters', // Age restrictions and content filtering
  'consequences', // What happens on violations
  'rewards', // Incentives for compliance
])

export type AgreementChangeType = z.infer<typeof agreementChangeTypeSchema>

/**
 * Human-readable labels for agreement change types
 */
export const AGREEMENT_CHANGE_TYPE_LABELS: Record<AgreementChangeType, string> = {
  terms: 'Terms and conditions',
  monitoring_rules: 'Monitoring rules',
  screen_time: 'Screen time limits',
  bedtime_schedule: 'Bedtime schedule',
  app_restrictions: 'App restrictions',
  content_filters: 'Content filters',
  consequences: 'Consequences',
  rewards: 'Rewards',
}

/**
 * Get human-readable label for an agreement change type
 */
export function getAgreementChangeTypeLabel(changeType: AgreementChangeType): string {
  return AGREEMENT_CHANGE_TYPE_LABELS[changeType]
}

// ============================================
// PROPOSAL STATUS
// ============================================

/**
 * Status of an agreement change proposal
 *
 * Flow: pending → approved → awaiting_signatures → active
 *       pending → declined → cooldown (7 days) → can re-propose
 *       pending → modified → new proposal created → pending
 *       pending → expired (14 days)
 */
export const agreementProposalStatusSchema = z.enum([
  'pending', // Waiting for other parent's response
  'approved', // Both parents approved, awaiting signatures
  'declined', // Other parent declined
  'expired', // 14 days passed without response
  'modified', // Other parent proposed modifications (new proposal created)
  'awaiting_signatures', // Approved, collecting signatures
  'active', // All signatures collected, new agreement active
  'superseded', // Replaced by a newer proposal
])

export type AgreementProposalStatus = z.infer<typeof agreementProposalStatusSchema>

/**
 * Human-readable labels for proposal statuses
 */
export const AGREEMENT_PROPOSAL_STATUS_LABELS: Record<AgreementProposalStatus, string> = {
  pending: 'Waiting for approval',
  approved: 'Approved by both parents',
  declined: 'Declined by co-parent',
  expired: 'Expired (no response)',
  modified: 'Modified by co-parent',
  awaiting_signatures: 'Awaiting signatures',
  active: 'Active (all signed)',
  superseded: 'Superseded by newer proposal',
}

/**
 * Get human-readable label for a proposal status
 */
export function getAgreementProposalStatusLabel(status: AgreementProposalStatus): string {
  return AGREEMENT_PROPOSAL_STATUS_LABELS[status]
}

// ============================================
// SIGNATURE STATUS
// ============================================

/**
 * Status of a single signature
 */
export const signatureStatusSchema = z.enum([
  'pending', // Not yet signed
  'signed', // Signed
])

export type SignatureStatus = z.infer<typeof signatureStatusSchema>

/**
 * A signature record for agreement changes
 */
export const agreementSignatureSchema = z.object({
  /** Guardian or child ID */
  signerId: z.string().min(1).max(128),

  /** Type of signer */
  signerType: z.enum(['parent', 'child']),

  /** Signature status */
  status: signatureStatusSchema,

  /** When signed (null if pending) */
  signedAt: z.date().optional().nullable(),
})

export type AgreementSignature = z.infer<typeof agreementSignatureSchema>

/**
 * Firestore-compatible signature schema
 */
export const agreementSignatureFirestoreSchema = z.object({
  signerId: z.string().min(1).max(128),
  signerType: z.enum(['parent', 'child']),
  status: signatureStatusSchema,
  signedAt: z
    .custom<{ toDate: () => Date }>(
      (val) => val && typeof (val as { toDate?: () => Date }).toDate === 'function'
    )
    .optional()
    .nullable(),
})

export type AgreementSignatureFirestore = z.infer<typeof agreementSignatureFirestoreSchema>

// ============================================
// CONSTANTS
// ============================================

/**
 * Maximum string lengths for proposal fields
 * Prevents storage bloat from malicious inputs
 */
export const AGREEMENT_PROPOSAL_FIELD_LIMITS = {
  id: 128,
  childId: 128,
  agreementId: 128,
  proposedBy: 128,
  respondedBy: 128,
  originalProposalId: 128,
  declineMessage: 500,
  modificationNote: 500,
  changeDescription: 2000,
  originalValue: 10000, // Agreement sections can be large
  proposedValue: 10000,
} as const

/**
 * Time limits for agreement proposal workflows (in milliseconds)
 */
export const AGREEMENT_PROPOSAL_TIME_LIMITS = {
  /** 14 days for other parent to respond */
  RESPONSE_WINDOW_MS: 14 * 24 * 60 * 60 * 1000,
  /** 7 days before a declined proposal can be re-proposed */
  REPROPOSAL_COOLDOWN_MS: 7 * 24 * 60 * 60 * 1000,
  /** 30 days for signature collection after approval */
  SIGNATURE_WINDOW_MS: 30 * 24 * 60 * 60 * 1000,
} as const

/**
 * Rate limiting for proposals
 */
export const AGREEMENT_PROPOSAL_RATE_LIMIT = {
  MAX_PROPOSALS_PER_HOUR: 10,
  WINDOW_MS: 60 * 60 * 1000,
} as const

// ============================================
// AGREEMENT CHANGE VALUE
// ============================================

/**
 * An agreement change value (can be string, number, boolean, or object for complex changes)
 */
export const agreementChangeValueSchema = z.union([
  z.string().max(AGREEMENT_PROPOSAL_FIELD_LIMITS.proposedValue),
  z.number(),
  z.boolean(),
  z.record(z.string(), z.unknown()), // For complex structured changes
  z.array(z.string().max(256)), // For list-based changes (e.g., app lists)
])

export type AgreementChangeValue = z.infer<typeof agreementChangeValueSchema>

// ============================================
// AGREEMENT CHANGE PROPOSAL
// ============================================

/**
 * A proposed agreement change
 */
export const agreementChangeProposalSchema = z.object({
  /** Unique proposal ID (Firestore document ID) */
  id: z.string().min(1, 'Proposal ID is required').max(AGREEMENT_PROPOSAL_FIELD_LIMITS.id),

  /** Child ID whose agreement is being changed */
  childId: z.string().min(1, 'Child ID is required').max(AGREEMENT_PROPOSAL_FIELD_LIMITS.childId),

  /** Agreement ID being modified (reference to active agreement) */
  agreementId: z
    .string()
    .min(1, 'Agreement ID is required')
    .max(AGREEMENT_PROPOSAL_FIELD_LIMITS.agreementId),

  /** Guardian who proposed the change */
  proposedBy: z
    .string()
    .min(1, 'Proposer ID is required')
    .max(AGREEMENT_PROPOSAL_FIELD_LIMITS.proposedBy),

  /** Type of agreement change being proposed */
  changeType: agreementChangeTypeSchema,

  /** Human-readable description of the change */
  changeDescription: z
    .string()
    .min(1, 'Change description is required')
    .max(AGREEMENT_PROPOSAL_FIELD_LIMITS.changeDescription),

  /** Current value of the section being changed */
  originalValue: agreementChangeValueSchema,

  /** Proposed new value */
  proposedValue: agreementChangeValueSchema,

  /** Current status of the proposal */
  status: agreementProposalStatusSchema,

  /** When the proposal was created */
  createdAt: z.date(),

  /** When the proposal expires (14 days from creation for pending) */
  expiresAt: z.date(),

  /** Guardian who responded (approved/declined/modified) */
  respondedBy: z.string().max(AGREEMENT_PROPOSAL_FIELD_LIMITS.respondedBy).optional().nullable(),

  /** When the response was given */
  respondedAt: z.date().optional().nullable(),

  /** Message from declining parent (optional) */
  declineMessage: z
    .string()
    .max(AGREEMENT_PROPOSAL_FIELD_LIMITS.declineMessage)
    .optional()
    .nullable(),

  /** If this proposal is a modification, reference to original proposal */
  originalProposalId: z
    .string()
    .max(AGREEMENT_PROPOSAL_FIELD_LIMITS.originalProposalId)
    .optional()
    .nullable(),

  /** Note explaining the modification (when status is 'modified') */
  modificationNote: z
    .string()
    .max(AGREEMENT_PROPOSAL_FIELD_LIMITS.modificationNote)
    .optional()
    .nullable(),

  /** ID of the proposal that superseded this one (when status is 'superseded' or 'modified') */
  supersededByProposalId: z
    .string()
    .max(AGREEMENT_PROPOSAL_FIELD_LIMITS.id)
    .optional()
    .nullable(),

  /** Signatures required and collected (only populated after approval) */
  signatures: z.array(agreementSignatureSchema).optional().nullable(),

  /** When signatures are due (30 days after approval) */
  signatureDeadline: z.date().optional().nullable(),

  /** When all signatures were collected and agreement activated */
  activatedAt: z.date().optional().nullable(),

  /** Version number of the new agreement (incremented on activation) */
  newAgreementVersion: z.number().int().min(1).optional().nullable(),
})

export type AgreementChangeProposal = z.infer<typeof agreementChangeProposalSchema>

/**
 * Firestore-compatible agreement change proposal schema (uses Timestamp)
 */
export const agreementChangeProposalFirestoreSchema = z.object({
  id: z.string().min(1).max(AGREEMENT_PROPOSAL_FIELD_LIMITS.id),
  childId: z.string().min(1).max(AGREEMENT_PROPOSAL_FIELD_LIMITS.childId),
  agreementId: z.string().min(1).max(AGREEMENT_PROPOSAL_FIELD_LIMITS.agreementId),
  proposedBy: z.string().min(1).max(AGREEMENT_PROPOSAL_FIELD_LIMITS.proposedBy),
  changeType: agreementChangeTypeSchema,
  changeDescription: z.string().min(1).max(AGREEMENT_PROPOSAL_FIELD_LIMITS.changeDescription),
  originalValue: agreementChangeValueSchema,
  proposedValue: agreementChangeValueSchema,
  status: agreementProposalStatusSchema,
  createdAt: z.custom<{ toDate: () => Date }>(
    (val) => val && typeof (val as { toDate?: () => Date }).toDate === 'function'
  ),
  expiresAt: z.custom<{ toDate: () => Date }>(
    (val) => val && typeof (val as { toDate?: () => Date }).toDate === 'function'
  ),
  respondedBy: z.string().max(AGREEMENT_PROPOSAL_FIELD_LIMITS.respondedBy).optional().nullable(),
  respondedAt: z
    .custom<{ toDate: () => Date }>(
      (val) => val && typeof (val as { toDate?: () => Date }).toDate === 'function'
    )
    .optional()
    .nullable(),
  declineMessage: z
    .string()
    .max(AGREEMENT_PROPOSAL_FIELD_LIMITS.declineMessage)
    .optional()
    .nullable(),
  originalProposalId: z
    .string()
    .max(AGREEMENT_PROPOSAL_FIELD_LIMITS.originalProposalId)
    .optional()
    .nullable(),
  modificationNote: z
    .string()
    .max(AGREEMENT_PROPOSAL_FIELD_LIMITS.modificationNote)
    .optional()
    .nullable(),
  supersededByProposalId: z
    .string()
    .max(AGREEMENT_PROPOSAL_FIELD_LIMITS.id)
    .optional()
    .nullable(),
  signatures: z.array(agreementSignatureFirestoreSchema).optional().nullable(),
  signatureDeadline: z
    .custom<{ toDate: () => Date }>(
      (val) => val && typeof (val as { toDate?: () => Date }).toDate === 'function'
    )
    .optional()
    .nullable(),
  activatedAt: z
    .custom<{ toDate: () => Date }>(
      (val) => val && typeof (val as { toDate?: () => Date }).toDate === 'function'
    )
    .optional()
    .nullable(),
  newAgreementVersion: z.number().int().min(1).optional().nullable(),
})

export type AgreementChangeProposalFirestore = z.infer<
  typeof agreementChangeProposalFirestoreSchema
>

// ============================================
// INPUT SCHEMAS
// ============================================

/**
 * Input schema for creating an agreement change proposal
 */
export const createAgreementChangeProposalInputSchema = z.object({
  /** Child ID whose agreement is being changed */
  childId: z.string().min(1, 'Child ID is required').max(AGREEMENT_PROPOSAL_FIELD_LIMITS.childId),

  /** Type of agreement change */
  changeType: agreementChangeTypeSchema,

  /** Proposed new value */
  proposedValue: agreementChangeValueSchema,

  /** Optional justification for the change */
  justification: z
    .string()
    .max(AGREEMENT_PROPOSAL_FIELD_LIMITS.changeDescription)
    .optional()
    .nullable(),

  /** Optional: If this modifies an existing proposal */
  modifiesProposalId: z
    .string()
    .max(AGREEMENT_PROPOSAL_FIELD_LIMITS.id)
    .optional()
    .nullable(),
})

export type CreateAgreementChangeProposalInput = z.infer<
  typeof createAgreementChangeProposalInputSchema
>

/**
 * Input schema for responding to an agreement change proposal
 */
export const respondToAgreementProposalInputSchema = z.object({
  /** Proposal ID to respond to */
  proposalId: z.string().min(1, 'Proposal ID is required').max(AGREEMENT_PROPOSAL_FIELD_LIMITS.id),

  /** Child ID (for validation) */
  childId: z.string().min(1, 'Child ID is required').max(AGREEMENT_PROPOSAL_FIELD_LIMITS.childId),

  /** Response action */
  action: z.enum(['approve', 'decline', 'modify']),

  /** Optional message when declining */
  declineMessage: z
    .string()
    .max(AGREEMENT_PROPOSAL_FIELD_LIMITS.declineMessage)
    .optional()
    .nullable(),

  /** Required when action is 'modify': the counter-proposal value */
  modifiedValue: agreementChangeValueSchema.optional().nullable(),

  /** Required when action is 'modify': note explaining the modification */
  modificationNote: z
    .string()
    .max(AGREEMENT_PROPOSAL_FIELD_LIMITS.modificationNote)
    .optional()
    .nullable(),
})

export type RespondToAgreementProposalInput = z.infer<typeof respondToAgreementProposalInputSchema>

/**
 * Input schema for signing an approved agreement change
 */
export const signAgreementChangeInputSchema = z.object({
  /** Proposal ID to sign */
  proposalId: z.string().min(1, 'Proposal ID is required').max(AGREEMENT_PROPOSAL_FIELD_LIMITS.id),

  /** Child ID (for validation) */
  childId: z.string().min(1, 'Child ID is required').max(AGREEMENT_PROPOSAL_FIELD_LIMITS.childId),

  /** Acknowledgment text - must be "I agree to this change" */
  acknowledgment: z.string().optional(),
})

export type SignAgreementChangeInput = z.infer<typeof signAgreementChangeInputSchema>

// ============================================
// CONVERSION UTILITIES
// ============================================

/**
 * Convert Firestore signature to domain type
 */
function convertFirestoreSignature(sig: AgreementSignatureFirestore): AgreementSignature {
  return {
    signerId: sig.signerId,
    signerType: sig.signerType,
    status: sig.status,
    signedAt: sig.signedAt?.toDate() ?? null,
  }
}

/**
 * Convert Firestore agreement change proposal to domain type
 */
export function convertFirestoreToAgreementChangeProposal(
  data: AgreementChangeProposalFirestore
): AgreementChangeProposal {
  return agreementChangeProposalSchema.parse({
    id: data.id,
    childId: data.childId,
    agreementId: data.agreementId,
    proposedBy: data.proposedBy,
    changeType: data.changeType,
    changeDescription: data.changeDescription,
    originalValue: data.originalValue,
    proposedValue: data.proposedValue,
    status: data.status,
    createdAt: data.createdAt.toDate(),
    expiresAt: data.expiresAt.toDate(),
    respondedBy: data.respondedBy,
    respondedAt: data.respondedAt?.toDate() ?? null,
    declineMessage: data.declineMessage,
    originalProposalId: data.originalProposalId,
    modificationNote: data.modificationNote,
    supersededByProposalId: data.supersededByProposalId,
    signatures: data.signatures?.map(convertFirestoreSignature) ?? null,
    signatureDeadline: data.signatureDeadline?.toDate() ?? null,
    activatedAt: data.activatedAt?.toDate() ?? null,
    newAgreementVersion: data.newAgreementVersion,
  })
}

/**
 * Safely parse agreement change proposal, returning null if invalid
 */
export function safeParseAgreementChangeProposal(data: unknown): AgreementChangeProposal | null {
  const result = agreementChangeProposalSchema.safeParse(data)
  return result.success ? result.data : null
}

/**
 * Validate create agreement change proposal input
 */
export function validateCreateAgreementChangeProposalInput(
  data: unknown
): CreateAgreementChangeProposalInput {
  return createAgreementChangeProposalInputSchema.parse(data)
}

/**
 * Safely parse create agreement change proposal input
 */
export function safeParseCreateAgreementChangeProposalInput(
  data: unknown
): CreateAgreementChangeProposalInput | null {
  const result = createAgreementChangeProposalInputSchema.safeParse(data)
  return result.success ? result.data : null
}

/**
 * Validate respond to agreement proposal input
 */
export function validateRespondToAgreementProposalInput(
  data: unknown
): RespondToAgreementProposalInput {
  return respondToAgreementProposalInputSchema.parse(data)
}

/**
 * Safely parse respond to agreement proposal input
 */
export function safeParseRespondToAgreementProposalInput(
  data: unknown
): RespondToAgreementProposalInput | null {
  const result = respondToAgreementProposalInputSchema.safeParse(data)
  return result.success ? result.data : null
}

/**
 * Validate sign agreement change input
 */
export function validateSignAgreementChangeInput(data: unknown): SignAgreementChangeInput {
  return signAgreementChangeInputSchema.parse(data)
}

/**
 * Safely parse sign agreement change input
 */
export function safeParseSignAgreementChangeInput(data: unknown): SignAgreementChangeInput | null {
  const result = signAgreementChangeInputSchema.safeParse(data)
  return result.success ? result.data : null
}

// ============================================
// PROPOSAL WORKFLOW UTILITIES
// ============================================

/**
 * Check if a guardian can respond to a proposal (within 14-day window)
 */
export function canRespondToAgreementProposal(
  proposal: AgreementChangeProposal,
  now: Date = new Date()
): { canRespond: boolean; reason?: string } {
  // Can only respond to pending proposals
  if (proposal.status !== 'pending') {
    return {
      canRespond: false,
      reason: `Proposal has already been ${proposal.status}`,
    }
  }

  // Check if within the 14-day window
  if (now.getTime() >= proposal.expiresAt.getTime()) {
    return {
      canRespond: false,
      reason: 'Proposal has expired',
    }
  }

  return { canRespond: true }
}

/**
 * Check if a guardian can re-propose a declined agreement change (after 7-day cooldown)
 */
export function canReproposeAgreementChange(
  changeType: AgreementChangeType,
  childId: string,
  declinedProposals: AgreementChangeProposal[],
  now: Date = new Date()
): boolean {
  // Find the most recent declined proposal for this change type and child
  const recentDeclined = declinedProposals
    .filter(
      (p) =>
        p.childId === childId &&
        p.changeType === changeType &&
        p.status === 'declined' &&
        p.respondedAt
    )
    .sort((a, b) => (b.respondedAt?.getTime() ?? 0) - (a.respondedAt?.getTime() ?? 0))[0]

  // No declined proposals = can propose
  if (!recentDeclined || !recentDeclined.respondedAt) {
    return true
  }

  // Check if 7-day cooldown has passed
  const cooldownEnd = new Date(
    recentDeclined.respondedAt.getTime() + AGREEMENT_PROPOSAL_TIME_LIMITS.REPROPOSAL_COOLDOWN_MS
  )
  return now.getTime() >= cooldownEnd.getTime()
}

/**
 * Calculate proposal expiry date (14 days from creation)
 */
export function calculateAgreementProposalExpiry(createdAt: Date): Date {
  return new Date(createdAt.getTime() + AGREEMENT_PROPOSAL_TIME_LIMITS.RESPONSE_WINDOW_MS)
}

/**
 * Calculate time remaining until proposal expires
 */
export function getAgreementProposalTimeUntilExpiry(
  proposal: AgreementChangeProposal,
  now: Date = new Date()
): number {
  const remaining = proposal.expiresAt.getTime() - now.getTime()
  return Math.max(0, remaining)
}

/**
 * Calculate re-proposal date after decline
 */
export function calculateAgreementReproposalDate(declinedAt: Date): Date {
  return new Date(declinedAt.getTime() + AGREEMENT_PROPOSAL_TIME_LIMITS.REPROPOSAL_COOLDOWN_MS)
}

/**
 * Calculate signature deadline (30 days after approval)
 */
export function calculateSignatureDeadline(approvedAt: Date): Date {
  return new Date(approvedAt.getTime() + AGREEMENT_PROPOSAL_TIME_LIMITS.SIGNATURE_WINDOW_MS)
}

/**
 * Check if this proposal is a modification of another
 */
export function isModificationProposal(proposal: AgreementChangeProposal): boolean {
  return proposal.originalProposalId !== null && proposal.originalProposalId !== undefined
}

// ============================================
// SIGNATURE WORKFLOW UTILITIES
// ============================================

/**
 * Check if a user can sign a proposal
 * - Parents can sign after approval (in any order)
 * - Child can only sign after both parents have signed
 */
export function canSignAgreementChange(
  proposal: AgreementChangeProposal,
  signerId: string,
  signerType: 'parent' | 'child',
  now: Date = new Date()
): { canSign: boolean; reason?: string } {
  // Must be in awaiting_signatures status
  if (proposal.status !== 'awaiting_signatures') {
    return { canSign: false, reason: 'Proposal is not awaiting signatures' }
  }

  // Must have signatures array
  if (!proposal.signatures) {
    return { canSign: false, reason: 'No signatures initialized' }
  }

  // Must have signature deadline
  if (!proposal.signatureDeadline) {
    return { canSign: false, reason: 'No signature deadline set' }
  }

  // Check if within signature window
  if (now.getTime() > proposal.signatureDeadline.getTime()) {
    return { canSign: false, reason: 'Signature deadline has passed' }
  }

  // Find the signer's signature record
  const signerRecord = proposal.signatures.find((s) => s.signerId === signerId)

  if (!signerRecord) {
    return { canSign: false, reason: 'Signer not in signature list' }
  }

  // Check if already signed
  if (signerRecord.status === 'signed') {
    return { canSign: false, reason: 'Already signed' }
  }

  // If child, check that both parents have signed
  if (signerType === 'child') {
    const parentSignatures = proposal.signatures.filter((s) => s.signerType === 'parent')
    const allParentsSigned = parentSignatures.every((s) => s.status === 'signed')

    if (!allParentsSigned) {
      return { canSign: false, reason: 'Both parents must sign before child' }
    }
  }

  return { canSign: true }
}

/**
 * Check if all required signatures have been collected
 */
export function allSignaturesCollected(proposal: AgreementChangeProposal): boolean {
  if (!proposal.signatures || proposal.signatures.length === 0) {
    return false
  }

  return proposal.signatures.every((s) => s.status === 'signed')
}

/**
 * Get count of pending signatures
 */
export function getPendingSignatureCount(proposal: AgreementChangeProposal): number {
  if (!proposal.signatures) {
    return 0
  }

  return proposal.signatures.filter((s) => s.status === 'pending').length
}

/**
 * Get list of signers who have not yet signed
 */
export function getPendingSigners(proposal: AgreementChangeProposal): AgreementSignature[] {
  if (!proposal.signatures) {
    return []
  }

  return proposal.signatures.filter((s) => s.status === 'pending')
}

// ============================================
// DIFF FORMATTING
// ============================================

/**
 * Format an agreement proposal diff for display
 * Shows original value vs proposed value in human-readable format
 */
export function formatAgreementDiff(proposal: AgreementChangeProposal): string {
  const changeLabel = AGREEMENT_CHANGE_TYPE_LABELS[proposal.changeType]
  const originalFormatted = formatAgreementValue(proposal.changeType, proposal.originalValue)
  const proposedFormatted = formatAgreementValue(proposal.changeType, proposal.proposedValue)

  return `${changeLabel}: ${originalFormatted} → ${proposedFormatted}`
}

/**
 * Format an agreement change value for human-readable display
 */
export function formatAgreementValue(
  changeType: AgreementChangeType,
  value: AgreementChangeValue
): string {
  if (typeof value === 'boolean') {
    return value ? 'Enabled' : 'Disabled'
  }

  if (typeof value === 'number') {
    // Handle numeric values with appropriate units based on change type
    switch (changeType) {
      case 'screen_time':
        if (value < 60) {
          return value === 1 ? '1 minute' : `${value} minutes`
        }
        const hours = Math.floor(value / 60)
        const minutes = value % 60
        if (minutes === 0) {
          return hours === 1 ? '1 hour' : `${hours} hours`
        }
        return `${hours}h ${minutes}m`

      case 'bedtime_schedule':
        // Value is minutes from midnight
        const h = Math.floor(value / 60)
        const m = value % 60
        const period = h >= 12 ? 'PM' : 'AM'
        const displayHour = h === 0 ? 12 : h > 12 ? h - 12 : h
        return `${displayHour}:${m.toString().padStart(2, '0')} ${period}`

      default:
        return String(value)
    }
  }

  if (typeof value === 'string') {
    // Truncate long strings for display
    if (value.length > 100) {
      return value.substring(0, 97) + '...'
    }
    return value
  }

  if (Array.isArray(value)) {
    // Format array values (e.g., app lists)
    if (value.length === 0) {
      return '(empty list)'
    }
    if (value.length <= 3) {
      return value.join(', ')
    }
    return `${value.slice(0, 3).join(', ')} (+${value.length - 3} more)`
  }

  if (typeof value === 'object' && value !== null) {
    // Format object values (complex changes)
    const keys = Object.keys(value)
    if (keys.length === 0) {
      return '(empty)'
    }
    return `${keys.length} settings`
  }

  return String(value)
}

// ============================================
// ERROR MESSAGES
// ============================================

/**
 * Error messages for agreement change proposal operations (6th-grade reading level)
 */
export const AGREEMENT_PROPOSAL_ERROR_MESSAGES: Record<string, string> = {
  'not-found': 'Could not find the proposal.',
  'not-guardian': 'You must be a guardian of this child to make this change.',
  'not-shared-custody': 'This child is not in shared custody. Changes apply immediately.',
  'proposal-expired': 'This proposal has expired. You can create a new one.',
  'already-responded': 'Someone already responded to this proposal.',
  'cannot-respond-own': 'You cannot approve or decline your own proposal.',
  'cooldown-active':
    'This change was recently declined. Please wait 7 days before proposing again.',
  'rate-limit': 'You have made too many proposals. Please wait an hour.',
  'invalid-change-type': 'The change type is not valid.',
  'invalid-value': 'The proposed value is not valid for this change.',
  'no-active-agreement': 'There is no active agreement to change.',
  'pending-proposal-exists': 'There is already a pending proposal for this type of change.',
  'signature-deadline-passed': 'The deadline for signatures has passed.',
  'already-signed': 'You have already signed this agreement change.',
  'parents-must-sign-first': 'Both parents must sign before the child can sign.',
  'not-in-signer-list': 'You are not in the list of required signers.',
  'not-awaiting-signatures': 'This proposal is not ready for signatures yet.',
  'modify-requires-value': 'You must provide a modified value when proposing changes.',
  unknown: 'Something went wrong. Please try again.',
}

/**
 * Get user-friendly error message for agreement proposal operations
 */
export function getAgreementProposalErrorMessage(
  code: keyof typeof AGREEMENT_PROPOSAL_ERROR_MESSAGES | string
): string {
  return AGREEMENT_PROPOSAL_ERROR_MESSAGES[code] || AGREEMENT_PROPOSAL_ERROR_MESSAGES.unknown
}
