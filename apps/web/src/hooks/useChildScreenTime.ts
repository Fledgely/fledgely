'use client'

/**
 * useChildScreenTime Hook - Story 29.4
 *
 * Real-time listener for child's screen time data.
 * Used by dashboard to display screen time summaries.
 */

import { useState, useEffect, useMemo } from 'react'
import { collection, onSnapshot, orderBy, query, limit, where } from 'firebase/firestore'
import { getFirestoreDb } from '../lib/firebase'
import type {
  ScreenTimeDailySummary,
  ScreenTimeCategory,
  CategoryTimeEntry,
} from '@fledgely/shared'

/**
 * Screen time data for display
 */
export interface ScreenTimeData {
  /** Total minutes today */
  todayMinutes: number
  /** Today's category breakdown */
  todayCategories: CategoryTimeEntry[]
  /** Today's device breakdown */
  todayDevices: {
    deviceId: string
    deviceName: string
    deviceType: string
    minutes: number
  }[]
  /** Last 7 days summaries for trend chart */
  weeklyData: DailyScreenTime[]
  /** Average daily minutes over last 7 days */
  weeklyAverage: number
  /** Change from yesterday (positive = more, negative = less) */
  changeFromYesterday: number
}

export interface DailyScreenTime {
  date: string
  totalMinutes: number
  categories: CategoryTimeEntry[]
}

interface UseChildScreenTimeOptions {
  familyId: string | null
  childId: string | null
  enabled?: boolean
}

interface UseChildScreenTimeResult {
  data: ScreenTimeData | null
  loading: boolean
  error: string | null
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
 * Hook to listen for child's screen time data.
 * Returns real-time screen time summaries.
 */
export function useChildScreenTime({
  familyId,
  childId,
  enabled = true,
}: UseChildScreenTimeOptions): UseChildScreenTimeResult {
  const [dailySummaries, setDailySummaries] = useState<ScreenTimeDailySummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!familyId || !childId || !enabled) {
      setDailySummaries([])
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    const db = getFirestoreDb()
    const screenTimeRef = collection(db, 'families', familyId, 'children', childId, 'screenTime')

    // Query last 7 days of data ordered by date descending
    const sevenDaysAgo = getDateDaysAgo(7)
    const screenTimeQuery = query(
      screenTimeRef,
      where('date', '>=', sevenDaysAgo),
      orderBy('date', 'desc'),
      limit(7)
    )

    // Set up real-time listener
    const unsubscribe = onSnapshot(
      screenTimeQuery,
      (snapshot) => {
        const summaries: ScreenTimeDailySummary[] = []

        snapshot.forEach((doc) => {
          const data = doc.data()
          summaries.push({
            childId: data.childId || childId,
            date: data.date || doc.id,
            timezone: data.timezone || 'America/New_York',
            totalMinutes: data.totalMinutes ?? 0,
            devices: data.devices || [],
            categories: data.categories || [],
            updatedAt: data.updatedAt ?? Date.now(),
            expiresAt: data.expiresAt,
          })
        })

        setDailySummaries(summaries)
        setLoading(false)
      },
      (err) => {
        console.error('Error listening to screen time:', err)
        setError('Failed to load screen time data')
        setLoading(false)
      }
    )

    return () => unsubscribe()
  }, [familyId, childId, enabled])

  // Process data into display format
  const data = useMemo((): ScreenTimeData | null => {
    if (dailySummaries.length === 0 && !loading) {
      // Return empty data structure
      return {
        todayMinutes: 0,
        todayCategories: [],
        todayDevices: [],
        weeklyData: [],
        weeklyAverage: 0,
        changeFromYesterday: 0,
      }
    }

    if (dailySummaries.length === 0) {
      return null
    }

    const today = getToday()
    const yesterday = getDateDaysAgo(1)

    // Find today's summary
    const todaySummary = dailySummaries.find((s) => s.date === today)
    const yesterdaySummary = dailySummaries.find((s) => s.date === yesterday)

    // Build weekly data (sorted by date ascending for chart)
    const weeklyData: DailyScreenTime[] = dailySummaries
      .map((s) => ({
        date: s.date,
        totalMinutes: s.totalMinutes,
        categories: s.categories,
      }))
      .sort((a, b) => a.date.localeCompare(b.date))

    // Calculate weekly average
    const totalMinutesWeek = dailySummaries.reduce((sum, s) => sum + s.totalMinutes, 0)
    const weeklyAverage =
      dailySummaries.length > 0 ? Math.round(totalMinutesWeek / dailySummaries.length) : 0

    // Calculate change from yesterday
    const todayMinutes = todaySummary?.totalMinutes ?? 0
    const yesterdayMinutes = yesterdaySummary?.totalMinutes ?? 0
    const changeFromYesterday = todayMinutes - yesterdayMinutes

    return {
      todayMinutes,
      todayCategories: todaySummary?.categories ?? [],
      todayDevices:
        todaySummary?.devices.map((d) => ({
          deviceId: d.deviceId,
          deviceName: d.deviceName,
          deviceType: d.deviceType,
          minutes: d.minutes,
        })) ?? [],
      weeklyData,
      weeklyAverage,
      changeFromYesterday,
    }
  }, [dailySummaries, loading])

  return {
    data,
    loading,
    error,
  }
}

/**
 * Format minutes as hours and minutes string
 * Example: 90 -> "1h 30m", 45 -> "45m", 120 -> "2h"
 */
export function formatDuration(minutes: number): string {
  if (minutes === 0) return '0m'

  const hours = Math.floor(minutes / 60)
  const mins = Math.round(minutes % 60)

  if (hours === 0) return `${mins}m`
  if (mins === 0) return `${hours}h`
  return `${hours}h ${mins}m`
}

/**
 * Get color for screen time category
 */
export function getCategoryColor(category: ScreenTimeCategory): string {
  // WCAG 2.1 AA compliant colors (3:1 minimum contrast ratio for UI components)
  const colors: Record<ScreenTimeCategory, string> = {
    education: '#16a34a', // green-600 (3.4:1 ratio)
    productivity: '#3b82f6', // blue-500 (3.68:1 ratio)
    entertainment: '#d97706', // amber-600 (3.2:1 ratio)
    social_media: '#ec4899', // pink-500 (3.53:1 ratio)
    gaming: '#8b5cf6', // purple-500 (4.23:1 ratio)
    communication: '#0891b2', // cyan-600 (3.5:1 ratio)
    news: '#6366f1', // indigo-500 (4.47:1 ratio)
    shopping: '#0d9488', // teal-600 (3.1:1 ratio)
    other: '#6b7280', // gray-500 (4.6:1 ratio)
  }
  return colors[category] || colors.other
}

/**
 * Get display label for screen time category
 */
export function getCategoryLabel(category: ScreenTimeCategory): string {
  const labels: Record<ScreenTimeCategory, string> = {
    education: 'Education',
    productivity: 'Productivity',
    entertainment: 'Entertainment',
    social_media: 'Social Media',
    gaming: 'Gaming',
    communication: 'Communication',
    news: 'News',
    shopping: 'Shopping',
    other: 'Other',
  }
  return labels[category] || 'Other'
}
