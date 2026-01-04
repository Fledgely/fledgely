/**
 * Classification Accuracy Calculator Service
 *
 * Story 20.6: Classification Accuracy Monitoring - AC2, AC5
 *
 * Calculates classification accuracy from reviewed samples.
 */

import { getFirestore } from 'firebase-admin/firestore'
import * as logger from 'firebase-functions/logger'
import {
  type AccuracyMetric,
  type ClassificationReviewQueue,
  type AccuracyTrendPoint,
  type CategoryMetric,
  generateAccuracyMetricId,
  calculateAccuracyPercentage,
  formatDateString,
  ROLLING_ACCURACY_DAYS,
  CATEGORY_NEEDS_IMPROVEMENT_THRESHOLD,
} from '@fledgely/shared'

/** Current model version for tracking */
const CURRENT_MODEL_VERSION = 'gemini-1.5-flash'
/** Current taxonomy version for tracking */
const CURRENT_TAXONOMY_VERSION = '1.0.0'

/**
 * Calculate accuracy for a specific date.
 *
 * AC2: Accuracy calculated from reviewed samples
 * AC5: Accuracy tracked per category
 *
 * @param date - Date string in YYYY-MM-DD format
 * @returns AccuracyMetric for the date
 */
export async function calculateDailyAccuracy(date: string): Promise<AccuracyMetric> {
  const db = getFirestore()

  // Parse date to get start and end timestamps
  const startOfDay = new Date(`${date}T00:00:00.000Z`).getTime()
  const endOfDay = new Date(`${date}T23:59:59.999Z`).getTime()

  // Get all reviewed items for the date
  const snapshot = await db
    .collection('classificationReviewQueue')
    .where('status', '==', 'reviewed')
    .where('reviewedAt', '>=', startOfDay)
    .where('reviewedAt', '<=', endOfDay)
    .get()

  // Calculate overall metrics
  const reviewedItems = snapshot.docs.map((doc) => doc.data() as ClassificationReviewQueue)
  const totalReviewed = reviewedItems.length
  const correctCount = reviewedItems.filter((item) => item.isCorrect === true).length
  const accuracy = calculateAccuracyPercentage(correctCount, totalReviewed)

  // Calculate per-category metrics
  const categoryMetrics: Record<string, CategoryMetric> = {}
  const itemsByCategory = new Map<string, ClassificationReviewQueue[]>()

  for (const item of reviewedItems) {
    const category = item.originalCategory
    if (!itemsByCategory.has(category)) {
      itemsByCategory.set(category, [])
    }
    itemsByCategory.get(category)!.push(item)
  }

  for (const [category, items] of itemsByCategory) {
    const catTotal = items.length
    const catCorrect = items.filter((item) => item.isCorrect === true).length
    categoryMetrics[category] = {
      totalReviewed: catTotal,
      correctCount: catCorrect,
      accuracy: calculateAccuracyPercentage(catCorrect, catTotal),
    }
  }

  const metric: AccuracyMetric = {
    id: generateAccuracyMetricId(date),
    date,
    totalReviewed,
    correctCount,
    accuracy,
    categoryMetrics,
    modelVersion: CURRENT_MODEL_VERSION,
    taxonomyVersion: CURRENT_TAXONOMY_VERSION,
    createdAt: Date.now(),
  }

  // Store the metric
  await db.collection('accuracyMetrics').doc(metric.id).set(metric)

  logger.info('Daily accuracy calculated', {
    date,
    totalReviewed,
    correctCount,
    accuracy,
    categoriesTracked: Object.keys(categoryMetrics).length,
  })

  return metric
}

/**
 * Calculate rolling accuracy over a number of days.
 *
 * AC4: Rolling 7-day accuracy tracked for alerting
 *
 * @param days - Number of days for rolling window (default: 7)
 * @returns Rolling accuracy percentage
 */
