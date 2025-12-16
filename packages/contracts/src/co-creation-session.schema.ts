import { z } from 'zod'
import { monitoringLevelSchema, type MonitoringLevel } from './agreement-template.schema'

/**
 * Co-Creation Session Schema - Story 5.1: Co-Creation Session Initiation
 *
 * This schema defines types for co-creation sessions where parents and children
 * build digital family agreements together as a collaborative activity.
 *
 * Sessions are:
 * 1. Stored in Firestore under /families/{familyId}/co-creation-sessions/{sessionId}
 * 2. Tracked with contribution history for transparency
 * 3. Pausable and resumable for family flexibility
 * 4. Designed for screen sharing (AC #5)
 *
 * Design principles:
 * - Both parent and child contributions are tracked (AC #3)
 * - Sessions can be paused/resumed (AC #4)
 * - 30-minute inactivity timeout warning (AC #6)
 * - Integration with Epic 4 drafts (WizardDraft, TemplateDraft)
 */

// ============================================
// CONSTANTS
// ============================================

/**
 * Maximum field lengths for session data
 */
export const SESSION_FIELD_LIMITS = {
  id: 128,
  familyId: 128,
  childId: 128,
  initiatedBy: 128,
  templateId: 128,
  draftId: 128,
  termId: 128,
  termContent: 5000,
  contributionDetails: 2000,
} as const

/**
 * Maximum number of items in session arrays
 */
export const SESSION_ARRAY_LIMITS = {
  maxTerms: 100, // NFR60: 100 conditions max
  maxContributions: 1000, // Audit trail limit
} as const

/**
 * Session timeout constants (in milliseconds)
 */
export const SESSION_TIMEOUT_CONSTANTS = {
  /** Warning displayed at 25 minutes of inactivity */
  INACTIVITY_WARNING_MS: 25 * 60 * 1000,
  /** Session auto-pauses at 30 minutes of inactivity (AC #6) */
  INACTIVITY_TIMEOUT_MS: 30 * 60 * 1000,
  /** Session abandoned after 30 days without activity */
  ABANDONMENT_THRESHOLD_MS: 30 * 24 * 60 * 60 * 1000,
} as const

// ============================================
// SESSION STATUS SCHEMA
// ============================================

/**
 * Session status enum representing the lifecycle of a co-creation session
 */
export const sessionStatusSchema = z.enum([
  'initializing', // Session created, waiting for child presence confirmation (AC #1)
  'active', // Both parties engaged, building agreement
  'paused', // Family taking a break, can resume (AC #4)
  'completed', // Agreement finished, ready for signing (Epic 6)
  'abandoned', // Session abandoned (30 days without activity)
])

export type SessionStatus = z.infer<typeof sessionStatusSchema>

/**
 * Human-readable labels for session status
 */
export const SESSION_STATUS_LABELS: Record<SessionStatus, string> = {
  initializing: 'Getting Ready',
  active: 'In Progress',
  paused: 'Paused',
  completed: 'Completed',
  abandoned: 'Abandoned',
}

/**
 * Descriptions for session status at 6th-grade reading level (NFR65)
 */
export const SESSION_STATUS_DESCRIPTIONS: Record<SessionStatus, string> = {
  initializing: 'Waiting for everyone to sit together to start.',
  active: 'You are building your agreement together.',
  paused: 'Taking a break. You can come back later.',
  completed: 'Your agreement is ready to sign!',
  abandoned: 'This session was not finished.',
}

/**
 * Get human-readable label for session status
 */
export function getSessionStatusLabel(status: SessionStatus): string {
  return SESSION_STATUS_LABELS[status]
}

/**
 * Get description for session status
 */
export function getSessionStatusDescription(status: SessionStatus): string {
  return SESSION_STATUS_DESCRIPTIONS[status]
}

// ============================================
// SESSION CONTRIBUTOR SCHEMA
// ============================================

/**
 * Who made a contribution to the session (AC #3)
 */
export const sessionContributorSchema = z.enum(['parent', 'child'])

export type SessionContributor = z.infer<typeof sessionContributorSchema>

/**
 * Human-readable labels for contributors
 */
export const SESSION_CONTRIBUTOR_LABELS: Record<SessionContributor, string> = {
  parent: 'Parent',
  child: 'Child',
}

/**
 * Get human-readable label for contributor
 */
export function getSessionContributorLabel(contributor: SessionContributor): string {
  return SESSION_CONTRIBUTOR_LABELS[contributor]
}

// ============================================
// CONTRIBUTION ACTION SCHEMA
// ============================================

/**
 * Types of actions that can be recorded in contribution history
 */
export const contributionActionSchema = z.enum([
  'added_term', // New term added to agreement
  'modified_term', // Existing term changed
  'removed_term', // Term removed from agreement
  'marked_for_discussion', // Term flagged for discussion
  'resolved_discussion', // Discussion on term resolved
  'session_started', // Session began
  'session_paused', // Session paused
  'session_resumed', // Session resumed
])

export type ContributionAction = z.infer<typeof contributionActionSchema>

/**
 * Human-readable labels for contribution actions
 */
export const CONTRIBUTION_ACTION_LABELS: Record<ContributionAction, string> = {
  added_term: 'Added Term',
  modified_term: 'Changed Term',
  removed_term: 'Removed Term',
  marked_for_discussion: 'Marked for Discussion',
  resolved_discussion: 'Resolved Discussion',
  session_started: 'Started Session',
  session_paused: 'Paused Session',
  session_resumed: 'Resumed Session',
}

/**
 * Get human-readable label for contribution action
 */
export function getContributionActionLabel(action: ContributionAction): string {
  return CONTRIBUTION_ACTION_LABELS[action]
}

// ============================================
// SESSION CONTRIBUTION SCHEMA
// ============================================

/**
 * A single contribution to the session (AC #3)
 * Tracks who made what change and when
 */
export const sessionContributionSchema = z.object({
  /** Unique contribution ID (UUID) */
  id: z.string().uuid('Contribution ID must be a valid UUID'),

  /** Who made this contribution */
  contributor: sessionContributorSchema,

  /** What action was taken */
  action: contributionActionSchema,

  /** ID of the term this contribution relates to (optional for session actions) */
  termId: z
    .string()
    .min(1)
    .max(SESSION_FIELD_LIMITS.termId)
    .optional(),

  /** Additional details about the contribution (e.g., what changed) */
  details: z
    .record(z.unknown())
    .optional(),

  /** When this contribution was made (ISO 8601 datetime) */
  createdAt: z.string().datetime('Invalid datetime format'),
})

export type SessionContribution = z.infer<typeof sessionContributionSchema>

/**
 * Firestore-compatible session contribution (uses Firestore Timestamp)
 */
export const sessionContributionFirestoreSchema = sessionContributionSchema.extend({
  createdAt: z.any(), // Firestore Timestamp
})

export type SessionContributionFirestore = z.infer<typeof sessionContributionFirestoreSchema>

// ============================================
// DISCUSSION & NEGOTIATION SCHEMAS (Story 5.4)
// ============================================

