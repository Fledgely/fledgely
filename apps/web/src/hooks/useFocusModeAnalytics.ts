'use client'

/**
 * useFocusModeAnalytics Hook - Story 33.5
 *
 * Real-time listener for child's focus mode analytics data.
 * Used by both parent and child dashboards (bilateral transparency).
 * Provides weekly summaries, timing patterns, and positive framing.
 */

import { useState, useEffect, useMemo } from 'react'
import { collection, onSnapshot, orderBy, query, where } from 'firebase/firestore'
import { getFirestoreDb } from '../lib/firebase'
import type { FocusModeDailySummary, TimeOfDay, DayOfWeek } from '@fledgely/shared'
import { FOCUS_MODE_ANALYTICS_MESSAGES, getTimeOfDay, getDayOfWeek } from '@fledgely/shared'

/**
 * Computed analytics data for display
 */
export interface FocusModeAnalyticsData {
  /** Weekly session count */
  weeklySessionCount: number
  /** Weekly total minutes */
  weeklyTotalMinutes: number
  /** Average session duration in minutes */
  weeklyAverageMinutes: number
  /** Weekly completion rate (0-100) */
  weeklyCompletionRate: number
  /** Session count change from previous week */
  sessionCountChange: number
  /** Total minutes change from previous week */
  totalMinutesChange: number
  /** Completion rate change from previous week */
  completionRateChange: number
  /** Days with most focus sessions */
  peakDays: DayOfWeek[]
  /** Time of day with most focus sessions */
  peakTimeOfDay: TimeOfDay | null
  /** Distribution of sessions by hour (0-23) */
  hourlyDistribution: Record<string, number>
  /** Distribution of sessions by day of week */
  dailyDistribution: Record<DayOfWeek, number>
  /** Count of manual sessions */
  manualSessions: number
  /** Count of calendar-triggered sessions */
  calendarSessions: number
  /** Current streak in days */
  currentStreak: number
  /** Longest streak ever */
  longestStreak: number
  /** Daily summaries for charting */
  dailySummaries: DailySummaryForChart[]
  /** Analytics period start date */
  periodStart: string
  /** Analytics period end date */
  periodEnd: string
}

export interface DailySummaryForChart {
  date: string
  sessionCount: number
  totalMinutes: number
  completedSessions: number
}

interface UseFocusModeAnalyticsOptions {
  familyId: string | null
  childId: string | null
  enabled?: boolean
}

interface UseFocusModeAnalyticsResult {
  data: FocusModeAnalyticsData | null
  loading: boolean
  error: string | null
  messages: typeof FOCUS_MODE_ANALYTICS_MESSAGES
}

/**
 * Get browser's timezone or fallback to America/New_York
 */
function getBrowserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone
  } catch {
    return 'America/New_York'
  }
}

/**
 * Get today's date in YYYY-MM-DD format
 */
function getToday(timezone?: string): string {
  const tz = timezone || getBrowserTimezone()
  try {
    return new Date().toLocaleDateString('en-CA', { timeZone: tz })
  } catch {
    return new Date().toISOString().split('T')[0]
  }
}

/**
 * Get date N days ago in YYYY-MM-DD format
 */
function getDateDaysAgo(days: number, timezone?: string): string {
  const tz = timezone || getBrowserTimezone()
  const date = new Date()
  date.setDate(date.getDate() - days)
  try {
    return date.toLocaleDateString('en-CA', { timeZone: tz })
  } catch {
    return date.toISOString().split('T')[0]
  }
}

/**
 * Calculate peak days from daily distribution
 */
function calculatePeakDays(distribution: Record<DayOfWeek, number>): DayOfWeek[] {
  const entries = Object.entries(distribution) as [DayOfWeek, number][]
  if (entries.length === 0) return []

  const maxCount = Math.max(...entries.map(([, count]) => count))
  if (maxCount === 0) return []

  return entries.filter(([, count]) => count === maxCount).map(([day]) => day)
}

/**
 * Calculate peak time of day from hourly distribution
 */
function calculatePeakTimeOfDay(hourlyDist: Record<string, number>): TimeOfDay | null {
  const timeDistribution: Record<TimeOfDay, number> = {
    morning: 0,
    afternoon: 0,
    evening: 0,
    night: 0,
  }

  for (const [hourStr, count] of Object.entries(hourlyDist)) {
    const hour = parseInt(hourStr, 10)
    if (!isNaN(hour) && count > 0) {
      const timeOfDay = getTimeOfDay(hour)
      timeDistribution[timeOfDay] += count
    }
  }

  const maxCount = Math.max(...Object.values(timeDistribution))
  if (maxCount === 0) return null

  const entries = Object.entries(timeDistribution) as [TimeOfDay, number][]
  const peak = entries.find(([, count]) => count === maxCount)
  return peak ? peak[0] : null
}

/**
 * Calculate current streak from daily summaries
 */
