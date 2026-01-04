/**
 * Classification Accuracy Monitoring Contract Tests
 *
 * Story 20.6: Classification Accuracy Monitoring
 *
 * Tests for accuracy monitoring schemas and helper functions.
 *
 * @vitest-environment node
 */

import { describe, it, expect } from 'vitest'
import {
  // Constants
  ACCURACY_ALERT_THRESHOLD,
  MIN_SAMPLES_FOR_ACCURACY,
  DEFAULT_DAILY_SAMPLE_SIZE,
  CATEGORY_NEEDS_IMPROVEMENT_THRESHOLD,
  ROLLING_ACCURACY_DAYS,
  // Schemas
  reviewStatusSchema,
  classificationReviewQueueSchema,
  submitReviewInputSchema,
  accuracyMetricSchema,
  classificationFeedbackSchema,
  accuracyAlertStatusSchema,
  accuracyAlertSchema,
  getAccuracyMetricsResponseSchema,
  // Helper functions
  generateReviewQueueId,
  generateAccuracyMetricId,
  generateFeedbackId,
  generateAlertId,
  calculateAccuracyPercentage,
  determineAlertStatus,
  formatDateString,
  validateReviewInput,
  // Types
  type ClassificationReviewQueue,
  type SubmitReviewInput,
  type AccuracyMetric,
  type ClassificationFeedback,
  type AccuracyAlert,
} from './accuracyMonitoring'