/**
 * Resolution status for terms in discussion
 * Tracks which parties have agreed to the term
 */
export const resolutionStatusSchema = z.enum([
  'unresolved', // Neither party has agreed
  'parent-agreed', // Parent has agreed, waiting for child
  'child-agreed', // Child has agreed, waiting for parent
  'resolved', // Both parties have agreed
])

export type ResolutionStatus = z.infer<typeof resolutionStatusSchema>

/**
 * Human-readable labels for resolution status
 */
export const RESOLUTION_STATUS_LABELS: Record<ResolutionStatus, string> = {
  unresolved: 'Needs Agreement',
  'parent-agreed': 'Parent Agreed',
  'child-agreed': 'Child Agreed',
  resolved: 'Both Agreed',
}

/**
 * Descriptions for resolution status at 6th-grade reading level (NFR65)
 */
export const RESOLUTION_STATUS_DESCRIPTIONS: Record<ResolutionStatus, string> = {
  unresolved: 'You both need to agree on this.',
  'parent-agreed': 'Parent said okay. Waiting for child.',
  'child-agreed': 'Child said okay. Waiting for parent.',
  resolved: 'You both agree! Ready to move on.',
}

/**
 * Get human-readable label for resolution status
 */
export function getResolutionStatusLabel(status: ResolutionStatus): string {
  return RESOLUTION_STATUS_LABELS[status]
}

/**
 * Get description for resolution status
 */
export function getResolutionStatusDescription(status: ResolutionStatus): string {
  return RESOLUTION_STATUS_DESCRIPTIONS[status]
}

/**
 * A note/comment added during discussion (AC #2)
 */
export const discussionNoteSchema = z.object({
  /** Unique note ID (UUID) */
  id: z.string().uuid('Note ID must be a valid UUID'),

  /** Who added this note */
  contributor: sessionContributorSchema,

  /** Note text (6th-grade reading level, max 500 chars) */
  text: z.string().min(1, 'Note cannot be empty').max(500, 'Note is too long'),

  /** When this note was created (ISO 8601 datetime) */
  createdAt: z.string().datetime('Invalid datetime format'),
})

export type DiscussionNote = z.infer<typeof discussionNoteSchema>

/**
 * Firestore-compatible discussion note
 */
export const discussionNoteFirestoreSchema = discussionNoteSchema.extend({
  createdAt: z.any(), // Firestore Timestamp
})

export type DiscussionNoteFirestore = z.infer<typeof discussionNoteFirestoreSchema>

/**
 * Maximum number of discussion notes per term
 */
export const DISCUSSION_LIMITS = {
  maxNotesPerTerm: 50,
  maxNoteLength: 500,
} as const

/**
 * Safely parse a discussion note
 */
export function safeParseDiscussionNote(data: unknown): DiscussionNote | null {
  const result = discussionNoteSchema.safeParse(data)
  return result.success ? result.data : null
}

// ============================================
// SESSION TERM SCHEMAS
// ============================================

/**
 * Types of terms that can be in an agreement
 */
export const sessionTermTypeSchema = z.enum([
  'screen_time', // Daily/weekly screen time limits
  'bedtime', // Device bedtime/cutoff times
  'monitoring', // Monitoring level and settings
  'rule', // Custom rules (e.g., "No phones at dinner")
  'consequence', // What happens on violations
  'reward', // Incentives for following agreement
])

export type SessionTermType = z.infer<typeof sessionTermTypeSchema>

/**
 * Human-readable labels for term types
 */
export const SESSION_TERM_TYPE_LABELS: Record<SessionTermType, string> = {
  screen_time: 'Screen Time',
  bedtime: 'Bedtime',
  monitoring: 'Monitoring',
  rule: 'Rule',
  consequence: 'Consequence',
  reward: 'Reward',
}

/**
 * Get human-readable label for term type
 */
export function getSessionTermTypeLabel(type: SessionTermType): string {
  return SESSION_TERM_TYPE_LABELS[type]
}

/**
 * Status of a term within the session
 */
export const sessionTermStatusSchema = z.enum([
  'accepted', // Both parties agree
  'discussion', // Needs more discussion
  'removed', // Removed from agreement
])

export type SessionTermStatus = z.infer<typeof sessionTermStatusSchema>

/**
 * Human-readable labels for term status
 */
export const SESSION_TERM_STATUS_LABELS: Record<SessionTermStatus, string> = {
  accepted: 'Accepted',
  discussion: 'Needs Discussion',
  removed: 'Removed',
}

/**
 * Get human-readable label for term status
 */
export function getSessionTermStatusLabel(status: SessionTermStatus): string {
  return SESSION_TERM_STATUS_LABELS[status]
}

/**
 * A term/condition in the agreement being built
 */
export const sessionTermSchema = z.object({
  /** Unique term ID (UUID) */
  id: z.string().uuid('Term ID must be a valid UUID'),

  /** Type of term */
  type: sessionTermTypeSchema,

  /** Term content (structure varies by type) */
  content: z.record(z.unknown()),

  /** Who added this term */
  addedBy: sessionContributorSchema,

  /** Current status of this term */
  status: sessionTermStatusSchema,

  /** Display order within the agreement */
  order: z.number().int().min(0).max(999),

  /** When this term was created (ISO 8601 datetime) */
  createdAt: z.string().datetime('Invalid datetime format'),

  /** When this term was last modified (ISO 8601 datetime) */
  updatedAt: z.string().datetime('Invalid datetime format'),

  // ============================================
  // Discussion fields (Story 5.4)
  // ============================================

  /** Notes/comments added during discussion (AC #2) */
  discussionNotes: z
    .array(discussionNoteSchema)
    .max(DISCUSSION_LIMITS.maxNotesPerTerm)
    .default([]),

  /** Resolution status for discussion terms (AC #4) */
  resolutionStatus: resolutionStatusSchema.default('unresolved'),

  /** ID of accepted compromise suggestion (AC #3) */
  compromiseAccepted: z.string().optional(),
})

export type SessionTerm = z.infer<typeof sessionTermSchema>

/**
 * Firestore-compatible session term
 */
export const sessionTermFirestoreSchema = sessionTermSchema.extend({
  createdAt: z.any(), // Firestore Timestamp
  updatedAt: z.any(), // Firestore Timestamp
  discussionNotes: z.array(discussionNoteFirestoreSchema).max(DISCUSSION_LIMITS.maxNotesPerTerm).default([]),
})

export type SessionTermFirestore = z.infer<typeof sessionTermFirestoreSchema>

// ============================================
// SOURCE DRAFT SCHEMA
// ============================================

/**
 * Type of draft that started the co-creation session
 */
export const sourceDraftTypeSchema = z.enum([
  'wizard', // From QuickStartWizard (Story 4.4)
  'template_customization', // From Template Customization (Story 4.5)
  'blank', // Started from scratch
])

export type SourceDraftType = z.infer<typeof sourceDraftTypeSchema>

/**
 * Reference to the draft that initiated this session
 */
