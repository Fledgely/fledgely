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
 * Agreement template schema.
 *
 * Represents a pre-built agreement template for families.
 * Templates are organized by age group and variation.
 *
 * Story 4.1: Template Library Structure - AC1, AC2, AC3
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
})
export type AgreementTemplate = z.infer<typeof agreementTemplateSchema>
