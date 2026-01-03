/**
 * Location Abuse Detection Schemas
 *
 * Story 40.6: Location Feature Abuse Prevention
 * - AC1: Asymmetric location check detection
 * - AC2: Frequent rule change detection
 * - AC3: Cross-custody restriction detection
 * - AC4: Bilateral parent alerts
 * - AC5: Conflict resolution resources
 * - AC6: Auto-disable capability
 *
 * These schemas define the data structures for detecting and alerting
 * on potential location feature abuse in shared custody situations.
 */

import { z } from 'zod'

// ============================================================================
// Constants - Non-configurable thresholds (prevents gaming)
// ============================================================================

/**
 * Location abuse detection thresholds.
 * These are intentionally NOT user-configurable to prevent gaming.
 */
export const LOCATION_ABUSE_THRESHOLDS = {
  /** Asymmetric check ratio threshold (one parent checks 10x more than other) */
  ASYMMETRIC_CHECK_RATIO: 10,
  /** Rolling window for asymmetric check detection (7 days) */
  ASYMMETRIC_CHECK_WINDOW_DAYS: 7,
  /** Number of rule changes considered "frequent" */
  FREQUENT_CHANGES_COUNT: 3,
  /** Window before custody exchange to check for frequent changes (24 hours) */
  FREQUENT_CHANGES_WINDOW_HOURS: 24,
  /** Number of alerts before auto-disable triggers */
  AUTO_DISABLE_ALERT_COUNT: 3,
  /** Window for counting alerts toward auto-disable (30 days) */
  AUTO_DISABLE_WINDOW_DAYS: 30,
  /** Rate limit for location access logging (1 per minute) */
  ACCESS_LOG_RATE_LIMIT_MS: 60 * 1000,
} as const

/**
 * Conflict resolution resources for parents.
 * Neutral, non-judgmental resources to help with co-parenting challenges.
 */
export const LOCATION_ABUSE_RESOURCES = {
  title: 'Resources for Co-Parenting Challenges',
  intro:
    "We've noticed some patterns that might indicate tension around location features. Here are some resources that may help:",
  resources: [
    {
      id: 'mediation',
      name: 'Family Mediation Services',
      url: 'https://www.mediate.com/family/',
      description: 'Find a family mediator near you',
    },
    {
      id: 'communication',
      name: 'Co-Parenting Communication Guide',
      url: 'https://www.helpguide.org/articles/parenting-family/co-parenting-tips-for-divorced-parents.htm',
      description: 'Tips for effective co-parenting communication',
    },
    {
      id: 'parallel',
      name: 'Parallel Parenting Strategies',
      url: 'https://www.verywellfamily.com/parallel-parenting-when-you-cant-co-parent-1102453',
      description: 'When traditional co-parenting is difficult',
    },
  ],
} as const

/**
 * Alert messages - neutral language that doesn't blame either parent.
 */
export const LOCATION_ABUSE_MESSAGES = {
  asymmetricChecks: {
    title: 'Location Check Pattern Detected',
    summary:
      'We noticed an imbalance in how often location features are being used between family guardians.',
    detail:
      'This is not an accusation - patterns can have many explanations. We recommend reviewing our resources for healthy co-parenting communication.',
  },
  frequentRuleChanges: {
    title: 'Frequent Rule Changes Detected',
    summary: 'Location rules have been changed frequently around custody transition times.',
    detail:
      'Stable rules help children know what to expect. Consider discussing rule consistency with your co-parent.',
  },
  crossCustodyRestriction: {
    title: 'Cross-Custody Rule Pattern Detected',
    summary:
      'Some location-based rules appear to be primarily active during specific custody periods.',
    detail:
      'For consistency, rules that apply at both homes may work better for children. Consider coordinating with your co-parent.',
  },
  autoDisable: {
    title: 'Location Features Temporarily Disabled',
    summary:
      'Due to detected patterns, location features have been temporarily disabled for this family.',
    detail:
      'Both guardians can re-enable location features together when ready. We recommend reviewing the resources below before re-enabling.',
  },
} as const

// ============================================================================
// Enums
// ============================================================================

/**
 * Types of abuse patterns that can be detected.
 */
export const locationAbusePatternTypeSchema = z.enum([
  'asymmetric_checks',
  'frequent_rule_changes',
  'cross_custody_restriction',
])
export type LocationAbusePatternType = z.infer<typeof locationAbusePatternTypeSchema>

