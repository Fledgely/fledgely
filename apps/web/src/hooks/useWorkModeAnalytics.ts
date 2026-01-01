'use client'

/**
 * useWorkModeAnalytics Hook - Story 33.6
 *
 * Real-time listener for child's work mode analytics data.
 * Computes weekly summaries, anomaly detection, and outside-schedule tracking.
 * Used by both parent and child dashboards (bilateral transparency).
 */

import { useState, useEffect, useMemo } from 'react'
import { collection, onSnapshot, orderBy, query, where } from 'firebase/firestore'
import { getFirestoreDb } from '../lib/firebase'
import type { WorkModeDailySummary, DayOfWeek } from '@fledgely/shared'
import {
  WORK_MODE_ANALYTICS_MESSAGES,
  calculateWorkHoursDeviation,
  getDayOfWeek,
  minutesToHours,
} from '@fledgely/shared'

/**
 * Computed analytics data for display
 */
export interface WorkModeAnalyticsData {
  /** Weekly session count */
  weeklySessionCount: number
  /** Weekly total hours */
  weeklyTotalHours: number
  /** Average session hours */
  weeklyAverageSessionHours: number
  /** Session count change from previous week */
  sessionCountChange: number
  /** Hours change from previous week */
  hoursChange: number
  /** Typical weekly hours (3-week baseline) */
  typicalWeeklyHours: number
  /** Deviation from typical (percentage as decimal) */
  deviationFromTypical: number
  /** Whether current week is anomalous (50%+ above typical) */
  isAnomalous: boolean
  /** Count of scheduled sessions */
  scheduledSessions: number
  /** Count of manual sessions */
  manualSessions: number
  /** Count of manual sessions outside scheduled hours */
  outsideScheduleCount: number
  /** Distribution of sessions by day of week */
  dailyDistribution: Record<DayOfWeek, number>
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
  totalHours: number
}

interface UseWorkModeAnalyticsOptions {
  familyId: string | null
  childId: string | null
  enabled?: boolean
}

