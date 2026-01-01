/**
 * Graduation Eligibility Service - Story 38.1 Task 2
 *
 * Service for tracking and calculating graduation eligibility.
 * Key requirement: 100% trust for 12 consecutive months (FR38A)
 */

import {
  GraduationEligibilityStatus,
  GraduationEligibilityConfig,
  TrustScoreHistoryEntry,
  StreakBreakEvent,
  GRADUATION_TRUST_THRESHOLD,
  GRADUATION_DURATION_MONTHS,
  DEFAULT_GRADUATION_CONFIG,
  calculateProgressPercentage,
  isPerfectTrust,
  validateTrustScoreHistory,
} from '../contracts/graduationEligibility'

// In-memory store (would be replaced with database)
const eligibilityStore: Map<string, GraduationEligibilityStatus> = new Map()
const streakBreakHistory: Map<string, StreakBreakEvent[]> = new Map()

/**
 * Check graduation eligibility for a child based on trust score history.
 * AC1: 100% trust for 12 consecutive months
 */
export function checkGraduationEligibility(
  childId: string,
  trustScoreHistory: TrustScoreHistoryEntry[],
  config: GraduationEligibilityConfig = DEFAULT_GRADUATION_CONFIG
): GraduationEligibilityStatus {
  // Validate history
  const validation = validateTrustScoreHistory(trustScoreHistory)
  if (!validation.valid) {
    // Return initial status if history is invalid
    return {
      childId,
      currentTrustScore: 0,
      monthsAtPerfectTrust: 0,
      eligibilityDate: null,
      isEligible: false,
      progressPercentage: 0,
      streakStartDate: null,
      lastCheckedAt: new Date(),
    }
  }

  // Get current score
  const currentScore =
    trustScoreHistory.length > 0 ? trustScoreHistory[trustScoreHistory.length - 1].score : 0

  // Calculate months at perfect trust
  const monthsAtPerfect = calculateMonthsAtPerfectTrust(
    trustScoreHistory,
    config.trustScoreThreshold
  )

  // Check if eligible
  const isEligible = monthsAtPerfect >= config.durationMonths

  // Calculate streak start date
  const streakStartDate = findStreakStartDate(trustScoreHistory, config.trustScoreThreshold)

  // Project eligibility date
  const eligibilityDate = projectEligibilityDate(
    monthsAtPerfect,
    config.durationMonths,
    streakStartDate
  )

  // Calculate progress
  const progressPercentage = calculateProgressPercentage(monthsAtPerfect, config.durationMonths)

  const status: GraduationEligibilityStatus = {
    childId,
    currentTrustScore: currentScore,
    monthsAtPerfectTrust: monthsAtPerfect,
    eligibilityDate,
    isEligible,
    progressPercentage,
    streakStartDate,
    lastCheckedAt: new Date(),
  }

  // Store status
  eligibilityStore.set(childId, status)

  return status
}

/**
 * Calculate months at perfect (100%) trust.
 * Counts consecutive months where score was at or above threshold.
 */
export function calculateMonthsAtPerfectTrust(
  trustScoreHistory: TrustScoreHistoryEntry[],
  threshold: number = GRADUATION_TRUST_THRESHOLD
): number {
  if (trustScoreHistory.length === 0) return 0

  // Get monthly scores (using first score of each month)
  const monthlyScores = getMonthlyScores(trustScoreHistory)

  // Count consecutive months at threshold from most recent
  let consecutiveMonths = 0
  const sortedMonths = Object.keys(monthlyScores).sort().reverse()

  for (const monthKey of sortedMonths) {
    if (monthlyScores[monthKey] >= threshold) {
      consecutiveMonths++
    } else {
      break // Streak broken
    }
  }

  return consecutiveMonths
}

/**
 * Get monthly scores from history (average score per month).
 */
function getMonthlyScores(history: TrustScoreHistoryEntry[]): Record<string, number> {
  const monthlyData: Record<string, { sum: number; count: number }> = {}

  for (const entry of history) {
    const monthKey = `${entry.date.getFullYear()}-${String(entry.date.getMonth() + 1).padStart(2, '0')}`

    if (!monthlyData[monthKey]) {
      monthlyData[monthKey] = { sum: 0, count: 0 }
    }

    monthlyData[monthKey].sum += entry.score
    monthlyData[monthKey].count++
  }

  const result: Record<string, number> = {}
  for (const [key, data] of Object.entries(monthlyData)) {
    result[key] = Math.round(data.sum / data.count)
  }

  return result
}

/**
 * Find when the current streak started.
 */
