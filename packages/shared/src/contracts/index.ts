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
/**
 * Caregiver role for limited access users.
 * Story 19D.1: Caregiver Invitation & Onboarding - AC2
 * Defined here for use in familySchema.
 */
export const caregiverRoleSchema = z.enum(['status_viewer'])
export type CaregiverRole = z.infer<typeof caregiverRoleSchema>

/**
 * Caregiver relationship type.
 * Story 39.1: Caregiver Account Creation - AC1
 * Defines the relationship between the caregiver and the family.
 */
export const caregiverRelationshipSchema = z.enum([
  'grandparent',
  'aunt_uncle',
  'babysitter',
  'other',
])
export type CaregiverRelationship = z.infer<typeof caregiverRelationshipSchema>

/**
 * Maximum number of caregivers allowed per family.
 * Story 39.1: Caregiver Account Creation - AC2
 * Includes both active caregivers and pending invitations.
 */
export const MAX_CAREGIVERS_PER_FAMILY = 5

/**
 * Access window for caregiver time-based access.
 * Story 19D.4: Caregiver Access Window Enforcement
 * Defined here for use in familySchema.
 */
export const accessWindowSchema = z.object({
  dayOfWeek: z.enum(['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']),
  startTime: z.string().regex(/^\d{2}:\d{2}$/), // HH:MM format
  endTime: z.string().regex(/^\d{2}:\d{2}$/), // HH:MM format
  timezone: z.string(), // IANA timezone (e.g., 'America/New_York')
})
export type AccessWindow = z.infer<typeof accessWindowSchema>

/**
 * Caregiver permissions schema.
 * Story 39.2: Caregiver Permission Configuration
 * Defines what actions a caregiver can take beyond viewing status.
 */
export const caregiverPermissionsSchema = z.object({
  /** Story 39.2 AC3: Caregiver can grant extra screen time */
  canExtendTime: z.boolean().default(false),
  /** Story 39.2 AC4: Caregiver can see flagged content */
  canViewFlags: z.boolean().default(false),
})
export type CaregiverPermissions = z.infer<typeof caregiverPermissionsSchema>

/** Default caregiver permissions (most restricted) */
export const DEFAULT_CAREGIVER_PERMISSIONS: CaregiverPermissions = {
  canExtendTime: false,
  canViewFlags: false,
}

/**
 * Caregiver entry in a family document.
 * Story 19D.1: Caregiver Invitation & Onboarding
 * Defined here for use in familySchema.
 */
export const familyCaregiverSchema = z.object({
  uid: z.string(),
  email: z.string().email(),
  displayName: z.string().nullable(),
  role: caregiverRoleSchema,
  /** Story 39.1: Relationship type (grandparent, aunt_uncle, babysitter, other) */
  relationship: caregiverRelationshipSchema,
  /** Story 39.1: Custom relationship text when relationship is 'other' */
  customRelationship: z.string().max(50).optional(),
  /** Story 39.2: Caregiver permissions (defaults to most restricted) */
  permissions: caregiverPermissionsSchema.optional(),
  childIds: z.array(z.string()), // Which children they can view (AC5)
  accessWindows: z.array(accessWindowSchema).optional(), // For Story 19D.4
  addedAt: z.date(),
  addedByUid: z.string(), // Parent who invited
})
export type FamilyCaregiver = z.infer<typeof familyCaregiverSchema>

// ============================================
// Story 39.4: Caregiver PIN for Time Extension
// ============================================

/**
 * PIN security constants.
 * Story 39.4: Caregiver PIN for Time Extension
 */
export const MAX_PIN_ATTEMPTS = 3
export const PIN_LOCKOUT_MINUTES = 15

/**
 * Caregiver PIN configuration schema.
 * Story 39.4: AC1 - PIN setup by parent
 * Stores hashed PIN and lockout information.
 */
export const caregiverPinConfigSchema = z.object({
  /** bcrypt hash of the PIN - never store plain text */
  pinHash: z.string(),
  /** When PIN was set */
  pinSetAt: z.date(),
  /** UID of parent who set the PIN */
  pinSetByUid: z.string(),
  /** Number of failed PIN attempts (resets on success) */
  failedAttempts: z.number().int().min(0).default(0),
  /** Lockout expiry time (set after MAX_PIN_ATTEMPTS failures) */
  lockedUntil: z.date().optional(),
})
export type CaregiverPinConfig = z.infer<typeof caregiverPinConfigSchema>

/**
 * Extension limit configuration schema.
 * Story 39.4: AC3 - Extension limits configurable
 * Defines how much time a caregiver can extend and how often.
 */
export const extensionLimitConfigSchema = z.object({
  /** Maximum extension duration in minutes (30, 60, or 120) */
  maxDurationMinutes: z.union([z.literal(30), z.literal(60), z.literal(120)]).default(30),
  /** Maximum number of extensions per day */
  maxDailyExtensions: z.number().int().min(1).max(5).default(1),
})
export type ExtensionLimitConfig = z.infer<typeof extensionLimitConfigSchema>

/** Default extension limits */
export const DEFAULT_EXTENSION_LIMITS: ExtensionLimitConfig = {
  maxDurationMinutes: 30,
  maxDailyExtensions: 1,
}

/**
 * Caregiver extension log schema.
 * Story 39.4: AC4, AC5 - Extension logging for audit
 * Stored at: /families/{familyId}/caregiverExtensionLogs/{logId}
 */
export const caregiverExtensionLogSchema = z.object({
  /** Unique log identifier */
  id: z.string(),
  /** Family ID */
  familyId: z.string(),
  /** UID of caregiver who granted extension */
  caregiverUid: z.string(),
  /** Display name of caregiver */
  caregiverName: z.string(),
  /** UID of child who received extension */
  childUid: z.string(),
  /** Display name of child */
  childName: z.string(),
  /** Amount of time extended in minutes */
  extensionMinutes: z.number().int().min(1).max(120),
  /** Optional reference to child's extension request */
  requestId: z.string().optional(),
  /** When extension was granted */
  createdAt: z.date(),
})
export type CaregiverExtensionLog = z.infer<typeof caregiverExtensionLogSchema>

/**
 * Set caregiver PIN input schema.
 * Story 39.4: Cloud function input for setting PIN
 */
export const setCaregiverPinInputSchema = z.object({
  /** Family ID */
  familyId: z.string(),
  /** Caregiver UID */
  caregiverUid: z.string(),
  /** PIN (4-6 digits) - will be hashed before storage */
  pin: z.string().regex(/^\d{4,6}$/, 'PIN must be 4-6 digits'),
  /** Optional extension limits to set */
  extensionLimits: extensionLimitConfigSchema.optional(),
})
export type SetCaregiverPinInput = z.infer<typeof setCaregiverPinInputSchema>

/**
 * Approve extension with PIN input schema.
 * Story 39.4: Cloud function input for caregiver extension approval
 */
export const approveExtensionWithPinInputSchema = z.object({
  /** Family ID */
  familyId: z.string(),
  /** Child UID */
  childUid: z.string(),
  /** Caregiver PIN */
  pin: z.string().regex(/^\d{4,6}$/, 'PIN must be 4-6 digits'),
  /** Extension amount in minutes (optional, defaults to max allowed) */
  extensionMinutes: z.number().int().min(1).max(120).optional(),
  /** Optional reference to child's extension request */
  requestId: z.string().optional(),
})
export type ApproveExtensionWithPinInput = z.infer<typeof approveExtensionWithPinInputSchema>

/**
 * Extended family caregiver schema with PIN configuration.
 * Story 39.4: Adds optional PIN config and extension limits to caregiver
 */
export const familyCaregiverWithPinSchema = familyCaregiverSchema.extend({
  /** Story 39.4: PIN configuration (set when canExtendTime is enabled) */
  pinConfig: caregiverPinConfigSchema.optional(),
  /** Story 39.4: Extension limit configuration */
  extensionLimits: extensionLimitConfigSchema.optional(),
})
export type FamilyCaregiverWithPin = z.infer<typeof familyCaregiverWithPinSchema>

// ============================================
// Story 39.5: Caregiver Flag Viewing
// ============================================

/**
 * Caregiver flag view action type.
 * Story 39.5: Tracks what action caregiver took when viewing flag
 */
export const caregiverFlagViewActionSchema = z.enum(['viewed', 'marked_reviewed'])
export type CaregiverFlagViewAction = z.infer<typeof caregiverFlagViewActionSchema>

/**
 * Caregiver flag view log schema.
 * Story 39.5: AC4 - Flag viewing audit log
 * Stored at: /families/{familyId}/caregiverFlagViewLogs/{logId}
 */
export const caregiverFlagViewLogSchema = z.object({
  /** Unique log identifier */
  id: z.string(),
  /** Family ID */
  familyId: z.string(),
  /** UID of caregiver who viewed the flag */
  caregiverUid: z.string(),
  /** Display name of caregiver */
  caregiverName: z.string(),
  /** Flag ID that was viewed */
  flagId: z.string(),
  /** UID of child whose flag was viewed */
  childUid: z.string(),
  /** Display name of child */
  childName: z.string(),
  /** Action taken: viewed or marked_reviewed */
  action: caregiverFlagViewActionSchema,
  /** Flag category for display without re-fetching */
  flagCategory: z.string(),
  /** Flag severity for display without re-fetching */
  flagSeverity: z.string(),
  /** When the view/action occurred */
  createdAt: z.date(),
})
export type CaregiverFlagViewLog = z.infer<typeof caregiverFlagViewLogSchema>

/**
 * Log caregiver flag view input schema.
 * Story 39.5: Cloud function input for logging flag views
 */
export const logCaregiverFlagViewInputSchema = z.object({
  /** Family ID */
  familyId: z.string(),
  /** Flag ID being viewed */
  flagId: z.string(),
  /** Child UID whose flag is being viewed */
  childUid: z.string(),
  /** Action: viewed or marked_reviewed */
  action: caregiverFlagViewActionSchema,
  /** Flag category (for logging without re-fetch) */
  flagCategory: z.string(),
  /** Flag severity (for logging without re-fetch) */
  flagSeverity: z.string(),
})
export type LogCaregiverFlagViewInput = z.infer<typeof logCaregiverFlagViewInputSchema>

/**
 * Mark flag reviewed by caregiver input schema.
 * Story 39.5: Cloud function input for marking flag as reviewed
 */
export const markFlagReviewedByCaregiverInputSchema = z.object({
  /** Family ID */
  familyId: z.string(),
  /** Flag ID to mark as reviewed */
  flagId: z.string(),
  /** Child UID whose flag this is */
  childUid: z.string(),
})
export type MarkFlagReviewedByCaregiverInput = z.infer<
  typeof markFlagReviewedByCaregiverInputSchema
>

// ============================================
// Story 39.6: Caregiver Action Logging
// ============================================

/**
 * Caregiver audit action type.
 * Story 39.6: AC1 - All caregiver actions are logged
 * Includes all trackable caregiver activities
 */
export const caregiverAuditActionSchema = z.enum([
  'permission_change',
  'time_extension',
  'flag_viewed',
  'flag_marked_reviewed',
])
export type CaregiverAuditAction = z.infer<typeof caregiverAuditActionSchema>

/**
 * Caregiver audit log entry schema.
 * Story 39.6: AC1, AC2 - Unified audit log entry for all caregiver actions
 * Stored at: /caregiverAuditLogs/{logId}
 */
export const caregiverAuditLogSchema = z.object({
  /** Unique log identifier */
  id: z.string(),
  /** Family ID */
  familyId: z.string(),
  /** UID of caregiver who performed the action */
  caregiverUid: z.string(),
  /** Display name of caregiver */
  caregiverName: z.string().optional(),
  /** Action type */
  action: caregiverAuditActionSchema,
  /** UID of user who triggered the action (usually caregiver) */
  changedByUid: z.string(),
  /** Action-specific details */
  changes: z.record(z.unknown()),
  /** Child UID if action is child-specific */
  childUid: z.string().optional(),
  /** Child name for display */
  childName: z.string().optional(),
  /** When the action occurred */
  createdAt: z.date(),
})
export type CaregiverAuditLog = z.infer<typeof caregiverAuditLogSchema>

/**
 * Caregiver action counts for summary display.
 * Story 39.6: AC3 - Summary shows counts per action type
 */
export const caregiverActionCountsSchema = z.object({
  /** Number of time extensions granted */
  time_extension: z.number().default(0),
  /** Number of flags viewed */
  flag_viewed: z.number().default(0),
  /** Number of flags marked as reviewed */
  flag_marked_reviewed: z.number().default(0),
  /** Number of permission changes */
  permission_change: z.number().default(0),
})
export type CaregiverActionCounts = z.infer<typeof caregiverActionCountsSchema>

/**
 * Caregiver activity summary schema.
 * Story 39.6: AC3 - Summary display for parent dashboard
 * Format: "Grandma: 2 time extensions, 1 flag viewed"
 */
export const caregiverActivitySummarySchema = z.object({
  /** Caregiver UID */
  caregiverUid: z.string(),
  /** Caregiver display name */
  caregiverName: z.string(),
  /** Count of each action type */
  actionCounts: caregiverActionCountsSchema,
  /** When caregiver was last active */
  lastActiveAt: z.date(),
  /** Total number of actions */
  totalActions: z.number(),
})
export type CaregiverActivitySummary = z.infer<typeof caregiverActivitySummarySchema>

/**
 * Child notification type for caregiver removal.
 * Story 39.7: Caregiver Removal - AC3
 */
export const childNotificationTypeSchema = z.enum(['caregiver_removed'])
export type ChildNotificationType = z.infer<typeof childNotificationTypeSchema>

/**
 * Child notification schema.
 * Story 39.7: Caregiver Removal - AC3
 *
 * Stored at families/{familyId}/childNotifications/{notificationId}
 */
export const childNotificationSchema = z.object({
  /** Notification ID */
  id: z.string(),
  /** Notification type */
  type: childNotificationTypeSchema,
  /** Which children should see this notification */
  childUids: z.array(z.string()),
  /** Display message (child-friendly) */
  message: z.string(),
  /** Caregiver name for caregiver_removed type */
  caregiverName: z.string().optional(),
  /** When notification was created */
  createdAt: z.date(),
  /** UIDs of children who have read the notification */
  readBy: z.array(z.string()).default([]),
})
export type ChildNotification = z.infer<typeof childNotificationSchema>

/**
 * Input for removing a caregiver with optional reason and child notification.
 * Story 39.7: Caregiver Removal - AC1, AC3, AC6
 */
export const removeCaregiverWithNotificationInputSchema = z.object({
  /** Family ID */
  familyId: z.string(),
  /** Caregiver UID to remove */
  caregiverUid: z.string(),
  /** Caregiver email (for invitation cleanup) */
  caregiverEmail: z.string().email(),
  /** Optional reason for removal (stored in audit log, not shared) */
  reason: z.string().max(500).optional(),
})
export type RemoveCaregiverWithNotificationInput = z.infer<
  typeof removeCaregiverWithNotificationInputSchema
>

export const familySchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(100),
  guardians: z.array(familyGuardianSchema).min(1),
  /** Array of guardian UIDs for efficient Firestore security rule checks */
  guardianUids: z.array(z.string()).min(1),
  /** Story 19D.1: Caregivers with limited access (e.g., grandparents) */
  caregivers: z.array(familyCaregiverSchema).optional(),
  /** Array of caregiver UIDs for efficient Firestore security rule checks */
  caregiverUids: z.array(z.string()).optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
  /** Story 8.5.1: Show demo profile for families with no children. Defaults to true for new families. */
  showDemoProfile: z.boolean().default(true),
  /** Story 8.5.5: Whether demo has been archived (real child added). Defaults to false for new families. */
  demoArchived: z.boolean().default(false).optional(),
})
export type Family = z.infer<typeof familySchema>

/**
 * Guardian entry in a child document.
 * Links a guardian (parent) to a specific child with their role.
 */
export const childGuardianSchema = z.object({
  uid: z.string(),
  role: guardianRoleSchema,
  addedAt: z.date(),
})
export type ChildGuardian = z.infer<typeof childGuardianSchema>

/**
 * Custody type for a child.
 * - sole: One parent has full custody
 * - shared: Both parents share custody (triggers Epic 3A safeguards)
 * - complex: Blended family or other arrangements (requires explanation)
 */
export const custodyTypeSchema = z.enum(['sole', 'shared', 'complex'])
export type CustodyType = z.infer<typeof custodyTypeSchema>

/**
 * Custody arrangement declaration.
 * Stored on child document to indicate custody situation.
 */
export const custodyArrangementSchema = z
  .object({
    type: custodyTypeSchema,
    explanation: z.string().max(1000).nullable(), // Required for 'complex' type
    declaredBy: z.string(), // UID of guardian who declared
    declaredAt: z.date(),
    updatedAt: z.date().nullable(), // Set on updates
    updatedBy: z.string().nullable(), // UID of guardian who updated
  })
  .refine(
    (data) => {
      // If type is complex, explanation must be non-null and non-empty
      if (data.type === 'complex') {
        return data.explanation !== null && data.explanation.trim().length > 0
      }
      return true
    },
    {
      message: 'Explanation is required for complex custody arrangements',
      path: ['explanation'],
    }
  )
export type CustodyArrangement = z.infer<typeof custodyArrangementSchema>

/**
 * Child profile schema.
 *
 * Represents a child stored in Firestore at /children/{childId}.
 * Children are linked to families via familyId and have guardians assigned.
 */
export const childProfileSchema = z.object({
  id: z.string(),
  familyId: z.string(),
  name: z.string().min(1).max(100),
  birthdate: z.date(),
  photoURL: z.string().url().nullable(),
  guardians: z.array(childGuardianSchema).min(1),
  /** Array of guardian UIDs for efficient Firestore security rule checks */
  guardianUids: z.array(z.string()).min(1),
  custody: custodyArrangementSchema.nullable(), // Optional custody declaration
  createdAt: z.date(),
  updatedAt: z.date(),
})
export type ChildProfile = z.infer<typeof childProfileSchema>

/**
 * Invitation status for co-parent invitations.
 * - pending: Invitation sent, awaiting acceptance
 * - accepted: Co-parent accepted the invitation
 * - expired: Invitation exceeded its expiry period
 * - revoked: Inviting parent canceled the invitation
 */
export const invitationStatusSchema = z.enum(['pending', 'accepted', 'expired', 'revoked'])
export type InvitationStatus = z.infer<typeof invitationStatusSchema>

/**
 * Co-parent invitation schema.
 *
 * Represents an invitation stored in Firestore at /invitations/{invitationId}.
 * Invitations allow guardians to invite co-parents to join their family.
 *
 * Note: For MVP, invitations are BLOCKED by checkEpic3ASafeguards() until
 * Epic 3A (Shared Custody Safeguards) is complete.
 */
export const invitationSchema = z.object({
  id: z.string(),
  familyId: z.string(),
  inviterUid: z.string(),
  inviterName: z.string(),
  familyName: z.string(),
  token: z.string(), // Secure UUID token for invitation link
  status: invitationStatusSchema,
  recipientEmail: z.string().email().nullable(), // Email address invitation was sent to (Story 3.2)
  emailSentAt: z.date().nullable(), // When invitation email was sent (Story 3.2)
  acceptedAt: z.date().nullable(), // When invitation was accepted (Story 3.3)
  acceptedByUid: z.string().nullable(), // UID of user who accepted (Story 3.3)
  expiresAt: z.date(),
  createdAt: z.date(),
  updatedAt: z.date(),
})
export type Invitation = z.infer<typeof invitationSchema>

/**
 * Schema for sending an invitation email.
 * Used to validate input to the sendInvitation Cloud Function.
 */
export const sendInvitationEmailSchema = z.object({
  invitationId: z.string(),
  recipientEmail: z.string().email(),
})
export type SendInvitationEmailInput = z.infer<typeof sendInvitationEmailSchema>

/**
 * Schema for accepting an invitation.
 * Used to validate input to the acceptInvitation Cloud Function.
 */
export const acceptInvitationInputSchema = z.object({
  token: z.string().min(1),
})
export type AcceptInvitationInput = z.infer<typeof acceptInvitationInputSchema>

// ============================================
// Caregiver Invitation Schemas - Story 19D.1
// (Note: caregiverRoleSchema, accessWindowSchema, familyCaregiverSchema
//  are defined earlier near familySchema)
// ============================================

/**
 * Caregiver invitation status.
 * Story 19D.1: Caregiver Invitation & Onboarding - AC6
 */
export const caregiverInvitationStatusSchema = z.enum(['pending', 'accepted', 'expired', 'revoked'])
export type CaregiverInvitationStatus = z.infer<typeof caregiverInvitationStatusSchema>

/**
 * Caregiver invitation schema.
 * Story 19D.1: Caregiver Invitation & Onboarding
 *
 * Represents an invitation stored in Firestore at /caregiverInvitations/{invitationId}.
 * Similar to co-parent invitations but for limited-access caregivers.
 */
export const caregiverInvitationSchema = z.object({
  id: z.string(),
  familyId: z.string(),
  inviterUid: z.string(),
  inviterName: z.string(),
  familyName: z.string(),
  token: z.string(), // Secure UUID token for invitation link
  status: caregiverInvitationStatusSchema,
  recipientEmail: z.string().email(),
  caregiverRole: caregiverRoleSchema,
  /** Story 39.1: Relationship type (grandparent, aunt_uncle, babysitter, other) */
  relationship: caregiverRelationshipSchema,
  /** Story 39.1: Custom relationship text when relationship is 'other' */
  customRelationship: z.string().max(50).optional(),
  childIds: z.array(z.string()), // Which children caregiver will see (AC5)
  emailSentAt: z.date().nullable(),
  acceptedAt: z.date().nullable(),
  acceptedByUid: z.string().nullable(),
  expiresAt: z.date(), // 7 days from creation (AC6)
  createdAt: z.date(),
  updatedAt: z.date(),
})
export type CaregiverInvitation = z.infer<typeof caregiverInvitationSchema>

/**
 * Input for sending a caregiver invitation.
 * Story 19D.1: Caregiver Invitation & Onboarding - AC1
 */
export const sendCaregiverInvitationInputSchema = z.object({
  familyId: z.string(),
  recipientEmail: z.string().email(),
  childIds: z.array(z.string()).min(1), // At least one child (AC5)
  /** Story 39.1: Relationship type (grandparent, aunt_uncle, babysitter, other) */
  relationship: caregiverRelationshipSchema,
  /** Story 39.1: Custom relationship text when relationship is 'other' */
  customRelationship: z.string().max(50).optional(),
})
export type SendCaregiverInvitationInput = z.infer<typeof sendCaregiverInvitationInputSchema>

/**
 * Input for accepting a caregiver invitation.
 * Story 19D.1: Caregiver Invitation & Onboarding - AC3
 */
export const acceptCaregiverInvitationInputSchema = z.object({
  token: z.string().min(1),
})
export type AcceptCaregiverInvitationInput = z.infer<typeof acceptCaregiverInvitationInputSchema>

/**
 * Result from accepting a caregiver invitation.
 * Story 19D.1: Caregiver Invitation & Onboarding - AC4
 */
export const acceptCaregiverInvitationResultSchema = z.object({
  success: z.boolean(),
  familyId: z.string(),
  familyName: z.string(),
  childNames: z.array(z.string()), // Names of children caregiver can view
  role: caregiverRoleSchema,
})
export type AcceptCaregiverInvitationResult = z.infer<typeof acceptCaregiverInvitationResultSchema>

// ============================================
// Temporary Caregiver Access Schemas - Story 39.3
// ============================================

/**
 * Temporary access preset options.
 * Story 39.3: Temporary Caregiver Access - AC2
 * Defines preset duration options for quick selection.
 */
export const temporaryAccessPresetSchema = z.enum(['today_only', 'this_weekend', 'custom'])
export type TemporaryAccessPreset = z.infer<typeof temporaryAccessPresetSchema>

/**
 * Temporary access grant status.
 * Story 39.3: Temporary Caregiver Access - AC3
 */
export const temporaryAccessStatusSchema = z.enum(['pending', 'active', 'expired', 'revoked'])
export type TemporaryAccessStatus = z.infer<typeof temporaryAccessStatusSchema>

/**
 * Temporary access grant schema.
 * Story 39.3: Temporary Caregiver Access
 *
 * Represents a one-time temporary access grant for a caregiver.
 * Stored in Firestore at /families/{familyId}/temporaryAccessGrants/{grantId}.
 */
export const temporaryAccessGrantSchema = z.object({
  id: z.string(),
  familyId: z.string(),
  caregiverUid: z.string(),
  grantedByUid: z.string(),
  /** Story 39.3 AC1: Start time of the temporary access */
  startAt: z.date(),
  /** Story 39.3 AC1: End time of the temporary access */
  endAt: z.date(),
  /** Story 39.3 AC2: Which preset was used */
  preset: temporaryAccessPresetSchema,
  /** Story 39.3 AC1: IANA timezone for the grant */
  timezone: z.string(),
  /** Story 39.3 AC3: Current status of the grant */
  status: temporaryAccessStatusSchema,
  /** Story 39.3 AC5: When access was revoked early (optional) */
  revokedAt: z.date().optional(),
  /** Story 39.3 AC5: Who revoked the access (optional) */
  revokedByUid: z.string().optional(),
  /** Story 39.3 AC5: Reason for early revocation (optional) */
  revokedReason: z.string().max(200).optional(),
  createdAt: z.date(),
})
export type TemporaryAccessGrant = z.infer<typeof temporaryAccessGrantSchema>

/**
 * Duration constraints for temporary access.
 * Story 39.3: Temporary Caregiver Access - AC1
 */
export const MIN_TEMP_ACCESS_DURATION_HOURS = 1
export const MAX_TEMP_ACCESS_DURATION_DAYS = 7

/**
 * Input for granting temporary access.
 * Story 39.3: Temporary Caregiver Access - AC1, AC2
 */
export const grantTemporaryAccessInputSchema = z.object({
  familyId: z.string(),
  caregiverUid: z.string(),
  preset: temporaryAccessPresetSchema,
  /** Custom start time (required for 'custom' preset) */
  startAt: z.date().optional(),
  /** Custom end time (required for 'custom' preset) */
  endAt: z.date().optional(),
  timezone: z.string(),
})
export type GrantTemporaryAccessInput = z.infer<typeof grantTemporaryAccessInputSchema>

/**
 * Input for revoking temporary access.
 * Story 39.3: Temporary Caregiver Access - AC5
 */
export const revokeTemporaryAccessInputSchema = z.object({
  familyId: z.string(),
  grantId: z.string(),
  reason: z.string().max(200).optional(),
})
export type RevokeTemporaryAccessInput = z.infer<typeof revokeTemporaryAccessInputSchema>

/**
 * Check if a temporary access grant is currently active.
 * Story 39.3: Temporary Caregiver Access - AC3
 */
export function isTemporaryAccessActive(grant: TemporaryAccessGrant): boolean {
  if (grant.status !== 'active') return false
  const now = new Date()
  return now >= grant.startAt && now <= grant.endAt
}

/**
 * Check if a temporary access grant is pending (not yet started).
 * Story 39.3: Temporary Caregiver Access - AC3
 */
export function isTemporaryAccessPending(grant: TemporaryAccessGrant): boolean {
  if (grant.status !== 'pending') return false
  const now = new Date()
  return now < grant.startAt
}

/**
 * Calculate time remaining for an active temporary access grant.
 * Story 39.3: Temporary Caregiver Access - AC4
 * Returns null if grant is not active.
 */
export function getTemporaryAccessTimeRemaining(grant: TemporaryAccessGrant): number | null {
  if (!isTemporaryAccessActive(grant)) return null
  const now = new Date()
  return grant.endAt.getTime() - now.getTime()
}

/**
 * Format temporary access duration for display.
 * Story 39.3: Temporary Caregiver Access - AC1
 */
export function formatTemporaryAccessDuration(startAt: Date, endAt: Date): string {
  const durationMs = endAt.getTime() - startAt.getTime()
  const hours = Math.floor(durationMs / (1000 * 60 * 60))
  const days = Math.floor(hours / 24)

  if (days >= 1) {
    const remainingHours = hours % 24
    if (remainingHours === 0) {
      return days === 1 ? '1 day' : `${days} days`
    }
    return days === 1 ? `1 day ${remainingHours}h` : `${days} days ${remainingHours}h`
  }
  return hours === 1 ? '1 hour' : `${hours} hours`
}

/**
 * Data view type for audit logging.
 * Tracks what type of data was viewed by a guardian.
 *
 * Story 3A.1: Data Symmetry Enforcement - AC3
 */
export const dataViewTypeSchema = z.enum([
  'children_list',
  'child_profile',
  'screenshots',
  'activity',
  'agreements',
  'flags',
  'devices', // Story 19.8: Dashboard view logging for device list
  'device_detail', // Story 19.8: Individual device detail view
  'child_own_screenshot', // Story 19B.6: Child viewing their own screenshot (bilateral transparency)
  'caregiver_status', // Story 19D.3: Caregiver viewing child's screen time status
  'caregiver_revoked', // Story 19D.5: Parent revoked caregiver access
])
export type DataViewType = z.infer<typeof dataViewTypeSchema>

/**
 * Data view audit log schema.
 *
 * Records when a guardian views child or family data.
 * Stored in Firestore at /auditLogs/{logId}.
 *
 * Story 3A.1: Data Symmetry Enforcement - AC3
 * Used for Story 3A.5: Screenshot Viewing Rate Alert
 */
export const dataViewAuditSchema = z.object({
  id: z.string(),
  viewerUid: z.string(),
  childId: z.string().nullable(), // null for family-level views
  familyId: z.string(),
  dataType: dataViewTypeSchema,
  viewedAt: z.date(),
  sessionId: z.string().nullable(), // Optional session correlation
})
export type DataViewAudit = z.infer<typeof dataViewAuditSchema>

// ============================================================================
// Story 27.1: Comprehensive Audit Event Capture
// ============================================================================

/**
 * Access type for audit logging.
 *
 * Story 27.1: Audit Event Capture - AC2
 * Records what type of action was performed on the resource.
 */
export const accessTypeSchema = z.enum(['view', 'download', 'export', 'modify'])
export type AccessType = z.infer<typeof accessTypeSchema>

/**
 * Actor type for audit logging.
 *
 * Story 27.1: Audit Event Capture - AC1
 * Identifies the type of user performing the action.
 */
export const actorTypeSchema = z.enum(['guardian', 'child', 'caregiver', 'admin', 'system'])
export type ActorType = z.infer<typeof actorTypeSchema>

/**
 * Comprehensive resource type for audit logging.
 *
 * Story 27.1: Audit Event Capture - AC1
 * Extends dataViewType with additional resource types for full coverage.
 */
export const auditResourceTypeSchema = z.enum([
  // Existing view types
  'children_list',
  'child_profile',
  'screenshots',
  'screenshot_detail', // Individual screenshot view
  'activity',
  'agreements',
  'flags',
  'flag_detail', // Individual flag view
  'devices',
  'device_detail',
  'child_own_screenshot',
  'caregiver_status',
  // Download/export types
  'screenshot_download',
  'audit_export',
  'data_export',
  // Modify types
  'settings_modify',
  'profile_modify',
  'flag_action', // dismiss, escalate, etc.
  'agreement_modify',
  // Dashboard access
  'dashboard_access',
  'audit_log_view',
])
export type AuditResourceType = z.infer<typeof auditResourceTypeSchema>

/**
 * Comprehensive audit event schema.
 *
 * Story 27.1: Audit Event Capture - AC1, AC2, AC3
 * Stored in Firestore at /auditEvents/{eventId}
 *
 * Key features:
 * - Captures all data access events with full context
 * - Includes device/session information for forensics
 * - Append-only collection (no updates/deletes allowed)
 * - 2-year retention per NFR58
 *
 * FRs: FR32, FR53
 * NFRs: NFR58, NFR82
 */
export const auditEventSchema = z.object({
  id: z.string(),
  // Who performed the action
  actorUid: z.string(),
  actorType: actorTypeSchema,
  actorEmail: z.string().nullable(), // For display purposes
  // What action was performed
  accessType: accessTypeSchema,
  resourceType: auditResourceTypeSchema,
  resourceId: z.string().nullable(), // Specific resource ID (screenshot, flag, etc.)
  // Where (family/child context)
  familyId: z.string(),
  childId: z.string().nullable(), // null for family-level access
  // Device/session context (AC3)
  deviceId: z.string().nullable(),
  sessionId: z.string().nullable(),
  userAgent: z.string().nullable(),
  ipAddressHash: z.string().nullable(), // Hashed for privacy (NFR82)
  // When
  timestamp: z.number(), // epoch ms
  // Additional metadata
  metadata: z.record(z.unknown()).optional(),
})
export type AuditEvent = z.infer<typeof auditEventSchema>

/**
 * Dead-letter queue entry for failed audit writes.
 *
 * Story 27.1: Audit Event Capture - AC5
 * Stores failed audit events for retry processing.
 */
