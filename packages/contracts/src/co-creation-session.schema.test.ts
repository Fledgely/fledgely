import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  // Schemas
  sessionStatusSchema,
  sessionContributorSchema,
  contributionActionSchema,
  sessionContributionSchema,
  sessionTermTypeSchema,
  sessionTermStatusSchema,
  sessionTermSchema,
  sourceDraftTypeSchema,
  sourceDraftSchema,
  coCreationSessionSchema,
  createCoCreationSessionInputSchema,
  pauseSessionInputSchema,
  resumeSessionInputSchema,
  recordContributionInputSchema,
  addTermInputSchema,
  updateTermInputSchema,
  getSessionInputSchema,
  // Story 5.4: Discussion schemas
  resolutionStatusSchema,
  discussionNoteSchema,
  addDiscussionNoteInputSchema,
  markTermAgreementInputSchema,
  acceptCompromiseInputSchema,
  // Helper functions
  getSessionStatusLabel,
  getSessionStatusDescription,
  getSessionContributorLabel,
  getContributionActionLabel,
  getSessionTermTypeLabel,
  getSessionTermStatusLabel,
  getSessionErrorMessage,
  safeParseCoCreationSession,
  validateCoCreationSession,
  safeParseCreateSessionInput,
  validateCreateSessionInput,
  safeParseSessionContribution,
  safeParseSessionTerm,
  convertFirestoreToCoCreationSession,
  canPauseSession,
  canResumeSession,
  isSessionActive,
  shouldShowTimeoutWarning,
  getTimeUntilTimeout,
  formatTimeRemaining,
  shouldMarkAsAbandoned,
  getAcceptedTerms,
  getDiscussionTerms,
  countContributionsByContributor,
  getLastTermContributor,
  isValidStatusTransition,
  createSessionStartContribution,
  createPauseContribution,
  createResumeContribution,
  // Story 5.4: Discussion helper functions
  getResolutionStatusLabel,
  getResolutionStatusDescription,
  safeParseDiscussionNote,
  getUnresolvedDiscussionTerms,
  canProceedToSigning,
  getNextResolutionStatus,
  hasContributorAgreed,
  createDiscussionNote,
  getSigningReadiness,
  getDiscussionErrorMessage,
  // Constants
  SESSION_FIELD_LIMITS,
  SESSION_ARRAY_LIMITS,
  SESSION_TIMEOUT_CONSTANTS,
  SESSION_STATUS_LABELS,
  SESSION_ERROR_MESSAGES,
  RESOLUTION_STATUS_LABELS,
  DISCUSSION_LIMITS,
  DISCUSSION_ERROR_MESSAGES,
  // Types
  type CoCreationSession,
  type SessionContribution,
  type SessionTerm,
  type CreateCoCreationSessionInput,
  type DiscussionNote,
  type ResolutionStatus,
} from './co-creation-session.schema'

/**
 * Co-Creation Session Schema Tests
 *
 * Story 5.1: Co-Creation Session Initiation
 *
 * Tests verify:
 * - Schema validation for session status, contributor, and actions
 * - Schema validation for contributions, terms, and sessions
 * - Schema validation for input schemas (create, pause, resume, etc.)
 * - Error message helpers at 6th-grade reading level (NFR65)
 * - Helper functions for session state checks
 * - Timeout warning calculations (AC #6)
 * - Contribution tracking (AC #3)
 * - Status transition validation
 */

// ============================================================================
// Test Fixtures
// ============================================================================

const createValidContribution = (overrides?: Partial<SessionContribution>): SessionContribution => ({
  id: '550e8400-e29b-41d4-a716-446655440001',
  contributor: 'parent',
  action: 'added_term',
  termId: '550e8400-e29b-41d4-a716-446655440002',
  createdAt: '2024-01-15T10:00:00.000Z',
  ...overrides,
})

const createValidDiscussionNote = (overrides?: Partial<DiscussionNote>): DiscussionNote => ({
  id: '550e8400-e29b-41d4-a716-446655440020',
  contributor: 'child',
  text: 'I think I need more time for homework',
  createdAt: '2024-01-15T10:15:00.000Z',
  ...overrides,
})

const createValidTerm = (overrides?: Partial<SessionTerm>): SessionTerm => ({
  id: '550e8400-e29b-41d4-a716-446655440003',
  type: 'screen_time',
  content: { weekdayMinutes: 60, weekendMinutes: 120 },
  addedBy: 'parent',
  status: 'accepted',
  order: 0,
  createdAt: '2024-01-15T10:00:00.000Z',
  updatedAt: '2024-01-15T10:00:00.000Z',
  discussionNotes: [],
  resolutionStatus: 'unresolved',
  ...overrides,
})

const createValidSession = (overrides?: Partial<CoCreationSession>): CoCreationSession => ({
  id: '550e8400-e29b-41d4-a716-446655440000',
  familyId: 'family-123',
  childId: 'child-456',
  initiatedBy: 'parent-789',
  status: 'active',
  sourceDraft: { type: 'wizard', templateId: 'template-001' },
  terms: [createValidTerm()],
  contributions: [createValidContribution()],
  createdAt: '2024-01-15T10:00:00.000Z',
  updatedAt: '2024-01-15T10:30:00.000Z',
  lastActivityAt: '2024-01-15T10:30:00.000Z',
  ...overrides,
})

