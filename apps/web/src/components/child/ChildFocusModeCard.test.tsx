/**
 * ChildFocusModeCard Tests - Story 33.5
 *
 * Tests for the child-friendly focus mode analytics display.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ChildFocusModeCard } from './ChildFocusModeCard'
import type { FocusModeAnalyticsData } from '../../hooks/useFocusModeAnalytics'

// Mock the hook
const mockUseFocusModeAnalytics = vi.fn()

vi.mock('../../hooks/useFocusModeAnalytics', () => ({
  useFocusModeAnalytics: () => mockUseFocusModeAnalytics(),
  formatFocusDuration: (minutes: number) => {
    if (minutes === 0) return '0m'
    const hours = Math.floor(minutes / 60)
    const mins = Math.round(minutes % 60)
    if (hours === 0) return `${mins}m`
    if (mins === 0) return `${hours}h`
    return `${hours}h ${mins}m`
  },
  getDayLabel: (day: string) => day.slice(0, 3).charAt(0).toUpperCase() + day.slice(1, 3),
  getTimeOfDayLabel: (time: string) => time.charAt(0).toUpperCase() + time.slice(1),
}))

describe('ChildFocusModeCard - Story 33.5', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('loading state', () => {
    it('shows loading spinner', () => {
      mockUseFocusModeAnalytics.mockReturnValue({
        data: null,
        loading: true,
        error: null,
      })

      render(<ChildFocusModeCard familyId="family-1" childId="child-1" />)

      expect(screen.getByTestId('loading-state')).toBeInTheDocument()
      expect(screen.getByText('Loading your focus stats...')).toBeInTheDocument()
    })
  })

  describe('error state', () => {
    it('shows friendly error message', () => {
      mockUseFocusModeAnalytics.mockReturnValue({
        data: null,
        loading: false,
        error: 'Failed to load',
      })

      render(<ChildFocusModeCard familyId="family-1" childId="child-1" />)

      expect(screen.getByTestId('error-state')).toBeInTheDocument()
      expect(screen.getByText("We couldn't load your focus stats.")).toBeInTheDocument()
    })
  })

  describe('empty state (AC5 & AC6)', () => {
    it('shows encouraging empty state', () => {
      mockUseFocusModeAnalytics.mockReturnValue({
        data: {
          weeklySessionCount: 0,
          weeklyTotalMinutes: 0,
          weeklyAverageMinutes: 0,
          weeklyCompletionRate: 0,
          sessionCountChange: 0,
          totalMinutesChange: 0,
          completionRateChange: 0,
          peakDays: [],
          peakTimeOfDay: null,
          hourlyDistribution: {},
          dailyDistribution: {},
          manualSessions: 0,
          calendarSessions: 0,
          currentStreak: 0,
          longestStreak: 0,
          dailySummaries: [],
          periodStart: '2025-01-01',
          periodEnd: '2025-01-07',
        },
        loading: false,
        error: null,
      })

      render(<ChildFocusModeCard familyId="family-1" childId="child-1" />)

      expect(screen.getByTestId('empty-state')).toBeInTheDocument()
      expect(screen.getByText('Ready to Focus?')).toBeInTheDocument()
    })

    it('shows start button when callback provided', () => {
      mockUseFocusModeAnalytics.mockReturnValue({
        data: { weeklySessionCount: 0 },
        loading: false,
        error: null,
      })

      const onStartFocusMode = vi.fn()
      render(
        <ChildFocusModeCard
          familyId="family-1"
          childId="child-1"
          onStartFocusMode={onStartFocusMode}
        />
      )

      expect(screen.getByTestId('start-focus-button')).toBeInTheDocument()
    })
  })

  describe('with data (AC5 & AC6 - bilateral transparency)', () => {
    const mockData: FocusModeAnalyticsData = {
      weeklySessionCount: 5,
      weeklyTotalMinutes: 150,
      weeklyAverageMinutes: 30,
      weeklyCompletionRate: 80,
      sessionCountChange: 2,
      totalMinutesChange: 30,
      completionRateChange: 5,
      peakDays: ['monday', 'wednesday'] as const,
      peakTimeOfDay: 'afternoon' as const,
      hourlyDistribution: { '14': 2, '15': 2 },
      dailyDistribution: {} as Record<string, number>,
      manualSessions: 3,
      calendarSessions: 2,
      currentStreak: 5,
      longestStreak: 7,
      dailySummaries: [],
      periodStart: '2025-01-01',
      periodEnd: '2025-01-07',
    }

    beforeEach(() => {
      mockUseFocusModeAnalytics.mockReturnValue({
        data: mockData,
        loading: false,
        error: null,
      })
    })

    it('shows session count (same as parent - AC6)', () => {
      render(<ChildFocusModeCard familyId="family-1" childId="child-1" />)

      expect(screen.getByTestId('sessions-stat')).toBeInTheDocument()
      expect(screen.getByText('5')).toBeInTheDocument()
      expect(screen.getByText('focus sessions this week')).toBeInTheDocument()
    })

    it('shows encouraging message (AC5)', () => {
      render(<ChildFocusModeCard familyId="family-1" childId="child-1" />)

      // 5 sessions should show "You're on a roll!"
      expect(screen.getByText("You're on a roll!")).toBeInTheDocument()
    })

    it('shows average duration (same as parent - AC6)', () => {
      render(<ChildFocusModeCard familyId="family-1" childId="child-1" />)

      expect(screen.getByTestId('avg-duration-stat')).toBeInTheDocument()
      expect(screen.getByText('30m')).toBeInTheDocument()
    })

    it('shows total time (same as parent - AC6)', () => {
      render(<ChildFocusModeCard familyId="family-1" childId="child-1" />)

      expect(screen.getByTestId('total-time-stat')).toBeInTheDocument()
      expect(screen.getByText('2h 30m')).toBeInTheDocument()
    })

    it('shows completion rate (same as parent - AC6)', () => {
      render(<ChildFocusModeCard familyId="family-1" childId="child-1" />)

      expect(screen.getByTestId('completion-stat')).toBeInTheDocument()
      expect(screen.getByText('80%')).toBeInTheDocument()
    })

    it('shows completion badge with positive framing (AC5)', () => {
      render(<ChildFocusModeCard familyId="family-1" childId="child-1" />)

      expect(screen.getByTestId('completion-badge')).toBeInTheDocument()
      // 80% should show "Great job!"
      expect(screen.getByText('Great job!')).toBeInTheDocument()
    })

    it('shows streak (same as parent - AC6)', () => {
      render(<ChildFocusModeCard familyId="family-1" childId="child-1" />)

      expect(screen.getByTestId('streak-stat')).toBeInTheDocument()
      expect(screen.getByText(/5 days/)).toBeInTheDocument()
    })

    it('shows peak times (same as parent - AC6)', () => {
      render(<ChildFocusModeCard familyId="family-1" childId="child-1" />)

      expect(screen.getByTestId('peak-times-stat')).toBeInTheDocument()
      expect(screen.getByText(/Your Best Focus Times/)).toBeInTheDocument()
    })
  })

  describe('bilateral transparency verification (AC6)', () => {
    it('displays exact same data values as parent card', () => {
      const data: FocusModeAnalyticsData = {
        weeklySessionCount: 7,
        weeklyTotalMinutes: 210,
        weeklyAverageMinutes: 30,
        weeklyCompletionRate: 85,
        sessionCountChange: 3,
        totalMinutesChange: 60,
        completionRateChange: 10,
        peakDays: ['tuesday', 'thursday'] as const,
        peakTimeOfDay: 'evening' as const,
        hourlyDistribution: {},
        dailyDistribution: {} as Record<string, number>,
        manualSessions: 5,
        calendarSessions: 2,
        currentStreak: 3,
        longestStreak: 10,
        dailySummaries: [],
        periodStart: '2025-01-01',
        periodEnd: '2025-01-07',
      }

      mockUseFocusModeAnalytics.mockReturnValue({
        data,
        loading: false,
        error: null,
      })

      render(<ChildFocusModeCard familyId="family-1" childId="child-1" />)

      // Verify all key metrics are displayed
      expect(screen.getByText('7')).toBeInTheDocument() // session count
      expect(screen.getByText('85%')).toBeInTheDocument() // completion rate
      expect(screen.getByText('3h 30m')).toBeInTheDocument() // total time
      expect(screen.getByText(/3 days/)).toBeInTheDocument() // streak
    })
  })
})