function calculateCurrentStreak(summaries: FocusModeDailySummary[]): number {
  if (summaries.length === 0) return 0

  // Sort by date descending
  const sorted = [...summaries].sort((a, b) => b.date.localeCompare(a.date))

  const today = getToday()
  const yesterday = getDateDaysAgo(1)

  let streak = 0
  let expectedDate = today

  // Allow streak to start from either today or yesterday
  if (sorted[0]?.date === yesterday) {
    expectedDate = yesterday
  }

  for (const summary of sorted) {
    if (summary.date === expectedDate && summary.sessionCount > 0) {
      streak++
      // Calculate previous expected date
      const dateParts = expectedDate.split('-').map(Number)
      const date = new Date(dateParts[0], dateParts[1] - 1, dateParts[2])
      date.setDate(date.getDate() - 1)
      expectedDate = date.toISOString().split('T')[0]
    } else if (summary.date === expectedDate && summary.sessionCount === 0) {
      // Day with no sessions breaks the streak
      break
    } else if (summary.date < expectedDate) {
      // Gap in data, check if this date is expected
      const dateParts = expectedDate.split('-').map(Number)
      const currentDate = new Date(dateParts[0], dateParts[1] - 1, dateParts[2])
      const summaryDate = new Date(summary.date)

      // If there's a gap where we expect consecutive days, streak is broken
      const dayDiff = Math.floor(
        (currentDate.getTime() - summaryDate.getTime()) / (1000 * 60 * 60 * 24)
      )
      if (dayDiff > 1) {
        break
      }
    }
  }

  return streak
}

/**
 * Hook to listen for child's focus mode analytics data.
 * Returns real-time analytics with positive framing messages.
 */
