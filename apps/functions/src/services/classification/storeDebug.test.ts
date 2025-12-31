/**
 * Classification Debug Storage Tests
 *
 * Story 20.5: Classification Metadata Storage - AC4
 *
 * @vitest-environment node
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { storeClassificationDebug, getDebugForScreenshot } from './storeDebug'
import { DEBUG_RETENTION_MS } from '@fledgely/shared'

// Mock firebase-admin/firestore
const mockAdd = vi.fn()
const mockGet = vi.fn()
const mockWhere = vi.fn()
const mockOrderBy = vi.fn()
const mockLimit = vi.fn()
const mockCollection = vi.fn()

vi.mock('firebase-admin/firestore', () => ({
  getFirestore: () => ({
    collection: mockCollection,
  }),
}))

// Mock firebase-functions/logger
vi.mock('firebase-functions/logger', () => ({
  debug: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
}))

describe('storeDebug', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Setup default mock chain
    mockCollection.mockReturnValue({
      add: mockAdd,
      where: mockWhere,
    })
    mockWhere.mockReturnValue({ orderBy: mockOrderBy })
    mockOrderBy.mockReturnValue({ limit: mockLimit })
    mockLimit.mockReturnValue({ get: mockGet })
  })

  describe('storeClassificationDebug', () => {
    it('stores debug data with all fields', async () => {
      const mockDocRef = { id: 'debug-123' }
      mockAdd.mockResolvedValue(mockDocRef)

      const input = {
        screenshotId: 'screenshot-456',
        childId: 'child-789',
        requestContext: {
          url: 'https://example.com',
          title: 'Example Page',
          imageSize: 50000,
        },
        rawResponse: '{"primaryCategory":"Gaming","confidence":85}',
        parsedResult: {
          primaryCategory: 'Gaming' as const,
          confidence: 85,
          reasoning: 'Screenshot shows game interface',
        },
        modelVersion: 'gemini-1.5-flash',
        taxonomyVersion: '1.0.0',
        processingTimeMs: 250,
      }

      const result = await storeClassificationDebug(input)

      expect(result).toBe('debug-123')
      expect(mockCollection).toHaveBeenCalledWith('classificationDebug')
      expect(mockAdd).toHaveBeenCalledWith(
        expect.objectContaining({
          screenshotId: 'screenshot-456',
          childId: 'child-789',
          modelVersion: 'gemini-1.5-flash',
          taxonomyVersion: '1.0.0',
          processingTimeMs: 250,
        })
      )
    })

    it('sets expiresAt to 30 days from creation', async () => {
      const mockDocRef = { id: 'debug-123' }
      mockAdd.mockResolvedValue(mockDocRef)

      const beforeCall = Date.now()

      await storeClassificationDebug({
        screenshotId: 'screenshot-456',
        childId: 'child-789',
        requestContext: {},
        rawResponse: '{}',
        parsedResult: {
          primaryCategory: 'Other' as const,
          confidence: 30,
        },
        modelVersion: 'gemini-1.5-flash',
        taxonomyVersion: '1.0.0',
      })

      const afterCall = Date.now()

      // Verify expiresAt is set to approximately 30 days from now
      const calledWith = mockAdd.mock.calls[0][0]
      expect(calledWith.expiresAt).toBeGreaterThanOrEqual(beforeCall + DEBUG_RETENTION_MS)
      expect(calledWith.expiresAt).toBeLessThanOrEqual(afterCall + DEBUG_RETENTION_MS)
    })

    it('handles Firestore errors gracefully', async () => {
      mockAdd.mockRejectedValue(new Error('Firestore unavailable'))

      const result = await storeClassificationDebug({
        screenshotId: 'screenshot-456',
        childId: 'child-789',
        requestContext: {},
        rawResponse: '{}',
        parsedResult: {
          primaryCategory: 'Gaming' as const,
          confidence: 85,
        },
        modelVersion: 'gemini-1.5-flash',
        taxonomyVersion: '1.0.0',
      })

      // Should return empty string on error, not throw
      expect(result).toBe('')
    })

    it('stores secondary categories in parsed result', async () => {
      const mockDocRef = { id: 'debug-123' }
      mockAdd.mockResolvedValue(mockDocRef)

      await storeClassificationDebug({
        screenshotId: 'screenshot-456',
        childId: 'child-789',
        requestContext: {},
        rawResponse: '{}',
        parsedResult: {
          primaryCategory: 'Educational' as const,
          confidence: 75,
          secondaryCategories: [{ category: 'Entertainment' as const, confidence: 55 }],
        },
        modelVersion: 'gemini-1.5-flash',
        taxonomyVersion: '1.0.0',
      })

      const calledWith = mockAdd.mock.calls[0][0]
      expect(calledWith.parsedResult.secondaryCategories).toHaveLength(1)
      expect(calledWith.parsedResult.secondaryCategories[0].category).toBe('Entertainment')
    })
  })

  describe('getDebugForScreenshot', () => {
    it('returns debug record for screenshot', async () => {
      const mockDebugData = {
        screenshotId: 'screenshot-456',
        childId: 'child-789',
        timestamp: Date.now(),
        modelVersion: 'gemini-1.5-flash',
      }

      mockGet.mockResolvedValue({
        empty: false,
        docs: [{ data: () => mockDebugData }],
      })

      const result = await getDebugForScreenshot('screenshot-456')

      expect(result).toEqual(mockDebugData)
      expect(mockCollection).toHaveBeenCalledWith('classificationDebug')
      expect(mockWhere).toHaveBeenCalledWith('screenshotId', '==', 'screenshot-456')
      expect(mockOrderBy).toHaveBeenCalledWith('timestamp', 'desc')
      expect(mockLimit).toHaveBeenCalledWith(1)
    })

    it('returns null when no debug record exists', async () => {
      mockGet.mockResolvedValue({
        empty: true,
        docs: [],
      })

      const result = await getDebugForScreenshot('nonexistent-screenshot')

      expect(result).toBeNull()
    })
  })
})