interface UseWorkModeAnalyticsResult {
  data: WorkModeAnalyticsData | null
  loading: boolean
  error: string | null
  messages: typeof WORK_MODE_ANALYTICS_MESSAGES
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
 * Hook to listen for child's work mode analytics data.
 * Returns real-time analytics with trust-based messaging.
 */
export function useWorkModeAnalytics({
  familyId,
  childId,
  enabled = true,
}: UseWorkModeAnalyticsOptions): UseWorkModeAnalyticsResult {
  const [currentWeekSummaries, setCurrentWeekSummaries] = useState<WorkModeDailySummary[]>([])
  const [previousWeekSummaries, setPreviousWeekSummaries] = useState<WorkModeDailySummary[]>([])
  const [baselineWeeksSummaries, setBaselineWeeksSummaries] = useState<WorkModeDailySummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Subscribe to work mode data
  useEffect(() => {
    if (!familyId || !childId || !enabled) {
      setCurrentWeekSummaries([])
      setPreviousWeekSummaries([])
      setBaselineWeeksSummaries([])
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    const db = getFirestoreDb()
    const summaryRef = collection(db, 'families', familyId, 'workModeDailySummary', childId, 'days')

    // Query last 28 days (4 weeks for baseline + current week comparison)
    const twentyEightDaysAgo = getDateDaysAgo(28)
    const summaryQuery = query(
      summaryRef,
      where('date', '>=', twentyEightDaysAgo),
      orderBy('date', 'desc')
    )

    // Set up real-time listener
    const unsubscribe = onSnapshot(
      summaryQuery,
      (snapshot) => {
        const summaries: WorkModeDailySummary[] = []

        snapshot.forEach((doc) => {
          const data = doc.data()
          summaries.push({
            childId: data.childId || childId,
            familyId: data.familyId || familyId,
            date: data.date || doc.id,
            sessionCount: data.sessionCount ?? 0,
            totalMinutes: data.totalMinutes ?? 0,
            scheduledMinutes: data.scheduledMinutes ?? 0,
            manualMinutes: data.manualMinutes ?? 0,
            outsideScheduleCount: data.outsideScheduleCount ?? 0,
            sessions: data.sessions || [],
            updatedAt: data.updatedAt ?? Date.now(),
          })
        })

        // Split into time periods
        const sevenDaysAgo = getDateDaysAgo(7)
        const fourteenDaysAgo = getDateDaysAgo(14)

        const current = summaries.filter((s) => s.date >= sevenDaysAgo)
        const previous = summaries.filter((s) => s.date >= fourteenDaysAgo && s.date < sevenDaysAgo)
        const baseline = summaries.filter((s) => s.date < fourteenDaysAgo) // 2-4 weeks ago (excludes previous week)

        setCurrentWeekSummaries(current)
        setPreviousWeekSummaries(previous)
        setBaselineWeeksSummaries(baseline)
        setLoading(false)
      },
      (err) => {
        console.error('Error listening to work mode analytics:', err)
        setError('Failed to load work mode analytics')
        setLoading(false)
      }
    )

    return () => unsubscribe()
  }, [familyId, childId, enabled])

  // Compute analytics from daily summaries
  const data = useMemo((): WorkModeAnalyticsData | null => {
    if (currentWeekSummaries.length === 0 && !loading) {
      // Return empty data structure for empty state
      return {
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
        dailyDistribution: {} as Record<DayOfWeek, number>,
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
    const weeklyTotalHours = minutesToHours(weeklyTotalMinutes)
    const weeklyAverageSessionHours =
      weeklySessionCount > 0 ? minutesToHours(weeklyTotalMinutes / weeklySessionCount) : 0

    // Calculate session type breakdown
    const scheduledSessions = currentWeekSummaries.reduce(
      (sum, s) => sum + s.sessions.filter((sess) => sess.activationType === 'scheduled').length,
      0
    )
    const manualSessions = currentWeekSummaries.reduce(
      (sum, s) => sum + s.sessions.filter((sess) => sess.activationType === 'manual').length,
      0
    )
    const outsideScheduleCount = currentWeekSummaries.reduce(
      (sum, s) => sum + s.outsideScheduleCount,
      0
    )

    // Calculate previous week stats for comparison
    const prevSessionCount = previousWeekSummaries.reduce((sum, s) => sum + s.sessionCount, 0)
    const prevTotalMinutes = previousWeekSummaries.reduce((sum, s) => sum + s.totalMinutes, 0)
    const prevTotalHours = minutesToHours(prevTotalMinutes)

    const sessionCountChange = weeklySessionCount - prevSessionCount
    const hoursChange = weeklyTotalHours - prevTotalHours

    // Calculate baseline (3-week rolling average for anomaly detection)
    // Combine previous week + baseline weeks
    const allBaselineSummaries = [...previousWeekSummaries, ...baselineWeeksSummaries]
    const baselineTotalMinutes = allBaselineSummaries.reduce((sum, s) => sum + s.totalMinutes, 0)

    // Calculate weeks in baseline based on actual date span
    let baselineWeeksCount = 1
    if (allBaselineSummaries.length > 0) {
      const baselineDates = allBaselineSummaries.map((s) => s.date).sort()
      const oldest = baselineDates[0]
      const newest = baselineDates[baselineDates.length - 1]
      // Calculate day span between oldest and newest dates
      const oldestDate = new Date(oldest)
      const newestDate = new Date(newest)
      const daySpan =
        Math.ceil((newestDate.getTime() - oldestDate.getTime()) / (1000 * 60 * 60 * 24)) + 1
      baselineWeeksCount = Math.max(1, Math.ceil(daySpan / 7))
    }
    const typicalWeeklyMinutes = baselineTotalMinutes / baselineWeeksCount
    const typicalWeeklyHours = minutesToHours(typicalWeeklyMinutes)

    // Anomaly detection
    const { isAnomalous, deviation } = calculateWorkHoursDeviation(
      weeklyTotalHours,
      typicalWeeklyHours
    )

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

    for (const summary of currentWeekSummaries) {
      const dateParts = summary.date.split('-').map(Number)
      const date = new Date(dateParts[0], dateParts[1] - 1, dateParts[2])
      const dayOfWeek = getDayOfWeek(date)
      dailyDistribution[dayOfWeek] += summary.sessionCount
    }

    // Prepare daily summaries for charting
    const dailySummaries: DailySummaryForChart[] = currentWeekSummaries
      .map((s) => ({
        date: s.date,
        sessionCount: s.sessionCount,
        totalHours: minutesToHours(s.totalMinutes),
      }))
      .sort((a, b) => a.date.localeCompare(b.date))

    // Get period dates
    const dates = currentWeekSummaries.map((s) => s.date).sort()
    const periodStart = dates.length > 0 ? dates[0] : getDateDaysAgo(7)
    const periodEnd = dates.length > 0 ? dates[dates.length - 1] : getToday()

    return {
      weeklySessionCount,
      weeklyTotalHours,
      weeklyAverageSessionHours,
      sessionCountChange,
      hoursChange,
      typicalWeeklyHours,
      deviationFromTypical: deviation,
      isAnomalous,
      scheduledSessions,
      manualSessions,
      outsideScheduleCount,
      dailyDistribution,
      dailySummaries,
      periodStart,
      periodEnd,
    }
  }, [currentWeekSummaries, previousWeekSummaries, baselineWeeksSummaries, loading])

  return {
    data,
    loading,
    error,
    messages: WORK_MODE_ANALYTICS_MESSAGES,
  }
}

/**
 * Format hours for display
 * Example: 1.5 -> "1h 30m", 2 -> "2h", 0.5 -> "30m"
 */
export function formatWorkHours(hours: number): string {
  if (hours === 0) return '0h'

  const wholeHours = Math.floor(hours)
  const minutes = Math.round((hours - wholeHours) * 60)

  if (wholeHours === 0) return `${minutes}m`
  if (minutes === 0) return `${wholeHours}h`
  return `${wholeHours}h ${minutes}m`
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