export async function calculateRollingAccuracy(
  days: number = ROLLING_ACCURACY_DAYS
): Promise<{ accuracy: number; totalReviewed: number; correctCount: number }> {
  const db = getFirestore()
  const now = Date.now()
  const startTime = now - days * 24 * 60 * 60 * 1000

  // Get all reviewed items in the window
  const snapshot = await db
    .collection('classificationReviewQueue')
    .where('status', '==', 'reviewed')
    .where('reviewedAt', '>=', startTime)
    .get()

  const items = snapshot.docs.map((doc) => doc.data() as ClassificationReviewQueue)
  const totalReviewed = items.length
  const correctCount = items.filter((item) => item.isCorrect === true).length
  const accuracy = calculateAccuracyPercentage(correctCount, totalReviewed)

  return { accuracy, totalReviewed, correctCount }
}

/**
 * Calculate accuracy for a specific category.
 *
 * AC5: Accuracy tracked per category to identify weak areas
 *
 * @param category - Category to calculate accuracy for
 * @param days - Number of days to include
 * @returns Accuracy for the category
 */
export async function calculateCategoryAccuracy(
  category: string,
  days: number = ROLLING_ACCURACY_DAYS
): Promise<{ accuracy: number; totalReviewed: number; correctCount: number }> {
  const db = getFirestore()
  const now = Date.now()
  const startTime = now - days * 24 * 60 * 60 * 1000

  // Get all reviewed items for the category
  const snapshot = await db
    .collection('classificationReviewQueue')
    .where('status', '==', 'reviewed')
    .where('originalCategory', '==', category)
    .where('reviewedAt', '>=', startTime)
    .get()

  const items = snapshot.docs.map((doc) => doc.data() as ClassificationReviewQueue)
  const totalReviewed = items.length
  const correctCount = items.filter((item) => item.isCorrect === true).length
  const accuracy = calculateAccuracyPercentage(correctCount, totalReviewed)

  return { accuracy, totalReviewed, correctCount }
}

/**
 * Get accuracy trend over a period.
 *
 * AC3: Accuracy dashboard visible to ops team
 *
 * Optimized to batch fetch metrics and reviewed items to minimize Firestore queries.
 *
 * @param periodDays - Number of days to include in trend
 * @returns Array of daily accuracy points
 */
export async function getAccuracyTrend(periodDays: number = 30): Promise<AccuracyTrendPoint[]> {
  const db = getFirestore()
  const now = new Date()
  const dates: string[] = []

  // Build list of dates we need
  for (let i = periodDays - 1; i >= 0; i--) {
    const targetDate = new Date(now)
    targetDate.setDate(targetDate.getDate() - i)
    dates.push(formatDateString(targetDate))
  }

  // Batch fetch all stored metrics for the period
  const metricsSnapshot = await db
    .collection('accuracyMetrics')
    .where('date', 'in', dates.slice(0, 30)) // Firestore 'in' limit is 30
    .get()

  const storedMetrics = new Map<string, AccuracyMetric>()
  for (const doc of metricsSnapshot.docs) {
    const metric = doc.data() as AccuracyMetric
    storedMetrics.set(metric.date, metric)
  }

  // Find dates without stored metrics
  const missingDates = dates.filter((d) => !storedMetrics.has(d))

  // If we have missing dates, batch calculate from reviewed items
  const calculatedMetrics = new Map<string, AccuracyTrendPoint>()

  if (missingDates.length > 0) {
    // Get start and end of missing date range
    const startOfRange = new Date(`${missingDates[0]}T00:00:00.000Z`).getTime()
    const endOfRange = new Date(`${missingDates[missingDates.length - 1]}T23:59:59.999Z`).getTime()

    // Single query for all missing dates
    const snapshot = await db
      .collection('classificationReviewQueue')
      .where('status', '==', 'reviewed')
      .where('reviewedAt', '>=', startOfRange)
      .where('reviewedAt', '<=', endOfRange)
      .get()

    // Group items by date
    const itemsByDate = new Map<string, ClassificationReviewQueue[]>()
    for (const doc of snapshot.docs) {
      const item = doc.data() as ClassificationReviewQueue
      if (item.reviewedAt) {
        const dateStr = formatDateString(new Date(item.reviewedAt))
        if (!itemsByDate.has(dateStr)) {
          itemsByDate.set(dateStr, [])
        }
        itemsByDate.get(dateStr)!.push(item)
      }
    }

    // Calculate metrics for each missing date
    for (const dateStr of missingDates) {
      const items = itemsByDate.get(dateStr) || []
      const totalReviewed = items.length
      const correctCount = items.filter((item) => item.isCorrect === true).length
      const accuracy = calculateAccuracyPercentage(correctCount, totalReviewed)

      calculatedMetrics.set(dateStr, {
        date: dateStr,
        accuracy,
        sampleCount: totalReviewed,
      })
    }
  }

  // Build final trend array in date order
  const trend: AccuracyTrendPoint[] = []
  for (const dateStr of dates) {
    const stored = storedMetrics.get(dateStr)
    if (stored) {
      trend.push({
        date: stored.date,
        accuracy: stored.accuracy,
        sampleCount: stored.totalReviewed,
      })
    } else {
      const calculated = calculatedMetrics.get(dateStr)
      if (calculated) {
        trend.push(calculated)
      } else {
        // No data for this date
        trend.push({
          date: dateStr,
          accuracy: 0,
          sampleCount: 0,
        })
      }
    }
  }

  return trend
}

