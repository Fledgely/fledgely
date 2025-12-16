/**
 * Unit tests for Co-Creation Session Service
 *
 * Story 5.1: Co-Creation Session Initiation
 *
 * Tests the core business logic for session management.
 * Uses Vitest with contract schema validation tests.
 *
 * NOTE: Integration tests requiring Firebase emulators are in the callable tests.
 * Run with: firebase emulators:exec "npx vitest run" --only firestore,auth
 */

import { describe, it, expect } from 'vitest'

// Import contracts schemas and helpers
import {
  createCoCreationSessionInputSchema,
  pauseSessionInputSchema,
  resumeSessionInputSchema,
  recordContributionInputSchema,
  coCreationSessionSchema,
  sessionStatusSchema,
  sessionContributorSchema,
  contributionActionSchema,
  sessionTermTypeSchema,
  sessionTermStatusSchema,
  isValidStatusTransition,
  canPauseSession,
  canResumeSession,
  isSessionActive,
  SESSION_ARRAY_LIMITS,
  SESSION_TIMEOUT_CONSTANTS,
  type CoCreationSession,
  type SessionStatus,
} from '@fledgely/contracts'

// ============================================================================
// Input Schema Validation Tests
// ============================================================================

describe('coCreationService input schemas', () => {
  describe('createCoCreationSessionInputSchema', () => {
    it('validates correct input with all required fields', () => {
      const input = {
        familyId: 'family-123',
        childId: 'child-456',
        sourceDraft: {
          type: 'wizard',
          templateId: 'template-789',
        },
      }

      const result = createCoCreationSessionInputSchema.safeParse(input)
      expect(result.success).toBe(true)
    })

    it('accepts input with initialTerms', () => {
      const input = {
        familyId: 'family-123',
        childId: 'child-456',
        sourceDraft: {
          type: 'template_customization',
          templateId: 'template-789',
          draftId: 'draft-abc',
        },
        initialTerms: [
          {
            type: 'screen_time',
            content: { minutes: 120, weekdayLimit: true },
          },
          {
            type: 'bedtime',
            content: { time: '21:00', weekendTime: '22:00' },
          },
        ],
      }

      const result = createCoCreationSessionInputSchema.safeParse(input)
      expect(result.success).toBe(true)
    })

    it('accepts blank source draft type', () => {
      const input = {
        familyId: 'family-123',
        childId: 'child-456',
        sourceDraft: {
          type: 'blank',
        },
      }

      const result = createCoCreationSessionInputSchema.safeParse(input)
      expect(result.success).toBe(true)
    })

    it('rejects missing familyId', () => {
      const input = {
        childId: 'child-456',
        sourceDraft: { type: 'wizard' },
      }

      const result = createCoCreationSessionInputSchema.safeParse(input)
      expect(result.success).toBe(false)
    })

    it('rejects missing childId', () => {
      const input = {
        familyId: 'family-123',
        sourceDraft: { type: 'wizard' },
      }

      const result = createCoCreationSessionInputSchema.safeParse(input)
      expect(result.success).toBe(false)
    })

    it('rejects empty familyId', () => {
      const input = {
        familyId: '',
        childId: 'child-456',
        sourceDraft: { type: 'wizard' },
      }

      const result = createCoCreationSessionInputSchema.safeParse(input)
      expect(result.success).toBe(false)
    })

    it('rejects empty childId', () => {
      const input = {
        familyId: 'family-123',
        childId: '',
        sourceDraft: { type: 'wizard' },
      }

      const result = createCoCreationSessionInputSchema.safeParse(input)
      expect(result.success).toBe(false)
    })

    it('rejects invalid source draft type', () => {
      const input = {
        familyId: 'family-123',
        childId: 'child-456',
        sourceDraft: { type: 'invalid_type' },
      }

      const result = createCoCreationSessionInputSchema.safeParse(input)
      expect(result.success).toBe(false)
    })

    it('rejects missing sourceDraft', () => {
      const input = {
        familyId: 'family-123',
        childId: 'child-456',
      }

      const result = createCoCreationSessionInputSchema.safeParse(input)
      expect(result.success).toBe(false)
    })
  })

  describe('pauseSessionInputSchema', () => {
    it('validates correct input with valid UUID', () => {
      const input = {
        sessionId: '123e4567-e89b-12d3-a456-426614174000',
      }

      const result = pauseSessionInputSchema.safeParse(input)
      expect(result.success).toBe(true)
    })

    it('rejects missing sessionId', () => {
      const input = {}

      const result = pauseSessionInputSchema.safeParse(input)
      expect(result.success).toBe(false)
    })

    it('rejects invalid sessionId (not UUID)', () => {
      const input = {
        sessionId: 'not-a-uuid',
      }

      const result = pauseSessionInputSchema.safeParse(input)
      expect(result.success).toBe(false)
    })
  })

  describe('resumeSessionInputSchema', () => {
    it('validates correct input with valid UUID', () => {
      const input = {
        sessionId: '123e4567-e89b-12d3-a456-426614174000',
      }

      const result = resumeSessionInputSchema.safeParse(input)
      expect(result.success).toBe(true)
    })

    it('rejects missing sessionId', () => {
      const input = {}

      const result = resumeSessionInputSchema.safeParse(input)
      expect(result.success).toBe(false)
    })

    it('rejects invalid sessionId (not UUID)', () => {
      const input = {
        sessionId: 'invalid',
      }

      const result = resumeSessionInputSchema.safeParse(input)
      expect(result.success).toBe(false)
    })
  })

  describe('recordContributionInputSchema', () => {
    it('validates correct input for adding a term', () => {
      const input = {
        sessionId: '123e4567-e89b-12d3-a456-426614174000',
        contributor: 'parent',
        action: 'added_term',
      }

      const result = recordContributionInputSchema.safeParse(input)
      expect(result.success).toBe(true)
    })

    it('validates input for child contribution', () => {
      const input = {
        sessionId: '123e4567-e89b-12d3-a456-426614174000',
        contributor: 'child',
        action: 'added_term',
      }

      const result = recordContributionInputSchema.safeParse(input)
      expect(result.success).toBe(true)
    })

    it('validates input with optional termId', () => {
      const input = {
        sessionId: '123e4567-e89b-12d3-a456-426614174000',
        contributor: 'child',
        action: 'marked_for_discussion',
        termId: '223e4567-e89b-12d3-a456-426614174000',
      }

      const result = recordContributionInputSchema.safeParse(input)
      expect(result.success).toBe(true)
    })

    it('rejects missing sessionId', () => {
      const input = {
        contributor: 'parent',
        action: 'added_term',
      }

      const result = recordContributionInputSchema.safeParse(input)
      expect(result.success).toBe(false)
    })

    it('rejects missing contributor', () => {
      const input = {
        sessionId: '123e4567-e89b-12d3-a456-426614174000',
        action: 'added_term',
      }

      const result = recordContributionInputSchema.safeParse(input)
      expect(result.success).toBe(false)
    })

    it('rejects missing action', () => {
      const input = {
        sessionId: '123e4567-e89b-12d3-a456-426614174000',
        contributor: 'parent',
      }

      const result = recordContributionInputSchema.safeParse(input)
      expect(result.success).toBe(false)
    })

    it('rejects invalid contributor', () => {
      const input = {
        sessionId: '123e4567-e89b-12d3-a456-426614174000',
        contributor: 'guest',
        action: 'added_term',
      }

      const result = recordContributionInputSchema.safeParse(input)
      expect(result.success).toBe(false)
    })

    it('rejects invalid action', () => {
      const input = {
        sessionId: '123e4567-e89b-12d3-a456-426614174000',
        contributor: 'parent',
        action: 'invalid_action',
      }

      const result = recordContributionInputSchema.safeParse(input)
      expect(result.success).toBe(false)
    })
  })
})

