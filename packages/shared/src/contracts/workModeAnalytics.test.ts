/**
 * Work Mode Analytics Schema Tests - Story 33.6
 *
 * Tests for work mode analytics schemas including:
 * - WorkModeSessionSummary
 * - WorkModeDailySummary
 * - WorkModeWeeklyAnalytics
 * - WorkModeCheckIn
 * - Helper functions (calculateWorkHoursDeviation, formatWorkDuration, minutesToHours)
 * - Analytics messages (trust-based framing)
 */

import { describe, it, expect } from 'vitest'
import {
  workModeSessionSummarySchema,
  workModeDailySummarySchema,
  workModeWeeklyAnalyticsSchema,
  workModeCheckInSchema,
  WORK_MODE_ANALYTICS_MESSAGES,
  calculateWorkHoursDeviation,
  formatWorkDuration,
  minutesToHours,
  type WorkModeSessionSummary,
  type WorkModeDailySummary,
  type WorkModeWeeklyAnalytics,
  type WorkModeCheckIn,
} from './index'

describe('Work Mode Analytics Schemas - Story 33.6', () => {
  describe('workModeSessionSummarySchema', () => {
    it('validates a complete session summary', () => {
      const session: WorkModeSessionSummary = {
        sessionId: 'session-123',
        startedAt: Date.now() - 3600000,
        endedAt: Date.now(),
        durationMinutes: 60,
        activationType: 'scheduled',
        scheduleId: 'schedule-1',
        scheduleName: 'Coffee Shop Job',
        wasOutsideSchedule: false,
      }

      const result = workModeSessionSummarySchema.parse(session)
      expect(result.sessionId).toBe('session-123')
      expect(result.activationType).toBe('scheduled')
      expect(result.wasOutsideSchedule).toBe(false)
    })

    it('validates manual session with null schedule fields', () => {
      const session: WorkModeSessionSummary = {
        sessionId: 'session-456',
        startedAt: Date.now() - 1800000,
        endedAt: Date.now(),
        durationMinutes: 30,
        activationType: 'manual',
        scheduleId: null,
        scheduleName: null,
        wasOutsideSchedule: true,
      }

      const result = workModeSessionSummarySchema.parse(session)
      expect(result.activationType).toBe('manual')
      expect(result.scheduleId).toBeNull()
      expect(result.wasOutsideSchedule).toBe(true)
    })

    it('validates active session with null endedAt', () => {
      const session: WorkModeSessionSummary = {
        sessionId: 'session-789',
        startedAt: Date.now(),
        endedAt: null,
        durationMinutes: 0,
        activationType: 'manual',
        scheduleId: null,
        scheduleName: null,
        wasOutsideSchedule: false,
      }

      const result = workModeSessionSummarySchema.parse(session)
      expect(result.endedAt).toBeNull()
    })

    it('defaults wasOutsideSchedule to false', () => {
      const session = workModeSessionSummarySchema.parse({
        sessionId: 'session-1',
        startedAt: Date.now(),
        endedAt: null,
        durationMinutes: 0,
        activationType: 'scheduled',
        scheduleId: 'schedule-1',
        scheduleName: 'Job',
      })

      expect(session.wasOutsideSchedule).toBe(false)
    })
  })

  describe('workModeDailySummarySchema', () => {
    it('validates a complete daily summary', () => {
      const summary: WorkModeDailySummary = {
        childId: 'child-123',
        familyId: 'family-456',
        date: '2025-01-01',
        sessionCount: 2,
        totalMinutes: 240,
        scheduledMinutes: 180,
        manualMinutes: 60,
        outsideScheduleCount: 1,
        sessions: [],
        updatedAt: Date.now(),
      }

      const result = workModeDailySummarySchema.parse(summary)
      expect(result.sessionCount).toBe(2)
      expect(result.totalMinutes).toBe(240)
      expect(result.scheduledMinutes).toBe(180)
      expect(result.outsideScheduleCount).toBe(1)
    })

    it('validates daily summary with sessions', () => {
      const summary: WorkModeDailySummary = {
        childId: 'child-123',
        familyId: 'family-456',
        date: '2025-01-01',
        sessionCount: 1,
        totalMinutes: 120,
        scheduledMinutes: 120,
        manualMinutes: 0,
        outsideScheduleCount: 0,
        sessions: [
          {
            sessionId: 'session-1',
            startedAt: Date.now() - 7200000,
            endedAt: Date.now(),
            durationMinutes: 120,
            activationType: 'scheduled',
            scheduleId: 'schedule-1',
            scheduleName: 'Coffee Shop Job',
            wasOutsideSchedule: false,
          },
        ],
        updatedAt: Date.now(),
      }

      const result = workModeDailySummarySchema.parse(summary)
      expect(result.sessions).toHaveLength(1)
      expect(result.sessions[0].sessionId).toBe('session-1')
    })

    it('uses default values for optional fields', () => {
      const summary = workModeDailySummarySchema.parse({
        childId: 'child-123',
        familyId: 'family-456',
        date: '2025-01-01',
        updatedAt: Date.now(),
      })

      expect(summary.sessionCount).toBe(0)
      expect(summary.totalMinutes).toBe(0)
      expect(summary.scheduledMinutes).toBe(0)
      expect(summary.manualMinutes).toBe(0)
      expect(summary.outsideScheduleCount).toBe(0)
      expect(summary.sessions).toEqual([])
    })
  })

  describe('workModeWeeklyAnalyticsSchema', () => {
    it('validates complete analytics object', () => {
      const analytics: WorkModeWeeklyAnalytics = {
        childId: 'child-123',
        familyId: 'family-456',
        weeklySessionCount: 5,
        weeklyTotalHours: 20,
        weeklyAverageSessionHours: 4,
        hoursChange: 2,
        sessionCountChange: 1,
        typicalWeeklyHours: 18,
        deviationFromTypical: 0.11,
        isAnomalous: false,
        scheduledSessions: 4,
        manualSessions: 1,
        outsideScheduleCount: 1,
        dailyDistribution: { monday: 1, wednesday: 2, friday: 2 } as Record<
          'monday' | 'wednesday' | 'friday',
          number
        >,
        weekStartDate: '2024-12-30',
        weekEndDate: '2025-01-05',
        computedAt: Date.now(),
      }

      const result = workModeWeeklyAnalyticsSchema.parse(analytics)
      expect(result.weeklySessionCount).toBe(5)
      expect(result.weeklyTotalHours).toBe(20)
      expect(result.isAnomalous).toBe(false)
    })

    it('validates anomalous week detection', () => {
      const analytics = workModeWeeklyAnalyticsSchema.parse({
        childId: 'child-123',
        familyId: 'family-456',
        weeklyTotalHours: 30,
        typicalWeeklyHours: 15,
        deviationFromTypical: 1.0, // 100% above typical
        isAnomalous: true,
        weekStartDate: '2024-12-30',
        weekEndDate: '2025-01-05',
        computedAt: Date.now(),
      })

      expect(analytics.isAnomalous).toBe(true)
      expect(analytics.deviationFromTypical).toBe(1.0)
    })

    it('uses default values for optional fields', () => {
      const analytics = workModeWeeklyAnalyticsSchema.parse({
        childId: 'child-123',
        familyId: 'family-456',
        weekStartDate: '2024-12-30',
        weekEndDate: '2025-01-05',
        computedAt: Date.now(),
      })

      expect(analytics.weeklySessionCount).toBe(0)
      expect(analytics.weeklyTotalHours).toBe(0)
      expect(analytics.hoursChange).toBe(0)
      expect(analytics.typicalWeeklyHours).toBe(0)
      expect(analytics.isAnomalous).toBe(false)
      expect(analytics.scheduledSessions).toBe(0)
      expect(analytics.manualSessions).toBe(0)
      expect(analytics.outsideScheduleCount).toBe(0)
    })

    it('validates negative hoursChange for week-over-week comparison', () => {
      const analytics = workModeWeeklyAnalyticsSchema.parse({
        childId: 'child-123',
        familyId: 'family-456',
        hoursChange: -5,
        sessionCountChange: -2,
        weekStartDate: '2024-12-30',
        weekEndDate: '2025-01-05',
        computedAt: Date.now(),
      })

      expect(analytics.hoursChange).toBe(-5)
      expect(analytics.sessionCountChange).toBe(-2)
    })
  })

  describe('workModeCheckInSchema', () => {
    it('validates a complete check-in', () => {
      const checkIn: WorkModeCheckIn = {
        id: 'checkin-123',
        familyId: 'family-456',
        childId: 'child-789',
        parentId: 'parent-1',
        parentName: 'Mom',
        message: 'How was work today?',
        sentAt: Date.now(),
        readAt: null,
        response: null,
        respondedAt: null,
      }

      const result = workModeCheckInSchema.parse(checkIn)
      expect(result.id).toBe('checkin-123')
      expect(result.message).toBe('How was work today?')
      expect(result.readAt).toBeNull()
    })

    it('validates check-in with response', () => {
      const checkIn: WorkModeCheckIn = {
        id: 'checkin-456',
        familyId: 'family-456',
        childId: 'child-789',
        parentId: 'parent-1',
        parentName: 'Dad',
        message: 'Hope your shift went well!',
        sentAt: Date.now() - 3600000,
        readAt: Date.now() - 3000000,
        response: 'It was good! Learned how to make lattes.',
        respondedAt: Date.now() - 2000000,
      }

      const result = workModeCheckInSchema.parse(checkIn)
      expect(result.response).toBe('It was good! Learned how to make lattes.')
      expect(result.respondedAt).not.toBeNull()
    })

    it('rejects empty message', () => {
      expect(() =>
        workModeCheckInSchema.parse({
          id: 'checkin-1',
          familyId: 'family-1',
          childId: 'child-1',
          parentId: 'parent-1',
          parentName: 'Parent',
          message: '',
          sentAt: Date.now(),
        })
      ).toThrow()
    })

    it('rejects message over 500 characters', () => {
      expect(() =>
        workModeCheckInSchema.parse({
          id: 'checkin-1',
          familyId: 'family-1',
          childId: 'child-1',
          parentId: 'parent-1',
          parentName: 'Parent',
          message: 'a'.repeat(501),
          sentAt: Date.now(),
        })
      ).toThrow()
    })
  })

  describe('calculateWorkHoursDeviation', () => {
    it('returns not anomalous when no typical hours', () => {
      const result = calculateWorkHoursDeviation(10, 0)
      expect(result.isAnomalous).toBe(false)
      expect(result.deviation).toBe(0)
    })

    it('returns not anomalous when within 50% of typical', () => {
      const result = calculateWorkHoursDeviation(20, 15)
      expect(result.isAnomalous).toBe(false)
      expect(result.deviation).toBeCloseTo(0.333, 2)
    })

    it('returns anomalous when 50%+ above typical', () => {
      const result = calculateWorkHoursDeviation(25, 15)
      expect(result.isAnomalous).toBe(true)
      expect(result.deviation).toBeCloseTo(0.667, 2)
    })

    it('returns exact 50% as anomalous threshold', () => {
      const result = calculateWorkHoursDeviation(22.5, 15)
      expect(result.isAnomalous).toBe(false) // Exactly 50% is NOT anomalous
      expect(result.deviation).toBe(0.5)
    })

    it('returns exactly over 50% as anomalous', () => {
      const result = calculateWorkHoursDeviation(22.6, 15)
      expect(result.isAnomalous).toBe(true)
      expect(result.deviation).toBeGreaterThan(0.5)
    })

    it('returns not anomalous when hours are less than typical', () => {
      const result = calculateWorkHoursDeviation(10, 15)
      expect(result.isAnomalous).toBe(false)
      expect(result.deviation).toBeCloseTo(-0.333, 2)
    })
  })

  describe('formatWorkDuration', () => {
    it('formats 0 minutes as 0m', () => {
      expect(formatWorkDuration(0)).toBe('0m')
    })

    it('formats minutes only', () => {
      expect(formatWorkDuration(45)).toBe('45m')
    })

    it('formats hours only', () => {
      expect(formatWorkDuration(120)).toBe('2h')
    })

    it('formats hours and minutes', () => {
      expect(formatWorkDuration(90)).toBe('1h 30m')
    })

    it('formats large durations', () => {
      expect(formatWorkDuration(480)).toBe('8h')
    })
  })

  describe('minutesToHours', () => {
    it('converts 0 minutes to 0 hours', () => {
      expect(minutesToHours(0)).toBe(0)
    })

    it('converts 60 minutes to 1 hour', () => {
      expect(minutesToHours(60)).toBe(1)
    })

    it('converts 90 minutes to 1.5 hours', () => {
      expect(minutesToHours(90)).toBe(1.5)
    })

    it('rounds to one decimal place', () => {
      expect(minutesToHours(95)).toBe(1.6)
    })

    it('handles large values', () => {
      expect(minutesToHours(480)).toBe(8)
    })
  })

  describe('WORK_MODE_ANALYTICS_MESSAGES - Trust-Based Framing (AC5)', () => {
    describe('weeklyHours messages', () => {
      it('handles zero hours', () => {
        const msg = WORK_MODE_ANALYTICS_MESSAGES.weeklyHours(0, 'Jake')
        expect(msg).toContain("hasn't logged work time yet")
        expect(msg).not.toContain('suspicious')
        expect(msg).not.toContain('abuse')
      })

      it('celebrates work accomplishments', () => {
        const msg = WORK_MODE_ANALYTICS_MESSAGES.weeklyHours(10, 'Jake')
        expect(msg).toContain('worked')
        expect(msg).toContain('nice job')
      })

      it('uses friendly tone for high hours', () => {
        const msg = WORK_MODE_ANALYTICS_MESSAGES.weeklyHours(30, 'Jake')
        expect(msg).toContain("that's a lot")
        expect(msg).not.toContain('exceeded')
        expect(msg).not.toContain('violation')
      })
    })

    describe('hoursTrend messages', () => {
      it('shows neutral for no change', () => {
        const msg = WORK_MODE_ANALYTICS_MESSAGES.hoursTrend(0)
        expect(msg).toBe('Same as last week')
      })

      it('shows positive trend without alarm', () => {
        const msg = WORK_MODE_ANALYTICS_MESSAGES.hoursTrend(5)
        expect(msg).toContain('more hours')
        expect(msg).not.toContain('warning')
      })

      it('shows negative trend neutrally', () => {
        const msg = WORK_MODE_ANALYTICS_MESSAGES.hoursTrend(-3)
        expect(msg).toContain('fewer hours')
        expect(msg).not.toContain('dropped')
      })
    })

    describe('anomalyAlert messages', () => {
      it('uses supportive framing for anomalies', () => {
        const msg = WORK_MODE_ANALYTICS_MESSAGES.anomalyAlert(30, 15, 1.0)
        expect(msg).toContain('Just checking in')
        expect(msg).not.toContain('abuse')
        expect(msg).not.toContain('suspicious')
        expect(msg).not.toContain('violation')
      })

      it('includes accurate statistics', () => {
        const msg = WORK_MODE_ANALYTICS_MESSAGES.anomalyAlert(25, 15, 0.67)
        expect(msg).toContain('25.0h')
        expect(msg).toContain('15.0h')
        expect(msg).toContain('67%')
      })
    })

    describe('outsideSchedule messages', () => {
      it('uses informational tone', () => {
        const msg = WORK_MODE_ANALYTICS_MESSAGES.outsideSchedule('Jake')
        expect(msg).toContain('started work mode outside scheduled hours')
        expect(msg).not.toContain('violation')
        expect(msg).not.toContain('unauthorized')
      })
    })

    describe('checkInTemplates', () => {
      it('has friendly, non-interrogative templates', () => {
        const templates = WORK_MODE_ANALYTICS_MESSAGES.checkInTemplates
        expect(templates.length).toBeGreaterThan(0)

        for (const template of templates) {
          expect(template).not.toContain('Why')
          expect(template).not.toContain('suspicious')
          expect(template).not.toContain('caught')
        }
      })

      it('includes supportive options', () => {
        const templates = WORK_MODE_ANALYTICS_MESSAGES.checkInTemplates
        expect(templates).toContain('How was work today?')
        expect(templates).toContain('Hope your shift went well!')
      })
    })

    describe('sessionBreakdown messages', () => {
      it('handles no sessions', () => {
        const msg = WORK_MODE_ANALYTICS_MESSAGES.sessionBreakdown(0, 0)
        expect(msg).toBe('No work sessions yet')
      })

      it('shows scheduled only', () => {
        const msg = WORK_MODE_ANALYTICS_MESSAGES.sessionBreakdown(3, 0)
        expect(msg).toContain('3 scheduled sessions')
      })

      it('shows manual only', () => {
        const msg = WORK_MODE_ANALYTICS_MESSAGES.sessionBreakdown(0, 2)
        expect(msg).toContain('2 manually started sessions')
      })

      it('shows both types', () => {
        const msg = WORK_MODE_ANALYTICS_MESSAGES.sessionBreakdown(3, 2)
        expect(msg).toContain('3 scheduled')
        expect(msg).toContain('2 manual')
      })
    })

    describe('outsideScheduleInfo messages', () => {
      it('shows positive message for zero', () => {
        const msg = WORK_MODE_ANALYTICS_MESSAGES.outsideScheduleInfo(0)
        expect(msg).toBe('All sessions within scheduled hours')
      })

      it('shows singular for one', () => {
        const msg = WORK_MODE_ANALYTICS_MESSAGES.outsideScheduleInfo(1)
        expect(msg).toBe('1 session started outside scheduled hours')
      })

      it('shows plural for multiple', () => {
        const msg = WORK_MODE_ANALYTICS_MESSAGES.outsideScheduleInfo(3)
        expect(msg).toContain('3 sessions')
      })
    })

    describe('emptyState', () => {
      it('provides helpful empty state', () => {
        const { title, message, cta } = WORK_MODE_ANALYTICS_MESSAGES.emptyState
        expect(title).toBe('Work Mode Analytics')
        expect(message).toContain('will appear here')
        expect(cta).toBe('Configure Work Schedule')
      })
    })

    describe('labels', () => {
      it('has all required labels', () => {
        const { labels } = WORK_MODE_ANALYTICS_MESSAGES
        expect(labels.thisWeek).toBe('This Week')
        expect(labels.totalHours).toBe('Total Hours')
        expect(labels.sessions).toBe('Sessions')
        expect(labels.checkIn).toBe('Check In')
      })
    })

    describe('parentNotifications', () => {
      it('generates informational outside schedule notification', () => {
        const msg = WORK_MODE_ANALYTICS_MESSAGES.parentNotifications.outsideSchedule(
          'Jake',
          '3:30pm'
        )
        expect(msg).toContain('Jake')
        expect(msg).toContain('3:30pm')
        expect(msg).not.toContain('violation')
      })

      it('generates supportive anomaly notification', () => {
        const msg = WORK_MODE_ANALYTICS_MESSAGES.parentNotifications.anomalyDetected('Jake', 25, 15)
        expect(msg).toContain('Jake')
        expect(msg).toContain('25.0h')
        expect(msg).toContain('15.0h')
        expect(msg).not.toContain('abuse')
      })
    })

    describe('childTransparency', () => {
      it('explains notification rules to child', () => {
        const { childTransparency } = WORK_MODE_ANALYTICS_MESSAGES
        expect(childTransparency.outsideScheduleInfo).toContain('parents will be notified')
        expect(childTransparency.anomalyInfo).toContain('not a problem, just transparency')
        expect(childTransparency.checkInInfo).toContain('friendly check-ins')
      })
    })
  })
})