export const sourceDraftSchema = z.object({
  /** Type of draft */
  type: sourceDraftTypeSchema,

  /** Template ID if applicable */
  templateId: z
    .string()
    .min(1)
    .max(SESSION_FIELD_LIMITS.templateId)
    .optional(),

  /** Draft ID if stored separately */
  draftId: z
    .string()
    .min(1)
    .max(SESSION_FIELD_LIMITS.draftId)
    .optional(),
})

export type SourceDraft = z.infer<typeof sourceDraftSchema>

// ============================================
// CO-CREATION SESSION SCHEMA
// ============================================

/**
 * A complete co-creation session document
 */
export const coCreationSessionSchema = z.object({
  /** Unique session ID (UUID) */
  id: z.string().uuid('Session ID must be a valid UUID'),

  /** Family this session belongs to */
  familyId: z
    .string()
    .min(1, 'Family ID is required')
    .max(SESSION_FIELD_LIMITS.familyId),

  /** Child this agreement is for */
  childId: z
    .string()
    .min(1, 'Child ID is required')
    .max(SESSION_FIELD_LIMITS.childId),

  /** Parent UID who initiated the session */
  initiatedBy: z
    .string()
    .min(1, 'Initiator ID is required')
    .max(SESSION_FIELD_LIMITS.initiatedBy),

  /** Current session status */
  status: sessionStatusSchema,

  /** Source draft that started this session */
  sourceDraft: sourceDraftSchema,

  /**
   * Agreement mode (Story 5.6)
   * - 'full': Full agreement with device monitoring capability
   * - 'agreement_only': Agreement without device monitoring
   * Defaults to 'full' for backwards compatibility
   */
  agreementMode: z.enum(['full', 'agreement_only']).default('full'),

  /** Terms/conditions being built (NFR60: max 100) */
  terms: z
    .array(sessionTermSchema)
    .max(SESSION_ARRAY_LIMITS.maxTerms, `Maximum ${SESSION_ARRAY_LIMITS.maxTerms} terms allowed`),

  /** Contribution history for transparency (AC #3) */
  contributions: z
    .array(sessionContributionSchema)
    .max(SESSION_ARRAY_LIMITS.maxContributions),

  /** When session was created (ISO 8601 datetime) */
  createdAt: z.string().datetime('Invalid datetime format'),

  /** When session was last modified (ISO 8601 datetime) */
  updatedAt: z.string().datetime('Invalid datetime format'),

  /** When last activity occurred (for timeout tracking) */
  lastActivityAt: z.string().datetime('Invalid datetime format'),

  /** When session was paused (if paused) */
  pausedAt: z.string().datetime().optional(),

  /** When session was completed (if completed) */
  completedAt: z.string().datetime().optional(),
})

export type CoCreationSession = z.infer<typeof coCreationSessionSchema>

/**
 * Firestore-compatible co-creation session
 */
export const coCreationSessionFirestoreSchema = coCreationSessionSchema.extend({
  terms: z.array(sessionTermFirestoreSchema).max(SESSION_ARRAY_LIMITS.maxTerms),
  contributions: z.array(sessionContributionFirestoreSchema).max(SESSION_ARRAY_LIMITS.maxContributions),
  agreementMode: z.enum(['full', 'agreement_only']).default('full'), // Story 5.6
  createdAt: z.any(), // Firestore Timestamp
  updatedAt: z.any(), // Firestore Timestamp
  lastActivityAt: z.any(), // Firestore Timestamp
  pausedAt: z.any().optional(), // Firestore Timestamp
  completedAt: z.any().optional(), // Firestore Timestamp
})

export type CoCreationSessionFirestore = z.infer<typeof coCreationSessionFirestoreSchema>

// ============================================
// INPUT SCHEMAS
// ============================================

/**
 * Input for creating a new co-creation session
 */
export const createCoCreationSessionInputSchema = z.object({
  /** Family ID */
  familyId: z
    .string()
    .min(1, 'Family ID is required')
    .max(SESSION_FIELD_LIMITS.familyId),

  /** Child ID */
  childId: z
    .string()
    .min(1, 'Child ID is required')
    .max(SESSION_FIELD_LIMITS.childId),

  /** Source draft information */
  sourceDraft: sourceDraftSchema,

  /**
   * Agreement mode (Story 5.6)
   * - 'full': Full agreement with device monitoring capability
   * - 'agreement_only': Agreement without device monitoring
   */
  agreementMode: z.enum(['full', 'agreement_only']).default('full'),

  /** Initial terms from draft (optional) */
  initialTerms: z
    .array(z.object({
      type: sessionTermTypeSchema,
      content: z.record(z.unknown()),
    }))
    .max(SESSION_ARRAY_LIMITS.maxTerms)
    .optional(),
})

export type CreateCoCreationSessionInput = z.infer<typeof createCoCreationSessionInputSchema>

/**
 * Input for pausing a session
 */
export const pauseSessionInputSchema = z.object({
  /** Session ID to pause */
  sessionId: z.string().uuid('Session ID must be a valid UUID'),
})

export type PauseSessionInput = z.infer<typeof pauseSessionInputSchema>

/**
 * Input for resuming a session
 */
export const resumeSessionInputSchema = z.object({
  /** Session ID to resume */
  sessionId: z.string().uuid('Session ID must be a valid UUID'),
})

export type ResumeSessionInput = z.infer<typeof resumeSessionInputSchema>

/**
 * Input for recording a contribution
 */
export const recordContributionInputSchema = z.object({
  /** Session ID */
  sessionId: z.string().uuid('Session ID must be a valid UUID'),

  /** Who made the contribution */
  contributor: sessionContributorSchema,

  /** What action was taken */
  action: contributionActionSchema,

  /** Term ID (if applicable) */
  termId: z.string().uuid().optional(),

  /** Additional details */
  details: z.record(z.unknown()).optional(),
})

export type RecordContributionInput = z.infer<typeof recordContributionInputSchema>

/**
 * Input for adding a term to the session
 */
export const addTermInputSchema = z.object({
  /** Session ID */
  sessionId: z.string().uuid('Session ID must be a valid UUID'),

  /** Who is adding the term */
  contributor: sessionContributorSchema,

  /** Type of term */
  type: sessionTermTypeSchema,

  /** Term content */
  content: z.record(z.unknown()),
})

export type AddTermInput = z.infer<typeof addTermInputSchema>

/**
 * Input for updating a term
 */
export const updateTermInputSchema = z.object({
  /** Session ID */
  sessionId: z.string().uuid('Session ID must be a valid UUID'),

  /** Term ID to update */
  termId: z.string().uuid('Term ID must be a valid UUID'),

  /** Who is updating */
  contributor: sessionContributorSchema,

  /** New content (optional) */
  content: z.record(z.unknown()).optional(),

  /** New status (optional) */
  status: sessionTermStatusSchema.optional(),
})

export type UpdateTermInput = z.infer<typeof updateTermInputSchema>

/**
 * Input for getting a session
 */