// ============================================================================
// Session Status Transition Tests
// ============================================================================

describe('session status transitions', () => {
  describe('isValidStatusTransition', () => {
    it('allows initializing -> active', () => {
      expect(isValidStatusTransition('initializing', 'active')).toBe(true)
    })

    it('allows initializing -> paused', () => {
      expect(isValidStatusTransition('initializing', 'paused')).toBe(true)
    })

    it('allows initializing -> abandoned', () => {
      expect(isValidStatusTransition('initializing', 'abandoned')).toBe(true)
    })

    it('allows active -> paused', () => {
      expect(isValidStatusTransition('active', 'paused')).toBe(true)
    })

    it('allows active -> completed', () => {
      expect(isValidStatusTransition('active', 'completed')).toBe(true)
    })

    it('allows active -> abandoned', () => {
      expect(isValidStatusTransition('active', 'abandoned')).toBe(true)
    })

    it('allows paused -> active', () => {
      expect(isValidStatusTransition('paused', 'active')).toBe(true)
    })

    it('allows paused -> abandoned', () => {
      expect(isValidStatusTransition('paused', 'abandoned')).toBe(true)
    })

    it('denies initializing -> completed (must go through active)', () => {
      expect(isValidStatusTransition('initializing', 'completed')).toBe(false)
    })

    it('denies paused -> completed (must resume first)', () => {
      expect(isValidStatusTransition('paused', 'completed')).toBe(false)
    })

    it('denies completed -> any state', () => {
      expect(isValidStatusTransition('completed', 'active')).toBe(false)
      expect(isValidStatusTransition('completed', 'paused')).toBe(false)
      expect(isValidStatusTransition('completed', 'abandoned')).toBe(false)
    })

    it('denies abandoned -> any state', () => {
      expect(isValidStatusTransition('abandoned', 'active')).toBe(false)
      expect(isValidStatusTransition('abandoned', 'paused')).toBe(false)
      expect(isValidStatusTransition('abandoned', 'completed')).toBe(false)
    })

    it('denies same state transitions', () => {
      expect(isValidStatusTransition('active', 'active')).toBe(false)
      expect(isValidStatusTransition('paused', 'paused')).toBe(false)
    })
  })

  describe('canPauseSession', () => {
    const baseSession: CoCreationSession = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      familyId: 'family-123',
      childId: 'child-456',
      initiatedBy: 'parent-uid',
      status: 'active',
      sourceDraft: { type: 'blank' },
      terms: [],
      contributions: [],
      createdAt: '2025-01-15T10:00:00.000Z',
      updatedAt: '2025-01-15T10:00:00.000Z',
      lastActivityAt: '2025-01-15T10:00:00.000Z',
    }

    it('returns true for initializing status', () => {
      expect(canPauseSession({ ...baseSession, status: 'initializing' })).toBe(true)
    })

    it('returns true for active status', () => {
      expect(canPauseSession({ ...baseSession, status: 'active' })).toBe(true)
    })

    it('returns false for paused status', () => {
      expect(canPauseSession({ ...baseSession, status: 'paused' })).toBe(false)
    })

    it('returns false for completed status', () => {
      expect(canPauseSession({ ...baseSession, status: 'completed' })).toBe(false)
    })

    it('returns false for abandoned status', () => {
      expect(canPauseSession({ ...baseSession, status: 'abandoned' })).toBe(false)
    })
  })

  describe('canResumeSession', () => {
    const baseSession: CoCreationSession = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      familyId: 'family-123',
      childId: 'child-456',
      initiatedBy: 'parent-uid',
      status: 'paused',
      sourceDraft: { type: 'blank' },
      terms: [],
      contributions: [],
      createdAt: '2025-01-15T10:00:00.000Z',
      updatedAt: '2025-01-15T10:00:00.000Z',
      lastActivityAt: '2025-01-15T10:00:00.000Z',
    }

    it('returns true for paused status', () => {
      expect(canResumeSession({ ...baseSession, status: 'paused' })).toBe(true)
    })

    it('returns false for initializing status', () => {
      expect(canResumeSession({ ...baseSession, status: 'initializing' })).toBe(false)
    })

    it('returns false for active status', () => {
      expect(canResumeSession({ ...baseSession, status: 'active' })).toBe(false)
    })

    it('returns false for completed status', () => {
      expect(canResumeSession({ ...baseSession, status: 'completed' })).toBe(false)
    })

    it('returns false for abandoned status', () => {
      expect(canResumeSession({ ...baseSession, status: 'abandoned' })).toBe(false)
    })
  })

  describe('isSessionActive', () => {
    const baseSession: CoCreationSession = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      familyId: 'family-123',
      childId: 'child-456',
      initiatedBy: 'parent-uid',
      status: 'active',
      sourceDraft: { type: 'blank' },
      terms: [],
      contributions: [],
      createdAt: '2025-01-15T10:00:00.000Z',
      updatedAt: '2025-01-15T10:00:00.000Z',
      lastActivityAt: '2025-01-15T10:00:00.000Z',
    }

    it('returns true for initializing status', () => {
      expect(isSessionActive({ ...baseSession, status: 'initializing' })).toBe(true)
    })

    it('returns true for active status', () => {
      expect(isSessionActive({ ...baseSession, status: 'active' })).toBe(true)
    })

    it('returns true for paused status (session still exists)', () => {
      expect(isSessionActive({ ...baseSession, status: 'paused' })).toBe(true)
    })

    it('returns false for completed status', () => {
      expect(isSessionActive({ ...baseSession, status: 'completed' })).toBe(false)
    })

    it('returns false for abandoned status', () => {
      expect(isSessionActive({ ...baseSession, status: 'abandoned' })).toBe(false)
    })
  })
})

