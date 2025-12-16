/**
 * Unit tests for useCoCreationSession Hook
 *
 * Story 5.1: Co-Creation Session Initiation - Task 5.6
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { useCoCreationSession } from './useCoCreationSession'
import type { CoCreationSession } from '@fledgely/contracts'

// Mock dependencies
vi.mock('@/components/providers/AuthProvider', () => ({
  useAuthContext: vi.fn(),
}))

vi.mock('@/services/coCreationSessionService', () => ({
  createCoCreationSession: vi.fn(),
  getCoCreationSession: vi.fn(),
  pauseCoCreationSession: vi.fn(),
  resumeCoCreationSession: vi.fn(),
  recordSessionContribution: vi.fn(),
  completeCoCreationSession: vi.fn(),
  updateSessionActivity: vi.fn(),
}))

// Mock the contracts module functions used by the hook
vi.mock('@fledgely/contracts', async () => {
  const actual = await vi.importActual('@fledgely/contracts')
  return {
    ...actual,
    shouldShowTimeoutWarning: vi.fn(),
    getTimeUntilTimeout: vi.fn(),
    formatTimeRemaining: vi.fn(),
    isSessionActive: vi.fn(),
    SESSION_TIMEOUT_CONSTANTS: {
      INACTIVITY_TIMEOUT_MS: 30 * 60 * 1000,
      INACTIVITY_WARNING_MS: 25 * 60 * 1000,
    },
  }
})

import {
  shouldShowTimeoutWarning,
  getTimeUntilTimeout,
  formatTimeRemaining,
  isSessionActive,
} from '@fledgely/contracts'

const mockShouldShowTimeoutWarning = vi.mocked(shouldShowTimeoutWarning)
const mockGetTimeUntilTimeout = vi.mocked(getTimeUntilTimeout)
const mockFormatTimeRemaining = vi.mocked(formatTimeRemaining)
const mockIsSessionActive = vi.mocked(isSessionActive)

// Import mocked functions after mocking
import { useAuthContext } from '@/components/providers/AuthProvider'
import {
  createCoCreationSession,
  getCoCreationSession,
  pauseCoCreationSession,
  resumeCoCreationSession,
  recordSessionContribution,
  completeCoCreationSession,
  updateSessionActivity,
} from '@/services/coCreationSessionService'

const mockUseAuthContext = vi.mocked(useAuthContext)
const mockCreateSession = vi.mocked(createCoCreationSession)
const mockGetSession = vi.mocked(getCoCreationSession)
const mockPauseSession = vi.mocked(pauseCoCreationSession)
const mockResumeSession = vi.mocked(resumeCoCreationSession)
const mockRecordContribution = vi.mocked(recordSessionContribution)
const mockCompleteSession = vi.mocked(completeCoCreationSession)
const mockUpdateActivity = vi.mocked(updateSessionActivity)

describe('useCoCreationSession', () => {
  const mockAuthUser = {
    uid: 'test-user-123',
    email: 'test@example.com',
  }

  const mockSession: CoCreationSession = {
    id: 'session-123',
    familyId: 'family-456',
    childId: 'child-789',
    initiatedBy: 'test-user-123',
    status: 'active',
    sourceDraft: {
      type: 'wizard',
      templateId: 'template-001',
    },
    terms: [],
    contributions: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    lastActivityAt: new Date().toISOString(),
  }

  const mockPausedSession: CoCreationSession = {
    ...mockSession,
    status: 'paused',
    pausedAt: new Date().toISOString(),
  }

  const mockCompletedSession: CoCreationSession = {
    ...mockSession,
    status: 'completed',
    completedAt: new Date().toISOString(),
  }

  beforeEach(() => {
    vi.clearAllMocks()

    // Default auth mock
    mockUseAuthContext.mockReturnValue({
      user: mockAuthUser as ReturnType<typeof useAuthContext>['user'],
      loading: false,
      error: null,
      signInWithGoogle: vi.fn(),
      signOut: vi.fn(),
    })

    // Default service mocks
    mockGetSession.mockResolvedValue(mockSession)
    mockUpdateActivity.mockResolvedValue({ success: true })

    // Default contract utility mocks
    mockIsSessionActive.mockImplementation((session) => {
      return session.status === 'active' || session.status === 'paused'
    })
    mockShouldShowTimeoutWarning.mockReturnValue(false)
    mockGetTimeUntilTimeout.mockReturnValue(5 * 60 * 1000) // 5 minutes
    mockFormatTimeRemaining.mockReturnValue('5:00')
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('initial state', () => {
    it('returns loading true when sessionId is provided', async () => {
      // Make getSession hang to test initial loading state
      mockGetSession.mockImplementation(() => new Promise(() => {}))

      const { result, unmount } = renderHook(() => useCoCreationSession('session-123'))

      expect(result.current.loading).toBe(true)
      expect(result.current.session).toBeNull()

      unmount()
    })

    it('returns loading false when sessionId is null', async () => {
      const { result } = renderHook(() => useCoCreationSession(null))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.session).toBeNull()
    })

    it('returns isActive false when no session', async () => {
      const { result } = renderHook(() => useCoCreationSession(null))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.isActive).toBe(false)
    })
  })

  describe('fetching session', () => {
    it('fetches session when sessionId is provided', async () => {
      const { result } = renderHook(() => useCoCreationSession('session-123'))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(mockGetSession).toHaveBeenCalledWith('session-123')
      expect(result.current.session).toEqual(mockSession)
    })

    it('sets error when fetch fails', async () => {
      mockGetSession.mockRejectedValue(new Error('Network error'))

      const { result } = renderHook(() => useCoCreationSession('session-123'))

      await waitFor(() => {
        expect(result.current.error).not.toBeNull()
      })

      expect(result.current.error?.message).toBe('Network error')
      expect(result.current.session).toBeNull()
    })

    it('returns isActive true for active session', async () => {
      const { result } = renderHook(() => useCoCreationSession('session-123'))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.isActive).toBe(true)
    })

    it('returns isActive true for paused session', async () => {
      mockGetSession.mockResolvedValue(mockPausedSession)

      const { result } = renderHook(() => useCoCreationSession('session-123'))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.isActive).toBe(true)
    })

    it('returns isActive false for completed session', async () => {
      mockGetSession.mockResolvedValue(mockCompletedSession)

      const { result } = renderHook(() => useCoCreationSession('session-123'))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.isActive).toBe(false)
    })
  })

  describe('createSession', () => {
    it('creates session and updates state', async () => {
      const createInput = {
        familyId: 'family-456',
        childId: 'child-789',
        sourceDraft: { type: 'wizard' as const },
      }

      mockCreateSession.mockResolvedValue({
        success: true,
        session: mockSession,
      })

      const { result } = renderHook(() => useCoCreationSession(null))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      let createResult: Awaited<ReturnType<typeof result.current.createSession>>
      await act(async () => {
        createResult = await result.current.createSession(createInput)
      })

      expect(createResult!.success).toBe(true)
      expect(result.current.session).toEqual(mockSession)
      expect(mockCreateSession).toHaveBeenCalledWith(createInput)
    })

    it('returns error when not authenticated', async () => {
      mockUseAuthContext.mockReturnValue({
        user: null,
        loading: false,
        error: null,
        signInWithGoogle: vi.fn(),
        signOut: vi.fn(),
      })

      const { result } = renderHook(() => useCoCreationSession(null))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      let createResult: Awaited<ReturnType<typeof result.current.createSession>>
      await act(async () => {
        createResult = await result.current.createSession({
          familyId: 'family-456',
          childId: 'child-789',
          sourceDraft: { type: 'wizard' },
        })
      })

      expect(createResult!.success).toBe(false)
      expect(createResult!.error).toContain('signed in')
    })

    it('returns error when creation fails', async () => {
      mockCreateSession.mockResolvedValue({
        success: false,
        error: 'Creation failed',
      })

      const { result } = renderHook(() => useCoCreationSession(null))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      let createResult: Awaited<ReturnType<typeof result.current.createSession>>
      await act(async () => {
        createResult = await result.current.createSession({
          familyId: 'family-456',
          childId: 'child-789',
          sourceDraft: { type: 'wizard' },
        })
      })

      expect(createResult!.success).toBe(false)
    })
  })

  describe('pauseSession', () => {
    it('pauses session and updates state', async () => {
      mockPauseSession.mockResolvedValue({
        success: true,
        session: mockPausedSession,
      })

      const { result } = renderHook(() => useCoCreationSession('session-123'))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      let pauseResult: Awaited<ReturnType<typeof result.current.pauseSession>>
      await act(async () => {
        pauseResult = await result.current.pauseSession()
      })

      expect(pauseResult!.success).toBe(true)
      expect(result.current.session?.status).toBe('paused')
      expect(mockPauseSession).toHaveBeenCalledWith('session-123')
    })

    it('returns error when no session', async () => {
      const { result } = renderHook(() => useCoCreationSession(null))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      let pauseResult: Awaited<ReturnType<typeof result.current.pauseSession>>
      await act(async () => {
        pauseResult = await result.current.pauseSession()
      })

      expect(pauseResult!.success).toBe(false)
      expect(pauseResult!.error).toContain('No session')
    })
  })

  describe('resumeSession', () => {
    it('resumes session and updates state', async () => {
      mockGetSession.mockResolvedValue(mockPausedSession)
      mockResumeSession.mockResolvedValue({
        success: true,
        session: mockSession,
      })

      const { result } = renderHook(() => useCoCreationSession('session-123'))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      let resumeResult: Awaited<ReturnType<typeof result.current.resumeSession>>
      await act(async () => {
        resumeResult = await result.current.resumeSession()
      })

      expect(resumeResult!.success).toBe(true)
      expect(result.current.session?.status).toBe('active')
      expect(mockResumeSession).toHaveBeenCalledWith('session-123')
    })

    it('returns error when no session', async () => {
      const { result } = renderHook(() => useCoCreationSession(null))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      let resumeResult: Awaited<ReturnType<typeof result.current.resumeSession>>
      await act(async () => {
        resumeResult = await result.current.resumeSession()
      })

      expect(resumeResult!.success).toBe(false)
      expect(resumeResult!.error).toContain('No session')
    })
  })

  describe('recordContribution', () => {
    it('records contribution and updates state', async () => {
      const sessionWithContribution: CoCreationSession = {
        ...mockSession,
        contributions: [
          {
            id: 'contrib-123',
            contributor: 'parent',
            action: 'added_term',
            createdAt: new Date().toISOString(),
          },
        ],
      }

      mockRecordContribution.mockResolvedValue({
        success: true,
        session: sessionWithContribution,
      })

      const { result } = renderHook(() => useCoCreationSession('session-123'))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      let contribResult: Awaited<ReturnType<typeof result.current.recordContribution>>
      await act(async () => {
        contribResult = await result.current.recordContribution({
          contributor: 'parent',
          action: 'added_term',
        })
      })

      expect(contribResult!.success).toBe(true)
      expect(result.current.session?.contributions).toHaveLength(1)
    })

    it('returns error when no session', async () => {
      const { result } = renderHook(() => useCoCreationSession(null))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      let contribResult: Awaited<ReturnType<typeof result.current.recordContribution>>
      await act(async () => {
        contribResult = await result.current.recordContribution({
          contributor: 'parent',
          action: 'added_term',
        })
      })

      expect(contribResult!.success).toBe(false)
      expect(contribResult!.error).toContain('No session')
    })
  })

  describe('completeSession', () => {
    it('completes session and updates state', async () => {
      mockCompleteSession.mockResolvedValue({
        success: true,
        session: mockCompletedSession,
      })

      const { result } = renderHook(() => useCoCreationSession('session-123'))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      let completeResult: Awaited<ReturnType<typeof result.current.completeSession>>
      await act(async () => {
        completeResult = await result.current.completeSession()
      })

      expect(completeResult!.success).toBe(true)
      expect(result.current.session?.status).toBe('completed')
      expect(mockCompleteSession).toHaveBeenCalledWith('session-123')
    })

    it('returns error when no session', async () => {
      const { result } = renderHook(() => useCoCreationSession(null))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      let completeResult: Awaited<ReturnType<typeof result.current.completeSession>>
      await act(async () => {
        completeResult = await result.current.completeSession()
      })

      expect(completeResult!.success).toBe(false)
      expect(completeResult!.error).toContain('No session')
    })
  })

  describe('timeout warning (AC #6)', () => {
    it('shows timeout warning when approaching timeout', async () => {
      // Configure mocks to indicate warning should show
      mockShouldShowTimeoutWarning.mockReturnValue(true)
      mockGetTimeUntilTimeout.mockReturnValue(3 * 60 * 1000) // 3 minutes
      mockFormatTimeRemaining.mockReturnValue('3:00')

      const { result } = renderHook(() => useCoCreationSession('session-123'))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      // The timeout check runs on initial render
      expect(result.current.timeoutWarning.show).toBe(true)
      expect(result.current.timeoutWarning.remainingMs).toBe(3 * 60 * 1000)
    })

    it('does not show timeout warning for fresh activity', async () => {
      // Configure mocks to indicate no warning
      mockShouldShowTimeoutWarning.mockReturnValue(false)
      mockGetTimeUntilTimeout.mockReturnValue(30 * 60 * 1000) // 30 minutes
      mockFormatTimeRemaining.mockReturnValue('30:00')

      const { result } = renderHook(() => useCoCreationSession('session-123'))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.timeoutWarning.show).toBe(false)
    })

    it('does not show timeout warning for paused session', async () => {
      // Paused session is not "active" for timeout purposes
      mockIsSessionActive.mockReturnValue(false)
      mockGetSession.mockResolvedValue(mockPausedSession)

      const { result } = renderHook(() => useCoCreationSession('session-123'))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.timeoutWarning.show).toBe(false)
    })

    it('formats remaining time correctly', async () => {
      mockShouldShowTimeoutWarning.mockReturnValue(true)
      mockGetTimeUntilTimeout.mockReturnValue(2 * 60 * 1000) // 2 minutes
      mockFormatTimeRemaining.mockReturnValue('2:00')

      const { result } = renderHook(() => useCoCreationSession('session-123'))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.timeoutWarning.remainingFormatted).toBe('2:00')
    })
  })

  describe('clearError', () => {
    it('clears error state', async () => {
      mockGetSession.mockRejectedValue(new Error('Test error'))

      const { result } = renderHook(() => useCoCreationSession('session-123'))

      await waitFor(() => {
        expect(result.current.error).not.toBeNull()
      })

      act(() => {
        result.current.clearError()
      })

      expect(result.current.error).toBeNull()
    })
  })

  describe('refreshSession', () => {
    it('refetches session data', async () => {
      const { result } = renderHook(() => useCoCreationSession('session-123'))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(mockGetSession).toHaveBeenCalledTimes(1)

      await act(async () => {
        await result.current.refreshSession()
      })

      expect(mockGetSession).toHaveBeenCalledTimes(2)
    })
  })

  describe('markActivity', () => {
    it('updates activity on server', async () => {
      const { result } = renderHook(() => useCoCreationSession('session-123'))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      await act(async () => {
        result.current.markActivity()
        // Give time for the async update to be called
        await new Promise((resolve) => setTimeout(resolve, 10))
      })

      expect(mockUpdateActivity).toHaveBeenCalledWith('session-123')
    })

    it('debounces activity updates', async () => {
      const { result } = renderHook(() => useCoCreationSession('session-123'))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      // First call should go through
      await act(async () => {
        result.current.markActivity()
        await new Promise((resolve) => setTimeout(resolve, 10))
      })

      expect(mockUpdateActivity).toHaveBeenCalledTimes(1)

      // Second call immediately after should be debounced
      await act(async () => {
        result.current.markActivity()
        await new Promise((resolve) => setTimeout(resolve, 10))
      })

      // Still only 1 call due to debounce
      expect(mockUpdateActivity).toHaveBeenCalledTimes(1)
    })

    it('does nothing when no session', async () => {
      const { result } = renderHook(() => useCoCreationSession(null))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      act(() => {
        result.current.markActivity()
      })

      expect(mockUpdateActivity).not.toHaveBeenCalled()
    })
  })

  describe('session ID changes', () => {
    it('fetches new session when ID changes', async () => {
      const { result, rerender } = renderHook(
        ({ sessionId }) => useCoCreationSession(sessionId),
        { initialProps: { sessionId: 'session-123' } }
      )

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(mockGetSession).toHaveBeenCalledWith('session-123')

      // Change session ID
      rerender({ sessionId: 'session-456' })

      await waitFor(() => {
        expect(mockGetSession).toHaveBeenCalledWith('session-456')
      })
    })

    it('clears session when ID becomes null', async () => {
      const { result, rerender } = renderHook(
        ({ sessionId }) => useCoCreationSession(sessionId),
        { initialProps: { sessionId: 'session-123' as string | null } }
      )

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.session).not.toBeNull()

      // Change to null
      rerender({ sessionId: null })

      await waitFor(() => {
        expect(result.current.session).toBeNull()
      })
    })
  })
})
