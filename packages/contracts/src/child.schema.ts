import { z } from 'zod'
import {
  custodyDeclarationSchema,
  custodyDeclarationFirestoreSchema,
  custodyHistoryEntrySchema,
  custodyHistoryEntryFirestoreSchema,
  type CustodyDeclaration,
  type CustodyHistoryEntry,
} from './custody.schema'

/**
 * Child Profile Schema - Defines the child structure stored in Firestore children/{childId}
 *
 * This schema is the source of truth for all ChildProfile types in the application.
 * Per project guidelines: Types are always derived from Zod schemas.
 *
 * Story 2.2: Add Child to Family
 * Story 2.3: Custody Arrangement Declaration
 */

/**
 * Firebase document ID regex - validates IDs are safe for Firestore paths
 * - No forward slashes (path separator)
 * - No null bytes
 * - Reasonable length (max 200 chars)
 */
const FIREBASE_ID_REGEX = /^[^/\x00]+$/
const MAX_FIREBASE_ID_LENGTH = 200

/**
 * Dangerous characters that could enable XSS or HTML injection
 * These are blocked in user-provided text fields for defense-in-depth
 */
const XSS_DANGEROUS_CHARS = /[<>"'`&]/

/**
 * Guardian permission levels for a child
 */
export const childGuardianPermissionSchema = z.enum([
  'full', // All permissions - can view, edit child profile, manage agreements
  'readonly', // View only (future use for caregivers)
])

export type ChildGuardianPermission = z.infer<typeof childGuardianPermissionSchema>

/**
 * Child guardian reference - represents a guardian's access to a child
 */
export const childGuardianSchema = z.object({
  /** Guardian's user uid (references users/{uid}) */
  uid: z.string().min(1, 'Guardian ID is required'),

  /** Guardian's permission level for this child */
  permissions: childGuardianPermissionSchema,

  /** When the guardian was granted access to this child */
  grantedAt: z.date(),
})

export type ChildGuardian = z.infer<typeof childGuardianSchema>

/**
 * Firestore-compatible guardian schema (uses Timestamp)
 */
export const childGuardianFirestoreSchema = z.object({
  uid: z.string().min(1),
  permissions: childGuardianPermissionSchema,
  grantedAt: z.custom<{ toDate: () => Date }>(
    (val) => val && typeof (val as { toDate?: () => Date }).toDate === 'function'
  ),
})

export type ChildGuardianFirestore = z.infer<typeof childGuardianFirestoreSchema>

/**
 * Complete child profile document as stored in Firestore
 */
export const childProfileSchema = z.object({
  /** Unique child identifier (Firestore document ID) */
  id: z.string().min(1, 'Child ID is required'),

  /** Reference to parent family (families/{familyId}) */
  familyId: z.string().min(1, 'Family ID is required'),

  /** Child's first name (required) */
  firstName: z.string().min(1, 'First name is required').max(50, 'Name is too long'),

  /** Child's last name (optional) */
  lastName: z.string().max(50, 'Last name is too long').optional().nullable(),

  /** Child's nickname - what they prefer to be called (optional) */
  nickname: z.string().max(30, 'Nickname is too long').optional().nullable(),

  /** Child's date of birth (for age calculation) */
  birthdate: z.date(),

  /** Profile photo URL (optional) */
  photoUrl: z.string().url('Invalid photo URL').optional().nullable(),

  /** Guardians with access to this child's data - must have at least one */
  guardians: z.array(childGuardianSchema).min(1, 'At least one guardian is required'),

  /** When the child profile was created */
  createdAt: z.date(),

  /** User uid who created the child profile */
  createdBy: z.string().min(1, 'Creator ID is required'),

  // Update tracking fields (Story 2.5)
  /** When the profile was last updated */
  updatedAt: z.date().optional().nullable(),

  /** User uid who last updated the profile */
  updatedBy: z.string().optional().nullable(),

  // Custody fields (Story 2.3)
  /** Custody declaration - required before monitoring can begin */
  custodyDeclaration: custodyDeclarationSchema.optional().nullable(),

  /** History of custody declaration changes */
  custodyHistory: z.array(custodyHistoryEntrySchema).default([]),

  /** Whether this child requires shared custody safeguards (Epic 3A) */
  requiresSharedCustodySafeguards: z.boolean().default(false),
})

export type ChildProfile = z.infer<typeof childProfileSchema>

/**
 * Schema for Firestore document data (uses Timestamp instead of Date)
 */
export const childProfileFirestoreSchema = z.object({
  id: z.string().min(1),
  familyId: z.string().min(1),
  firstName: z.string().min(1).max(50),
  lastName: z.string().max(50).optional().nullable(),
  nickname: z.string().max(30).optional().nullable(),
  birthdate: z.custom<{ toDate: () => Date }>(
    (val) => val && typeof (val as { toDate?: () => Date }).toDate === 'function'
  ),
  photoUrl: z.string().url().optional().nullable(),
  guardians: z.array(childGuardianFirestoreSchema).min(1),
  createdAt: z.custom<{ toDate: () => Date }>(
    (val) => val && typeof (val as { toDate?: () => Date }).toDate === 'function'
  ),
  createdBy: z.string().min(1),
  // Update tracking fields (Story 2.5)
  updatedAt: z
    .custom<{ toDate: () => Date }>(
      (val) => val === null || val === undefined || (val && typeof (val as { toDate?: () => Date }).toDate === 'function')
    )
    .optional()
    .nullable(),
  updatedBy: z.string().optional().nullable(),
  // Custody fields (Story 2.3)
  custodyDeclaration: custodyDeclarationFirestoreSchema.optional().nullable(),
  custodyHistory: z.array(custodyHistoryEntryFirestoreSchema).default([]),
  requiresSharedCustodySafeguards: z.boolean().default(false),
})

export type ChildProfileFirestore = z.infer<typeof childProfileFirestoreSchema>

/**
 * Input schema for creating a new child
 * Only requires name and birthdate - other fields are optional or set server-side
 *
 * Validates:
 * - Non-empty name
 * - Birthdate not in the future
 * - Child must be under 18 years old
 * - Optional photo URL is valid
 */
export const createChildInputSchema = z.object({
  /** Child's first name (required) */
  firstName: z
    .string()
    .min(1, 'Name is required')
    .max(50, 'Name cannot be more than 50 characters')
    .trim()
    .refine((val) => val.length > 0, 'Name cannot be only spaces')
    .refine(
      (val) => FIREBASE_ID_REGEX.test(val),
      'Name contains characters that are not allowed'
    )
    .refine(
      (val) => !XSS_DANGEROUS_CHARS.test(val),
      'Name cannot contain special characters like < > " \' & `'
    ),

  /** Child's last name (optional) */
  lastName: z
    .string()
    .max(50, 'Last name cannot be more than 50 characters')
    .trim()
    .refine(
      (val) => !XSS_DANGEROUS_CHARS.test(val),
      'Last name cannot contain special characters like < > " \' & `'
    )
    .optional()
    .nullable()
    .transform((val) => (val === '' ? null : val)),

  /** Child's date of birth */
  birthdate: z
    .date()
    .refine((date) => date <= new Date(), 'Birthdate cannot be in the future')
    .refine((date) => {
      const minDate = new Date()
      minDate.setFullYear(minDate.getFullYear() - 18)
      return date >= minDate
    }, 'Fledgely is designed for children under 18'),

  /** Profile photo URL (optional) */
  photoUrl: z
    .string()
    .optional()
    .nullable()
    .transform((val) => (val === '' ? null : val))
    .refine(
      (val) => val === null || val === undefined || z.string().url().safeParse(val).success,
      'Please enter a valid URL for the photo'
    ),
})

export type CreateChildInput = z.infer<typeof createChildInputSchema>

/**
 * Input schema for updating a child profile
 */
export const updateChildInputSchema = z.object({
  firstName: z
    .string()
    .min(1, 'Name is required')
    .max(50, 'Name cannot be more than 50 characters')
    .trim()
    .refine(
      (val) => !XSS_DANGEROUS_CHARS.test(val),
      'Name cannot contain special characters like < > " \' & `'
    )
    .optional(),

  lastName: z
    .string()
    .max(50, 'Last name cannot be more than 50 characters')
    .trim()
    .refine(
      (val) => !XSS_DANGEROUS_CHARS.test(val),
      'Last name cannot contain special characters like < > " \' & `'
    )
    .optional()
    .nullable()
    .transform((val) => (val === '' ? null : val)),

  nickname: z
    .string()
    .max(30, 'Nickname cannot be more than 30 characters')
    .trim()
    .refine(
      (val) => !XSS_DANGEROUS_CHARS.test(val),
      'Nickname cannot contain special characters like < > " \' & `'
    )
    .optional()
    .nullable()
    .transform((val) => (val === '' ? null : val)),

  birthdate: z
    .date()
    .refine((date) => date <= new Date(), 'Birthdate cannot be in the future')
    .refine((date) => {
      const minDate = new Date()
      minDate.setFullYear(minDate.getFullYear() - 18)
      return date >= minDate
    }, 'Fledgely is designed for children under 18')
    .optional(),

  photoUrl: z
    .string()
    .optional()
    .nullable()
    .transform((val) => (val === '' ? null : val))
    .refine(
      (val) => val === null || val === undefined || /^https?:\/\/.+/.test(val),
      'Please enter a valid URL for the photo'
    ),
})

export type UpdateChildInput = z.infer<typeof updateChildInputSchema>

/**
 * Convert Firestore document data to ChildProfile type
 * Handles Timestamp to Date conversion for all timestamp fields
 */
export function convertFirestoreToChildProfile(data: ChildProfileFirestore): ChildProfile {
  // Convert custody declaration if present
  let custodyDeclaration: CustodyDeclaration | null | undefined = undefined
  if (data.custodyDeclaration) {
    custodyDeclaration = {
      type: data.custodyDeclaration.type,
      notes: data.custodyDeclaration.notes,
      declaredBy: data.custodyDeclaration.declaredBy,
      declaredAt: data.custodyDeclaration.declaredAt.toDate(),
    }
  } else if (data.custodyDeclaration === null) {
    custodyDeclaration = null
  }

  // Convert custody history if present
  const custodyHistory: CustodyHistoryEntry[] = (data.custodyHistory || []).map((entry) => ({
    previousDeclaration: {
      type: entry.previousDeclaration.type,
      notes: entry.previousDeclaration.notes,
      declaredBy: entry.previousDeclaration.declaredBy,
      declaredAt: entry.previousDeclaration.declaredAt.toDate(),
    },
    changedAt: entry.changedAt.toDate(),
    changedBy: entry.changedBy,
  }))

  return childProfileSchema.parse({
    id: data.id,
    familyId: data.familyId,
    firstName: data.firstName,
    lastName: data.lastName,
    nickname: data.nickname,
    birthdate: data.birthdate.toDate(),
    photoUrl: data.photoUrl,
    guardians: data.guardians.map((guardian) => ({
      uid: guardian.uid,
      permissions: guardian.permissions,
      grantedAt: guardian.grantedAt.toDate(),
    })),
    createdAt: data.createdAt.toDate(),
    createdBy: data.createdBy,
    // Update tracking fields (Story 2.5)
    updatedAt: data.updatedAt?.toDate() ?? null,
    updatedBy: data.updatedBy ?? null,
    // Custody fields (Story 2.3)
    custodyDeclaration,
    custodyHistory,
    requiresSharedCustodySafeguards: data.requiresSharedCustodySafeguards ?? false,
  })
}

/**
 * Validate CreateChildInput and return typed result
 */
export function validateCreateChildInput(input: unknown): CreateChildInput {
  return createChildInputSchema.parse(input)
}

/**
 * Safely parse child profile data, returning null if invalid
 */
export function safeParseChildProfile(data: unknown): ChildProfile | null {
  const result = childProfileSchema.safeParse(data)
  return result.success ? result.data : null
}

/**
 * Calculate age from birthdate in years
 * Returns whole years - does not round up partial years
 *
 * @param birthdate - Child's date of birth
 * @returns Age in whole years
 */
export function calculateAge(birthdate: Date): number {
  const today = new Date()
  let age = today.getFullYear() - birthdate.getFullYear()
  const monthDiff = today.getMonth() - birthdate.getMonth()

  // If birthday hasn't occurred this year, subtract 1
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthdate.getDate())) {
    age--
  }

  return age
}

