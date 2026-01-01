/**
 * FocusModeAnalyticsCard Tests - Story 33.5
 *
 * Tests for the focus mode analytics display component.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { FocusModeAnalyticsCard } from './FocusModeAnalyticsCard'
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

describe('FocusModeAnalyticsCard - Story 33.5', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('loading state', () => {
    it('shows loading skeleton', () => {
      mockUseFocusModeAnalytics.mockReturnValue({
        data: null,
        loading: true,
        error: null,
        messages: {},
      })

      render(<FocusModeAnalyticsCard familyId="family-1" childId="child-1" childName="Emma" />)

      expect(screen.getByTestId('focus-analytics-loading')).toBeInTheDocument()
    })
  })

  describe('error state', () => {
    it('shows error message', () => {
      mockUseFocusModeAnalytics.mockReturnValue({
        data: null,
        loading: false,
        error: 'Failed to load data',
        messages: {},
      })

      render(<FocusModeAnalyticsCard familyId="family-1" childId="child-1" childName="Emma" />)

      expect(screen.getByTestId('focus-analytics-error')).toBeInTheDocument()
      expect(screen.getByText('Failed to load data')).toBeInTheDocument()
    })
  })

  describe('empty state (AC5: Positive Framing)', () => {
    it('shows encouraging empty state message', () => {
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
        messages: {},
      })

      render(<FocusModeAnalyticsCard familyId="family-1" childId="child-1" childName="Emma" />)

      expect(screen.getByTestId('focus-analytics-empty')).toBeInTheDocument()
      // Positive framing - encouraging message
      expect(
        screen.getByText(/hasn't used focus mode yet. Start a focus session/i)
      ).toBeInTheDocument()
    })
  })

  describe('with data (AC1-AC5)', () => {
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
        messages: {
          sessionCount: (count: number, name: string) =>
            `${name} used focus mode ${count} times this week!`,
          averageDuration: (mins: number) => `${mins} minute sessions - great!`,
          completionRate: (rate: number) => `${rate}% completion rate!`,
          streak: (days: number) => `${days} day streak!`,
          trend: (change: number, metric: string) => `${change} more ${metric}`,
        },
      })
    })

    it('shows session count (AC1)', () => {
      render(<FocusModeAnalyticsCard familyId="family-1" childId="child-1" childName="Emma" />)

      expect(screen.getByTestId('session-count')).toBeInTheDocument()
      expect(screen.getByText('5 sessions')).toBeInTheDocument()
    })

    it('shows duration analytics (AC2)', () => {
      render(<FocusModeAnalyticsCard familyId="family-1" childId="child-1" childName="Emma" />)

      expect(screen.getByTestId('avg-duration')).toBeInTheDocument()
      expect(screen.getByText('30m')).toBeInTheDocument() // Average duration
      expect(screen.getByTestId('total-time')).toBeInTheDocument()
      expect(screen.getByText('2h 30m')).toBeInTheDocument() // Total time
    })

    it('shows completion rate (AC4)', () => {
      render(<FocusModeAnalyticsCard familyId="family-1" childId="child-1" childName="Emma" />)

      expect(screen.getByTestId('completion-rate')).toBeInTheDocument()
      expect(screen.getByText('80%')).toBeInTheDocument()
    })

    it('shows completion badge with positive framing (AC5)', () => {
      render(<FocusModeAnalyticsCard familyId="family-1" childId="child-1" childName="Emma" />)

      expect(screen.getByTestId('completion-badge')).toBeInTheDocument()
      // 80% should show "Great follow-through!"
      expect(screen.getByText('Great follow-through!')).toBeInTheDocument()
    })

    it('shows trend indicator with positive framing (AC5)', () => {
      render(<FocusModeAnalyticsCard familyId="family-1" childId="child-1" childName="Emma" />)

      expect(screen.getByTestId('trend-indicator')).toBeInTheDocument()
      // Positive trend should be green, not red
      expect(screen.getByText(/2 more sessions than last week/)).toBeInTheDocument()
    })

    it('shows streak display', () => {
      render(<FocusModeAnalyticsCard familyId="family-1" childId="child-1" childName="Emma" />)

      expect(screen.getByTestId('streak-display')).toBeInTheDocument()
      expect(screen.getByText(/5 day streak/)).toBeInTheDocument()
    })

    it('shows peak times (AC3)', () => {
      render(<FocusModeAnalyticsCard familyId="family-1" childId="child-1" childName="Emma" />)

      expect(screen.getByTestId('peak-times')).toBeInTheDocument()
      expect(screen.getByText(/Best Focus Times/)).toBeInTheDocument()
    })

    it('shows session type breakdown', () => {
      render(<FocusModeAnalyticsCard familyId="family-1" childId="child-1" childName="Emma" />)

      expect(screen.getByTestId('session-breakdown')).toBeInTheDocument()
      expect(screen.getByText('Manual')).toBeInTheDocument()
      expect(screen.getByText('Calendar')).toBeInTheDocument()
    })
  })

  describe('completion badge positive framing (AC5)', () => {
    it('shows outstanding message for 95% completion', () => {
      mockUseFocusModeAnalytics.mockReturnValue({
        data: {
          weeklySessionCount: 10,
          weeklyTotalMinutes: 300,
          weeklyAverageMinutes: 30,
          weeklyCompletionRate: 95,
          sessionCountChange: 0,
          totalMinutesChange: 0,
          completionRateChange: 0,
          peakDays: [],
          peakTimeOfDay: null,
          hourlyDistribution: {},
          dailyDistribution: {},
          manualSessions: 10,
          calendarSessions: 0,
          currentStreak: 0,
          longestStreak: 0,
          dailySummaries: [],
          periodStart: '2025-01-01',
          periodEnd: '2025-01-07',
        },
        loading: false,
        error: null,
        messages: {
          sessionCount: () => 'Great!',
          averageDuration: () => 'Nice!',
        },
      })

      render(<FocusModeAnalyticsCard familyId="family-1" childId="child-1" childName="Emma" />)

      expect(screen.getByText('Outstanding commitment!')).toBeInTheDocument()
    })

    it('shows building habit message for 50% completion', () => {
      mockUseFocusModeAnalytics.mockReturnValue({
        data: {
          weeklySessionCount: 4,
          weeklyTotalMinutes: 120,
          weeklyAverageMinutes: 30,
          weeklyCompletionRate: 50,
          sessionCountChange: 0,
          totalMinutesChange: 0,
          completionRateChange: 0,
          peakDays: [],
          peakTimeOfDay: null,
          hourlyDistribution: {},
          dailyDistribution: {},
          manualSessions: 4,
          calendarSessions: 0,
          currentStreak: 0,
          longestStreak: 0,
          dailySummaries: [],
          periodStart: '2025-01-01',
          periodEnd: '2025-01-07',
        },
        loading: false,
        error: null,
        messages: {
          sessionCount: () => 'Good!',
          averageDuration: () => 'Nice!',
        },
      })

      render(<FocusModeAnalyticsCard familyId="family-1" childId="child-1" childName="Emma" />)

      expect(screen.getByText('Building the habit!')).toBeInTheDocument()
    })
  })
})
