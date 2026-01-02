/**
 * Post-Graduation Support Contracts - Story 38.7 Task 1
 *
 * Zod schemas and types for post-graduation support.
 * AC1: Optional digital wellness tips available
 * AC2: Self-tracking tools (non-monitored) offered
 * AC3: "Alumni" status preserved (can rejoin voluntarily if desired)
 * AC4: No monitoring data collected post-graduation
 */

import { z } from 'zod'

// ============================================
// Constants
// ============================================

/**
 * Alumni status values (AC3).
 */
export const ALUMNI_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  REJOINED: 'rejoined',
} as const

/**
 * Wellness tip categories (AC1).
 */
export const WELLNESS_TIP_CATEGORIES = [
  'screen_time',
  'digital_balance',
  'online_safety',
  'productivity',
] as const

/**
 * Parent resource categories (AC6).
 */
export const PARENT_RESOURCE_CATEGORIES = [
  'supporting_independence',
  'transition_tips',
  'communication',
] as const

// ============================================
// Schemas
// ============================================

/**
 * Alumni status schema (AC3).
 */
export const alumniStatusSchema = z.enum(['active', 'inactive', 'rejoined'])

/**
 * Alumni profile schema (AC3, AC4).
 */
export const alumniProfileSchema = z.object({
  id: z.string(),
  childId: z.string(),
  familyId: z.string(),
  graduatedAt: z.date(),
  status: alumniStatusSchema,
  canRejoin: z.boolean(),
  wellnessTipsEnabled: z.boolean(),
  selfTrackingEnabled: z.boolean(),
  lastActiveAt: z.date().nullable(),
  celebrationCompleted: z.boolean(),
})

/**
 * Digital wellness tip schema (AC1).
 */
export const digitalWellnessTipSchema = z.object({
  id: z.string(),
  category: z.enum(WELLNESS_TIP_CATEGORIES),
  title: z.string().min(1),
  content: z.string().min(1),
  order: z.number().int().min(0),
  isActive: z.boolean(),
})

/**
 * Self-tracking preferences schema (AC2, AC4).
 * AC4: dataStoredLocally ensures no monitoring data collected.
 */
export const selfTrackingPreferencesSchema = z.object({
  alumniId: z.string(),
  screenTimeGoalMinutes: z.number().int().min(0),
  breakReminderEnabled: z.boolean(),
  dailyReflectionEnabled: z.boolean(),
  goalsVisible: z.boolean(),
  dataStoredLocally: z.boolean(), // AC4: Must be true - no external monitoring
})

/**
 * Parent resource schema (AC6).
 */
export const parentResourceSchema = z.object({
  id: z.string(),
  category: z.enum(PARENT_RESOURCE_CATEGORIES),
  title: z.string().min(1),
  summary: z.string().min(1),
  content: z.string().min(1),
  order: z.number().int().min(0),
  isActive: z.boolean(),
})

/**
 * Graduation celebration schema (AC5).
 */
export const graduationCelebrationSchema = z.object({
  id: z.string(),
  alumniId: z.string(),
  familyId: z.string(),
  celebratedAt: z.date(),
  message: z.string().min(1),
  parentAcknowledged: z.boolean(),
  childAcknowledged: z.boolean(),
})

// ============================================
// Types
// ============================================

export type AlumniStatus = z.infer<typeof alumniStatusSchema>
export type AlumniProfile = z.infer<typeof alumniProfileSchema>
export type DigitalWellnessTip = z.infer<typeof digitalWellnessTipSchema>
export type SelfTrackingPreferences = z.infer<typeof selfTrackingPreferencesSchema>
export type ParentResource = z.infer<typeof parentResourceSchema>
export type GraduationCelebration = z.infer<typeof graduationCelebrationSchema>
export type WellnessTipCategory = (typeof WELLNESS_TIP_CATEGORIES)[number]
export type ParentResourceCategory = (typeof PARENT_RESOURCE_CATEGORIES)[number]

// ============================================
// Factory Functions
// ============================================

