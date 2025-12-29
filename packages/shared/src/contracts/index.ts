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
