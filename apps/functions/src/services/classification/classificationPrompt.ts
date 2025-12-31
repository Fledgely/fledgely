/**
 * Classification Prompt Template
 *
 * Story 20.1: Classification Service Architecture - AC2
 * Story 20.2: Basic Category Taxonomy - AC4
 * Story 20.4: Multi-Label Classification - AC1, AC2, AC6
 *
 * Prompt template for Gemini Vision API screenshot classification.
 * Uses family-friendly, non-judgmental category labels with detailed definitions.
 * Supports multi-label classification for mixed-content screenshots.
 */

import {
  buildCategoryDefinitionsForPrompt,
  LOW_CONFIDENCE_THRESHOLD,
  CONFIDENCE_THRESHOLDS,
  MAX_CATEGORIES,
} from '@fledgely/shared'

/**
 * Build the base classification prompt with detailed category definitions.
 *
 * Story 20.2: Basic Category Taxonomy - AC4
 * Story 20.4: Multi-Label Classification - AC1, AC2, AC6
 * Includes comprehensive category definitions with examples for consistent AI classification.
 * Supports multi-label output for mixed-content screenshots.
 */
function buildBasePrompt(): string {
  return `You are a screenshot classifier for a family parental control application.
Your job is to classify screenshots into a PRIMARY category, and optionally SECONDARY categories if the screenshot contains mixed content.

IMPORTANT: Be factual and objective. Do not make moral judgments.
Labels are descriptive, not judgmental - all categories are neutral.
Respond ONLY with valid JSON matching the schema below.

Category Definitions (with examples):
${buildCategoryDefinitionsForPrompt()}

Edge Case Guidance:
- YouTube: Educational if learning content, Entertainment if casual watching, Homework if for assignment
- Discord: Communication if direct messaging, Social Media if browsing servers
- Wikipedia: Homework if for school project, Educational if general browsing
- Coding: Educational if learning, Creative if building projects
- School art project: Homework (if assignment), Creative (if personal)

Multi-Label Examples:
- YouTube homework video: primaryCategory="Educational", secondaryCategories=[{"category":"Entertainment","confidence":55}]
- Gaming tutorial: primaryCategory="Gaming", secondaryCategories=[{"category":"Educational","confidence":60}]
- Discord homework help: primaryCategory="Communication", secondaryCategories=[{"category":"Homework","confidence":52}]

Response JSON schema:
{
  "primaryCategory": "<one of the categories above>",
  "confidence": <0-100 integer for primary category>,
  "secondaryCategories": [
    {"category": "<category name>", "confidence": <0-100 integer>}
  ],
  "reasoning": "<brief explanation>"
}

Rules:
1. Always choose exactly ONE primary category (highest confidence)
2. confidence should reflect how certain you are (0 = unsure, 100 = certain)
3. Only include secondaryCategories if they have confidence > ${CONFIDENCE_THRESHOLDS.SECONDARY}
4. Maximum ${MAX_CATEGORIES - 1} secondary categories (total max ${MAX_CATEGORIES} categories)
5. Secondary categories must be different from primary category
6. If you cannot see or understand the image, return confidence 0 and category "Other"
7. If confidence is below ${LOW_CONFIDENCE_THRESHOLD} for all categories, use "Other"
8. reasoning should be 1-2 sentences maximum`
}

/**
 * Base classification prompt for Gemini Vision API.
 *
 * Story 20.1: Classification Service Architecture - AC2
 * Story 20.2: Basic Category Taxonomy - AC4
 * Instructs the model to classify screenshots into predefined categories.
 */
export const CLASSIFICATION_PROMPT = buildBasePrompt()

/**
 * Build classification prompt with optional context hints.
 *
 * Story 20.1: Classification Service Architecture - AC2
 * Adds URL and title context when available to improve classification accuracy.
 *
 * @param url - Optional page URL for context
 * @param title - Optional page title for context
 * @returns Complete prompt string
 */
export function buildClassificationPrompt(url?: string, title?: string): string {
  const contextHints: string[] = []

  if (url) {
    contextHints.push(`URL: ${url}`)
  }

  if (title) {
    contextHints.push(`Page Title: ${title}`)
  }

  if (contextHints.length === 0) {
    return CLASSIFICATION_PROMPT
  }

  return `${CLASSIFICATION_PROMPT}

Context hints (use these to help with classification):
${contextHints.join('\n')}`
}
