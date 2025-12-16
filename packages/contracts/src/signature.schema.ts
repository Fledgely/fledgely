/**
 * Digital Signature Schema
 *
 * Defines types and validation for digital signatures in family agreements.
 * Supports both typed (name) and drawn (touch/canvas) signatures.
 *
 * Key Design Decisions:
 * - Parent signs FIRST to prevent coercion pressure on child
 * - Both typed and drawn signatures are valid
 * - Signatures include timestamp and optional IP hash for audit
 *
 * @see Story 6.1: Child Digital Signature Ceremony
 */

import { z } from 'zod'

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Signature order enforcement - Parent signs FIRST
 *
 * This prevents coercion by ensuring:
 * - Child sees parent has already committed
 * - Reduces pressure on child to sign something parent hasn't agreed to
 * - Creates truly collaborative signing experience
 * - Child knows parent is equally bound by the agreement
 */
export const SIGNATURE_ORDER = {
  /** Parent must sign first to prevent coercion pressure on child */
  parentFirst: true,
} as const

/**
 * Validation constants for signatures
 */
export const SIGNATURE_VALIDATION = {
  /** Minimum length for typed name signature */
  minTypedNameLength: 2,
  /** Maximum length for typed name signature */
  maxTypedNameLength: 100,
  /** Minimum base64 data length for drawn signature (ensures actual content) */
  minDrawnDataLength: 100,
} as const

// ============================================================================
// ENUMS & BASIC SCHEMAS
// ============================================================================

/**
 * Types of digital signatures (AC #2)
 */
export const signatureTypeSchema = z.enum([
  'typed', // User typed their name
  'drawn', // User drew signature with touch/mouse
])

export type SignatureType = z.infer<typeof signatureTypeSchema>

/**
 * Who can sign an agreement
 */
export const signerRoleSchema = z.enum([
  'parent', // Primary parent/guardian
  'child', // Child signing the agreement
  'co-parent', // Secondary parent/guardian (future support)
])

export type SignerRole = z.infer<typeof signerRoleSchema>

/**
 * Signing status for an agreement
 *
 * Supports both sole custody (parent → child) and shared custody flows
 * (parent1 → parent2 → child).
 */
export const signingStatusSchema = z.enum([
  'pending', // No signatures yet
  'parent_signed', // Single parent has signed (sole custody), waiting for child
  'one_parent_signed', // First parent signed in shared custody, waiting for co-parent
  'both_parents_signed', // Both parents signed in shared custody, waiting for child
  'child_signed', // Child has signed (shouldn't happen before parent)
  'complete', // All required parties have signed
])

export type SigningStatus = z.infer<typeof signingStatusSchema>

// ============================================================================
// LABELS (SCREAMING_SNAKE_CASE for constants, camelCase for compatibility)
// ============================================================================

/**
 * Human-readable labels for signature types
 */
export const SIGNATURE_TYPE_LABELS: Record<SignatureType, string> = {
  typed: 'Typed Name',
  drawn: 'Drawn Signature',
}

/** @deprecated Use SIGNATURE_TYPE_LABELS instead */
export const signatureTypeLabels = SIGNATURE_TYPE_LABELS

/**
 * Human-readable labels for signer roles
 */
export const SIGNER_ROLE_LABELS: Record<SignerRole, string> = {
  parent: 'Parent',
  child: 'Child',
  'co-parent': 'Co-Parent',
}

/** @deprecated Use SIGNER_ROLE_LABELS instead */
export const signerRoleLabels = SIGNER_ROLE_LABELS

/**
 * Human-readable labels for signing status
 */
export const SIGNING_STATUS_LABELS: Record<SigningStatus, string> = {
  pending: 'Waiting for Signatures',
  parent_signed: 'Parent Signed',
  one_parent_signed: 'One Parent Signed',
  both_parents_signed: 'Both Parents Signed',
  child_signed: 'Child Signed',
  complete: 'All Signed',
}

/** @deprecated Use SIGNING_STATUS_LABELS instead */
export const signingStatusLabels = SIGNING_STATUS_LABELS

/**
 * Child-friendly descriptions for signing status (NFR65 - 6th grade reading level)
 */
