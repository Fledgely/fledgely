/**
 * useCoCreationSession Hook Tests.
 *
 * Story 5.1: Co-Creation Session Initiation - AC2, AC3, AC4
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useCoCreationSession } from '../useCoCreationSession'

describe('useCoCreationSession', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('AC2: Session Document Creation', () => {
    it('creates a session with correct initial state', async () => {
      const { result } = renderHook(() => useCoCreationSession())

      await act(async () => {
        await result.current.createSession({
          familyId: 'family-1',
          childId: 'child-1',
          createdByUid: 'parent-1',
        })
      })

      expect(result.current.session).not.toBeNull()
      expect(result.current.session?.status).toBe('active')
      expect(result.current.session?.familyId).toBe('family-1')
      expect(result.current.session?.childId).toBe('child-1')
      expect(result.current.session?.createdByUid).toBe('parent-1')
    })

    it('creates session with agreementDraftId when provided', async () => {
      const { result } = renderHook(() => useCoCreationSession())

      await act(async () => {
        await result.current.createSession({
          familyId: 'family-1',
          childId: 'child-1',
          createdByUid: 'parent-1',
          agreementDraftId: 'draft-1',
        })
      })

      expect(result.current.session?.agreementDraftId).toBe('draft-1')
    })

    it('creates session with templateId when provided', async () => {
      const { result } = renderHook(() => useCoCreationSession())

      await act(async () => {
        await result.current.createSession({
          familyId: 'family-1',
          childId: 'child-1',
          createdByUid: 'parent-1',
          templateId: 'template-1',
        })
      })

      expect(result.current.session?.templateId).toBe('template-1')
    })

    it('sets isActive to true after session creation', async () => {
      const { result } = renderHook(() => useCoCreationSession())

      expect(result.current.isActive).toBe(false)

      await act(async () => {
        await result.current.createSession({
          familyId: 'family-1',
          childId: 'child-1',
          createdByUid: 'parent-1',
        })
      })

      expect(result.current.isActive).toBe(true)
    })

    it('calls onSessionCreated callback when provided', async () => {
      const onSessionCreated = vi.fn()
      const { result } = renderHook(() => useCoCreationSession({ onSessionCreated }))

      await act(async () => {
        await result.current.createSession({
          familyId: 'family-1',
          childId: 'child-1',
          createdByUid: 'parent-1',
        })
      })

      expect(onSessionCreated).toHaveBeenCalledTimes(1)
      expect(onSessionCreated).toHaveBeenCalledWith(
        expect.objectContaining({
          familyId: 'family-1',
          status: 'active',
        })
      )
    })
  })

  describe('AC3: Contribution Attribution', () => {
    it('adds contribution with party and timestamp', async () => {
      const { result } = renderHook(() => useCoCreationSession())

      await act(async () => {
        await result.current.createSession({
          familyId: 'family-1',
          childId: 'child-1',
          createdByUid: 'parent-1',
        })
      })

      await act(async () => {
        await result.current.addContribution({
          party: 'parent',
          type: 'add_term',
          content: { term: 'Screen time limit' },
        })
      })

      expect(result.current.session?.contributions).toHaveLength(1)
      expect(result.current.session?.contributions[0].party).toBe('parent')
      expect(result.current.session?.contributions[0].type).toBe('add_term')
      expect(result.current.session?.contributions[0].timestamp).toBeInstanceOf(Date)
    })

    it('tracks child contributions separately', async () => {
      const { result } = renderHook(() => useCoCreationSession())

      await act(async () => {
        await result.current.createSession({
          familyId: 'family-1',
          childId: 'child-1',
          createdByUid: 'parent-1',
        })
      })

      await act(async () => {
        await result.current.addContribution({
          party: 'parent',
          type: 'add_term',
          content: { term: 'Bedtime cutoff' },
        })
      })

      await act(async () => {
        await result.current.addContribution({
          party: 'child',
          type: 'comment',
          content: { message: 'Can we discuss this?' },
        })
      })

      expect(result.current.session?.contributions).toHaveLength(2)
      expect(result.current.session?.contributions[0].party).toBe('parent')
      expect(result.current.session?.contributions[1].party).toBe('child')
    })

    it('calls onContributionAdded callback when provided', async () => {
      const onContributionAdded = vi.fn()
      const { result } = renderHook(() => useCoCreationSession({ onContributionAdded }))

      await act(async () => {
        await result.current.createSession({
          familyId: 'family-1',
          childId: 'child-1',
          createdByUid: 'parent-1',
        })
      })

      await act(async () => {
        await result.current.addContribution({
          party: 'child',
          type: 'reaction',
          content: { emoji: '👍' },
        })
      })

      expect(onContributionAdded).toHaveBeenCalledTimes(1)
      expect(onContributionAdded).toHaveBeenCalledWith(
        expect.objectContaining({
          party: 'child',
          type: 'reaction',
        })
      )
    })

    it('updates lastActivityAt when contribution is added', async () => {
      const { result } = renderHook(() => useCoCreationSession())

      await act(async () => {
        await result.current.createSession({
          familyId: 'family-1',
          childId: 'child-1',
          createdByUid: 'parent-1',
        })
      })

      const initialActivity = result.current.session?.lastActivityAt

      // Wait a small amount to ensure timestamp difference
      await new Promise((resolve) => setTimeout(resolve, 10))

      await act(async () => {
        await result.current.addContribution({
          party: 'parent',
          type: 'add_term',
          content: {},
        })
      })

      expect(result.current.session?.lastActivityAt.getTime()).toBeGreaterThanOrEqual(
        initialActivity!.getTime()
      )
    })
  })

  describe('AC4: Session Pause and Resume', () => {
    it('pauses an active session', async () => {
      const { result } = renderHook(() => useCoCreationSession())

      await act(async () => {
        await result.current.createSession({
          familyId: 'family-1',
          childId: 'child-1',
          createdByUid: 'parent-1',
        })
      })

      expect(result.current.isActive).toBe(true)

      await act(async () => {
        await result.current.pauseSession()
      })

      expect(result.current.isPaused).toBe(true)
      expect(result.current.isActive).toBe(false)
      expect(result.current.session?.status).toBe('paused')
      expect(result.current.session?.pausedAt).toBeInstanceOf(Date)
    })

    it('resumes a paused session', async () => {
      const { result } = renderHook(() => useCoCreationSession())

      await act(async () => {
        await result.current.createSession({
          familyId: 'family-1',
          childId: 'child-1',
          createdByUid: 'parent-1',
        })
      })

      await act(async () => {
        await result.current.pauseSession()
      })

      expect(result.current.isPaused).toBe(true)

      await act(async () => {
        await result.current.resumeSession()
      })

      expect(result.current.isActive).toBe(true)
      expect(result.current.isPaused).toBe(false)
      expect(result.current.session?.status).toBe('active')
      expect(result.current.session?.pausedAt).toBeNull()
    })

    it('calls onSessionPaused callback when provided', async () => {
      const onSessionPaused = vi.fn()
      const { result } = renderHook(() => useCoCreationSession({ onSessionPaused }))

      await act(async () => {
        await result.current.createSession({
          familyId: 'family-1',
          childId: 'child-1',
          createdByUid: 'parent-1',
        })
      })

      await act(async () => {
        await result.current.pauseSession()
      })

      expect(onSessionPaused).toHaveBeenCalledTimes(1)
    })

    it('calls onSessionResumed callback when provided', async () => {
      const onSessionResumed = vi.fn()
      const { result } = renderHook(() => useCoCreationSession({ onSessionResumed }))

      await act(async () => {
        await result.current.createSession({
          familyId: 'family-1',
          childId: 'child-1',
          createdByUid: 'parent-1',
        })
      })

      await act(async () => {
        await result.current.pauseSession()
      })

      await act(async () => {
        await result.current.resumeSession()
      })

      expect(onSessionResumed).toHaveBeenCalledTimes(1)
    })

    it('returns error when pausing non-active session', async () => {
      const { result } = renderHook(() => useCoCreationSession())

      await act(async () => {
        const success = await result.current.pauseSession()
        expect(success).toBe(false)
      })

      expect(result.current.error).toBe('No active session to pause')
    })

    it('returns error when resuming non-paused session', async () => {
      const { result } = renderHook(() => useCoCreationSession())

      await act(async () => {
        const success = await result.current.resumeSession()
        expect(success).toBe(false)
      })

      expect(result.current.error).toBe('No paused session to resume')
    })
  })

  describe('Session Completion', () => {
    it('completes an active session', async () => {
      const { result } = renderHook(() => useCoCreationSession())

      await act(async () => {
        await result.current.createSession({
          familyId: 'family-1',
          childId: 'child-1',
          createdByUid: 'parent-1',
        })
      })

      await act(async () => {
        await result.current.completeSession()
      })

      expect(result.current.isCompleted).toBe(true)
      expect(result.current.session?.status).toBe('completed')
      expect(result.current.session?.completedAt).toBeInstanceOf(Date)
    })
  })

  describe('Session Management', () => {
    it('loads an existing session', () => {
      const existingSession = {
        id: 'existing-1',
        familyId: 'family-1',
        childId: 'child-1',
        agreementDraftId: null,
        templateId: null,
        status: 'paused' as const,
        contributions: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        pausedAt: new Date(),
        completedAt: null,
        lastActivityAt: new Date(),
        createdByUid: 'parent-1',
      }

      const { result } = renderHook(() => useCoCreationSession())

      act(() => {
        result.current.loadSession(existingSession)
      })

      expect(result.current.session?.id).toBe('existing-1')
      expect(result.current.isPaused).toBe(true)
    })

    it('clears the current session', async () => {
      const { result } = renderHook(() => useCoCreationSession())

      await act(async () => {
        await result.current.createSession({
          familyId: 'family-1',
          childId: 'child-1',
          createdByUid: 'parent-1',
        })
      })

      expect(result.current.session).not.toBeNull()

      act(() => {
        result.current.clearSession()
      })

      expect(result.current.session).toBeNull()
    })
  })
})