/**
 * Get all per-category accuracy metrics.
 *
 * AC5: Accuracy shown per category to identify weak areas
 *
 * @param days - Number of days to include
 * @returns Map of category to accuracy
 */
export async function getAllCategoryAccuracy(
  days: number = ROLLING_ACCURACY_DAYS
): Promise<Record<string, number>> {
  const db = getFirestore()
  const now = Date.now()
  const startTime = now - days * 24 * 60 * 60 * 1000

  // Get all reviewed items
  const snapshot = await db
    .collection('classificationReviewQueue')
    .where('status', '==', 'reviewed')
    .where('reviewedAt', '>=', startTime)
    .get()

  const items = snapshot.docs.map((doc) => doc.data() as ClassificationReviewQueue)

  // Group by category
  const categoryMap = new Map<string, { correct: number; total: number }>()

  for (const item of items) {
    const category = item.originalCategory
    if (!categoryMap.has(category)) {
      categoryMap.set(category, { correct: 0, total: 0 })
    }
    const stats = categoryMap.get(category)!
    stats.total++
    if (item.isCorrect === true) {
      stats.correct++
    }
  }

  // Calculate accuracy for each category
  const result: Record<string, number> = {}
  for (const [category, stats] of categoryMap) {
    result[category] = calculateAccuracyPercentage(stats.correct, stats.total)
  }

  return result
}

/**
 * Get categories that need improvement (below threshold).
 *
 * AC5: Categories below 85% accuracy highlighted as "needs improvement"
 *
 * @param days - Number of days to include
 * @returns Array of category names needing improvement
 */
export async function getCategoriesNeedingImprovement(
  days: number = ROLLING_ACCURACY_DAYS
): Promise<string[]> {
  const categoryAccuracy = await getAllCategoryAccuracy(days)

  return Object.entries(categoryAccuracy)
    .filter(([, accuracy]) => accuracy < CATEGORY_NEEDS_IMPROVEMENT_THRESHOLD)
    .map(([category]) => category)
}

/**
 * Get the latest stored accuracy metric.
 *
 * @returns Latest AccuracyMetric or null
 */
export async function getLatestAccuracyMetric(): Promise<AccuracyMetric | null> {
  const db = getFirestore()

  const snapshot = await db
    .collection('accuracyMetrics')
    .orderBy('createdAt', 'desc')
    .limit(1)
    .get()

  if (snapshot.empty) {
    return null
  }

  return snapshot.docs[0].data() as AccuracyMetric
}