function findStreakStartDate(
  trustScoreHistory: TrustScoreHistoryEntry[],
  threshold: number
): Date | null {
  if (trustScoreHistory.length === 0) return null

  // Work backwards from most recent
  const sorted = [...trustScoreHistory].sort((a, b) => b.date.getTime() - a.date.getTime())

  // If current score is not at threshold, no active streak
  if (sorted[0].score < threshold) return null

  let streakStart: Date = sorted[0].date

  for (let i = 0; i < sorted.length; i++) {
    if (sorted[i].score >= threshold) {
      streakStart = sorted[i].date
    } else {
      break // Found where streak was broken
    }
  }

  return streakStart
}

/**
 * Project when child will become eligible if maintaining current streak.
 */
export function projectEligibilityDate(
  currentMonths: number,
  requiredMonths: number = GRADUATION_DURATION_MONTHS,
  streakStartDate: Date | null = null
): Date | null {
  if (currentMonths >= requiredMonths) {
    return null // Already eligible
  }

  if (!streakStartDate) {
    return null // No active streak
  }

  const projectedDate = new Date(streakStartDate)
  projectedDate.setMonth(projectedDate.getMonth() + requiredMonths)

  return projectedDate
}

/**
 * Check if streak was broken and return details.
 */
export function checkStreakContinuity(
  trustScoreHistory: TrustScoreHistoryEntry[],
  threshold: number = GRADUATION_TRUST_THRESHOLD
): { streakBroken: boolean; breakDate: Date | null; breakingScore: number | null } {
  if (trustScoreHistory.length < 2) {
    return { streakBroken: false, breakDate: null, breakingScore: null }
  }

  // Sort by date ascending
  const sorted = [...trustScoreHistory].sort((a, b) => a.date.getTime() - b.date.getTime())

  let wasAtThreshold = false

  for (let i = 0; i < sorted.length; i++) {
    const isAtThreshold = sorted[i].score >= threshold

    if (wasAtThreshold && !isAtThreshold) {
      // Streak just broke
      return {
        streakBroken: true,
        breakDate: sorted[i].date,
        breakingScore: sorted[i].score,
      }
    }

    wasAtThreshold = isAtThreshold
  }

  return { streakBroken: false, breakDate: null, breakingScore: null }
}

/**
 * Get stored eligibility status for a child.
 */
export function getStoredEligibilityStatus(childId: string): GraduationEligibilityStatus | null {
  return eligibilityStore.get(childId) || null
}

/**
 * Record a streak break event.
 */
export function recordStreakBreak(
  childId: string,
  breakDate: Date,
  breakingScore: number,
  monthsLost: number,
  previousStreakStart: Date
): StreakBreakEvent {
  const event: StreakBreakEvent = {
    childId,
    breakDate,
    breakingScore,
    monthsLost,
    previousStreakStart,
  }

  const history = streakBreakHistory.get(childId) || []
  history.push(event)
  streakBreakHistory.set(childId, history)

  return event
}

/**
 * Get streak break history for a child.
 */
export function getStreakBreakHistory(childId: string): StreakBreakEvent[] {
  return streakBreakHistory.get(childId) || []
}

/**
 * Check if child is close to graduation (within 3 months).
 */
export function isNearGraduation(status: GraduationEligibilityStatus): boolean {
  const remainingMonths = GRADUATION_DURATION_MONTHS - status.monthsAtPerfectTrust
  return remainingMonths <= 3 && remainingMonths > 0
}

/**
 * Get remaining months until eligibility.
 */
export function getRemainingMonths(status: GraduationEligibilityStatus): number {
  return Math.max(0, GRADUATION_DURATION_MONTHS - status.monthsAtPerfectTrust)
}

/**
 * Check if child is currently at perfect trust.
 */
export function isAtPerfectTrust(status: GraduationEligibilityStatus): boolean {
  return isPerfectTrust(status.currentTrustScore)
}

/**
 * Clear all stored data (for testing).
 */
export function clearAllEligibilityData(): void {
  eligibilityStore.clear()
  streakBreakHistory.clear()
}

/**
 * Create mock trust score history for testing.
 */
export function createMockTrustScoreHistory(
  childId: string,
  monthsAtPerfect: number,
  startDate: Date = new Date()
): TrustScoreHistoryEntry[] {
  const history: TrustScoreHistoryEntry[] = []
  const date = new Date(startDate)

  // Go back to create history
  date.setMonth(date.getMonth() - monthsAtPerfect)

  for (let i = 0; i <= monthsAtPerfect; i++) {
    history.push({
      date: new Date(date),
      score: 100,
      childId,
    })
    date.setMonth(date.getMonth() + 1)
  }

  return history
}
