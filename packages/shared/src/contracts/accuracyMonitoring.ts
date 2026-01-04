/**
 * Classification Accuracy Monitoring Contracts
 *
 * Story 20.6: Classification Accuracy Monitoring
 *
 * Schemas for monitoring classification accuracy, human review workflow,
 * and feedback collection for model improvement.
 *
 * NFR4: 95% accuracy requirement
 */

import { z } from 'zod'
import { categorySchema, secondaryCategorySchema } from './index'

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Accuracy threshold for alerting.
 * AC4: Alert triggered if accuracy drops below 90%
 */
export const ACCURACY_ALERT_THRESHOLD = 90

/**
 * Minimum samples required before calculating accuracy.
 * Prevents alerting on small sample sizes.
 */
export const MIN_SAMPLES_FOR_ACCURACY = 50

/**
 * Default number of samples to collect per day.
 * AC1: Sample size is configurable
 */
export const DEFAULT_DAILY_SAMPLE_SIZE = 20

/**
 * Category accuracy threshold for "needs improvement" highlighting.
 * AC5: Categories below 85% accuracy highlighted as "needs improvement"
 */
export const CATEGORY_NEEDS_IMPROVEMENT_THRESHOLD = 85

/**
 * Rolling accuracy window in days for alerting.
 * AC4: Rolling 7-day accuracy tracked for alerting
 */
export const ROLLING_ACCURACY_DAYS = 7

// ============================================================================
// REVIEW QUEUE SCHEMAS
// ============================================================================

/**
 * Review status for queued classifications.
 */
export const reviewStatusSchema = z.enum(['pending', 'reviewed', 'skipped'])
export type ReviewStatus = z.infer<typeof reviewStatusSchema>

/**
 * Classification review queue item.
 *
 * AC1: Sample classifications flagged for human review
 * Stored in `classificationReviewQueue` collection.
 */
export const classificationReviewQueueSchema = z.object({
  /** Unique review queue item ID */
  id: z.string(),
  /** Screenshot ID being reviewed */
  screenshotId: z.string(),
  /** Child profile ID */
  childId: z.string(),

  // Original classification data
  /** Category assigned by AI */
  originalCategory: categorySchema,
  /** Confidence score from AI (0-100) */
  originalConfidence: z.number().min(0).max(100),
  /** Secondary categories if present */
  secondaryCategories: z.array(secondaryCategorySchema).optional(),

  // Context for reviewer
  /** URL from screenshot metadata */
  url: z.string().optional(),
  /** Page title from screenshot metadata */
  title: z.string().optional(),

  // Review tracking
  /** Current review status */
  status: reviewStatusSchema,
  /** When added to queue (Unix timestamp ms) */
  createdAt: z.number(),
  /** When reviewed (Unix timestamp ms) */
  reviewedAt: z.number().optional(),
  /** UID of reviewer */
  reviewedByUid: z.string().optional(),

  // Review result
  /** Whether AI classification was correct */
  isCorrect: z.boolean().optional(),
  /** Corrected category if isCorrect=false */
  correctedCategory: categorySchema.optional(),
  /** Optional notes from reviewer */
  reviewerNotes: z.string().max(500).optional(),
})
export type ClassificationReviewQueue = z.infer<typeof classificationReviewQueueSchema>

/**
 * Input schema for submitting a review.
 * POST /submitReview
 */
export const submitReviewInputSchema = z.object({
  /** Review queue item ID */
  reviewQueueId: z.string().min(1),
  /** Whether AI classification was correct */
  isCorrect: z.boolean(),
  /** Corrected category (required if isCorrect=false) */
  correctedCategory: categorySchema.optional(),
  /** Optional reviewer notes */
  reviewerNotes: z.string().max(500).optional(),
})
export type SubmitReviewInput = z.infer<typeof submitReviewInputSchema>

/**
 * Response from submitting a review.
 */
export const submitReviewResponseSchema = z.object({
  /** Whether submission was successful */
  success: z.boolean(),
  /** Feedback ID if incorrect classification was recorded */
  feedbackId: z.string().optional(),
  /** Human-readable message */
  message: z.string(),
})
export type SubmitReviewResponse = z.infer<typeof submitReviewResponseSchema>

