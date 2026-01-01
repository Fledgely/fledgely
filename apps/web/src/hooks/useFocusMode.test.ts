/**
 * useFocusMode Hook Tests - Story 33.1
 *
 * Tests for focus mode management.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useFocusMode } from './useFocusMode'

// Mock Firebase
const mockOnSnapshot = vi.fn()
const mockSetDoc = vi.fn()
const mockUpdateDoc = vi.fn()

vi.mock('firebase/firestore', () => ({
  doc: vi.fn(() => 'mock-doc-ref'),
  onSnapshot: (...args: unknown[]) => mockOnSnapshot(...args),
  setDoc: (...args: unknown[]) => mockSetDoc(...args),
  updateDoc: (...args: unknown[]) => mockUpdateDoc(...args),
}))

vi.mock('../lib/firebase', () => ({
  db: {},
}))

describe('useFocusMode - Story 33.1', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('initialization', () => {
    it('returns loading initially', () => {
      mockOnSnapshot.mockImplementation(() => () => {})

      const { result } = renderHook(() =>
        useFocusMode({ childId: 'child-1', familyId: 'family-1' })
      )

      expect(result.current.loading).toBe(true)
    })

    it('returns null state when no childId', () => {
      const { result } = renderHook(() => useFocusMode({ childId: null, familyId: 'family-1' }))

      expect(result.current.loading).toBe(false)
      expect(result.current.focusState).toBeNull()
    })

    it('returns null state when no familyId', () => {
      const { result } = renderHook(() => useFocusMode({ childId: 'child-1', familyId: null }))

      expect(result.current.loading).toBe(false)
      expect(result.current.focusState).toBeNull()
    })

    it('subscribes to focus mode document', () => {
      mockOnSnapshot.mockImplementation(() => () => {})

      renderHook(() => useFocusMode({ childId: 'child-1', familyId: 'family-1' }))

      expect(mockOnSnapshot).toHaveBeenCalled()
    })

    it('initializes state if document does not exist', async () => {
      mockOnSnapshot.mockImplementation((_, callback) => {
        callback({ exists: () => false })
        return () => {}
      })

      renderHook(() => useFocusMode({ childId: 'child-1', familyId: 'family-1' }))

      await waitFor(() => {
        expect(mockSetDoc).toHaveBeenCalled()
      })
    })
  })

  describe('focus mode state', () => {
    it('returns isActive as false when no session', async () => {
      const mockState = {
        childId: 'child-1',
        familyId: 'family-1',
        isActive: false,
        currentSession: null,
        totalSessionsToday: 0,
        totalFocusTimeToday: 0,
        updatedAt: Date.now(),
      }

      mockOnSnapshot.mockImplementation((_, callback) => {
        callback({
          exists: () => true,
          data: () => mockState,
        })
        return () => {}
      })

      const { result } = renderHook(() =>
        useFocusMode({ childId: 'child-1', familyId: 'family-1' })
      )

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
        expect(result.current.isActive).toBe(false)
      })
    })

    it('returns isActive as true when session active', async () => {
      const mockState = {
        childId: 'child-1',
        familyId: 'family-1',
        isActive: true,
        currentSession: {
          id: 'session-1',
          childId: 'child-1',
          familyId: 'family-1',
          status: 'active',
          durationType: 'pomodoro',
          durationMs: 25 * 60 * 1000,
          startedAt: Date.now(),
          endedAt: null,
          completedFully: false,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
        totalSessionsToday: 1,
        totalFocusTimeToday: 0,
        updatedAt: Date.now(),
      }

      mockOnSnapshot.mockImplementation((_, callback) => {
        callback({
          exists: () => true,
          data: () => mockState,
        })
        return () => {}
      })

      const { result } = renderHook(() =>
        useFocusMode({ childId: 'child-1', familyId: 'family-1' })
      )

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
        expect(result.current.isActive).toBe(true)
        expect(result.current.currentSession).not.toBeNull()
      })
    })
  })

  describe('startFocusMode', () => {
    it('creates a new session with pomodoro duration', async () => {
      const mockState = {
        childId: 'child-1',
        familyId: 'family-1',
        isActive: false,
        currentSession: null,
        totalSessionsToday: 0,
        totalFocusTimeToday: 0,
        updatedAt: Date.now(),
      }

      mockOnSnapshot.mockImplementation((_, callback) => {
        callback({
          exists: () => true,
          data: () => mockState,
        })
        return () => {}
      })

      mockUpdateDoc.mockResolvedValue(undefined)

      const { result } = renderHook(() =>
        useFocusMode({ childId: 'child-1', familyId: 'family-1' })
      )

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      await act(async () => {
        await result.current.startFocusMode('pomodoro')
      })

      expect(mockUpdateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          isActive: true,
          totalSessionsToday: 1,
        })
      )
    })

    it('increments totalSessionsToday', async () => {
      const mockState = {
        childId: 'child-1',
        familyId: 'family-1',
        isActive: false,
        currentSession: null,
        totalSessionsToday: 2,
        totalFocusTimeToday: 50 * 60 * 1000,
        updatedAt: Date.now(),
      }

      mockOnSnapshot.mockImplementation((_, callback) => {
        callback({
          exists: () => true,
          data: () => mockState,
        })
        return () => {}
      })

      mockUpdateDoc.mockResolvedValue(undefined)

      const { result } = renderHook(() =>
        useFocusMode({ childId: 'child-1', familyId: 'family-1' })
      )

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      await act(async () => {
        await result.current.startFocusMode('oneHour')
      })

      expect(mockUpdateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          totalSessionsToday: 3,
        })
      )
    })
  })

  describe('stopFocusMode', () => {
    it('ends the current session', async () => {
      const mockState = {
        childId: 'child-1',
        familyId: 'family-1',
        isActive: true,
        currentSession: {
          id: 'session-1',
          childId: 'child-1',
          familyId: 'family-1',
          status: 'active',
          durationType: 'pomodoro',
          durationMs: 25 * 60 * 1000,
          startedAt: Date.now() - 10 * 60 * 1000, // Started 10 min ago
          endedAt: null,
          completedFully: false,
          createdAt: Date.now() - 10 * 60 * 1000,
          updatedAt: Date.now() - 10 * 60 * 1000,
        },
        totalSessionsToday: 1,
        totalFocusTimeToday: 0,
        updatedAt: Date.now(),
      }

      mockOnSnapshot.mockImplementation((_, callback) => {
        callback({
          exists: () => true,
          data: () => mockState,
        })
        return () => {}
      })

      mockUpdateDoc.mockResolvedValue(undefined)

      const { result } = renderHook(() =>
        useFocusMode({ childId: 'child-1', familyId: 'family-1' })
      )

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      await act(async () => {
        await result.current.stopFocusMode()
      })

      expect(mockUpdateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          isActive: false,
        })
      )
    })
  })

  describe('countdown timer', () => {
    it('calculates time remaining', async () => {
      const startTime = Date.now()
      const mockState = {
        childId: 'child-1',
        familyId: 'family-1',
        isActive: true,
        currentSession: {
          id: 'session-1',
          childId: 'child-1',
          familyId: 'family-1',
          status: 'active',
          durationType: 'pomodoro',
          durationMs: 25 * 60 * 1000, // 25 minutes
          startedAt: startTime,
          endedAt: null,
          completedFully: false,
          createdAt: startTime,
          updatedAt: startTime,
        },
        totalSessionsToday: 1,
        totalFocusTimeToday: 0,
        updatedAt: startTime,
      }

      mockOnSnapshot.mockImplementation((_, callback) => {
        callback({
          exists: () => true,
          data: () => mockState,
        })
        return () => {}
      })

      const { result } = renderHook(() =>
        useFocusMode({ childId: 'child-1', familyId: 'family-1' })
      )

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
        expect(result.current.timeRemainingMs).not.toBeNull()
      })

      // Time remaining should be approximately 25 minutes
      expect(result.current.timeRemainingMs).toBeGreaterThan(24 * 60 * 1000)
      expect(result.current.timeRemainingMs).toBeLessThanOrEqual(25 * 60 * 1000)
    })

    it('formats time remaining as string', async () => {
      const startTime = Date.now()
      const mockState = {
        childId: 'child-1',
        familyId: 'family-1',
        isActive: true,
        currentSession: {
          id: 'session-1',
          childId: 'child-1',
          familyId: 'family-1',
          status: 'active',
          durationType: 'pomodoro',
          durationMs: 25 * 60 * 1000,
          startedAt: startTime,
          endedAt: null,
          completedFully: false,
          createdAt: startTime,
          updatedAt: startTime,
        },
        totalSessionsToday: 1,
        totalFocusTimeToday: 0,
        updatedAt: startTime,
      }

      mockOnSnapshot.mockImplementation((_, callback) => {
        callback({
          exists: () => true,
          data: () => mockState,
        })
        return () => {}
      })

      const { result } = renderHook(() =>
        useFocusMode({ childId: 'child-1', familyId: 'family-1' })
      )

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
        expect(result.current.timeRemainingFormatted).not.toBeNull()
      })

      // Should be formatted as minutes
      expect(result.current.timeRemainingFormatted).toMatch(/\d+m/)
    })

    it('returns null time remaining for untilOff', async () => {
      const mockState = {
        childId: 'child-1',
        familyId: 'family-1',
        isActive: true,
        currentSession: {
          id: 'session-1',
          childId: 'child-1',
          familyId: 'family-1',
          status: 'active',
          durationType: 'untilOff',
          durationMs: null, // No duration
          startedAt: Date.now(),
          endedAt: null,
          completedFully: false,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
        totalSessionsToday: 1,
        totalFocusTimeToday: 0,
        updatedAt: Date.now(),
      }

      mockOnSnapshot.mockImplementation((_, callback) => {
        callback({
          exists: () => true,
          data: () => mockState,
        })
        return () => {}
      })

      const { result } = renderHook(() =>
        useFocusMode({ childId: 'child-1', familyId: 'family-1' })
      )

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
        expect(result.current.timeRemainingMs).toBeNull()
      })
    })
  })

  describe('daily stats', () => {
    it('returns totalSessionsToday', async () => {
      const mockState = {
        childId: 'child-1',
        familyId: 'family-1',
        isActive: false,
        currentSession: null,
        totalSessionsToday: 5,
        totalFocusTimeToday: 120 * 60 * 1000,
        updatedAt: Date.now(),
      }

      mockOnSnapshot.mockImplementation((_, callback) => {
        callback({
          exists: () => true,
          data: () => mockState,
        })
        return () => {}
      })

      const { result } = renderHook(() =>
        useFocusMode({ childId: 'child-1', familyId: 'family-1' })
      )

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
        expect(result.current.totalSessionsToday).toBe(5)
      })
    })

    it('returns totalFocusTimeToday', async () => {
      const mockState = {
        childId: 'child-1',
        familyId: 'family-1',
        isActive: false,
        currentSession: null,
        totalSessionsToday: 3,
        totalFocusTimeToday: 90 * 60 * 1000, // 90 minutes
        updatedAt: Date.now(),
      }

      mockOnSnapshot.mockImplementation((_, callback) => {
        callback({
          exists: () => true,
          data: () => mockState,
        })
        return () => {}
      })

      const { result } = renderHook(() =>
        useFocusMode({ childId: 'child-1', familyId: 'family-1' })
      )

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
        expect(result.current.totalFocusTimeToday).toBe(90 * 60 * 1000)
      })
    })
  })
})
