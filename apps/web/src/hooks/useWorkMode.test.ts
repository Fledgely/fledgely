/**
 * useWorkMode Hook Tests - Story 33.3
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { useWorkMode } from './useWorkMode'
import type { WorkSchedule } from '@fledgely/shared'

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
  getFirestoreDb: vi.fn(() => ({})),
}))

describe('useWorkMode - Story 33.3', () => {
  const mockChildId = 'child-1'
  const mockFamilyId = 'family-1'

  const mockWorkState = {
    childId: mockChildId,
    familyId: mockFamilyId,
    isActive: false,
    currentSession: null,
    totalSessionsToday: 0,
    totalWorkTimeToday: 0,
    updatedAt: Date.now(),
  }

  const createMockSchedule = (overrides: Partial<WorkSchedule> = {}): WorkSchedule => ({
    id: 'schedule-1',
    name: 'Coffee Shop',
    days: ['saturday', 'sunday'],
    startTime: '10:00',
    endTime: '16:00',
    isEnabled: true,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    ...overrides,
  })

  beforeEach(() => {
    vi.clearAllMocks()
    mockUpdateDoc.mockResolvedValue(undefined)
    mockSetDoc.mockResolvedValue(undefined)
  })

  describe('initialization', () => {
    it('returns loading state initially', () => {
      mockOnSnapshot.mockImplementation(() => () => {})

      const { result } = renderHook(() =>
        useWorkMode({
          childId: mockChildId,
          familyId: mockFamilyId,
        })
      )

      expect(result.current.loading).toBe(true)
      expect(result.current.workState).toBeNull()
    })

    it('loads existing state from Firestore', async () => {
      mockOnSnapshot.mockImplementation((_, onNext) => {
        onNext({
          exists: () => true,
          data: () => mockWorkState,
        })
        return () => {}
      })

      const { result } = renderHook(() =>
        useWorkMode({
          childId: mockChildId,
          familyId: mockFamilyId,
        })
      )

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.workState).toEqual(mockWorkState)
      expect(result.current.error).toBeNull()
    })

    it('creates default state if none exists', async () => {
      mockOnSnapshot.mockImplementation((_, onNext) => {
        onNext({
          exists: () => false,
          data: () => null,
        })
        return () => {}
      })

      const { result } = renderHook(() =>
        useWorkMode({
          childId: mockChildId,
          familyId: mockFamilyId,
        })
      )

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(mockSetDoc).toHaveBeenCalled()
    })

    it('handles Firestore errors gracefully', async () => {
      mockOnSnapshot.mockImplementation((_, _onNext, onError) => {
        if (onError) onError(new Error('Firestore error'))
        return () => {}
      })

      const { result } = renderHook(() =>
        useWorkMode({
          childId: mockChildId,
          familyId: mockFamilyId,
        })
      )

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.error).toBe('Failed to load work mode')
    })

    it('returns empty state when childId is null', () => {
      const { result } = renderHook(() =>
        useWorkMode({
          childId: null,
          familyId: mockFamilyId,
        })
      )

      expect(result.current.loading).toBe(false)
      expect(result.current.workState).toBeNull()
    })

    it('returns empty state when familyId is null', () => {
      const { result } = renderHook(() =>
        useWorkMode({
          childId: mockChildId,
          familyId: null,
        })
      )

      expect(result.current.loading).toBe(false)
      expect(result.current.workState).toBeNull()
    })
  })

  describe('manual work mode controls', () => {
    beforeEach(() => {
      mockOnSnapshot.mockImplementation((_, onNext) => {
        onNext({
          exists: () => true,
          data: () => mockWorkState,
        })
        return () => {}
      })
    })

    it('starts work mode manually', async () => {
      const { result } = renderHook(() =>
        useWorkMode({
          childId: mockChildId,
          familyId: mockFamilyId,
          allowManualActivation: true,
        })
      )

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      await act(async () => {
        await result.current.startWorkMode()
      })

      expect(mockUpdateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          isActive: true,
          currentSession: expect.objectContaining({
            activationType: 'manual',
          }),
        })
      )
    })

    it('stops work mode manually', async () => {
      const activeState = {
        ...mockWorkState,
        isActive: true,
        currentSession: {
          id: 'work-1',
          childId: mockChildId,
          familyId: mockFamilyId,
          status: 'active',
          activationType: 'manual',
          scheduleId: null,
          scheduleName: null,
          startedAt: Date.now() - 60000,
          endedAt: null,
          createdAt: Date.now() - 60000,
          updatedAt: Date.now() - 60000,
        },
      }

      mockOnSnapshot.mockImplementation((_, onNext) => {
        onNext({
          exists: () => true,
          data: () => activeState,
        })
        return () => {}
      })

      const { result } = renderHook(() =>
        useWorkMode({
          childId: mockChildId,
          familyId: mockFamilyId,
        })
      )

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      await act(async () => {
        await result.current.stopWorkMode()
      })

      expect(mockUpdateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          isActive: false,
        })
      )
    })

    it('does not start work mode when manual activation is disabled', async () => {
      const { result } = renderHook(() =>
        useWorkMode({
          childId: mockChildId,
          familyId: mockFamilyId,
          allowManualActivation: false,
        })
      )

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      await act(async () => {
        await result.current.startWorkMode()
      })

      expect(mockUpdateDoc).not.toHaveBeenCalled()
    })

    it('does not start work mode when already active', async () => {
      const activeState = {
        ...mockWorkState,
        isActive: true,
        currentSession: {
          id: 'work-1',
          childId: mockChildId,
          familyId: mockFamilyId,
          status: 'active',
          activationType: 'manual',
          scheduleId: null,
          scheduleName: null,
          startedAt: Date.now() - 60000,
          endedAt: null,
          createdAt: Date.now() - 60000,
          updatedAt: Date.now() - 60000,
        },
      }

      mockOnSnapshot.mockImplementation((_, onNext) => {
        onNext({
          exists: () => true,
          data: () => activeState,
        })
        return () => {}
      })

      const { result } = renderHook(() =>
        useWorkMode({
          childId: mockChildId,
          familyId: mockFamilyId,
          allowManualActivation: true,
        })
      )

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      await act(async () => {
        await result.current.startWorkMode()
      })

      expect(mockUpdateDoc).not.toHaveBeenCalled()
    })
  })

  describe('schedule detection', () => {
    // Helper to create a schedule that matches the current day and time
    const getCurrentDaySchedule = (): WorkSchedule => {
      const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
      const currentDay = days[new Date().getDay()]
      const now = new Date()
      const startHour = now.getHours() - 1
      const endHour = now.getHours() + 2

      return createMockSchedule({
        days: [currentDay as WorkSchedule['days'][number]],
        startTime: `${String(startHour).padStart(2, '0')}:00`,
        endTime: `${String(endHour).padStart(2, '0')}:00`,
      })
    }

    // Helper to create a schedule that never matches current time
    const getNonMatchingSchedule = (): WorkSchedule => {
      const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
      const currentDay = new Date().getDay()
      const otherDay = days[(currentDay + 3) % 7] // 3 days from now

      return createMockSchedule({
        days: [otherDay as WorkSchedule['days'][number]],
        startTime: '03:00',
        endTime: '04:00',
      })
    }

    it('detects when within scheduled hours', async () => {
      mockOnSnapshot.mockImplementation((_, onNext) => {
        onNext({
          exists: () => true,
          data: () => mockWorkState,
        })
        return () => {}
      })

      const { result } = renderHook(() =>
        useWorkMode({
          childId: mockChildId,
          familyId: mockFamilyId,
          schedules: [getCurrentDaySchedule()],
        })
      )

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.isInScheduledHours).toBe(true)
      expect(result.current.currentSchedule).not.toBeNull()
    })

    it('detects when outside scheduled hours', async () => {
      mockOnSnapshot.mockImplementation((_, onNext) => {
        onNext({
          exists: () => true,
          data: () => mockWorkState,
        })
        return () => {}
      })

      const { result } = renderHook(() =>
        useWorkMode({
          childId: mockChildId,
          familyId: mockFamilyId,
          schedules: [getNonMatchingSchedule()],
        })
      )

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.isInScheduledHours).toBe(false)
      expect(result.current.currentSchedule).toBeNull()
    })

    it('calculates next schedule start when outside hours', async () => {
      mockOnSnapshot.mockImplementation((_, onNext) => {
        onNext({
          exists: () => true,
          data: () => mockWorkState,
        })
        return () => {}
      })

      const { result } = renderHook(() =>
        useWorkMode({
          childId: mockChildId,
          familyId: mockFamilyId,
          schedules: [getNonMatchingSchedule()],
        })
      )

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.nextScheduleStart).not.toBeNull()
      expect(result.current.nextScheduleStart).toBeInstanceOf(Date)
    })

    it('ignores disabled schedules', async () => {
      mockOnSnapshot.mockImplementation((_, onNext) => {
        onNext({
          exists: () => true,
          data: () => mockWorkState,
        })
        return () => {}
      })

      const disabledSchedule = getCurrentDaySchedule()
      disabledSchedule.isEnabled = false

      const { result } = renderHook(() =>
        useWorkMode({
          childId: mockChildId,
          familyId: mockFamilyId,
          schedules: [disabledSchedule],
        })
      )

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.isInScheduledHours).toBe(false)
      expect(result.current.currentSchedule).toBeNull()
    })
  })

  describe('timer functionality', () => {
    it('tracks elapsed time during active session', async () => {
      // Use 90 seconds (well within 1-2 minute range to avoid flakiness)
      const startedAt = Date.now() - 90000 // Started 1.5 minutes ago
      const activeState = {
        ...mockWorkState,
        isActive: true,
        currentSession: {
          id: 'work-1',
          childId: mockChildId,
          familyId: mockFamilyId,
          status: 'active',
          activationType: 'manual',
          scheduleId: null,
          scheduleName: null,
          startedAt,
          endedAt: null,
          createdAt: startedAt,
          updatedAt: startedAt,
        },
      }

      mockOnSnapshot.mockImplementation((_, onNext) => {
        onNext({
          exists: () => true,
          data: () => activeState,
        })
        return () => {}
      })

      const { result } = renderHook(() =>
        useWorkMode({
          childId: mockChildId,
          familyId: mockFamilyId,
        })
      )

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      // Check that elapsed time is roughly 90 seconds (1-2 minutes formatted)
      expect(result.current.timeElapsedMs).toBeGreaterThanOrEqual(90000)
      expect(['1m', '2m']).toContain(result.current.timeElapsedFormatted)
    })

    it('returns null times when inactive', async () => {
      mockOnSnapshot.mockImplementation((_, onNext) => {
        onNext({
          exists: () => true,
          data: () => mockWorkState,
        })
        return () => {}
      })

      const { result } = renderHook(() =>
        useWorkMode({
          childId: mockChildId,
          familyId: mockFamilyId,
        })
      )

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.timeElapsedMs).toBeNull()
      expect(result.current.timeElapsedFormatted).toBeNull()
      expect(result.current.timeRemainingMs).toBeNull()
      expect(result.current.timeRemainingFormatted).toBeNull()
    })
  })

  describe('session stats', () => {
    it('returns correct session stats', async () => {
      const stateWithStats = {
        ...mockWorkState,
        totalSessionsToday: 3,
        totalWorkTimeToday: 7200000, // 2 hours in ms
      }

      mockOnSnapshot.mockImplementation((_, onNext) => {
        onNext({
          exists: () => true,
          data: () => stateWithStats,
        })
        return () => {}
      })

      const { result } = renderHook(() =>
        useWorkMode({
          childId: mockChildId,
          familyId: mockFamilyId,
        })
      )

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.totalSessionsToday).toBe(3)
      expect(result.current.totalWorkTimeToday).toBe(7200000)
    })

    it('increments session count on start', async () => {
      mockOnSnapshot.mockImplementation((_, onNext) => {
        onNext({
          exists: () => true,
          data: () => ({ ...mockWorkState, totalSessionsToday: 2 }),
        })
        return () => {}
      })

      const { result } = renderHook(() =>
        useWorkMode({
          childId: mockChildId,
          familyId: mockFamilyId,
          allowManualActivation: true,
        })
      )

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      await act(async () => {
        await result.current.startWorkMode()
      })

      expect(mockUpdateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          totalSessionsToday: 3,
        })
      )
    })
  })

  describe('derived values', () => {
    it('returns isActive false when not active', async () => {
      mockOnSnapshot.mockImplementation((_, onNext) => {
        onNext({
          exists: () => true,
          data: () => mockWorkState,
        })
        return () => {}
      })

      const { result } = renderHook(() =>
        useWorkMode({
          childId: mockChildId,
          familyId: mockFamilyId,
        })
      )

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.isActive).toBe(false)
      expect(result.current.currentSession).toBeNull()
    })

    it('returns isActive true when active', async () => {
      const activeState = {
        ...mockWorkState,
        isActive: true,
        currentSession: {
          id: 'work-1',
          childId: mockChildId,
          familyId: mockFamilyId,
          status: 'active',
          activationType: 'manual',
          scheduleId: null,
          scheduleName: null,
          startedAt: Date.now(),
          endedAt: null,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      }

      mockOnSnapshot.mockImplementation((_, onNext) => {
        onNext({
          exists: () => true,
          data: () => activeState,
        })
        return () => {}
      })

      const { result } = renderHook(() =>
        useWorkMode({
          childId: mockChildId,
          familyId: mockFamilyId,
        })
      )

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.isActive).toBe(true)
      expect(result.current.currentSession).not.toBeNull()
    })
  })
})