export const SIGNING_STATUS_DESCRIPTIONS: Record<SigningStatus, string> = {
  pending: 'No one has signed yet. Your parent will sign first.',
  parent_signed: 'Your parent signed! Now it is your turn.',
  one_parent_signed: 'One of your parents signed! Waiting for the other parent.',
  both_parents_signed: 'Both your parents signed! Now it is your turn.',
  child_signed: 'You signed! Waiting for your parent.',
  complete: 'Everyone signed! The agreement is ready.',
}

/** @deprecated Use SIGNING_STATUS_DESCRIPTIONS instead */
export const signingStatusChildLabels = SIGNING_STATUS_DESCRIPTIONS

// ============================================================================
// MAIN SCHEMAS
// ============================================================================

/**
 * Digital signature data
 */
export const signatureSchema = z.object({
  /** Unique signature ID (UUID) */
  id: z.string().uuid('Signature ID must be a valid UUID'),

  /** Type of signature input */
  type: signatureTypeSchema,

  /** Signature value - name string for typed, base64 PNG for drawn */
  value: z.string().min(1, 'Signature value is required'),

  /** Who signed: 'parent' | 'child' | 'co-parent' */
  signedBy: signerRoleSchema,

  /** When signature was created (ISO 8601 datetime) */
  signedAt: z.string().datetime('Invalid datetime format'),

  /** IP address hash for audit (not stored raw for privacy) */
  ipHash: z.string().optional(),
})

export type Signature = z.infer<typeof signatureSchema>

/**
 * Agreement signature record - captures signature with consent context
 */
export const agreementSignatureSchema = z.object({
  /** Agreement this signature belongs to */
  agreementId: z.string().uuid('Agreement ID must be a valid UUID'),

  /** The actual signature data */
  signature: signatureSchema,

  /** "I understand and agree" checkbox was checked */
  consentCheckboxChecked: z.boolean(),

  /** Key commitments were reviewed (read or listened to) */
  commitmentsReviewed: z.boolean(),
})

export type AgreementSignature = z.infer<typeof agreementSignatureSchema>

/**
 * All signatures for an agreement (parent, child, optional co-parent)
 */
export const agreementSignaturesSchema = z.object({
  /** Parent signature (null if not signed yet) */
  parent: agreementSignatureSchema.nullable(),

  /** Child signature (null if not signed yet) */
  child: agreementSignatureSchema.nullable(),

  /** Co-parent signature (null if not applicable or not signed yet) */
  coParent: agreementSignatureSchema.nullable(),

  /** Current signing status */
  signingStatus: signingStatusSchema,
})

export type AgreementSignatures = z.infer<typeof agreementSignaturesSchema>

// ============================================================================
// LABEL GETTER FUNCTIONS
// ============================================================================

/**
 * Get human-readable label for a signature type
 */
export function getSignatureTypeLabel(type: SignatureType): string {
  return SIGNATURE_TYPE_LABELS[type]
}

/**
 * Get human-readable label for a signer role
 */
export function getSignerRoleLabel(role: SignerRole): string {
  return SIGNER_ROLE_LABELS[role]
}

/**
 * Get human-readable label for a signing status
 */
export function getSigningStatusLabel(status: SigningStatus): string {
  return SIGNING_STATUS_LABELS[status]
}

/**
 * Get child-friendly description for a signing status (NFR65 - 6th grade reading level)
 */
export function getSigningStatusDescription(status: SigningStatus): string {
  return SIGNING_STATUS_DESCRIPTIONS[status]
}

// ============================================================================
// SAFE PARSE FUNCTIONS
// ============================================================================

/**
 * Safely parse a signature, returning null if invalid
 */
export function safeParseSignature(data: unknown): Signature | null {
  const result = signatureSchema.safeParse(data)
  return result.success ? result.data : null
}

/**
 * Safely parse an agreement signature, returning null if invalid
 */
export function safeParseAgreementSignature(
  data: unknown
): AgreementSignature | null {
  const result = agreementSignatureSchema.safeParse(data)
  return result.success ? result.data : null
}

// ============================================================================
// VALIDATION FUNCTIONS
// ============================================================================

/**
 * Validate a signature, throwing if invalid
 */
export function validateSignature(data: unknown): Signature {
  return signatureSchema.parse(data)
}

/**
 * Validate an agreement signature, throwing if invalid
 */
export function validateAgreementSignature(data: unknown): AgreementSignature {
  return agreementSignatureSchema.parse(data)
}

