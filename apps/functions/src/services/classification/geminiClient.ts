/**
 * Gemini Vision API Client
 *
 * Story 20.1: Classification Service Architecture - AC2, AC3
 * Story 20.2: Basic Category Taxonomy - AC6 (low confidence fallback)
 * Story 20.3: Confidence Score Assignment - AC4, AC6 (needsReview flag)
 * Story 20.4: Multi-Label Classification - AC1, AC2, AC3
 *
 * Wrapper for Vertex AI Gemini Vision API for screenshot classification.
 */

import { VertexAI, GenerativeModel, Part } from '@google-cloud/vertexai'
import {
  CLASSIFICATION_CONFIG,
  type Category,
  type SecondaryCategory,
  CATEGORY_VALUES,
  LOW_CONFIDENCE_THRESHOLD,
  TAXONOMY_VERSION,
  classificationNeedsReview,
  CONFIDENCE_THRESHOLDS,
  MAX_CATEGORIES,
} from '@fledgely/shared'
import * as logger from 'firebase-functions/logger'
import { buildClassificationPrompt } from './classificationPrompt'

/**
 * Classification response from Gemini.
 *
 * Story 20.2: Basic Category Taxonomy - AC6
 * Story 20.3: Confidence Score Assignment - AC4, AC6
 * Story 20.4: Multi-Label Classification - AC1, AC2, AC3
 * Story 20.5: Classification Metadata Storage - AC4 (rawResponse)
 * Added isLowConfidence, taxonomyVersion, needsReview, secondaryCategories, and rawResponse fields.
 */
export interface GeminiClassificationResponse {
  primaryCategory: Category
  confidence: number
  reasoning: string
  /** True when confidence was below threshold and "Other" was assigned */
  isLowConfidence: boolean
  /** Taxonomy version used for classification */
  taxonomyVersion: string
  /**
   * Story 20.3: Confidence Score Assignment - AC4, AC6
   * True when classification needs manual review due to low confidence.
   * Set when confidence < 60% OR isLowConfidence=true.
   */
  needsReview: boolean
  /**
   * Story 20.4: Multi-Label Classification - AC2, AC3
   * Secondary categories with confidence > 50%, max 2 entries.
   * Empty array if no secondary categories qualify.
   */
  secondaryCategories: SecondaryCategory[]
  /**
   * Story 20.5: Classification Metadata Storage - AC4
   * Raw JSON response from Gemini API for debugging.
   */
  rawResponse: string
}

/**
 * Gemini client wrapper for screenshot classification.
 *
 * Story 20.1: Classification Service Architecture - AC2
 * Provides a clean interface for calling Gemini Vision API.
 */
export class GeminiClient {
  private model: GenerativeModel
  private readonly modelVersion: string

  constructor(vertexAI: VertexAI, modelName: string = CLASSIFICATION_CONFIG.MODEL_NAME) {
    this.model = vertexAI.getGenerativeModel({ model: modelName })
    this.modelVersion = modelName
  }

  /**
   * Get the model version being used.
   */
  getModelVersion(): string {
    return this.modelVersion
  }

  /**
   * Classify a screenshot image.
   *
   * Story 20.1: Classification Service Architecture - AC2, AC3
   *
   * @param imageBase64 - Base64-encoded image data (without data URL prefix)
   * @param mimeType - Image MIME type (e.g., 'image/jpeg')
   * @param url - Optional page URL for context
   * @param title - Optional page title for context
   * @returns Classification result with category and confidence
   * @throws Error if classification fails or times out
   */
  async classifyImage(
    imageBase64: string,
    mimeType: string = 'image/jpeg',
    url?: string,
    title?: string
  ): Promise<GeminiClassificationResponse> {
    const prompt = buildClassificationPrompt(url, title)

    // Build request parts
    const parts: Part[] = [
      {
        inlineData: {
          mimeType,
          data: imageBase64,
        },
      },
      {
        text: prompt,
      },
    ]

    // Make API call with timeout
    const result = await Promise.race([
      this.model.generateContent({
        contents: [{ role: 'user', parts }],
      }),
      this.createTimeoutPromise(),
    ])

    // Extract response text
    const response = result.response
    const text = response.candidates?.[0]?.content?.parts?.[0]?.text

    if (!text) {
      throw new Error('Empty response from Gemini API')
    }

    // Parse JSON response and include raw response for debugging
    return this.parseClassificationResponse(text)
  }