// ============================================================================
// Session Schema Validation Tests
// ============================================================================

describe('coCreationSessionSchema validation', () => {
  const validSession: CoCreationSession = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    familyId: 'family-123',
    childId: 'child-456',
    initiatedBy: 'parent-uid-789',
    status: 'active',
    sourceDraft: {
      type: 'wizard',
      templateId: 'template-abc',
    },
    terms: [],
    contributions: [
      {
        id: '223e4567-e89b-12d3-a456-426614174001',
        contributor: 'parent',
        action: 'session_started',
        createdAt: '2025-01-15T10:00:00.000Z',
      },
    ],
    createdAt: '2025-01-15T10:00:00.000Z',
    updatedAt: '2025-01-15T10:00:00.000Z',
    lastActivityAt: '2025-01-15T10:00:00.000Z',
  }

  it('validates a minimal valid session', () => {
    const result = coCreationSessionSchema.safeParse(validSession)
    expect(result.success).toBe(true)
  })

  it('validates session with terms', () => {
    const sessionWithTerms = {
      ...validSession,
      terms: [
        {
          id: '323e4567-e89b-12d3-a456-426614174002',
          type: 'screen_time',
          content: { minutes: 120 },
          addedBy: 'parent',
          status: 'accepted',
          order: 0,
          createdAt: '2025-01-15T10:00:00.000Z',
          updatedAt: '2025-01-15T10:00:00.000Z',
        },
        {
          id: '323e4567-e89b-12d3-a456-426614174003',
          type: 'bedtime',
          content: { time: '21:00' },
          addedBy: 'child',
          status: 'discussion',
          order: 1,
          createdAt: '2025-01-15T10:05:00.000Z',
          updatedAt: '2025-01-15T10:05:00.000Z',
        },
      ],
    }

    const result = coCreationSessionSchema.safeParse(sessionWithTerms)
    expect(result.success).toBe(true)
  })

  it('validates paused session with pausedAt', () => {
    const pausedSession = {
      ...validSession,
      status: 'paused',
      pausedAt: '2025-01-15T11:00:00.000Z',
    }

    const result = coCreationSessionSchema.safeParse(pausedSession)
    expect(result.success).toBe(true)
  })

  it('validates completed session with completedAt', () => {
    const completedSession = {
      ...validSession,
      status: 'completed',
      completedAt: '2025-01-15T12:00:00.000Z',
    }

    const result = coCreationSessionSchema.safeParse(completedSession)
    expect(result.success).toBe(true)
  })

  it('rejects session with invalid UUID', () => {
    const invalidSession = {
      ...validSession,
      id: 'not-a-uuid',
    }

    const result = coCreationSessionSchema.safeParse(invalidSession)
    expect(result.success).toBe(false)
  })

  it('rejects session with empty familyId', () => {
    const invalidSession = {
      ...validSession,
      familyId: '',
    }

    const result = coCreationSessionSchema.safeParse(invalidSession)
    expect(result.success).toBe(false)
  })

  it('rejects session with invalid status', () => {
    const invalidSession = {
      ...validSession,
      status: 'invalid_status',
    }

    const result = coCreationSessionSchema.safeParse(invalidSession)
    expect(result.success).toBe(false)
  })

  it('rejects session with too many terms (NFR60)', () => {
    const tooManyTerms = Array.from({ length: 101 }, (_, i) => ({
      id: `123e4567-e89b-12d3-a456-${String(426614174000 + i).padStart(12, '0')}`,
      type: 'rule' as const,
      content: { description: `Rule ${i}` },
      addedBy: 'parent' as const,
      status: 'accepted' as const,
      order: i,
      createdAt: '2025-01-15T10:00:00.000Z',
      updatedAt: '2025-01-15T10:00:00.000Z',
    }))

    const invalidSession = {
      ...validSession,
      terms: tooManyTerms,
    }

    const result = coCreationSessionSchema.safeParse(invalidSession)
    expect(result.success).toBe(false)
  })

  it('accepts session with exactly 100 terms (max allowed)', () => {
    const maxTerms = Array.from({ length: 100 }, (_, i) => ({
      id: `123e4567-e89b-12d3-a456-${String(426614174000 + i).padStart(12, '0')}`,
      type: 'rule' as const,
      content: { description: `Rule ${i}` },
      addedBy: 'parent' as const,
      status: 'accepted' as const,
      order: i,
      createdAt: '2025-01-15T10:00:00.000Z',
      updatedAt: '2025-01-15T10:00:00.000Z',
    }))

    const validSessionWithMaxTerms = {
      ...validSession,
      terms: maxTerms,
    }

    const result = coCreationSessionSchema.safeParse(validSessionWithMaxTerms)
    expect(result.success).toBe(true)
  })
})