export const auditFailureSchema = z.object({
  id: z.string(),
  event: auditEventSchema,
  errorMessage: z.string(),
  attempts: z.number(),
  failedAt: z.number(), // epoch ms
  lastAttemptAt: z.number().optional(),
  status: z.enum(['pending', 'retrying', 'resolved', 'abandoned']),
  resolvedAt: z.number().optional(),
})
export type AuditFailure = z.infer<typeof auditFailureSchema>

/**
 * Input schema for creating audit events.
 *
 * Story 27.1: Audit Event Capture
 * Used by client-side and server-side audit services.
 */
export const createAuditEventInputSchema = auditEventSchema.omit({ id: true, timestamp: true })
export type CreateAuditEventInput = z.infer<typeof createAuditEventInputSchema>

/**
 * Guardian view count in pattern analysis.
 *
 * Story 27.4: Asymmetric Viewing Pattern Detection
 */
export const guardianViewCountSchema = z.object({
  guardianUid: z.string(),
  guardianDisplayName: z.string().nullable(),
  viewCount: z.number(),
})
export type GuardianViewCount = z.infer<typeof guardianViewCountSchema>

/**
 * Viewing pattern analysis result.
 *
 * Story 27.4: Asymmetric Viewing Pattern Detection - AC1, AC2
 * Stores weekly pattern analysis for families with multiple guardians.
 */
export const viewingPatternAnalysisSchema = z.object({
  id: z.string(),
  familyId: z.string(),
  periodStart: z.number(), // epoch ms
  periodEnd: z.number(), // epoch ms
  guardianViews: z.array(guardianViewCountSchema),
  totalViews: z.number(),
  asymmetryRatio: z.number(), // highest/lowest ratio (NaN if only one guardian)
  isAsymmetric: z.boolean(), // true if ratio >= 10
  analysisTimestamp: z.number(), // epoch ms
})
export type ViewingPatternAnalysis = z.infer<typeof viewingPatternAnalysisSchema>

/**
 * Pattern alert sent to under-viewing guardian.
 *
 * Story 27.4: Asymmetric Viewing Pattern Detection - AC3, AC4
 */
export const patternAlertSchema = z.object({
  id: z.string(),
  familyId: z.string(),
  analysisId: z.string(), // Reference to ViewingPatternAnalysis
  recipientUid: z.string(), // Under-viewing guardian
  highActivityGuardianUid: z.string(),
  highActivityCount: z.number(),
  recipientCount: z.number(),
  message: z.string(), // Non-accusatory message
  sentAt: z.number(), // epoch ms
  readAt: z.number().nullable(),
})
export type PatternAlert = z.infer<typeof patternAlertSchema>

/**
 * Safety setting types that require two-parent approval.
 *
 * Story 3A.2: Safety Settings Two-Parent Approval
 * These settings affect child protection and require both guardians to agree.
 */
export const safetySettingTypeSchema = z.enum([
  'monitoring_interval', // Screenshot capture frequency
  'retention_period', // How long screenshots are kept
  'time_limits', // Daily screen time limits
  'age_restrictions', // Age-based content restrictions
])
export type SafetySettingType = z.infer<typeof safetySettingTypeSchema>

/**
 * Status of a safety setting change proposal.
 *
 * Story 3A.2: Safety Settings Two-Parent Approval - AC1
 * Story 3A.4: Safety Rule 48-Hour Cooling Period - AC1, AC3, AC6
 */
export const settingChangeStatusSchema = z.enum([
  'pending_approval', // Awaiting other guardian's approval
  'approved', // Change approved and applied (immediate for increases)
  'declined', // Change rejected by other guardian
  'expired', // 72-hour approval window passed
  'cooling_period', // 48-hour waiting period for protection reductions
  'activated', // Change has taken effect after cooling period
  'cancelled', // Cancelled during cooling period
])
export type SettingChangeStatus = z.infer<typeof settingChangeStatusSchema>

/**
 * Safety setting change proposal schema.
 *
 * Represents a proposed safety setting change stored in Firestore at /safetySettingChanges/{changeId}.
 * In shared custody families, safety changes require both parents to approve.
 *
 * Story 3A.2: Safety Settings Two-Parent Approval
 * Story 3A.4: Safety Rule 48-Hour Cooling Period
 */
export const safetySettingChangeSchema = z.object({
  id: z.string(),
  familyId: z.string(),
  settingType: safetySettingTypeSchema,
  currentValue: z.unknown(), // JSON value - type varies by setting
  proposedValue: z.unknown(), // JSON value - type varies by setting
  proposedByUid: z.string(), // UID of guardian proposing the change
  approverUid: z.string().nullable(), // UID of other guardian (null until resolved)
  status: settingChangeStatusSchema,
  declineReason: z.string().nullable(), // Optional message when declined
  isEmergencyIncrease: z.boolean(), // True if more restrictive (takes effect immediately)
  reviewExpiresAt: z.date().nullable(), // 48-hour review for emergency increases
  createdAt: z.date(),
  expiresAt: z.date(), // 72 hours from creation
  resolvedAt: z.date().nullable(), // When approved/declined/expired
  effectiveAt: z.date().nullable(), // Story 3A.4: When change takes effect after cooling period
  cancelledByUid: z.string().nullable(), // Story 3A.4: UID of guardian who cancelled during cooling
})
export type SafetySettingChange = z.infer<typeof safetySettingChangeSchema>

/**
 * Age groups for agreement templates.
 *
 * Story 4.1: Template Library Structure - AC1
 * Templates are organized by developmental age groups.
 */
export const ageGroupSchema = z.enum(['5-7', '8-10', '11-13', '14-16'])
export type AgeGroup = z.infer<typeof ageGroupSchema>

/**
 * Template variation types.
 *
 * Story 4.1: Template Library Structure - AC2
 * Each age group has 2-3 variations with different monitoring philosophies.
 */
export const templateVariationSchema = z.enum(['strict', 'balanced', 'permissive'])
export type TemplateVariation = z.infer<typeof templateVariationSchema>

/**
 * Template category types for filtering.
 *
 * Story 4.1: Template Library Structure - AC4
 * Templates can be filtered by specific concerns.
 */
export const templateCategorySchema = z.enum(['gaming', 'social_media', 'homework', 'general'])
export type TemplateCategory = z.infer<typeof templateCategorySchema>

/**
 * Monitoring level for templates.
 *
 * Story 4.1: Template Library Structure - AC3
 * Indicates the intensity of monitoring for a template.
 */
export const monitoringLevelSchema = z.enum(['high', 'medium', 'low'])
export type MonitoringLevel = z.infer<typeof monitoringLevelSchema>

/**
 * Screen time limits configuration.
 *
 * Story 4.1: Template Library Structure - AC3
 * Defines daily screen time limits in minutes.
 */
export const screenTimeLimitsSchema = z.object({
  weekday: z.number().min(0).max(480), // minutes (0-8 hours)
  weekend: z.number().min(0).max(480), // minutes (0-8 hours)
})
export type ScreenTimeLimits = z.infer<typeof screenTimeLimitsSchema>

/**
 * Autonomy milestone for teen templates.
 *
 * Story 4.2: Age-Appropriate Template Content - AC5
 * Defines earned autonomy progression for 14-16 age group.
 */
export const autonomyMilestoneSchema = z.object({
  milestone: z.string().min(1).max(100),
  reward: z.string().min(1).max(200),
  description: z.string().max(300).optional(),
})
export type AutonomyMilestone = z.infer<typeof autonomyMilestoneSchema>

/**
 * Simple rule format for young children.
 *
 * Story 4.2: Age-Appropriate Template Content - AC6
 * Simple yes/no rules for 5-7 age group.
 */
export const simpleRuleSchema = z.object({
  text: z.string().min(1).max(100),
  isAllowed: z.boolean(), // true = "You CAN", false = "Not yet"
})
export type SimpleRule = z.infer<typeof simpleRuleSchema>

/**
 * Agreement template schema.
 *
 * Represents a pre-built agreement template for families.
 * Templates are organized by age group and variation.
 *
 * Story 4.1: Template Library Structure - AC1, AC2, AC3
 * Story 4.2: Age-Appropriate Template Content - AC4, AC5, AC6
 */
export const agreementTemplateSchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(100),
  description: z.string().max(500),
  ageGroup: ageGroupSchema,
  variation: templateVariationSchema,
  categories: z.array(templateCategorySchema).min(1),
  screenTimeLimits: screenTimeLimitsSchema,
  monitoringLevel: monitoringLevelSchema,
  keyRules: z.array(z.string()).min(1).max(10),
  createdAt: z.date(),
  // Story 4.2: Age-appropriate content additions
  autonomyMilestones: z.array(autonomyMilestoneSchema).optional(), // For 14-16 age group
  simpleRules: z.array(simpleRuleSchema).optional(), // For 5-7 age group
  ruleExamples: z.record(z.string(), z.string()).optional(), // ruleIndex -> age-relevant example
})
export type AgreementTemplate = z.infer<typeof agreementTemplateSchema>

/**
 * Co-creation session status.
 *
 * Story 5.1: Co-Creation Session Initiation - AC2
 * Tracks the lifecycle of an agreement co-creation session.
 */
export const sessionStatusSchema = z.enum(['draft', 'active', 'paused', 'completed'])
export type SessionStatus = z.infer<typeof sessionStatusSchema>

/**
 * Party type for contribution attribution.
 *
 * Story 5.1: Co-Creation Session Initiation - AC3
 * Identifies whether a contribution was made by parent or child.
 */
export const contributionPartySchema = z.enum(['parent', 'child'])
export type ContributionParty = z.infer<typeof contributionPartySchema>

/**
 * Contribution type for session actions.
 *
 * Story 5.1: Co-Creation Session Initiation - AC3
 * Categorizes the type of contribution made during co-creation.
 */
export const contributionTypeSchema = z.enum([
  'add_term',
  'modify_term',
  'remove_term',
  'comment',
  'reaction',
  'agree',
  'question',
])
export type ContributionType = z.infer<typeof contributionTypeSchema>

/**
 * Individual contribution in a co-creation session.
 *
 * Story 5.1: Co-Creation Session Initiation - AC3
 * Records a single action by parent or child during agreement creation.
 */
export const contributionSchema = z.object({
  id: z.string(),
  party: contributionPartySchema,
  type: contributionTypeSchema,
  content: z.unknown(), // Flexible content structure based on type
  targetTermId: z.string().nullable(), // Reference to affected term
  timestamp: z.date(),
})
export type Contribution = z.infer<typeof contributionSchema>

/**
 * Co-creation session schema.
 *
 * Represents an active or completed agreement co-creation session.
 * Stored in Firestore at /coCreationSessions/{sessionId}.
 *
 * Story 5.1: Co-Creation Session Initiation - AC1, AC2, AC3, AC4, AC6
 */
export const coCreationSessionSchema = z.object({
  id: z.string(),
  familyId: z.string(),
  childId: z.string(),
  agreementDraftId: z.string().nullable(), // Reference to draft from Epic 4
  templateId: z.string().nullable(), // Reference to template used
  mode: z.enum(['agreement_only', 'full_monitoring']).default('full_monitoring'), // Story 5.6: Agreement mode
  status: sessionStatusSchema,
  contributions: z.array(contributionSchema),
  createdAt: z.date(),
  updatedAt: z.date(),
  pausedAt: z.date().nullable(),
  completedAt: z.date().nullable(),
  lastActivityAt: z.date(),
  createdByUid: z.string(), // Parent who initiated the session
})
export type CoCreationSession = z.infer<typeof coCreationSessionSchema>

/**
 * Agreement term category.
 *
 * Story 5.2: Visual Agreement Builder - AC5
 * Categories for color-coding agreement terms.
 */
export const termCategorySchema = z.enum(['time', 'apps', 'monitoring', 'rewards', 'general'])
export type TermCategory = z.infer<typeof termCategorySchema>

/**
 * Agreement term schema.
 *
 * Story 5.2: Visual Agreement Builder - AC1, AC3, AC4, AC5, AC6
 * Represents a single term/condition in an agreement.
 * Maximum 100 terms per agreement (NFR60).
 */
export const agreementTermSchema = z.object({
  id: z.string(),
  text: z.string().min(1).max(500),
  category: termCategorySchema,
  party: contributionPartySchema, // Who suggested this term
  order: z.number().int().min(0), // Display order
  explanation: z.string().max(300), // Child-friendly explanation (6th-grade level)
  createdAt: z.date(),
  updatedAt: z.date(),
})
export type AgreementTerm = z.infer<typeof agreementTermSchema>

/**
 * Maximum terms allowed per agreement.
 *
 * Story 5.2: Visual Agreement Builder - AC6
 * NFR60: Maximum 100 conditions per agreement.
 */
export const MAX_AGREEMENT_TERMS = 100

/**
 * Term reaction types.
 *
 * Story 5.3: Child Contribution Capture - AC2, AC4
 * Reactions that children (or parents) can add to terms.
 */
export const termReactionTypeSchema = z.enum(['agree', 'question', 'discuss', 'love', 'think'])
export type TermReactionType = z.infer<typeof termReactionTypeSchema>

/**
 * Term reaction schema.
 *
 * Story 5.3: Child Contribution Capture - AC2
 * Records a reaction to a term by a party.
 */
export const termReactionSchema = z.object({
  id: z.string(),
  termId: z.string(),
  party: contributionPartySchema,
  type: termReactionTypeSchema,
  emoji: z.string().max(4).nullable(), // Optional custom emoji
  createdAt: z.date(),
})
export type TermReaction = z.infer<typeof termReactionSchema>

/**
 * Discussion status for agreement terms.
 *
 * Story 5.4: Negotiation & Discussion Support - AC1, AC4
 * Tracks whether a term needs discussion or has been resolved.
 */
export const discussionStatusSchema = z.enum(['none', 'needs_discussion', 'resolved'])
export type DiscussionStatus = z.infer<typeof discussionStatusSchema>

/**
 * Discussion note schema.
 *
 * Story 5.4: Negotiation & Discussion Support - AC3
 * Records a note added during term discussion.
 * Maximum 500 characters per note.
 */
export const discussionNoteSchema = z.object({
  id: z.string(),
  party: contributionPartySchema,
  content: z.string().min(1).max(500),
  createdAt: z.date(),
})
export type DiscussionNote = z.infer<typeof discussionNoteSchema>

/**
 * Discussion resolution record.
 *
 * Story 5.4: Negotiation & Discussion Support - AC4
 * Records when and how a discussion was resolved.
 */
export const discussionResolutionSchema = z.object({
  resolvedAt: z.date(),
  resolvedBy: contributionPartySchema, // Who marked it resolved
  finalValue: z.string().max(500).nullable(), // The agreed-upon value/compromise
  summary: z.string().max(300).nullable(), // Brief summary of resolution
})
export type DiscussionResolution = z.infer<typeof discussionResolutionSchema>

/**
 * Extended agreement term schema with discussion support.
 *
 * Story 5.4: Negotiation & Discussion Support - AC1, AC3, AC4
 * Adds discussion status, notes, and resolution to agreement terms.
 */
export const agreementTermWithDiscussionSchema = agreementTermSchema.extend({
  discussionStatus: discussionStatusSchema.default('none'),
  discussionNotes: z.array(discussionNoteSchema).default([]),
  resolution: discussionResolutionSchema.nullable().default(null),
})
export type AgreementTermWithDiscussion = z.infer<typeof agreementTermWithDiscussionSchema>

/**
 * Agreement mode types.
 *
 * Story 5.6: Agreement-Only Mode Selection - AC1, AC2
 * Defines whether an agreement includes device monitoring.
 * - agreement_only: Digital expectations without device surveillance
 * - full_monitoring: Complete protection with device tracking and screenshots
 */
export const agreementModeSchema = z.enum(['agreement_only', 'full_monitoring'])
export type AgreementMode = z.infer<typeof agreementModeSchema>

/**
 * Term categories available for each agreement mode.
 *
 * Story 5.6: Agreement-Only Mode Selection - AC2, AC3
 * Maps agreement modes to their available term categories.
 */
export const AGREEMENT_MODE_CATEGORIES: Record<AgreementMode, TermCategory[]> = {
  agreement_only: ['time', 'apps', 'rewards', 'general'],
  full_monitoring: ['time', 'apps', 'monitoring', 'rewards', 'general'],
}

/**
 * Version type for agreement drafts.
 *
 * Story 5.7: Draft Saving & Version History - AC3
 * Categorizes what type of milestone created this version.
 */
export const versionTypeSchema = z.enum([
  'initial_draft',
  'child_additions',
  'negotiation_complete',
  'manual_save',
  'auto_save',
])
export type VersionType = z.infer<typeof versionTypeSchema>

/**
 * Agreement version schema.
 *
 * Story 5.7: Draft Saving & Version History - AC3, AC4
 * Represents a snapshot of the agreement at a point in time.
 */
export const agreementVersionSchema = z.object({
  id: z.string(),
  sessionId: z.string(),
  type: versionTypeSchema,
  description: z.string().max(200),
  termsSnapshot: z.array(agreementTermSchema),
  createdAt: z.date(),
  createdByUid: z.string(),
})
export type AgreementVersion = z.infer<typeof agreementVersionSchema>

/**
 * Auto-save interval in milliseconds.
 *
 * Story 5.7: Draft Saving & Version History - AC1
 */
export const AUTO_SAVE_INTERVAL_MS = 30000 // 30 seconds

/**
 * Draft expiry in days.
 *
 * Story 5.7: Draft Saving & Version History - AC5
 */
export const DRAFT_EXPIRY_DAYS = 30

/**
 * Inactivity reminder threshold in days.
 *
 * Story 5.7: Draft Saving & Version History - AC6
 */
export const INACTIVITY_REMINDER_DAYS = 7

// ============================================================================
// Epic 6: Agreement Signing & Activation
// ============================================================================

/**
 * Signature method types.
 *
 * Story 6.1: Child Digital Signature Ceremony - AC2
 * Story 6.7: Signature Accessibility - AC2
 * Defines how a signature was created.
 */
export const signatureMethodSchema = z.enum(['typed', 'drawn'])
export type SignatureMethod = z.infer<typeof signatureMethodSchema>

/**
 * Signing party types.
 *
 * Story 6.1: Child Digital Signature Ceremony - AC5
 * Story 6.2: Parent Digital Signature - AC4
 * Identifies who provided the signature.
 */
export const signingPartySchema = z.enum(['child', 'parent'])
export type SigningParty = z.infer<typeof signingPartySchema>

/**
 * Digital signature schema.
 *
 * Story 6.1: Child Digital Signature Ceremony - AC5
 * Story 6.2: Parent Digital Signature - AC4
 * Represents a digital signature from a family member.
 */
export const signatureSchema = z.object({
  id: z.string(),
  party: signingPartySchema,
  method: signatureMethodSchema,
  /** Typed name or null if drawn */
  name: z.string().nullable(),
  /** Base64 image data for drawn signature or null if typed */
  imageData: z.string().nullable(),
  /** User ID of the signer (parent uid or child profile id) */
  signerId: z.string(),
  /** Display name of signer */
  signerName: z.string(),
  /** When the signature was created */
  signedAt: z.date(),
  /** Whether signer acknowledged understanding */
  acknowledged: z.boolean(),
})
export type Signature = z.infer<typeof signatureSchema>

/**
 * Signing status for an agreement.
 *
 * Story 6.1: Child Digital Signature Ceremony - AC7
 * Story 6.3: Agreement Activation - AC1
 * Tracks the signing progress of an agreement.
 */
export const signingStatusSchema = z.enum([
  'pending', // No signatures yet
  'child_signed', // Child has signed, waiting for parent(s)
  'parent_signed', // Parent signed (should not happen - child must sign first)
  'complete', // All required signatures collected
])
export type SigningStatus = z.infer<typeof signingStatusSchema>

/**
 * Agreement signing session schema.
 *
 * Story 6.1: Child Digital Signature Ceremony - AC1, AC5
 * Story 6.2: Parent Digital Signature - AC4
 * Story 6.3: Agreement Activation - AC1
 * Tracks the signing process for an agreement.
 */
export const agreementSigningSchema = z.object({
  id: z.string(),
  /** Reference to the co-creation session */
  sessionId: z.string(),
  /** Reference to the family */
  familyId: z.string(),
  /** Reference to the child profile */
  childId: z.string(),
  /** Current signing status */
  status: signingStatusSchema,
  /** Child's signature (null until signed) */
  childSignature: signatureSchema.nullable(),
  /** Parent signatures (array for shared custody) */
  parentSignatures: z.array(signatureSchema),
  /** Whether shared custody requires both parents */
  requiresBothParents: z.boolean(),
  /** Timestamp when signing became active */
  startedAt: z.date(),
  /** Timestamp when all signatures complete */
  completedAt: z.date().nullable(),
  /** Agreement version being signed */
  agreementVersion: z.string(),
})
export type AgreementSigning = z.infer<typeof agreementSigningSchema>

/**
 * Validates signing order - child must sign first (FR19).
 *
 * Story 6.1: Child Digital Signature Ceremony - AC7
 * Returns true if child can sign (no parent has signed yet).
 */
export function canChildSign(signing: AgreementSigning): boolean {
  return signing.parentSignatures.length === 0 && signing.childSignature === null
}

/**
 * Validates parent can sign - child must have signed first (FR19).
 *
 * Story 6.2: Parent Digital Signature - AC1
 * Returns true if parent can sign (child has signed).
 */
export function canParentSign(signing: AgreementSigning): boolean {
  return signing.childSignature !== null
}

/**
 * Check if a specific parent has already signed.
 *
 * Story 6.2: Parent Digital Signature - AC5
 * Returns true if the specified parent UID has already signed.
 */
export function hasParentSigned(signing: AgreementSigning, parentUid: string): boolean {
  return signing.parentSignatures.some((sig) => sig.signerId === parentUid)
}

/**
 * Check if all required signatures have been collected.
 *
 * Story 6.2: Parent Digital Signature - AC7
 * Returns true if agreement is ready for activation.
 */
export function isSigningComplete(signing: AgreementSigning): boolean {
  if (signing.childSignature === null) return false

  if (signing.requiresBothParents) {
    return signing.parentSignatures.length >= 2
  }
  return signing.parentSignatures.length >= 1
}

/**
 * Get signing progress for UI display.
 *
 * Story 6.2: Parent Digital Signature - AC5
 * Returns progress information for the signing process.
 */
export function getSigningProgress(signing: AgreementSigning): {
  childSigned: boolean
  parentsRequired: number
  parentsSigned: number
  isComplete: boolean
} {
  const parentsRequired = signing.requiresBothParents ? 2 : 1
  return {
    childSigned: signing.childSignature !== null,
    parentsRequired,
    parentsSigned: signing.parentSignatures.length,
    isComplete: isSigningComplete(signing),
  }
}

// ============================================================================
// EPIC 6: AGREEMENT ACTIVATION
// Story 6.3: Agreement Activation
// ============================================================================

/**
 * Active agreement status.
 *
 * Story 6.3: Agreement Activation - AC1, AC7
 */
export const activeAgreementStatusSchema = z.enum(['active', 'archived'])
export type ActiveAgreementStatus = z.infer<typeof activeAgreementStatusSchema>

/**
 * Active agreement schema.
 *
 * Story 6.3: Agreement Activation - AC1, AC2, AC3, AC6, AC7
 *
 * Represents a fully signed and activated family agreement.
 * Only ONE active agreement per child at any time (AC7).
 * Stored in Firestore at /activeAgreements/{agreementId}.
 */
export const activeAgreementSchema = z.object({
  /** Unique identifier */
  id: z.string(),
  /** Reference to the family */
  familyId: z.string(),
  /** Reference to the child profile */
  childId: z.string(),
  /** Agreement version (e.g., "v1.0", "v2.0") - AC2 */
  version: z.string(),
  /** Reference to the signing session */
  signingSessionId: z.string(),
  /** Reference to the co-creation session */
  coCreationSessionId: z.string(),
  /** Snapshot of final terms - AC6 */
  terms: z.array(agreementTermSchema),
  /** When the agreement was activated - AC3 */
  activatedAt: z.date(),
  /** UID of parent who submitted final signature */
  activatedByUid: z.string(),
  /** Current status ('active' or 'archived') - AC1, AC7 */
  status: activeAgreementStatusSchema,
  /** When the agreement was archived (null if active) - AC7 */
  archivedAt: z.date().nullable(),
  /** ID of new agreement that replaced this one - AC7 */
  archivedByAgreementId: z.string().nullable(),
})
export type ActiveAgreement = z.infer<typeof activeAgreementSchema>

/**
 * Generate the next version number for an agreement.
 *
 * Story 6.3: Agreement Activation - AC2
 * - First agreement: v1.0
 * - Future: v1.1 for minor changes, v2.0 for major renewals
 *
 * @param previousVersion - Previous version string (null for first agreement)
 * @returns Next version string
 */
export function generateNextVersion(previousVersion: string | null): string {
  if (previousVersion === null) {
    return 'v1.0'
  }

  // Parse version string (e.g., "v1.0" -> major: 1, minor: 0)
  const match = previousVersion.match(/^v(\d+)\.(\d+)$/)
  if (!match) {
    return 'v1.0' // Fallback for invalid version
  }

  const major = parseInt(match[1], 10)
  // For now, increment major version for renewals (Epic 35 will refine this)
  return `v${major + 1}.0`
}

/**
 * Activate an agreement after all signatures are collected.
 *
 * Story 6.3: Agreement Activation - AC1, AC2, AC3, AC6
 *
 * @param signing - Completed signing session
 * @param terms - Final terms snapshot from co-creation session
 * @param previousVersion - Previous active agreement version (null for first)
 * @param activatedByUid - UID of parent who submitted final signature
 * @returns ActiveAgreement object ready for Firestore
 */
export function createActiveAgreement(
  signing: AgreementSigning,
  terms: AgreementTerm[],
  previousVersion: string | null,
  activatedByUid: string
): ActiveAgreement {
  if (!isSigningComplete(signing)) {
    throw new Error('Cannot activate agreement: not all signatures collected')
  }

  const now = new Date()

  return {
    id: `agreement-${signing.familyId}-${signing.childId}-${now.getTime()}`,
    familyId: signing.familyId,
    childId: signing.childId,
    version: generateNextVersion(previousVersion),
    signingSessionId: signing.id,
    coCreationSessionId: signing.sessionId,
    terms,
    activatedAt: now,
    activatedByUid,
    status: 'active',
    archivedAt: null,
    archivedByAgreementId: null,
  }
}

/**
 * Archive an existing active agreement.
 *
 * Story 6.3: Agreement Activation - AC7
 *
 * @param agreement - Agreement to archive
 * @param newAgreementId - ID of new agreement replacing this one
 * @returns Archived agreement object
 */
export function archiveAgreement(
  agreement: ActiveAgreement,
  newAgreementId: string
): ActiveAgreement {
  return {
    ...agreement,
    status: 'archived',
    archivedAt: new Date(),
    archivedByAgreementId: newAgreementId,
  }
}

/**
 * Check if there's an active agreement for a child.
 *
 * Story 6.3: Agreement Activation - AC7
 *
 * @param agreements - List of agreements to check
 * @param childId - Child ID to check for
 * @returns The active agreement if found, null otherwise
 */
export function findActiveAgreementForChild(
  agreements: ActiveAgreement[],
  childId: string
): ActiveAgreement | null {
  return agreements.find((a) => a.childId === childId && a.status === 'active') ?? null
}

// ============================================================================
// EPIC 7: CRISIS ALLOWLIST FOUNDATION
// Story 7.1: Crisis Allowlist Data Structure
// ============================================================================

/**
 * Crisis resource category types.
 *
 * Story 7.1: Crisis Allowlist Data Structure - AC2
 * Categories for organizing crisis resources.
 */
export const crisisResourceCategorySchema = z.enum([
  'suicide_prevention',
  'crisis_general',
  'domestic_violence',
  'child_abuse',
  'sexual_assault',
  'lgbtq_support',
  'eating_disorder',
  'mental_health',
  'substance_abuse',
])
export type CrisisResourceCategory = z.infer<typeof crisisResourceCategorySchema>

/**
 * Individual crisis resource entry.
 *
 * Story 7.1: Crisis Allowlist Data Structure - AC2, AC3, AC7
 * Represents a single crisis resource in the allowlist.
 */
export const crisisResourceSchema = z.object({
  /** Unique identifier */
  id: z.string(),
  /** Primary domain (e.g., "988lifeline.org") */
  domain: z.string(),
  /** Wildcard pattern for subdomains (e.g., "*.988lifeline.org") */
  pattern: z.string().nullable(),
  /** Category for organization */
  category: crisisResourceCategorySchema,
  /** Human-readable name */
  name: z.string(),
  /** Description of what this resource helps with (6th-grade reading level) */
  description: z.string(),
  /** Crisis hotline phone number */
  phone: z.string().nullable(),
  /** Text crisis option (e.g., "Text HOME to 741741") */
  text: z.string().nullable(),
  /** Common typos and variations for fuzzy matching */
  aliases: z.array(z.string()),
  /** Whether this is a regional vs national resource */
  regional: z.boolean(),
})
export type CrisisResource = z.infer<typeof crisisResourceSchema>

/**
 * Complete crisis allowlist with versioning.
 *
 * Story 7.1: Crisis Allowlist Data Structure - AC4, AC5, AC6
 * The complete allowlist structure with metadata for sync.
 */
export const crisisAllowlistSchema = z.object({
  /** Semantic version (e.g., "1.0.0") */
  version: z.string().regex(/^\d+\.\d+\.\d+$/),
  /** ISO timestamp of last update */
  lastUpdated: z.string().datetime(),
  /** All crisis resources */
  resources: z.array(crisisResourceSchema),
})
export type CrisisAllowlist = z.infer<typeof crisisAllowlistSchema>

/**
 * Check if a URL matches a crisis resource.
 *
 * Story 7.1: Crisis Allowlist Data Structure - AC3
 * Performs exact domain, wildcard, and alias matching.
 *
 * @param url - URL to check
 * @param allowlist - Crisis allowlist to match against
 * @returns Matching CrisisResource or null if no match
 */
export function matchesCrisisUrl(url: string, allowlist: CrisisAllowlist): CrisisResource | null {
  let hostname: string
  try {
    const parsed = new URL(url)
    hostname = parsed.hostname.toLowerCase()
  } catch {
    // Invalid URL - try treating as hostname directly
    hostname = url.toLowerCase().replace(/^www\./, '')
  }

  // Remove www. prefix for matching
  const normalizedHostname = hostname.replace(/^www\./, '')

  for (const resource of allowlist.resources) {
    const normalizedDomain = resource.domain.toLowerCase()

    // Exact domain match (with or without www)
    if (normalizedHostname === normalizedDomain || hostname === `www.${normalizedDomain}`) {
      return resource
    }

    // Wildcard pattern match (*.domain.org matches any subdomain)
    if (resource.pattern) {
      const baseDomain = resource.pattern.replace('*.', '').toLowerCase()
      if (normalizedHostname === baseDomain || normalizedHostname.endsWith(`.${baseDomain}`)) {
        return resource
      }
    }

    // Alias match
    for (const alias of resource.aliases) {
      const normalizedAlias = alias.toLowerCase()
      if (normalizedHostname === normalizedAlias || hostname === `www.${normalizedAlias}`) {
        return resource
      }
    }
  }

  return null
}

/**
 * Check if a URL is on the crisis allowlist.
 *
 * Story 7.1: Crisis Allowlist Data Structure - AC3
 * Convenience function that returns boolean.
 *
 * @param url - URL to check
 * @param allowlist - Crisis allowlist to match against
 * @returns true if URL matches any crisis resource
 */
export function isCrisisUrl(url: string, allowlist: CrisisAllowlist): boolean {
  return matchesCrisisUrl(url, allowlist) !== null
}

// ============================================================================
// EPIC 18: SCREENSHOT CLOUD STORAGE & RETENTION
// Story 18.2: Screenshot Metadata in Firestore
// Story 18.3: Configurable Retention Policy
// ============================================================================

/**
 * Default retention period for screenshots in days.
 *
 * Story 18.2: Screenshot Metadata in Firestore - AC5
 * Default retention of 30 days if not specified in family agreement.
 */
export const DEFAULT_RETENTION_DAYS = 30

/**
 * Allowed retention periods in days.
 *
 * Story 18.3: Configurable Retention Policy - AC2
 * Only these values are allowed to prevent accidental short retention.
 */
export const RETENTION_DAYS_OPTIONS = [7, 30, 90] as const
export type RetentionDays = (typeof RETENTION_DAYS_OPTIONS)[number]

/**
 * Retention policy schema for family screenshot settings.
 *
 * Story 18.3: Configurable Retention Policy - AC1, AC2
 * Stored on family document to configure screenshot retention.
 */
export const retentionPolicySchema = z.object({
  /** Retention period in days (must be 7, 30, or 90) */
  retentionDays: z
    .number()
    .refine((val): val is RetentionDays => RETENTION_DAYS_OPTIONS.includes(val as RetentionDays), {
      message: 'Retention must be 7, 30, or 90 days',
    }),
  /** When the policy was last updated (epoch ms) */
  updatedAt: z.number().int().positive(),
  /** UID of guardian who updated the policy */
  updatedByUid: z.string(),
})

export type RetentionPolicy = z.infer<typeof retentionPolicySchema>

