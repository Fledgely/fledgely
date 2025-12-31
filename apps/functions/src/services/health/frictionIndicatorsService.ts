/**
 * Friction Indicators Service
 *
 * Story 27.5.4: Friction Indicators Dashboard
 *
 * Calculates aggregated friction indicators from check-ins and friction markers.
 * Provides relationship health, trends, and conversation starters.
 *
 * - AC1: Aggregated indicators (not specific responses)
 * - AC2: Relationship health indicator
 * - AC3: Trend line display
 * - AC4: Privacy protection (no private check-in content revealed)
 * - AC5: Bilateral transparency (same view for both parties)
 * - AC6: Conversation starters
 */

import { getFirestore, Firestore } from 'firebase-admin/firestore'
import * as logger from 'firebase-functions/logger'
import type { HealthCheckIn, FlagDocument } from '@fledgely/shared'

// Lazy initialization for Firestore
let db: Firestore | null = null
function getDb(): Firestore {
  if (!db) {
    db = getFirestore()
  }
  return db
}

/**
 * Relationship health levels.
 */
export type RelationshipHealthLevel = 'mostly_positive' | 'stable' | 'some_concerns'

/**
 * Trend levels.
 */
export type TrendLevel = 'improving' | 'stable' | 'needs_attention'

/**
 * Friction indicators for a family.
 *
 * Story 27.5.4 - AC1: Aggregated indicators
 * Story 27.5.4 - AC5: Bilateral transparency (same for both parties)
 */
export interface FrictionIndicators {
  familyId: string
  /** Relationship health level */
  relationshipHealth: RelationshipHealthLevel
  /** Human-readable health text */
  relationshipHealthText: string
  /** Trend direction */
  trend: TrendLevel
  /** Human-readable trend text */
  trendText: string
  /** Conversation starter suggestion */
  conversationStarter: string | null
  /** Period this data covers */
  periodStart: number
  periodEnd: number
  /** Whether there's enough data for indicators */
  hasEnoughData: boolean
  /** Number of data points used */
  dataPointCount: number
}

/**
 * Internal data point for calculations.
 */
interface IndicatorDataPoint {
  type: 'checkin' | 'friction'
  isPositive: boolean
  timestamp: number
}

const PERIOD_DAYS = 30
const MIN_DATA_POINTS = 3
const TREND_CHANGE_THRESHOLD = 0.1 // 10% change for trend detection

/**
 * Get friction indicators for a family.
 *
 * Story 27.5.4 - All ACs
 *
 * @param familyId The family ID to get indicators for
 */
