import { z } from 'zod'
import { safetyDocumentSchema } from './safety-document.schema'

/**
 * Legal Petition Schema - Defines the legal parent petition structure
 *
 * Story 3.6: Legal Parent Petition for Access - Task 1
 *
 * This schema handles petitions from legal parents who were not invited
 * by the account creator and need to submit court documentation to gain access.
 *
 * CRITICAL: Petitions are stored in isolated `legalPetitions` collection,
 * NOT accessible via family-scoped queries. Only safety-team can read/update.
 */

// ============================================================================
// Constants
// ============================================================================

/**
 * SLA: Petitions should be processed within 5 business days (AC8)
 */
export const PETITION_REVIEW_DAYS = 5

/**
 * Petition expires after 90 days if not resolved
 */
export const PETITION_EXPIRY_DAYS = 90

/**
 * Human-readable labels for petition statuses at 6th-grade reading level (NFR65)
 */
export const PETITION_STATUS_LABELS: Record<string, string> = {
  submitted: 'Submitted',
  reviewing: 'Under Review',
  'pending-more-info': 'More Information Needed',
  verified: 'Verified',
  denied: 'Denied',
}

/**
 * Error messages at 6th-grade reading level (NFR65)
 */
export const PETITION_ERROR_MESSAGES: Record<string, string> = {
  'petition-not-found': 'We could not find this petition. Please check your reference number.',
  'not-authorized': 'You do not have permission to view or update this petition.',
  'invalid-status-transition': 'This status change is not allowed.',
  'petition-expired': 'This petition has expired. Please submit a new petition.',
  'operation-failed': 'Something went wrong. Please try again.',
  'invalid-reference-number': 'The reference number format is not valid.',
  'email-mismatch': 'The email does not match the petition records.',
  'already-verified': 'This petition has already been verified.',
  'already-denied': 'This petition has already been denied.',
}

// ============================================================================
// Status Enums
// ============================================================================

/**
 * Legal petition status values (AC3, AC4)
 */
export const legalPetitionStatusSchema = z.enum([
  'submitted', // Initial state after petitioner submits
  'reviewing', // Support team is reviewing documentation
  'pending-more-info', // Support has requested additional documentation
  'verified', // Documentation verified, parent can be added
  'denied', // Petition denied (insufficient documentation)
])

export type LegalPetitionStatus = z.infer<typeof legalPetitionStatusSchema>

/**
 * Claimed relationship type
 */
export const claimedRelationshipSchema = z.enum(['parent', 'legal-guardian'])

export type ClaimedRelationship = z.infer<typeof claimedRelationshipSchema>

// ============================================================================
// Status History Schema
// ============================================================================

/**
 * Status history entry for tracking petition progress
 */
export const petitionStatusHistoryEntrySchema = z.object({
  status: legalPetitionStatusSchema,
  timestamp: z.date(),
  updatedBy: z.string().min(1),
  note: z.string().optional(),
})

export type PetitionStatusHistoryEntry = z.infer<typeof petitionStatusHistoryEntrySchema>

/**
 * Firestore-compatible status history entry
 */
export const petitionStatusHistoryEntryFirestoreSchema = z.object({
  status: legalPetitionStatusSchema,
  timestamp: z.custom<{ toDate: () => Date }>(
    (val) => val && typeof (val as { toDate?: () => Date }).toDate === 'function'
  ),
  updatedBy: z.string().min(1),
  note: z.string().optional(),
})

export type PetitionStatusHistoryEntryFirestore = z.infer<
  typeof petitionStatusHistoryEntryFirestoreSchema
>

// ============================================================================
// Reference Number
// ============================================================================

/**
 * Reference number format: LP-YYYYMMDD-XXXXX
 * LP = Legal Petition
 * YYYYMMDD = Date submitted
 * XXXXX = 5 alphanumeric characters
 */
const REFERENCE_NUMBER_REGEX = /^LP-\d{8}-[A-Z0-9]{5}$/

export const petitionReferenceNumberSchema = z.string().regex(REFERENCE_NUMBER_REGEX, {
  message: PETITION_ERROR_MESSAGES['invalid-reference-number'],
})

/**
 * Generate a unique petition reference number
 * Format: LP-YYYYMMDD-XXXXX
 */
export function generatePetitionReferenceNumber(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  const dateStr = `${year}${month}${day}`

  // Generate 5 random alphanumeric characters
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let suffix = ''
  for (let i = 0; i < 5; i++) {
    suffix += chars.charAt(Math.floor(Math.random() * chars.length))
  }

  return `LP-${dateStr}-${suffix}`
}

// ============================================================================
// Submit Legal Petition Input Schema
// ============================================================================

/**
 * Input schema for submitting a legal petition (AC2)
 */
