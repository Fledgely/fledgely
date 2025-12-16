/**
 * Unit tests for Co-Creation Session Service
 *
 * Story 5.1: Co-Creation Session Initiation - Task 5
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  createCoCreationSession,
  getCoCreationSession,
  pauseCoCreationSession,
  resumeCoCreationSession,
  recordSessionContribution,
  completeCoCreationSession,
  updateSessionActivity,
} from './coCreationSessionService'
import type { CoCreationSession, CreateCoCreationSessionInput } from '@fledgely/contracts'

// Mock firebase functions
vi.mock('firebase/functions', () => ({
  httpsCallable: vi.fn(),
}))

vi.mock('@/lib/firebase', () => ({
  functions: {},
}))

import { httpsCallable } from 'firebase/functions'

const mockHttpsCallable = vi.mocked(httpsCallable)

describe('coCreationSessionService', () => {
  const mockSession: CoCreationSession = {
    id: 'session-123',
    familyId: 'family-456',
    childId: 'child-789',
    initiatedBy: 'user-123',
    status: 'active',
    sourceDraft: { type: 'wizard' },
    terms: [],
    contributions: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    lastActivityAt: new Date().toISOString(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('createCoCreationSession', () => {
    const createInput: CreateCoCreationSessionInput = {
      familyId: 'family-456',
      childId: 'child-789',
      sourceDraft: { type: 'wizard' },
    }

    it('calls createCoCreationSession callable with correct input', async () => {
      const mockCallable = vi.fn().mockResolvedValue({
        data: { success: true, session: mockSession },
      })
      mockHttpsCallable.mockReturnValue(mockCallable)

      await createCoCreationSession(createInput)

      expect(mockHttpsCallable).toHaveBeenCalledWith(expect.anything(), 'createCoCreationSession')
      expect(mockCallable).toHaveBeenCalledWith(createInput)
    })

    it('returns success with session on successful creation', async () => {
      const mockCallable = vi.fn().mockResolvedValue({
        data: { success: true, session: mockSession },
      })
      mockHttpsCallable.mockReturnValue(mockCallable)

      const result = await createCoCreationSession(createInput)

      expect(result.success).toBe(true)
      expect(result.session).toEqual(mockSession)
    })

    it('returns error on failure', async () => {
      const mockCallable = vi.fn().mockRejectedValue(new Error('Network error'))
      mockHttpsCallable.mockReturnValue(mockCallable)

      const result = await createCoCreationSession(createInput)

      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })
  })

  describe('getCoCreationSession', () => {
    it('calls getCoCreationSession callable with session ID', async () => {
      const mockCallable = vi.fn().mockResolvedValue({
        data: { session: mockSession },
      })
      mockHttpsCallable.mockReturnValue(mockCallable)

      await getCoCreationSession('session-123')

      expect(mockHttpsCallable).toHaveBeenCalledWith(expect.anything(), 'getCoCreationSession')
      expect(mockCallable).toHaveBeenCalledWith({ sessionId: 'session-123' })
    })

    it('returns session on success', async () => {
      const mockCallable = vi.fn().mockResolvedValue({
        data: { session: mockSession },
      })
      mockHttpsCallable.mockReturnValue(mockCallable)

      const result = await getCoCreationSession('session-123')

      expect(result).toEqual(mockSession)
    })

    it('returns null when session not found', async () => {
      const mockCallable = vi.fn().mockResolvedValue({
        data: { session: null },
      })
      mockHttpsCallable.mockReturnValue(mockCallable)

      const result = await getCoCreationSession('nonexistent')

      expect(result).toBeNull()
    })
  })

  describe('pauseCoCreationSession', () => {
    const pausedSession: CoCreationSession = {
      ...mockSession,
      status: 'paused',
      pausedAt: new Date().toISOString(),
    }

    it('calls pauseCoCreationSession callable with session ID', async () => {
      const mockCallable = vi.fn().mockResolvedValue({
        data: { success: true, session: pausedSession },
      })
      mockHttpsCallable.mockReturnValue(mockCallable)

      await pauseCoCreationSession('session-123')

      expect(mockHttpsCallable).toHaveBeenCalledWith(expect.anything(), 'pauseCoCreationSession')
      expect(mockCallable).toHaveBeenCalledWith({ sessionId: 'session-123' })
    })

    it('returns success with paused session', async () => {
      const mockCallable = vi.fn().mockResolvedValue({
        data: { success: true, session: pausedSession },
      })
      mockHttpsCallable.mockReturnValue(mockCallable)

      const result = await pauseCoCreationSession('session-123')

      expect(result.success).toBe(true)
      expect(result.session?.status).toBe('paused')
    })

    it('returns error on failure', async () => {
      const mockCallable = vi.fn().mockRejectedValue(new Error('Failed to pause'))
      mockHttpsCallable.mockReturnValue(mockCallable)

      const result = await pauseCoCreationSession('session-123')

      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })
  })

  describe('resumeCoCreationSession', () => {
    it('calls resumeCoCreationSession callable with session ID', async () => {
      const mockCallable = vi.fn().mockResolvedValue({
        data: { success: true, session: mockSession },
      })
      mockHttpsCallable.mockReturnValue(mockCallable)

      await resumeCoCreationSession('session-123')

      expect(mockHttpsCallable).toHaveBeenCalledWith(expect.anything(), 'resumeCoCreationSession')
      expect(mockCallable).toHaveBeenCalledWith({ sessionId: 'session-123' })
    })

    it('returns success with active session', async () => {
      const mockCallable = vi.fn().mockResolvedValue({
        data: { success: true, session: mockSession },
      })
      mockHttpsCallable.mockReturnValue(mockCallable)

      const result = await resumeCoCreationSession('session-123')

      expect(result.success).toBe(true)
      expect(result.session?.status).toBe('active')
    })

    it('returns error on failure', async () => {
      const mockCallable = vi.fn().mockRejectedValue(new Error('Failed to resume'))
      mockHttpsCallable.mockReturnValue(mockCallable)

      const result = await resumeCoCreationSession('session-123')

      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })
  })

  describe('recordSessionContribution', () => {
    const contributionInput = {
      sessionId: 'session-123',
      contributor: 'parent' as const,
      action: 'added_term' as const,
      termId: 'term-456',
    }

    const sessionWithContribution: CoCreationSession = {
      ...mockSession,
      contributions: [
        {
          id: 'contrib-123',
          contributor: 'parent',
          action: 'added_term',
          termId: 'term-456',
          createdAt: new Date().toISOString(),
        },
      ],
    }

    it('calls recordSessionContribution callable with correct input', async () => {
      const mockCallable = vi.fn().mockResolvedValue({
        data: { success: true, session: sessionWithContribution },
      })
      mockHttpsCallable.mockReturnValue(mockCallable)

      await recordSessionContribution(contributionInput)

      expect(mockHttpsCallable).toHaveBeenCalledWith(expect.anything(), 'recordSessionContribution')
      expect(mockCallable).toHaveBeenCalledWith(contributionInput)
    })

    it('returns success with updated session', async () => {
      const mockCallable = vi.fn().mockResolvedValue({
        data: { success: true, session: sessionWithContribution },
      })
      mockHttpsCallable.mockReturnValue(mockCallable)

      const result = await recordSessionContribution(contributionInput)

      expect(result.success).toBe(true)
      expect(result.session?.contributions).toHaveLength(1)
    })

    it('returns error on failure', async () => {
      const mockCallable = vi.fn().mockRejectedValue(new Error('Failed to record'))
      mockHttpsCallable.mockReturnValue(mockCallable)

      const result = await recordSessionContribution(contributionInput)

      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })
  })

  describe('completeCoCreationSession', () => {
    const completedSession: CoCreationSession = {
      ...mockSession,
      status: 'completed',
      completedAt: new Date().toISOString(),
    }

    it('calls completeCoCreationSession callable with session ID', async () => {
      const mockCallable = vi.fn().mockResolvedValue({
        data: { success: true, session: completedSession },
      })
      mockHttpsCallable.mockReturnValue(mockCallable)

      await completeCoCreationSession('session-123')

      expect(mockHttpsCallable).toHaveBeenCalledWith(expect.anything(), 'completeCoCreationSession')
      expect(mockCallable).toHaveBeenCalledWith({ sessionId: 'session-123' })
    })

    it('returns success with completed session', async () => {
      const mockCallable = vi.fn().mockResolvedValue({
        data: { success: true, session: completedSession },
      })
      mockHttpsCallable.mockReturnValue(mockCallable)

      const result = await completeCoCreationSession('session-123')

      expect(result.success).toBe(true)
      expect(result.session?.status).toBe('completed')
    })

    it('returns error on failure', async () => {
      const mockCallable = vi.fn().mockRejectedValue(new Error('Failed to complete'))
      mockHttpsCallable.mockReturnValue(mockCallable)

      const result = await completeCoCreationSession('session-123')

      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })
  })

  describe('updateSessionActivity', () => {
    it('calls recordSessionContribution for activity update', async () => {
      const mockCallable = vi.fn().mockResolvedValue({
        data: { success: true },
      })
      mockHttpsCallable.mockReturnValue(mockCallable)

      await updateSessionActivity('session-123')

      expect(mockHttpsCallable).toHaveBeenCalledWith(expect.anything(), 'recordSessionContribution')
      expect(mockCallable).toHaveBeenCalledWith(
        expect.objectContaining({
          sessionId: 'session-123',
          details: { activityUpdate: true },
        })
      )
    })

    it('returns success on successful update', async () => {
      const mockCallable = vi.fn().mockResolvedValue({
        data: { success: true },
      })
      mockHttpsCallable.mockReturnValue(mockCallable)

      const result = await updateSessionActivity('session-123')

      expect(result.success).toBe(true)
    })

    it('returns error on failure without throwing', async () => {
      const mockCallable = vi.fn().mockRejectedValue(new Error('Failed'))
      mockHttpsCallable.mockReturnValue(mockCallable)

      // Should not throw
      const result = await updateSessionActivity('session-123')

      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })
  })
})