/**
 * Get retention days from policy or use default.
 *
 * Story 18.3: Configurable Retention Policy - AC5
 * Helper to safely get retention days with fallback to default.
 *
 * @param policy - Optional retention policy
 * @returns Retention days (7, 30, or 90)
 */
export function getRetentionDays(policy?: RetentionPolicy | null): RetentionDays {
  if (policy?.retentionDays && RETENTION_DAYS_OPTIONS.includes(policy.retentionDays)) {
    return policy.retentionDays
  }
  return DEFAULT_RETENTION_DAYS as RetentionDays
}

/**
 * Validate if a number is a valid retention days option.
 *
 * Story 18.3: Configurable Retention Policy - AC2
 *
 * @param days - Number to validate
 * @returns true if days is 7, 30, or 90
 */
export function isValidRetentionDays(days: number): days is RetentionDays {
  return RETENTION_DAYS_OPTIONS.includes(days as RetentionDays)
}

/**
 * Format expiry time remaining as human-readable string.
 *
 * Story 18.3: Configurable Retention Policy - AC4
 *
 * @param retentionExpiresAt - Expiry timestamp in milliseconds
 * @returns Human-readable string like "Expires in 15 days"
 */
export function formatExpiryRemaining(retentionExpiresAt: number): string {
  const now = Date.now()
  const remaining = retentionExpiresAt - now

  if (remaining <= 0) return 'Expired'

  const days = Math.floor(remaining / (24 * 60 * 60 * 1000))
  if (days === 0) return 'Expires today'
  if (days === 1) return 'Expires tomorrow'
  return `Expires in ${days} days`
}

/**
 * Screenshot metadata schema.
 *
 * Story 18.2: Screenshot Metadata in Firestore - AC1, AC2, AC5
 * Represents screenshot metadata stored in Firestore at /children/{childId}/screenshots/{screenshotId}.
 * Does NOT contain actual image data - only references to Firebase Storage.
 */
export const screenshotMetadataSchema = z.object({
  // Identity
  /** Unique screenshot ID (timestamp-based for natural ordering) */
  screenshotId: z.string(),
  /** Reference to child profile */
  childId: z.string(),
  /** Reference to family (for guardian access control) */
  familyId: z.string(),
  /** Source device that captured the screenshot */
  deviceId: z.string(),

  // Content reference (NOT actual image)
  /** Firebase Storage path to the image file */
  storagePath: z.string(),
  /** File size in bytes (for quota tracking) */
  sizeBytes: z.number().int().positive(),

  // Capture context
  /** When the screenshot was captured (epoch ms) */
  timestamp: z.number().int().positive(),
  /** Page URL at capture time */
  url: z.string(),
  /** Page title at capture time */
  title: z.string(),

  // Lifecycle timestamps (epoch ms)
  /** When uploaded to Firebase Storage */
  uploadedAt: z.number().int().positive(),
  /** When added to queue on device */
  queuedAt: z.number().int().positive(),
  /** When to auto-delete (uploadedAt + retention period) */
  retentionExpiresAt: z.number().int().positive(),
  /** Story 18.3: Retention period in days (7, 30, or 90) */
  retentionDays: z
    .number()
    .refine((val): val is RetentionDays => RETENTION_DAYS_OPTIONS.includes(val as RetentionDays))
    .optional(),
})

export type ScreenshotMetadata = z.infer<typeof screenshotMetadataSchema>

/**
 * Generate a unique screenshot ID.
 *
 * Story 18.2: Screenshot Metadata in Firestore - AC1
 * Uses timestamp + random suffix for natural ordering and uniqueness.
 *
 * @param timestamp - Capture timestamp in milliseconds
 * @returns Unique screenshot ID in format "{timestamp}_{random}"
 */
export function generateScreenshotId(timestamp: number): string {
  const randomSuffix = Math.random().toString(36).substring(2, 8)
  return `${timestamp}_${randomSuffix}`
}

/**
 * Calculate retention expiry timestamp.
 *
 * Story 18.2: Screenshot Metadata in Firestore - AC5
 * Default retention is 30 days from upload.
 *
 * @param uploadedAt - Upload timestamp in milliseconds
 * @param retentionDays - Retention period in days (default: 30)
 * @returns Expiry timestamp in milliseconds
 */
export function calculateRetentionExpiry(
  uploadedAt: number,
  retentionDays: number = DEFAULT_RETENTION_DAYS
): number {
  return uploadedAt + retentionDays * 24 * 60 * 60 * 1000
}

/**
 * Create screenshot metadata for Firestore.
 *
 * Story 18.2: Screenshot Metadata in Firestore - AC1, AC2
 * Factory function to create properly structured metadata.
 *
 * @param params - Screenshot metadata parameters
 * @returns ScreenshotMetadata ready for Firestore
 */
export function createScreenshotMetadata(params: {
  timestamp: number
  childId: string
  familyId: string
  deviceId: string
  storagePath: string
  sizeBytes: number
  url: string
  title: string
  queuedAt: number
  retentionDays?: number
}): ScreenshotMetadata {
  const now = Date.now()
  const screenshotId = generateScreenshotId(params.timestamp)
  const retentionExpiresAt = calculateRetentionExpiry(now, params.retentionDays)

  return {
    screenshotId,
    childId: params.childId,
    familyId: params.familyId,
    deviceId: params.deviceId,
    storagePath: params.storagePath,
    sizeBytes: params.sizeBytes,
    timestamp: params.timestamp,
    url: params.url,
    title: params.title,
    uploadedAt: now,
    queuedAt: params.queuedAt,
    retentionExpiresAt,
  }
}

// ============================================================================
// EPIC 0.5: SAFE ACCOUNT ESCAPE
// Story 0.5.1: Secure Safety Contact Channel
// ============================================================================

/**
 * Safety contact urgency levels.
 *
 * Story 0.5.1: Secure Safety Contact Channel - AC4
 * Uses neutral language to avoid triggering an abuser's suspicion.
 */
export const safetyContactUrgencySchema = z.enum([
  'when_you_can', // Default - no rush ("Whenever convenient")
  'soon', // Within a day or two
  'urgent', // As soon as possible
])
export type SafetyContactUrgency = z.infer<typeof safetyContactUrgencySchema>

/**
 * Safe contact information schema.
 *
 * Story 0.5.1: Secure Safety Contact Channel - AC4
 * Optional contact details for support to reach the victim safely.
 */
export const safeContactInfoSchema = z
  .object({
    phone: z.string().nullable(),
    email: z.string().email().nullable(),
    preferredMethod: z.enum(['phone', 'email', 'either']).nullable(),
    safeTimeToContact: z.string().max(200).nullable(),
  })
  .nullable()
export type SafeContactInfo = z.infer<typeof safeContactInfoSchema>

/**
 * Safety ticket status.
 *
 * Story 0.5.1: Secure Safety Contact Channel - AC5
 * Story 3.6: Legal Parent Petition - Added 'denied' status
 * Tracks the lifecycle of a safety support ticket.
 */
export const safetyTicketStatusSchema = z.enum([
  'pending', // Newly submitted, awaiting review
  'in_review', // Support agent is reviewing
  'resolved', // Issue has been addressed
  'closed', // Ticket closed
  'denied', // Story 3.6: Petition denied (for legal_parent_petition type)
])
export type SafetyTicketStatus = z.infer<typeof safetyTicketStatusSchema>

/**
 * Safety ticket type.
 *
 * Story 3.6: Legal Parent Petition for Access - AC1
 * Distinguishes between safety escape requests and legal parent petitions.
 */
export const safetyTicketTypeSchema = z.enum([
  'safety_request', // Default: domestic abuse escape request
  'legal_parent_petition', // Story 3.6: Legal parent access petition
])
export type SafetyTicketType = z.infer<typeof safetyTicketTypeSchema>

/**
 * Legal parent petition info schema.
 *
 * Story 3.6: Legal Parent Petition for Access - AC1
 * Additional fields for legal parent access petitions.
 */
export const legalParentPetitionInfoSchema = z
  .object({
    childName: z.string().min(1).max(100), // Name of child petitioner claims
    childBirthdate: z.string().nullable(), // Approximate birthdate if known
    relationshipClaim: z.enum(['biological_parent', 'adoptive_parent', 'legal_guardian']),
    existingParentEmail: z.string().email().nullable(), // Email of existing parent if known
    courtOrderReference: z.string().max(200).nullable(), // Court case number if available
  })
  .nullable()
export type LegalParentPetitionInfo = z.infer<typeof legalParentPetitionInfoSchema>

/**
 * Verification status schema for safety tickets.
 *
 * Story 3.6: Legal Parent Petition for Access - AC3
 * Tracks identity verification checks for petitions.
 */
export const verificationStatusSchema = z
  .object({
    phoneVerified: z.boolean().default(false),
    idDocumentVerified: z.boolean().default(false),
    accountMatchVerified: z.boolean().default(false),
    securityQuestionsVerified: z.boolean().default(false),
  })
  .nullable()
export type VerificationStatus = z.infer<typeof verificationStatusSchema>

/**
 * Safety ticket schema.
 *
 * Story 0.5.1: Secure Safety Contact Channel - AC5, AC6
 * Story 3.6: Legal Parent Petition for Access - AC1
 *
 * CRITICAL SAFETY DESIGN:
 * - Stored in SEPARATE /safetyTickets collection (isolated from family data)
 * - familyId is intentionally NOT populated (prevents data linkage)
 * - ipHash used for rate limiting only (not tracking)
 * - No Firestore indexes on sensitive fields (prevents search exposure)
 *
 * Represents a safety support ticket submitted by a potential abuse victim
 * OR a legal parent petition for access.
 * Stored in Firestore at /safetyTickets/{ticketId}.
 */
export const safetyTicketSchema = z.object({
  id: z.string(),
  // Story 3.6: Ticket type to distinguish safety requests from legal parent petitions
  type: safetyTicketTypeSchema.default('safety_request'),
  message: z.string().min(1).max(5000),
  safeContactInfo: safeContactInfoSchema,
  urgency: safetyContactUrgencySchema,
  // User context (if logged in) - for support team identification only
  userId: z.string().nullable(),
  userEmail: z.string().email().nullable(),
  familyId: z.string().nullable(), // Intentionally NOT populated for data isolation
  // Metadata
  createdAt: z.date(),
  ipHash: z.string(), // Hashed IP for rate limiting, NOT for tracking
  userAgent: z.string().nullable(),
  // Ticket lifecycle
  status: safetyTicketStatusSchema,
  assignedTo: z.string().nullable(),
  // Story 3.6: Verification tracking for identity checks
  verification: verificationStatusSchema,
  // Story 3.6: Legal parent petition specific fields
  petitionInfo: legalParentPetitionInfoSchema,
  // Story 3.6: SLA tracking (business days from submission)
  slaDeadline: z.date().nullable(), // 5 business days from submission
  // Story 3.6: Denial tracking
  denialReason: z.string().max(1000).nullable(), // Internal only
  deniedAt: z.date().nullable(),
  deniedByAgentId: z.string().nullable(),
  // Story 3.6: Grant tracking
  grantedAt: z.date().nullable(),
  grantedByAgentId: z.string().nullable(),
  grantedFamilyId: z.string().nullable(), // Family the petitioner was added to
})
export type SafetyTicket = z.infer<typeof safetyTicketSchema>

/**
 * Safety contact input schema.
 *
 * Story 0.5.1: Secure Safety Contact Channel - AC4
 * Story 3.6: Legal Parent Petition for Access - AC1
 * Input schema for the submitSafetyContact callable function.
 */
export const safetyContactInputSchema = z.object({
  // Story 3.6: Ticket type - defaults to safety_request
  type: safetyTicketTypeSchema.default('safety_request'),
  message: z.string().min(1).max(5000),
  safeContactInfo: safeContactInfoSchema,
  urgency: safetyContactUrgencySchema.default('when_you_can'),
  // Story 3.6: Legal parent petition specific fields
  petitionInfo: legalParentPetitionInfoSchema,
})
export type SafetyContactInput = z.infer<typeof safetyContactInputSchema>

/**
 * SLA deadline days for legal parent petitions.
 *
 * Story 3.6: Legal Parent Petition for Access - AC7
 * Processing SLA of 5 business days.
 */
export const PETITION_SLA_BUSINESS_DAYS = 5

/**
 * Calculate SLA deadline in business days from a start date.
 *
 * Story 3.6: Legal Parent Petition for Access - AC7
 * Excludes weekends (Saturday and Sunday).
 *
 * @param startDate - Start date
 * @param businessDays - Number of business days
 * @returns Deadline date
 */
export function calculateBusinessDayDeadline(startDate: Date, businessDays: number): Date {
  // Validate inputs to prevent infinite loops or invalid calculations
  if (!(startDate instanceof Date) || isNaN(startDate.getTime())) {
    throw new Error('Invalid start date provided')
  }
  if (typeof businessDays !== 'number' || !Number.isFinite(businessDays)) {
    throw new Error('Business days must be a finite number')
  }
  if (businessDays < 0) {
    throw new Error('Business days cannot be negative')
  }
  // Reasonable upper limit to prevent excessive loops
  if (businessDays > 365) {
    throw new Error('Business days cannot exceed 365')
  }

  const result = new Date(startDate)
  let daysAdded = 0

  while (daysAdded < businessDays) {
    result.setDate(result.getDate() + 1)
    const dayOfWeek = result.getDay()
    // Skip Saturday (6) and Sunday (0)
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      daysAdded++
    }
  }

  return result
}

/**
 * Check if a petition is overdue based on SLA deadline.
 *
 * Story 3.6: Legal Parent Petition for Access - AC7
 *
 * @param slaDeadline - SLA deadline date
 * @returns true if overdue
 */
export function isPetitionOverdue(slaDeadline: Date | null): boolean {
  if (!slaDeadline) return false
  return new Date() > slaDeadline
}

/**
 * Get remaining business days until SLA deadline.
 *
 * Story 3.6: Legal Parent Petition for Access - AC7
 *
 * @param slaDeadline - SLA deadline date
 * @returns Number of business days remaining (negative if overdue)
 */
export function getBusinessDaysRemaining(slaDeadline: Date | null): number {
  if (!slaDeadline) return 0

  const now = new Date()
  const deadline = new Date(slaDeadline)

  if (now > deadline) {
    // Count negative business days if overdue
    let days = 0
    const cursor = new Date(deadline)
    while (cursor < now) {
      cursor.setDate(cursor.getDate() + 1)
      const dayOfWeek = cursor.getDay()
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        days--
      }
    }
    return days
  }

  // Count positive business days remaining
  let days = 0
  const cursor = new Date(now)
  while (cursor < deadline) {
    cursor.setDate(cursor.getDate() + 1)
    const dayOfWeek = cursor.getDay()
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      days++
    }
  }
  return days
}

/**
 * Safety contact response schema.
 *
 * Story 0.5.1: Secure Safety Contact Channel - AC5
 * Neutral response returned after form submission.
 */
export const safetyContactResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
})
export type SafetyContactResponse = z.infer<typeof safetyContactResponseSchema>

// ============================================================================
// EPIC 0.5: SAFE ACCOUNT ESCAPE
// Story 0.5.2: Safety Request Documentation Upload
// ============================================================================

/**
 * Allowed MIME types for safety document uploads.
 *
 * Story 0.5.2: Safety Request Documentation Upload - AC1
 * Accepts PDF, images, and common document formats.
 */
export const safetyDocumentMimeTypeSchema = z.enum([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
])
export type SafetyDocumentMimeType = z.infer<typeof safetyDocumentMimeTypeSchema>

/**
 * Maximum file size for safety documents (25MB).
 *
 * Story 0.5.2: Safety Request Documentation Upload - AC3
 */
export const SAFETY_DOCUMENT_MAX_SIZE_BYTES = 25 * 1024 * 1024 // 25MB

/**
 * Maximum total upload size per ticket (100MB).
 *
 * Story 0.5.2: Safety Request Documentation Upload - AC3
 */
export const SAFETY_DOCUMENT_MAX_TOTAL_SIZE_BYTES = 100 * 1024 * 1024 // 100MB

/**
 * Default retention period for safety documents in years.
 *
 * Story 0.5.2: Safety Request Documentation Upload - AC5
 * Legal hold default of 7 years.
 */
export const SAFETY_DOCUMENT_RETENTION_YEARS = 7

/**
 * Safety document metadata schema.
 *
 * Story 0.5.2: Safety Request Documentation Upload - AC2, AC5
 *
 * CRITICAL SAFETY DESIGN:
 * - Stored in SEPARATE /safetyDocuments collection (isolated from family data)
 * - Storage path uses UUID to prevent enumeration
 * - Retention follows legal hold requirements
 * - All access via Admin SDK only
 *
 * Represents document metadata stored in Firestore at /safetyDocuments/{documentId}.
 */
export const safetyDocumentSchema = z.object({
  id: z.string(),
  ticketId: z.string(),
  filename: z.string().max(255),
  originalFilename: z.string().max(255),
  mimeType: safetyDocumentMimeTypeSchema,
  sizeBytes: z.number().max(SAFETY_DOCUMENT_MAX_SIZE_BYTES),
  storagePath: z.string(),
  uploadedAt: z.date(),
  // Retention management
  retentionUntil: z.date(),
  legalHold: z.boolean().default(false),
  markedForDeletion: z.boolean().default(false),
  // Uploader context (if logged in)
  userId: z.string().nullable(),
})
export type SafetyDocument = z.infer<typeof safetyDocumentSchema>

/**
 * Safety document upload input schema.
 *
 * Story 0.5.2: Safety Request Documentation Upload - AC1
 * Input schema for the uploadSafetyDocument callable function.
 */
export const safetyDocumentUploadInputSchema = z.object({
  ticketId: z.string().min(1),
  filename: z.string().min(1).max(255),
  fileData: z.string(), // Base64 encoded
  mimeType: safetyDocumentMimeTypeSchema,
})
export type SafetyDocumentUploadInput = z.infer<typeof safetyDocumentUploadInputSchema>

/**
 * Safety document upload response schema.
 *
 * Story 0.5.2: Safety Request Documentation Upload - AC4
 * Neutral response returned after upload.
 */
export const safetyDocumentUploadResponseSchema = z.object({
  success: z.boolean(),
  documentId: z.string().optional(),
  message: z.string(),
})
export type SafetyDocumentUploadResponse = z.infer<typeof safetyDocumentUploadResponseSchema>

/**
 * Safety document delete input schema.
 *
 * Story 0.5.2: Safety Request Documentation Upload - AC6
 * Input schema for the deleteSafetyDocument callable function.
 */
export const safetyDocumentDeleteInputSchema = z.object({
  documentId: z.string().min(1),
})
export type SafetyDocumentDeleteInput = z.infer<typeof safetyDocumentDeleteInputSchema>

/**
 * Safety document delete response schema.
 *
 * Story 0.5.2: Safety Request Documentation Upload - AC6
 */
export const safetyDocumentDeleteResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
})

// ============================================================================
// EPIC 0.5: SAFE ACCOUNT ESCAPE
// Story 0.5.4: Parent Access Severing
// ============================================================================

/**
 * Sever parent access input schema.
 *
 * Story 0.5.4: Parent Access Severing - AC1, AC7, AC8
 * Input schema for the severParentAccess callable function.
 *
 * CRITICAL SAFETY DESIGN:
 * - Requires confirmation phrase to prevent accidental severing
 * - Confirmation phrase format: "SEVER {parentEmail}"
 * - Linked to safety ticket for audit trail
 */
export const severParentAccessInputSchema = z.object({
  ticketId: z.string().min(1),
  familyId: z.string().min(1),
  parentUid: z.string().min(1),
  confirmationPhrase: z.string().min(1),
})
export type SeverParentAccessInput = z.infer<typeof severParentAccessInputSchema>

/**
 * Sever parent access response schema.
 *
 * Story 0.5.4: Parent Access Severing - AC1
 * Minimal response to confirm severing (no sensitive details).
 */
export const severParentAccessResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
})
export type SeverParentAccessResponse = z.infer<typeof severParentAccessResponseSchema>

/**
 * Get family for severing input schema.
 *
 * Story 0.5.4: Parent Access Severing - AC7
 * Input schema for the getFamilyForSevering callable function.
 */
export const getFamilyForSeveringInputSchema = z.object({
  ticketId: z.string().min(1),
})
export type GetFamilyForSeveringInput = z.infer<typeof getFamilyForSeveringInputSchema>

/**
 * Guardian info for severing display.
 *
 * Story 0.5.4: Parent Access Severing - AC7
 * Minimal guardian info for display in severing modal.
 */
export const guardianInfoForSeveringSchema = z.object({
  uid: z.string(),
  email: z.string(), // Not .email() - can be 'Unknown' if guardian email not set
  displayName: z.string().nullable(),
  role: z.string(),
})
export type GuardianInfoForSevering = z.infer<typeof guardianInfoForSeveringSchema>

/**
 * Get family for severing response schema.
 *
 * Story 0.5.4: Parent Access Severing - AC7
 * Returns family info with guardians for severing modal display.
 */
export const getFamilyForSeveringResponseSchema = z.object({
  family: z
    .object({
      id: z.string(),
      name: z.string(),
      guardians: z.array(guardianInfoForSeveringSchema),
    })
    .nullable(),
  requestingUserUid: z.string().nullable(), // Which parent is requesting escape
  requestingUserEmail: z.string().email().nullable(),
})
export type GetFamilyForSeveringResponse = z.infer<typeof getFamilyForSeveringResponseSchema>

// ============================================================================
// Story 0.5.5: Remote Device Unenrollment Schemas
// ============================================================================

/**
 * Get devices for family input schema.
 *
 * Story 0.5.5: Remote Device Unenrollment - AC7
 * Input schema for the getDevicesForFamily callable function.
 */
export const getDevicesForFamilyInputSchema = z.object({
  ticketId: z.string().min(1),
})
export type GetDevicesForFamilyInput = z.infer<typeof getDevicesForFamilyInputSchema>

/**
 * Device info for unenrollment display.
 *
 * Story 0.5.5: Remote Device Unenrollment - AC7
 * Device info for display in safety dashboard device list.
 */
export const deviceInfoForSafetySchema = z.object({
  deviceId: z.string(),
  name: z.string(),
  type: z.enum(['chromebook', 'android']),
  childId: z.string().nullable(),
  lastSeen: z.number().nullable(),
  status: z.enum(['active', 'offline', 'unenrolled']),
})
export type DeviceInfoForSafety = z.infer<typeof deviceInfoForSafetySchema>

/**
 * Get devices for family response schema.
 *
 * Story 0.5.5: Remote Device Unenrollment - AC7
 * Returns family's device list for safety dashboard display.
 */
export const getDevicesForFamilyResponseSchema = z.object({
  familyId: z.string().nullable(),
  familyName: z.string().nullable(),
  devices: z.array(deviceInfoForSafetySchema),
})
export type GetDevicesForFamilyResponse = z.infer<typeof getDevicesForFamilyResponseSchema>

/**
 * Unenroll devices for safety input schema.
 *
 * Story 0.5.5: Remote Device Unenrollment - AC1, AC8
 * Input schema for the unenrollDevicesForSafety callable function.
 */
export const unenrollDevicesForSafetyInputSchema = z.object({
  ticketId: z.string().min(1),
  familyId: z.string().min(1),
  deviceIds: z.array(z.string().min(1)).min(1).max(50),
})
export type UnenrollDevicesForSafetyInput = z.infer<typeof unenrollDevicesForSafetyInputSchema>

/**
 * Unenroll devices for safety response schema.
 *
 * Story 0.5.5: Remote Device Unenrollment - AC1, AC8
 * Returns result of batch device unenrollment.
 */
export const unenrollDevicesForSafetyResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  unenrolledCount: z.number(),
  skippedCount: z.number(),
})
export type UnenrollDevicesForSafetyResponse = z.infer<
  typeof unenrollDevicesForSafetyResponseSchema
>

// ============================================================================
// Story 0.5.6: Location Feature Emergency Disable Schemas
// ============================================================================

/**
 * Disable location features for safety input schema.
 *
 * Story 0.5.6: Location Feature Emergency Disable - AC1-7
 * Input schema for the disableLocationFeaturesForSafety callable function.
 */
export const disableLocationFeaturesForSafetyInputSchema = z.object({
  ticketId: z.string().min(1),
  familyId: z.string().min(1),
  userId: z.string().min(1).optional(), // Optional: for user-specific disable
})
export type DisableLocationFeaturesForSafetyInput = z.infer<
  typeof disableLocationFeaturesForSafetyInputSchema
>

/**
 * Disable location features for safety response schema.
 *
 * Story 0.5.6: Location Feature Emergency Disable - AC1-7
 * Returns result of location feature disable operation.
 */
export const disableLocationFeaturesForSafetyResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  featuresDisabledCount: z.number(),
  notificationsDeleted: z.number(),
})
export type DisableLocationFeaturesForSafetyResponse = z.infer<
  typeof disableLocationFeaturesForSafetyResponseSchema
>

// ============================================================================
// Story 0.5.7: 72-Hour Notification Stealth Schemas
// ============================================================================

/**
 * Stealth duration constant.
 *
 * Story 0.5.7: 72-Hour Notification Stealth
 * The duration in hours that notifications are suppressed after an escape action.
 */
export const STEALTH_DURATION_HOURS = 72
export const STEALTH_DURATION_MS = STEALTH_DURATION_HOURS * 60 * 60 * 1000

/**
 * Critical notification types that bypass stealth.
 *
 * Story 0.5.7: 72-Hour Notification Stealth - AC4
 * These notification types are NEVER suppressed, even during stealth window.
 */
export const CRITICAL_NOTIFICATION_TYPES = [
  'crisis_resource_accessed',
  'mandatory_report_filed',
  'child_safety_signal',
  'emergency_unlock_used',
] as const
export type CriticalNotificationType = (typeof CRITICAL_NOTIFICATION_TYPES)[number]

/**
 * Stealth queue entry schema.
 *
 * Story 0.5.7: 72-Hour Notification Stealth - AC1, AC3
 * Schema for notifications captured and held in the stealth queue.
 */
export const stealthQueueEntrySchema = z.object({
  id: z.string(),
  familyId: z.string(),
  notificationType: z.string(),
  targetUserId: z.string(),
  notificationPayload: z.record(z.unknown()),
  capturedAt: z.date(),
  expiresAt: z.date(),
  ticketId: z.string(),
})
export type StealthQueueEntry = z.infer<typeof stealthQueueEntrySchema>

/**
 * Stealth window schema for family document fields.
 *
 * Story 0.5.7: 72-Hour Notification Stealth - AC6
 * Fields added to family documents to track stealth window.
 */
export const stealthWindowSchema = z.object({
  stealthActive: z.boolean(),
  stealthWindowStart: z.date().nullable(),
  stealthWindowEnd: z.date().nullable(),
  stealthTicketId: z.string().nullable(),
  stealthAffectedUserIds: z.array(z.string()),
})
export type StealthWindow = z.infer<typeof stealthWindowSchema>

/**
 * Activate stealth window input schema.
 *
 * Story 0.5.7: 72-Hour Notification Stealth - AC6, AC7
 * Input for activating stealth window on a family.
 */
export const activateStealthWindowInputSchema = z.object({
  familyId: z.string().min(1),
  ticketId: z.string().min(1),
  affectedUserIds: z.array(z.string().min(1)),
})
export type ActivateStealthWindowInput = z.infer<typeof activateStealthWindowInputSchema>

// ============================================================================
// Story 0.5.8: Audit Trail Sealing
// ============================================================================

/**
 * Seal reason types.
 *
 * Story 0.5.8: Audit Trail Sealing - AC2
 * Tracks why audit entries were sealed.
 */
export const sealReasonSchema = z.enum(['escape_action'])
export type SealReason = z.infer<typeof sealReasonSchema>

/**
 * Sealed audit entry access log schema.
 *
 * Story 0.5.8: Audit Trail Sealing - AC3
 * Records every access to sealed entries for compliance.
 */
export const sealedEntryAccessLogSchema = z.object({
  accessedAt: z.date(),
  accessedByAgentId: z.string(),
  accessedByAgentEmail: z.string().nullable(),
  accessReason: z.string(),
})
export type SealedEntryAccessLog = z.infer<typeof sealedEntryAccessLogSchema>

/**
 * Original audit entry schema.
 *
 * Story 0.5.8: Audit Trail Sealing - AC2
 * Preserves original audit entry data verbatim.
 */
export const originalAuditEntrySchema = z.object({
  viewerUid: z.string(),
  childId: z.string().nullable(),
  dataType: z.string(),
  viewedAt: z.date(),
  sessionId: z.string().nullable(),
  deviceId: z.string().nullable(),
  metadata: z.record(z.unknown()).nullable(),
})
export type OriginalAuditEntry = z.infer<typeof originalAuditEntrySchema>

/**
 * Sealed audit entry schema.
 *
 * Story 0.5.8: Audit Trail Sealing - AC2, AC3, AC5
 *
 * CRITICAL SAFETY DESIGN:
 * - Sealed entries are stored in a SEPARATE collection from auditLogs
 * - Original entries are DELETED from auditLogs after sealing
 * - This prevents any metadata leakage to family members
 * - Entries retained indefinitely for legal/compliance needs
 *
 * Stored in Firestore at /sealedAuditEntries/{entryId}.
 */
export const sealedAuditEntrySchema = z.object({
  id: z.string(),
  familyId: z.string(),

  // Original entry data (verbatim copy)
  originalEntry: originalAuditEntrySchema,

  // Sealing metadata
  sealedAt: z.date(),
  sealedByTicketId: z.string(),
  sealedByAgentId: z.string(),
  sealReason: sealReasonSchema,

  // Legal hold
  legalHold: z.boolean(),
  accessLog: z.array(sealedEntryAccessLogSchema),
})
export type SealedAuditEntry = z.infer<typeof sealedAuditEntrySchema>

/**
 * Seal audit entries input schema.
 *
 * Story 0.5.8: Audit Trail Sealing - AC6
 * Input schema for sealing audit entries.
 */
export const sealAuditEntriesInputSchema = z.object({
  familyId: z.string().min(1),
  escapedUserIds: z.array(z.string().min(1)),
  ticketId: z.string().min(1),
})
export type SealAuditEntriesInput = z.infer<typeof sealAuditEntriesInputSchema>

/**
 * Get sealed audit entries input schema.
 *
 * Story 0.5.8: Audit Trail Sealing - AC3
 * Input schema for admin access to sealed entries.
 */
export const getSealedAuditEntriesInputSchema = z.object({
  ticketId: z.string().min(1),
  familyId: z.string().min(1),
  authorizationReason: z.string().min(1),
})
export type GetSealedAuditEntriesInput = z.infer<typeof getSealedAuditEntriesInputSchema>

/**
 * Get sealed audit entries response schema.
 *
 * Story 0.5.8: Audit Trail Sealing - AC3
 * Response schema for admin access to sealed entries.
 */
export const getSealedAuditEntriesResponseSchema = z.object({
  entries: z.array(sealedAuditEntrySchema),
  totalCount: z.number(),
  accessLoggedAt: z.date(),
})
export type GetSealedAuditEntriesResponse = z.infer<typeof getSealedAuditEntriesResponseSchema>

// ============================================================================
// Story 3.6: Legal Parent Petition for Access
// ============================================================================

/**
 * Grant legal parent access input schema.
 *
 * Story 3.6: Legal Parent Petition for Access - AC4
 * Input schema for the grantLegalParentAccess callable function.
 */
export const grantLegalParentAccessInputSchema = z.object({
  ticketId: z.string().min(1),
  familyId: z.string().min(1),
  petitionerEmail: z.string().email(),
})
export type GrantLegalParentAccessInput = z.infer<typeof grantLegalParentAccessInputSchema>

/**
 * Grant legal parent access response schema.
 *
 * Story 3.6: Legal Parent Petition for Access - AC4
 */
export const grantLegalParentAccessResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  familyId: z.string().optional(),
})
export type GrantLegalParentAccessResponse = z.infer<typeof grantLegalParentAccessResponseSchema>

/**
 * Deny legal parent petition input schema.
 *
 * Story 3.6: Legal Parent Petition for Access - AC6
 * Input schema for the denyLegalParentPetition callable function.
 */
export const denyLegalParentPetitionInputSchema = z.object({
  ticketId: z.string().min(1),
  reason: z.string().min(1).max(1000),
})
export type DenyLegalParentPetitionInput = z.infer<typeof denyLegalParentPetitionInputSchema>

/**
 * Deny legal parent petition response schema.
 *
 * Story 3.6: Legal Parent Petition for Access - AC6
 */
export const denyLegalParentPetitionResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
})
export type DenyLegalParentPetitionResponse = z.infer<typeof denyLegalParentPetitionResponseSchema>

// ============================================================================
// Story 2.8: Unilateral Self-Removal (Survivor Escape)
// ============================================================================

/**
 * Self-removal confirmation phrase.
 *
 * Story 2.8: Unilateral Self-Removal - AC2
 * Explicit confirmation phrase to prevent accidental removal.
 */
export const SELF_REMOVAL_CONFIRMATION_PHRASE = 'I understand this is immediate'

