/**
 * useOfflineTimeStreak Hook - Story 32.6
 *
 * Manages offline time streak data and calculations.
 * Provides streak counter, weekly summary, and milestone tracking.
 */

import { useState, useEffect, useCallback } from 'react'
import { doc, onSnapshot, setDoc, updateDoc } from 'firebase/firestore'
import { getFirestoreDb } from '../lib/firebase'
import type { OfflineStreak, StreakMilestones } from '@fledgely/shared'
import { STREAK_MILESTONE_DAYS } from '@fledgely/shared'

interface UseOfflineTimeStreakOptions {
  familyId: string | null
}

interface UseOfflineTimeStreakReturn {
  streak: OfflineStreak | null
  loading: boolean
  error: string | null
  // Actions
  incrementStreak: (hoursCompleted: number) => Promise<void>
  resetStreak: () => Promise<void>
  toggleLeaderboardOptIn: () => Promise<void>
  dismissCelebration: () => void
  // Computed values
  daysToNextMilestone: number | null
  nextMilestone: number | null
  hasNewMilestone: boolean
  celebrationMilestone: number | null
}

const DEFAULT_STREAK: Omit<OfflineStreak, 'familyId'> = {
  currentStreak: 0,
  longestStreak: 0,
  lastCompletedDate: null,
  weeklyHours: 0,
  weeklyStartDate: getWeekStart(Date.now()),
  milestones: {
    sevenDays: false,
    thirtyDays: false,
    hundredDays: false,
  },
  leaderboardOptIn: false,
  updatedAt: Date.now(),
}

/**
 * Get the start of the current week (Sunday at midnight)
 */
function getWeekStart(timestamp: number): number {
  const date = new Date(timestamp)
  const day = date.getDay()
  date.setHours(0, 0, 0, 0)
  date.setDate(date.getDate() - day)
  return date.getTime()
}

/**
 * Check if a date is yesterday relative to a reference date
 */
function isYesterday(checkDate: number, referenceDate: number): boolean {
  const check = new Date(checkDate)
  const ref = new Date(referenceDate)

  check.setHours(0, 0, 0, 0)
  ref.setHours(0, 0, 0, 0)

  const diffDays = Math.floor((ref.getTime() - check.getTime()) / (24 * 60 * 60 * 1000))
  return diffDays === 1
}

/**
 * Check if a date is today
 */
function isToday(checkDate: number, referenceDate: number): boolean {
  const check = new Date(checkDate)
  const ref = new Date(referenceDate)

  return (
    check.getFullYear() === ref.getFullYear() &&
    check.getMonth() === ref.getMonth() &&
    check.getDate() === ref.getDate()
  )
}

/**
 * Calculate which milestones have been achieved
 */
function calculateMilestones(currentStreak: number): StreakMilestones {
  return {
    sevenDays: currentStreak >= STREAK_MILESTONE_DAYS.seven,
    thirtyDays: currentStreak >= STREAK_MILESTONE_DAYS.thirty,
    hundredDays: currentStreak >= STREAK_MILESTONE_DAYS.hundred,
  }
}

/**
 * Find the next milestone and days to reach it
 */
function findNextMilestone(currentStreak: number): { milestone: number; daysToGo: number } | null {
  const milestones = [
    STREAK_MILESTONE_DAYS.seven,
    STREAK_MILESTONE_DAYS.thirty,
    STREAK_MILESTONE_DAYS.hundred,
  ]

  for (const milestone of milestones) {
    if (currentStreak < milestone) {
      return {
        milestone,
        daysToGo: milestone - currentStreak,
      }
    }
  }

  return null
}