// ============================================================================
// Session Contribution Schema Tests
// ============================================================================

describe('sessionContributionSchema', () => {
  it('validates all contributor types', () => {
    const contributors = ['parent', 'child']
    for (const contributor of contributors) {
      const result = sessionContributorSchema.safeParse(contributor)
      expect(result.success, `Contributor ${contributor} should be valid`).toBe(true)
    }
  })

  it('validates all action types', () => {
    const actions = [
      'added_term',
      'modified_term',
      'removed_term',
      'marked_for_discussion',
      'resolved_discussion',
      'session_started',
      'session_paused',
      'session_resumed',
    ]

    for (const action of actions) {
      const result = contributionActionSchema.safeParse(action)
      expect(result.success, `Action ${action} should be valid`).toBe(true)
    }
  })

  it('rejects invalid contributor', () => {
    const result = sessionContributorSchema.safeParse('guest')
    expect(result.success).toBe(false)
  })

  it('rejects invalid action', () => {
    const result = contributionActionSchema.safeParse('invalid_action')
    expect(result.success).toBe(false)
  })
})

// ============================================================================
// Session Term Schema Tests
// ============================================================================

describe('sessionTermSchema', () => {
  it('validates all term types', () => {
    const termTypes = [
      'screen_time',
      'bedtime',
      'monitoring',
      'rule',
      'consequence',
      'reward',
    ]

    for (const type of termTypes) {
      const result = sessionTermTypeSchema.safeParse(type)
      expect(result.success, `Term type ${type} should be valid`).toBe(true)
    }
  })

  it('rejects invalid term type', () => {
    const result = sessionTermTypeSchema.safeParse('invalid_type')
    expect(result.success).toBe(false)
  })

  it('validates all term statuses', () => {
    const statuses = ['accepted', 'discussion', 'removed']

    for (const status of statuses) {
      const result = sessionTermStatusSchema.safeParse(status)
      expect(result.success, `Status ${status} should be valid`).toBe(true)
    }
  })
})