/**
 * Self-remove from family input schema.
 *
 * Story 2.8: Unilateral Self-Removal - AC1, AC2
 * Input schema for the selfRemoveFromFamily callable function.
 *
 * CRITICAL SAFETY DESIGN:
 * - Requires explicit confirmation phrase to prevent accidental removal
 * - User can only remove themselves, not others
 * - No admin involvement required
 */
export const selfRemoveFromFamilyInputSchema = z.object({
  familyId: z.string().min(1),
  confirmationPhrase: z.literal(SELF_REMOVAL_CONFIRMATION_PHRASE),
})
export type SelfRemoveFromFamilyInput = z.infer<typeof selfRemoveFromFamilyInputSchema>

/**
 * Self-remove from family response schema.
 *
 * Story 2.8: Unilateral Self-Removal - AC3
 * Neutral response returned after self-removal.
 */
export const selfRemoveFromFamilyResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
})
export type SelfRemoveFromFamilyResponse = z.infer<typeof selfRemoveFromFamilyResponseSchema>

// ============================================================================
// Epic 20: AI Classification - Basic Categories
// Story 20.1: Classification Service Architecture
// ============================================================================

/**
 * Classification status states.
 *
 * Story 20.1: Classification Service Architecture - AC4, AC6
 * Tracks the lifecycle of a screenshot classification.
 */
export const classificationStatusSchema = z.enum([
  'pending', // Screenshot uploaded, classification not started
  'processing', // Classification in progress
  'completed', // Classification finished successfully
  'failed', // Classification failed after retries
])
export type ClassificationStatus = z.infer<typeof classificationStatusSchema>

/**
 * Screenshot content categories.
 *
 * Story 20.1: Classification Service Architecture
 * Story 20.2: Basic Category Taxonomy (preview - full implementation in 20.2)
 *
 * Family-friendly category labels (not judgment-laden).
 */
export const CATEGORY_VALUES = [
  'Homework',
  'Educational',
  'Social Media',
  'Gaming',
  'Entertainment',
  'Communication',
  'Creative',
  'Shopping',
  'News',
  'Other',
] as const

export const categorySchema = z.enum(CATEGORY_VALUES)
export type Category = z.infer<typeof categorySchema>

/**
 * Story 20.4: Multi-Label Classification - AC2
 * Secondary category with its own confidence score.
 */
export const secondaryCategorySchema = z.object({
  /** Category name */
  category: categorySchema,
  /** Confidence score (0-100) for this secondary category */
  confidence: z.number().min(0).max(100),
})
export type SecondaryCategory = z.infer<typeof secondaryCategorySchema>

// ============================================================================
// Concerning Content Detection (Epic 21)
// ============================================================================

/**
 * Story 21.1: Concerning Content Categories - AC2
 * Categories for concerning content that may need parent attention.
 * These are SEPARATE from basic categories and can coexist (AC3).
 */
export const CONCERN_CATEGORY_VALUES = [
  'Violence',
  'Adult Content',
  'Bullying',
  'Self-Harm Indicators',
  'Explicit Language',
  'Unknown Contacts',
] as const

/**
 * Story 21.1: Concerning Content Categories - AC2
 * Schema for concern category enum validation.
 */
export const concernCategorySchema = z.enum(CONCERN_CATEGORY_VALUES)
export type ConcernCategory = z.infer<typeof concernCategorySchema>

/**
 * Story 21.1: Concerning Content Categories - AC4
 * Severity levels for concerning content.
 * - low: Minor concern, may warrant discussion
 * - medium: Moderate concern, should be reviewed
 * - high: Serious concern, needs immediate attention
 */
export const concernSeveritySchema = z.enum(['low', 'medium', 'high'])
export type ConcernSeverity = z.infer<typeof concernSeveritySchema>

/**
 * Story 21.1: Concerning Content Categories - AC1, AC4, AC5
 * A flag indicating concerning content detected in a screenshot.
 * Stored separately from basic classification (AC3).
 */
export const concernFlagSchema = z.object({
  /** The type of concerning content detected */
  category: concernCategorySchema,
  /** Severity level of the concern */
  severity: concernSeveritySchema,
  /** Confidence score (0-100) for this concern detection */
  confidence: z.number().min(0).max(100),
  /** AI reasoning explaining why this content was flagged (AC5) */
  reasoning: z.string(),
  /** When the concern was detected (epoch ms) */
  detectedAt: z.number(),
})
export type ConcernFlag = z.infer<typeof concernFlagSchema>

/**
 * Story 21.2: Distress Detection Suppression (FR21A) - AC2
 * Flag status values for concern flag lifecycle.
 * - pending: Flag awaiting parent review
 * - sensitive_hold: Flag suppressed due to distress content (not visible to parents)
 * - reviewed: Parent has reviewed the flag
 * - dismissed: Parent dismissed the flag as false positive
 * - released: Previously suppressed flag released for parent review
 */
export const FLAG_STATUS_VALUES = [
  'pending',
  'sensitive_hold',
  'reviewed',
  'dismissed',
  'released',
] as const
export const flagStatusSchema = z.enum(FLAG_STATUS_VALUES)
export type FlagStatus = z.infer<typeof flagStatusSchema>

/**
 * Story 21.2: Distress Detection Suppression (FR21A) - AC5
 * Reasons for suppressing a concern flag from parent visibility.
 * - self_harm_detected: Self-harm indicators found in content
 * - crisis_url_visited: Screenshot from crisis resource website
 * - distress_signals: Other distress indicators detected
 */
export const SUPPRESSION_REASON_VALUES = [
  'self_harm_detected',
  'crisis_url_visited',
  'distress_signals',
] as const
export const suppressionReasonSchema = z.enum(SUPPRESSION_REASON_VALUES)
export type SuppressionReason = z.infer<typeof suppressionReasonSchema>

/**
 * Story 21.2: Distress Detection Suppression (FR21A) - AC2
 * Extended concern flag with suppression support.
 * Used when a concern flag is suppressed from parent visibility.
 */
export const suppressedConcernFlagSchema = concernFlagSchema.extend({
  /** Current status of the flag */
  status: flagStatusSchema.default('pending'),
  /** Reason for suppression (only set if status is sensitive_hold) */
  suppressionReason: suppressionReasonSchema.optional(),
  /** When the flag may be released to parent (epoch ms) */
  releasableAfter: z.number().optional(),
})
export type SuppressedConcernFlag = z.infer<typeof suppressedConcernFlagSchema>

/**
 * Story 21.2: Distress Detection Suppression (FR21A) - AC5
 * Audit log for suppressed alerts (internal use only, not visible to parents).
 * Stored in /suppressionAudit/{logId} collection.
 */
export const distressSuppressionLogSchema = z.object({
  /** Unique log ID */
  id: z.string(),
  /** Screenshot that triggered the suppression */
  screenshotId: z.string(),
  /** Child whose content was flagged */
  childId: z.string(),
  /** Family ID for context */
  familyId: z.string(),
  /** Category of concern that was detected */
  concernCategory: concernCategorySchema,
  /** Severity of the detected concern */
  severity: concernSeveritySchema,
  /** Reason for suppression */
  suppressionReason: suppressionReasonSchema,
  /** When suppression occurred (epoch ms) */
  timestamp: z.number(),
  /** When the flag may be released to parent (epoch ms) */
  releasableAfter: z.number().optional(),
  /** Whether flag was eventually released */
  released: z.boolean().default(false),
  /** When flag was released (epoch ms) */
  releasedAt: z.number().optional(),
})
export type DistressSuppressionLog = z.infer<typeof distressSuppressionLogSchema>

/**
 * Story 21.3: False Positive Throttling - AC4
 * Throttle levels for flag alerts per child per day.
 * - minimal: 1 alert/day (only critical alerts)
 * - standard: 3 alerts/day (balanced approach, default)
 * - detailed: 5 alerts/day (more visibility)
 * - all: No throttling (receive all alerts)
 */
export const FLAG_THROTTLE_LEVELS = ['minimal', 'standard', 'detailed', 'all'] as const
export const flagThrottleLevelSchema = z.enum(FLAG_THROTTLE_LEVELS)
export type FlagThrottleLevel = z.infer<typeof flagThrottleLevelSchema>

/**
 * Story 21.3: False Positive Throttling - AC1, AC4
 * Mapping of throttle levels to maximum alerts per day.
 */
export const FLAG_THROTTLE_LIMITS: Record<FlagThrottleLevel, number> = {
  minimal: 1,
  standard: 3,
  detailed: 5,
  all: Infinity,
} as const

/**
 * Story 21.3: False Positive Throttling - AC1, AC2, AC6
 * State tracking for daily flag throttle counts per child.
 * Stored at families/{familyId}/flagThrottleState/{childId}
 */
export const flagThrottleStateSchema = z.object({
  /** Child ID this state belongs to */
  childId: z.string(),
  /** Family ID for context */
  familyId: z.string(),
  /** Date in YYYY-MM-DD format for daily reset */
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  /** Number of alerts sent today */
  alertsSentToday: z.number().default(0),
  /** Number of flags throttled today (AC6) */
  throttledToday: z.number().default(0),
  /** IDs of flags that were alerted (for deduplication) */
  alertedFlagIds: z.array(z.string()).default([]),
  /** Count of alerts by severity for priority tracking (AC2) */
  severityCounts: z
    .object({
      high: z.number().default(0),
      medium: z.number().default(0),
      low: z.number().default(0),
    })
    .default({ high: 0, medium: 0, low: 0 }),
})
export type FlagThrottleState = z.infer<typeof flagThrottleStateSchema>

/**
 * Story 21.3: False Positive Throttling - AC5, AC6
 * Extended concern flag with throttle metadata.
 * Throttled flags are stored but not alerted.
 */
export const throttledConcernFlagSchema = concernFlagSchema.extend({
  /** Current status of the flag */
  status: flagStatusSchema.default('pending'),
  /** Whether alert for this flag was throttled */
  throttled: z.boolean().default(false),
  /** When the flag was throttled (epoch ms) */
  throttledAt: z.number().optional(),
  /** Suppression fields from 21-2 */
  suppressionReason: suppressionReasonSchema.optional(),
  releasableAfter: z.number().optional(),
})
export type ThrottledConcernFlag = z.infer<typeof throttledConcernFlagSchema>

// ============================================================================
// Confidence Threshold Configuration (Story 21.4)
// ============================================================================

/**
 * Story 21.4: Concern Confidence Thresholds - AC2, AC3
 * Confidence threshold sensitivity levels.
 * Controls minimum confidence required to create concern flags.
 * - sensitive: 60% - flags more concerns, may have more false positives
 * - balanced: 75% - default, balanced approach
 * - relaxed: 90% - fewer flags, higher confidence required
 */
export const CONFIDENCE_THRESHOLD_LEVELS = ['sensitive', 'balanced', 'relaxed'] as const
export const confidenceThresholdLevelSchema = z.enum(CONFIDENCE_THRESHOLD_LEVELS)
export type ConfidenceThresholdLevel = z.infer<typeof confidenceThresholdLevelSchema>

/**
 * Story 21.4: Concern Confidence Thresholds - AC2, AC3
 * Mapping of threshold levels to minimum confidence percentages.
 */
export const CONFIDENCE_THRESHOLD_VALUES: Record<ConfidenceThresholdLevel, number> = {
  sensitive: 60,
  balanced: 75,
  relaxed: 90,
} as const

/**
 * Story 21.4: Concern Confidence Thresholds - AC5
 * Safety threshold - concerns at or above this confidence ALWAYS flag.
 * Even if parent sets relaxed (90%), a 95%+ confidence concern will be flagged.
 * This is an immutable safety measure to prevent missing critical concerns.
 */
export const ALWAYS_FLAG_THRESHOLD = 95 as const

/**
 * Story 21.4: Concern Confidence Thresholds - AC4
 * Per-category confidence threshold overrides.
 * Allows fine-grained control over which categories are more/less sensitive.
 * Values must be between 50 (minimum useful threshold) and 94 (below ALWAYS_FLAG_THRESHOLD).
 */
export const categoryConfidenceThresholdsSchema = z
  .record(concernCategorySchema, z.number().min(50).max(94))
  .optional()
export type CategoryConfidenceThresholds = z.infer<typeof categoryConfidenceThresholdsSchema>

// ============================================================================
// Flag Document Schema (Story 21.5)
// ============================================================================

/**
 * Story 22.3: Flag Actions - AC6
 * Audit trail entry for flag actions.
 * Tracks parent actions with timestamps for history.
 */
export const flagActionTypeSchema = z.enum([
  'dismiss',
  'discuss',
  'escalate',
  'view',
  'discussed_together',
  'correct', // Story 24.1: Parent classification correction
])
export type FlagActionType = z.infer<typeof flagActionTypeSchema>

export const flagAuditEntrySchema = z.object({
  /** Action type taken */
  action: flagActionTypeSchema,
  /** Parent ID who took action */
  parentId: z.string(),
  /** Parent display name */
  parentName: z.string(),
  /** When action was taken (epoch ms) */
  timestamp: z.number(),
  /** Optional note added with action */
  note: z.string().optional(),
})
export type FlagAuditEntry = z.infer<typeof flagAuditEntrySchema>

/**
 * Story 22.4: Flag Discussion Notes - AC5
 * Discussion note added by parent.
 * Multiple notes can be added over time.
 */
export const flagNoteSchema = z.object({
  /** Unique note ID (UUID) */
  id: z.string(),
  /** Note content text */
  content: z.string().min(1).max(2000),
  /** Parent ID who wrote note */
  authorId: z.string(),
  /** Parent display name */
  authorName: z.string(),
  /** When note was created (epoch ms) */
  timestamp: z.number(),
})
export type FlagNote = z.infer<typeof flagNoteSchema>

/**
 * Story 23.1: Flag Notification to Child - AC1
 * Story 23.2: Child Annotation Interface - AC4, AC5
 * Story 23.3: Annotation Timer and Escalation - AC1
 * Status of child notification for a flag.
 * - pending: Notification queued but not yet sent
 * - notified: Child has been notified, waiting for annotation
 * - skipped: Notification skipped (distress suppression or other reason)
 * - annotated: Child has submitted annotation
 * - expired: Annotation window expired without response
 */
export const childNotificationStatusSchema = z.enum([
  'pending',
  'notified',
  'skipped',
  'annotated',
  'expired',
])
export type ChildNotificationStatus = z.infer<typeof childNotificationStatusSchema>

/**
 * Story 23.3: Annotation Timer and Escalation - AC1, AC2
 * Reason why flag was escalated to parent.
 * - timeout: Child did not respond within annotation window
 * - skipped: Child explicitly skipped annotation
 */
export const escalationReasonSchema = z.enum(['timeout', 'skipped'])
export type EscalationReason = z.infer<typeof escalationReasonSchema>

/**
 * Story 23.2: Child Annotation Interface - AC2 (NFR152)
 * Pre-set annotation options for child to explain flagged content.
 */
export const ANNOTATION_OPTIONS = [
  { value: 'school_project', label: 'School project', icon: '📚' },
  { value: 'friend_showing', label: 'Friend was showing me', icon: '👥' },
  { value: 'accident', label: "Didn't mean to see this", icon: '😅' },
  { value: 'other', label: 'Other', icon: '💬' },
] as const

export const ANNOTATION_OPTION_VALUES = [
  'school_project',
  'friend_showing',
  'accident',
  'other',
  'skipped',
] as const
export const annotationOptionSchema = z.enum(ANNOTATION_OPTION_VALUES)
export type AnnotationOption = z.infer<typeof annotationOptionSchema>

/**
 * Story 23.2: Child Annotation Interface - AC3
 * Maximum length for free-text explanation.
 */
export const MAX_ANNOTATION_EXPLANATION_LENGTH = 500

/**
 * Story 23.1: Flag Notification to Child - AC5
 * 30-minute annotation window constant (in milliseconds).
 */
export const ANNOTATION_WINDOW_MS = 30 * 60 * 1000 // 30 minutes

/**
 * Story 23.3: Annotation Timer and Escalation - AC5
 * 15-minute extension window constant (in milliseconds).
 * Child can request this extension once per flag.
 */
export const EXTENSION_WINDOW_MS = 15 * 60 * 1000 // 15 minutes

/**
 * Story 21.5: Flag Creation and Storage - AC1, AC2
 * Flag document stored in /children/{childId}/flags/{flagId}
 * Provides dedicated queryable storage for concern flags.
 */
export const flagDocumentSchema = z.object({
  /** Unique flag ID: {screenshotId}_{category}_{timestamp} */
  id: z.string(),
  /** Child ID for reference (also in path) */
  childId: z.string(),
  /** Family ID for security rules */
  familyId: z.string(),
  /** Path to screenshot document: children/{childId}/screenshots/{screenshotId} */
  screenshotRef: z.string(),
  /** Screenshot ID for direct reference */
  screenshotId: z.string(),
  /** The type of concerning content detected */
  category: concernCategorySchema,
  /** Severity level of the concern */
  severity: concernSeveritySchema,
  /** Confidence score (0-100) for this concern detection */
  confidence: z.number().min(0).max(100),
  /** AI reasoning explaining why this content was flagged */
  reasoning: z.string(),
  /** When the flag was created (epoch ms) */
  createdAt: z.number(),
  /** Current status of the flag */
  status: flagStatusSchema.default('pending'),

  // Suppression fields (from Story 21-2)
  /** Reason for suppression (only set if status is sensitive_hold) */
  suppressionReason: suppressionReasonSchema.optional(),
  /** When the flag may be released to parent (epoch ms) */
  releasableAfter: z.number().optional(),

  // Throttle fields (from Story 21-3)
  /** Whether alert for this flag was throttled */
  throttled: z.boolean().default(false),
  /** When the flag was throttled (epoch ms) */
  throttledAt: z.number().optional(),

  // Feedback fields (from Story 21-7)
  /** Parent feedback on flag accuracy */
  feedbackRating: z.enum(['helpful', 'not_helpful', 'false_positive']).optional(),
  /** Optional comment explaining feedback */
  feedbackComment: z.string().max(500).optional(),
  /** When feedback was provided (epoch ms) */
  feedbackAt: z.number().optional(),
  /** User ID who reviewed this flag */
  reviewedBy: z.string().optional(),
  /** When the flag was reviewed (epoch ms) */
  reviewedAt: z.number().optional(),

  // Action fields (from Story 22-3)
  /** Note added with last action */
  actionNote: z.string().optional(),
  /** Audit trail of actions taken on this flag */
  auditTrail: z.array(flagAuditEntrySchema).optional(),

  // Notes fields (from Story 22-4)
  /** Discussion notes added by parents */
  notes: z.array(flagNoteSchema).optional(),

  // Co-parent visibility fields (from Story 22-6)
  /** Array of parent IDs who have viewed this flag */
  viewedBy: z.array(z.string()).optional(),

  // Child notification fields (from Story 23-1)
  /** When child was notified about this flag (epoch ms) */
  childNotifiedAt: z.number().optional(),
  /** When annotation window expires (epoch ms) - createdAt + 30 minutes */
  annotationDeadline: z.number().optional(),
  /** Status of child notification: pending, notified, skipped, or annotated */
  childNotificationStatus: childNotificationStatusSchema.optional(),

  // Child annotation fields (from Story 23-2)
  /** Selected annotation option: school_project, friend_showing, accident, other, or skipped */
  childAnnotation: annotationOptionSchema.optional(),
  /** Free-text explanation from child (optional, max 500 chars) */
  childExplanation: z.string().max(MAX_ANNOTATION_EXPLANATION_LENGTH).optional(),
  /** When child submitted annotation (epoch ms) */
  annotatedAt: z.number().optional(),

  // Escalation fields (from Story 23-3)
  /** When annotation window expired and flag was released to parent (epoch ms) */
  escalatedAt: z.number().optional(),
  /** Reason why flag was escalated: timeout (window expired) or skipped (child chose not to annotate) */
  escalationReason: escalationReasonSchema.optional(),
  /** When child requested 15-minute extension (epoch ms) */
  extensionRequestedAt: z.number().optional(),
  /** New deadline after extension granted (epoch ms) */
  extensionDeadline: z.number().optional(),
  /** When parent was notified about this flag (epoch ms) */
  parentNotifiedAt: z.number().optional(),

  // Correction fields (from Story 24-1)
  /** Story 24.1: Corrected category if parent disagreed with AI classification */
  correctedCategory: concernCategorySchema.optional(),
  /** Story 24.1: Parent ID who made the correction */
  correctionParentId: z.string().optional(),
  /** Story 24.1: When correction was made (epoch ms) */
  correctedAt: z.number().optional(),

  // Friction marker fields (from Story 27.5.3)
  /** Story 27.5.3: Whether this flag caused a difficult conversation */
  causedDifficultConversation: z.boolean().optional(),
  /** Story 27.5.3: When friction was marked (epoch ms) */
  frictionMarkedAt: z.number().optional(),
  /** Story 27.5.3: Parent ID who marked the friction */
  frictionMarkedBy: z.string().optional(),
})
export type FlagDocument = z.infer<typeof flagDocumentSchema>

/**
 * Story 21.7: Flag Accuracy Feedback Loop
 * Valid feedback ratings for flags.
 */
export const FLAG_FEEDBACK_VALUES = ['helpful', 'not_helpful', 'false_positive'] as const
export type FlagFeedbackRating = (typeof FLAG_FEEDBACK_VALUES)[number]

/**
 * Story 21.7: Flag Accuracy Feedback Loop
 * Parameters for updating flag with parent feedback.
 */
export interface UpdateFlagFeedbackParams {
  /** Rating of flag accuracy */
  feedbackRating: FlagFeedbackRating
  /** Optional comment explaining feedback */
  feedbackComment?: string
  /** User ID providing feedback */
  reviewedBy: string
}

/**
 * Story 21.5: Flag Creation and Storage - AC1
 * Parameters for creating a new flag document.
 */
export interface CreateFlagParams {
  childId: string
  familyId: string
  screenshotId: string
  category: ConcernCategory
  severity: ConcernSeverity
  confidence: number
  reasoning: string
  status?: FlagStatus
  suppressionReason?: SuppressionReason
  releasableAfter?: number
  throttled?: boolean
  throttledAt?: number
}

/**
 * Classification result stored on screenshot document.
 *
 * Story 20.1: Classification Service Architecture - AC4
 * Story 20.2: Basic Category Taxonomy - AC5, AC6
 * Story 20.3: Confidence Score Assignment - AC4, AC6
 * Story 20.4: Multi-Label Classification - AC1, AC2, AC3
 * Fields added to Firestore screenshot document after classification.
 */
export const classificationResultSchema = z.object({
  /** Current classification status */
  status: classificationStatusSchema,
  /** Primary category assigned to screenshot */
  primaryCategory: categorySchema.optional(),
  /** Confidence score (0-100) for primary category */
  confidence: z.number().min(0).max(100).optional(),
  /** When classification was completed (epoch ms) */
  classifiedAt: z.number().optional(),
  /** Model version used for classification */
  modelVersion: z.string().optional(),
  /** Error message if classification failed */
  error: z.string().optional(),
  /** Number of retry attempts */
  retryCount: z.number().default(0),
  /**
   * Story 20.2: Basic Category Taxonomy - AC6
   * True when all category confidences were below LOW_CONFIDENCE_THRESHOLD.
   * Screenshot was assigned to "Other" as a fallback.
   */
  isLowConfidence: z.boolean().optional(),
  /**
   * Story 20.2: Basic Category Taxonomy - AC5
   * Taxonomy version used for classification (for migration support).
   */
  taxonomyVersion: z.string().optional(),
  /**
   * Story 20.3: Confidence Score Assignment - AC4
   * True when classification needs manual review due to low confidence.
   * Set when confidence < 60% OR isLowConfidence=true.
   * Low-confidence classifications don't trigger automated actions (AC6).
   */
  needsReview: z.boolean().optional(),
  /**
   * Story 20.4: Multi-Label Classification - AC2, AC3
   * Secondary categories with confidence > 50%, max 2 entries.
   * Empty array if no secondary categories qualify.
   */
  secondaryCategories: z.array(secondaryCategorySchema).max(2).optional(),
  /**
   * Story 21.1: Concerning Content Categories - AC3
   * Concern flags detected in the screenshot, stored alongside basic classification.
   * Concerns are SEPARATE from categories - a "Gaming" screenshot can have Violence concerns.
   */
  concernFlags: z.array(concernFlagSchema).optional(),
  /**
   * Story 21.1: Concerning Content Categories - AC4
   * Concern taxonomy version used for detection.
   */
  concernTaxonomyVersion: z.string().optional(),
  /**
   * Story 21.2: Distress Detection Suppression (FR21A) - AC3
   * True when screenshot URL was from a crisis resource.
   * When true, no concern flags are created and no parent alerts are sent.
   */
  crisisProtected: z.boolean().optional(),
})
export type ClassificationResult = z.infer<typeof classificationResultSchema>

// ============================================================================
// EPIC 28: AI-GENERATED SCREENSHOT DESCRIPTIONS
// Story 28.1: AI Description Generation
// ============================================================================

/**
 * Description generation status.
 * Story 28.1: AI Description Generation - AC4, AC5
 */
export const descriptionStatusSchema = z.enum(['pending', 'processing', 'completed', 'failed'])
export type DescriptionStatus = z.infer<typeof descriptionStatusSchema>

/**
 * AI-generated screenshot description for accessibility.
 * Story 28.1: AI Description Generation - AC1, AC2, AC3, AC5
 *
 * Provides natural language descriptions of screenshot content
 * for blind or visually impaired parents using screen readers.
 */
export const screenshotDescriptionSchema = z.object({
  /** Generation status */
  status: descriptionStatusSchema,
  /** Natural language description of screenshot content (AC1, AC2) */
  description: z.string().optional(),
  /** Word count for monitoring (AC3: 100-300 words) */
  wordCount: z.number().optional(),
  /** When generation completed */
  generatedAt: z.number().optional(),
  /** Model version used */
  modelVersion: z.string().optional(),
  /** Error message if failed */
  error: z.string().optional(),
  /** Retry count */
  retryCount: z.number().default(0),
})
export type ScreenshotDescription = z.infer<typeof screenshotDescriptionSchema>

/**
 * Description generation configuration constants.
 * Story 28.1: AI Description Generation - AC3, AC6
 */
export const DESCRIPTION_CONFIG = {
  /** Maximum time for description generation (NFR47: 60 seconds) */
  TIMEOUT_MS: 60000,
  /** Maximum retry attempts */
  MAX_RETRIES: 3,
  /** Minimum word count for description (AC3) */
  MIN_WORDS: 100,
  /** Maximum word count for description (AC3) */
  MAX_WORDS: 300,
  /** Retry base delay (ms) */
  RETRY_BASE_DELAY_MS: 1000,
}

/**
 * Classification job input for Cloud Tasks queue.
 *
 * Story 20.1: Classification Service Architecture - AC5
 * Payload structure for queued classification jobs.
 */
export const classificationJobSchema = z.object({
  /** Child ID for screenshot lookup */
  childId: z.string(),
  /** Screenshot ID to classify */
  screenshotId: z.string(),
  /** Firebase Storage path to image */
  storagePath: z.string(),
  /** Page URL for context hints */
  url: z.string().optional(),
  /** Page title for context hints */
  title: z.string().optional(),
  /** Family ID for rate limiting */
  familyId: z.string(),
  /** Current retry count */
  retryCount: z.number().default(0),
})
export type ClassificationJob = z.infer<typeof classificationJobSchema>

/**
 * Classification configuration constants.
 *
 * Story 20.1: Classification Service Architecture - AC3, AC6
 */
export const CLASSIFICATION_CONFIG = {
  /** Maximum time for classification (NFR3: 30 seconds) */
  TIMEOUT_MS: 30000,
  /** Maximum retry attempts */
  MAX_RETRIES: 3,
  /** Exponential backoff base delay (ms) */
  RETRY_BASE_DELAY_MS: 1000,
  /** Cloud Tasks queue name */
  QUEUE_NAME: 'screenshot-classification',
  /** Gemini model to use */
  MODEL_NAME: 'gemini-1.5-flash',
  /** Vertex AI location */
  LOCATION: 'us-central1',
} as const

/**
 * Calculate exponential backoff delay.
 *
 * Story 20.1: Classification Service Architecture - AC6
 * Calculates delay for retry attempt using exponential backoff.
 *
 * @param retryCount - Current retry attempt (0-based)
 * @returns Delay in milliseconds (1s, 2s, 4s)
 */
export function calculateBackoffDelay(retryCount: number): number {
  return CLASSIFICATION_CONFIG.RETRY_BASE_DELAY_MS * Math.pow(2, retryCount)
}

/**
 * Classification debug record for raw AI responses.
 *
 * Story 20.5: Classification Metadata Storage - AC4
 * Stores raw Gemini response for debugging and analysis.
 * Records auto-expire after 30 days via TTL.
 */
export const classificationDebugSchema = z.object({
  /** Screenshot ID this debug record belongs to */
  screenshotId: z.string(),
  /** Child ID for reference */
  childId: z.string(),
  /** When debug record was created (epoch ms) */
  timestamp: z.number(),

  /** Request context sent to AI */
  requestContext: z.object({
    /** Page URL if provided */
    url: z.string().optional(),
    /** Page title if provided */
    title: z.string().optional(),
    /** Image size in bytes */
    imageSize: z.number().optional(),
  }),

  /** Raw JSON response from Gemini (stringified) - basic classification */
  rawResponse: z.string(),

  /** Parsed classification result */
  parsedResult: z.object({
    primaryCategory: categorySchema,
    confidence: z.number().min(0).max(100),
    secondaryCategories: z.array(secondaryCategorySchema).optional(),
    reasoning: z.string().optional(),
  }),

  /**
   * Story 21.1: Concerning Content Categories - AC5
   * Raw JSON response from Gemini for concern detection (stringified)
   */
  concernRawResponse: z.string().optional(),

  /**
   * Story 21.1: Concerning Content Categories - AC5
   * Parsed concern detection result
   */
  concernParsedResult: z
    .object({
      hasConcerns: z.boolean(),
      concerns: z.array(
        z.object({
          category: concernCategorySchema,
          severity: concernSeveritySchema,
          confidence: z.number().min(0).max(100),
          reasoning: z.string(),
        })
      ),
      taxonomyVersion: z.string(),
    })
    .optional(),

  /** Model version used */
  modelVersion: z.string(),
  /** Taxonomy version used */
  taxonomyVersion: z.string(),
  /** Processing time in milliseconds */
  processingTimeMs: z.number().optional(),

  /** Auto-expiry timestamp (epoch ms) - 30 days from creation */
  expiresAt: z.number(),
})
export type ClassificationDebug = z.infer<typeof classificationDebugSchema>

/** Debug record retention period (30 days in milliseconds) */
export const DEBUG_RETENTION_MS = 30 * 24 * 60 * 60 * 1000

// ============================================================================
// Story 24.2: Family-Specific Model Tuning
// ============================================================================

/**
 * Minimum corrections required before applying family bias weights.
 * Story 24.2 - AC4: Minimum corrections threshold
 */
export const MINIMUM_CORRECTIONS_THRESHOLD = 5

/**
 * Family feedback entry for AI learning.
 *
 * Story 24.2: Family-Specific Model Tuning - AC1, AC5
 * Stores individual corrections made by parents for AI learning.
 * Stored at /families/{familyId}/feedback/{feedbackId}
 */
export const familyFeedbackSchema = z.object({
  /** Unique feedback entry ID */
  id: z.string(),
  /** Family this feedback belongs to */
  familyId: z.string(),
  /** Original flag that was corrected */
  flagId: z.string(),
  /** Child the flag was for */
  childId: z.string(),
  /** Original AI-assigned category */
  originalCategory: concernCategorySchema,
  /** Parent's corrected category */
  correctedCategory: concernCategorySchema,
  /** Parent who made the correction */
  correctedBy: z.string(),
  /** When correction was made (epoch ms) */
  correctedAt: z.number(),
  /** Whether this feedback has been processed in bias calculation */
  processed: z.boolean().default(false),
  /** When this feedback was processed (epoch ms) */
  processedAt: z.number().optional(),
})
export type FamilyFeedback = z.infer<typeof familyFeedbackSchema>

/**
 * Correction pattern tracking for bias adjustments.
 *
 * Story 24.2: Family-Specific Model Tuning - AC2
 * Tracks how often specific category corrections occur.
 */
export const correctionPatternSchema = z.object({
  /** Original category that was corrected */
  originalCategory: concernCategorySchema,
  /** Category parent corrected to */
  correctedCategory: concernCategorySchema,
  /** Number of times this pattern has occurred */
  count: z.number().min(0),
  /** Confidence adjustment to apply (negative = reduce false positives) */
  adjustment: z.number().min(-50).max(50),
})
export type CorrectionPattern = z.infer<typeof correctionPatternSchema>

/**
 * Family bias weights for AI model tuning.
 *
 * Story 24.2: Family-Specific Model Tuning - AC2, AC3, AC4
 * Stored at /families/{familyId}/aiSettings/biasWeights
 *
 * When processing screenshots:
 * - If correctionCount < MINIMUM_CORRECTIONS_THRESHOLD: use default model
 * - If correctionCount >= MINIMUM_CORRECTIONS_THRESHOLD: apply adjustments
 */