export const submitLegalPetitionInputSchema = z.object({
  /** Petitioner's full name */
  petitionerName: z
    .string()
    .min(1, 'Name is required')
    .max(200, 'Name is too long')
    .trim()
    .refine((val) => val.length > 0, 'Name cannot be only whitespace'),

  /** Petitioner's email address (for status updates) */
  petitionerEmail: z.string().email('Please enter a valid email address'),

  /** Petitioner's phone number (optional, for urgent contact) */
  petitionerPhone: z
    .string()
    .max(30, 'Phone number is too long')
    .optional(),

  /** Child's name as known to petitioner */
  childName: z
    .string()
    .min(1, 'Child name is required')
    .max(200, 'Child name is too long')
    .trim()
    .refine((val) => val.length > 0, 'Child name cannot be only whitespace'),

  /** Child's date of birth for identification */
  childDOB: z.date().refine((date) => date < new Date(), {
    message: 'Child date of birth must be in the past',
  }),

  /** Relationship being claimed */
  claimedRelationship: claimedRelationshipSchema,

  /** Message explaining the situation */
  message: z
    .string()
    .min(1, 'Please provide a message explaining your situation')
    .max(5000, 'Message cannot exceed 5000 characters'),

  /** Uploaded documents (reuses SafetyDocument from Story 0.5.2) */
  documents: z.array(safetyDocumentSchema).max(5, 'Maximum 5 documents allowed'),
})

export type SubmitLegalPetitionInput = z.infer<typeof submitLegalPetitionInputSchema>

// ============================================================================
// Legal Petition Schema
// ============================================================================

/**
 * Complete legal petition document as stored in Firestore
 */
export const legalPetitionSchema = z.object({
  /** Unique petition identifier (Firestore document ID) */
  id: z.string().min(1, 'Petition ID is required'),

  /** Human-readable reference number for petitioner tracking (AC3) */
  referenceNumber: petitionReferenceNumberSchema,

  /** Petitioner's full name */
  petitionerName: z.string().min(1),

  /** Petitioner's email address */
  petitionerEmail: z.string().email(),

  /** Petitioner's phone number (optional) */
  petitionerPhone: z.string().optional(),

  /** Child's name */
  childName: z.string().min(1),

  /** Child's date of birth */
  childDOB: z.date(),

  /** Claimed relationship to child */
  claimedRelationship: claimedRelationshipSchema,

  /** Petitioner's message/explanation */
  message: z.string(),

  /** Uploaded documents (custody orders, birth certificates, etc.) */
  documents: z.array(safetyDocumentSchema),

  /** Current petition status */
  status: legalPetitionStatusSchema,

  /** Family ID once identified by support (optional until verified) */
  targetFamilyId: z.string().optional(),

  /** Support agent assigned to this petition (optional) */
  assignedTo: z.string().optional(),

  /** Petitioner's user ID if they're authenticated (optional) */
  petitionerUserId: z.string().optional(),

  /** When the petition was submitted */
  submittedAt: z.date(),

  /** When the petition was last updated */
  updatedAt: z.date(),

  /** Status change history for audit trail (AC9) */
  statusHistory: z.array(petitionStatusHistoryEntrySchema),

  /** Internal notes from support team (NEVER exposed to petitioner - AC9) */
  internalNotes: z.array(z.string()),
})

export type LegalPetition = z.infer<typeof legalPetitionSchema>

// ============================================================================
// Firestore Schema
// ============================================================================

/**
 * Firestore-compatible legal petition schema (uses Timestamp)
 */
export const legalPetitionFirestoreSchema = z.object({
  id: z.string().min(1),
  referenceNumber: petitionReferenceNumberSchema,
  petitionerName: z.string().min(1),
  petitionerEmail: z.string().email(),
  petitionerPhone: z.string().optional(),
  childName: z.string().min(1),
  childDOB: z.custom<{ toDate: () => Date }>(
    (val) => val && typeof (val as { toDate?: () => Date }).toDate === 'function'
  ),
  claimedRelationship: claimedRelationshipSchema,
  message: z.string(),
  documents: z.array(safetyDocumentSchema),
  status: legalPetitionStatusSchema,
  targetFamilyId: z.string().optional(),
  assignedTo: z.string().optional(),
  petitionerUserId: z.string().optional(),
  submittedAt: z.custom<{ toDate: () => Date }>(
    (val) => val && typeof (val as { toDate?: () => Date }).toDate === 'function'
  ),
  updatedAt: z.custom<{ toDate: () => Date }>(
    (val) => val && typeof (val as { toDate?: () => Date }).toDate === 'function'
  ),
  statusHistory: z.array(petitionStatusHistoryEntryFirestoreSchema),
  internalNotes: z.array(z.string()),
})

export type LegalPetitionFirestore = z.infer<typeof legalPetitionFirestoreSchema>

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Convert Firestore document data to LegalPetition type
 * Handles Timestamp to Date conversion for all timestamp fields
 */