describe('accuracyMonitoring contracts (Story 20.6)', () => {
  describe('Constants', () => {
    it('has ACCURACY_ALERT_THRESHOLD of 90', () => {
      expect(ACCURACY_ALERT_THRESHOLD).toBe(90)
    })

    it('has MIN_SAMPLES_FOR_ACCURACY of 50', () => {
      expect(MIN_SAMPLES_FOR_ACCURACY).toBe(50)
    })

    it('has DEFAULT_DAILY_SAMPLE_SIZE of 20', () => {
      expect(DEFAULT_DAILY_SAMPLE_SIZE).toBe(20)
    })

    it('has CATEGORY_NEEDS_IMPROVEMENT_THRESHOLD of 85', () => {
      expect(CATEGORY_NEEDS_IMPROVEMENT_THRESHOLD).toBe(85)
    })

    it('has ROLLING_ACCURACY_DAYS of 7', () => {
      expect(ROLLING_ACCURACY_DAYS).toBe(7)
    })
  })

  describe('reviewStatusSchema', () => {
    it('accepts valid status values', () => {
      expect(reviewStatusSchema.parse('pending')).toBe('pending')
      expect(reviewStatusSchema.parse('reviewed')).toBe('reviewed')
      expect(reviewStatusSchema.parse('skipped')).toBe('skipped')
    })

    it('rejects invalid status', () => {
      const result = reviewStatusSchema.safeParse('invalid')
      expect(result.success).toBe(false)
    })
  })

  describe('classificationReviewQueueSchema', () => {
    it('validates valid pending review item', () => {
      const item: ClassificationReviewQueue = {
        id: 'rq_test_123',
        screenshotId: 'ss_123',
        childId: 'child_123',
        originalCategory: 'Entertainment',
        originalConfidence: 85,
        status: 'pending',
        createdAt: Date.now(),
      }

      const result = classificationReviewQueueSchema.safeParse(item)
      expect(result.success).toBe(true)
    })

    it('validates review item with all optional fields', () => {
      const item: ClassificationReviewQueue = {
        id: 'rq_test_123',
        screenshotId: 'ss_123',
        childId: 'child_123',
        originalCategory: 'Gaming',
        originalConfidence: 75,
        secondaryCategories: [{ category: 'Entertainment', confidence: 50 }],
        url: 'https://example.com',
        title: 'Test Page',
        status: 'reviewed',
        createdAt: Date.now() - 3600000,
        reviewedAt: Date.now(),
        reviewedByUid: 'reviewer_123',
        isCorrect: false,
        correctedCategory: 'Social Media',
        reviewerNotes: 'This was a social media site',
      }

      const result = classificationReviewQueueSchema.safeParse(item)
      expect(result.success).toBe(true)
    })

    it('rejects confidence outside 0-100 range', () => {
      const item = {
        id: 'rq_test_123',
        screenshotId: 'ss_123',
        childId: 'child_123',
        originalCategory: 'Entertainment',
        originalConfidence: 101, // Invalid
        status: 'pending',
        createdAt: Date.now(),
      }

      const result = classificationReviewQueueSchema.safeParse(item)
      expect(result.success).toBe(false)
    })

    it('rejects notes over 500 characters', () => {
      const item = {
        id: 'rq_test_123',
        screenshotId: 'ss_123',
        childId: 'child_123',
        originalCategory: 'Entertainment',
        originalConfidence: 85,
        status: 'reviewed',
        createdAt: Date.now(),
        reviewerNotes: 'a'.repeat(501), // Too long
      }

      const result = classificationReviewQueueSchema.safeParse(item)
      expect(result.success).toBe(false)
    })
  })

  describe('submitReviewInputSchema', () => {
    it('validates correct classification review', () => {
      const input: SubmitReviewInput = {
        reviewQueueId: 'rq_123',
        isCorrect: true,
      }

      const result = submitReviewInputSchema.safeParse(input)
      expect(result.success).toBe(true)
    })

    it('validates incorrect classification with correction', () => {
      const input: SubmitReviewInput = {
        reviewQueueId: 'rq_123',
        isCorrect: false,
        correctedCategory: 'Social Media',
        reviewerNotes: 'This was clearly social media',
      }

      const result = submitReviewInputSchema.safeParse(input)
      expect(result.success).toBe(true)
    })

    it('rejects empty reviewQueueId', () => {
      const input = {
        reviewQueueId: '',
        isCorrect: true,
      }

      const result = submitReviewInputSchema.safeParse(input)
      expect(result.success).toBe(false)
    })
  })

  describe('accuracyMetricSchema', () => {
    it('validates valid accuracy metric', () => {
      const metric: AccuracyMetric = {
        id: 'am_2026-01-04',
        date: '2026-01-04',
        totalReviewed: 20,
        correctCount: 18,
        accuracy: 90,
        categoryMetrics: {
          gaming: { totalReviewed: 5, correctCount: 5, accuracy: 100 },
          entertainment: { totalReviewed: 10, correctCount: 8, accuracy: 80 },
          homework: { totalReviewed: 5, correctCount: 5, accuracy: 100 },
        },
        modelVersion: 'gemini-1.5-flash',
        taxonomyVersion: '1.0.0',
        createdAt: Date.now(),
      }

      const result = accuracyMetricSchema.safeParse(metric)
      expect(result.success).toBe(true)
    })

    it('rejects invalid date format', () => {
      const metric = {
        id: 'am_2026-01-04',
        date: '01-04-2026', // Invalid format
        totalReviewed: 20,
        correctCount: 18,
        accuracy: 90,
        categoryMetrics: {},
        modelVersion: 'gemini-1.5-flash',
        taxonomyVersion: '1.0.0',
        createdAt: Date.now(),
      }

      const result = accuracyMetricSchema.safeParse(metric)
      expect(result.success).toBe(false)
    })

    it('rejects negative counts', () => {
      const metric = {
        id: 'am_2026-01-04',
        date: '2026-01-04',
        totalReviewed: -1, // Invalid
        correctCount: 18,
        accuracy: 90,
        categoryMetrics: {},
        modelVersion: 'gemini-1.5-flash',
        taxonomyVersion: '1.0.0',
        createdAt: Date.now(),
      }

      const result = accuracyMetricSchema.safeParse(metric)
      expect(result.success).toBe(false)
    })
  })

  describe('classificationFeedbackSchema', () => {
    it('validates valid feedback record', () => {
      const feedback: ClassificationFeedback = {
        id: 'fb_test_123',
        screenshotId: 'ss_123',
        childId: 'child_123',
        predictedCategory: 'Gaming',
        predictedConfidence: 75,
        correctCategory: 'Entertainment',
        createdAt: Date.now(),
        reviewedByUid: 'reviewer_123',
        modelVersion: 'gemini-1.5-flash',
        taxonomyVersion: '1.0.0',
        processedForTraining: false,
      }

      const result = classificationFeedbackSchema.safeParse(feedback)
      expect(result.success).toBe(true)
    })

    it('validates feedback with all optional fields', () => {
      const feedback: ClassificationFeedback = {
        id: 'fb_test_123',
        screenshotId: 'ss_123',
        childId: 'child_123',
        predictedCategory: 'Gaming',
        predictedConfidence: 75,
        correctCategory: 'Entertainment',
        url: 'https://example.com',
        title: 'Test Page',
        reviewerNotes: 'This was actually an entertainment site',
        createdAt: Date.now() - 3600000,
        reviewedByUid: 'reviewer_123',
        modelVersion: 'gemini-1.5-flash',
        taxonomyVersion: '1.0.0',
        processedForTraining: true,
        processedAt: Date.now(),
      }

      const result = classificationFeedbackSchema.safeParse(feedback)
      expect(result.success).toBe(true)
    })
  })

  describe('accuracyAlertSchema', () => {
    it('validates valid alert', () => {
      const alert: AccuracyAlert = {
        id: 'alert_123',
        status: 'warning',
        currentAccuracy: 88,
        threshold: 90,
        affectedCategories: ['entertainment', 'gaming'],
        sampleCount: 100,
        message: 'Classification accuracy has dropped below 90%',
        createdAt: Date.now(),
      }

      const result = accuracyAlertSchema.safeParse(alert)
      expect(result.success).toBe(true)
    })

    it('validates resolved alert', () => {
      const alert: AccuracyAlert = {
        id: 'alert_123',
        status: 'normal',
        currentAccuracy: 92,
        threshold: 90,
        affectedCategories: [],
        sampleCount: 100,
        message: 'Classification accuracy has recovered',
        createdAt: Date.now() - 86400000,
        resolvedAt: Date.now(),
      }

      const result = accuracyAlertSchema.safeParse(alert)
      expect(result.success).toBe(true)
    })
  })

  describe('accuracyAlertStatusSchema', () => {
    it('accepts all valid status values', () => {
      expect(accuracyAlertStatusSchema.parse('normal')).toBe('normal')
      expect(accuracyAlertStatusSchema.parse('warning')).toBe('warning')
      expect(accuracyAlertStatusSchema.parse('critical')).toBe('critical')
    })

    it('rejects invalid status', () => {
      const result = accuracyAlertStatusSchema.safeParse('invalid')
      expect(result.success).toBe(false)
    })
  })

  describe('getAccuracyMetricsResponseSchema', () => {
    it('validates complete metrics response', () => {
      const response = {
        overallAccuracy: 92.5,
        rollingAccuracy7Day: 91.2,
        perCategoryAccuracy: {
          gaming: 95.0,
          entertainment: 88.5,
          homework: 94.0,
        },
        categoriesNeedingImprovement: ['entertainment'],
        dailyTrend: [
          { date: '2026-01-01', accuracy: 90.0, sampleCount: 20 },
          { date: '2026-01-02', accuracy: 92.0, sampleCount: 18 },
          { date: '2026-01-03', accuracy: 91.5, sampleCount: 22 },
        ],
        alertStatus: 'normal' as const,
        activeAlerts: [],
        totalSamplesReviewed: 500,
        pendingReviewsCount: 15,
      }

      const result = getAccuracyMetricsResponseSchema.safeParse(response)
      expect(result.success).toBe(true)
    })
  })

  describe('Helper Functions', () => {
    describe('generateReviewQueueId', () => {
      it('generates unique IDs', () => {
        const id1 = generateReviewQueueId('ss_123', Date.now())
        const id2 = generateReviewQueueId('ss_123', Date.now())
        expect(id1).not.toBe(id2)
      })

      it('includes screenshot ID in the generated ID', () => {
        const id = generateReviewQueueId('ss_abc', 12345)
        expect(id).toContain('ss_abc')
      })

      it('starts with rq_ prefix', () => {
        const id = generateReviewQueueId('ss_123', Date.now())
        expect(id.startsWith('rq_')).toBe(true)
      })
    })

    describe('generateAccuracyMetricId', () => {
      it('generates ID from date', () => {
        const id = generateAccuracyMetricId('2026-01-04')
        expect(id).toBe('am_2026-01-04')
      })
    })

    describe('generateFeedbackId', () => {
      it('generates unique IDs', () => {
        const id1 = generateFeedbackId('ss_123', Date.now())
        const id2 = generateFeedbackId('ss_123', Date.now())
        expect(id1).not.toBe(id2)
      })

      it('starts with fb_ prefix', () => {
        const id = generateFeedbackId('ss_123', Date.now())
        expect(id.startsWith('fb_')).toBe(true)
      })
    })

    describe('generateAlertId', () => {
      it('generates unique IDs', () => {
        const id1 = generateAlertId(Date.now())
        const id2 = generateAlertId(Date.now())
        expect(id1).not.toBe(id2)
      })

      it('starts with alert_ prefix', () => {
        const id = generateAlertId(Date.now())
        expect(id.startsWith('alert_')).toBe(true)
      })
    })

    describe('calculateAccuracyPercentage', () => {
      it('calculates correct percentage', () => {
        expect(calculateAccuracyPercentage(9, 10)).toBe(90)
        expect(calculateAccuracyPercentage(19, 20)).toBe(95)
        expect(calculateAccuracyPercentage(10, 10)).toBe(100)
      })

      it('returns 0 for zero total', () => {
        expect(calculateAccuracyPercentage(0, 0)).toBe(0)
      })

      it('rounds to 2 decimal places', () => {
        expect(calculateAccuracyPercentage(1, 3)).toBe(33.33)
        expect(calculateAccuracyPercentage(2, 3)).toBe(66.67)
      })
    })

    describe('determineAlertStatus', () => {
      it('returns normal for accuracy >= 90', () => {
        expect(determineAlertStatus(90)).toBe('normal')
        expect(determineAlertStatus(95)).toBe('normal')
        expect(determineAlertStatus(100)).toBe('normal')
      })

      it('returns warning for accuracy 80-89', () => {
        expect(determineAlertStatus(80)).toBe('warning')
        expect(determineAlertStatus(85)).toBe('warning')
        expect(determineAlertStatus(89.99)).toBe('warning')
      })

      it('returns critical for accuracy < 80', () => {
        expect(determineAlertStatus(79)).toBe('critical')
        expect(determineAlertStatus(50)).toBe('critical')
        expect(determineAlertStatus(0)).toBe('critical')
      })
    })

    describe('formatDateString', () => {
      it('formats date as YYYY-MM-DD', () => {
        const date = new Date('2026-01-04T12:00:00Z')
        expect(formatDateString(date)).toBe('2026-01-04')
      })

      it('handles different months and days', () => {
        const date = new Date('2025-12-25T00:00:00Z')
        expect(formatDateString(date)).toBe('2025-12-25')
      })
    })

    describe('validateReviewInput', () => {
      it('returns null for correct classification', () => {
        const input: SubmitReviewInput = {
          reviewQueueId: 'rq_123',
          isCorrect: true,
        }
        expect(validateReviewInput(input)).toBeNull()
      })

      it('returns null for incorrect with correctedCategory', () => {
        const input: SubmitReviewInput = {
          reviewQueueId: 'rq_123',
          isCorrect: false,
          correctedCategory: 'Social Media',
        }
        expect(validateReviewInput(input)).toBeNull()
      })

      it('returns error for incorrect without correctedCategory', () => {
        const input: SubmitReviewInput = {
          reviewQueueId: 'rq_123',
          isCorrect: false,
        }
        expect(validateReviewInput(input)).toBe(
          'Corrected category is required when marking classification as incorrect'
        )
      })
    })
  })
})