export const familyBiasWeightsSchema = z.object({
  /** Family this configuration belongs to */
  familyId: z.string(),
  /** Total number of corrections made by this family */
  correctionCount: z.number().default(0),
  /** When weights were last calculated (epoch ms) */
  lastUpdatedAt: z.number(),
  /**
   * Per-category confidence adjustments.
   * Positive = increase sensitivity (more flags)
   * Negative = decrease sensitivity (fewer flags)
   * Range: -50 to +50
   */
  categoryAdjustments: z.record(concernCategorySchema, z.number().min(-50).max(50)).optional(),
  /**
   * Specific correction patterns observed.
   * E.g., if family often corrects Violence → Educational, reduce Violence confidence.
   */
  patterns: z.array(correctionPatternSchema).optional(),
})
export type FamilyBiasWeights = z.infer<typeof familyBiasWeightsSchema>

/**
 * AI learning status for display to parents.
 *
 * Story 24.2: Family-Specific Model Tuning - AC6
 * Used by useFamilyAILearning hook to show learning indicator.
 */
export const aiLearningStatusSchema = z.object({
  /** Whether AI learning is active (has enough corrections) */
  isActive: z.boolean(),
  /** Total corrections made */
  correctionCount: z.number(),
  /** Corrections needed to activate learning */
  correctionsNeeded: z.number(),
  /** When AI model was last adapted (epoch ms) */
  lastAdaptedAt: z.number().optional(),
  /** Categories with active adjustments */
  adjustedCategories: z.array(concernCategorySchema).optional(),
})
export type AILearningStatus = z.infer<typeof aiLearningStatusSchema>

/**
 * Category improvement detail for learning dashboard.
 *
 * Story 24.4: Learning Progress Dashboard - AC2
 */
export const categoryImprovementSchema = z.object({
  category: concernCategorySchema,
  adjustment: z.number(),
  description: z.string(),
})
export type CategoryImprovement = z.infer<typeof categoryImprovementSchema>

/**
 * Learned pattern for display on dashboard.
 *
 * Story 24.4: Learning Progress Dashboard - AC3
 */
export const learnedPatternSchema = z.object({
  description: z.string(),
  category: concernCategorySchema,
  count: z.number(),
})
export type LearnedPattern = z.infer<typeof learnedPatternSchema>

/**
 * Learning dashboard data for parent display.
 *
 * Story 24.4: Learning Progress Dashboard - AC1, AC2, AC3, AC4
 * Shows how AI has learned from parent corrections.
 */
export const learningDashboardDataSchema = z.object({
  /** Total corrections made by the family */
  totalCorrections: z.number(),
  /** Corrections that resulted in model adjustments */
  appliedCorrections: z.number(),
  /** Recent corrections not yet processed */
  pendingCorrections: z.number(),

  /** Estimated accuracy improvement percentage (0-30) */
  accuracyImprovement: z.number(),
  /** Per-category improvements */
  improvementCategories: z.array(categoryImprovementSchema),

  /** Top learned patterns for display */
  learnedPatterns: z.array(learnedPatternSchema),

  /** Whether learning is active (has enough corrections) */
  isLearningActive: z.boolean(),
  /** When AI model was last adapted (epoch ms) */
  lastAdaptedAt: z.number().optional(),
  /** When next processing will occur (epoch ms) */
  nextProcessingAt: z.number().optional(),
})
export type LearningDashboardData = z.infer<typeof learningDashboardDataSchema>

// ============================================================================
// Story 24.3: Explicit Approval of Categories
// ============================================================================

/**
 * App approval status values.
 *
 * Story 24.3: Explicit Approval of Categories - AC2, AC3, AC4
 * - approved: Parent has approved this app/category - reduce flag sensitivity
 * - disapproved: Parent has disapproved - increase flag sensitivity
 * - neutral: No preference set (default) - use standard thresholds
 */
export const APP_APPROVAL_STATUS_VALUES = ['approved', 'disapproved', 'neutral'] as const
export const appApprovalStatusSchema = z.enum(APP_APPROVAL_STATUS_VALUES)
export type AppApprovalStatus = z.infer<typeof appApprovalStatusSchema>

/**
 * Confidence adjustments applied based on app approval status.
 *
 * Story 24.3: Explicit Approval of Categories - AC3, AC4, AC6
 * - approved: Reduce flagging sensitivity (-20 confidence)
 * - disapproved: Increase flagging sensitivity (+15 confidence)
 * - neutral: No adjustment (0)
 */
export const APP_APPROVAL_ADJUSTMENTS = {
  approved: -20,
  disapproved: 15,
  neutral: 0,
} as const

/**
 * App category approval document schema.
 *
 * Story 24.3: Explicit Approval of Categories
 * Stored at /children/{childId}/appApprovals/{approvalId}
 *
 * Allows parents to set per-app, per-category approval preferences
 * that override default classification thresholds.
 *
 * AC #2: Parent can mark "YouTube Kids = Educational (approved)"
 * AC #5: Preferences stored per-family, per-child
 * AC #7: Child-specific: "Gaming OK for Emma, flag for Jake"
 */
export const appCategoryApprovalSchema = z.object({
  /** Unique approval ID */
  id: z.string(),
  /** Child this approval applies to (AC7: child-specific) */
  childId: z.string(),
  /** Family this child belongs to (for security validation) */
  familyId: z.string(),
  /**
   * App identifier - domain for web, package name or app name for native.
   * Examples: "youtube.com", "com.spotify.music", "tiktok"
   */
  appIdentifier: z.string(),
  /** Human-readable display name for the app */
  appDisplayName: z.string(),
  /**
   * Which concern category this approval applies to.
   * E.g., approving "Violence" for a gaming app.
   */
  category: concernCategorySchema,
  /** Approval status determining threshold adjustment */
  status: appApprovalStatusSchema,
  /** Guardian UID who set this approval (audit trail) */
  setByUid: z.string(),
  /** When approval was created (epoch ms) */
  createdAt: z.number(),
  /** When approval was last updated (epoch ms) */
  updatedAt: z.number(),
  /** Optional notes explaining the approval decision */
  notes: z.string().optional(),
})
export type AppCategoryApproval = z.infer<typeof appCategoryApprovalSchema>

// ============================================================================
// Story 24.5: Global Model Improvement Pipeline
// ============================================================================

/**
 * Global pattern aggregation for model improvement.
 *
 * Story 24.5: Global Model Improvement Pipeline - AC1, AC2, AC3, AC4
 * Aggregates anonymized correction patterns across all participating families.
 * Stored at /globalAggregations/{aggregationId}
 *
 * AC #1: Anonymized - no family identifiers in the document
 * AC #2: Patterns only - no actual images or URLs stored
 * AC #3: >10 corrections threshold for flagging review
 * AC #4: Monthly aggregation processing
 */
export const globalPatternAggregationSchema = z.object({
  /** Unique aggregation ID */
  id: z.string(),
  /** Pattern being corrected - original AI classification */
  originalCategory: concernCategorySchema,
  /** Pattern being corrected - parent's corrected category */
  correctedCategory: concernCategorySchema,
  /** Aggregated counts (across all participating families) */
  totalCorrectionCount: z.number().min(0),
  /** How many unique families made this correction */
  familyCount: z.number().min(0),
  /** True if > 10 corrections - flagged for model team review */
  flaggedForReview: z.boolean(),
  /** When pattern was reviewed by model team (epoch ms) */
  reviewedAt: z.number().optional(),
  /** UID of reviewer who reviewed this pattern */
  reviewedByUid: z.string().optional(),
  /** When this aggregation was created/updated (epoch ms) */
  aggregatedAt: z.number(),
  /** Start of the aggregation period (epoch ms) */
  periodStart: z.number(),
  /** End of the aggregation period (epoch ms) */
  periodEnd: z.number(),
})
export type GlobalPatternAggregation = z.infer<typeof globalPatternAggregationSchema>

/**
 * Global model metrics for tracking improvement over time.
 *
 * Story 24.5: Global Model Improvement Pipeline - AC6
 * Shows overall system improvement from collective learning.
 * Stored at /globalMetrics/{metricsId}
 *
 * AC #6: Track improvement metrics like "Global accuracy +2% this month"
 */
export const globalModelMetricsSchema = z.object({
  /** Unique metrics ID */
  id: z.string(),
  /** Period identifier in YYYY-MM format */
  period: z.string().regex(/^\d{4}-\d{2}$/),
  /** Total corrections aggregated this period */
  totalCorrectionsAggregated: z.number().min(0),
  /** Number of families participating (that didn't opt out) */
  participatingFamilies: z.number().min(0),
  /** Total unique patterns identified */
  patternsIdentified: z.number().min(0),
  /** Patterns that met threshold and were flagged for review */
  patternsFlaggedForReview: z.number().min(0),
  /** Estimated accuracy improvement percentage */
  estimatedAccuracyImprovement: z.number(),
  /** When this metrics document was created (epoch ms) */
  aggregatedAt: z.number(),
})
export type GlobalModelMetrics = z.infer<typeof globalModelMetricsSchema>

/**
 * Family AI settings document schema.
 *
 * Story 24.5: Global Model Improvement Pipeline - AC5
 * Extended to include opt-out capability for global model contribution.
 * Stored at /families/{familyId}/aiSettings/preferences
 */
export const familyAISettingsSchema = z.object({
  /** Family this settings document belongs to */
  familyId: z.string(),
  /**
   * Whether to contribute corrections to global model improvement.
   * Default: true - families contribute by default.
   * AC #5: When false, family's corrections not included in global aggregation.
   */
  contributeToGlobalModel: z.boolean().default(true),
  /** When settings were last updated (epoch ms) */
  updatedAt: z.number(),
  /** UID of guardian who last updated settings */
  updatedByUid: z.string(),
})
export type FamilyAISettings = z.infer<typeof familyAISettingsSchema>

/**
 * Threshold for flagging patterns for model team review.
 * Story 24.5 - AC3: Patterns with >10 corrections flagged
 */
export const GLOBAL_PATTERN_REVIEW_THRESHOLD = 10

/**
 * Notification preferences schema.
 *
 * Story 27.6: Real-Time Access Notifications
 * Stored in user document or at /users/{uid}/settings/notifications
 *
 * AC1: Enable notifications in settings
 * AC3: Notifications off by default
 * AC4: Daily digest option
 * AC5: Child notification option
 * AC6: Quiet hours
 */
export const notificationPreferencesSchema = z.object({
  /** Real-time notifications enabled - AC3: off by default */
  accessNotificationsEnabled: z.boolean().default(false),
  /** Daily digest summary enabled */
  accessDigestEnabled: z.boolean().default(false),
  /** Quiet hours start time in HH:MM format, null if not set */
  quietHoursStart: z
    .string()
    .regex(/^\d{2}:\d{2}$/)
    .nullable()
    .default(null),
  /** Quiet hours end time in HH:MM format, null if not set */
  quietHoursEnd: z
    .string()
    .regex(/^\d{2}:\d{2}$/)
    .nullable()
    .default(null),
  /** For parents: notify when child's data is accessed by other guardians */
  notifyOnChildDataAccess: z.boolean().default(false),
  /** For children: notify when parents view their data */
  notifyOnOwnDataAccess: z.boolean().default(false),
  /** When preferences were last updated (epoch ms) */
  updatedAt: z.number().optional(),
})
export type NotificationPreferences = z.infer<typeof notificationPreferencesSchema>

/**
 * Default notification preferences.
 *
 * Story 27.6 - AC3: All notifications off by default
 */
export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  accessNotificationsEnabled: false,
  accessDigestEnabled: false,
  quietHoursStart: null,
  quietHoursEnd: null,
  notifyOnChildDataAccess: false,
  notifyOnOwnDataAccess: false,
}

/**
 * Access notification event for queuing.
 *
 * Story 27.6: Real-Time Access Notifications
 * Used to track notifications that need to be sent.
 */
export const accessNotificationSchema = z.object({
  /** Unique notification ID */
  id: z.string(),
  /** User to notify */
  recipientUid: z.string(),
  /** Related audit event ID */
  auditEventId: z.string(),
  /** Actor who triggered the access */
  actorUid: z.string(),
  actorDisplayName: z.string(),
  /** What was accessed */
  resourceType: auditResourceTypeSchema,
  childId: z.string().nullable(),
  childName: z.string().nullable(),
  /** Notification message */
  message: z.string(),
  /** When the access occurred (epoch ms) */
  accessTimestamp: z.number(),
  /** When notification was created (epoch ms) */
  createdAt: z.number(),
  /** Whether notification was sent */
  sent: z.boolean().default(false),
  /** When notification was sent (epoch ms) */
  sentAt: z.number().optional(),
  /** Notification type: immediate or digest */
  notificationType: z.enum(['immediate', 'digest']),
})
export type AccessNotification = z.infer<typeof accessNotificationSchema>

// ============================================================================
// EPIC 27.5: FAMILY HEALTH CHECK-INS
// Story 27.5.1: Monthly Health Check-In Prompts
// ============================================================================

/**
 * Check-in frequency options.
 *
 * Story 27.5.1: Monthly Health Check-In Prompts - AC5
 * Configurable frequency for health check-in prompts.
 */
export const checkInFrequencySchema = z.enum(['weekly', 'monthly', 'quarterly'])
export type CheckInFrequency = z.infer<typeof checkInFrequencySchema>

/**
 * Check-in status tracking.
 *
 * Story 27.5.1: Monthly Health Check-In Prompts - AC1
 */
export const checkInStatusSchema = z.enum(['pending', 'completed', 'skipped', 'expired'])
export type CheckInStatus = z.infer<typeof checkInStatusSchema>

/**
 * Check-in rating for quick response.
 *
 * Story 27.5.2: Check-In Response Interface (referenced for AC4)
 */
export const checkInRatingSchema = z.enum(['positive', 'neutral', 'concerned'])
export type CheckInRating = z.infer<typeof checkInRatingSchema>

/**
 * Recipient type for check-ins.
 *
 * Story 27.5.1: Monthly Health Check-In Prompts - AC2, AC3
 */
export const checkInRecipientTypeSchema = z.enum(['guardian', 'child'])
export type CheckInRecipientType = z.infer<typeof checkInRecipientTypeSchema>

/**
 * Check-in response data.
 *
 * Story 27.5.1: Monthly Health Check-In Prompts - AC4
 * Private response that is not visible to other family members.
 */
export const checkInResponseSchema = z.object({
  /** Rating: positive, neutral, or concerned */
  rating: checkInRatingSchema.nullable(),
  /** Follow-up answer based on rating path */
  followUp: z.string().max(500).nullable(),
  /** Optional additional notes */
  additionalNotes: z.string().max(1000).nullable(),
})
export type CheckInResponse = z.infer<typeof checkInResponseSchema>

/**
 * Individual health check-in record.
 *
 * Story 27.5.1: Monthly Health Check-In Prompts
 * Stored at /healthCheckIns/{checkInId}
 *
 * AC1: 30-day eligibility for check-ins
 * AC2: Parent check-in prompts
 * AC3: Child check-in prompts (age-appropriate)
 * AC4: Private responses between parties
 */
export const healthCheckInSchema = z.object({
  /** Unique check-in ID */
  id: z.string(),
  /** Family this check-in belongs to */
  familyId: z.string(),
  /** User receiving this check-in */
  recipientUid: z.string(),
  /** Type of recipient: guardian or child */
  recipientType: checkInRecipientTypeSchema,
  /** For child check-ins, the child's ID */
  childId: z.string().nullable(),
  /** Start of check-in period (epoch ms) */
  periodStart: z.number(),
  /** End of check-in period (epoch ms) */
  periodEnd: z.number(),
  /** Current status of check-in */
  status: checkInStatusSchema,
  /** When prompt was sent (epoch ms) */
  promptSentAt: z.number(),
  /** When reminder was sent (epoch ms), null if not sent */
  reminderSentAt: z.number().nullable(),
  /** When user responded (epoch ms), null if not responded */
  respondedAt: z.number().nullable(),
  /** User's private response */
  response: checkInResponseSchema.nullable(),
  /** When check-in record was created (epoch ms) */
  createdAt: z.number(),
})
export type HealthCheckIn = z.infer<typeof healthCheckInSchema>

/**
 * Family check-in settings.
 *
 * Story 27.5.1: Monthly Health Check-In Prompts - AC5
 * Stored at /families/{familyId}/settings/healthCheckIn
 */
export const checkInSettingsSchema = z.object({
  /** Whether check-ins are enabled for this family */
  enabled: z.boolean().default(true),
  /** Check-in frequency: weekly, monthly, or quarterly */
  frequency: checkInFrequencySchema.default('monthly'),
  /** Start of last check-in period (epoch ms), null if never run */
  lastCheckInPeriodStart: z.number().nullable(),
  /** When next check-in is due (epoch ms), null if not calculated */
  nextCheckInDue: z.number().nullable(),
  /** When settings were last updated (epoch ms) */
  updatedAt: z.number(),
})
export type CheckInSettings = z.infer<typeof checkInSettingsSchema>

/**
 * Default check-in settings.
 *
 * Story 27.5.1 - AC5: Monthly by default, enabled
 */
export const DEFAULT_CHECK_IN_SETTINGS: Omit<CheckInSettings, 'updatedAt'> = {
  enabled: true,
  frequency: 'monthly',
  lastCheckInPeriodStart: null,
  nextCheckInDue: null,
}

/**
 * Check-in frequency intervals in milliseconds.
 *
 * Story 27.5.1: Monthly Health Check-In Prompts - AC5
 */
export const CHECK_IN_FREQUENCY_MS: Record<CheckInFrequency, number> = {
  weekly: 7 * 24 * 60 * 60 * 1000,
  monthly: 30 * 24 * 60 * 60 * 1000,
  quarterly: 90 * 24 * 60 * 60 * 1000,
}

/**
 * Minimum family age before check-ins are enabled.
 *
 * Story 27.5.1: Monthly Health Check-In Prompts - AC1
 * Family must be 30+ days old before first check-in.
 */
export const CHECK_IN_FAMILY_AGE_THRESHOLD_MS = 30 * 24 * 60 * 60 * 1000

/**
 * Reminder delay before sending reminder.
 *
 * Story 27.5.1: Monthly Health Check-In Prompts - AC6
 * Send reminder 3 days after initial prompt if not completed.
 */
export const CHECK_IN_REMINDER_DELAY_MS = 3 * 24 * 60 * 60 * 1000

// ============================================================================
// Story 27.5.6: Resolution Markers
// ============================================================================

/**
 * Resolution marker types.
 *
 * Story 27.5.6: Resolution Markers - AC1
 * Types of resolutions families can mark.
 */
export const resolutionMarkerTypeSchema = z.enum([
  'talked_through',
  'parent_apologized',
  'child_understood',
  'in_progress',
])
export type ResolutionMarkerType = z.infer<typeof resolutionMarkerTypeSchema>

/**
 * Resolution marker type display labels.
 */
export const RESOLUTION_MARKER_LABELS: Record<ResolutionMarkerType, string> = {
  talked_through: 'We talked it through',
  parent_apologized: 'Parent apologized',
  child_understood: 'Child understood',
  in_progress: 'Still working on it',
}

/**
 * Who created the resolution.
 */
export const resolutionCreatorTypeSchema = z.enum(['parent', 'child'])
export type ResolutionCreatorType = z.infer<typeof resolutionCreatorTypeSchema>

/**
 * Resolution schema.
 *
 * Story 27.5.6: Resolution Markers
 * Stored at /families/{familyId}/resolutions/{resolutionId}
 */
export const resolutionSchema = z.object({
  /** Unique resolution ID */
  id: z.string(),
  /** Family this resolution belongs to */
  familyId: z.string(),
  /** UID of who created this resolution */
  createdBy: z.string(),
  /** Whether created by parent or child */
  createdByType: resolutionCreatorTypeSchema,
  /** Display name of creator */
  createdByName: z.string(),
  /** Type of resolution marker */
  markerType: resolutionMarkerTypeSchema,
  /** Optional note */
  note: z.string().optional(),
  /** When created (epoch ms) */
  createdAt: z.number(),
})
export type Resolution = z.infer<typeof resolutionSchema>

/**
 * Accessibility settings schema.
 *
 * Story 28.6: Accessibility Settings
 * User preferences for accessibility features.
 * Stored in user document or separate collection.
 */
export const accessibilitySettingsSchema = z.object({
  /** Always show AI descriptions expanded (AC1) */
  alwaysShowDescriptions: z.boolean().default(false),
  /** Enable high contrast mode for low-vision users (AC2) */
  highContrastMode: z.boolean().default(false),
  /** Use larger text size (AC3) */
  largerText: z.boolean().default(false),
  /** Enable audio descriptions/text-to-speech (AC4) */
  audioDescriptions: z.boolean().default(false),
  /** When settings were last updated (epoch ms) */
  updatedAt: z.number().optional(),
})
export type AccessibilitySettings = z.infer<typeof accessibilitySettingsSchema>

/**
 * Default accessibility settings.
 * Story 28.6: Accessibility Settings
 */
export const DEFAULT_ACCESSIBILITY_SETTINGS: AccessibilitySettings = {
  alwaysShowDescriptions: false,
  highContrastMode: false,
  largerText: false,
  audioDescriptions: false,
}

// ============================================================================
// Screen Time Data Model (Story 29.1)
// ============================================================================

/**
 * Device types supported for screen time tracking.
 * Story 29.1: Screen Time Data Model - AC1
 */
export const screenTimeDeviceTypeSchema = z.enum([
  'chromebook',
  'android',
  'ios',
  'windows',
  'macos',
  'fire_tv',
  'switch',
])
export type ScreenTimeDeviceType = z.infer<typeof screenTimeDeviceTypeSchema>

/**
 * Categories for screen time tracking.
 * Note: Uses lowercase snake_case for programmatic use.
 * These map to CATEGORY_VALUES for display (e.g., 'education' -> 'Educational').
 * Story 29.1: Screen Time Data Model - AC1
 */
export const screenTimeCategorySchema = z.enum([
  'education',
  'social_media',
  'gaming',
  'entertainment',
  'productivity',
  'communication',
  'news',
  'shopping',
  'other',
])
export type ScreenTimeCategory = z.infer<typeof screenTimeCategorySchema>

/** Maximum minutes per day (24 hours) */
export const MAX_SCREEN_TIME_MINUTES_PER_DAY = 1440

/**
 * App usage entry within a category.
 * Story 29.1: Screen Time Data Model - AC1
 */
export const appTimeEntrySchema = z.object({
  /** App or website name */
  appName: z.string(),
  /** Minutes spent in this app (max 1440 = 24 hours) */
  minutes: z.number().int().min(0).max(MAX_SCREEN_TIME_MINUTES_PER_DAY),
})
export type AppTimeEntry = z.infer<typeof appTimeEntrySchema>

/**
 * Per-category time entry within a daily summary.
 * Story 29.1: Screen Time Data Model - AC1, AC4
 */
export const categoryTimeEntrySchema = z.object({
  /** Category of activity */
  category: screenTimeCategorySchema,
  /** Total minutes in this category (max 1440 = 24 hours) */
  minutes: z.number().int().min(0).max(MAX_SCREEN_TIME_MINUTES_PER_DAY),
  /** Top apps in this category (for detailed breakdown) */
  topApps: z.array(appTimeEntrySchema).optional(),
})
export type CategoryTimeEntry = z.infer<typeof categoryTimeEntrySchema>

/**
 * Per-device time entry within a daily summary.
 * Story 29.1: Screen Time Data Model - AC1, AC4
 */
export const deviceTimeEntrySchema = z.object({
  /** Unique device identifier */
  deviceId: z.string(),
  /** Human-readable device name */
  deviceName: z.string(),
  /** Type of device */
  deviceType: screenTimeDeviceTypeSchema,
  /** Total minutes on this device (max 1440 = 24 hours) */
  minutes: z.number().int().min(0).max(MAX_SCREEN_TIME_MINUTES_PER_DAY),
  /** Breakdown by category for this device */
  categories: z.array(categoryTimeEntrySchema).optional(),
})
export type DeviceTimeEntry = z.infer<typeof deviceTimeEntrySchema>

/**
 * Daily screen time summary for a child.
 * Stored at: /families/{familyId}/children/{childId}/screenTime/{date}
 *
 * Story 29.1: Screen Time Data Model - AC1, AC2, AC5, AC6
 */
export const screenTimeDailySummarySchema = z.object({
  /** Child this record belongs to */
  childId: z.string(),
  /** Date in YYYY-MM-DD format (child's local date) - AC2 */
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  /** IANA timezone for the child (e.g., 'America/New_York') - AC5 */
  timezone: z.string(),
  /** Total minutes across all devices (max 1440 = 24 hours) */
  totalMinutes: z.number().int().min(0).max(MAX_SCREEN_TIME_MINUTES_PER_DAY),
  /** Breakdown by device - AC4 */
  devices: z.array(deviceTimeEntrySchema),
  /** Breakdown by category (aggregated across devices) - AC4 */
  categories: z.array(categoryTimeEntrySchema),
  /** When this record was last updated (epoch ms) */
  updatedAt: z.number(),
  /** When this record expires based on retention policy (epoch ms) - AC6 */
  expiresAt: z.number().optional(),
})
export type ScreenTimeDailySummary = z.infer<typeof screenTimeDailySummarySchema>

/** Maximum minutes per week (7 days * 24 hours) */
export const MAX_SCREEN_TIME_MINUTES_PER_WEEK = MAX_SCREEN_TIME_MINUTES_PER_DAY * 7

/**
 * Weekly aggregation for dashboard display.
 * Story 29.1: Screen Time Data Model - AC4
 */
export const screenTimeWeeklySummarySchema = z.object({
  /** Child this record belongs to */
  childId: z.string(),
  /** Week start date (Sunday) in YYYY-MM-DD format */
  weekStartDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  /** IANA timezone for the child */
  timezone: z.string(),
  /** Total minutes for the week (max 10080 = 7 days * 24 hours) */
  totalMinutes: z.number().int().min(0).max(MAX_SCREEN_TIME_MINUTES_PER_WEEK),
  /** Daily totals for each day of the week (Sun-Sat, 7 values) */
  dailyTotals: z.array(z.number().int().min(0).max(MAX_SCREEN_TIME_MINUTES_PER_DAY)).length(7),
  /** Average daily minutes (max 1440 = 24 hours) */
  averageDaily: z.number().min(0).max(MAX_SCREEN_TIME_MINUTES_PER_DAY),
  /** Category breakdown for the week */
  categories: z.array(categoryTimeEntrySchema),
})
export type ScreenTimeWeeklySummary = z.infer<typeof screenTimeWeeklySummarySchema>

/**
 * Screen time entry for individual time tracking records.
 * Used when syncing time data from devices.
 * Story 29.1: Screen Time Data Model - AC1
 */
export const screenTimeEntrySchema = z.object({
  /** Child this entry belongs to */
  childId: z.string(),
  /** Device that recorded this time */
  deviceId: z.string(),
  /** Date in YYYY-MM-DD format (child's local date) */
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  /** IANA timezone for the child */
  timezone: z.string(),
  /** Category of activity */
  appCategory: screenTimeCategorySchema,
  /** Minutes spent (max 1440 = 24 hours) */
  minutes: z.number().int().min(0).max(MAX_SCREEN_TIME_MINUTES_PER_DAY),
  /** Optional app name for detailed tracking */
  appName: z.string().optional(),
  /** When this entry was recorded (epoch ms) */
  recordedAt: z.number(),
})
export type ScreenTimeEntry = z.infer<typeof screenTimeEntrySchema>

// ============================================================================
// TIME LIMITS SCHEMAS - Story 30.1: Time Limit Data Model
// ============================================================================

/**
 * Types of time limits that can be configured.
 * Story 30.1: Time Limit Data Model - AC2
 */
export const timeLimitTypeSchema = z.enum([
  'daily_total', // Total screen time per day across all devices
  'per_device', // Limit per specific device
  'per_category', // Limit per app category
])
export type TimeLimitType = z.infer<typeof timeLimitTypeSchema>

/**
 * Days of the week for schedule configuration.
 * Story 30.1: Time Limit Data Model - AC3
 */
export const dayOfWeekSchema = z.enum([
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
])
export type DayOfWeek = z.infer<typeof dayOfWeekSchema>

/**
 * Schedule type for simplified configuration.
 * Story 30.1: Time Limit Data Model - AC3
 */
export const scheduleTypeSchema = z.enum([
  'weekdays', // Monday-Friday
  'weekends', // Saturday-Sunday
  'school_days', // Custom school day configuration
  'all_days', // Same limit every day
  'custom', // Per-day configuration
])
export type ScheduleType = z.infer<typeof scheduleTypeSchema>

/**
 * Custom per-day limits configuration.
 * Uses explicit object shape for full type safety.
 * Story 30.1: Time Limit Data Model - AC3
 */
const minutesPerDaySchema = z.number().int().min(0).max(MAX_SCREEN_TIME_MINUTES_PER_DAY)
export const customDaysSchema = z.object({
  sunday: minutesPerDaySchema.optional(),
  monday: minutesPerDaySchema.optional(),
  tuesday: minutesPerDaySchema.optional(),
  wednesday: minutesPerDaySchema.optional(),
  thursday: minutesPerDaySchema.optional(),
  friday: minutesPerDaySchema.optional(),
  saturday: minutesPerDaySchema.optional(),
})
export type CustomDays = z.infer<typeof customDaysSchema>

/**
 * Schedule configuration for time limits.
 * Supports weekday/weekend differences and custom per-day limits.
 * Story 30.1: Time Limit Data Model - AC3
 */
export const timeLimitScheduleSchema = z
  .object({
    /** Type of schedule */
    scheduleType: scheduleTypeSchema,
    /** Minutes limit for weekdays (Mon-Fri), max 1440 = 24 hours */
    weekdayMinutes: z.number().int().min(0).max(MAX_SCREEN_TIME_MINUTES_PER_DAY).optional(),
    /** Minutes limit for weekends (Sat-Sun), max 1440 = 24 hours */
    weekendMinutes: z.number().int().min(0).max(MAX_SCREEN_TIME_MINUTES_PER_DAY).optional(),
    /** Per-day limits for custom schedules, max 1440 = 24 hours per day */
    customDays: customDaysSchema.optional(),
    /** Whether this category has no limit (unlimited) */
    unlimited: z.boolean().optional(),
  })
  .refine(
    (data) => {
      // 'custom' scheduleType requires customDays with at least one day defined
      if (data.scheduleType === 'custom') {
        if (!data.customDays) return false
        return Object.values(data.customDays).some((v) => v !== undefined)
      }
      return true
    },
    {
      message: "scheduleType 'custom' requires customDays with at least one day defined",
      path: ['customDays'],
    }
  )
  .refine(
    (data) => {
      // Non-custom schedules should have weekdayMinutes, weekendMinutes, or unlimited flag
      if (['weekdays', 'weekends', 'school_days', 'all_days'].includes(data.scheduleType)) {
        return (
          data.weekdayMinutes !== undefined ||
          data.weekendMinutes !== undefined ||
          data.unlimited === true
        )
      }
      return true
    },
    {
      message: 'Non-custom schedules require weekdayMinutes, weekendMinutes, or unlimited flag',
      path: ['scheduleType'],
    }
  )
export type TimeLimitSchedule = z.infer<typeof timeLimitScheduleSchema>

/**
 * Per-category limit configuration within child time limits.
 * Story 30.1: Time Limit Data Model - AC1
 */
export const categoryLimitSchema = z.object({
  /** Category this limit applies to */
  category: screenTimeCategorySchema,
  /** Schedule configuration for this category */
  schedule: timeLimitScheduleSchema,
})
export type CategoryLimit = z.infer<typeof categoryLimitSchema>

/**
 * Per-device limit configuration within child time limits.
 * Story 30.1: Time Limit Data Model - AC1
 */
export const deviceLimitSchema = z.object({
  /** Device ID this limit applies to */
  deviceId: z.string(),
  /** Human-readable device name */
  deviceName: z.string(),
  /** Device type */
  deviceType: screenTimeDeviceTypeSchema.optional(),
  /** Schedule configuration for this device */
  schedule: timeLimitScheduleSchema,
  /** Category overrides for this specific device */
  categoryOverrides: z.array(categoryLimitSchema).optional(),
})
export type DeviceLimit = z.infer<typeof deviceLimitSchema>

/**
 * Individual time limit configuration.
 * Can represent daily total, per-device, or per-category limits.
 * Story 30.1: Time Limit Data Model - AC1, AC2, AC6
 *
 * Validation rules:
 * - effectiveFrom must be before effectiveUntil (if both provided)
 * - per_category limits require category field
 * - per_device limits require deviceId field
 * - daily_total limits should not have category or deviceId
 */