export const getSessionInputSchema = z.object({
  /** Session ID */
  sessionId: z.string().uuid('Session ID must be a valid UUID'),
})

export type GetSessionInput = z.infer<typeof getSessionInputSchema>

// ============================================
// DISCUSSION INPUT SCHEMAS (Story 5.4)
// ============================================

/**
 * Input for adding a discussion note (AC #2)
 */
export const addDiscussionNoteInputSchema = z.object({
  /** Session ID */
  sessionId: z.string().uuid('Session ID must be a valid UUID'),

  /** Term ID to add note to */
  termId: z.string().uuid('Term ID must be a valid UUID'),

  /** Who is adding the note */
  contributor: sessionContributorSchema,

  /** Note text */
  text: z.string().min(1, 'Note cannot be empty').max(500, 'Note is too long'),
})

export type AddDiscussionNoteInput = z.infer<typeof addDiscussionNoteInputSchema>

/**
 * Input for marking agreement on a term (AC #4)
 */
export const markTermAgreementInputSchema = z.object({
  /** Session ID */
  sessionId: z.string().uuid('Session ID must be a valid UUID'),

  /** Term ID */
  termId: z.string().uuid('Term ID must be a valid UUID'),

  /** Who is agreeing */
  contributor: sessionContributorSchema,
})

export type MarkTermAgreementInput = z.infer<typeof markTermAgreementInputSchema>

/**
 * Input for accepting a compromise suggestion (AC #3)
 */
export const acceptCompromiseInputSchema = z.object({
  /** Session ID */
  sessionId: z.string().uuid('Session ID must be a valid UUID'),

  /** Term ID */
  termId: z.string().uuid('Term ID must be a valid UUID'),

  /** Who is accepting */
  contributor: sessionContributorSchema,

  /** Compromise suggestion ID */
  compromiseId: z.string().min(1, 'Compromise ID is required'),

  /** New term content after applying compromise */
  newContent: z.record(z.unknown()),
})

export type AcceptCompromiseInput = z.infer<typeof acceptCompromiseInputSchema>

// ============================================
// RESPONSE SCHEMAS
// ============================================

/**
 * Response when creating a session
 */
export const createSessionResponseSchema = z.object({
  /** Created session */
  session: coCreationSessionSchema,

  /** Success message */
  message: z.string(),
})

export type CreateSessionResponse = z.infer<typeof createSessionResponseSchema>

/**
 * Response for session operations
 */
export const sessionOperationResponseSchema = z.object({
  /** Success indicator */
  success: z.boolean(),

  /** Updated session (if applicable) */
  session: coCreationSessionSchema.optional(),

  /** Message */
  message: z.string(),
})

export type SessionOperationResponse = z.infer<typeof sessionOperationResponseSchema>

// ============================================
// ERROR MESSAGES
// ============================================

/**
 * Error messages for session operations (6th-grade reading level, NFR65)
 */
export const SESSION_ERROR_MESSAGES: Record<string, string> = {
  'session-not-found': 'Could not find that session.',
  'not-authorized': 'You do not have permission to access this session.',
  'session-not-active': 'This session is not active right now.',
  'session-already-paused': 'This session is already paused.',
  'session-not-paused': 'This session is not paused.',
  'session-completed': 'This session has already been completed.',
  'session-abandoned': 'This session has been abandoned.',
  'max-terms-reached': 'You have reached the maximum number of terms allowed.',
  'term-not-found': 'Could not find that term.',
  'invalid-status-transition': 'Cannot change the session status this way.',
  'child-not-in-family': 'This child is not in your family.',
  'not-guardian': 'You are not a guardian of this child.',
  'create-failed': 'Could not create the session. Please try again.',
  'update-failed': 'Could not update the session. Please try again.',
  unknown: 'Something went wrong. Please try again.',
}

/**
 * Get user-friendly error message for session operations
 */