export function convertFirestoreToLegalPetition(data: LegalPetitionFirestore): LegalPetition {
  return legalPetitionSchema.parse({
    id: data.id,
    referenceNumber: data.referenceNumber,
    petitionerName: data.petitionerName,
    petitionerEmail: data.petitionerEmail,
    petitionerPhone: data.petitionerPhone,
    childName: data.childName,
    childDOB: data.childDOB.toDate(),
    claimedRelationship: data.claimedRelationship,
    message: data.message,
    documents: data.documents,
    status: data.status,
    targetFamilyId: data.targetFamilyId,
    assignedTo: data.assignedTo,
    petitionerUserId: data.petitionerUserId,
    submittedAt: data.submittedAt.toDate(),
    updatedAt: data.updatedAt.toDate(),
    statusHistory: data.statusHistory.map((entry) => ({
      status: entry.status,
      timestamp: entry.timestamp.toDate(),
      updatedBy: entry.updatedBy,
      note: entry.note,
    })),
    internalNotes: data.internalNotes,
  })
}

/**
 * Validate SubmitLegalPetitionInput and return typed result
 */
export function validateSubmitLegalPetitionInput(input: unknown): SubmitLegalPetitionInput {
  return submitLegalPetitionInputSchema.parse(input)
}

/**
 * Safely parse legal petition data, returning null if invalid
 */
export function safeParseLegalPetition(data: unknown): LegalPetition | null {
  const result = legalPetitionSchema.safeParse(data)
  return result.success ? result.data : null
}

/**
 * Check if a petition has expired (90 days without resolution)
 */
export function isPetitionExpired(petition: {
  submittedAt: Date
  status: LegalPetitionStatus
}): boolean {
  // Terminal states (verified, denied) never expire
  if (petition.status === 'verified' || petition.status === 'denied') {
    return false
  }

  const now = new Date()
  const expiryDate = new Date(petition.submittedAt)
  expiryDate.setDate(expiryDate.getDate() + PETITION_EXPIRY_DAYS)

  return now > expiryDate
}

/**
 * Valid status transitions for petition workflow
 */
const VALID_STATUS_TRANSITIONS: Record<LegalPetitionStatus, LegalPetitionStatus[]> = {
  submitted: ['reviewing'],
  reviewing: ['pending-more-info', 'verified', 'denied'],
  'pending-more-info': ['reviewing'],
  verified: [], // Terminal state - no transitions allowed
  denied: [], // Terminal state - no transitions allowed
}

/**
 * Check if a status transition is valid
 */
export function canUpdatePetitionStatus(
  currentStatus: LegalPetitionStatus,
  newStatus: LegalPetitionStatus
): boolean {
  const allowedTransitions = VALID_STATUS_TRANSITIONS[currentStatus]
  return allowedTransitions.includes(newStatus)
}

/**
 * Get human-readable label for a petition status
 */
export function getPetitionStatusLabel(status: LegalPetitionStatus): string {
  return PETITION_STATUS_LABELS[status] || status
}

/**
 * Get error message for a petition error code
 */
export function getPetitionErrorMessage(errorCode: string): string {
  return PETITION_ERROR_MESSAGES[errorCode] || PETITION_ERROR_MESSAGES['operation-failed']
}

// ============================================================================
// Response Schemas
// ============================================================================

/**
 * Response from submitting a legal petition
 */
export const submitLegalPetitionResponseSchema = z.object({
  success: z.boolean(),
  petitionId: z.string().optional(),
  referenceNumber: z.string().optional(),
  errorCode: z.string().optional(),
  errorMessage: z.string().optional(),
})

export type SubmitLegalPetitionResponse = z.infer<typeof submitLegalPetitionResponseSchema>

/**
 * Response from checking petition status
 */
export const checkPetitionStatusResponseSchema = z.object({
  found: z.boolean(),
  status: legalPetitionStatusSchema.optional(),
  statusLabel: z.string().optional(),
  submittedAt: z.date().optional(),
  lastUpdatedAt: z.date().optional(),
  supportMessages: z.array(z.string()).optional(),
  errorCode: z.string().optional(),
  errorMessage: z.string().optional(),
})

export type CheckPetitionStatusResponse = z.infer<typeof checkPetitionStatusResponseSchema>

/**
 * Input for checking petition status
 */
export const checkPetitionStatusInputSchema = z.object({
  referenceNumber: petitionReferenceNumberSchema,
  petitionerEmail: z.string().email('Please enter a valid email address'),
})

export type CheckPetitionStatusInput = z.infer<typeof checkPetitionStatusInputSchema>

/**
 * Input for updating petition status (support team only)
 */
export const updatePetitionStatusInputSchema = z.object({
  petitionId: z.string().min(1, 'Petition ID is required'),
  newStatus: legalPetitionStatusSchema,
  note: z.string().max(2000, 'Note cannot exceed 2000 characters').optional(),
  internalNote: z.string().max(2000, 'Internal note cannot exceed 2000 characters').optional(),
})

export type UpdatePetitionStatusInput = z.infer<typeof updatePetitionStatusInputSchema>