export const timeLimitSchema = z
  .object({
    /** Type of limit */
    limitType: timeLimitTypeSchema,
    /** Category for per_category limits (required when limitType is per_category) */
    category: screenTimeCategorySchema.optional(),
    /** Device ID for per_device limits (required when limitType is per_device) */
    deviceId: z.string().optional(),
    /** Schedule configuration */
    schedule: timeLimitScheduleSchema,
    /** When this limit becomes effective (epoch ms, inclusive) - AC6 */
    effectiveFrom: z.number().optional(),
    /** When this limit expires (epoch ms, exclusive) - AC6 */
    effectiveUntil: z.number().optional(),
    /** Whether limit is currently active */
    isActive: z.boolean().default(true),
    /** Created timestamp (epoch ms) */
    createdAt: z.number(),
    /** Last updated timestamp (epoch ms) */
    updatedAt: z.number(),
  })
  .refine(
    (data) => {
      // effectiveFrom must be before effectiveUntil (if both provided)
      if (data.effectiveFrom !== undefined && data.effectiveUntil !== undefined) {
        return data.effectiveFrom < data.effectiveUntil
      }
      return true
    },
    {
      message: 'effectiveFrom must be before effectiveUntil',
      path: ['effectiveUntil'],
    }
  )
  .refine(
    (data) => {
      // per_category limits require category field
      if (data.limitType === 'per_category') {
        return data.category !== undefined
      }
      return true
    },
    {
      message: 'per_category limits require category field',
      path: ['category'],
    }
  )
  .refine(
    (data) => {
      // per_device limits require deviceId field
      if (data.limitType === 'per_device') {
        return data.deviceId !== undefined && data.deviceId.length > 0
      }
      return true
    },
    {
      message: 'per_device limits require deviceId field',
      path: ['deviceId'],
    }
  )
  .refine(
    (data) => {
      // daily_total should not have category or deviceId
      if (data.limitType === 'daily_total') {
        return data.category === undefined && data.deviceId === undefined
      }
      return true
    },
    {
      message: 'daily_total limits should not specify category or deviceId',
      path: ['limitType'],
    }
  )
export type TimeLimit = z.infer<typeof timeLimitSchema>

/**
 * Warning thresholds for time limit notifications.
 * Story 31.1: Countdown Warning System - AC6 (FR143)
 *
 * Configurable warning thresholds before time limits are reached.
 */
export const warningThresholdsSchema = z.object({
  /** Minutes before limit for first (gentle) warning. Default: 15 */
  firstWarningMinutes: z.number().int().min(1).max(60).default(15),
  /** Minutes before limit for second (prominent) warning. Default: 5 */
  secondWarningMinutes: z.number().int().min(1).max(30).default(5),
  /** Minutes before limit for final (urgent) warning. Default: 1 */
  finalWarningMinutes: z.number().int().min(1).max(10).default(1),
  /** Whether to show countdown timer in extension badge. Default: true */
  showCountdownBadge: z.boolean().default(true),
  /** Whether to show non-intrusive toast notifications. Default: true */
  showToastNotifications: z.boolean().default(true),
})
export type WarningThresholds = z.infer<typeof warningThresholdsSchema>

/** Default warning thresholds for new configurations */
export const DEFAULT_WARNING_THRESHOLDS: WarningThresholds = {
  firstWarningMinutes: 15,
  secondWarningMinutes: 5,
  finalWarningMinutes: 1,
  showCountdownBadge: true,
  showToastNotifications: true,
}

/**
 * Neurodivergent accommodations for time limits.
 * Story 31.2: Neurodivergent Transition Accommodations - FR129
 *
 * Extra transition time and gentle warnings for neurodivergent children.
 */
export const neurodivergentAccommodationsSchema = z.object({
  /** Whether accommodations are enabled for this child. Default: false */
  enabled: z.boolean().default(false),
  /** Extra warning at early threshold before limit. Default: true */
  earlyWarningEnabled: z.boolean().default(true),
  /** Minutes for early warning (15-60). Default: 30 */
  earlyWarningMinutes: z.number().int().min(15).max(60).default(30),
  /** Grace period minutes after limit reached (1-10). Default: 5 */
  gracePeriodMinutes: z.number().int().min(1).max(10).default(5),
  /** Use calming colors instead of alarming red/orange. Default: true */
  calmingColorsEnabled: z.boolean().default(true),
  /** Disable audio notifications. Default: false */
  silentModeEnabled: z.boolean().default(false),
  /** Enable gradual screen dimming instead of hard cutoff. Default: true */
  gradualTransitionEnabled: z.boolean().default(true),
})
export type NeurodivergentAccommodations = z.infer<typeof neurodivergentAccommodationsSchema>

/** Default neurodivergent accommodations */
export const DEFAULT_ACCOMMODATIONS: NeurodivergentAccommodations = {
  enabled: false,
  earlyWarningEnabled: true,
  earlyWarningMinutes: 30,
  gracePeriodMinutes: 5,
  calmingColorsEnabled: true,
  silentModeEnabled: false,
  gradualTransitionEnabled: true,
}

/**
 * Domain validation schema for custom education domains.
 * Prevents injection attacks via empty strings, wildcards, or malformed input.
 */
const customDomainSchema = z
  .string()
  .min(1, 'Domain cannot be empty')
  .max(253, 'Domain too long')
  .transform((domain) => domain.toLowerCase().trim())
  .refine(
    (domain) => domain.length > 0 && !domain.startsWith('.') && !domain.endsWith('.'),
    'Domain cannot start or end with a dot'
  )
  .refine(
    (domain) => domain.includes('.') && domain.split('.').every((part) => part.length > 0),
    'Domain must have at least one dot (e.g., example.com)'
  )
  .refine((domain) => !/[*?<>|"\\]/.test(domain), 'Domain contains invalid characters')

/**
 * Education exemption settings for time limits.
 * Story 31.3: Education Content Exemption - FR104, FR129
 *
 * Allows educational content to be exempt from time limits while still tracking usage.
 */
export const educationExemptionSchema = z.object({
  /** Whether education exemption is enabled. Default: false */
  enabled: z.boolean().default(false),
  /** Custom domains added by parent (in addition to curated list) */
  customDomains: z.array(customDomainSchema).max(50, 'Too many custom domains').default([]),
  /** Include Homework category in exemption. Default: true */
  includeHomework: z.boolean().default(true),
  /** Show notification when on exempt site. Default: true */
  showExemptNotification: z.boolean().default(true),
})
export type EducationExemption = z.infer<typeof educationExemptionSchema>

/** Default education exemption settings */
export const DEFAULT_EDUCATION_EXEMPTION: EducationExemption = {
  enabled: false,
  customDomains: [],
  includeHomework: true,
  showExemptNotification: true,
}

/**
 * Curated list of educational domains that are always exempt when exemption is enabled.
 * These are well-known educational platforms and resources.
 */
export const CURATED_EDUCATION_DOMAINS = [
  'khanacademy.org',
  'coursera.org',
  'edx.org',
  'duolingo.com',
  'quizlet.com',
  'wolframalpha.com',
  'britannica.com',
  'wikipedia.org',
  'mathway.com',
  'brainly.com',
  'chegg.com',
  'studyblue.com',
  'codecademy.com',
  'brilliant.org',
  'ted.com',
  'nationalgeographic.com',
] as const

/**
 * Complete time limits configuration for a child.
 * Stored at: /families/{familyId}/children/{childId}/timeLimits/config
 *
 * Story 30.1: Time Limit Data Model - AC1, AC3, AC5, AC6
 * Story 31.1: Countdown Warning System - AC6 warning thresholds
 * Story 31.2: Neurodivergent Transition Accommodations - AC6
 */
export const childTimeLimitsSchema = z.object({
  /** Child this configuration belongs to */
  childId: z.string(),
  /** Family this belongs to */
  familyId: z.string(),
  /** Reference to the agreement that includes these limits - AC5 */
  agreementId: z.string().optional(),
  /** Daily total limit (applies across all devices combined) */
  dailyTotal: timeLimitScheduleSchema.optional(),
  /** Per-category limits */
  categoryLimits: z.array(categoryLimitSchema).optional(),
  /** Per-device limits */
  deviceLimits: z.array(deviceLimitSchema).optional(),
  /** Warning thresholds for notifications - Story 31.1 AC6 */
  warningThresholds: warningThresholdsSchema.optional(),
  /** Neurodivergent accommodations - Story 31.2 AC6 */
  accommodations: neurodivergentAccommodationsSchema.optional(),
  /** Education exemption settings - Story 31.3 */
  educationExemption: educationExemptionSchema.optional(),
  /** When this configuration becomes effective (epoch ms) - AC6 */
  effectiveFrom: z.number().optional(),
  /** Last updated timestamp (epoch ms) */
  updatedAt: z.number(),
  /** Version for optimistic locking */
  version: z.number().default(1),
})
export type ChildTimeLimits = z.infer<typeof childTimeLimitsSchema>

// ============================================================================
// Custom Category Schema (Story 30.4)
// ============================================================================

/**
 * Custom category for family-specific app grouping.
 * Story 30.4: Custom Category Creation - AC1, AC2, AC6
 *
 * Stored at: /families/{familyId}/customCategories/{categoryId}
 */
export const customCategorySchema = z.object({
  /** Unique category identifier */
  id: z.string(),
  /** Family this category belongs to */
  familyId: z.string(),
  /** Category name (max 30 characters) - AC1 */
  name: z.string().max(30),
  /** Apps/sites assigned to this category (URLs or app identifiers) - AC2 */
  apps: z.array(z.string()).default([]),
  /** Icon color for display */
  color: z.string().optional(),
  /** User ID who created this category */
  createdBy: z.string(),
  /** Created timestamp (epoch ms) */
  createdAt: z.number(),
  /** Last updated timestamp (epoch ms) */
  updatedAt: z.number(),
})
export type CustomCategory = z.infer<typeof customCategorySchema>

/** Maximum custom categories per family - AC6 */
export const MAX_CUSTOM_CATEGORIES_PER_FAMILY = 10

// ============================================================================
// Time Extension Request Schema (Story 31.6)
// ============================================================================

/**
 * Reason options for time extension requests.
 * Story 31.6: Time Extension Requests - AC2
 */
export const timeExtensionReasonSchema = z.enum([
  'finishing_homework',
  'five_more_minutes',
  'important_project',
])
export type TimeExtensionReason = z.infer<typeof timeExtensionReasonSchema>

/**
 * Status of a time extension request.
 * Story 31.6: Time Extension Requests
 */
export const timeExtensionStatusSchema = z.enum([
  'pending',
  'approved',
  'denied',
  'expired', // Auto-denied after timeout (AC7)
])
export type TimeExtensionStatus = z.infer<typeof timeExtensionStatusSchema>

/**
 * Time extension request schema.
 * Story 31.6: Time Extension Requests
 *
 * Stored at: /families/{familyId}/timeExtensionRequests/{requestId}
 */
export const timeExtensionRequestSchema = z.object({
  /** Unique request identifier */
  id: z.string(),
  /** Child who made the request */
  childId: z.string(),
  /** Family the child belongs to */
  familyId: z.string(),
  /** Device the request came from */
  deviceId: z.string(),
  /** Reason for request - AC2 */
  reason: timeExtensionReasonSchema,
  /** Current status */
  status: timeExtensionStatusSchema,
  /** Minutes to add if approved (default 30) */
  extensionMinutes: z.number().default(30),
  /** When request was created (epoch ms) */
  requestedAt: z.number(),
  /** When request was responded to (epoch ms) */
  respondedAt: z.number().nullable(),
  /** Parent who responded */
  respondedBy: z.string().nullable(),
  /** Child-friendly name for display */
  childName: z.string().optional(),
})
export type TimeExtensionRequest = z.infer<typeof timeExtensionRequestSchema>

/** Maximum extension requests per child per day - AC6 */
export const MAX_EXTENSION_REQUESTS_PER_DAY = 2

/** Auto-deny timeout in minutes - AC7 */
export const EXTENSION_REQUEST_TIMEOUT_MINUTES = 10

/** Human-readable reason labels */
export const TIME_EXTENSION_REASON_LABELS: Record<TimeExtensionReason, string> = {
  finishing_homework: 'Finishing homework',
  five_more_minutes: '5 more minutes',
  important_project: 'Important project',
}

// =============================================================================
// Family Offline Schedule Schemas
// Story 32.1: Family Offline Schedule Configuration
// =============================================================================

/**
 * Preset options for family offline schedules.
 * Story 32.1 AC3: Quick presets available
 */
export const offlineSchedulePresetSchema = z.enum([
  'custom', // User-configured schedule
  'dinner_time', // 6pm-7pm daily
  'bedtime', // 9pm-7am
])
export type OfflineSchedulePreset = z.infer<typeof offlineSchedulePresetSchema>

/**
 * Time window for offline schedule.
 * Story 32.1 AC1: Daily schedule with start and end time
 */
export const offlineTimeWindowSchema = z.object({
  /** Start time in HH:MM format (24-hour) */
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  /** End time in HH:MM format (24-hour) */
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
  /** IANA timezone (e.g., 'America/New_York') */
  timezone: z.string(),
})
export type OfflineTimeWindow = z.infer<typeof offlineTimeWindowSchema>

/**
 * Family offline schedule configuration.
 * Story 32.1: Family Offline Schedule Configuration
 *
 * Stored at: /families/{familyId}/settings/offlineSchedule
 */
export const familyOfflineScheduleSchema = z.object({
  /** Family ID */
  familyId: z.string(),
  /** Whether offline schedule is enabled */
  enabled: z.boolean().default(false),
  /** Selected preset (or 'custom') - AC3 */
  preset: offlineSchedulePresetSchema.default('custom'),
  /** Weekday schedule (Mon-Fri) - AC2 */
  weekdaySchedule: offlineTimeWindowSchema.optional(),
  /** Weekend schedule (Sat-Sun) - AC2 */
  weekendSchedule: offlineTimeWindowSchema.optional(),
  /** Applies to all family members including parents - AC4 */
  appliesToParents: z.boolean().default(true),
  /** Created timestamp (epoch ms) */
  createdAt: z.number(),
  /** Last updated timestamp (epoch ms) */
  updatedAt: z.number(),
})
export type FamilyOfflineSchedule = z.infer<typeof familyOfflineScheduleSchema>

/**
 * Preset configurations for quick setup.
 * Story 32.1 AC3: "Dinner time" (6pm-7pm) and "Bedtime" (9pm-7am)
 */
export const OFFLINE_SCHEDULE_PRESETS: Record<
  Exclude<OfflineSchedulePreset, 'custom'>,
  { weekday: Omit<OfflineTimeWindow, 'timezone'>; weekend: Omit<OfflineTimeWindow, 'timezone'> }
> = {
  dinner_time: {
    weekday: { startTime: '18:00', endTime: '19:00' },
    weekend: { startTime: '18:00', endTime: '19:00' },
  },
  bedtime: {
    weekday: { startTime: '21:00', endTime: '07:00' },
    weekend: { startTime: '22:00', endTime: '08:00' }, // Later on weekends
  },
}

/** Human-readable preset labels */
export const OFFLINE_PRESET_LABELS: Record<OfflineSchedulePreset, string> = {
  custom: 'Custom',
  dinner_time: 'Dinner Time',
  bedtime: 'Bedtime',
}

// =============================================================================
// Parent Device Enrollment Schemas
// Story 32.2: Parent Device Enrollment for Offline Time
// =============================================================================

/**
 * Parent device type for offline time enrollment.
 * Story 32.2 AC1: Parent can add their phone/tablet to offline enforcement
 */
export const parentDeviceTypeSchema = z.enum([
  'phone', // Mobile phone
  'tablet', // Tablet device
  'laptop', // Laptop computer
  'desktop', // Desktop computer
  'other', // Other device type
])
export type ParentDeviceType = z.infer<typeof parentDeviceTypeSchema>

/**
 * Enrolled parent device for offline time.
 * Story 32.2 AC3: "Mom's phone is enrolled" shown in device list
 */
export const parentEnrolledDeviceSchema = z.object({
  /** Unique device identifier (UUID) */
  deviceId: z.string(),
  /** Parent user ID who owns this device */
  parentUid: z.string(),
  /** Human-readable device name (e.g., "Mom's iPhone") */
  deviceName: z.string(),
  /** Type of device */
  deviceType: parentDeviceTypeSchema,
  /** When device was enrolled (epoch ms) */
  enrolledAt: z.number(),
  /** Whether device is actively enrolled */
  active: z.boolean().default(true),
})
export type ParentEnrolledDevice = z.infer<typeof parentEnrolledDeviceSchema>

/**
 * Parent device enrollment settings for a family.
 * Story 32.2: Parent Device Enrollment for Offline Time
 *
 * Stored at: /families/{familyId}/settings/parentDeviceEnrollment
 *
 * AC2: Enrollment is voluntary but visible to children
 * AC4: Parent compliance is tracked (FR60)
 * AC5: Non-enrolled parent devices noted
 */
export const parentDeviceEnrollmentSchema = z.object({
  /** Family ID */
  familyId: z.string(),
  /** Array of enrolled parent devices */
  devices: z.array(parentEnrolledDeviceSchema).default([]),
  /** Created timestamp (epoch ms) */
  createdAt: z.number(),
  /** Last updated timestamp (epoch ms) */
  updatedAt: z.number(),
})
export type ParentDeviceEnrollment = z.infer<typeof parentDeviceEnrollmentSchema>

/** Human-readable device type labels */
export const PARENT_DEVICE_TYPE_LABELS: Record<ParentDeviceType, string> = {
  phone: 'Phone',
  tablet: 'Tablet',
  laptop: 'Laptop',
  desktop: 'Desktop',
  other: 'Other',
}

/** Messages for enrollment UI - AC5, AC6: Non-shaming, encouraging */
export const PARENT_ENROLLMENT_MESSAGES = {
  header: 'Enroll Your Devices',
  description:
    'Lead by example! When your devices are enrolled, your children can see you follow family offline time too.',
  notEnrolledYet: (name: string) => `${name} hasn't enrolled yet`,
  enrolled: (name: string) => `${name}'s device is enrolled`,
  allEnrolled: 'Great! All parents have devices enrolled',
}

// =============================================================================
// Parent Compliance Tracking Schemas
// Story 32.4: Parent Compliance Tracking (FR60)
// =============================================================================

/**
 * Activity event during offline time for compliance tracking.
 * Story 32.4 AC5: Real-time activity detection
 */
export const parentActivityEventSchema = z.object({
  /** When activity occurred (epoch ms) */
  timestamp: z.number(),
  /** Type of activity detected */
  type: z.enum(['navigation', 'browser_active']),
})
export type ParentActivityEvent = z.infer<typeof parentActivityEventSchema>

/**
 * Parent compliance record for a single offline time window.
 * Story 32.4: Parent Compliance Tracking
 *
 * Stored at: /families/{familyId}/parentCompliance/{recordId}
 *
 * AC1: Compliance logged when offline time period ends
 * AC2: Child can see parent compliance in their dashboard
 * AC3: Parents see their own compliance stats
 * AC4: Transparency without shaming
 */
export const parentComplianceRecordSchema = z.object({
  /** Family ID */
  familyId: z.string(),
  /** Parent user ID */
  parentUid: z.string(),
  /** Device ID that was tracked */
  deviceId: z.string(),
  /** Parent display name for UI */
  parentDisplayName: z.string().optional(),
  /** Offline window start time (epoch ms) */
  offlineWindowStart: z.number(),
  /** Offline window end time (epoch ms) */
  offlineWindowEnd: z.number(),
  /** Whether parent was compliant (no activity during window) */
  wasCompliant: z.boolean(),
  /** Activity events during offline window (empty if compliant) */
  activityEvents: z.array(parentActivityEventSchema).default([]),
  /** Created timestamp (epoch ms) */
  createdAt: z.number(),
})
export type ParentComplianceRecord = z.infer<typeof parentComplianceRecordSchema>

/**
 * Summary of parent compliance over time.
 * Story 32.4 AC3: Parents see their own compliance stats
 */
export const parentComplianceSummarySchema = z.object({
  /** Parent user ID */
  parentUid: z.string(),
  /** Total number of offline windows tracked */
  totalWindows: z.number(),
  /** Number of compliant windows */
  compliantWindows: z.number(),
  /** Compliance percentage (0-100) */
  compliancePercentage: z.number(),
  /** Last compliance record date (epoch ms) */
  lastRecordDate: z.number().nullable(),
})
export type ParentComplianceSummary = z.infer<typeof parentComplianceSummarySchema>

/**
 * Messages for compliance UI - AC4: No shaming, just transparency
 */
export const PARENT_COMPLIANCE_MESSAGES = {
  // Compliant messages
  compliant: (name: string) => `${name} was offline for family time`,
  compliantShort: 'Offline',

  // Non-compliant messages (factual, not judgmental)
  nonCompliant: (name: string) => `${name} used the phone during offline time`,
  nonCompliantShort: 'Active during offline',

  // Summary messages
  summaryHeader: 'Family Offline Time',
  yourStats: 'Your Compliance',
  familyCompliance: 'Family Participation',
  encouragement: 'Every family moment counts!',
  greatJob: 'Great job leading by example!',
}

// ============================================================================
// Offline Exception Schemas (Story 32.5)
// ============================================================================

/**
 * Offline exception types.
 * Story 32.5: Offline Time Exceptions
 */
export const OFFLINE_EXCEPTION_TYPE_VALUES = [
  'pause', // Temporary pause by parent
  'skip', // Skip entire offline window
  'work', // Work exception for parent
  'homework', // Homework exception for child
] as const

export const offlineExceptionTypeSchema = z.enum(OFFLINE_EXCEPTION_TYPE_VALUES)
export type OfflineExceptionType = z.infer<typeof offlineExceptionTypeSchema>

/**
 * Offline exception status values.
 */
export const OFFLINE_EXCEPTION_STATUS_VALUES = ['active', 'completed', 'cancelled'] as const

export const offlineExceptionStatusSchema = z.enum(OFFLINE_EXCEPTION_STATUS_VALUES)
export type OfflineExceptionStatus = z.infer<typeof offlineExceptionStatusSchema>

/**
 * Offline exception record.
 * Story 32.5: Offline Time Exceptions
 *
 * Stored at: /families/{familyId}/offlineExceptions/{exceptionId}
 *
 * AC1: Pause offline time with logging
 * AC3: Work exceptions for parents
 * AC4: Homework exceptions for children
 * AC5: One-time skip
 * AC6: All exceptions in audit trail
 */
export const offlineExceptionSchema = z.object({
  /** Exception document ID */
  id: z.string(),
  /** Family ID */
  familyId: z.string(),
  /** Type of exception */
  type: offlineExceptionTypeSchema,
  /** User ID who requested exception */
  requestedBy: z.string(),
  /** Display name of requester */
  requestedByName: z.string().optional(),
  /** User ID who approved (for homework requests) */
  approvedBy: z.string().optional(),
  /** Optional reason for exception */
  reason: z.string().optional(),
  /** Exception start time (epoch ms) */
  startTime: z.number(),
  /** Exception end time (epoch ms, null = until end of window) */
  endTime: z.number().nullable(),
  /** URLs whitelisted during exception (for work/homework) */
  whitelistedUrls: z.array(z.string()).optional(),
  /** Categories whitelisted during exception (for homework: education only) */
  whitelistedCategories: z.array(z.string()).optional(),
  /** Exception status */
  status: offlineExceptionStatusSchema,
  /** Created timestamp (epoch ms) */
  createdAt: z.number(),
  /** Updated timestamp (epoch ms) */
  updatedAt: z.number().optional(),
})
export type OfflineException = z.infer<typeof offlineExceptionSchema>

/**
 * Messages for exception UI.
 * Story 32.5 AC6: Transparent logging
 */
export const OFFLINE_EXCEPTION_MESSAGES = {
  // Type labels
  pause: 'Pause',
  skip: 'Skip Tonight',
  work: 'Work Exception',
  homework: 'Homework Exception',

  // Status labels
  active: 'Active',
  completed: 'Completed',
  cancelled: 'Cancelled',

  // Action messages
  pauseStarted: (name: string) => `${name} paused offline time`,
  pauseEnded: (name: string) => `${name} resumed offline time`,
  skipActivated: (name: string) => `${name} skipped tonight's offline time`,
  workExceptionStarted: (name: string) => `${name} is working during offline time`,
  homeworkRequested: (name: string) => `${name} requested homework time`,
  homeworkApproved: (parentName: string, childName: string) =>
    `${parentName} approved ${childName}'s homework request`,
  homeworkDenied: (parentName: string, childName: string) =>
    `${parentName} denied ${childName}'s homework request`,

  // Time remaining
  timeRemaining: (minutes: number) =>
    minutes === 1 ? '1 minute remaining' : `${minutes} minutes remaining`,

  // Child-friendly messages
  childPauseMessage: 'Offline time is paused. Your parent will let you know when it starts again.',
  childSkipMessage: "Tonight's offline time has been skipped. Enjoy!",
  childWorkMessage: (name: string) => `${name} is working during family time.`,
  childHomeworkActive: "You're in homework mode. Only learning sites are available.",
}

// ================================
// OFFLINE TIME STREAK (Story 32.6)
// ================================

/**
 * Milestone thresholds for streak celebrations
 */
export const STREAK_MILESTONE_DAYS = {
  seven: 7,
  thirty: 30,
  hundred: 100,
} as const

export type StreakMilestone = keyof typeof STREAK_MILESTONE_DAYS

/**
 * Streak milestones achieved schema
 */
export const streakMilestonesSchema = z.object({
  sevenDays: z.boolean().default(false),
  thirtyDays: z.boolean().default(false),
  hundredDays: z.boolean().default(false),
})

export type StreakMilestones = z.infer<typeof streakMilestonesSchema>

/**
 * Offline time streak data for a family
 */
export const offlineStreakSchema = z.object({
  familyId: z.string(),
  currentStreak: z.number().min(0), // consecutive days
  longestStreak: z.number().min(0), // all-time best
  lastCompletedDate: z.number().nullable(), // epoch ms of last completion
  weeklyHours: z.number().min(0), // hours completed this week
  weeklyStartDate: z.number(), // epoch ms of current week start
  milestones: streakMilestonesSchema,
  leaderboardOptIn: z.boolean().default(false),
  updatedAt: z.number(),
})

export type OfflineStreak = z.infer<typeof offlineStreakSchema>

/**
 * Positive reinforcement messages for streak displays
 */
export const STREAK_MESSAGES = {
  // Parent view
  streakCounter: (days: number) =>
    days === 1 ? '1 day of family offline time!' : `${days} days of family offline time!`,
  weeklySummary: (hours: number) =>
    `Your family unplugged ${hours} ${hours === 1 ? 'hour' : 'hours'} together`,
  milestoneReached: (days: number) => `Amazing! You've reached ${days} days together!`,

  // Child view
  childStreakMessage: 'Great job unplugging with your family!',
  childMilestone7: "You're a superstar! 7 days of family time!",
  childMilestone30: 'Incredible! 30 days of unplugging together!',
  childMilestone100: 'LEGENDARY! 100 days of family time!',

  // Encouragement (never punitive)
  noStreak: 'Start your family offline time streak today!',
  keepGoing: 'Keep up the great work!',
  almostMilestone: (daysToGo: number, milestone: number) =>
    `Only ${daysToGo} more ${daysToGo === 1 ? 'day' : 'days'} until your ${milestone}-day milestone!`,
}

/**
 * Leaderboard entry (anonymized)
 */
export const leaderboardEntrySchema = z.object({
  rank: z.number().min(1),
  streakDays: z.number().min(0),
  isCurrentFamily: z.boolean().default(false),
})

export type LeaderboardEntry = z.infer<typeof leaderboardEntrySchema>

// ============================================================================
// Story 33.1: Focus Mode Schemas
// ============================================================================

/**
 * Focus mode duration options
 */
export const FOCUS_MODE_DURATIONS = {
  pomodoro: 25 * 60 * 1000, // 25 minutes in ms
  oneHour: 60 * 60 * 1000, // 1 hour in ms
  twoHours: 2 * 60 * 60 * 1000, // 2 hours in ms
  untilOff: null, // No time limit
} as const

export type FocusModeDuration = keyof typeof FOCUS_MODE_DURATIONS

export const focusModeDurationSchema = z.enum(['pomodoro', 'oneHour', 'twoHours', 'untilOff'])

/**
 * Focus mode status
 */
export const focusModeStatusSchema = z.enum(['inactive', 'active', 'paused'])
export type FocusModeStatus = z.infer<typeof focusModeStatusSchema>

/**
 * Focus mode session - tracks individual focus sessions
 */
export const focusModeSessionSchema = z.object({
  id: z.string(),
  childId: z.string(),
  familyId: z.string(),
  status: focusModeStatusSchema,
  durationType: focusModeDurationSchema,
  durationMs: z.number().nullable(), // null for "untilOff"
  startedAt: z.number(), // epoch ms
  endedAt: z.number().nullable(), // null if still active
  completedFully: z.boolean().default(false), // true if reached duration
  createdAt: z.number(),
  updatedAt: z.number(),
})

export type FocusModeSession = z.infer<typeof focusModeSessionSchema>

/**
 * Focus mode state for a child
 */
export const focusModeStateSchema = z.object({
  childId: z.string(),
  familyId: z.string(),
  isActive: z.boolean().default(false),
  currentSession: focusModeSessionSchema.nullable(),
  totalSessionsToday: z.number().default(0),
  totalFocusTimeToday: z.number().default(0), // ms
  updatedAt: z.number(),
})

export type FocusModeState = z.infer<typeof focusModeStateSchema>

/**
 * Default app categories for focus mode
 */
export const FOCUS_MODE_DEFAULT_CATEGORIES = {
  allowed: [
    'education',
    'productivity',
    'reference',
    'news', // for research
  ],
  blocked: ['social_media', 'games', 'entertainment', 'streaming', 'shopping'],
} as const

/**
 * Focus mode messages (child-friendly, encouraging)
 */
export const FOCUS_MODE_MESSAGES = {
  // Starting focus mode
  startPrompt: 'Ready to focus? Choose how long:',
  starting: (duration: string) => `Focus mode starting! ${duration}`,

  // During focus mode
  active: 'Focus mode active',
  timeRemaining: (minutes: number) => (minutes === 1 ? '1 minute left' : `${minutes} minutes left`),
  keepGoing: "You're doing great! Stay focused.",

  // Ending focus mode
  completed: 'Great job! Focus session complete!',
  endedEarly: 'Focus session ended. You can start another anytime.',

  // App blocking
  appBlocked: 'This app is blocked during focus mode.',

  // Duration labels
  durationLabels: {
    pomodoro: '25 min (Pomodoro)',
    oneHour: '1 hour',
    twoHours: '2 hours',
    untilOff: 'Until I turn off',
  } as const,
}

/**
 * Story 33-2: Focus Mode App Configuration
 *
 * Custom app entry for focus mode allow/block lists
 */
export const focusModeAppEntrySchema = z.object({
  /** Domain or app identifier (e.g., "spotify.com", "docs.google.com") */
  pattern: z.string().min(1).max(255),
  /** Human-readable name for display */
  name: z.string().min(1).max(100),
  /** Whether this is a domain pattern (*.spotify.com) or exact match */
  isWildcard: z.boolean().default(false),
  /** When this entry was added */
  addedAt: z.number(),
  /** Who added this entry (parent or approved from child suggestion) */
  addedByUid: z.string(),
})

export type FocusModeAppEntry = z.infer<typeof focusModeAppEntrySchema>

/**
 * Focus mode configuration per child
 * Stored in Firestore at families/{familyId}/focusModeConfig/{childId}
 */
export const focusModeConfigSchema = z.object({
  childId: z.string(),
  familyId: z.string(),
  /** Use default categories (from FOCUS_MODE_DEFAULT_CATEGORIES) */
  useDefaultCategories: z.boolean().default(true),
  /** Custom allowed domains/apps (in addition to defaults if useDefaultCategories is true) */
  customAllowList: z.array(focusModeAppEntrySchema).default([]),
  /** Custom blocked domains/apps (in addition to defaults if useDefaultCategories is true) */
  customBlockList: z.array(focusModeAppEntrySchema).default([]),
  /** Override defaults: explicitly allow these default-blocked categories */
  allowedCategories: z.array(z.string()).optional(),
  /** Override defaults: explicitly block these default-allowed categories */
  blockedCategories: z.array(z.string()).optional(),
  createdAt: z.number(),
  updatedAt: z.number(),
})

export type FocusModeConfig = z.infer<typeof focusModeConfigSchema>

/**
 * App suggestion status for child requests
 */
export const appSuggestionStatusSchema = z.enum(['pending', 'approved', 'denied'])
export type AppSuggestionStatus = z.infer<typeof appSuggestionStatusSchema>

/**
 * Child's app suggestion for focus mode
 * Stored in Firestore at families/{familyId}/focusModeConfig/{childId}/suggestions/{suggestionId}
 */
export const focusModeAppSuggestionSchema = z.object({
  id: z.string(),
  childId: z.string(),
  familyId: z.string(),
  /** Domain or app identifier suggested by child */
  pattern: z.string().min(1).max(255),
  /** Child's name for the app */
  name: z.string().min(1).max(100),
  /** Child's reason for requesting (optional, encourages communication) */
  reason: z.string().max(500).nullable(),
  /** Current status of the suggestion */
  status: appSuggestionStatusSchema,
  /** Parent who responded (if any) */
  respondedByUid: z.string().nullable(),
  /** When parent responded */
  respondedAt: z.number().nullable(),
  /** Parent's note when denying (explains reason to child) */
  denialReason: z.string().max(500).nullable(),
  createdAt: z.number(),
  updatedAt: z.number(),
})

export type FocusModeAppSuggestion = z.infer<typeof focusModeAppSuggestionSchema>

/**
 * Default app domains for focus mode
 * Maps to categories from FOCUS_MODE_DEFAULT_CATEGORIES
 */
export const FOCUS_MODE_DEFAULT_APPS = {
  allowed: {
    education: [
      { pattern: 'docs.google.com', name: 'Google Docs' },
      { pattern: 'drive.google.com', name: 'Google Drive' },
      { pattern: 'classroom.google.com', name: 'Google Classroom' },
      { pattern: 'sheets.google.com', name: 'Google Sheets' },
      { pattern: 'slides.google.com', name: 'Google Slides' },
      { pattern: 'khanacademy.org', name: 'Khan Academy' },
      { pattern: 'quizlet.com', name: 'Quizlet' },
      { pattern: 'desmos.com', name: 'Desmos' },
      { pattern: 'notion.so', name: 'Notion' },
      { pattern: 'coursera.org', name: 'Coursera' },
      { pattern: 'edx.org', name: 'edX' },
      { pattern: 'duolingo.com', name: 'Duolingo' },
    ],
    productivity: [
      { pattern: 'calendar.google.com', name: 'Google Calendar' },
      { pattern: 'mail.google.com', name: 'Gmail' },
      { pattern: 'outlook.com', name: 'Outlook' },
      { pattern: 'trello.com', name: 'Trello' },
      { pattern: 'asana.com', name: 'Asana' },
      { pattern: 'todoist.com', name: 'Todoist' },
    ],
    reference: [
      { pattern: 'wikipedia.org', name: 'Wikipedia' },
      { pattern: 'wolframalpha.com', name: 'Wolfram Alpha' },
      { pattern: 'dictionary.com', name: 'Dictionary' },
      { pattern: 'thesaurus.com', name: 'Thesaurus' },
    ],
  },
  blocked: {
    social_media: [
      { pattern: 'facebook.com', name: 'Facebook' },
      { pattern: 'instagram.com', name: 'Instagram' },
      { pattern: 'twitter.com', name: 'X (Twitter)' },
      { pattern: 'x.com', name: 'X (Twitter)' },
      { pattern: 'tiktok.com', name: 'TikTok' },
      { pattern: 'snapchat.com', name: 'Snapchat' },
      { pattern: 'reddit.com', name: 'Reddit' },
      { pattern: 'discord.com', name: 'Discord' },
      { pattern: 'tumblr.com', name: 'Tumblr' },
      { pattern: 'pinterest.com', name: 'Pinterest' },
    ],
    games: [
      { pattern: 'roblox.com', name: 'Roblox' },
      { pattern: 'minecraft.net', name: 'Minecraft' },
      { pattern: 'steam.com', name: 'Steam' },
      { pattern: 'steampowered.com', name: 'Steam' },
      { pattern: 'epicgames.com', name: 'Epic Games' },
      { pattern: 'twitch.tv', name: 'Twitch' },
      { pattern: 'coolmathgames.com', name: 'Cool Math Games' },
      { pattern: 'y8.com', name: 'Y8 Games' },
      { pattern: 'poki.com', name: 'Poki' },
    ],
    entertainment: [
      { pattern: 'youtube.com', name: 'YouTube' },
      { pattern: 'netflix.com', name: 'Netflix' },
      { pattern: 'disneyplus.com', name: 'Disney+' },
      { pattern: 'hulu.com', name: 'Hulu' },
      { pattern: 'primevideo.com', name: 'Prime Video' },
      { pattern: 'hbomax.com', name: 'Max (HBO)' },
      { pattern: 'max.com', name: 'Max (HBO)' },
      { pattern: 'peacocktv.com', name: 'Peacock' },
    ],
    streaming: [
      { pattern: 'spotify.com', name: 'Spotify' },
      { pattern: 'open.spotify.com', name: 'Spotify' },
      { pattern: 'music.apple.com', name: 'Apple Music' },
      { pattern: 'soundcloud.com', name: 'SoundCloud' },
      { pattern: 'pandora.com', name: 'Pandora' },
    ],
    shopping: [
      { pattern: 'amazon.com', name: 'Amazon' },
      { pattern: 'ebay.com', name: 'eBay' },
      { pattern: 'etsy.com', name: 'Etsy' },
      { pattern: 'walmart.com', name: 'Walmart' },
      { pattern: 'target.com', name: 'Target' },
    ],
  },
} as const

// ============================================================================
// Work Mode Schemas - Story 33.3
// ============================================================================

// Note: Reuses existing dayOfWeekSchema and DayOfWeek type from above

/**
 * Work schedule - defines when work mode activates
 * Stored in Firestore at families/{familyId}/workModeConfig/{childId}
 */
export const workScheduleSchema = z.object({
  id: z.string(),
  /** Name of the job/workplace for display */
  name: z.string().min(1).max(100),
  /** Days of the week this schedule applies */
  days: z.array(dayOfWeekSchema).min(1),
  /** Start time in 24h format "HH:mm" (e.g., "09:00") */
  startTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/),
  /** End time in 24h format "HH:mm" (e.g., "17:00") */
  endTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/),
  /** Whether this schedule is currently enabled */
  isEnabled: z.boolean().default(true),
  createdAt: z.number(),
  updatedAt: z.number(),
})