// ============================================================================
// ACCURACY METRICS SCHEMAS
// ============================================================================

/**
 * Per-category accuracy metrics.
 */
export const categoryMetricSchema = z.object({
  /** Total samples reviewed for this category */
  totalReviewed: z.number().int().min(0),
  /** Number of correct classifications */
  correctCount: z.number().int().min(0),
  /** Accuracy percentage (0-100) */
  accuracy: z.number().min(0).max(100),
})
export type CategoryMetric = z.infer<typeof categoryMetricSchema>

/**
 * Daily accuracy metric.
 *
 * AC2: Accuracy calculated from reviewed samples
 * AC5: Accuracy tracked per category
 */
export const accuracyMetricSchema = z.object({
  /** Unique metric ID */
  id: z.string(),
  /** Date in YYYY-MM-DD format */
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),

  // Overall metrics
  /** Total samples reviewed */
  totalReviewed: z.number().int().min(0),
  /** Number of correct classifications */
  correctCount: z.number().int().min(0),
  /** Overall accuracy percentage (0-100) */
  accuracy: z.number().min(0).max(100),

  // Per-category breakdown
  /** Accuracy metrics per category */
  categoryMetrics: z.record(z.string(), categoryMetricSchema),

  // Model version for tracking improvements
  /** Gemini model version */
  modelVersion: z.string(),
  /** Category taxonomy version */
  taxonomyVersion: z.string(),

  /** When metric was calculated (Unix timestamp ms) */
  createdAt: z.number(),
})
export type AccuracyMetric = z.infer<typeof accuracyMetricSchema>

// ============================================================================
// FEEDBACK SCHEMAS
// ============================================================================

/**
 * Classification feedback for model improvement.
 *
 * AC6: Feedback loop for model improvement
 * Stored in `classificationFeedback` collection.
 */
export const classificationFeedbackSchema = z.object({
  /** Unique feedback ID */
  id: z.string(),
  /** Screenshot ID */
  screenshotId: z.string(),
  /** Child profile ID */
  childId: z.string(),

  // What the AI predicted
  /** Category predicted by AI */
  predictedCategory: categorySchema,
  /** Confidence score from AI */
  predictedConfidence: z.number().min(0).max(100),

  // What it should have been
  /** Correct category as determined by reviewer */
  correctCategory: categorySchema,

  // Context for retraining
  /** URL from screenshot */
  url: z.string().optional(),
  /** Page title */
  title: z.string().optional(),
  /** Notes from reviewer */
  reviewerNotes: z.string().optional(),

  // Tracking
  /** When feedback was created (Unix timestamp ms) */
  createdAt: z.number(),
  /** UID of reviewer who submitted feedback */
  reviewedByUid: z.string(),
  /** Gemini model version */
  modelVersion: z.string(),
  /** Category taxonomy version */
  taxonomyVersion: z.string(),

  // Training status
  /** Whether this feedback has been processed for model improvement */
  processedForTraining: z.boolean().default(false),
  /** When processed for training (Unix timestamp ms) */
  processedAt: z.number().optional(),
})
export type ClassificationFeedback = z.infer<typeof classificationFeedbackSchema>

// ============================================================================
// ALERTING SCHEMAS
// ============================================================================

/**
 * Alert status for accuracy monitoring.
 *
 * AC4: Alert triggered if accuracy drops below 90%
 */
export const accuracyAlertStatusSchema = z.enum(['normal', 'warning', 'critical'])
export type AccuracyAlertStatus = z.infer<typeof accuracyAlertStatusSchema>

/**
 * System alert for accuracy issues.
 *
 * AC4: Alert triggered if accuracy drops below 90%
 */
export const accuracyAlertSchema = z.object({
  /** Unique alert ID */
  id: z.string(),
  /** Alert severity status */
  status: accuracyAlertStatusSchema,
  /** Current rolling accuracy percentage */
  currentAccuracy: z.number().min(0).max(100),
  /** Threshold that was breached */
  threshold: z.number(),
  /** Categories below threshold */
  affectedCategories: z.array(z.string()),
  /** Number of samples in calculation */
  sampleCount: z.number().int(),
  /** Human-readable alert message */
  message: z.string(),
  /** When alert was created (Unix timestamp ms) */
  createdAt: z.number(),
  /** When alert was resolved (Unix timestamp ms) */
  resolvedAt: z.number().optional(),
})
export type AccuracyAlert = z.infer<typeof accuracyAlertSchema>

