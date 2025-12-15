import { z } from 'zod'

/**
 * User Schema - Defines the user profile stored in Firestore users/{uid}
 *
 * This schema is the source of truth for all User types in the application.
 * Per project guidelines: Types are always derived from Zod schemas.
 */

/**
 * Custom photoURL validator - only allows http/https schemes
 * Prevents XSS via javascript: URLs and other unsafe schemes
 */
const safePhotoURLSchema = z
  .string()
  .refine(
    (val) => {
      if (!val) return true
      try {
        const url = new URL(val)
        return url.protocol === 'http:' || url.protocol === 'https:'
      } catch {
        return false
      }
    },
    { message: 'Photo URL must use http or https protocol' }
  )
  .nullable()
  .optional()

/**
 * Enhanced email validation with length limits
 * Standard email max length is 254 characters (RFC 5321)
 * Trim happens first before validation via transform + pipe
 */
const safeEmailSchema = z
  .string()
  .transform((email) => email.trim().toLowerCase())
  .pipe(
    z.string()
      .email('Valid email is required')
      .max(254, 'Email must be less than 254 characters')
  )

/**
 * User role within the application
 * - guardian: Parent/caregiver who manages children and family
 * - child: Child account (future use)
 * - caregiver: Non-parent caregiver with limited access (future use)
 */
export const userRoleSchema = z.enum(['guardian', 'child', 'caregiver'])

export type UserRole = z.infer<typeof userRoleSchema>

/**
 * Complete user profile as stored in Firestore
 */
export const userSchema = z.object({
  /** Firebase Auth uid (matches Firestore document ID) */
  uid: z.string().min(1, 'User ID is required'),

  /** User's email address from Google (normalized to lowercase) */
  email: safeEmailSchema,

  /** User's display name from Google (may be null if not set) */
  displayName: z.string().nullable().optional(),

  /** User's profile photo URL from Google (http/https only, may be null) */
  photoURL: safePhotoURLSchema,

  /** Timestamp when the user profile was created */
  createdAt: z.date(),

  /** Timestamp of the user's last login */
  lastLoginAt: z.date(),

  /** Reference to user's family (added when family is created - Story 2.1) */
  familyId: z.string().optional(),

  /** User's role in the application (set when joining/creating family) */
  role: userRoleSchema.optional(),
})

export type User = z.infer<typeof userSchema>

/**
 * Input schema for creating a new user from Firebase Auth data
 * Timestamps are added server-side, so they're not included here
 */
export const createUserInputSchema = z.object({
  /** Firebase Auth uid */
  uid: z.string().min(1, 'User ID is required'),

  /** User's email address from Google (normalized to lowercase) */
  email: safeEmailSchema,

  /** User's display name from Google (may be null if not set) */
  displayName: z.string().nullable().optional(),

  /** User's profile photo URL from Google (http/https only, may be null) */
  photoURL: safePhotoURLSchema,
})

export type CreateUserInput = z.infer<typeof createUserInputSchema>

/**
 * Schema for Firestore document data (uses Timestamp instead of Date)
 * This is used when reading raw Firestore data before conversion
 */
export const userFirestoreSchema = z.object({
  uid: z.string().min(1),
  email: safeEmailSchema,
  displayName: z.string().nullable().optional(),
  photoURL: safePhotoURLSchema,
  createdAt: z.custom<{ toDate: () => Date }>((val) => val && typeof (val as { toDate?: () => Date }).toDate === 'function'),
  lastLoginAt: z.custom<{ toDate: () => Date }>((val) => val && typeof (val as { toDate?: () => Date }).toDate === 'function'),
  familyId: z.string().optional(),
  role: userRoleSchema.optional(),
})

export type UserFirestore = z.infer<typeof userFirestoreSchema>

/**
 * Convert Firestore document data to User type
 * Handles Timestamp to Date conversion
 */
export function convertFirestoreToUser(data: UserFirestore): User {
  return userSchema.parse({
    uid: data.uid,
    email: data.email,
    displayName: data.displayName,
    photoURL: data.photoURL,
    createdAt: data.createdAt.toDate(),
    lastLoginAt: data.lastLoginAt.toDate(),
    familyId: data.familyId,
    role: data.role,
  })
}

/**
 * Validate CreateUserInput and return typed result
 */
export function validateCreateUserInput(input: unknown): CreateUserInput {
  return createUserInputSchema.parse(input)
}

/**
 * Safely parse user data, returning null if invalid
 */
export function safeParseUser(data: unknown): User | null {
  const result = userSchema.safeParse(data)
  return result.success ? result.data : null
}