export type WorkSchedule = z.infer<typeof workScheduleSchema>

/**
 * Work mode session status
 */
export const workModeStatusSchema = z.enum(['inactive', 'active'])
export type WorkModeStatus = z.infer<typeof workModeStatusSchema>

/**
 * Work mode activation type
 */
export const workModeActivationTypeSchema = z.enum(['scheduled', 'manual'])
export type WorkModeActivationType = z.infer<typeof workModeActivationTypeSchema>

/**
 * Work mode session - tracks active work mode sessions
 */
export const workModeSessionSchema = z.object({
  id: z.string(),
  childId: z.string(),
  familyId: z.string(),
  status: workModeStatusSchema,
  /** How this session was activated */
  activationType: workModeActivationTypeSchema,
  /** Reference to schedule if activated automatically */
  scheduleId: z.string().nullable(),
  /** Schedule name for display */
  scheduleName: z.string().nullable(),
  startedAt: z.number(), // epoch ms
  /** Expected end time based on schedule (null for manual sessions without defined end) */
  scheduledEndAt: z.number().nullable(),
  endedAt: z.number().nullable(), // null if still active
  createdAt: z.number(),
  updatedAt: z.number(),
})

export type WorkModeSession = z.infer<typeof workModeSessionSchema>

/**
 * Work mode state for a child
 * Stored in Firestore at families/{familyId}/workMode/{childId}
 */
export const workModeStateSchema = z.object({
  childId: z.string(),
  familyId: z.string(),
  isActive: z.boolean().default(false),
  currentSession: workModeSessionSchema.nullable(),
  totalSessionsThisWeek: z.number().default(0),
  totalWorkTimeThisWeek: z.number().default(0), // ms
  weekStartDate: z.number(), // epoch ms of week start (Sunday)
  updatedAt: z.number(),
})

export type WorkModeState = z.infer<typeof workModeStateSchema>

/**
 * Work app entry for whitelist during work mode
 */
export const workModeAppEntrySchema = z.object({
  /** Domain or app identifier (e.g., "slack.com", "teams.microsoft.com") */
  pattern: z.string().min(1).max(255),
  /** Human-readable name for display */
  name: z.string().min(1).max(100),
  /** True if pattern uses wildcard (e.g., "*.slack.com") */
  isWildcard: z.boolean().default(false),
  /** When this app was added */
  addedAt: z.number(),
  /** Who added this app (parent UID) */
  addedByUid: z.string(),
})

export type WorkModeAppEntry = z.infer<typeof workModeAppEntrySchema>

/**
 * Work mode configuration per child
 * Stored in Firestore at families/{familyId}/workModeConfig/{childId}
 */
export const workModeConfigSchema = z.object({
  childId: z.string(),
  familyId: z.string(),
  /** Work schedules for this child */
  schedules: z.array(workScheduleSchema).default([]),
  /** Use default work apps whitelist */
  useDefaultWorkApps: z.boolean().default(true),
  /** Custom work apps whitelist */
  customWorkApps: z.array(workModeAppEntrySchema).default([]),
  /** Whether to pause screenshot capture during work mode */
  pauseScreenshots: z.boolean().default(true),
  /** Whether to suspend time limits during work mode */
  suspendTimeLimits: z.boolean().default(true),
  /** Allow teen to manually start/stop work mode */
  allowManualActivation: z.boolean().default(true),
  createdAt: z.number(),
  updatedAt: z.number(),
})

export type WorkModeConfig = z.infer<typeof workModeConfigSchema>

/**
 * Default work apps for employed teens
 */
export const WORK_MODE_DEFAULT_APPS = {
  scheduling: [
    { pattern: 'when2work.com', name: 'When2Work' },
    { pattern: 'wheniwork.com', name: 'When I Work' },
    { pattern: 'hotschedules.com', name: 'HotSchedules' },
    { pattern: 'deputy.com', name: 'Deputy' },
    { pattern: 'homebase.com', name: 'Homebase' },
    { pattern: 'sling.com', name: 'Sling' },
    { pattern: 'shiftboard.com', name: 'Shiftboard' },
  ],
  communication: [
    { pattern: 'slack.com', name: 'Slack' },
    { pattern: 'teams.microsoft.com', name: 'Microsoft Teams' },
    { pattern: 'zoom.us', name: 'Zoom' },
    { pattern: 'meet.google.com', name: 'Google Meet' },
    { pattern: 'webex.com', name: 'Cisco Webex' },
  ],
  business: [
    { pattern: 'square.com', name: 'Square' },
    { pattern: 'toast.com', name: 'Toast POS' },
    { pattern: 'lightspeedhq.com', name: 'Lightspeed' },
    { pattern: 'shopify.com', name: 'Shopify' },
    { pattern: 'clover.com', name: 'Clover' },
  ],
  productivity: [
    { pattern: 'docs.google.com', name: 'Google Docs' },
    { pattern: 'sheets.google.com', name: 'Google Sheets' },
    { pattern: 'drive.google.com', name: 'Google Drive' },
    { pattern: 'office.com', name: 'Microsoft Office' },
    { pattern: 'mail.google.com', name: 'Gmail' },
    { pattern: 'outlook.com', name: 'Outlook' },
    { pattern: 'calendar.google.com', name: 'Google Calendar' },
  ],
} as const

/**
 * Work mode messages (teen-friendly, respectful of autonomy)
 */
export const WORK_MODE_MESSAGES = {
  // Starting work mode
  scheduledStart: (scheduleName: string) =>
    `Work mode starting for "${scheduleName}". Monitoring paused.`,
  manualStart: 'Work mode started. Monitoring paused until you end it.',

  // Ending work mode
  scheduledEnd: (scheduleName: string) =>
    `Work mode ended for "${scheduleName}". Normal monitoring resumed.`,
  manualEnd: 'Work mode ended. Normal monitoring resumed.',

  // Status messages
  active: (scheduleName: string | null) =>
    scheduleName ? `Work mode active: ${scheduleName}` : 'Work mode active (manual)',
  timeRemaining: (minutes: number) =>
    minutes === 1 ? '1 minute until work ends' : `${minutes} minutes until work ends`,

  // Parent transparency
  parentNotification: (childName: string, isManual: boolean) =>
    isManual
      ? `${childName} started work mode manually`
      : `${childName}'s scheduled work mode is now active`,

  // Schedule labels
  scheduleLabels: {
    sunday: 'Sunday',
    monday: 'Monday',
    tuesday: 'Tuesday',
    wednesday: 'Wednesday',
    thursday: 'Thursday',
    friday: 'Friday',
    saturday: 'Saturday',
  } as const,
} as const

// ============================================================================
// CALENDAR INTEGRATION SCHEMAS (Story 33.4)
// ============================================================================

/**
 * Calendar provider type
 * Currently only Google Calendar is supported
 */
export const calendarProviderSchema = z.enum(['google'])

export type CalendarProvider = z.infer<typeof calendarProviderSchema>

/**
 * Calendar sync frequency options
 */
export const calendarSyncFrequencySchema = z.enum(['15', '30', '60'])

export type CalendarSyncFrequency = z.infer<typeof calendarSyncFrequencySchema>

/**
 * Calendar sync frequency in minutes
 */
export const CALENDAR_SYNC_FREQUENCIES = {
  '15': 15,
  '30': 30,
  '60': 60,
} as const

/**
 * Default focus trigger keywords for calendar events
 * Case-insensitive matching against event titles
 */
export const CALENDAR_FOCUS_TRIGGER_KEYWORDS = [
  'study',
  'homework',
  'focus',
  'work',
  'exam',
  'test',
  'project',
  'assignment',
  'reading',
  'research',
  'practice',
  'tutoring',
  'class',
  'lecture',
] as const

/**
 * Calendar connection status
 */
export const calendarConnectionStatusSchema = z.enum([
  'connected',
  'disconnected',
  'error',
  'pending',
])

export type CalendarConnectionStatus = z.infer<typeof calendarConnectionStatusSchema>

/**
 * Calendar integration configuration per child
 * Stored in Firestore at families/{familyId}/calendarIntegration/{childId}
 */
export const calendarIntegrationConfigSchema = z.object({
  childId: z.string(),
  familyId: z.string(),
  /** Whether calendar integration is enabled */
  isEnabled: z.boolean().default(false),
  /** Calendar provider (currently only Google) */
  provider: calendarProviderSchema.nullable().default(null),
  /** Connection status */
  connectionStatus: calendarConnectionStatusSchema.default('disconnected'),
  /** Email of connected calendar account */
  connectedEmail: z.string().nullable().default(null),
  /** When calendar was connected */
  connectedAt: z.number().nullable().default(null),
  /** How often to sync calendar events (in minutes) */
  syncFrequencyMinutes: z.number().default(30),
  /** Whether to auto-activate focus mode for calendar events */
  autoActivateFocusMode: z.boolean().default(false),
  /** Keywords that trigger focus mode (case-insensitive) */
  focusTriggerKeywords: z.array(z.string()).default([...CALENDAR_FOCUS_TRIGGER_KEYWORDS]),
  /** Last successful sync timestamp */
  lastSyncAt: z.number().nullable().default(null),
  /** Sync error message if any */
  lastSyncError: z.string().nullable().default(null),
  createdAt: z.number(),
  updatedAt: z.number(),
})

export type CalendarIntegrationConfig = z.infer<typeof calendarIntegrationConfigSchema>

/**
 * Calendar event as fetched from provider
 */
export const calendarEventSchema = z.object({
  /** Provider's event ID */
  id: z.string(),
  /** Event title */
  title: z.string(),
  /** Event start time (epoch ms) */
  startTime: z.number(),
  /** Event end time (epoch ms) */
  endTime: z.number(),
  /** Event description (if any) */
  description: z.string().nullable().default(null),
  /** Whether this event triggers focus mode */
  isFocusEligible: z.boolean().default(false),
  /** Which keywords matched to make it focus-eligible */
  matchedKeywords: z.array(z.string()).default([]),
  /** Whether the event is all-day */
  isAllDay: z.boolean().default(false),
  /** Whether this event has been processed */
  processed: z.boolean().default(false),
})

export type CalendarEvent = z.infer<typeof calendarEventSchema>

/**
 * Cached calendar events for a child
 * Stored in Firestore at families/{familyId}/calendarEvents/{childId}
 */
export const cachedCalendarEventsSchema = z.object({
  childId: z.string(),
  familyId: z.string(),
  /** Upcoming events (next 7 days) */
  events: z.array(calendarEventSchema).default([]),
  /** When events were last fetched */
  fetchedAt: z.number(),
  /** Events expiry time (should refetch after this) */
  expiresAt: z.number(),
  updatedAt: z.number(),
})

export type CachedCalendarEvents = z.infer<typeof cachedCalendarEventsSchema>

/**
 * Focus mode trigger type - extends FocusModeSession with calendar support
 */
export const focusModeTriggerTypeSchema = z.enum(['manual', 'calendar'])

export type FocusModeTriggerType = z.infer<typeof focusModeTriggerTypeSchema>

/**
 * Extended focus mode session with calendar trigger support
 * This extends the base FocusModeSession schema
 */
export const focusModeSessionWithCalendarSchema = focusModeSessionSchema.extend({
  /** How this session was triggered */
  triggeredBy: focusModeTriggerTypeSchema.default('manual'),
  /** Calendar event ID if triggered by calendar */
  calendarEventId: z.string().nullable().default(null),
  /** Calendar event title if triggered by calendar */
  calendarEventTitle: z.string().nullable().default(null),
})

export type FocusModeSessionWithCalendar = z.infer<typeof focusModeSessionWithCalendarSchema>

/**
 * Calendar integration messages (child-friendly)
 */
export const CALENDAR_INTEGRATION_MESSAGES = {
  // Connection
  connectPrompt: 'Connect your Google Calendar to auto-start focus mode during study time.',
  connecting: 'Connecting to Google Calendar...',
  connected: (email: string) => `Connected to ${email}`,
  disconnected: 'Calendar not connected',
  connectionError: 'Unable to connect. Please try again.',

  // Focus mode triggers
  focusModeStarting: (eventTitle: string) => `Focus mode starting for "${eventTitle}"`,
  focusModeEnding: (eventTitle: string) => `Focus mode ending for "${eventTitle}"`,
  focusModeEndedEarly: (eventTitle: string, minutesEarly: number) =>
    `Focus mode for "${eventTitle}" ended ${minutesEarly} minutes early`,

  // Sync status
  syncSuccess: 'Calendar synced successfully',
  syncError: 'Unable to sync calendar. Will retry shortly.',
  lastSynced: (timestamp: number) => {
    const minutes = Math.floor((Date.now() - timestamp) / (60 * 1000))
    if (minutes < 1) return 'Synced just now'
    if (minutes === 1) return 'Synced 1 minute ago'
    if (minutes < 60) return `Synced ${minutes} minutes ago`
    const hours = Math.floor(minutes / 60)
    if (hours === 1) return 'Synced 1 hour ago'
    return `Synced ${hours} hours ago`
  },

  // Parent notifications
  parentCalendarConnected: (childName: string, email: string) =>
    `${childName} connected their calendar (${email}) for auto focus mode`,
  parentCalendarDisconnected: (childName: string) => `${childName} disconnected their calendar`,
  parentCalendarFocusStarted: (childName: string, eventTitle: string) =>
    `${childName} started focus mode for "${eventTitle}" (calendar-triggered)`,
} as const

// ============================================================================
// Story 33-5: Focus Mode Analytics
// ============================================================================

// Note: Reuses existing dayOfWeekSchema and DayOfWeek type from Story 30.1

/**
 * Time of day category for pattern analysis
 */
export const timeOfDaySchema = z.enum(['morning', 'afternoon', 'evening', 'night'])

export type TimeOfDay = z.infer<typeof timeOfDaySchema>

/**
 * Focus mode session summary - for analytics aggregation
 * Tracks essential session data for weekly/daily analysis
 */
export const focusModeSessionSummarySchema = z.object({
  sessionId: z.string(),
  startedAt: z.number(), // epoch ms
  endedAt: z.number().nullable(), // null if still active
  durationMinutes: z.number(), // actual duration in minutes
  durationType: focusModeDurationSchema,
  completedFully: z.boolean(),
  triggeredBy: focusModeTriggerTypeSchema,
  calendarEventTitle: z.string().nullable(),
})

export type FocusModeSessionSummary = z.infer<typeof focusModeSessionSummarySchema>

/**
 * Daily focus mode summary - aggregated stats per day
 * Stored at families/{familyId}/focusModeDailySummary/{childId}/daily/{date}
 */
export const focusModeDailySummarySchema = z.object({
  childId: z.string(),
  familyId: z.string(),
  date: z.string(), // YYYY-MM-DD format
  sessionCount: z.number().default(0),
  totalMinutes: z.number().default(0),
  completedSessions: z.number().default(0),
  earlyExits: z.number().default(0),
  manualSessions: z.number().default(0),
  calendarSessions: z.number().default(0),
  sessions: z.array(focusModeSessionSummarySchema).default([]),
  updatedAt: z.number(),
})

export type FocusModeDailySummary = z.infer<typeof focusModeDailySummarySchema>

/**
 * Focus mode analytics - computed weekly summary
 * Used for dashboard display, computed on client from daily summaries
 */
export const focusModeAnalyticsSchema = z.object({
  childId: z.string(),
  familyId: z.string(),

  // Weekly summary
  weeklySessionCount: z.number().default(0),
  weeklyTotalMinutes: z.number().default(0),
  weeklyAverageMinutes: z.number().default(0),
  weeklyCompletionRate: z.number().default(0), // 0-100 percentage

  // Comparison to previous week
  sessionCountChange: z.number().default(0), // positive = more, negative = less
  totalMinutesChange: z.number().default(0),
  completionRateChange: z.number().default(0),

  // Timing patterns
  peakDays: z.array(dayOfWeekSchema).default([]),
  peakTimeOfDay: timeOfDaySchema.nullable().default(null),
  hourlyDistribution: z.record(z.string(), z.number()).default({}), // hour (0-23) -> count
  dailyDistribution: z.record(dayOfWeekSchema, z.number()).default({} as Record<DayOfWeek, number>),

  // Session breakdown
  manualSessions: z.number().default(0),
  calendarSessions: z.number().default(0),

  // Streaks and achievements
  currentStreak: z.number().default(0), // consecutive days with focus sessions
  longestStreak: z.number().default(0),

  // Metadata
  computedAt: z.number(),
  periodStart: z.string(), // YYYY-MM-DD
  periodEnd: z.string(), // YYYY-MM-DD
})

export type FocusModeAnalytics = z.infer<typeof focusModeAnalyticsSchema>

/**
 * Focus mode analytics messages - positive framing (Story 33.5 AC5)
 * All messages celebrate achievements and encourage, never punish
 */
export const FOCUS_MODE_ANALYTICS_MESSAGES = {
  // Session count (AC1)
  sessionCount: (count: number, childName: string) => {
    if (count === 0) return `${childName} hasn't used focus mode yet this week - let's start!`
    if (count === 1) return `${childName} used focus mode once this week - great start!`
    if (count < 5)
      return `${childName} used focus mode ${count} times this week - building the habit!`
    if (count < 10)
      return `${childName} used focus mode ${count} times this week - great commitment!`
    return `${childName} used focus mode ${count} times this week - amazing dedication!`
  },

  // Duration (AC2)
  averageDuration: (minutes: number) => {
    if (minutes === 0) return 'No focus sessions yet'
    if (minutes < 15) return `${minutes} minute average - every bit counts!`
    if (minutes < 30) return `${minutes} minute average - solid focus sessions!`
    if (minutes < 60) return `${minutes} minute average - impressive concentration!`
    return `${Math.round(minutes)} minute average - exceptional focus!`
  },

  totalTime: (minutes: number) => {
    if (minutes === 0) return 'No focus time yet this week'
    const hours = Math.floor(minutes / 60)
    const mins = Math.round(minutes % 60)
    if (hours === 0) return `${mins} minutes of focused time this week`
    if (hours === 1)
      return `${hours} hour ${mins > 0 ? `${mins} min` : ''} of focused time this week`
    return `${hours} hours ${mins > 0 ? `${mins} min` : ''} of focused time this week`
  },

  // Timing patterns (AC3)
  peakTime: (timeOfDay: TimeOfDay | null) => {
    if (!timeOfDay) return 'Start focusing to discover your peak times!'
    const labels: Record<TimeOfDay, string> = {
      morning: 'morning (6am-12pm)',
      afternoon: 'afternoon (12pm-5pm)',
      evening: 'evening (5pm-9pm)',
      night: 'night (9pm+)',
    }
    return `Peak focus: ${labels[timeOfDay]} - you know when you work best!`
  },

  peakDays: (days: DayOfWeek[]) => {
    if (days.length === 0) return 'Build your focus routine!'
    if (days.length === 1) return `Most focused on ${days[0]}s`
    if (days.length === 2) return `Most focused on ${days[0]}s and ${days[1]}s`
    return `Most focused on ${days.slice(0, -1).join(', ')} and ${days[days.length - 1]}`
  },

  // Completion rate (AC4)
  completionRate: (rate: number) => {
    if (rate === 0) return 'Start a focus session to track your progress!'
    if (rate < 50) return `${rate}% completion - keep practicing, you'll get there!`
    if (rate < 70) return `${rate}% completion - good progress!`
    if (rate < 90) return `${rate}% completion - excellent follow-through!`
    return `${rate}% completion - outstanding commitment!`
  },

  // Trend indicators (AC2)
  trend: (change: number, metric: string) => {
    if (change === 0) return `Same ${metric} as last week`
    if (change > 0) return `${Math.abs(change)} more ${metric} than last week 📈`
    return `${Math.abs(change)} fewer ${metric} than last week` // No negative emoji, just neutral
  },

  // Streaks (AC5 achievements)
  streak: (days: number) => {
    if (days === 0) return 'Start your focus streak today!'
    if (days === 1) return "1 day streak - you're on your way!"
    if (days < 7) return `${days} day streak - keep it going!`
    if (days < 14) return `${days} day streak - one week strong! 🔥`
    if (days < 30) return `${days} day streak - incredible consistency! 🔥`
    return `${days} day streak - unstoppable! 🏆`
  },

  // Session type breakdown
  sessionBreakdown: (manual: number, calendar: number) => {
    const total = manual + calendar
    if (total === 0) return 'No sessions yet'
    if (calendar === 0) return `${manual} self-started sessions`
    if (manual === 0) return `${calendar} calendar-triggered sessions`
    return `${manual} self-started, ${calendar} calendar-triggered`
  },

  // Empty state
  emptyState: {
    title: 'Focus Mode Analytics',
    message: 'Start using focus mode to see your patterns and progress here!',
    cta: 'Start Focus Session',
  },

  // Child-friendly labels for dashboard
  labels: {
    thisWeek: 'This Week',
    sessions: 'Sessions',
    totalTime: 'Total Time',
    avgDuration: 'Avg. Duration',
    completionRate: 'Completed',
    peakTimes: 'Best Times',
    streak: 'Current Streak',
    trend: 'vs. Last Week',
  },
} as const

/**
 * Helper to get time of day from hour (0-23)
 */
export function getTimeOfDay(hour: number): TimeOfDay {
  if (hour >= 6 && hour < 12) return 'morning'
  if (hour >= 12 && hour < 17) return 'afternoon'
  if (hour >= 17 && hour < 21) return 'evening'
  return 'night'
}

/**
 * Helper to get day of week from Date
 */
export function getDayOfWeek(date: Date): DayOfWeek {
  const days: DayOfWeek[] = [
    'sunday',
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
    'saturday',
  ]
  return days[date.getDay()]
}

// ============================================================================
// Work Mode Analytics Schemas - Story 33.6
// ============================================================================

/**
 * Work mode session summary for analytics
 * Captures completed session data for reporting
 */
export const workModeSessionSummarySchema = z.object({
  sessionId: z.string(),
  startedAt: z.number(),
  endedAt: z.number().nullable(),
  durationMinutes: z.number().default(0),
  activationType: workModeActivationTypeSchema,
  scheduleId: z.string().nullable(),
  scheduleName: z.string().nullable(),
  wasOutsideSchedule: z.boolean().default(false),
})

export type WorkModeSessionSummary = z.infer<typeof workModeSessionSummarySchema>

/**
 * Work mode daily summary - aggregates sessions per day
 * Stored at families/{familyId}/workModeDailySummary/{childId}/days/{date}
 */
export const workModeDailySummarySchema = z.object({
  childId: z.string(),
  familyId: z.string(),
  date: z.string(), // YYYY-MM-DD
  sessionCount: z.number().default(0),
  totalMinutes: z.number().default(0),
  scheduledMinutes: z.number().default(0),
  manualMinutes: z.number().default(0),
  outsideScheduleCount: z.number().default(0), // Manual sessions outside scheduled hours
  sessions: z.array(workModeSessionSummarySchema).default([]),
  updatedAt: z.number(),
})

export type WorkModeDailySummary = z.infer<typeof workModeDailySummarySchema>

/**
 * Work mode weekly analytics - computed summary for dashboard
 * Used for anomaly detection and parent reporting
 */
export const workModeWeeklyAnalyticsSchema = z.object({
  childId: z.string(),
  familyId: z.string(),

  // Weekly summary
  weeklySessionCount: z.number().default(0),
  weeklyTotalHours: z.number().default(0), // Total work hours this week
  weeklyAverageSessionHours: z.number().default(0),

  // Comparison to previous week
  hoursChange: z.number().default(0), // positive = more, negative = less
  sessionCountChange: z.number().default(0),

  // Comparison to baseline (for anomaly detection)
  typicalWeeklyHours: z.number().default(0), // 3-week rolling average
  deviationFromTypical: z.number().default(0), // percentage
  isAnomalous: z.boolean().default(false), // true if deviation > 50%

  // Session breakdown
  scheduledSessions: z.number().default(0),
  manualSessions: z.number().default(0),
  outsideScheduleCount: z.number().default(0), // count of manual sessions outside schedule

  // Daily distribution
  dailyDistribution: z.record(dayOfWeekSchema, z.number()).default({} as Record<DayOfWeek, number>),

  // Metadata
  weekStartDate: z.string(), // YYYY-MM-DD (Monday)
  weekEndDate: z.string(), // YYYY-MM-DD (Sunday)
  computedAt: z.number(),
})

export type WorkModeWeeklyAnalytics = z.infer<typeof workModeWeeklyAnalyticsSchema>

/**
 * Parent check-in request for work mode
 * Stored at families/{familyId}/workModeCheckIns/{childId}/{checkInId}
 */
export const workModeCheckInSchema = z.object({
  id: z.string(),
  familyId: z.string(),
  childId: z.string(),
  parentId: z.string(),
  parentName: z.string(),
  message: z.string().min(1).max(500),
  sentAt: z.number(),
  readAt: z.number().nullable().default(null),
  response: z.string().max(1000).nullable().default(null),
  respondedAt: z.number().nullable().default(null),
})

export type WorkModeCheckIn = z.infer<typeof workModeCheckInSchema>

/**
 * Work mode analytics messages - trust-based framing (Story 33.6 AC5)
 * All messages are supportive, not punitive or accusatory
 */
export const WORK_MODE_ANALYTICS_MESSAGES = {
  // Weekly hours summary (AC1)
  weeklyHours: (hours: number, childName: string) => {
    if (hours === 0) return `${childName} hasn't logged work time yet this week`
    if (hours < 5) return `${childName} worked ${hours.toFixed(1)} hours this week`
    if (hours < 15) return `${childName} worked ${hours.toFixed(1)} hours this week - nice job!`
    if (hours < 25) return `${childName} worked ${hours.toFixed(1)} hours this week - busy week!`
    return `${childName} worked ${hours.toFixed(1)} hours this week - that's a lot!`
  },

  // Trend indicator (AC1)
  hoursTrend: (change: number) => {
    if (change === 0) return 'Same as last week'
    if (change > 0) return `${change.toFixed(1)} more hours than last week`
    return `${Math.abs(change).toFixed(1)} fewer hours than last week`
  },

  // Anomaly detection (AC2) - trust-based framing
  anomalyAlert: (currentHours: number, typicalHours: number, deviation: number) => {
    const deviationPercent = Math.round(deviation * 100)
    return `Work hours are ${deviationPercent}% higher than usual this week (${currentHours.toFixed(1)}h vs typical ${typicalHours.toFixed(1)}h). Just checking in!`
  },

  // Outside schedule notification (AC3) - informational only
  outsideSchedule: (childName: string) => {
    return `${childName} started work mode outside scheduled hours`
  },

  // Check-in templates (AC4) - friendly, non-interrogative
  checkInTemplates: [
    'How was work today?',
    'Hope your shift went well!',
    'Anything interesting at work?',
    'How are things going at your job?',
  ] as const,

  // Session type breakdown
  sessionBreakdown: (scheduled: number, manual: number) => {
    const total = scheduled + manual
    if (total === 0) return 'No work sessions yet'
    if (manual === 0) return `${scheduled} scheduled sessions`
    if (scheduled === 0) return `${manual} manually started sessions`
    return `${scheduled} scheduled, ${manual} manual sessions`
  },

  // Outside schedule count - informational
  outsideScheduleInfo: (count: number) => {
    if (count === 0) return 'All sessions within scheduled hours'
    if (count === 1) return '1 session started outside scheduled hours'
    return `${count} sessions started outside scheduled hours`
  },

  // Empty state
  emptyState: {
    title: 'Work Mode Analytics',
    message: 'Work sessions will appear here as they occur.',
    cta: 'Configure Work Schedule',
  },

  // Trust-based labels
  labels: {
    thisWeek: 'This Week',
    totalHours: 'Total Hours',
    sessions: 'Sessions',
    avgSession: 'Avg. Session',
    vsLastWeek: 'vs. Last Week',
    scheduled: 'Scheduled',
    manual: 'Manual',
    outsideSchedule: 'Outside Schedule',
    checkIn: 'Check In',
  },

  // Parent notification messages (AC3)
  parentNotifications: {
    outsideSchedule: (childName: string, time: string) =>
      `${childName} started work mode outside scheduled hours at ${time}`,
    anomalyDetected: (childName: string, hours: number, typical: number) =>
      `${childName}'s work hours (${hours.toFixed(1)}h) are higher than typical (${typical.toFixed(1)}h) this week`,
  },

  // Child transparency messages (AC6)
  childTransparency: {
    outsideScheduleInfo:
      'Your parents will be notified when you start work mode outside scheduled hours',
    anomalyInfo:
      'Your parents can see if your work hours are higher than usual (not a problem, just transparency)',
    checkInInfo: 'Your parents may send friendly check-ins about your work',
  },
} as const