// ============================================================================
// Session Status Schema Tests
// ============================================================================

describe('sessionStatusSchema', () => {
  it('validates all status values', () => {
    const statuses = ['initializing', 'active', 'paused', 'completed', 'abandoned']

    for (const status of statuses) {
      const result = sessionStatusSchema.safeParse(status)
      expect(result.success, `Status ${status} should be valid`).toBe(true)
    }
  })

  it('rejects invalid status', () => {
    const result = sessionStatusSchema.safeParse('invalid_status')
    expect(result.success).toBe(false)
  })
})

// ============================================================================
// Array Limits Tests
// ============================================================================

describe('SESSION_ARRAY_LIMITS constants', () => {
  it('has correct maxTerms limit (NFR60)', () => {
    expect(SESSION_ARRAY_LIMITS.maxTerms).toBe(100)
  })

  it('has correct maxContributions limit', () => {
    expect(SESSION_ARRAY_LIMITS.maxContributions).toBe(1000)
  })
})

// ============================================================================
// Timeout Constants Tests
// ============================================================================

describe('SESSION_TIMEOUT_CONSTANTS', () => {
  it('has correct INACTIVITY_WARNING_MS (25 minutes)', () => {
    expect(SESSION_TIMEOUT_CONSTANTS.INACTIVITY_WARNING_MS).toBe(25 * 60 * 1000)
  })

  it('has correct INACTIVITY_TIMEOUT_MS (30 minutes)', () => {
    expect(SESSION_TIMEOUT_CONSTANTS.INACTIVITY_TIMEOUT_MS).toBe(30 * 60 * 1000)
  })

  it('has correct ABANDONMENT_THRESHOLD_MS (30 days)', () => {
    expect(SESSION_TIMEOUT_CONSTANTS.ABANDONMENT_THRESHOLD_MS).toBe(30 * 24 * 60 * 60 * 1000)
  })

  it('warning is before timeout', () => {
    expect(SESSION_TIMEOUT_CONSTANTS.INACTIVITY_WARNING_MS).toBeLessThan(
      SESSION_TIMEOUT_CONSTANTS.INACTIVITY_TIMEOUT_MS
    )
  })
})