/**
 * Create an alumni profile.
 * AC3: Alumni status preserved, can rejoin voluntarily.
 *
 * @param childId - The child's ID
 * @param familyId - The family's ID
 * @returns A new alumni profile
 */
export function createAlumniProfile(childId: string, familyId: string): AlumniProfile {
  return {
    id: `alumni-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
    childId,
    familyId,
    graduatedAt: new Date(),
    status: 'active',
    canRejoin: true, // AC3: Can rejoin voluntarily if desired
    wellnessTipsEnabled: true, // AC1: Optional wellness tips enabled by default
    selfTrackingEnabled: false, // AC2: Self-tracking offered but not enabled by default
    lastActiveAt: new Date(),
    celebrationCompleted: false,
  }
}

/**
 * Create a digital wellness tip.
 * AC1: Optional digital wellness tips.
 *
 * @param category - The tip category
 * @param title - The tip title
 * @param content - The tip content
 * @returns A new wellness tip
 */
export function createWellnessTip(
  category: WellnessTipCategory,
  title: string,
  content: string
): DigitalWellnessTip {
  return {
    id: `tip-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
    category,
    title,
    content,
    order: 0,
    isActive: true,
  }
}

/**
 * Create a parent resource.
 * AC6: Resources for parents: "Supporting your independent teen".
 *
 * @param category - The resource category
 * @param title - The resource title
 * @param summary - The resource summary
 * @param content - The full content
 * @returns A new parent resource
 */
export function createParentResource(
  category: ParentResourceCategory,
  title: string,
  summary: string,
  content: string
): ParentResource {
  return {
    id: `resource-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
    category,
    title,
    summary,
    content,
    order: 0,
    isActive: true,
  }
}

/**
 * Create self-tracking preferences.
 * AC2: Self-tracking tools offered.
 * AC4: Data stored locally, no monitoring.
 *
 * @param alumniId - The alumni's ID
 * @returns Default self-tracking preferences
 */
export function createSelfTrackingPreferences(alumniId: string): SelfTrackingPreferences {
  return {
    alumniId,
    screenTimeGoalMinutes: 120, // Default 2 hours
    breakReminderEnabled: true,
    dailyReflectionEnabled: false,
    goalsVisible: true,
    dataStoredLocally: true, // AC4: No external monitoring
  }
}

/**
 * Create a graduation celebration.
 * AC5: Celebrates successful transition to independence.
 *
 * @param alumniId - The alumni's ID
 * @param familyId - The family's ID
 * @param message - The celebration message
 * @returns A new graduation celebration
 */
export function createGraduationCelebration(
  alumniId: string,
  familyId: string,
  message: string
): GraduationCelebration {
  return {
    id: `celebration-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
    alumniId,
    familyId,
    celebratedAt: new Date(),
    message,
    parentAcknowledged: false,
    childAcknowledged: false,
  }
}

// ============================================
// Validation Functions
// ============================================

/**
 * Check if an alumni is eligible to rejoin.
 * AC3: Can rejoin voluntarily if desired.
 *
 * @param profile - The alumni profile
 * @returns True if eligible to rejoin
 */
export function isAlumniEligibleForRejoin(profile: AlumniProfile): boolean {
  // Can rejoin if: active status, canRejoin flag is true, and hasn't already rejoined
  return profile.status === 'active' && profile.canRejoin === true
}

/**
 * Validate that self-tracking respects privacy.
 * AC4: No monitoring data collected post-graduation.
 *
 * @param prefs - The self-tracking preferences
 * @returns True if privacy requirements are met
 */
export function validateSelfTrackingPrivacy(prefs: SelfTrackingPreferences): boolean {
  // AC4: Data must be stored locally only
  return prefs.dataStoredLocally === true
}

/**
 * Check if alumni profile is valid.
 *
 * @param profile - The profile to validate
 * @returns True if profile is valid
 */
export function isValidAlumniProfile(profile: AlumniProfile): boolean {
  const result = alumniProfileSchema.safeParse(profile)
  return result.success
}
