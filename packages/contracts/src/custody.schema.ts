import { z } from 'zod'

/**
 * Custody Declaration Schema - Defines custody arrangements stored in child documents
 *
 * This schema is the source of truth for all CustodyDeclaration types in the application.
 * Per project guidelines: Types are always derived from Zod schemas.
 *
 * Story 2.3: Custody Arrangement Declaration
 */

/**
 * Dangerous characters that could enable XSS or HTML injection
 * These are blocked in user-provided text fields for defense-in-depth
 */
const XSS_DANGEROUS_CHARS = /[<>"'`&]/

/**
 * Custody arrangement types
 * - sole: Single parent/guardian has custody
 * - shared: Custody is shared between parents (triggers Epic 3A safeguards)
 * - complex: Blended families, step-parents, or other arrangements
 */
export const custodyTypeSchema = z.enum(['sole', 'shared', 'complex'])

export type CustodyType = z.infer<typeof custodyTypeSchema>

/**
 * Custody declaration stored in child document
 */
export const custodyDeclarationSchema = z.object({
  /** Type of custody arrangement */
  type: custodyTypeSchema,

  /** Optional explanation for complex arrangements (max 500 chars) */
  notes: z
    .string()
    .max(500, 'Explanation cannot be more than 500 characters')
    .trim()
    .refine(
      (val) => !XSS_DANGEROUS_CHARS.test(val),
      'Notes cannot contain special characters like < > " \' & `'
    )
    .optional()
    .nullable(),

  /** User who declared the custody arrangement */
  declaredBy: z.string().min(1, 'Declarer ID is required'),

  /** When the declaration was made */
  declaredAt: z.date(),
})

export type CustodyDeclaration = z.infer<typeof custodyDeclarationSchema>

/**
 * Firestore-compatible custody declaration schema (uses Timestamp)
 */
export const custodyDeclarationFirestoreSchema = z.object({
  type: custodyTypeSchema,
  notes: z
    .string()
    .max(500)
    .trim()
    .optional()
    .nullable(),
  declaredBy: z.string().min(1),
  declaredAt: z.custom<{ toDate: () => Date }>(
    (val) => val && typeof (val as { toDate?: () => Date }).toDate === 'function'
  ),
})

export type CustodyDeclarationFirestore = z.infer<typeof custodyDeclarationFirestoreSchema>

/**
 * History entry for custody changes
 */
export const custodyHistoryEntrySchema = z.object({
  /** Previous custody declaration */
  previousDeclaration: custodyDeclarationSchema,

  /** When the change was made */
  changedAt: z.date(),

  /** User who made the change */
  changedBy: z.string().min(1, 'Changer ID is required'),
})

export type CustodyHistoryEntry = z.infer<typeof custodyHistoryEntrySchema>

/**
 * Firestore-compatible custody history entry schema (uses Timestamp)
 */
export const custodyHistoryEntryFirestoreSchema = z.object({
  previousDeclaration: custodyDeclarationFirestoreSchema,
  changedAt: z.custom<{ toDate: () => Date }>(
    (val) => val && typeof (val as { toDate?: () => Date }).toDate === 'function'
  ),
  changedBy: z.string().min(1),
})

export type CustodyHistoryEntryFirestore = z.infer<typeof custodyHistoryEntryFirestoreSchema>

/**
 * Input schema for declaring custody
 */
export const createCustodyDeclarationInputSchema = z.object({
  /** Type of custody arrangement (required) */
  type: custodyTypeSchema,

  /** Optional explanation for complex arrangements (max 500 chars) */
  notes: z
    .string()
    .max(500, 'Explanation cannot be more than 500 characters')
    .trim()
    .refine(
      (val) => !XSS_DANGEROUS_CHARS.test(val),
      'Notes cannot contain special characters like < > " \' & `'
    )
    .optional()
    .nullable()
    .transform((val) => (val === '' ? null : val)),
})

export type CreateCustodyDeclarationInput = z.infer<typeof createCustodyDeclarationInputSchema>

/**
 * Input schema for updating custody (same as create, but with all fields optional for partial updates)
 */
export const updateCustodyDeclarationInputSchema = z.object({
  /** Type of custody arrangement */
  type: custodyTypeSchema.optional(),

  /** Optional explanation for complex arrangements (max 500 chars) */
  notes: z
    .string()
    .max(500, 'Explanation cannot be more than 500 characters')
    .trim()
    .refine(
      (val) => !XSS_DANGEROUS_CHARS.test(val),
      'Notes cannot contain special characters like < > " \' & `'
    )
    .optional()
    .nullable()
    .transform((val) => (val === '' ? null : val)),
})

export type UpdateCustodyDeclarationInput = z.infer<typeof updateCustodyDeclarationInputSchema>

/**
 * Human-readable labels for custody types
 * Used in UI for displaying custody options
 */
export const CUSTODY_TYPE_LABELS: Record<CustodyType, { title: string; description: string }> = {
  sole: {
    title: 'Sole Custody',
    description: "I'm the only parent or guardian managing this child's account.",
  },
  shared: {
    title: 'Shared Custody',
    description: 'Another parent or guardian shares custody. They may be added to the family later.',
  },
  complex: {
    title: 'Complex Arrangement',
    description:
      'Our family has a unique situation like step-parents, blended families, or other arrangements.',
  },
}

/**
 * Error messages for custody operations (6th-grade reading level)
 */
export const CUSTODY_ERROR_MESSAGES: Record<string, string> = {
  'child-not-found': 'We could not find this child. Please try again.',
  'permission-denied': 'You do not have permission to change custody settings.',
  'custody-required': 'Please tell us about your custody arrangement first.',
  'notes-too-long': 'The explanation is too long. Please use 500 characters or less.',
  'invalid-type': 'Please select a custody type.',
  unavailable: 'Connection problem. Please check your internet and try again.',
  default: 'Something went wrong. Please try again.',
}

/**
 * Convert Firestore custody declaration to CustodyDeclaration type
 */
export function convertFirestoreToCustodyDeclaration(
  data: CustodyDeclarationFirestore
): CustodyDeclaration {
  return custodyDeclarationSchema.parse({
    type: data.type,
    notes: data.notes,
    declaredBy: data.declaredBy,
    declaredAt: data.declaredAt.toDate(),
  })
}

/**
 * Convert Firestore custody history entry to CustodyHistoryEntry type
 */
export function convertFirestoreToCustodyHistoryEntry(
  data: CustodyHistoryEntryFirestore
): CustodyHistoryEntry {
  return custodyHistoryEntrySchema.parse({
    previousDeclaration: convertFirestoreToCustodyDeclaration(data.previousDeclaration),
    changedAt: data.changedAt.toDate(),
    changedBy: data.changedBy,
  })
}

/**
 * Validate CreateCustodyDeclarationInput and return typed result
 */
export function validateCreateCustodyDeclarationInput(
  input: unknown
): CreateCustodyDeclarationInput {
  return createCustodyDeclarationInputSchema.parse(input)
}

/**
 * Safely parse custody declaration data, returning null if invalid
 */
export function safeParseCustodyDeclaration(data: unknown): CustodyDeclaration | null {
  const result = custodyDeclarationSchema.safeParse(data)
  return result.success ? result.data : null
}

/**
 * Check if custody type requires shared custody safeguards (Epic 3A)
 */
export function requiresSharedCustodySafeguards(type: CustodyType): boolean {
  return type === 'shared'
}

/**
 * Get user-friendly error message for custody operations
 */
export function getCustodyErrorMessage(errorCode: string): string {
  return CUSTODY_ERROR_MESSAGES[errorCode] || CUSTODY_ERROR_MESSAGES.default
}

/**
 * Get label and description for a custody type
 */
export function getCustodyTypeLabel(type: CustodyType): { title: string; description: string } {
  return CUSTODY_TYPE_LABELS[type]
}

/**
 * Check if notes contain XSS dangerous characters
 */
export function hasXssDangerousChars(text: string): boolean {
  return XSS_DANGEROUS_CHARS.test(text)
}