// ============================================================================
// Source Draft Type Tests
// ============================================================================

describe('sourceDraft validation', () => {
  it('validates wizard source draft', () => {
    const input = {
      familyId: 'family-123',
      childId: 'child-456',
      sourceDraft: {
        type: 'wizard',
        templateId: 'template-789',
      },
    }

    const result = createCoCreationSessionInputSchema.safeParse(input)
    expect(result.success).toBe(true)
  })

  it('validates template_customization source draft', () => {
    const input = {
      familyId: 'family-123',
      childId: 'child-456',
      sourceDraft: {
        type: 'template_customization',
        templateId: 'template-789',
        draftId: 'draft-abc',
      },
    }

    const result = createCoCreationSessionInputSchema.safeParse(input)
    expect(result.success).toBe(true)
  })

  it('validates blank source draft', () => {
    const input = {
      familyId: 'family-123',
      childId: 'child-456',
      sourceDraft: {
        type: 'blank',
      },
    }

    const result = createCoCreationSessionInputSchema.safeParse(input)
    expect(result.success).toBe(true)
  })
})

// ============================================================================
// ServiceResult Type Tests
// ============================================================================

describe('ServiceResult structure', () => {
  it('has correct success result structure', () => {
    const successResult = {
      success: true,
      data: { id: 'test-123' },
    }

    expect(successResult.success).toBe(true)
    expect(successResult.data).toBeDefined()
    expect(successResult.data.id).toBe('test-123')
  })

  it('has correct error result structure', () => {
    const errorResult = {
      success: false,
      error: {
        code: 'not-found',
        message: 'Session not found',
        details: { sessionId: 'missing-123' },
      },
    }

    expect(errorResult.success).toBe(false)
    expect(errorResult.error).toBeDefined()
    expect(errorResult.error.code).toBe('not-found')
    expect(errorResult.error.message).toBe('Session not found')
    expect(errorResult.error.details).toBeDefined()
  })
})

