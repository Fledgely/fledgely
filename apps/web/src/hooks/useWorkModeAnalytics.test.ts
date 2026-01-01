/**
 * useWorkModeAnalytics Hook Tests - Story 33.6
 *
 * Tests for work mode analytics hook including:
 * - Weekly hours calculation
 * - Session type breakdown
 * - Anomaly detection
 * - Week-over-week comparison
 * - Outside schedule tracking
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useWorkModeAnalytics, formatWorkHours, getDayLabel } from './useWorkModeAnalytics'

// Mock Firebase
const mockOnSnapshot = vi.fn()
const mockQuery = vi.fn()
const mockCollection = vi.fn()
const mockWhere = vi.fn()
const mockOrderBy = vi.fn()

vi.mock('firebase/firestore', () => ({
  collection: (...args: unknown[]) => mockCollection(...args),
  query: (...args: unknown[]) => mockQuery(...args),
  where: (...args: unknown[]) => mockWhere(...args),
  orderBy: (...args: unknown[]) => mockOrderBy(...args),
  onSnapshot: (...args: unknown[]) => mockOnSnapshot(...args),
}))

vi.mock('../lib/firebase', () => ({
  getFirestoreDb: () => ({}),
}))

describe('useWorkModeAnalytics - Story 33.6', () => {
  const mockUnsubscribe = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    mockCollection.mockReturnValue('collection-ref')
    mockQuery.mockReturnValue('query-ref')
    mockWhere.mockReturnValue('where-ref')
    mockOrderBy.mockReturnValue('orderBy-ref')
    mockOnSnapshot.mockImplementation((_query, onNext) => {
      // Default: empty snapshot
      onNext({ forEach: () => {} })
      return mockUnsubscribe
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('initial state', () => {
    it('returns loading state initially', () => {
      mockOnSnapshot.mockImplementation(() => mockUnsubscribe)

      const { result } = renderHook(() =>
        useWorkModeAnalytics({
          familyId: 'family-1',
          childId: 'child-1',
        })
      )

      expect(result.current.loading).toBe(true)
      expect(result.current.data).toBeNull()
      expect(result.current.error).toBeNull()
    })

    it('returns empty data when disabled', async () => {
      const { result } = renderHook(() =>
        useWorkModeAnalytics({
          familyId: 'family-1',
          childId: 'child-1',
          enabled: false,
        })
      )

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      // When disabled, returns empty data structure (not null)
      expect(result.current.data?.weeklySessionCount).toBe(0)
    })

    it('returns empty data when familyId is null', async () => {
      const { result } = renderHook(() =>
        useWorkModeAnalytics({
          familyId: null,
          childId: 'child-1',
        })
      )

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      // When familyId is null, returns empty data structure (not null)
      expect(result.current.data?.weeklySessionCount).toBe(0)
    })

    it('returns empty data when childId is null', async () => {
      const { result } = renderHook(() =>
        useWorkModeAnalytics({
          familyId: 'family-1',
          childId: null,
        })
      )

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      // When childId is null, returns empty data structure (not null)
      expect(result.current.data?.weeklySessionCount).toBe(0)
    })
  })

  describe('empty state', () => {
    it('returns empty data structure when no summaries exist', async () => {
      mockOnSnapshot.mockImplementation((_query, onNext) => {
        onNext({ forEach: () => {} })
        return mockUnsubscribe
      })

      const { result } = renderHook(() =>
        useWorkModeAnalytics({
          familyId: 'family-1',
          childId: 'child-1',
        })
      )

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.data).toEqual({
        weeklySessionCount: 0,
        weeklyTotalHours: 0,
        weeklyAverageSessionHours: 0,
        sessionCountChange: 0,
        hoursChange: 0,
        typicalWeeklyHours: 0,
        deviationFromTypical: 0,
        isAnomalous: false,
        scheduledSessions: 0,
        manualSessions: 0,
        outsideScheduleCount: 0,
        dailyDistribution: {},
        dailySummaries: [],
        periodStart: expect.any(String),
        periodEnd: expect.any(String),
      })
    })
  })

  describe('data computation', () => {
    it('calculates weekly hours correctly', async () => {
      const today = new Date()
      const summaries = [
        {
          id: () => today.toISOString().split('T')[0],
          data: () => ({
            childId: 'child-1',
            familyId: 'family-1',
            date: today.toISOString().split('T')[0],
            sessionCount: 2,
            totalMinutes: 240, // 4 hours
            scheduledMinutes: 180,
            manualMinutes: 60,
            outsideScheduleCount: 1,
            sessions: [
              { activationType: 'scheduled' },
              { activationType: 'manual', wasOutsideSchedule: true },
            ],
            updatedAt: Date.now(),
          }),
        },
      ]

      mockOnSnapshot.mockImplementation((_query, onNext) => {
        onNext({
          forEach: (cb: (doc: (typeof summaries)[0]) => void) => summaries.forEach(cb),
        })
        return mockUnsubscribe
      })

      const { result } = renderHook(() =>
        useWorkModeAnalytics({
          familyId: 'family-1',
          childId: 'child-1',
        })
      )

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.data?.weeklySessionCount).toBe(2)
      expect(result.current.data?.weeklyTotalHours).toBe(4)
      expect(result.current.data?.scheduledSessions).toBe(1)
      expect(result.current.data?.manualSessions).toBe(1)
      expect(result.current.data?.outsideScheduleCount).toBe(1)
    })

    it('calculates average session hours', async () => {
      const today = new Date()
      const summaries = [
        {
          id: () => today.toISOString().split('T')[0],
          data: () => ({
            date: today.toISOString().split('T')[0],
            sessionCount: 4,
            totalMinutes: 480, // 8 hours total, 2h average
            scheduledMinutes: 480,
            manualMinutes: 0,
            outsideScheduleCount: 0,
            sessions: [
              { activationType: 'scheduled' },
              { activationType: 'scheduled' },
              { activationType: 'scheduled' },
              { activationType: 'scheduled' },
            ],
            updatedAt: Date.now(),
          }),
        },
      ]

      mockOnSnapshot.mockImplementation((_query, onNext) => {
        onNext({
          forEach: (cb: (doc: (typeof summaries)[0]) => void) => summaries.forEach(cb),
        })
        return mockUnsubscribe
      })

      const { result } = renderHook(() =>
        useWorkModeAnalytics({
          familyId: 'family-1',
          childId: 'child-1',
        })
      )

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.data?.weeklyAverageSessionHours).toBe(2)
    })
  })

  describe('anomaly detection', () => {
    it('detects anomalous weeks (50%+ above typical)', async () => {
      // Helper to format date as YYYY-MM-DD
      const formatDate = (date: Date) => date.toISOString().split('T')[0]

      // Current week: 30 hours, baseline: 15 hours per week = 100% above = anomalous
      const today = new Date()
      const todayStr = formatDate(today)

      // Previous week date (8-10 days ago to ensure it's in previous week bucket)
      const prevWeekDate = new Date(today)
      prevWeekDate.setDate(prevWeekDate.getDate() - 10)
      const prevWeekStr = formatDate(prevWeekDate)

      // Baseline date (15-20 days ago for baseline bucket)
      const baselineDate = new Date(today)
      baselineDate.setDate(baselineDate.getDate() - 18)
      const baselineStr = formatDate(baselineDate)

      const summaries = [
        // Current week: 30 hours total (high)
        {
          id: () => todayStr,
          data: () => ({
            date: todayStr,
            sessionCount: 5,
            totalMinutes: 1800, // 30 hours
            scheduledMinutes: 1800,
            manualMinutes: 0,
            outsideScheduleCount: 0,
            sessions: Array(5).fill({ activationType: 'scheduled' }),
            updatedAt: Date.now(),
          }),
        },
        // Previous week: 10 hours
        {
          id: () => prevWeekStr,
          data: () => ({
            date: prevWeekStr,
            sessionCount: 2,
            totalMinutes: 600, // 10 hours
            scheduledMinutes: 600,
            manualMinutes: 0,
            outsideScheduleCount: 0,
            sessions: Array(2).fill({ activationType: 'scheduled' }),
            updatedAt: Date.now(),
          }),
        },
        // Baseline week: 10 hours (contributes to typical)
        {
          id: () => baselineStr,
          data: () => ({
            date: baselineStr,
            sessionCount: 2,
            totalMinutes: 600, // 10 hours
            scheduledMinutes: 600,
            manualMinutes: 0,
            outsideScheduleCount: 0,
            sessions: Array(2).fill({ activationType: 'scheduled' }),
            updatedAt: Date.now(),
          }),
        },
      ]

      mockOnSnapshot.mockImplementation((_query, onNext) => {
        onNext({
          forEach: (cb: (doc: (typeof summaries)[0]) => void) => summaries.forEach(cb),
        })
        return mockUnsubscribe
      })

      const { result } = renderHook(() =>
        useWorkModeAnalytics({
          familyId: 'family-1',
          childId: 'child-1',
        })
      )

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      // Current week is 30 hours, baseline is ~10 hours per week
      // Deviation = (30 - 10) / 10 = 200% which is > 50% threshold
      expect(result.current.data?.isAnomalous).toBe(true)
      expect(result.current.data?.deviationFromTypical).toBeGreaterThan(0.5)
    })

    it('does not flag normal variations as anomalous', async () => {
      const formatDate = (date: Date) => date.toISOString().split('T')[0]
      const today = new Date()
      const todayStr = formatDate(today)

      const prevWeekDate = new Date(today)
      prevWeekDate.setDate(prevWeekDate.getDate() - 10)
      const prevWeekStr = formatDate(prevWeekDate)

      const summaries = [
        // Current week: 12 hours (only 20% above baseline of 10 hours)
        {
          id: () => todayStr,
          data: () => ({
            date: todayStr,
            sessionCount: 3,
            totalMinutes: 720, // 12 hours
            scheduledMinutes: 720,
            manualMinutes: 0,
            outsideScheduleCount: 0,
            sessions: Array(3).fill({ activationType: 'scheduled' }),
            updatedAt: Date.now(),
          }),
        },
        // Previous week baseline: 10 hours
        {
          id: () => prevWeekStr,
          data: () => ({
            date: prevWeekStr,
            sessionCount: 2,
            totalMinutes: 600, // 10 hours
            scheduledMinutes: 600,
            manualMinutes: 0,
            outsideScheduleCount: 0,
            sessions: Array(2).fill({ activationType: 'scheduled' }),
            updatedAt: Date.now(),
          }),
        },
      ]

      mockOnSnapshot.mockImplementation((_query, onNext) => {
        onNext({
          forEach: (cb: (doc: (typeof summaries)[0]) => void) => summaries.forEach(cb),
        })
        return mockUnsubscribe
      })

      const { result } = renderHook(() =>
        useWorkModeAnalytics({
          familyId: 'family-1',
          childId: 'child-1',
        })
      )

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      // 12 hours is only 20% above 10 hours baseline, not anomalous
      expect(result.current.data?.isAnomalous).toBe(false)
    })
  })

  describe('week-over-week comparison', () => {
    it('calculates positive hours change', async () => {
      const today = new Date()
      const tenDaysAgo = new Date(today)
      tenDaysAgo.setDate(tenDaysAgo.getDate() - 10)

      const summaries = [
        // Current week: 20 hours
        {
          id: () => today.toISOString().split('T')[0],
          data: () => ({
            date: today.toISOString().split('T')[0],
            sessionCount: 4,
            totalMinutes: 1200, // 20 hours
            scheduledMinutes: 1200,
            manualMinutes: 0,
            outsideScheduleCount: 0,
            sessions: [
              { activationType: 'scheduled' },
              { activationType: 'scheduled' },
              { activationType: 'scheduled' },
              { activationType: 'scheduled' },
            ],
            updatedAt: Date.now(),
          }),
        },
        // Previous week: 15 hours
        {
          id: () => tenDaysAgo.toISOString().split('T')[0],
          data: () => ({
            date: tenDaysAgo.toISOString().split('T')[0],
            sessionCount: 3,
            totalMinutes: 900, // 15 hours
            scheduledMinutes: 900,
            manualMinutes: 0,
            outsideScheduleCount: 0,
            sessions: [
              { activationType: 'scheduled' },
              { activationType: 'scheduled' },
              { activationType: 'scheduled' },
            ],
            updatedAt: Date.now(),
          }),
        },
      ]

      mockOnSnapshot.mockImplementation((_query, onNext) => {
        onNext({
          forEach: (cb: (doc: (typeof summaries)[0]) => void) => summaries.forEach(cb),
        })
        return mockUnsubscribe
      })

      const { result } = renderHook(() =>
        useWorkModeAnalytics({
          familyId: 'family-1',
          childId: 'child-1',
        })
      )

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.data?.hoursChange).toBe(5) // 20 - 15 = +5
      expect(result.current.data?.sessionCountChange).toBe(1) // 4 - 3 = +1
    })
  })

  describe('error handling', () => {
    it('handles Firestore errors', async () => {
      mockOnSnapshot.mockImplementation((_query, _onNext, onError) => {
        onError(new Error('Firestore error'))
        return mockUnsubscribe
      })

      const { result } = renderHook(() =>
        useWorkModeAnalytics({
          familyId: 'family-1',
          childId: 'child-1',
        })
      )

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.error).toBe('Failed to load work mode analytics')
    })
  })

  describe('cleanup', () => {
    it('unsubscribes on unmount', () => {
      const { unmount } = renderHook(() =>
        useWorkModeAnalytics({
          familyId: 'family-1',
          childId: 'child-1',
        })
      )

      unmount()

      expect(mockUnsubscribe).toHaveBeenCalled()
    })
  })

  describe('messages', () => {
    it('provides WORK_MODE_ANALYTICS_MESSAGES', async () => {
      mockOnSnapshot.mockImplementation((_query, onNext) => {
        onNext({ forEach: () => {} })
        return mockUnsubscribe
      })

      const { result } = renderHook(() =>
        useWorkModeAnalytics({
          familyId: 'family-1',
          childId: 'child-1',
        })
      )

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.messages).toBeDefined()
      expect(result.current.messages.weeklyHours).toBeDefined()
      expect(result.current.messages.checkInTemplates).toBeDefined()
    })
  })
})

describe('formatWorkHours', () => {
  it('formats 0 hours as 0h', () => {
    expect(formatWorkHours(0)).toBe('0h')
  })

  it('formats whole hours', () => {
    expect(formatWorkHours(2)).toBe('2h')
  })

  it('formats partial hours as minutes', () => {
    expect(formatWorkHours(0.5)).toBe('30m')
  })

  it('formats hours and minutes', () => {
    expect(formatWorkHours(1.5)).toBe('1h 30m')
  })

  it('formats larger values', () => {
    expect(formatWorkHours(8.25)).toBe('8h 15m')
  })
})

describe('getDayLabel', () => {
  it('returns short labels for days', () => {
    expect(getDayLabel('sunday')).toBe('Sun')
    expect(getDayLabel('monday')).toBe('Mon')
    expect(getDayLabel('tuesday')).toBe('Tue')
    expect(getDayLabel('wednesday')).toBe('Wed')
    expect(getDayLabel('thursday')).toBe('Thu')
    expect(getDayLabel('friday')).toBe('Fri')
    expect(getDayLabel('saturday')).toBe('Sat')
  })
})