export function useFocusModeAnalytics({
  familyId,
  childId,
  enabled = true,
}: UseFocusModeAnalyticsOptions): UseFocusModeAnalyticsResult {
  const [currentWeekSummaries, setCurrentWeekSummaries] = useState<FocusModeDailySummary[]>([])
  const [previousWeekSummaries, setPreviousWeekSummaries] = useState<FocusModeDailySummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Subscribe to current week data
  useEffect(() => {
    if (!familyId || !childId || !enabled) {
      setCurrentWeekSummaries([])
      setPreviousWeekSummaries([])
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    const db = getFirestoreDb()
    const summaryRef = collection(
      db,
      'families',
      familyId,
      'focusModeDailySummary',
      childId,
      'days'
    )

    // Query last 14 days (current week + previous week for comparison)
    const fourteenDaysAgo = getDateDaysAgo(14)
    const summaryQuery = query(
      summaryRef,
      where('date', '>=', fourteenDaysAgo),
      orderBy('date', 'desc')
    )

    // Set up real-time listener
    const unsubscribe = onSnapshot(
      summaryQuery,
      (snapshot) => {
        const summaries: FocusModeDailySummary[] = []

        snapshot.forEach((doc) => {
          const data = doc.data()
          summaries.push({
            childId: data.childId || childId,
            familyId: data.familyId || familyId,
            date: data.date || doc.id,
            sessionCount: data.sessionCount ?? 0,
            totalMinutes: data.totalMinutes ?? 0,
            completedSessions: data.completedSessions ?? 0,
            earlyExits: data.earlyExits ?? 0,
            manualSessions: data.manualSessions ?? 0,
            calendarSessions: data.calendarSessions ?? 0,
            sessions: data.sessions || [],
            updatedAt: data.updatedAt ?? Date.now(),
          })
        })

        // Split into current week and previous week
        const sevenDaysAgo = getDateDaysAgo(7)
        const current = summaries.filter((s) => s.date >= sevenDaysAgo)
        const previous = summaries.filter((s) => s.date < sevenDaysAgo)

        setCurrentWeekSummaries(current)
        setPreviousWeekSummaries(previous)
        setLoading(false)
      },
      (err) => {
        console.error('Error listening to focus mode analytics:', err)
        setError('Failed to load focus mode analytics')
        setLoading(false)
      }
    )

    return () => unsubscribe()
  }, [familyId, childId, enabled])

  // Compute analytics from daily summaries
  const data = useMemo((): FocusModeAnalyticsData | null => {
    if (currentWeekSummaries.length === 0 && !loading) {
      // Return empty data structure for empty state
      return {
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
        dailyDistribution: {} as Record<DayOfWeek, number>,
        manualSessions: 0,
        calendarSessions: 0,
        currentStreak: 0,
        longestStreak: 0,
        dailySummaries: [],
        periodStart: getDateDaysAgo(7),
        periodEnd: getToday(),
      }
    }

    if (currentWeekSummaries.length === 0) {
      return null
    }

    // Calculate current week stats
    const weeklySessionCount = currentWeekSummaries.reduce((sum, s) => sum + s.sessionCount, 0)
    const weeklyTotalMinutes = currentWeekSummaries.reduce((sum, s) => sum + s.totalMinutes, 0)
    const weeklyCompletedSessions = currentWeekSummaries.reduce(
      (sum, s) => sum + s.completedSessions,
      0
    )
    const weeklyAverageMinutes =
      weeklySessionCount > 0 ? Math.round(weeklyTotalMinutes / weeklySessionCount) : 0
    const weeklyCompletionRate =
      weeklySessionCount > 0 ? Math.round((weeklyCompletedSessions / weeklySessionCount) * 100) : 0

    // Calculate previous week stats for comparison
    const prevSessionCount = previousWeekSummaries.reduce((sum, s) => sum + s.sessionCount, 0)
    const prevTotalMinutes = previousWeekSummaries.reduce((sum, s) => sum + s.totalMinutes, 0)
    const prevCompletedSessions = previousWeekSummaries.reduce(
      (sum, s) => sum + s.completedSessions,
      0
    )
    const prevCompletionRate =
      prevSessionCount > 0 ? Math.round((prevCompletedSessions / prevSessionCount) * 100) : 0

    const sessionCountChange = weeklySessionCount - prevSessionCount
    const totalMinutesChange = weeklyTotalMinutes - prevTotalMinutes
    const completionRateChange = weeklyCompletionRate - prevCompletionRate

    // Calculate daily distribution
    const dailyDistribution: Record<DayOfWeek, number> = {
      sunday: 0,
      monday: 0,
      tuesday: 0,
      wednesday: 0,
      thursday: 0,
      friday: 0,
      saturday: 0,
    }

    // Calculate hourly distribution
    const hourlyDistribution: Record<string, number> = {}

    // Aggregate from sessions
    let manualSessions = 0
    let calendarSessions = 0

    for (const summary of currentWeekSummaries) {
      // Get day of week for this date
      const dateParts = summary.date.split('-').map(Number)
      const date = new Date(dateParts[0], dateParts[1] - 1, dateParts[2])
      const dayOfWeek = getDayOfWeek(date)
      dailyDistribution[dayOfWeek] += summary.sessionCount

      // Count manual vs calendar sessions
      manualSessions += summary.manualSessions
      calendarSessions += summary.calendarSessions

      // Aggregate hourly distribution from sessions
      for (const session of summary.sessions) {
        const sessionDate = new Date(session.startedAt)
        const hour = sessionDate.getHours().toString()
        hourlyDistribution[hour] = (hourlyDistribution[hour] || 0) + 1
      }
    }

    // Calculate peaks
    const peakDays = calculatePeakDays(dailyDistribution)
    const peakTimeOfDay = calculatePeakTimeOfDay(hourlyDistribution)

    // Calculate streaks
    const currentStreak = calculateCurrentStreak(currentWeekSummaries)
    // Note: longestStreak would need full history, for now use max of current
    const longestStreak = Math.max(currentStreak, 0)

    // Prepare daily summaries for charting
    const dailySummaries: DailySummaryForChart[] = currentWeekSummaries
      .map((s) => ({
        date: s.date,
        sessionCount: s.sessionCount,
        totalMinutes: s.totalMinutes,
        completedSessions: s.completedSessions,
      }))
      .sort((a, b) => a.date.localeCompare(b.date))

    // Get period dates
    const dates = currentWeekSummaries.map((s) => s.date).sort()
    const periodStart = dates.length > 0 ? dates[0] : getDateDaysAgo(7)
    const periodEnd = dates.length > 0 ? dates[dates.length - 1] : getToday()

    return {
      weeklySessionCount,
      weeklyTotalMinutes,
      weeklyAverageMinutes,
      weeklyCompletionRate,
      sessionCountChange,
      totalMinutesChange,
      completionRateChange,
      peakDays,
      peakTimeOfDay,
      hourlyDistribution,
      dailyDistribution,
      manualSessions,
      calendarSessions,
      currentStreak,
      longestStreak,
      dailySummaries,
      periodStart,
      periodEnd,
    }
  }, [currentWeekSummaries, previousWeekSummaries, loading])

  return {
    data,
    loading,
    error,
    messages: FOCUS_MODE_ANALYTICS_MESSAGES,
  }
}

/**
 * Format minutes as hours and minutes string
 * Example: 90 -> "1h 30m", 45 -> "45m", 120 -> "2h"
 */
export function formatFocusDuration(minutes: number): string {
  if (minutes === 0) return '0m'

  const hours = Math.floor(minutes / 60)
  const mins = Math.round(minutes % 60)

  if (hours === 0) return `${mins}m`
  if (mins === 0) return `${hours}h`
  return `${hours}h ${mins}m`
}

/**
 * Get display label for day of week
 */
export function getDayLabel(day: DayOfWeek): string {
  const labels: Record<DayOfWeek, string> = {
    sunday: 'Sun',
    monday: 'Mon',
    tuesday: 'Tue',
    wednesday: 'Wed',
    thursday: 'Thu',
    friday: 'Fri',
    saturday: 'Sat',
  }
  return labels[day] || day
}

/**
 * Get display label for time of day
 */
export function getTimeOfDayLabel(timeOfDay: TimeOfDay): string {
  const labels: Record<TimeOfDay, string> = {
    morning: 'Morning (6am-12pm)',
    afternoon: 'Afternoon (12pm-5pm)',
    evening: 'Evening (5pm-9pm)',
    night: 'Night (9pm-6am)',
  }
  return labels[timeOfDay] || timeOfDay
}
