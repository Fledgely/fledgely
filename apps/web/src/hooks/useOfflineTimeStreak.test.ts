/**
 * useOfflineTimeStreak Hook Tests - Story 32.6
 *
 * Tests for streak calculation and management.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import {
  useOfflineTimeStreak,
  getWeekStart,
  isYesterday,
  isToday,
  calculateMilestones,
  findNextMilestone,
} from './useOfflineTimeStreak'

// Mock Firebase
const mockOnSnapshot = vi.fn()
const mockSetDoc = vi.fn()
const mockUpdateDoc = vi.fn()
const mockGetDoc = vi.fn()

vi.mock('firebase/firestore', () => ({
  doc: vi.fn(() => 'mock-doc-ref'),
  onSnapshot: (...args: unknown[]) => mockOnSnapshot(...args),
  setDoc: (...args: unknown[]) => mockSetDoc(...args),
  updateDoc: (...args: unknown[]) => mockUpdateDoc(...args),
  getDoc: (...args: unknown[]) => mockGetDoc(...args),
}))

vi.mock('../lib/firebase', () => ({
  db: {},
}))

describe('useOfflineTimeStreak - Story 32.6', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('helper functions', () => {
    describe('getWeekStart', () => {
      it('returns Sunday midnight for a weekday', () => {
        // Thursday, January 2, 2025 at 3:00 PM
        const thursday = new Date(2025, 0, 2, 15, 0, 0).getTime()
        const weekStart = getWeekStart(thursday)
        const startDate = new Date(weekStart)

        expect(startDate.getDay()).toBe(0) // Sunday
        expect(startDate.getHours()).toBe(0)
        expect(startDate.getMinutes()).toBe(0)
      })

      it('returns same day for Sunday', () => {
        // Sunday, January 5, 2025 at 10:00 AM
        const sunday = new Date(2025, 0, 5, 10, 0, 0).getTime()
        const weekStart = getWeekStart(sunday)
        const startDate = new Date(weekStart)

        expect(startDate.getDay()).toBe(0) // Sunday
        expect(startDate.getDate()).toBe(5)
      })
    })

    describe('isYesterday', () => {
      it('returns true for previous day', () => {
        const today = new Date(2025, 0, 15, 12, 0, 0).getTime()
        const yesterday = new Date(2025, 0, 14, 20, 0, 0).getTime()

        expect(isYesterday(yesterday, today)).toBe(true)
      })

      it('returns false for same day', () => {
        const today = new Date(2025, 0, 15, 12, 0, 0).getTime()
        const sameDay = new Date(2025, 0, 15, 8, 0, 0).getTime()

        expect(isYesterday(sameDay, today)).toBe(false)
      })

      it('returns false for two days ago', () => {
        const today = new Date(2025, 0, 15, 12, 0, 0).getTime()
        const twoDaysAgo = new Date(2025, 0, 13, 12, 0, 0).getTime()

        expect(isYesterday(twoDaysAgo, today)).toBe(false)
      })
    })

    describe('isToday', () => {
      it('returns true for same calendar day', () => {
        const morning = new Date(2025, 0, 15, 8, 0, 0).getTime()
        const evening = new Date(2025, 0, 15, 20, 0, 0).getTime()

        expect(isToday(morning, evening)).toBe(true)
      })

      it('returns false for different days', () => {
        const today = new Date(2025, 0, 15, 12, 0, 0).getTime()
        const yesterday = new Date(2025, 0, 14, 12, 0, 0).getTime()

        expect(isToday(yesterday, today)).toBe(false)
      })
    })

    describe('calculateMilestones', () => {
      it('returns all false for streak < 7', () => {
        const milestones = calculateMilestones(5)

        expect(milestones.sevenDays).toBe(false)
        expect(milestones.thirtyDays).toBe(false)
        expect(milestones.hundredDays).toBe(false)
      })

      it('returns sevenDays true for streak >= 7', () => {
        const milestones = calculateMilestones(7)

        expect(milestones.sevenDays).toBe(true)
        expect(milestones.thirtyDays).toBe(false)
        expect(milestones.hundredDays).toBe(false)
      })

      it('returns thirtyDays true for streak >= 30', () => {
        const milestones = calculateMilestones(30)

        expect(milestones.sevenDays).toBe(true)
        expect(milestones.thirtyDays).toBe(true)
        expect(milestones.hundredDays).toBe(false)
      })

      it('returns all true for streak >= 100', () => {
        const milestones = calculateMilestones(100)

        expect(milestones.sevenDays).toBe(true)
        expect(milestones.thirtyDays).toBe(true)
        expect(milestones.hundredDays).toBe(true)
      })
    })

    describe('findNextMilestone', () => {
      it('returns 7-day milestone for new streak', () => {
        const result = findNextMilestone(3)

        expect(result?.milestone).toBe(7)
        expect(result?.daysToGo).toBe(4)
      })

      it('returns 30-day milestone after 7 days', () => {
        const result = findNextMilestone(10)

        expect(result?.milestone).toBe(30)
        expect(result?.daysToGo).toBe(20)
      })

      it('returns 100-day milestone after 30 days', () => {
        const result = findNextMilestone(50)

        expect(result?.milestone).toBe(100)
        expect(result?.daysToGo).toBe(50)
      })

      it('returns null after all milestones achieved', () => {
        const result = findNextMilestone(150)

        expect(result).toBeNull()
      })
    })
  })

  describe('hook behavior', () => {
    it('returns loading initially', () => {
      mockOnSnapshot.mockImplementation(() => () => {})

      const { result } = renderHook(() => useOfflineTimeStreak({ familyId: 'family-1' }))

      expect(result.current.loading).toBe(true)
    })

    it('returns null streak when no familyId', () => {
      const { result } = renderHook(() => useOfflineTimeStreak({ familyId: null }))

      expect(result.current.loading).toBe(false)
      expect(result.current.streak).toBeNull()
    })

    it('subscribes to streak document', () => {
      mockOnSnapshot.mockImplementation(() => () => {})

      renderHook(() => useOfflineTimeStreak({ familyId: 'family-1' }))

      expect(mockOnSnapshot).toHaveBeenCalled()
    })

    it('initializes streak if document does not exist', async () => {
      mockOnSnapshot.mockImplementation((_, callback) => {
        callback({ exists: () => false })
        return () => {}
      })

      renderHook(() => useOfflineTimeStreak({ familyId: 'family-1' }))

      await waitFor(() => {
        expect(mockSetDoc).toHaveBeenCalled()
      })
    })

    it('calculates days to next milestone', async () => {
      const mockStreak = {
        familyId: 'family-1',
        currentStreak: 5,
        longestStreak: 5,
        lastCompletedDate: Date.now(),
        weeklyHours: 10,
        weeklyStartDate: Date.now() - 3 * 24 * 60 * 60 * 1000,
        milestones: { sevenDays: false, thirtyDays: false, hundredDays: false },
        leaderboardOptIn: false,
        updatedAt: Date.now(),
      }

      mockOnSnapshot.mockImplementation((_, callback) => {
        callback({
          exists: () => true,
          data: () => mockStreak,
        })
        return () => {}
      })

      const { result } = renderHook(() => useOfflineTimeStreak({ familyId: 'family-1' }))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
        expect(result.current.daysToNextMilestone).toBe(2) // 7 - 5 = 2
        expect(result.current.nextMilestone).toBe(7)
      })
    })
  })

  describe('incrementStreak', () => {
    it('increments streak for consecutive day', async () => {
      const yesterday = Date.now() - 24 * 60 * 60 * 1000
      const mockStreak = {
        familyId: 'family-1',
        currentStreak: 5,
        longestStreak: 5,
        lastCompletedDate: yesterday,
        weeklyHours: 10,
        weeklyStartDate: getWeekStart(Date.now()),
        milestones: { sevenDays: false, thirtyDays: false, hundredDays: false },
        leaderboardOptIn: false,
        updatedAt: yesterday,
      }

      mockOnSnapshot.mockImplementation((_, callback) => {
        callback({
          exists: () => true,
          data: () => mockStreak,
        })
        return () => {}
      })

      mockUpdateDoc.mockResolvedValue(undefined)

      const { result } = renderHook(() => useOfflineTimeStreak({ familyId: 'family-1' }))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      await act(async () => {
        await result.current.incrementStreak(2)
      })

      expect(mockUpdateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          currentStreak: 6,
        })
      )
    })
  })

  describe('resetStreak', () => {
    it('resets streak to zero', async () => {
      const mockStreak = {
        familyId: 'family-1',
        currentStreak: 10,
        longestStreak: 10,
        lastCompletedDate: Date.now(),
        weeklyHours: 14,
        weeklyStartDate: getWeekStart(Date.now()),
        milestones: { sevenDays: true, thirtyDays: false, hundredDays: false },
        leaderboardOptIn: false,
        updatedAt: Date.now(),
      }

      mockOnSnapshot.mockImplementation((_, callback) => {
        callback({
          exists: () => true,
          data: () => mockStreak,
        })
        return () => {}
      })

      mockUpdateDoc.mockResolvedValue(undefined)

      const { result } = renderHook(() => useOfflineTimeStreak({ familyId: 'family-1' }))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      await act(async () => {
        await result.current.resetStreak()
      })

      expect(mockUpdateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          currentStreak: 0,
          lastCompletedDate: null,
        })
      )
    })
  })

  describe('toggleLeaderboardOptIn', () => {
    it('toggles leaderboard opt-in status', async () => {
      const mockStreak = {
        familyId: 'family-1',
        currentStreak: 5,
        longestStreak: 5,
        lastCompletedDate: Date.now(),
        weeklyHours: 10,
        weeklyStartDate: getWeekStart(Date.now()),
        milestones: { sevenDays: false, thirtyDays: false, hundredDays: false },
        leaderboardOptIn: false,
        updatedAt: Date.now(),
      }

      mockOnSnapshot.mockImplementation((_, callback) => {
        callback({
          exists: () => true,
          data: () => mockStreak,
        })
        return () => {}
      })

      mockUpdateDoc.mockResolvedValue(undefined)

      const { result } = renderHook(() => useOfflineTimeStreak({ familyId: 'family-1' }))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      await act(async () => {
        await result.current.toggleLeaderboardOptIn()
      })

      expect(mockUpdateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          leaderboardOptIn: true,
        })
      )
    })
  })

  describe('dismissCelebration', () => {
    it('clears celebration milestone state', async () => {
      const mockStreak = {
        familyId: 'family-1',
        currentStreak: 7,
        longestStreak: 7,
        lastCompletedDate: Date.now(),
        weeklyHours: 14,
        weeklyStartDate: getWeekStart(Date.now()),
        milestones: { sevenDays: true, thirtyDays: false, hundredDays: false },
        leaderboardOptIn: false,
        updatedAt: Date.now(),
      }

      mockOnSnapshot.mockImplementation((_, callback) => {
        callback({
          exists: () => true,
          data: () => mockStreak,
        })
        return () => {}
      })

      const { result } = renderHook(() => useOfflineTimeStreak({ familyId: 'family-1' }))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      // dismissCelebration should be a function
      expect(typeof result.current.dismissCelebration).toBe('function')

      // Call dismissCelebration
      act(() => {
        result.current.dismissCelebration()
      })

      // After dismissing, celebrationMilestone should be null
      expect(result.current.celebrationMilestone).toBeNull()
    })
  })
})