// ============================================================================
// API RESPONSE SCHEMAS
// ============================================================================

/**
 * Response from getReviewQueue endpoint.
 * GET /getReviewQueue
 */
export const getReviewQueueResponseSchema = z.object({
  /** Pending review items */
  items: z.array(classificationReviewQueueSchema),
  /** Total pending items count */
  totalPending: z.number().int().min(0),
})
export type GetReviewQueueResponse = z.infer<typeof getReviewQueueResponseSchema>

/**
 * Trend data point for accuracy over time.
 */
export const accuracyTrendPointSchema = z.object({
  /** Date in YYYY-MM-DD format */
  date: z.string(),
  /** Accuracy percentage for that day */
  accuracy: z.number().min(0).max(100),
  /** Number of samples reviewed */
  sampleCount: z.number().int().min(0),
})
export type AccuracyTrendPoint = z.infer<typeof accuracyTrendPointSchema>

/**
 * Response from getAccuracyMetrics endpoint.
 * GET /getAccuracyMetrics
 *
 * AC3: Accuracy dashboard visible to ops team
 */
export const getAccuracyMetricsResponseSchema = z.object({
  /** Overall accuracy (all-time or configurable period) */
  overallAccuracy: z.number().min(0).max(100),
  /** Rolling 7-day accuracy */
  rollingAccuracy7Day: z.number().min(0).max(100),
  /** Per-category accuracy */
  perCategoryAccuracy: z.record(z.string(), z.number().min(0).max(100)),
  /** Categories needing improvement (below 85%) */
  categoriesNeedingImprovement: z.array(z.string()),
  /** Daily accuracy trend */
  dailyTrend: z.array(accuracyTrendPointSchema),
  /** Current alert status */
  alertStatus: accuracyAlertStatusSchema,
  /** Active alerts */
  activeAlerts: z.array(accuracyAlertSchema),
  /** Total samples reviewed */
  totalSamplesReviewed: z.number().int().min(0),
  /** Pending reviews count */
  pendingReviewsCount: z.number().int().min(0),
})
export type GetAccuracyMetricsResponse = z.infer<typeof getAccuracyMetricsResponseSchema>

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Generate a unique review queue item ID.
 */
export function generateReviewQueueId(screenshotId: string, timestamp: number): string {
  const random = Math.random().toString(36).substring(2, 8)
  return `rq_${screenshotId}_${timestamp}_${random}`
}

/**
 * Generate a unique accuracy metric ID.
 */
export function generateAccuracyMetricId(date: string): string {
  return `am_${date}`
}

/**
 * Generate a unique feedback ID.
 */
export function generateFeedbackId(screenshotId: string, timestamp: number): string {
  const random = Math.random().toString(36).substring(2, 8)
  return `fb_${screenshotId}_${timestamp}_${random}`
}

/**
 * Generate a unique alert ID.
 */
export function generateAlertId(timestamp: number): string {
  const random = Math.random().toString(36).substring(2, 8)
  return `alert_${timestamp}_${random}`
}

/**
 * Calculate accuracy percentage from correct/total counts.
 */
export function calculateAccuracyPercentage(correct: number, total: number): number {
  if (total === 0) return 0
  return Math.round((correct / total) * 10000) / 100 // Round to 2 decimal places
}

/**
 * Determine alert status based on accuracy.
 */
export function determineAlertStatus(accuracy: number): AccuracyAlertStatus {
  if (accuracy >= ACCURACY_ALERT_THRESHOLD) return 'normal'
  if (accuracy >= 80) return 'warning'
  return 'critical'
}

/**
 * Format date as YYYY-MM-DD.
 */
export function formatDateString(date: Date): string {
  return date.toISOString().split('T')[0]
}

/**
 * Validate that correctedCategory is provided when isCorrect=false.
 */
export function validateReviewInput(input: SubmitReviewInput): string | null {
  if (!input.isCorrect && !input.correctedCategory) {
    return 'Corrected category is required when marking classification as incorrect'
  }
  return null
}