/**
 * Check if a user is a guardian for a child
 */
export function isGuardianForChild(child: ChildProfile, uid: string): boolean {
  return child.guardians.some((guardian) => guardian.uid === uid)
}

/**
 * Get a guardian's permission level for a child
 */
export function getChildGuardianPermissions(
  child: ChildProfile,
  uid: string
): ChildGuardianPermission | null {
  const guardian = child.guardians.find((g) => g.uid === uid)
  return guardian?.permissions ?? null
}

/**
 * Check if a user has full permissions for a child
 */
export function hasFullChildPermissions(child: ChildProfile, uid: string): boolean {
  return getChildGuardianPermissions(child, uid) === 'full'
}

/**
 * Get display name for a child (nickname preferred, then firstName)
 */
export function getChildDisplayName(child: ChildProfile): string {
  return child.nickname || child.firstName
}

/**
 * Get full name for a child
 */
export function getChildFullName(child: ChildProfile): string {
  if (child.lastName) {
    return `${child.firstName} ${child.lastName}`
  }
  return child.firstName
}

/**
 * Get age category for age-appropriate defaults
 */
export function getAgeCategory(
  birthdate: Date
): 'young-child' | 'tween' | 'teen' | 'older-teen' {
  const age = calculateAge(birthdate)

  if (age < 8) return 'young-child' // Ages 0-7
  if (age < 11) return 'tween' // Ages 8-10
  if (age < 15) return 'teen' // Ages 11-14
  return 'older-teen' // Ages 15-17
}

