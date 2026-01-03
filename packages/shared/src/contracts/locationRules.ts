/**
 * Location Rule schemas.
 *
 * Story 40.2: Location-Specific Rule Configuration
 * - AC2: Per-Location Time Limits (different time limits at different locations)
 * - AC3: Per-Location Category Rules (different category permissions by location)
 *
 * Location rules allow customizing time limits and category permissions
 * for each child at each defined location zone.
 */

import { z } from 'zod'

// ============================================
// Story 40.2: Location-Specific Rules
// ============================================

/**
 * Category override value.
 * Story 40.2: AC3 - Per-location category permissions
 */
export const categoryOverrideValueSchema = z.enum(['allowed', 'blocked'])
export type CategoryOverrideValue = z.infer<typeof categoryOverrideValueSchema>

/**
 * Category overrides record.
 * Maps category IDs to their override status at this location.
 * Empty record means use default category settings.
 */
export const categoryOverridesSchema = z.record(z.string(), categoryOverrideValueSchema)
export type CategoryOverrides = z.infer<typeof categoryOverridesSchema>

/**
 * Location rule schema.
 * Story 40.2: AC2, AC3 - Per-location rules for a child
 *
 * Stored at: families/{familyId}/locationRules/{ruleId}
 */
export const locationRuleSchema = z.object({
  /** Unique rule identifier */
  id: z.string().min(1),
  /** Zone ID this rule applies to */
  zoneId: z.string().min(1),
  /** Family ID */
  familyId: z.string().min(1),
  /** Child ID this rule applies to */
  childId: z.string().min(1),
  /** Daily time limit in minutes (null = use child's default limit) per AC2 */
  dailyTimeLimitMinutes: z.number().min(0).max(1440).nullable(),
  /** Category permission overrides (empty = use default settings) per AC3 */
  categoryOverrides: categoryOverridesSchema,
  /** Education-only mode at this location (default true for school zones) per AC3 */
  educationOnlyMode: z.boolean().default(false),
  /** When rule was created */
  createdAt: z.date(),
  /** When rule was last updated */
  updatedAt: z.date(),
})
export type LocationRule = z.infer<typeof locationRuleSchema>

/**
 * Cloud function input: Set (create/update) location rule.
 * Story 40.2: AC2, AC3 - Guardian configures location-specific rules
 */
export const setLocationRuleInputSchema = z.object({
  /** Family ID */
  familyId: z.string().min(1),
  /** Zone ID this rule applies to */
  zoneId: z.string().min(1),
  /** Child ID this rule applies to */
  childId: z.string().min(1),
  /** Daily time limit in minutes (null = use default) */
  dailyTimeLimitMinutes: z.number().min(0).max(1440).nullable().optional(),
  /** Category permission overrides */
  categoryOverrides: categoryOverridesSchema.optional(),
  /** Education-only mode at this location */
  educationOnlyMode: z.boolean().optional(),
})
export type SetLocationRuleInput = z.infer<typeof setLocationRuleInputSchema>

/**
 * Cloud function input: Delete location rule.
 * Story 40.2: AC2, AC3 - Guardian removes location-specific rules
 */
export const deleteLocationRuleInputSchema = z.object({
  /** Family ID */
  familyId: z.string().min(1),
  /** Rule ID to delete */
  ruleId: z.string().min(1),
})
export type DeleteLocationRuleInput = z.infer<typeof deleteLocationRuleInputSchema>

/**
 * Effective location rule with zone info for display.
 * Story 40.2: AC5 - Child location status display
 */
export const effectiveLocationRuleSchema = z.object({
  /** Zone ID */
  zoneId: z.string().min(1),
  /** Zone name for display */
  zoneName: z.string().min(1),
  /** Zone type */
  zoneType: z.enum(['home_1', 'home_2', 'school', 'other']),
  /** Effective daily time limit in minutes (resolved from rule or default) */
  effectiveTimeLimitMinutes: z.number().min(0).max(1440),
  /** Whether education-only mode is active */
  educationOnlyMode: z.boolean(),
  /** Whether time limit is overridden (vs using default) */
  isTimeLimitOverride: z.boolean(),
})
export type EffectiveLocationRule = z.infer<typeof effectiveLocationRuleSchema>