export function getSessionErrorMessage(code: keyof typeof SESSION_ERROR_MESSAGES | string): string {
  return SESSION_ERROR_MESSAGES[code] || SESSION_ERROR_MESSAGES.unknown
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Safely parse a co-creation session, returning null if invalid
 */
export function safeParseCoCreationSession(data: unknown): CoCreationSession | null {
  const result = coCreationSessionSchema.safeParse(data)
  return result.success ? result.data : null
}

/**
 * Validate co-creation session input
 */
export function validateCoCreationSession(data: unknown): CoCreationSession {
  return coCreationSessionSchema.parse(data)
}

/**
 * Safely parse create session input
 */
export function safeParseCreateSessionInput(data: unknown): CreateCoCreationSessionInput | null {
  const result = createCoCreationSessionInputSchema.safeParse(data)
  return result.success ? result.data : null
}

/**
 * Validate create session input
 */
export function validateCreateSessionInput(data: unknown): CreateCoCreationSessionInput {
  return createCoCreationSessionInputSchema.parse(data)
}

/**
 * Safely parse a session contribution
 */
export function safeParseSessionContribution(data: unknown): SessionContribution | null {
  const result = sessionContributionSchema.safeParse(data)
  return result.success ? result.data : null
}

/**
 * Safely parse a session term
 */
export function safeParseSessionTerm(data: unknown): SessionTerm | null {
  const result = sessionTermSchema.safeParse(data)
  return result.success ? result.data : null
}

/**
 * Convert Firestore session to application type
 */
export function convertFirestoreToCoCreationSession(
  firestoreData: CoCreationSessionFirestore
): CoCreationSession {
  return {
    ...firestoreData,
    terms: firestoreData.terms.map((term) => ({
      ...term,
      createdAt: term.createdAt?.toDate?.()?.toISOString() ?? term.createdAt,
      updatedAt: term.updatedAt?.toDate?.()?.toISOString() ?? term.updatedAt,
      discussionNotes: term.discussionNotes.map((note) => ({
        ...note,
        createdAt: note.createdAt?.toDate?.()?.toISOString() ?? note.createdAt,
      })),
    })),
    contributions: firestoreData.contributions.map((contrib) => ({
      ...contrib,
      createdAt: contrib.createdAt?.toDate?.()?.toISOString() ?? contrib.createdAt,
    })),
    createdAt: firestoreData.createdAt?.toDate?.()?.toISOString() ?? firestoreData.createdAt,
    updatedAt: firestoreData.updatedAt?.toDate?.()?.toISOString() ?? firestoreData.updatedAt,
    lastActivityAt: firestoreData.lastActivityAt?.toDate?.()?.toISOString() ?? firestoreData.lastActivityAt,
    pausedAt: firestoreData.pausedAt?.toDate?.()?.toISOString() ?? firestoreData.pausedAt,
    completedAt: firestoreData.completedAt?.toDate?.()?.toISOString() ?? firestoreData.completedAt,
  }
}

/**
 * Check if session can be paused
 */
export function canPauseSession(session: CoCreationSession): boolean {
  return session.status === 'active' || session.status === 'initializing'
}

/**
 * Check if session can be resumed
 */
export function canResumeSession(session: CoCreationSession): boolean {
  return session.status === 'paused'
}

/**
 * Check if session is still active (not completed or abandoned)
 */
export function isSessionActive(session: CoCreationSession): boolean {
  return session.status === 'active' || session.status === 'initializing' || session.status === 'paused'
}

/**
 * Check if session should show timeout warning
 * @param session - The session to check
 * @returns true if approaching 30-minute inactivity timeout
 */
export function shouldShowTimeoutWarning(session: CoCreationSession): boolean {
  if (session.status !== 'active') return false

  const lastActivity = new Date(session.lastActivityAt).getTime()
  const now = Date.now()
  const elapsed = now - lastActivity

  return elapsed >= SESSION_TIMEOUT_CONSTANTS.INACTIVITY_WARNING_MS &&
         elapsed < SESSION_TIMEOUT_CONSTANTS.INACTIVITY_TIMEOUT_MS
}

/**
 * Get time remaining until session timeout (in milliseconds)
 * @param session - The session to check
 * @returns milliseconds until timeout, or 0 if already timed out
 */
export function getTimeUntilTimeout(session: CoCreationSession): number {
  const lastActivity = new Date(session.lastActivityAt).getTime()
  const timeoutAt = lastActivity + SESSION_TIMEOUT_CONSTANTS.INACTIVITY_TIMEOUT_MS
  const remaining = timeoutAt - Date.now()
  return Math.max(0, remaining)
}

/**
 * Format time remaining as "X:XX" (minutes:seconds)
 */
export function formatTimeRemaining(milliseconds: number): string {
  const totalSeconds = Math.floor(milliseconds / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

/**
 * Check if session should be marked as abandoned
 * @param session - The session to check
 * @returns true if session has been inactive for 30+ days
 */
export function shouldMarkAsAbandoned(session: CoCreationSession): boolean {
  if (session.status === 'completed' || session.status === 'abandoned') return false

  const lastActivity = new Date(session.lastActivityAt).getTime()
  const elapsed = Date.now() - lastActivity

  return elapsed >= SESSION_TIMEOUT_CONSTANTS.ABANDONMENT_THRESHOLD_MS
}

/**
 * Get accepted terms from a session
 */
export function getAcceptedTerms(session: CoCreationSession): SessionTerm[] {
  return session.terms.filter((term) => term.status === 'accepted')
}

/**
 * Get terms marked for discussion
 */
export function getDiscussionTerms(session: CoCreationSession): SessionTerm[] {
  return session.terms.filter((term) => term.status === 'discussion')
}

/**
 * Count contributions by contributor
 */
export function countContributionsByContributor(
  session: CoCreationSession
): Record<SessionContributor, number> {
  const counts: Record<SessionContributor, number> = { parent: 0, child: 0 }

  for (const contrib of session.contributions) {
    counts[contrib.contributor]++
  }

  return counts
}

/**
 * Get the last contributor who made a term-related action
 */
export function getLastTermContributor(session: CoCreationSession): SessionContributor | null {
  const termActions: ContributionAction[] = [
    'added_term',
    'modified_term',
    'removed_term',
    'marked_for_discussion',
    'resolved_discussion',
  ]

  // Find the most recent term-related contribution
  for (let i = session.contributions.length - 1; i >= 0; i--) {
    const contrib = session.contributions[i]
    if (termActions.includes(contrib.action)) {
      return contrib.contributor
    }
  }

  return null
}

/**
 * Validate that session status transition is allowed
 */
export function isValidStatusTransition(
  currentStatus: SessionStatus,
  newStatus: SessionStatus
): boolean {
  const validTransitions: Record<SessionStatus, SessionStatus[]> = {
    initializing: ['active', 'paused', 'abandoned'],
    active: ['paused', 'completed', 'abandoned'],
    paused: ['active', 'abandoned'],
    completed: [], // Terminal state
    abandoned: [], // Terminal state
  }

  return validTransitions[currentStatus].includes(newStatus)
}

/**
 * Create initial contribution for session start
 */
export function createSessionStartContribution(
  contributionId: string,
  contributor: SessionContributor
): SessionContribution {
  return {
    id: contributionId,
    contributor,
    action: 'session_started',
    createdAt: new Date().toISOString(),
  }
}

/**
 * Create pause contribution
 */
export function createPauseContribution(
  contributionId: string,
  contributor: SessionContributor
): SessionContribution {
  return {
    id: contributionId,
    contributor,
    action: 'session_paused',
    createdAt: new Date().toISOString(),
  }
}

/**
 * Create resume contribution
 */
export function createResumeContribution(
  contributionId: string,
  contributor: SessionContributor
): SessionContribution {
  return {
    id: contributionId,
    contributor,
    action: 'session_resumed',
    createdAt: new Date().toISOString(),
  }
}

// ============================================
// DISCUSSION HELPER FUNCTIONS (Story 5.4)
// ============================================

/**
 * Get unresolved discussion terms (AC #5, AC #6)
 * Used to check if session can proceed to signing
 */
export function getUnresolvedDiscussionTerms(session: CoCreationSession): SessionTerm[] {
  return session.terms.filter(
    (term) => term.status === 'discussion' && term.resolutionStatus !== 'resolved'
  )
}

/**
 * Check if session can proceed to signing (AC #6)
 * Returns false if any discussion terms are unresolved
 */
export function canProceedToSigning(session: CoCreationSession): boolean {
  const unresolvedTerms = getUnresolvedDiscussionTerms(session)
  return unresolvedTerms.length === 0
}

/**
 * Get the next resolution status after a contributor agrees (AC #4)
 * Implements the resolution state machine
 */
export function getNextResolutionStatus(
  currentStatus: ResolutionStatus,
  contributor: SessionContributor
): ResolutionStatus {
  if (currentStatus === 'resolved') {
    return 'resolved' // Already resolved, no change
  }

  if (currentStatus === 'unresolved') {
    // First agreement
    return contributor === 'parent' ? 'parent-agreed' : 'child-agreed'
  }

  if (currentStatus === 'parent-agreed' && contributor === 'child') {
    return 'resolved' // Both agreed
  }

  if (currentStatus === 'child-agreed' && contributor === 'parent') {
    return 'resolved' // Both agreed
  }

  // Contributor already agreed, no change
  return currentStatus
}

/**
 * Check if a contributor has agreed to a term
 */
export function hasContributorAgreed(
  resolutionStatus: ResolutionStatus,
  contributor: SessionContributor
): boolean {
  if (resolutionStatus === 'resolved') return true
  if (contributor === 'parent' && resolutionStatus === 'parent-agreed') return true
  if (contributor === 'child' && resolutionStatus === 'child-agreed') return true
  return false
}

/**
 * Create a discussion note
 */
export function createDiscussionNote(
  noteId: string,
  contributor: SessionContributor,
  text: string
): DiscussionNote {
  return {
    id: noteId,
    contributor,
    text,
    createdAt: new Date().toISOString(),
  }
}

/**
 * Signing readiness information (AC #6)
 */
export interface SigningReadiness {
  canProceed: boolean
  unresolvedCount: number
  unresolvedTerms: SessionTerm[]
}

/**
 * Get signing readiness info (AC #6)
 * Returns detailed info about what's blocking signing
 */
export function getSigningReadiness(session: CoCreationSession): SigningReadiness {
  const unresolvedTerms = getUnresolvedDiscussionTerms(session)
  return {
    canProceed: unresolvedTerms.length === 0,
    unresolvedCount: unresolvedTerms.length,
    unresolvedTerms,
  }
}

/**
 * Add error messages for discussion operations
 */
export const DISCUSSION_ERROR_MESSAGES: Record<string, string> = {
  'note-too-long': 'Your note is too long. Please keep it under 500 characters.',
  'max-notes-reached': 'This term has too many notes. Please resolve it first.',
  'already-agreed': 'You have already agreed to this term.',
  'term-not-in-discussion': 'This term is not marked for discussion.',
  'cannot-sign-unresolved': 'Please resolve all discussion items before signing.',
}

/**
 * Get user-friendly error message for discussion operations
 */
export function getDiscussionErrorMessage(code: keyof typeof DISCUSSION_ERROR_MESSAGES | string): string {
  return DISCUSSION_ERROR_MESSAGES[code] || SESSION_ERROR_MESSAGES.unknown
}

// ============================================
// AGREEMENT MODE SCHEMAS (Story 5.6)
// ============================================

/**
 * Agreement mode determines what type of agreement the family is creating
 * - 'full': Full agreement with device monitoring capability
 * - 'agreement_only': Agreement without device monitoring (family commitments only)
 */
export const agreementModeSchema = z.enum(['full', 'agreement_only'])

export type AgreementMode = z.infer<typeof agreementModeSchema>

/**
 * Human-readable labels for agreement modes
 */
export const AGREEMENT_MODE_LABELS: Record<AgreementMode, string> = {
  full: 'Full Agreement',
  agreement_only: 'Agreement Only',
}

/**
 * Descriptions for agreement modes at 6th-grade reading level (NFR65)
 */
export const AGREEMENT_MODE_DESCRIPTIONS: Record<AgreementMode, string> = {
  full: 'Create an agreement with the option to monitor device activity. You can see what your child does online.',
  agreement_only: 'Create an agreement about digital expectations without any device monitoring. Based on trust and discussion.',
}

/**
 * Features included in each agreement mode
 */
export const AGREEMENT_MODE_FEATURES: Record<AgreementMode, { included: string[]; excluded: string[] }> = {
  full: {
    included: [
      'Screen time commitments',
      'Bedtime schedules',
      'Family rules',
      'Device monitoring',
      'Screenshot capture',
      'Activity reports',
    ],
    excluded: [],
  },
  agreement_only: {
    included: [
      'Screen time commitments',
      'Bedtime schedules',
      'Family rules',
      'Discussion-based accountability',
    ],
    excluded: [
      'Device monitoring',
      'Screenshot capture',
      'Activity reports',
    ],
  },
}

/**
 * Get label for agreement mode
 */
export function getAgreementModeLabel(mode: AgreementMode): string {
  return AGREEMENT_MODE_LABELS[mode]
}

/**
 * Get description for agreement mode
 */
export function getAgreementModeDescription(mode: AgreementMode): string {
  return AGREEMENT_MODE_DESCRIPTIONS[mode]
}

/**
 * Get features for agreement mode
 */
export function getAgreementModeFeatures(mode: AgreementMode): { included: string[]; excluded: string[] } {
  return AGREEMENT_MODE_FEATURES[mode]
}

/**
 * Term types that are monitoring-related and should be filtered in Agreement Only mode
 */
export const MONITORING_TERM_TYPES: SessionTermType[] = ['monitoring']

/**
 * Template section types that are monitoring-related (from agreement-template.schema.ts)
 */
export const MONITORING_SECTION_TYPES = ['monitoring_rules'] as const

/**
 * Check if a term type requires monitoring functionality
 */
export function isMonitoringTermType(type: SessionTermType): boolean {
  return MONITORING_TERM_TYPES.includes(type)
}

/**
 * Get all monitoring term types
 */
export function getMonitoringTermTypes(): SessionTermType[] {
  return [...MONITORING_TERM_TYPES]
}

/**
 * Filter terms based on agreement mode
 * In 'agreement_only' mode, monitoring-related terms are excluded
 */
export function filterTermsForMode(
  terms: SessionTerm[],
  mode: AgreementMode
): SessionTerm[] {
  if (mode === 'full') return terms
  return terms.filter(term => !isMonitoringTermType(term.type))
}

/**
 * Check if a session can be upgraded to full monitoring (AC #5)
 * Can upgrade if current mode is agreement_only and session is active
 */
export function canUpgradeToMonitoring(session: CoCreationSession): boolean {
  const mode = session.agreementMode ?? 'full'
  return (
    mode === 'agreement_only' &&
    session.status !== 'completed' &&
    session.status !== 'abandoned'
  )
}

/**
 * Get the available term types for a given agreement mode
 */
export function getAvailableTermTypesForMode(mode: AgreementMode): SessionTermType[] {
  const allTypes: SessionTermType[] = ['screen_time', 'bedtime', 'monitoring', 'rule', 'consequence', 'reward']
  if (mode === 'full') return allTypes
  return allTypes.filter(type => !isMonitoringTermType(type))
}

/**
 * Check if a section type is monitoring-related (AC #2)
 */
export function isMonitoringSectionType(type: string): boolean {
  return MONITORING_SECTION_TYPES.includes(type as typeof MONITORING_SECTION_TYPES[number])
}

/**
 * Get section types that should be hidden for a given agreement mode
 */
export function getHiddenSectionTypesForMode(mode: AgreementMode): string[] {
  if (mode === 'full') return []
  return [...MONITORING_SECTION_TYPES]
}

/**
 * Filter template sections based on agreement mode (AC #2)
 * In 'agreement_only' mode, monitoring-related sections are excluded
 *
 * @param sections - Array of template sections
 * @param mode - The agreement mode
 * @returns Filtered sections appropriate for the mode
 */
export function filterSectionsForMode<T extends { type: string }>(
  sections: T[],
  mode: AgreementMode
): T[] {
  if (mode === 'full') return sections
  return sections.filter(section => !isMonitoringSectionType(section.type))
}

/**
 * Filter a template based on agreement mode (AC #2)
 * In 'agreement_only' mode, monitoring-related sections are excluded
 *
 * @param template - The template object with sections array
 * @param mode - The agreement mode
 * @returns New template object with filtered sections
 */
export function filterTemplateForMode<T extends { sections: Array<{ type: string }> }>(
  template: T,
  mode: AgreementMode
): T {
  if (mode === 'full') return template
  return {
    ...template,
    sections: filterSectionsForMode(template.sections, mode),
  }
}

/**
 * Check if a template has any monitoring-related sections
 * Useful for determining if mode selection will have visible effect
 *
 * @param template - The template object with sections array
 * @returns True if template has monitoring sections
 */
export function templateHasMonitoringSections<T extends { sections: Array<{ type: string }> }>(
  template: T
): boolean {
  return template.sections.some(section => isMonitoringSectionType(section.type))
}

// ============================================
// AGREEMENT PREVIEW SCHEMAS (Story 5.5)
// ============================================

/**
 * Summary of a single contribution for attribution display (AC #2)
 */
export const contributionSummarySchema = z.object({
  /** ID of the term this contribution relates to */
  termId: z.string().uuid('Term ID must be a valid UUID'),

  /** Who originally added this term */
  addedBy: sessionContributorSchema,

  /** Who has modified this term (may include both parties) */
  modifiedBy: z.array(sessionContributorSchema).optional(),

  /** Human-readable title for the term */
  termTitle: z.string().min(1).max(200),

  /** Category/type of the term */
  category: sessionTermTypeSchema,
})

export type ContributionSummary = z.infer<typeof contributionSummarySchema>

/**
 * Screen time impact estimate
 */
export const screenTimeImpactSchema = z.object({
  /** Daily screen time in minutes */
  daily: z.number().int().min(0),
  /** Weekly screen time in minutes */
  weekly: z.number().int().min(0),
  /** Human-readable description (e.g., "2 hours per day") */
  description: z.string(),
})

export type ScreenTimeImpact = z.infer<typeof screenTimeImpactSchema>

/**
 * Bedtime impact estimate
 */
export const bedtimeImpactSchema = z.object({
  /** Weekday bedtime (e.g., "9:00 PM") */
  weekday: z.string().optional(),
  /** Weekend bedtime if different */
  weekend: z.string().optional(),
  /** Human-readable description */
  description: z.string(),
})

export type BedtimeImpact = z.infer<typeof bedtimeImpactSchema>

/**
 * Monitoring impact estimate
 */
export const monitoringImpactSchema = z.object({
  /** Monitoring level */
  level: z.enum(['minimal', 'moderate', 'active']),
  /** Human-readable description */
  description: z.string(),
})

export type MonitoringImpact = z.infer<typeof monitoringImpactSchema>

/**
 * Impact estimate for the agreement (AC #4)
 * Shows daily/weekly impact of the agreement terms
 */
export const impactEstimateSchema = z.object({
  /** Screen time impact if applicable */
  screenTime: screenTimeImpactSchema.optional(),
  /** Bedtime impact if applicable */
  bedtime: bedtimeImpactSchema.optional(),
  /** Monitoring impact if applicable */
  monitoring: monitoringImpactSchema.optional(),
  /** Additional custom impacts */
  custom: z.array(z.object({
    label: z.string(),
    description: z.string(),
  })).optional(),
})

export type ImpactEstimate = z.infer<typeof impactEstimateSchema>

/**
 * Agreement preview for final review before signing (AC #1-6)
 */
export const agreementPreviewSchema = z.object({
  /** Session ID this preview is for */
  sessionId: z.string().uuid('Session ID must be a valid UUID'),

  /** When this preview was generated */
  generatedAt: z.string().datetime('Invalid datetime format'),

  /** All accepted terms in the agreement */
  terms: z.array(sessionTermSchema),

  /** Contribution attribution for each term */
  contributions: z.array(contributionSummarySchema),

  /** Estimated daily/weekly impact */
  impact: impactEstimateSchema,

  /** Whether parent has scrolled through entire agreement (AC #5) */
  parentScrollComplete: z.boolean().default(false),

  /** Whether child has scrolled through entire agreement (AC #5) */
  childScrollComplete: z.boolean().default(false),

  /** Parent's plain-language commitment summary (AC #3) */
  parentCommitments: z.array(z.string()),

  /** Child's plain-language commitment summary (AC #3) */
  childCommitments: z.array(z.string()),
})

export type AgreementPreview = z.infer<typeof agreementPreviewSchema>

// ============================================
// AGREEMENT PREVIEW HELPER FUNCTIONS
// ============================================

/**
 * Format minutes as human-readable duration
 */
export function formatDuration(minutes: number): string {
  if (minutes <= 0) return '0 minutes'
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'}`

  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60

  if (mins === 0) {
    return hours === 1 ? '1 hour' : `${hours} hours`
  }

  return `${hours} hour${hours > 1 ? 's' : ''} ${mins} min`
}

/**
 * Get human-readable term title based on type and content
 */
export function getTermTitle(term: SessionTerm): string {
  const typeLabel = SESSION_TERM_TYPE_LABELS[term.type]
  const content = term.content as Record<string, unknown>

  switch (term.type) {
    case 'screen_time':
      if (content.dailyLimit && typeof content.dailyLimit === 'number') {
        return `${typeLabel}: ${formatDuration(content.dailyLimit)} daily`
      }
      return typeLabel
    case 'bedtime':
      if (content.time && typeof content.time === 'string') {
        return `${typeLabel}: ${content.time}`
      }
      return typeLabel
    case 'monitoring':
      if (content.level && typeof content.level === 'string') {
        return `${typeLabel}: ${content.level} level`
      }
      return typeLabel
    case 'rule':
    case 'consequence':
    case 'reward':
      if (content.title && typeof content.title === 'string') {
        return content.title.slice(0, 50) + (content.title.length > 50 ? '...' : '')
      }
      if (content.description && typeof content.description === 'string') {
        return content.description.slice(0, 50) + (content.description.length > 50 ? '...' : '')
      }
      return typeLabel
    default:
      return typeLabel
  }
}

/**
 * Calculate screen time impact from terms
 */
export function calculateScreenTimeImpact(terms: SessionTerm[]): ScreenTimeImpact | undefined {
  const screenTimeTerms = terms.filter(
    (t) => t.type === 'screen_time' && t.status === 'accepted'
  )

  if (screenTimeTerms.length === 0) return undefined

  let dailyMinutes = 0
  for (const term of screenTimeTerms) {
    const content = term.content as Record<string, unknown>
    if (content.dailyLimit && typeof content.dailyLimit === 'number') {
      dailyMinutes += content.dailyLimit
    }
  }

  // If no daily limits found, return undefined
  if (dailyMinutes === 0) return undefined

  return {
    daily: dailyMinutes,
    weekly: dailyMinutes * 7,
    description: `${formatDuration(dailyMinutes)} per day`,
  }
}

/**
 * Calculate bedtime impact from terms
 */
export function calculateBedtimeImpact(terms: SessionTerm[]): BedtimeImpact | undefined {
  const bedtimeTerms = terms.filter(
    (t) => t.type === 'bedtime' && t.status === 'accepted'
  )

  if (bedtimeTerms.length === 0) return undefined

  let weekdayTime: string | undefined
  let weekendTime: string | undefined

  for (const term of bedtimeTerms) {
    const content = term.content as Record<string, unknown>
    if (content.weekdayTime && typeof content.weekdayTime === 'string') {
      weekdayTime = content.weekdayTime
    }
    if (content.time && typeof content.time === 'string') {
      weekdayTime = content.time
    }
    if (content.weekendTime && typeof content.weekendTime === 'string') {
      weekendTime = content.weekendTime
    }
  }

  if (!weekdayTime && !weekendTime) return undefined

  const parts: string[] = []
  if (weekdayTime) parts.push(`${weekdayTime} on school nights`)
  if (weekendTime) parts.push(`${weekendTime} on weekends`)

  return {
    weekday: weekdayTime,
    weekend: weekendTime,
    description: parts.join(', ') || 'Bedtime rules set',
  }
}

/**
 * Calculate monitoring impact from terms
 */
export function calculateMonitoringImpact(terms: SessionTerm[]): MonitoringImpact | undefined {
  const monitoringTerms = terms.filter(
    (t) => t.type === 'monitoring' && t.status === 'accepted'
  )

  if (monitoringTerms.length === 0) return undefined

  // Find the most restrictive monitoring level
  let level: 'minimal' | 'moderate' | 'active' = 'minimal'

  for (const term of monitoringTerms) {
    const content = term.content as Record<string, unknown>
    if (content.level && typeof content.level === 'string') {
      if (content.level === 'active') level = 'active'
      else if (content.level === 'moderate' && level !== 'active') level = 'moderate'
    }
  }

  const descriptions: Record<'minimal' | 'moderate' | 'active', string> = {
    minimal: 'Basic check-ins with privacy respected',
    moderate: 'Regular screenshots with your knowledge',
    active: 'Active monitoring to keep you safe',
  }

  return {
    level,
    description: descriptions[level],
  }
}

/**
 * Generate commitment summary for a contributor (AC #3)
 * Returns plain-language summaries at 6th-grade reading level
 */
export function generateCommitmentSummary(
  terms: SessionTerm[],
  contributor: SessionContributor
): string[] {
  const commitments: string[] = []
  const acceptedTerms = terms.filter((t) => t.status === 'accepted')

  for (const term of acceptedTerms) {
    const content = term.content as Record<string, unknown>

    if (contributor === 'parent') {
      // Parent commitments focus on what they will respect/provide
      switch (term.type) {
        case 'screen_time':
          if (content.dailyLimit && typeof content.dailyLimit === 'number') {
            commitments.push(`I will allow ${formatDuration(content.dailyLimit)} of screen time each day.`)
          }
          break
        case 'bedtime':
          if (content.time && typeof content.time === 'string') {
            commitments.push(`I will ensure devices are off by ${content.time}.`)
          }
          break
        case 'monitoring':
          commitments.push('I will only view screenshots when needed and will respect your privacy.')
          break
        case 'reward':
          if (content.description && typeof content.description === 'string') {
            commitments.push(`I will provide rewards when you follow the agreement: ${content.description}`)
          }
          break
      }
    } else {
      // Child commitments focus on what they agree to do
      switch (term.type) {
        case 'screen_time':
          if (content.dailyLimit && typeof content.dailyLimit === 'number') {
            commitments.push(`I will stay within ${formatDuration(content.dailyLimit)} of screen time each day.`)
          }
          break
        case 'bedtime':
          if (content.time && typeof content.time === 'string') {
            commitments.push(`I will have my devices off by ${content.time}.`)
          }
          break
        case 'monitoring':
          commitments.push('I understand my parent can see what I do online to keep me safe.')
          break
        case 'rule':
          if (content.description && typeof content.description === 'string') {
            commitments.push(`I will follow this rule: ${content.description}`)
          }
          break
        case 'consequence':
          if (content.description && typeof content.description === 'string') {
            commitments.push(`I understand that if I break the rules: ${content.description}`)
          }
          break
      }
    }
  }

  return commitments
}

/**
 * Generate contribution summary for a term (AC #2)
 */
export function generateContributionSummary(
  term: SessionTerm,
  contributions: SessionContribution[]
): ContributionSummary {
  // Find all contributors who modified this term
  const termContributions = contributions.filter((c) => c.termId === term.id)
  const modifiers = new Set<SessionContributor>()

  for (const contrib of termContributions) {
    if (contrib.action === 'modified_term') {
      modifiers.add(contrib.contributor)
    }
  }

  return {
    termId: term.id,
    addedBy: term.addedBy,
    modifiedBy: modifiers.size > 0 ? Array.from(modifiers) : undefined,
    termTitle: getTermTitle(term),
    category: term.type,
  }
}

/**
 * Generate a complete agreement preview (AC #1-6)
 * Call this when all terms are resolved and family is ready to review
 */
export function generateAgreementPreview(session: CoCreationSession): AgreementPreview {
  // Get only accepted terms
  const acceptedTerms = session.terms.filter((t) => t.status === 'accepted')

  // Generate contribution summaries
  const contributions = acceptedTerms.map((term) =>
    generateContributionSummary(term, session.contributions)
  )

  // Calculate impacts
  const screenTime = calculateScreenTimeImpact(acceptedTerms)
  const bedtime = calculateBedtimeImpact(acceptedTerms)
  const monitoring = calculateMonitoringImpact(acceptedTerms)

  // Generate commitment summaries
  const parentCommitments = generateCommitmentSummary(acceptedTerms, 'parent')
  const childCommitments = generateCommitmentSummary(acceptedTerms, 'child')

  return {
    sessionId: session.id,
    generatedAt: new Date().toISOString(),
    terms: acceptedTerms,
    contributions,
    impact: {
      screenTime,
      bedtime,
      monitoring,
    },
    parentScrollComplete: false,
    childScrollComplete: false,
    parentCommitments,
    childCommitments,
  }
}

/**
 * Check if both parties have completed scrolling the preview (AC #5)
 * Use this to determine if the family can proceed from preview to signing
 */
export function canProceedFromPreview(preview: AgreementPreview): boolean {
  return preview.parentScrollComplete && preview.childScrollComplete
}

/**
 * Get scroll completion status message
 */
export function getScrollCompletionMessage(preview: AgreementPreview): string {
  if (preview.parentScrollComplete && preview.childScrollComplete) {
    return 'Both parent and child have reviewed the agreement. Ready to sign!'
  }
  if (!preview.parentScrollComplete && !preview.childScrollComplete) {
    return 'Both parent and child need to read through the agreement.'
  }
  if (!preview.parentScrollComplete) {
    return 'Parent needs to scroll through the entire agreement.'
  }
  return 'Child needs to scroll through the entire agreement.'
}

/**
 * Get contribution statistics for display
 */
export function getContributionStats(contributions: ContributionSummary[]): {
  parentAdded: number
  childAdded: number
  parentPercentage: number
  childPercentage: number
} {
  const parentAdded = contributions.filter((c) => c.addedBy === 'parent').length
  const childAdded = contributions.filter((c) => c.addedBy === 'child').length
  const total = parentAdded + childAdded

  return {
    parentAdded,
    childAdded,
    parentPercentage: total > 0 ? Math.round((parentAdded / total) * 100) : 0,
    childPercentage: total > 0 ? Math.round((childAdded / total) * 100) : 0,
  }
}
