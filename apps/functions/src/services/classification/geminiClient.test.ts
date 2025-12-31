/**
 * Gemini Client Tests
 *
 * Story 20.1: Classification Service Architecture - AC2, AC3
 * Story 20.2: Basic Category Taxonomy - AC6 (low confidence fallback)
 * Story 20.3: Confidence Score Assignment - AC4, AC6 (needsReview flag)
 *
 * @vitest-environment node
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GeminiClient } from './geminiClient'
import { LOW_CONFIDENCE_THRESHOLD, TAXONOMY_VERSION } from '@fledgely/shared'

// Mock Vertex AI
const mockGenerateContent = vi.fn()

vi.mock('@google-cloud/vertexai', () => ({
  VertexAI: vi.fn().mockImplementation(() => ({
    getGenerativeModel: vi.fn().mockReturnValue({
      generateContent: mockGenerateContent,
    }),
  })),
}))

// Mock logger
vi.mock('firebase-functions/logger', () => ({
  error: vi.fn(),
  warn: vi.fn(),
  info: vi.fn(),
}))

describe('GeminiClient', () => {
  let client: GeminiClient

  beforeEach(() => {
    vi.clearAllMocks()

    // Create mock VertexAI instance
    const mockVertexAI = {
      getGenerativeModel: vi.fn().mockReturnValue({
        generateContent: mockGenerateContent,
      }),
    }

    // @ts-expect-error - simplified mock
    client = new GeminiClient(mockVertexAI, 'gemini-1.5-flash')
  })

  describe('getModelVersion', () => {
    it('returns the configured model version', () => {
      expect(client.getModelVersion()).toBe('gemini-1.5-flash')
    })
  })

  describe('classifyImage', () => {
    const mockValidResponse = (category: string, confidence: number) => ({
      response: {
        candidates: [
          {
            content: {
              parts: [
                {
                  text: JSON.stringify({
                    primaryCategory: category,
                    confidence,
                    reasoning: 'Test reasoning',
                  }),
                },
              ],
            },
          },
        ],
      },
    })

    it('returns classification result for valid response', async () => {
      mockGenerateContent.mockResolvedValue(mockValidResponse('Gaming', 85))

      const result = await client.classifyImage('base64ImageData')

      expect(result.primaryCategory).toBe('Gaming')
      expect(result.confidence).toBe(85)
      expect(result.reasoning).toBe('Test reasoning')
      expect(result.isLowConfidence).toBe(false)
      expect(result.taxonomyVersion).toBe(TAXONOMY_VERSION)
      expect(result.needsReview).toBe(false) // Story 20.3: 85% >= MEDIUM threshold
    })

    it('calls API with correct image data', async () => {
      mockGenerateContent.mockResolvedValue(mockValidResponse('Educational', 90))

      await client.classifyImage('testBase64', 'image/jpeg')

      expect(mockGenerateContent).toHaveBeenCalledWith({
        contents: [
          {
            role: 'user',
            parts: expect.arrayContaining([
              expect.objectContaining({
                inlineData: {
                  mimeType: 'image/jpeg',
                  data: 'testBase64',
                },
              }),
            ]),
          },
        ],
      })
    })

    it('includes URL context in prompt when provided', async () => {
      mockGenerateContent.mockResolvedValue(mockValidResponse('Social Media', 75))

      await client.classifyImage('base64', 'image/jpeg', 'https://twitter.com', 'Twitter')

      const callArg = mockGenerateContent.mock.calls[0][0]
      const textPart = callArg.contents[0].parts.find((p: { text?: string }) => p.text)

      expect(textPart.text).toContain('https://twitter.com')
      expect(textPart.text).toContain('Twitter')
    })

    it('handles JSON wrapped in markdown code blocks', async () => {
      mockGenerateContent.mockResolvedValue({
        response: {
          candidates: [
            {
              content: {
                parts: [
                  {
                    text: '```json\n{"primaryCategory": "Gaming", "confidence": 80, "reasoning": "Test"}\n```',
                  },
                ],
              },
            },
          ],
        },
      })

      const result = await client.classifyImage('base64')

      expect(result.primaryCategory).toBe('Gaming')
      expect(result.confidence).toBe(80)
    })

    it('handles invalid category by defaulting to Other', async () => {
      mockGenerateContent.mockResolvedValue({
        response: {
          candidates: [
            {
              content: {
                parts: [
                  {
                    text: JSON.stringify({
                      primaryCategory: 'InvalidCategory',
                      confidence: 50,
                    }),
                  },
                ],
              },
            },
          ],
        },
      })

      const result = await client.classifyImage('base64')

      expect(result.primaryCategory).toBe('Other')
      expect(result.confidence).toBe(0)
      expect(result.isLowConfidence).toBe(true)
      expect(result.taxonomyVersion).toBe(TAXONOMY_VERSION)
      expect(result.needsReview).toBe(true) // Story 20.3: invalid category always needs review
    })

    // Story 20.2: Basic Category Taxonomy - AC6
    describe('low confidence fallback', () => {
      it('assigns Other when confidence is below threshold', async () => {
        mockGenerateContent.mockResolvedValue(
          mockValidResponse('Gaming', LOW_CONFIDENCE_THRESHOLD - 1)
        )

        const result = await client.classifyImage('base64')

        expect(result.primaryCategory).toBe('Other')
        expect(result.confidence).toBe(LOW_CONFIDENCE_THRESHOLD - 1)
        expect(result.isLowConfidence).toBe(true)
        expect(result.reasoning).toContain('Low confidence')
        expect(result.needsReview).toBe(true) // Story 20.3
      })

      it('keeps original category when confidence equals threshold', async () => {
        mockGenerateContent.mockResolvedValue(mockValidResponse('Gaming', LOW_CONFIDENCE_THRESHOLD))

        const result = await client.classifyImage('base64')

        expect(result.primaryCategory).toBe('Gaming')
        expect(result.confidence).toBe(LOW_CONFIDENCE_THRESHOLD)
        expect(result.isLowConfidence).toBe(false)
      })

      it('keeps original category when confidence exceeds threshold', async () => {
        mockGenerateContent.mockResolvedValue(
          mockValidResponse('Gaming', LOW_CONFIDENCE_THRESHOLD + 1)
        )

        const result = await client.classifyImage('base64')

        expect(result.primaryCategory).toBe('Gaming')
        expect(result.confidence).toBe(LOW_CONFIDENCE_THRESHOLD + 1)
        expect(result.isLowConfidence).toBe(false)
      })

      it('includes original reasoning in low confidence fallback', async () => {
        mockGenerateContent.mockResolvedValue(mockValidResponse('Gaming', 20))

        const result = await client.classifyImage('base64')

        expect(result.reasoning).toContain('20%')
        expect(result.reasoning).toContain('Test reasoning')
      })
    })

    // Story 20.3: Confidence Score Assignment - AC4, AC6
    describe('needsReview flag', () => {
      it('sets needsReview=false for high confidence (>= 85)', async () => {
        mockGenerateContent.mockResolvedValue(mockValidResponse('Gaming', 85))

        const result = await client.classifyImage('base64')

        expect(result.needsReview).toBe(false)
        expect(result.confidence).toBe(85)
      })

      it('sets needsReview=false for medium confidence (60-84)', async () => {
        mockGenerateContent.mockResolvedValue(mockValidResponse('Gaming', 75))

        const result = await client.classifyImage('base64')

        expect(result.needsReview).toBe(false)
        expect(result.confidence).toBe(75)
      })

      it('sets needsReview=true for low confidence (< 60)', async () => {
        mockGenerateContent.mockResolvedValue(mockValidResponse('Gaming', 59))

        const result = await client.classifyImage('base64')

        expect(result.needsReview).toBe(true)
        expect(result.confidence).toBe(59)
      })

      it('sets needsReview=true for isLowConfidence fallback', async () => {
        mockGenerateContent.mockResolvedValue(mockValidResponse('Gaming', 25))

        const result = await client.classifyImage('base64')

        // With 25% confidence, falls below LOW_CONFIDENCE_THRESHOLD (30)
        expect(result.isLowConfidence).toBe(true)
        expect(result.needsReview).toBe(true)
      })

      it('handles boundary at 60% correctly', async () => {
        mockGenerateContent.mockResolvedValue(mockValidResponse('Gaming', 60))

        const result = await client.classifyImage('base64')

        // 60% is exactly at MEDIUM threshold - should NOT need review
        expect(result.needsReview).toBe(false)
      })

      it('handles boundary at 59% correctly', async () => {
        mockGenerateContent.mockResolvedValue(mockValidResponse('Gaming', 59))

        const result = await client.classifyImage('base64')

        // 59% is below MEDIUM threshold - should need review
        expect(result.needsReview).toBe(true)
      })
    })

    // Story 20.4: Multi-Label Classification - AC1, AC2, AC3
    describe('multi-label classification', () => {
      const mockMultiLabelResponse = (
        primary: string,
        primaryConfidence: number,
        secondary: Array<{ category: string; confidence: number }>
      ) => ({
        response: {
          candidates: [
            {
              content: {
                parts: [
                  {
                    text: JSON.stringify({
                      primaryCategory: primary,
                      confidence: primaryConfidence,
                      reasoning: 'Test reasoning',
                      secondaryCategories: secondary,
                    }),
                  },
                ],
              },
            },
          ],
        },
      })

      it('returns empty secondaryCategories when none provided', async () => {
        mockGenerateContent.mockResolvedValue(mockValidResponse('Gaming', 85))

        const result = await client.classifyImage('base64')

        expect(result.secondaryCategories).toEqual([])
      })

      it('parses valid secondary categories', async () => {
        mockGenerateContent.mockResolvedValue(
          mockMultiLabelResponse('Educational', 75, [{ category: 'Entertainment', confidence: 55 }])
        )

        const result = await client.classifyImage('base64')

        expect(result.primaryCategory).toBe('Educational')
        expect(result.secondaryCategories).toHaveLength(1)
        expect(result.secondaryCategories[0].category).toBe('Entertainment')
        expect(result.secondaryCategories[0].confidence).toBe(55)
      })

      it('filters secondary categories below 50% threshold', async () => {
        mockGenerateContent.mockResolvedValue(
          mockMultiLabelResponse('Educational', 75, [
            { category: 'Entertainment', confidence: 50 }, // Exactly at threshold - excluded
            { category: 'Gaming', confidence: 49 }, // Below threshold - excluded
          ])
        )

        const result = await client.classifyImage('base64')

        expect(result.secondaryCategories).toEqual([])
      })

      it('includes secondary categories above 50% threshold', async () => {
        mockGenerateContent.mockResolvedValue(
          mockMultiLabelResponse('Educational', 75, [
            { category: 'Entertainment', confidence: 51 }, // Above threshold - included
          ])
        )

        const result = await client.classifyImage('base64')

        expect(result.secondaryCategories).toHaveLength(1)
        expect(result.secondaryCategories[0].confidence).toBe(51)
      })

      it('limits to maximum 2 secondary categories', async () => {
        mockGenerateContent.mockResolvedValue(
          mockMultiLabelResponse('Educational', 75, [
            { category: 'Entertainment', confidence: 70 },
            { category: 'Gaming', confidence: 65 },
            { category: 'Social Media', confidence: 60 },
          ])
        )

        const result = await client.classifyImage('base64')

        expect(result.secondaryCategories).toHaveLength(2)
        // Should be sorted by confidence descending
        expect(result.secondaryCategories[0].category).toBe('Entertainment')
        expect(result.secondaryCategories[1].category).toBe('Gaming')
      })

      it('excludes secondary category that matches primary', async () => {
        mockGenerateContent.mockResolvedValue(
          mockMultiLabelResponse('Educational', 75, [
            { category: 'Educational', confidence: 60 }, // Same as primary - excluded
            { category: 'Entertainment', confidence: 55 },
          ])
        )

        const result = await client.classifyImage('base64')

        expect(result.secondaryCategories).toHaveLength(1)
        expect(result.secondaryCategories[0].category).toBe('Entertainment')
      })

      it('filters invalid secondary categories', async () => {
        mockGenerateContent.mockResolvedValue(
          mockMultiLabelResponse('Educational', 75, [
            { category: 'InvalidCategory', confidence: 60 }, // Invalid - excluded
            { category: 'Entertainment', confidence: 55 },
          ])
        )

        const result = await client.classifyImage('base64')

        expect(result.secondaryCategories).toHaveLength(1)
        expect(result.secondaryCategories[0].category).toBe('Entertainment')
      })

      it('sorts secondary categories by confidence descending', async () => {
        mockGenerateContent.mockResolvedValue(
          mockMultiLabelResponse('Educational', 75, [
            { category: 'Gaming', confidence: 52 },
            { category: 'Entertainment', confidence: 65 },
          ])
        )

        const result = await client.classifyImage('base64')

        expect(result.secondaryCategories[0].category).toBe('Entertainment')
        expect(result.secondaryCategories[0].confidence).toBe(65)
        expect(result.secondaryCategories[1].category).toBe('Gaming')
        expect(result.secondaryCategories[1].confidence).toBe(52)
      })

      it('returns empty secondaryCategories for low confidence primary', async () => {
        mockGenerateContent.mockResolvedValue(
          mockMultiLabelResponse('Educational', 25, [{ category: 'Entertainment', confidence: 55 }])
        )

        const result = await client.classifyImage('base64')

        // Low confidence falls back to Other with no secondary categories
        expect(result.primaryCategory).toBe('Other')
        expect(result.isLowConfidence).toBe(true)
        expect(result.secondaryCategories).toEqual([])
      })
    })

    it('throws error on empty response', async () => {
      mockGenerateContent.mockResolvedValue({
        response: {
          candidates: [],
        },
      })

      await expect(client.classifyImage('base64')).rejects.toThrow('Empty response from Gemini API')
    })

    it('throws error on invalid JSON response', async () => {
      mockGenerateContent.mockResolvedValue({
        response: {
          candidates: [
            {
              content: {
                parts: [{ text: 'Not valid JSON at all' }],
              },
            },
          ],
        },
      })

      await expect(client.classifyImage('base64')).rejects.toThrow(
        'Invalid JSON response from Gemini API'
      )
    })

    it('clamps confidence to valid range', async () => {
      mockGenerateContent.mockResolvedValue({
        response: {
          candidates: [
            {
              content: {
                parts: [
                  {
                    text: JSON.stringify({
                      primaryCategory: 'Gaming',
                      confidence: 150, // Invalid - over 100
                    }),
                  },
                ],
              },
            },
          ],
        },
      })

      const result = await client.classifyImage('base64')

      expect(result.confidence).toBe(100)
    })

    it('handles missing confidence by defaulting to 0', async () => {
      mockGenerateContent.mockResolvedValue({
        response: {
          candidates: [
            {
              content: {
                parts: [
                  {
                    text: JSON.stringify({
                      primaryCategory: 'Gaming',
                      // No confidence field
                    }),
                  },
                ],
              },
            },
          ],
        },
      })

      const result = await client.classifyImage('base64')

      expect(result.confidence).toBe(0)
    })

    it('handles missing reasoning by defaulting to empty string', async () => {
      mockGenerateContent.mockResolvedValue({
        response: {
          candidates: [
            {
              content: {
                parts: [
                  {
                    text: JSON.stringify({
                      primaryCategory: 'Gaming',
                      confidence: 80,
                      // No reasoning field
                    }),
                  },
                ],
              },
            },
          ],
        },
      })

      const result = await client.classifyImage('base64')

      expect(result.reasoning).toBe('')
    })

    it('times out after configured timeout (NFR3: 30 seconds)', async () => {
      // Mock a slow API response that exceeds timeout
      mockGenerateContent.mockImplementation(() => {
        return new Promise((resolve) => {
          // Never resolves - simulates hanging API
          setTimeout(() => resolve({}), 60000)
        })
      })

      // The classifyImage uses Promise.race with timeout
      // This test verifies the timeout mechanism exists
      // Use a short timeout for the test
      vi.useFakeTimers()

      const classifyPromise = client.classifyImage('base64')

      // Fast-forward past the timeout
      vi.advanceTimersByTime(31000)

      vi.useRealTimers()

      // The promise should have rejected due to timeout
      // Note: actual timeout is handled internally in classifyImage
      await expect(classifyPromise).rejects.toThrow(/timed out/i)
    }, 10000)
  })
})
