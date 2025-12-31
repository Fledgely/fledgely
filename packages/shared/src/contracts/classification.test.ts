/**
 * Classification Contract Tests
 *
 * Story 20.1: Classification Service Architecture
 * Story 20.3: Confidence Score Assignment - AC4 (needsReview field)
 * Story 20.4: Multi-Label Classification - AC2, AC3 (secondaryCategories)
 * Story 21.1: Concerning Content Categories - AC1, AC2, AC4, AC5 (concern flags)
 *
 * Tests for classification schemas and helper functions.
 */

import { describe, it, expect } from 'vitest'
import {
  classificationStatusSchema,
  categorySchema,
  classificationResultSchema,
  classificationJobSchema,
  secondaryCategorySchema,
  classificationDebugSchema,
  CLASSIFICATION_CONFIG,
  CATEGORY_VALUES,
  DEBUG_RETENTION_MS,
  calculateBackoffDelay,
  // Story 21.1: Concerning Content Categories
  CONCERN_CATEGORY_VALUES,
  concernCategorySchema,
  concernSeveritySchema,
  concernFlagSchema,
  // Story 21.2: Distress Detection Suppression
  FLAG_STATUS_VALUES,
  flagStatusSchema,
  SUPPRESSION_REASON_VALUES,
  suppressionReasonSchema,
  suppressedConcernFlagSchema,
  distressSuppressionLogSchema,
  // Story 21.3: False Positive Throttling
  FLAG_THROTTLE_LEVELS,
  flagThrottleLevelSchema,
  FLAG_THROTTLE_LIMITS,
  flagThrottleStateSchema,
  throttledConcernFlagSchema,
  // Story 21.4: Confidence Thresholds
  CONFIDENCE_THRESHOLD_LEVELS,
  confidenceThresholdLevelSchema,
  CONFIDENCE_THRESHOLD_VALUES,
  ALWAYS_FLAG_THRESHOLD,
  categoryConfidenceThresholdsSchema,
  // Story 21.5: Flag Document
  flagDocumentSchema,
} from './index'