/**
 * Check if a child has a custody declaration
 * Returns true if custody has been declared (any type)
 */
export function hasCustodyDeclaration(child: ChildProfile): boolean {
  return child.custodyDeclaration !== null && child.custodyDeclaration !== undefined
}

/**
 * Check if monitoring can be started for a child
 * Story 2.3: Custody must be declared before monitoring can begin
 */
export function canStartMonitoring(child: ChildProfile): boolean {
  return hasCustodyDeclaration(child)
}

// ============================================================================
// STORY 2.6: Remove Child from Family
// ============================================================================

/**
 * Input schema for removing a child from family
 * Requires user to type child's name as confirmation (destructive operation)
 *
 * Story 2.6: Remove Child from Family
 */
export const removeChildConfirmationSchema = z.object({
  /** ID of the child to remove */
  childId: z
    .string()
    .min(1, 'Child ID is required')
    .max(MAX_FIREBASE_ID_LENGTH, 'Invalid child ID')
    .refine((val) => FIREBASE_ID_REGEX.test(val), 'Invalid child ID format'),

  /** User must type child's first name to confirm deletion */
  confirmationText: z
    .string()
    .min(1, 'Please type the child\'s name to confirm')
    .max(50, 'Confirmation text is too long')
    .trim()
    .refine((val) => val.length > 0, 'Please type the child\'s name to confirm'),

  /** Fresh re-authentication token from Google Sign-In */
  reauthToken: z.string().min(1, 'Please sign in again to confirm this action'),
})