export async function getFrictionIndicators(familyId: string): Promise<FrictionIndicators> {
  const db = getDb()
  const now = Date.now()
  const periodStart = now - PERIOD_DAYS * 24 * 60 * 60 * 1000
  const previousPeriodStart = periodStart - PERIOD_DAYS * 24 * 60 * 60 * 1000

  try {
    // Get family data
    const familyDoc = await db.collection('families').doc(familyId).get()
    if (!familyDoc.exists) {
      return createEmptyIndicators(familyId, periodStart, now)
    }

    const familyData = familyDoc.data()
    const childUids: string[] = familyData?.childUids || []

    // Collect current and previous period data points
    const currentDataPoints: IndicatorDataPoint[] = []
    const previousDataPoints: IndicatorDataPoint[] = []

    // Get check-in data (current period)
    const currentCheckIns = await getCheckInsForPeriod(familyId, periodStart, now)
    for (const checkIn of currentCheckIns) {
      if (checkIn.response?.rating) {
        currentDataPoints.push({
          type: 'checkin',
          isPositive: checkIn.response.rating === 'positive',
          timestamp: checkIn.respondedAt || checkIn.createdAt,
        })
      }
    }

    // Get check-in data (previous period)
    const previousCheckIns = await getCheckInsForPeriod(familyId, previousPeriodStart, periodStart)
    for (const checkIn of previousCheckIns) {
      if (checkIn.response?.rating) {
        previousDataPoints.push({
          type: 'checkin',
          isPositive: checkIn.response.rating === 'positive',
          timestamp: checkIn.respondedAt || checkIn.createdAt,
        })
      }
    }

    // Get friction data from flags (current period)
    for (const childId of childUids) {
      const currentFlags = await getFlagsWithFrictionMarker(childId, periodStart, now)
      for (const flag of currentFlags) {
        currentDataPoints.push({
          type: 'friction',
          // If friction marker exists, it's NOT positive
          isPositive: !flag.causedDifficultConversation,
          timestamp: flag.reviewedAt || flag.createdAt,
        })
      }

      const previousFlags = await getFlagsWithFrictionMarker(
        childId,
        previousPeriodStart,
        periodStart
      )
      for (const flag of previousFlags) {
        previousDataPoints.push({
          type: 'friction',
          isPositive: !flag.causedDifficultConversation,
          timestamp: flag.reviewedAt || flag.createdAt,
        })
      }
    }

    // Check if we have enough data
    const hasEnoughData = currentDataPoints.length >= MIN_DATA_POINTS

    // Calculate health score (percentage of positive indicators)
    const currentPositiveRate = calculatePositiveRate(currentDataPoints)
    const previousPositiveRate = calculatePositiveRate(previousDataPoints)

    // Determine relationship health level
    const relationshipHealth = getHealthLevel(currentPositiveRate)
    const relationshipHealthText = getHealthText(relationshipHealth)

    // Determine trend
    const trend = getTrend(currentPositiveRate, previousPositiveRate, previousDataPoints.length)
    const trendText = getTrendText(trend)

    // Generate conversation starter
    const conversationStarter = getConversationStarter(
      relationshipHealth,
      trend,
      currentDataPoints.length,
      hasEnoughData
    )

    return {
      familyId,
      relationshipHealth,
      relationshipHealthText,
      trend,
      trendText,
      conversationStarter,
      periodStart,
      periodEnd: now,
      hasEnoughData,
      dataPointCount: currentDataPoints.length,
    }
  } catch (error) {
    logger.error('Failed to get friction indicators', { familyId, error })
    return createEmptyIndicators(familyId, periodStart, now)
  }
}

/**
 * Get check-ins for a period.
 */
async function getCheckInsForPeriod(
  familyId: string,
  periodStart: number,
  periodEnd: number
): Promise<HealthCheckIn[]> {
  const db = getDb()

  try {
    const snapshot = await db
      .collection('healthCheckIns')
      .where('familyId', '==', familyId)
      .where('status', '==', 'completed')
      .where('respondedAt', '>=', periodStart)
      .where('respondedAt', '<=', periodEnd)
      .get()

    return snapshot.docs.map((doc) => doc.data() as HealthCheckIn)
  } catch {
    return []
  }
}

/**
 * Get flags with friction markers for a child in a period.
 */
async function getFlagsWithFrictionMarker(
  childId: string,
  periodStart: number,
  periodEnd: number
): Promise<FlagDocument[]> {
  const db = getDb()

  try {
    const snapshot = await db
      .collection('children')
      .doc(childId)
      .collection('flags')
      .where('reviewedAt', '!=', null)
      .get()

    // Filter by period (can't do compound where with != and range)
    return snapshot.docs
      .map((doc) => doc.data() as FlagDocument)
      .filter((flag) => {
        const reviewedAt = flag.reviewedAt || 0
        return reviewedAt >= periodStart && reviewedAt <= periodEnd
      })
  } catch {
    return []
  }
}

/**
 * Calculate positive rate from data points.
 */
function calculatePositiveRate(dataPoints: IndicatorDataPoint[]): number {
  if (dataPoints.length === 0) return 0.5 // Default to neutral if no data

  const positiveCount = dataPoints.filter((dp) => dp.isPositive).length
  return positiveCount / dataPoints.length
}

/**
 * Get relationship health level based on positive rate.
 *
 * Story 27.5.4 - AC2: Relationship health indicator
 */
function getHealthLevel(positiveRate: number): RelationshipHealthLevel {
  if (positiveRate >= 0.7) return 'mostly_positive'
  if (positiveRate >= 0.5) return 'stable'
  return 'some_concerns'
}

/**
 * Get human-readable health text.
 *
 * Story 27.5.4 - AC2: Relationship health indicator
 */
function getHealthText(health: RelationshipHealthLevel): string {
  switch (health) {
    case 'mostly_positive':
      return 'Mostly positive'
    case 'stable':
      return 'Stable'
    case 'some_concerns':
      return 'Some concerns'
  }
}

/**
 * Get trend based on current vs previous positive rates.
 *
 * Story 27.5.4 - AC3: Trend line display
 */