/**
 * Validate a typed signature value
 *
 * @param value - The typed name
 * @returns true if valid, false otherwise
 */
export function isTypedSignatureValid(value: string): boolean {
  if (!value || typeof value !== 'string') {
    return false
  }
  const trimmed = value.trim()
  return (
    trimmed.length >= SIGNATURE_VALIDATION.minTypedNameLength &&
    trimmed.length <= SIGNATURE_VALIDATION.maxTypedNameLength
  )
}

/**
 * Validate a drawn signature value
 *
 * @param value - The base64-encoded signature image
 * @returns true if valid, false otherwise
 */
export function isDrawnSignatureValid(value: string): boolean {
  if (!value || typeof value !== 'string') {
    return false
  }
  return value.length >= SIGNATURE_VALIDATION.minDrawnDataLength
}

/**
 * Validate a signature based on its type
 *
 * @param type - The signature type
 * @param value - The signature value
 * @returns true if valid for the given type
 */
export function isSignatureValid(type: SignatureType, value: string): boolean {
  if (type === 'typed') {
    return isTypedSignatureValid(value)
  }
  if (type === 'drawn') {
    return isDrawnSignatureValid(value)
  }
  return false
}

// ============================================================================
// SIGNING ORDER HELPER FUNCTIONS
// ============================================================================

/**
 * Check if child can sign based on current signing status
 *
 * Child can only sign after parent(s) have signed (prevents coercion).
 * In shared custody, BOTH parents must sign before child.
 */
export function canChildSign(status: SigningStatus): boolean {
  return status === 'parent_signed' || status === 'both_parents_signed'
}

/**
 * Check if parent can sign based on current signing status
 *
 * Parent can sign when status is pending (they sign first).
 * In shared custody, first parent can sign when pending.
 */
export function canParentSign(status: SigningStatus): boolean {
  return status === 'pending'
}

/**
 * Check if co-parent can sign based on current signing status
 *
 * Co-parent can sign after first parent in shared custody situations.
 */
export function canCoParentSign(status: SigningStatus): boolean {
  return status === 'one_parent_signed'
}

/**
 * Get the next signing status after a signature is added
 *
 * Enforces parent-first signing order. If child tries to sign
 * before parent(s), status remains unchanged.
 *
 * @param currentStatus - Current signing status
 * @param signerRole - Who is signing
 * @param isSharedCustody - Whether this is a shared custody agreement
 */
export function getNextSigningStatus(
  currentStatus: SigningStatus,
  signerRole: SignerRole,
  isSharedCustody = false
): SigningStatus {
  // If already complete, stay complete
  if (currentStatus === 'complete') {
    return 'complete'
  }

  // Parent signing from pending
  if (currentStatus === 'pending' && signerRole === 'parent') {
    // In shared custody, first parent goes to one_parent_signed
    // In sole custody, goes directly to parent_signed
    return isSharedCustody ? 'one_parent_signed' : 'parent_signed'
  }

  // Co-parent signing in shared custody
  if (currentStatus === 'one_parent_signed' && signerRole === 'co-parent') {
    return 'both_parents_signed'
  }

  // Second parent (co-parent role) signing from pending in shared custody
  // Handle case where co-parent is treated as parent role
  if (currentStatus === 'one_parent_signed' && signerRole === 'parent') {
    return 'both_parents_signed'
  }

  // Child signing after parent(s) - completes the agreement
  if (
    (currentStatus === 'parent_signed' || currentStatus === 'both_parents_signed') &&
    signerRole === 'child'
  ) {
    return 'complete'
  }

  // Enforce parent-first: child cannot sign if pending or waiting for parents
  if (
    (currentStatus === 'pending' || currentStatus === 'one_parent_signed') &&
    signerRole === 'child'
  ) {
    return currentStatus // Block - parent(s) must sign first
  }

  // Edge case: if somehow child signed first, parent signing completes
  if (currentStatus === 'child_signed' && signerRole === 'parent') {
    return 'complete'
  }

  return currentStatus
}

/**
 * Check if signing is complete (all required parties have signed)
 */
export function isSigningComplete(status: SigningStatus): boolean {
  return status === 'complete'
}

/**
 * Check if waiting for co-parent signature in shared custody
 */
export function isWaitingForCoParent(status: SigningStatus): boolean {
  return status === 'one_parent_signed'
}
