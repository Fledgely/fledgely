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
 * Caregiver entry in a family document.
 * Story 19D.1: Caregiver Invitation & Onboarding
 * Defined here for use in familySchema.
 */
export const familyCaregiverSchema = z.object({
  uid: z.string(),
  email: z.string().email(),
  displayName: z.string().nullable(),
  role: caregiverRoleSchema,
  childIds: z.array(z.string()), // Which children they can view (AC5)
  accessWindows: z.array(accessWindowSchema).optional(), // For Story 19D.4
  addedAt: z.date(),
  addedByUid: z.string(), // Parent who invited
})
export type FamilyCaregiver = z.infer<typeof familyCaregiverSchema>

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
