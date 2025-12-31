/**
 * Description Prompt Tests
 *
 * Story 28.1: AI Description Generation - AC1, AC2, AC3
 *
 * @vitest-environment node
 */

import { describe, it, expect } from 'vitest'
import { buildDescriptionPrompt, DESCRIPTION_EXAMPLE } from './descriptionPrompt'

describe('buildDescriptionPrompt', () => {
  describe('basic prompt generation', () => {
    it('generates prompt without context', () => {
      const prompt = buildDescriptionPrompt()

      expect(prompt).toContain('accessibility description')
      expect(prompt).toContain('blind or visually impaired')
      expect(prompt).toContain('screen reader')
      expect(prompt).toContain('100-300 words')
      expect(prompt).toContain('No URL or title available')
    })

    it('includes URL context when provided', () => {
      const prompt = buildDescriptionPrompt('https://youtube.com/watch?v=123')

      expect(prompt).toContain('**Website:** youtube.com')
      expect(prompt).not.toContain('No URL or title available')
    })

    it('includes title context when provided', () => {
      const prompt = buildDescriptionPrompt(undefined, 'Minecraft Tutorial')

      expect(prompt).toContain('**Page Title:** Minecraft Tutorial')
      expect(prompt).not.toContain('No URL or title available')
    })

    it('includes both URL and title when provided', () => {
      const prompt = buildDescriptionPrompt('https://youtube.com/watch?v=123', 'Minecraft Tutorial')

      expect(prompt).toContain('**Website:** youtube.com')
      expect(prompt).toContain('**Page Title:** Minecraft Tutorial')
    })
  })

  describe('instruction content (AC1, AC2)', () => {
    it('includes instructions for app identification (AC2)', () => {
      const prompt = buildDescriptionPrompt()

      expect(prompt).toContain('applications or websites')
    })

    it('includes instructions for text extraction (AC2)', () => {
      const prompt = buildDescriptionPrompt()

      expect(prompt).toContain('visible text')
      expect(prompt).toContain('menus')
      expect(prompt).toContain('messages')
    })

    it('includes instructions for image description (AC2)', () => {
      const prompt = buildDescriptionPrompt()

      expect(prompt).toContain('images')
      expect(prompt).toContain('visual elements')
    })

    it('includes instructions for context (AC2)', () => {
      const prompt = buildDescriptionPrompt()

      expect(prompt).toContain('overall activity')
      expect(prompt).toContain('context')
    })

    it('specifies screen reader friendly language (AC1)', () => {
      const prompt = buildDescriptionPrompt()

      expect(prompt).toContain('screen readers')
      expect(prompt).toContain('clear')
      expect(prompt).toContain('simple language')
    })
  })

  describe('word count requirements (AC3)', () => {
    it('specifies 100-300 word range', () => {
      const prompt = buildDescriptionPrompt()

      expect(prompt).toContain('100-300 words')
    })
  })

  describe('response format', () => {
    it('requests JSON response format', () => {
      const prompt = buildDescriptionPrompt()

      expect(prompt).toContain('JSON object')
      expect(prompt).toContain('description')
      expect(prompt).toContain('wordCount')
      expect(prompt).toContain('appsIdentified')
      expect(prompt).toContain('hasText')
    })
  })

  describe('URL parsing', () => {
    it('extracts hostname from valid URL', () => {
      const prompt = buildDescriptionPrompt('https://www.example.com/page?query=1')

      expect(prompt).toContain('**Website:** www.example.com')
    })

    it('handles invalid URL gracefully', () => {
      const prompt = buildDescriptionPrompt('not-a-valid-url')

      expect(prompt).toContain('No URL or title available')
    })

    it('handles empty URL string', () => {
      const prompt = buildDescriptionPrompt('')

      expect(prompt).toContain('No URL or title available')
    })
  })

  describe('DESCRIPTION_EXAMPLE', () => {
    it('provides a valid example description', () => {
      expect(DESCRIPTION_EXAMPLE).toBeDefined()
      expect(DESCRIPTION_EXAMPLE.length).toBeGreaterThan(100)
      expect(DESCRIPTION_EXAMPLE).toContain('YouTube')
    })
  })
})
