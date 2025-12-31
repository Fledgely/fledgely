/**
 * Classification Prompt Tests
 *
 * Story 20.1: Classification Service Architecture - AC2
 * Story 20.2: Basic Category Taxonomy - AC4, AC6
 *
 * @vitest-environment node
 */

import { describe, it, expect } from 'vitest'
import { CLASSIFICATION_PROMPT, buildClassificationPrompt } from './classificationPrompt'
import { CATEGORY_VALUES, LOW_CONFIDENCE_THRESHOLD } from '@fledgely/shared'

describe('classificationPrompt', () => {
  describe('CLASSIFICATION_PROMPT', () => {
    it('includes all category values', () => {
      for (const category of CATEGORY_VALUES) {
        expect(CLASSIFICATION_PROMPT).toContain(category)
      }
    })

    it('includes JSON schema format', () => {
      expect(CLASSIFICATION_PROMPT).toContain('primaryCategory')
      expect(CLASSIFICATION_PROMPT).toContain('confidence')
      expect(CLASSIFICATION_PROMPT).toContain('reasoning')
    })

    it('specifies confidence range', () => {
      expect(CLASSIFICATION_PROMPT).toContain('0-100')
    })

    it('instructs to choose exactly one category', () => {
      expect(CLASSIFICATION_PROMPT).toContain('exactly ONE')
    })

    // Story 20.2: Basic Category Taxonomy - AC6
    it('includes low confidence threshold instruction', () => {
      expect(CLASSIFICATION_PROMPT).toContain(String(LOW_CONFIDENCE_THRESHOLD))
      expect(CLASSIFICATION_PROMPT).toContain('confidence is below')
    })

    // Story 20.2: Basic Category Taxonomy - AC4
    it('includes edge case guidance', () => {
      expect(CLASSIFICATION_PROMPT).toContain('Edge Case Guidance')
      expect(CLASSIFICATION_PROMPT).toContain('YouTube')
      expect(CLASSIFICATION_PROMPT).toContain('Discord')
      expect(CLASSIFICATION_PROMPT).toContain('Wikipedia')
    })

    it('includes category examples', () => {
      expect(CLASSIFICATION_PROMPT).toContain('Examples:')
    })

    // Story 20.4: Multi-Label Classification - AC1, AC2, AC6
    describe('multi-label classification support', () => {
      it('includes secondaryCategories in JSON schema', () => {
        expect(CLASSIFICATION_PROMPT).toContain('secondaryCategories')
      })

      it('specifies secondary category confidence threshold', () => {
        expect(CLASSIFICATION_PROMPT).toContain('50')
        expect(CLASSIFICATION_PROMPT).toContain('confidence >')
      })

      it('specifies maximum categories limit', () => {
        expect(CLASSIFICATION_PROMPT).toContain('Maximum')
        expect(CLASSIFICATION_PROMPT).toContain('secondary categories')
      })

      it('includes multi-label examples', () => {
        expect(CLASSIFICATION_PROMPT).toContain('Multi-Label Examples')
        expect(CLASSIFICATION_PROMPT).toContain('YouTube homework video')
        expect(CLASSIFICATION_PROMPT).toContain('Gaming tutorial')
      })

      it('specifies secondary categories must be different from primary', () => {
        expect(CLASSIFICATION_PROMPT).toContain('different from primary')
      })
    })
  })

  describe('buildClassificationPrompt', () => {
    it('returns base prompt when no context provided', () => {
      const result = buildClassificationPrompt()
      expect(result).toBe(CLASSIFICATION_PROMPT)
    })

    it('includes URL when provided', () => {
      const result = buildClassificationPrompt('https://example.com', undefined)
      expect(result).toContain('Context hints')
      expect(result).toContain('URL: https://example.com')
    })

    it('includes title when provided', () => {
      const result = buildClassificationPrompt(undefined, 'My Page Title')
      expect(result).toContain('Context hints')
      expect(result).toContain('Page Title: My Page Title')
    })

    it('includes both URL and title when both provided', () => {
      const result = buildClassificationPrompt('https://example.com', 'My Page Title')
      expect(result).toContain('Context hints')
      expect(result).toContain('URL: https://example.com')
      expect(result).toContain('Page Title: My Page Title')
    })

    it('always includes base prompt', () => {
      const result = buildClassificationPrompt('https://example.com', 'Title')
      expect(result).toContain('You are a screenshot classifier')
      expect(result).toContain('primaryCategory')
    })
  })
})