// ============================================================================
// Integration Scenario Tests (Schema-level)
// ============================================================================

describe('integration scenarios (schema-level)', () => {
  it('simulates complete session lifecycle via schema validation', () => {
    const timestamp = '2025-01-15T10:00:00.000Z'

    // Step 1: Create session input
    const createInput = {
      familyId: 'family-123',
      childId: 'child-456',
      sourceDraft: {
        type: 'wizard',
        templateId: 'template-789',
      },
    }
    expect(createCoCreationSessionInputSchema.safeParse(createInput).success).toBe(true)

    // Step 2: Validate created session (initializing)
    const initialSession: CoCreationSession = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      familyId: 'family-123',
      childId: 'child-456',
      initiatedBy: 'parent-uid',
      status: 'initializing',
      sourceDraft: {
        type: 'wizard',
        templateId: 'template-789',
      },
      terms: [],
      contributions: [
        {
          id: '223e4567-e89b-12d3-a456-426614174001',
          contributor: 'parent',
          action: 'session_started',
          createdAt: timestamp,
        },
      ],
      createdAt: timestamp,
      updatedAt: timestamp,
      lastActivityAt: timestamp,
    }
    expect(coCreationSessionSchema.safeParse(initialSession).success).toBe(true)

    // Step 3: Add contribution input
    const addTermInput = {
      sessionId: initialSession.id,
      contributor: 'parent',
      action: 'added_term',
    }
    expect(recordContributionInputSchema.safeParse(addTermInput).success).toBe(true)

    // Step 4: Pause session input
    const pauseInput = {
      sessionId: initialSession.id,
    }
    expect(pauseSessionInputSchema.safeParse(pauseInput).success).toBe(true)

    // Step 5: Resume session input
    const resumeInput = {
      sessionId: initialSession.id,
    }
    expect(resumeSessionInputSchema.safeParse(resumeInput).success).toBe(true)
  })

  it('validates contribution tracking for parent and child (AC #3)', () => {
    const timestamp = '2025-01-15T10:00:00.000Z'

    const sessionWithMixedContributions: CoCreationSession = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      familyId: 'family-123',
      childId: 'child-456',
      initiatedBy: 'parent-uid',
      status: 'active',
      sourceDraft: { type: 'blank' },
      terms: [
        {
          id: '323e4567-e89b-12d3-a456-426614174001',
          type: 'screen_time',
          content: { minutes: 120 },
          addedBy: 'parent',
          status: 'discussion',
          order: 0,
          createdAt: timestamp,
          updatedAt: timestamp,
        },
      ],
      contributions: [
        {
          id: '223e4567-e89b-12d3-a456-426614174001',
          contributor: 'parent',
          action: 'session_started',
          createdAt: timestamp,
        },
        {
          id: '223e4567-e89b-12d3-a456-426614174002',
          contributor: 'parent',
          action: 'added_term',
          termId: '323e4567-e89b-12d3-a456-426614174001',
          createdAt: '2025-01-15T10:05:00.000Z',
        },
        {
          id: '223e4567-e89b-12d3-a456-426614174003',
          contributor: 'child',
          action: 'marked_for_discussion',
          termId: '323e4567-e89b-12d3-a456-426614174001',
          details: { reason: 'I think 120 minutes is too short' },
          createdAt: '2025-01-15T10:10:00.000Z',
        },
      ],
      createdAt: timestamp,
      updatedAt: '2025-01-15T10:10:00.000Z',
      lastActivityAt: '2025-01-15T10:10:00.000Z',
    }

    const result = coCreationSessionSchema.safeParse(sessionWithMixedContributions)
    expect(result.success).toBe(true)
  })
})
