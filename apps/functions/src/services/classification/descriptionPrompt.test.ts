/**
 * Description Prompt Tests
 *
 * Story 28.1: AI Description Generation - AC1, AC2, AC3
 * Story 28.2: Description Quality Standards - AC1, AC2, AC3, AC4, AC5, AC6
 *
 * @vitest-environment node
 */

import { describe, it, expect } from 'vitest'
import {
  buildDescriptionPrompt,
  DESCRIPTION_EXAMPLE,
  QUALITY_GUIDELINES,
  QUALITY_EXAMPLES,
} from './descriptionPrompt'

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

  // Story 28.2: Description Quality Standards Tests
  describe('quality guidelines (Story 28.2 AC1)', () => {
    it('includes accessibility best practices guidance', () => {
      const prompt = buildDescriptionPrompt()

      expect(prompt).toContain('WCAG')
      expect(prompt).toContain('visual-only references')
      expect(prompt).toContain('text-to-speech')
    })

    it('warns against color-only descriptions', () => {
      const prompt = buildDescriptionPrompt()

      expect(prompt).toContain('avoid')
      expect(prompt).toMatch(/red button|highlighted text/i)
    })

    it('emphasizes factual language', () => {
      const prompt = buildDescriptionPrompt()

      expect(prompt).toContain('objective')
      expect(prompt).toContain('factual')
    })
  })

  describe('factual content prioritization (Story 28.2 AC2)', () => {
    it('includes factual description standards', () => {
      const prompt = buildDescriptionPrompt()

      expect(prompt).toContain('Factual Description Standards')
      expect(prompt).toContain('Describe what IS visible')
      expect(prompt).toContain('Avoid speculation')
    })

    it('includes good vs bad examples', () => {
      const prompt = buildDescriptionPrompt()

      expect(prompt).toContain('Good Description Examples')
      expect(prompt).toContain('Bad Description Examples')
    })
  })

  describe('sensitive content handling (Story 28.2 AC3)', () => {
    it('includes sensitive content guidelines', () => {
      const prompt = buildDescriptionPrompt()

      expect(prompt).toContain('Sensitive Content Guidelines')
      expect(prompt).toContain('objectively without graphic detail')
      expect(prompt).toContain('age-appropriate')
    })

    it('includes isSensitiveContent field in response format', () => {
      const prompt = buildDescriptionPrompt()

      expect(prompt).toContain('isSensitiveContent')
    })
  })

  describe('OCR text extraction (Story 28.2 AC4)', () => {
    it('includes OCR guidelines', () => {
      const prompt = buildDescriptionPrompt()

      expect(prompt).toContain('Text Extraction')
      expect(prompt).toContain('Quote visible text')
      expect(prompt).toContain('double quotes')
    })

    it('handles partial/unclear text', () => {
      const prompt = buildDescriptionPrompt()

      expect(prompt).toContain('partially visible')
      expect(prompt).toContain('too small or blurry')
    })
  })

  describe('app and context identification (Story 28.2 AC5)', () => {
    it('includes app identification guidance', () => {
      const prompt = buildDescriptionPrompt()

      expect(prompt).toContain('App and Context Identification')
      expect(prompt).toContain('YouTube')
      expect(prompt).toContain('Discord')
    })

    it('includes activity context patterns', () => {
      const prompt = buildDescriptionPrompt()

      expect(prompt).toContain('watching')
      expect(prompt).toContain('browsing')
      expect(prompt).toContain('chatting')
      expect(prompt).toContain('gaming')
    })
  })

  describe('unclear image fallback (Story 28.2 AC6)', () => {
    it('includes imageQuality field in response format', () => {
      const prompt = buildDescriptionPrompt()

      expect(prompt).toContain('imageQuality')
      expect(prompt).toContain('clear')
      expect(prompt).toContain('partial')
      expect(prompt).toContain('unclear')
    })

    it('includes confidenceScore field in response format', () => {
      const prompt = buildDescriptionPrompt()

      expect(prompt).toContain('confidenceScore')
      expect(prompt).toContain('0-100')
    })

    it('includes fallback instructions for unclear images', () => {
      const prompt = buildDescriptionPrompt()

      expect(prompt).toContain('Unable to fully describe')
      expect(prompt).toContain('reason')
    })
  })
})

describe('QUALITY_GUIDELINES', () => {
  it('contains accessibility best practices', () => {
    expect(QUALITY_GUIDELINES).toContain('WCAG')
    expect(QUALITY_GUIDELINES).toContain('NEVER use visual-only references')
  })

  it('contains factual description standards', () => {
    expect(QUALITY_GUIDELINES).toContain('Factual Description Standards')
    expect(QUALITY_GUIDELINES).toContain('objective')
  })

  it('contains sensitive content guidelines', () => {
    expect(QUALITY_GUIDELINES).toContain('Sensitive Content Guidelines')
    expect(QUALITY_GUIDELINES).toContain('clinical')
  })

  it('contains OCR guidelines', () => {
    expect(QUALITY_GUIDELINES).toContain('Text Extraction')
    expect(QUALITY_GUIDELINES).toContain('Quote visible text')
  })

  it('contains app identification guidelines', () => {
    expect(QUALITY_GUIDELINES).toContain('App and Context Identification')
  })
})

describe('QUALITY_EXAMPLES', () => {
  it('provides good description examples', () => {
    expect(QUALITY_EXAMPLES).toContain('Good Description Examples')
    expect(QUALITY_EXAMPLES).toContain('YouTube app')
  })

  it('provides bad description examples to avoid', () => {
    expect(QUALITY_EXAMPLES).toContain('Bad Description Examples')
    expect(QUALITY_EXAMPLES).toContain('AVOID')
    expect(QUALITY_EXAMPLES).toContain('red play button')
    expect(QUALITY_EXAMPLES).toContain('judgmental')
  })
})