/**
 * Check if work hours are anomalous (50%+ above typical)
 * Returns deviation percentage (0.5 = 50% above typical)
 */
export function calculateWorkHoursDeviation(
  currentHours: number,
  typicalHours: number
): { isAnomalous: boolean; deviation: number } {
  if (typicalHours === 0) {
    return { isAnomalous: false, deviation: 0 }
  }

  const deviation = (currentHours - typicalHours) / typicalHours
  return {
    isAnomalous: deviation > 0.5, // 50%+ above typical
    deviation,
  }
}

/**
 * Format work duration as hours and minutes
 * Example: 90 minutes -> "1h 30m", 45 minutes -> "45m"
 */
export function formatWorkDuration(minutes: number): string {
  if (minutes === 0) return '0m'

  const hours = Math.floor(minutes / 60)
  const mins = Math.round(minutes % 60)

  if (hours === 0) return `${mins}m`
  if (mins === 0) return `${hours}h`
  return `${hours}h ${mins}m`
}

/**
 * Convert minutes to hours with one decimal place
 */
export function minutesToHours(minutes: number): number {
  return Math.round((minutes / 60) * 10) / 10
}

// =============================================================================
// Story 34.1: Agreement Proposal Schemas
// =============================================================================

/**
 * Status of an agreement change proposal.
 *
 * Story 34.1: Parent-Initiated Agreement Change - AC4, AC6
 */
export const proposalStatusSchema = z.enum([
  'pending', // Awaiting response
  'pending_coparent_approval', // Story 3A.3: Awaiting other parent approval in shared custody
  'accepted', // Accepted by recipient
  'declined', // Declined by recipient
  'withdrawn', // Withdrawn by proposer
  'counter-proposed', // Counter-proposal made
  'activated', // Both parties confirmed, changes applied (Story 34.4)
  'expired', // Story 3A.3: 14-day timeout for co-parent approval
])
export type ProposalStatus = z.infer<typeof proposalStatusSchema>

/**
 * Co-parent approval status for shared custody proposals.
 *
 * Story 3A.3: Agreement Changes Two-Parent Approval - AC1, AC4
 */
export const coParentApprovalStatusSchema = z.enum([
  'pending', // Awaiting other parent approval
  'approved', // Other parent approved
  'declined', // Other parent declined
])
export type CoParentApprovalStatus = z.infer<typeof coParentApprovalStatusSchema>

/**
 * Type of change being proposed.
 *
 * Story 34.1: Parent-Initiated Agreement Change - AC2
 */
export const proposalChangeTypeSchema = z.enum([
  'add', // Adding a new term or value
  'modify', // Modifying an existing term
  'remove', // Removing a term
])
export type ProposalChangeType = z.infer<typeof proposalChangeTypeSchema>

/**
 * A single change within a proposal.
 *
 * Story 34.1: Parent-Initiated Agreement Change - AC1, AC2
 */
export const proposalChangeSchema = z.object({
  sectionId: z.string(), // e.g., 'time-limits', 'app-restrictions'
  sectionName: z.string(), // Display name for the section
  fieldPath: z.string(), // Dot-notation path to the field
  oldValue: z.unknown().nullable(), // Previous value (null for adds)
  newValue: z.unknown().nullable(), // New value (null for removes)
  changeType: proposalChangeTypeSchema,
})
export type ProposalChange = z.infer<typeof proposalChangeSchema>

/**
 * Agreement change proposal schema.
 *
 * Story 34.1: Parent-Initiated Agreement Change - All ACs
 * Story 3A.3: Agreement Changes Two-Parent Approval - Co-parent approval fields
 * Represents a proposed change to an active agreement.
 */
export const agreementProposalSchema = z.object({
  id: z.string(),
  familyId: z.string(),
  childId: z.string(),
  agreementId: z.string(), // The active agreement being modified
  proposedBy: z.enum(['parent', 'child']),
  proposerId: z.string(),
  proposerName: z.string(),

  // Changes being proposed
  changes: z.array(proposalChangeSchema),
  reason: z.string().nullable(), // Optional reason for the change (AC3)

  // Status tracking
  status: proposalStatusSchema,

  // Timestamps
  createdAt: z.number(),
  updatedAt: z.number(),
  respondedAt: z.number().nullable(), // When response was received

  // Versioning for optimistic locking and history
  version: z.number(),
  proposalNumber: z.number(), // Sequential within family

  // Story 3A.3: Co-parent approval for shared custody (AC1, AC2, AC4, AC5)
  coParentApprovalRequired: z.boolean().default(false),
  coParentApprovalStatus: coParentApprovalStatusSchema.nullable().default(null),
  coParentApprovedByUid: z.string().nullable().default(null),
  coParentApprovedAt: z.number().nullable().default(null),
  coParentDeclineReason: z.string().nullable().default(null),
  expiresAt: z.number().nullable().default(null), // 14 days from creation for co-parent approval
})
export type AgreementProposal = z.infer<typeof agreementProposalSchema>

/**
 * Response action types.
 *
 * Story 34.3, 34.4: For future stories but defined here for completeness
 */
export const proposalResponseActionSchema = z.enum([
  'accept', // Accept the proposal as-is
  'decline', // Decline the proposal
  'counter', // Make a counter-proposal
])
export type ProposalResponseAction = z.infer<typeof proposalResponseActionSchema>

/**
 * Proposal response schema.
 *
 * Story 34.3, 34.4: Response to a proposal (accept/decline/counter)
 */
export const proposalResponseSchema = z.object({
  id: z.string(),
  proposalId: z.string(),
  responderId: z.string(),
  responderName: z.string(),
  action: proposalResponseActionSchema,
  comment: z.string().nullable(), // Optional comment with response
  counterChanges: z.array(proposalChangeSchema).nullable(), // For counter-proposals
  createdAt: z.number(),
})
export type ProposalResponse = z.infer<typeof proposalResponseSchema>

// =============================================================================
// STORY 34.4: DUAL-SIGNATURE CHANGE ACTIVATION
// =============================================================================

/**
 * Signature action types for dual-signature workflow.
 *
 * Story 34.4: Dual-Signature Change Activation - AC2
 */
export const signatureActionSchema = z.enum([
  'proposed', // Initial proposal creation
  'accepted', // Recipient accepted the proposal
  'confirmed', // Proposer confirmed after acceptance
])
export type SignatureAction = z.infer<typeof signatureActionSchema>

/**
 * Role in signature (parent or child).
 *
 * Story 34.4: Dual-Signature Change Activation - AC2
 */
export const signatureRoleSchema = z.enum(['parent', 'child'])
export type SignatureRole = z.infer<typeof signatureRoleSchema>

/**
 * Digital signature record for agreement changes.
 *
 * Story 34.4: Dual-Signature Change Activation - AC2
 * Records who signed, when, and what action they took.
 */
export const signatureRecordSchema = z.object({
  userId: z.string(),
  userName: z.string(),
  role: signatureRoleSchema,
  signedAt: z.number(), // Unix timestamp
  action: signatureActionSchema,
})
export type SignatureRecord = z.infer<typeof signatureRecordSchema>

/**
 * Dual signature container for both parties.
 *
 * Story 34.4: Dual-Signature Change Activation - AC2
 */
export const dualSignaturesSchema = z.object({
  proposer: signatureRecordSchema,
  recipient: signatureRecordSchema,
})
export type DualSignatures = z.infer<typeof dualSignaturesSchema>

/**
 * Activated agreement version for history tracking.
 *
 * Story 34.4: Dual-Signature Change Activation - AC3, AC6
 * Represents an activated version of an agreement with dual signatures.
 * Stored in agreements/{agreementId}/versions subcollection.
 */
export const activatedAgreementVersionSchema = z.object({
  id: z.string(),
  agreementId: z.string(),
  familyId: z.string(),
  childId: z.string(),
  versionNumber: z.number().int().positive(),

  // Content at this version
  content: z.record(z.unknown()), // Flexible content structure

  // Change tracking
  changedFromVersion: z.number().nullable(), // null for initial version
  proposalId: z.string().nullable(), // null for initial version

  // Dual signatures
  signatures: dualSignaturesSchema,

  // Timestamps
  createdAt: z.number(),
  activatedAt: z.number(),
})
export type ActivatedAgreementVersion = z.infer<typeof activatedAgreementVersionSchema>

/**
 * Agreement proposal messages with positive framing.
 *
 * Story 34.1: Parent-Initiated Agreement Change - AC3, AC5, AC6
 */
export const AGREEMENT_PROPOSAL_MESSAGES = {
  // Child notification message (AC5)
  childNotification: (proposerName: string) =>
    `${proposerName} proposed a change to your agreement`,

  // Pending status message (AC6)
  pendingStatus: (childName: string) => `Waiting for ${childName} to review`,

  // Withdraw confirmation
  withdrawConfirmation: 'Are you sure you want to withdraw this proposal?',

  // Positive framing prompts for reason field (AC3)
  reasonPrompts: [
    "You've been responsible with gaming",
    "You've shown great time management",
    'Your grades have improved',
    "You've been helpful around the house",
    'As a reward for your hard work',
  ],

  // Section names for display
  sectionNames: {
    timeLimits: 'Time Limits',
    appRestrictions: 'App Restrictions',
    monitoringSettings: 'Monitoring Settings',
    rewards: 'Rewards & Privileges',
    general: 'General Terms',
  },
} as const

/**
 * Child proposal messages with age-appropriate, encouraging language.
 *
 * Story 34.2: Child-Initiated Agreement Change - AC2
 */
export const CHILD_PROPOSAL_MESSAGES = {
  // Parent notification message (AC4)
  parentNotification: (childName: string) => `${childName} proposed a change to the agreement`,

  // Pending status message (AC5)
  pendingStatus: (parentName: string) => `Waiting for ${parentName} to review`,

  // Encouragement for reason field
  encouragement: 'Tell your parents why this change would help you',

  // Age-appropriate reason prompts (AC2)
  reasonPrompts: [
    "I've been responsible with my screen time lately",
    'I need more gaming time for playing with friends',
    'I think this rule is too strict for my age',
    'I want to try having more freedom',
  ],

  // Success message on submission
  successMessage: 'Great job speaking up!',

  // Celebratory confirmation
  confirmationMessage: "Your request has been sent! We're proud of you for sharing your thoughts.",
} as const

/**
 * Decline reason options with respectful, non-punitive language.
 *
 * Story 34.5: Change Decline Handling - AC1, AC2
 */
export const DECLINE_REASONS = [
  { id: 'not-ready', label: "I'm not ready for this change yet" },
  { id: 'need-discussion', label: "Let's discuss this together first" },
  { id: 'too-soon', label: "It's too soon since our last change" },
  { id: 'need-more-info', label: 'I need more information about this' },
  { id: 'prefer-different', label: "I'd prefer a different approach" },
  { id: 'custom', label: 'Other reason...' },
] as const

export const declineReasonIdSchema = z.enum([
  'not-ready',
  'need-discussion',
  'too-soon',
  'need-more-info',
  'prefer-different',
  'custom',
])
export type DeclineReasonId = z.infer<typeof declineReasonIdSchema>

/**
 * Decline UI messages with supportive tone.
 *
 * Story 34.5: Change Decline Handling - AC1, AC2
 */
export const DECLINE_MESSAGES = {
  header: 'Why are you declining?',
  subheader: 'A thoughtful response helps continue the conversation',
  customPrompt: 'Share your thoughts:',
  customMinChars: 10,
  encouragement: 'Your response helps the other person understand your perspective.',
} as const

/**
 * Messages shown after a proposal is declined.
 *
 * Story 34.5: Change Decline Handling - AC3, AC5, AC6
 */
export const AFTER_DECLINE_MESSAGES = {
  proposer: {
    title: 'Proposal Declined',
    body: "This isn't the end of the conversation.",
    tryAgain: 'You can propose again after some time has passed.',
    cooldownInfo: 'Wait 7 days before proposing the same change.',
    suggestions: [
      'Wait a few days and try a modified proposal',
      'Discuss in person to understand their concerns',
      'Consider a smaller step toward your goal',
    ],
  },
  responder: {
    title: 'You Declined the Proposal',
    body: 'Thank you for your thoughtful response.',
    next: 'Consider discussing this together to find common ground.',
  },
  notification: {
    title: 'Proposal Response',
    body: (responderName: string) => `${responderName} isn't ready for this change yet.`,
    supportive: 'You can discuss this together or propose something different later.',
  },
} as const

// Re-export agreement history types and constants (Story 34.6)
export {
  agreementChangeSchema,
  historyVersionSchema,
  HISTORY_MESSAGES,
  getUpdateCountMessage,
  getGrowthMessage,
  type AgreementChange,
  type HistoryVersion,
} from './agreementHistory'

// Re-export agreement expiry types and constants (Story 35.1)
export {
  expiryDurationSchema,
  EXPIRY_DURATIONS,
  EXPIRY_DURATION_LABELS,
  EXPIRY_MESSAGES,
  getRecommendedExpiry,
  calculateExpiryDate,
  isExpiringSoon,
  getDaysUntilExpiry,
  getAnnualReviewDate,
  type ExpiryDuration,
  type ExpiryDurationConfig,
} from './agreementExpiry'

// Re-export renewal reminder types and constants (Story 35.2)
export {
  reminderTypeSchema,
  reminderStatusSchema,
  REMINDER_THRESHOLDS,
  SNOOZE_DURATION_DAYS,
  REMINDER_MESSAGES,
  REMINDER_CONFIGS,
  getReminderType,
  calculateSnoozeExpiry,
  isSnoozeExpired,
  shouldShowReminder,
  getReminderConfig,
  type ReminderType,
  type ReminderStatus,
  type SnoozeInfo,
  type ReminderConfig,
} from './renewalReminder'

// Re-export agreement renewal types and constants (Story 35.3)
export {
  renewalModeSchema,
  renewalStatusSchema,
  renewalInitiatorSchema,
  renewalRequestSchema,
  renewalConsentSchema,
  consentRoleSchema,
  RENEWAL_MODES,
  RENEWAL_STATUS,
  RENEWAL_MESSAGES as AGREEMENT_RENEWAL_MESSAGES,
  calculateRenewalExpiryDate,
  isEligibleForRenewal,
  canRenewAsIs,
  getRenewalModeConfig,
  isRenewalComplete,
  type RenewalMode,
  type RenewalStatus,
  type RenewalInitiator,
  type RenewalRequest,
  type RenewalConsent,
  type ConsentRole,
  type RenewalModeConfig,
} from './agreementRenewal'

// Re-export agreement grace period types and constants (Story 35.4)
export {
  gracePeriodStatusSchema,
  gracePeriodInfoSchema,
  GRACE_PERIOD_DAYS,
  GRACE_PERIOD_STATUS,
  GRACE_PERIOD_MESSAGES,
  getGracePeriodEndDate,
  getDaysRemainingInGracePeriod,
  isInGracePeriod,
  hasGracePeriodExpired,
  getGracePeriodInfo,
  isMonitoringActiveInGracePeriod,
  getGracePeriodStatusConfig,
  formatGracePeriodMessage,
  getGracePeriodMessage,
  type GracePeriodStatus,
  type GracePeriodInfo,
  type GracePeriodUrgency,
  type GracePeriodStatusConfig,
  type AgreementForGracePeriod,
} from './agreementGracePeriod'

// Re-export post-grace period types and constants (Story 35.5)
export {
  postGraceStatusSchema,
  POST_GRACE_STATUS,
  POST_GRACE_BEHAVIOR,
  POST_GRACE_MESSAGES,
  isMonitoringPaused,
  getPostGraceStatus,
  canResumeMonitoring,
  shouldCaptureScreenshots,
  shouldEnforceTimeLimits,
  getPostGraceMessage,
  getMonitoringPauseReason,
  getResumeRequirements,
  type PostGraceStatus,
  type AgreementForPostGrace,
} from './agreementPostGrace'

// Annual Review (Story 35.6)
export {
  ANNUAL_REVIEW_INTERVAL_DAYS,
  annualReviewStatusSchema,
  ANNUAL_REVIEW_MESSAGES,
  AGE_SUGGESTION_THRESHOLDS,
  annualReviewPromptSchema,
  isAnnualReviewDue,
  getDaysSinceLastReview,
  getAgeBasedSuggestions,
  getAnnualReviewStatus,
  type AnnualReviewStatus,
  type AnnualReviewPrompt,
  type AgreementForAnnualReview,
  type AgeSuggestionThreshold,
} from './annualReview'

// Trust Score (Story 36.1)
export {
  TRUST_SCORE_MIN,
  TRUST_SCORE_MAX,
  TRUST_SCORE_DEFAULT,
  trustFactorTypeSchema,
  trustFactorCategorySchema,
  trustFactorSchema,
  trustScoreHistoryEntrySchema,
  trustScoreSchema,
  type TrustFactorType,
  type TrustFactorCategory,
  type TrustFactor,
  type TrustScoreHistoryEntry,
  type TrustScore,
} from './trustScore'

// Trust Factor Definitions (Story 36.1)
export {
  TRUST_FACTOR_DEFINITIONS,
  getFactorDefinition,
  getFactorsByCategory,
  calculateFactorPoints,
  type TrustFactorDefinition,
} from './trustFactorDefinitions'

// Trust Score Validation (Story 36.1)
export {
  isValidScore,
  clampScore,
  validateTrustScore,
  validateFactor,
  isScoreUpdateDue,
  type ValidationResult,
} from './trustScoreValidation'

// Trust Score Calculation (Story 36.2)
export {
  RECENCY_WEIGHT_LAST_7_DAYS,
  RECENCY_WEIGHT_LAST_14_DAYS,
  RECENCY_WEIGHT_LAST_30_DAYS,
  RECENCY_WEIGHT_OLDER,
  RECENCY_DAYS_7,
  RECENCY_DAYS_14,
  RECENCY_DAYS_30,
  MAX_DAILY_INCREASE,
  MAX_DAILY_DECREASE,
  scoreBreakdownSchema,
  scoreCalculationResultSchema,
  getRecencyWeight,
  applyRecencyWeight,
  getPositiveContribution,
  getNeutralContribution,
  getConcerningContribution,
  calculateWeightedFactorContribution,
  generateScoreBreakdown,
  clampDailyDelta,
  calculateNewScore,
  type ScoreBreakdown,
  type ScoreCalculationResult,
} from './trustScoreCalculation'

// Trust Score Breakdown Display (Story 36.2)
export {
  formatFactorContribution,
  formatFactorWithRecency,
  formatFactorList,
  formatScoreChange,
  formatScoreChangeWithPeriod,
  getCategoryContributionText,
  getCategoryLabel,
  generateBreakdownText,
  generateBreakdownSummary,
  getFactorTypeLabel,
  generateImprovementTips,
  generateEncouragement,
} from './trustScoreBreakdown'

// Post-Graduation Support (Story 38.7)
export {
  ALUMNI_STATUS,
  WELLNESS_TIP_CATEGORIES,
  PARENT_RESOURCE_CATEGORIES,
  alumniStatusSchema,
  alumniProfileSchema,
  digitalWellnessTipSchema,
  selfTrackingPreferencesSchema,
  parentResourceSchema,
  graduationCelebrationSchema,
  createAlumniProfile as createAlumniProfileContract,
  createWellnessTip,
  createParentResource,
  createSelfTrackingPreferences,
  createGraduationCelebration,
  isAlumniEligibleForRejoin,
  validateSelfTrackingPrivacy,
  isValidAlumniProfile,
  type AlumniStatus,
  type AlumniProfile,
  type DigitalWellnessTip,
  type SelfTrackingPreferences,
  type ParentResource,
  type GraduationCelebration,
  type WellnessTipCategory,
  type ParentResourceCategory,
} from './postGraduation'

// Child Safety Signal (Story 7.5.1)
export {
  // Constants
  LOGO_TAP_COUNT,
  LOGO_TAP_WINDOW_MS,
  KEYBOARD_SHORTCUT,
  SIGNAL_STATUS,
  TRIGGER_METHOD,
  SIGNAL_PLATFORM,
  VALID_STATUS_TRANSITIONS,
  // Schemas
  signalStatusSchema,
  triggerMethodSchema,
  signalPlatformSchema,
  safetySignalSchema,
  safetySignalTriggerEventSchema,
  offlineSignalQueueEntrySchema,
  // Factory functions
  generateSignalId,
  generateTriggerEventId,
  createSafetySignal,
  createTriggerEvent,
  createOfflineQueueEntry,
  // Validation functions
  validateSafetySignal,
  isSafetySignal,
  validateTriggerEvent,
  isTriggerEvent,
  // Status helpers
  isValidStatusTransition,
  getNextStatus,
  // Types
  type SignalStatus,
  type TriggerMethod,
  type SignalPlatform,
  type SafetySignal,
  type SafetySignalTriggerEvent,
  type OfflineSignalQueueEntry,
} from './safetySignal'

// Crisis Partner (Story 7.5.2)
export {
  // Constants
  PARTNER_CAPABILITY,
  FAMILY_STRUCTURE,
  ROUTING_STATUS,
  // Schemas
  partnerCapabilitySchema,
  familyStructureSchema,
  routingStatusSchema,
  crisisPartnerSchema,
  signalRoutingPayloadSchema,
  signalRoutingResultSchema,
  blackoutRecordSchema,
  // Factory functions
  generatePartnerId,
  generateRoutingResultId,
  generateBlackoutId,
  createCrisisPartner,
  createSignalRoutingPayload,
  createSignalRoutingResult,
  createBlackoutRecord,
  // Validation functions
  validateCrisisPartner,
  validateSignalRoutingPayload,
  validateSignalRoutingResult,
  isCrisisPartner,
  isSignalRoutingPayload,
  // Utility functions
  calculateChildAge,
  isValidJurisdiction,
  partnerSupportsJurisdiction,
  // Types
  type PartnerCapability,
  type FamilyStructure,
  type RoutingStatus,
  type CrisisPartner,
  type SignalRoutingPayload,
  type SignalRoutingResult,
  type BlackoutRecord,
} from './crisisPartner'

// Signal Confirmation exports (Story 7.5.3)
export {
  // Constants
  RESOURCE_TYPE,
  CONFIRMATION_EVENT_TYPE,
  CONFIRMATION_DEFAULTS,
  // Schemas (renamed to avoid conflict with crisis-urls exports)
  resourceTypeSchema,
  confirmationEventTypeSchema,
  crisisResourceSchema as signalCrisisResourceSchema,
  signalConfirmationSchema,
  confirmationContentSchema,
  confirmationDisplayEventSchema,
  // ID Generators
  generateResourceId,
  generateConfirmationId,
  generateDisplayEventId,
  // Factory Functions
  createCrisisResource as createSignalCrisisResource,
  createSignalConfirmation,
  createConfirmationContent,
  createConfirmationDisplayEvent,
  createDefaultUSResources,
  createDefaultUKResources,
  createDefaultCAResources,
  createDefaultAUResources,
  // Validation Functions
  validateCrisisResource as validateSignalCrisisResource,
  validateSignalConfirmation,
  validateConfirmationContent,
  isCrisisResource as isSignalCrisisResource,
  isSignalConfirmation,
  // Utility Functions
  validateReadingLevel,
  getResourcesByType,
  getResourcesByJurisdiction,
  sortResourcesByPriority,
  filterChatResources,
  // Types (renamed to avoid conflict with crisis-urls CrisisResource type)
  type ResourceType,
  type ConfirmationEventType,
  type CrisisResource as SignalCrisisResource,
  type SignalConfirmation,
  type ConfirmationContent,
  type ConfirmationDisplayEvent,
} from './signalConfirmation'

// Story 34.5.1: Rejection Pattern Tracking
export {
  REJECTION_WINDOW_DAYS,
  REJECTION_THRESHOLD,
  rejectionPatternSchema,
  rejectionEventSchema,
  escalationEventSchema,
  type RejectionPattern,
  type RejectionEvent,
  type EscalationEvent,
} from './rejectionPattern'

// Story 34.5.2: Mediation Resources
export {
  ageTierSchema,
  resourceTypeSchema as mediationResourceTypeSchema,
  mediationResourceSchema,
  familyMeetingTemplateSchema,
  negotiationTipSchema,
  escalationAcknowledgmentSchema,
  type AgeTier,
  type ResourceType as MediationResourceType,
  type MediationResource,
  type FamilyMeetingTemplate,
  type NegotiationTip,
  type EscalationAcknowledgment,
} from './mediationResources'

// Story 40.1: Location-Based Rule Opt-In
export {
  locationOptInStatusSchema,
  locationSettingsSchema,
  locationOptInRequestStatusSchema,
  locationOptInRequestSchema,
  requestLocationOptInInputSchema,
  approveLocationOptInInputSchema,
  disableLocationFeaturesInputSchema,
  DEFAULT_LOCATION_SETTINGS,
  LOCATION_OPT_IN_EXPIRY_MS,
  type LocationOptInStatus,
  type LocationSettings,
  type LocationOptInRequestStatus,
  type LocationOptInRequest,
  type RequestLocationOptInInput,
  type ApproveLocationOptInInput,
  type DisableLocationFeaturesInput,
} from './locationSettings'

// Story 40.2: Location-Specific Rule Configuration - Location Zones
export {
  locationZoneTypeSchema,
  locationZoneSchema,
  createLocationZoneInputSchema,
  updateLocationZoneInputSchema,
  deleteLocationZoneInputSchema,
  DEFAULT_GEOFENCE_RADIUS_METERS,
  MIN_GEOFENCE_RADIUS_METERS,
  MAX_GEOFENCE_RADIUS_METERS,
  type LocationZoneType,
  type LocationZone,
  type CreateLocationZoneInput,
  type UpdateLocationZoneInput,
  type DeleteLocationZoneInput,
} from './locationZones'

// Story 40.2: Location-Specific Rule Configuration - Location Rules
export {
  categoryOverrideValueSchema,
  categoryOverridesSchema,
  locationRuleSchema,
  setLocationRuleInputSchema,
  deleteLocationRuleInputSchema,
  effectiveLocationRuleSchema,
  type CategoryOverrideValue,
  type CategoryOverrides,
  type LocationRule,
  type SetLocationRuleInput,
  type DeleteLocationRuleInput,
  type EffectiveLocationRule,
} from './locationRules'

// Story 40.3: Fleeing Mode - Safe Escape
export {
  SAFE_ESCAPE_SILENT_PERIOD_MS,
  SAFE_ESCAPE_SILENT_PERIOD_HOURS,
  SAFE_ESCAPE_NOTIFICATION_MESSAGE,
  SAFE_ESCAPE_CHILD_MESSAGES,
  SAFE_ESCAPE_ADULT_MESSAGES,
  safeEscapeActivationSchema,
  activateSafeEscapeInputSchema,
  activateSafeEscapeResponseSchema,
  reenableSafeEscapeInputSchema,
  reenableSafeEscapeResponseSchema,
  safeEscapeStatusSchema,
  calculateHoursUntilNotification,
  shouldSendNotification,
  type SafeEscapeActivation,
  type ActivateSafeEscapeInput,
  type ActivateSafeEscapeResponse,
  type ReenableSafeEscapeInput,
  type ReenableSafeEscapeResponse,
  type SafeEscapeStatus,
} from './safeEscape'

// Story 40.4: Location Transition Handling
export {
  LOCATION_TRANSITION_GRACE_PERIOD_MS,
  LOCATION_TRANSITION_GRACE_PERIOD_SECONDS,
  LOCATION_UPDATE_MIN_INTERVAL_MS,
  LOCATION_MAX_ACCURACY_METERS,
  TRANSITION_CHILD_MESSAGES,
  TRANSITION_ADULT_MESSAGES,
  appliedRulesSchema,
  locationTransitionSchema,
  deviceLocationSchema,
  locationUpdateInputSchema,
  locationUpdateResponseSchema,
  getLocationTransitionsInputSchema,
  getLocationTransitionsResponseSchema,
  calculateDistanceMeters,
  isWithinZone,
  calculateGracePeriodMinutes,
  isGracePeriodExpired,
  type AppliedRules,
  type LocationTransition,
  type DeviceLocation,
  type LocationUpdateInput,
  type LocationUpdateResponse,
  type GetLocationTransitionsInput,
  type GetLocationTransitionsResponse,
} from './locationTransition'

// Story 40.5: Location Privacy Controls
export {
  childLocationStatusSchema,
  locationDisableRequestSchema,
  locationDisableRequestStatusSchema,
  requestLocationDisableInputSchema,
  getChildLocationStatusInputSchema,
  getChildLocationHistoryInputSchema,
  childLocationHistoryItemSchema,
  getChildLocationHistoryResponseSchema,
  LOCATION_PRIVACY_MESSAGES,
  LOCATION_DISABLE_REQUEST_MESSAGES,
  formatTimeDescription,
  calculateDurationMinutes,
  type ChildLocationStatus,
  type LocationDisableRequest,
  type LocationDisableRequestStatus,
  type RequestLocationDisableInput,
  type GetChildLocationStatusInput,
  type GetChildLocationHistoryInput,
  type ChildLocationHistoryItem,
  type GetChildLocationHistoryResponse,
} from './locationPrivacy'

// Story 40.6: Location Feature Abuse Prevention
export {
  LOCATION_ABUSE_THRESHOLDS,
  LOCATION_ABUSE_RESOURCES,
  LOCATION_ABUSE_MESSAGES,
  locationAbusePatternTypeSchema,
  locationAccessTypeSchema,
  locationAccessLogSchema,
  trackLocationAccessInputSchema,
  asymmetricCheckMetadataSchema,
  frequentRuleChangeMetadataSchema,
  crossCustodyRestrictionMetadataSchema,
  locationAbuseMetadataSchema,
  locationAbusePatternSchema,
  locationAbuseAlertSchema,
  sendLocationAbuseAlertInputSchema,
  locationAbuseAlertResponseSchema,
  locationAutoDisableSchema,
  guardianAccessCountSchema,
  asymmetryResultSchema,
  type LocationAbusePatternType,
  type LocationAccessType,
  type LocationAccessLog,
  type TrackLocationAccessInput,
  type AsymmetricCheckMetadata,
  type FrequentRuleChangeMetadata,
  type CrossCustodyRestrictionMetadata,
  type LocationAbuseMetadata,
  type LocationAbusePattern,
  type LocationAbuseAlert,
  type SendLocationAbuseAlertInput,
  type LocationAbuseAlertResponse,
  type LocationAutoDisable,
  type GuardianAccessCount,
  type AsymmetryResult,
} from './locationAbuse'

// Story 41.1: Notification Preferences Configuration
export {
  NOTIFICATION_DEFAULTS,
  QUIET_HOURS_DEFAULTS,
  SYNC_THRESHOLD_OPTIONS,
  MEDIUM_FLAGS_MODE_OPTIONS,
  mediumFlagsModeSchema,
  syncThresholdHoursSchema,
  parentNotificationPreferencesSchema,
  notificationPreferencesUpdateSchema,
  getNotificationPreferencesInputSchema,
  updateNotificationPreferencesInputSchema,
  createDefaultNotificationPreferences,
  applyPreferencesUpdate,
  isInQuietHours,
  shouldSendNotification as shouldSendNotificationByPrefs,
  getPreferencesDescription,
  type ParentNotificationPreferences,
  type NotificationPreferencesUpdate,
  type GetNotificationPreferencesInput,
  type UpdateNotificationPreferencesInput,
  type MediumFlagsMode,
  type SyncThresholdHours,
} from './notificationPreferences'

// Story 41.3: Time Limit Notifications
export {
  TIME_LIMIT_NOTIFICATION_TYPES,
  LIMIT_TYPES,
  DEFAULT_WARNING_MINUTES,
  timeLimitNotificationTypeSchema,
  limitTypeSchema,
  timeLimitNotificationEventSchema,
  timeLimitNotificationContentSchema,
  childTimeLimitNotificationPreferencesSchema,
  extensionRequestNotificationParamsSchema,
  timeLimitWarningParamsSchema,
  limitReachedParamsSchema,
  buildParentWarningContent,
  buildParentLimitReachedContent,
  buildExtensionRequestContent,
  buildChildWarningContent,
  buildChildLimitReachedContent,
  formatMinutes,
  type TimeLimitNotificationType,
  type LimitType,
  type TimeLimitNotificationEvent,
  type TimeLimitNotificationContent,
  type ChildTimeLimitNotificationPreferences,
  type ExtensionRequestNotificationParams,
  type TimeLimitWarningParams,
  type LimitReachedParams,
} from './timeLimitNotifications'
