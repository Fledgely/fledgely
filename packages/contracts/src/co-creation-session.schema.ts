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
})

export type SessionTerm = z.infer<typeof sessionTermSchema>

/**
 * Firestore-compatible session term
 */
export const sessionTermFirestoreSchema = sessionTermSchema.extend({
  createdAt: z.any(), // Firestore Timestamp
  updatedAt: z.any(), // Firestore Timestamp
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