describe('Classification Contracts', () => {
  describe('classificationStatusSchema', () => {
    it('accepts valid status values', () => {
      expect(classificationStatusSchema.parse('pending')).toBe('pending')
      expect(classificationStatusSchema.parse('processing')).toBe('processing')
      expect(classificationStatusSchema.parse('completed')).toBe('completed')
      expect(classificationStatusSchema.parse('failed')).toBe('failed')
    })

    it('rejects invalid status values', () => {
      expect(() => classificationStatusSchema.parse('unknown')).toThrow()
      expect(() => classificationStatusSchema.parse('')).toThrow()
    })
  })

  describe('categorySchema', () => {
    it('accepts all valid categories', () => {
      for (const category of CATEGORY_VALUES) {
        expect(categorySchema.parse(category)).toBe(category)
      }
    })

    it('rejects invalid categories', () => {
      expect(() => categorySchema.parse('InvalidCategory')).toThrow()
      expect(() => categorySchema.parse('')).toThrow()
    })

    it('has expected category count', () => {
      expect(CATEGORY_VALUES.length).toBe(10)
    })
  })

  describe('classificationResultSchema', () => {
    it('parses minimal result with status only', () => {
      const result = classificationResultSchema.parse({
        status: 'pending',
      })

      expect(result.status).toBe('pending')
      expect(result.retryCount).toBe(0) // Default value
    })

    it('parses complete result', () => {
      const result = classificationResultSchema.parse({
        status: 'completed',
        primaryCategory: 'Gaming',
        confidence: 85,
        classifiedAt: Date.now(),
        modelVersion: 'gemini-1.5-flash',
        retryCount: 1,
      })

      expect(result.status).toBe('completed')
      expect(result.primaryCategory).toBe('Gaming')
      expect(result.confidence).toBe(85)
      expect(result.modelVersion).toBe('gemini-1.5-flash')
      expect(result.retryCount).toBe(1)
    })

    it('parses failed result with error', () => {
      const result = classificationResultSchema.parse({
        status: 'failed',
        error: 'API timeout',
        retryCount: 3,
      })

      expect(result.status).toBe('failed')
      expect(result.error).toBe('API timeout')
      expect(result.retryCount).toBe(3)
    })

    it('validates confidence range', () => {
      expect(() =>
        classificationResultSchema.parse({
          status: 'completed',
          confidence: -1,
        })
      ).toThrow()

      expect(() =>
        classificationResultSchema.parse({
          status: 'completed',
          confidence: 101,
        })
      ).toThrow()
    })

    it('accepts boundary confidence values', () => {
      const resultZero = classificationResultSchema.parse({
        status: 'completed',
        confidence: 0,
      })
      expect(resultZero.confidence).toBe(0)

      const resultHundred = classificationResultSchema.parse({
        status: 'completed',
        confidence: 100,
      })
      expect(resultHundred.confidence).toBe(100)
    })

    // Story 20.3: Confidence Score Assignment - AC4
    describe('needsReview field', () => {
      it('accepts needsReview boolean', () => {
        const result = classificationResultSchema.parse({
          status: 'completed',
          primaryCategory: 'Gaming',
          confidence: 50,
          needsReview: true,
        })
        expect(result.needsReview).toBe(true)
      })

      it('needsReview is optional', () => {
        const result = classificationResultSchema.parse({
          status: 'completed',
          primaryCategory: 'Gaming',
          confidence: 85,
        })
        expect(result.needsReview).toBeUndefined()
      })

      it('accepts needsReview=false for high confidence', () => {
        const result = classificationResultSchema.parse({
          status: 'completed',
          primaryCategory: 'Gaming',
          confidence: 90,
          needsReview: false,
        })
        expect(result.needsReview).toBe(false)
      })

      it('can combine needsReview with isLowConfidence', () => {
        const result = classificationResultSchema.parse({
          status: 'completed',
          primaryCategory: 'Other',
          confidence: 25,
          isLowConfidence: true,
          needsReview: true,
        })
        expect(result.isLowConfidence).toBe(true)
        expect(result.needsReview).toBe(true)
      })
    })

    // Story 20.4: Multi-Label Classification - AC2, AC3
    describe('secondaryCategories field', () => {
      it('accepts empty secondaryCategories array', () => {
        const result = classificationResultSchema.parse({
          status: 'completed',
          primaryCategory: 'Gaming',
          confidence: 85,
          secondaryCategories: [],
        })
        expect(result.secondaryCategories).toEqual([])
      })

      it('accepts single secondary category', () => {
        const result = classificationResultSchema.parse({
          status: 'completed',
          primaryCategory: 'Educational',
          confidence: 75,
          secondaryCategories: [{ category: 'Entertainment', confidence: 55 }],
        })
        expect(result.secondaryCategories).toHaveLength(1)
        expect(result.secondaryCategories![0].category).toBe('Entertainment')
        expect(result.secondaryCategories![0].confidence).toBe(55)
      })

      it('accepts maximum 2 secondary categories', () => {
        const result = classificationResultSchema.parse({
          status: 'completed',
          primaryCategory: 'Educational',
          confidence: 80,
          secondaryCategories: [
            { category: 'Entertainment', confidence: 60 },
            { category: 'Gaming', confidence: 52 },
          ],
        })
        expect(result.secondaryCategories).toHaveLength(2)
      })

      it('rejects more than 2 secondary categories', () => {
        expect(() =>
          classificationResultSchema.parse({
            status: 'completed',
            primaryCategory: 'Educational',
            confidence: 80,
            secondaryCategories: [
              { category: 'Entertainment', confidence: 60 },
              { category: 'Gaming', confidence: 55 },
              { category: 'Social Media', confidence: 51 },
            ],
          })
        ).toThrow()
      })

      it('validates secondary category confidence range', () => {
        expect(() =>
          classificationResultSchema.parse({
            status: 'completed',
            primaryCategory: 'Gaming',
            confidence: 80,
            secondaryCategories: [{ category: 'Entertainment', confidence: 101 }],
          })
        ).toThrow()

        expect(() =>
          classificationResultSchema.parse({
            status: 'completed',
            primaryCategory: 'Gaming',
            confidence: 80,
            secondaryCategories: [{ category: 'Entertainment', confidence: -1 }],
          })
        ).toThrow()
      })

      it('validates secondary category names', () => {
        expect(() =>
          classificationResultSchema.parse({
            status: 'completed',
            primaryCategory: 'Gaming',
            confidence: 80,
            secondaryCategories: [{ category: 'InvalidCategory', confidence: 55 }],
          })
        ).toThrow()
      })

      it('secondaryCategories is optional', () => {
        const result = classificationResultSchema.parse({
          status: 'completed',
          primaryCategory: 'Gaming',
          confidence: 85,
        })
        expect(result.secondaryCategories).toBeUndefined()
      })
    })
  })

  describe('secondaryCategorySchema', () => {
    it('parses valid secondary category', () => {
      const result = secondaryCategorySchema.parse({
        category: 'Entertainment',
        confidence: 65,
      })
      expect(result.category).toBe('Entertainment')
      expect(result.confidence).toBe(65)
    })

    it('validates category is required', () => {
      expect(() =>
        secondaryCategorySchema.parse({
          confidence: 65,
        })
      ).toThrow()
    })

    it('validates confidence is required', () => {
      expect(() =>
        secondaryCategorySchema.parse({
          category: 'Entertainment',
        })
      ).toThrow()
    })
  })

  describe('classificationJobSchema', () => {
    it('parses valid job', () => {
      const job = classificationJobSchema.parse({
        childId: 'child-123',
        screenshotId: 'screenshot-456',
        storagePath: 'screenshots/child-123/2024-01-01/123.jpg',
        familyId: 'family-789',
      })

      expect(job.childId).toBe('child-123')
      expect(job.screenshotId).toBe('screenshot-456')
      expect(job.storagePath).toBe('screenshots/child-123/2024-01-01/123.jpg')
      expect(job.familyId).toBe('family-789')
      expect(job.retryCount).toBe(0) // Default
    })

    it('parses job with optional fields', () => {
      const job = classificationJobSchema.parse({
        childId: 'child-123',
        screenshotId: 'screenshot-456',
        storagePath: 'screenshots/child-123/2024-01-01/123.jpg',
        url: 'https://example.com',
        title: 'Example Page',
        familyId: 'family-789',
        retryCount: 2,
      })

      expect(job.url).toBe('https://example.com')
      expect(job.title).toBe('Example Page')
      expect(job.retryCount).toBe(2)
    })

    it('requires mandatory fields', () => {
      expect(() =>
        classificationJobSchema.parse({
          childId: 'child-123',
          // Missing screenshotId, storagePath, familyId
        })
      ).toThrow()
    })
  })

  describe('CLASSIFICATION_CONFIG', () => {
    it('has correct timeout value (30 seconds)', () => {
      expect(CLASSIFICATION_CONFIG.TIMEOUT_MS).toBe(30000)
    })

    it('has correct max retries (3)', () => {
      expect(CLASSIFICATION_CONFIG.MAX_RETRIES).toBe(3)
    })

    it('has correct base delay (1 second)', () => {
      expect(CLASSIFICATION_CONFIG.RETRY_BASE_DELAY_MS).toBe(1000)
    })

    it('has queue name configured', () => {
      expect(CLASSIFICATION_CONFIG.QUEUE_NAME).toBe('screenshot-classification')
    })

    it('has model name configured', () => {
      expect(CLASSIFICATION_CONFIG.MODEL_NAME).toBe('gemini-1.5-flash')
    })

    it('has location configured', () => {
      expect(CLASSIFICATION_CONFIG.LOCATION).toBe('us-central1')
    })
  })

  // Story 20.5: Classification Metadata Storage - AC1, AC3
  describe('metadata storage requirements (Story 20.5)', () => {
    it('AC1: stores all required metadata fields', () => {
      const result = classificationResultSchema.parse({
        status: 'completed',
        primaryCategory: 'Gaming',
        secondaryCategories: [{ category: 'Entertainment', confidence: 55 }],
        confidence: 85,
        classifiedAt: Date.now(),
        modelVersion: 'gemini-1.5-flash',
        taxonomyVersion: '1.0.0',
      })

      // AC1: Verify all required fields are present
      expect(result.primaryCategory).toBeDefined()
      expect(result.secondaryCategories).toBeDefined()
      expect(result.confidence).toBeDefined()
      expect(result.classifiedAt).toBeDefined()
    })

    it('AC3: modelVersion and taxonomyVersion tracked for model updates', () => {
      const result = classificationResultSchema.parse({
        status: 'completed',
        primaryCategory: 'Educational',
        confidence: 90,
        classifiedAt: Date.now(),
        modelVersion: 'gemini-1.5-pro',
        taxonomyVersion: '1.1.0',
      })

      // AC3: Version tracking for re-classification
      expect(result.modelVersion).toBe('gemini-1.5-pro')
      expect(result.taxonomyVersion).toBe('1.1.0')
    })

    it('supports full classification result with all fields', () => {
      const now = Date.now()
      const result = classificationResultSchema.parse({
        status: 'completed',
        primaryCategory: 'Educational',
        confidence: 75,
        classifiedAt: now,
        modelVersion: 'gemini-1.5-flash',
        taxonomyVersion: '1.0.0',
        isLowConfidence: false,
        needsReview: false,
        secondaryCategories: [
          { category: 'Entertainment', confidence: 60 },
          { category: 'Gaming', confidence: 52 },
        ],
        retryCount: 0,
      })

      expect(result).toEqual({
        status: 'completed',
        primaryCategory: 'Educational',
        confidence: 75,
        classifiedAt: now,
        modelVersion: 'gemini-1.5-flash',
        taxonomyVersion: '1.0.0',
        isLowConfidence: false,
        needsReview: false,
        secondaryCategories: [
          { category: 'Entertainment', confidence: 60 },
          { category: 'Gaming', confidence: 52 },
        ],
        retryCount: 0,
      })
    })
  })

  // Story 20.5: Classification Metadata Storage - AC4
  describe('classificationDebugSchema', () => {
    it('parses valid debug record', () => {
      const now = Date.now()
      const result = classificationDebugSchema.parse({
        screenshotId: 'screenshot-123',
        childId: 'child-456',
        timestamp: now,
        requestContext: {
          url: 'https://example.com',
          title: 'Example Page',
          imageSize: 50000,
        },
        rawResponse: '{"primaryCategory":"Gaming","confidence":85}',
        parsedResult: {
          primaryCategory: 'Gaming',
          confidence: 85,
          reasoning: 'Screenshot shows game interface',
        },
        modelVersion: 'gemini-1.5-flash',
        taxonomyVersion: '1.0.0',
        processingTimeMs: 250,
        expiresAt: now + DEBUG_RETENTION_MS,
      })

      expect(result.screenshotId).toBe('screenshot-123')
      expect(result.childId).toBe('child-456')
      expect(result.modelVersion).toBe('gemini-1.5-flash')
      expect(result.parsedResult.primaryCategory).toBe('Gaming')
    })

    it('accepts minimal request context', () => {
      const now = Date.now()
      const result = classificationDebugSchema.parse({
        screenshotId: 'screenshot-123',
        childId: 'child-456',
        timestamp: now,
        requestContext: {}, // All fields optional
        rawResponse: '{}',
        parsedResult: {
          primaryCategory: 'Other',
          confidence: 30,
        },
        modelVersion: 'gemini-1.5-flash',
        taxonomyVersion: '1.0.0',
        expiresAt: now + DEBUG_RETENTION_MS,
      })

      expect(result.requestContext).toEqual({})
    })

    it('accepts secondary categories in parsed result', () => {
      const now = Date.now()
      const result = classificationDebugSchema.parse({
        screenshotId: 'screenshot-123',
        childId: 'child-456',
        timestamp: now,
        requestContext: {},
        rawResponse: '{}',
        parsedResult: {
          primaryCategory: 'Educational',
          confidence: 75,
          secondaryCategories: [{ category: 'Entertainment', confidence: 55 }],
        },
        modelVersion: 'gemini-1.5-flash',
        taxonomyVersion: '1.0.0',
        expiresAt: now + DEBUG_RETENTION_MS,
      })

      expect(result.parsedResult.secondaryCategories).toHaveLength(1)
    })

    it('validates required fields', () => {
      expect(() =>
        classificationDebugSchema.parse({
          screenshotId: 'screenshot-123',
          // Missing other required fields
        })
      ).toThrow()
    })

    it('validates parsedResult category', () => {
      const now = Date.now()
      expect(() =>
        classificationDebugSchema.parse({
          screenshotId: 'screenshot-123',
          childId: 'child-456',
          timestamp: now,
          requestContext: {},
          rawResponse: '{}',
          parsedResult: {
            primaryCategory: 'InvalidCategory',
            confidence: 85,
          },
          modelVersion: 'gemini-1.5-flash',
          taxonomyVersion: '1.0.0',
          expiresAt: now + DEBUG_RETENTION_MS,
        })
      ).toThrow()
    })
  })

  describe('DEBUG_RETENTION_MS', () => {
    it('equals 30 days in milliseconds', () => {
      const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000
      expect(DEBUG_RETENTION_MS).toBe(thirtyDaysMs)
    })
  })

  describe('calculateBackoffDelay', () => {
    it('returns base delay for first retry (1s)', () => {
      expect(calculateBackoffDelay(0)).toBe(1000)
    })

    it('returns doubled delay for second retry (2s)', () => {
      expect(calculateBackoffDelay(1)).toBe(2000)
    })

    it('returns quadrupled delay for third retry (4s)', () => {
      expect(calculateBackoffDelay(2)).toBe(4000)
    })

    it('follows exponential pattern', () => {
      const delay0 = calculateBackoffDelay(0)
      const delay1 = calculateBackoffDelay(1)
      const delay2 = calculateBackoffDelay(2)
      const delay3 = calculateBackoffDelay(3)

      expect(delay1).toBe(delay0 * 2)
      expect(delay2).toBe(delay1 * 2)
      expect(delay3).toBe(delay2 * 2)
    })
  })

  // Story 21.1: Concerning Content Categories
  describe('Concern Category Schemas (Story 21.1)', () => {
    describe('CONCERN_CATEGORY_VALUES', () => {
      it('contains all 6 concern categories (AC2)', () => {
        expect(CONCERN_CATEGORY_VALUES).toContain('Violence')
        expect(CONCERN_CATEGORY_VALUES).toContain('Adult Content')
        expect(CONCERN_CATEGORY_VALUES).toContain('Bullying')
        expect(CONCERN_CATEGORY_VALUES).toContain('Self-Harm Indicators')
        expect(CONCERN_CATEGORY_VALUES).toContain('Explicit Language')
        expect(CONCERN_CATEGORY_VALUES).toContain('Unknown Contacts')
        expect(CONCERN_CATEGORY_VALUES.length).toBe(6)
      })
    })

    describe('concernCategorySchema', () => {
      it('accepts all valid concern categories (AC2)', () => {
        for (const category of CONCERN_CATEGORY_VALUES) {
          expect(concernCategorySchema.parse(category)).toBe(category)
        }
      })

      it('rejects invalid concern categories', () => {
        expect(() => concernCategorySchema.parse('Gaming')).toThrow()
        expect(() => concernCategorySchema.parse('InvalidConcern')).toThrow()
        expect(() => concernCategorySchema.parse('')).toThrow()
      })

      it('concern categories are separate from basic categories (AC3)', () => {
        // Violence is a concern category, not a basic category
        expect(CONCERN_CATEGORY_VALUES).toContain('Violence')
        expect(CATEGORY_VALUES).not.toContain('Violence')

        // Gaming is a basic category, not a concern category
        expect(CATEGORY_VALUES).toContain('Gaming')
        expect(CONCERN_CATEGORY_VALUES).not.toContain('Gaming')
      })
    })

    describe('concernSeveritySchema', () => {
      it('accepts all severity levels (AC4)', () => {
        expect(concernSeveritySchema.parse('low')).toBe('low')
        expect(concernSeveritySchema.parse('medium')).toBe('medium')
        expect(concernSeveritySchema.parse('high')).toBe('high')
      })

      it('rejects invalid severity levels', () => {
        expect(() => concernSeveritySchema.parse('critical')).toThrow()
        expect(() => concernSeveritySchema.parse('none')).toThrow()
        expect(() => concernSeveritySchema.parse('')).toThrow()
      })
    })

    describe('concernFlagSchema', () => {
      it('parses valid concern flag with all fields (AC1, AC4, AC5)', () => {
        const now = Date.now()
        const flag = concernFlagSchema.parse({
          category: 'Violence',
          severity: 'medium',
          confidence: 75,
          reasoning: 'Screenshot shows fighting scene from a video game',
          detectedAt: now,
        })

        expect(flag.category).toBe('Violence')
        expect(flag.severity).toBe('medium')
        expect(flag.confidence).toBe(75)
        expect(flag.reasoning).toBe('Screenshot shows fighting scene from a video game')
        expect(flag.detectedAt).toBe(now)
      })

      it('validates all concern categories in flag', () => {
        const now = Date.now()
        for (const category of CONCERN_CATEGORY_VALUES) {
          const flag = concernFlagSchema.parse({
            category,
            severity: 'low',
            confidence: 50,
            reasoning: `Detected ${category}`,
            detectedAt: now,
          })
          expect(flag.category).toBe(category)
        }
      })

      it('validates all severity levels in flag', () => {
        const now = Date.now()
        for (const severity of ['low', 'medium', 'high'] as const) {
          const flag = concernFlagSchema.parse({
            category: 'Bullying',
            severity,
            confidence: 60,
            reasoning: 'Test reasoning',
            detectedAt: now,
          })
          expect(flag.severity).toBe(severity)
        }
      })

      it('validates confidence range (0-100)', () => {
        const now = Date.now()

        // Valid boundary values
        expect(
          concernFlagSchema.parse({
            category: 'Violence',
            severity: 'low',
            confidence: 0,
            reasoning: 'Low confidence',
            detectedAt: now,
          }).confidence
        ).toBe(0)

        expect(
          concernFlagSchema.parse({
            category: 'Violence',
            severity: 'high',
            confidence: 100,
            reasoning: 'High confidence',
            detectedAt: now,
          }).confidence
        ).toBe(100)

        // Invalid values
        expect(() =>
          concernFlagSchema.parse({
            category: 'Violence',
            severity: 'low',
            confidence: -1,
            reasoning: 'Invalid',
            detectedAt: now,
          })
        ).toThrow()

        expect(() =>
          concernFlagSchema.parse({
            category: 'Violence',
            severity: 'low',
            confidence: 101,
            reasoning: 'Invalid',
            detectedAt: now,
          })
        ).toThrow()
      })

      it('requires reasoning field (AC5)', () => {
        const now = Date.now()
        expect(() =>
          concernFlagSchema.parse({
            category: 'Violence',
            severity: 'low',
            confidence: 50,
            // Missing reasoning
            detectedAt: now,
          })
        ).toThrow()
      })

      it('requires all fields', () => {
        expect(() => concernFlagSchema.parse({})).toThrow()
        expect(() =>
          concernFlagSchema.parse({
            category: 'Violence',
          })
        ).toThrow()
        expect(() =>
          concernFlagSchema.parse({
            category: 'Violence',
            severity: 'low',
          })
        ).toThrow()
      })

      it('rejects invalid category in flag', () => {
        const now = Date.now()
        expect(() =>
          concernFlagSchema.parse({
            category: 'Gaming', // Basic category, not concern
            severity: 'low',
            confidence: 50,
            reasoning: 'Test',
            detectedAt: now,
          })
        ).toThrow()
      })

      it('rejects invalid severity in flag', () => {
        const now = Date.now()
        expect(() =>
          concernFlagSchema.parse({
            category: 'Violence',
            severity: 'extreme', // Invalid severity
            confidence: 50,
            reasoning: 'Test',
            detectedAt: now,
          })
        ).toThrow()
      })
    })
  })

  // Story 21.2: Distress Detection Suppression (FR21A)
  describe('Distress Suppression Schemas (Story 21.2)', () => {
    describe('flagStatusSchema', () => {
      it('accepts all valid flag status values', () => {
        for (const status of FLAG_STATUS_VALUES) {
          expect(flagStatusSchema.parse(status)).toBe(status)
        }
      })

      it('has expected status values', () => {
        expect(FLAG_STATUS_VALUES).toContain('pending')
        expect(FLAG_STATUS_VALUES).toContain('sensitive_hold')
        expect(FLAG_STATUS_VALUES).toContain('reviewed')
        expect(FLAG_STATUS_VALUES).toContain('dismissed')
        expect(FLAG_STATUS_VALUES).toContain('released')
        expect(FLAG_STATUS_VALUES.length).toBe(5)
      })

      it('rejects invalid status values', () => {
        expect(() => flagStatusSchema.parse('unknown')).toThrow()
        expect(() => flagStatusSchema.parse('')).toThrow()
        expect(() => flagStatusSchema.parse('PENDING')).toThrow() // Case sensitive
      })
    })

    describe('suppressionReasonSchema', () => {
      it('accepts all valid suppression reasons', () => {
        for (const reason of SUPPRESSION_REASON_VALUES) {
          expect(suppressionReasonSchema.parse(reason)).toBe(reason)
        }
      })

      it('has expected suppression reason values', () => {
        expect(SUPPRESSION_REASON_VALUES).toContain('self_harm_detected')
        expect(SUPPRESSION_REASON_VALUES).toContain('crisis_url_visited')
        expect(SUPPRESSION_REASON_VALUES).toContain('distress_signals')
        expect(SUPPRESSION_REASON_VALUES.length).toBe(3)
      })

      it('rejects invalid suppression reasons', () => {
        expect(() => suppressionReasonSchema.parse('unknown')).toThrow()
        expect(() => suppressionReasonSchema.parse('')).toThrow()
      })
    })

    describe('suppressedConcernFlagSchema', () => {
      const now = Date.now()
      const baseFlag = {
        category: 'Self-Harm Indicators' as const,
        severity: 'high' as const,
        confidence: 85,
        reasoning: 'Detected crisis content',
        detectedAt: now,
      }

      it('parses flag with default status', () => {
        const flag = suppressedConcernFlagSchema.parse(baseFlag)
        expect(flag.category).toBe('Self-Harm Indicators')
        expect(flag.status).toBe('pending') // Default
      })

      it('parses flag with sensitive_hold status', () => {
        const flag = suppressedConcernFlagSchema.parse({
          ...baseFlag,
          status: 'sensitive_hold',
          suppressionReason: 'self_harm_detected',
          releasableAfter: now + 48 * 60 * 60 * 1000,
        })
        expect(flag.status).toBe('sensitive_hold')
        expect(flag.suppressionReason).toBe('self_harm_detected')
        expect(flag.releasableAfter).toBeGreaterThan(now)
      })

      it('parses flag with released status', () => {
        const flag = suppressedConcernFlagSchema.parse({
          ...baseFlag,
          status: 'released',
        })
        expect(flag.status).toBe('released')
      })

      it('allows suppressionReason to be optional', () => {
        const flag = suppressedConcernFlagSchema.parse({
          ...baseFlag,
          status: 'pending',
        })
        expect(flag.suppressionReason).toBeUndefined()
      })

      it('rejects invalid status', () => {
        expect(() =>
          suppressedConcernFlagSchema.parse({
            ...baseFlag,
            status: 'invalid_status',
          })
        ).toThrow()
      })

      it('rejects invalid suppressionReason', () => {
        expect(() =>
          suppressedConcernFlagSchema.parse({
            ...baseFlag,
            status: 'sensitive_hold',
            suppressionReason: 'invalid_reason',
          })
        ).toThrow()
      })
    })

    describe('distressSuppressionLogSchema', () => {
      const now = Date.now()
      const validLog = {
        id: 'log-123',
        screenshotId: 'screenshot-456',
        childId: 'child-789',
        familyId: 'family-abc',
        concernCategory: 'Self-Harm Indicators' as const,
        severity: 'high' as const,
        suppressionReason: 'self_harm_detected' as const,
        timestamp: now,
      }

      it('parses valid suppression log', () => {
        const log = distressSuppressionLogSchema.parse(validLog)
        expect(log.id).toBe('log-123')
        expect(log.screenshotId).toBe('screenshot-456')
        expect(log.childId).toBe('child-789')
        expect(log.familyId).toBe('family-abc')
        expect(log.concernCategory).toBe('Self-Harm Indicators')
        expect(log.severity).toBe('high')
        expect(log.suppressionReason).toBe('self_harm_detected')
        expect(log.timestamp).toBe(now)
        expect(log.released).toBe(false) // Default
      })

      it('parses log with optional fields', () => {
        const releaseTime = now + 48 * 60 * 60 * 1000
        const releasedTime = now + 72 * 60 * 60 * 1000
        const log = distressSuppressionLogSchema.parse({
          ...validLog,
          releasableAfter: releaseTime,
          released: true,
          releasedAt: releasedTime,
        })
        expect(log.releasableAfter).toBe(releaseTime)
        expect(log.released).toBe(true)
        expect(log.releasedAt).toBe(releasedTime)
      })

      it('requires all mandatory fields', () => {
        expect(() => distressSuppressionLogSchema.parse({})).toThrow()
        expect(() =>
          distressSuppressionLogSchema.parse({
            id: 'log-123',
            // Missing other required fields
          })
        ).toThrow()
      })

      it('validates concernCategory is a valid concern', () => {
        expect(() =>
          distressSuppressionLogSchema.parse({
            ...validLog,
            concernCategory: 'InvalidCategory',
          })
        ).toThrow()
      })

      it('validates suppressionReason', () => {
        expect(() =>
          distressSuppressionLogSchema.parse({
            ...validLog,
            suppressionReason: 'invalid_reason',
          })
        ).toThrow()
      })

      it('validates severity', () => {
        expect(() =>
          distressSuppressionLogSchema.parse({
            ...validLog,
            severity: 'extreme',
          })
        ).toThrow()
      })
    })

    describe('classificationResultSchema with crisisProtected', () => {
      it('accepts crisisProtected: true', () => {
        const result = classificationResultSchema.parse({
          status: 'completed',
          primaryCategory: 'Communication',
          confidence: 85,
          classifiedAt: Date.now(),
          crisisProtected: true,
        })
        expect(result.crisisProtected).toBe(true)
      })

      it('accepts crisisProtected: false', () => {
        const result = classificationResultSchema.parse({
          status: 'completed',
          primaryCategory: 'Social Media',
          confidence: 90,
          classifiedAt: Date.now(),
          crisisProtected: false,
        })
        expect(result.crisisProtected).toBe(false)
      })

      it('allows crisisProtected to be undefined', () => {
        const result = classificationResultSchema.parse({
          status: 'completed',
          primaryCategory: 'Gaming',
          confidence: 75,
          classifiedAt: Date.now(),
        })
        expect(result.crisisProtected).toBeUndefined()
      })
    })
  })

  // Story 21.3: False Positive Throttling
  describe('Flag Throttle Schemas (Story 21.3)', () => {
    describe('FLAG_THROTTLE_LEVELS constant', () => {
      it('has exactly 4 throttle levels', () => {
        expect(FLAG_THROTTLE_LEVELS).toHaveLength(4)
      })

      it('includes minimal, standard, detailed, all levels', () => {
        expect(FLAG_THROTTLE_LEVELS).toContain('minimal')
        expect(FLAG_THROTTLE_LEVELS).toContain('standard')
        expect(FLAG_THROTTLE_LEVELS).toContain('detailed')
        expect(FLAG_THROTTLE_LEVELS).toContain('all')
      })
    })

    describe('flagThrottleLevelSchema', () => {
      it('accepts all valid throttle levels', () => {
        expect(flagThrottleLevelSchema.parse('minimal')).toBe('minimal')
        expect(flagThrottleLevelSchema.parse('standard')).toBe('standard')
        expect(flagThrottleLevelSchema.parse('detailed')).toBe('detailed')
        expect(flagThrottleLevelSchema.parse('all')).toBe('all')
      })

      it('rejects invalid throttle levels', () => {
        expect(() => flagThrottleLevelSchema.parse('none')).toThrow()
        expect(() => flagThrottleLevelSchema.parse('maximum')).toThrow()
        expect(() => flagThrottleLevelSchema.parse('')).toThrow()
      })
    })

    describe('FLAG_THROTTLE_LIMITS constant', () => {
      it('maps minimal to 1 alert/day', () => {
        expect(FLAG_THROTTLE_LIMITS.minimal).toBe(1)
      })

      it('maps standard to 3 alerts/day', () => {
        expect(FLAG_THROTTLE_LIMITS.standard).toBe(3)
      })

      it('maps detailed to 5 alerts/day', () => {
        expect(FLAG_THROTTLE_LIMITS.detailed).toBe(5)
      })

      it('maps all to Infinity (no limit)', () => {
        expect(FLAG_THROTTLE_LIMITS.all).toBe(Infinity)
      })
    })

    describe('flagThrottleStateSchema', () => {
      const validState = {
        childId: 'child-123',
        familyId: 'family-456',
        date: '2024-01-15',
        alertsSentToday: 2,
        throttledToday: 1,
        alertedFlagIds: ['flag-1', 'flag-2'],
        severityCounts: {
          high: 1,
          medium: 1,
          low: 0,
        },
      }

      it('parses valid throttle state', () => {
        const state = flagThrottleStateSchema.parse(validState)
        expect(state.childId).toBe('child-123')
        expect(state.familyId).toBe('family-456')
        expect(state.date).toBe('2024-01-15')
        expect(state.alertsSentToday).toBe(2)
        expect(state.throttledToday).toBe(1)
        expect(state.alertedFlagIds).toEqual(['flag-1', 'flag-2'])
        expect(state.severityCounts.high).toBe(1)
        expect(state.severityCounts.medium).toBe(1)
        expect(state.severityCounts.low).toBe(0)
      })

      it('provides default values', () => {
        const minimalState = flagThrottleStateSchema.parse({
          childId: 'child-123',
          familyId: 'family-456',
          date: '2024-01-15',
        })
        expect(minimalState.alertsSentToday).toBe(0)
        expect(minimalState.throttledToday).toBe(0)
        expect(minimalState.alertedFlagIds).toEqual([])
        expect(minimalState.severityCounts).toEqual({ high: 0, medium: 0, low: 0 })
      })

      it('validates date format (YYYY-MM-DD)', () => {
        expect(() =>
          flagThrottleStateSchema.parse({
            ...validState,
            date: '01-15-2024', // Wrong format
          })
        ).toThrow()

        expect(() =>
          flagThrottleStateSchema.parse({
            ...validState,
            date: '2024/01/15', // Wrong separator
          })
        ).toThrow()
      })

      it('requires childId and familyId', () => {
        expect(() =>
          flagThrottleStateSchema.parse({
            date: '2024-01-15',
          })
        ).toThrow()
      })
    })

    describe('throttledConcernFlagSchema', () => {
      const baseFlag = {
        category: 'Bullying' as const,
        severity: 'medium' as const,
        confidence: 75,
        reasoning: 'Contains potentially hurtful language directed at another person',
        detectedAt: Date.now(),
      }

      it('parses valid throttled flag', () => {
        const now = Date.now()
        const flag = throttledConcernFlagSchema.parse({
          ...baseFlag,
          status: 'pending',
          throttled: true,
          throttledAt: now,
        })
        expect(flag.category).toBe('Bullying')
        expect(flag.status).toBe('pending')
        expect(flag.throttled).toBe(true)
        expect(flag.throttledAt).toBe(now)
      })

      it('provides default values for status and throttled', () => {
        const flag = throttledConcernFlagSchema.parse(baseFlag)
        expect(flag.status).toBe('pending')
        expect(flag.throttled).toBe(false)
        expect(flag.throttledAt).toBeUndefined()
      })

      it('allows suppression fields from 21-2', () => {
        const releaseTime = Date.now() + 48 * 60 * 60 * 1000
        const flag = throttledConcernFlagSchema.parse({
          ...baseFlag,
          status: 'sensitive_hold',
          throttled: false,
          suppressionReason: 'self_harm_detected',
          releasableAfter: releaseTime,
        })
        expect(flag.status).toBe('sensitive_hold')
        expect(flag.suppressionReason).toBe('self_harm_detected')
        expect(flag.releasableAfter).toBe(releaseTime)
      })

      it('allows combining throttle and suppression', () => {
        const flag = throttledConcernFlagSchema.parse({
          ...baseFlag,
          status: 'sensitive_hold',
          throttled: true,
          throttledAt: Date.now(),
          suppressionReason: 'distress_signals',
        })
        expect(flag.throttled).toBe(true)
        expect(flag.suppressionReason).toBe('distress_signals')
      })

      it('rejects invalid status', () => {
        expect(() =>
          throttledConcernFlagSchema.parse({
            ...baseFlag,
            status: 'invalid_status',
          })
        ).toThrow()
      })

      it('rejects invalid suppressionReason', () => {
        expect(() =>
          throttledConcernFlagSchema.parse({
            ...baseFlag,
            suppressionReason: 'invalid_reason',
          })
        ).toThrow()
      })
    })
  })

  // Story 21.4: Confidence Thresholds
  describe('Confidence Threshold Schemas (Story 21.4)', () => {
    describe('CONFIDENCE_THRESHOLD_LEVELS', () => {
      it('defines expected threshold levels', () => {
        expect(CONFIDENCE_THRESHOLD_LEVELS).toContain('sensitive')
        expect(CONFIDENCE_THRESHOLD_LEVELS).toContain('balanced')
        expect(CONFIDENCE_THRESHOLD_LEVELS).toContain('relaxed')
        expect(CONFIDENCE_THRESHOLD_LEVELS).toHaveLength(3)
      })
    })

    describe('confidenceThresholdLevelSchema', () => {
      it('accepts valid threshold levels', () => {
        expect(confidenceThresholdLevelSchema.parse('sensitive')).toBe('sensitive')
        expect(confidenceThresholdLevelSchema.parse('balanced')).toBe('balanced')
        expect(confidenceThresholdLevelSchema.parse('relaxed')).toBe('relaxed')
      })

      it('rejects invalid threshold levels', () => {
        expect(() => confidenceThresholdLevelSchema.parse('high')).toThrow()
        expect(() => confidenceThresholdLevelSchema.parse('low')).toThrow()
        expect(() => confidenceThresholdLevelSchema.parse('')).toThrow()
      })
    })

    describe('CONFIDENCE_THRESHOLD_VALUES', () => {
      it('maps sensitive to 60', () => {
        expect(CONFIDENCE_THRESHOLD_VALUES.sensitive).toBe(60)
      })

      it('maps balanced to 75', () => {
        expect(CONFIDENCE_THRESHOLD_VALUES.balanced).toBe(75)
      })

      it('maps relaxed to 90', () => {
        expect(CONFIDENCE_THRESHOLD_VALUES.relaxed).toBe(90)
      })

      it('has all threshold levels mapped', () => {
        expect(Object.keys(CONFIDENCE_THRESHOLD_VALUES)).toHaveLength(3)
        for (const level of CONFIDENCE_THRESHOLD_LEVELS) {
          expect(CONFIDENCE_THRESHOLD_VALUES[level]).toBeDefined()
          expect(typeof CONFIDENCE_THRESHOLD_VALUES[level]).toBe('number')
        }
      })

      it('has ascending order: sensitive < balanced < relaxed', () => {
        expect(CONFIDENCE_THRESHOLD_VALUES.sensitive).toBeLessThan(
          CONFIDENCE_THRESHOLD_VALUES.balanced
        )
        expect(CONFIDENCE_THRESHOLD_VALUES.balanced).toBeLessThan(
          CONFIDENCE_THRESHOLD_VALUES.relaxed
        )
      })
    })

    describe('ALWAYS_FLAG_THRESHOLD', () => {
      it('is 95', () => {
        expect(ALWAYS_FLAG_THRESHOLD).toBe(95)
      })

      it('is above all configurable threshold values', () => {
        expect(ALWAYS_FLAG_THRESHOLD).toBeGreaterThan(CONFIDENCE_THRESHOLD_VALUES.relaxed)
      })
    })

    describe('categoryConfidenceThresholdsSchema', () => {
      it('accepts valid per-category thresholds', () => {
        const thresholds = categoryConfidenceThresholdsSchema.parse({
          Violence: 80,
          'Self-Harm Indicators': 50,
          'Explicit Language': 70,
        })
        expect(thresholds).toEqual({
          Violence: 80,
          'Self-Harm Indicators': 50,
          'Explicit Language': 70,
        })
      })

      it('accepts undefined (no overrides)', () => {
        const thresholds = categoryConfidenceThresholdsSchema.parse(undefined)
        expect(thresholds).toBeUndefined()
      })

      it('accepts empty object (no overrides)', () => {
        const thresholds = categoryConfidenceThresholdsSchema.parse({})
        expect(thresholds).toEqual({})
      })

      it('rejects thresholds below minimum (50)', () => {
        expect(() =>
          categoryConfidenceThresholdsSchema.parse({
            Violence: 49,
          })
        ).toThrow()
      })

      it('rejects thresholds above maximum (94)', () => {
        expect(() =>
          categoryConfidenceThresholdsSchema.parse({
            Violence: 95,
          })
        ).toThrow()
      })

      it('accepts boundary values (50 and 94)', () => {
        const thresholds = categoryConfidenceThresholdsSchema.parse({
          Violence: 50,
          Bullying: 94,
        })
        expect(thresholds?.Violence).toBe(50)
        expect(thresholds?.Bullying).toBe(94)
      })

      it('rejects invalid category names', () => {
        expect(() =>
          categoryConfidenceThresholdsSchema.parse({
            InvalidCategory: 75,
          })
        ).toThrow()
      })
    })
  })

  // Story 21.5: Flag Document
  describe('Flag Document Schema (Story 21.5)', () => {
    const now = Date.now()
    const validFlagDocument = {
      id: 'screenshot-123_Violence_1704067200000',
      childId: 'child-456',
      familyId: 'family-789',
      screenshotRef: 'children/child-456/screenshots/screenshot-123',
      screenshotId: 'screenshot-123',
      category: 'Violence' as const,
      severity: 'medium' as const,
      confidence: 75,
      reasoning: 'Screenshot shows violent video game content',
      createdAt: now,
      status: 'pending' as const,
      throttled: false,
    }

    describe('flagDocumentSchema', () => {
      it('parses valid flag document with all required fields (AC1, AC2)', () => {
        const flag = flagDocumentSchema.parse(validFlagDocument)
        expect(flag.id).toBe('screenshot-123_Violence_1704067200000')
        expect(flag.childId).toBe('child-456')
        expect(flag.familyId).toBe('family-789')
        expect(flag.screenshotRef).toBe('children/child-456/screenshots/screenshot-123')
        expect(flag.screenshotId).toBe('screenshot-123')
        expect(flag.category).toBe('Violence')
        expect(flag.severity).toBe('medium')
        expect(flag.confidence).toBe(75)
        expect(flag.reasoning).toBe('Screenshot shows violent video game content')
        expect(flag.createdAt).toBe(now)
        expect(flag.status).toBe('pending')
        expect(flag.throttled).toBe(false)
      })

      it('defaults status to pending when not provided', () => {
        const { status: _status, ...flagWithoutStatus } = validFlagDocument
        const flag = flagDocumentSchema.parse(flagWithoutStatus)
        expect(flag.status).toBe('pending')
      })

      it('defaults throttled to false when not provided', () => {
        const { throttled: _throttled, ...flagWithoutThrottle } = validFlagDocument
        const flag = flagDocumentSchema.parse(flagWithoutThrottle)
        expect(flag.throttled).toBe(false)
      })

      it('accepts all valid concern categories (AC2)', () => {
        for (const category of CONCERN_CATEGORY_VALUES) {
          const flag = flagDocumentSchema.parse({
            ...validFlagDocument,
            category,
          })
          expect(flag.category).toBe(category)
        }
      })

      it('accepts all valid severity levels (AC2)', () => {
        for (const severity of ['low', 'medium', 'high'] as const) {
          const flag = flagDocumentSchema.parse({
            ...validFlagDocument,
            severity,
          })
          expect(flag.severity).toBe(severity)
        }
      })

      it('accepts all valid flag statuses (AC2)', () => {
        for (const status of FLAG_STATUS_VALUES) {
          const flag = flagDocumentSchema.parse({
            ...validFlagDocument,
            status,
          })
          expect(flag.status).toBe(status)
        }
      })

      it('validates confidence range (0-100)', () => {
        // Valid boundary values
        expect(flagDocumentSchema.parse({ ...validFlagDocument, confidence: 0 }).confidence).toBe(0)
        expect(flagDocumentSchema.parse({ ...validFlagDocument, confidence: 100 }).confidence).toBe(
          100
        )

        // Invalid values
        expect(() => flagDocumentSchema.parse({ ...validFlagDocument, confidence: -1 })).toThrow()
        expect(() => flagDocumentSchema.parse({ ...validFlagDocument, confidence: 101 })).toThrow()
      })

      it('parses flag with suppression fields (AC6)', () => {
        const releaseTime = now + 48 * 60 * 60 * 1000
        const flag = flagDocumentSchema.parse({
          ...validFlagDocument,
          category: 'Self-Harm Indicators',
          status: 'sensitive_hold',
          suppressionReason: 'self_harm_detected',
          releasableAfter: releaseTime,
        })
        expect(flag.status).toBe('sensitive_hold')
        expect(flag.suppressionReason).toBe('self_harm_detected')
        expect(flag.releasableAfter).toBe(releaseTime)
      })

      it('parses flag with throttle fields (AC5)', () => {
        const throttleTime = now - 1000
        const flag = flagDocumentSchema.parse({
          ...validFlagDocument,
          throttled: true,
          throttledAt: throttleTime,
        })
        expect(flag.throttled).toBe(true)
        expect(flag.throttledAt).toBe(throttleTime)
      })

      it('parses flag combining suppression and throttle fields', () => {
        const releaseTime = now + 48 * 60 * 60 * 1000
        const throttleTime = now - 1000
        const flag = flagDocumentSchema.parse({
          ...validFlagDocument,
          category: 'Self-Harm Indicators',
          status: 'sensitive_hold',
          suppressionReason: 'distress_signals',
          releasableAfter: releaseTime,
          throttled: true,
          throttledAt: throttleTime,
        })
        expect(flag.suppressionReason).toBe('distress_signals')
        expect(flag.releasableAfter).toBe(releaseTime)
        expect(flag.throttled).toBe(true)
        expect(flag.throttledAt).toBe(throttleTime)
      })

      it('requires all mandatory fields', () => {
        expect(() => flagDocumentSchema.parse({})).toThrow()
        expect(() =>
          flagDocumentSchema.parse({
            id: 'flag-123',
            // Missing other required fields
          })
        ).toThrow()
      })

      it('rejects invalid category', () => {
        expect(() =>
          flagDocumentSchema.parse({
            ...validFlagDocument,
            category: 'Gaming', // Basic category, not concern
          })
        ).toThrow()
      })

      it('rejects invalid severity', () => {
        expect(() =>
          flagDocumentSchema.parse({
            ...validFlagDocument,
            severity: 'critical', // Invalid severity
          })
        ).toThrow()
      })

      it('rejects invalid status', () => {
        expect(() =>
          flagDocumentSchema.parse({
            ...validFlagDocument,
            status: 'invalid_status',
          })
        ).toThrow()
      })

      it('rejects invalid suppressionReason', () => {
        expect(() =>
          flagDocumentSchema.parse({
            ...validFlagDocument,
            suppressionReason: 'invalid_reason',
          })
        ).toThrow()
      })

      it('allows optional fields to be undefined', () => {
        const flag = flagDocumentSchema.parse(validFlagDocument)
        expect(flag.suppressionReason).toBeUndefined()
        expect(flag.releasableAfter).toBeUndefined()
        expect(flag.throttledAt).toBeUndefined()
      })

      it('generates correct flag ID format (AC1)', () => {
        // Flag ID format: {screenshotId}_{category}_{timestamp}
        const flagId = 'screenshot-123_Violence_1704067200000'
        const flag = flagDocumentSchema.parse({
          ...validFlagDocument,
          id: flagId,
        })
        expect(flag.id).toBe(flagId)
        // Verify the ID can be parsed back to components
        const [screenshotId, category, timestamp] = flag.id.split('_')
        expect(screenshotId).toBe('screenshot-123')
        expect(category).toBe('Violence')
        expect(timestamp).toBe('1704067200000')
      })

      it('stores correct screenshotRef format (AC3)', () => {
        const flag = flagDocumentSchema.parse(validFlagDocument)
        // Format: children/{childId}/screenshots/{screenshotId}
        expect(flag.screenshotRef).toBe('children/child-456/screenshots/screenshot-123')
        expect(flag.screenshotRef).toContain(flag.childId)
        expect(flag.screenshotRef).toContain(flag.screenshotId)
      })
    })
  })
})
