/**
 * Screenshot Description Service Tests
 *
 * Story 28.1: AI Description Generation - AC1, AC2, AC3, AC4, AC5, AC6
 *
 * @vitest-environment node
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// Use vi.hoisted to define mocks before module imports
const {
  mockUpdate,
  mockGet,
  mockScreenshotDoc,
  mockScreenshotsCollection,
  mockChildDoc,
  mockChildrenCollection,
  mockDownload,
  mockExists,
  mockFile,
  mockBucket,
  mockGenerateDescription,
  mockGetModelVersion,
} = vi.hoisted(() => ({
  mockUpdate: vi.fn().mockResolvedValue(undefined),
  mockGet: vi.fn(),
  mockScreenshotDoc: vi.fn(),
  mockScreenshotsCollection: vi.fn(),
  mockChildDoc: vi.fn(),
  mockChildrenCollection: vi.fn(),
  mockDownload: vi.fn().mockResolvedValue([Buffer.from('fake-image-data')]),
  mockExists: vi.fn().mockResolvedValue([true]),
  mockFile: vi.fn(),
  mockBucket: vi.fn(),
  mockGenerateDescription: vi.fn(),
  mockGetModelVersion: vi.fn().mockReturnValue('gemini-1.5-flash'),
}))

// Wire up nested mock structure
mockScreenshotDoc.mockReturnValue({ update: mockUpdate, get: mockGet })
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

// Mock Firebase Admin
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
vi.mock('../classification/geminiClient', () => ({
  createGeminiClient: vi.fn(() => ({
    generateDescription: mockGenerateDescription,
    getModelVersion: mockGetModelVersion,
  })),
}))

// Mock retryWithBackoff
vi.mock('../classification/retryWithBackoff', () => ({
  retryWithBackoff: vi.fn((fn) => fn()),
}))

// Import tested modules after mocks are set up
import {
  generateScreenshotDescription,
  generateScreenshotDescriptionAsync,
  needsDescriptionGeneration,
  getScreenshotDescription,
  _resetDbForTesting,
} from './screenshotDescriptionService'

describe('screenshotDescriptionService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    _resetDbForTesting()

    // Default successful mock responses
    mockGenerateDescription.mockResolvedValue({
      description: 'A YouTube video showing Minecraft gameplay with the title visible.',
      wordCount: 150,
      appsIdentified: ['YouTube', 'Chrome'],
      hasText: true,
      textExcerpt: 'Minecraft Building Tutorial',
      rawResponse: '{}',
    })
  })

  describe('generateScreenshotDescription', () => {
    const mockJob = {
      childId: 'child-123',
      screenshotId: 'screenshot-456',
      storagePath: 'screenshots/child-123/screenshot-456.jpg',
      url: 'https://youtube.com/watch?v=123',
      title: 'Minecraft Tutorial',
    }

    it('generates description successfully (AC1, AC2)', async () => {
      const result = await generateScreenshotDescription(mockJob)

      expect(result.success).toBe(true)
      expect(result.description).toBeDefined()
      expect(result.description?.status).toBe('completed')
      expect(result.description?.description).toContain('YouTube')
    })

    it('updates document to processing status', async () => {
      await generateScreenshotDescription(mockJob)

      expect(mockUpdate).toHaveBeenCalledWith({
        'accessibilityDescription.status': 'processing',
        'accessibilityDescription.retryCount': 0,
      })
    })

    it('stores description with metadata (AC5)', async () => {
      await generateScreenshotDescription(mockJob)

      // Second call is the final update with description
      const finalUpdate = mockUpdate.mock.calls[1][0]
      expect(finalUpdate.accessibilityDescription).toBeDefined()
      expect(finalUpdate.accessibilityDescription.status).toBe('completed')
      expect(finalUpdate.accessibilityDescription.wordCount).toBe(150)
      expect(finalUpdate.accessibilityDescription.modelVersion).toBe('gemini-1.5-flash')
      expect(finalUpdate.accessibilityDescription.generatedAt).toBeDefined()
    })

    it('returns word count (AC3)', async () => {
      const result = await generateScreenshotDescription(mockJob)

      expect(result.description?.wordCount).toBe(150)
    })

    it('handles retry count', async () => {
      const jobWithRetry = { ...mockJob, retryCount: 2 }

      await generateScreenshotDescription(jobWithRetry)

      expect(mockUpdate).toHaveBeenCalledWith({
        'accessibilityDescription.status': 'processing',
        'accessibilityDescription.retryCount': 2,
      })
    })

    it('handles missing image error', async () => {
      mockExists.mockResolvedValueOnce([false])

      const result = await generateScreenshotDescription(mockJob)

      expect(result.success).toBe(false)
      expect(result.error).toContain('Image not found')
    })

    it('handles Gemini API error', async () => {
      mockGenerateDescription.mockRejectedValueOnce(new Error('API timeout'))

      const result = await generateScreenshotDescription(mockJob)

      expect(result.success).toBe(false)
      expect(result.error).toBe('API timeout')
    })

    it('updates document with failure status on error', async () => {
      mockGenerateDescription.mockRejectedValueOnce(new Error('API failure'))

      await generateScreenshotDescription(mockJob)

      // Find the failure update call
      const failureUpdate = mockUpdate.mock.calls.find(
        (call) => call[0].accessibilityDescription?.status === 'failed'
      )
      expect(failureUpdate).toBeDefined()
      expect(failureUpdate[0].accessibilityDescription.error).toBe('API failure')
    })
  })

  describe('generateScreenshotDescriptionAsync (AC4)', () => {
    it('returns immediately without blocking', () => {
      const mockJob = {
        childId: 'child-123',
        screenshotId: 'screenshot-456',
        storagePath: 'screenshots/child-123/screenshot-456.jpg',
      }

      // This should not throw and should return void immediately
      const result = generateScreenshotDescriptionAsync(mockJob)

      expect(result).toBeUndefined()
    })

    it('handles errors without throwing', async () => {
      mockExists.mockResolvedValueOnce([false])

      const mockJob = {
        childId: 'child-123',
        screenshotId: 'screenshot-456',
        storagePath: 'screenshots/child-123/screenshot-456.jpg',
      }

      // Should not throw
      expect(() => generateScreenshotDescriptionAsync(mockJob)).not.toThrow()

      // Wait for async operation to complete
      await new Promise((resolve) => setTimeout(resolve, 100))
    })
  })

  describe('needsDescriptionGeneration', () => {
    it('returns false for undefined document', () => {
      expect(needsDescriptionGeneration(undefined)).toBe(false)
    })

    it('returns false if already completed', () => {
      const doc = {
        accessibilityDescription: { status: 'completed' },
      }
      expect(needsDescriptionGeneration(doc)).toBe(false)
    })

    it('returns false if currently processing', () => {
      const doc = {
        accessibilityDescription: { status: 'processing' },
      }
      expect(needsDescriptionGeneration(doc)).toBe(false)
    })

    it('returns true if pending', () => {
      const doc = {
        accessibilityDescription: { status: 'pending' },
      }
      expect(needsDescriptionGeneration(doc)).toBe(true)
    })

    it('returns true if failed (for retry)', () => {
      const doc = {
        accessibilityDescription: { status: 'failed' },
      }
      expect(needsDescriptionGeneration(doc)).toBe(true)
    })

    it('returns true if no description exists', () => {
      const doc = {
        classification: { status: 'completed' },
      }
      expect(needsDescriptionGeneration(doc)).toBe(true)
    })
  })

  describe('getScreenshotDescription', () => {
    it('returns description when it exists', async () => {
      mockGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({
          accessibilityDescription: {
            status: 'completed',
            description: 'Test description',
            wordCount: 100,
          },
        }),
      })

      const result = await getScreenshotDescription('child-123', 'screenshot-456')

      expect(result).toBeDefined()
      expect(result?.status).toBe('completed')
      expect(result?.description).toBe('Test description')
    })

    it('returns null when document does not exist', async () => {
      mockGet.mockResolvedValueOnce({
        exists: false,
      })

      const result = await getScreenshotDescription('child-123', 'screenshot-456')

      expect(result).toBeNull()
    })

    it('returns null when accessibilityDescription field is missing', async () => {
      mockGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({
          classification: { status: 'completed' },
        }),
      })

      const result = await getScreenshotDescription('child-123', 'screenshot-456')

      expect(result).toBeNull()
    })

    it('handles errors and returns null', async () => {
      mockGet.mockRejectedValueOnce(new Error('Firestore error'))

      const result = await getScreenshotDescription('child-123', 'screenshot-456')

      expect(result).toBeNull()
    })
  })
})