export type RemoveChildConfirmation = z.infer<typeof removeChildConfirmationSchema>

/**
 * Metadata stored in audit log when a child is removed
 *
 * Story 2.6: Remove Child from Family
 */
export const childRemovalAuditMetadataSchema = z.object({
  /** Child's first name (preserved for historical reference) */
  childName: z.string().min(1),

  /** Child's full name (preserved for historical reference) */
  childFullName: z.string().min(1),

  /** Whether child had associated devices */
  hadDevices: z.boolean().default(false),

  /** Number of devices unenrolled (if any) */
  devicesUnenrolled: z.number().int().min(0).default(0),

  /** Whether child had screenshots (future-proofing) */
  hadScreenshots: z.boolean().default(false),

  /** Number of screenshots deleted (if any) */
  screenshotsDeleted: z.number().int().min(0).default(0),
})

export type ChildRemovalAuditMetadata = z.infer<typeof childRemovalAuditMetadataSchema>

/**
 * Error messages for child removal at 6th-grade reading level (NFR65)
 */
export const CHILD_REMOVAL_ERROR_MESSAGES: Record<string, string> = {
  'child-not-found': 'We could not find this child.',
  'permission-denied': 'You do not have permission to remove this child.',
  'reauth-required': 'Please sign in again to confirm this action.',
  'reauth-expired': 'Your sign-in has expired. Please try again.',
  'reauth-cancelled': 'Sign-in was cancelled. Please try again.',
  'confirmation-mismatch': 'The name you typed does not match. Please try again.',
  'removal-failed': 'Could not remove the child. Please try again.',
  'removal-in-progress': 'Removal is already in progress. Please wait.',
  'network-error': 'Connection problem. Please check your internet and try again.',
  default: 'Something went wrong. Please try again.',
}

/**
 * Get user-friendly error message for child removal errors
 */
export function getChildRemovalErrorMessage(code: string): string {
  return CHILD_REMOVAL_ERROR_MESSAGES[code] || CHILD_REMOVAL_ERROR_MESSAGES.default
}

/**
 * Validate remove child confirmation input
 */
export function validateRemoveChildConfirmation(input: unknown): RemoveChildConfirmation {
  return removeChildConfirmationSchema.parse(input)
}

/**
 * Safely parse remove child confirmation, returning null if invalid
 */
export function safeParseRemoveChildConfirmation(
  input: unknown
): RemoveChildConfirmation | null {
  const result = removeChildConfirmationSchema.safeParse(input)
  return result.success ? result.data : null
}

/**
 * Check if confirmation text matches child's first name (case-insensitive)
 */
export function isConfirmationTextValid(
  confirmationText: string,
  childFirstName: string
): boolean {
  return confirmationText.trim().toLowerCase() === childFirstName.trim().toLowerCase()
}