/**
 * Types of location access that are tracked.
 */
export const locationAccessTypeSchema = z.enum(['status_check', 'history_view', 'zone_view'])
export type LocationAccessType = z.infer<typeof locationAccessTypeSchema>

// ============================================================================
// Location Access Log Schema
// ============================================================================

/**
 * Schema for tracking location feature access by guardians.
 * Used to detect asymmetric usage patterns.
 */
export const locationAccessLogSchema = z.object({
  /** Unique identifier */
  id: z.string().min(1),
  /** Family ID */
  familyId: z.string().min(1),
  /** UID of guardian who accessed location */
  uid: z.string().min(1),
  /** Child whose location was accessed */
  childId: z.string().min(1),
  /** Type of access */
  accessType: locationAccessTypeSchema,
  /** When the access occurred */
  timestamp: z.date(),
})
export type LocationAccessLog = z.infer<typeof locationAccessLogSchema>

/**
 * Input schema for tracking location access.
 */
export const trackLocationAccessInputSchema = z.object({
  /** Family ID */
  familyId: z.string().min(1),
  /** Child whose location is being accessed */
  childId: z.string().min(1),
  /** Type of access */
  accessType: locationAccessTypeSchema,
})
export type TrackLocationAccessInput = z.infer<typeof trackLocationAccessInputSchema>

// ============================================================================
// Abuse Pattern Schema
// ============================================================================

/**
 * Metadata for asymmetric check patterns.
 */
export const asymmetricCheckMetadataSchema = z.object({
  /** UID of guardian with higher check count */
  higherUid: z.string().min(1),
  /** Check count for higher guardian */
  higherCount: z.number().int().nonnegative(),
  /** UID of guardian with lower check count */
  lowerUid: z.string().min(1),
  /** Check count for lower guardian */
  lowerCount: z.number().int().nonnegative(),
  /** Ratio between higher and lower */
  ratio: z.number().positive(),
})
export type AsymmetricCheckMetadata = z.infer<typeof asymmetricCheckMetadataSchema>

/**
 * Metadata for frequent rule change patterns.
 */
export const frequentRuleChangeMetadataSchema = z.object({
  /** Number of rule changes detected */
  changeCount: z.number().int().positive(),
  /** Types of changes made */
  changeTypes: z.array(z.string()),
  /** Hours until next custody exchange */
  hoursToExchange: z.number().nonnegative(),
  /** IDs of rules that were changed */
  changedRuleIds: z.array(z.string()),
})
export type FrequentRuleChangeMetadata = z.infer<typeof frequentRuleChangeMetadataSchema>

/**
 * Metadata for cross-custody restriction patterns.
 */
export const crossCustodyRestrictionMetadataSchema = z.object({
  /** IDs of rules flagged as targeting specific custody periods */
  flaggedRuleIds: z.array(z.string()),
  /** Custody periods where restrictions are active */
  restrictedCustodyPeriods: z.array(z.string()),
  /** Types of restrictions (blocked categories, time limits, etc.) */
  restrictionTypes: z.array(z.string()),
})
export type CrossCustodyRestrictionMetadata = z.infer<typeof crossCustodyRestrictionMetadataSchema>

/**
 * Union of all metadata types.
 */
export const locationAbuseMetadataSchema = z.union([
  asymmetricCheckMetadataSchema,
  frequentRuleChangeMetadataSchema,
  crossCustodyRestrictionMetadataSchema,
])
export type LocationAbuseMetadata = z.infer<typeof locationAbuseMetadataSchema>

/**
 * Schema for detected abuse patterns.
 */
export const locationAbusePatternSchema = z.object({
  /** Unique identifier */
  id: z.string().min(1),
  /** Family ID */
  familyId: z.string().min(1),
  /** Type of pattern detected */
  patternType: locationAbusePatternTypeSchema,
  /** When the pattern was detected */
  detectedAt: z.date(),
  /** Start of the detection window */
  windowStart: z.date(),
  /** End of the detection window */
  windowEnd: z.date(),
  /** Pattern-specific metadata */
  metadata: z.record(z.unknown()),
  /** Whether an alert has been sent for this pattern */
  alertSent: z.boolean(),
})
export type LocationAbusePattern = z.infer<typeof locationAbusePatternSchema>