function getTrend(
  currentRate: number,
  previousRate: number,
  previousDataCount: number
): TrendLevel {
  // If no previous data, assume stable
  if (previousDataCount === 0) return 'stable'

  const change = currentRate - previousRate

  if (change >= TREND_CHANGE_THRESHOLD) return 'improving'
  if (change <= -TREND_CHANGE_THRESHOLD) return 'needs_attention'
  return 'stable'
}

/**
 * Get human-readable trend text.
 *
 * Story 27.5.4 - AC3: Trend line display
 */
function getTrendText(trend: TrendLevel): string {
  switch (trend) {
    case 'improving':
      return 'Improving'
    case 'stable':
      return 'Stable'
    case 'needs_attention':
      return 'Needs attention'
  }
}

/**
 * Get conversation starter based on indicators.
 *
 * Story 27.5.4 - AC6: Conversation starter
 */
function getConversationStarter(
  health: RelationshipHealthLevel,
  trend: TrendLevel,
  _dataCount: number,
  hasEnoughData: boolean
): string | null {
  // No starter if not enough data
  if (!hasEnoughData) {
    return null
  }

  // Positive scenarios
  if (health === 'mostly_positive' && trend === 'improving') {
    return 'Things seem to be going really well! Keep up the great communication.'
  }

  if (health === 'mostly_positive') {
    return 'Monitoring seems to be working well for your family.'
  }

  // Concern scenarios
  if (health === 'some_concerns' && trend === 'needs_attention') {
    return 'You both indicated some challenges this month. This might be a good time to talk about how monitoring is working.'
  }

  if (health === 'some_concerns') {
    return 'There have been some friction points recently. Consider having an open conversation about expectations.'
  }

  // Improving from concerns
  if (health === 'stable' && trend === 'improving') {
    return "Things are getting better! It might help to talk about what's working."
  }

  // Declining from good
  if (trend === 'needs_attention') {
    return 'Things have shifted recently. It might be helpful to check in about how everyone is feeling.'
  }

  // Stable middle ground
  return null
}

/**
 * Create empty indicators when no data available.
 */
function createEmptyIndicators(
  familyId: string,
  periodStart: number,
  periodEnd: number
): FrictionIndicators {
  return {
    familyId,
    relationshipHealth: 'stable',
    relationshipHealthText: 'Stable',
    trend: 'stable',
    trendText: 'Stable',
    conversationStarter: null,
    periodStart,
    periodEnd,
    hasEnoughData: false,
    dataPointCount: 0,
  }
}

/**
 * Cache friction indicators for family access.
 *
 * Story 27.5.4 - AC5: Bilateral transparency
 * Stores indicators in Firestore so children can access them.
 */
export async function cacheFrictionIndicators(indicators: FrictionIndicators): Promise<void> {
  const db = getDb()

  try {
    await db
      .collection('families')
      .doc(indicators.familyId)
      .collection('healthIndicators')
      .doc('friction')
      .set({
        ...indicators,
        cachedAt: Date.now(),
      })
  } catch (error) {
    logger.error('Failed to cache friction indicators', { familyId: indicators.familyId, error })
  }
}

/**
 * Get cached friction indicators for a family.
 * Used by children who access Firestore directly.
 *
 * Story 27.5.4 - AC5: Bilateral transparency
 */
export async function getCachedFrictionIndicators(
  familyId: string
): Promise<FrictionIndicators | null> {
  const db = getDb()

  try {
    const doc = await db
      .collection('families')
      .doc(familyId)
      .collection('healthIndicators')
      .doc('friction')
      .get()

    if (!doc.exists) return null

    const data = doc.data()
    return {
      familyId: data?.familyId,
      relationshipHealth: data?.relationshipHealth,
      relationshipHealthText: data?.relationshipHealthText,
      trend: data?.trend,
      trendText: data?.trendText,
      conversationStarter: data?.conversationStarter,
      periodStart: data?.periodStart,
      periodEnd: data?.periodEnd,
      hasEnoughData: data?.hasEnoughData,
      dataPointCount: data?.dataPointCount,
    }
  } catch (error) {
    logger.error('Failed to get cached friction indicators', { familyId, error })
    return null
  }
}

/**
 * For testing - reset Firestore instance.
 */
export function _resetDbForTesting(): void {
  db = null
}
