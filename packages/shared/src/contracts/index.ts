/**
 * Zod schemas and inferred types for Fledgely data contracts.
 *
 * All types in Fledgely are derived from Zod schemas - this is the single source of truth.
 * Never create standalone interface/type definitions.
 *
 * Usage:
 *   import { agreementSchema, type Agreement } from '@fledgely/contracts'
 */

import { z } from 'zod'

// Placeholder schema - will be expanded in feature stories
export const placeholderSchema = z.object({
  id: z.string(),
  createdAt: z.date(),
})

export type Placeholder = z.infer<typeof placeholderSchema>

/**
 * Session expiry configuration.
 */
export const SESSION_EXPIRY_DAYS = 30

/**
 * User profile schema.
 *
 * Represents a user's profile stored in Firestore at /users/{uid}.
 * All users authenticate via Google Sign-In.
 */
export const userSchema = z.object({
  uid: z.string(),
  email: z.string().email(),
  displayName: z.string().nullable(),
  photoURL: z.string().url().nullable(),
  familyId: z.string().nullable(), // Reference to family document
  createdAt: z.date(),
  lastLoginAt: z.date(),
  lastActivityAt: z.date(), // For 30-day session expiry tracking
})

export type User = z.infer<typeof userSchema>

/**
 * Guardian role in a family.
 */
export const guardianRoleSchema = z.enum(['primary_guardian', 'guardian'])
export type GuardianRole = z.infer<typeof guardianRoleSchema>

/**
 * Guardian entry in a family document.
 */
export const familyGuardianSchema = z.object({
  uid: z.string(),
  role: guardianRoleSchema,
  addedAt: z.date(),
})
export type FamilyGuardian = z.infer<typeof familyGuardianSchema>

/**
 * Family schema.
 *
 * Represents a family unit stored in Firestore at /families/{familyId}.
 * Contains guardians (parents) and references to children.
 */
export const familySchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(100),
  guardians: z.array(familyGuardianSchema).min(1),
  createdAt: z.date(),
  updatedAt: z.date(),
})
export type Family = z.infer<typeof familySchema>
