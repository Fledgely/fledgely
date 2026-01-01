/**
 * Focus Mode Analytics Schema Tests - Story 33.5
 *
 * Tests for focus mode analytics schemas including:
 * - FocusModeSessionSummary
 * - FocusModeDailySummary
 * - FocusModeAnalytics
 * - Helper functions (getTimeOfDay, getDayOfWeek)
 * - Analytics messages (positive framing)
 */

import { describe, it, expect } from 'vitest'
import {
  timeOfDaySchema,
  focusModeSessionSummarySchema,
  focusModeDailySummarySchema,
  focusModeAnalyticsSchema,
  FOCUS_MODE_ANALYTICS_MESSAGES,
  getTimeOfDay,
  getDayOfWeek,
  type DayOfWeek,
  type FocusModeSessionSummary,
  type FocusModeDailySummary,
  type FocusModeAnalytics,
} from './index'

describe('Focus Mode Analytics Schemas - Story 33.5', () => {
  describe('timeOfDaySchema', () => {
    it('validates valid time of day values', () => {
      expect(timeOfDaySchema.parse('morning')).toBe('morning')
      expect(timeOfDaySchema.parse('afternoon')).toBe('afternoon')
      expect(timeOfDaySchema.parse('evening')).toBe('evening')
      expect(timeOfDaySchema.parse('night')).toBe('night')
    })

    it('rejects invalid time of day values', () => {
      expect(() => timeOfDaySchema.parse('dawn')).toThrow()
      expect(() => timeOfDaySchema.parse('midnight')).toThrow()
      expect(() => timeOfDaySchema.parse('')).toThrow()
    })
  })

  describe('focusModeSessionSummarySchema', () => {
    it('validates a complete session summary', () => {
      const session: FocusModeSessionSummary = {
        sessionId: 'session-123',
        startedAt: Date.now() - 3600000,
        endedAt: Date.now(),
        durationMinutes: 60,
        durationType: 'oneHour',
        completedFully: true,
        triggeredBy: 'manual',
        calendarEventTitle: null,
      }

      const result = focusModeSessionSummarySchema.parse(session)
      expect(result.sessionId).toBe('session-123')
      expect(result.completedFully).toBe(true)
      expect(result.triggeredBy).toBe('manual')
    })

    it('validates calendar-triggered session', () => {
      const session: FocusModeSessionSummary = {
        sessionId: 'session-456',
        startedAt: Date.now() - 1800000,
        endedAt: Date.now(),
        durationMinutes: 30,
        durationType: 'pomodoro',
        completedFully: true,
        triggeredBy: 'calendar',
        calendarEventTitle: 'Math Homework',
      }

      const result = focusModeSessionSummarySchema.parse(session)
      expect(result.triggeredBy).toBe('calendar')
      expect(result.calendarEventTitle).toBe('Math Homework')
    })

    it('validates active session with null endedAt', () => {
      const session: FocusModeSessionSummary = {
        sessionId: 'session-789',
        startedAt: Date.now(),
        endedAt: null,
        durationMinutes: 0,
        durationType: 'untilOff',
        completedFully: false,
        triggeredBy: 'manual',
        calendarEventTitle: null,
      }

      const result = focusModeSessionSummarySchema.parse(session)
      expect(result.endedAt).toBeNull()
    })
  })

  describe('focusModeDailySummarySchema', () => {
    it('validates a complete daily summary', () => {
      const summary: FocusModeDailySummary = {
        childId: 'child-123',
        familyId: 'family-456',
        date: '2025-01-01',
        sessionCount: 3,
        totalMinutes: 90,
        completedSessions: 2,
        earlyExits: 1,
        manualSessions: 2,
        calendarSessions: 1,
        sessions: [],
        updatedAt: Date.now(),
      }

      const result = focusModeDailySummarySchema.parse(summary)
      expect(result.sessionCount).toBe(3)
      expect(result.totalMinutes).toBe(90)
      expect(result.completedSessions).toBe(2)
    })

    it('validates daily summary with sessions', () => {
      const summary: FocusModeDailySummary = {
        childId: 'child-123',
        familyId: 'family-456',
        date: '2025-01-01',
        sessionCount: 1,
        totalMinutes: 25,
        completedSessions: 1,
        earlyExits: 0,
        manualSessions: 1,
        calendarSessions: 0,
        sessions: [
          {
            sessionId: 'session-1',
            startedAt: Date.now() - 1800000,
            endedAt: Date.now(),
            durationMinutes: 25,
            durationType: 'pomodoro',
            completedFully: true,
            triggeredBy: 'manual',
            calendarEventTitle: null,
          },
        ],
        updatedAt: Date.now(),
      }

      const result = focusModeDailySummarySchema.parse(summary)
      expect(result.sessions).toHaveLength(1)
      expect(result.sessions[0].sessionId).toBe('session-1')
    })

    it('uses default values for optional fields', () => {
      const summary = focusModeDailySummarySchema.parse({
        childId: 'child-123',
        familyId: 'family-456',
        date: '2025-01-01',
        updatedAt: Date.now(),
      })

      expect(summary.sessionCount).toBe(0)
      expect(summary.totalMinutes).toBe(0)
      expect(summary.sessions).toEqual([])
    })
  })

  describe('focusModeAnalyticsSchema', () => {
    it('validates complete analytics object', () => {
      const analytics: FocusModeAnalytics = {
        childId: 'child-123',
        familyId: 'family-456',
        weeklySessionCount: 5,
        weeklyTotalMinutes: 150,
        weeklyAverageMinutes: 30,
        weeklyCompletionRate: 80,
        sessionCountChange: 2,
        totalMinutesChange: 30,
        completionRateChange: 5,
        peakDays: ['monday', 'wednesday', 'friday'],
        peakTimeOfDay: 'afternoon',
        hourlyDistribution: { '14': 2, '15': 2, '16': 1 },
        dailyDistribution: { monday: 2, wednesday: 2, friday: 1 } as Record<DayOfWeek, number>,
        manualSessions: 3,
        calendarSessions: 2,
        currentStreak: 5,
        longestStreak: 7,
        computedAt: Date.now(),
        periodStart: '2024-12-25',
        periodEnd: '2025-01-01',
      }

      const result = focusModeAnalyticsSchema.parse(analytics)
      expect(result.weeklySessionCount).toBe(5)
      expect(result.weeklyCompletionRate).toBe(80)
      expect(result.peakDays).toContain('monday')
      expect(result.currentStreak).toBe(5)
    })

    it('uses default values for optional fields', () => {
      const analytics = focusModeAnalyticsSchema.parse({
        childId: 'child-123',
        familyId: 'family-456',
        computedAt: Date.now(),
        periodStart: '2024-12-25',
        periodEnd: '2025-01-01',
      })

      expect(analytics.weeklySessionCount).toBe(0)
      expect(analytics.weeklyAverageMinutes).toBe(0)
      expect(analytics.peakDays).toEqual([])
      expect(analytics.peakTimeOfDay).toBeNull()
      expect(analytics.currentStreak).toBe(0)
    })

    it('validates negative changes for week-over-week comparison', () => {
      const analytics = focusModeAnalyticsSchema.parse({
        childId: 'child-123',
        familyId: 'family-456',
        sessionCountChange: -3,
        totalMinutesChange: -60,
        completionRateChange: -10,
        computedAt: Date.now(),
        periodStart: '2024-12-25',
        periodEnd: '2025-01-01',
      })

      expect(analytics.sessionCountChange).toBe(-3)
      expect(analytics.totalMinutesChange).toBe(-60)
    })
  })

  describe('getTimeOfDay helper', () => {
    it('returns morning for 6am-12pm', () => {
      expect(getTimeOfDay(6)).toBe('morning')
      expect(getTimeOfDay(9)).toBe('morning')
      expect(getTimeOfDay(11)).toBe('morning')
    })

    it('returns afternoon for 12pm-5pm', () => {
      expect(getTimeOfDay(12)).toBe('afternoon')
      expect(getTimeOfDay(14)).toBe('afternoon')
      expect(getTimeOfDay(16)).toBe('afternoon')
    })

    it('returns evening for 5pm-9pm', () => {
      expect(getTimeOfDay(17)).toBe('evening')
      expect(getTimeOfDay(19)).toBe('evening')
      expect(getTimeOfDay(20)).toBe('evening')
    })

    it('returns night for 9pm-6am', () => {
      expect(getTimeOfDay(21)).toBe('night')
      expect(getTimeOfDay(23)).toBe('night')
      expect(getTimeOfDay(0)).toBe('night')
      expect(getTimeOfDay(5)).toBe('night')
    })
  })

  describe('getDayOfWeek helper', () => {
    it('returns correct day of week', () => {
      // January 1, 2025 is a Wednesday
      const wednesday = new Date('2025-01-01')
      expect(getDayOfWeek(wednesday)).toBe('wednesday')

      // January 5, 2025 is a Sunday
      const sunday = new Date('2025-01-05')
      expect(getDayOfWeek(sunday)).toBe('sunday')

      // January 6, 2025 is a Monday
      const monday = new Date('2025-01-06')
      expect(getDayOfWeek(monday)).toBe('monday')
    })
  })

  describe('FOCUS_MODE_ANALYTICS_MESSAGES - Positive Framing (AC5)', () => {
    describe('sessionCount messages', () => {
      it('encourages when no sessions', () => {
        const msg = FOCUS_MODE_ANALYTICS_MESSAGES.sessionCount(0, 'Emma')
        expect(msg).toContain("hasn't used focus mode yet")
        expect(msg).toContain("let's start")
        expect(msg).not.toContain('only')
        expect(msg).not.toContain('failed')
      })

      it('celebrates single session', () => {
        const msg = FOCUS_MODE_ANALYTICS_MESSAGES.sessionCount(1, 'Emma')
        expect(msg).toContain('great start')
      })

      it('encourages habit building for few sessions', () => {
        const msg = FOCUS_MODE_ANALYTICS_MESSAGES.sessionCount(3, 'Emma')
        expect(msg).toContain('building the habit')
      })

      it('celebrates high session counts', () => {
        const msg = FOCUS_MODE_ANALYTICS_MESSAGES.sessionCount(10, 'Emma')
        expect(msg).toContain('amazing dedication')
      })
    })

    describe('averageDuration messages', () => {
      it('handles zero duration', () => {
        const msg = FOCUS_MODE_ANALYTICS_MESSAGES.averageDuration(0)
        expect(msg).toBe('No focus sessions yet')
      })

      it('celebrates short durations', () => {
        const msg = FOCUS_MODE_ANALYTICS_MESSAGES.averageDuration(10)
        expect(msg).toContain('every bit counts')
      })

      it('praises longer durations', () => {
        const msg = FOCUS_MODE_ANALYTICS_MESSAGES.averageDuration(45)
        expect(msg).toContain('impressive concentration')
      })

      it('celebrates exceptional focus', () => {
        const msg = FOCUS_MODE_ANALYTICS_MESSAGES.averageDuration(90)
        expect(msg).toContain('exceptional focus')
      })
    })

    describe('completionRate messages', () => {
      it('encourages starting', () => {
        const msg = FOCUS_MODE_ANALYTICS_MESSAGES.completionRate(0)
        expect(msg).toContain('Start a focus session')
      })

      it('encourages low completion rates positively', () => {
        const msg = FOCUS_MODE_ANALYTICS_MESSAGES.completionRate(40)
        expect(msg).toContain('keep practicing')
        expect(msg).not.toContain('failed')
        expect(msg).not.toContain('only')
      })

      it('celebrates high completion rates', () => {
        const msg = FOCUS_MODE_ANALYTICS_MESSAGES.completionRate(95)
        expect(msg).toContain('outstanding commitment')
      })
    })

    describe('streak messages', () => {
      it('encourages starting a streak', () => {
        const msg = FOCUS_MODE_ANALYTICS_MESSAGES.streak(0)
        expect(msg).toContain('Start your focus streak')
      })

      it('celebrates growing streaks', () => {
        const msg = FOCUS_MODE_ANALYTICS_MESSAGES.streak(5)
        expect(msg).toContain('keep it going')
      })

      it('uses fire emoji for week-long streaks', () => {
        const msg = FOCUS_MODE_ANALYTICS_MESSAGES.streak(7)
        expect(msg).toContain('🔥')
      })

      it('uses trophy for month-long streaks', () => {
        const msg = FOCUS_MODE_ANALYTICS_MESSAGES.streak(30)
        expect(msg).toContain('🏆')
      })
    })

    describe('trend messages', () => {
      it('shows positive trends with emoji', () => {
        const msg = FOCUS_MODE_ANALYTICS_MESSAGES.trend(5, 'sessions')
        expect(msg).toContain('📈')
        expect(msg).toContain('more')
      })

      it('shows neutral for no change', () => {
        const msg = FOCUS_MODE_ANALYTICS_MESSAGES.trend(0, 'sessions')
        expect(msg).toContain('Same')
      })

      it('shows negative trends without negative emoji', () => {
        const msg = FOCUS_MODE_ANALYTICS_MESSAGES.trend(-3, 'sessions')
        expect(msg).toContain('fewer')
        expect(msg).not.toContain('📉')
        expect(msg).not.toContain('worse')
      })
    })

    describe('empty state', () => {
      it('provides encouraging empty state message', () => {
        const { title, message, cta } = FOCUS_MODE_ANALYTICS_MESSAGES.emptyState
        expect(title).toBe('Focus Mode Analytics')
        expect(message).toContain('Start using focus mode')
        expect(cta).toBe('Start Focus Session')
      })
    })

    describe('labels', () => {
      it('provides child-friendly labels', () => {
        const { labels } = FOCUS_MODE_ANALYTICS_MESSAGES
        expect(labels.thisWeek).toBe('This Week')
        expect(labels.completionRate).toBe('Completed')
        expect(labels.peakTimes).toBe('Best Times')
      })
    })
  })
})