export function useOfflineTimeStreak({
  familyId,
}: UseOfflineTimeStreakOptions): UseOfflineTimeStreakReturn {
  const [streak, setStreak] = useState<OfflineStreak | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [celebrationMilestone, setCelebrationMilestone] = useState<number | null>(null)

  // Subscribe to streak document
  useEffect(() => {
    if (!familyId) {
      setLoading(false)
      return
    }

    const streakRef = doc(getFirestoreDb(), 'families', familyId, 'settings', 'offlineStreak')

    const unsubscribe = onSnapshot(
      streakRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data() as OfflineStreak

          // Check if weekly hours need reset (new week)
          const currentWeekStart = getWeekStart(Date.now())
          if (data.weeklyStartDate < currentWeekStart) {
            // Reset weekly hours for new week
            updateDoc(streakRef, {
              weeklyHours: 0,
              weeklyStartDate: currentWeekStart,
              updatedAt: Date.now(),
            })
          }

          setStreak(data)
        } else {
          // Initialize streak document
          const initialStreak: OfflineStreak = {
            ...DEFAULT_STREAK,
            familyId,
            weeklyStartDate: getWeekStart(Date.now()),
            updatedAt: Date.now(),
          }
          setDoc(streakRef, initialStreak)
          setStreak(initialStreak)
        }
        setLoading(false)
      },
      (err) => {
        console.error('[useOfflineTimeStreak] Error:', err)
        setError('Failed to load streak data')
        setLoading(false)
      }
    )

    return () => unsubscribe()
  }, [familyId])

  // Increment streak (called when offline time is completed)
  const incrementStreak = useCallback(
    async (hoursCompleted: number) => {
      if (!familyId || !streak) return

      const now = Date.now()
      const streakRef = doc(getFirestoreDb(), 'families', familyId, 'settings', 'offlineStreak')

      let newCurrentStreak = streak.currentStreak

      // Check if this is consecutive (yesterday or same day)
      if (streak.lastCompletedDate) {
        if (isYesterday(streak.lastCompletedDate, now)) {
          // Consecutive day - increment streak
          newCurrentStreak = streak.currentStreak + 1
        } else if (isToday(streak.lastCompletedDate, now)) {
          // Already completed today - just update hours
          newCurrentStreak = streak.currentStreak
        } else {
          // Streak broken - reset to 1
          newCurrentStreak = 1
        }
      } else {
        // First completion
        newCurrentStreak = 1
      }

      const newMilestones = calculateMilestones(newCurrentStreak)

      // Check if a new milestone was reached
      if (
        (newMilestones.sevenDays && !streak.milestones.sevenDays) ||
        (newMilestones.thirtyDays && !streak.milestones.thirtyDays) ||
        (newMilestones.hundredDays && !streak.milestones.hundredDays)
      ) {
        // Determine which milestone was just reached
        if (newMilestones.hundredDays && !streak.milestones.hundredDays) {
          setCelebrationMilestone(100)
        } else if (newMilestones.thirtyDays && !streak.milestones.thirtyDays) {
          setCelebrationMilestone(30)
        } else if (newMilestones.sevenDays && !streak.milestones.sevenDays) {
          setCelebrationMilestone(7)
        }
      }

      const currentWeekStart = getWeekStart(now)
      const newWeeklyHours =
        streak.weeklyStartDate < currentWeekStart
          ? hoursCompleted // New week
          : streak.weeklyHours + hoursCompleted

      const updates: Partial<OfflineStreak> = {
        currentStreak: newCurrentStreak,
        longestStreak: Math.max(newCurrentStreak, streak.longestStreak),
        lastCompletedDate: now,
        weeklyHours: newWeeklyHours,
        weeklyStartDate: currentWeekStart,
        milestones: newMilestones,
        updatedAt: now,
      }

      await updateDoc(streakRef, updates)
    },
    [familyId, streak]
  )

  // Reset streak (manually, or due to missed day)
  const resetStreak = useCallback(async () => {
    if (!familyId) return

    const streakRef = doc(getFirestoreDb(), 'families', familyId, 'settings', 'offlineStreak')

    await updateDoc(streakRef, {
      currentStreak: 0,
      lastCompletedDate: null,
      updatedAt: Date.now(),
    })
  }, [familyId])

  // Toggle leaderboard opt-in
  const toggleLeaderboardOptIn = useCallback(async () => {
    if (!familyId || !streak) return

    const streakRef = doc(getFirestoreDb(), 'families', familyId, 'settings', 'offlineStreak')

    await updateDoc(streakRef, {
      leaderboardOptIn: !streak.leaderboardOptIn,
      updatedAt: Date.now(),
    })
  }, [familyId, streak])

  // Dismiss celebration overlay
  const dismissCelebration = useCallback(() => {
    setCelebrationMilestone(null)
  }, [])

  // Calculate computed values
  const nextMilestoneInfo = streak ? findNextMilestone(streak.currentStreak) : null
  const hasNewMilestone = celebrationMilestone !== null

  return {
    streak,
    loading,
    error,
    incrementStreak,
    resetStreak,
    toggleLeaderboardOptIn,
    dismissCelebration,
    daysToNextMilestone: nextMilestoneInfo?.daysToGo ?? null,
    nextMilestone: nextMilestoneInfo?.milestone ?? null,
    hasNewMilestone,
    celebrationMilestone,
  }
}

// Export for testing
export { getWeekStart, isYesterday, isToday, calculateMilestones, findNextMilestone }
