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
})