describe('co-creation-session.schema', () => {
  // ============================================================================
  // Session Status Schema Tests
  // ============================================================================

  describe('sessionStatusSchema', () => {
    it('should accept valid status values', () => {
      expect(sessionStatusSchema.parse('initializing')).toBe('initializing')
      expect(sessionStatusSchema.parse('active')).toBe('active')
      expect(sessionStatusSchema.parse('paused')).toBe('paused')
      expect(sessionStatusSchema.parse('completed')).toBe('completed')
      expect(sessionStatusSchema.parse('abandoned')).toBe('abandoned')
    })

    it('should reject invalid status values', () => {
      expect(() => sessionStatusSchema.parse('invalid')).toThrow()
      expect(() => sessionStatusSchema.parse('')).toThrow()
      expect(() => sessionStatusSchema.parse(null)).toThrow()
      expect(() => sessionStatusSchema.parse(undefined)).toThrow()
    })
  })

  // ============================================================================
  // Session Contributor Schema Tests
  // ============================================================================

  describe('sessionContributorSchema', () => {
    it('should accept valid contributor values', () => {
      expect(sessionContributorSchema.parse('parent')).toBe('parent')
      expect(sessionContributorSchema.parse('child')).toBe('child')
    })

    it('should reject invalid contributor values', () => {
      expect(() => sessionContributorSchema.parse('guardian')).toThrow()
      expect(() => sessionContributorSchema.parse('')).toThrow()
      expect(() => sessionContributorSchema.parse(null)).toThrow()
    })
  })

  // ============================================================================
  // Contribution Action Schema Tests
  // ============================================================================

  describe('contributionActionSchema', () => {
    it('should accept all valid action values', () => {
      expect(contributionActionSchema.parse('added_term')).toBe('added_term')
      expect(contributionActionSchema.parse('modified_term')).toBe('modified_term')
      expect(contributionActionSchema.parse('removed_term')).toBe('removed_term')
      expect(contributionActionSchema.parse('marked_for_discussion')).toBe('marked_for_discussion')
      expect(contributionActionSchema.parse('resolved_discussion')).toBe('resolved_discussion')
      expect(contributionActionSchema.parse('session_started')).toBe('session_started')
      expect(contributionActionSchema.parse('session_paused')).toBe('session_paused')
      expect(contributionActionSchema.parse('session_resumed')).toBe('session_resumed')
    })

    it('should reject invalid action values', () => {
      expect(() => contributionActionSchema.parse('invalid_action')).toThrow()
      expect(() => contributionActionSchema.parse('')).toThrow()
    })
  })

  // ============================================================================
  // Session Contribution Schema Tests
  // ============================================================================

  describe('sessionContributionSchema', () => {
    it('should accept valid contribution', () => {
      const contribution = createValidContribution()
      const result = sessionContributionSchema.parse(contribution)
      expect(result.id).toBe(contribution.id)
      expect(result.contributor).toBe('parent')
      expect(result.action).toBe('added_term')
    })

    it('should accept contribution without optional fields', () => {
      const contribution = {
        id: '550e8400-e29b-41d4-a716-446655440001',
        contributor: 'child',
        action: 'session_started',
        createdAt: '2024-01-15T10:00:00.000Z',
      }
      const result = sessionContributionSchema.parse(contribution)
      expect(result.termId).toBeUndefined()
      expect(result.details).toBeUndefined()
    })

    it('should reject contribution with invalid UUID', () => {
      const contribution = createValidContribution({ id: 'not-a-uuid' })
      expect(() => sessionContributionSchema.parse(contribution)).toThrow()
    })

    it('should reject contribution with invalid datetime', () => {
      const contribution = createValidContribution({ createdAt: 'not-a-date' })
      expect(() => sessionContributionSchema.parse(contribution)).toThrow()
    })
  })

  // ============================================================================
  // Session Term Schema Tests
  // ============================================================================

  describe('sessionTermSchema', () => {
    it('should accept valid term', () => {
      const term = createValidTerm()
      const result = sessionTermSchema.parse(term)
      expect(result.id).toBe(term.id)
      expect(result.type).toBe('screen_time')
      expect(result.addedBy).toBe('parent')
      expect(result.status).toBe('accepted')
    })

    it('should accept all term types', () => {
      const termTypes = ['screen_time', 'bedtime', 'monitoring', 'rule', 'consequence', 'reward']
      termTypes.forEach((type) => {
        const term = createValidTerm({ type: type as SessionTerm['type'] })
        const result = sessionTermSchema.parse(term)
        expect(result.type).toBe(type)
      })
    })

    it('should accept all term statuses', () => {
      const statuses = ['accepted', 'discussion', 'removed']
      statuses.forEach((status) => {
        const term = createValidTerm({ status: status as SessionTerm['status'] })
        const result = sessionTermSchema.parse(term)
        expect(result.status).toBe(status)
      })
    })

    it('should reject term with invalid order', () => {
      const term = createValidTerm({ order: -1 })
      expect(() => sessionTermSchema.parse(term)).toThrow()
    })

    it('should reject term with order above max', () => {
      const term = createValidTerm({ order: 1000 })
      expect(() => sessionTermSchema.parse(term)).toThrow()
    })
  })

  // ============================================================================
  // Source Draft Schema Tests
  // ============================================================================

  describe('sourceDraftSchema', () => {
    it('should accept wizard draft type', () => {
      const draft = { type: 'wizard', templateId: 'template-001' }
      const result = sourceDraftSchema.parse(draft)
      expect(result.type).toBe('wizard')
      expect(result.templateId).toBe('template-001')
    })

    it('should accept template_customization draft type', () => {
      const draft = { type: 'template_customization', templateId: 'template-002', draftId: 'draft-001' }
      const result = sourceDraftSchema.parse(draft)
      expect(result.type).toBe('template_customization')
      expect(result.draftId).toBe('draft-001')
    })

    it('should accept blank draft type', () => {
      const draft = { type: 'blank' }
      const result = sourceDraftSchema.parse(draft)
      expect(result.type).toBe('blank')
      expect(result.templateId).toBeUndefined()
    })

    it('should reject invalid draft type', () => {
      expect(() => sourceDraftSchema.parse({ type: 'invalid' })).toThrow()
    })
  })

  // ============================================================================
  // Co-Creation Session Schema Tests
  // ============================================================================

  describe('coCreationSessionSchema', () => {
    it('should accept valid session', () => {
      const session = createValidSession()
      const result = coCreationSessionSchema.parse(session)
      expect(result.id).toBe(session.id)
      expect(result.familyId).toBe('family-123')
      expect(result.status).toBe('active')
      expect(result.terms).toHaveLength(1)
      expect(result.contributions).toHaveLength(1)
    })

    it('should accept session with paused status and pausedAt', () => {
      const session = createValidSession({
        status: 'paused',
        pausedAt: '2024-01-15T11:00:00.000Z',
      })
      const result = coCreationSessionSchema.parse(session)
      expect(result.status).toBe('paused')
      expect(result.pausedAt).toBe('2024-01-15T11:00:00.000Z')
    })

    it('should accept session with completed status and completedAt', () => {
      const session = createValidSession({
        status: 'completed',
        completedAt: '2024-01-15T12:00:00.000Z',
      })
      const result = coCreationSessionSchema.parse(session)
      expect(result.status).toBe('completed')
      expect(result.completedAt).toBe('2024-01-15T12:00:00.000Z')
    })

    it('should reject session with empty terms array (valid)', () => {
      const session = createValidSession({ terms: [] })
      // Empty terms array should be valid
      const result = coCreationSessionSchema.parse(session)
      expect(result.terms).toHaveLength(0)
    })

    it('should reject session with missing required fields', () => {
      expect(() => coCreationSessionSchema.parse({ ...createValidSession(), familyId: '' })).toThrow()
      expect(() => coCreationSessionSchema.parse({ ...createValidSession(), childId: '' })).toThrow()
      expect(() => coCreationSessionSchema.parse({ ...createValidSession(), initiatedBy: '' })).toThrow()
    })

    it('should reject session with invalid UUID', () => {
      const session = createValidSession({ id: 'not-a-uuid' })
      expect(() => coCreationSessionSchema.parse(session)).toThrow()
    })

    it('should enforce max terms limit (NFR60)', () => {
      const manyTerms = Array.from({ length: SESSION_ARRAY_LIMITS.maxTerms + 1 }, (_, i) =>
        createValidTerm({ id: `550e8400-e29b-41d4-a716-44665544${String(i).padStart(4, '0')}` })
      )
      const session = createValidSession({ terms: manyTerms })
      expect(() => coCreationSessionSchema.parse(session)).toThrow()
    })
  })

  // ============================================================================
  // Input Schema Tests
  // ============================================================================

  describe('createCoCreationSessionInputSchema', () => {
    it('should accept valid create input', () => {
      const input: CreateCoCreationSessionInput = {
        familyId: 'family-123',
        childId: 'child-456',
        sourceDraft: { type: 'wizard', templateId: 'template-001' },
      }
      const result = createCoCreationSessionInputSchema.parse(input)
      expect(result.familyId).toBe('family-123')
      expect(result.childId).toBe('child-456')
    })

    it('should accept input with initial terms', () => {
      const input = {
        familyId: 'family-123',
        childId: 'child-456',
        sourceDraft: { type: 'blank' },
        initialTerms: [{ type: 'screen_time', content: { minutes: 60 } }],
      }
      const result = createCoCreationSessionInputSchema.parse(input)
      expect(result.initialTerms).toHaveLength(1)
    })

    it('should reject input with empty familyId', () => {
      const input = {
        familyId: '',
        childId: 'child-456',
        sourceDraft: { type: 'blank' },
      }
      expect(() => createCoCreationSessionInputSchema.parse(input)).toThrow()
    })
  })

  describe('pauseSessionInputSchema', () => {
    it('should accept valid pause input', () => {
      const input = { sessionId: '550e8400-e29b-41d4-a716-446655440000' }
      const result = pauseSessionInputSchema.parse(input)
      expect(result.sessionId).toBe('550e8400-e29b-41d4-a716-446655440000')
    })

    it('should reject invalid UUID', () => {
      const input = { sessionId: 'not-a-uuid' }
      expect(() => pauseSessionInputSchema.parse(input)).toThrow()
    })
  })

  describe('resumeSessionInputSchema', () => {
    it('should accept valid resume input', () => {
      const input = { sessionId: '550e8400-e29b-41d4-a716-446655440000' }
      const result = resumeSessionInputSchema.parse(input)
      expect(result.sessionId).toBe('550e8400-e29b-41d4-a716-446655440000')
    })
  })

  describe('recordContributionInputSchema', () => {
    it('should accept valid contribution input', () => {
      const input = {
        sessionId: '550e8400-e29b-41d4-a716-446655440000',
        contributor: 'parent',
        action: 'added_term',
        termId: '550e8400-e29b-41d4-a716-446655440001',
      }
      const result = recordContributionInputSchema.parse(input)
      expect(result.contributor).toBe('parent')
      expect(result.action).toBe('added_term')
    })
  })

  describe('addTermInputSchema', () => {
    it('should accept valid add term input', () => {
      const input = {
        sessionId: '550e8400-e29b-41d4-a716-446655440000',
        contributor: 'child',
        type: 'rule',
        content: { text: 'No phones at dinner' },
      }
      const result = addTermInputSchema.parse(input)
      expect(result.type).toBe('rule')
      expect(result.contributor).toBe('child')
    })
  })

  describe('updateTermInputSchema', () => {
    it('should accept valid update term input', () => {
      const input = {
        sessionId: '550e8400-e29b-41d4-a716-446655440000',
        termId: '550e8400-e29b-41d4-a716-446655440001',
        contributor: 'parent',
        status: 'discussion',
      }
      const result = updateTermInputSchema.parse(input)
      expect(result.status).toBe('discussion')
    })
  })

  // ============================================================================
  // Label Helper Function Tests
  // ============================================================================

  describe('label helper functions', () => {
    it('getSessionStatusLabel should return correct labels', () => {
      expect(getSessionStatusLabel('initializing')).toBe('Getting Ready')
      expect(getSessionStatusLabel('active')).toBe('In Progress')
      expect(getSessionStatusLabel('paused')).toBe('Paused')
      expect(getSessionStatusLabel('completed')).toBe('Completed')
      expect(getSessionStatusLabel('abandoned')).toBe('Abandoned')
    })

    it('getSessionStatusDescription should return 6th-grade level descriptions', () => {
      expect(getSessionStatusDescription('initializing')).toContain('Waiting')
      expect(getSessionStatusDescription('active')).toContain('building')
      expect(getSessionStatusDescription('paused')).toContain('break')
      expect(getSessionStatusDescription('completed')).toContain('ready')
    })

    it('getSessionContributorLabel should return correct labels', () => {
      expect(getSessionContributorLabel('parent')).toBe('Parent')
      expect(getSessionContributorLabel('child')).toBe('Child')
    })

    it('getContributionActionLabel should return correct labels', () => {
      expect(getContributionActionLabel('added_term')).toBe('Added Term')
      expect(getContributionActionLabel('modified_term')).toBe('Changed Term')
      expect(getContributionActionLabel('session_paused')).toBe('Paused Session')
    })

    it('getSessionTermTypeLabel should return correct labels', () => {
      expect(getSessionTermTypeLabel('screen_time')).toBe('Screen Time')
      expect(getSessionTermTypeLabel('bedtime')).toBe('Bedtime')
      expect(getSessionTermTypeLabel('rule')).toBe('Rule')
    })

    it('getSessionTermStatusLabel should return correct labels', () => {
      expect(getSessionTermStatusLabel('accepted')).toBe('Accepted')
      expect(getSessionTermStatusLabel('discussion')).toBe('Needs Discussion')
      expect(getSessionTermStatusLabel('removed')).toBe('Removed')
    })
  })

  // ============================================================================
  // Error Message Helper Tests
  // ============================================================================

  describe('getSessionErrorMessage', () => {
    it('should return correct error messages (6th-grade level)', () => {
      expect(getSessionErrorMessage('session-not-found')).toBe('Could not find that session.')
      expect(getSessionErrorMessage('not-authorized')).toBe('You do not have permission to access this session.')
      expect(getSessionErrorMessage('session-not-active')).toBe('This session is not active right now.')
      expect(getSessionErrorMessage('max-terms-reached')).toBe('You have reached the maximum number of terms allowed.')
    })

    it('should return unknown message for unrecognized codes', () => {
      expect(getSessionErrorMessage('unknown-error-code')).toBe('Something went wrong. Please try again.')
    })
  })

  // ============================================================================
  // Safe Parse Helper Tests
  // ============================================================================

  describe('safe parse helpers', () => {
    it('safeParseCoCreationSession should return session or null', () => {
      const validSession = createValidSession()
      expect(safeParseCoCreationSession(validSession)).not.toBeNull()
      expect(safeParseCoCreationSession({ invalid: 'data' })).toBeNull()
    })

    it('safeParseCreateSessionInput should return input or null', () => {
      const validInput = {
        familyId: 'family-123',
        childId: 'child-456',
        sourceDraft: { type: 'blank' },
      }
      expect(safeParseCreateSessionInput(validInput)).not.toBeNull()
      expect(safeParseCreateSessionInput({ invalid: 'data' })).toBeNull()
    })

    it('safeParseSessionContribution should return contribution or null', () => {
      const validContribution = createValidContribution()
      expect(safeParseSessionContribution(validContribution)).not.toBeNull()
      expect(safeParseSessionContribution({ invalid: 'data' })).toBeNull()
    })

    it('safeParseSessionTerm should return term or null', () => {
      const validTerm = createValidTerm()
      expect(safeParseSessionTerm(validTerm)).not.toBeNull()
      expect(safeParseSessionTerm({ invalid: 'data' })).toBeNull()
    })
  })

  // ============================================================================
  // Validate Helpers Tests
  // ============================================================================

  describe('validate helpers', () => {
    it('validateCoCreationSession should throw on invalid data', () => {
      expect(() => validateCoCreationSession({ invalid: 'data' })).toThrow()
    })

    it('validateCreateSessionInput should throw on invalid data', () => {
      expect(() => validateCreateSessionInput({ invalid: 'data' })).toThrow()
    })
  })

  // ============================================================================
  // Session State Helper Tests
  // ============================================================================

  describe('session state helpers', () => {
    it('canPauseSession should return true for active sessions', () => {
      expect(canPauseSession(createValidSession({ status: 'active' }))).toBe(true)
      expect(canPauseSession(createValidSession({ status: 'initializing' }))).toBe(true)
      expect(canPauseSession(createValidSession({ status: 'paused' }))).toBe(false)
      expect(canPauseSession(createValidSession({ status: 'completed' }))).toBe(false)
    })

    it('canResumeSession should return true only for paused sessions', () => {
      expect(canResumeSession(createValidSession({ status: 'paused' }))).toBe(true)
      expect(canResumeSession(createValidSession({ status: 'active' }))).toBe(false)
      expect(canResumeSession(createValidSession({ status: 'completed' }))).toBe(false)
    })

    it('isSessionActive should return true for non-terminal states', () => {
      expect(isSessionActive(createValidSession({ status: 'active' }))).toBe(true)
      expect(isSessionActive(createValidSession({ status: 'initializing' }))).toBe(true)
      expect(isSessionActive(createValidSession({ status: 'paused' }))).toBe(true)
      expect(isSessionActive(createValidSession({ status: 'completed' }))).toBe(false)
      expect(isSessionActive(createValidSession({ status: 'abandoned' }))).toBe(false)
    })
  })

  // ============================================================================
  // Timeout Warning Tests (AC #6)
  // ============================================================================

  describe('timeout warning helpers (AC #6)', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('shouldShowTimeoutWarning should return true after 25 minutes', () => {
      const now = new Date('2024-01-15T10:30:00.000Z')
      vi.setSystemTime(now)

      // Last activity 26 minutes ago (should show warning)
      const session = createValidSession({
        status: 'active',
        lastActivityAt: new Date(now.getTime() - 26 * 60 * 1000).toISOString(),
      })
      expect(shouldShowTimeoutWarning(session)).toBe(true)
    })

    it('shouldShowTimeoutWarning should return false for recent activity', () => {
      const now = new Date('2024-01-15T10:30:00.000Z')
      vi.setSystemTime(now)

      // Last activity 10 minutes ago (should not show warning)
      const session = createValidSession({
        status: 'active',
        lastActivityAt: new Date(now.getTime() - 10 * 60 * 1000).toISOString(),
      })
      expect(shouldShowTimeoutWarning(session)).toBe(false)
    })

    it('shouldShowTimeoutWarning should return false for non-active sessions', () => {
      const session = createValidSession({
        status: 'paused',
        lastActivityAt: new Date(Date.now() - 26 * 60 * 1000).toISOString(),
      })
      expect(shouldShowTimeoutWarning(session)).toBe(false)
    })

    it('getTimeUntilTimeout should return milliseconds remaining', () => {
      const now = new Date('2024-01-15T10:30:00.000Z')
      vi.setSystemTime(now)

      // Last activity 25 minutes ago (5 minutes remaining)
      const session = createValidSession({
        lastActivityAt: new Date(now.getTime() - 25 * 60 * 1000).toISOString(),
      })
      const remaining = getTimeUntilTimeout(session)
      expect(remaining).toBeCloseTo(5 * 60 * 1000, -3) // ~5 minutes
    })

    it('getTimeUntilTimeout should return 0 when already timed out', () => {
      const now = new Date('2024-01-15T10:30:00.000Z')
      vi.setSystemTime(now)

      // Last activity 35 minutes ago (already timed out)
      const session = createValidSession({
        lastActivityAt: new Date(now.getTime() - 35 * 60 * 1000).toISOString(),
      })
      expect(getTimeUntilTimeout(session)).toBe(0)
    })

    it('formatTimeRemaining should format correctly', () => {
      expect(formatTimeRemaining(5 * 60 * 1000)).toBe('5:00')
      expect(formatTimeRemaining(2 * 60 * 1000 + 30 * 1000)).toBe('2:30')
      expect(formatTimeRemaining(45 * 1000)).toBe('0:45')
      expect(formatTimeRemaining(65 * 1000)).toBe('1:05')
    })

    it('shouldMarkAsAbandoned should return true after 30 days', () => {
      const now = new Date('2024-01-15T10:30:00.000Z')
      vi.setSystemTime(now)

      // Last activity 31 days ago
      const session = createValidSession({
        status: 'paused',
        lastActivityAt: new Date(now.getTime() - 31 * 24 * 60 * 60 * 1000).toISOString(),
      })
      expect(shouldMarkAsAbandoned(session)).toBe(true)
    })

    it('shouldMarkAsAbandoned should return false for completed sessions', () => {
      const session = createValidSession({
        status: 'completed',
        lastActivityAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
      })
      expect(shouldMarkAsAbandoned(session)).toBe(false)
    })
  })

  // ============================================================================
  // Terms Filtering Tests
  // ============================================================================

  describe('terms filtering helpers', () => {
    it('getAcceptedTerms should return only accepted terms', () => {
      const session = createValidSession({
        terms: [
          createValidTerm({ status: 'accepted' }),
          createValidTerm({ id: '550e8400-e29b-41d4-a716-446655440010', status: 'discussion' }),
          createValidTerm({ id: '550e8400-e29b-41d4-a716-446655440011', status: 'accepted' }),
        ],
      })
      const accepted = getAcceptedTerms(session)
      expect(accepted).toHaveLength(2)
      expect(accepted.every((t) => t.status === 'accepted')).toBe(true)
    })

    it('getDiscussionTerms should return only discussion terms', () => {
      const session = createValidSession({
        terms: [
          createValidTerm({ status: 'accepted' }),
          createValidTerm({ id: '550e8400-e29b-41d4-a716-446655440010', status: 'discussion' }),
          createValidTerm({ id: '550e8400-e29b-41d4-a716-446655440011', status: 'removed' }),
        ],
      })
      const discussion = getDiscussionTerms(session)
      expect(discussion).toHaveLength(1)
      expect(discussion[0].status).toBe('discussion')
    })
  })

  // ============================================================================
  // Contribution Tracking Tests (AC #3)
  // ============================================================================

  describe('contribution tracking helpers (AC #3)', () => {
    it('countContributionsByContributor should count correctly', () => {
      const session = createValidSession({
        contributions: [
          createValidContribution({ contributor: 'parent' }),
          createValidContribution({ id: '550e8400-e29b-41d4-a716-446655440010', contributor: 'child' }),
          createValidContribution({ id: '550e8400-e29b-41d4-a716-446655440011', contributor: 'parent' }),
          createValidContribution({ id: '550e8400-e29b-41d4-a716-446655440012', contributor: 'child' }),
        ],
      })
      const counts = countContributionsByContributor(session)
      expect(counts.parent).toBe(2)
      expect(counts.child).toBe(2)
    })

    it('getLastTermContributor should return last term-related contributor', () => {
      const session = createValidSession({
        contributions: [
          createValidContribution({ contributor: 'parent', action: 'added_term' }),
          createValidContribution({
            id: '550e8400-e29b-41d4-a716-446655440010',
            contributor: 'child',
            action: 'modified_term',
          }),
          createValidContribution({
            id: '550e8400-e29b-41d4-a716-446655440011',
            contributor: 'parent',
            action: 'session_paused',
          }),
        ],
      })
      // Should return 'child' because 'session_paused' is not a term action
      expect(getLastTermContributor(session)).toBe('child')
    })

    it('getLastTermContributor should return null when no term actions', () => {
      const session = createValidSession({
        contributions: [
          createValidContribution({ action: 'session_started' }),
          createValidContribution({ id: '550e8400-e29b-41d4-a716-446655440010', action: 'session_paused' }),
        ],
      })
      expect(getLastTermContributor(session)).toBeNull()
    })
  })

  // ============================================================================
  // Status Transition Tests
  // ============================================================================

  describe('isValidStatusTransition', () => {
    it('should allow valid transitions from initializing', () => {
      expect(isValidStatusTransition('initializing', 'active')).toBe(true)
      expect(isValidStatusTransition('initializing', 'paused')).toBe(true)
      expect(isValidStatusTransition('initializing', 'abandoned')).toBe(true)
      expect(isValidStatusTransition('initializing', 'completed')).toBe(false)
    })

    it('should allow valid transitions from active', () => {
      expect(isValidStatusTransition('active', 'paused')).toBe(true)
      expect(isValidStatusTransition('active', 'completed')).toBe(true)
      expect(isValidStatusTransition('active', 'abandoned')).toBe(true)
      expect(isValidStatusTransition('active', 'initializing')).toBe(false)
    })

    it('should allow valid transitions from paused', () => {
      expect(isValidStatusTransition('paused', 'active')).toBe(true)
      expect(isValidStatusTransition('paused', 'abandoned')).toBe(true)
      expect(isValidStatusTransition('paused', 'completed')).toBe(false)
    })

    it('should not allow transitions from terminal states', () => {
      expect(isValidStatusTransition('completed', 'active')).toBe(false)
      expect(isValidStatusTransition('completed', 'paused')).toBe(false)
      expect(isValidStatusTransition('abandoned', 'active')).toBe(false)
      expect(isValidStatusTransition('abandoned', 'completed')).toBe(false)
    })
  })

  // ============================================================================
  // Contribution Creation Helpers
  // ============================================================================

  describe('contribution creation helpers', () => {
    it('createSessionStartContribution should create valid contribution', () => {
      const contrib = createSessionStartContribution('550e8400-e29b-41d4-a716-446655440001', 'parent')
      expect(contrib.action).toBe('session_started')
      expect(contrib.contributor).toBe('parent')
      expect(contrib.id).toBe('550e8400-e29b-41d4-a716-446655440001')
    })

    it('createPauseContribution should create valid contribution', () => {
      const contrib = createPauseContribution('550e8400-e29b-41d4-a716-446655440001', 'parent')
      expect(contrib.action).toBe('session_paused')
      expect(contrib.contributor).toBe('parent')
    })

    it('createResumeContribution should create valid contribution', () => {
      const contrib = createResumeContribution('550e8400-e29b-41d4-a716-446655440001', 'child')
      expect(contrib.action).toBe('session_resumed')
      expect(contrib.contributor).toBe('child')
    })
  })

  // ============================================================================
  // Firestore Conversion Tests
  // ============================================================================

  describe('convertFirestoreToCoCreationSession', () => {
    const mockTimestamp = (date: string) => ({
      toDate: () => new Date(date),
    })

    it('should convert Firestore data to application type', () => {
      const firestoreData = {
        ...createValidSession(),
        createdAt: mockTimestamp('2024-01-15T10:00:00.000Z'),
        updatedAt: mockTimestamp('2024-01-15T10:30:00.000Z'),
        lastActivityAt: mockTimestamp('2024-01-15T10:30:00.000Z'),
        terms: [
          {
            ...createValidTerm(),
            createdAt: mockTimestamp('2024-01-15T10:00:00.000Z'),
            updatedAt: mockTimestamp('2024-01-15T10:00:00.000Z'),
          },
        ],
        contributions: [
          {
            ...createValidContribution(),
            createdAt: mockTimestamp('2024-01-15T10:00:00.000Z'),
          },
        ],
      }

      const result = convertFirestoreToCoCreationSession(firestoreData as any)
      expect(result.createdAt).toBe('2024-01-15T10:00:00.000Z')
      expect(result.terms[0].createdAt).toBe('2024-01-15T10:00:00.000Z')
      expect(result.contributions[0].createdAt).toBe('2024-01-15T10:00:00.000Z')
    })

    it('should handle optional pausedAt and completedAt', () => {
      const firestoreData = {
        ...createValidSession({ status: 'paused' }),
        pausedAt: mockTimestamp('2024-01-15T11:00:00.000Z'),
        createdAt: mockTimestamp('2024-01-15T10:00:00.000Z'),
        updatedAt: mockTimestamp('2024-01-15T11:00:00.000Z'),
        lastActivityAt: mockTimestamp('2024-01-15T11:00:00.000Z'),
        terms: [],
        contributions: [],
      }

      const result = convertFirestoreToCoCreationSession(firestoreData as any)
      expect(result.pausedAt).toBe('2024-01-15T11:00:00.000Z')
    })
  })

  // ============================================================================
  // Constants Tests
  // ============================================================================

  describe('constants', () => {
    it('SESSION_TIMEOUT_CONSTANTS should have correct values', () => {
      expect(SESSION_TIMEOUT_CONSTANTS.INACTIVITY_WARNING_MS).toBe(25 * 60 * 1000)
      expect(SESSION_TIMEOUT_CONSTANTS.INACTIVITY_TIMEOUT_MS).toBe(30 * 60 * 1000)
      expect(SESSION_TIMEOUT_CONSTANTS.ABANDONMENT_THRESHOLD_MS).toBe(30 * 24 * 60 * 60 * 1000)
    })

    it('SESSION_ARRAY_LIMITS should enforce NFR60', () => {
      expect(SESSION_ARRAY_LIMITS.maxTerms).toBe(100)
    })

    it('SESSION_STATUS_LABELS should have all statuses', () => {
      expect(Object.keys(SESSION_STATUS_LABELS)).toHaveLength(5)
      expect(SESSION_STATUS_LABELS).toHaveProperty('initializing')
      expect(SESSION_STATUS_LABELS).toHaveProperty('active')
      expect(SESSION_STATUS_LABELS).toHaveProperty('paused')
      expect(SESSION_STATUS_LABELS).toHaveProperty('completed')
      expect(SESSION_STATUS_LABELS).toHaveProperty('abandoned')
    })

    it('SESSION_ERROR_MESSAGES should have common error codes', () => {
      expect(SESSION_ERROR_MESSAGES).toHaveProperty('session-not-found')
      expect(SESSION_ERROR_MESSAGES).toHaveProperty('not-authorized')
      expect(SESSION_ERROR_MESSAGES).toHaveProperty('unknown')
    })
  })

  // ============================================================================
  // Story 5.4: Discussion Schema Tests
  // ============================================================================

  describe('resolutionStatusSchema (Story 5.4)', () => {
    it('should accept valid resolution status values', () => {
      expect(resolutionStatusSchema.parse('unresolved')).toBe('unresolved')
      expect(resolutionStatusSchema.parse('parent-agreed')).toBe('parent-agreed')
      expect(resolutionStatusSchema.parse('child-agreed')).toBe('child-agreed')
      expect(resolutionStatusSchema.parse('resolved')).toBe('resolved')
    })

    it('should reject invalid resolution status values', () => {
      expect(() => resolutionStatusSchema.parse('invalid')).toThrow()
      expect(() => resolutionStatusSchema.parse('')).toThrow()
      expect(() => resolutionStatusSchema.parse(null)).toThrow()
    })
  })

  describe('discussionNoteSchema (Story 5.4)', () => {
    it('should accept valid discussion note', () => {
      const note = createValidDiscussionNote()
      const result = discussionNoteSchema.parse(note)
      expect(result.id).toBe(note.id)
      expect(result.contributor).toBe('child')
      expect(result.text).toBe('I think I need more time for homework')
    })

    it('should reject note with empty text', () => {
      const note = createValidDiscussionNote({ text: '' })
      expect(() => discussionNoteSchema.parse(note)).toThrow()
    })

    it('should reject note with text over 500 characters', () => {
      const note = createValidDiscussionNote({ text: 'a'.repeat(501) })
      expect(() => discussionNoteSchema.parse(note)).toThrow()
    })

    it('should accept note with exactly 500 characters', () => {
      const note = createValidDiscussionNote({ text: 'a'.repeat(500) })
      const result = discussionNoteSchema.parse(note)
      expect(result.text.length).toBe(500)
    })

    it('should reject note with invalid UUID', () => {
      const note = createValidDiscussionNote({ id: 'not-a-uuid' })
      expect(() => discussionNoteSchema.parse(note)).toThrow()
    })

    it('should reject note with invalid datetime', () => {
      const note = createValidDiscussionNote({ createdAt: 'not-a-date' })
      expect(() => discussionNoteSchema.parse(note)).toThrow()
    })
  })

  describe('sessionTermSchema with discussion fields (Story 5.4)', () => {
    it('should accept term with empty discussion notes', () => {
      const term = createValidTerm({ discussionNotes: [] })
      const result = sessionTermSchema.parse(term)
      expect(result.discussionNotes).toHaveLength(0)
    })

    it('should accept term with discussion notes', () => {
      const term = createValidTerm({
        status: 'discussion',
        discussionNotes: [createValidDiscussionNote()],
      })
      const result = sessionTermSchema.parse(term)
      expect(result.discussionNotes).toHaveLength(1)
      expect(result.discussionNotes[0].contributor).toBe('child')
    })

    it('should accept term with resolution status', () => {
      const term = createValidTerm({
        status: 'discussion',
        resolutionStatus: 'parent-agreed',
      })
      const result = sessionTermSchema.parse(term)
      expect(result.resolutionStatus).toBe('parent-agreed')
    })

    it('should accept term with compromiseAccepted', () => {
      const term = createValidTerm({
        status: 'discussion',
        compromiseAccepted: 'st-less-30',
      })
      const result = sessionTermSchema.parse(term)
      expect(result.compromiseAccepted).toBe('st-less-30')
    })

    it('should default discussionNotes to empty array', () => {
      const { discussionNotes, ...termWithoutNotes } = createValidTerm()
      const result = sessionTermSchema.parse(termWithoutNotes)
      expect(result.discussionNotes).toEqual([])
    })

    it('should default resolutionStatus to unresolved', () => {
      const { resolutionStatus, ...termWithoutStatus } = createValidTerm()
      const result = sessionTermSchema.parse(termWithoutStatus)
      expect(result.resolutionStatus).toBe('unresolved')
    })

    it('should enforce max notes per term limit', () => {
      const manyNotes = Array.from({ length: DISCUSSION_LIMITS.maxNotesPerTerm + 1 }, (_, i) =>
        createValidDiscussionNote({ id: `550e8400-e29b-41d4-a716-44665544${String(i).padStart(4, '0')}` })
      )
      const term = createValidTerm({ discussionNotes: manyNotes })
      expect(() => sessionTermSchema.parse(term)).toThrow()
    })
  })

  describe('Discussion Input Schemas (Story 5.4)', () => {
    describe('addDiscussionNoteInputSchema', () => {
      it('should accept valid add note input', () => {
        const input = {
          sessionId: '550e8400-e29b-41d4-a716-446655440000',
          termId: '550e8400-e29b-41d4-a716-446655440003',
          contributor: 'child',
          text: 'I need this for homework',
        }
        const result = addDiscussionNoteInputSchema.parse(input)
        expect(result.contributor).toBe('child')
        expect(result.text).toBe('I need this for homework')
      })

      it('should reject note input with empty text', () => {
        const input = {
          sessionId: '550e8400-e29b-41d4-a716-446655440000',
          termId: '550e8400-e29b-41d4-a716-446655440003',
          contributor: 'child',
          text: '',
        }
        expect(() => addDiscussionNoteInputSchema.parse(input)).toThrow()
      })
    })

    describe('markTermAgreementInputSchema', () => {
      it('should accept valid agreement input', () => {
        const input = {
          sessionId: '550e8400-e29b-41d4-a716-446655440000',
          termId: '550e8400-e29b-41d4-a716-446655440003',
          contributor: 'parent',
        }
        const result = markTermAgreementInputSchema.parse(input)
        expect(result.contributor).toBe('parent')
      })
    })

    describe('acceptCompromiseInputSchema', () => {
      it('should accept valid compromise input', () => {
        const input = {
          sessionId: '550e8400-e29b-41d4-a716-446655440000',
          termId: '550e8400-e29b-41d4-a716-446655440003',
          contributor: 'child',
          compromiseId: 'st-less-30',
          newContent: { weekdayMinutes: 30 },
        }
        const result = acceptCompromiseInputSchema.parse(input)
        expect(result.compromiseId).toBe('st-less-30')
        expect(result.newContent).toEqual({ weekdayMinutes: 30 })
      })

      it('should reject compromise input with empty compromiseId', () => {
        const input = {
          sessionId: '550e8400-e29b-41d4-a716-446655440000',
          termId: '550e8400-e29b-41d4-a716-446655440003',
          contributor: 'child',
          compromiseId: '',
          newContent: {},
        }
        expect(() => acceptCompromiseInputSchema.parse(input)).toThrow()
      })
    })
  })

  // ============================================================================
  // Story 5.4: Discussion Label Helper Tests
  // ============================================================================

  describe('Discussion label helpers (Story 5.4)', () => {
    it('getResolutionStatusLabel should return correct labels', () => {
      expect(getResolutionStatusLabel('unresolved')).toBe('Needs Agreement')
      expect(getResolutionStatusLabel('parent-agreed')).toBe('Parent Agreed')
      expect(getResolutionStatusLabel('child-agreed')).toBe('Child Agreed')
      expect(getResolutionStatusLabel('resolved')).toBe('Both Agreed')
    })

    it('getResolutionStatusDescription should return 6th-grade level descriptions', () => {
      expect(getResolutionStatusDescription('unresolved')).toContain('both need to agree')
      expect(getResolutionStatusDescription('parent-agreed')).toContain('Waiting for child')
      expect(getResolutionStatusDescription('child-agreed')).toContain('Waiting for parent')
      expect(getResolutionStatusDescription('resolved')).toContain('both agree')
    })
  })

  // ============================================================================
  // Story 5.4: Discussion Helper Function Tests
  // ============================================================================

  describe('Discussion helper functions (Story 5.4)', () => {
    describe('safeParseDiscussionNote', () => {
      it('should return note for valid data', () => {
        const note = createValidDiscussionNote()
        expect(safeParseDiscussionNote(note)).not.toBeNull()
      })

      it('should return null for invalid data', () => {
        expect(safeParseDiscussionNote({ invalid: 'data' })).toBeNull()
      })
    })

    describe('getUnresolvedDiscussionTerms (AC #5, AC #6)', () => {
      it('should return only unresolved discussion terms', () => {
        const session = createValidSession({
          terms: [
            createValidTerm({ status: 'accepted' }),
            createValidTerm({
              id: '550e8400-e29b-41d4-a716-446655440010',
              status: 'discussion',
              resolutionStatus: 'unresolved',
            }),
            createValidTerm({
              id: '550e8400-e29b-41d4-a716-446655440011',
              status: 'discussion',
              resolutionStatus: 'resolved',
            }),
            createValidTerm({
              id: '550e8400-e29b-41d4-a716-446655440012',
              status: 'discussion',
              resolutionStatus: 'parent-agreed',
            }),
          ],
        })
        const unresolved = getUnresolvedDiscussionTerms(session)
        expect(unresolved).toHaveLength(2) // unresolved and parent-agreed
        expect(unresolved.every((t) => t.status === 'discussion')).toBe(true)
        expect(unresolved.every((t) => t.resolutionStatus !== 'resolved')).toBe(true)
      })

      it('should return empty array when all discussion terms are resolved', () => {
        const session = createValidSession({
          terms: [
            createValidTerm({ status: 'accepted' }),
            createValidTerm({
              id: '550e8400-e29b-41d4-a716-446655440010',
              status: 'discussion',
              resolutionStatus: 'resolved',
            }),
          ],
        })
        const unresolved = getUnresolvedDiscussionTerms(session)
        expect(unresolved).toHaveLength(0)
      })
    })

    describe('canProceedToSigning (AC #6)', () => {
      it('should return true when no unresolved discussion terms', () => {
        const session = createValidSession({
          terms: [
            createValidTerm({ status: 'accepted' }),
            createValidTerm({
              id: '550e8400-e29b-41d4-a716-446655440010',
              status: 'discussion',
              resolutionStatus: 'resolved',
            }),
          ],
        })
        expect(canProceedToSigning(session)).toBe(true)
      })

      it('should return false when unresolved discussion terms exist', () => {
        const session = createValidSession({
          terms: [
            createValidTerm({ status: 'accepted' }),
            createValidTerm({
              id: '550e8400-e29b-41d4-a716-446655440010',
              status: 'discussion',
              resolutionStatus: 'unresolved',
            }),
          ],
        })
        expect(canProceedToSigning(session)).toBe(false)
      })
    })

    describe('getNextResolutionStatus (AC #4)', () => {
      it('should transition from unresolved to parent-agreed when parent agrees', () => {
        expect(getNextResolutionStatus('unresolved', 'parent')).toBe('parent-agreed')
      })

      it('should transition from unresolved to child-agreed when child agrees', () => {
        expect(getNextResolutionStatus('unresolved', 'child')).toBe('child-agreed')
      })

      it('should transition from parent-agreed to resolved when child agrees', () => {
        expect(getNextResolutionStatus('parent-agreed', 'child')).toBe('resolved')
      })

      it('should transition from child-agreed to resolved when parent agrees', () => {
        expect(getNextResolutionStatus('child-agreed', 'parent')).toBe('resolved')
      })

      it('should stay parent-agreed when parent agrees again', () => {
        expect(getNextResolutionStatus('parent-agreed', 'parent')).toBe('parent-agreed')
      })

      it('should stay child-agreed when child agrees again', () => {
        expect(getNextResolutionStatus('child-agreed', 'child')).toBe('child-agreed')
      })

      it('should stay resolved when already resolved', () => {
        expect(getNextResolutionStatus('resolved', 'parent')).toBe('resolved')
        expect(getNextResolutionStatus('resolved', 'child')).toBe('resolved')
      })
    })

    describe('hasContributorAgreed', () => {
      it('should return true for parent when parent-agreed', () => {
        expect(hasContributorAgreed('parent-agreed', 'parent')).toBe(true)
      })

      it('should return false for child when parent-agreed', () => {
        expect(hasContributorAgreed('parent-agreed', 'child')).toBe(false)
      })

      it('should return true for child when child-agreed', () => {
        expect(hasContributorAgreed('child-agreed', 'child')).toBe(true)
      })

      it('should return false for parent when child-agreed', () => {
        expect(hasContributorAgreed('child-agreed', 'parent')).toBe(false)
      })

      it('should return true for both when resolved', () => {
        expect(hasContributorAgreed('resolved', 'parent')).toBe(true)
        expect(hasContributorAgreed('resolved', 'child')).toBe(true)
      })

      it('should return false for both when unresolved', () => {
        expect(hasContributorAgreed('unresolved', 'parent')).toBe(false)
        expect(hasContributorAgreed('unresolved', 'child')).toBe(false)
      })
    })

    describe('createDiscussionNote', () => {
      it('should create valid discussion note', () => {
        const note = createDiscussionNote(
          '550e8400-e29b-41d4-a716-446655440099',
          'child',
          'Can we talk about this?'
        )
        expect(note.id).toBe('550e8400-e29b-41d4-a716-446655440099')
        expect(note.contributor).toBe('child')
        expect(note.text).toBe('Can we talk about this?')
        expect(note.createdAt).toBeDefined()
      })
    })

    describe('getSigningReadiness (AC #6)', () => {
      it('should return canProceed true when all resolved', () => {
        const session = createValidSession({
          terms: [createValidTerm({ status: 'accepted' })],
        })
        const readiness = getSigningReadiness(session)
        expect(readiness.canProceed).toBe(true)
        expect(readiness.unresolvedCount).toBe(0)
        expect(readiness.unresolvedTerms).toHaveLength(0)
      })

      it('should return canProceed false with unresolved terms', () => {
        const session = createValidSession({
          terms: [
            createValidTerm({
              status: 'discussion',
              resolutionStatus: 'unresolved',
            }),
            createValidTerm({
              id: '550e8400-e29b-41d4-a716-446655440010',
              status: 'discussion',
              resolutionStatus: 'parent-agreed',
            }),
          ],
        })
        const readiness = getSigningReadiness(session)
        expect(readiness.canProceed).toBe(false)
        expect(readiness.unresolvedCount).toBe(2)
        expect(readiness.unresolvedTerms).toHaveLength(2)
      })
    })

    describe('getDiscussionErrorMessage', () => {
      it('should return correct error messages', () => {
        expect(getDiscussionErrorMessage('note-too-long')).toContain('too long')
        expect(getDiscussionErrorMessage('max-notes-reached')).toContain('too many notes')
        expect(getDiscussionErrorMessage('already-agreed')).toContain('already agreed')
        expect(getDiscussionErrorMessage('cannot-sign-unresolved')).toContain('resolve all')
      })

      it('should return unknown message for unrecognized codes', () => {
        expect(getDiscussionErrorMessage('unknown-code')).toBe('Something went wrong. Please try again.')
      })
    })
  })

  // ============================================================================
  // Story 5.4: Discussion Constants Tests
  // ============================================================================

  describe('Discussion constants (Story 5.4)', () => {
    it('RESOLUTION_STATUS_LABELS should have all statuses', () => {
      expect(Object.keys(RESOLUTION_STATUS_LABELS)).toHaveLength(4)
      expect(RESOLUTION_STATUS_LABELS).toHaveProperty('unresolved')
      expect(RESOLUTION_STATUS_LABELS).toHaveProperty('parent-agreed')
      expect(RESOLUTION_STATUS_LABELS).toHaveProperty('child-agreed')
      expect(RESOLUTION_STATUS_LABELS).toHaveProperty('resolved')
    })

    it('DISCUSSION_LIMITS should have correct values', () => {
      expect(DISCUSSION_LIMITS.maxNotesPerTerm).toBe(50)
      expect(DISCUSSION_LIMITS.maxNoteLength).toBe(500)
    })

    it('DISCUSSION_ERROR_MESSAGES should have common error codes', () => {
      expect(DISCUSSION_ERROR_MESSAGES).toHaveProperty('note-too-long')
      expect(DISCUSSION_ERROR_MESSAGES).toHaveProperty('max-notes-reached')
      expect(DISCUSSION_ERROR_MESSAGES).toHaveProperty('already-agreed')
      expect(DISCUSSION_ERROR_MESSAGES).toHaveProperty('cannot-sign-unresolved')
    })
  })
})