// ============================================================================
// Abuse Alert Schema
// ============================================================================

/**
 * Schema for abuse alerts sent to guardians.
 */
export const locationAbuseAlertSchema = z.object({
  /** Unique identifier */
  id: z.string().min(1),
  /** Family ID */
  familyId: z.string().min(1),
  /** Pattern ID that triggered this alert */
  patternId: z.string().min(1),
  /** Type of pattern */
  patternType: locationAbusePatternTypeSchema,
  /** UIDs of guardians who were notified */
  notifiedGuardianUids: z.array(z.string().min(1)),
  /** When the alert was sent */
  sentAt: z.date(),
  /** Whether the alert has been acknowledged */
  acknowledged: z.boolean(),
  /** When the alert was acknowledged (if applicable) */
  acknowledgedAt: z.date().nullable(),
  /** UID of guardian who acknowledged (if applicable) */
  acknowledgedByUid: z.string().nullable(),
  /** Whether resources have been viewed */
  resourcesViewed: z.boolean(),
  /** When resources were viewed (if applicable) */
  resourcesViewedAt: z.date().nullable(),
})
export type LocationAbuseAlert = z.infer<typeof locationAbuseAlertSchema>

/**
 * Input schema for sending abuse alerts.
 */
export const sendLocationAbuseAlertInputSchema = z.object({
  /** Family ID */
  familyId: z.string().min(1),
  /** Pattern ID */
  patternId: z.string().min(1),
  /** Pattern type */
  patternType: locationAbusePatternTypeSchema,
})
export type SendLocationAbuseAlertInput = z.infer<typeof sendLocationAbuseAlertInputSchema>

/**
 * Response schema for alert functions.
 */
export const locationAbuseAlertResponseSchema = z.object({
  /** Whether the operation succeeded */
  success: z.boolean(),
  /** Alert ID if created */
  alertId: z.string().nullable(),
  /** Message describing the result */
  message: z.string(),
})
export type LocationAbuseAlertResponse = z.infer<typeof locationAbuseAlertResponseSchema>

// ============================================================================
// Auto-Disable Schema
// ============================================================================

/**
 * Schema for auto-disable events.
 */
export const locationAutoDisableSchema = z.object({
  /** Unique identifier */
  id: z.string().min(1),
  /** Family ID */
  familyId: z.string().min(1),
  /** When auto-disable occurred */
  disabledAt: z.date(),
  /** Alert IDs that triggered auto-disable */
  triggeringAlertIds: z.array(z.string().min(1)),
  /** Number of alerts that triggered disable */
  alertCount: z.number().int().positive(),
  /** UIDs of guardians notified of auto-disable */
  notifiedGuardianUids: z.array(z.string().min(1)),
  /** When/if location features were re-enabled */
  reenabledAt: z.date().nullable(),
  /** UIDs of guardians who consented to re-enable */
  reenabledByUids: z.array(z.string()).nullable(),
})
export type LocationAutoDisable = z.infer<typeof locationAutoDisableSchema>

// ============================================================================
// Guardian Access Count Schema (for detection logic)
// ============================================================================

/**
 * Schema for guardian access counts used in asymmetric detection.
 */
export const guardianAccessCountSchema = z.object({
  /** Guardian UID */
  uid: z.string().min(1),
  /** Total access count in window */
  count: z.number().int().nonnegative(),
  /** Access counts by type */
  byType: z.record(locationAccessTypeSchema, z.number().int().nonnegative()).optional(),
})
export type GuardianAccessCount = z.infer<typeof guardianAccessCountSchema>

/**
 * Schema for asymmetry calculation result.
 */
export const asymmetryResultSchema = z.object({
  /** Whether asymmetry was detected */
  detected: z.boolean(),
  /** Asymmetry ratio (higher / lower count) */
  ratio: z.number().nonnegative(),
  /** UID of guardian with higher count */
  higherUid: z.string().nullable(),
  /** Count for higher guardian */
  higherCount: z.number().int().nonnegative(),
  /** UID of guardian with lower count */
  lowerUid: z.string().nullable(),
  /** Count for lower guardian */
  lowerCount: z.number().int().nonnegative(),
})
export type AsymmetryResult = z.infer<typeof asymmetryResultSchema>
