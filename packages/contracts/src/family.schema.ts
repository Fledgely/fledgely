import { z } from 'zod'

/**
 * Family Schema - Defines the family structure stored in Firestore families/{familyId}
 *
 * This schema is the source of truth for all Family types in the application.
 * Per project guidelines: Types are always derived from Zod schemas.
 */

/**
 * Guardian permission levels within a family
 */
export const guardianPermissionSchema = z.enum([
  'full', // All permissions - can manage family, children, agreements
  'readonly', // View only (future use for co-parents with limited access)
])

export type GuardianPermission = z.infer<typeof guardianPermissionSchema>

/**
 * Guardian role within a family
 */
export const guardianRoleSchema = z.enum([
  'primary', // Created the family, primary account holder
  'co-parent', // Invited guardian with equal access (future Story 2.7)
])

export type GuardianRole = z.infer<typeof guardianRoleSchema>

/**
 * Family guardian reference - represents a parent/guardian in the family
 */
export const familyGuardianSchema = z.object({
  /** Guardian's user uid (references users/{uid}) */
  uid: z.string().min(1, 'Guardian ID is required'),

  /** Guardian's role in the family */
  role: guardianRoleSchema,

  /** Guardian's permission level */
  permissions: guardianPermissionSchema,

  /** When the guardian joined the family */
  joinedAt: z.date(),
})

export type FamilyGuardian = z.infer<typeof familyGuardianSchema>

/**
 * Firestore-compatible guardian schema (uses Timestamp)
 */
export const familyGuardianFirestoreSchema = z.object({
  uid: z.string().min(1),
  role: guardianRoleSchema,
  permissions: guardianPermissionSchema,
  joinedAt: z.custom<{ toDate: () => Date }>(
    (val) => val && typeof (val as { toDate?: () => Date }).toDate === 'function'
  ),
})

export type FamilyGuardianFirestore = z.infer<typeof familyGuardianFirestoreSchema>

/**
 * Complete family document as stored in Firestore
 */
export const familySchema = z.object({
  /** Unique family identifier (Firestore document ID) */
  id: z.string().min(1, 'Family ID is required'),

  /** Timestamp when the family was created */
  createdAt: z.date(),

  /** User uid who created the family */
  createdBy: z.string().min(1, 'Creator ID is required'),

  /** Array of guardians (parents) in the family - must have at least one */
  guardians: z.array(familyGuardianSchema).min(1, 'At least one guardian is required'),

  /** Array of child uids in the family (populated in Story 2.2) */
  children: z.array(z.string()).default([]),
})

export type Family = z.infer<typeof familySchema>

/**
 * Schema for Firestore document data (uses Timestamp instead of Date)
 * This is used when reading raw Firestore data before conversion
 */
export const familyFirestoreSchema = z.object({
  id: z.string().min(1),
  createdAt: z.custom<{ toDate: () => Date }>(
    (val) => val && typeof (val as { toDate?: () => Date }).toDate === 'function'
  ),
  createdBy: z.string().min(1),
  guardians: z.array(familyGuardianFirestoreSchema).min(1),
  children: z.array(z.string()).default([]),
})

export type FamilyFirestore = z.infer<typeof familyFirestoreSchema>

/**
 * Firebase document ID regex - validates IDs are safe for Firestore paths
 * - No forward slashes (path separator)
 * - No double periods (reserved)
 * - No null bytes
 * - Reasonable length (max 1500 bytes for Firestore, we use 200 for sanity)
 */
const FIREBASE_ID_REGEX = /^[^/\x00]+$/
const MAX_FIREBASE_ID_LENGTH = 200

/**
 * Input schema for creating a new family
 * Only requires the creator's uid - other fields are set server-side
 *
 * Validates:
 * - Non-empty
 * - Non-whitespace-only
 * - No path-breaking characters (forward slashes)
 * - Reasonable length for Firestore document IDs
 */
export const createFamilyInputSchema = z.object({
  /** User uid creating the family */
  createdBy: z
    .string()
    .min(1, 'Creator ID is required')
    .max(MAX_FIREBASE_ID_LENGTH, 'Creator ID is too long')
    .trim()
    .refine((val) => val.length > 0, 'Creator ID cannot be only whitespace')
    .refine(
      (val) => FIREBASE_ID_REGEX.test(val),
      'Creator ID contains invalid characters'
    ),
})

export type CreateFamilyInput = z.infer<typeof createFamilyInputSchema>

/**
 * Convert Firestore document data to Family type
 * Handles Timestamp to Date conversion for all timestamp fields
 */
export function convertFirestoreToFamily(data: FamilyFirestore): Family {
  return familySchema.parse({
    id: data.id,
    createdAt: data.createdAt.toDate(),
    createdBy: data.createdBy,
    guardians: data.guardians.map((guardian) => ({
      uid: guardian.uid,
      role: guardian.role,
      permissions: guardian.permissions,
      joinedAt: guardian.joinedAt.toDate(),
    })),
    children: data.children || [],
  })
}

/**
 * Validate CreateFamilyInput and return typed result
 */
export function validateCreateFamilyInput(input: unknown): CreateFamilyInput {
  return createFamilyInputSchema.parse(input)
}

/**
 * Safely parse family data, returning null if invalid
 */
export function safeParseFamily(data: unknown): Family | null {
  const result = familySchema.safeParse(data)
  return result.success ? result.data : null
}

/**
 * Check if a user is a guardian in a family
 */
export function isGuardianInFamily(family: Family, uid: string): boolean {
  return family.guardians.some((guardian) => guardian.uid === uid)
}

/**
 * Get a guardian's role in a family
 */
export function getGuardianRole(family: Family, uid: string): GuardianRole | null {
  const guardian = family.guardians.find((g) => g.uid === uid)
  return guardian?.role ?? null
}

/**
 * Get a guardian's permission level in a family
 */
export function getGuardianPermissions(
  family: Family,
  uid: string
): GuardianPermission | null {
  const guardian = family.guardians.find((g) => g.uid === uid)
  return guardian?.permissions ?? null
}

/**
 * Check if a user has full permissions in a family
 */
export function hasFullPermissions(family: Family, uid: string): boolean {
  return getGuardianPermissions(family, uid) === 'full'
}
