/**
 * Classify Screenshot Tests
 *
 * Story 20.1: Classification Service Architecture - AC2, AC3, AC4, AC6
 * Story 21.1: Concerning Content Categories - AC1, AC3, AC5
 *
 * @vitest-environment node
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// Use vi.hoisted to define mocks before module imports
const {
  mockUpdate,
  mockScreenshotDoc,
  mockScreenshotsCollection,
  mockChildDoc,
  mockChildrenCollection,
  mockDownload,
  mockExists,
  mockFile,
  mockBucket,
  mockClassifyImage,
  mockDetectConcerns,
  mockGetModelVersion,
} = vi.hoisted(() => ({
  mockUpdate: vi.fn().mockResolvedValue(undefined),
  mockScreenshotDoc: vi.fn(),
  mockScreenshotsCollection: vi.fn(),
  mockChildDoc: vi.fn(),
  mockChildrenCollection: vi.fn(),
  mockDownload: vi.fn().mockResolvedValue([Buffer.from('fake-image-data')]),
  mockExists: vi.fn().mockResolvedValue([true]),
  mockFile: vi.fn(),
  mockBucket: vi.fn(),
  mockClassifyImage: vi.fn(),
  mockDetectConcerns: vi.fn(),
  mockGetModelVersion: vi.fn().mockReturnValue('gemini-1.5-flash'),
}))

// Wire up nested mock structure
mockScreenshotDoc.mockReturnValue({ update: mockUpdate })
mockScreenshotsCollection.mockReturnValue({ doc: mockScreenshotDoc })
mockChildDoc.mockReturnValue({ collection: mockScreenshotsCollection })
mockChildrenCollection.mockReturnValue({ doc: mockChildDoc })
mockFile.mockReturnValue({ exists: mockExists, download: mockDownload })
mockBucket.mockReturnValue({ file: mockFile })

// Mock logger
vi.mock('firebase-functions/logger', () => ({
  error: vi.fn(),
  warn: vi.fn(),
  info: vi.fn(),
}))

// Mock Firebase Admin - supports nested collections
vi.mock('firebase-admin/firestore', () => ({
  getFirestore: vi.fn(() => ({
    collection: mockChildrenCollection,
  })),
}))

// Mock Firebase Storage
vi.mock('firebase-admin/storage', () => ({
  getStorage: vi.fn(() => ({
    bucket: mockBucket,
  })),
}))

// Mock Gemini client
vi.mock('./geminiClient', () => ({
  createGeminiClient: vi.fn(() => ({
    classifyImage: mockClassifyImage,
    detectConcerns: mockDetectConcerns,
    getModelVersion: mockGetModelVersion,
  })),
}))

// Import tested modules after mocks are set up
import {
  needsClassification,
  buildClassificationJob,
  classifyScreenshot,
} from './classifyScreenshot'
import type { ClassificationJob } from '@fledgely/shared'

// Mock storeDebug
vi.mock('./storeDebug', () => ({
  storeClassificationDebug: vi.fn().mockResolvedValue(undefined),
}))

// Hoist additional mock functions
const {
  mockShouldAlertForFlag,
  mockRecordFlagAlert,
  mockRecordThrottledFlag,
  mockGetEffectiveThreshold,
} = vi.hoisted(() => ({
  mockShouldAlertForFlag: vi.fn().mockResolvedValue(true), // Default: alert all flags
  mockRecordFlagAlert: vi.fn().mockResolvedValue(undefined),
  mockRecordThrottledFlag: vi.fn().mockResolvedValue(undefined),
  mockGetEffectiveThreshold: vi.fn().mockResolvedValue(75), // Default: balanced
}))

// Mock flagThrottle (Story 21.3)
vi.mock('./flagThrottle', () => ({
  shouldAlertForFlag: (...args: unknown[]) => mockShouldAlertForFlag(...args),
  recordFlagAlert: (...args: unknown[]) => mockRecordFlagAlert(...args),
  recordThrottledFlag: (...args: unknown[]) => mockRecordThrottledFlag(...args),
}))

// Mock confidenceThreshold (Story 21.4)
// Note: shouldCreateFlag is no longer used - we call getEffectiveThreshold directly and check inline
vi.mock('./confidenceThreshold', () => ({
  getEffectiveThreshold: (...args: unknown[]) => mockGetEffectiveThreshold(...args),
}))

// Mock accessibility service (Story 28.1)
vi.mock('../accessibility', () => ({
  generateScreenshotDescriptionAsync: vi.fn(),
}))

describe('classifyScreenshot helpers', () => {
  describe('needsClassification', () => {
    it('returns false for undefined document', () => {
      expect(needsClassification(undefined)).toBe(false)
    })

    it('returns false if already completed', () => {
      const doc = {
        classification: { status: 'completed' },
      }
      expect(needsClassification(doc)).toBe(false)
    })

    it('returns false if currently processing', () => {
      const doc = {
        classification: { status: 'processing' },
      }
      expect(needsClassification(doc)).toBe(false)
    })

    it('returns true if status is pending', () => {
      const doc = {
        classification: { status: 'pending' },
      }
      expect(needsClassification(doc)).toBe(true)
    })

    it('returns true if status is failed (for retry)', () => {
      const doc = {
        classification: { status: 'failed' },
      }
      expect(needsClassification(doc)).toBe(true)
    })

    it('returns true if no classification exists', () => {
      const doc = {
        storagePath: 'screenshots/child-1/2024-01-01/123.jpg',
      }
      expect(needsClassification(doc)).toBe(true)
    })
  })

  describe('buildClassificationJob', () => {
    it('returns null for undefined document', () => {
      expect(buildClassificationJob(undefined, 'screenshot-123')).toBeNull()
    })

    it('returns null if childId is missing', () => {
      const doc = {
        familyId: 'family-123',
        storagePath: 'path/to/image.jpg',
      }
      expect(buildClassificationJob(doc, 'screenshot-123')).toBeNull()
    })

    it('returns null if familyId is missing', () => {
      const doc = {
        childId: 'child-123',
        storagePath: 'path/to/image.jpg',
      }
      expect(buildClassificationJob(doc, 'screenshot-123')).toBeNull()
    })

    it('returns null if storagePath is missing', () => {
      const doc = {
        childId: 'child-123',
        familyId: 'family-123',
      }
      expect(buildClassificationJob(doc, 'screenshot-123')).toBeNull()
    })

    it('builds job with required fields', () => {
      const doc = {
        childId: 'child-123',
        familyId: 'family-123',
        storagePath: 'screenshots/child-123/2024-01-01/123.jpg',
      }

      const job = buildClassificationJob(doc, 'screenshot-123')

      expect(job).toEqual({
        childId: 'child-123',
        screenshotId: 'screenshot-123',
        storagePath: 'screenshots/child-123/2024-01-01/123.jpg',
        url: undefined,
        title: undefined,
        familyId: 'family-123',
        retryCount: 0,
      })
    })

    it('includes optional url and title', () => {
      const doc = {
        childId: 'child-123',
        familyId: 'family-123',
        storagePath: 'screenshots/child-123/2024-01-01/123.jpg',
        url: 'https://example.com',
        title: 'Example Page',
      }

      const job = buildClassificationJob(doc, 'screenshot-123')

      expect(job?.url).toBe('https://example.com')
      expect(job?.title).toBe('Example Page')
    })

    it('preserves existing retry count', () => {
      const doc = {
        childId: 'child-123',
        familyId: 'family-123',
        storagePath: 'screenshots/child-123/2024-01-01/123.jpg',
        classification: {
          status: 'failed',
          retryCount: 2,
        },
      }

      const job = buildClassificationJob(doc, 'screenshot-123')

      expect(job?.retryCount).toBe(2)
    })
  })
})

// Story 21.1: Concerning Content Categories - AC1, AC3, AC5
describe('classifyScreenshot integration', () => {
  const baseJob: ClassificationJob = {
    childId: 'child-123',
    screenshotId: 'screenshot-456',
    storagePath: 'screenshots/child-123/2024-01-01/456.jpg',
    familyId: 'family-789',
    retryCount: 0,
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockExists.mockResolvedValue([true])
    mockDownload.mockResolvedValue([Buffer.from('fake-image-data')])
  })

  it('calls both classifyImage and detectConcerns (AC1, AC3)', async () => {
    mockClassifyImage.mockResolvedValue({
      primaryCategory: 'Gaming',
      confidence: 85,
      reasoning: 'Video game content',
      isLowConfidence: false,
      taxonomyVersion: '1.0',
      needsReview: false,
      secondaryCategories: [],
      rawResponse: '{}',
    })
    mockDetectConcerns.mockResolvedValue({
      hasConcerns: false,
      concerns: [],
      taxonomyVersion: '1.0',
      rawResponse: '{}',
    })

    const result = await classifyScreenshot(baseJob)

    expect(result.success).toBe(true)
    expect(mockClassifyImage).toHaveBeenCalledTimes(1)
    expect(mockDetectConcerns).toHaveBeenCalledTimes(1)
  })

  it('stores concern flags alongside basic classification (AC3)', async () => {
    mockClassifyImage.mockResolvedValue({
      primaryCategory: 'Gaming',
      confidence: 85,
      reasoning: 'Video game content',
      isLowConfidence: false,
      taxonomyVersion: '1.0',
      needsReview: false,
      secondaryCategories: [],
      rawResponse: '{}',
    })
    mockDetectConcerns.mockResolvedValue({
      hasConcerns: true,
      concerns: [
        {
          category: 'Violence',
          severity: 'medium',
          confidence: 75,
          reasoning: 'Game shows combat with weapons',
        },
      ],
      taxonomyVersion: '1.0',
      rawResponse: '{}',
    })

    await classifyScreenshot(baseJob)

    // Verify final update includes both category and concerns
    const finalUpdateCall = mockUpdate.mock.calls[mockUpdate.mock.calls.length - 1][0]
    expect(finalUpdateCall.classification.primaryCategory).toBe('Gaming')
    expect(finalUpdateCall.classification.concernFlags).toHaveLength(1)
    expect(finalUpdateCall.classification.concernFlags[0].category).toBe('Violence')
    expect(finalUpdateCall.classification.concernFlags[0].severity).toBe('medium')
  })

  it('includes reasoning in concern flags (AC5)', async () => {
    mockClassifyImage.mockResolvedValue({
      primaryCategory: 'Social Media',
      confidence: 90,
      reasoning: 'Chat application',
      isLowConfidence: false,
      taxonomyVersion: '1.0',
      needsReview: false,
      secondaryCategories: [],
      rawResponse: '{}',
    })
    mockDetectConcerns.mockResolvedValue({
      hasConcerns: true,
      concerns: [
        {
          category: 'Bullying',
          severity: 'high',
          confidence: 80,
          reasoning: 'Message contains threatening language and insults',
        },
      ],
      taxonomyVersion: '1.0',
      rawResponse: '{}',
    })

    await classifyScreenshot(baseJob)

    const finalUpdateCall = mockUpdate.mock.calls[mockUpdate.mock.calls.length - 1][0]
    expect(finalUpdateCall.classification.concernFlags[0].reasoning).toBe(
      'Message contains threatening language and insults'
    )
  })

  it('does not include concernFlags when no concerns detected', async () => {
    mockClassifyImage.mockResolvedValue({
      primaryCategory: 'Educational',
      confidence: 95,
      reasoning: 'Learning content',
      isLowConfidence: false,
      taxonomyVersion: '1.0',
      needsReview: false,
      secondaryCategories: [],
      rawResponse: '{}',
    })
    mockDetectConcerns.mockResolvedValue({
      hasConcerns: false,
      concerns: [],
      taxonomyVersion: '1.0',
      rawResponse: '{}',
    })

    await classifyScreenshot(baseJob)

    const finalUpdateCall = mockUpdate.mock.calls[mockUpdate.mock.calls.length - 1][0]
    expect(finalUpdateCall.classification.concernFlags).toBeUndefined()
    expect(finalUpdateCall.classification.concernTaxonomyVersion).toBeUndefined()
  })

  it('handles multiple concerns on same screenshot', async () => {
    mockClassifyImage.mockResolvedValue({
      primaryCategory: 'Communication',
      confidence: 85,
      reasoning: 'Chat app',
      isLowConfidence: false,
      taxonomyVersion: '1.0',
      needsReview: false,
      secondaryCategories: [],
      rawResponse: '{}',
    })
    mockDetectConcerns.mockResolvedValue({
      hasConcerns: true,
      concerns: [
        {
          category: 'Unknown Contacts',
          severity: 'high',
          confidence: 85, // Above default threshold of 75
          reasoning: 'Stranger requesting personal info',
        },
        {
          category: 'Explicit Language',
          severity: 'low',
          confidence: 80, // Above default threshold of 75
          reasoning: 'Mild profanity in message',
        },
      ],
      taxonomyVersion: '1.0',
      rawResponse: '{}',
    })

    await classifyScreenshot(baseJob)

    const finalUpdateCall = mockUpdate.mock.calls[mockUpdate.mock.calls.length - 1][0]
    expect(finalUpdateCall.classification.concernFlags).toHaveLength(2)
    expect(finalUpdateCall.classification.concernTaxonomyVersion).toBe('1.0')
  })

  it('includes detectedAt timestamp for each concern flag', async () => {
    const beforeTime = Date.now()

    mockClassifyImage.mockResolvedValue({
      primaryCategory: 'Gaming',
      confidence: 85,
      reasoning: 'Game',
      isLowConfidence: false,
      taxonomyVersion: '1.0',
      needsReview: false,
      secondaryCategories: [],
      rawResponse: '{}',
    })
    mockDetectConcerns.mockResolvedValue({
      hasConcerns: true,
      concerns: [
        {
          category: 'Violence',
          severity: 'low',
          confidence: 80, // Above default threshold of 75
          reasoning: 'Cartoon combat',
        },
      ],
      taxonomyVersion: '1.0',
      rawResponse: '{}',
    })

    await classifyScreenshot(baseJob)

    const afterTime = Date.now()
    const finalUpdateCall = mockUpdate.mock.calls[mockUpdate.mock.calls.length - 1][0]
    const detectedAt = finalUpdateCall.classification.concernFlags[0].detectedAt

    expect(detectedAt).toBeGreaterThanOrEqual(beforeTime)
    expect(detectedAt).toBeLessThanOrEqual(afterTime)
  })

  it('fails entire classification if concern detection fails', async () => {
    mockClassifyImage.mockResolvedValue({
      primaryCategory: 'Gaming',
      confidence: 85,
      reasoning: 'Game',
      isLowConfidence: false,
      taxonomyVersion: '1.0',
      needsReview: false,
      secondaryCategories: [],
      rawResponse: '{}',
    })
    mockDetectConcerns.mockRejectedValue(new Error('Concern detection API error'))

    const result = await classifyScreenshot(baseJob)

    expect(result.success).toBe(false)
    expect(result.error).toContain('Concern detection API error')
  })
})

// Story 21.4: Confidence Threshold Tests
describe('classifyScreenshot confidence threshold filtering (Story 21.4)', () => {
  const baseJob: ClassificationJob = {
    childId: 'child-123',
    screenshotId: 'screenshot-456',
    storagePath: 'screenshots/child-123/2024-01-01/456.jpg',
    familyId: 'family-789',
    retryCount: 0,
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockExists.mockResolvedValue([true])
    mockDownload.mockResolvedValue([Buffer.from('fake-image-data')])
    mockGetEffectiveThreshold.mockResolvedValue(75) // Default: balanced
  })

  it('filters out concerns below threshold (AC1)', async () => {
    mockClassifyImage.mockResolvedValue({
      primaryCategory: 'Gaming',
      confidence: 85,
      reasoning: 'Game',
      isLowConfidence: false,
      taxonomyVersion: '1.0',
      needsReview: false,
      secondaryCategories: [],
      rawResponse: '{}',
    })
    mockDetectConcerns.mockResolvedValue({
      hasConcerns: true,
      concerns: [
        {
          category: 'Violence',
          severity: 'high',
          confidence: 80, // Above threshold (75) - should be included
          reasoning: 'High violence content',
        },
        {
          category: 'Explicit Language',
          severity: 'low',
          confidence: 50, // Below threshold (75) - should be filtered
          reasoning: 'Low profanity',
        },
      ],
      taxonomyVersion: '1.0',
      rawResponse: '{}',
    })

    // Default threshold is 75%, so Violence (80%) passes, Explicit Language (50%) filtered
    await classifyScreenshot(baseJob)

    const finalUpdateCall = mockUpdate.mock.calls[mockUpdate.mock.calls.length - 1][0]
    // Only the Violence concern should be included
    expect(finalUpdateCall.classification.concernFlags).toHaveLength(1)
    expect(finalUpdateCall.classification.concernFlags[0].category).toBe('Violence')
  })

  it('always includes concerns at 95%+ confidence regardless of threshold (AC5)', async () => {
    // Set a high threshold that would normally filter out the concern
    mockGetEffectiveThreshold.mockResolvedValue(90) // Relaxed threshold

    mockClassifyImage.mockResolvedValue({
      primaryCategory: 'Gaming',
      confidence: 85,
      reasoning: 'Game',
      isLowConfidence: false,
      taxonomyVersion: '1.0',
      needsReview: false,
      secondaryCategories: [],
      rawResponse: '{}',
    })
    mockDetectConcerns.mockResolvedValue({
      hasConcerns: true,
      concerns: [
        {
          category: 'Violence', // Use Violence instead of Self-Harm to avoid suppression logic
          severity: 'high',
          confidence: 96, // Above always-flag threshold (95%)
          reasoning: 'Critical violence content',
        },
      ],
      taxonomyVersion: '1.0',
      rawResponse: '{}',
    })

    await classifyScreenshot(baseJob)

    const finalUpdateCall = mockUpdate.mock.calls[mockUpdate.mock.calls.length - 1][0]
    // Should still be included because 96% >= ALWAYS_FLAG_THRESHOLD (95%)
    expect(finalUpdateCall.classification.concernFlags).toHaveLength(1)
    expect(finalUpdateCall.classification.concernFlags[0].confidence).toBe(96)
  })

  it('calls getEffectiveThreshold for each concern', async () => {
    mockClassifyImage.mockResolvedValue({
      primaryCategory: 'Gaming',
      confidence: 85,
      reasoning: 'Game',
      isLowConfidence: false,
      taxonomyVersion: '1.0',
      needsReview: false,
      secondaryCategories: [],
      rawResponse: '{}',
    })
    mockDetectConcerns.mockResolvedValue({
      hasConcerns: true,
      concerns: [
        { category: 'Violence', severity: 'high', confidence: 80, reasoning: 'Violence' },
        { category: 'Cyberbullying', severity: 'medium', confidence: 80, reasoning: 'Bullying' },
        { category: 'Explicit Language', severity: 'low', confidence: 80, reasoning: 'Language' },
      ],
      taxonomyVersion: '1.0',
      rawResponse: '{}',
    })

    await classifyScreenshot(baseJob)

    // Should call getEffectiveThreshold once for each concern
    expect(mockGetEffectiveThreshold).toHaveBeenCalledTimes(3)
    expect(mockGetEffectiveThreshold).toHaveBeenCalledWith('family-789', 'Violence')
    expect(mockGetEffectiveThreshold).toHaveBeenCalledWith('family-789', 'Cyberbullying')
    expect(mockGetEffectiveThreshold).toHaveBeenCalledWith('family-789', 'Explicit Language')
  })

  it('discards all concerns if all are below threshold', async () => {
    mockClassifyImage.mockResolvedValue({
      primaryCategory: 'Gaming',
      confidence: 85,
      reasoning: 'Game',
      isLowConfidence: false,
      taxonomyVersion: '1.0',
      needsReview: false,
      secondaryCategories: [],
      rawResponse: '{}',
    })
    mockDetectConcerns.mockResolvedValue({
      hasConcerns: true, // Gemini detected concerns but all below threshold
      concerns: [
        { category: 'Violence', severity: 'low', confidence: 55, reasoning: 'Minor violence' },
        {
          category: 'Explicit Language',
          severity: 'low',
          confidence: 45,
          reasoning: 'Mild language',
        },
      ],
      taxonomyVersion: '1.0',
      rawResponse: '{}',
    })

    // Default threshold is 75%, both concerns are below
    await classifyScreenshot(baseJob)

    const finalUpdateCall = mockUpdate.mock.calls[mockUpdate.mock.calls.length - 1][0]
    // No concerns should be stored
    expect(finalUpdateCall.classification.concernFlags).toBeUndefined()
    expect(finalUpdateCall.classification.concernTaxonomyVersion).toBeUndefined()
  })

  it('threshold filtering happens before suppression and throttling', async () => {
    // This test verifies the correct order: filter first, then apply suppression/throttling
    // Use Violence category to avoid Self-Harm suppression path
    mockClassifyImage.mockResolvedValue({
      primaryCategory: 'Gaming',
      confidence: 85,
      reasoning: 'Game',
      isLowConfidence: false,
      taxonomyVersion: '1.0',
      needsReview: false,
      secondaryCategories: [],
      rawResponse: '{}',
    })
    mockDetectConcerns.mockResolvedValue({
      hasConcerns: true,
      concerns: [
        {
          category: 'Violence', // Use Violence to avoid suppression path
          severity: 'high',
          confidence: 90, // Above default threshold of 75
          reasoning: 'Violence content',
        },
      ],
      taxonomyVersion: '1.0',
      rawResponse: '{}',
    })

    await classifyScreenshot(baseJob)

    // Verify getEffectiveThreshold was called before throttle functions
    expect(mockGetEffectiveThreshold).toHaveBeenCalled()
    expect(mockShouldAlertForFlag).toHaveBeenCalled()

    // getEffectiveThreshold should be called first (before throttling)
    const thresholdCallOrder = mockGetEffectiveThreshold.mock.invocationCallOrder[0]
    const alertFlagCallOrder = mockShouldAlertForFlag.mock.invocationCallOrder[0]
    expect(thresholdCallOrder).toBeLessThan(alertFlagCallOrder)
  })
})