  /**
   * Create timeout promise for race condition.
   *
   * Story 20.1: Classification Service Architecture - AC3
   * Ensures classification completes within NFR3 30-second limit.
   */
  private createTimeoutPromise(): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Classification timed out after ${CLASSIFICATION_CONFIG.TIMEOUT_MS}ms`))
      }, CLASSIFICATION_CONFIG.TIMEOUT_MS)
    })
  }

  /**
   * Parse Gemini response text into classification result.
   *
   * Story 20.2: Basic Category Taxonomy - AC6
   * Story 20.4: Multi-Label Classification - AC1, AC2, AC3
   * Story 20.5: Classification Metadata Storage - AC4 (rawResponse)
   * Added low-confidence fallback logic, multi-label support, and raw response.
   *
   * @param responseText - Raw text response from Gemini
   * @returns Parsed classification response with rawResponse included
   * @throws Error if response cannot be parsed
   */
  private parseClassificationResponse(responseText: string): GeminiClassificationResponse {
    // Store raw response for debugging (Story 20.5 AC4)
    const rawResponse = responseText
    // Try to extract JSON from response (may be wrapped in markdown code blocks)
    let jsonText = responseText.trim()

    // Remove markdown code blocks if present
    const jsonMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)\s*```/)
    if (jsonMatch) {
      jsonText = jsonMatch[1].trim()
    }

    // Try to find JSON object in response
    const jsonObjectMatch = jsonText.match(/\{[\s\S]*\}/)
    if (jsonObjectMatch) {
      jsonText = jsonObjectMatch[0]
    }

    let parsed: {
      primaryCategory?: string
      confidence?: number
      reasoning?: string
      secondaryCategories?: Array<{ category?: string; confidence?: number }>
    }
    try {
      parsed = JSON.parse(jsonText)
    } catch (parseError) {
      logger.error('Failed to parse Gemini response as JSON', {
        responseText: responseText.substring(0, 500),
        error: parseError instanceof Error ? parseError.message : String(parseError),
      })
      throw new Error('Invalid JSON response from Gemini API')
    }

    // Validate category
    const category = parsed.primaryCategory as Category
    if (!category || !CATEGORY_VALUES.includes(category)) {
      logger.warn('Invalid category in Gemini response, defaulting to Other', {
        receivedCategory: parsed.primaryCategory,
      })
      return {
        primaryCategory: 'Other',
        confidence: 0,
        reasoning: 'Could not determine category',
        isLowConfidence: true,
        taxonomyVersion: TAXONOMY_VERSION,
        needsReview: true, // Story 20.3: Always needs review when category invalid
        secondaryCategories: [],
        rawResponse, // Story 20.5 AC4
      }
    }

    // Validate confidence
    let confidence = parsed.confidence ?? 0
    if (typeof confidence !== 'number' || confidence < 0 || confidence > 100) {
      confidence = Math.max(0, Math.min(100, Number(confidence) || 0))
    }
    confidence = Math.round(confidence)

    // Story 20.4: Parse and validate secondary categories
    const secondaryCategories = this.parseSecondaryCategories(parsed.secondaryCategories, category)

    // Story 20.2: Basic Category Taxonomy - AC6
    // If confidence is below threshold, assign to "Other" with isLowConfidence flag
    if (confidence < LOW_CONFIDENCE_THRESHOLD) {
      logger.info('Low confidence classification, falling back to Other', {
        originalCategory: category,
        confidence,
        threshold: LOW_CONFIDENCE_THRESHOLD,
      })
      return {
        primaryCategory: 'Other',
        confidence,
        reasoning: `Low confidence (${confidence}%) - ${parsed.reasoning || 'uncertain classification'}`,
        isLowConfidence: true,
        taxonomyVersion: TAXONOMY_VERSION,
        needsReview: true, // Story 20.3: Low confidence always needs review
        secondaryCategories: [], // No secondary categories for low confidence
        rawResponse, // Story 20.5 AC4
      }
    }

    // Story 20.3: Confidence Score Assignment - AC4
    // Use classificationNeedsReview to determine if manual review is needed
    const needsReview = classificationNeedsReview(confidence, false)

    return {
      primaryCategory: category,
      confidence,
      reasoning: parsed.reasoning || '',
      isLowConfidence: false,
      taxonomyVersion: TAXONOMY_VERSION,
      needsReview, // Story 20.3: AC4 - flag for review when confidence < 60%
      secondaryCategories,
      rawResponse, // Story 20.5 AC4
    }
  }

  /**
   * Parse and validate secondary categories from Gemini response.
   *
   * Story 20.4: Multi-Label Classification - AC2, AC3
   * Filters by confidence threshold and limits to max 2 secondary categories.
   *
   * @param rawCategories - Raw secondary categories from response
   * @param primaryCategory - Primary category to exclude from secondary
   * @returns Validated and filtered secondary categories
   */
  private parseSecondaryCategories(
    rawCategories: Array<{ category?: string; confidence?: number }> | undefined,
    primaryCategory: Category
  ): SecondaryCategory[] {
    if (!rawCategories || !Array.isArray(rawCategories)) {
      return []
    }

    const validCategories: SecondaryCategory[] = []

    for (const raw of rawCategories) {
      // Validate category
      const category = raw.category as Category
      if (!category || !CATEGORY_VALUES.includes(category)) {
        continue
      }

      // Skip if same as primary category (AC3: must be different)
      if (category === primaryCategory) {
        continue
      }

      // Validate confidence
      let confidence = raw.confidence ?? 0
      if (typeof confidence !== 'number' || confidence < 0 || confidence > 100) {
        confidence = Math.max(0, Math.min(100, Number(confidence) || 0))
      }
      confidence = Math.round(confidence)

      // Story 20.4 AC2: Only include if confidence > 50%
      if (confidence <= CONFIDENCE_THRESHOLDS.SECONDARY) {
        continue
      }

      validCategories.push({ category, confidence })
    }

    // Sort by confidence descending
    validCategories.sort((a, b) => b.confidence - a.confidence)

    // Story 20.4 AC3: Maximum 2 secondary categories (total 3 max)
    const maxSecondary = MAX_CATEGORIES - 1
    return validCategories.slice(0, maxSecondary)
  }
}

/**
 * Create a GeminiClient instance with default configuration.
 *
 * Story 20.1: Classification Service Architecture - AC2
 *
 * @param projectId - GCP project ID (defaults to env variable)
 * @param location - Vertex AI location (defaults to config)
 * @returns Configured GeminiClient instance
 */
export function createGeminiClient(
  projectId?: string,
  location: string = CLASSIFICATION_CONFIG.LOCATION
): GeminiClient {
  const project = projectId || process.env.GCLOUD_PROJECT || process.env.GOOGLE_CLOUD_PROJECT

  if (!project) {
    throw new Error('GCP project ID not configured')
  }

  const vertexAI = new VertexAI({
    project,
    location,
  })

  return new GeminiClient(vertexAI)
}
