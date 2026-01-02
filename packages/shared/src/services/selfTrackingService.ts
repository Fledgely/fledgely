/**
 * Self-Tracking Service - Story 38.7 Task 4
 *
 * Service for self-tracking tools.
 * AC2: Self-tracking tools (non-monitored) offered
 * AC4: No monitoring data collected post-graduation
 */

import {
  createSelfTrackingPreferences,
  type SelfTrackingPreferences,
} from '../contracts/postGraduation'

// ============================================
// Types
// ============================================

export interface PersonalGoal {
  id: string
  alumniId: string
  description: string
  targetMinutes: number
  currentMinutes: number
  createdAt: Date
}

export interface ProgressSummary {
  alumniId: string
  totalGoals: number
  completedGoals: number
  averageProgress: number
}

// ============================================
// In-Memory Storage (AC4: All data stored locally)
// ============================================

const sessionStore = new Map<string, SelfTrackingPreferences>()
const goalsStore = new Map<string, PersonalGoal[]>()

// ============================================
// Session Functions (AC2)
// ============================================

/**
 * Create a self-tracking session for an alumni.
 * AC2: Self-tracking tools offered.
 * AC4: Data stored locally only.
 *
 * @param alumniId - The alumni's ID
 * @returns The self-tracking session
 */
export function createSelfTrackingSession(alumniId: string): SelfTrackingPreferences {
  const session = createSelfTrackingPreferences(alumniId)

  // Store the session
  sessionStore.set(alumniId, session)

  return session
}

/**
 * Get self-tracking session for an alumni.
 *
 * @param alumniId - The alumni's ID
 * @returns The session or null if not found
 */
export function getSelfTrackingSession(alumniId: string): SelfTrackingPreferences | null {
  return sessionStore.get(alumniId) || null
}

// ============================================
// Goal Functions (AC2)
// ============================================

/**
 * Log a personal goal.
 * AC2: Self-tracking tools offered.
 *
 * @param alumniId - The alumni's ID
 * @param description - Goal description
 * @param targetMinutes - Target minutes for the goal
 * @returns The created goal or null if no session
 */
export function logPersonalGoal(
  alumniId: string,
  description: string,
  targetMinutes: number
): PersonalGoal | null {
  const session = sessionStore.get(alumniId)

  if (!session) {
    return null
  }

  const goal: PersonalGoal = {
    id: `goal-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
    alumniId,
    description,
    targetMinutes,
    currentMinutes: 0,
    createdAt: new Date(),
  }

  // Store the goal
  const goals = goalsStore.get(alumniId) || []
  goals.push(goal)
  goalsStore.set(alumniId, goals)

  return goal
}

/**
 * Get all goals for an alumni.
 *
 * @param alumniId - The alumni's ID
 * @returns Array of goals
 */
export function getGoals(alumniId: string): PersonalGoal[] {
  return goalsStore.get(alumniId) || []
}

/**
 * Update goal progress.
 *
 * @param alumniId - The alumni's ID
 * @param goalId - The goal ID
 * @param currentMinutes - Current progress in minutes
 * @returns True if updated successfully
 */
export function updateGoalProgress(
  alumniId: string,
  goalId: string,
  currentMinutes: number
): boolean {
  const goals = goalsStore.get(alumniId)

  if (!goals) {
    return false
  }

  const goal = goals.find((g) => g.id === goalId)

  if (!goal) {
    return false
  }

  goal.currentMinutes = currentMinutes
  return true
}

// ============================================
// Progress Summary Functions (AC2)
// ============================================

/**
 * Get progress summary for an alumni.
 * AC2: Self-tracking tools offered.
 *
 * @param alumniId - The alumni's ID
 * @returns Progress summary or null if no session
 */
export function getProgressSummary(alumniId: string): ProgressSummary | null {
  const session = sessionStore.get(alumniId)

  if (!session) {
    return null
  }

  const goals = getGoals(alumniId)
  const completedGoals = goals.filter((g) => g.currentMinutes >= g.targetMinutes).length

  let averageProgress = 0
  if (goals.length > 0) {
    const totalProgress = goals.reduce((sum, g) => {
      const progress = Math.min((g.currentMinutes / g.targetMinutes) * 100, 100)
      return sum + progress
    }, 0)
    averageProgress = Math.round(totalProgress / goals.length)
  }

  return {
    alumniId,
    totalGoals: goals.length,
    completedGoals,
    averageProgress,
  }
}

// ============================================
// Privacy Verification Functions (AC4)
// ============================================

/**
 * Verify that all data is stored locally only.
 * AC4: No monitoring data collected post-graduation.
 *
 * @param alumniId - The alumni's ID
 * @returns True if data is local only
 */
export function verifyLocalDataOnly(alumniId: string): boolean {
  const session = sessionStore.get(alumniId)

  if (!session) {
    return false
  }

  // AC4: Verify dataStoredLocally flag is true
  return session.dataStoredLocally === true
}

// ============================================
// Data Deletion Functions (AC4)
// ============================================

/**
 * Delete all self-tracking data for an alumni.
 * AC4: User can delete their own data.
 *
 * @param alumniId - The alumni's ID
 * @returns True if deleted successfully
 */
export function deleteSelfTrackingData(alumniId: string): boolean {
  const session = sessionStore.get(alumniId)

  if (!session) {
    return false
  }

  sessionStore.delete(alumniId)
  goalsStore.delete(alumniId)

  return true
}

// ============================================
// Testing Utilities
// ============================================

/**
 * Clear all self-tracking data (for testing).
 */
export function clearAllSelfTrackingData(): void {
  sessionStore.clear()
  goalsStore.clear()
}
